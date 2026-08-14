"use client";

import React from "react";
import { Download, Printer, EyeOff, PanelLeft, Building2, GraduationCap, HeartPulse, Sprout, Wrench, Users } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AGRI_BOUNDS } from "@/lib/constants";
import { EmpresasTab } from "@/components/tabs/EmpresasTab";
import { EducacaoTab } from "@/components/tabs/EducacaoTab";
import { SaudeTab } from "@/components/tabs/SaudeTab";
import { AgriculturaTab } from "@/components/AgriculturaTab";
import { InfraTab } from "@/components/tabs/InfraTab";
import { slugify } from "@/lib/geo-utils";
import { MUNICIPIOS, PIORES_CENARIOS } from "@/lib/constants";
import type { DashboardState } from "@/hooks/useDashboard";

interface AnalysisPanelProps {
  dash: DashboardState;
}

export function AnalysisPanel({ dash }: AnalysisPanelProps) {
  const {
    showPainelAnalise, setShowPainelAnalise,
    headerBottom,
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
    atingidosInfra, toggleInfra, infraStats,
    showListaLogradouros, setShowListaLogradouros,
    popData,
  } = dash;

  // Population KPI
  const findCenData = (munData: NonNullable<typeof popData>[string], cen: string) => {
    if (munData.cenarios[cen]) return munData.cenarios[cen];
    const s = slugify(cen);
    const match = Object.entries(munData.cenarios).find(([k]) => slugify(k) === s);
    return match ? match[1] : null;
  };

  const popMunData = !isVisaoGeral && popData ? popData[municipio] ?? null : null;
  const popCenData = (() => {
    if (!popMunData || !cenario || cenario === "(nenhum)") return null;
    return findCenData(popMunData, cenario);
  })();

  const popGeralTotal = isVisaoGeral && popData
    ? MUNICIPIOS.reduce((acc, m) => acc + (popData[m]?.pop_total ?? 0), 0)
    : null;
  const popGeralAtingida = isVisaoGeral && popData
    ? MUNICIPIOS.reduce((acc, m) => {
        const d = popData[m];
        if (!d) return acc;
        const cen = PIORES_CENARIOS[m];
        const cenData = cen ? findCenData(d, cen) : null;
        return acc + (cenData?.pop_atingida ?? 0);
      }, 0)
    : null;
  const popGeralPct = popGeralTotal && popGeralAtingida != null && popGeralTotal > 0
    ? (popGeralAtingida / popGeralTotal) * 100
    : null;

  return (
    <>
      {showPainelAnalise && (
        <div className="hidden lg:flex absolute left-3 bottom-1.5 w-[400px] flex-col rounded-xl overflow-hidden z-20 print:flex print:static print:w-full print:shadow-none print:max-h-none print:h-auto print:overflow-visible print:border-slate-200" style={{ top: headerBottom, backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", animation: "panelSlideIn 320ms var(--ease-drawer) both" }}>
          <div className="px-3 pt-3 pb-2 shrink-0 rounded-t-xl" style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}>
            <h2 className="text-base font-black text-white tracking-tight flex items-center justify-between">
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
            <div className="flex flex-wrap gap-1.5 shrink-0 pb-2">
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

            {/* KPI fixo de população — largura total, abaixo das abas */}
            {(popMunData || isVisaoGeral) && (popMunData || popGeralTotal != null) && (
              <div className="shrink-0 mb-2 rounded-lg border overflow-hidden"
                style={{ borderColor: "#e9d5ff", background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)" }}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <Users size={13} strokeWidth={2.5} className="text-purple-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end gap-1">
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold text-purple-500 uppercase tracking-wider leading-none mb-0.5">Pop. Total</div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-[13px] font-black text-purple-800 tabular-nums">
                            {(isVisaoGeral ? popGeralTotal : popMunData?.pop_total)?.toLocaleString("pt-BR")}
                          </span>
                          <span className="text-[9px] text-purple-400">hab.</span>
                        </div>
                      </div>
                      {(isVisaoGeral ? popGeralAtingida != null : !!popCenData) && (
                        <div className="text-right shrink-0 min-w-0">
                          <div className="text-[9px] font-bold text-red-500 uppercase tracking-wider leading-none mb-0.5">
                            {isVisaoGeral ? "Atingida (piores)" : "Atingida"}
                          </div>
                          <div className="flex items-baseline gap-0.5 justify-end">
                            <span className="text-[13px] font-black text-red-700 tabular-nums">
                              {(isVisaoGeral ? popGeralAtingida : popCenData?.pop_atingida)?.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-[9px] text-red-400">
                              ({(isVisaoGeral ? popGeralPct : popCenData?.pct_atingida)?.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {(isVisaoGeral ? popGeralPct != null : !!popCenData) && (
                      <div className="mt-1.5 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(isVisaoGeral ? (popGeralPct ?? 0) : (popCenData?.pct_atingida ?? 0), 100)}%`,
                            background: "linear-gradient(to right, #9333ea, #dc2626)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {/* Sem "infraAtivas.length > 0": as categorias OSM têm KPI sempre
                visível, mesmo com nenhuma camada marcada para o mapa — que é o
                estado padrão. Exigir camada ativa esconderia justamente esses. */}
            {camadas.includes("Infraestrutura") && !isVisaoGeral && (
              <InfraTab dash={{ infraAtivas, toggleInfra, municipio, cenario, mostraImpacto, isCenarioAtivo, infraStats, atingidosInfra, showListaLogradouros, setShowListaLogradouros }} />
            )}

          </Tabs>
        </div>
      )}

      {!showPainelAnalise && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPainelAnalise(true)}
          className="hidden lg:flex absolute left-4 z-20 rounded-2xl text-xs font-black shadow-lg"
          style={{ top: headerBottom, backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <PanelLeft size={12} strokeWidth={2.5} />Abrir Painel de Análise
        </Button>
      )}

    </>
  );
}
