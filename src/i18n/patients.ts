import { PatientCase, Language } from '../types';
const CZECH_CASES: Record<string, { surgery: string; history: string }> = {
  case_cholecystectomy: { surgery: 'Laparoskopická cholecystektomie', history: 'Mírná hypertenze, BMI 30,1. Pneumoperitoneum během operace zvýší nitrobřišní tlak a sníží poddajnost plic.' },
  case_ards_sepsis: { surgery: 'Akutní laparotomie pro peritonitidu', history: 'Časný ARDS při sepsi. Tuhé plíce vyžadují protektivní ventilaci (6 mL/kg IBW) a titraci PEEP.' },
  case_copd_asthma: { surgery: 'Transuretrální resekce prostaty (TURP)', history: 'Těžká CHOPN s chronickým zadržováním vzduchu. Omezený výdechový průtok a sklon k auto-PEEP. Vyžaduje delší výdech (I:E 1:3 nebo 1:4) a nižší dechovou frekvenci.' },
  case_routine_elective: { surgery: 'Plánovaná artroskopie kolene', history: 'Zdravá nekuřačka s normální fyziologií plic. Běžný případ celkové anestezie s nízkým rizikem.' },
};
export function patientText(patient: PatientCase, language: Language) {
  return language === 'cs' ? { ...patient, ...CZECH_CASES[patient.id], name: patient.name.replace('yrs', 'let') } : patient;
}
