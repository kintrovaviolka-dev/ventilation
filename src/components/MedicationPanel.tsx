import React from 'react';
import { Syringe, Shield, Activity, Flame } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { playClickBeep, playConfirmChime } from '../lib/audioTone';

interface MedicationPanelProps {
  language: Language;
  sevofluraneMac: number;
  setSevofluraneMac: (mac: number) => void;
  nmbLevel: number;
  administerNmb: () => void;
  sedationLevel: number;
  administerSedative: () => void;
}

export const MedicationPanel: React.FC<MedicationPanelProps> = ({
  language,
  sevofluraneMac,
  setSevofluraneMac,
  nmbLevel,
  administerNmb,
  sedationLevel,
  administerSedative,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Determine Train-of-Four twitches based on NMB Level
  let tofTwitches = '4/4';
  let tofColor = 'text-red-400';
  let statusText = language === 'cs' ? 'Aktivní (nebezpečí probuzení)' : 'Active (risk of bucking)';

  if (nmbLevel > 85) {
    tofTwitches = '0/4';
    tofColor = 'text-emerald-400';
    statusText = language === 'cs' ? 'Plná svalová relaxace' : 'Deep Block (Safe)';
  } else if (nmbLevel > 70) {
    tofTwitches = '1/4';
    tofColor = 'text-teal-400';
    statusText = language === 'cs' ? 'Hluboká relaxace' : 'Moderate Block';
  } else if (nmbLevel > 60) {
    tofTwitches = '2/4';
    tofColor = 'text-yellow-400';
    statusText = language === 'cs' ? 'Nastupující zotavení' : 'Recovery Initiated';
  } else if (nmbLevel > 40) {
    tofTwitches = '3/4';
    tofColor = 'text-amber-400';
    statusText = language === 'cs' ? 'Částečné zotavení' : 'Shallow Block';
  }

  // Sedation status
  const isSedated = sedationLevel > 35;
  const gasLevelPercentage = Math.round((sevofluraneMac / 2.0) * 100);

  const handleNmbBolus = () => {
    playConfirmChime();
    administerNmb();
  };

  const handleSedativeBolus = () => {
    playConfirmChime();
    administerSedative();
  };

  return (
    <div className="w-full h-full bg-[#080808] border border-[#222222] rounded p-2 flex flex-col justify-between select-none shadow-inner md:overflow-y-auto overflow-hidden">
      {/* Panel Title */}
      <div className="mb-2">
        <div className="flex items-center justify-between px-1 mb-1 border-b border-[#1F1F1F] pb-0.5">
          <span className="font-mono text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
            <Syringe className="w-3.5 h-3.5" />
            {language === 'cs' ? 'ANESTEZIE & FARMAKOTERAPIE' : 'ANESTHESIA & MEDICATIONS'}
          </span>
          <span className="font-mono text-[9px] text-zinc-500">BOLUS & VAPORIZER</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5">
        {/* 1. Sevoflurane Vaporizer Control */}
        <div className="bg-[#121212] border border-purple-500/20 rounded p-2 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-mono font-bold text-zinc-200">
                {language === 'cs' ? 'Vaporizér (Sevofluran)' : 'Volatile (Sevoflurane)'}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/30">
              {sevofluraneMac.toFixed(1)} MAC
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.1}
              value={sevofluraneMac}
              onChange={(e) => {
                playClickBeep();
                setSevofluraneMac(parseFloat(e.target.value));
              }}
              className="flex-1 h-1.5 accent-purple-500 bg-[#1F1F1F] rounded cursor-pointer"
            />
          </div>

          <div className="w-full bg-zinc-950 rounded-full h-1 overflow-hidden">
            <div
              className="bg-purple-500 h-full transition-all duration-300"
              style={{ width: `${gasLevelPercentage}%` }}
            />
          </div>
        </div>

        {/* 2. Neuromuscular Blocker (Rocuronium) */}
        <div className="bg-[#121212] border border-emerald-500/20 rounded p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              {language === 'cs' ? 'Svalová relaxace (NMB)' : 'NMB Block (Rocuronium)'}
            </span>
            <span className={`font-mono text-[10px] font-extrabold px-1 rounded ${tofColor} bg-black/40 border border-zinc-800`}>
              TOF: {tofTwitches}
            </span>
          </div>

          {/* Progress Bar of NMB Level */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${nmbLevel}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-zinc-400 min-w-[24px] text-right">
              {Math.round(nmbLevel)}%
            </span>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-[8px] font-mono text-zinc-500 truncate max-w-[100px]">
              {statusText}
            </span>
            <button
              onClick={handleNmbBolus}
              className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-mono text-[9px] font-bold rounded active:scale-95 transition-all"
            >
              + BOLUS (50mg)
            </button>
          </div>
        </div>

        {/* 3. Sedative (Propofol) & Analgesic (Fentanyl) */}
        <div className="bg-[#121212] border border-cyan-500/20 rounded p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              {language === 'cs' ? 'Hloubka sedace / analgezie' : 'Sedation / Analgesia'}
            </span>
            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded ${isSedated ? 'bg-cyan-950 text-cyan-300' : 'bg-red-950 text-red-300 animate-pulse'}`}>
              {isSedated ? (language === 'cs' ? 'SPÁNEK' : 'ASLEEP') : (language === 'cs' ? 'BDĚLÝ' : 'AWAKE')}
            </span>
          </div>

          {/* Progress Bar of Sedation */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
              <div
                className="bg-cyan-500 h-full transition-all duration-500"
                style={{ width: `${sedationLevel}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-zinc-400 min-w-[24px] text-right">
              {Math.round(sedationLevel)}%
            </span>
          </div>

          <div className="flex justify-end gap-1 mt-1">
            <button
              onClick={handleSedativeBolus}
              className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-mono text-[9px] font-bold rounded active:scale-95 transition-all"
            >
              + SEDATIVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
