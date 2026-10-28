import { LanguageSwitcher } from './LanguageSwitcher';
import React, { useState, useEffect } from 'react';
import { Activity, Bell, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { Language, VentMode, VentilatorSettings, PatientParams } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { PracticeButton } from './PracticeButton';

interface TopBarProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  mode: VentMode;
  settings: VentilatorSettings;
  patient: PatientParams;
  alarmActive: boolean;
  setAlarmActive: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenPractice: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  language,
  setLanguage,
  mode,
  settings,
  patient,
  alarmActive,
  setAlarmActive,
  onOpenPractice,
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
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
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

            </div>
            {!isCollapsed && (
              <p className="text-xs text-[#839493] font-mono">
                {t.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <PracticeButton language={language} onClick={onOpenPractice} />
          {/* Alarm Test Button - Hide on mobile if collapsed to save space */}
          {(!isCollapsed || window.innerWidth >= 768) && (
            <button
              onClick={() => setAlarmActive(!alarmActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] md:text-xs font-mono font-medium transition-all ${
                alarmActive
                  ? 'bg-red-950 text-red-300 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-[#1C1B1B] text-[#B9CAC9] border border-[#3A4A49] hover:bg-[#2A2A2A] hover:text-white'
              }`}
              title={t.alarms.simulateToggle} aria-label={t.alarms.simulateToggle} aria-pressed={alarmActive}
            >
              {alarmActive ? <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> : <Bell className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{t.alarms.simulateToggle}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${alarmActive ? 'bg-red-500' : 'bg-zinc-600'}`}></span>
            </button>
          )}

          <LanguageSwitcher language={language} setLanguage={setLanguage} />

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded bg-[#1C1B1B] border border-[#3A4A49] text-cyan-400 hover:bg-[#2A2A2A] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-expanded={!isCollapsed} aria-label={language === 'cs' ? (isCollapsed ? 'Rozbalit záhlaví' : 'Sbalit záhlaví') : (isCollapsed ? 'Expand header' : 'Collapse header')}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

    </header>
  );
};
