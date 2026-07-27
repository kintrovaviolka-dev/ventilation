import React from 'react';
import { Language, PatientCase } from '../types';
import { PATIENT_CASES } from '../data/patientCases';
import { TRANSLATIONS } from '../i18n/translations';
import { playClickBeep } from '../lib/audioTone';

interface WelcomeScreenProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  selectedCase: PatientCase;
  onSelectCase: (c: PatientCase) => void;
  onStartCase: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  language,
  setLanguage,
  selectedCase,
  onSelectCase,
  onStartCase,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleStart = () => {
    playClickBeep();
    onStartCase();
  };

  return (
    <div className="w-screen h-screen bg-[#05080A] text-[#E5E2E1] flex flex-col justify-between p-4 font-mono select-none overflow-y-auto">
      {/* Top Standby Header Bar */}
      <header className="w-full bg-[#0B1317] border border-[#1E293B] rounded-lg p-3 flex flex-wrap items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">
              {t.welcome.title}
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
              {t.welcome.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          {/* Status Indicator */}
          <div className="bg-[#121E24] border border-cyan-500/30 px-3 py-1 rounded text-[10px] text-emerald-400 flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {t.welcome.systemReady}
          </div>

          {/* Language Switcher Button */}
          <button
            onClick={() => {
              playClickBeep();
              setLanguage(language === 'en' ? 'cs' : 'en');
            }}
            className="px-2.5 py-1 bg-[#1A262C] hover:bg-[#25363F] border border-cyan-500/40 rounded text-xs text-cyan-300 font-bold transition-all"
          >
            {language === 'en' ? '🇨🇿 ČESKY' : '🇬🇧 ENGLISH'}
          </button>
        </div>
      </header>

      {/* Main Center Content: Clinical Case Selector & Station Check */}
      <main className="my-auto py-4 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Station Telemetry & Machine Check */}
        <div className="lg:col-span-4 bg-[#0B1216] border border-[#1A2830] rounded-xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-[#1D2E38] pb-2 mb-3">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                GE CARESTATION SELF-CHECK
              </span>
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                PASSED
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Pipeline O₂ Supply:</span>
                <span className="font-bold text-emerald-400">4.2 BAR (OK)</span>
              </div>
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Air / N₂O Supply:</span>
                <span className="font-bold text-emerald-400">4.1 BAR (OK)</span>
              </div>
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Circuit Leakage Test:</span>
                <span className="font-bold text-emerald-400">&lt; 20 mL/min</span>
              </div>
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Absorber Canister:</span>
                <span className="font-bold text-cyan-300">Soda Lime Fresh</span>
              </div>
              <div className="flex justify-between items-center bg-[#101A20] p-2 rounded border border-[#1A2830]">
                <span className="text-zinc-400">Vaporizer Cassette:</span>
                <span className="font-bold text-purple-300">Sevoflurane Locked</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#0A1820] border border-cyan-500/20 rounded-lg text-[10px] text-cyan-200/80 leading-relaxed">
            <span className="text-cyan-400 font-bold block mb-1 uppercase">
              EDUCATIONAL OBJECTIVE:
            </span>
            Learn protective lung ventilation (VT 6-8 mL/kg IBW) and adapt ventilator settings (PEEP, RR, I:E, Mode) when patient physiology changes during anesthesia.
          </div>
        </div>

        {/* Right Column: Case Scenario Cards */}
        <div className="lg:col-span-8 bg-[#0B1216] border border-[#1A2830] rounded-xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-[#1D2E38] pb-2 mb-3">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
                {t.welcome.selectCase}
              </span>
              <span className="text-[10px] text-zinc-400">
                4 REALISTIC CLINICAL SCENARIOS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PATIENT_CASES.map((c) => {
                const isSelected = c.id === selectedCase.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      playClickBeep();
                      onSelectCase(c);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#122A36] border-cyan-400 ring-2 ring-cyan-400/60 shadow-lg scale-[1.01]'
                        : 'bg-[#10181D] border-[#1E2E38] hover:bg-[#16222A] hover:border-zinc-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-bold text-xs ${
                            isSelected ? 'text-cyan-300' : 'text-zinc-200'
                          }`}
                        >
                          {c.name}
                        </span>
                        <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                          {c.asaStatus}
                        </span>
                      </div>

                      <p className="text-[10px] font-bold text-amber-300 mb-1">
                        {c.surgery}
                      </p>

                      <p className="text-[9px] text-zinc-400 line-clamp-2 leading-tight">
                        {c.history}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#1C2C36] flex items-center justify-between text-[9px] font-mono text-zinc-400">
                      <span>
                        Weight: <strong className="text-zinc-200">{c.weightKg}kg</strong> (IBW: <strong className="text-cyan-300">{c.ibwKg}kg</strong>)
                      </span>
                      <span>
                        C: <strong className="text-emerald-400">{c.baselineCompliance}</strong>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button: START CASE */}
          <div className="mt-5 pt-3 border-t border-[#1D2E38] flex items-center justify-between">
            <div className="text-[10px] text-zinc-400">
              Selected Case: <strong className="text-cyan-300">{selectedCase.name}</strong> • IBW Target VT: <strong className="text-amber-300">{Math.round(selectedCase.ibwKg * 6)} - {Math.round(selectedCase.ibwKg * 8)} mL</strong>
            </div>

            <button
              onClick={handleStart}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-extrabold text-sm rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 tracking-wider"
            >
              <span>{t.welcome.startCaseBtn}</span>
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
