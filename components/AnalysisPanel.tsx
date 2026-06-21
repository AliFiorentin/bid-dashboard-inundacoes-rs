"use client";

import React from "react";
import { Download, Printer, EyeOff, PanelLeft, Building2, GraduationCap, HeartPulse, Sprout, Wrench } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <div className="absolute top-[72px] left-4 bottom-2 w-[380px] flex flex-col rounded-2xl overflow-hidden z-20 print:static print:w-full print:shadow-none print:max-h-none print:h-auto print:overflow-visible print:border-slate-200" style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", animation: "panelSlideIn 320ms var(--ease-drawer) both" }}>
          <div className="px-4 pt-4 pb-3 shrink-0 rounded-t-2xl" style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center justify-between">
              Painel
              <div className="flex gap-1">
                <Button variant="outline" size="xs" onClick={exportarExcel} className="text-[9px] font-bold border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  <Download size={10} strokeWidth={2.5} />Baixar
                </Button>
                <Button variant="outline" size="xs" onClick={() => window.print()} className="text-[9px] font-bold border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white print:hidden">
                  <Printer size={10} strokeWidth={2.5} />Imprimir
                </Button>
                <Button variant="outline" size="xs" onClick={() => setShowPainelAnalise(false)} className="text-[9px] font-bold border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white print:hidden">
                  <EyeOff size={10} strokeWidth={2.5} />Ocultar
                </Button>
              </div>
            </h2>
            <p className="text-xs text-white/80 font-medium mt-1 leading-tight">
              <strong className="text-white">{municipio}</strong> {mostraImpacto && (isVisaoGeral ? ` — Piores Cenários` : ` — ${cenario}`)}
            </p>
          </div>
          <Tabs value={tabAtiva} className="w-full flex-1 flex flex-col overflow-hidden px-4 pt-3 print:overflow-visible print:h-auto">
            <div className="flex flex-wrap gap-1.5 shrink-0 pb-3">
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
                <Button
                  key={value}
                  variant={tabAtiva === value ? "default" : "outline"}
                  size="xs"
                  onClick={() => setTabAtiva(value)}
                  className="rounded-full text-[10px] font-bold"
                >
                  {icon}{label}
                </Button>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPainelAnalise(true)}
          className="absolute top-[100px] left-4 z-20 rounded-2xl text-xs font-black shadow-lg"
          style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <PanelLeft size={12} strokeWidth={2.5} />Abrir Painel de Análise
        </Button>
      )}

    </>
  );
}
