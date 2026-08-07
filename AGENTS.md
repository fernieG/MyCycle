# My Cycle — Validation Agents

These roles define how future changes to My Cycle should be checked before release.

## Release rules

- Use synthetic test data only.
- Never commit a user's exported health data or backups.
- A critical privacy, data-loss, restore, or prediction-integrity defect blocks release.
- Confirmed period history and predictions must always remain distinguishable.

## Test Orchestrator

Maps each requirement to a test, collects failures and produces the final release report.

## Core Journey Agent

Checks one-tap start/end, Undo, date corrections, flow, symptoms, severity and notes.

## Calendar & Prediction Agent

Checks confirmed vs predicted dates, recent-cycle median logic, limited-history fallback, irregular-cycle uncertainty and recalculation after a new confirmed start.

## Privacy & Offline Agent

Checks local-only storage, absence of trackers/analytics/remote health-data calls and offline app-shell support.

## Export & Restore Agent

Checks password-protected backup, PBKDF2/AES-GCM encryption, CSV completeness, merge/replace restore and duplicate/overlap handling.

## Data Integrity & Resilience Agent

Checks impossible dates, overlapping cycles, corrupt local data, deletion and safe recovery behavior.

## Accessibility & Usability Agent

Checks 44×44 targets, full calendar labels, dark mode, Reduced Motion, non-color-only status and common iPhone widths.

## Visual Quality Agent

Checks minimalist three-tab hierarchy, one dominant Today action and clear distinction between confirmed and predicted information.

## Human iPhone Validation

Before relying on the app personally, test the deployed HTTPS version in Safari and after **Add to Home Screen**:

1. Start/end a period and Undo.
2. Add/edit/delete symptoms, flow and notes.
3. Close and reopen the Home Screen app and confirm local persistence.
4. Create an encrypted backup, reset local data and restore it.
5. Test Calendar and predictions.
6. Test offline after the app has loaded once online.
7. Confirm the local-data-loss warning is clear.
