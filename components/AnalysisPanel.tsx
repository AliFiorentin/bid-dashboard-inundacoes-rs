"use client";

import React from "react";
import { Download, Printer, EyeOff, PanelLeft, Building2, GraduationCap, HeartPulse, Sprout, Wrench } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { AGRI_BOUNDS } from "@/lib/constants";
import { EmpresasTab } from "@/components/tabs/EmpresasTab";
import { EducacaoTab } from "@/components/tabs/EducacaoTab";
import { SaudeTab } from "@/components/tabs/SaudeTab";
import { AgriculturaTab } from "@/components/AgriculturaTab";
import { InfraTab } from "@/components/tabs/InfraTab";
import type { DashboardState } from "@/hooks/useDashboard";

interface AnalysisPanelProps {
  dash: DashboardState;
}

export function AnalysisPanel({ dash }: AnalysisPanelProps) {
  const {
    showPainelAnalise, setShowPainelAnalise,
    exportarExcel,
    municipio, cenario,
    mostraImpacto, isVisaoGeral,
    tabAtiva, setTabAtiva,
    camadas, infraAtivas,
    isCenarioAtivo,
    setoresChart, setoresEmpregadosChart, metricasEmp,
    metricasEdu, professoresDepChart,
    metricasSau,
    atingidosEducacao, baseEducacao,
    showListaEscolas, setShowListaEscolas,
    atingidosSaude,
    showListaHospitais, setShowListaHospitais,
    showListaUBS, setShowListaUBS,
    showListaAmbulat, setShowListaAmbulat,
    baseAgriStats, atingidosAgriStats, conabStats,
    allMunAgriStats, allMunAgriAtingidosStats,
    baseInfra, atingidosInfra, toggleInfra,
    showListaLogradouros, setShowListaLogradouros,
    showListaEixos, setShowListaEixos,
  } = dash;

  return (
    <>
      {showPainelAnalise && (
        <div className="absolute top-[72px] left-4 bottom-2 w-[330px] flex flex-col rounded-2xl p-4 overflow-hidden z-20 print:static print:w-full print:shadow-none print:max-h-none print:h-auto print:overflow-visible print:border-slate-200" style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", animation: "panelSlideIn 320ms var(--ease-drawer) both" }}>
          <div className="mb-3 shrink-0">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center justify-between">
              Painel
              <div className="flex gap-1">
                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-md transition-[background-color,color,transform] duration-150 active:scale-[0.97] shadow-sm cursor-pointer border hover:text-white hover:bg-[#055071] active:bg-[#033a52]"
                  style={{ backgroundColor: "#ffffff", color: "#055071", borderColor: "#b3cdd8" }}
                >
                  <Download size={10} strokeWidth={2.5} />Baixar
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-md transition-[background-color,color,transform] duration-150 active:scale-[0.97] shadow-sm print:hidden border hover:text-white hover:bg-[#055071] active:bg-[#033a52]"
                  style={{ backgroundColor: "#ffffff", color: "#055071", borderColor: "#b3cdd8" }}
                >
                  <Printer size={10} strokeWidth={2.5} />Imprimir
                </button>
                <button onClick={() => setShowPainelAnalise(false)}
                  className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-md transition-[background-color,color,transform] duration-150 active:scale-[0.97] shadow-sm print:hidden border hover:text-white hover:bg-[#055071] active:bg-[#033a52]"
                  style={{ backgroundColor: "#ffffff", color: "#055071", borderColor: "#b3cdd8" }}
                >
                  <EyeOff size={10} strokeWidth={2.5} />Ocultar
                </button>
              </div>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">
              <strong className="text-slate-700">{municipio}</strong> {mostraImpacto && (isVisaoGeral ? ` - Piores Cenários` : ` - ${cenario}`)}
            </p>
          </div>

          <Tabs value={tabAtiva} className="w-full flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto">
            <div className="flex flex-wrap gap-1.5 shrink-0 pb-3 border-b border-slate-200/60">
              {([
                { value: "empresas", label: "Empresas", icon: <Building2     size={11} strokeWidth={2.5} /> },
                { value: "educacao", label: "Educação", icon: <GraduationCap size={11} strokeWidth={2.5} /> },
                { value: "saude",    label: "Saúde",    icon: <HeartPulse    size={11} strokeWidth={2.5} /> },
                ...( camadas.includes("Agricultura") && (isVisaoGeral || AGRI_BOUNDS[municipio])
                  ? [{ value: "agricultura", label: "Agricultura", icon: <Sprout size={11} strokeWidth={2.5} /> }]
                  : []),
                ...( camadas.includes("Infraestrutura") && !isVisaoGeral && infraAtivas.length > 0
                  ? [{ value: "infra", label: "Infraestrutura", icon: <Wrench size={11} strokeWidth={2.5} /> }]
                  : []),
              ] as { value: string; label: string; icon: React.ReactNode }[]).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setTabAtiva(value)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-[background-color,color,box-shadow] duration-150 border focus-visible:outline-none"
                  style={tabAtiva === value
                    ? { backgroundColor: "#055071", color: "#fff", borderColor: "#033a52", boxShadow: "0 1px 3px rgba(0,0,0,.18)" }
                    : { backgroundColor: "#fff", color: "#3d7a94", borderColor: "#b3cdd8" }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            <EmpresasTab dash={{ setoresChart, setoresEmpregadosChart, metricasEmp, mostraImpacto }} />

            <EducacaoTab dash={{ metricasEdu, professoresDepChart, mostraImpacto, isVisaoGeral, atingidosEducacao, baseEducacao, showListaEscolas, setShowListaEscolas }} />

            <SaudeTab dash={{ metricasSau, mostraImpacto, isVisaoGeral, atingidosSaude, showListaHospitais, setShowListaHospitais, showListaUBS, setShowListaUBS, showListaAmbulat, setShowListaAmbulat }} />

            {/* Agricultura */}
            {camadas.includes("Agricultura") && (isVisaoGeral || AGRI_BOUNDS[municipio]) && (
              <AgriculturaTab
                municipio={municipio}
                cenario={cenario}
                isVisaoGeral={isVisaoGeral}
                isCenarioAtivo={isCenarioAtivo}
                baseAgriStats={baseAgriStats}
                atingidosAgriStats={atingidosAgriStats}
                conabStats={conabStats}
                allMunAgriStats={allMunAgriStats ?? undefined}
                allMunAgriAtingidosStats={allMunAgriAtingidosStats ?? undefined}
              />
            )}

            {camadas.includes("Infraestrutura") && !isVisaoGeral && infraAtivas.length > 0 && (
              <InfraTab dash={{ infraAtivas, toggleInfra, municipio, mostraImpacto, isCenarioAtivo, baseInfra, atingidosInfra, showListaLogradouros, setShowListaLogradouros, showListaEixos, setShowListaEixos }} />
            )}
          </Tabs>
        </div>
      )}

      {!showPainelAnalise && (
        <button
          onClick={() => setShowPainelAnalise(true)}
          className="absolute top-[100px] left-4 text-slate-800 text-xs font-black px-4 py-2 rounded-2xl z-20 transition-[background-color,transform] duration-150 active:scale-[0.97] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1"
          style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <PanelLeft size={12} strokeWidth={2.5} />Abrir Painel de Análise
        </button>
      )}

    </>
  );
}
