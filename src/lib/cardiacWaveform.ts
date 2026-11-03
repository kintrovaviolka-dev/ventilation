/** Illustrative rhythm strips, not an electrophysiology or arrhythmia-treatment model. */
export const CARDIAC_RHYTHMS = ['sinus', 'af', 'pvc'] as const;
export type CardiacRhythm = typeof CARDIAC_RHYTHMS[number];
export const RHYTHM_LABELS = {
  cs: { sinus: 'Sinusový rytmus', af: 'Fibrilace síní', pvc: 'Komorové extrasystoly · bigeminie' },
  en: { sinus: 'Sinus rhythm', af: 'Atrial fibrillation', pvc: 'Premature ventricular beats · bigeminy' },
};
export function beatIntervalFactor(rhythm: CardiacRhythm, beat: number): number {
  if (rhythm === 'pvc') return beat % 2 === 0 ? .65 : 1.35;
  // Deterministic non-repeating irregular intervals; no randomness tied to render FPS.
  if (rhythm === 'af') {
    const hash = Math.sin((beat + 1) * 127.1) * 43758.5453;
    return .65 + .7 * (hash - Math.floor(hash));
  }
  return 1;
}
export function cardiacWaveform(phase: number, period: number, rhythm: CardiacRhythm, beat: number, time: number) {
  // R is at phase zero. Widths are seconds, not percentages of the cardiac cycle.
  const age = phase * period;
  const gaussian = (center: number, width: number) => {
    const distance = ((age - center + period / 2) % period + period) % period - period / 2;
    return Math.exp(-((distance / width) ** 2));
  };
  const ectopic = rhythm === 'pvc' && beat % 2 === 1;
  const nextEctopic = rhythm === 'pvc' && beat % 2 === 0;
  const p = rhythm === 'af' || nextEctopic ? 0 : .13 * gaussian(-.17, .035);
  const tTime = Math.min(.25, period * .38);
  const ecg = ectopic
    ? .9 * gaussian(0, .045) - .42 * gaussian(.065, .035) - .25 * gaussian(tTime, .065) + p
    : p - .15 * gaussian(-.025, .011) + 1.05 * gaussian(0, .012)
      - .27 * gaussian(.025, .013) + .25 * gaussian(tTime, .055);
  const fibrillation = rhythm === 'af' ? .022 * Math.sin(time * 2 * Math.PI * 6.7)
    + .014 * Math.sin(time * 2 * Math.PI * 9.3) : 0;
  // Peripheral pulse follows the same ventricular beat with an illustrative transit delay.
  const pulseAge = Math.max(0, age - .10);
  const pulse = (pulseAge / .13) ** 2 * Math.exp(2 * (1 - pulseAge / .13));
  const reflection = .1 * Math.exp(-(((pulseAge - .42) / .065) ** 2));
  return { ecg: ecg + fibrillation, pleth: .06 + (ectopic ? .5 : .84) * (pulse + reflection) };
}
/** Keep ECG readable on phones too; CSS pixels are not calibrated paper millimetres. */
export function cardiacWindowSeconds(plotWidth: number): number {
  return Math.min(6, Math.max(2, Math.floor(plotWidth / 110)));
}
