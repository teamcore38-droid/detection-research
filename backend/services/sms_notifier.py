"""Background, rate-limited SMS submission for CRITICAL alerts only."""

import base64
import json
import logging
import math
import os
import queue
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from backend.config import BASE_DIR  # Loads the project's .env before reading settings.

logger = logging.getLogger(__name__)


def normalize_phone(value):
    number = re.sub(r"[\s()-]", "", value)
    if re.fullmatch(r"07\d{8}", number):
        number = "+94" + number[1:]
    elif number.startswith("00"):
        number = "+" + number[2:]
    if not re.fullmatch(r"\+[1-9]\d{7,14}", number):
        raise ValueError("SMS_RECIPIENTS must contain valid local Sri Lankan mobiles or +countrycode numbers")
    return number


def _seconds(name, default, errors, maximum=86400):
    try:
        value = float(os.getenv(name, str(default)))
        if not math.isfinite(value) or not 1 <= value <= maximum:
            raise ValueError
        return value
    except ValueError:
        errors.append(f"{name} must be between 1 and {maximum} seconds")
        return default


@dataclass(frozen=True)
class SMSSettings:
    enabled: bool = False
    recipients: tuple = ()
    account_sid: str = ""
    auth_token: str = field(default="", repr=False)
    sender: str = ""
    messaging_service_sid: str = ""
    cooldown: float = 300
    failure_backoff: float = 60
    timeout: float = 10
    site_name: str = "Vision Sentry"
    errors: tuple = ()
    provider: str = "twilio"
    smslenz_user_id: str = ""
    smslenz_api_key: str = field(default="", repr=False)
    smslenz_sender_id: str = "SMSlenzDEMO"
    max_messages_per_session: int = 0

    @classmethod
    def from_env(cls):
        errors = []
        recipients = []
        for value in os.getenv("SMS_RECIPIENTS", "").split(","):
            if value.strip():
                try:
                    number = normalize_phone(value.strip())
                    if number not in recipients:
                        recipients.append(number)
                except ValueError as exc:
                    errors.append(str(exc))
        sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        sender = os.getenv("TWILIO_FROM", "").strip()
        service = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "").strip()
        provider = os.getenv("SMS_PROVIDER", "twilio").strip().lower()
        smslenz_user_id = os.getenv("SMSLENZ_USER_ID", "").strip()
        smslenz_api_key = os.getenv("SMSLENZ_API_KEY", "").strip()
        smslenz_sender_id = os.getenv("SMSLENZ_SENDER_ID", "SMSlenzDEMO").strip()
        if not recipients:
            errors.append("Set SMS_RECIPIENTS")
        if provider == "smslenz":
            if not re.fullmatch(r"[1-9]\d*", smslenz_user_id):
                errors.append("Set SMSLENZ_USER_ID to the numeric User ID in SMSlenz Settings")
            if not smslenz_api_key:
                errors.append("Set SMSLENZ_API_KEY")
            if not re.fullmatch(r"[A-Za-z0-9 ]{1,11}", smslenz_sender_id):
                errors.append("Set SMSLENZ_SENDER_ID to SMSlenzDEMO or an approved sender ID")
        elif provider == "twilio":
            if not re.fullmatch(r"AC[0-9a-fA-F]{32}", sid):
                errors.append("Set a valid TWILIO_ACCOUNT_SID")
            if not token:
                errors.append("Set TWILIO_AUTH_TOKEN")
            if service:
                if not re.fullmatch(r"MG[0-9a-fA-F]{32}", service):
                    errors.append("Set a valid TWILIO_MESSAGING_SERVICE_SID")
            elif not (re.fullmatch(r"\+[1-9]\d{7,14}", sender) or
                      (re.fullmatch(r"[A-Za-z0-9 ]{1,11}", sender) and re.search(r"[A-Za-z]", sender))):
                errors.append("Set TWILIO_FROM to an approved sender ID or international number, or set TWILIO_MESSAGING_SERVICE_SID")
        else:
            errors.append("SMS_PROVIDER must be smslenz or twilio")
        try:
            message_limit = int(os.getenv("SMS_MAX_MESSAGES_PER_SESSION", "0"))
            if not 0 <= message_limit <= 10000:
                raise ValueError
        except ValueError:
            errors.append("SMS_MAX_MESSAGES_PER_SESSION must be an integer between 0 and 10000")
            message_limit = 0
        cooldown = _seconds("SMS_COOLDOWN_SECONDS", 300, errors)
        backoff = _seconds("SMS_FAILURE_BACKOFF_SECONDS", 60, errors)
        timeout = _seconds("SMS_HTTP_TIMEOUT_SECONDS", 10, errors, maximum=30)
        return cls(
            enabled=os.getenv("SMS_ENABLED", "false").strip().lower() in {"true", "1", "yes"},
            recipients=tuple(recipients), account_sid=sid, auth_token=token,
            sender=sender, messaging_service_sid=service, cooldown=cooldown,
            failure_backoff=backoff, timeout=timeout,
            site_name=os.getenv("SMS_SITE_NAME", "Vision Sentry").strip() or "Vision Sentry",
            errors=tuple(dict.fromkeys(errors)),
            provider=provider, smslenz_user_id=smslenz_user_id,
            smslenz_api_key=smslenz_api_key, smslenz_sender_id=smslenz_sender_id,
            max_messages_per_session=message_limit,
        )

    @property
    def provider_name(self):
        return {"twilio": "Twilio", "smslenz": "SMSlenz"}.get(self.provider, "Unknown")


