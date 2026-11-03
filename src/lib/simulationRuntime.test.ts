import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSimulation, createRuntime, RuntimeState } from './simulationRuntime';
import { DEFAULT_PATIENT_PARAMS } from './simulationState';
import { changeFluid, fluidDeliveredSince, fluidProgress, FluidInfusion } from './fluidModel';
const settings = { fio2:40, rr:12, vt:500, pinsp:20, peep:5, ieRatio:'1:2', pSupport:10, driveAmplitude:0 };
const running = (overrides = {}, mode: 'vc'|'pc'|'ps'|'simv' = 'vc') => advanceSimulation(createRuntime({ ...settings, ...overrides }, DEFAULT_PATIENT_PARAMS, mode), [{ type:'run', running:true }], 0).state;
const advance = (state: RuntimeState, ms: number) => advanceSimulation(state, [], ms).state;

test('fixed-step simulation is independent of frame partitions and pauses without accruing time', () => {
  const start = running();
  const one = advance(start, 12345);
  let split = start;
  for (let i=0;i<12345;i+=17) split = advance(split, Math.min(17, 12345-i));
  assert.deepEqual(split.readings, one.readings);
  assert.equal(split.volumeL, one.volumeL);
  assert.equal(split.cardiacPhase, one.cardiacPhase);
  assert.equal(start.timeMs, 0);
  assert.equal(start.volumeL, .25);
  const paused = advanceSimulation(split, [{ type:'run',running:false }], 90000).state;
  assert.equal(paused.timeMs, split.timeMs);
});

test('flow integral equals volume change and obstruction retains end-expiratory volume', () => {
  let initial = running({ rr:40, vt:800, ieRatio:'1:4' });
  initial.patient = { ...DEFAULT_PATIENT_PARAMS, compliance:62, resistance:30 };
  const { state, samples } = advanceSimulation(initial, [], 15000);
  const integral = samples.reduce((sum,sample) => sum + sample.flow / 60 * .005, 0);
  assert.ok(Math.abs(integral - (state.volumeL - initial.volumeL)) < 1e-10);
  assert.ok(state.readings.intrinsicPeep! > 1);
  assert.ok(state.readings.trappedVolume! > 100);
  assert.ok(state.completed.every(breath => breath.pPeak >= (breath.pPlat ?? 0)));
  for(let i=1;i<samples.length;i++) assert.ok(Math.abs(samples[i].lungVolume-samples[i-1].lungVolume)<20);
});

test('new settings wait for the next breath and do not reset lung volume', () => {
  let state=advance(running(),500);
  const before=state.volumeL;
  state=advanceSimulation(state,[{type:'configure',settings:{vt:700,peep:8}}],0).state;
  assert.equal(state.settings.vt,700); assert.equal(state.activeSettings.vt,500); assert.equal(state.volumeL,before);
  state=advance(state,5000);
  assert.equal(state.activeSettings.vt,700); assert.equal(state.activeSettings.peep,8);
});

test('PSV has no invented breaths without effort; apnea backup is optional and visible', () => {
  const noBackup=advance(running({backupEnabled:0},'ps'),15000);
  assert.equal(noBackup.breath.id,0); assert.equal(noBackup.readings.apnea,true); assert.equal(noBackup.readings.backup,false);
  const backup=advance(running({},'ps'),16000);
  assert.equal(backup.readings.backup,true); assert.ok(backup.completed.some(b=>b.kind==='backup'));
  const effort=advance(running({driveAmplitude:5},'ps'),20000);
  assert.ok(effort.completed.length>=2); assert.ok(effort.completed.every(b=>b.kind==='supported'));
  assert.equal(effort.readings.backup,false); assert.equal(effort.readings.pPlat,null);
});

test('SIMV delivers mandatory and supported breaths without simultaneous inspirations', () => {
  const state=advance(running({rr:6,driveAmplitude:6,spontaneousRate:20},'simv'),30000);
  assert.ok(state.completed.some(b=>b.kind==='mandatory'));
  assert.ok(state.completed.some(b=>b.kind==='supported'));
  for(let i=1;i<state.completed.length;i++) assert.ok(state.completed[i].start>=state.completed[i-1].end);
});

