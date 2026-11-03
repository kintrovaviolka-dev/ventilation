/** Engine CO2 stays in mmHg; convert exactly once at every user-facing boundary. */
export const MMHG_TO_KPA = 0.133322387415;
export const co2Kpa = (mmHg: number | null): number | null => mmHg === null ? null : mmHg * MMHG_TO_KPA;
export function monitorNumber(value: number | null, language: 'cs' | 'en', digits = 0): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', language === 'cs' ? ',' : '.');
}
