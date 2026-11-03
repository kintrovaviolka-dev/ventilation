import { ActiveAlarm } from '../lib/alarmEngine';
import { Language } from '../types';
export function AlarmBanner({language,alarms,isSilenced,onSilenceToggle,silenceSeconds=0}:{
  language:Language;alarms:ActiveAlarm[];isSilenced:boolean;onSilenceToggle:()=>void;silenceSeconds?:number;
}) {
  if(!alarms.length)return null;
  const cs=language==='cs';
  const ordered=[...alarms].sort((a,b)=>Number(b.level==='critical')-Number(a.level==='critical'));
  return <section className={`alarm-strip ${ordered[0].level}`} aria-label={cs?'Aktivní alarmy':'Active alarms'}>
    <div className="alarm-list">{ordered.map(alarm=><div key={alarm.id} className={`alarm-item ${alarm.level}`}>
      <strong>{alarm.message}</strong><span>{alarm.code}</span>
    </div>)}</div>
    <button onClick={onSilenceToggle} aria-pressed={isSilenced}>{isSilenced?
      `${cs?'Ztišeno':'Muted'} · ${silenceSeconds} s`:(cs?'Ztišit zvuk na 2 min':'Silence audio for 2 min')}</button>
  </section>;
}
