import { Language } from '../types';
import { MEDICATIONS, MedicationId } from '../lib/medicationModel';
export function MedicationPackage({ medication, language, compact = false }: {
  medication: MedicationId;
  language: Language;
  compact?: boolean;
}) {
  const palette: Record<MedicationId, { main: string; accent: string; type: 'ampoule' | 'box' | 'vial' }> = {
    propofol: { main: '#57d5cb', accent: '#e8ffff', type: 'ampoule' },
    sufentanil: { main: '#f0a74c', accent: '#fff1cf', type: 'ampoule' },
    rocuronium: { main: '#a78bfa', accent: '#f0eaff', type: 'vial' },
    norepinephrine: { main: '#f07883', accent: '#ffe9ec', type: 'box' },
    atropine: { main: '#80b9ff', accent: '#e8f4ff', type: 'ampoule' },
  };
  const color = palette[medication];
  const label = MEDICATIONS[medication].label[language].toUpperCase();
  return (
    <svg
      className={`medication-package-art ${compact ? 'is-compact' : ''}`}
      viewBox="0 0 120 90"
      role="img"
      aria-label={`${label} ${language === 'cs' ? 'výukové balení' : 'educational package'}`}
    >
      <defs>
        <linearGradient id={`package-gloss-${medication}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".22" />
          <stop offset=".45" stopColor="#ffffff" stopOpacity=".02" />
          <stop offset="1" stopColor="#000000" stopOpacity=".24" />
        </linearGradient>
      </defs>
      {color.type === 'box' ? (
        <g>
          <path d="M25 19 83 11l15 9v49l-58 9-15-9Z" fill={color.main} stroke={color.accent} strokeOpacity=".7" />
          <path d="m83 11 15 9-58 9-15-10Z" fill={color.accent} fillOpacity=".75" />
          <path d="M40 29v49l58-9V20Z" fill={`url(#package-gloss-${medication})`} />
          <rect x="44" y="39" width="42" height="22" rx="2" fill="#111820" fillOpacity=".88" />
          <text x="65" y="48" textAnchor="middle" fill={color.accent} fontSize="5.5" fontWeight="800">{label}</text>
          <text x="65" y="56" textAnchor="middle" fill="#c8d4d8" fontSize="4">SIMULATION</text>
          <path d="m25 19 15 10v49L25 68Z" fill="#ffffff" fillOpacity=".13" />
        </g>
      ) : color.type === 'vial' ? (
        <g>
          <rect x="43" y="13" width="34" height="12" rx="3" fill="#dbe8f5" />
          <path d="M47 25h26v8l9 8v33a7 7 0 0 1-7 7H45a7 7 0 0 1-7-7V41l9-8Z" fill={color.main} stroke={color.accent} strokeOpacity=".8" />
          <path d="M47 25h26v8H47z" fill="#f3f5ff" fillOpacity=".58" />
          <rect x="41" y="46" width="38" height="19" rx="2" fill="#15121e" fillOpacity=".9" />
          <text x="60" y="54" textAnchor="middle" fill={color.accent} fontSize="5.5" fontWeight="800">{label}</text>
          <text x="60" y="61" textAnchor="middle" fill="#d6d1e4" fontSize="4">SIMULATION</text>
          <path d="M49 35v34" stroke="#fff" strokeOpacity=".26" strokeWidth="3" />
        </g>
      ) : (
        <g>
          <path d="M57 10h7v10l5 8v43a7 7 0 0 1-7 7h-5a7 7 0 0 1-7-7V28l7-8Z" fill={color.main} stroke={color.accent} strokeOpacity=".85" />
          <path d="M55 10h11v7H55z" fill="#dbe8e9" />
          <path d="M57 20h7v9h-7z" fill={color.accent} fillOpacity=".7" />
          <path d="M53 30h15v36H53z" fill="#fff" fillOpacity=".88" />
          <text x="60.5" y="42" textAnchor="middle" fill="#182329" fontSize="4.4" fontWeight="800">{label}</text>
          <path d="M56 47h9" stroke={color.main} strokeWidth="2" />
          <text x="60.5" y="57" textAnchor="middle" fill="#4a5960" fontSize="3.5">SIMULATION</text>
          <path d="M53 31v32" stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
