import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  VentilatorSettings,
  PatientParams,
  VentMode,
  Language,
  AppStep,
  PatientCase,
  MedicationSelection,
  IntraoperativeEvent,
} from './types';
import { PATIENT_CASES, INTRAOPERATIVE_EVENTS } from './data/patientCases';
import { calculatePhysiology } from './lib/physiologyEngine';
import { detectAlarms, ActiveAlarm } from './lib/alarmEngine';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PatientIntakeScreen } from './components/PatientIntakeScreen';
import { ClinicalScenarioBar } from './components/ClinicalScenarioBar';
import { TopBar } from './components/TopBar';
import { AlarmBanner } from './components/AlarmBanner';
import { WaveformCanvas } from './components/WaveformCanvas';
import { PVLoopCanvas } from './components/PVLoopCanvas';
import { NumericTilesPanel } from './components/NumericTilesPanel';
import { HardwareDial } from './components/HardwareDial';
import { MedicationPanel } from './components/MedicationPanel';
import {
  ControlMode,
  SELECTABLE_PARAMETERS,
  getParamCurrentValue,
  ParameterSpec,
} from './lib/controlSystem';
import { playCancelBeep, startAlarmSound, stopAlarmTones } from './lib/audioTone';
import { TRANSLATIONS } from './i18n/translations';

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [appStep, setAppStep] = useState<AppStep>('welcome');

  // Active Clinical Case & Induction Medications
  const [selectedCase, setSelectedCase] = useState<PatientCase>(PATIENT_CASES[0]);
  const [activeEvent, setActiveEvent] = useState<IntraoperativeEvent>(INTRAOPERATIVE_EVENTS[0]);

  const [meds, setMeds] = useState<MedicationSelection>({
    inductionAgent: 'propofol',
    inductionDoseMgKg: 2.0,
    opioid: 'fentanyl',
    opioidDoseMcgKg: 2.0,
    nmb: 'rocuronium',
    nmbDoseMgKg: 0.6,
    volatileGas: 'sevoflurane',
    volatileMac: 1.2,
  });

  const [mode, setMode] = useState<VentMode>('vc');
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [isSilenced, setIsSilenced] = useState<boolean>(false);

  // Dynamic Medication levels (Anesthesia Dashboard)
  const [sevofluraneMac, setSevofluraneMac] = useState<number>(1.2);
  const [nmbLevel, setNmbLevel] = useState<number>(90);
  const [sedationLevel, setSedationLevel] = useState<number>(90);

  // Active Ventilator Settings (Initializes to protective VT for selected case)
  const [settings, setSettings] = useState<VentilatorSettings>({
    fio2: 40,
    rr: 12,
    vt: Math.round(PATIENT_CASES[0].ibwKg * 7),
    pinsp: 20,
    peep: 5,
    ieRatio: '1:2',
    pSupport: 10,
  });

  // closed-Loop Simulation check: is patient properly anesthetized/relaxed?
  const isPatientQuiet = nmbLevel > 40 || sevofluraneMac > 0.8 || sedationLevel > 35;
  const isBuckingSuppressed = activeEvent.id === 'event_bucking' && isPatientQuiet;

  // Bronchospasm bronchodilation via Sevoflurane (high MAC >= 1.5 relaxes airway smooth muscle)
  const isBronchospasmTreated = activeEvent.id === 'event_bronchospasm' && sevofluraneMac >= 1.5;

  // Atelectasis recruitment via PEEP (PEEP >= 8 cmH2O recruits collapsed alveoli)
  const isAtelectasisRecruited = activeEvent.id === 'event_atelectasis' && settings.peep >= 8;

  let complianceModifier = activeEvent.compliance;
  let resistanceModifier = activeEvent.resistance;

  if (isBuckingSuppressed) {
    complianceModifier = 0;
    resistanceModifier = 0;
  } else if (isBronchospasmTreated) {
    resistanceModifier = 4; // reduced resistance penalty
  } else if (isAtelectasisRecruited) {
    complianceModifier = -4; // reduced compliance penalty (recruited)
  }

  // Dynamic Patient Parameters driven by baseline case + active intraoperative event
  const effectiveCompliance = Math.max(10, selectedCase.baselineCompliance + complianceModifier);
  const effectiveResistance = Math.max(2, selectedCase.baselineResistance + resistanceModifier);

  const patient: PatientParams = {
    compliance: effectiveCompliance,
    resistance: effectiveResistance,
    preset: selectedCase.preset,
  };

  // Formulate status feedback for clinical events
  let clinicalStatusMessage = '';
  if (activeEvent.id === 'event_bucking') {
    if (isPatientQuiet) {
      clinicalStatusMessage = language === 'cs'
        ? 'PROBUZENÍ POTLAČENO: Pacient zklidněn svalovou relaxací (NMB) / hloubkou anestezie.'
        : 'PATIENT CALMED: Spontaneous efforts successfully suppressed by NMB block / anesthetic depth.';
    } else {
      clinicalStatusMessage = language === 'cs'
        ? 'PACIENT BOJUJE S VENTILÁTOREM! Podejte bolus relaxancia (NMB) nebo zvyšte Sevofluran.'
        : 'PATIENT COUGHING/BUCKING! Administer NMB bolus or deepen anesthesia (increase Sevoflurane).';
    }
  } else if (activeEvent.id === 'event_bronchospasm') {
    if (isBronchospasmTreated) {
      clinicalStatusMessage = language === 'cs'
        ? 'TERAPIE ÚSPĚŠNÁ: Bronchospasmus uvolněn dilatačním účinkem Sevofluranu (MAC >= 1.5).'
        : 'THERAPY SUCCESSFUL: Bronchospasm relieved by Sevoflurane smooth muscle dilation (MAC >= 1.5).';
    } else {
      clinicalStatusMessage = language === 'cs'
        ? 'KONTRAKCE DÝCHACÍCH CEST: Zvyšte anestetický plyn (Sevofluran >= 1.5 MAC) k vyvolání bronchodilatace.'
        : 'AIRWAY CONSTRICTION: Deepen volatile anesthetic (Sevoflurane >= 1.5 MAC) to trigger bronchodilation.';
    }
  } else if (activeEvent.id === 'event_atelectasis') {
    if (isAtelectasisRecruited) {
      clinicalStatusMessage = language === 'cs'
        ? 'REKRUTACE DOKONČENA: Kolabované sklípky byly otevřeny zvýšeným PEEP (>= 8 cmH₂O).'
        : 'RECRUITMENT SUCCESSFUL: Collapsed alveoli reopened by elevated baseline PEEP (>= 8 cmH₂O).';
    } else {
      clinicalStatusMessage = language === 'cs'
        ? 'ATELEKTÁZA A SHUNT: Zvyšte PEEP (>= 8 cmH₂O) k rekrutaci kolabovaných plicních segmentů.'
        : 'ATELECTASIS & SHUNTING: Elevate PEEP (>= 8 cmH₂O) to recruit collapsed alveolar segments.';
    }
  }

  // Turn-Push-Turn-Push Control System State
  const [controlMode, setControlMode] = useState<ControlMode>('NAVIGATING');
  const [activeParamIndex, setActiveParamIndex] = useState<number>(0);
  const activeParam = SELECTABLE_PARAMETERS[activeParamIndex] || SELECTABLE_PARAMETERS[0];

  const [stagedValue, setStagedValue] = useState<number | string>(
    getParamCurrentValue(activeParam.id, settings, mode, patient)
  );

  const [timeoutSec, setTimeoutSec] = useState<number>(7);
  const [timeoutWarning, setTimeoutWarning] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculated Real-time Physiology & Alarms
  const physiology = calculatePhysiology(settings, patient, mode);
  const detectedAlarms = detectAlarms(physiology, language);

  let activeAlarms: ActiveAlarm[] = [...detectedAlarms];
  if (alarmActive) {
    activeAlarms.unshift({
      id: 'simulated_test_alarm',
      level: 'critical',
      message: language === 'cs' ? 'ALARM: SIMULOVANÁ HYPOXIE / VYSOKÝ Ppeak' : 'CRITICAL ALARM: SIMULATED HIGH PRESSURE',
      code: 'HIGH Ppeak 42 cmH₂O',
    });
  }

  const highestAlarmLevel = activeAlarms.some((a) => a.level === 'critical')
    ? 'critical'
    : activeAlarms.length > 0
    ? 'warning'
    : 'none';

  // Update settings when user selects a different case on Welcome screen
  const handleSelectCase = (c: PatientCase) => {
    setSelectedCase(c);
    setActiveEvent(INTRAOPERATIVE_EVENTS[0]); // reset event to baseline
    setSettings((prev) => ({
      ...prev,
      vt: Math.round(c.ibwKg * 7),
    }));
  };

  // Synchronize stagedValue when activeParam changes in NAVIGATING mode
  useEffect(() => {
    if (controlMode === 'NAVIGATING') {
      setStagedValue(getParamCurrentValue(activeParam.id, settings, mode, patient));
    }
  }, [activeParam, settings, mode, patient, controlMode]);

  // 7-second Safety Timeout Timer for EDITING state
  useEffect(() => {
    if (controlMode === 'EDITING') {
      setTimeoutSec(7);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeoutSec((prev) => {
          if (prev <= 1) {
            // Safety Timeout Triggered: Revert temporary value
            if (timerRef.current) clearInterval(timerRef.current);
            playCancelBeep();
            setTimeoutWarning(true);
            setControlMode('NAVIGATING');
            setTimeout(() => setTimeoutWarning(false), 2500);
            return 7;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [controlMode]);

  // Medication levels decay ticker
  useEffect(() => {
    if (appStep !== 'simulation') return;
    const interval = setInterval(() => {
      setNmbLevel((prev) => Math.max(0, prev - 0.5));
      setSedationLevel((prev) => Math.max(0, prev - 0.7));
    }, 1000);
    return () => clearInterval(interval);
  }, [appStep]);

  // Trigger synthesized audio alarms based on active alarms and silence status
  useEffect(() => {
    if (appStep !== 'simulation' || isSilenced || highestAlarmLevel === 'none') {
      stopAlarmTones();
      return;
    }

    if (highestAlarmLevel === 'critical') {
      startAlarmSound('critical');
    } else if (highestAlarmLevel === 'warning') {
      startAlarmSound('warning');
    }

    return () => {
      stopAlarmTones();
    };
  }, [highestAlarmLevel, isSilenced, appStep]);

  // Commit function when user pushes dial to CONFIRM in EDITING state
  const commitStagedValue = useCallback(() => {
    const id = activeParam.id;

    if (id === 'mode') {
      setMode(stagedValue as VentMode);
    } else {
      setSettings((prev) => ({
        ...prev,
        [id]: stagedValue,
      }));
    }

    setControlMode('NAVIGATING');
  }, [activeParam, stagedValue]);

  // Handle Turn Action
  const handleTurn = (direction: -1 | 1) => {
    setTimeoutSec(7); // reset timeout clock on interaction

    if (controlMode === 'NAVIGATING') {
      // Cycle selected parameter tile
      setActiveParamIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return SELECTABLE_PARAMETERS.length - 1;
        if (next >= SELECTABLE_PARAMETERS.length) return 0;
        return next;
      });
    } else {
      // Adjust staged value in EDITING state
      if (activeParam.options) {
        const opts = activeParam.options;
        const currentIdx = opts.indexOf(String(stagedValue));
        let nextIdx = currentIdx + direction;
        if (nextIdx < 0) nextIdx = opts.length - 1;
        if (nextIdx >= opts.length) nextIdx = 0;
        setStagedValue(opts[nextIdx]);
      } else if (typeof stagedValue === 'number') {
        const step = activeParam.step || 1;
        const min = activeParam.min ?? 0;
        const max = activeParam.max ?? 1000;
        const nextVal = Math.max(min, Math.min(max, stagedValue + direction * step));
        setStagedValue(nextVal);
      }
    }
  };

  // Handle Push Action
  const handlePush = () => {
    if (controlMode === 'NAVIGATING') {
      // Enter EDITING mode
      setStagedValue(getParamCurrentValue(activeParam.id, settings, mode, patient));
      setControlMode('EDITING');
    } else {
      // Confirm & commit staged value
      commitStagedValue();
    }
  };

  // Direct touch/click on parameter tile
  const handleSelectParamDirect = (param: ParameterSpec) => {
    const idx = SELECTABLE_PARAMETERS.findIndex((p) => p.id === param.id);
    if (idx !== -1) {
      setActiveParamIndex(idx);
      setStagedValue(getParamCurrentValue(param.id, settings, mode, patient));
      setControlMode('EDITING');
    }
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // ROUTE 1: Welcome Screen
  if (appStep === 'welcome') {
    return (
      <WelcomeScreen
        language={language}
        setLanguage={setLanguage}
        selectedCase={selectedCase}
        onSelectCase={handleSelectCase}
        onStartCase={() => setAppStep('intake')}
      />
    );
  }

  // ROUTE 2: Patient Intake & Medication Induction Screen
  if (appStep === 'intake') {
    return (
      <PatientIntakeScreen
        language={language}
        patientCase={selectedCase}
        meds={meds}
        setMeds={setMeds}
        settings={settings}
        setSettings={setSettings}
        onProceedToSimulation={() => {
          setSevofluraneMac(meds.volatileMac);
          setNmbLevel(Math.min(100, meds.nmbDoseMgKg * 150));
          setSedationLevel(Math.min(100, meds.inductionDoseMgKg * 45));
          setAppStep('simulation');
        }}
        onBackToWelcome={() => setAppStep('welcome')}
      />
    );
  }

  // ROUTE 3: Mechanical Ventilation Simulation Screen
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050505] text-[#E5E2E1] flex flex-col font-mono select-none">
      {/* Top Anesthesia Header */}
      <TopBar
        language={language}
        setLanguage={setLanguage}
        mode={mode}
        settings={settings}
        patient={patient}
        alarmActive={alarmActive}
        setAlarmActive={setAlarmActive}
      />

      {/* Intraoperative Clinical Scenario Challenge Bar */}
      <ClinicalScenarioBar
        language={language}
        patientCase={selectedCase}
        settings={settings}
        activeEvent={activeEvent}
        onSelectEvent={(ev) => setActiveEvent(ev)}
        onBackToIntake={() => setAppStep('intake')}
        clinicalStatusMessage={clinicalStatusMessage}
        onReconnectCircuit={() => {
          setActiveEvent(INTRAOPERATIVE_EVENTS[0]);
        }}
      />

      {/* Alarm Banner Overlay */}
      <AlarmBanner
        language={language}
        alarms={activeAlarms}
        isSilenced={isSilenced}
        onSilenceToggle={() => setIsSilenced(!isSilenced)}
      />

      {/* Main Screen Layout (Optimized for Mobile Landscape and Responsive Portrait Viewports) */}
      <main className="flex-1 p-2 md:grid md:grid-rows-12 gap-2 md:overflow-hidden overflow-y-auto max-w-[1920px] w-full mx-auto flex flex-col">
        {/* UPPER SECTION (Top 55% of height / Rows 1 to 7): Real-time Waveforms */}
        <section className="h-[240px] md:h-full md:row-span-7 w-full shrink-0 min-h-0">
          <WaveformCanvas
            settings={settings}
            patient={patient}
            mode={mode}
            language={language}
          />
        </section>

        {/* LOWER SECTION (Bottom 45% of height / Rows 8 to 12): Split into P-V Loop, Telemetry Tiles, Medications, and GE Dial */}
        <section className="flex flex-col md:grid md:grid-cols-12 md:row-span-5 w-full min-h-0 gap-2 shrink-0 md:shrink">
          {/* Lower Left Quadrant: Pressure-Volume (P-V) Loop Canvas (Cols 1 to 3) */}
          <div className="order-5 md:order-none h-[180px] md:h-full md:col-span-3 min-h-0 shrink-0">
            <PVLoopCanvas
              settings={settings}
              patient={patient}
              mode={mode}
              language={language}
            />
          </div>

          {/* Lower Middle-Left Quadrant: Numeric Telemetry & Setting Readout Tiles (Cols 4 to 7) */}
          <div className="order-2 md:order-none h-[230px] md:h-full md:col-span-4 min-h-0 shrink-0">
            <NumericTilesPanel
              physiology={physiology}
              settings={settings}
              patient={patient}
              mode={mode}
              language={language}
              controlMode={controlMode}
              activeParam={activeParam}
              stagedValue={stagedValue}
              onSelectParam={handleSelectParamDirect}
            />
          </div>

          {/* Lower Middle-Right Quadrant: Medications & Anesthesia Panel (Cols 8 to 9) */}
          <div className="order-4 md:order-none h-[210px] md:h-full md:col-span-2 min-h-0 shrink-0">
            <MedicationPanel
              language={language}
              sevofluraneMac={sevofluraneMac}
              setSevofluraneMac={setSevofluraneMac}
              nmbLevel={nmbLevel}
              administerNmb={() => setNmbLevel(100)}
              sedationLevel={sedationLevel}
              administerSedative={() => setSedationLevel(100)}
            />
          </div>

          {/* Lower Right Quadrant: Hardware Simulation Control Knob (Cols 10 to 12) */}
          <div className="order-3 md:order-none h-[250px] md:h-full md:col-span-3 min-h-0 shrink-0">
            <HardwareDial
              controlMode={controlMode}
              activeParam={activeParam}
              stagedValue={stagedValue}
              liveValue={getParamCurrentValue(activeParam.id, settings, mode, patient)}
              timeoutSec={timeoutSec}
              timeoutWarning={timeoutWarning}
              onTurn={handleTurn}
              onPush={handlePush}
            />
          </div>
        </section>
      </main>

      {/* Bottom Educational Disclaimer Footer */}
      <footer className="w-full bg-[#0A0A0A] border-t border-[#1C1C1C] py-1 px-4 text-center text-[9px] font-mono text-zinc-500 shrink-0">
        <p>{t.disclaimer}</p>
      </footer>
    </div>
  );
}

export default App;
