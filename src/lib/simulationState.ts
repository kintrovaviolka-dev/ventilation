import type { Dispatch, SetStateAction } from 'react';
import { PatientParams, VentilatorSettings, VentMode } from '../types';
import { validMedicationEvent, MedicationDoseEvent } from './medicationModel';
import {
  canBeginCrisisRecovery,
  CrisisResolutionInputs,
  CrisisIntervention,
  CrisisScenarioId,
  CrisisState,
  CRISIS_RECOVERY_SECONDS,
  CRISIS_SCENARIOS,
} from './crisisEngine';

export interface SimulationState {
  settings: VentilatorSettings;
  mode: VentMode;
  patient: PatientParams;
  medicationEvents: MedicationDoseEvent[];
  crisis: CrisisState;
}

export type SimulationAction =
  | { type: 'settings'; update: SetStateAction<VentilatorSettings> }
  | { type: 'mode'; mode: VentMode }
  | { type: 'patient'; patient: PatientParams }
  | { type: 'medication-administered'; event: MedicationDoseEvent }
  | { type: 'medication-infusion-stopped'; id: string; stoppedAtSeconds: number }
  | { type: 'medications-reset' }
  | {
    type: 'crisis-start';
    scenarioId: CrisisScenarioId;
    startedAtSeconds: number;
    settings: VentilatorSettings;
    volatileMac: number;
    sedationLevel: number;
    medicationCount: number;
  }
  | { type: 'crisis-intervention'; intervention: CrisisIntervention }
  | { type: 'crisis-begin-recovery'; atSeconds: number; intensity: number; inputs?: CrisisResolutionInputs }
  | { type: 'crisis-finish-recovery'; atSeconds: number }
  | { type: 'crisis-reset' };

export const DEFAULT_PATIENT_PARAMS: PatientParams = {
  compliance: 50,
  resistance: 8,
  spontaneousDrive: 2,
  preset: 'normal',
};

export function createInitialSimulationState(
  settings: VentilatorSettings,
  patient: PatientParams = DEFAULT_PATIENT_PARAMS
): SimulationState {
  return { settings, mode: 'vc', patient, medicationEvents: [], crisis: { status: 'idle' } };
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'settings':
      return {
        ...state,
        settings: typeof action.update === 'function'
          ? action.update(state.settings)
          : action.update,
      };
    case 'mode':
      return { ...state, mode: action.mode };
    case 'patient':
      return { ...state, patient: action.patient };
    case 'medication-administered':
      if (!validMedicationEvent(action.event) || state.medicationEvents.some(event => event.id === action.event.id)) return state;
      return { ...state, medicationEvents: [...state.medicationEvents, action.event] };
    case 'medication-infusion-stopped':
      if (!Number.isFinite(action.stoppedAtSeconds) || action.stoppedAtSeconds < 0) return state;
      return {
        ...state,
        medicationEvents: state.medicationEvents.map((event) =>
          event.id === action.id
            && event.administration === 'infusion'
            && event.stoppedAtSeconds === undefined
            ? { ...event, stoppedAtSeconds: Math.max(event.administeredAtSeconds, action.stoppedAtSeconds) }
            : event
        ),
      };
    case 'medications-reset':
      return { ...state, medicationEvents: [] };
    case 'crisis-start':
      if (!CRISIS_SCENARIOS.some(scenario=>scenario.id===action.scenarioId) || state.crisis.status === 'active' || state.crisis.status === 'recovering'
        || !Number.isFinite(action.startedAtSeconds) || action.startedAtSeconds < 0) return state;
      return {
        ...state,
        crisis: {
          status: 'active',
          scenarioId: action.scenarioId,
          startedAtSeconds: action.startedAtSeconds,
          startingSettings: { rr: action.settings.rr, ieRatio: action.settings.ieRatio },
          startingVolatileMac: action.volatileMac,
          startingSedationLevel: action.sedationLevel,
          startingMedicationCount: action.medicationCount,
          volumeSupportRecorded: false,
          circuitReconnected: false,
          pneumothoraxDecompressed: false,
          tubeRepositioned: false,
          surgeonRequestAcknowledged: false,
        },
      };
    case 'crisis-intervention':
      if (state.crisis.status !== 'active' || !['volume-support','reconnect-circuit','decompress-pneumothorax','reposition-tube','acknowledge-surgeon-request'].includes(action.intervention)) return state;
      if ((action.intervention === 'volume-support' && state.crisis.scenarioId !== 'hemorrhage')
        || (action.intervention === 'reconnect-circuit' && state.crisis.scenarioId !== 'ventilator-disconnect')
        || (action.intervention === 'decompress-pneumothorax' && state.crisis.scenarioId !== 'tension-pneumothorax')
        || (action.intervention === 'reposition-tube' && state.crisis.scenarioId !== 'right-mainstem-intubation')
        || (action.intervention === 'acknowledge-surgeon-request' && state.crisis.scenarioId !== 'surgeon-interruption')) {
        return state;
      }
      return {
        ...state,
        crisis: action.intervention === 'volume-support'
          ? { ...state.crisis, volumeSupportRecorded: true }
          : action.intervention === 'reconnect-circuit'
            ? { ...state.crisis, circuitReconnected: true }
            : action.intervention === 'decompress-pneumothorax'
              ? { ...state.crisis, pneumothoraxDecompressed: true }
              : action.intervention === 'reposition-tube'
                ? { ...state.crisis, tubeRepositioned: true }
                : { ...state.crisis, surgeonRequestAcknowledged: true },
      };
    case 'crisis-begin-recovery': {
      if (!action.inputs || !canBeginCrisisRecovery(state.crisis, { ...action.inputs, settings: state.settings, medicationEvents: state.medicationEvents })
        || state.crisis.status !== 'active' || !Number.isFinite(action.atSeconds)
        || action.atSeconds < state.crisis.startedAtSeconds || !Number.isFinite(action.intensity)) return state;
      return {
        ...state,
        crisis: {
          status: 'recovering',
          scenarioId: state.crisis.scenarioId,
          startedAtSeconds: state.crisis.startedAtSeconds,
          recoveryStartedAtSeconds: action.atSeconds,
          recoveryStartIntensity: Math.max(0, Math.min(1, action.intensity)),
        },
      };
    }
    case 'crisis-finish-recovery':
      if (state.crisis.status !== 'recovering' || !Number.isFinite(action.atSeconds)
        || action.atSeconds < state.crisis.recoveryStartedAtSeconds + CRISIS_RECOVERY_SECONDS) return state;
      return {
        ...state,
        crisis: {
          status: 'recovered',
          scenarioId: state.crisis.scenarioId,
          startedAtSeconds: state.crisis.startedAtSeconds,
          recoveredAtSeconds: action.atSeconds,
        },
      };
    case 'crisis-reset':
      return { ...state, crisis: { status: 'idle' } };
  }
}

export function createSettingsDispatcher(
  dispatch: Dispatch<SimulationAction>
): Dispatch<SetStateAction<VentilatorSettings>> {
  return (update) => dispatch({ type: 'settings', update });
}
