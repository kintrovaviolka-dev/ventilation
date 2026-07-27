# Mechanical Ventilation Simulator

An interactive, high-fidelity mechanical ventilation simulator designed for critical care education, anesthesia training, and clinical practice simulation. It features real-time telemetry waveforms, dynamic compliance modeling, a physical-style control dial, and closed-loop pharmacological simulation.

## Features

- **Real-Time Telemetry Waveforms**: Interactive canvas plotting airway pressure ($P_{aw}$), flow rate, and lung volume.
- **Pressure-Volume (P-V) Loop**: Dynamic loops showing static compliance reference curves and compliance shifts in real time.
- **Clinical Scenarios**: Realistic patient models and intraoperative challenges:
  - Stable Baseline
  - Acute Intraoperative Bronchospasm (High airway resistance)
  - Pneumoperitoneum / Lung Atelectasis (Reduced lung compliance)
  - Patient Bucking / Light Anesthesia (Spontaneous respiratory effort)
  - Circuit Disconnection (Immediate volume/pressure loss)
- **Interactive Anesthesia & Medications Panel**: Manage gas vaporizers (Sevoflurane) and intravenous drug boluses (Rocuronium NMB, Propofol, Fentanyl) with realistic muscle block decay and Train-of-Four (TOF) telemetry.
- **Auditory Clinical Alarms**: High-fidelity synthesized alarm sound loops for critical and caution states with a functional alarm-silence feature.
- **Dual Language Support**: English (EN) and Czech (CS) languages.

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

