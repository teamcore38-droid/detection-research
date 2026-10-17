import asyncio
import io
import json
import os
import threading
import unittest
from dataclasses import replace
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs

from backend.services.sms_notifier import (
    SMSDeliveryError, SMSNotifier, SMSSettings, build_message, normalize_phone, send_twilio,
    send_smslenz, send_sms,
)
from backend.services.alert_manager import AlertManager


RECIPIENTS = ('+94711111111', '+94722222222')
SETTINGS = SMSSettings(
    enabled=True, recipients=RECIPIENTS, account_sid='AC' + 'a' * 32,
    auth_token='fake-token-for-tests', sender='TestSender',
)


def alert(channel='ANIMAL_HUMAN_SECURITY', kind='ANIMAL_ATTACK_RISK', level='CRITICAL'):
    return {
        'id': 123, 'channel': channel, 'type': kind, 'threat_level': level,
        'detected_classes': ['Elephant', 'Person'], 'distance_meters': 1.25,
        'timestamp': '2026-10-17T21:00:00',
    }


class ConfigurationTests(unittest.TestCase):
    def test_local_and_international_number_normalization(self):
        self.assertEqual(normalize_phone('071 111 1111'), RECIPIENTS[0])
        self.assertEqual(normalize_phone('0094711111111'), RECIPIENTS[0])
        self.assertEqual(normalize_phone('+1 (202) 555-0123'), '+12025550123')
        for value in ['07111111', 'not-a-number', '+0123456789', '94711111111']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_phone(value)

    def test_env_deduplicates_recipients_and_accepts_registered_sender(self):
        with patch.dict(os.environ, {
            'SMS_ENABLED': 'true', 'SMS_RECIPIENTS': '0711111111,+94711111111,0722222222',
            'TWILIO_ACCOUNT_SID': SETTINGS.account_sid, 'TWILIO_AUTH_TOKEN': SETTINGS.auth_token,
            'TWILIO_FROM': 'TestSender',
        }, clear=True):
            settings = SMSSettings.from_env()
        self.assertTrue(settings.enabled)
        self.assertEqual(settings.recipients, RECIPIENTS)
        self.assertEqual(settings.errors, ())

    def test_missing_config_and_invalid_cooldowns_fail_closed(self):
        with patch.dict(os.environ, {'SMS_ENABLED': 'true', 'SMS_COOLDOWN_SECONDS': 'nan',
                                     'SMS_HTTP_TIMEOUT_SECONDS': '999'}, clear=True):
            settings = SMSSettings.from_env()
        service = SMSNotifier(settings, sender=Mock())
        service.start()
        self.assertFalse(service.get_status()['running'])
        self.assertGreaterEqual(len(settings.errors), 5)
        self.assertEqual(service.notify_critical(alert()), 0)
        service._sender.assert_not_called()

    def test_messaging_service_can_replace_sender(self):
        with patch.dict(os.environ, {
            'SMS_RECIPIENTS': RECIPIENTS[0], 'TWILIO_ACCOUNT_SID': SETTINGS.account_sid,
            'TWILIO_AUTH_TOKEN': SETTINGS.auth_token,
            'TWILIO_MESSAGING_SERVICE_SID': 'MG' + 'b' * 32,
        }, clear=True):
            settings = SMSSettings.from_env()
        self.assertFalse(settings.errors)


