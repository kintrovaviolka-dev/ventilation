import React from 'react';
import { AlertTriangle, BellOff, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { ActiveAlarm } from '../lib/alarmEngine';

interface AlarmBannerProps {
  language: Language;
  alarms: ActiveAlarm[];
  isSilenced: boolean;
  onSilenceToggle: () => void;
}

export const AlarmBanner: React.FC<AlarmBannerProps> = ({
  language,
  alarms,
  isSilenced,
  onSilenceToggle,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // If no alarms are active, do not render banner (clears automatically)
  if (!alarms || alarms.length === 0) {
    return null;
  }

  // Determine highest priority alarm level (critical > warning)
  const isCritical = alarms.some((a) => a.level === 'critical');
  const primaryAlarm = alarms[0];
  const totalAlarms = alarms.length;

  const bgStyles = isCritical
    ? 'bg-red-600 border-red-400 text-white shadow-[0_0_25px_rgba(220,38,38,0.6)] animate-pulse'
    : 'bg-amber-600 border-amber-400 text-black shadow-[0_0_20px_rgba(217,119,6,0.5)]';

  const badgeStyles = isCritical
    ? 'bg-black/50 border-yellow-300/50 text-yellow-300'
    : 'bg-black/40 border-amber-900/50 text-amber-100';

  const levelLabel = isCritical
    ? t.alarms.highPriority
    : t.alarms.cautionPriority;

  return (
    <div
      className={`w-full border-b-2 px-4 py-2 flex items-center justify-between select-none z-50 transition-colors duration-300 ${bgStyles}`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-1 bg-black/30 rounded shrink-0">
          {isCritical ? (
            <AlertTriangle className="w-5 h-5 text-yellow-300 animate-bounce" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-black" />
          )}
        </div>

        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
          <span
            className={`font-mono font-bold text-xs tracking-wider uppercase px-2 py-0.5 rounded border shrink-0 ${badgeStyles}`}
          >
            {levelLabel}
          </span>

          <span className="font-mono text-sm font-bold tracking-tight truncate">
            {primaryAlarm.message}
          </span>

          <span className="font-mono text-xs opacity-90 font-semibold px-1.5 py-0.5 bg-black/30 rounded border border-white/20 shrink-0">
            [{primaryAlarm.code}]
          </span>

          {totalAlarms > 1 && (
            <span className="font-mono text-xs font-bold bg-black/60 text-white px-2 py-0.5 rounded border border-white/30 shrink-0">
              +{totalAlarms - 1} MORE
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={onSilenceToggle}
          className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold rounded border transition-all active:scale-95 ${
            isSilenced
              ? 'bg-black/80 text-yellow-400 border-yellow-400/60'
              : 'bg-black/40 hover:bg-black/70 text-white border-white/30'
          }`}
        >
          {isSilenced ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-yellow-400" />
              <span>MUTED (2m)</span>
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5 text-yellow-300" />
              <span>{t.alarms.silenceAlarm}</span>
            </>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-1 text-xs font-mono bg-black/40 px-2 py-1 rounded border border-white/10">
          <Volume2 className={`w-3.5 h-3.5 ${isSilenced ? 'text-zinc-500' : 'text-yellow-200 animate-ping'}`} />
          <span>{isSilenced ? '0 dB' : '108 dB'}</span>
        </div>
      </div>
    </div>
  );
};
