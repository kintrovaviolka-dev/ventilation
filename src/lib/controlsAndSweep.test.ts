import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DirectParameterControls } from '../components/DirectParameterControls';
import { SELECTABLE_PARAMETERS, isParameterEnabled, isValidParameterValue } from './controlSystem';
import { createSweepHistory, sampleSweep } from './sweepHistory';
import { DEFAULT_PATIENT_PARAMS } from './simulationState';

test('parameter input rejects empty/nonfinite/off-step/out-of-range values and permits zero PEEP', () => {
  const peep = SELECTABLE_PARAMETERS.find(p => p.id === 'peep')!;
  for (const value of ['', NaN, Infinity, -1, 21, 5.5]) assert.equal(isValidParameterValue(peep, value), false);
  assert.ok(isValidParameterValue(peep, 0));
  assert.ok(isValidParameterValue(peep, 20));
  assert.equal(isParameterEnabled('pinsp', 'vc'), false);
  assert.equal(isParameterEnabled('vt', 'pc'), false);
  assert.equal(isParameterEnabled('pSupport', 'ps'), true);
});

test('sweep records observed history without inventing pre-start or resize history', () => {
  const history = createSweepHistory<number>();
  const times: number[] = [];
  sampleSweep(history, 0, 100, time => { times.push(time); return 1; });
  assert.deepEqual(times, [0]);
  sampleSweep(history, 1, 100, () => 2);
  assert.equal(history.points[0], 1);
  assert.equal(history.points[10], 2);
  assert.equal(history.points[11], undefined);
  sampleSweep(history, 2, 200, () => 3);
  assert.equal(history.points.filter(value => value !== undefined).length, 1);
  sampleSweep(history, 2000, 200, () => 4);
  assert.equal(history.points.length, 200);
  assert.ok(history.points.every(value => value === 4));
});

test('numeric controls expose units, confirmation help, bounds and mode-specific inputs in both languages', () => {
  for (const language of ['cs', 'en'] as const) {
    const html = renderToStaticMarkup(createElement(DirectParameterControls, {
      settings: { fio2:40, rr:12, vt:500, pinsp:20, peep:5, ieRatio:'1:2', pSupport:10 },
      mode:'pc', patient:DEFAULT_PATIENT_PARAMS, language, onCommit:() => {},
    }));
    assert.ok(html.includes('direct-pinsp'));
    assert.ok(!html.includes('direct-vt'));
    assert.ok(html.includes('cmH₂O'));
    assert.ok(html.includes('Enter'));
    assert.ok(html.includes('min="0"'));
  }
});
