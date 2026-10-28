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
      return 0;
  }
}
