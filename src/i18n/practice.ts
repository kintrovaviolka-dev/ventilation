import { Language } from '../types';
import { PracticeField, PracticeReason, PracticeStatus } from '../lib/practice';

interface PracticeTranslations {
  open: string;
  title: string;
  subtitle: string;
  back: string;
  patient: string;
  fictional: string;
  age: string;
  male: string;
  female: string;
  height: string;
  weight: string;
  routine: string;
  rsi: string;
  assumptions: string;
  task: string;
  minuteTarget: string;
  minuteNote: string;
  oxygenTitle: string;
  oxygenTask: string;
  convention: string;
  medications: string;
  medicationTask: string;
  individual: string;
  ventilation: string;
  evaluate: string;
  next: string;
  retry: string;
  progress: string;
  of: string;
  score: string;
  result: string;
  expected: string;
  invalid: string;
  decrease: string;
  increase: string;
  sources: string;
  sourceNote: string;
  disclaimer: string;
  fields: Record<PracticeField, string>;
  statuses: Record<PracticeStatus, string>;
  reasons: Record<PracticeReason, string>;
}

export const PRACTICE_TEXT: Record<Language, PracticeTranslations> = {
  cs: {
    open: 'Procvičování', title: 'Nastav a vyhodnoť', subtitle: 'Trénink paměti · pevná pravidla · bez AI',
    back: 'Zpět', patient: 'Pacient', fictional: 'Fiktivní výukový profil',
    age: 'Věk', male: 'Muž', female: 'Žena', height: 'Výška', weight: 'Skutečná hmotnost',
    routine: 'Běžný úvod do CA · plánovaný výkon',
    rsi: 'RSI · urgentní výkon, pacient není lačný',
    assumptions: 'Dospělý, oběhově stabilní, bez šoku, bez plicní obstrukce či ARDS, bez orgánového selhání, alergií a lékových interakcí. Nejde o těhotnou pacientku. Vyšší věk a nadváhu nelze ignorovat při dávkování.',
    task: 'Nastav počáteční objemově řízenou ventilaci po intubaci. Nejde o preoxygenaci ani řešení akutní hypoxémie.',
    minuteTarget: 'Zadaný cíl minutové ventilace',
    minuteNote: 'Tento cíl je údaj úlohy, nikoli odhad potřeb pacienta z jeho hmotnosti. Frekvenci posuzujeme společně s tebou zvoleným VT.',
    oxygenTitle: 'Fiktivní naměřená odpověď při jinak stejných podmínkách',
    oxygenTask: 'Vyber nejnižší z doložených FiO₂, při které je SpO₂ 94–98 %. Mezi měřeními neodhadujeme odpověď plic.',
    convention: 'Pro základní úlohy používáme standardní I:E 1:2. PEEP se hodnotí jako výchozí nastavení před individuální titrací.',
    medications: 'Procvičit také úvodní dávky léčiv',
    medicationTask: 'Zadej celkovou intravenózní dávku v mg, nikoli mg/kg nebo mL. Propofol: orientační celková potřeba při titrovaném úvodu. Rokuronium: standardní dávka podle uvedené sekvence, u RSI cíl intubace za 60 s. Nejde o kompletní anestetický plán.',
    individual: 'Léčiva se u tohoto profilu neznámkují: věk ≥55 let, obezita nebo hmotnost ≥130 % ideální hmotnosti vyžadují individuální postup. SPC nedává univerzální interval pro prostý přepočet obou léčiv.',
    ventilation: 'Parametry ventilace', evaluate: 'Vyhodnotit', next: 'Další pacient', retry: 'Zkusit znovu',
    progress: 'Profil', of: 'z', score: 'hodnocených hodnot v cíli', result: 'Výsledek podle pravidel úlohy',
    expected: 'Přijímaný cíl', invalid: 'Zadej konečné číslo v povoleném rozsahu a kroku ovládání.',
    decrease: 'Snížit', increase: 'Zvýšit',
    sources: 'Pravidla a zdroje', sourceNote: 'Pravidla ověřena 18. 10. 2026. Intervaly se zarovnávají dovnitř na krok ovládání; jednotlivá cílová dávka rokuronia se zaokrouhluje na 1 mg. Cíl minutové ventilace, kyslíková měření a konvence I:E jsou součástí zadání, nikoli doporučení pro všechny pacienty.',
    disclaimer: 'Pouze procvičování na fiktivních dospělých. „V cíli“ neznamená klinicky bezpečný nebo úplný léčebný plán. Skutečné nastavení a dávky vyžadují kvalifikovaného anesteziologa, monitoraci, titraci a místní protokol.',
    fields: { vt: 'Dechový objem · VT', rr: 'Dechová frekvence', peep: 'PEEP', fio2: 'FiO₂', ie: 'Poměr I:E', propofol: 'Propofol', rocuronium: 'Rokuronium' },
    statuses: { low: 'Pod cílem', 'in-range': 'V cílovém intervalu', high: 'Nad cílem', invalid: 'Neplatná hodnota', 'not-scored': 'Nehodnoceno' },
    reasons: {
      vt: 'Počáteční protektivní VT: 6–8 mL/kg predikované hmotnosti (PBW), ne skutečné hmotnosti. PBW: muž 50 + 0,91 × (výška − 152,4); žena 45,5 + 0,91 × (výška − 152,4).',
      rr: 'Minutová ventilace = VT × frekvence / 1000. Interval frekvence se dopočítává ze zadaného cíle a aktuálního VT. Klinicky se dále titruje podle CO₂ a mechaniky dýchání.',
      peep: 'Výchozí PEEP 5 cmH₂O podle doporučení pro počáteční protektivní ventilaci. Vyšší PEEP může být klinicky vhodný po individuální titraci; zde se zkouší jen výchozí hodnota.',
      fio2: 'Cílem je nejnižší doložená FiO₂ se SpO₂ 94–98 %. „Nad cílem“ znamená vyšší než požaduje tato úloha, ne automaticky toxickou koncentraci. Nejde o preoxygenaci.',
      ie: 'Cíl 1:2 je výslovná konvence tohoto základního zadání, nikoli univerzální optimum. U obstrukce a dalších stavů by se poměr upravoval.',
      propofol: 'SPC: u většiny dospělých mladších 55 let celková potřeba při úvodu 1,5–2,5 mg/kg skutečné hmotnosti, titrovaně podle účinku. Nejde o pokyn podat jednorázový bolus.',
      rocuronium: 'SPC Esmeron: běžná intubace 0,6 mg/kg, zvolený standard pro RSI s cílem 60 s je 1,0 mg/kg. Hodnotíme tento konkrétní standard, nikoli všechny klinicky použitelné dávky.',
      individual: 'U tohoto profilu nelze zvolená SPC převést na spolehlivý univerzální interval. Dávku i rychlost podání je nutné individualizovat; nejsou součástí skóre.',
      needsVt: 'Nejprve nastav VT do protektivního intervalu. Teprve pak lze smysluplně vyhodnotit frekvenci pro zadanou minutovou ventilaci.',
    },
  },
  en: {
    open: 'Practice', title: 'Set and check', subtitle: 'Recall practice · fixed rules · no AI',
    back: 'Back', patient: 'Patient', fictional: 'Fictional teaching profile',
    age: 'Age', male: 'Male', female: 'Female', height: 'Height', weight: 'Actual weight',
    routine: 'Routine induction · elective procedure', rsi: 'RSI · urgent procedure, non-fasted patient',
    assumptions: 'Adult, haemodynamically stable, no shock, obstructive lung disease, ARDS, organ failure, allergies or drug interactions. Not pregnant. Age and excess weight still matter for dosing.',
    task: 'Set initial volume-controlled ventilation after intubation. This is not preoxygenation or treatment of acute hypoxaemia.',
    minuteTarget: 'Assigned minute ventilation target',
    minuteNote: 'This is a supplied exercise target, not an estimate of patient requirements from weight. Rate is assessed together with your chosen VT.',
    oxygenTitle: 'Fictional observed response with other conditions unchanged',
    oxygenTask: 'Choose the lowest documented FiO₂ achieving SpO₂ 94–98%. We do not infer lung response between observations.',
    convention: 'Basic exercises use the convention I:E 1:2. PEEP is assessed as an initial setting before individual titration.',
    medications: 'Also practise induction doses',
    medicationTask: 'Enter total intravenous doses in mg, not mg/kg or mL. Propofol: approximate total requirement during titrated induction. Rocuronium: the standard dose for the stated sequence, targeting intubation at 60 s for RSI. This is not a complete anaesthetic plan.',
    individual: 'Drug doses are not graded for this profile: age ≥55, obesity or weight ≥130% of ideal weight require an individual approach. The SmPCs do not provide a universal interval for simple weight scaling of both drugs.',
    ventilation: 'Ventilation settings', evaluate: 'Check answers', next: 'Next patient', retry: 'Try again',
    progress: 'Profile', of: 'of', score: 'graded values on target', result: 'Result against exercise rules',
    expected: 'Accepted target', invalid: 'Enter a finite number within the control bounds and step.',
    decrease: 'Decrease', increase: 'Increase',
    sources: 'Rules and sources', sourceNote: 'Rules checked 18 October 2026. Intervals are rounded inward to the control step; a single rocuronium target is rounded to 1 mg. Minute ventilation targets, oxygen observations and the I:E convention are exercise inputs, not universal patient recommendations.',
    disclaimer: 'Fictional adult education only. “On target” does not establish a safe or complete clinical plan. Real settings and doses require a qualified anaesthetist, monitoring, titration and local protocols.',
    fields: { vt: 'Tidal volume · VT', rr: 'Respiratory rate', peep: 'PEEP', fio2: 'FiO₂', ie: 'I:E ratio', propofol: 'Propofol', rocuronium: 'Rocuronium' },
    statuses: { low: 'Below target', 'in-range': 'Within target', high: 'Above target', invalid: 'Invalid value', 'not-scored': 'Not graded' },
    reasons: {
      vt: 'Initial protective VT: 6–8 mL/kg predicted body weight (PBW), not actual weight. PBW: male 50 + 0.91 × (height − 152.4); female 45.5 + 0.91 × (height − 152.4).',
      rr: 'Minute ventilation = VT × rate / 1000. The rate interval follows the supplied target and current VT. Clinically, further titration uses CO₂ and respiratory mechanics.',
      peep: 'Start PEEP at 5 cmH₂O per initial protective ventilation guidance. Higher PEEP may be appropriate after individual titration; this task only asks for the initial value.',
      fio2: 'Choose the lowest documented FiO₂ achieving SpO₂ 94–98%. “Above target” means higher than requested here, not automatically toxic. This is not preoxygenation.',
      ie: '1:2 is the explicit convention of this basic exercise, not a universal optimum. Obstruction and other conditions may require different ratios.',
      propofol: 'SmPC: most adults younger than 55 require a total 1.5–2.5 mg/kg actual weight for induction, titrated to effect. This is not an instruction to give a single bolus.',
      rocuronium: 'Esmeron SmPC: routine intubation 0.6 mg/kg; the selected RSI standard targeting 60 s is 1.0 mg/kg. We grade this specific standard, not every clinically usable dose.',
      individual: 'For this profile, the selected SmPCs cannot support a universal numeric interval. Dose and administration rate require individualisation and are excluded from the score.',
      needsVt: 'First select a protective VT. Only then can rate be meaningfully assessed against the assigned minute ventilation target.',
    },
  },
};
