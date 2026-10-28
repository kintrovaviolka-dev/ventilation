import React from 'react';
import { CalculatedPhysiology } from '../lib/physiologyEngine';
import { VentilatorSettings, PatientParams, VentMode, Language } from '../types';
import { ParameterSpec, ControlMode, SELECTABLE_PARAMETERS, getParamCurrentValue } from '../lib/controlSystem';
import { TRANSLATIONS } from '../i18n/translations';

interface NumericTilesPanelProps {
  physiology: CalculatedPhysiology;
  settings: VentilatorSettings;
  patient: PatientParams;
  mode: VentMode;
  language: Language;
  controlMode: ControlMode;
  activeParam: ParameterSpec;
  stagedValue: number | string;
  onSelectParam: (param: ParameterSpec) => void;
}

export const NumericTilesPanel: React.FC<NumericTilesPanelProps> = ({
  physiology,
  settings,
  patient,
  mode,
  language,
  controlMode,
  activeParam,
  stagedValue,
  onSelectParam,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.cs;

  const [showAllReadouts, setShowAllReadouts] = React.useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  // Digital measured telemetry blocks (GE Monitor Style)
  const measuredReadouts = [
    { label: 'Ppeak', val: physiology.pPeak, unit: 'cmH₂O', color: 'text-yellow-400', border: 'border-yellow-500/30', isCore: true },
    { label: 'Pplat', val: physiology.pPlat, unit: 'cmH₂O', color: 'text-yellow-400', border: 'border-yellow-500/30' },
    { label: 'Pmean', val: physiology.pMean, unit: 'cmH₂O', color: 'text-yellow-400', border: 'border-yellow-500/30' },
    { label: 'PEEP', val: physiology.peep, unit: 'cmH₂O', color: 'text-yellow-400', border: 'border-yellow-500/30', isCore: true },

    { label: 'VTe', val: physiology.vTe, unit: 'mL', color: 'text-emerald-400', border: 'border-emerald-500/30', isCore: true },
    { label: 'MVe', val: physiology.mVe, unit: 'L/min', color: 'text-emerald-400', border: 'border-emerald-500/30' },
    { label: 'f (RR)', val: physiology.rrTotal, unit: 'bpm', color: 'text-emerald-400', border: 'border-emerald-500/30' },

    { label: 'FiO₂', val: `${settings.fio2}%`, unit: '', color: 'text-cyan-400', border: 'border-cyan-500/30' },
    { label: 'SpO₂', val: `${physiology.spO2}%`, unit: '', color: 'text-cyan-400', border: 'border-cyan-500/30', isCore: true },
    { label: 'EtCO₂', val: physiology.etCO2, unit: 'mmHg', color: 'text-amber-400', border: 'border-amber-500/30', isCore: true },
  ];

  const displayedReadouts = showAllReadouts
    ? measuredReadouts
    : measuredReadouts.filter((r) => r.isCore);

  return (
    <div className="w-full h-full bg-[#080808] border border-[#222222] rounded p-2 flex flex-col justify-between select-none shadow-inner ">
      {/* 1. Measured Live Telemetry Readouts (Upper half of lower-right region) */}
      <div className="mb-2">
        <div className="flex flex-wrap gap-2 items-center justify-between px-1 mb-1 border-b border-[#1F1F1F] pb-0.5">
          <span className="font-mono text-[10px] font-bold text-[#839493] uppercase flex flex-wrap items-center gap-1.5">
            {language === 'cs' ? "NAMĚŘENÉ HODNOTY" : "PATIENT VENTILATION READOUTS"}
            <button
              onClick={() => setShowAllReadouts((prev) => !prev)}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1C1C1D] hover:bg-[#2C2C2D] text-cyan-400 transition-all border border-[#2A2A2B] cursor-pointer"
            >
              {showAllReadouts
                ? (language === 'cs' ? '▲ SKRÝT POKROČILÉ' : '▲ SHOW CORE')
                : (language === 'cs' ? '▼ UKÁZAT VŠE' : '▼ SHOW ALL')}
            </button>
          </span>
          <span className="font-mono text-[9px] text-zinc-500">{language === 'cs' ? "ŽIVÁ DATA" : "LIVE SENSOR DATA"}</span>
        </div>

        <div className="telemetry-grid">
          {displayedReadouts.map((tile, idx) => (
            <div
              key={idx}
              className={`bg-[#0F0F0F] border ${tile.border} rounded p-1 flex flex-col justify-between min-h-[48px]`}
            >
              <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-tight">
                {tile.label}
              </span>
              <div className="flex flex-wrap gap-1 items-baseline justify-between mt-0.5">
                <span className={`font-mono text-sm sm:text-base font-extrabold ${tile.color}`}>
                  {tile.val}
                </span>
                {tile.unit && (
                  <span className="font-mono text-[8px] text-zinc-500 ml-0.5">
                    {tile.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Interactive Ventilator Control Setting Tiles (Lower half of lower-right region) */}
      <div>
        <div className="flex flex-wrap gap-2 items-center justify-between px-1 mb-1 border-b border-[#1F1F1F] pb-0.5">
          <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase">
            {language === 'cs' ? "NASTAVENÍ VENTILÁTORU" : "VENTILATOR CONTROL SETTINGS (DIAL TARGETS)"}
          </span>
          <span className="font-mono text-[9px] text-amber-400">{language === 'cs' ? "VYBERTE PARAMETR" : "TURN/PUSH DIAL TO EDIT"}</span>
        </div>

        <div className="settings-grid">
          {SELECTABLE_PARAMETERS.map((param) => {
            const isSelected = activeParam.id === param.id;
            const isEditingThis = isSelected && controlMode === 'EDITING';
            const liveVal = getParamCurrentValue(param.id, settings, mode, patient);

            return (
              <button
                key={param.id}
                onClick={() => onSelectParam(param)}
                className={`p-1.5 rounded border flex flex-col justify-between text-left transition-all relative overflow-hidden ${
                  isEditingThis
                    ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/80 animate-pulse shadow-lg scale-[1.02] z-20'
                    : isSelected
                    ? 'bg-[#18262E] border-cyan-400 ring-2 ring-cyan-400/60 shadow-md scale-[1.01] z-10'
                    : 'bg-[#121212] border-[#262626] hover:bg-[#1A1A1A] hover:border-zinc-500'
                }`}
              >
                {/* Tile Header */}
                <div className="flex flex-wrap gap-2 items-center justify-between w-full">
                  <span
                    className={`font-mono text-[9px] font-bold uppercase truncate ${
                      isEditingThis
                        ? 'text-amber-300'
                        : isSelected
                        ? 'text-cyan-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {param.id === 'mode' && language === 'cs' ? 'REŽIM' : param.shortLabel}
                  </span>

                  {isEditingThis && (
                    <span className="bg-amber-500 text-black font-mono font-bold text-[8px] px-1 rounded animate-ping">
                      {language === 'cs' ? "ÚPRAVA" : "EDIT"}
                    </span>
                  )}
                </div>

                {/* Tile Values Display */}
                <div className="mt-1 flex flex-wrap gap-1 items-baseline justify-between w-full">
                  {isEditingThis ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-[10px] text-zinc-500 line-through">
                        {liveVal}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-amber-300">
                        {stagedValue}
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`font-mono text-sm font-bold ${
                        isSelected ? 'text-cyan-300' : 'text-zinc-200'
                      }`}
                    >
                      {liveVal}
                    </span>
                  )}

                  {param.unit && (
                    <span className="font-mono text-[8px] text-zinc-500">
                      {param.unit}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
