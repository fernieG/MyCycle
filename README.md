# My Cycle

Installable, local-only menstrual cycle and symptom tracking prototype designed primarily for iPhone testing.

## v3

My Cycle v3 adds CSV import from the iOS Files picker, selected-calendar-date editing for symptoms/flow/notes, custom symptoms, DST-safe day calculation and day-rollover refresh, pain-severity markers in Calendar, and a pain/symptom trend in Insights.

## Privacy model

- No account, backend, database, advertising, analytics or cloud synchronization.
- Menstrual history, symptoms and notes are stored in browser storage on the user's own device.
- GitHub and Vercel host only static application code; they do not receive health data entered into the app.
- The app can create a password-protected encrypted backup that the user must save independently.

## Install on iPhone

1. Open the production HTTPS URL in Safari.
2. Tap **Share**.
3. Select **Add to Home Screen**.
4. Open **My Cycle** from the Home Screen.

Avoid Private Browsing. Export an encrypted backup before deleting the app, clearing Safari website data or changing devices.

## Test

```bash
python tests/run_agents.py
```

The release checks use synthetic/source-level data only.

## Deployment

This is a static Progressive Web App deployed from `main` to Vercel. No server functions, database or environment variables containing health information are required.
