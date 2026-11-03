import type { MedicationDoseEvent, MedicationEffects } from './medicationModel';
import type { VentilatorSettings } from '../types';

export type CrisisScenarioId =
  | 'bronchospasm'
  | 'inadequate-anesthesia'
  | 'hemorrhage'
  | 'ventilator-disconnect'
  | 'tension-pneumothorax'
  | 'right-mainstem-intubation'
  | 'surgeon-interruption';

export type CrisisState =
  | { status: 'idle' }
  | {
    status: 'active';
    scenarioId: CrisisScenarioId;
    startedAtSeconds: number;
    startingSettings: Pick<VentilatorSettings, 'rr' | 'ieRatio'>;
    startingVolatileMac: number;
    startingSedationLevel: number;
    startingMedicationCount: number;
    volumeSupportRecorded: boolean;
    circuitReconnected: boolean;
    pneumothoraxDecompressed: boolean;
    tubeRepositioned: boolean;
    surgeonRequestAcknowledged: boolean;
  }
  | {
    status: 'recovering';
    scenarioId: CrisisScenarioId;
    startedAtSeconds: number;
    recoveryStartedAtSeconds: number;
    recoveryStartIntensity: number;
  }
  | {
    status: 'recovered';
    scenarioId: CrisisScenarioId;
    startedAtSeconds: number;
    recoveredAtSeconds: number;
  };

export type CrisisIntervention =
  | 'volume-support'
  | 'reconnect-circuit'
  | 'decompress-pneumothorax'
  | 'reposition-tube'
  | 'acknowledge-surgeon-request';

export interface CrisisEffects {
  complianceChange: number;
  resistanceChange: number;
  spontaneousDriveChange: number;
  heartRateChange: number;
  systolicPressureChange: number;
  diastolicPressureChange: number;
  spO2Change: number;
  etCO2Change: number;
  plethAmplitude: number;
  circuitConnected: boolean;
  capnogram: 'normal' | 'shark-fin';
  specialAlarm: 'tension-pneumothorax' | 'right-mainstem-intubation' | null;
  surgeonMessage: boolean;
  intensity: number;
}

export interface CrisisResolutionInputs {
  settings: VentilatorSettings;
  volatileMac: number;
  sedationLevel: number;
  medicationEvents: MedicationDoseEvent[];
  medicationEffects: MedicationEffects;
  deliveredFluidMl?: number;
}

export const CRISIS_RECOVERY_SECONDS = 20;

export const CRISIS_SCENARIOS: Array<{
  id: CrisisScenarioId;
  title: { cs: string; en: string };
  description: { cs: string; en: string };
}> = [
  {
    id: 'bronchospasm',
    title: { cs: 'Bronchospasmus', en: 'Bronchospasm' },
    description: {
      cs: 'Zvýšený odpor, změněná kapnografická křivka a pokles SpO₂ v modelu.',
      en: 'Modeled increased resistance, altered capnogram, and falling SpO₂.',
    },
  },
  {
    id: 'inadequate-anesthesia',
    title: { cs: 'Nedostatečná anestezie', en: 'Inadequate anesthesia' },
    description: {
      cs: 'Zvýšený spontánní drive, tepová frekvence a tlak v modelu.',
      en: 'Modeled increased spontaneous drive, heart rate, and blood pressure.',
    },
  },
  {
    id: 'hemorrhage',
    title: { cs: 'Krvácení / hypovolémie', en: 'Hemorrhage / hypovolemia' },
    description: {
      cs: 'Pokles tlaku, kompenzační tachykardie, nižší amplituda pletysmografie a EtCO₂.',
      en: 'Modeled lower pressure, compensatory tachycardia, reduced pleth amplitude, and EtCO₂.',
    },
  },
  {
    id: 'ventilator-disconnect',
    title: { cs: 'Odpojení ventilátoru', en: 'Ventilator disconnect' },
    description: {
      cs: 'Ztráta tlaku, průtoku, objemu a EtCO₂; aktivace alarmů.',
      en: 'Loss of pressure, flow, volume, and EtCO₂; alarms activate.',
    },
  },
  {
    id: 'tension-pneumothorax',
    title: { cs: 'Tenzní pneumotorax', en: 'Tension pneumothorax' },
    description: {
      cs: 'Model jednostranné ztráty poddajnosti s desaturací, změnou tlaků, tachykardií a poklesem tlaku.',
      en: 'Modeled unilateral loss of compliance with desaturation, pressure changes, tachycardia, and falling blood pressure.',
    },
  },
  {
    id: 'right-mainstem-intubation',
    title: { cs: 'Endobronchiální intubace vpravo', en: 'Right-mainstem intubation' },
    description: {
      cs: 'Model jednostranné ventilace s poklesem poddajnosti, dechového objemu a SpO₂.',
      en: 'Modeled one-lung ventilation with lower compliance, tidal volume, and SpO₂.',
    },
  },
  {
    id: 'surgeon-interruption',
    title: { cs: 'Žádost chirurga o přerušení', en: 'Surgeon requests interruption' },
    description: {
      cs: 'Chirurg žádá o krátké přerušení výkonu a potvrzení koordinace týmu. Fyziologické hodnoty se tímto scénářem nemění.',
      en: 'The surgeon requests a brief pause and team coordination confirmation. This scenario does not change modeled physiology.',
    },
  },
];

