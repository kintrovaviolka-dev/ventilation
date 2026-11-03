import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CrisisEnginePanel } from '../components/CrisisEnginePanel';
import { detectAlarms } from './alarmEngine';
import {
  canBeginCrisisRecovery,
  CRISIS_RECOVERY_SECONDS,
  CrisisScenarioId,
  getCrisisEffects,
  getCrisisIntensity,
} from './crisisEngine';
import { calculateMedicationEffects, MedicationDoseEvent } from './medicationModel';
import { calculatePhysiology, getCapnogramValue } from './physiologyEngine';
import { DEFAULT_PATIENT_PARAMS, createInitialSimulationState, simulationReducer } from './simulationState';
import { getInstantaneousBreath } from './waveformMath';
import type { VentilatorSettings } from '../types';

const settings: VentilatorSettings = {
  fio2: 40,
  rr: 12,
  vt: 500,
  pinsp: 20,
  peep: 5,
  ieRatio: '1:2',
  pSupport: 10,
};

function activeCrisis(scenarioId: CrisisScenarioId, initialSettings = settings, medicationCount = 0) {
  const state = createInitialSimulationState(initialSettings);
  return simulationReducer(state, {
    type: 'crisis-start',
    scenarioId,
    startedAtSeconds: 10,
    settings: initialSettings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationCount,
  });
}

function medicationEvent(medication: MedicationDoseEvent['medication']): MedicationDoseEvent {
  return {
    id: 'after-crisis',
    medication,
    administration: 'bolus',
    amount: medication === 'propofol' ? 50 : 10,
    unit: medication === 'sufentanil' || medication === 'norepinephrine' ? 'mcg' : 'mg',
    administeredAtSeconds: 11,
  };
}

test('crisis onset produces the declared independent monitor and mechanics effects', () => {
  const bronchospasm = getCrisisEffects(activeCrisis('bronchospasm').crisis, 10);
  assert.equal(bronchospasm.resistanceChange, 22);
  assert.equal(bronchospasm.spO2Change, -10);
  assert.equal(bronchospasm.capnogram, 'shark-fin');

  const anesthesia = getCrisisEffects(activeCrisis('inadequate-anesthesia').crisis, 10);
  assert.equal(anesthesia.spontaneousDriveChange, 3);
  assert.equal(anesthesia.heartRateChange, 26);
  assert.equal(anesthesia.systolicPressureChange, 22);

  const hemorrhage = getCrisisEffects(activeCrisis('hemorrhage').crisis, 10);
  assert.equal(hemorrhage.systolicPressureChange, -35);
  assert.equal(hemorrhage.heartRateChange, 32);
  assert.equal(hemorrhage.plethAmplitude, 0.35);
  assert.equal(hemorrhage.etCO2Change, -12);

  const disconnect = getCrisisEffects(activeCrisis('ventilator-disconnect').crisis, 10);
  assert.equal(disconnect.circuitConnected, false);
});

test('bronchospasm integrates elevated airway resistance, desaturation, shark-fin capnogram, and low-saturation alarm', () => {
  const crisis = activeCrisis('bronchospasm').crisis;
  const effects = getCrisisEffects(crisis, 10);
  const patient = {
    ...DEFAULT_PATIENT_PARAMS,
    compliance: DEFAULT_PATIENT_PARAMS.compliance + effects.complianceChange,
    resistance: DEFAULT_PATIENT_PARAMS.resistance + effects.resistanceChange,
  };
  const baseline = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'vc');
  const crisisReadings = calculatePhysiology(settings, patient, 'vc');
  const adjustedSpO2 = Math.round(crisisReadings.spO2 + effects.spO2Change);
  const alarms = detectAlarms({ ...crisisReadings, spO2: adjustedSpO2 }, 'en');
  const phaseTime = (phase: number) => phase * 60 / settings.rr;

  assert.ok(crisisReadings.pPeak > baseline.pPeak);
  assert.ok(adjustedSpO2 < baseline.spO2);
  assert.ok(alarms.some(({ id }) => id.startsWith('lowSpO2')));
  const sampleTime = phaseTime(0.55); // Mid-expiration on the shared respiratory clock.
  const sharkFinValue = getCapnogramValue(sampleTime, settings.rr, 40, 'shark-fin');
  assert.ok(sharkFinValue > 0);
  assert.ok(sharkFinValue < getCapnogramValue(sampleTime, settings.rr, 40, 'normal'));
});

