import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { FluidInfusion, FLUIDS, fluidProgress } from '../lib/fluidModel';
import { MEDICATIONS } from '../lib/medicationModel';
import { RuntimeState, SimulationCommand } from '../lib/simulationRuntime';
export const formatSimTime=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const displayMl=(ml:number)=>ml>0&&ml<.1?'<0.1':ml.toFixed(1);
const statusLabels={cs:{running:'Běží',paused:'Pozastaveno',stopped:'Ukončeno',completed:'Dokončeno'},en:{running:'Running',paused:'Paused',stopped:'Stopped',completed:'Completed'}};
const FluidRow:React.FC<{infusion:FluidInfusion;now:number;language:Language;send:(command:SimulationCommand)=>void}>=({infusion,now,language,send})=>{
  const progress=fluidProgress(infusion,now),cs=language==='cs';
  const programmedRate=[...infusion.segments].reverse().map(segment=>segment.programmedRateMlHour??segment.rateMlHour).find(value=>value>0)??120;
  const [rate,setRate]=useState(String(programmedRate));
  useEffect(()=>setRate(String(programmedRate)),[programmedRate]);
  const terminal=progress.status==='completed'||progress.status==='stopped';
  const valid=rate.trim()!==''&&Number.isInteger(Number(rate))&&Number(rate)>=1&&Number(rate)<=6000;
  return <article className="pump-row">
    <div className="pump-row-heading"><strong>{FLUIDS[infusion.fluid][language]}</strong><span className={`pump-state ${progress.status}`}>{statusLabels[language][progress.status]}</span></div>
    <p><b>{displayMl(progress.deliveredMl)} / {infusion.targetMl} mL</b> · {cs?'Zbývá':'Remaining'} {progress.remainingMl.toFixed(1)} mL · {progress.rateMlHour} mL/h</p>
    {progress.status==='paused'&&<p>{cs?'Po obnovení':'On resume'}: {programmedRate} mL/h</p>}
    <progress max={infusion.targetMl} value={progress.deliveredMl} aria-label={cs?'Podaný objem':'Delivered volume'}/>
    {!terminal&&<div className="pump-actions">
      <button type="button" onClick={()=>send({type:'fluid-change',id:infusion.id,action:progress.status==='paused'?'resume':'pause'})}>{progress.status==='paused'?(cs?'Obnovit':'Resume'):(cs?'Pozastavit':'Pause')}</button>
      <button type="button" onClick={()=>send({type:'fluid-change',id:infusion.id,action:'stop'})}>{cs?'Ukončit infuzi':'Stop infusion'}</button>
      <form onSubmit={event=>{event.preventDefault();if(valid)send({type:'fluid-change',id:infusion.id,action:'rate',rateMlHour:Number(rate)});}}>
        <label>{cs?'Nová rychlost (mL/h)':'New rate (mL/h)'}<input type="number" min="1" max="6000" step="1" value={rate} onChange={event=>setRate(event.target.value)}/></label>
        <button disabled={!valid}>{cs?'Použít rychlost':'Apply rate'}</button>
      </form>
    </div>}
  </article>;
};
export function InfusionSummary({readState,tick,language,send}:{readState:()=>RuntimeState;tick:number;language:Language;send:(command:SimulationCommand)=>void}) {
  const state=readState();
  const now=state.timeMs/1000,cs=language==='cs';
  const activeDrugs=state.medications.filter(event=>event.administration==='infusion'&&event.stoppedAtSeconds===undefined);
  const total=state.fluids.reduce((sum,fluid)=>sum+fluidProgress(fluid,now).deliveredMl,0);
  return <section className="infusion-summary" aria-label={cs?'Přehled infuzí':'Infusion overview'}>
    <h3>{cs?'Infuze a podané tekutiny':'Infusions and delivered fluids'}</h3>
    <p>{cs?'Celkem podáno':'Total delivered'}: <strong>{displayMl(total)} mL</strong> <small>{cs?'(nejde o čistou bilanci)':'(not net fluid balance)'}</small></p>
    {state.fluids.length===0&&activeDrugs.length===0&&<p>{cs?'Žádná infuze. Spusťte ji v šuplíku Léky / Tekutiny.':'No infusions. Start one in the Drugs / Fluids drawer.'}</p>}
    {state.fluids.map(infusion=><FluidRow key={infusion.id} infusion={infusion} now={now} language={language} send={send}/>)}
    {activeDrugs.map(event=><article className="pump-row" key={event.id}><strong>{MEDICATIONS[event.medication].label[language]}</strong><p>{event.amount} {event.unit} · {cs?'Běží od':'Running since'} {formatSimTime(event.administeredAtSeconds)}</p><button type="button" onClick={()=>send({type:'medication-stop',id:event.id})}>{cs?'Ukončit infuzi':'Stop infusion'}</button></article>)}
  </section>;
}