class SMSDeliveryError(Exception):
    """Sanitized provider failure safe for logs and the status endpoint."""


def send_twilio(settings, recipient, body):
    fields = {"To": recipient, "Body": body}
    if settings.messaging_service_sid:
        fields["MessagingServiceSid"] = settings.messaging_service_sid
    else:
        fields["From"] = settings.sender
    credentials = base64.b64encode(
        f"{settings.account_sid}:{settings.auth_token}".encode("utf-8")
    ).decode("ascii")
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.account_sid}/Messages.json",
        data=urlencode(fields).encode("utf-8"),
        headers={"Authorization": f"Basic {credentials}",
                 "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=settings.timeout) as response:
            result = json.load(response)
    except HTTPError as exc:
        code = None
        try:
            code = json.loads(exc.read()).get("code")
        except (ValueError, AttributeError):
            pass
        detail = f", Twilio code {code}" if isinstance(code, int) else ""
        raise SMSDeliveryError(f"Twilio HTTP {exc.code}{detail}; check the Twilio console") from None
    except (URLError, OSError, ValueError):
        raise SMSDeliveryError("SMS network timeout, connection failure, or invalid provider response") from None
    if not isinstance(result, dict) or not result.get("sid"):
        raise SMSDeliveryError("Twilio did not return a message SID")
    if result.get("status") in {"failed", "undelivered", "canceled"}:
        raise SMSDeliveryError("Twilio rejected the message; check the Twilio console")
    return {"sid": result["sid"], "status": result.get("status", "submitted")}


def send_smslenz(settings, recipient, body):
    request = Request(
        "https://smslenz.lk/api/send-sms",
        data=json.dumps({
            "user_id": settings.smslenz_user_id,
            "api_key": settings.smslenz_api_key,
            "sender_id": settings.smslenz_sender_id,
            "contact": recipient,
            "message": body,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json",
                 "User-Agent": "VisionSentry/1.0"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=settings.timeout) as response:
            result = json.load(response)
    except HTTPError as exc:
        # Do not expose a provider response that may echo credentials or recipients.
        raise SMSDeliveryError(f"SMSlenz HTTP {exc.code}; check credentials, credit and sender ID in SMSlenz") from None
    except (URLError, OSError, ValueError):
        raise SMSDeliveryError("SMSlenz network timeout, connection failure, or invalid provider response") from None
    data = result.get("data") if isinstance(result, dict) else None
    if not isinstance(result, dict) or result.get("success") is not True:
        raise SMSDeliveryError("SMSlenz rejected the request; check credentials, credit and sender ID in SMSlenz")
    if (not isinstance(data, dict) or data.get("status") != "success"
            or not isinstance(data.get("campaign_id"), (str, int))
            or not str(data["campaign_id"]).strip()):
        raise SMSDeliveryError("SMSlenz returned an incomplete submission response; check SMSlenz history before retrying")
    # 'success' means provider submission, not confirmed handset delivery.
    return {"sid": str(data["campaign_id"]), "status": "submitted"}


def send_sms(settings, recipient, body):
    if settings.provider == "smslenz":
        return send_smslenz(settings, recipient, body)
    if settings.provider == "twilio":
        return send_twilio(settings, recipient, body)
    raise SMSDeliveryError("Unsupported SMS provider")


def build_message(alert, site_name):
    event = {
        "DROWNING_EMERGENCY": "Drowning detected",
        "ANIMAL_ATTACK_RISK": "Animal-human danger",
        "SMS_TEST": "TEST ONLY - no emergency",
    }.get(alert.get("type"), "Critical detection")
    parts = [f"{site_name[:24]} CRITICAL: {event}."]
    classes = ", ".join(str(item) for item in alert.get("detected_classes", []))
    if classes and alert.get("type") != "DROWNING_EMERGENCY":
        parts.append(classes[:30] + ".")
    distance = alert.get("distance_meters")
    if isinstance(distance, (float, int)) and math.isfinite(distance):
        parts.append(f"Est. distance {distance:.1f}m.")
    if alert.get("timestamp"):
        parts.append(str(alert["timestamp"])[:19].replace("T", " ") + ".")
    parts.append("Check camera now." if alert.get("type") != "SMS_TEST" else "SMS setup test.")
    # ASCII avoids emoji/Unicode turning a short alert into multiple SMS segments.
    return " ".join(" ".join(parts).encode("ascii", errors="replace").decode().split())[:160]


class SMSNotifier:
    def __init__(self, settings=None, sender=send_sms, clock=time.monotonic):
        self.settings = settings or SMSSettings.from_env()
        self._sender = sender
        self._clock = clock
        self._queue = queue.Queue(maxsize=32)
        self._lock = threading.Lock()
        self._pending = set()
        self._next_allowed = {}
        self._results = {}
        self._worker = None
        self._stop = threading.Event()
        self._scheduled_count = 0

    def start(self):
        with self._lock:
            if not self.settings.enabled or self.settings.errors:
                if self.settings.enabled:
                    logger.error("SMS is not configured: %s", "; ".join(self.settings.errors))
                return
            if self._worker and self._worker.is_alive():
                return
            self._stop.clear()
            self._worker = threading.Thread(target=self._run, name="sms-notifications", daemon=True)
            self._worker.start()

    def close(self):
        self._stop.set()
        if self._worker:
            self._worker.join(timeout=35)
            if self._worker.is_alive():
                logger.warning("SMS worker is still finishing a request during shutdown")
        while True:
            try:
                key, _ = self._queue.get_nowait()
            except queue.Empty:
                break
            with self._lock:
                self._pending.discard(key)
            self._queue.task_done()

    def notify_critical(self, alert):
        if alert.get("threat_level") != "CRITICAL":
            return 0
        body = build_message(alert, self.settings.site_name)
        queued = 0
        with self._lock:
            if (self._stop.is_set() or not self._worker or not self._worker.is_alive()
                    or not self.settings.enabled or self.settings.errors):
                return 0
            for recipient in self.settings.recipients:
                limit = self.settings.max_messages_per_session
                if limit and self._scheduled_count >= limit:
                    break
                key = (alert.get("channel"), alert.get("type"), recipient)
                if key in self._pending or self._clock() < self._next_allowed.get(key, 0):
                    continue
                self._pending.add(key)
                try:
                    self._queue.put_nowait((key, body))
                    self._scheduled_count += 1
                    queued += 1
                except queue.Full:
                    self._pending.discard(key)
                    logger.warning("SMS queue full; critical alert was not queued")
        return queued

    def _run(self):
        while not self._stop.is_set():
            try:
                key, body = self._queue.get(timeout=0.2)
            except queue.Empty:
                continue
            cooldown = self.settings.cooldown
            try:
                result = self._sender(self.settings, key[2], body)
                logger.info("SMS submitted for %s to ***%s (%s)", key[1], key[2][-4:], result["status"])
            except Exception as exc:
                # Provider exception text can contain tokens or full phone numbers.
                error = str(exc) if isinstance(exc, SMSDeliveryError) else "Unexpected SMS submission failure"
                result = {"status": "error", "error": error}
                cooldown = self.settings.failure_backoff
                logger.error("SMS failed for %s to ***%s: %s", key[1], key[2][-4:], error)
            finally:
                with self._lock:
                    self._pending.discard(key)
                    self._next_allowed[key] = self._clock() + cooldown
                    self._results[key] = {**result, "updated_at": datetime.now().isoformat()}
                self._queue.task_done()

    def get_status(self):
        with self._lock:
            return {
                "provider": self.settings.provider_name, "enabled": self.settings.enabled,
                "configured": not self.settings.errors,
                "running": bool(self._worker and self._worker.is_alive() and not self._stop.is_set()),
                "recipients": ["***" + number[-4:] for number in self.settings.recipients],
                "cooldown_seconds": self.settings.cooldown,
                "message_limit": self.settings.max_messages_per_session,
                "scheduled_count": self._scheduled_count,
                "limit_reached": bool(self.settings.max_messages_per_session and
                                      self._scheduled_count >= self.settings.max_messages_per_session),
                "configuration_errors": list(self.settings.errors),
                "recent_submissions": [
                    {"channel": key[0], "type": key[1], "recipient": "***" + key[2][-4:], **value}
                    for key, value in self._results.items()
                ],
            }


sms_notifier = SMSNotifier()
