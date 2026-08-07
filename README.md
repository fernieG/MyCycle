# My Cycle

Installable, local-only menstrual cycle and symptom tracking prototype designed primarily for iPhone testing.

## Privacy model

- No account, backend, database, advertising, analytics or cloud synchronization.
- Menstrual history, symptoms, medication entries and notes are stored in browser storage on the user's own device.
- GitHub and Vercel host only the application code; they do not receive the health data entered into the app.
- The app can create a password-protected encrypted backup that the user must save independently.

## Install on iPhone

1. Open the production HTTPS URL in Safari.
2. Tap **Share**.
3. Select **Add to Home Screen**.
4. Open **My Cycle** from the Home Screen.

Avoid Private Browsing. Export an encrypted backup before deleting the app, clearing Safari website data or changing devices.

## Local testing

Run a static server from the repository root, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

This is a static Progressive Web App. Import the repository into Vercel with the default static-site settings. No server functions, database or environment variables containing health information are required.
