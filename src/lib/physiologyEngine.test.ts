import assert from 'node:assert/strict';
import test from 'node:test';
import { getCapnogramValue, calculatePhysiology } from './physiologyEngine';
import { VentilatorSettings } from '../types';
import {
  createInitialSimulationState,
  simulationReducer,
  DEFAULT_PATIENT_PARAMS,
} from './simulationState';
import { getInstantaneousBreath } from './waveformMath';

const settings: VentilatorSettings = {
  fio2: 40,
  rr: 12,
  vt: 500,
  pinsp: 20,
  peep: 5,
  ieRatio: '1:2',
  pSupport: 10,
};

test('default patient mechanics are compliance 50, resistance 8, and spontaneous drive 2', () => {
  assert.deepEqual(DEFAULT_PATIENT_PARAMS, {
    compliance: 50,
    resistance: 8,
    spontaneousDrive: 2,
    preset: 'normal',
  });
});

test('Ppeak and Pplat follow elastic and resistive pressure components', () => {
  const result = calculatePhysiology(
    { ...settings, rr: 20, vt: 600, peep: 6, ieRatio: '1:1' },
    DEFAULT_PATIENT_PARAMS,
    'vc'
  );
  const inspiratoryFlow = 0.6 / (60 / 20 / 2);
  const expectedPlateau = 6 + 600 / 50;

  assert.equal(result.inspiratoryFlow, 0.4);
  assert.equal(result.pPlat, expectedPlateau);
  assert.equal(result.pPeak, Math.round(expectedPlateau + inspiratoryFlow * 8));
});

test('Ppeak readout agrees with the peak Paw waveform in each ventilator mode', () => {
  for (const mode of ['vc', 'pc', 'simv', 'ps'] as const) {
    const result = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, mode);
    const ieParts = settings.ieRatio.split(':');
    const inspTime = (60 / settings.rr) / (1 + Number(ieParts[1]));
    const waveformPeak = Math.max(
      getInstantaneousBreath(0, settings, DEFAULT_PATIENT_PARAMS, mode).pressure,
      getInstantaneousBreath(inspTime - 1e-6, settings, DEFAULT_PATIENT_PARAMS, mode).pressure
    );

    assert.equal(result.pPeak, Math.round(waveformPeak), `${mode} mode`);
  }
});

test('ventilator setting and patient mechanics changes update pressure and ventilation readings', () => {
  const baseline = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'vc');
  const increasedPeep = calculatePhysiology({ ...settings, peep: 10 }, DEFAULT_PATIENT_PARAMS, 'vc');
  const reducedCompliance = calculatePhysiology(
    settings,
    { ...DEFAULT_PATIENT_PARAMS, compliance: 25 },
    'vc'
  );
  const fasterRate = calculatePhysiology({ ...settings, rr: 24 }, DEFAULT_PATIENT_PARAMS, 'vc');

  assert.equal(increasedPeep.pPlat - baseline.pPlat, 5);
  assert.ok(reducedCompliance.pPlat > baseline.pPlat);
  assert.ok(fasterRate.inspiratoryFlow > baseline.inspiratoryFlow);
  assert.ok(fasterRate.pPeak > baseline.pPeak);
  assert.notEqual(fasterRate.etCO2, baseline.etCO2);
});

test('Paw waveform uses elastic and resistive components and PSV responds to spontaneous drive', () => {
  const breath = getInstantaneousBreath(0.5, settings, DEFAULT_PATIENT_PARAMS, 'vc');
  const expectedPressure = settings.peep
    + breath.volume / DEFAULT_PATIENT_PARAMS.compliance
    + (breath.flow / 60) * DEFAULT_PATIENT_PARAMS.resistance;
  const passiveSupportBreath = getInstantaneousBreath(
    0.5,
    settings,
    { ...DEFAULT_PATIENT_PARAMS, spontaneousDrive: 0 },
    'ps'
  );
  const drivenSupportBreath = getInstantaneousBreath(0.5, settings, DEFAULT_PATIENT_PARAMS, 'ps');

  assert.ok(Math.abs(breath.pressure - expectedPressure) < 1e-9);
  assert.ok(drivenSupportBreath.volume > passiveSupportBreath.volume);
});

