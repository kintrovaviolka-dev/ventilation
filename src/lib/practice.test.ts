import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canScoreInduction, createPracticeCases, evaluatePractice, initialPracticeAnswers,
  PRACTICE_FIELDS, PracticeAnswers, PracticeCase, PracticeField, predictedBodyWeight, shuffledPracticeDeck,
} from './practice';

const patient: PracticeCase = {
  id: 'test', name: 'Test', sex: 'M', age: 37, heightCm: 175, weightKg: 70,
  induction: 'routine', minuteVentilation: [5.5, 6.5],
  oxygenTrials: [{ fio2: 30, spo2: 92 }, { fio2: 35, spo2: 95 }, { fio2: 40, spo2: 98 }],
};
const correct: PracticeAnswers = { vt: '500', rr: '12', peep: '5', fio2: '35', ie: '2', propofol: '140', rocuronium: '42' };

function result(id: PracticeField, value: string, profile = patient) {
  return evaluatePractice(profile, { ...correct, [id]: value }, true).find((item) => item.id === id)!;
}

function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test('PBW depends on height and sex, not actual weight', () => {
  assert.ok(Math.abs(predictedBodyWeight(patient) - 70.566) < 1e-9);
  assert.ok(Math.abs(predictedBodyWeight({ sex: 'F', heightCm: 162 }) - 54.236) < 1e-9);
  const heavierPatient = { ...patient, weightKg: 110 };
  assert.equal(predictedBodyWeight(heavierPatient), predictedBodyWeight(patient));
  assert.deepEqual(result('vt', '500', { ...patient, weightKg: 110 }).range, [430, 560]);
});

test('all seven answers can be correct under the explicit exercise assumptions', () => {
  const results = evaluatePractice(patient, correct, true);
  assert.equal(results.length, 7);
  assert.ok(results.every((item) => item.status === 'in-range'));
});

test('inclusive endpoints and adjacent control steps produce low / in-range / high', () => {
  const boundaries: [PracticeField, number, number, number][] = [
    ['vt', 430, 560, 10], ['rr', 11, 13, 1], ['peep', 5, 5, 1],
    ['fio2', 35, 35, 1], ['ie', 2, 2, 0.5], ['propofol', 105, 175, 5], ['rocuronium', 42, 42, 1],
  ];
  for (const [id, min, max, step] of boundaries) {
    assert.equal(result(id, String(min - step)).status, 'low', id);
    assert.equal(result(id, String(min)).status, 'in-range', id);
    assert.equal(result(id, String(max)).status, 'in-range', id);
    assert.equal(result(id, String(max + step)).status, 'high', id);
  }
});

test('blank, non-finite, out-of-control-range and off-step answers never pass', () => {
  for (const field of PRACTICE_FIELDS) {
    for (const input of ['', ' ', 'NaN', 'Infinity', '-Infinity', 'abc', String(field.min - field.step), String(field.max + field.step), String(field.min + field.step / 3)]) {
      assert.equal(result(field.id, input).status, 'invalid', `${field.id}: ${input}`);
    }
  }
});

test('RR follows the selected protective VT and supplied minute ventilation target', () => {
  const atLowerVt = evaluatePractice(patient, { ...correct, vt: '430' }, false).find((item) => item.id === 'rr')!;
  const atHigherVt = evaluatePractice(patient, { ...correct, vt: '560' }, false).find((item) => item.id === 'rr')!;
  assert.deepEqual(atLowerVt.range, [13, 15]);
  assert.deepEqual(atHigherVt.range, [10, 11]);
  for (const vt of ['', '400', '600']) {
    const rr = evaluatePractice(patient, { ...correct, vt }, false).find((item) => item.id === 'rr')!;
    assert.equal(rr.status, 'not-scored');
    assert.equal(rr.reason, 'needsVt');
    assert.equal(rr.range, undefined);
  }
});