export function getCrisisIntensity(crisis: CrisisState, nowSeconds: number): number {
  if (!Number.isFinite(nowSeconds)) return 0;
  if (crisis.status === 'active' || (crisis.status === 'recovered' && crisis.scenarioId === 'hemorrhage')) return 1;
  if (crisis.status !== 'recovering') return 0;
  const progress = Math.max(0, Math.min(1,
    (nowSeconds - crisis.recoveryStartedAtSeconds) / CRISIS_RECOVERY_SECONDS
  ));
  return crisis.recoveryStartIntensity * (1 - progress);
}

export function getCrisisEffects(crisis: CrisisState, nowSeconds: number): CrisisEffects {
  const intensity = getCrisisIntensity(crisis, nowSeconds);
  const effects: CrisisEffects = {
    complianceChange: 0,
    resistanceChange: 0,
    spontaneousDriveChange: 0,
    heartRateChange: 0,
    systolicPressureChange: 0,
    diastolicPressureChange: 0,
    spO2Change: 0,
    etCO2Change: 0,
    plethAmplitude: 1,
    circuitConnected: true,
    capnogram: 'normal',
    specialAlarm: null,
    surgeonMessage: false,
    intensity,
  };
  if (intensity === 0 || crisis.status === 'idle') return effects;

  switch (crisis.scenarioId) {
    case 'bronchospasm':
      effects.complianceChange = -5 * intensity;
      effects.resistanceChange = 22 * intensity;
      effects.spO2Change = -10 * intensity;
      effects.etCO2Change = 5 * intensity;
      effects.capnogram = 'shark-fin';
      break;
    case 'inadequate-anesthesia':
      effects.spontaneousDriveChange = 3 * intensity;
      effects.heartRateChange = 26 * intensity;
      effects.systolicPressureChange = 22 * intensity;
      effects.diastolicPressureChange = 10 * intensity;
      break;
    case 'hemorrhage':
      effects.heartRateChange = 32 * intensity;
      effects.systolicPressureChange = -35 * intensity;
      effects.diastolicPressureChange = -20 * intensity;
      effects.spO2Change = -3 * intensity;
      effects.etCO2Change = -12 * intensity;
      effects.plethAmplitude = 1 - 0.65 * intensity;
      break;
    case 'ventilator-disconnect':
      effects.circuitConnected = crisis.status !== 'active';
      effects.spO2Change = -12 * intensity;
      effects.etCO2Change = -40 * intensity;
      break;
    case 'tension-pneumothorax':
      effects.complianceChange = -18 * intensity;
      effects.resistanceChange = 5 * intensity;
      effects.heartRateChange = 24 * intensity;
      effects.systolicPressureChange = -28 * intensity;
      effects.diastolicPressureChange = -18 * intensity;
      effects.spO2Change = -14 * intensity;
      effects.etCO2Change = -8 * intensity;
      effects.specialAlarm = 'tension-pneumothorax';
      break;
    case 'right-mainstem-intubation':
      effects.complianceChange = -20 * intensity;
      effects.resistanceChange = 4 * intensity;
      effects.spO2Change = -12 * intensity;
      effects.etCO2Change = -6 * intensity;
      effects.specialAlarm = 'right-mainstem-intubation';
      break;
    case 'surgeon-interruption':
      effects.surgeonMessage = crisis.status === 'active';
      break;
  }
  return effects;
}

export function canBeginCrisisRecovery(
  crisis: CrisisState,
  inputs: CrisisResolutionInputs
): boolean {
  if (crisis.status !== 'active') return false;
  switch (crisis.scenarioId) {
    case 'bronchospasm': {
      const expiratoryRatio = Number(inputs.settings.ieRatio.split(':')[1]);
      const settingChanged = inputs.settings.rr < crisis.startingSettings.rr
        || expiratoryRatio > Number(crisis.startingSettings.ieRatio.split(':')[1]);
      const ventilationAdjusted = settingChanged
        && inputs.settings.rr <= 16
        && expiratoryRatio >= 3;
      const volatileAdjusted = inputs.volatileMac > crisis.startingVolatileMac
        && inputs.volatileMac >= 1.5;
      return ventilationAdjusted || volatileAdjusted;
    }
    case 'inadequate-anesthesia': {
      const newSedativeEventIds = new Set(
        inputs.medicationEvents
          .slice(crisis.startingMedicationCount)
          .filter((event) => event.medication === 'propofol' || event.medication === 'sufentanil')
          .map((event) => event.id)
      );
      const newSedativeIntensity = inputs.medicationEffects.contributions
        .filter(({ event }) => newSedativeEventIds.has(event.id))
        .reduce((total, { intensity }) => total + intensity, 0);
      return inputs.sedationLevel >= crisis.startingSedationLevel + 10
        || inputs.volatileMac > crisis.startingVolatileMac + 0.2
        || newSedativeIntensity >= 0.15;
    }
    case 'hemorrhage':
      return (inputs.deliveredFluidMl ?? 0) > 0;
    case 'ventilator-disconnect':
      return crisis.circuitReconnected;
    case 'tension-pneumothorax':
      return crisis.pneumothoraxDecompressed;
    case 'right-mainstem-intubation':
      return crisis.tubeRepositioned;
    case 'surgeon-interruption':
      return crisis.surgeonRequestAcknowledged;
  }
}

export function crisisRecoveryRemaining(crisis: CrisisState, nowSeconds: number): number {
  if (crisis.status !== 'recovering' || !Number.isFinite(nowSeconds)) return 0;
  return Math.max(0, Math.min(
    CRISIS_RECOVERY_SECONDS,
    CRISIS_RECOVERY_SECONDS - (nowSeconds - crisis.recoveryStartedAtSeconds)
  ));
}
