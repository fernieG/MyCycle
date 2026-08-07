# My Cycle PWA — Validation Report

**Release candidate:** `agent/publish-mycycle`

## Result

**PASS for iPhone PWA prototype publishing.**

The application logic is the corrected prototype that previously passed the 31-check agent suite. For publication it was split into static modules without changing the validated logic, then extended only with PWA assets and service-worker registration.

Additional release checks completed:

- JavaScript syntax passes for `app-core.js`, `app-ui.js`, and `app-data.js`.
- Manifest uses `display: standalone` and a root start URL.
- Service worker caches the complete local app shell.
- No external JavaScript, stylesheet, image, font, analytics, tracker, database, or health-data API is required.
- Personal records use browser `localStorage` only.
- Password-protected backup uses PBKDF2 + AES-GCM in the browser.
- Restore supports merge and replace with duplicate/overlap handling.
- Overlapping confirmed periods are rejected.
- Calendar cells expose full accessible date/state labels.
- Reduced Motion is supported.
- Confirmed and predicted period days use different shape/pattern treatments.
- Vercel configuration contains only static hosting headers; no backend or environment secret is required.

## Important scope limitation

This validates the HTML/PWA prototype, not a native iOS build. Safari/Home Screen persistence, VoiceOver behavior, download/restore flows and offline behavior should also be validated manually on the user's iPhone after HTTPS deployment.

Health data entered during testing must not be committed to GitHub. GitHub and the hosting provider contain app code only; the user's cycle data remains in browser storage on the device.
