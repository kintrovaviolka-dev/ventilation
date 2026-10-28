import { Language } from '../types';

export interface TranslationDictionary {
  appTitle: string;
  subtitle: string;
  modeLabel: string;
  debugLabel: string;
  langLabel: string;
  paramsLabel: string;
  patientLabel: string;
  disclaimer: string;

  welcome: {
    title: string;
    subtitle: string;
    systemReady: string;
    startCaseBtn: string;
    selectCase: string;
    ibwFormulaTip: string;
    systemCheck: string;
  };

  intake: {
    title: string;
    subtitle: string;
    patientDetails: string;
    idealBodyWeight: string;
    targetVtRange: string;
    medicationTitle: string;
    inductionAgent: string;
    opioid: string;
    nmb: string;
    volatileGas: string;
    calculateDose: string;
    intubationReady: string;
    startVentilationBtn: string;
  };

  events: {
    title: string;
    normal: string;
    bronchospasm: string;
    atelectasis: string;
    bucking: string;
    disconnect: string;
    recruitment: string;
  };

  modes: {
    vc: string;
    pc: string;
    simv: string;
    ps: string;
  };
  modeShort: {
    vc: string;
    pc: string;
    simv: string;
    ps: string;
  };
  modeDesc: {
    vc: string;
    pc: string;
    simv: string;
    ps: string;
  };

  monitors: {
    ppeak: { title: string; subtitle: string; desc: string; unit: string };
    pplat: { title: string; subtitle: string; desc: string; unit: string };
    pmean: { title: string; subtitle: string; desc: string; unit: string };
    peep: { title: string; subtitle: string; desc: string; unit: string };
    vte: { title: string; subtitle: string; desc: string; unit: string };
    mv: { title: string; subtitle: string; desc: string; unit: string };
    rrTotal: { title: string; subtitle: string; desc: string; unit: string };
    compliance: { title: string; subtitle: string; desc: string; unit: string };
    spo2: { title: string; subtitle: string; desc: string; unit: string };
    etco2: { title: string; subtitle: string; desc: string; unit: string };
    pfRatio: { title: string; subtitle: string; desc: string; unit: string };
  };

  waveforms: {
    pressureTime: string;
    flowTime: string;
    volumeTime: string;
    channelPlaceholder: string;
    yAxisLabel: string;
    xAxisLabel: string;
    bufferReady: string;
  };

  console: {
    title: string;
    fio2: string;
    fio2Desc: string;
    rr: string;
    rrDesc: string;
    vt: string;
    vtDesc: string;
    pinsp: string;
    pinspDesc: string;
    peep: string;
    peepDesc: string;
    ie: string;
    ieDesc: string;
    psupport: string;
    psupportDesc: string;
    targetVolume: string;
    inspiratoryPressure: string;
    units: {
      percent: string;
      bpm: string;
      ml: string;
      cmh2o: string;
      ratio: string;
    };
  };

  patient: {
    title: string;
    compliance: string;
    complianceDesc: string;
    resistance: string;
    resistanceDesc: string;
    presets: string;
    presetNames: {
      normal: string;
      ards: string;
      copd: string;
      restrictive: string;
      custom: string;
    };
    status: {
      normal: string;
      ards: string;
      copd: string;
      restrictive: string;
      custom: string;
    };
    activeModelLabel: string;
  };

