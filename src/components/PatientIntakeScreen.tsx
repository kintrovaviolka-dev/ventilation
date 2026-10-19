import React, { useState } from 'react';
import { Language, PatientCase, MedicationSelection, VentilatorSettings } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { playClickBeep } from '../lib/audioTone';
import { PracticeButton } from './PracticeButton';

interface PatientIntakeScreenProps {
  language: Language;
  patientCase: PatientCase;
  meds: MedicationSelection;
  setMeds: React.Dispatch<React.SetStateAction<MedicationSelection>>;
  settings: VentilatorSettings;
  setSettings: React.Dispatch<React.SetStateAction<VentilatorSettings>>;
  onProceedToSimulation: () => void;
  onBackToWelcome: () => void;
  onOpenPractice: () => void;
}

export const PatientIntakeScreen: React.FC<PatientIntakeScreenProps> = ({
  language,
  patientCase,
  meds,
  setMeds,
  settings,
  setSettings,
  onProceedToSimulation,
  onBackToWelcome,
  onOpenPractice,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Calculate protective tidal volume ranges based on IBW
  const vtMinProtective = Math.round(patientCase.ibwKg * 6);
  const vtMaxProtective = Math.round(patientCase.ibwKg * 8);

  // Calculated absolute drug doses
  const propofolDose = Math.round(meds.inductionDoseMgKg * patientCase.ibwKg);
  const fentanylDose = Math.round(meds.opioidDoseMcgKg * patientCase.ibwKg);
  const rocuroniumDose = Math.round(meds.nmbDoseMgKg * patientCase.ibwKg);

  const handleStart = () => {
    playClickBeep();
    // Auto-align initial ventilator VT to protective 7 mL/kg IBW
    const initialProtectiveVt = Math.round(patientCase.ibwKg * 7);
    setSettings((prev) => ({
      ...prev,
      vt: Math.min(800, Math.max(200, initialProtectiveVt)),
    }));
    onProceedToSimulation();
  };

  return (
    <div className="w-screen h-screen bg-[#05080A] text-[#E5E2E1] flex flex-col justify-between p-4 font-mono select-none overflow-y-auto">
      {/* Top Navigation Bar */}
      <header className="w-full bg-[#0B1317] border border-[#1E293B] rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playClickBeep();
              onBackToWelcome();
            }}
            className="px-3 py-1 bg-[#1A262C] hover:bg-[#25363F] border border-cyan-500/40 rounded text-xs text-cyan-300 font-bold transition-all flex items-center gap-1"
          >
            ← {language === 'cs' ? 'Zpět' : 'Back'}
          </button>
          <div>
            <h1 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
              {t.intake.title}
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
              {t.intake.subtitle}
            </p>
          </div>
        </div>

        <PracticeButton language={language} onClick={onOpenPractice} />
        <div className="text-right text-[10px] font-mono text-zinc-400">
          Selected Patient: <strong className="text-cyan-300">{patientCase.name}</strong> ({patientCase.age}y / {patientCase.gender})
        </div>
      </header>

      {/* Main Split Grid: Dossier Left / Medications Right */}
      <main className="my-auto py-4 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Patient Dossier & Protective Ventilation Targets */}
        <div className="lg:col-span-5 bg-[#0B1216] border border-[#1A2830] rounded-xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-[#1D2E38] pb-2 mb-3">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                {t.intake.patientDetails}
              </span>
              <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                {patientCase.asaStatus}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Name & Demographics:</span>
                <span className="font-bold text-zinc-200">{patientCase.name}</span>
              </div>
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Surgical Procedure:</span>
                <span className="font-bold text-amber-300">{patientCase.surgery}</span>
              </div>
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Actual Weight / Height:</span>
                <span className="font-bold text-zinc-200">{patientCase.weightKg} kg / {patientCase.heightCm} cm</span>
              </div>
              <div className="flex justify-between items-center bg-[#122A36] p-2 rounded border border-cyan-500/40">
                <span className="text-cyan-300 font-bold">{t.intake.idealBodyWeight}:</span>
                <span className="font-extrabold text-cyan-300 text-sm">{patientCase.ibwKg} kg</span>
              </div>
            </div>

            {/* Protective Ventilation Calculator Box */}
            <div className="mt-4 p-3 bg-[#0D1E27] border border-cyan-500/30 rounded-lg text-xs">
              <span className="text-cyan-400 font-bold block mb-1 uppercase tracking-wide">
                LUNG-PROTECTIVE VENTILATION TARGET
              </span>
              <p className="text-[10px] text-zinc-300 mb-2 leading-relaxed">
                Tidal Volume is strictly calculated on <strong>Ideal Body Weight (IBW)</strong> to prevent volutrauma and barotrauma:
              </p>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#0A161C] p-2 rounded border border-cyan-500/20">
                  <span className="text-[9px] text-zinc-400 block">6 mL/kg IBW</span>
                  <strong className="text-emerald-400 font-mono text-sm">{vtMinProtective} mL</strong>
                </div>
                <div className="bg-[#0A161C] p-2 rounded border border-cyan-500/20">
                  <span className="text-[9px] text-zinc-400 block">8 mL/kg IBW</span>
                  <strong className="text-emerald-400 font-mono text-sm">{vtMaxProtective} mL</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#091115] border border-[#1A2830] rounded text-[10px] text-zinc-400">
            <strong className="text-zinc-200 block mb-0.5">Clinical History:</strong>
            {patientCase.history}
          </div>
        </div>

        {/* Right Column: Medication Dose Sliders & Anesthesia Induction */}
        <div className="lg:col-span-7 bg-[#0B1216] border border-[#1A2830] rounded-xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-[#1D2E38] pb-2 mb-3">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
                {t.intake.medicationTitle}
              </span>
              <span className="text-[9px] text-emerald-400 bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                INDUCTION PROTOCOL
              </span>
            </div>

            <div className="space-y-3">
              {/* 1. Hypnotic Agent */}
              <div className="bg-[#10181D] p-3 rounded-lg border border-[#1D2E38]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-300">
                    1. {t.intake.inductionAgent}: PROPOFOL 1%
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    {meds.inductionDoseMgKg} mg/kg → <strong className="text-emerald-400">{propofolDose} mg</strong>
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={2.5}
                  step={0.1}
                  value={meds.inductionDoseMgKg}
                  onChange={(e) => setMeds({ ...meds, inductionDoseMgKg: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A2830] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                  <span>1.0 mg/kg (Elderly/Instable)</span>
                  <span>2.0 mg/kg (Standard)</span>
                  <span>2.5 mg/kg (Young)</span>
                </div>
              </div>

              {/* 2. Opioid Analgesic */}
              <div className="bg-[#10181D] p-3 rounded-lg border border-[#1D2E38]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-300">
                    2. {t.intake.opioid}: FENTANYL
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    {meds.opioidDoseMcgKg} mcg/kg → <strong className="text-emerald-400">{fentanylDose} mcg</strong>
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={3.0}
                  step={0.2}
                  value={meds.opioidDoseMcgKg}
                  onChange={(e) => setMeds({ ...meds, opioidDoseMcgKg: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A2830] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                  <span>1.0 mcg/kg</span>
                  <span>2.0 mcg/kg (Intubation)</span>
                  <span>3.0 mcg/kg</span>
                </div>
              </div>

              {/* 3. Neuromuscular Blocker */}
              <div className="bg-[#10181D] p-3 rounded-lg border border-[#1D2E38]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-300">
                    3. {t.intake.nmb}: ROCURONIUM
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    {meds.nmbDoseMgKg} mg/kg → <strong className="text-emerald-400">{rocuroniumDose} mg</strong>
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.2}
                  step={0.1}
                  value={meds.nmbDoseMgKg}
                  onChange={(e) => setMeds({ ...meds, nmbDoseMgKg: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A2830] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                  <span>0.6 mg/kg (Standard)</span>
                  <span>1.0 mg/kg (RSI Intubation)</span>
                </div>
              </div>

              {/* 4. Inhalational Anesthetic Gas */}
              <div className="bg-[#10181D] p-3 rounded-lg border border-[#1D2E38]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-purple-300">
                    4. {t.intake.volatileGas}: SEVOFLURANE
                  </span>
                  <span className="text-xs font-mono text-purple-300 font-bold">
                    MAC: {meds.volatileMac} ({Math.round(meds.volatileMac * 2.0)}% Vol)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={2.0}
                  step={0.1}
                  value={meds.volatileMac}
                  onChange={(e) => setMeds({ ...meds, volatileMac: parseFloat(e.target.value) })}
                  className="w-full accent-purple-400 h-1.5 bg-[#1A2830] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Pharmacological Status Indicator */}
            <div className="mt-3 bg-[#0A1C16] border border-emerald-500/40 p-2.5 rounded-lg flex items-center justify-between text-[10px] text-emerald-300 font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{t.intake.intubationReady}</span>
              </div>
              <span className="bg-emerald-950 px-2 py-0.5 rounded text-[9px] border border-emerald-500/30">
                TOF 0/4 Twitch
              </span>
            </div>
          </div>

          {/* Action Button: Connect to Ventilator */}
          <div className="mt-4 pt-3 border-t border-[#1D2E38] flex justify-end">
            <button
              onClick={handleStart}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-extrabold text-sm rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 tracking-wider"
            >
              <span>{t.intake.startVentilationBtn}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="w-full bg-[#0B1317] border-t border-[#1E293B] py-1.5 px-4 text-center text-[9px] text-zinc-500">
        {t.disclaimer}
      </footer>
    </div>
  );
};
