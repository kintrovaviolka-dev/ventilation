export interface SweepHistory<T> { width: number; lastSample: number; points: Array<T | undefined> }
export function createSweepHistory<T>(): SweepHistory<T> { return { width: 0, lastSample: -1, points: [] }; }
export function sampleSweep<T>(history: SweepHistory<T>, elapsed: number, width: number, sample: (time: number) => T, duration = 10): number {
  const index = Math.max(0, Math.floor(elapsed / duration * width));
  if (history.width !== width || index < history.lastSample) {
    history.width = width;
    history.points = new Array(width);
    history.lastSample = index - 1;
  }
  const first = Math.max(0, history.lastSample + 1, index - width + 1);
  for (let i = first; i <= index; i++) history.points[i % width] = sample(i / width * duration);
  history.lastSample = index;
  return index % width;
}
