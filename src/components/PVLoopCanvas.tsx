import React, { useEffect, useRef } from 'react';
import { VentilatorSettings, PatientParams, VentMode, Language } from '../types';
import { getInstantaneousBreath } from '../lib/waveformMath';
import { TRANSLATIONS } from '../i18n/translations';

interface PVLoopCanvasProps {
  settings: VentilatorSettings;
  patient: PatientParams;
  mode: VentMode;
  language: Language;
}

interface Point2D {
  pressure: number;
  volume: number;
}

export const PVLoopCanvas: React.FC<PVLoopCanvasProps> = ({
  settings,
  patient,
  mode,
  language,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trajectory loop points
  const currentLoopRef = useRef<Point2D[]>([]);
  const previousLoopRef = useRef<Point2D[]>([]);
  const lastPhaseRef = useRef<'insp' | 'exp'>('insp');

  useEffect(() => {
    // Pre-populate previous loop with a full clean cycle under the new parameters
    const rr = Math.max(4, settings.rr || 12);
    const cycleTime = 60 / rr;
    const numPoints = 100;
    const prePts: Point2D[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * cycleTime;
      const breath = getInstantaneousBreath(t, settings, patient, mode);
      prePts.push({ pressure: breath.pressure, volume: breath.volume });
    }
    previousLoopRef.current = prePts;

    // Clear current loop to start fresh
    currentLoopRef.current = [];
    lastPhaseRef.current = 'insp';

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();

    const maxP = 60;   // 0 to 60 cmH2O X-axis scale
    const maxV = 800;  // 0 to 800 mL Y-axis scale

    const render = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      const rect = canvas.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;

      // Clear full canvas buffer
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save and scale context for crisp high-DPI drawing in CSS pixel coordinates
      ctx.save();
      ctx.scale(dpr, dpr);

      // Get current instantaneous point
      const breath = getInstantaneousBreath(elapsedSec, settings, patient, mode);

      // Detect start of new breath (transition from exp to insp)
      if (lastPhaseRef.current === 'exp' && breath.phase === 'insp') {
        if (currentLoopRef.current.length > 5) {
          previousLoopRef.current = [...currentLoopRef.current];
        }
        currentLoopRef.current = [];
      }
      lastPhaseRef.current = breath.phase;

      // Append point to active trajectory loop
      currentLoopRef.current.push({
        pressure: breath.pressure,
        volume: breath.volume,
      });

      // Clear Canvas inside scaled coordinate space
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);

      // Grid margins
      const padding = 28;
      const graphW = width - padding * 2;
      const graphH = height - padding * 2;

      // Draw Grid Axes
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#222222';

      // Y-axis & X-axis frame lines
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      // Horizontal volume grid lines
      ctx.fillStyle = '#666666';
      ctx.font = '9px monospace';

      for (let v = 200; v <= maxV; v += 200) {
        const y = (height - padding) - (v / maxV) * graphH;
        ctx.strokeStyle = '#181818';
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillText(`${v}`, 4, y + 3);
      }

      // Vertical pressure grid lines
      for (let p = 10; p <= maxP; p += 10) {
        const x = padding + (p / maxP) * graphW;
        ctx.strokeStyle = '#181818';
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();

        ctx.fillText(`${p}`, x - 6, height - 8);
      }

      // Axis Labels
      ctx.fillStyle = '#EAB308'; // Yellow text for pressure X-axis
      ctx.fillText('Paw (cmH₂O)', width - padding - 60, height - 8);

      ctx.fillStyle = '#10B981'; // Green text for volume Y-axis
      ctx.fillText('Vol (mL)', padding + 4, padding - 8);

      // Header Title & Compliance readout
      ctx.fillStyle = '#22D3EE';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('P-V LOOP', padding + 4, padding + 12);

      const cStat = patient.compliance || 50;
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '9px monospace';
      ctx.fillText(`C: ${cStat} mL/cmH₂O`, padding + 4, padding + 24);

      // Plot static compliance reference slope line (dashed yellow)
      if (settings.peep !== undefined && settings.vt !== undefined) {
        const peepX = padding + (settings.peep / maxP) * graphW;
        const peepY = height - padding;

        const pPlat = settings.peep + (settings.vt / cStat);
        const platX = padding + (Math.min(maxP, pPlat) / maxP) * graphW;
        const platY = (height - padding) - (Math.min(maxV, settings.vt) / maxV) * graphH;

        ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(peepX, peepY);
        ctx.lineTo(platX, platY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Previous Completed Loop (Dimmed reference trace)
      const prevPts = previousLoopRef.current;
      if (prevPts.length > 1) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        prevPts.forEach((pt, i) => {
          const x = padding + (Math.max(0, Math.min(maxP, pt.pressure)) / maxP) * graphW;
          const y = (height - padding) - (Math.max(0, Math.min(maxV, pt.volume)) / maxV) * graphH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Draw Active Live Loop
      const pts = currentLoopRef.current;
      if (pts.length > 1) {
        ctx.strokeStyle = '#22D3EE'; // Bright GE Cyan
        ctx.lineWidth = 2;
        ctx.shadowColor = '#06B6D4';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        pts.forEach((pt, i) => {
          const x = padding + (Math.max(0, Math.min(maxP, pt.pressure)) / maxP) * graphW;
          const y = (height - padding) - (Math.max(0, Math.min(maxV, pt.volume)) / maxV) * graphH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.shadowBlur = 0; // reset glow

        // Draw current moving dot on active loop
        const lastPt = pts[pts.length - 1];
        const dotX = padding + (Math.max(0, Math.min(maxP, lastPt.pressure)) / maxP) * graphW;
        const dotY = (height - padding) - (Math.max(0, Math.min(maxV, lastPt.volume)) / maxV) * graphH;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#22D3EE';
        ctx.stroke();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [settings, patient, mode]);

  // Handle canvas sizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (rect.width > 0 && rect.height > 0) {
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#060606] border border-[#222222] rounded overflow-hidden flex flex-col select-none shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};
