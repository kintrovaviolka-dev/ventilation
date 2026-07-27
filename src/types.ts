export type Language = 'en' | 'cs';

export type VentMode = 'vc' | 'pc' | 'simv' | 'ps';

export type AppStep = 'welcome' | 'intake' | 'simulation';

export interface VentilatorSettings {
  fio2: number;       // Oxygen percentage 21-100%
  rr: number;         // Respiratory rate 6-40 bpm
  vt: number;         // Tidal Volume 200-800 mL (for VC / SIMV)
  pinsp: number;      // Inspiratory Pressure 10-40 cmH2O (for PC)
  peep: number;       // PEEP 0-20 cmH2O
  ieRatio: string;    // I:E Ratio ("1:1", "1:1.5", "1:2", "1:2.5", "1:3", "1:4")
  pSupport: number;   // Pressure Support 0-30 cmH2O (for PS / SIMV)
}

export type PatientPreset = 'normal' | 'ards' | 'copd' | 'restrictive' | 'custom';

export interface PatientParams {
  compliance: number; // mL/cmH2O (10-100)
  resistance: number; // cmH2O/L/s (2-50)
  preset: PatientPreset;
}

export interface PatientCase {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  weightKg: number;
  heightCm: number;
  ibwKg: number;
  asaStatus: string;
  surgery: string;
  history: string;
  baselineCompliance: number;
  baselineResistance: number;
  preset: PatientPreset;
}

export interface MedicationSelection {
  inductionAgent: 'propofol' | 'etomidate' | 'ketamine';
  inductionDoseMgKg: number;
  opioid: 'fentanyl' | 'sufentanil';
  opioidDoseMcgKg: number;
  nmb: 'rocuronium' | 'succinylcholine' | 'cisatracurium';
  nmbDoseMgKg: number;
  volatileGas: 'sevoflurane' | 'desflurane' | 'isoflurane';
  volatileMac: number; // 0.5 to 2.5
}

export interface IntraoperativeEvent {
  id: string;
  title: { en: string; cs: string };
  description: { en: string; cs: string };
  compliance: number;
  resistance: number;
  severity: 'normal' | 'warning' | 'critical';
  teachingPoints: { en: string; cs: string };
}

export interface ReadoutTileData {
  id: string;
  label: string;
  sublabel?: string;
  unit: string;
  value: string;
  color: 'yellow' | 'cyan' | 'green' | 'amber' | 'primary';
}

export interface AlarmState {
  active: boolean;
  message: string;
  level: 'info' | 'warning' | 'critical';
}
