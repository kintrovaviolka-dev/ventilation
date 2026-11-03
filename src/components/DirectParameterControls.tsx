import React, { useState, useEffect } from 'react';
import { Language, PatientParams, VentilatorSettings, VentMode } from '../types';
import { SELECTABLE_PARAMETERS, getParamCurrentValue, isParameterEnabled, isValidParameterValue, ParameterSpec } from '../lib/controlSystem';

const labels: Record<string, string> = { fio2: 'FiO₂', rr: 'Dechová frekvence', vt: 'Dechový objem', pinsp: 'Pinsp nad PEEP', peep: 'PEEP', pSupport: 'Podpora nad PEEP', mode: 'Ventilační režim', ieRatio: 'Poměr I:E', flowTrigger:'Průtokový trigger', cycleOff:'Ukončení podpory', minTi:'Minimální Ti', maxTi:'Maximální Ti', apneaSeconds:'Limit apnoe', backupEnabled:'Záloha při apnoi (0/1)', backupPinsp:'Záložní Pinsp nad PEEP', backupRr:'Záložní frekvence', backupIeRatio:'Záložní I:E', spontaneousRate:'Spontánní frekvence pacienta', driveAmplitude:'Úsilí pacienta' };

const ParameterField: React.FC<{
  param: ParameterSpec; value: number | string; language: Language;
  onCommit: (id: string, value: number | string) => void;
}> = ({ param, value, language, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const parsed = param.options ? draft : draft.trim() === '' ? NaN : Number(draft);
  const valid = isValidParameterValue(param, parsed);
  const changed = draft !== String(value);
  const label = language === 'cs' ? (labels[param.id] ?? param.label) : param.label;
  const reset = () => setDraft(String(value));
  return <form className="direct-parameter" onSubmit={event => {
    event.preventDefault();
    if (valid && changed) {
      onCommit(param.id, parsed);
      (event.currentTarget.querySelector('input, select') as HTMLElement | null)?.focus();
    }
  }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); reset(); } }}>
    <label htmlFor={`direct-${param.id}`}>{label} {param.unit && <span>({param.unit})</span>}</label>
    {param.options ? <select id={`direct-${param.id}`} value={draft} onChange={event => setDraft(event.target.value)}>
      {param.options.map(option => <option key={option} value={option}>{option.toUpperCase()}</option>)}
    </select> : <div className="direct-value">
      <button type="button" aria-label={`${label} −`} onClick={() => setDraft(String(Number(Math.max(param.min!, (Number.isFinite(parsed) ? Number(parsed) : Number(value)) - param.step!).toFixed(3))))}>−</button>
      <input id={`direct-${param.id}`} type="number" inputMode="decimal" min={param.min} max={param.max} step={param.step} value={draft}
        aria-invalid={!valid} aria-describedby={`hint-${param.id}`} onChange={event => setDraft(event.target.value)} />
      <button type="button" aria-label={`${label} +`} onClick={() => setDraft(String(Number(Math.min(param.max!, (Number.isFinite(parsed) ? Number(parsed) : Number(value)) + param.step!).toFixed(3))))}>+</button>
    </div>}
    <small id={`hint-${param.id}`}>{param.options ? (language === 'cs' ? 'Změnu potvrďte.' : 'Confirm to apply.') : `${param.min}–${param.max} ${param.unit} · ${language === 'cs' ? 'krok' : 'step'} ${param.step}`}</small>
    {changed && <div className="direct-actions">
      <button type="submit" disabled={!valid}>{language === 'cs' ? 'Použít' : 'Apply'}</button>
      <button type="button" onClick={reset}>{language === 'cs' ? 'Zrušit' : 'Cancel'}</button>
    </div>}
    {!valid && <small role="alert">{language === 'cs' ? 'Zadejte hodnotu v uvedeném rozsahu a kroku.' : 'Enter a value within the range and step.'}</small>}
  </form>;
}

export function DirectParameterControls({ settings, mode, patient, language, onCommit }: {
  settings: VentilatorSettings; mode: VentMode; patient: PatientParams; language: Language;
  onCommit: (id: string, value: number | string) => void;
}) {
  return <div className="direct-controls">
    <h2>{language === 'cs' ? 'Nastavení ventilátoru' : 'Ventilator settings'}</h2>
    <p>{language === 'cs' ? 'Zadejte číslo nebo použijte − / +. Změnu potvrďte tlačítkem Použít nebo Enter; Escape ji zruší. Zobrazeny jsou parametry účinné v aktuálním režimu.' : 'Type a value or use − / +. Apply or Enter confirms; Escape cancels. Only parameters used by the current mode are shown.'}</p>
    <div className="direct-controls-grid">{SELECTABLE_PARAMETERS.filter(param => isParameterEnabled(param.id, mode)).map(param => {
      const value = getParamCurrentValue(param.id, settings, mode, patient);
      return <ParameterField key={`${param.id}-${mode}`} param={param} value={value} language={language} onCommit={onCommit} />;
    })}</div>
    {mode === 'ps' && <p>{language === 'cs' ? 'PSV spouští úsilí pacienta. Záložní PC je samostatné nastavení; 0 = vypnuto, 1 = zapnuto.' : 'PSV is triggered by patient effort. Backup PC has separate settings; 0 = off, 1 = on.'}</p>}
  </div>;
}
