import { VentilatorSettings, PatientParams, VentMode } from '../types';

export interface InstantBreathState {
  pressure: number; // cmH2O
  flow: number;     // L/min (positive = in, negative = out)
  volume: number;   // mL
  phase: 'insp' | 'exp';
  progress: number; // 0 to 1 cycle progress
}

export function getInstantaneousBreath(
  timeInSec: number,
  settings: VentilatorSettings,
  patient: PatientParams,
  mode: VentMode
): InstantBreathState {
  const rr = Math.max(4, settings.rr || 12);
  const cycleTime = 60 / rr;
  const cyclePos = ((timeInSec % cycleTime) + cycleTime) % cycleTime;
  const progress = cyclePos / cycleTime;

  // I:E ratio parsing
  const ieParts = (settings.ieRatio || '1:2').split(':');
  const eVal = Math.max(0.5, parseFloat(ieParts[1]) || 2);
  const inspFraction = 1 / (1 + eVal);
  const inspTime = cycleTime * inspFraction;

  const compliance = Math.max(10, patient.compliance || 50); // mL/cmH2O
  const resistance = Math.max(2, patient.resistance || 5);    // cmH2O/L/s
  const peep = Math.max(0, settings.peep || 5);
  const tau = Math.max(0.08, (resistance * compliance) / 1000); // Time constant in seconds

  let pressure = peep;
  let flow = 0;
  let volume = 0;
  let phase: 'insp' | 'exp' = 'insp';

  // Smooth rise-time time constant (40ms)
  const riseTau = 0.04;

  if (cyclePos < inspTime) {
    // INSPIRATION PHASE
    phase = 'insp';
    const tInsp = cyclePos;

    // Smooth onset multiplier (0 to 1 over first ~100ms)
    const riseFactor = 1 - Math.exp(-tInsp / riseTau);

    if (mode === 'vc' || mode === 'simv') {
      const vt = settings.vt || 500;
      // Target inspiratory flow in L/min
      const targetFlowLps = (vt / 1000) / inspTime;
      const targetFlowLpm = targetFlowLps * 60;

      // Flow rises smoothly to target
      flow = targetFlowLpm * riseFactor;

      // Volume accumulation (integral of smooth flow)
      volume = Math.min(vt, vt * (tInsp / inspTime));

      // Pressure = PEEP + Resistive drop + Elastic expansion
      const pResistive = (flow / 60) * resistance;
      const pElastic = volume / compliance;
      pressure = peep + pResistive + pElastic;
    } else {
      // Pressure Control (PC) or Pressure Support (PS)
      const pinsp = mode === 'ps' ? (settings.pSupport || 10) : (settings.pinsp || 20);
      const drivingP = Math.max(2, pinsp);

      // Pressure rises smoothly to set inspiratory pressure above PEEP
      pressure = peep + drivingP * (1 - Math.exp(-tInsp / (riseTau * 1.5)));

      // Decelerating flow
      const maxFlowLps = drivingP / resistance;
      flow = maxFlowLps * Math.exp(-tInsp / tau) * 60;

      // Volume accumulation
      const maxVt = drivingP * compliance;
      volume = maxVt * (1 - Math.exp(-tInsp / tau));
    }
  } else {
    // EXPIRATION PHASE
    phase = 'exp';
    const tExp = cyclePos - inspTime;

    // Determine end-inspiratory volume and pressure for smooth expiration transition
    let endInspVt = settings.vt || 500;
    if (mode === 'pc' || mode === 'ps') {
      const pinsp = mode === 'ps' ? (settings.pSupport || 10) : (settings.pinsp || 20);
      endInspVt = pinsp * compliance * (1 - Math.exp(-inspTime / tau));
    }

    const endInspPressure = peep + (endInspVt / compliance);

    // Expiration onset smoothing factor (20ms)
    const expRiseFactor = 1 - Math.exp(-tExp / 0.02);

    // Exponential decay of volume back to baseline
    volume = endInspVt * Math.exp(-tExp / tau);

    // Peak expiratory flow (negative, decelerating)
    const peakExpFlowLps = (endInspVt / 1000) / tau;
    flow = - (peakExpFlowLps * Math.exp(-tExp / tau) * expRiseFactor) * 60;

    // Pressure decays exponentially back to PEEP
    pressure = peep + (endInspPressure - peep) * Math.exp(-tExp / tau);
  }

  // Clamping for safety bounds
  pressure = Math.max(0, Math.min(80, pressure));
  flow = Math.max(-160, Math.min(160, flow));
  volume = Math.max(0, Math.min(1200, volume));

  return { pressure, flow, volume, phase, progress };
}
