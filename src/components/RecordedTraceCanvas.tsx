import { useEffect, useRef } from 'react';
import { RuntimeState, TraceSample } from '../lib/simulationRuntime';
import { syncCanvasSize } from '../lib/canvasSize';
import { MMHG_TO_KPA } from '../lib/monitorUnits';
import { cardiacWindowSeconds } from '../lib/cardiacWaveform';
import { Language } from '../types';

export type TraceKind = 'pressure' | 'flow' | 'co2' | 'ecg' | 'spo2' | 'ventilator' | 'vitals';
type Channel = { key: keyof Pick<TraceSample, 'pressure'|'flow'|'co2'|'ecg'|'pleth'>; label: string; color: string; min: number; max: number; factor?: number };
export function RecordedTraceCanvas({ readState, tick, language, kind }: {
  readState:()=>RuntimeState; tick:number; language:Language; kind:TraceKind;
}) {
  const samples = readState().history;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const draw = () => {
      const { width, height, dpr } = syncCanvasSize(canvas);
      if (!width || !height) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = '#050b09';
      context.fillRect(0, 0, width, height);
      const max = (key:Channel['key'], baseline:number, step:number, factor=1) =>
        samples.reduce((value,sample)=>Math.max(value,Math.ceil(Math.abs(sample[key]*factor)/step)*step),baseline);
      const flowMax = max('flow',60,30);
      const channels:Record<string,Channel> = {
        pressure: {key:'pressure',label:'Paw  cmH₂O',color:'#f4d969',min:Math.min(0,...samples.map(s=>Math.floor(s.pressure/10)*10)),max:max('pressure',40,20)},
        flow: {key:'flow',label:language==='cs'?'Průtok  L/min':'Flow  L/min',color:'#91e09a',min:-flowMax,max:flowMax},
        co2: {key:'co2',label:'CO₂  kPa',color:'#83dbe5',min:0,max:max('co2',8,2,MMHG_TO_KPA),factor:MMHG_TO_KPA},
        ecg: {key:'ecg',label:'ECG II',color:'#66ee8b',min:-.5,max:1.2},
        spo2: {key:'pleth',label:'SpO₂',color:'#57d9ed',min:0,max:1.3},
      };
      const names = kind==='ventilator' ? ['pressure','flow','co2'] : kind==='vitals' ? ['ecg','spo2'] : [kind];
      const end = samples.at(-1)?.time ?? 0;
      const seconds = kind === 'ecg' || kind === 'spo2' || kind === 'vitals' ? cardiacWindowSeconds(width - 34) : 10;
      const start = Math.max(0, end - seconds);
      names.forEach((name,index) => {
        const channel = channels[name], channelH = height/names.length, top = index*channelH;
        const plotTop = top+34, plotBottom = top+channelH-18, left = 28, right = width-6;
        const y = (value:number)=>plotBottom-(value-channel.min)/(channel.max-channel.min)*(plotBottom-plotTop);
        context.strokeStyle='#142126'; context.lineWidth=1;
        for(let second=0;second<=seconds;second++) {
          const x=left+second/seconds*(right-left);
          context.beginPath(); context.moveTo(x,plotTop); context.lineTo(x,plotBottom); context.stroke();
        }
        context.strokeStyle='#2a3c40';context.beginPath();context.moveTo(left,y(0));context.lineTo(right,y(0));context.stroke();
        context.fillStyle=channel.color;context.font='bold 12px monospace';context.textAlign='left';context.fillText(channel.label,8,top+17);
        context.font='10px monospace';context.textAlign='right';context.fillStyle='#849a9e';context.fillText(`${seconds} s`,right,top+17);
        if(name!=='ecg'&&name!=='spo2') {
          context.fillText(String(channel.max),left-4,plotTop+8);
          context.fillText(String(channel.min),left-4,plotBottom);
          if(channel.min<0)context.fillText('0',left-4,y(0)+3);
        }
        context.strokeStyle=channel.color;context.lineWidth=2;context.lineJoin='round';context.beginPath();
        let started=false;
        for(const sample of samples) {
          if(sample.time<start)continue;
          const x=left+(sample.time-start)/seconds*(right-left),value=sample[channel.key]*(channel.factor??1);
          if(!started)context.moveTo(x,y(value));else context.lineTo(x,y(value));
          started=true;
        }
        context.stroke();
      });
    };
    draw();
    const observer=new ResizeObserver(draw);observer.observe(canvas);
    return()=>observer.disconnect();
  },[samples,tick,language,kind]);
  const label = {pressure:'Paw',flow:language==='cs'?'Průtok':'Flow',co2:'CO₂ (kPa)',ecg:'ECG II',spo2:language==='cs'?'SpO₂ · křivka pulzního oxymetru':'SpO₂ · pulse oximeter waveform',ventilator:'Paw / Flow / CO₂',vitals:'ECG / SpO₂'}[kind];
  return <canvas ref={ref} className="recorded-trace" role="img" aria-label={label}/>;
}
