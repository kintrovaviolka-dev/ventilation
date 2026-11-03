/**
 * EDUCATIONAL RESPIRATORY PHYSIOLOGY MODEL
 * Note: These formulas are simplified educational mathematical approximations for medical simulation training.
 * They are NOT intended for clinical diagnosis, patient treatment, or real-world medical care.
 */

import { VentilatorSettings, PatientParams, VentMode } from '../types';
import { DEFAULT_PATIENT_PARAMS } from './simulationState';
import { getInstantaneousBreath } from './waveformMath';

export interface CalculatedPhysiology {
  pPeak: number;        // Peak Inspiratory Pressure (cmH2O)
  pPlat: number;        // Plateau Pressure (cmH2O)
  pMean: number;        // Mean Airway Pressure (cmH2O)
  peep: number;         // Measured PEEP (cmH2O)
  vTe: number;          // Expiratory Tidal Volume (mL)
  mVe: number;          // Minute Ventilation (L/min)
  rrTotal: number;      // Total Respiratory Rate (bpm)
  cStat: number;        // Derived Static Compliance (mL/cmH2O)
  cDyn: number;         // Derived Dynamic Compliance (mL/cmH2O)
  spO2: number;         // Estimated Oxygen Saturation (%)
  etCO2: number;        // Estimated End-Tidal CO2 (mmHg)
  paO2: number;         // Estimated PaO2 (mmHg)
  pfRatio: number;      // PaO2 / FiO2 ratio (mmHg)
  ardsSeverity: 'normal' | 'mild' | 'moderate' | 'severe';
  flowPeak: number;     // Peak Flow (L/min)
  inspiratoryFlow: number; // Peak inspiratory flow (L/s)
}

function safeNumber(val: number, fallback: number): number {
  return isNaN(val) || !isFinite(val) ? fallback : val;
}

