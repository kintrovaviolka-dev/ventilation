import { useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, GraduationCap, Minus, Plus, RotateCcw } from 'lucide-react';
import { Language } from '../types';
import { PRACTICE_TEXT } from '../i18n/practice';
import {
  canScoreInduction, evaluatePractice, initialPracticeAnswers, PRACTICE_FIELDS,
  PRACTICE_SOURCES, predictedBodyWeight, PracticeField, PracticeResult, shuffledPracticeDeck,
} from '../lib/practice';

export function PracticeScreen({ language, setLanguage, onBack }: {
  language: Language;
  setLanguage: (language: Language) => void;
  onBack: () => void;
}) {
  const t = PRACTICE_TEXT[language];
  const [session, setSession] = useState(() => ({ deck: shuffledPracticeDeck(), index: 0 }));
  const [answers, setAnswers] = useState(initialPracticeAnswers);
  const [includeMedications, setIncludeMedications] = useState(false);
  const [results, setResults] = useState<PracticeResult[] | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const patient = session.deck[session.index];
  const doseEligible = canScoreInduction(patient);
  const graded = results?.filter((result) => result.status !== 'not-scored') ?? [];
  const correct = graded.filter((result) => result.status === 'in-range').length;
  const number = (value: number) => value.toLocaleString(language === 'cs' ? 'cs-CZ' : 'en-GB', { maximumFractionDigits: 1 });

  const changeAnswer = (id: PracticeField, value: string) => {
    setAnswers((previous) => ({ ...previous, [id]: value }));
    setResults(null);
  };

  const nextPatient = () => {
    setSession(({ deck, index }) => index + 1 < deck.length
      ? { deck, index: index + 1 }
      : { deck: shuffledPracticeDeck(deck[index].id), index: 0 });
    setAnswers(initialPracticeAnswers());
    setResults(null);
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: 'start' });
  };

  const renderField = (field: typeof PRACTICE_FIELDS[number]) => {
    const { id, min, max, step, unit, medication } = field;
    const result = results?.find((item) => item.id === id);
    const disabled = Boolean(medication && !doseEligible);
    const value = answers[id].trim() === '' ? NaN : Number(answers[id]);
    const hasValue = Number.isFinite(value);
    const border = result?.status === 'in-range' ? 'border-emerald-500/50'
      : result && result.status !== 'not-scored' ? 'border-amber-500/50' : 'border-[#24343E]';
    const adjust = (direction: -1 | 1) => {
      const current = hasValue ? value : min;
      const next = direction === 1
        ? min + (Math.floor((current - min) / step + 1e-8) + 1) * step
        : min + (Math.ceil((current - min) / step - 1e-8) - 1) * step;
      changeAnswer(id, String(Math.max(min, Math.min(max, next))));
    };
    const formatTarget = (value: number) => id === 'ie' ? `1:${number(value)}` : number(value);

    return (
      <div key={id} className={`rounded-xl border bg-[#101A20] p-4 ${border}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={`practice-${id}`} className="text-sm font-semibold text-zinc-200">{t.fields[id]}</label>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={`${t.decrease} ${t.fields[id]}`} disabled={disabled || (hasValue && value <= min)} onClick={() => adjust(-1)}
              className="rounded-lg border border-[#344751] p-2.5 text-cyan-300 hover:bg-cyan-950 disabled:opacity-30">
              <Minus size={16} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-1">
              {id === 'ie' && <span className="text-zinc-400">1:</span>}
              <input id={`practice-${id}`} type="number" inputMode="decimal" min={min} max={max} step={step}
                value={answers[id]} disabled={disabled} onChange={(event) => changeAnswer(id, event.target.value)}
                aria-invalid={result?.status === 'invalid'} aria-describedby={result ? `practice-result-${id}` : undefined}
                className="w-20 rounded-lg border border-[#344751] bg-[#080F13] px-2 py-2 text-center text-lg font-bold text-cyan-200 focus:outline-2 focus:outline-cyan-400 disabled:opacity-30" />
            </div>
            <button type="button" aria-label={`${t.increase} ${t.fields[id]}`} disabled={disabled || (hasValue && value >= max)} onClick={() => adjust(1)}
              className="rounded-lg border border-[#344751] p-2.5 text-cyan-300 hover:bg-cyan-950 disabled:opacity-30">
              <Plus size={16} aria-hidden="true" />
            </button>
            <span className="w-14 text-xs text-zinc-400">{unit}</span>
          </div>
        </div>
        {result && (
          <div id={`practice-result-${id}`} className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed">
            <strong className={result.status === 'in-range' ? 'text-emerald-300' : result.status === 'not-scored' ? 'text-zinc-400' : 'text-amber-300'}>
              {t.statuses[result.status]}
            </strong>
            {result.range && (
              <span className="ml-2 text-zinc-200">
                {t.expected}: {formatTarget(result.range[0])}{result.range[0] !== result.range[1] && `–${formatTarget(result.range[1])}`} {unit}
              </span>
            )}
            <p className="mt-1 text-zinc-400">{result.status === 'invalid' ? `${t.invalid} (${min}–${max}; ${step})` : t.reasons[result.reason]}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#05080A] font-mono text-[#E5E2E1]">
      <header className="sticky top-0 z-10 border-b border-[#24343E] bg-[#0B1317]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded border border-[#344751] px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-950">
              <ArrowLeft size={14} aria-hidden="true" />{t.back}
            </button>
            <GraduationCap className="hidden text-cyan-400 sm:block" aria-hidden="true" />
            <div><h1 className="text-sm font-bold text-cyan-300">{t.title}</h1><p className="text-[10px] text-zinc-400">{t.subtitle}</p></div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-400">{t.progress} {session.index + 1} {t.of} {session.deck.length}</span>
            <button type="button" onClick={() => setLanguage(language === 'cs' ? 'en' : 'cs')} className="rounded border border-[#344751] px-2 py-1 text-cyan-300">
              {language === 'cs' ? 'EN' : 'CS'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-cyan-900/60 bg-[#0B151B] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">{t.fictional}</p>
              <h2 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-bold text-cyan-200">{patient.name} · {patient.age}</h2>
              <p className="mt-1 text-xs text-amber-300">{t[patient.induction]}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>{patient.sex === 'M' ? t.male : t.female}</span>
              <span><span className="text-zinc-500">{t.height}: </span>{patient.heightCm} cm</span>
              <span><span className="text-zinc-500">{t.weight}: </span>{patient.weightKg} kg</span>
              <span className="text-zinc-400">BMI {number(patient.weightKg / (patient.heightCm / 100) ** 2)}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-200">{t.task}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t.assumptions}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#24343E] bg-black/20 p-3 text-xs">
              <p className="text-zinc-400">{t.minuteTarget}</p>
              <strong className="mt-1 block text-lg text-cyan-200">{patient.minuteVentilation.map(number).join('–')} L/min</strong>
              <p className="mt-2 leading-relaxed text-zinc-500">{t.minuteNote}</p>
            </div>
            <div className="rounded-xl border border-[#24343E] bg-black/20 p-3 text-xs">
              <p className="text-zinc-400">{t.oxygenTitle}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {patient.oxygenTrials.map((trial) => <span key={trial.fio2} className="text-cyan-200">FiO₂ {trial.fio2}% → SpO₂ {trial.spo2}%</span>)}
              </div>
              <p className="mt-2 leading-relaxed text-zinc-500">{t.oxygenTask}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">{t.convention}</p>
        </section>

        <form noValidate onSubmit={(event) => {
          event.preventDefault();
          setResults(evaluatePractice(patient, answers, includeMedications));
        }} className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">{t.ventilation}</h2>
          <div className="grid gap-3 lg:grid-cols-2">{PRACTICE_FIELDS.filter((field) => !field.medication).map(renderField)}</div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#24343E] bg-[#0B151B] p-4 text-sm text-zinc-200">
            <input type="checkbox" checked={includeMedications} onChange={(event) => { setIncludeMedications(event.target.checked); setResults(null); }} className="h-4 w-4 accent-cyan-400" />
            {t.medications}
          </label>
          {includeMedications && (
            <section className="space-y-3">
              <p className="text-xs leading-relaxed text-zinc-400">{t.medicationTask}</p>
              {!doseEligible && <p className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200">{t.individual}</p>}
              <div className="grid gap-3 lg:grid-cols-2">{PRACTICE_FIELDS.filter((field) => field.medication).map(renderField)}</div>
            </section>
          )}
          <div aria-live="polite" aria-atomic="true">
            {results && (
              <div className="rounded-xl border border-cyan-900/60 bg-[#0B151B] p-4">
                <p className="text-xs text-zinc-400">{t.result}</p>
                <p className="mt-1 text-lg font-bold text-cyan-200">{correct}/{graded.length} {t.score}</p>
                <p className="mt-2 text-xs text-zinc-400">PBW: {number(predictedBodyWeight(patient))} kg</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-black hover:bg-cyan-300">
              <Check size={18} aria-hidden="true" />{t.evaluate}
            </button>
            {results && <button type="button" onClick={() => setResults(null)} className="inline-flex items-center gap-2 rounded-xl border border-[#344751] px-4 py-3 text-sm text-zinc-300 hover:bg-[#101A20]">
              <RotateCcw size={16} aria-hidden="true" />{t.retry}
            </button>}
            <button type="button" onClick={nextPatient} className="inline-flex items-center gap-2 rounded-xl border border-cyan-700/50 px-4 py-3 text-sm text-cyan-300 hover:bg-cyan-950">
              {t.next}<ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
        <details className="rounded-xl border border-[#24343E] p-4 text-xs text-zinc-400">
          <summary className="cursor-pointer font-bold text-cyan-300">{t.sources}</summary>
          <p className="mt-3 leading-relaxed">{t.sourceNote}</p>
          <ul className="mt-3 space-y-2">{PRACTICE_SOURCES.map((source) => (
            <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-100">{source.title}</a></li>
          ))}</ul>
        </details>
        <p className="pb-4 text-xs leading-relaxed text-zinc-500">{t.disclaimer}</p>
      </main>
    </div>
  );
}
