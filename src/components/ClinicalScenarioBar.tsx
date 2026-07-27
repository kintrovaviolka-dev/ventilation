import React, { useState } from 'react';
import { Language, PatientCase, IntraoperativeEvent, VentilatorSettings, PatientParams } from '../types';
import { INTRAOPERATIVE_EVENTS } from '../data/patientCases';
import { TRANSLATIONS } from '../i18n/translations';
import { playClickBeep } from '../lib/audioTone';

interface ClinicalScenarioBarProps {
  language: Language;
  patientCase: PatientCase;
  settings: VentilatorSettings;
  activeEvent: IntraoperativeEvent;
  onSelectEvent: (event: IntraoperativeEvent) => void;
  onBackToIntake: () => void;
  clinicalStatusMessage?: string;
  onReconnectCircuit?: () => void;
}

export const ClinicalScenarioBar: React.FC<ClinicalScenarioBarProps> = ({
  language,
  patientCase,
  settings,
  activeEvent,
  onSelectEvent,
  onBackToIntake,
  clinicalStatusMessage,
  onReconnectCircuit,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [showTip, setShowTip] = useState<boolean>(true);

  // Calculate current Vt per IBW ratio
  const vtPerIbw = (settings.vt / patientCase.ibwKg).toFixed(1);
  const isProtective = parseFloat(vtPerIbw) >= 5.8 && parseFloat(vtPerIbw) <= 8.2;

  return (
    <div className="w-full bg-[#081014] border-b border-[#1C2C36] px-3 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono select-none gap-2">
      {/* Left Section: Active Patient Brief & Protective Ratio Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            playClickBeep();
            onBackToIntake();
          }}
          className="bg-[#12222B] hover:bg-[#1A2E3A] border border-cyan-500/40 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1"
        >
          ← {patientCase.name} ({patientCase.ibwKg}kg IBW)
        </button>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-zinc-400">Target VT:</span>
          <span
            className={`font-extrabold px-1.5 py-0.5 rounded border ${
              isProtective
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
          >
            {settings.vt} mL ({vtPerIbw} mL/kg IBW)
          </span>
          {!isProtective && (
            <span className="text-[9px] text-amber-400 font-bold hidden sm:inline">
              ⚠ Aim for 6-8 mL/kg IBW ({Math.round(patientCase.ibwKg * 6)}-{Math.round(patientCase.ibwKg * 8)} mL)
            </span>
          )}
        </div>
      </div>

      {/* Center Section: Intraoperative Event Selector Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        <span className="text-[9px] text-zinc-500 font-bold uppercase mr-1 hidden md:inline">
          CLINICAL SCENARIO:
        </span>
        {INTRAOPERATIVE_EVENTS.map((ev) => {
          const isSelected = ev.id === activeEvent.id;
          return (
            <button
              key={ev.id}
              onClick={() => {
                playClickBeep();
                onSelectEvent(ev);
                setShowTip(true);
              }}
              className={`px-2 py-1 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${
                isSelected
                  ? ev.severity === 'critical'
                    ? 'bg-red-950 text-red-300 border-red-500 ring-1 ring-red-400 animate-pulse'
                    : ev.severity === 'warning'
                    ? 'bg-amber-950 text-amber-300 border-amber-500 ring-1 ring-amber-400'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400'
                  : 'bg-[#0E181F] text-zinc-400 border-[#1C2C36] hover:bg-[#15232D] hover:text-zinc-200'
              }`}
            >
              {ev.title[language] || ev.title.en}
            </button>
          );
        })}
      </div>

      {/* Right Section: Clinical Teaching Tip Toggle & Reconnect Button */}
      <div className="flex items-center gap-2">
        {activeEvent.id === 'event_disconnect' && (
          <button
            onClick={() => {
              if (onReconnectCircuit) {
                onReconnectCircuit();
              }
            }}
            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-extrabold rounded shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse transition-all"
          >
            🔧 {language === 'cs' ? 'ZNOVU PŘIPOJIT' : 'RECONNECT CIRCUIT'}
          </button>
        )}
        <button
          onClick={() => setShowTip(!showTip)}
          className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${
            showTip
              ? 'bg-purple-950 text-purple-300 border-purple-500/50'
              : 'bg-[#12222B] text-zinc-400 border-[#1C2C36]'
          }`}
        >
          💡 {language === 'cs' ? 'Nápověda' : 'Teaching Tip'}
        </button>
      </div>

      {/* Expandable Teaching Tip Banner */}
      {showTip && (
        <div className="w-full bg-[#0D1C24] border border-cyan-500/30 rounded p-2 text-[10px] text-cyan-200 flex items-start justify-between mt-1">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold text-xs mt-0.5">ℹ</span>
            <div>
              <strong className="text-cyan-300 font-bold block">
                {activeEvent.title[language] || activeEvent.title.en}:
              </strong>
              <p className="text-zinc-300 mt-0.5 leading-tight">
                {activeEvent.description[language] || activeEvent.description.en}
              </p>
              <p className="text-amber-300 font-bold mt-1">
                👉 {activeEvent.teachingPoints[language] || activeEvent.teachingPoints.en}
              </p>
              {clinicalStatusMessage && (
                <div className={`mt-1.5 p-1.5 border rounded text-[10px] font-mono leading-tight font-bold bg-[#0A161C] border-cyan-500/35 text-cyan-200`}>
                  ⚡ {clinicalStatusMessage}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowTip(false)}
            className="text-zinc-500 hover:text-zinc-300 text-xs px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
