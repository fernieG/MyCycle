import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Run the actual date/length/prediction functions from app-core.js.
// Extracting them avoids loading browser UI/DOM in Node. Fixtures are fictional.
const core = readFileSync(new URL('../app-core.js', import.meta.url), 'utf8');
const start = core.indexOf('function iso(d)');
const end = core.indexOf('function periodOn(dateISO)');
assert.ok(start >= 0 && end > start, 'Prediction function boundaries changed; review extraction');
const actualFunctions = core.slice(start, end);

function predict(starts, { typicalCycleLength = 28, typicalPeriodDuration = 5 } = {}) {
  const state = {
    profile: { typicalCycleLength, typicalPeriodDuration },
    periods: starts.map((record, index) => ({
      id: 'fictional-' + index,
      start: typeof record === 'string' ? record : record.start,
      end: typeof record === 'string' ? null : record.end ?? null,
      endKnown: typeof record === 'string' ? true : record.endKnown !== false,
      source: 'fictional test data'
    })),
    symptoms: {}, flows: {}, notes: {}
  };
  const sandbox = { state };
  runInNewContext(actualFunctions, sandbox);
  return runInNewContext('({ lengths: cycleLengths(), durations: periodDurations(), p: predictionInfo() })', sandbox);
}

test('three confirmed historical intervals use median instead of settings default', () => {
  // Fictional pattern: +27, +30, +26 days.
  const { lengths, p } = predict([
    '2025-01-14', '2025-02-10', '2025-03-12', '2025-04-07'
  ]);
  assert.deepEqual([...lengths], [27, 30, 26]);
  assert.equal(p.cycle, 27);
  assert.equal(p.cyclesUsed, 3);
  assert.equal(p.window, 2);
  assert.equal(p.starts[0].toISOString().slice(0, 10), '2025-05-04');
});

test('a confirmed start counts even when final bleeding end is unknown', () => {
  const { p, durations } = predict([
    { start: '2025-01-14', end: '2025-01-18' },
    { start: '2025-02-10', end: '2025-02-12', endKnown: false },
    { start: '2025-03-12', end: '2025-03-14' },
    { start: '2025-04-07', end: '2025-04-09' }
  ]);
  assert.equal(p.cycle, 27);
  assert.deepEqual([...durations], [5, 3, 3]);
});

test('with fewer than three intervals, use configured typical cycle length', () => {
  const { p } = predict(['2025-01-14', '2025-02-10', '2025-03-12'], {
    typicalCycleLength: 29
  });
  assert.equal(p.cyclesUsed, 2);
  assert.equal(p.cycle, 29);
  assert.equal(p.confidence, 'Limited');
  assert.equal(p.starts[0].toISOString().slice(0, 10), '2025-04-10');
});

test('intervals outside 15–60 days do not count as cycles', () => {
  const { p, lengths } = predict([
    '2025-01-14', '2025-02-10', '2025-06-30'
  ]);
  assert.deepEqual([...lengths], [27]);
  assert.equal(p.cyclesUsed, 1);
  assert.equal(p.cycle, 28);
});

test('day calculations stay stable across daylight saving transitions', () => {
  const result = runInNewContext(
    actualFunctions + "\n({a:daysBetween('2025-03-29','2025-03-31'),b:daysBetween('2025-10-25','2025-10-27')})",
    { state: { profile: { typicalCycleLength: 28, typicalPeriodDuration: 5 }, periods: [] } }
  );
  assert.equal(result.a, 2);
  assert.equal(result.b, 2);
});


test('calendar ovulation estimate is derived from next period, not simply cycle day 14', () => {
  const sandbox = {state:{
    profile: { typicalCycleLength:28, typicalPeriodDuration:5 },
    periods: ['2025-01-14','2025-02-10','2025-03-12','2025-04-07'].map(start=>({start,end:null,endKnown:true}))
  }};
  const result = runInNewContext(
    actualFunctions + "\novulationEstimate('2025-04-15')", sandbox
  );
  assert.equal(result.ovulation,'2025-04-20');
  assert.equal(result.fertileStart,'2025-04-15');
  assert.equal(result.fertileEnd,'2025-04-21');
  assert.equal(result.estimated,true);
});

test('expired unconfirmed prediction does not roll over into imaginary future cycles', () => {
  const sandbox = {state:{
    profile: { typicalCycleLength:28, typicalPeriodDuration:5 },
    periods: ['2025-01-14','2025-02-10','2025-03-12','2025-04-07'].map(start=>({start,end:null,endKnown:true}))
  }};
  assert.equal(
    runInNewContext(actualFunctions + "\novulationEstimate('2025-05-05')",sandbox),null
  );
});
