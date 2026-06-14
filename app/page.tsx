"use client";

import React from "react";

import {
  COLORS, INFRA_COLORS,
  AGRI_COLORS, AGRI_BOUNDS,
} from "@/lib/constants";
import { DashboardMap } from "@/components/DashboardMap";
import { LegendItem } from "@/components/LegendItem";
import { useDashboard } from "@/hooks/useDashboard";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { DashboardHeader } from "@/components/DashboardHeader";
import { FiltersPanel } from "@/components/FiltersPanel";

export default function Dashboard() {
  const dash = useDashboard();
  const {
    municipio,
    cenario,
    camadas,
    infraAtivas,
    showPainelAnalise,
    showMancha,
    showLegenda, setShowLegenda,
    isLoading,
    manchaCenario, manchaRS,
    isVisaoGeral,
    renderEmp, renderEdu, renderSau,
  } = dash;

  return (
    <div className="relative w-screen h-screen font-sans overflow-hidden bg-slate-100 text-slate-900 print:overflow-visible print:h-auto print:w-full">

      <DashboardMap dash={dash} />

      {isLoading && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-end justify-center pb-6">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-bold text-slate-700">Carregando dados...</span>
          </div>
        </div>
      )}

      <div className={`absolute bottom-4 rounded-xl shadow-lg z-10 print:hidden transition-[left] duration-300 ${showPainelAnalise ? "left-[380px]" : "left-4"}`} style={{ backgroundColor: "#fff", border: "1px solid #b3cdd8", transitionTimingFunction: "var(--ease-out)" }}>
        <button onClick={() => setShowLegenda(p => !p)} className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl" style={{ color: "#055071" }}>
          <span className="text-[9px] font-black uppercase tracking-wider">Legenda</span>
          <span style={{ fontSize: 8 }}>{showLegenda ? "▼" : "▲"}</span>
        </button>
        {showLegenda && (
          <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
            {camadas.includes("Empresas") && renderEmp?.features && <LegendItem cor={COLORS.empresas} label="Empresas" />}
            {camadas.includes("Educação") && renderEdu?.features && <LegendItem cor={COLORS.educacao} label="Educação" />}
            {camadas.includes("Saúde") && renderSau?.features && <LegendItem cor={COLORS.saude} label="Saúde" />}
            {camadas.includes("Agricultura") && !isVisaoGeral && AGRI_BOUNDS[municipio] && Object.entries(AGRI_COLORS).map(([tipo, cor]) => (
              <LegendItem key={`agri-${tipo}`} cor={cor} label={tipo} area />
            ))}
            {camadas.includes("Infraestrutura") && infraAtivas.map(nome => (
              <LegendItem key={`infra-${nome}`} cor={INFRA_COLORS[nome] ?? COLORS.infra} label={nome} area={["Quadras","Terrenos"].includes(nome)} />
            ))}
            {manchaCenario && !isVisaoGeral && showMancha && <LegendItem cor={COLORS.cenario} label={cenario} area />}
            {isVisaoGeral && manchaRS && showMancha && <LegendItem cor={COLORS.cenario} label="Enchente 2024 — RS" area />}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 inset-x-0 flex justify-center z-10 print:hidden pointer-events-none">
        <div className="px-2.5 py-0.5 rounded-xl shadow-lg select-none leading-none text-center" style={{ backgroundColor: "#fff", border: "1px solid #b3cdd8" }}>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "#1C293D" }}>© GPEa - Grupo de Pesquisa em Economia Azul</span>
          <span className="text-[9px]" style={{ color: "#1C293D" }}> | Alisson Tallys Geraldo Fiorentin</span>
        </div>
      </div>

      <DashboardHeader dash={dash} />

      <FiltersPanel dash={dash} />

      <AnalysisPanel dash={dash} />
    </div>
  );
}