test('oxygen grading uses observations, not body weight or extrapolated lung response', () => {
  const profile = { ...patient, oxygenTrials: [{ fio2: 50, spo2: 97 }, { fio2: 40, spo2: 94 }, { fio2: 35, spo2: 92 }] };
  assert.deepEqual(result('fio2', '40', profile).range, [40, 40]);
  assert.equal(result('fio2', '50', profile).status, 'high');
  assert.throws(() => evaluatePractice({ ...patient, oxygenTrials: [{ fio2: 30, spo2: 91 }] }, correct, false), /no oxygen trial/);
});

test('routine and RSI doses use the selected SmPC standard and explicit rounding', () => {
  assert.deepEqual(result('rocuronium', '70', { ...patient, induction: 'rsi' }).range, [70, 70]);
  assert.equal(result('rocuronium', '70', { ...patient, induction: 'rsi' }).status, 'in-range');
  assert.deepEqual(result('rocuronium', '41', { ...patient, weightKg: 68 }).range, [41, 41]);
  assert.deepEqual(result('propofol', '140', { ...patient, weightKg: 71 }).range, [110, 175]);
});

test('unsupported dosing profiles are explicitly excluded, without guessed dose intervals', () => {
  assert.equal(canScoreInduction({ ...patient, age: 54 }), true);
  for (const profile of [
    { ...patient, age: 55 }, { ...patient, age: 68 },
    { ...patient, weightKg: 100 }, { ...patient, weightKg: 92 },
  ]) {
    assert.equal(canScoreInduction(profile), false);
    for (const id of ['propofol', 'rocuronium'] as const) {
      const dose = result(id, '100', profile);
      assert.equal(dose.status, 'not-scored');
      assert.equal(dose.reason, 'individual');
      assert.equal(dose.range, undefined);
    }
  }
});

test('optional medication answers do not affect ventilation-only results', () => {
  const results = evaluatePractice(patient, { ...correct, propofol: '', rocuronium: 'Infinity' }, false);
  assert.equal(results.length, 5);
  assert.ok(results.every((item) => item.status === 'in-range'));
});

test('720 distinct profiles vary meaningful patient parameters and all have reachable answers', () => {
  const cases = createPracticeCases();
  assert.equal(cases.length, 720);
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);
  assert.equal(new Set(cases.map(({ sex, age, heightCm, weightKg, induction }) =>
    `${sex}:${age}:${heightCm}:${weightKg}:${induction}`)).size, cases.length);
  assert.equal(new Set(cases.map((item) => item.heightCm)).size, 9);
  assert.ok(cases.some(canScoreInduction));
  assert.ok(cases.some((item) => !canScoreInduction(item)));
  for (const profile of cases) {
    const vt = Math.round(predictedBodyWeight(profile) * 7 / 10) * 10;
    const answers = { ...correct, vt: String(vt) };
    const first = evaluatePractice(profile, answers, true);
    for (const item of first) {
      if (item.range) answers[item.id] = String(item.range[0]);
    }
    // RR must be recalculated after choosing a different VT within the interval.
    const rr = evaluatePractice(profile, answers, true).find((item) => item.id === 'rr')!;
    answers.rr = String(rr.range![0]);
    const graded = evaluatePractice(profile, answers, true).filter((item) => item.status !== 'not-scored');
    assert.ok(graded.every((item) => item.status === 'in-range'), profile.id);
  }
});

test('shuffling is reproducible with a seed, changes order and never repeats inside a deck', () => {
  const first = shuffledPracticeDeck(undefined, seededRandom(42));
  const same = shuffledPracticeDeck(undefined, seededRandom(42));
  const second = shuffledPracticeDeck(undefined, seededRandom(43));
  assert.deepEqual(first, same);
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, createPracticeCases());
  assert.equal(new Set(first.map((item) => item.id)).size, 720);
  assert.deepEqual([...first.map((item) => item.id)].sort(), createPracticeCases().map((item) => item.id).sort());
  const renewed = shuffledPracticeDeck(first[0].id, seededRandom(42));
  assert.notEqual(renewed[0].id, first[0].id);
});

test('initial answers are independent and do not reveal patient-specific targets', () => {
  const one = initialPracticeAnswers();
  one.vt = '1000';
  assert.equal(initialPracticeAnswers().vt, '400');
});