test('capnogram is synchronized with inspiration and remains continuous in expiration', () => {
  for (const ratio of [1, 2, 3, 4]) {
    const inspiration = 5 / (1 + ratio);
    const time = (exp: number) => inspiration + exp * (5 - inspiration);
    assert.equal(getCapnogramValue(inspiration / 2, 12, 40, 'normal', `1:${ratio}`), 0);
    assert.equal(getCapnogramValue(time(0.04), 12, 40, 'normal', `1:${ratio}`), 0);
    assert.ok(getCapnogramValue(time(0.15), 12, 40, 'normal', `1:${ratio}`) > 0);
    assert.ok(getCapnogramValue(time(0.9), 12, 40, 'normal', `1:${ratio}`) > 38);
    assert.ok(getCapnogramValue(time(0.99), 12, 40, 'normal', `1:${ratio}`) < 11);
    const before = getCapnogramValue(time(0.22 - 1e-7), 12, 40, 'normal', `1:${ratio}`);
    const after = getCapnogramValue(time(0.22 + 1e-7), 12, 40, 'normal', `1:${ratio}`);
    assert.ok(Math.abs(before - after) < .001);
  }
});

test('zero PEEP and zero pressure support remain zero in waveform and readouts', () => {
  const zero = { ...settings, peep: 0, pSupport: 0 };
  const passive = { ...DEFAULT_PATIENT_PARAMS, spontaneousDrive: 0 };
  assert.equal(getInstantaneousBreath(0, zero, passive, 'vc').pressure, 0);
  for (const time of [0, .5, 2, 4]) {
    const breath = getInstantaneousBreath(time, zero, passive, 'ps');
    assert.equal(breath.volume, 0);
    assert.equal(breath.pressure, 0);
  }
  assert.equal(calculatePhysiology(zero, passive, 'ps').vTe, 0);
});

test('pressure-mode volume and peak flow readouts use the same timing as their traces', () => {
  for (const mode of ['pc', 'ps'] as const) for (const rr of [6, 12, 40]) for (const ratio of [1, 2, 4]) {
    const input = { ...settings, rr, ieRatio: `1:${ratio}` };
    const result = calculatePhysiology(input, DEFAULT_PATIENT_PARAMS, mode);
    const end = getInstantaneousBreath(60 / rr / (1 + ratio) - 1e-7, input, DEFAULT_PATIENT_PARAMS, mode);
    assert.ok(Math.abs(result.vTe - end.volume) <= 1, `${mode} ${rr} 1:${ratio}`);
    assert.equal(result.flowPeak, Math.round(getInstantaneousBreath(0, input, DEFAULT_PATIENT_PARAMS, mode).flow));
  }
});

test('central simulation reducer owns settings, mode, and patient updates', () => {
  const state = createInitialSimulationState(settings);
  const next = simulationReducer(state, {
    type: 'settings',
    update: (previous) => ({ ...previous, peep: 8 }),
  });
  const withMode = simulationReducer(next, { type: 'mode', mode: 'ps' });
  const withPatient = simulationReducer(withMode, {
    type: 'patient',
    patient: { ...DEFAULT_PATIENT_PARAMS, resistance: 12 },
  });

  assert.equal(state.settings.peep, 5);
  assert.equal(withPatient.settings.peep, 8);
  assert.equal(withPatient.mode, 'ps');
  assert.equal(withPatient.patient.resistance, 12);
});


test('extreme settings do not silently clip pressure, flow or volume before monitoring', () => {
  const high = { ...settings, rr:40, vt:800, ieRatio:'1:4' };
  const stiff = { ...DEFAULT_PATIENT_PARAMS, compliance:10, resistance:30 };
  const readings = calculatePhysiology(high, stiff, 'vc');
  assert.ok(readings.pPeak > readings.pPlat);
  assert.ok(readings.pPeak > 80);
  const pressure = { ...settings, pinsp:40 };
  const compliant = { ...DEFAULT_PATIENT_PARAMS, compliance:62 };
  const pc = calculatePhysiology(pressure, compliant, 'pc');
  assert.ok(pc.vTe > 1200);
  const end = getInstantaneousBreath(5 / 3 - 1e-6, pressure, compliant, 'pc');
  assert.ok(Math.abs(end.volume - pc.vTe) < 1);
});
