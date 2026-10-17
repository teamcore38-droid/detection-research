"""Preview, simulate critical alerts locally, or explicitly submit a test SMS."""

import argparse
import threading
from dataclasses import replace
from datetime import datetime

from backend.services.sms_notifier import SMSNotifier, SMSSettings, build_message, send_sms, SMSDeliveryError


def simulate_critical_alerts(settings):
    """Exercise real formatting, routing and cooldowns with a local fake transport."""
    if not settings.recipients:
        print('Set SMS_RECIPIENTS in .env before running the simulation.')
        return 1
    expected = len(settings.recipients) * 2
    submissions = []
    finished = threading.Event()

    def local_sender(_settings, recipient, message):
        print(f'SIMULATED ONLY -> ***{recipient[-4:]}: {message}')
        submissions.append(recipient)
        if len(submissions) == expected:
            finished.set()
        return {'sid': 'SIMULATED', 'status': 'simulated - no SMS sent'}

    # Credentials and automatic SMS settings are deliberately unused in this mode.
    service = SMSNotifier(replace(settings, enabled=True, errors=(), max_messages_per_session=0), sender=local_sender)
    print('FREE LOCAL SIMULATION: no provider connection, no charges, no phone delivery.')
    service.start()
    try:
        timestamp = datetime.now().isoformat()
        animal = {
            'type': 'ANIMAL_ATTACK_RISK', 'channel': 'ANIMAL_HUMAN_SECURITY',
            'threat_level': 'CRITICAL', 'timestamp': timestamp,
            'detected_classes': ['Elephant', 'Person'], 'distance_meters': 1.2,
        }
        drowning = {
            'type': 'DROWNING_EMERGENCY', 'channel': 'DROWNING_RESCUE',
            'threat_level': 'CRITICAL', 'timestamp': timestamp,
            'detected_classes': ['drowning'],
        }
        queued = service.notify_critical(animal) + service.notify_critical(drowning)
        duplicate = service.notify_critical(animal)
        warning = service.notify_critical({**animal, 'threat_level': 'WARNING'})
        completed = finished.wait(timeout=5)
        if queued != expected or not completed or duplicate or warning:
            print('Simulation failed: routing, cooldown, or critical-only check did not pass.')
            return 1
        print(f'PASS: {expected} simulated notifications; repeated critical and warning alerts suppressed.')
        print('Both emergency types were tested with synthetic events. No videos or AI models were run.')
        return 0
    finally:
        service.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--send', action='store_true', help='Actually send a test SMS using the selected provider (uses SMS credits)')
    mode.add_argument('--simulate', action='store_true', help='Free local critical-alert simulation; never contacts a provider or phones')
    parser.add_argument('--to', metavar='NUMBER', help='Send a live test only to this configured recipient; cannot add new recipients')
    args = parser.parse_args(argv)
    settings = SMSSettings.from_env()
    if args.to and not args.send:
        parser.error('--to requires --send')
    recipients = settings.recipients
    if args.to:
        from backend.services.sms_notifier import normalize_phone
        try:
            selected = normalize_phone(args.to)
        except ValueError:
            parser.error('--to must be a valid configured recipient')
        if selected not in recipients:
            parser.error('--to must match a number in SMS_RECIPIENTS')
        recipients = (selected,)
    if args.simulate:
        return simulate_critical_alerts(settings)
    alert = {"type": "SMS_TEST", "timestamp": datetime.now().isoformat()}
    body = build_message(alert, settings.site_name)
    print("Provider:", settings.provider_name)
    print("Recipients:", ", ".join("***" + number[-4:] for number in recipients) or "none")
    print("Message:", body)
    if not args.send:
        print("Preview only; no network requests. Use --send to submit a test SMS.")
        return 0
    if settings.errors:
        print("Setup incomplete:", "; ".join(settings.errors))
        return 1
    # Explicit --send works even with automatic alerts disabled, so setup can be tested safely.
    failed = False
    for recipient in recipients:
        try:
            result = send_sms(settings, recipient, body)
            print(f"***{recipient[-4:]}: {settings.provider_name} {result['status']} (Reference: {result['sid']})")
        except SMSDeliveryError as exc:
            failed = True
            print(f"***{recipient[-4:]}: {exc}")
    print(f"Check {settings.provider_name} message history and the phone; submission does not confirm receipt.")
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
