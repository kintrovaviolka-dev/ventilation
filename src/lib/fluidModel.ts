export type FluidId = 'balanced-crystalloid' | 'saline';
export type FluidStatus = 'running' | 'paused' | 'stopped' | 'completed';
export interface FluidSegment { atSeconds: number; rateMlHour: number; programmedRateMlHour?: number }
export interface FluidInfusion {
  id: string; fluid: FluidId; bagMl: number; targetMl: number;
  startedAtSeconds: number; segments: FluidSegment[];
  stoppedAtSeconds?: number;
}
export const FLUIDS = {
  'balanced-crystalloid': { cs: 'Balancovaný krystaloid', en: 'Balanced crystalloid' },
  saline: { cs: 'NaCl 0,9 %', en: 'Saline 0.9%' },
} as const;
export function validFluidInput(fluid: string, bagMl: number, targetMl: number, rate: number): boolean {
  return Object.hasOwn(FLUIDS, fluid) && [bagMl, targetMl, rate].every(Number.isFinite)
    && Number.isInteger(bagMl) && bagMl >= 1 && bagMl <= 3000
    && Number.isInteger(targetMl) && targetMl >= 1 && targetMl <= bagMl
    && Number.isInteger(rate) && rate >= 1 && rate <= 6000;
}
export function fluidProgress(infusion: FluidInfusion, now: number) {
  const until = Math.max(infusion.startedAtSeconds, Math.min(now, infusion.stoppedAtSeconds ?? Infinity));
  let deliveredMl = 0;
  let completedAtSeconds: number | undefined;
  for (let i = 0; i < infusion.segments.length; i++) {
    const segment = infusion.segments[i];
    if (segment.atSeconds > until) break;
    const duration = Math.max(0, Math.min(until, infusion.segments[i + 1]?.atSeconds ?? until) - segment.atSeconds);
    const delivered = duration * segment.rateMlHour / 3600;
    if (segment.rateMlHour > 0 && deliveredMl + delivered >= infusion.targetMl - 1e-9) {
      completedAtSeconds = segment.atSeconds + (infusion.targetMl - deliveredMl) * 3600 / segment.rateMlHour;
      deliveredMl = infusion.targetMl;
      break;
    }
    deliveredMl += delivered;
  }
  const last = infusion.segments.filter(s => s.atSeconds <= until).at(-1);
  const status: FluidStatus = completedAtSeconds !== undefined ? 'completed'
    : infusion.stoppedAtSeconds !== undefined && now >= infusion.stoppedAtSeconds ? 'stopped'
    : (last?.rateMlHour ?? 0) > 0 ? 'running' : 'paused';
  return { deliveredMl, remainingMl: Math.max(0, infusion.targetMl - deliveredMl),
    rateMlHour: status === 'running' ? last!.rateMlHour : 0, status, completedAtSeconds };
}
export function changeFluid(infusion: FluidInfusion, now: number, action: 'rate' | 'pause' | 'resume' | 'stop', rate?: number): FluidInfusion {
  if (!Number.isFinite(now) || now < (infusion.segments.at(-1)?.atSeconds ?? infusion.startedAtSeconds)) return infusion;
  const progress = fluidProgress(infusion, now);
  if (progress.status === 'stopped' || progress.status === 'completed') return infusion;
  if (action === 'stop') return { ...infusion, stoppedAtSeconds: now };
  const nextRate = action === 'pause' ? 0 : action === 'resume'
    ? [...infusion.segments].reverse().map(segment => segment.programmedRateMlHour ?? segment.rateMlHour).find(value => value > 0) ?? 0 : rate;
  if (nextRate === undefined || !Number.isFinite(nextRate) || !Number.isInteger(nextRate)
    || nextRate < 0 || nextRate > 6000 || (action !== 'pause' && nextRate === 0)) return infusion;
  const staysPaused = action === 'rate' && progress.status === 'paused';
  return { ...infusion, segments: [...infusion.segments, { atSeconds: now, rateMlHour: staysPaused ? 0 : nextRate, ...(staysPaused ? { programmedRateMlHour: nextRate } : {}) }] };
}
export function fluidDeliveredSince(infusions: FluidInfusion[], start: number, now: number): number {
  return infusions.reduce((sum, infusion) => sum + Math.max(0,
    fluidProgress(infusion, now).deliveredMl - fluidProgress(infusion, start).deliveredMl), 0);
}
export function fluidResponse(deliveredMl: number): number {
  const volume = Math.max(0, deliveredMl);
  return .75 * volume / (volume + 500);
}