test('inadequate anesthesia changes modeled PSV effort and shows a surgeon prompt', () => {
  const crisis = activeCrisis('inadequate-anesthesia').crisis;
  const effects = getCrisisEffects(crisis, 10);
  const patient = { ...DEFAULT_PATIENT_PARAMS, spontaneousDrive: 2 + effects.spontaneousDriveChange };
  const unsupported = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'ps');
  const crisisReadings = calculatePhysiology(settings, patient, 'ps');
  const markup = renderToStaticMarkup(createElement(CrisisEnginePanel, {
    language: 'en',
    crisis,
    nowSeconds: 10,
    recoveryReady: false,
    onStart: () => {},
    onBeginRecovery: () => {},
    onRecordVolumeSupport: () => {},
    onReconnectCircuit: () => {},
    onDecompressPneumothorax: () => {},
    onRepositionTube: () => {},
    onAcknowledgeSurgeonRequest: () => {},
    onReset: () => {},
  }));

  assert.ok(crisisReadings.vTe > unsupported.vTe);
  assert.match(markup, /SURGEON: The patient is moving/);
  assert.match(markup, /GRADUAL RECOVERY|SCENARIO ACTIVE/);
  assert.match(markup, /disabled/);
});

test('hemorrhage affects vital monitor and pleth waveform input while retaining ventilator settings', () => {
  const crisis = activeCrisis('hemorrhage');
  const effects = getCrisisEffects(crisis.crisis, 10);
  const norepinephrine = medicationEvent('norepinephrine');
  const medicationEffects = calculateMedicationEffects([norepinephrine], 11);
  const baselineVitals = { hr: 72, sbp: 118, dbp: 76 };

  assert.ok(baselineVitals.hr + effects.heartRateChange + medicationEffects.heartRateChange > 104);
  assert.ok(baselineVitals.sbp + effects.systolicPressureChange
    + medicationEffects.systolicPressureChange > 83);
  assert.equal(baselineVitals.dbp + effects.diastolicPressureChange, 56);
  assert.equal(effects.plethAmplitude, 0.35);
  assert.equal(crisis.settings, settings);
});

test('disconnect collapses Paw, flow, volume, readings and capnography and raises a critical alarm', () => {
  const crisis = activeCrisis('ventilator-disconnect').crisis;
  const effects = getCrisisEffects(crisis, 10);
  const breath = getInstantaneousBreath(0.5, settings, DEFAULT_PATIENT_PARAMS, 'vc', effects.circuitConnected);
  const readings = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'vc', effects.circuitConnected);
  const alarms = detectAlarms(readings, 'en');

  assert.deepEqual([breath.pressure, breath.flow, breath.volume], [0, 0, 0]);
  assert.deepEqual([readings.pPeak, readings.vTe, readings.mVe, readings.etCO2], [0, 0, 0, 0]);
  assert.ok(alarms.some(({ id }) => id === 'lowMV_critical'));
  assert.ok(alarms.some(({ id }) => id === 'etco2Low_critical'));
});

test('disconnect reconnects immediately while other modeled effects fade during recovery', () => {
  const active = simulationReducer(activeCrisis('ventilator-disconnect'), { type: 'crisis-intervention', intervention: 'reconnect-circuit' });
  const recovering = simulationReducer(active, {
    type: 'crisis-begin-recovery',
    atSeconds: 20,
    intensity: 1,
    inputs: { settings, volatileMac: 1.2, sedationLevel: 50, medicationEvents: [], medicationEffects: calculateMedicationEffects([], 20) },
  });
  const atOnset = getCrisisEffects(recovering.crisis, 20);
  const halfway = getCrisisEffects(recovering.crisis, 30);

  assert.equal(atOnset.circuitConnected, true);
  assert.equal(atOnset.intensity, 1);
  assert.equal(halfway.intensity, 0.5);
  assert.equal(halfway.circuitConnected, true);
  assert.equal(halfway.etCO2Change, -20);
});

test('tension pneumothorax produces unilateral mechanics, desaturation, hemodynamic changes, and a critical alarm', () => {
  const crisis = activeCrisis('tension-pneumothorax').crisis;
  const effects = getCrisisEffects(crisis, 10);
  const patient = {
    ...DEFAULT_PATIENT_PARAMS,
    compliance: DEFAULT_PATIENT_PARAMS.compliance + effects.complianceChange,
    resistance: DEFAULT_PATIENT_PARAMS.resistance + effects.resistanceChange,
  };
  const baseline = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'vc');
  const readings = calculatePhysiology(settings, patient, 'vc');
  const adjusted = {
    ...readings,
    spO2: Math.round(readings.spO2 + effects.spO2Change),
  };
  const alarms = detectAlarms(adjusted, 'en');

  assert.ok(readings.pPeak > baseline.pPeak);
  assert.ok(adjusted.spO2 < baseline.spO2);
  assert.equal(effects.heartRateChange, 24);
  assert.equal(effects.systolicPressureChange, -28);
  assert.ok(alarms.some(({ id }) => id === 'crisis_tension_pneumothorax' || id.startsWith('lowSpO2')));
});

