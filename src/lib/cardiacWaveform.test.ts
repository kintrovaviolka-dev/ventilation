import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSimulation, createRuntime, SimulationCommand } from './simulationRuntime';
import { CardiacRhythm, cardiacWaveform, cardiacWindowSeconds } from './cardiacWaveform';
const settings={fio2:40,rr:12,vt:500,pinsp:20,peep:5,ieRatio:'1:2',pSupport:10};
const start=(rhythm:CardiacRhythm)=>advanceSimulation(createRuntime(settings),[{type:'run',running:true},{type:'rhythm',rhythm}],0).state;
function peaks(samples:{time:number;ecg:number}[]) {
  return samples.filter((s,i)=>i>0&&i<samples.length-1&&s.ecg>.65&&s.ecg>samples[i-1].ecg&&s.ecg>=samples[i+1].ecg).map(s=>s.time);
}
test('72/min creates 12 separated R peaks in 10s, with constant QRS width across rates',()=>{
  const warmed=advanceSimulation(start('sinus'),[],1000).state;
  const r=peaks(advanceSimulation(warmed,[],10000).samples);
  assert.equal(r.length,12);
  for(let i=1;i<r.length;i++)assert.ok(Math.abs(r[i]-r[i-1]-60/72)<.006);
  const widths=[60,120].map(rate=>{
    const period=60/rate;
    return Array.from({length:101},(_,i)=>-.05+i*.001).filter(age=>cardiacWaveform(((age/period)%1+1)%1,period,'sinus',0,age).ecg>.5).length;
  });
  assert.ok(Math.abs(widths[0]-widths[1])<=1);
  assert.equal(cardiacWindowSeconds(220),2);
  assert.equal(cardiacWindowSeconds(550),5);
});
test('AF has irregular R intervals, absent organized P wave and deterministic samples across frame partitions',()=>{
  const one=advanceSimulation(start('af'),[],20000);
  let split=start('af');let samples:typeof one.samples=[];
  for(let i=0;i<100;i++){const result=advanceSimulation(split,[],200);split=result.state;samples.push(...result.samples);}
  assert.deepEqual(samples,one.samples);
  const r=peaks(one.samples.filter(s=>s.time>2));
  const intervals=r.slice(1).map((time,i)=>time-r[i]);
  assert.ok(Math.max(...intervals)-Math.min(...intervals)>.2);
  const period=60/72,phase=(period-.17)/period;
  assert.ok(cardiacWaveform(phase,period,'sinus',0,1).ecg>.1);
  assert.ok(Math.abs(cardiacWaveform(phase,period,'af',0,1).ecg)<.05);
  assert.equal(split.readings.heartRate,Math.round(60*(split.cardiacBeatTimes.length-1)/(split.cardiacBeatTimes.at(-1)!-split.cardiacBeatTimes[0])));
});
test('ventricular bigeminy alternates premature broad beats and compensatory pauses with matching pulse timing',()=>{
  const samples=advanceSimulation(start('pvc'),[],20000).samples;
  const r=peaks(samples.filter(s=>s.time>2));
  const intervals=r.slice(1).map((time,i)=>time-r[i]);
  assert.ok(intervals.some(t=>t<.6));assert.ok(intervals.some(t=>t>1.1));
  for(let i=1;i<intervals.length;i++)assert.ok(Math.abs(intervals[i]+intervals[i-1]-2*60/72)<.015);
  const normal=cardiacWaveform(.04,1,'sinus',0,.04).ecg;
  const ectopic=cardiacWaveform(.04,1,'pvc',1,.04).ecg;
  assert.ok(ectopic>normal+.1);
  const beat=samples.filter(s=>s.time>r[2]+.12&&s.time<r[2]+.4);
  const pulse=beat.reduce((max,s)=>s.pleth>max.pleth?s:max);
  assert.ok(pulse.time-r[2]>.15&&pulse.time-r[2]<.32);
});
test('rhythm changes are validated, apply at next beat and pause preserves cardiac state and recorded history',()=>{
  const initial=advanceSimulation(start('sinus'),[],250).state;
  const changed=advanceSimulation(initial,[{type:'rhythm',rhythm:'af'}],0).state;
  assert.equal(changed.activeRhythm,'sinus');assert.equal(changed.cardiacPhase,initial.cardiacPhase);
  assert.equal(advanceSimulation(changed,[],1000).state.activeRhythm,'af');
  const paused=advanceSimulation(changed,[{type:'run',running:false}],2000).state;
  assert.equal(paused.cardiacPhase,changed.cardiacPhase);assert.deepEqual(paused.history,changed.history);
  assert.equal(advanceSimulation(initial,[{type:'rhythm',rhythm:'invalid'} as unknown as SimulationCommand],0).events[0].type,'command-rejected');
});
