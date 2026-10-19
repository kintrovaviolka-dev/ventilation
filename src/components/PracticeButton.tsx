import { GraduationCap } from 'lucide-react';
import { Language } from '../types';
import { PRACTICE_TEXT } from '../i18n/practice';

export function PracticeButton({ language, onClick }: { language: Language; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 focus-visible:outline-2 focus-visible:outline-cyan-300"
    >
      <GraduationCap size={15} aria-hidden="true" />
      {PRACTICE_TEXT[language].open}
    </button>
  );
}
