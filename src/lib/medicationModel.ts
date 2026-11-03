export type MedicationId = 'propofol' | 'sufentanil' | 'rocuronium' | 'norepinephrine' | 'atropine';
export type MedicationAdministration = 'bolus' | 'infusion';

export interface MedicationDoseEvent {
  id: string;
  medication: MedicationId;
  administration: MedicationAdministration;
  amount: number;
  unit: string;
  administeredAtSeconds: number;
  stoppedAtSeconds?: number;
}

interface MedicationDefinition {
  label: { cs: string; en: string };
  unit: string;
  bolus?: { min: number; max: number; step: number; examples: number[]; reference: number; halfLifeSeconds: number };
  infusion?: { min: number; max: number; step: number; examples: number[]; reference: number; halfLifeSeconds: number };
}

export const MEDICATIONS: Record<MedicationId, MedicationDefinition> = {
  propofol: {
    label: { cs: 'Propofol', en: 'Propofol' },
    unit: 'mg',
    bolus: { min: 1, max: 500, step: 1, examples: [20, 50, 100], reference: 50, halfLifeSeconds: 90 },
  },
  sufentanil: {
    label: { cs: 'Sufentanil', en: 'Sufentanil' },
    unit: 'mcg',
    bolus: { min: 1, max: 100, step: 1, examples: [5, 10, 20], reference: 10, halfLifeSeconds: 180 },
  },
  rocuronium: {
    label: { cs: 'Rokuronium', en: 'Rocuronium' },
    unit: 'mg',
    bolus: { min: 1, max: 100, step: 1, examples: [10, 20, 40], reference: 20, halfLifeSeconds: 300 },
  },
  norepinephrine: {
    label: { cs: 'Noradrenalin', en: 'Norepinephrine' },
    unit: 'mcg',
    bolus: { min: 1, max: 100, step: 1, examples: [4, 8, 16], reference: 8, halfLifeSeconds: 90 },
    infusion: { min: 0.001, max: 1, step: 0.001, examples: [0.02, 0.05, 0.1], reference: 0.05, halfLifeSeconds: 120 },
  },
  atropine: {
    label: { cs: 'Atropin', en: 'Atropine' },
    unit: 'mg',
    bolus: { min: 0.01, max: 5, step: 0.01, examples: [0.25, 0.5, 1], reference: 0.5, halfLifeSeconds: 180 },
  },
};

export interface MedicationEffects {
  heartRateChange: number;
  systolicPressureChange: number;
  diastolicPressureChange: number;
  spontaneousDriveSuppression: number;
  sedation: number;
  neuromuscularBlock: number;
  contributions: Array<{ event: MedicationDoseEvent; intensity: number }>;
}

