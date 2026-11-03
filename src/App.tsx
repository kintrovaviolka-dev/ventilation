import React,{useEffect,useRef,useState} from 'react';
import { CARDIAC_RHYTHMS, RHYTHM_LABELS, CardiacRhythm } from './lib/cardiacWaveform';
import { Language, AppStep, VentMode, PatientCase, PatientParams } from './types';
import { PATIENT_CASES, INTRAOPERATIVE_EVENTS } from './data/patientCases';
import { createRuntime, advanceSimulation, pendingSettings, runtimeContext, recoveryReady, SimulationCommand } from './lib/simulationRuntime';
import { useSimulationRuntime } from './hooks/useSimulationRuntime';
import { MedicationId, MedicationAdministration } from './lib/medicationModel';
import { SELECTABLE_PARAMETERS, getParamCurrentValue, isParameterEnabled, isValidParameterValue, ControlMode, ParameterSpec } from './lib/controlSystem';
import { detectAlarms, ActiveAlarm } from './lib/alarmEngine';
import { startAlarmSound,stopAlarmTones } from './lib/audioTone';
import { TRANSLATIONS } from './i18n/translations';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PatientIntakeScreen, InductionOrder } from './components/PatientIntakeScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { TopBar } from './components/TopBar';
import { AlarmBanner } from './components/AlarmBanner';
import { CrisisEnginePanel } from './components/CrisisEnginePanel';
import { VentilatorMonitor } from './components/VentilatorMonitor';
import { VitalsMonitor } from './components/VitalsMonitor';
import { PVLoopCanvas } from './components/PVLoopCanvas';
import { NumericTilesPanel } from './components/NumericTilesPanel';
import { DirectParameterControls } from './components/DirectParameterControls';
import { HardwareDial } from './components/HardwareDial';
import { MonitorCover } from './components/MonitorCover';
import { MedicationDrawer,DrawerSelection } from './components/MedicationDrawer';
import { InfusionSummary,formatSimTime } from './components/InfusionSummary';
const casePatient=(c:PatientCase):PatientParams=>({compliance:c.baselineCompliance,resistance:c.baselineResistance,spontaneousDrive:2,preset:c.preset});
const caseSettings=(c:PatientCase)=>({fio2:40,rr:12,vt:Math.max(200,Math.min(800,Math.round(c.ibwKg*7/10)*10)),pinsp:20,peep:5,ieRatio:'1:2',pSupport:10});

