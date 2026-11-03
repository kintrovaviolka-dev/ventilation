import { RecordedTraceCanvas } from './RecordedTraceCanvas';
import { Language } from '../types';
import { RuntimeState } from '../lib/simulationRuntime';
export function WaveformCanvas({readState,tick,language}:{readState:()=>RuntimeState;tick:number;language:Language}) {
  return <RecordedTraceCanvas readState={readState} tick={tick} language={language} kind="ventilator" />;
}