export interface DoseValidation {
  valid: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export function getDoseLimits(medication: MedicationId, administration: MedicationAdministration) {
  return MEDICATIONS[medication]?.[administration];
}

export function validateMedicationDose(
  medication: MedicationId,
  administration: MedicationAdministration,
  amount: number
): DoseValidation {
  const limits = getDoseLimits(medication, administration);
  if (!limits || !Number.isFinite(amount)) return { valid: false };
  const stepCount = (amount - limits.min) / limits.step;
  return {
    valid: amount >= limits.min
      && amount <= limits.max
      && Math.abs(stepCount - Math.round(stepCount)) < 1e-8,
    min: limits.min,
    max: limits.max,
    step: limits.step,
  };
}

function eventIntensity(event: MedicationDoseEvent, nowSeconds: number): number {
  if (!Number.isFinite(nowSeconds) || !Number.isFinite(event.administeredAtSeconds) || nowSeconds < event.administeredAtSeconds) return 0;
  const age = nowSeconds - event.administeredAtSeconds;
  const definition = getDoseLimits(event.medication, event.administration);
  if (!definition || !Number.isFinite(age) || !Number.isFinite(event.amount) || event.amount <= 0) return 0;
  const doseRatio = event.amount / definition.reference;
  const doseScale = doseRatio / (1 + doseRatio);

  if (event.administration === 'bolus') {
    return doseScale * Math.pow(0.5, age / definition.halfLifeSeconds);
  }

  const stoppedAt = event.stoppedAtSeconds;
  if (stoppedAt !== undefined && nowSeconds >= stoppedAt) {
    return doseScale
      * (1 - Math.exp(-Math.max(0, stoppedAt - event.administeredAtSeconds) / 30))
      * Math.pow(0.5, (nowSeconds - stoppedAt) / definition.halfLifeSeconds);
  }
  return doseScale * (1 - Math.exp(-age / 30));
}

export function calculateMedicationEffects(
  events: MedicationDoseEvent[],
  nowSeconds: number
): MedicationEffects {
  const effects: MedicationEffects = {
    heartRateChange: 0,
    systolicPressureChange: 0,
    diastolicPressureChange: 0,
    spontaneousDriveSuppression: 0,
    sedation: 0,
    neuromuscularBlock: 0,
    contributions: [],
  };

  for (const event of events) {
    const intensity = eventIntensity(event, nowSeconds);
    if (intensity <= 0) continue;
    effects.contributions.push({ event, intensity });

    switch (event.medication) {
      case 'propofol':
        effects.sedation += intensity;
        effects.heartRateChange -= 5 * intensity;
        effects.systolicPressureChange -= 10 * intensity;
        effects.diastolicPressureChange -= 7 * intensity;
        effects.spontaneousDriveSuppression += 1.2 * intensity;
        break;
      case 'sufentanil':
        effects.heartRateChange -= 4 * intensity;
        effects.systolicPressureChange -= 5 * intensity;
        effects.diastolicPressureChange -= 3 * intensity;
        effects.spontaneousDriveSuppression += 1.5 * intensity;
        break;
      case 'rocuronium':
        effects.neuromuscularBlock += intensity;
        effects.spontaneousDriveSuppression += 1.8 * intensity;
        break;
      case 'norepinephrine':
        effects.systolicPressureChange += 14 * intensity;
        effects.diastolicPressureChange += 8 * intensity;
        effects.heartRateChange += 2 * intensity;
        break;
      case 'atropine':
        effects.heartRateChange += 18 * intensity;
        effects.systolicPressureChange += 2 * intensity;
        break;
    }
  }

  effects.sedation = Math.min(1, effects.sedation);
  effects.neuromuscularBlock = Math.min(1, effects.neuromuscularBlock);
  effects.spontaneousDriveSuppression = Math.min(4, effects.spontaneousDriveSuppression);
  effects.heartRateChange = Math.max(-40, Math.min(80, effects.heartRateChange));
  effects.systolicPressureChange = Math.max(-60, Math.min(80, effects.systolicPressureChange));
  effects.diastolicPressureChange = Math.max(-40, Math.min(50, effects.diastolicPressureChange));
  return effects;
}

export function formatMedicationAmount(amount: number, unit: string): string {
  const formatted = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(3)));
  return `${formatted} ${unit}`;
}

export function validMedicationEvent(event: MedicationDoseEvent): boolean {
  const definition = MEDICATIONS[event.medication];
  const expectedUnit = event.administration === 'infusion' ? 'mcg/kg/min' : definition?.unit;
  return Boolean(definition) && typeof event.id === 'string' && event.id.length > 0
    && ['bolus', 'infusion'].includes(event.administration)
    && validateMedicationDose(event.medication, event.administration, event.amount).valid
    && event.unit === expectedUnit && Number.isFinite(event.administeredAtSeconds) && event.administeredAtSeconds >= 0
    && (event.stoppedAtSeconds === undefined || (event.administration === 'infusion'
      && Number.isFinite(event.stoppedAtSeconds) && event.stoppedAtSeconds >= event.administeredAtSeconds));
}
