/**
 * EDUCATIONAL RESPIRATORY PHYSIOLOGY MODEL
 * Note: These formulas are simplified educational mathematical approximations for medical simulation training.
 * They are NOT intended for clinical diagnosis, patient treatment, or real-world medical care.
 */

import { VentilatorSettings, PatientParams, VentMode } from '../types';

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
}

function safeNumber(val: number, fallback: number): number {
  return isNaN(val) || !isFinite(val) ? fallback : val;
}

export function calculatePhysiology(
  settings: VentilatorSettings,
  patient: PatientParams,
  mode: VentMode
): CalculatedPhysiology {
  const fio2 = safeNumber(settings?.fio2, 40);
  const rr = safeNumber(settings?.rr, 12);
  const vt = safeNumber(settings?.vt, 500);
  const pinsp = safeNumber(settings?.pinsp, 20);
  const peep = safeNumber(settings?.peep, 5);
  const ieRatio = settings?.ieRatio || '1:2';
  const pSupport = safeNumber(settings?.pSupport, 10);

  const compliance = safeNumber(patient?.compliance, 50);
  const resistance = safeNumber(patient?.resistance, 5);

  // 1. Parse I:E Ratio (e.g. "1:2" -> ratio = 2, f_insp = 1 / (1 + 2) = 0.333)
  const parts = ieRatio.split(':');
  const eVal = Math.max(0.5, parseFloat(parts[1]) || 2);
  const inspFraction = 1 / (1 + eVal); // Fraction of cycle time spent in inspiration

  const safeRR = Math.max(1, rr);
  const cycleTime = 60 / safeRR; // Total breath duration in seconds
  const inspTime = cycleTime * inspFraction; // Inspiratory duration in seconds

  let deliveredVt = 0; // Delivered Tidal Volume in mL
  let pPeak = 0;       // Peak Inspiratory Pressure in cmH2O
  let pPlat = 0;       // Plateau Pressure in cmH2O
  let flowPeak = 0;    // Peak flow in L/min

  // 2. Mode-dependent mechanics calculations
  if (mode === 'vc') {
    // VOLUME CONTROL (VC-CMV)
    deliveredVt = vt;

    const flowLps = (deliveredVt / 1000) / Math.max(0.2, inspTime);
    flowPeak = flowLps * 60;

    const pElastic = deliveredVt / Math.max(1, compliance);
    const pResistive = flowLps * Math.max(1, resistance);

    pPlat = peep + pElastic;
    pPeak = pPlat + pResistive;

  } else if (mode === 'pc') {
    // PRESSURE CONTROL (PC-CMV)
    const drivingPressure = Math.max(1, pinsp);
    
    const tau = (Math.max(1, resistance) * (Math.max(1, compliance) / 1000));
    const fillFactor = 1 - Math.exp(-inspTime / Math.max(0.05, tau));
    deliveredVt = Math.round(drivingPressure * Math.max(1, compliance) * fillFactor);
    deliveredVt = Math.min(1200, Math.max(50, deliveredVt));

    pPeak = peep + drivingPressure;
    pPlat = peep + drivingPressure * fillFactor;
    flowPeak = (drivingPressure / Math.max(1, resistance)) * 60;

  } else if (mode === 'simv') {
    // SIMV
    deliveredVt = vt;
    const flowLps = (deliveredVt / 1000) / Math.max(0.2, inspTime);
    flowPeak = flowLps * 60;

    const pElastic = deliveredVt / Math.max(1, compliance);
    const pResistive = flowLps * Math.max(1, resistance);

    pPlat = peep + pElastic;
    pPeak = pPlat + pResistive;

  } else if (mode === 'ps') {
    // PRESSURE SUPPORT (PSV)
    const drivingPressure = pSupport > 0 ? pSupport : 8;
    const tau = (Math.max(1, resistance) * (Math.max(1, compliance) / 1000));
    
    const psInspTime = Math.min(2.0, Math.max(0.4, 2.5 * tau));
    const fillFactor = 1 - Math.exp(-psInspTime / Math.max(0.05, tau));

    deliveredVt = Math.round(drivingPressure * Math.max(1, compliance) * fillFactor);
    deliveredVt = Math.min(1200, Math.max(50, deliveredVt));

    pPeak = peep + drivingPressure;
    pPlat = peep + drivingPressure * 0.92;
    flowPeak = (drivingPressure / Math.max(1, resistance)) * 60;
  }

  // Ensure Pplat never exceeds Ppeak or drops below PEEP
  pPlat = Math.min(pPeak, Math.max(peep, pPlat));

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

  return {
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
  };
}
