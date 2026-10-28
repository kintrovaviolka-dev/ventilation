import React, { useState, useRef } from 'react';
import { RotateCw, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { ControlMode, ParameterSpec } from '../lib/controlSystem';
import { playDialTick, playConfirmChime, playCancelBeep } from '../lib/audioTone';

interface HardwareDialProps {
  language: Language;
  controlMode: ControlMode;
  activeParam: ParameterSpec;
  stagedValue: number | string;
  liveValue: number | string;
  timeoutSec: number;
  timeoutWarning: boolean;
  onTurn: (direction: -1 | 1) => void;
  onPush: () => void;
  onCancel?: () => void;
}

export const HardwareDial: React.FC<HardwareDialProps> = ({
  language,
  controlMode,
  activeParam,
  stagedValue,
  liveValue,
  timeoutSec,
  timeoutWarning,
  onTurn,
  onPush,
  onCancel,
}) => {
  const [knobAngle, setKnobAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const gesture = useRef<{ pointerId: number; x: number; y: number; remainder: number; dragged: boolean } | null>(null);
  const t = TRANSLATIONS[language];
  const labels: Record<string, string> = { fio2: t.console.fio2, rr: t.console.rr, vt: t.console.vt, pinsp: t.console.pinsp, peep: t.console.peep, pSupport: t.console.psupport, mode: t.modeLabel, ieRatio: t.console.ie };
  const confirmLabel = controlMode === 'EDITING'
    ? (language === 'cs' ? 'Potvrdit' : 'Confirm')
    : (language === 'cs' ? 'Upravit' : 'Edit');

  const handleTurnLeft = () => {
    setKnobAngle((prev) => prev - 22.5);
    playDialTick();
    onTurn(-1);
  };

  const handleTurnRight = () => {
    setKnobAngle((prev) => prev + 22.5);
    playDialTick();
    onTurn(1);
  };

  const handlePush = () => {
    if (controlMode === 'EDITING') {
      playConfirmChime();
    } else {
      playDialTick();
    }
    onPush();
  };

  const cancel = () => {
    gesture.current = null;
    setIsDragging(false);
    playCancelBeep();
    onCancel?.();
  };


  return (
    <div className="w-full h-full bg-[#0E0E0E] border border-[#222222] rounded-lg p-2.5 flex flex-col justify-between items-center select-none shadow-xl relative ">
      {/* Top Header & State Badge */}
      <div className="w-full flex flex-wrap gap-2 items-center justify-between border-b border-[#201F1F] pb-1.5">
        <div className="flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono text-[11px] font-bold text-cyan-300 tracking-wider uppercase">
            {language === 'cs' ? "OTOČNÝ OVLADAČ" : "GE CONTROL KNOB"}
          </span>
        </div>

        <div
          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-widest uppercase border ${
            controlMode === 'EDITING'
              ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 animate-pulse'
              : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
          }`}
        >
          {controlMode === 'EDITING' ? (language === 'cs' ? 'ÚPRAVA' : 'EDITING') : (language === 'cs' ? 'VÝBĚR' : 'SELECTING')}
        </div>
      </div>

      {/* Timeout / Revert Banner */}
      {timeoutWarning && (
        <div className="w-full bg-red-950/90 border border-red-500 text-red-200 text-[10px] font-mono py-1 px-2 rounded flex items-center gap-1 my-1 animate-bounce">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{language === 'cs' ? "ČAS VYPRŠEL: ZMĚNA ZRUŠENA" : "TIMEOUT: VALUE REVERTED"}</span>
        </div>
      )}

      {/* Selected Parameter Status Box */}
      <div className="w-full bg-[#141414] border border-[#2A2A2A] rounded p-2 flex flex-col items-center justify-center gap-0.5 my-1 text-center">
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
          {labels[activeParam.id] || activeParam.label}
        </span>

        {controlMode === 'EDITING' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 line-through">
              {liveValue} {activeParam.unit}
            </span>
            <span className="text-lg font-mono font-extrabold text-amber-400 animate-pulse bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/50">
              {stagedValue} {activeParam.unit}
            </span>
          </div>
        ) : (
          <span className="text-base font-mono font-bold text-cyan-300">
            {liveValue} {activeParam.unit}
          </span>
        )}

        {controlMode === 'EDITING' && (
          <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-amber-400">
            <span>{language === 'cs' ? "ZRUŠENÍ ZA:" : "AUTO-CANCEL IN:"}</span>
            <span className="font-bold text-amber-300 bg-amber-900/60 px-1.5 rounded">
              {timeoutSec}s
            </span>
          </div>
        )}
      </div>

      {/* Physical Hardware Dial Representation */}
      <div className="relative my-1 flex items-center justify-center">
        {/* Outer Ring */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#2A2A2A] to-[#0A0A0A] p-1 shadow-2xl border border-[#3A3A3A] flex items-center justify-center">
          {/* Inner Rotating Knob */}
          <div
            role="button"
            tabIndex={0}
            aria-label={confirmLabel}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault();
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') handleTurnLeft();
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') handleTurnRight();
              if (event.key === 'Enter' || event.key === ' ') handlePush();
              if (event.key === 'Escape') cancel();
            }}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, remainder: 0, dragged: false };
              setIsDragging(true);
            }}
            onPointerMove={(event) => {
              const current = gesture.current;
              if (!current || current.pointerId !== event.pointerId) return;
              const delta = event.clientX - current.x + current.y - event.clientY;
              current.x = event.clientX; current.y = event.clientY;
              current.remainder += delta;
              if (Math.abs(current.remainder) > 5) current.dragged = true;
              if (Math.abs(current.remainder) >= 12) {
                const direction = current.remainder > 0 ? 1 : -1;
                onTurn(direction);
                playDialTick();
                setKnobAngle((angle) => angle + direction * 22.5);
                current.remainder %= 12;
              }
            }}
            onPointerUp={(event) => {
              const current = gesture.current;
              if (!current || current.pointerId !== event.pointerId) return;
              gesture.current = null;
              setIsDragging(false);
              if (!current.dragged) handlePush();
            }}
            onPointerCancel={() => { gesture.current = null; setIsDragging(false); }}
            onLostPointerCapture={() => { gesture.current = null; setIsDragging(false); }}
            className={`w-20 h-20 rounded-full bg-gradient-to-b from-[#1F2428] to-[#0C0F12] border-2 border-cyan-500/40 flex items-center justify-center relative cursor-pointer active:scale-95 shadow-inner ${
              isDragging ? 'transition-none' : 'transition-transform duration-100'
            }`}
            style={{ touchAction: 'none', transform: `rotate(${knobAngle}deg)` }}
          >
            {/* Grip ridges on knob */}
            <div className="absolute inset-1 rounded-full border border-dashed border-zinc-700/60 pointer-events-none" />

            {/* Top Indicator Notch */}
            <div className="absolute top-1 w-2 h-4 bg-cyan-400 rounded-full shadow-glow" />

            {/* Center Push Button Emblem */}
            <div className="w-10 h-10 rounded-full bg-[#14181B] border border-cyan-400/60 flex items-center justify-center shadow-lg">
              <span className="font-mono text-[9px] font-extrabold text-cyan-300">
                {language === 'cs' ? "STISK" : "PUSH"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thumb-Accessible Control Buttons (Medical Device Layout) */}
      <div className="w-full grid grid-cols-3 gap-1.5 mt-1">
        <button
          onClick={handleTurnLeft}
          className="py-2 bg-[#1C1B1B] hover:bg-[#2A2A2A] active:bg-cyan-950 border border-[#2F2F2F] active:border-cyan-500 text-cyan-400 rounded flex flex-col items-center justify-center transition-all"
          aria-label={language === 'cs' ? 'Snížit hodnotu / předchozí parametr' : 'Decrease value / previous parameter'}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[9px] font-mono font-bold uppercase">{language === 'cs' ? "− / ZPĚT" : "◄ TURN"}</span>
        </button>

        <button
          onClick={handlePush}
          className={`py-2 border rounded flex flex-col items-center justify-center transition-all ${
            controlMode === 'EDITING'
              ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-black border-amber-300 shadow-lg animate-pulse'
              : 'bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black border-cyan-300 shadow-lg'
          }`}
          aria-label={confirmLabel}
        >
          <Check className="w-4 h-4 font-bold" />
          <span className="text-[9px] font-mono font-extrabold uppercase">
            {confirmLabel}
          </span>
        </button>

        <button
          onClick={handleTurnRight}
          className="py-2 bg-[#1C1B1B] hover:bg-[#2A2A2A] active:bg-cyan-950 border border-[#2F2F2F] active:border-cyan-500 text-cyan-400 rounded flex flex-col items-center justify-center transition-all"
          aria-label={language === 'cs' ? 'Zvýšit hodnotu / další parametr' : 'Increase value / next parameter'}
        >
          <ChevronRight className="w-4 h-4" />
          <span className="text-[9px] font-mono font-bold uppercase">{language === 'cs' ? "+ / DALŠÍ" : "TURN ►"}</span>
        </button>
      </div>

      {controlMode === 'EDITING' && <button type="button" onClick={cancel} className="mt-2 w-full rounded border border-zinc-600 text-sm text-zinc-300">
        {language === 'cs' ? 'Zrušit změnu' : 'Cancel change'}
      </button>}
      {/* Bottom Help Instruction Banner */}
      <div className="w-full text-center mt-1 pt-1 border-t border-[#1C1C1C]">
        <p className="text-[9px] font-mono text-zinc-400">
          {language === 'cs' ? 'Vyberte parametr → upravte pomocí − / + → potvrďte. Ovladač lze táhnout nebo ovládat šipkami a Enterem.' : 'Select a parameter → adjust with − / + → confirm. Drag the dial or use arrow keys and Enter.'}
        </p>
      </div>
    </div>
  );
};
