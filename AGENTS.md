# My Cycle — Release Agents

The executable source checks live in `tests/run_agents.mjs`.

## Ground rules

- Menstrual, symptom, medication and note data must remain on the user's device.
- No remote database, analytics, advertising, account or automatic cloud sync.
- Confirmed history and predicted dates must always be distinguishable.
- Predictions are estimates based only on confirmed cycle starts.
- Confirmed cycles are corrected by editing dates; the UI must not offer individual cycle deletion.
- Destructive day-level edits must provide Undo.
- A critical privacy, data-loss, restore or prediction defect blocks release.
- Tests use synthetic fixtures or source-level checks only; never commit personal health data.

## Automated agents

1. Orchestrator — runs all release checks and compiles the gate result.
2. Core Journey — period start/end, date correction, selected-day flow, symptoms, notes and Undo.
3. Single-screen UX — no tabs, collapsible Symptoms/Calendar/History sections and selected-day logging.
4. Calendar & Prediction — confirmed/predicted distinction, conservative prediction logic, DST-safe dates and pain markers.
5. Privacy & Offline — local-only storage, no outbound health-data APIs and PWA cache behavior.
6. Export & Restore — encrypted backup, CSV import/export and merge/replace restore.
7. Data Integrity — overlap rejection, corrupt-state fallback, day rollover, no cycle-delete control and day-level Undo.
8. Accessibility & Visual Quality — labels, touch targets, Reduced Motion, dark mode, pain indicators and mobile-first hierarchy.

## Human validation

1. The app opens as one screen with no bottom tabs.
2. Tap a calendar date: Symptoms opens for that date and bleeding/symptom changes persist immediately.
3. A confirmed cycle can be corrected by editing dates, but there is no individual cycle-delete action.
4. Removing day details, clearing flow, or deleting a note offers Undo.
5. CSV import from Files opens a merge/replace review.
6. Calendar pain severity remains understandable without relying on colour alone.
7. History & Insights expands without horizontal page overflow.
8. Existing local data remains present after the v4 update.

## Run

```bash
node tests/run_agents.mjs
```
