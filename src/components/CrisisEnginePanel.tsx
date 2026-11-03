import { useState } from 'react';
import { Language } from '../types';
import {
  CRISIS_SCENARIOS,
  CrisisScenarioId,
  CrisisState,
  crisisRecoveryRemaining,
} from '../lib/crisisEngine';

interface CrisisEnginePanelProps {
  language: Language;
  crisis: CrisisState;
  nowSeconds: number;
  recoveryReady: boolean;
  onStart: (scenarioId: CrisisScenarioId) => void;
  onBeginRecovery: () => void;
  onRecordVolumeSupport: () => void;
  onReconnectCircuit: () => void;
  onDecompressPneumothorax: () => void;
  onRepositionTube: () => void;
  onAcknowledgeSurgeonRequest: () => void;
  onReset: () => void;
}

export function CrisisEnginePanel({
  language,
  crisis,
  nowSeconds,
  recoveryReady,
  onStart,
  onBeginRecovery,
  onRecordVolumeSupport,
  onReconnectCircuit,
  onDecompressPneumothorax,
  onRepositionTube,
  onAcknowledgeSurgeonRequest,
  onReset,
}: CrisisEnginePanelProps) {
  const [selectedScenario, setSelectedScenario] = useState<CrisisScenarioId>('bronchospasm');
  const hemorrhage = crisis.status !== 'idle' && crisis.scenarioId === 'hemorrhage';
  const labels = {
    cs: {
      trigger: 'ŘÍZENÉ SCÉNÁŘE · NĚCO SE DĚJE',
      select: 'Zkušební scénář',
      idle: 'Krize neaktivní · zvolte předvídatelný scénář pro výuku.',
      active: 'SCÉNÁŘ PROBÍHÁ',
      recovering: 'POSTUPNÉ ZOTAVENÍ',
      recovered: 'ZOTAVENÍ DOKONČENO',
      start: 'Spustit vybraný scénář',
      beginRecovery: 'Zahájit modelové zotavení',
      reset: 'Resetovat scénář',
      waiting: (hemorrhage ? 'Dokončení vyžaduje skutečně podanou tekutinu.' : 'Podmínky zotavení zatím nejsou splněny.'),
      ready: hemorrhage ? 'Tekutina byla podána. Scénář lze ručně dokončit; oběhový stav pokračuje.' : 'Podmínky modelu splněny. Lze zahájit postupné zotavení.',
      volumeSupport: 'Otevřít infuze tekutin',
      reconnect: 'ZNOVU PŘIPOJIT VENTILAČNÍ OKRUH',
      recoveryTime: 'Zbývá modelového zotavení',
      seconds: 's',
      educational: 'Pouze deterministický výukový model; nejde o klinické pokyny ani doporučení k léčbě.',
      condition: 'Podmínka modelu',
      bronchospasm: 'Změna I:E na výdechovou složku ≥ 3 při RR ≤ 16, nebo zvýšení nastavení Sevofluranu na ≥ 1,5.',
      anesthesia: 'Po spuštění zaznamenat podání propofolu/sufentanilu nebo zvýšit modelovou hloubku či nastavení vaporizéru.',
      hemorrhage: 'Spustit infuzi v záložce Tekutiny. Hodnoty se mění podle skutečně podaného objemu po začátku scénáře. Dokončení scénáře nezastaví infuzi ani nenormalizuje pacienta.',
      disconnect: 'Znovu připojit okruh; ventilátorové křivky a naměřené hodnoty zůstávají do té doby nulové.',
      surgeon: 'CHIRURG: Pacient se pohybuje. Potvrďte připravenost pokračovat.',
      tensionObservation: 'Modelový nález: jednostranně snížená ventilace, rostoucí tlak, desaturace a oběhové změny.',
      tensionIntervention: 'Zaznamenat modelovou dekompresi',
      mainstemObservation: 'Modelový nález: jednostranná ventilace, nižší poddajnost a dechový objem, následovaný poklesem SpO₂.',
      tubeIntervention: 'Zaznamenat modelové přemístění kanyly',
      surgeonRequest: 'CHIRURG: Prosím o krátké přerušení výkonu a potvrzení koordinace týmu.',
      acknowledge: 'Potvrdit přerušení a koordinaci týmu',
    },
    en: {
      trigger: 'GUIDED SCENARIOS · SOMETHING IS HAPPENING',
      select: 'Scenario for practice',
      idle: 'No crisis active · choose a deterministic teaching scenario.',
      active: 'SCENARIO ACTIVE',
      recovering: 'GRADUAL RECOVERY',
      recovered: 'RECOVERY COMPLETE',
      start: 'Start selected scenario',
      beginRecovery: 'Begin modeled recovery',
      reset: 'Reset scenario',
      waiting: hemorrhage ? 'Completion requires actual fluid delivery.' : 'Recovery conditions are not met yet.',
      ready: hemorrhage ? 'Fluid delivered. You may complete the scenario; the circulatory state continues.' : 'Model conditions met. Gradual recovery can begin.',
      volumeSupport: 'Open fluid infusions',
      reconnect: 'RECONNECT VENTILATOR CIRCUIT',
      recoveryTime: 'Modeled recovery remaining',
      seconds: 's',
      educational: 'Deterministic educational model only; not clinical instructions or treatment advice.',
      condition: 'Model condition',
      bronchospasm: 'Change I:E to an expiratory component ≥ 3 at RR ≤ 16, or increase the modeled sevoflurane setting to ≥ 1.5.',
      anesthesia: 'After onset, record propofol/sufentanil administration or increase modeled anesthesia depth or vaporizer setting.',
      hemorrhage: 'Start an infusion in Fluids. Values respond to volume actually delivered after onset. Completing the scenario does not stop the infusion or normalize the patient.',
      disconnect: 'Reconnect the circuit; ventilator traces and measured values remain zero until reconnected.',
      surgeon: 'SURGEON: The patient is moving. Please confirm readiness to continue.',
      tensionObservation: 'Modeled finding: reduced unilateral ventilation, rising pressure, desaturation, and hemodynamic changes.',
      tensionIntervention: 'Record modeled decompression',
      mainstemObservation: 'Modeled finding: one-lung ventilation, lower compliance and tidal volume, followed by falling SpO₂.',
      tubeIntervention: 'Record modeled tube repositioning',
      surgeonRequest: 'SURGEON: Please pause the procedure briefly and confirm team coordination.',
      acknowledge: 'Acknowledge pause and team coordination',
    },
  }[language];
  const scenario = CRISIS_SCENARIOS.find((item) => item.id === (
    crisis.status === 'idle' ? selectedScenario : crisis.scenarioId
  )) ?? CRISIS_SCENARIOS[0];
  const status = crisis.status === 'active'
    ? labels.active
    : crisis.status === 'recovering'
      ? labels.recovering
      : crisis.status === 'recovered'
        ? labels.recovered
        : labels.idle;
  const condition = (() => {
    switch (scenario.id) {
      case 'bronchospasm': return labels.bronchospasm;
      case 'inadequate-anesthesia': return labels.anesthesia;
      case 'hemorrhage': return labels.hemorrhage;
      case 'ventilator-disconnect': return labels.disconnect;
      case 'tension-pneumothorax': return labels.tensionObservation;
      case 'right-mainstem-intubation': return labels.mainstemObservation;
      case 'surgeon-interruption': return labels.surgeonRequest;
    }
  })();
  const recoveryRemaining = crisisRecoveryRemaining(crisis, nowSeconds);
  const disconnected = crisis.status !== 'idle'
    && crisis.scenarioId === 'ventilator-disconnect'
    && (crisis.status === 'active' || (crisis.status === 'recovering' && recoveryRemaining > 0));
  const canSelectAndStart = crisis.status === 'idle' || crisis.status === 'recovered';

  return (
    <section
      className={`crisis-engine-panel ${crisis.status === 'active' ? 'crisis-engine-active' : ''}`}
      aria-label={labels.trigger}
    >
      <div className="crisis-engine-controls">
        <div className="crisis-engine-title">
          <strong>{labels.trigger}</strong>
          <span>{labels.educational}</span>
        </div>
        {canSelectAndStart ? (
          <>
            <label className="crisis-scenario-select">
              <span>{labels.select}</span>
              <select
                value={selectedScenario}
                onChange={(event) => setSelectedScenario(event.target.value as CrisisScenarioId)}
              >
                {CRISIS_SCENARIOS.map((item) => (
                  <option value={item.id} key={item.id}>{item.title[language]}</option>
                ))}
              </select>
            </label>
            <button type="button" className="crisis-trigger-button" onClick={() => onStart(selectedScenario)}>
              {labels.start}
            </button>
          </>
        ) : (
          <div className="crisis-current">
            <strong>{scenario.title[language]}</strong>
            <span>{status}</span>
          </div>
        )}
        {crisis.status !== 'idle' && (
          <button type="button" className="crisis-reset-button" onClick={onReset}>{labels.reset}</button>
        )}
      </div>

      {crisis.status !== 'idle' && (
        <div className="crisis-engine-details">
          <div>
            <p>{scenario.description[language]}</p>
            {crisis.status === 'recovered' && (
              <p className="crisis-ready">{scenario.title[language]} · {scenario.id === 'hemorrhage' ? (language === 'cs' ? 'Scénář dokončen; oběhový stav a infuze pokračují.' : 'Scenario complete; circulatory state and infusions continue.') : labels.recovered}</p>
            )}
            {crisis.status === 'active' && (
              crisis.scenarioId === 'inadequate-anesthesia'
                ? <p className="crisis-surgeon-prompt">{labels.surgeon}</p>
                : crisis.scenarioId === 'surgeon-interruption'
                  ? <p className="crisis-surgeon-prompt">{labels.surgeonRequest}</p>
                  : null
            )}
            {crisis.status === 'active' && (
              <>
                <p><strong>{labels.condition}:</strong> {condition}</p>
                {crisis.scenarioId === 'hemorrhage' && (
                  <button
                    type="button"
                    className="crisis-intervention-button"
                    disabled={crisis.volumeSupportRecorded}
                    onClick={onRecordVolumeSupport}
                  >
                    {crisis.volumeSupportRecorded ? labels.ready : labels.volumeSupport}
                  </button>
                )}
                {crisis.scenarioId === 'ventilator-disconnect' && disconnected && (
                  <button type="button" className="crisis-intervention-button" onClick={onReconnectCircuit}>
                    {labels.reconnect}
                  </button>
                )}
                {crisis.scenarioId === 'tension-pneumothorax' && (
                  <button
                    type="button"
                    className="crisis-intervention-button"
                    disabled={crisis.pneumothoraxDecompressed}
                    onClick={onDecompressPneumothorax}
                  >
                    {crisis.pneumothoraxDecompressed ? labels.ready : labels.tensionIntervention}
                  </button>
                )}
                {crisis.scenarioId === 'right-mainstem-intubation' && (
                  <button
                    type="button"
                    className="crisis-intervention-button"
                    disabled={crisis.tubeRepositioned}
                    onClick={onRepositionTube}
                  >
                    {crisis.tubeRepositioned ? labels.ready : labels.tubeIntervention}
                  </button>
                )}
                {crisis.scenarioId === 'surgeon-interruption' && (
                  <button
                    type="button"
                    className="crisis-intervention-button"
                    disabled={crisis.surgeonRequestAcknowledged}
                    onClick={onAcknowledgeSurgeonRequest}
                  >
                    {crisis.surgeonRequestAcknowledged ? labels.ready : labels.acknowledge}
                  </button>
                )}
                <p className={recoveryReady ? 'crisis-ready' : 'crisis-waiting'}>
                  {recoveryReady ? labels.ready : labels.waiting}
                </p>
                <button
                  type="button"
                  className="crisis-recovery-button"
                  disabled={!recoveryReady}
                  onClick={onBeginRecovery}
                >
                  {scenario.id === 'hemorrhage' ? (language === 'cs' ? 'Dokončit výukový scénář' : 'Complete teaching scenario') : labels.beginRecovery}
                </button>
              </>
            )}
            {crisis.status === 'recovering' && (
              <p className="crisis-ready">
                {labels.recoveryTime}: {Math.ceil(recoveryRemaining)} {labels.seconds}
              </p>
            )}

          </div>
        </div>
      )}
    </section>
  );
}
