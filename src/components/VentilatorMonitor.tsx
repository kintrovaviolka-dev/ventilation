import { Language } from '../types';
import { RuntimeState } from '../lib/simulationRuntime';
import { co2Kpa, monitorNumber } from '../lib/monitorUnits';
import { MonitorTraceRow } from './MonitorTraceRow';
export function VentilatorMonitor({readState,tick,language}:{readState:()=>RuntimeState;tick:number;language:Language}) {
  const state=readState(),r=state.readings;
  const n=(value:number|null,digits=0)=>monitorNumber(value,language,digits);
  const common={readState,tick,language};
  return <div className="or-ventilator">
    <MonitorTraceRow {...common} kind="pressure" label="Ppeak" value={r.pPeak} unit="cmH₂O">
      <span>Pmean <b>{n(r.pMean)}</b></span><span>PEEP <b>{n(r.peep)}</b></span>
    </MonitorTraceRow>
    <MonitorTraceRow {...common} kind="flow" label="MVe" value={r.mVe} unit="L/min" digits={1}>
      <span>VTe <b>{n(r.vTe)}</b> mL</span>
    </MonitorTraceRow>
    <MonitorTraceRow {...common} kind="co2" label="EtCO₂" value={co2Kpa(r.etCO2)} unit="kPa" digits={1}>
      <span>RR <b>{n(r.rrTotal)}</b> /min</span>
    </MonitorTraceRow>
    <div className="or-monitor-footer"><strong>{state.activeMode.toUpperCase()}{r.backup?' · BACKUP PC':''}</strong><span>FiO₂ {n(state.activeSettings.fio2)} %</span><span>{language==='cs'?'Čísla za dokončený dech':'Completed-breath values'}</span></div>
  </div>;
}
