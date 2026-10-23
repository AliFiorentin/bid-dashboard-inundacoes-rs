"use client"
import React from "react"
import type { CotaRaster } from "@/hooks/useCotaRaster"

const fmt = (v: number) => v.toFixed(2).replace(".", ",")

/** Cota atual + play/pause + slider. Usado na página de Danos e no cenário "Todas as cotas". */
export function CotaControle({ raster, className = "", vertical = false }: { raster: CotaRaster; className?: string; vertical?: boolean }) {
  const { cota, minimo, maximo, passo, tocando, setTocando, setCota } = raster
  if (cota === null) return null
  if (vertical) {
    // Slider vertical (cota alta em cima), usado ao lado do painel do Dashboard.
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-wide text-slate-500 font-bold">Cota</div>
          <div className="text-base font-black text-[#055071] tabular-nums leading-tight">{fmt(cota)}</div>
          <div className="text-[9px] font-bold text-slate-500">metros</div>
        </div>
        <button
          type="button"
          onClick={() => setTocando((t) => !t)}
          className="shrink-0 h-9 w-9 rounded-full bg-[#055071] text-white flex items-center justify-center text-sm"
          aria-label={tocando ? "Pausar" : "Reproduzir"} aria-pressed={tocando}
        >{tocando ? "❚❚" : "▶"}</button>
        <input
          type="range" min={minimo} max={maximo} step={passo / 20} value={cota}
          onChange={(ev) => setCota(parseFloat(ev.target.value))}
          className="flex-1 min-h-0 accent-[#055071]" aria-label="Cota do rio" aria-valuetext={`cota ${fmt(cota)} metros`}
          style={{ writingMode: "vertical-lr", direction: "rtl", width: 20 }}
        />
        <div className="text-[9px] font-bold text-slate-500 tabular-nums">{fmt(minimo)}</div>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      <div className="shrink-0 text-center w-20">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Cota</div>
        <div className="text-xl movel:text-lg movel:whitespace-nowrap font-black text-[#055071] tabular-nums">{fmt(cota)} m</div>
      </div>
      <button
        type="button"
        onClick={() => setTocando((t) => !t)}
        className="shrink-0 h-9 w-9 movel:h-11 movel:w-11 rounded-full bg-[#055071] text-white flex items-center justify-center text-sm"
        aria-label={tocando ? "Pausar" : "Reproduzir"} aria-pressed={tocando}
      >{tocando ? "❚❚" : "▶"}</button>
      <input
        type="range" min={minimo} max={maximo} step={passo / 20} value={cota}
        onChange={(ev) => setCota(parseFloat(ev.target.value))}
        className="flex-1 min-w-0 accent-[#055071] movel:h-11" aria-label="Cota do rio" aria-valuetext={`cota ${fmt(cota)} metros`}
      />
    </div>
  )
}