test('right-mainstem intubation reduces pressure-controlled tidal volume and raises an explicit alarm', () => {
  const crisis = activeCrisis('right-mainstem-intubation').crisis;
  const effects = getCrisisEffects(crisis, 10);
  const baseline = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'pc');
  const affected = calculatePhysiology(settings, {
    ...DEFAULT_PATIENT_PARAMS,
    compliance: DEFAULT_PATIENT_PARAMS.compliance + effects.complianceChange,
    resistance: DEFAULT_PATIENT_PARAMS.resistance + effects.resistanceChange,
  }, 'pc');

  assert.ok(affected.vTe < baseline.vTe);
  assert.equal(effects.specialAlarm, 'right-mainstem-intubation');
  assert.equal(effects.spO2Change, -12);
});

test('surgeon interruption displays the request without altering simulated physiology', () => {
  const crisis = activeCrisis('surgeon-interruption').crisis;
  const effects = getCrisisEffects(crisis, 10);
  const baseline = calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'vc');
  const markup = renderToStaticMarkup(createElement(CrisisEnginePanel, {
    language: 'en',
    crisis,
    nowSeconds: 10,
    recoveryReady: false,
    onStart: () => {},
    onBeginRecovery: () => {},
    onRecordVolumeSupport: () => {},
    onReconnectCircuit: () => {},
    onDecompressPneumothorax: () => {},
    onRepositionTube: () => {},
    onAcknowledgeSurgeonRequest: () => {},
    onReset: () => {},
  }));
  const message = 'SURGEON: Please pause the procedure briefly and confirm team coordination.';

  assert.equal(effects.surgeonMessage, true);
  assert.equal(effects.heartRateChange, 0);
  assert.equal(effects.systolicPressureChange, 0);
  assert.equal(calculatePhysiology(settings, DEFAULT_PATIENT_PARAMS, 'vc').vTe, baseline.vTe);
  assert.match(markup, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(markup, /Acknowledge pause and team coordination/);
});

test('recovery requires an appropriate post-onset intervention and never resolves itself', () => {
  const bronchospasm = activeCrisis('bronchospasm');
  assert.equal(canBeginCrisisRecovery(bronchospasm.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), false);
  assert.equal(canBeginCrisisRecovery(bronchospasm.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 1000),
  }), false);
  assert.equal(canBeginCrisisRecovery(bronchospasm.crisis, {
    settings: { ...settings, rr: 12, ieRatio: '1:3' },
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), true);
  assert.equal(bronchospasm.crisis.status, 'active');

  const anesthesia = activeCrisis('inadequate-anesthesia');
  const propofol = medicationEvent('propofol');
  assert.equal(canBeginCrisisRecovery(anesthesia.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [propofol],
    medicationEffects: calculateMedicationEffects([propofol], 11),
  }), true);
  const priorPropofol = { ...propofol, id: 'before-crisis', administeredAtSeconds: 1 };
  const unrelatedAtropine = { ...medicationEvent('atropine'), id: 'after-crisis-atropine' };
  const anesthesiaWithPriorSedation = activeCrisis('inadequate-anesthesia', settings, 1);
  assert.equal(canBeginCrisisRecovery(anesthesiaWithPriorSedation.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [priorPropofol, unrelatedAtropine],
    medicationEffects: calculateMedicationEffects([priorPropofol, unrelatedAtropine], 11),
  }), false);
  const sufentanil = medicationEvent('sufentanil');
  assert.equal(canBeginCrisisRecovery(anesthesiaWithPriorSedation.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [priorPropofol, unrelatedAtropine, sufentanil],
    medicationEffects: calculateMedicationEffects([priorPropofol, unrelatedAtropine, sufentanil], 11),
  }), true);

  const hemorrhage = activeCrisis('hemorrhage');
  assert.equal(canBeginCrisisRecovery(hemorrhage.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), false);
  const supported = simulationReducer(hemorrhage, {
    type: 'crisis-intervention',
    intervention: 'volume-support',
  });
  assert.equal(canBeginCrisisRecovery(supported.crisis, {
    deliveredFluidMl: 60,
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), true);

  const disconnect = activeCrisis('ventilator-disconnect');
  assert.equal(canBeginCrisisRecovery(disconnect.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), false);
  const reconnected = simulationReducer(disconnect, {
    type: 'crisis-intervention',
    intervention: 'reconnect-circuit',
  });
  assert.equal(canBeginCrisisRecovery(reconnected.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), true);

  const tension = activeCrisis('tension-pneumothorax');
  assert.equal(canBeginCrisisRecovery(tension.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), false);
  const decompressed = simulationReducer(tension, {
    type: 'crisis-intervention',
    intervention: 'decompress-pneumothorax',
  });
  assert.equal(canBeginCrisisRecovery(decompressed.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), true);

  const rightMainstem = activeCrisis('right-mainstem-intubation');
  assert.equal(canBeginCrisisRecovery(rightMainstem.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), false);
  const repositioned = simulationReducer(rightMainstem, {
    type: 'crisis-intervention',
    intervention: 'reposition-tube',
  });
  assert.equal(canBeginCrisisRecovery(repositioned.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), true);

  const interruption = activeCrisis('surgeon-interruption');
  assert.equal(canBeginCrisisRecovery(interruption.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), false);
  const acknowledged = simulationReducer(interruption, {
    type: 'crisis-intervention',
    intervention: 'acknowledge-surgeon-request',
  });
  assert.equal(canBeginCrisisRecovery(acknowledged.crisis, {
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationEvents: [],
    medicationEffects: calculateMedicationEffects([], 11),
  }), true);
});

