# SMSlenz free sample setup

The project is configured to use SMSlenz for critical animal-human danger and
drowning notifications. Both supplied recipient numbers are already stored in the
local `.env` file. Automatic sending is disabled until you complete this setup.

SMSlenz's [FAQ](https://www.smslenz.lk/faq) advertises free trial credits, dashboard
and API testing without payment, and a demo sender ID. It does not specify a fixed
number of trial credits. Check the actual balance after registration. Paid service
terms are separate; you do not need to purchase a plan to follow the advertised
free-trial test. If your account requires payment before any test, ask their support
to clarify the trial before proceeding.

## Register and verify your phone

1. Open [SMSlenz registration](https://smslenz.lk/register).
2. Enter your first name, last name, email, and a mobile number you control.
3. Set and confirm a password (the page requires at least eight characters).
4. Create the account, then enter the six-digit OTP sent to your phone. Complete
   these account and verification steps yourself.
5. Log in and confirm that free trial SMS credits appear in your balance.

## Send one dashboard sample first

1. Open Send SMS in the SMSlenz dashboard.
2. Choose `SMSlenzDEMO` as the sender ID. Its spelling and capitalization matter.
3. Send a short test such as `Research project SMS test. No emergency.` to one of
   your own configured numbers. Use international format, for example a local
   `07...` mobile becomes `+947...`.
4. Check the actual phone and the remaining trial balance. This confirms that your
   account and mobile network can receive a real sample before connecting the app.
   Your second number can be checked separately if needed.

## Connect your account to this project

The [official API guide](https://smslenz.lk/developers/api) identifies Settings as
the location for the numeric User ID and API key. Find those two values in your
dashboard, then edit `.env` in `D:\Research Nuzri`:

```dotenv
SMS_ENABLED=false
SMS_PROVIDER=smslenz
SMSLENZ_USER_ID=your_numeric_user_id
SMSLENZ_API_KEY=your_actual_api_key
SMSLENZ_SENDER_ID=SMSlenzDEMO
SMS_MAX_MESSAGES_PER_SESSION=4
```

Replace the two placeholders with your real values. Keep your API key in this
local file, which is ignored by Git. Existing Twilio fields can stay empty; they
are not used when `SMS_PROVIDER=smslenz`. Do not change `SMS_RECIPIENTS`: your two
numbers are already there. No API credentials are exposed to the browser.

Open PowerShell in the project folder and preview without sending:

```powershell
cd "D:\Research Nuzri"
python -m backend.test_sms
```

Next, use only one sample credit to test one of your configured numbers:

```powershell
python -m backend.test_sms --send --to YOUR_CONFIGURED_NUMBER
```

Replace `YOUR_CONFIGURED_NUMBER` with one number from your local `SMS_RECIPIENTS`.
This submits one actual SMS using your provider credits, even while automatic
alerts are disabled. To test another configured number, repeat with that number.
Omitting `--to` sends to all configured numbers. The output's
`submitted` status and campaign reference confirm provider submission only;
check the phone to confirm receipt. A failed request may consume a trial attempt;
inspect SMSlenz history before retrying after a timeout.

Use the same Python environment that runs the backend. The Windows launcher
prefers `%USERPROFILE%\miniconda3\python.exe` when present, so if needed replace
`python` above with that interpreter.

## Enable detection-driven samples

After the real test arrives, set `SMS_ENABLED=true` and restart the backend.
Start the normal dashboard with `start_all.bat`. Its default sample videos start
automatically; critical detections in those videos can now consume real SMS
credits, even with the dashboard closed or the buzzer muted.

The local configuration limits automatic messages to four queued submissions per
backend process. With two recipients and two critical types, that permits up to
one animal-danger and one drowning submission per phone. Failed submissions also
count toward this budget. A five-minute cooldown additionally prevents repeated
alerts of the same type to the same recipient. The four-message budget does not
guarantee both event types: if only one type occurs, it can use the budget again
after its cooldown. Change the budget before restarting only if you have enough
trial credit. Set `0` for unlimited automatic submissions when moving beyond the
sample demo. Explicit `--send` commands are separate deliberate test requests and
do not share this process budget.

The Settings panel shows SMSlenz, masked recipient numbers, configuration errors,
the automatic sample budget, and recent submission results. After demonstrating,
set `SMS_ENABLED=false` and restart the backend. Cooldowns and the four-message
counter reset when the backend process restarts, so restarting can consume more
credits if SMS remains enabled.

## Free local simulation

If your account is not ready, this command tests synthetic critical alerts for
both recipients without any network calls, provider account, or phone delivery:

```powershell
python -m backend.test_sms --simulate
```

Automated checks use mocked providers and do not send SMS:

```powershell
python -m unittest discover -s backend/tests -v
```
