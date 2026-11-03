# Mechanical Ventilation Simulator

Bilingual educational anesthesia and ventilation simulator. It uses a simplified deterministic single-compartment model and original SVG/CSS equipment illustrations. It is not a validated medical device or an exact emulation of a GE station.

## Runtime and monitoring

One `advanceSimulation(state, commands, elapsedMs)` runtime advances mechanics, cardiac phase, medication events, fluids and guided scenarios in fixed 5 ms steps. Canvases draw recorded samples. Volume is conserved across breaths; proximal airway pressure, elastic pressure and muscle effort are distinct. Readouts use the latest completed breath (including breath-derived RR and minute ventilation) and show “—” before data exists. The OR display shows only Paw, flow and CO2 with large held Ppeak/MVe/EtCO2 values; CO2 is displayed in kPa. Advanced model telemetry stays in a separate collapsed disclosure. The upper monitor pairs ECG/HR and pulse-ox SpO2 with saturation and NIBP. All active alarms remain visible; audio mute lasts 120 simulation seconds. Plateau pressure is a model estimate, unavailable with spontaneous effort. Auto-PEEP, total PEEP and trapped volume are separate. P-V history stores the actual preceding breath.

VC and PC deliver timed mandatory breaths. PSV requires patient effort and a flow trigger, then cycles at a fraction of peak inspiratory flow within Ti bounds. SIMV combines synchronized mandatory VC breaths and supported spontaneous breaths. Apnea raises an alarm and uses separately configured PC backup, enabled by default; it can be disabled for teaching. Principles follow [Hamilton's mode descriptions](https://www.hamilton-medical.com/en_DK/Products/Compare/Compare-ventilation-modes.html); numerical defaults are simulator choices, not treatment prescriptions.

## Ovládání / Controls

- Výchozí je číselné zadávání. Potvrďte tlačítkem Použít nebo Enter; Escape zruší rozpracovanou změnu. Volitelné kolečko zachovává tažení, šipky, potvrzení a sedmisekundový timeout. Volba editoru a CZ/EN se ukládá v prohlížeči.
- Potvrzené ventilační nastavení se uplatní při dalším nádechu; panel ukazuje čekající hodnoty. Úsilí a spontánní frekvence jsou vlastnosti pacienta a mění se ihned. Lékové události, změny infuzí a odpojení okruhu nečekají na nádech.
- Příjem i šuplík používají absolutní dávky propofolu, sufentanilu, rokuronia, noradrenalinu a atropinu. Potvrzení příjmu založí události jednou v čase 00:00. Sedace a svalový blok jsou různé účinky; relaxace nezajišťuje bezvědomí. Sevofluran se nastavuje samostatně a skládá se ve společném modelu.
- Šuplík **Léky / Tekutiny**: výběr balení nepodává látku. Detail vyžaduje samostatné potvrzení. Balancovaný krystaloid a NaCl 0,9 % mají vak, cílový objem a rychlost mL/h; podporují pauzu, změnu rychlosti, obnovení a definitivní ukončení. Změna rychlosti během pauzy infuzi neobnoví. Přehled a zastavení jsou dostupné i mimo šuplík.
- Celkem podané tekutiny nejsou čistá bilance. U hypovolémie působí skutečný objem podaný po začátku scénáře plynule podle ilustrativní odezvy `0.75 × V/(V+500 mL)`. Ruční dokončení scénáře nenormalizuje oběh, nezastaví krvácení ani běžící infuzi. Elektrolyty, acidobazická rovnováha, renální eliminace a přetížení zatím nejsou modelovány.
- Řízené scénáře a demonstrace mechaniky se nespouštějí současně. Oba monitory lze samostatně zakrýt. Panely P-V a anestezie lze skrýt.
- Procvičování pozastaví celý runtime a po návratu zachová jeho stav. Skrytá záložka se také pozastaví; po návratu se objeví oznámení. Procvičování má vlastní oddělenou hodnoticí metodiku popsanou níže.

Implementation status, checks, known limits and takeover instructions: [repair plan](docs/SIMULATION_REPAIR_PLAN.md), [engine handoff](docs/PHYSIOLOGY_ENGINE_HANDOFF.md). Clinical review is pending separately from software verification.

## Practice rules and limitations

Practice is a memory/calculation exercise, not a dosing calculator or a complete anaesthetic plan. It uses no AI or network requests to generate cases or grade answers. Rules live in `src/lib/practice.ts`; boundary, exclusion and deck tests run with `npm test`.

| Item | Grading rule |
| --- | --- |
| VT | 6–8 mL/kg **predicted** body weight: male `50 + 0.91 * (heightCm - 152.4)`, female `45.5 + 0.91 * (heightCm - 152.4)`. Actual weight does not determine VT. |
| Rate | Calculated from the **supplied exercise** minute-ventilation target and the selected protective VT. It is not an independently fixed rate or a prediction of metabolic requirements. |
| PEEP | Initial 5 cmH₂O, **before** individual titration; other values are not declared universally unsafe. |
| FiO₂ | Lowest documented setting achieving the stated SpO₂ target of 94–98% in the case's **fictional observations**. No interpolation, gas-exchange prediction, preoxygenation or acute hypoxaemia algorithm. |
| I:E | Explicit basic-exercise convention of 1:2, not a universal clinical optimum. |
| Propofol | Selected SmPC's approximate **total titrated induction requirement** of 1.5–2.5 mg/kg actual weight for eligible adults younger than 55; not a single-bolus instruction. |
| Rocuronium | Selected Esmeron standard: 0.6 mg/kg for routine intubation, 1.0 mg/kg for the stated RSI target of 60 seconds. Other clinical protocols/doses are not graded as alternatives in this exercise. |

Accepted intervals are rounded inward to the input step. Rocuronium's single target is rounded to the nearest 1 mg; this is an exercise convention, not a clinical safety margin. All endpoints are inclusive. Rate feedback is withheld until VT is valid and protective. Empty, non-finite, off-step and out-of-control-range inputs cannot pass. Editing an answer or toggling medications clears stale results.

Drug questions are **not scored** for age ≥55, BMI ≥30, or actual weight ≥130% of Devine ideal weight (`50`/`45.5 + 2.3 * (heightCm - 152.4) / 2.54`). No guessed elderly/obesity dose ranges are substituted. The conservative exclusion applies to both drugs; it does not imply that both labels share an age cutoff. Generated cases otherwise assume haemodynamic stability, no shock, obstruction, ARDS, organ failure, pregnancy, allergies or drug interactions. Actual practice requires monitoring, titration, qualified clinical judgement and local protocols.

Sources verified 18 October 2026:
- [NYSORA, Lung protective ventilation](https://nysora.com/anesthesia/lung-protective-ventilation/), summarising [Young et al., BJA 2019 consensus](https://doi.org/10.1016/j.bja.2019.08.017).
- [BTS guideline for oxygen use in adults, 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5531304/).
- [Propofol 1% SmPC, section 4.2](https://www.medicines.org.uk/emc/product/5492/smpc).
- [Esmeron SmPC, section 4.2](https://www.medicines.org.uk/emc/product/1345/smpc).

## Installation & Local Development

### Prerequisites
- Node.js (v18 or higher recommended)

### Setup Instructions
1. Clone the repository to your local machine:
   ```bash
   git clone <your-repo-url>
   cd mechanical-ventilation-simulator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

## Deployment

This project is fully ready for deployment as a static site.

### Deploying to Vercel
1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root directory and follow the prompts.
3. The build command will automatically run `npm run build` and deploy the output directory (`dist`).

## Tech Stack
- **Framework**: React 19 / TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS v4
- **Graphics**: HTML5 Canvas (optimized with `requestAnimationFrame`)
- **Audio**: Web Audio API (real-time synthesizer)

## Audit 1. listopadu 2026

Technické opravy, nové ovládání, ověření a otevřené limity fyziologického modelu popisuje [audit](docs/PHYSIOLOGY_UI_AUDIT.md).