test('disconnect drains physical lung volume without displaying circuit flow and reconnects immediately', () => {
  let state=advance(running(),6000);
  state=advanceSimulation(state,[{type:'crisis-start',scenario:'ventilator-disconnect'}],5).state;
  assert.equal(state.readings.circuitConnected,false); assert.equal(state.latest!.flow,0); assert.equal(state.latest!.pressure,0);
  const disconnectedVolume=state.volumeL;
  state=advance(state,1000); assert.ok(state.volumeL<disconnectedVolume);
  state=advanceSimulation(state,[{type:'crisis-intervention',intervention:'reconnect-circuit'}],5).state;
  assert.equal(state.readings.circuitConnected,true);
});

test('drug commands validate units, time and ids; muscle block is not sedation', () => {
  const state=running();
  const event={id:'one',medication:'rocuronium' as const,administration:'bolus' as const,amount:40,unit:'mg',administeredAtSeconds:0};
  const first=advanceSimulation(state,[{type:'medication',event}],0).state;
  const result=advanceSimulation(first,[{type:'medication',event},{type:'medication',event:{...event,id:'bad',unit:'mcg'}}],5);
  assert.equal(result.state.medications.length,1); assert.equal(result.events.filter(e=>e.type==='command-rejected').length,2);
  assert.equal(result.state.readings.sedation,0); assert.ok(result.state.readings.block>.5);
});

test('fluid volumes integrate rate segments, pause/resume, target completion and stop', () => {
  const initial:FluidInfusion={id:'bag',fluid:'saline',bagMl:500,targetMl:100,startedAtSeconds:0,segments:[{atSeconds:0,rateMlHour:120}]};
  assert.equal(fluidProgress(initial,1800).deliveredMl,60);
  let bag=changeFluid(initial,1800,'pause');
  assert.equal(fluidProgress(bag,3600).deliveredMl,60);
  bag=changeFluid(bag,3500,'rate',240);
  assert.equal(fluidProgress(bag,3600).deliveredMl,60);
  assert.equal(fluidProgress(bag,3600).status,'paused');
  bag=changeFluid(bag,3600,'resume');
  assert.equal(fluidProgress(bag,3900).deliveredMl,80);
  bag=changeFluid(bag,3900,'stop');
  assert.equal(fluidProgress(bag,10000).deliveredMl,80);
  assert.equal(changeFluid(bag,10000,'resume'),bag);
  assert.equal(fluidProgress(initial,6000).deliveredMl,100);
  assert.equal(fluidProgress(initial,6000).status,'completed');
  assert.equal(fluidDeliveredSince([initial],900,1800),30);
});

test('hemorrhage requires actual post-onset fluid; manual completion does not normalize or stop the pump', () => {
  let state=advanceSimulation(running(),[{type:'crisis-start',scenario:'hemorrhage'}],5).state;
  const invalid=advanceSimulation(state,[{type:'crisis-recover'},{type:'crisis-intervention',intervention:'volume-support'}],0);
  assert.equal(invalid.events.length,2); assert.equal(invalid.state.crisis.status,'active');
  const before=state.readings.systolicPressure;
  state=advanceSimulation(state,[{type:'fluid-start',id:'saline',fluid:'saline',bagMl:1000,targetMl:1000,rateMlHour:6000}],60000).state;
  assert.ok(state.readings.systolicPressure>before);
  const pressure=state.readings.systolicPressure;
  state=advanceSimulation(state,[{type:'crisis-recover'}],5).state;
  assert.equal(state.crisis.status,'recovered'); assert.ok(Math.abs(state.readings.systolicPressure-pressure)<=1);
  assert.equal(fluidProgress(state.fluids[0],state.timeMs/1000).status,'running');
});