export function App() {
  const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem('ventilation-language-v1')==='en'?'en':'cs';}catch{return 'cs';}});
  const cs=language==='cs';
  const [inputStyle,setInputStyle]=useState<'direct'|'dial'>(()=>{try{return localStorage.getItem('ventilation-input-style-v1')==='dial'?'dial':'direct';}catch{return 'direct';}});
  useEffect(()=>{document.documentElement.lang=language;document.title=cs?'Simulátor umělé plicní ventilace':'Mechanical Ventilation Simulator';try{localStorage.setItem('ventilation-language-v1',language);}catch{}},[language]);
  useEffect(()=>{try{localStorage.setItem('ventilation-input-style-v1',inputStyle);}catch{}},[inputStyle]);
  const [appStep,setAppStep]=useState<AppStep>('welcome');
  const practiceOrigin=useRef<AppStep>('welcome');
  const [selectedCase,setSelectedCase]=useState(PATIENT_CASES[0]);
  const [initial]=useState(()=>createRuntime(caseSettings(PATIENT_CASES[0]),casePatient(PATIENT_CASES[0])));
  const runtime=useSimulationRuntime(initial,appStep==='simulation');
  const state=runtime.state,settings=state.settings,mode=state.mode,readings=state.readings;
  const context=runtimeContext(state);
  const patient={...state.patient,compliance:context.compliance,resistance:context.resistance,spontaneousDrive:context.drive};
  const [commandError,setCommandError]=useState(false);
  const send=(command:SimulationCommand)=>{const result=runtime.send(command);setCommandError(result.some(event=>event.type==='command-rejected'));};
  const [showPV,setShowPV]=useState(false),[showAnesthesia,setShowAnesthesia]=useState(true);
  const [vitalsCovered,setVitalsCovered]=useState(false),[ventilatorCovered,setVentilatorCovered]=useState(false);
  const [alarmTest,setAlarmTest]=useState(false),[silencedUntil,setSilencedUntil]=useState(0);
  const silenceSeconds=Math.max(0,Math.ceil(silencedUntil-state.timeMs/1000));
  const silenced=silenceSeconds>0;
  const [drawerOpen,setDrawerOpen]=useState(false),[drawerTab,setDrawerTab]=useState<'drugs'|'fluids'>('drugs');
  const [drawerSelection,setDrawerSelection]=useState<DrawerSelection>(null);
  const openDrawer=(tab:'drugs'|'fluids'='drugs',selection:DrawerSelection=null)=>{setDrawerTab(tab);setDrawerSelection(selection);setDrawerOpen(true);};
  const [controlMode,setControlMode]=useState<ControlMode>('NAVIGATING');
  const [paramIndex,setParamIndex]=useState(0),[stagedValue,setStagedValue]=useState<number|string>(40);
  const [deadline,setDeadline]=useState(0),[timeoutSec,setTimeoutSec]=useState(7),[timeoutWarning,setTimeoutWarning]=useState(false);
  const dialRef=useRef<HTMLDivElement>(null);
  const activeParam=SELECTABLE_PARAMETERS[paramIndex];
  const liveValue=getParamCurrentValue(activeParam.id,settings,mode,patient);
  useEffect(()=>{if(controlMode==='NAVIGATING')setStagedValue(liveValue);},[controlMode,liveValue,activeParam.id]);
  useEffect(()=>{
    if(controlMode!=='EDITING')return;
    const update=()=>{const left=Math.ceil((deadline-performance.now())/1000);setTimeoutSec(Math.max(0,left));if(left<=0){setControlMode('NAVIGATING');setTimeoutWarning(true);}};
    update();const timer=setInterval(update,100);return()=>clearInterval(timer);
  },[controlMode,deadline]);
  const commit=(id:string,value:number|string)=>{
    const param=SELECTABLE_PARAMETERS.find(p=>p.id===id);
    if(!param||!isParameterEnabled(id,mode)||!isValidParameterValue(param,value))return;
    send(id==='mode'?{type:'configure',mode:value as VentMode}:{type:'configure',settings:{[id]:value}});
  };
  const selectParam=(param:ParameterSpec)=>{
    if(!isParameterEnabled(param.id,mode))return;
    setParamIndex(SELECTABLE_PARAMETERS.indexOf(param));setStagedValue(getParamCurrentValue(param.id,settings,mode,patient));
    setControlMode('EDITING');setDeadline(performance.now()+7000);setTimeoutWarning(false);dialRef.current?.scrollIntoView({block:'nearest'});
  };
  const turn=(direction:-1|1)=>{
    setDeadline(performance.now()+7000);
    if(controlMode==='NAVIGATING')setParamIndex(previous=>{let index=previous;do{index=(index+direction+SELECTABLE_PARAMETERS.length)%SELECTABLE_PARAMETERS.length;}while(!isParameterEnabled(SELECTABLE_PARAMETERS[index].id,mode));return index;});
    else if(activeParam.options){const options=activeParam.options;setStagedValue(options[(options.indexOf(String(stagedValue))+direction+options.length)%options.length]);}
    else setStagedValue(Number(Math.max(activeParam.min!,Math.min(activeParam.max!,Number(stagedValue)+direction*activeParam.step!)).toFixed(3)));
  };
  const push=()=>{if(controlMode==='EDITING'){commit(activeParam.id,stagedValue);setControlMode('NAVIGATING');}else selectParam(activeParam);};
  const alarms:ActiveAlarm[]=detectAlarms(readings,language);
  if(readings.apnea)alarms.unshift({id:'apnea',level:'critical',message:cs?'APNOE — chybí spontánní dechy':'APNEA — no spontaneous breaths',code:readings.backup?(cs?'ZÁLOŽNÍ PC AKTIVNÍ':'BACKUP PC ACTIVE'):(cs?'ZÁLOHA VYPNUTA':'BACKUP DISABLED')});
  if(!readings.circuitConnected)alarms.unshift({id:'disconnect',level:'critical',message:cs?'ODPOJENÝ OKRUH':'CIRCUIT DISCONNECTED',code:'Paw / VTe / CO₂ = 0'});
  if(context.crisis.specialAlarm)alarms.unshift({id:context.crisis.specialAlarm,level:context.crisis.specialAlarm==='tension-pneumothorax'?'critical':'warning',message:cs?'ALARM ŘÍZENÉHO SCÉNÁŘE':'GUIDED SCENARIO ALARM',code:context.crisis.specialAlarm});
  if(alarmTest)alarms.unshift({id:'test',level:'critical',message:cs?'TEST ALARMU':'ALARM TEST',code:'TEST'});
  const alarmLevel=alarms.some(alarm=>alarm.level==='critical')?'critical':alarms.length?'warning':'none';
  useEffect(()=>{if(appStep!=='simulation'||silenced||alarmLevel==='none'||!state.running){stopAlarmTones();return;}startAlarmSound(alarmLevel);return stopAlarmTones;},[alarmLevel,silenced,appStep,state.running]);
  const openPractice=()=>{practiceOrigin.current=appStep;setControlMode('NAVIGATING');setDrawerOpen(false);setAppStep('practice');};
  const start=(orders:InductionOrder[],mac:number)=>{
    let next=createRuntime(caseSettings(selectedCase),casePatient(selectedCase));
    const commands:SimulationCommand[]=[{type:'vaporizer',mac},...orders.map(order=>({type:'medication' as const,event:{id:crypto.randomUUID(),...order,administration:'bolus' as const,administeredAtSeconds:0}}))];
    next=advanceSimulation(next,commands,0).state;runtime.reset(next);setSilencedUntil(0);setCommandError(false);setAppStep('simulation');
  };
  const administer=(medication:MedicationId,administration:MedicationAdministration,amount:number,unit:string)=>{
    const events=runtime.send(current=>({type:'medication',event:{id:crypto.randomUUID(),medication,administration,amount,unit,administeredAtSeconds:current.timeMs/1000}}));
    setCommandError(events.some(event=>event.type==='command-rejected'));
  };
  if(appStep==='practice')return <PracticeScreen language={language} setLanguage={setLanguage} onBack={()=>setAppStep(practiceOrigin.current)}/>;
  if(appStep==='welcome')return <WelcomeScreen language={language} setLanguage={setLanguage} selectedCase={selectedCase} onSelectCase={setSelectedCase} onStartCase={()=>setAppStep('intake')} onOpenPractice={openPractice}/>;
  if(appStep==='intake')return <PatientIntakeScreen language={language} setLanguage={setLanguage} patientCase={selectedCase} onProceedToSimulation={start} onBackToWelcome={()=>setAppStep('welcome')} onOpenPractice={openPractice}/>;
  return <div className="simulation-app font-mono">
    <TopBar language={language} setLanguage={setLanguage} mode={state.activeMode} settings={state.activeSettings} patient={patient} alarmActive={alarmTest} setAlarmActive={setAlarmTest} onOpenPractice={openPractice}/>
    <div className="session-toolbar"><button onClick={()=>{setControlMode('NAVIGATING');setAppStep('intake');}}>{cs?'Nový úvod':'New induction'} · {cs?selectedCase.name.replace('yrs','let'):selectedCase.name}</button><span>{cs?'Čas simulace':'Simulation time'} {formatSimTime(state.timeMs/1000)}</span><strong>{state.activeMode.toUpperCase()}{readings.backup?' → BACKUP PC':''}</strong></div>
    {runtime.hiddenPauseNotice&&<div className="runtime-notice" role="status">{cs?'Při skrytí záložky byla celá simulace pozastavena. Pokračuje od stejného času.':'The entire simulation was paused while the tab was hidden. Resuming from the same simulation time.'}<button onClick={runtime.dismissHiddenPause}>OK</button></div>}
    {commandError&&<div role="alert" className="runtime-notice">{cs?'Změna nebyla přijata. Zkontrolujte rozsah, Ti min ≤ Ti max a aktuální stav.':'Change rejected. Check bounds, Ti min ≤ Ti max, and the current state.'}<button onClick={()=>setCommandError(false)}>OK</button></div>}
    <details className="mechanics-demo"><summary>{cs?'Demonstrace mechaniky (mimo řízené scénáře)':'Mechanics demonstration (outside guided scenarios)'}</summary><p>{cs?'Izolované změny mechaniky; nejde o léčebné pokyny. Při řízeném scénáři jsou zakázány.':'Isolated mechanical changes; not treatment instructions. Disabled during a guided scenario.'}</p><div>{INTRAOPERATIVE_EVENTS.map(event=><button key={event.id} disabled={state.crisis.status!=='idle'} aria-pressed={state.demonstration===event.id} onClick={()=>send({type:'demonstration',id:event.id})}>{event.title[language]}</button>)}</div></details>
    <CrisisEnginePanel language={language} crisis={state.crisis} nowSeconds={state.timeMs/1000} recoveryReady={recoveryReady(state)}
      onStart={scenario=>send({type:'crisis-start',scenario})} onBeginRecovery={()=>send({type:'crisis-recover'})}
      onRecordVolumeSupport={()=>openDrawer('fluids')} onReconnectCircuit={()=>send({type:'crisis-intervention',intervention:'reconnect-circuit'})}
      onDecompressPneumothorax={()=>send({type:'crisis-intervention',intervention:'decompress-pneumothorax'})}
      onRepositionTube={()=>send({type:'crisis-intervention',intervention:'reposition-tube'})}
      onAcknowledgeSurgeonRequest={()=>send({type:'crisis-intervention',intervention:'acknowledge-surgeon-request'})}
      onReset={()=>send({type:'crisis-reset'})}/>
    <AlarmBanner language={language} alarms={alarms} isSilenced={silenced} silenceSeconds={silenceSeconds} onSilenceToggle={()=>setSilencedUntil(silenced?0:state.timeMs/1000+120)}/>
    <main className="simulation-main p-2 sm:p-4 max-w-[1920px] w-full mx-auto">
      <div className="session-toolbar"><span>{cs?'Panely:':'Panels:'}</span><button aria-pressed={showPV} onClick={()=>setShowPV(value=>!value)}>P-V</button><button aria-pressed={showAnesthesia} onClick={()=>setShowAnesthesia(value=>!value)}>{cs?'Anestezie':'Anesthesia'}</button></div>
      <details className="rhythm-demo">
        <summary>{cs?'Demonstrace srdečního rytmu':'Cardiac rhythm demonstration'} · {RHYTHM_LABELS[language][state.activeRhythm]}</summary>
        <label>{cs?'Rytmus EKG':'ECG rhythm'}<select value={state.rhythm} onChange={event=>send({type:'rhythm',rhythm:event.target.value as CardiacRhythm})}>
          {CARDIAC_RHYTHMS.map(rhythm=><option key={rhythm} value={rhythm}>{RHYTHM_LABELS[language][rhythm]}</option>)}
        </select></label>
        <p>{cs?'Změna od dalšího tepu. Výuková ukázka EKG a pulzní křivky; samostatně nemění krevní tlak a nesimuluje léčbu arytmií.':'Changes at the next beat. ECG and pulse waveform demonstration; it does not independently alter blood pressure or simulate arrhythmia treatment.'}</p>
        {state.rhythm!==state.activeRhythm&&<span role="status">{cs?'Čeká na další tep':'Pending next beat'}</span>}
      </details>
      <section className="monitor-grid">
        <article className="monitor-shell"><div className="monitor-heading"><h2>{cs?'MONITOR VITÁLNÍCH FUNKCÍ':'PATIENT VITALS MONITOR'}</h2><button className="monitor-cover-toggle" aria-pressed={vitalsCovered} onClick={()=>setVitalsCovered(value=>!value)}>{vitalsCovered?(cs?'ODKRÝT':'REVEAL'):(cs?'ZAKRÝT':'COVER')}</button></div><div className="monitor-display"><VitalsMonitor readState={runtime.readState} tick={state.timeMs} language={language}/><MonitorCover covered={vitalsCovered} onToggle={()=>setVitalsCovered(false)} language={language}/></div></article>
        <article className="monitor-shell"><div className="monitor-heading"><h2>{cs?'MONITOR VENTILÁTORU':'VENTILATOR MONITOR'}</h2><button className="monitor-cover-toggle" aria-pressed={ventilatorCovered} onClick={()=>setVentilatorCovered(value=>!value)}>{ventilatorCovered?(cs?'ODKRÝT':'REVEAL'):(cs?'ZAKRÝT':'COVER')}</button></div>
          <div className="monitor-display"><VentilatorMonitor readState={runtime.readState} tick={state.timeMs} language={language}/>
          <MonitorCover covered={ventilatorCovered} onToggle={()=>setVentilatorCovered(false)} language={language}/></div>
        </article>
      </section>
      <details className="model-detail"><summary>{cs?'Podrobnosti modelu a mechaniky':'Model and mechanics details'}</summary>
        <NumericTilesPanel physiology={readings} settings={state.activeSettings} patient={patient} mode={state.activeMode} language={language} controlMode={controlMode} activeParam={activeParam} stagedValue={stagedValue} onSelectParam={selectParam} display="readouts"/>
      </details>
      <div className="input-style-switch" role="group" aria-label={cs?'Způsob ovládání':'Input style'}><span>{cs?'Ovládání:':'Controls:'}</span>{(['direct','dial'] as const).map(style=><button key={style} aria-pressed={inputStyle===style} onClick={()=>{setInputStyle(style);setControlMode('NAVIGATING');}}>{style==='direct'?(cs?'Číselné zadávání':'Numeric inputs'):(cs?'Otočný ovladač':'Rotary dial')}</button>)}</div>
      {pendingSettings(state)&&<div className="pending-settings" role="status"><strong>{cs?'Čeká na další nádech:':'Pending next inspiration:'}</strong>{mode!==state.activeMode&&<span>{state.activeMode.toUpperCase()} → {mode.toUpperCase()}</span>}{SELECTABLE_PARAMETERS.filter(param=>param.id!=='mode'&&settings[param.id]!==state.activeSettings[param.id]).map(param=><span key={param.id}>{param.shortLabel}: {state.activeSettings[param.id]} → {settings[param.id]} {param.unit}</span>)}</div>}
      <section className="dashboard-panels">
        <div className="numeric-panel">{inputStyle==='direct'?<DirectParameterControls settings={settings} mode={mode} patient={patient} language={language} onCommit={commit}/>:<NumericTilesPanel physiology={readings} settings={settings} patient={patient} mode={mode} language={language} controlMode={controlMode} activeParam={activeParam} stagedValue={stagedValue} onSelectParam={selectParam} display="controls"/>}</div>
        {inputStyle==='dial'&&<div className="dial-panel" ref={dialRef}><HardwareDial language={language} controlMode={controlMode} activeParam={activeParam} stagedValue={stagedValue} liveValue={liveValue} timeoutSec={timeoutSec} timeoutWarning={timeoutWarning} onTurn={turn} onPush={push} onCancel={()=>setControlMode('NAVIGATING')}/></div>}
        {showAnesthesia&&<section className="anesthesia-panel"><h2>{cs?'Anestezie · společné účinky':'Anesthesia · shared effects'}</h2><label>Sevofluran (MAC)<input type="number" min="0" max="3" step="0.1" value={state.volatileMac} onChange={event=>{if(event.target.value!=='')send({type:'vaporizer',mac:Number(event.target.value)});}}/></label><p>{cs?'Sedace':'Sedation'}: {Math.round(readings.sedation*100)} % · {cs?'Svalový blok':'Muscle block'}: {Math.round(readings.block*100)} %</p><p>TOF ({cs?'výukový odhad':'teaching estimate'}): {readings.tof}/4 · Drive: {readings.drive.toFixed(2)} cmH₂O</p><p>{cs?'Svalová relaxace nezajišťuje bezvědomí. Všechny bolusy jsou v jedné historii.':'Muscle relaxation does not ensure unconsciousness. All boluses share one history.'}</p><div><button onClick={()=>openDrawer('drugs',{kind:'drug',id:'propofol'})}>Propofol…</button><button onClick={()=>openDrawer('drugs',{kind:'drug',id:'rocuronium'})}>{cs?'Rokuronium…':'Rocuronium…'}</button></div></section>}
        {showPV&&<div className="pv-panel"><PVLoopCanvas readState={runtime.readState} tick={state.timeMs} language={language}/></div>}
      </section>
      <MedicationDrawer language={language} open={drawerOpen} onToggle={()=>setDrawerOpen(value=>!value)} readState={runtime.readState} tick={state.timeMs} send={send} onAdminister={administer} initialTab={drawerTab} initialSelection={drawerSelection}/>
      <InfusionSummary readState={runtime.readState} tick={state.timeMs} language={language} send={send}/>
    </main>
    <footer className="simulation-footer">{TRANSLATIONS[language].disclaimer}</footer>
  </div>;
}
export default App;