  alarms: {
    title: string;
    noAlarms: string;
    highPressure: string;
    lowSpO2: string;
    apnea: string;
    lowMV: string;
    highRR: string;
    circuitDisconnect: string;
    simulateToggle: string;
    silenceAlarm: string;
    highPriority: string;
    cautionPriority: string;
    etco2High: string;
    etco2Low: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    appTitle: 'Anesthesia & Mechanical Ventilation Simulator',
    subtitle: 'GE Datex-Ohmeda Station • Interactive Clinical Trainer',
    modeLabel: 'Ventilation Mode',
    debugLabel: 'STATE DEBUG LINE',
    langLabel: 'Lang',
    paramsLabel: 'Params',
    patientLabel: 'Patient',
    disclaimer: 'Educational simulator based on simplified mathematical physiological models. Not intended for clinical diagnosis, patient treatment, or real ventilator titration.',

    welcome: {
      title: 'ANESTHESIA CARESTATION 650',
      subtitle: 'INTEGRATED MECHANICAL VENTILATION SIMULATOR',
      systemReady: 'VENTILATOR SELF-CHECK PASSED • SYSTEM READY',
      startCaseBtn: 'START CASE',
      selectCase: 'SELECT CLINICAL SCENARIO',
      ibwFormulaTip: 'Calculates Ideal Body Weight (IBW) to prevent Ventilator-Induced Lung Injury (VILI).',
      systemCheck: 'O₂ / N₂O Supply: 4.2 Bar • Circle Absorber: Active • Vaporizer: Engaged',
    },

    intake: {
      title: 'PATIENT ADMISSION & INDUCTION',
      subtitle: 'VERIFY PATIENT PARAMETERS & ADMINISTER INDUCTION DRUGS',
      patientDetails: 'Patient Dossier',
      idealBodyWeight: 'Ideal Body Weight (IBW)',
      targetVtRange: 'Target Protective Tidal Volume (6-8 mL/kg IBW)',
      medicationTitle: 'Anesthesia Induction & Neuromuscular Blockade',
      inductionAgent: 'Hypnotic / Sedative',
      opioid: 'Opioid Analgesic',
      nmb: 'Neuromuscular Blocker (NMB)',
      volatileGas: 'Inhalational Anesthetic Gas',
      calculateDose: 'Calculated Dose',
      intubationReady: 'Neuromuscular Blockade Complete • Intubation Ready',
      startVentilationBtn: 'CONNECT TO MECHANICAL VENTILATOR',
    },

    events: {
      title: 'INTRAOPERATIVE CLINICAL SCENARIOS',
      normal: 'Stable Baseline',
      bronchospasm: 'Acute Bronchospasm',
      atelectasis: 'Lung Atelectasis / Low Compliance',
      bucking: 'Patient Bucking / Spontaneous Effort',
      disconnect: 'Circuit Disconnect',
      recruitment: 'Recruitment Maneuver / Bronchodilator',
    },

    modes: {
      vc: 'Volume Control (VC-CMV)',
      pc: 'Pressure Control (PC-CMV)',
      simv: 'SIMV (Vol/Press)',
      ps: 'Pressure Support (PSV)',
    },
    modeShort: {
      vc: 'VC-CMV',
      pc: 'PC-CMV',
      simv: 'SIMV',
      ps: 'PSV',
    },
    modeDesc: {
      vc: 'Delivers fixed tidal volume at set rate regardless of patient effort.',
      pc: 'Delivers target inspiratory pressure for set inspiratory time.',
      simv: 'Synchronizes mandatory breaths with spontaneous breathing attempts.',
      ps: 'Patient-triggered, pressure-boosted spontaneous ventilation.',
    },

    monitors: {
      ppeak: {
        title: 'Ppeak',
        subtitle: 'Peak Pressure',
        desc: 'Maximum pressure during inspiration',
        unit: 'cmH₂O',
      },
      pplat: {
        title: 'Pplat',
        subtitle: 'Plateau Pressure',
        desc: 'End-inspiratory hold alveolar pressure',
        unit: 'cmH₂O',
      },
      pmean: {
        title: 'Pmean',
        subtitle: 'Mean Airway Pressure',
        desc: 'Average airway pressure over breath cycle',
        unit: 'cmH₂O',
      },
      peep: {
        title: 'PEEP',
        subtitle: 'PEEP / CPAP',
        desc: 'Baseline positive end-expiratory pressure',
        unit: 'cmH₂O',
      },
      vte: {
        title: 'VTe',
        subtitle: 'Expiratory Tidal Volume',
        desc: 'Exhaled gas volume per breath',
        unit: 'mL',
      },
      mv: {
        title: 'MVe',
        subtitle: 'Minute Ventilation',
        desc: 'Total exhaled volume per minute',
        unit: 'L/min',
      },
      rrTotal: {
        title: 'f_total',
        subtitle: 'Total Resp Rate',
        desc: 'Mandatory + spontaneous breaths/min',
        unit: '1/min',
      },
      compliance: {
        title: 'Cstat',
        subtitle: 'Static Compliance',
        desc: 'Lung distensibility (VTe / (Pplat - PEEP))',
        unit: 'mL/cmH₂O',
      },
      spo2: {
        title: 'SpO₂',
        subtitle: 'Pulse Oximetry',
        desc: 'Arterial oxygen saturation level',
        unit: '%',
      },
      etco2: {
        title: 'EtCO₂',
        subtitle: 'End-Tidal CO₂',
        desc: 'Partial pressure of CO2 at end of exhalation',
        unit: 'mmHg',
      },
      pfRatio: {
        title: 'P/F',
        subtitle: 'PaO₂ / FiO₂ Ratio',
        desc: 'Oxygenation index ratio',
        unit: 'mmHg',
      },
    },

    waveforms: {
      pressureTime: 'Pressure - Time (cmH₂O)',
      flowTime: 'Flow - Time (L/min)',
      volumeTime: 'Volume - Time (mL)',
      channelPlaceholder: 'Awaiting Waveform Telemetry Data (0.00 Hz)',
      yAxisLabel: 'Scale: Auto',
      xAxisLabel: 'Time: 10s Window',
      bufferReady: 'CANVAS BUFFER READY',
    },

    console: {
      title: 'VENTILATOR CONSOLE',
      fio2: 'Fraction of Inspired O₂ (FiO₂)',
      fio2Desc: 'Percentage of oxygen delivered to patient',
      rr: 'Respiratory Rate (f)',
      rrDesc: 'Number of mechanical breaths per minute',
      vt: 'Target Tidal Volume (Vₜ)',
      vtDesc: 'Volume of air delivered in each mandatory breath',
      pinsp: 'Inspiratory Pressure (Pᵢₙₛₚ)',
      pinspDesc: 'Target pressure above PEEP during inspiration',
      peep: 'PEEP / CPAP',
      peepDesc: 'Baseline pressure maintained at end of expiration',
      ie: 'I:E Ratio',
      ieDesc: 'Ratio of inspiratory time to expiratory time',
      psupport: 'Pressure Support (Pₛᵤₚₚ)',
      psupportDesc: 'Pressure boost applied during spontaneous breaths',
      targetVolume: 'Volume Target (mL)',
      inspiratoryPressure: 'Inspiratory Pressure (cmH₂O)',
      units: {
        percent: '%',
        bpm: 'bpm',
        ml: 'mL',
        cmh2o: 'cmH₂O',
        ratio: '',
      },
    },

    patient: {
      title: 'PATIENT PHYSIOLOGY MODEL',
      compliance: 'Lung Compliance (C)',
      complianceDesc: 'Ease with which lungs expand per unit pressure',
      resistance: 'Airway Resistance (R)',
      resistanceDesc: 'Frictional resistance of airways to airflow',
      presets: 'Physiology Presets',
      presetNames: {
        normal: 'Normal',
        ards: 'ARDS',
        copd: 'COPD',
        restrictive: 'Restrictive',
        custom: 'Custom',
      },
      status: {
        normal: 'Healthy Lungs (C: 50 mL/cmH₂O, R: 5 cmH₂O/L/s)',
        ards: 'Severe ARDS - Stiff Lungs (C: 20 mL/cmH₂O, R: 10 cmH₂O/L/s)',
        copd: 'COPD - High Airway Resistance (C: 60 mL/cmH₂O, R: 25 cmH₂O/L/s)',
        restrictive: 'Chest Wall Fibrosis / Restriction (C: 25 mL/cmH₂O, R: 6 cmH₂O/L/s)',
        custom: 'User Defined Custom Parameters',
      },
      activeModelLabel: 'Active Pathology Model:',
    },

    alarms: {
      title: 'SYSTEM ALARMS',
      noAlarms: 'SYSTEM NOMINAL — NO ACTIVE ALARMS',
      highPressure: 'ALARM: HIGH INSPIRATORY PRESSURE LIMIT EXCEEDED',
      lowSpO2: 'ALARM: LOW SpO₂ SATURATION (< 90%)',
      apnea: 'ALARM: APNEA DETECTED (> 20s WITHOUT BREATH)',
      lowMV: 'ALARM: LOW MINUTE VENTILATION (MVe < LIMIT)',
      highRR: 'ALARM: TACHYPNOE (HIGH RESPIRATORY RATE)',
      circuitDisconnect: 'CRITICAL: BREATHING CIRCUIT DISCONNECTION',
      simulateToggle: 'Simulate Alarm',
      silenceAlarm: 'Silence audio',
      highPriority: 'HIGH PRIORITY ALARM',
      cautionPriority: 'CAUTION / ADVISORY',
      etco2High: 'ALARM: HIGH EtCO₂ / HYPOVENTILATION',
      etco2Low: 'ALARM: LOW EtCO₂ / HYPERVENTILATION',
    },
  },

