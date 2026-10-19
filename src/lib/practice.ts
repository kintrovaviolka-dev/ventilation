export type PracticeField = 'vt' | 'rr' | 'peep' | 'fio2' | 'ie' | 'propofol' | 'rocuronium';
export type PracticeAnswers = Record<PracticeField, string>;
export type PracticeStatus = 'low' | 'in-range' | 'high' | 'invalid' | 'not-scored';
export type PracticeReason = 'vt' | 'rr' | 'peep' | 'fio2' | 'ie' | 'propofol' | 'rocuronium' | 'individual' | 'needsVt';

export interface PracticeCase {
  id: string;
  name: string;
  sex: 'M' | 'F';
  age: number;
  heightCm: number;
  weightKg: number;
  induction: 'routine' | 'rsi';
  minuteVentilation: [number, number];
  oxygenTrials: { fio2: number; spo2: number }[];
}

export interface PracticeResult {
  id: PracticeField;
  status: PracticeStatus;
  reason: PracticeReason;
  range?: [number, number];
}

export const PRACTICE_SOURCES = [
  { id: 'ventilation', title: 'NYSORA: Lung protective ventilation; Young et al., BJA 2019', url: 'https://nysora.com/anesthesia/lung-protective-ventilation/' },
  { id: 'oxygen', title: 'BTS guideline for oxygen use in adults, 2017', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5531304/' },
  { id: 'propofol', title: 'Propofol 1%: SmPC, section 4.2', url: 'https://www.medicines.org.uk/emc/product/5492/smpc' },
  { id: 'rocuronium', title: 'Esmeron (rocuronium): SmPC, section 4.2', url: 'https://www.medicines.org.uk/emc/product/1345/smpc' },
];

export const PRACTICE_FIELDS: {
  id: PracticeField;
  min: number;
  max: number;
  step: number;
  unit: string;
  medication?: boolean;
}[] = [
  { id: 'vt', min: 50, max: 1500, step: 10, unit: 'mL' },
  { id: 'rr', min: 4, max: 40, step: 1, unit: '/min' },
  { id: 'peep', min: 0, max: 20, step: 1, unit: 'cmH₂O' },
  { id: 'fio2', min: 21, max: 100, step: 1, unit: '%' },
  { id: 'ie', min: 1, max: 5, step: 0.5, unit: 'I:E' },
  { id: 'propofol', min: 0, max: 500, step: 5, unit: 'mg', medication: true },
  { id: 'rocuronium', min: 0, max: 200, step: 1, unit: 'mg', medication: true },
];

export function initialPracticeAnswers(): PracticeAnswers {
  return { vt: '400', rr: '12', peep: '0', fio2: '30', ie: '1', propofol: '100', rocuronium: '30' };
}

export function predictedBodyWeight(patient: Pick<PracticeCase, 'sex' | 'heightCm'>): number {
  return (patient.sex === 'M' ? 50 : 45.5) + 0.91 * (patient.heightCm - 152.4);
}

export function canScoreInduction(patient: PracticeCase): boolean {
  const bmi = patient.weightKg / (patient.heightCm / 100) ** 2;
  const idealWeight = (patient.sex === 'M' ? 50 : 45.5) + 2.3 * (patient.heightCm - 152.4) / 2.54;
  // Do not invent reduced-dose intervals for age, obesity or excess weight.
  return patient.age < 55 && bmi < 30 && patient.weightKg < idealWeight * 1.3;
}

export function createPracticeCases(): PracticeCase[] {
  const cases: PracticeCase[] = [];
  const names = {
    M: ['Adam', 'Daniel', 'Filip', 'Jakub', 'Martin', 'Ondřej', 'Pavel', 'Tomáš'],
    F: ['Anna', 'Barbora', 'Eliška', 'Hana', 'Jana', 'Klára', 'Lucie', 'Petra'],
  };
  for (const sex of ['M', 'F'] as const) {
    for (const heightCm of [150, 155, 160, 165, 170, 175, 180, 185, 190]) {
      for (const bmi of [20, 23, 26, 29, 34]) {
        for (const age of [22, 37, 52, 68]) {
          for (const induction of ['routine', 'rsi'] as const) {
            const index = cases.length;
            const oxygenTarget = [30, 35, 40, 45][(Math.floor(index / 2) + Math.floor(index / 8)) % 4];
            const minuteTarget = [4, 5, 6, 7, 8][Math.floor(index / 8) % 5];
            cases.push({
              id: `${sex}-${heightCm}-${bmi}-${age}-${induction}`,
              name: names[sex][Math.floor(index / 2) % names[sex].length],
              sex, heightCm, age, induction,
              weightKg: Math.round(bmi * (heightCm / 100) ** 2),
              minuteVentilation: [minuteTarget - 0.5, minuteTarget + 0.5],
              // Fictional observations supplied in the question, not a gas-exchange model.
              oxygenTrials: [
                { fio2: oxygenTarget - 5, spo2: 92 },
                { fio2: oxygenTarget, spo2: 95 },
                { fio2: oxygenTarget + 5, spo2: 98 },
              ],
            });
          }
        }
      }
    }
  }
  return cases;
}

export function shuffledPracticeDeck(previousId?: string, random = Math.random): PracticeCase[] {
  const deck = createPracticeCases();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (deck[0].id === previousId) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}

function parseAnswer(id: PracticeField, raw: string): number | undefined {
  const field = PRACTICE_FIELDS.find((item) => item.id === id)!;
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  const steps = (value - field.min) / field.step;
  if (!Number.isFinite(value) || value < field.min || value > field.max ||
      Math.abs(steps - Math.round(steps)) > 1e-8) return undefined;
  return value;
}

export function evaluatePractice(
  patient: PracticeCase, answers: PracticeAnswers, includeMedications: boolean
): PracticeResult[] {
  const pbw = predictedBodyWeight(patient);
  const vtRange: [number, number] = [Math.ceil(pbw * 6 / 10) * 10, Math.floor(pbw * 8 / 10) * 10];
  const vt = parseAnswer('vt', answers.vt);
  const effectiveOxygen = patient.oxygenTrials
    .filter((trial) => trial.spo2 >= 94 && trial.spo2 <= 98)
    .map((trial) => trial.fio2);
  if (effectiveOxygen.length === 0) throw new Error('Practice case has no oxygen trial in the target range.');
  const fio2 = Math.min(...effectiveOxygen);
  const rocTarget = Math.round(patient.weightKg * (patient.induction === 'rsi' ? 1 : 0.6));
  const ranges: Record<PracticeField, [number, number]> = {
    vt: vtRange,
    rr: vt ? [
      Math.ceil(patient.minuteVentilation[0] * 1000 / vt),
      Math.floor(patient.minuteVentilation[1] * 1000 / vt),
    ] : [0, 0],
    peep: [5, 5],
    fio2: [fio2, fio2],
    ie: [2, 2],
    propofol: [Math.ceil(patient.weightKg * 1.5 / 5) * 5, Math.floor(patient.weightKg * 2.5 / 5) * 5],
    rocuronium: [rocTarget, rocTarget],
  };

  return PRACTICE_FIELDS.filter((field) => includeMedications || !field.medication).map(({ id, medication }) => {
    if (medication && !canScoreInduction(patient)) {
      return { id, status: 'not-scored', reason: 'individual' };
    }
    const value = parseAnswer(id, answers[id]);
    if (value === undefined) return { id, status: 'invalid', reason: id };
    if (id === 'rr' && (vt === undefined || vt < vtRange[0] || vt > vtRange[1])) {
      return { id, status: 'not-scored', reason: 'needsVt' };
    }
    const range = ranges[id];
    return {
      id, reason: id, range,
      status: value < range[0] ? 'low' : value > range[1] ? 'high' : 'in-range',
    };
  });
}
