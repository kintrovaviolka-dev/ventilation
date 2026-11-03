import { useEffect,useRef } from 'react';
import { RuntimeState, TraceSample } from '../lib/simulationRuntime';
import { Language } from '../types';
import { syncCanvasSize } from '../lib/canvasSize';
export function PVLoopCanvas({readState,tick,language}:{readState:()=>RuntimeState;tick:number;language:Language}) {
  const state=readState();
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
    const draw=()=>{
      const {width,height,dpr}=syncCanvasSize(canvas);if(!width||!height)return;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050b09';ctx.fillRect(0,0,width,height);
      const points=[...state.previousLoop,...state.currentLoop];
      const maxP=points.reduce((max,p)=>Math.max(max,Math.ceil(p.pressure/20)*20),40);
      const minP=points.reduce((min,p)=>Math.min(min,Math.floor(p.pressure/10)*10),0);
      const maxV=points.reduce((max,p)=>Math.max(max,Math.ceil(p.volume/200)*200),800);
      const minV=points.reduce((min,p)=>Math.min(min,Math.floor(p.volume/200)*200),0);
      const x=(p:number)=>48+(p-minP)/(maxP-minP)*(width-70);
      const y=(v:number)=>height-42-(v-minV)/(maxV-minV)*(height-100);
      ctx.font='10px monospace';ctx.fillStyle='#b7cbd2';ctx.fillText(language==='cs'?'P-V · skutečný předchozí dech':'P-V · actual previous breath',12,18);
      ctx.fillText(language==='cs'?'Objem nad rovnováhou PEEP (mL)':'Volume above PEEP equilibrium (mL)',12,35);
      for(let i=0;i<=4;i++) {
        const pressure=minP+i/4*(maxP-minP),volume=minV+i/4*(maxV-minV);
        ctx.strokeStyle='#233339';ctx.beginPath();ctx.moveTo(x(pressure),y(minV));ctx.lineTo(x(pressure),y(maxV));ctx.stroke();
        ctx.beginPath();ctx.moveTo(x(minP),y(volume));ctx.lineTo(x(maxP),y(volume));ctx.stroke();
        ctx.fillText(String(Math.round(pressure)),x(pressure)-5,height-27);ctx.fillText(String(Math.round(volume)),4,y(volume)+3);
      }
      ctx.fillText('Paw (cmH₂O)',Math.max(48,width-120),height-9);
      const trace=(data:TraceSample[],color:string)=>{
        ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();data.forEach((p,i)=>{if(i===0)ctx.moveTo(x(p.pressure),y(p.volume));else ctx.lineTo(x(p.pressure),y(p.volume));});ctx.stroke();
      };
      trace(state.previousLoop,'#28545e');trace(state.currentLoop,'#22d3ee');
      if(state.readings.circuitConnected){
        ctx.setLineDash([4,4]);ctx.strokeStyle='#9c8637';ctx.beginPath();
        ctx.moveTo(x(state.activeSettings.peep),y(0));
        const v=Math.min(maxV,(maxP-state.activeSettings.peep)*state.readings.cStat);
        ctx.lineTo(x(state.activeSettings.peep+v/state.readings.cStat),y(v));ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#c2a858';ctx.fillText(language==='cs'?'Čárkovaně: modelová poddajnost':'Dashed: modeled compliance',52,55);
      }
    };draw();const observer=new ResizeObserver(draw);observer.observe(canvas);return()=>observer.disconnect();
  },[state.currentLoop,state.previousLoop,state.activeSettings.peep,state.readings.cStat,state.readings.circuitConnected,language]);
  return <canvas ref={ref} className="recorded-trace" role="img" aria-label={language==='cs'?'Zaznamenaná P-V smyčka':'Recorded P-V loop'}/>;
}
