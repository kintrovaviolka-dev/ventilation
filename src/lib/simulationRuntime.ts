/** Deterministic educational single-compartment model. Not a clinical device model. */
import type { PatientParams, VentilatorSettings, VentMode } from '../types';
import { calculateMedicationEffects, MedicationDoseEvent, validMedicationEvent } from './medicationModel';
import { FluidId, FluidInfusion, changeFluid, fluidDeliveredSince, fluidProgress, fluidResponse, validFluidInput } from './fluidModel';
import { CRISIS_SCENARIOS, CrisisState, CrisisScenarioId, CrisisIntervention, getCrisisEffects, canBeginCrisisRecovery, getCrisisIntensity } from './crisisEngine';
import { createInitialSimulationState, simulationReducer, DEFAULT_PATIENT_PARAMS } from './simulationState';
import { INTRAOPERATIVE_EVENTS } from '../data/patientCases';
import { SELECTABLE_PARAMETERS, isValidParameterValue } from './controlSystem';

import { CardiacRhythm, CARDIAC_RHYTHMS, beatIntervalFactor, cardiacWaveform } from './cardiacWaveform';

export const STEP_MS = 5;
export type RuntimeSettings = Required<VentilatorSettings>;
export interface TraceSample {
  time: number; pressure: number; elasticPressure: number; alveolarPressure: number; musclePressure: number;
  flow: number; volume: number; lungVolume: number; co2: number; ecg: number; pleth: number;
  phase: 'insp' | 'exp'; breathId: number; kind: 'mandatory' | 'supported' | 'unassisted' | 'backup';
}
export interface CompletedBreath {
  id: number; start: number; end: number; vTi: number; vTe: number; pPeak: number;
  pMean: number; pPlat: number | null; intrinsicPeep: number; etCO2: number;
  kind: TraceSample['kind'];
}
export interface RuntimeReadings {
  pPeak: number | null; pPlat: number | null; pMean: number | null;
  peep: number; totalPeep: number | null; intrinsicPeep: number | null; trappedVolume: number | null;
  vTi: number | null; vTe: number | null; mVe: number | null; rrTotal: number | null;
  cStat: number; cDyn: number | null; spO2: number; etCO2: number | null;
  paO2: number | null; pfRatio: number | null; ardsSeverity: 'normal' | 'mild' | 'moderate' | 'severe' | null;
  heartRate: number; systolicPressure: number; diastolicPressure: number;
  sedation: number; block: number; tof: number; drive: number;
  apnea: boolean; backup: boolean; circuitConnected: boolean;
}
interface BreathState {
  id: number; start: number; phase: 'insp' | 'exp'; phaseStart: number;
  kind: TraceSample['kind']; inspirationTime: number; startVolume: number;
  vTi: number; vTe: number; peak: number; pressureIntegral: number; peakFlow: number; etCO2Peak: number;
  plateau: number | null; effort: boolean; intrinsicPeep: number;
}
export interface RuntimeState {
  timeMs: number; remainderMs: number; running: boolean;
  settings: RuntimeSettings; activeSettings: RuntimeSettings; mode: VentMode; activeMode: VentMode;
  patient: PatientParams; volatileMac: number; medications: MedicationDoseEvent[]; fluids: FluidInfusion[];
  crisis: CrisisState; demonstration: string;
  volumeL: number; cardiacPhase: number; cardiacBeat: number; rhythm: CardiacRhythm; activeRhythm: CardiacRhythm; cardiacBeatTimes: number[]; effortPhase: number;
  nextMandatory: number; lastTrigger: number; lastEffortCycle: number; backupActive: boolean;
  breath: BreathState; completed: CompletedBreath[];
  history: TraceSample[]; currentLoop: TraceSample[]; previousLoop: TraceSample[];
  readings: RuntimeReadings; latest: TraceSample | null;
}
export type SimulationCommand =
  | { type: 'configure'; settings?: Partial<VentilatorSettings>; mode?: VentMode }
  | { type: 'rhythm'; rhythm: CardiacRhythm }
  | { type: 'patient'; patient: PatientParams }
  | { type: 'run'; running: boolean }
  | { type: 'vaporizer'; mac: number }
  | { type: 'medication'; event: MedicationDoseEvent }
  | { type: 'medication-stop'; id: string }
  | { type: 'fluid-start'; id: string; fluid: FluidId; bagMl: number; targetMl: number; rateMlHour: number }
  | { type: 'fluid-change'; id: string; action: 'pause' | 'resume' | 'stop' | 'rate'; rateMlHour?: number }
  | { type: 'crisis-start'; scenario: CrisisScenarioId }
  | { type: 'crisis-intervention'; intervention: CrisisIntervention }
  | { type: 'crisis-recover' } | { type: 'crisis-reset' }
  | { type: 'demonstration'; id: string };
