import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {calculateMedicationEffects,MEDICATIONS,MedicationDoseEvent,validMedicationEvent} from './medicationModel';
import {advanceSimulation,createRuntime} from './simulationRuntime';
import {PatientIntakeScreen} from '../components/PatientIntakeScreen';
import {MedicationDrawer} from '../components/MedicationDrawer';
import {PATIENT_CASES} from '../data/patientCases';
const settings={fio2:40,rr:12,vt:500,pinsp:20,peep:5,ieRatio:'1:2',pSupport:10};
const dose=(medication:'ephedrine'|'metoprolol',amount=MEDICATIONS[medication].bolus!.reference):MedicationDoseEvent=>({id:medication,medication,amount,administration:'bolus',unit:'mg',administeredAtSeconds:0});
test('new cardiovascular medicines enforce mg boluses and finite stepped technical bounds',()=>{
  for(const medication of ['ephedrine','metoprolol'] as const){
    const event=dose(medication),limits=MEDICATIONS[medication].bolus!;
    assert.ok(validMedicationEvent(event));
    for(const amount of [NaN,Infinity,0,-1,limits.max+limits.step,limits.min+limits.step/2])assert.equal(validMedicationEvent({...event,amount}),false);
    assert.equal(validMedicationEvent({...event,unit:'mcg'}),false);
    assert.equal(validMedicationEvent({...event,administration:'infusion',unit:'mcg/kg/min'}),false);
  }
});
test('ephedrine raises HR and BP, metoprolol lowers both, effects sum and decay without sedation or block',()=>{
  const ep=calculateMedicationEffects([dose('ephedrine')],0),met=calculateMedicationEffects([dose('metoprolol')],0);
  assert.ok(ep.heartRateChange>0&&ep.systolicPressureChange>0&&ep.diastolicPressureChange>0);
  assert.ok(met.heartRateChange<0&&met.systolicPressureChange<0&&met.diastolicPressureChange<0);
  const mixed=calculateMedicationEffects([dose('ephedrine'),dose('metoprolol')],0);
  assert.equal(mixed.heartRateChange,ep.heartRateChange+met.heartRateChange);
  assert.equal(mixed.systolicPressureChange,ep.systolicPressureChange+met.systolicPressureChange);
  for(const medication of ['ephedrine','metoprolol'] as const){
    const event=dose(medication),initial=calculateMedicationEffects([event],0),later=calculateMedicationEffects([event],MEDICATIONS[medication].bolus!.halfLifeSeconds);
    assert.equal(later.heartRateChange,initial.heartRateChange/2);
    assert.equal(initial.sedation,0);assert.equal(initial.neuromuscularBlock,0);assert.equal(initial.spontaneousDriveSuppression,0);
  }
});
test('new boluses use shared runtime history, survive pause, cannot duplicate or convert AF to sinus',()=>{
  for(const medication of ['ephedrine','metoprolol'] as const){
    let state=advanceSimulation(createRuntime(settings),[{type:'run',running:true},{type:'medication',event:dose(medication)}],1000).state;
    assert.equal(state.medications.length,1);
    assert.equal(state.readings.sedation,0);assert.equal(state.readings.block,0);
    assert.ok(medication==='ephedrine'?state.readings.heartRate>72:state.readings.heartRate<72);
    assert.ok(medication==='ephedrine'?state.readings.systolicPressure>118:state.readings.systolicPressure<118);
    const duplicate=advanceSimulation(state,[{type:'medication',event:{...dose(medication),administeredAtSeconds:1}}],0);
    assert.equal(duplicate.events[0].type,'command-rejected');assert.equal(duplicate.state.medications.length,1);
    const paused=advanceSimulation(state,[{type:'run',running:false}],600000).state;
    assert.equal(paused.timeMs,state.timeMs);assert.deepEqual(paused.readings,state.readings);
    state=advanceSimulation(state,[{type:'rhythm',rhythm:'af'}],10000).state;
    assert.equal(state.activeRhythm,'af');
  }
});
test('both medicines appear in bilingual intake and drawer with separate confirmation and model limitations',()=>{
  const state=createRuntime(settings);
  for(const language of ['cs','en'] as const){
    const intake=renderToStaticMarkup(createElement(PatientIntakeScreen,{language,setLanguage:()=>{},patientCase:PATIENT_CASES[0],onProceedToSimulation:()=>{},onBackToWelcome:()=>{},onOpenPractice:()=>{}}));
    for(const id of ['ephedrine','metoprolol'] as const){
      assert.ok(intake.includes(MEDICATIONS[id].label[language]));
      const drawer=renderToStaticMarkup(createElement(MedicationDrawer,{language,open:true,onToggle:()=>{},readState:()=>state,tick:0,send:()=>{},onAdminister:()=>{},initialSelection:{kind:'drug',id}}));
      assert.ok(drawer.includes(MEDICATIONS[id].modelNote![language]));
      assert.match(drawer,/disabled=""/);assert.match(drawer,/\(mg\)/);
    }
  }
});
