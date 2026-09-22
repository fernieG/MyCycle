# My Cycle

Installable, local-only menstrual cycle and symptom tracker designed primarily for iPhone.

## v4

My Cycle v4 moves the app to the intended one-screen experience:

- no tab navigation;
- collapsible Symptoms, Calendar, and History & Insights sections;
- tap any calendar day to make it the active logging date;
- bleeding and symptom changes save immediately for the selected day;
- confirmed cycles are corrected by editing dates rather than deleting a cycle;
- destructive day-level changes provide Undo;
- existing CSV import, encrypted backup/restore, predictions, pain markers, insights and offline PWA behavior are retained.

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
node tests/run_agents.mjs
```

The release checks use synthetic/source-level data only.

## Deployment

This is a static Progressive Web App deployed from `main` to Vercel. No server functions, database or environment variables containing health information are required.

## Release gate

The v4 branch must pass the Node release-agent suite before merge to `main`, followed by the human iPhone checks in `AGENTS.md`.
