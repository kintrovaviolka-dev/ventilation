import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateMedicationEffects,
  getDoseLimits,
  MedicationDoseEvent,
  validateMedicationDose,
} from './medicationModel';
import { createInitialSimulationState, simulationReducer } from './simulationState';
import { calculatePhysiology } from './physiologyEngine';

function dose(
  medication: MedicationDoseEvent['medication'],
  amount: number,
  administeredAtSeconds = 0,
  administration: MedicationDoseEvent['administration'] = 'bolus'
): MedicationDoseEvent {
  return {
    id: `${medication}-${administeredAtSeconds}-${amount}`,
    medication,
    administration,
    amount,
    unit: administration === 'infusion'
      ? 'mcg/kg/min'
      : medication === 'sufentanil' || medication === 'norepinephrine' ? 'mcg' : 'mg',
    administeredAtSeconds,
  };
}

test('dose validation accepts finite values inside technical bounds and rejects unsafe input shapes', () => {
  assert.equal(validateMedicationDose('propofol', 'bolus', 20).valid, true);
  assert.equal(validateMedicationDose('sufentanil', 'bolus', 0).valid, false);
  assert.equal(validateMedicationDose('rocuronium', 'bolus', 101).valid, false);
  assert.equal(validateMedicationDose('norepinephrine', 'infusion', 0.05).valid, true);
  assert.equal(validateMedicationDose('norepinephrine', 'infusion', 2).valid, false);
  assert.equal(validateMedicationDose('atropine', 'infusion', 1).valid, false);
  assert.equal(validateMedicationDose('atropine', 'bolus', Number.NaN).valid, false);
  assert.equal(validateMedicationDose('norepinephrine', 'infusion', 0.0025).valid, false);
});

test('dose definitions preserve each medicine unit and supported administration form', () => {
  assert.equal(getDoseLimits('propofol', 'bolus')?.max, 500);
  assert.equal(getDoseLimits('sufentanil', 'bolus')?.step, 1);
  assert.equal(getDoseLimits('norepinephrine', 'infusion')?.min, 0.001);
  assert.equal(getDoseLimits('norepinephrine', 'bolus')?.max, 100);
  assert.equal(getDoseLimits('atropine', 'bolus')?.step, 0.01);
  assert.equal(getDoseLimits('rocuronium', 'infusion'), undefined);
});

test('each supported medicine has its own modeled physiological effect', () => {
  const events = [
    dose('propofol', 50),
    dose('sufentanil', 10),
    dose('rocuronium', 20),
    dose('norepinephrine', 8),
    dose('atropine', 0.5),
  ];
  const effects = calculateMedicationEffects(events, 0);

  assert.ok(effects.sedation > 0);
  assert.ok(effects.neuromuscularBlock > 0);
  assert.ok(effects.spontaneousDriveSuppression > 0);
  assert.ok(effects.systolicPressureChange > 0);
  assert.ok(effects.heartRateChange > 0);
});

test('bolus effects decay from simulation-time timestamps and sum repeat administrations independently', () => {
  const first = dose('propofol', 50, 0);
  const later = dose('propofol', 50, 90);
  const initial = calculateMedicationEffects([first], 0);
  const afterOneHalfLife = calculateMedicationEffects([first], 90);
  const repeated = calculateMedicationEffects([first, later], 90);
  const afterBothDecay = calculateMedicationEffects([first, later], 180);

  assert.equal(initial.sedation, 0.5);
  assert.ok(Math.abs(afterOneHalfLife.sedation - 0.25) < 1e-9);
  assert.equal(repeated.sedation, 0.75);
  assert.ok(afterBothDecay.sedation < repeated.sedation);
});

test('norepinephrine infusion reaches modeled effect, then decays after explicit stop', () => {
  const infusion = dose('norepinephrine', 0.05, 0, 'infusion');
  const ramping = calculateMedicationEffects([infusion], 30);
  const stopped = { ...infusion, stoppedAtSeconds: 60 };
  const during = calculateMedicationEffects([stopped], 60);
  const afterStop = calculateMedicationEffects([stopped], 180);

  assert.ok(ramping.systolicPressureChange > 0);
  assert.ok(during.systolicPressureChange > ramping.systolicPressureChange);
  assert.ok(afterStop.systolicPressureChange < during.systolicPressureChange);
});

test('modeled rocuronium effect reduces spontaneous-drive contribution in PSV', () => {
  const baselinePatient = { compliance: 50, resistance: 8, spontaneousDrive: 2, preset: 'normal' as const };
  const rocuronium = dose('rocuronium', 20);
  const effect = calculateMedicationEffects([rocuronium], 0);
  const baseline = calculatePhysiology(
    { fio2: 40, rr: 12, vt: 500, pinsp: 20, peep: 5, ieRatio: '1:2', pSupport: 10 },
    baselinePatient,
    'ps'
  );
  const reducedDrive = calculatePhysiology(
    { fio2: 40, rr: 12, vt: 500, pinsp: 20, peep: 5, ieRatio: '1:2', pSupport: 10 },
    { ...baselinePatient, spontaneousDrive: Math.max(0, baselinePatient.spontaneousDrive - effect.spontaneousDriveSuppression) },
    'ps'
  );

  assert.ok(effect.neuromuscularBlock > 0);
  assert.ok(reducedDrive.vTe < baseline.vTe);
});

test('medication events are reducer-owned, repeatable, and stoppable without changing prior events', () => {
  const state = createInitialSimulationState({
    fio2: 40,
    rr: 12,
    vt: 500,
    pinsp: 20,
    peep: 5,
    ieRatio: '1:2',
    pSupport: 10,
  });
  const first = dose('atropine', 0.5, 2);
  const withFirst = simulationReducer(state, { type: 'medication-administered', event: first });
  const infusion = dose('norepinephrine', 0.05, 3, 'infusion');
  const withInfusion = simulationReducer(withFirst, { type: 'medication-administered', event: infusion });
  const stopped = simulationReducer(withInfusion, {
    type: 'medication-infusion-stopped',
    id: infusion.id,
    stoppedAtSeconds: 8,
  });
  const repeated = simulationReducer(stopped, {
    type: 'medication-administered',
    event: dose('atropine', 0.5, 9),
  });

  assert.equal(state.medicationEvents.length, 0);
  assert.equal(withFirst.medicationEvents.length, 1);
  assert.equal(stopped.medicationEvents[1].stoppedAtSeconds, 8);
  assert.equal(stopped.medicationEvents[0].stoppedAtSeconds, undefined);
  assert.equal(repeated.medicationEvents.length, 3);
});
