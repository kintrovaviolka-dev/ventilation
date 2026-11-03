import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceSimulation, RuntimeState, SimulationCommand } from '../lib/simulationRuntime';

export function useSimulationRuntime(initial: RuntimeState, enabled: boolean) {
  const ref = useRef(initial);
  const [state, setState] = useState(initial);
  const [hiddenPauseNotice, setHiddenPauseNotice] = useState(false);
  const lastWallTime = useRef<number | null>(null);
  const active = useRef(false);
  const flush = useCallback(() => {
    const now = performance.now();
    if (active.current && lastWallTime.current !== null) ref.current = advanceSimulation(ref.current, [], now - lastWallTime.current).state;
    lastWallTime.current = now;
  }, []);
  const send = useCallback((input: SimulationCommand | SimulationCommand[] | ((current: RuntimeState) => SimulationCommand | SimulationCommand[])) => {
    flush();
    const commands = typeof input === 'function' ? input(ref.current) : input;
    const result = advanceSimulation(ref.current, Array.isArray(commands) ? commands : [commands], 0);
    ref.current = result.state; setState(result.state);
    return result.events;
  }, [flush]);
  const reset = useCallback((next: RuntimeState) => {
    ref.current = next; lastWallTime.current = performance.now(); setState(next); setHiddenPauseNotice(false);
  }, []);
  useEffect(() => {
    let frame = 0, lastPublish = 0;
    const visibility = () => {
      // Account for the visible interval only, then freeze every simulation subsystem.
      flush();
      active.current = enabled && !document.hidden;
      ref.current = advanceSimulation(ref.current, [{ type: 'run', running: active.current }], 0).state;
      lastWallTime.current = performance.now();
      if (document.hidden && enabled) setHiddenPauseNotice(true);
      setState(ref.current);
    };
    visibility();
    const render = (now: number) => {
      flush();
      if (active.current && now - lastPublish >= 50) { setState(ref.current); lastPublish = now; }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      flush(); active.current = false;
      ref.current = advanceSimulation(ref.current, [{ type: 'run', running: false }], 0).state;
      lastWallTime.current = null;
      cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, flush]);
  const readState = useCallback(() => ref.current, []);
  return { state, readState, send, reset, hiddenPauseNotice, dismissHiddenPause: () => setHiddenPauseNotice(false) };
}
