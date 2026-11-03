import { ReactNode } from 'react';
import { Language } from '../types';
import { RuntimeState } from '../lib/simulationRuntime';
import { monitorNumber } from '../lib/monitorUnits';
import { RecordedTraceCanvas, TraceKind } from './RecordedTraceCanvas';
export function MonitorTraceRow({readState,tick,language,kind,label,value,unit,digits=0,children}:{
  readState:()=>RuntimeState;tick:number;language:Language;kind:TraceKind;label:string;
  value:number|null;unit:string;digits?:number;children?:ReactNode;
}) {
  return <div className={`or-trace-row channel-${kind}`}>
    <div className="or-trace-plot"><RecordedTraceCanvas readState={readState} tick={tick} language={language} kind={kind}/></div>
    <div className="or-trace-number" data-testid={`monitor-${kind}`}>
      <span className="or-number-label">{label} <small>{unit}</small></span>
      <strong>{monitorNumber(value,language,digits)}</strong>
      {children&&<div className="or-secondary-values">{children}</div>}
    </div>
  </div>;
}
