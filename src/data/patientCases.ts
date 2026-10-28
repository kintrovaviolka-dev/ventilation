import { PatientCase, IntraoperativeEvent } from '../types';

export const PATIENT_CASES: PatientCase[] = [
  {
    id: 'case_cholecystectomy',
    name: 'Jan Novák (58 yrs)',
    age: 58,
    gender: 'M',
    weightKg: 92,
    heightCm: 175,
    ibwKg: 71, // IBW for male 175cm = 50 + 0.91*(175-152.4) = ~70.6 kg
    asaStatus: 'ASA II',
    surgery: 'Laparoscopic Cholecystectomy',
    history: 'Mild hypertension, BMI 30.1. Pneumoperitoneum will increase intra-abdominal pressure and reduce lung compliance during surgery.',
    baselineCompliance: 38,
    baselineResistance: 8,
    preset: 'normal',
  },
  {
    id: 'case_ards_sepsis',
    name: 'Marie Svobodová (64 yrs)',
    age: 64,
    gender: 'F',
    weightKg: 65,
    heightCm: 162,
    ibwKg: 54, // IBW for female 162cm = 45.5 + 0.91*(162-152.4) = ~54.2 kg
    asaStatus: 'ASA III-E',
    surgery: 'Emergency Laparotomy for Peritonitis',
    history: 'Early Sepsis-induced Acute Respiratory Distress Syndrome (ARDS). Stiff lungs requiring lung-protective ventilation (6 mL/kg IBW) and PEEP titration.',
    baselineCompliance: 22,
    baselineResistance: 10,
    preset: 'ards',
  },
  {
    id: 'case_copd_asthma',
    name: 'Karel Dvořák (69 yrs)',
    age: 69,
    gender: 'M',
    weightKg: 78,
    heightCm: 180,
    ibwKg: 75,
    asaStatus: 'ASA III',
    surgery: 'Transurethral Resection of Prostate (TURP)',
    history: 'Severe COPD with chronic air trapping. Expiratory flow limitation; prone to auto-PEEP. Requires longer expiratory time (I:E 1:3 or 1:4) and lower RR.',
    baselineCompliance: 62,
    baselineResistance: 24,
    preset: 'copd',
  },
  {
    id: 'case_routine_elective',
    name: 'Eva Procházková (42 yrs)',
    age: 42,
    gender: 'F',
    weightKg: 60,
    heightCm: 168,
    ibwKg: 60,
    asaStatus: 'ASA I',
    surgery: 'Elective Arthroscopic Knee Surgery',
    history: 'Healthy non-smoker with normal lung physiology. Standard low-risk general anesthesia case.',
    baselineCompliance: 52,
    baselineResistance: 5,
    preset: 'normal',
  },
];

export const INTRAOPERATIVE_EVENTS: IntraoperativeEvent[] = [
  {
    id: 'event_baseline',
    title: { en: 'Stable Baseline', cs: 'Stabilní výchozí stav' },
    description: {
      en: 'Patient is stably ventilated under general anesthesia.',
      cs: 'Pacient je stabilně ventilován v celkové anestezii.'
    },
    compliance: 0,
    resistance: 0,
    severity: 'normal',
    teachingPoints: {
      en: 'Maintain protective ventilation (VT 6-8 mL/kg IBW, Pplat < 30 cmH₂O).',
      cs: 'Udržujte protektivní ventilaci (VT 6-8 mL/kg IBW, Pplat < 30 cmH₂O).'
    }
  },
  {
    id: 'event_bronchospasm',
    title: { en: 'Acute Intraoperative Bronchospasm', cs: 'Akutní intraoperativní bronchospasmus' },
    description: {
      en: 'Sudden onset of severe airway resistance. Ppeak increases sharply; expiratory flow waveform shows severe obstruction tail.',
      cs: 'Náhlý nárůst odporu dýchacích cest. Ppeak prudce stoupá; exspirační křivka průtoku vykazuje prodloužený výdech.'
    },
    compliance: -5,
    resistance: +20,
    severity: 'warning',
    teachingPoints: {
      en: 'Airway resistance increased! Prolong expiratory time (I:E 1:3), check depth of anesthesia, give inhaled bronchodilator.',
      cs: 'Zvýšený odpor dýchacích cest! Prodlužte dobu výdechu (I:E 1:3), prohlubte anestezii, aplikujte bronchodilatanční léčbu.'
    }
  },
  {
    id: 'event_atelectasis',
    title: { en: 'Pneumoperitoneum / Lung Atelectasis', cs: 'Pneumoperitoneum / Atelektáza plic' },
    description: {
      en: 'Abdominal insufflation or atelectasis reduces chest wall compliance. Tidal volume drops in PC mode; Ppeak/Pplat rise in VC mode.',
      cs: 'Insuflace dutiny břišní nebo atelektáza snižuje poddajnost. Dechový objem klesá v PC režimu; Ppeak/Pplat stoupá ve VC režimu.'
    },
    compliance: -18,
    resistance: +3,
    severity: 'warning',
    teachingPoints: {
      en: 'Lung compliance decreased! Increase PEEP to open collapsed alveoli or perform a recruitment maneuver.',
      cs: 'Poddajnost plic klesla! Zvyšte PEEP pro otevření atelektatických alveolů nebo proveďte náběhový manévr.'
    }
  },
  {
    id: 'event_bucking',
    title: { en: 'Patient Bucking / Light Anesthesia', cs: 'Reakce na kanylu / Mělká anestezie' },
    description: {
      en: 'Neuromuscular block wearing off. Patient makes spontaneous breathing efforts against the ventilator, spiking peak airway pressure.',
      cs: 'Odeznívání svalové relaxace. Pacient dělá spontánní dechové pokusy proti ventilátoru, což způsobuje špičky tlaku.'
    },
    compliance: -10,
    resistance: +8,
    severity: 'critical',
    teachingPoints: {
      en: 'Patient is coughing/bucking! Administer NMB re-dose or increase volatile anesthetic MAC, switch to SIMV or PSV mode if transitioning to spontaneous breathing.',
      cs: 'Pacient kašle/bojuje s ventilátorem! Podejte další dávku svalového relaxancia nebo zvyšte MAC, případně přepněte do SIMV/PSV.'
    }
  },
  {
    id: 'event_disconnect',
    title: { en: 'Breathing Circuit Disconnection', cs: 'Odpojení ventilačního okruhu' },
    description: {
      en: 'Accidental disconnection between endotracheal tube and breathing circuit. Pressure and flow collapse to zero.',
      cs: 'Náhodné rozpojení mezi endotracheální kanylou a okruhem. Tlak a průtok klesají k nule.'
    },
    compliance: -30,
    resistance: -4,
    severity: 'critical',
    teachingPoints: {
      en: 'CRITICAL: Reconnect circuit immediately! Check CO₂ capnography waveform.',
      cs: 'KRITICKÉ: Okamžitě znovu připojte ventilační okruh! Zkontrolujte kapnografii.'
    }
  }
];