export function calculatePhysiology(
  settings: VentilatorSettings,
  patient: PatientParams,
  mode: VentMode,
  circuitConnected = true
): CalculatedPhysiology {
  const fio2 = safeNumber(settings?.fio2, 40);
  const rr = safeNumber(settings?.rr, 12);
  const vt = safeNumber(settings?.vt, 500);
  const pinsp = safeNumber(settings?.pinsp, 20);
  const peep = safeNumber(settings?.peep, 5);
  const ieRatio = settings?.ieRatio || '1:2';
  const pSupport = safeNumber(settings?.pSupport, 10);

  const compliance = Math.max(1, safeNumber(patient?.compliance, DEFAULT_PATIENT_PARAMS.compliance));
  const resistance = Math.max(1, safeNumber(patient?.resistance, DEFAULT_PATIENT_PARAMS.resistance));
  const spontaneousDrive = Math.max(0, safeNumber(patient?.spontaneousDrive, DEFAULT_PATIENT_PARAMS.spontaneousDrive));

  // 1. Parse I:E Ratio (e.g. "1:2" -> ratio = 2, f_insp = 1 / (1 + 2) = 0.333)
  const parts = ieRatio.split(':');
  const eVal = Math.max(0.5, parseFloat(parts[1]) || 2);
  const inspFraction = 1 / (1 + eVal); // Fraction of cycle time spent in inspiration

  const safeRR = Math.max(1, rr);
  const cycleTime = 60 / safeRR; // Total breath duration in seconds
  const inspTime = cycleTime * inspFraction; // Inspiratory duration in seconds

  let deliveredVt = 0; // Delivered Tidal Volume in mL
  let flowPeak = 0;    // Peak flow in L/min

  // 2. Mode-dependent mechanics calculations
  if (mode === 'vc') {
    // VOLUME CONTROL (VC-CMV)
    deliveredVt = vt;

  } else if (mode === 'pc') {
    // PRESSURE CONTROL (PC-CMV)
    const drivingPressure = Math.max(0, pinsp);
    
    const tau = resistance * (compliance / 1000);
    const fillFactor = 1 - Math.exp(-inspTime / Math.max(0.08, tau));
    deliveredVt = Math.round(drivingPressure * Math.max(1, compliance) * fillFactor);
    deliveredVt = Math.max(0, deliveredVt);

  } else if (mode === 'simv') {
    // SIMV
    deliveredVt = vt;

  } else if (mode === 'ps') {
    // PRESSURE SUPPORT (PSV)
    const drivingPressure = Math.max(0, pSupport);
    const tau = resistance * (compliance / 1000);
    
    const psInspTime = inspTime; // Shared timed-cycle approximation with the waveform.
    const fillFactor = 1 - Math.exp(-psInspTime / Math.max(0.08, tau));

    deliveredVt = Math.round((drivingPressure + spontaneousDrive) * compliance * fillFactor);
    deliveredVt = Math.max(0, deliveredVt);

  }

  // Peak inspiratory flow is derived from delivered volume and inspiratory time.
  const inspiratoryFlow = mode === 'pc' || mode === 'ps'
    ? getInstantaneousBreath(0, settings, patient, mode, circuitConnected).flow / 60
    : (deliveredVt / 1000) / Math.max(0.2, inspTime);
  flowPeak = inspiratoryFlow * 60;
  const pPlat = peep + deliveredVt / compliance;
  const waveformPeak = Math.max(
    getInstantaneousBreath(0, settings, patient, mode, circuitConnected).pressure,
    getInstantaneousBreath(Math.max(0, inspTime - 1e-6), settings, patient, mode, circuitConnected).pressure
  );
  const pPeak = waveformPeak;

  // 3. Mean Airway Pressure (Pmean)
  let pMean = 0;
  if (mode === 'pc' || mode === 'ps') {
    pMean = peep + inspFraction * (pPeak - peep);
  } else {
    const avgInspPressure = peep + 0.5 * (pPlat - peep) + 0.8 * (pPeak - pPlat);
    pMean = inspFraction * avgInspPressure + (1 - inspFraction) * peep;
  }

  // 4. Minute Ventilation (MVe in L/min)
  const rrTotal = safeRR;
  const mVe = (rrTotal * deliveredVt) / 1000;

  // 5. Derived Compliance values
  const drivingPstat = Math.max(1, pPlat - peep);
  const cStat = Math.round(deliveredVt / drivingPstat);

  const drivingPdyn = Math.max(1, pPeak - peep);
  const cDyn = Math.round(deliveredVt / drivingPdyn);

  // 6. Oxygenation Estimates
  const fio2Fraction = Math.max(0.21, Math.min(1.0, fio2 / 100));

  const complianceFactor = Math.min(1.0, Math.max(0.1, compliance / 50));
  const resistanceFactor = Math.max(0.4, 1 - (resistance - 5) * 0.015);
  const peepRecruitment = 1 + (peep / 20) * 0.35;

  let estimatedPaO2 = (fio2Fraction * 500 - 10) * complianceFactor * resistanceFactor * peepRecruitment;
  estimatedPaO2 = Math.min(600, Math.max(35, estimatedPaO2));

  const pfRatio = Math.round(estimatedPaO2 / fio2Fraction);

  let ardsSeverity: CalculatedPhysiology['ardsSeverity'] = 'normal';
  if (pfRatio < 100) {
    ardsSeverity = 'severe';
  } else if (pfRatio < 200) {
    ardsSeverity = 'moderate';
  } else if (pfRatio < 300) {
    ardsSeverity = 'mild';
  }

  let spO2 = 0;
  if (estimatedPaO2 >= 100) {
    spO2 = 98 + Math.min(2, (estimatedPaO2 - 100) * 0.01);
  } else if (estimatedPaO2 >= 60) {
    spO2 = 90 + (estimatedPaO2 - 60) * (8 / 40);
  } else {
    spO2 = 70 + (estimatedPaO2 - 35) * (20 / 25);
  }
  spO2 = Math.min(100, Math.max(65, Math.round(spO2)));

  // 7. Ventilation / CO2 Estimate (EtCO2 in mmHg)
  const targetMVe = 6.0;
  let etCO2 = 38 * (targetMVe / Math.max(1.5, mVe));
  
  if (compliance < 25) {
    etCO2 *= 1.15;
  }
  etCO2 = Math.min(85, Math.max(18, Math.round(etCO2)));

  const result: CalculatedPhysiology = {
    pPeak: safeNumber(Math.round(pPeak), 20),
    pPlat: safeNumber(Math.round(pPlat), 15),
    pMean: safeNumber(Math.round(pMean * 10) / 10, 8.0),
    peep: safeNumber(Math.round(peep), 5),
    vTe: safeNumber(Math.round(deliveredVt), 500),
    mVe: safeNumber(Math.round(mVe * 10) / 10, 6.0),
    rrTotal: safeNumber(Math.round(rrTotal), 12),
    cStat: safeNumber(cStat, 50),
    cDyn: safeNumber(cDyn, 40),
    spO2: safeNumber(spO2, 98),
    etCO2: safeNumber(etCO2, 38),
    paO2: safeNumber(Math.round(estimatedPaO2), 95),
    pfRatio: safeNumber(pfRatio, 400),
    ardsSeverity,
    flowPeak: safeNumber(Math.round(flowPeak), 60),
    inspiratoryFlow: safeNumber(Math.round(inspiratoryFlow * 100) / 100, 1.5),
  };
  if (!circuitConnected) {
    return {
      ...result,
      pPeak: 0,
      pPlat: 0,
      pMean: 0,
      peep: 0,
      vTe: 0,
      mVe: 0,
      cStat: 0,
      cDyn: 0,
      etCO2: 0,
      flowPeak: 0,
      inspiratoryFlow: 0,
    };
  }
  return result;
}

export type CapnogramPattern = 'normal' | 'shark-fin';

export function getCapnogramValue(
  timeInSec: number,
  respiratoryRate: number,
  etCO2: number,
  pattern: CapnogramPattern = 'normal',
  ieRatio = '1:2'
): number {
  const rate = Math.max(1, safeNumber(respiratoryRate, 12));
  const endTidal = Math.max(0, safeNumber(etCO2, 0));
  const phase = ((safeNumber(timeInSec, 0) * rate / 60) % 1 + 1) % 1;
  const inspiration = 1 / (1 + Math.max(0.5, Number(ieRatio.split(':')[1]) || 2));
  // The same breath clock as Paw/flow: CO2 is zero during inspiration,
  // then dead-space baseline, upstroke and alveolar plateau in expiration.
  if (phase < inspiration) return 0;
  const expiration = (phase - inspiration) / (1 - inspiration);
  if (expiration < 0.08) return 0;
  const upstrokeEnd = pattern === 'shark-fin' ? 0.72 : 0.22;
  if (expiration < upstrokeEnd) {
    const progress = (expiration - 0.08) / (upstrokeEnd - 0.08);
    return endTidal * 0.92 * Math.pow(progress, pattern === 'shark-fin' ? 0.65 : 1);
  }
  if (expiration < 0.96) return endTidal * (0.92 + 0.08 * (expiration - upstrokeEnd) / (0.96 - upstrokeEnd));
  return endTidal * (1 - (expiration - 0.96) / 0.04);
}