test('patient effort restarts PSV without backup and disabling backup stops subsequent mandatory breaths', () => {
  let state=advance(running({backupEnabled:0,driveAmplitude:0,spontaneousRate:0},'ps'),12000);
  state=advanceSimulation(state,[{type:'configure',settings:{driveAmplitude:5,spontaneousRate:12}}],5000).state;
  assert.ok(state.breath.id>0); assert.equal(state.breath.kind,'supported');
  state=advance(running({},'ps'),12000);
  const id=state.breath.id;
  state=advanceSimulation(state,[{type:'configure',settings:{backupEnabled:0}}],15000).state;
  assert.equal(state.breath.id,id); assert.equal(state.backupActive,false);
});

test('PSV trigger and cycle-off controls influence actual breaths within Ti bounds', () => {
  const high=advance(running({driveAmplitude:.5,flowTrigger:10,backupEnabled:0},'ps'),10000);
  const low=advance(running({driveAmplitude:.5,flowTrigger:.5,backupEnabled:0},'ps'),10000);
  assert.equal(high.breath.id,0); assert.ok(low.breath.id>0);
  const duration=(cycleOff:number)=>{
    const result=advanceSimulation(running({driveAmplitude:5,cycleOff,minTi:.3,maxTi:2},'ps'),[],10000);
    const first=result.samples.find(s=>s.breathId===1)!;
    const end=result.samples.find(s=>s.breathId===1&&s.phase==='exp')!;
    return end.time-first.time;
  };
  assert.ok(duration(70)<duration(5));
  assert.ok(duration(70)>=.3); assert.ok(duration(5)<=2.005);
});

test('same absolute induction and drawer events have identical effects and keep waveform history immutable', () => {
  const event={id:'propofol',medication:'propofol' as const,administration:'bolus' as const,amount:100,unit:'mg',administeredAtSeconds:0};
  const intake=advanceSimulation(createRuntime(settings),[{type:'medication',event},{type:'run',running:true}],10500).state;
  const drawer=advanceSimulation(running(),[{type:'medication',event}],10500).state;
  assert.deepEqual(intake.readings,drawer.readings);
  const oldLoop=JSON.stringify(drawer.previousLoop), oldHistory=JSON.stringify(drawer.history);
  const later=advanceSimulation(drawer,[{type:'configure',settings:{peep:10}}],500).state;
  assert.equal(JSON.stringify(drawer.history),oldHistory);
  assert.equal(JSON.stringify(later.previousLoop),oldLoop);
  const phase=(drawer.cardiacPhase+drawer.readings.heartRate/60*.005)%1;
  const next=advance(drawer,5);
  assert.ok(Math.abs(next.cardiacPhase-phase)<.0001);
});

test('runtime rejects invalid scenario and conflicting mechanics demonstration commands', () => {
  const invalid=advanceSimulation(running(),[{type:'crisis-start',scenario:'invalid' as never}],5);
  assert.equal(invalid.events[0].type,'command-rejected');
  const crisis=advanceSimulation(invalid.state,[{type:'crisis-start',scenario:'hemorrhage'}],5).state;
  const conflict=advanceSimulation(crisis,[{type:'demonstration',id:'event_disconnect'},{type:'crisis-recover'},{type:'crisis-intervention',intervention:'invalid' as never}],0);
  assert.equal(conflict.events.length,3); assert.equal(conflict.state.demonstration,'event_baseline');
});


test('the same mechanical equation holds during inspiration and expiration with effort', () => {
  for(const mode of ['vc','pc','ps','simv'] as const) {
    const result=advanceSimulation(running({driveAmplitude:5},mode),[],12000);
    for(const sample of result.samples) {
      assert.ok(Math.abs(sample.pressure-(sample.elasticPressure+DEFAULT_PATIENT_PARAMS.resistance*sample.flow/60-sample.musclePressure))<1e-9);
      assert.ok(Math.abs(sample.alveolarPressure-(sample.elasticPressure-sample.musclePressure))<1e-9);
    }
  }
});


test('completed-interval minute volume does not create false startup alarms between breaths', () => {
  const state=advance(running(),5500);
  const next=advance(state,4000);
  assert.equal(state.readings.rrTotal,12); assert.equal(next.readings.rrTotal,12);
  assert.ok(Math.abs(state.readings.mVe!-next.readings.mVe!)<.001);
});
