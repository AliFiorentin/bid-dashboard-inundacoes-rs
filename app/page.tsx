"use client";

import React from "react";
import Image from "next/image";

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

      <div className="lg:hidden fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-8 text-center bg-white">
        <Image src="/BID.png" alt="BID" width={160} height={64} className="h-12 w-auto object-contain" />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-black leading-tight" style={{ color: "#055071" }}>Avaliação de Impactos Socioeconômicos</h1>
          <p className="text-sm text-slate-500">Painel de Monitoramento</p>
        </div>
        <div className="rounded-2xl px-6 py-5 flex flex-col items-center gap-3 max-w-sm" style={{ backgroundColor: "#f0f7fa", border: "1px solid #b3cdd8" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#055071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="font-bold text-sm" style={{ color: "#055071" }}>Acesse pelo computador</p>
          <p className="text-slate-500 text-xs leading-relaxed">
            Este painel interativo com mapas e gráficos foi projetado para telas maiores.
            Para a melhor experiência, acesse em um computador ou tablet em modo paisagem.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Image src="/GPEA.png" alt="GPEa" width={80} height={32} className="h-7 w-auto object-contain" />
          <Image src="/CIEX2.png" alt="CIEX" width={80} height={32} className="h-7 w-auto object-contain" />
        </div>
      </div>

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

      <div
        className={`absolute bottom-4 rounded-xl z-10 print:hidden transition-[left] duration-300 overflow-hidden ${showPainelAnalise ? "left-[380px]" : "left-4"}`}
        style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", transitionTimingFunction: "var(--ease-out)" }}
      >
        <button
          onClick={() => setShowLegenda(p => !p)}
          className="w-full flex items-center justify-between gap-3 px-2.5 py-2"
          style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}
        >
          <span className="text-[9px] font-black uppercase tracking-wider text-white">Legenda</span>
          <span className="text-white" style={{ fontSize: 8 }}>{showLegenda ? "▼" : "▲"}</span>
        </button>
        {showLegenda && (
          <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
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
        <div
          className="px-3 py-1 rounded-xl select-none leading-none text-center"
          style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "#055071" }}>© GPEa - Grupo de Pesquisa em Economia Azul</span>
          <span className="text-[9px]" style={{ color: "#055071" }}> | Alisson Tallys Geraldo Fiorentin</span>
        </div>
      </div>

      <DashboardHeader dash={dash} />

      <FiltersPanel dash={dash} />

      <AnalysisPanel dash={dash} />
    </div>
  );
}



