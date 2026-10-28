# Mechanical Ventilation Simulator

An interactive, high-fidelity mechanical ventilation simulator designed for critical care education, anesthesia training, and clinical practice simulation. It features real-time telemetry waveforms, dynamic compliance modeling, a physical-style control dial, and closed-loop pharmacological simulation.

## Features

- **Real-Time Telemetry Waveforms**: Interactive canvas plotting airway pressure ($P_{aw}$), flow rate, and lung volume. Waveforms and the P-V loop share a continuous simulation clock, without restarting on routine value updates, and resize with their panels.
- **Pressure-Volume (P-V) Loop**: Dynamic loops showing static compliance reference curves and compliance shifts in real time.
- **Clinical Scenarios**: Realistic patient models and intraoperative challenges:
  - Stable Baseline
  - Acute Intraoperative Bronchospasm (High airway resistance)
  - Pneumoperitoneum / Lung Atelectasis (Reduced lung compliance)
  - Patient Bucking / Light Anesthesia (Spontaneous respiratory effort)
  - Circuit Disconnection (Immediate volume/pressure loss)
- **Interactive Anesthesia & Medications Panel**: Manage gas vaporizers (Sevoflurane) and intravenous drug boluses (Rocuronium NMB, Propofol, Fentanyl) with realistic muscle block decay and Train-of-Four (TOF) telemetry.
- **Auditory Clinical Alarms**: High-fidelity synthesized alarm sound loops for critical and caution states with a functional alarm-silence feature.
- **Jazyk / Language**: Čeština je výchozí jazyk. Přepínač Čeština / English je na všech obrazovkách a volba se ukládá v prohlížeči. Czech is the default; English is available on every screen.
- **Parameter Practice**: The header's **Practice / Procvičování** button opens a separate bilingual exercise screen with 720 shuffled fictional adult profiles, numeric inputs and plus/minus controls, deterministic feedback, and optional propofol/rocuronium questions. Profiles do not repeat within a deck. Opening practice pauses simulation medication decay and alarms; returning preserves settings and resumes the simulation clock.

## Ovládání a rozložení

- Stránka se posouvá jako celek; panely se na mobilu řadí pod sebe a na větších obrazovkách vedle sebe. Výška panelů se přizpůsobuje obsahu.
- Vyberte parametr, upravte jej pomocí − / + a potvrďte. Rozpracovanou změnu lze zrušit tlačítkem; po 7 sekundách nečinnosti se zruší automaticky.
- Ovladač podporuje tažení myší i dotykem, šipky, Enter / mezerník a Escape. Samotné tažení změnu nepotvrdí.
- Poměr I:E lze nastavit přímo mezi parametry. Model pacienta určuje vybraný klinický případ.
- Volitelné panely P-V smyčky a léků lze skrýt.

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
