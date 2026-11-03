import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { advanceSimulation,createRuntime } from './simulationRuntime';
import { detectAlarms } from './alarmEngine';
import { co2Kpa,monitorNumber } from './monitorUnits';
import { VentilatorMonitor } from '../components/VentilatorMonitor';
import { VitalsMonitor } from '../components/VitalsMonitor';
import { AlarmBanner } from '../components/AlarmBanner';
const settings={fio2:40,rr:12,vt:500,pinsp:20,peep:5,ieRatio:'1:2',pSupport:10,driveAmplitude:0};
const start=()=>advanceSimulation(createRuntime(settings),[{type:'run',running:true}],0).state;

test('RR 12 to 6 raises low minute ventilation after the first complete slow breath, without a minute of dilution',()=>{
  let state=advanceSimulation(start(),[],60000).state;
  state=advanceSimulation(state,[{type:'configure',settings:{rr:6}}],10005).state;
  assert.equal(state.readings.rrTotal,6);
  assert.ok(state.readings.mVe!<3.5);
  const alarms=detectAlarms(state.readings,'cs');
  assert.ok(alarms.some(alarm=>alarm.id==='lowMV_critical'));
  assert.ok(alarms.some(alarm=>alarm.id==='lowRR_warning'));
  state=advanceSimulation(state,[],10000).state;
  const co2=detectAlarms(state.readings,'cs').find(alarm=>alarm.id==='etco2High_critical');
  assert.ok(co2);assert.match(co2.code,/kPa/);assert.doesNotMatch(co2.code,/mmHg/);
});

test('end tidal number is held across the cycle and equals the recorded peak of the preceding expiration',()=>{
  const result=advanceSimulation(start(),[],5500);
  const state=result.state;
  const first=result.samples.filter(sample=>sample.breathId===1);
  assert.equal(state.readings.etCO2,Math.max(...first.map(sample=>sample.co2)));
  const later=advanceSimulation(state,[],4000).state;
  assert.equal(later.readings.etCO2,state.readings.etCO2);
  assert.equal(later.readings.pPeak,state.readings.pPeak);
  assert.equal(later.readings.mVe,state.readings.mVe);
  assert.notEqual(later.latest!.co2,state.latest!.co2);
});

test('CO2 converts to kPa once, missing first-breath data does not create a false low CO2 alarm',()=>{
  assert.equal(monitorNumber(co2Kpa(38),'cs',1),'5,1');
  assert.equal(monitorNumber(co2Kpa(38),'en',1),'5.1');
  assert.equal(co2Kpa(null),null);
  assert.equal(monitorNumber(null,'cs',1),'—');
  assert.equal(start().readings.etCO2,null);
  assert.equal(detectAlarms(start().readings,'cs').length,0);
});

test('OR monitor has exactly pressure, flow and CO2 rows, pulse oximeter waveform and no model-only telemetry',()=>{
  const state=advanceSimulation(start(),[],6000).state;
  const props={readState:()=>state,tick:state.timeMs,language:'cs' as const};
  const vent=renderToStaticMarkup(createElement(VentilatorMonitor,props));
  assert.equal((vent.match(/or-trace-row /g)??[]).length,3);
  assert.match(vent,/channel-pressure/);assert.match(vent,/channel-flow/);assert.match(vent,/channel-co2/);
  assert.match(vent,/kPa/);assert.match(vent,/5,1/);
  assert.doesNotMatch(vent,/mmHg|Pplat|Auto-PEEP|Zadržený|rovnováhou/);
  const vitals=renderToStaticMarkup(createElement(VitalsMonitor,props));
  assert.match(vitals,/SpO₂ · křivka pulzního oxymetru/);
  assert.doesNotMatch(vitals,/PLETH|TEPLOTA|REFERENCE/);
});

test('all active alarms remain visible with critical messages first even while audio is silenced',()=>{
  const alarms=detectAlarms({...start().readings,mVe:4,rrTotal:6,etCO2:65},'cs');
  const html=renderToStaticMarkup(createElement(AlarmBanner,{alarms,language:'cs',isSilenced:true,silenceSeconds:119,onSilenceToggle:()=>{}}));
  assert.ok(html.indexOf('VYSOKÝ EtCO₂')<html.indexOf('NÍZKÁ MINUTOVÁ'));
  assert.match(html,/NÍZKÁ DECHOVÁ FREKVENCE/);
  assert.match(html,/Ztišeno · 119 s/);
  assert.doesNotMatch(html,/DALŠÍ|MORE/);
});


test('ventilation alarms clear again after measured ventilation recovers',()=>{
  let state=advanceSimulation(start(),[{type:'configure',settings:{rr:6}}],30005).state;
  assert.ok(detectAlarms(state.readings,'en').some(a=>a.id==='lowMV_critical'));
  state=advanceSimulation(state,[{type:'configure',settings:{rr:12}}],30000).state;
  assert.equal(state.readings.rrTotal,12);
  assert.equal(detectAlarms(state.readings,'en').length,0);
});
