import React, { useEffect, useRef } from 'react';
import { VentilatorSettings, PatientParams, VentMode, Language } from '../types';
import { getInstantaneousBreath } from '../lib/waveformMath';
import { syncCanvasSize } from '../lib/canvasSize';

interface WaveformCanvasProps {
  startTime: number;
  settings: VentilatorSettings;
  patient: PatientParams;
  mode: VentMode;
  language: Language;
}

interface WaveformPoint {
  pressure: number;
  flow: number;
  volume: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  startTime,
  settings,
  patient,
  mode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // History buffer for full sweep width
  const historyRef = useRef<WaveformPoint[]>([]);
  const lastSampleRef = useRef<number>(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const sweepDurationSec = 10.0; // 10-second horizontal sweep speed (compresses curve width)

    const render = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      const { width, height, dpr } = syncCanvasSize(canvas);

      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Clear full canvas buffer
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save and scale context for crisp high-DPI drawing in CSS pixel coordinates
      ctx.save();
      ctx.scale(dpr, dpr);

      // Current exact integer X position of the sweeping beam
      const sampleIndex = Math.floor((elapsedSec / sweepDurationSec) * width);
      const currSweepX = sampleIndex % width;

      if (historyRef.current.length !== width) {
        historyRef.current = new Array<WaveformPoint>(width);
        lastSampleRef.current = sampleIndex - width;
      }

      const currentBreath = getInstantaneousBreath(elapsedSec, settings, patient, mode);

      // Sample each crossed pixel at its own time, including after a skipped sweep.
      const firstSample = Math.max(lastSampleRef.current + 1, sampleIndex - width + 1);
      for (let sample = firstSample; sample <= sampleIndex; sample++) {
        const x = ((sample % width) + width) % width;
        historyRef.current[x] = getInstantaneousBreath(
          (sample / width) * sweepDurationSec, settings, patient, mode
        );
      }

      lastSampleRef.current = sampleIndex;

      // Height of each channel (3 stacked channels: Paw, Flow, Vol)
      const channelH = height / 3;
      const eraserWidth = 16;

      // 1. Draw Monitor Dark Background
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Subtle Background Grid
      ctx.lineWidth = 1;

      // Vertical time grid lines (every ~0.5s or 12 divisions)
      const numVLines = 12;
      ctx.strokeStyle = '#141414';
      for (let i = 1; i < numVLines; i++) {
        const x = Math.floor((width / numVLines) * i);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Channel Separators and Zero Baselines
      for (let c = 0; c < 3; c++) {
        const topY = c * channelH;
        const bottomY = topY + channelH;

        // Channel divider
        ctx.strokeStyle = '#222222';
        ctx.beginPath();
        ctx.moveTo(0, bottomY);
        ctx.lineTo(width, bottomY);
        ctx.stroke();

        // Zero Baseline Dashed Reference Line
        let zeroY = topY + channelH * 0.82; // Paw and Vol default baseline near bottom
        if (c === 1) zeroY = topY + channelH * 0.5; // Flow is zero-centered

        ctx.strokeStyle = '#182222';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(width, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Render 3 Telemetry Channels (Paw, Flow, Volume)
      const channels = [
        {
          key: 'pressure' as const,
          color: '#EAB308', // GE Yellow
          min: 0,
          max: 60,
          zeroRatio: 0.82,
          label: 'Paw (cmH₂O)',
          value: `${currentBreath.pressure.toFixed(0)}`,
        },
        {
          key: 'flow' as const,
          color: '#06B6D4', // GE Cyan
          min: -120,
          max: 120,
          zeroRatio: 0.5,
          label: 'Flow (L/min)',
          value: `${currentBreath.flow > 0 ? '+' : ''}${currentBreath.flow.toFixed(0)}`,
        },
        {
          key: 'volume' as const,
          color: '#10B981', // GE Emerald
          min: 0,
          max: 800,
          zeroRatio: 0.82,
          label: 'Vol (mL)',
          value: `${currentBreath.volume.toFixed(0)}`,
        },
      ];

      channels.forEach((ch, cIndex) => {
        const topY = cIndex * channelH;
        const zeroY = topY + channelH * ch.zeroRatio;
        const availableH = channelH * 0.72;

        // Channel Header Title
        ctx.fillStyle = ch.color;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(ch.label, 8, topY + 14);

        // Channel Live Numeric Value
        ctx.fillStyle = ch.color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(ch.value, width - 10, topY + 16);
        ctx.textAlign = 'left';

        // Draw Waveform Curve Segments
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 3.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Helper function to convert raw physical value to canvas pixel Y
        const valToY = (rawVal: number) => {
          if (ch.key === 'flow') {
            const norm = Math.max(-1, Math.min(1, rawVal / 120));
            return zeroY - norm * (availableH * 0.5);
          } else {
            const norm = Math.max(0, Math.min(1, (rawVal - ch.min) / (ch.max - ch.min)));
            return zeroY - norm * availableH;
          }
        };

        // Break the trace at the eraser gap, even when it wraps over the left edge.
        ctx.beginPath();
        let started = false;
        for (let x = 0; x < width; x++) {
          const distanceAhead = (x - currSweepX + width) % width;
          const pt = historyRef.current[x];
          if (!pt || (distanceAhead > 0 && distanceAhead <= eraserWidth)) {
            started = false;
            continue;
          }
          const y = valToY(pt[ch.key]);
          if (!started) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          started = true;
        }
        ctx.stroke();
      });

      // 5. Draw Sweeping Beam Vertical Line
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(currSweepX, 0);
      ctx.lineTo(currSweepX, height);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset glow

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    startTime, settings.rr, settings.vt, settings.pinsp, settings.peep,
    settings.ieRatio, settings.pSupport, patient.compliance, patient.resistance, mode,
  ]);

  return (
    <div className="relative w-full h-full bg-[#060606] border border-[#222222] rounded overflow-hidden flex flex-col select-none shadow-inner">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
