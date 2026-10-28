import React from 'react';
import { Language } from '../types';

export function LanguageSwitcher({ language, setLanguage }: {
  language: Language; setLanguage: (language: Language) => void;
}) {
  return <div className="inline-flex shrink-0 gap-1 rounded-lg border border-cyan-800 bg-[#0E181F] p-1" role="group" aria-label={language === 'cs' ? 'Jazyk' : 'Language'}>
    {(['cs', 'en'] as const).map((lang) => <button key={lang} type="button" lang={lang}
      aria-pressed={language === lang} onClick={() => setLanguage(lang)}
      className={`rounded px-3 py-2 text-xs font-bold ${language === lang ? 'bg-cyan-400 text-black' : 'text-cyan-200 hover:bg-cyan-950'}`}>
      {lang === 'cs' ? 'Čeština' : 'English'}
    </button>)}
  </div>;
}
