import { Language } from '../types';
import { RuntimeState } from '../lib/simulationRuntime';
import { MonitorTraceRow } from './MonitorTraceRow';
export function VitalsMonitor({readState,tick,language}:{readState:()=>RuntimeState;tick:number;language:Language}) {
  const r=readState().readings;
  const common={readState,tick,language};
  return <div className="or-vitals">
    <MonitorTraceRow {...common} kind="ecg" label="HR" value={r.heartRate} unit="/min"/>
    <MonitorTraceRow {...common} kind="spo2" label="SpO₂" value={r.spO2} unit="%"/>
    <div className="or-nibp"><span>NIBP <small>mmHg</small></span><strong>{r.systolicPressure}<span>/</span>{r.diastolicPressure}</strong></div>
  </div>;
}