  cs: {
    appTitle: 'Anesteziologický & Ventilační Simulátor',
    subtitle: 'GE Datex-Ohmeda Stanice • Interaktivní Výukový Simulátor',
    modeLabel: 'Ventilační Režim',
    debugLabel: 'STAVOVÝ DEBUG ŘÁDEK',
    langLabel: 'Jazyk',
    paramsLabel: 'Parametry',
    patientLabel: 'Pacient',
    disclaimer: 'Edukativní simulátor založený na zjednodušených matematických fyziologických modelech. Není určeno pro klinickou diagnostiku, léčbu pacientů ani reálné nastavování ventilátoru.',

    welcome: {
      title: 'ANESTEZIOLOGICKÁ STANICE CARESTATION 650',
      subtitle: 'INTEGROVANÝ SIMULÁTOR MECHANICKÉ VENTILACE',
      systemReady: 'AUTOTEST VENTILÁTORU PROBĚHL ÚSPĚŠNĚ • SYSTÉM PŘIPRAVEN',
      startCaseBtn: 'ZAHÁJIT PŘÍPAD',
      selectCase: 'VÝBĚR KLINICKÉHO PŘÍPADU',
      ibwFormulaTip: 'Vypočítává ideální tělesnou hmotnost (IBW) pro prevenci poškození plic ventilací (VILI).',
      systemCheck: 'Tlak O₂ / N₂O: 4.2 Bar • Absorbér CO₂: Aktivní • Odpařovač: Připojen',
    },

    intake: {
      title: 'PŘÍJEM PACIENTA A ÚVOD DO ANESTEZIE',
      subtitle: 'OVĚŘTE PARAMETRY PACIENTA A APLIKUJTE INDUKČNÍ LÉKY',
      patientDetails: 'Karta pacienta',
      idealBodyWeight: 'Ideální tělesná hmotnost (IBW)',
      targetVtRange: 'Cílový protektivní dechový objem (6-8 mL/kg IBW)',
      medicationTitle: 'Úvod do anestezie a svalová relaxace',
      inductionAgent: 'Hypnotikum / Sedativum',
      opioid: 'Opioidní analgetikum',
      nmb: 'Svalové relaxancium (NMB)',
      volatileGas: 'Inhalační anestetický plyn',
      calculateDose: 'Vypočítaná dávka',
      intubationReady: 'Svalová relaxace kompletní • Připraveno k intubaci',
      startVentilationBtn: 'PŘIPOJIT K MECHANICKÉMU VENTILÁTORU',
    },

    events: {
      title: 'INTRAOPERATIVNÍ KLINICKÉ SCÉNÁŘE',
      normal: 'Stabilní výchozí stav',
      bronchospasm: 'Akutní bronchospasmus',
      atelectasis: 'Atelektáza plic / Nízká poddajnost',
      bucking: 'Reakce na kanylu / Spontánní úsilí',
      disconnect: 'Odpojení ventilačního okruhu',
      recruitment: 'Náběhový manévr / Bronchodilatanční léčba',
    },

    modes: {
      vc: 'Objemově řízená ventilace (VC-CMV)',
      pc: 'Tlakově řízená ventilace (PC-CMV)',
      simv: 'Synchronizovaná zástupná ventilace (SIMV)',
      ps: 'Tlaková podpora (PSV)',
    },
    modeShort: {
      vc: 'VC-CMV',
      pc: 'PC-CMV',
      simv: 'SIMV',
      ps: 'PSV',
    },
    modeDesc: {
      vc: 'Dodává pevný dechový objem nastavenou frekvencí bez ohledu na úsilí pacienta.',
      pc: 'Udržuje cílový inspirační tlak po nastavený čas vdechu.',
      simv: 'Synchronizuje nucené dechy se spontánními dechovými pokusy pacienta.',
      ps: 'Spontánní ventilace spouštěná pacientem s tlakovou podporou.',
    },

    monitors: {
      ppeak: {
        title: 'Ppeak',
        subtitle: 'Vrcholový tlak v dýchacích cestách',
        desc: 'Maximální naměřený tlak během inspirace',
        unit: 'cmH₂O',
      },
      pplat: {
        title: 'Pplat',
        subtitle: 'Tlak na konci vdechu (Plateau)',
        desc: 'Alveolární tlak při zadržení vdechu',
        unit: 'cmH₂O',
      },
      pmean: {
        title: 'Pmean',
        subtitle: 'Střední tlak v dýchacích cestách',
        desc: 'Průměrný tlak v dýchacích cestách za dechový cyklus',
        unit: 'cmH₂O',
      },
      peep: {
        title: 'PEEP',
        subtitle: 'Pozitivní tlak na konci výdechu',
        desc: 'Základní přetlak udržovaný na konci výdechu',
        unit: 'cmH₂O',
      },
      vte: {
        title: 'VTe',
        subtitle: 'Exspiratční dechový objem',
        desc: 'Objem vydechnutého plynu za jeden dech',
        unit: 'mL',
      },
      mv: {
        title: 'MVe',
        subtitle: 'Minutová ventilace',
        desc: 'Celkový vydechnutý objem za minutu',
        unit: 'L/min',
      },
      rrTotal: {
        title: 'f_total',
        subtitle: 'Celková dechová frekvence',
        desc: 'Součet nucených a spontánních dechů za minutu',
        unit: '1/min',
      },
      compliance: {
        title: 'Cstat',
        subtitle: 'Poddajnost plic (Statická)',
        desc: 'Rozpínavost plicní tkáně (VTe / (Pplat - PEEP))',
        unit: 'mL/cmH₂O',
      },
      spo2: {
        title: 'SpO₂',
        subtitle: 'Pulsní oxymetrie',
        desc: 'Saturace arteriálního krve kyslíkem',
        unit: '%',
      },
      etco2: {
        title: 'EtCO₂',
        subtitle: 'End-tidální CO₂',
        desc: 'Parciální tlak CO2 na konci výdechu',
        unit: 'mmHg',
      },
      pfRatio: {
        title: 'P/F',
        subtitle: 'Index oxygenace (PaO₂ / FiO₂)',
        desc: 'Poměr arteriálního tlaku O2 k frakci FiO2',
        unit: 'mmHg',
      },
    },

    waveforms: {
      pressureTime: 'Tlak v dýchacích cestách - Čas (cmH₂O)',
      flowTime: 'Průtok plynů - Čas (L/min)',
      volumeTime: 'Dechový objem - Čas (mL)',
      channelPlaceholder: 'Čekání na telemetrická data křivek (0.00 Hz)',
      yAxisLabel: 'Měřítko: Auto',
      xAxisLabel: 'Časové okno: 10s',
      bufferReady: 'VYROVNÁVACÍ PAMĚŤ KŘIVKY PŘIPRAVENA',
    },

    console: {
      title: 'KONZOLE VENTILÁTORU',
      fio2: 'Frakce vdychovaného kyslíku (FiO₂)',
      fio2Desc: 'Procento kyslíku dodávaného pacientovi v insuflační směsi',
      rr: 'Dechová frekvence (f)',
      rrDesc: 'Počet mechanických dechů dodaných ventilátorem za minutu',
      vt: 'Cílový dechový objem (Vₜ)',
      vtDesc: 'Objem vzduchu dodaný v jednom nuceném dechu',
      pinsp: 'Inspirační tlak (Pᵢₙₛₚ)',
      pinspDesc: 'Cílový přetlak v dýchacích cestách nad PEEP při vdechu',
      peep: 'PEEP / CPAP',
      peepDesc: 'Trvalý přetlak udržovaný v dýchacích cestách na konci výdechu',
      ie: 'Poměr I:E (Vdech:Výdech)',
      ieDesc: 'Poměr doby trvání vdechu k době výdechu',
      psupport: 'Tlaková podpora (Pₛᵤₚₚ)',
      psupportDesc: 'Přetlaková podpora při spontánním dechovém pokusu',
      targetVolume: 'Cílový objem (mL)',
      inspiratoryPressure: 'Inspirační tlak (cmH₂O)',
      units: {
        percent: '%',
        bpm: 'dech/min',
        ml: 'mL',
        cmh2o: 'cmH₂O',
        ratio: '',
      },
    },

    patient: {
      title: 'FYZIOLOGICKÝ MODEL PACIENTA',
      compliance: 'Poddajnost plic (C)',
      complianceDesc: 'Ochota plicní tkáně se rozpínat na jednotku tlaku',
      resistance: 'Odpor dýchacích cest (R)',
      resistanceDesc: 'Tření a odpor dýchacích cest vůči proudění plynu',
      presets: 'Předvolby patologie',
      presetNames: {
        normal: 'Normální',
        ards: 'ARDS',
        copd: 'CHOPN',
        restrictive: 'Restrikční',
        custom: 'Vlastní',
      },
      status: {
        normal: 'Zdravé plíce (C: 50 mL/cmH₂O, R: 5 cmH₂O/L/s)',
        ards: 'Těžký ARDS - Tuhé plíce (C: 20 mL/cmH₂O, R: 10 cmH₂O/L/s)',
        copd: 'CHOPN - Vysoký odpor dýchacích cest (C: 60 mL/cmH₂O, R: 25 cmH₂O/L/s)',
        restrictive: 'Restrikční porucha / Fibróza plic (C: 25 mL/cmH₂O, R: 6 cmH₂O/L/s)',
        custom: 'Vlastní nastavení fyziologických parametrů',
      },
      activeModelLabel: 'Aktivní patologický model:',
    },

    alarms: {
      title: 'SYSTÉMOVÉ ALARMY',
      noAlarms: 'SYSTÉM OK — ŽÁDNÉ AKTIVNÍ ALARMY',
      highPressure: 'ALARM: PŘEKROČEN HORNÍ TLAKOVÝ LIMIT V DÝCHACÍCH CESTÁCH',
      lowSpO2: 'ALARM: NÍZKÁ SATURACE KYSLÍKEM (SpO₂ < 90%)',
      apnea: 'ALARM: DETEKOVÁNA APNOE (BEZ DECHU > 20s)',
      lowMV: 'ALARM: NÍZKÁ MINUTOVÁ VENTILACE (MVe < LIMIT)',
      highRR: 'ALARM: TACHYPNOE (VYSOKÁ DECHOVÁ FREKVENCE)',
      circuitDisconnect: 'KRITICKÉ: ODPOJENÍ VENTILAČNÍHO OKRUHU',
      simulateToggle: 'Simulovat Alarm',
      silenceAlarm: 'Ztišit zvuk',
      highPriority: 'ALARM VYSOKÉ PRIORITY',
      cautionPriority: 'VAROVÁNÍ / UPOZORNĚNÍ',
      etco2High: 'ALARM: VYSOKÝ EtCO₂ / HYPOVENTILACE',
      etco2Low: 'ALARM: NÍZKÝ EtCO₂ / HYPERVENTILACE',
    },
  },
};

export function useTranslation(lang: Language) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.cs;
  return {
    t: dict,
    lang,
  };
}