class TwilioTransportTests(unittest.TestCase):
    def response(self, body):
        return io.BytesIO(json.dumps(body).encode())

    @patch('backend.services.sms_notifier.urlopen')
    def test_form_auth_recipient_and_timeout(self, request):
        request.return_value = self.response({'sid': 'SM123', 'status': 'queued'})
        self.assertEqual(send_twilio(SETTINGS, RECIPIENTS[0], 'TEST'),
                         {'sid': 'SM123', 'status': 'queued'})
        outgoing = request.call_args.args[0]
        self.assertEqual(outgoing.method, 'POST')
        self.assertEqual(outgoing.full_url,
                         f'https://api.twilio.com/2010-04-01/Accounts/{SETTINGS.account_sid}/Messages.json')
        self.assertEqual(parse_qs(outgoing.data.decode()),
                         {'To': [RECIPIENTS[0]], 'From': ['TestSender'], 'Body': ['TEST']})
        self.assertTrue(outgoing.get_header('Authorization').startswith('Basic '))
        self.assertEqual(request.call_args.kwargs['timeout'], 10)

    @patch('backend.services.sms_notifier.urlopen')
    def test_messaging_service_request(self, request):
        request.return_value = self.response({'sid': 'SM123', 'status': 'accepted'})
        send_twilio(replace(SETTINGS, messaging_service_sid='MG' + 'b' * 32), RECIPIENTS[0], 'TEST')
        fields = parse_qs(request.call_args.args[0].data.decode())
        self.assertIn('MessagingServiceSid', fields)
        self.assertNotIn('From', fields)

    @patch('backend.services.sms_notifier.urlopen')
    def test_provider_error_is_sanitized(self, request):
        request.side_effect = HTTPError('https://example.test', 400, 'bad', {},
                                       self.response({'code': 21608, 'message': 'secret fake-token-for-tests'}))
        with self.assertRaises(SMSDeliveryError) as raised:
            send_twilio(SETTINGS, RECIPIENTS[0], 'TEST')
        self.assertIn('21608', str(raised.exception))
        self.assertNotIn('secret', str(raised.exception))

    @patch('backend.services.sms_notifier.urlopen')
    def test_timeout_and_invalid_or_failed_response(self, request):
        for result in [URLError('private detail'), self.response({}),
                       self.response({'sid': 'SM123', 'status': 'failed'}), io.BytesIO(b'bad json')]:
            with self.subTest(result=type(result).__name__):
                request.side_effect = result if isinstance(result, Exception) else None
                request.return_value = result
                with self.assertRaises(SMSDeliveryError):
                    send_twilio(SETTINGS, RECIPIENTS[0], 'TEST')


class SMSlenzTests(unittest.TestCase):
    def settings(self):
        return replace(SETTINGS, provider='smslenz', smslenz_user_id='12',
                       smslenz_api_key='private-smslenz-key', smslenz_sender_id='SMSlenzDEMO')

    def response(self, value):
        return io.BytesIO(json.dumps(value).encode())

    def test_smslenz_config_does_not_require_twilio(self):
        with patch.dict(os.environ, {
            'SMS_PROVIDER': 'smslenz', 'SMS_RECIPIENTS': RECIPIENTS[0],
            'SMSLENZ_USER_ID': '12', 'SMSLENZ_API_KEY': 'private-smslenz-key',
            'SMS_MAX_MESSAGES_PER_SESSION': '4',
        }, clear=True):
            settings = SMSSettings.from_env()
        self.assertFalse(settings.errors)
        self.assertEqual(settings.smslenz_sender_id, 'SMSlenzDEMO')
        self.assertEqual(settings.max_messages_per_session, 4)
        self.assertNotIn(settings.smslenz_api_key, repr(settings))
        status = SMSNotifier(settings).get_status()
        self.assertEqual(status['provider'], 'SMSlenz')
        self.assertNotIn(settings.smslenz_api_key, json.dumps(status))

    def test_invalid_provider_and_missing_smslenz_credentials_fail_closed(self):
        for provider in ['unknown', 'smslenz']:
            with self.subTest(provider=provider), patch.dict(os.environ, {
                'SMS_PROVIDER': provider, 'SMS_MAX_MESSAGES_PER_SESSION': '-1',
            }, clear=True):
                settings = SMSSettings.from_env()
                self.assertTrue(settings.errors)
                service = SMSNotifier(settings, sender=Mock())
                service.start()
                self.assertEqual(service.notify_critical(alert()), 0)
                service._sender.assert_not_called()

    @patch('backend.services.sms_notifier.urlopen')
    def test_smslenz_uses_documented_post_json_and_preserves_plus94(self, request):
        request.return_value = self.response({
            'success': True, 'data': {'status': 'success', 'campaign_id': 43},
        })
        self.assertEqual(send_sms(self.settings(), RECIPIENTS[0], 'TEST'),
                         {'sid': '43', 'status': 'submitted'})
        outgoing = request.call_args.args[0]
        self.assertEqual(outgoing.full_url, 'https://smslenz.lk/api/send-sms')
        self.assertNotIn('private-smslenz-key', outgoing.full_url)
        self.assertEqual(outgoing.method, 'POST')
        self.assertEqual(outgoing.get_header('Content-type'), 'application/json')
        self.assertEqual(outgoing.get_header('User-agent'), 'VisionSentry/1.0')
        self.assertEqual(json.loads(outgoing.data), {
            'user_id': '12', 'api_key': 'private-smslenz-key', 'sender_id': 'SMSlenzDEMO',
            'contact': RECIPIENTS[0], 'message': 'TEST',
        })
        self.assertEqual(request.call_args.kwargs['timeout'], 10)

    @patch('backend.services.sms_notifier.urlopen')
    def test_http_200_failure_and_incomplete_response_are_not_reported_as_sent(self, request):
        for value in [[], {'success': False, 'message': 'private-smslenz-key'},
                      {'success': 'true'}, {'success': True, 'data': {}},
                      {'success': True, 'data': {'status': 'failed', 'campaign_id': 43}}]:
            with self.subTest(value=value):
                request.return_value = self.response(value)
                with self.assertRaises(SMSDeliveryError) as raised:
                    send_smslenz(self.settings(), RECIPIENTS[0], 'TEST')
                self.assertNotIn('private-smslenz-key', str(raised.exception))

    @patch('backend.services.sms_notifier.urlopen')
    def test_network_and_http_errors_do_not_expose_provider_response(self, request):
        for error in [URLError('private-smslenz-key'),
                      HTTPError('https://smslenz.lk/api/send-sms', 401, 'private-smslenz-key', {},
                                self.response({'message': 'private-smslenz-key'}))]:
            request.side_effect = error
            with self.assertRaises(SMSDeliveryError) as raised:
                send_smslenz(self.settings(), RECIPIENTS[0], 'TEST')
            self.assertNotIn('private-smslenz-key', str(raised.exception))

    def test_sample_budget_limits_repeated_detections_across_channels(self):
        sender = Mock(return_value={'sid': '43', 'status': 'submitted'})
        service = SMSNotifier(replace(self.settings(), max_messages_per_session=4), sender=sender)
        service.start()
        self.addCleanup(service.close)
        self.assertEqual(service.notify_critical(alert()), 2)
        self.assertEqual(service.notify_critical(alert('DROWNING_RESCUE', 'DROWNING_EMERGENCY')), 2)
        self.assertEqual(service.notify_critical(alert('OTHER_CHANNEL', 'OTHER_CRITICAL')), 0)
        status = service.get_status()
        self.assertEqual(status['scheduled_count'], 4)
        self.assertTrue(status['limit_reached'])

    @patch('backend.test_sms.send_sms')
    def test_live_cli_can_test_one_configured_number_without_enabling_automatic_sms(self, send):
        from backend.test_sms import main
        send.return_value = {'sid': '43', 'status': 'submitted'}
        with patch('backend.test_sms.SMSSettings.from_env', return_value=replace(self.settings(), enabled=False)), \
                patch('sys.stdout', new_callable=io.StringIO):
            self.assertEqual(main(['--send', '--to', '0711111111']), 0)
        send.assert_called_once()
        self.assertEqual(send.call_args.args[1], RECIPIENTS[0])


