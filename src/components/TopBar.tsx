import React, { useState, useEffect } from 'react';
import { Activity, Languages, Bell, ShieldAlert, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { Language, VentMode, VentilatorSettings, PatientParams } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface TopBarProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  mode: VentMode;
  settings: VentilatorSettings;
  patient: PatientParams;
  alarmActive: boolean;
  setAlarmActive: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TopBar: React.FC<TopBarProps> = ({
  language,
  setLanguage,
  mode,
  settings,
  patient,
  alarmActive,
  setAlarmActive,
}) => {
  const t = TRANSLATIONS[language];
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse on small screens on initial mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, []);

  return (
    <header className="bg-[#131313] border-b border-[#2A2A2A] text-[#E5E2E1] px-4 py-2 shadow-md select-none transition-all duration-300">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          {!isCollapsed && (
            <div className="w-8 h-8 rounded bg-[#1C1B1B] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,221,221,0.2)] transition-all">
              <Activity className="w-4.5 h-4.5 animate-pulse" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white font-mono uppercase">
                {t.appTitle}
              </h1>
              {!isCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  v1.0.0
                </span>
              )}
            </div>
            {!isCollapsed && (
              <p className="text-xs text-[#839493] font-mono">
                {t.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center Controls & Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Alarm Test Button - Hide on mobile if collapsed to save space */}
          {(!isCollapsed || window.innerWidth >= 768) && (
            <button
              onClick={() => setAlarmActive(!alarmActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] md:text-xs font-mono font-medium transition-all ${
                alarmActive
                  ? 'bg-red-950 text-red-300 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-[#1C1B1B] text-[#B9CAC9] border border-[#3A4A49] hover:bg-[#2A2A2A] hover:text-white'
              }`}
              title="Toggle Alarm State for Testing"
            >
              {alarmActive ? <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> : <Bell className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{t.alarms.simulateToggle}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${alarmActive ? 'bg-red-500' : 'bg-zinc-600'}`}></span>
            </button>
          )}

          {/* Language Switcher Pill */}
          <div className="flex items-center bg-[#0E0E0E] p-0.5 rounded-full border border-[#3A4A49]">
            <Languages className="w-3 h-3 text-[#839493] ml-1.5 mr-0.5 hidden xs:inline" />
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-[10px] md:text-xs font-mono font-bold rounded-full transition-all ${
                language === 'en'
                  ? 'bg-cyan-400 text-black shadow-sm'
                  : 'text-[#839493] hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('cs')}
              className={`px-2 py-0.5 text-[10px] md:text-xs font-mono font-bold rounded-full transition-all ${
                language === 'cs'
                  ? 'bg-cyan-400 text-black shadow-sm'
                  : 'text-[#839493] hover:text-white'
              }`}
            >
              CS
            </button>
          </div>

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded bg-[#1C1B1B] border border-[#3A4A49] text-cyan-400 hover:bg-[#2A2A2A] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label={isCollapsed ? "Expand Header" : "Collapse Header"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Temporary Debug Line (Requirement: "Language pill wired to state, visible in a temporary debug line") */}
      {!isCollapsed && (
        <div className="mt-2 pt-1.5 border-t border-[#201F1F] text-[11px] font-mono text-[#839493] flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-[#0E0E0E]/60 px-3 py-1 rounded transition-all duration-300">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-bold">{t.debugLabel}:</span>
            <span>
              {t.langLabel}: <strong className="text-white uppercase">{language}</strong>
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              {t.modeLabel}: <strong className="text-amber-300 uppercase">{mode}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-zinc-400">
            <span>
              {t.paramsLabel}: FiO₂:{settings.fio2}% | f:{settings.rr}bpm | {mode === 'pc' || mode === 'ps' ? `Pinsp:${settings.pinsp}cmH₂O` : `Vt:${settings.vt}mL`} | PEEP:{settings.peep} | I:E:{settings.ieRatio}
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              {t.patientLabel}: C:{patient.compliance} mL/cmH₂O | R:{patient.resistance} cmH₂O/L/s ({patient.preset})
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
