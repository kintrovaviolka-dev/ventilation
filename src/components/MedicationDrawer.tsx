import React,{useEffect,useRef,useState} from 'react';
import { Language } from '../types';
import { MEDICATIONS, MedicationId, MedicationAdministration, validateMedicationDose } from '../lib/medicationModel';
import { FLUIDS, FluidId, fluidProgress, validFluidInput } from '../lib/fluidModel';
import { RuntimeState, SimulationCommand } from '../lib/simulationRuntime';
import { MedicationPackage } from './MedicationPackage';
import { InfusionSummary, formatSimTime } from './InfusionSummary';

export type DrawerSelection={kind:'drug';id:MedicationId}|{kind:'fluid';id:FluidId}|null;
export interface MedicationDrawerProps {
  language:Language;open:boolean;onToggle:()=>void;readState:()=>RuntimeState;tick:number;
  send:(command:SimulationCommand)=>void;
  onAdminister:(medication:MedicationId,administration:MedicationAdministration,amount:number,unit:string)=>void;
  initialSelection?:DrawerSelection;initialTab?:'drugs'|'fluids';
}
function FluidBag({name}:{name:string}) {
  return <svg viewBox="0 0 120 140" className="fluid-bag" role="img" aria-label={name}>
    <path d="M48 12h24v13h14q9 0 9 12v73q0 10-10 10H35q-10 0-10-10V37q0-12 10-12h13Z" fill="#cce9e7" fillOpacity=".3" stroke="#b7e2e2" strokeWidth="2"/>
    <path d="M30 67h60v41q0 7-7 7H37q-7 0-7-7Z" fill="#7ed9d8" fillOpacity=".45"/>
    <rect x="36" y="43" width="48" height="45" rx="3" fill="#eff5e8"/>
    <text x="60" y="58" textAnchor="middle" fill="#204c53" fontSize="7">SIMULATION</text>
    <path d="M43 66h34M43 73h26" stroke="#2c7577" strokeWidth="2"/>
    <path d="M50 121v12m20-12v12" stroke="#b7e2e2" strokeWidth="5"/>
    <circle cx="60" cy="18" r="4" fill="#101d22"/>
  </svg>;
}
export function MedicationDrawer({language,open,onToggle,readState,tick,send,onAdminister,initialSelection=null,initialTab='drugs'}:MedicationDrawerProps) {
  const state=readState();
  const cs=language==='cs';
  const [tab,setTab]=useState<'drugs'|'fluids'>(initialTab);
  const [selected,setSelected]=useState<DrawerSelection>(initialSelection);
  const [administration,setAdministration]=useState<MedicationAdministration>('bolus');
  const [amount,setAmount]=useState('');
  const [bag,setBag]=useState('500'),[target,setTarget]=useState('500'),[rate,setRate]=useState('120');
  const [notice,setNotice]=useState('');
  const dialog=useRef<HTMLDivElement>(null),opener=useRef<HTMLElement|null>(null),close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    opener.current=document.activeElement as HTMLElement;
    setTab(initialTab);setSelected(initialSelection);setAmount('');setNotice('');setAdministration('bolus');
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';close.current?.focus();
    return()=>{document.body.style.overflow=overflow;opener.current?.focus();};
  },[open]);
  const choose=(selection:DrawerSelection)=>{setSelected(selection);setAmount('');setAdministration('bolus');setNotice('');};
  useEffect(()=>{if(open && selected) dialog.current?.querySelector<HTMLButtonElement>('.medication-back-button')?.focus();},[selected,open]);
  const definition=selected?.kind==='drug'?MEDICATIONS[selected.id]:null;
  const limits=definition?.[administration];
  const unit=administration==='infusion'?'mcg/kg/min':definition?.unit??'';
  const dose=amount.trim()===''?NaN:Number(amount);
  const validDose=selected?.kind==='drug'&&validateMedicationDose(selected.id,administration,dose).valid;
  const validFluid=selected?.kind==='fluid'&&validFluidInput(selected.id,Number(bag),Number(target),Number(rate));
  const history=[
    ...state.medications.map(event=>({id:event.id,time:event.administeredAtSeconds,text:`${MEDICATIONS[event.medication].label[language]} · ${event.amount} ${event.unit} · ${event.administration}`})),
    ...state.medications.filter(event=>event.stoppedAtSeconds!==undefined).map(event=>({id:`${event.id}-stop`,time:event.stoppedAtSeconds!,text:`${MEDICATIONS[event.medication].label[language]} · ${cs?'ukončeno':'stopped'}`})),
    ...state.fluids.flatMap(fluid=>[
      {id:fluid.id,time:fluid.startedAtSeconds,text:`${FLUIDS[fluid.fluid][language]} · ${cs?'vak':'bag'} ${fluid.bagMl} mL · ${cs?'cíl':'target'} ${fluid.targetMl} mL`},
      ...fluid.segments.map((segment,index)=>({id:`${fluid.id}-${index}`,time:segment.atSeconds,text:`${FLUIDS[fluid.fluid][language]} · ${segment.rateMlHour} mL/h${segment.programmedRateMlHour!==undefined?` · ${cs?'po obnovení':'on resume'} ${segment.programmedRateMlHour} mL/h`:''}`})),
      ...(fluid.stoppedAtSeconds!==undefined?[{id:`${fluid.id}-stop`,time:fluid.stoppedAtSeconds,text:`${FLUIDS[fluid.fluid][language]} · ${cs?'ukončeno':'stopped'} · ${fluidProgress(fluid,state.timeMs/1000).deliveredMl.toFixed(1)} mL`}]:[]),
      ...(fluidProgress(fluid,state.timeMs/1000).completedAtSeconds!==undefined?[{id:`${fluid.id}-done`,time:fluidProgress(fluid,state.timeMs/1000).completedAtSeconds!,text:`${FLUIDS[fluid.fluid][language]} · ${cs?'dokončeno':'completed'} · ${fluid.targetMl} mL`}]:[]),
    ]),
  ].sort((a,b)=>b.time-a.time);
  return <section className="medication-drawer">
    <button type="button" className="medication-drawer-toggle" aria-expanded={open} aria-controls="medication-drawer-dialog" onClick={onToggle}>
      <span>{cs?'Léky / Tekutiny':'Drugs / Fluids'}</span><span>{cs?'Otevřít šuplík':'Open drawer'} ↗</span>
    </button>
    {open&&<div className="medication-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onToggle();}}>
      <div ref={dialog} className="medication-modal cabinet-modal" id="medication-drawer-dialog" role="dialog" aria-modal="true" aria-labelledby="medication-drawer-title" onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onToggle();}
        if(event.key==='Tab'){
          const focusable=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')??[]).filter((element:HTMLElement)=>element.getClientRects().length>0) as HTMLElement[];
          if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1)?.focus();}
          if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0]?.focus();}
        }
      }}>
        <header className="medication-modal-header"><div><p className="medication-modal-kicker">{cs?'SIMULAČNÍ VOZÍK':'SIMULATION CART'}</p><h2 id="medication-drawer-title">{cs?'Léky a infuzní tekutiny':'Medications and IV fluids'}</h2><p>{cs?'Vyberte balení, nastavte podání a samostatně potvrďte.':'Choose a package, enter the administration, then confirm.'}</p></div><button ref={close} type="button" className="medication-close-button" aria-label={cs?'Zavřít šuplík':'Close drawer'} onClick={onToggle}>✕</button></header>
        <div className="medication-modal-content">
          <p className="cabinet-disclaimer">{cs?'Pouze výuková simulace. Rozsahy jsou technické vstupy, nikoli bezpečné dávkování.':'Educational simulation only. Ranges are technical inputs, not safe dosing ranges.'}</p>
          <div className="cabinet-tabs" role="group" aria-label={cs?'Obsah šuplíku':'Drawer contents'}>
            <button type="button" aria-pressed={tab==='drugs'} onClick={()=>{setTab('drugs');choose(null);}}>{cs?'Léky':'Drugs'}</button>
            <button type="button" aria-pressed={tab==='fluids'} onClick={()=>{setTab('fluids');choose(null);}}>{cs?'Tekutiny':'Fluids'}</button>
          </div>
          <div className={`cabinet-workspace ${selected?'has-selection':''}`}>
            <section className="cabinet-catalog" aria-label={cs?'Výběr balení':'Package selection'}>
              <div className="medication-package-grid" onKeyDown={event=>{
                if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(event.key))return;
                const buttons=Array.from(event.currentTarget.querySelectorAll('button')) as HTMLButtonElement[];
                const index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(index<0)return;
                event.preventDefault();const columns=getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').length;
                const delta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:event.key==='ArrowDown'?columns:-columns;
                buttons[(index+delta+buttons.length*2)%buttons.length]?.focus();
              }}>
                {tab==='drugs'?(Object.keys(MEDICATIONS) as MedicationId[]).map(id=><button key={id} type="button" className="medication-package" aria-pressed={selected?.id===id} onClick={()=>choose({kind:'drug',id})}><MedicationPackage medication={id} language={language}/><span className="medication-package-name">{MEDICATIONS[id].label[language]}</span><span className="medication-package-hint">{MEDICATIONS[id].unit} · {id==='norepinephrine'?(cs?'bolus / infuze':'bolus / infusion'):'bolus'}</span></button>)
                :(Object.keys(FLUIDS) as FluidId[]).map(id=><button key={id} type="button" className="medication-package fluid-package" aria-pressed={selected?.id===id} onClick={()=>choose({kind:'fluid',id})}><FluidBag name={FLUIDS[id][language]}/><span className="medication-package-name">{FLUIDS[id][language]}</span><span className="medication-package-hint">mL · mL/h</span></button>)}
              </div>
            </section>
            <section className="cabinet-detail" aria-label={cs?'Nastavení podání':'Administration details'}>
              {!selected?<div className="cabinet-empty"><strong>{cs?'Vyberte balení z přihrádky':'Choose a package from the tray'}</strong><p>{cs?'Výběrem se nic nepodává. Běžící infuze najdete v přehledu.':'Selection does not administer anything. Running infusions appear in the overview.'}</p></div>:<>
                <button type="button" className="medication-back-button" onClick={()=>{choose(null);requestAnimationFrame(()=>dialog.current?.querySelector<HTMLButtonElement>('.medication-package[aria-pressed="true"]')?.focus() ?? dialog.current?.querySelector<HTMLButtonElement>('.medication-package')?.focus());}}>← {cs?'Zpět k balením':'Back to packages'}</button>
                <h3>{selected.kind==='drug'?MEDICATIONS[selected.id].label[language]:FLUIDS[selected.id][language]}</h3>
                {selected.kind==='drug'?<form className="cabinet-form" onSubmit={event=>{event.preventDefault();if(validDose){onAdminister(selected.id,administration,dose,unit);setAmount('');setNotice(cs?'Podání zaznamenáno do historie.':'Administration recorded in history.');}}}>
                  {definition?.modelNote&&<p>{definition.modelNote[language]}</p>}
                  <label>{cs?'Způsob podání':'Administration'}<select value={administration} onChange={event=>{setAdministration(event.target.value as MedicationAdministration);setAmount('');}}><option value="bolus">Bolus</option>{definition?.infusion&&<option value="infusion">{cs?'Infuze':'Infusion'}</option>}</select></label>
                  <label>{cs?'Dávka':'Dose'} ({unit})<input type="number" value={amount} min={limits?.min} max={limits?.max} step={limits?.step} onChange={event=>setAmount(event.target.value)} required/></label>
                  <p>{cs?'Technický rozsah':'Technical range'}: {limits?.min}–{limits?.max} {unit} · {cs?'krok':'step'} {limits?.step}</p>
                  <div className="medication-examples">{cs?'Modelové příklady:':'Model examples:'} {limits?.examples.map(example=><button key={example} type="button" onClick={()=>setAmount(String(example))}>{example} {unit}</button>)}</div>
                  <button className="medication-administer-button" disabled={!validDose}>{cs?'Zaznamenat podání':'Record administration'}</button>
                </form>:<form className="cabinet-form" onSubmit={event=>{event.preventDefault();if(validFluid){send({type:'fluid-start',id:crypto.randomUUID(),fluid:selected.id,bagMl:Number(bag),targetMl:Number(target),rateMlHour:Number(rate)});setNotice(cs?'Infuze spuštěna. Zavření šuplíku ji nezastaví.':'Infusion started. Closing the drawer does not stop it.');}}}>
                  <label>{cs?'Objem vaku (mL)':'Bag volume (mL)'}<input type="number" min="1" max="3000" step="1" value={bag} onChange={event=>setBag(event.target.value)}/></label>
                  <label>{cs?'Objem k podání (mL)':'Target volume (mL)'}<input type="number" min="1" max={bag} step="1" value={target} onChange={event=>setTarget(event.target.value)}/></label>
                  <label>{cs?'Rychlost (mL/h)':'Rate (mL/h)'}<input type="number" min="1" max="6000" step="1" value={rate} onChange={event=>setRate(event.target.value)}/></label>
                  <p>{cs?'Technické meze: vak 1–3000 mL, cíl nejvýše objem vaku, rychlost 1–6000 mL/h. Oba krystaloidy mají stejný zjednodušený objemový účinek; elektrolyty ani přetížení se nemodelují.':'Technical bounds: bag 1–3000 mL, target no greater than bag, rate 1–6000 mL/h. Both crystalloids share a simplified volume effect; electrolytes and overload are not modeled.'}</p>
                  <button className="medication-administer-button" disabled={!validFluid}>{cs?'Spustit infuzi':'Start infusion'}</button>
                </form>}
              </>}
              <p role="status" className="cabinet-notice">{notice}</p>
            </section>
            <InfusionSummary readState={readState} tick={tick} language={language} send={send}/>
          </div>
          <section className="medication-history"><h3>{cs?'Společná historie podání':'Combined administration history'}</h3>{history.length===0?<p>{cs?'Zatím bez podání.':'No administrations yet.'}</p>:<ol>{history.map(event=><li key={event.id}><time>{formatSimTime(event.time)}</time><span>{event.text}</span></li>)}</ol>}</section>
        </div>
      </div>
    </div>}
  </section>;
}
