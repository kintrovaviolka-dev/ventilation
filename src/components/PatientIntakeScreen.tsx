import React,{useState} from 'react';
import {Language,PatientCase} from '../types';
import {LanguageSwitcher} from './LanguageSwitcher';
import {PracticeButton} from './PracticeButton';
import {MEDICATIONS,MedicationId,validateMedicationDose} from '../lib/medicationModel';
export interface InductionOrder { medication:MedicationId; amount:number; unit:string }
export function PatientIntakeScreen({language,setLanguage,patientCase,onProceedToSimulation,onBackToWelcome,onOpenPractice}:{
  language:Language;setLanguage:(value:Language)=>void;patientCase:PatientCase;
  onProceedToSimulation:(orders:InductionOrder[],mac:number)=>void;onBackToWelcome:()=>void;onOpenPractice:()=>void;
}) {
  const cs=language==='cs';
  const [doses,setDoses]=useState<Record<string,string>>({});
  const [mac,setMac]=useState('1.2');
  const ids=Object.keys(MEDICATIONS) as MedicationId[];
  const valid=ids.every(id=>!doses[id]?.trim()||validateMedicationDose(id,'bolus',Number(doses[id])).valid)&&mac.trim()!==''&&Number.isFinite(Number(mac))&&Number(mac)>=0&&Number(mac)<=3;
  return <main className="intake-page">
    <header><button onClick={onBackToWelcome}>← {cs?'Zpět':'Back'}</button><LanguageSwitcher language={language} setLanguage={setLanguage}/><PracticeButton language={language} onClick={onOpenPractice}/></header>
    <h1>{cs?'Příprava modelového úvodu':'Prepare modeled induction'}</h1>
    <p>{cs?patientCase.name.replace('yrs','let'):patientCase.name} · {patientCase.weightKg} kg · IBW {patientCase.ibwKg} kg</p>
    <p>{cs?'Dávky jsou absolutní. Prázdné pole znamená bez podání. Potvrzení založí vybrané bolusy jednou v čase 00:00 ve stejné historii jako lékový šuplík. Žádné automatické přepočty přes IBW.':'Doses are absolute. An empty field means no administration. Confirmation records the selected boluses once at 00:00 in the same history as the drawer. No automatic IBW conversions.'}</p>
    <form onSubmit={event=>{event.preventDefault();if(valid)onProceedToSimulation(ids.filter(id=>doses[id]?.trim()).map(id=>({medication:id,amount:Number(doses[id]),unit:MEDICATIONS[id].unit})),Number(mac));}}>
      <div className="induction-grid">{ids.map(id=>{const drug=MEDICATIONS[id],limits=drug.bolus!;return <label key={id}>{drug.label[language]} ({drug.unit})<input type="number" min={limits.min} max={limits.max} step={limits.step} value={doses[id]??''} onChange={event=>setDoses(previous=>({...previous,[id]:event.target.value}))}/><small>{cs?'Technický rozsah':'Technical range'}: {limits.min}–{limits.max} {drug.unit}; {cs?'krok':'step'} {limits.step}</small></label>;})}</div>
      <label>Sevofluran (MAC)<input type="number" min="0" max="3" step="0.1" value={mac} onChange={event=>setMac(event.target.value)} required/></label>
      <p>{cs?'Pouze výukové vstupy; nejde o doporučení k indukci ani bezpečné dávkování. Svalová relaxace nezajišťuje bezvědomí.':'Teaching inputs only; not induction recommendations or safe dosing ranges. Muscle relaxation does not ensure unconsciousness.'}</p>
      <button className="medication-administer-button" disabled={!valid}>{cs?'Potvrdit úvod a spustit simulaci':'Confirm induction and start simulation'}</button>
    </form>
  </main>;
}
