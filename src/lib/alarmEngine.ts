import { CalculatedPhysiology } from './physiologyEngine';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

export interface ActiveAlarm {
  id: string;
  level: 'critical' | 'warning'; // red = critical, amber = warning
  message: string;
  code: string;
}

export function detectAlarms(
  physiology: CalculatedPhysiology,
  language: Language
): ActiveAlarm[] {
  const t = TRANSLATIONS[language]?.alarms || TRANSLATIONS.en.alarms;
  const alarms: ActiveAlarm[] = [];

  // 1. Peak Airway Pressure Alarms (> 40 cmH2O critical, > 35 cmH2O warning)
  if (physiology.pPeak > 40) {
    alarms.push({
      id: 'highPressure_critical',
      level: 'critical',
      message: t.highPressure,
      code: `Ppeak ${physiology.pPeak} cmH₂O (> 40)`,
    });
  } else if (physiology.pPeak > 35) {
    alarms.push({
      id: 'highPressure_warning',
      level: 'warning',
      message: language === 'cs'
        ? 'VAROVÁNÍ: ZVÝŠENÝ VRCHOLOVÝ TLAK (> 35 cmH₂O)'
        : 'CAUTION: ELEVATED PEAK PRESSURE (> 35 cmH₂O)',
      code: `Ppeak ${physiology.pPeak} cmH₂O`,
    });
  }

  // 2. Oxygen Saturation Alarms (< 88% critical, < 92% warning)
  if (physiology.spO2 < 88) {
    alarms.push({
      id: 'lowSpO2_critical',
      level: 'critical',
      message: t.lowSpO2,
      code: `SpO₂ ${physiology.spO2}% (< 90%)`,
    });
  } else if (physiology.spO2 < 92) {
    alarms.push({
      id: 'lowSpO2_warning',
      level: 'warning',
      message: language === 'cs'
        ? 'VAROVÁNÍ: MÍRNÁ DESATURACE (SpO₂ < 92%)'
        : 'CAUTION: MILD DESATURATION (SpO₂ < 92%)',
      code: `SpO₂ ${physiology.spO2}%`,
    });
  }

  // 3. Minute Ventilation Alarms (< 3.5 L/min critical, < 4.5 L/min warning)
  if (physiology.mVe < 3.5) {
    alarms.push({
      id: 'lowMV_critical',
      level: 'critical',
      message: t.lowMV,
      code: `MVe ${physiology.mVe} L/min (< 3.5)`,
    });
  } else if (physiology.mVe < 4.5) {
    alarms.push({
      id: 'lowMV_warning',
      level: 'warning',
      message: language === 'cs'
        ? 'VAROVÁNÍ: NÍZKÁ MINUTOVÁ VENTILACE (< 4.5 L/min)'
        : 'CAUTION: LOW MINUTE VENTILATION (< 4.5 L/min)',
      code: `MVe ${physiology.mVe} L/min`,
    });
  }

  // 4. End-Tidal CO2 Alarms (> 55 or < 22 mmHg critical, > 48 or < 26 warning)
  if (physiology.etCO2 > 55) {
    alarms.push({
      id: 'etco2High_critical',
      level: 'critical',
      message: t.etco2High,
      code: `EtCO₂ ${physiology.etCO2} mmHg (> 55)`,
    });
  } else if (physiology.etCO2 < 22) {
    alarms.push({
      id: 'etco2Low_critical',
      level: 'critical',
      message: t.etco2Low,
      code: `EtCO₂ ${physiology.etCO2} mmHg (< 22)`,
    });
  } else if (physiology.etCO2 > 48) {
    alarms.push({
      id: 'etco2High_warning',
      level: 'warning',
      message: language === 'cs'
        ? 'VAROVÁNÍ: VYSOKÝ EtCO₂ / HRANIČNÍ HYPOVENTILACE'
        : 'CAUTION: ELEVATED EtCO₂ / BORDERLINE HYPOVENTILATION',
      code: `EtCO₂ ${physiology.etCO2} mmHg`,
    });
  } else if (physiology.etCO2 < 26) {
    alarms.push({
      id: 'etco2Low_warning',
      level: 'warning',
      message: language === 'cs'
        ? 'VAROVÁNÍ: NÍZKÝ EtCO₂ / HRANIČNÍ HYPERVENTILACE'
        : 'CAUTION: LOW EtCO₂ / BORDERLINE HYPERVENTILATION',
      code: `EtCO₂ ${physiology.etCO2} mmHg`,
    });
  }

  return alarms;
}
