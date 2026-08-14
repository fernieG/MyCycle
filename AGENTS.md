# My Cycle — Test Agents

This file defines the automated and human validation agents for the My Cycle app. The executable source checks live in `tests/run_agents.py`.

## Ground rules

- Menstrual, symptom, medication and note data must remain on the user's device.
- No remote database, analytics, advertising, account or automatic cloud sync.
- Confirmed history and predicted dates must always be distinguishable.
- Predictions are estimates based only on confirmed cycle starts.
- A critical privacy, data-loss, restore or prediction defect blocks release.
- Tests use synthetic fixtures or source-level checks only; never commit personal health data.

## Agent 1 — Orchestrator

Runs all release checks and compiles the release result. Gate: no unresolved critical or major defect affecting recording, local persistence, prediction correctness, export, restore or offline behavior.

## Agent 2 — Core Journey

Checks one-tap period start/end, date correction, flow, symptoms, custom symptoms, severity, notes, and Undo behavior.

## Agent 3 — Calendar & Prediction

Checks confirmed/predicted distinction, conservative prediction logic, DST-safe day arithmetic, calendar pain markers, and selected-date editing.

## Agent 4 — Privacy & Offline

Checks local-only storage, absence of outbound health-data APIs, PWA shell versioning, and offline cache structure.

## Agent 5 — Export & Restore

Checks encrypted backup primitives, CSV export/import, merge/replace restore behavior, and duplicate/overlap prevention.

## Agent 6 — Data Integrity & Resilience

Checks date validation, overlap rejection, selected-record deletion, corrupt-state fallback, day rollover refresh, and schema normalization.

## Agent 7 — Accessibility & Usability

Checks meaningful calendar labels, touch-target CSS, Reduced Motion, dark mode, and non-colour-only pain indicators.

## Agent 8 — Visual Quality & Insights

Checks the three-tab hierarchy, pain/symptom trend visualization, symptom ordering, and mobile-first layout.

## Human Validation Agent

Final iPhone checks:

1. Today shows the correct period/cycle day after the device date changes.
2. Any calendar date can be opened and its symptoms, bleeding/flow and note can be edited.
3. CSV import from Files opens a merge/replace review instead of failing silently.
4. Calendar pain severity markers are understandable without relying on colour alone.
5. Insights renders the pain/symptom trend without horizontal page overflow.
6. Existing local data remains present after the v3 web-app update.

## Run

```bash
python tests/run_agents.py
```
