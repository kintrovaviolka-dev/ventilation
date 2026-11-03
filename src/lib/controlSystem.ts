import { VentilatorSettings, PatientParams, VentMode, PatientPreset } from '../types';

export type ControlMode = 'NAVIGATING' | 'EDITING';

export interface ParameterSpec {
  id: string;
  label: string;
  shortLabel: string;
  unit: string;
  color: 'yellow' | 'cyan' | 'green' | 'amber' | 'primary';
  category: 'settings' | 'mode' | 'patient';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export const SELECTABLE_PARAMETERS: ParameterSpec[] = [
  {
    id: 'fio2',
    label: 'FiO₂ (Oxygen)',
    shortLabel: 'FiO₂',
    unit: '%',
    color: 'cyan',
    category: 'settings',
    min: 21,
    max: 100,
    step: 1,
  },
  {
    id: 'rr',
    label: 'Respiratory Rate',
    shortLabel: 'f (RR)',
    unit: 'bpm',
    color: 'green',
    category: 'settings',
    min: 6,
    max: 40,
    step: 1,
  },
  {
    id: 'vt',
    label: 'Tidal Volume',
    shortLabel: 'Vt',
    unit: 'mL',
    color: 'cyan',
    category: 'settings',
    min: 200,
    max: 800,
    step: 10,
  },
  {
    id: 'pinsp',
    label: 'Inspiratory Pressure',
    shortLabel: 'Pinsp',
    unit: 'cmH₂O',
    color: 'yellow',
    category: 'settings',
    min: 10,
    max: 40,
    step: 1,
  },
  {
    id: 'peep',
    label: 'PEEP',
    shortLabel: 'PEEP',
    unit: 'cmH₂O',
    color: 'yellow',
    category: 'settings',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    id: 'pSupport',
    label: 'Pressure Support',
    shortLabel: 'Psupp',
    unit: 'cmH₂O',
    color: 'amber',
    category: 'settings',
    min: 0,
    max: 30,
    step: 1,
  },
  {
    id: 'mode',
    label: 'Ventilator Mode',
    shortLabel: 'MODE',
    unit: '',
    color: 'primary',
    category: 'mode',
    options: ['vc', 'pc', 'simv', 'ps'],
  },
  {
    id: 'ieRatio',
    label: 'I:E Ratio',
    shortLabel: 'I:E',
    unit: '',
    color: 'primary',
    category: 'settings',
    options: ['1:1', '1:2', '1:3', '1:4'],
  },
  ...[
    ['flowTrigger', 'Flow trigger', 'Trigger', 'L/min', .5, 10, .5],
    ['cycleOff', 'PSV cycling', 'ETS', '%', 5, 70, 5],
    ['minTi', 'Minimum PSV inspiration', 'Ti min', 's', .1, 1, .1],
    ['maxTi', 'Maximum PSV inspiration', 'Ti max', 's', 1, 4, .1],
    ['apneaSeconds', 'Apnea timeout', 'Apnoea', 's', 5, 60, 1],
    ['backupEnabled', 'Apnea backup (0 off, 1 on)', 'Backup', '', 0, 1, 1],
    ['backupPinsp', 'Backup pressure above PEEP', 'Backup ΔP', 'cmH₂O', 10, 40, 1],
    ['backupRr', 'Backup respiratory rate', 'Backup RR', '/min', 6, 40, 1],
    ['spontaneousRate', 'Patient spontaneous rate', 'Patient RR', '/min', 0, 40, 1],
    ['driveAmplitude', 'Patient effort amplitude', 'Drive', 'cmH₂O', 0, 15, .5],
  ].map(([id, label, shortLabel, unit, min, max, step]) => ({
    id, label, shortLabel, unit, min, max, step, color: 'primary', category: 'settings',
  } as ParameterSpec)),
  { id: 'backupIeRatio', label: 'Backup I:E', shortLabel: 'Backup I:E', unit: '', color: 'primary', category: 'settings', options: ['1:1', '1:2', '1:3', '1:4'] },

];

export function getParamCurrentValue(
  paramId: string,
  settings: VentilatorSettings,
  mode: VentMode,
  patient: PatientParams
): number | string {
  switch (paramId) {
    case 'fio2':
      return settings.fio2;
    case 'rr':
      return settings.rr;
    case 'vt':
      return settings.vt;
    case 'pinsp':
      return settings.pinsp;
    case 'peep':
      return settings.peep;
    case 'pSupport':
      return settings.pSupport;
    case 'mode':
      return mode;
    case 'ieRatio':
      return settings.ieRatio;
    default:
      return settings[paramId as keyof VentilatorSettings] ?? 0;
  }
}

// Parameters with no effect in the current simplified mode are not editable.
export function isParameterEnabled(id: string, mode: VentMode): boolean {
  if (id === 'vt') return mode === 'vc' || mode === 'simv';
  if (id === 'pinsp') return mode === 'pc';
  if (id === 'pSupport' || ['flowTrigger', 'cycleOff', 'minTi', 'maxTi'].includes(id)) return mode === 'ps' || mode === 'simv';
  if (id.startsWith('backup') || id === 'apneaSeconds') return mode === 'ps';
  if (id === 'rr' || id === 'ieRatio') return mode !== 'ps';
  return true;
}

export function isValidParameterValue(param: ParameterSpec, value: number | string): boolean {
  if (param.options) return param.options.includes(String(value));
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const min = param.min ?? 0;
  const step = param.step ?? 1;
  return value >= min && value <= (param.max ?? Infinity)
    && Math.abs((value - min) / step - Math.round((value - min) / step)) < 1e-8;
}

export const CZECH_PARAMETER_LABELS: Record<string,string> = {
  flowTrigger:'Průtokový trigger', cycleOff:'Ukončení tlakové podpory', minTi:'Minimální Ti', maxTi:'Maximální Ti',
  apneaSeconds:'Limit apnoe', backupEnabled:'Záloha při apnoi (0 vypnuto, 1 zapnuto)', backupPinsp:'Záložní tlak nad PEEP',
  backupRr:'Záložní frekvence', backupIeRatio:'Záložní I:E', spontaneousRate:'Spontánní frekvence pacienta', driveAmplitude:'Úsilí pacienta',
};