export interface RuntimeEvent { type: 'breath-completed' | 'command-rejected' | 'fluid-completed'; time: number; id?: string }
export function completeSettings(settings: VentilatorSettings): RuntimeSettings {
  return { flowTrigger: 2, cycleOff: 25, minTi: .3, maxTi: 2, apneaSeconds: 10, backupEnabled: 1,
    backupPinsp: settings.pinsp, backupRr: settings.rr, backupIeRatio: settings.ieRatio,
    spontaneousRate: 12, driveAmplitude: 2, ...settings };
}
export function createRuntime(settings: VentilatorSettings, patient = DEFAULT_PATIENT_PARAMS, mode: VentMode = 'vc'): RuntimeState {
  const config = completeSettings(settings);
  const volumeL = settings.peep * patient.compliance / 1000;
  const state: RuntimeState = {
    timeMs: 0, remainderMs: 0, running: false, settings: config, activeSettings: { ...config }, mode, activeMode: mode,
    patient: { ...patient }, volatileMac: 0, medications: [], fluids: [], crisis: { status: 'idle' }, demonstration: 'event_baseline',
    volumeL, cardiacPhase: 0, cardiacBeat: 0, rhythm: 'sinus', activeRhythm: 'sinus', cardiacBeatTimes: [], effortPhase: 0, nextMandatory: 0, lastTrigger: 0, lastEffortCycle: -1, backupActive: false,
    breath: { id: 0, start: 0, phase: 'exp', phaseStart: 0, kind: 'mandatory', inspirationTime: 0,
      startVolume: volumeL, vTi: 0, vTe: 0, peak: 0, pressureIntegral: 0, peakFlow: 0, etCO2Peak: 0, plateau: null, effort: false, intrinsicPeep: 0 },
    completed: [], history: [], currentLoop: [], previousLoop: [], latest: null,
    readings: { pPeak: null, pPlat: null, pMean: null, peep: settings.peep, totalPeep: null, intrinsicPeep: null, trappedVolume: null,
      vTi: null, vTe: null, mVe: null, rrTotal: null, cStat: patient.compliance, cDyn: null,
      spO2: 98, etCO2: null, paO2: null, pfRatio: null, ardsSeverity: null,
      heartRate: 72, systolicPressure: 118, diastolicPressure: 76, sedation: 0, block: 0, tof: 4, drive: 2,
      apnea: false, backup: false, circuitConnected: true },
  };
  return state;
}
const inspirationDuration = (rr: number, ie: string) => 60 / rr / (1 + Number(ie.split(':')[1]));
export function pendingSettings(state: RuntimeState): boolean {
  return state.mode !== state.activeMode || JSON.stringify(state.settings) !== JSON.stringify(state.activeSettings);
}
export function runtimeContext(state: RuntimeState) {
  const now = state.timeMs / 1000;
  const medication = calculateMedicationEffects(state.medications, now);
  const crisis = getCrisisEffects(state.crisis, now);
  const delivered = state.crisis.status !== 'idle' && state.crisis.scenarioId === 'hemorrhage'
    ? fluidDeliveredSince(state.fluids, state.crisis.startedAtSeconds, now) : 0;
  if (state.crisis.status !== 'idle' && state.crisis.scenarioId === 'hemorrhage') {
    const remaining = 1 - fluidResponse(delivered);
    crisis.heartRateChange *= remaining; crisis.systolicPressureChange *= remaining;
    crisis.diastolicPressureChange *= remaining;
    crisis.plethAmplitude = 1 - (1 - crisis.plethAmplitude) * remaining;
    // No claim that crystalloids restore oxygen carrying capacity or stop blood loss.
  }
  const demonstration = INTRAOPERATIVE_EVENTS.find(event => event.id === state.demonstration);
  const legacyActive = state.crisis.status === 'idle';
  const compliance = Math.max(10, state.patient.compliance + crisis.complianceChange + (legacyActive ? demonstration?.compliance ?? 0 : 0));
  const resistance = Math.max(1, state.patient.resistance + crisis.resistanceChange + (legacyActive ? demonstration?.resistance ?? 0 : 0));
  const sedation = Math.min(1, medication.sedation + state.volatileMac / 2);
  const block = medication.neuromuscularBlock;
  const drive = Math.max(0, state.settings.driveAmplitude + crisis.spontaneousDriveChange)
    * Math.max(0, 1 - block / .5) * Math.max(0, 1 - sedation / .8)
    * Math.max(0, 1 - medication.spontaneousDriveSuppression / 4);
  return { now, medication, crisis, compliance, resistance, sedation, block, drive, delivered,
    connected: crisis.circuitConnected && !(legacyActive && state.demonstration === 'event_disconnect') };
}
export function recoveryReady(state: RuntimeState): boolean {
  const context = runtimeContext(state);
  return canBeginCrisisRecovery(state.crisis, { settings: state.activeSettings, volatileMac: state.volatileMac,
    sedationLevel: context.sedation * 100, medicationEvents: state.medications, medicationEffects: context.medication,
    deliveredFluidMl: context.delivered });
}
function applyCommand(state: RuntimeState, command: SimulationCommand): boolean {
  const now = state.timeMs / 1000;
  switch (command.type) {
    case 'run': state.running = command.running; return true;
    case 'configure': {
      const settings = { ...state.settings, ...command.settings };
      if (command.mode && !['vc', 'pc', 'ps', 'simv'].includes(command.mode)) return false;
      for (const [key, value] of Object.entries(command.settings ?? {})) {
        const spec = SELECTABLE_PARAMETERS.find(param => param.id === key);
        if (!spec || !isValidParameterValue(spec, value)) return false;
      }
      if (settings.minTi > settings.maxTi) return false;
      state.settings = settings;
      // Patient effort is not a ventilator setting: allow recovery from apnea even without backup.
      state.activeSettings = { ...state.activeSettings, driveAmplitude: settings.driveAmplitude, spontaneousRate: settings.spontaneousRate };
      if (command.mode === 'ps' && state.mode !== 'ps') state.lastTrigger = now;
      if (!settings.backupEnabled) state.backupActive = false;
      state.mode = command.mode ?? state.mode;
      return true;
    }
    case 'rhythm':
      if (!CARDIAC_RHYTHMS.includes(command.rhythm)) return false;
      state.rhythm = command.rhythm; return true;
    case 'patient':
      if (![command.patient.compliance, command.patient.resistance, command.patient.spontaneousDrive].every(Number.isFinite)
        || command.patient.compliance < 10 || command.patient.resistance < 1) return false;
      state.patient = { ...command.patient }; return true;
    case 'vaporizer':
      if (!Number.isFinite(command.mac) || command.mac < 0 || command.mac > 3) return false;
      state.volatileMac = command.mac; return true;
    case 'medication':
      if (!validMedicationEvent(command.event) || command.event.administeredAtSeconds !== now
        || command.event.stoppedAtSeconds !== undefined || state.medications.some(event => event.id === command.event.id)) return false;
      state.medications = [...state.medications, { ...command.event }]; return true;
    case 'medication-stop':
      if (!state.medications.some(event => event.id === command.id && event.administration === 'infusion' && event.stoppedAtSeconds === undefined)) return false;
      state.medications = state.medications.map(event => event.id === command.id ? { ...event, stoppedAtSeconds: now } : event); return true;
    case 'fluid-start':
      if (!command.id || state.fluids.some(fluid => fluid.id === command.id) || !validFluidInput(command.fluid, command.bagMl, command.targetMl, command.rateMlHour)) return false;
      state.fluids = [...state.fluids, { id: command.id, fluid: command.fluid, bagMl: command.bagMl, targetMl: command.targetMl,
        startedAtSeconds: now, segments: [{ atSeconds: now, rateMlHour: command.rateMlHour }] }]; return true;
    case 'fluid-change': {
      let changed = false;
      state.fluids = state.fluids.map(fluid => {
        if (fluid.id !== command.id) return fluid;
        const next = changeFluid(fluid, now, command.action, command.rateMlHour);
        changed = changed || next !== fluid; return next;
      });
      return changed;
    }
    case 'crisis-start': {
      if (!CRISIS_SCENARIOS.some(scenario => scenario.id === command.scenario) || state.crisis.status === 'active' || state.crisis.status === 'recovering') return false;
      const context = runtimeContext(state);
      const initial = { ...createInitialSimulationState(state.activeSettings, state.patient), medicationEvents: state.medications, crisis: state.crisis };
      state.crisis = simulationReducer(initial, { type: 'crisis-start', scenarioId: command.scenario, startedAtSeconds: now,
        settings: state.activeSettings, volatileMac: state.volatileMac, sedationLevel: context.sedation * 100, medicationCount: state.medications.length }).crisis;
      state.demonstration = 'event_baseline'; return true;
    }
    case 'crisis-intervention': {
      if (command.intervention === 'volume-support') return false;
      const initial = { ...createInitialSimulationState(state.activeSettings, state.patient), crisis: state.crisis };
      const next = simulationReducer(initial, command).crisis;
      if (next === state.crisis) return false;
      state.crisis = next;
      if (command.intervention === 'reconnect-circuit') applyCommand(state, { type: 'crisis-recover' });
      return true;
    }
    case 'crisis-recover': {
      if (!recoveryReady(state) || state.crisis.status !== 'active') return false;
      if (state.crisis.scenarioId === 'hemorrhage') {
        state.crisis = { status: 'recovered', scenarioId: 'hemorrhage', startedAtSeconds: state.crisis.startedAtSeconds, recoveredAtSeconds: now };
      } else state.crisis = { status: 'recovering', scenarioId: state.crisis.scenarioId, startedAtSeconds: state.crisis.startedAtSeconds,
        recoveryStartedAtSeconds: now, recoveryStartIntensity: getCrisisIntensity(state.crisis, now) };
      return true;
    }
    case 'crisis-reset': state.crisis = { status: 'idle' }; return true;
    case 'demonstration':
      if (state.crisis.status !== 'idle' || !INTRAOPERATIVE_EVENTS.some(event => event.id === command.id)) return false;
      state.demonstration = command.id; return true;
  }
}
function startBreath(state: RuntimeState, kind: TraceSample['kind'], context: ReturnType<typeof runtimeContext>, events: RuntimeEvent[]) {
  const now = state.timeMs / 1000;
  const previous = state.breath;
  if (previous.id > 0) {
    state.completed.push({ id: previous.id, start: previous.start, end: now, vTi: previous.vTi * 1000, vTe: previous.vTe * 1000,
      pPeak: previous.peak, etCO2: previous.etCO2Peak, pMean: previous.pressureIntegral / Math.max(.005, now - previous.start),
      pPlat: previous.effort ? null : previous.plateau, intrinsicPeep: previous.intrinsicPeep, kind: previous.kind });
    state.previousLoop = state.currentLoop;
    events.push({ type: 'breath-completed', time: now, id: String(previous.id) });
  }
  state.currentLoop = [];
  state.activeSettings = { ...state.settings };
  state.activeMode = state.mode;
  const config = state.activeSettings;
  const rr = kind === 'backup' ? config.backupRr : config.rr;
  const ratio = kind === 'backup' ? config.backupIeRatio : config.ieRatio;
  state.breath = { id: previous.id + 1, start: now, phase: 'insp', phaseStart: now, kind,
    inspirationTime: inspirationDuration(rr, ratio), startVolume: state.volumeL,
    vTi: 0, vTe: 0, peak: 0, pressureIntegral: 0, peakFlow: 0, etCO2Peak: 0, plateau: null, effort: false,
    intrinsicPeep: Math.max(0, state.volumeL / (context.compliance / 1000) - config.peep) };
  if (kind === 'mandatory' || kind === 'backup') state.nextMandatory = now + 60 / rr;
}
function step(state: RuntimeState, events: RuntimeEvent[]): TraceSample {
  const dt = STEP_MS / 1000;
  let context = runtimeContext(state);
  const now = state.timeMs / 1000;
  // Pending settings determine the next cycle/trigger, never alter the current inspiration.
  const requested = state.settings;
  const effortCycle = Math.floor(state.effortPhase);
  const phase = state.effortPhase % 1;
  const muscle = context.drive * (phase < .35 ? Math.sin(Math.PI * phase / .35) : 0);
  const cL = context.compliance / 1000;
  const spontaneousFlow = (state.activeSettings.peep + muscle - state.volumeL / cL) / context.resistance * 60;
  const inExpiration = state.breath.phase === 'exp';
  const trigger = inExpiration && context.connected && now - state.breath.phaseStart >= .2
    && effortCycle !== state.lastEffortCycle && muscle > 0 && spontaneousFlow >= requested.flowTrigger;
  if (trigger) { state.lastTrigger = now; state.lastEffortCycle = effortCycle; state.backupActive = false; }
  const apnea = state.mode === 'ps' && now - state.lastTrigger >= requested.apneaSeconds;
  if (apnea && requested.backupEnabled) state.backupActive = true;
  if (state.mode !== 'ps') state.backupActive = false;
  if (inExpiration && context.connected) {
    if (state.mode === 'vc' || state.mode === 'pc') {
      if (now + 1e-9 >= state.nextMandatory) startBreath(state, 'mandatory', context, events);
    } else if (state.mode === 'simv') {
      const window = Math.min(.5, 60 / requested.rr * .2);
      if (now + 1e-9 >= state.nextMandatory || (trigger && now >= state.nextMandatory - window)) startBreath(state, 'mandatory', context, events);
      else if (trigger) startBreath(state, 'supported', context, events);
    } else if (trigger) startBreath(state, 'supported', context, events);
    else if (state.backupActive && (state.breath.kind !== 'backup' || now + 1e-9 >= state.nextMandatory)) startBreath(state, 'backup', context, events);
    else if (pendingSettings(state) && state.activeMode !== state.mode && state.mode !== 'ps') startBreath(state, 'mandatory', context, events);
  }
  const config = state.activeSettings;
  const breath = state.breath;
  const inspiratory = breath.phase === 'insp';
  const assisted = breath.kind === 'supported';
  let paw = context.connected ? config.peep : 0;
  let flow: number;
  const oldVolume = state.volumeL;
  if (inspiratory && context.connected && !assisted && breath.kind !== 'backup' && (state.activeMode === 'vc' || state.activeMode === 'simv')) {
    flow = Math.max(0, Math.min(config.vt / 1000 / breath.inspirationTime, (config.vt / 1000 - breath.vTi) / dt));
    state.volumeL += flow * dt;
    paw = state.volumeL / cL + context.resistance * flow - muscle;
  } else {
    if (inspiratory && context.connected) paw += breath.kind === 'backup' ? config.backupPinsp
      : assisted ? config.pSupport : config.pinsp;
    // Implicit Euler: Paw = V/C + R*Q - Pmus and delta V = Q*dt in BOTH phases.
    state.volumeL = (oldVolume + dt * (paw + muscle) / context.resistance) / (1 + dt / (context.resistance * cL));
    flow = (state.volumeL - oldVolume) / dt;
  }
  breath.vTi += Math.max(0, flow) * dt;
  breath.vTe += Math.max(0, -flow) * dt;
  breath.peak = Math.max(breath.peak, paw);
  breath.pressureIntegral += paw * dt;
  breath.peakFlow = Math.max(breath.peakFlow, flow * 60);
  breath.effort ||= muscle > .01;
  const duration = now + dt - breath.start;
  if (inspiratory && ((!assisted && duration + 1e-9 >= breath.inspirationTime)
    || (assisted && (duration + 1e-9 >= config.maxTi || (duration >= config.minTi && flow * 60 <= breath.peakFlow * config.cycleOff / 100)))
    || !context.connected)) {
    breath.phase = 'exp'; breath.phaseStart = now + dt;
    breath.plateau = state.volumeL / cL;
  }
  state.timeMs += STEP_MS;
  state.effortPhase += config.spontaneousRate / 60 * dt;
  if (state.crisis.status === 'recovering' && state.timeMs / 1000 >= state.crisis.recoveryStartedAtSeconds + 20) {
    state.crisis = { status: 'recovered', scenarioId: state.crisis.scenarioId,
      startedAtSeconds: state.crisis.startedAtSeconds, recoveredAtSeconds: state.timeMs / 1000 };
  }
  const heartRate = Math.max(30, 72 + context.medication.heartRateChange + context.crisis.heartRateChange);
  const period = 60 / heartRate * beatIntervalFactor(state.activeRhythm, state.cardiacBeat);
  state.cardiacPhase += dt / period;
  if (state.cardiacPhase >= 1) {
    state.cardiacPhase -= 1;
    state.cardiacBeat++;
    state.activeRhythm = state.rhythm;
    state.cardiacBeatTimes = [...state.cardiacBeatTimes, state.timeMs / 1000].filter(time => time >= state.timeMs / 1000 - 12);
  }
  const beatTimes = state.cardiacBeatTimes;
  const measuredHeartRate = state.activeRhythm !== 'sinus' && beatTimes.length > 1
    ? 60 * (beatTimes.length - 1) / (beatTimes.at(-1)! - beatTimes[0]) : heartRate;
  const last = state.completed.at(-1);
  // Breath-by-breath monitor estimates: no previous-minute dilution after a new setting.
  // Hold between breaths; absence of subsequent cycles eventually invalidates old ventilation.
  const interval = last ? Math.max(.005, last.end - last.start) : 0;
  const stale = last ? now - last.end > Math.max(15, interval * 2) : false;
  const minuteVolume = last ? (stale ? 0 : last.vTe / 1000 * 60 / interval) : null;
  const rate = last ? (stale ? 0 : 60 / interval) : null;
  const fi = config.fio2 / 100;
  const pao2 = Math.max(35, Math.min(600, (fi * 500 - 10) * Math.min(1, context.compliance / 50)
    * Math.max(.4, 1 - (context.resistance - 5) * .015) * (1 + config.peep / 20 * .35)));
  const oxygen = pao2 >= 100 ? 98 + Math.min(2, (pao2 - 100) * .01)
    : pao2 >= 60 ? 90 + (pao2 - 60) * .2 : 70 + (pao2 - 35) * .8;
  const spo2 = Math.max(65, Math.min(100, oxygen + context.crisis.spO2Change));
  const etco2 = context.connected ? Math.max(0, Math.min(85, (minuteVolume === null ? 38
    : Math.max(18, Math.min(85, 38 * 6 / Math.max(1.5, minuteVolume)))) + context.crisis.etCO2Change)) : 0;
  const modifiedOxygen = context.crisis.spO2Change !== 0;
  const intrinsic = last ? Math.max(0, breath.intrinsicPeep) : null;
  state.readings = { pPeak: context.connected ? last?.pPeak ?? null : 0,
    pPlat: context.connected ? last?.pPlat ?? null : null, pMean: context.connected ? last?.pMean ?? null : 0,
    peep: context.connected ? config.peep : 0, totalPeep: context.connected && intrinsic !== null ? config.peep + intrinsic : null,
    intrinsicPeep: intrinsic, trappedVolume: intrinsic === null ? null : intrinsic * context.compliance,
    vTi: context.connected ? last?.vTi ?? null : 0, vTe: context.connected ? last?.vTe ?? null : 0,
    mVe: context.connected ? minuteVolume : 0, rrTotal: context.connected ? rate : 0,
    cStat: context.compliance, cDyn: last && last.pPeak > config.peep ? last.vTe / (last.pPeak - config.peep) : null,
    spO2: Math.round(spo2), etCO2: context.connected ? (stale ? 0 : last?.etCO2 ?? null) : 0, paO2: modifiedOxygen ? null : Math.round(pao2),
    pfRatio: modifiedOxygen ? null : Math.round(pao2 / fi), ardsSeverity: null,
    heartRate: Math.round(measuredHeartRate), systolicPressure: Math.max(30, Math.round(118 + context.medication.systolicPressureChange + context.crisis.systolicPressureChange)),
    diastolicPressure: Math.max(15, Math.round(76 + context.medication.diastolicPressureChange + context.crisis.diastolicPressureChange)),
    sedation: context.sedation, block: context.block, tof: Math.max(0, Math.round(4 * (1 - context.block))), drive: context.drive,
    apnea, backup: state.backupActive, circuitConnected: context.connected };
  const expTime = now + dt - breath.phaseStart;
  const co2 = !inspiratory && context.connected && breath.id > 0
    ? etco2 * Math.min(1, Math.max(0, (expTime - .1) / (context.crisis.capnogram === 'shark-fin' ? 1.2 : .2))) : 0;
  breath.etCO2Peak = Math.max(breath.etCO2Peak, co2);
  const cardiac = cardiacWaveform(state.cardiacPhase,
    60 / heartRate * beatIntervalFactor(state.activeRhythm, state.cardiacBeat),
    state.activeRhythm, state.cardiacBeat, state.timeMs / 1000);
  const ecg = cardiac.ecg, pleth = context.crisis.plethAmplitude * cardiac.pleth;
  return { time: state.timeMs / 1000, pressure: context.connected ? paw : 0,
    elasticPressure: state.volumeL / cL, alveolarPressure: state.volumeL / cL - muscle, musclePressure: muscle, flow: context.connected ? flow * 60 : 0,
    volume: context.connected ? (state.volumeL - config.peep * cL) * 1000 : 0, lungVolume: state.volumeL * 1000,
    co2, ecg, pleth, phase: inspiratory ? 'insp' : 'exp', breathId: breath.id, kind: breath.kind };
}
export function advanceSimulation(input: RuntimeState, commands: SimulationCommand[], elapsedMs: number): { state: RuntimeState; samples: TraceSample[]; events: RuntimeEvent[] } {
  const state: RuntimeState = { ...input, breath: { ...input.breath }, completed: [...input.completed],
    history: [...input.history], currentLoop: [...input.currentLoop], previousLoop: input.previousLoop };
  const events: RuntimeEvent[] = [];
  for (const command of commands) if (!applyCommand(state, command)) events.push({ type: 'command-rejected', time: state.timeMs / 1000 });
  const samples: TraceSample[] = [];
  if (!state.running || !Number.isFinite(elapsedMs) || elapsedMs < 0) return { state, samples, events };
  const available = state.remainderMs + elapsedMs;
  const steps = Math.floor((available + 1e-8) / STEP_MS);
  state.remainderMs = Math.max(0, available - steps * STEP_MS);
  for (let index = 0; index < steps; index++) {
    const sample = step(state, events);
    state.latest = sample;
    samples.push(sample);
    state.currentLoop.push(sample);
  }
  state.history = [...state.history, ...samples].filter(sample => sample.time >= state.timeMs / 1000 - 10);
  state.currentLoop = state.currentLoop.slice(-12000);
  state.completed = state.completed.filter(breath => breath.end > state.timeMs / 1000 - 65);
  for (const fluid of state.fluids) {
    const before = fluidProgress(fluid, input.timeMs / 1000), after = fluidProgress(fluid, state.timeMs / 1000);
    if (before.status !== 'completed' && after.status === 'completed') events.push({ type: 'fluid-completed', time: after.completedAtSeconds!, id: fluid.id });
  }
  return { state, samples, events };
}