test('reducer prevents overlapping crises and recovery fades smoothly before reset', () => {
  const initial = simulationReducer(activeCrisis('surgeon-interruption'), { type: 'crisis-intervention', intervention: 'acknowledge-surgeon-request' });
  const rejectedOverlap = simulationReducer(initial, {
    type: 'crisis-start',
    scenarioId: 'bronchospasm',
    startedAtSeconds: 12,
    settings,
    volatileMac: 1.2,
    sedationLevel: 50,
    medicationCount: 0,
  });
  assert.equal(rejectedOverlap, initial);

  const recovering = simulationReducer(initial, {
    type: 'crisis-begin-recovery',
    atSeconds: 20,
    intensity: getCrisisIntensity(initial.crisis, 20),
    inputs: { settings, volatileMac: 1.2, sedationLevel: 50, medicationEvents: [], medicationEffects: calculateMedicationEffects([], 20) },
  });
  assert.equal(getCrisisIntensity(recovering.crisis, 20), 1);
  assert.equal(getCrisisIntensity(recovering.crisis, 20 + CRISIS_RECOVERY_SECONDS / 2), 0.5);
  assert.equal(getCrisisEffects(recovering.crisis, 20 + CRISIS_RECOVERY_SECONDS).intensity, 0);

  const tooEarly = simulationReducer(recovering, {
    type: 'crisis-finish-recovery',
    atSeconds: 20 + CRISIS_RECOVERY_SECONDS - 0.1,
  });
  assert.equal(tooEarly.crisis.status, 'recovering');
  const recovered = simulationReducer(recovering, {
    type: 'crisis-finish-recovery',
    atSeconds: 20 + CRISIS_RECOVERY_SECONDS,
  });
  assert.equal(recovered.crisis.status, 'recovered');
  assert.equal(getCrisisEffects(recovered.crisis, 41).heartRateChange, 0);
  assert.deepEqual(simulationReducer(recovered, { type: 'crisis-reset' }).crisis, { status: 'idle' });
  assert.equal(simulationReducer(initial, {
    type: 'crisis-intervention',
    intervention: 'reconnect-circuit',
  }), initial);
  assert.equal(simulationReducer(initial, {
    type: 'crisis-intervention',
    intervention: 'decompress-pneumothorax',
  }), initial);
});

test('crisis panel exposes deterministic scenario selection and the prominent trigger', () => {
  const markup = renderToStaticMarkup(createElement(CrisisEnginePanel, {
    language: 'cs',
    crisis: { status: 'idle' },
    nowSeconds: 0,
    recoveryReady: false,
    onStart: () => {},
    onBeginRecovery: () => {},
    onRecordVolumeSupport: () => {},
    onReconnectCircuit: () => {},
    onDecompressPneumothorax: () => {},
    onRepositionTube: () => {},
    onAcknowledgeSurgeonRequest: () => {},
    onReset: () => {},
  }));

  assert.match(markup, /NĚCO SE DĚJE/);
  assert.match(markup, /Zkušební scénář/);
  assert.match(markup, /Spustit vybraný scénář/);
  for (const scenarioId of [
    'bronchospasm',
    'inadequate-anesthesia',
    'hemorrhage',
    'ventilator-disconnect',
    'tension-pneumothorax',
    'right-mainstem-intubation',
    'surgeon-interruption',
  ]) {
    assert.match(markup, new RegExp(`value="${scenarioId}"`));
  }
});


test('direct reducer recovery dispatch without verified context cannot bypass an intervention', () => {
  const active = activeCrisis('ventilator-disconnect');
  assert.equal(simulationReducer(active, { type:'crisis-begin-recovery', atSeconds:20, intensity:1 }),active);
  assert.equal(simulationReducer(active, { type:'crisis-begin-recovery', atSeconds:20, intensity:1,
    inputs:{settings,volatileMac:1.2,sedationLevel:50,medicationEvents:[],medicationEffects:calculateMedicationEffects([],20)} }),active);
});
