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
- existing CSV import, encrypted backup/restore, predictions, pain markers, insights and offline PWA behavior are retained;
- hot flashes / night heat can be tracked directly;
- a calendar-only ovulation date and possible fertile window are estimated from the predicted next period (approximately 14 days before the estimated start, with a possible fertile window from five days before through one day after ovulation);
- a cycle can keep a last confirmed bleeding date with the final period end marked unknown, so cycle-length predictions remain usable without distorting typical period duration.

**Medical limitation:** ovulation timing is an estimate, not evidence that ovulation occurred. Cycle variation may make date-based forecasts inaccurate. Do **not** use fertility predictions as contraception. The ovulation estimate is hidden when an expected cycle has passed without a confirmed new period start. See the [ACOG fertility-awareness FAQ](https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning) and [NHS period and fertility guide](https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/).

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
node --test tests/prediction-regression.test.mjs
```

The release checks use synthetic/source-level data only. Prediction regression tests execute the app's real date calculation logic on entirely fictional history.

## Deployment

This is a static Progressive Web App deployed from `main` to Vercel. No server functions, database or environment variables containing health information are required.

## Release gate

The v4 branch must pass the Node release-agent suite before merge to `main`, followed by the human iPhone checks in `AGENTS.md`.