class NotificationTests(unittest.TestCase):
    def service(self, sender=None, settings=SETTINGS):
        self.now = 1000.0
        sender = sender or Mock(return_value={'sid': 'SM123', 'status': 'queued'})
        service = SMSNotifier(settings, sender=sender, clock=lambda: self.now)
        service.start()
        self.addCleanup(service.close)
        return service, sender

    def drain(self, service):
        # A bounded wait means a worker regression cannot hang the test suite.
        completed = threading.Event()
        threading.Thread(target=lambda: (service._queue.join(), completed.set()), daemon=True).start()
        self.assertTrue(completed.wait(3), 'SMS worker did not finish its mocked requests')

    def test_disabled_and_noncritical_events_never_send(self):
        service, sender = self.service(settings=replace(SETTINGS, enabled=False))
        self.assertEqual(service.notify_critical(alert()), 0)
        sender.assert_not_called()
        service, sender = self.service()
        for level in ['WARNING', 'LOW', 'SAFE', 'INFO']:
            self.assertEqual(service.notify_critical(alert(level=level)), 0)
        sender.assert_not_called()

    def test_both_recipients_and_independent_channel_cooldowns(self):
        service, sender = self.service()
        self.assertEqual(service.notify_critical(alert()), 2)
        self.drain(service)
        self.assertEqual({c.args[1] for c in sender.call_args_list}, set(RECIPIENTS))
        self.assertEqual(service.notify_critical(alert()), 0)
        self.assertEqual(service.notify_critical(alert('DROWNING_RESCUE', 'DROWNING_EMERGENCY')), 2)
        self.drain(service)
        self.now += 299
        self.assertEqual(service.notify_critical(alert()), 0)
        self.now += 1
        self.assertEqual(service.notify_critical(alert()), 2)
        self.drain(service)
        self.assertEqual(sender.call_count, 6)

    def test_one_failed_recipient_does_not_block_other_and_uses_shorter_backoff(self):
        sender = Mock(side_effect=[SMSDeliveryError('Twilio HTTP 400'),
                                   {'sid': 'SM2', 'status': 'queued'},
                                   {'sid': 'SM3', 'status': 'queued'}])
        service, _ = self.service(sender)
        self.assertEqual(service.notify_critical(alert()), 2)
        self.drain(service)
        self.assertEqual(sender.call_count, 2)
        self.now += 59
        self.assertEqual(service.notify_critical(alert()), 0)
        self.now += 1
        self.assertEqual(service.notify_critical(alert()), 1)
        self.drain(service)
        self.assertEqual(sender.call_args.args[1], RECIPIENTS[0])

    def test_slow_network_is_background_and_does_not_duplicate_pending_messages(self):
        release = threading.Event()
        entered = threading.Event()
        self.addCleanup(release.set)

        def slow_sender(*args):
            entered.set()
            release.wait(2)
            return {'sid': 'SM123', 'status': 'queued'}

        service, _ = self.service(slow_sender)
        self.assertEqual(service.notify_critical(alert()), 2)
        self.assertTrue(entered.wait(1))
        self.assertEqual(service.notify_critical(alert()), 0)
        release.set()
        self.drain(service)

    def test_status_hides_credentials_and_full_phone_numbers(self):
        service, _ = self.service()
        service.notify_critical(alert())
        self.drain(service)
        status = json.dumps(service.get_status())
        self.assertNotIn(SETTINGS.auth_token, status)
        self.assertNotIn(SETTINGS.account_sid, status)
        for number in RECIPIENTS:
            self.assertNotIn(number, status)
        self.assertIn('queued', status)

    def test_message_content_is_short_ascii_and_labels_tests(self):
        body = build_message(alert(), 'Pool camera')
        self.assertIn('Animal-human danger', body)
        self.assertIn('1.2m', body)
        self.assertIn('2026-10-17', body)
        body = build_message({**alert(), 'detected_classes': ['Elephant'] * 30}, '\U0001f6a8' * 100)
        self.assertLessEqual(len(body), 160)
        self.assertTrue(body.isascii())
        self.assertIn('TEST ONLY', build_message({'type': 'SMS_TEST'}, 'Vision Sentry'))


class AlertIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_capture_thread_queues_sms_and_broadcasts_on_app_loop(self):
        notifier = Mock()
        manager = AlertManager(sms_service=notifier)
        manager.set_event_loop(asyncio.get_running_loop())
        websocket = Mock()
        received = asyncio.Event()
        messages = []

        async def send_text(message):
            messages.append(json.loads(message))
            received.set()

        websocket.send_text = send_text
        manager.active_websockets.add(websocket)
        record = alert()
        with patch('backend.services.alert_manager.insert_alert', return_value=record) as insert:
            returned = await asyncio.to_thread(
                manager.trigger_alert_sync, channel=record['channel'], alert_type=record['type'],
                threat_level='CRITICAL', title='Danger', message='Danger',
                detected_classes=['Elephant', 'Person'], confidence=0.9,
            )
        await asyncio.wait_for(received.wait(), timeout=2)
        self.assertEqual(returned, record)
        insert.assert_called_once()
        notifier.notify_critical.assert_called_once_with(record)
        self.assertEqual(messages[0], {'type': 'NEW_ALERT', 'data': record})

    async def test_sms_queue_error_does_not_stop_incident_record_or_browser_alert(self):
        notifier = Mock()
        notifier.notify_critical.side_effect = RuntimeError('unavailable')
        manager = AlertManager(sms_service=notifier)
        with patch('backend.services.alert_manager.insert_alert', return_value=alert()) as insert:
            result = manager.trigger_alert_sync(
                channel='ANIMAL_HUMAN_SECURITY', alert_type='ANIMAL_ATTACK_RISK',
                threat_level='CRITICAL', title='Danger', message='Danger',
                detected_classes=['Elephant'], confidence=0.9,
            )
        self.assertEqual(result['id'], 123)
        insert.assert_called_once()


class FreeSimulationTests(unittest.TestCase):
    @patch('backend.services.sms_notifier.urlopen')
    def test_local_demo_never_contacts_twilio_even_with_live_settings(self, request):
        from backend.test_sms import simulate_critical_alerts
        with patch('sys.stdout', new_callable=io.StringIO) as output:
            result = simulate_critical_alerts(SETTINGS)
        self.assertEqual(result, 0)
        request.assert_not_called()
        self.assertEqual(output.getvalue().count('SIMULATED ONLY ->'), 4)
        self.assertIn('Drowning detected', output.getvalue())
        self.assertIn('Animal-human danger', output.getvalue())
        self.assertIn('PASS:', output.getvalue())

    def test_demo_requires_recipients(self):
        from backend.test_sms import simulate_critical_alerts
        with patch('sys.stdout', new_callable=io.StringIO):
            self.assertEqual(simulate_critical_alerts(replace(SETTINGS, recipients=())), 1)


if __name__ == '__main__':
    unittest.main()
