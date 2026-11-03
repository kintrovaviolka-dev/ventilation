import { Language } from '../types';

interface MonitorCoverProps {
  language: Language;
  covered: boolean;
  onToggle: () => void;
}

export function MonitorCover({ language, covered, onToggle }: MonitorCoverProps) {
  return (
    <div className={`monitor-cover ${covered ? 'monitor-cover-covered' : ''}`}>
      <button
        type="button"
        className="monitor-cover-sheet"
        aria-label={language === 'cs' ? 'Odkryt monitor' : 'Reveal monitor'}
        aria-hidden={!covered}
        disabled={!covered}
        tabIndex={covered ? 0 : -1}
        onClick={onToggle}
      >
        <span>{language === 'cs' ? 'MONITOR ZAKRYT PRO VÝUKOVÉ ÚČELY' : 'MONITOR COVERED FOR TEACHING'}</span>
      </button>
    </div>
  );
}
