"use client";

import React from "react";
import { Download, EyeOff, PanelLeft, LayoutDashboard, Building2, GraduationCap, HeartPulse, Sprout, Wrench, Users } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AGRI_BOUNDS, INFRAESTRUTURA_CONFIG } from "@/lib/constants";
import { ResumoTab } from "@/components/tabs/ResumoTab";
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
    camadas,
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
    baseInfra, atingidosInfra,
    allMunInfraStats,
    showListaLogradouros, setShowListaLogradouros,
    showListaEixos, setShowListaEixos,
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
          <div className="shrink-0 rounded-t-xl" style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)", paddingInline: "0.75rem", paddingBlockStart: "clamp(0.4rem, 1.2vh, 0.75rem)", paddingBlockEnd: "clamp(0.25rem, 0.8vh, 0.5rem)" }}>
            <h2 className="font-black text-white tracking-tight flex items-center justify-between" style={{ fontSize: "clamp(12px, 1.7vh, 16px)" }}>
              Painel
              <div className="flex gap-1">
                <Button variant="outline" size="xs" onClick={exportarExcel} className="text-[9px] font-bold border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  <Download size={10} strokeWidth={2.5} />Baixar
                </Button>
                <Button variant="outline" size="xs" onClick={() => setShowPainelAnalise(false)} className="text-[9px] font-bold border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white print:hidden">
                  <EyeOff size={10} strokeWidth={2.5} />Ocultar
                </Button>
              </div>
            </h2>
            <p className="text-white/80 font-medium leading-tight" style={{ fontSize: "clamp(10px, 1.3vh, 12px)", marginTop: "clamp(1px, 0.3vh, 4px)" }}>
              <strong className="text-white">{municipio}</strong> {mostraImpacto && (isVisaoGeral ? ` — Piores Cenários` : ` — ${cenario}`)}
            </p>
          </div>
          <Tabs value={tabAtiva} className="w-full flex-1 flex flex-col overflow-hidden px-4 print:overflow-visible print:h-auto" style={{ paddingBlockStart: "clamp(0.35rem, 0.9vh, 0.75rem)" }}>
            <div className="flex flex-wrap shrink-0" style={{ gap: "clamp(0.2rem, 0.5vh, 0.375rem)", paddingBottom: "clamp(0.25rem, 0.7vh, 0.5rem)" }}>
              {([
                { value: "resumo",   label: "Resumo",   icon: <LayoutDashboard size={11} strokeWidth={2.5} /> },
                { value: "empresas", label: "Empresas", icon: <Building2     size={11} strokeWidth={2.5} /> },
                { value: "educacao", label: "Educação", icon: <GraduationCap size={11} strokeWidth={2.5} /> },
                { value: "saude",    label: "Saúde",    icon: <HeartPulse    size={11} strokeWidth={2.5} /> },
                ...( camadas.includes("Agricultura") && (isVisaoGeral || AGRI_BOUNDS[municipio])
                  ? [{ value: "agricultura", label: "Agricultura", icon: <Sprout size={11} strokeWidth={2.5} /> }]
                  : []),
                ...( isVisaoGeral || (INFRAESTRUTURA_CONFIG[municipio]?.length ?? 0) > 0
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
              <div className="shrink-0 rounded-lg border overflow-hidden"
                style={{ borderColor: "#e9d5ff", background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)", marginBottom: "clamp(0.25rem, 0.7vh, 0.5rem)" }}>
                <div className="flex items-center gap-2" style={{ paddingInline: "0.75rem", paddingBlock: "clamp(0.3rem, 0.9vh, 0.5rem)" }}>
                  <Users size={13} strokeWidth={2.5} className="text-purple-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end gap-1">
                      <div className="min-w-0">
                        <div className="font-bold text-purple-500 uppercase tracking-wider leading-none mb-0.5" style={{ fontSize: "clamp(7.5px, 0.95vh, 9px)" }}>Pop. Total</div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="font-black text-purple-800 tabular-nums" style={{ fontSize: "clamp(11px, 1.5vh, 13px)" }}>
                            {(isVisaoGeral ? popGeralTotal : popMunData?.pop_total)?.toLocaleString("pt-BR")}
                          </span>
                          <span className="text-purple-400" style={{ fontSize: "clamp(7.5px, 0.95vh, 9px)" }}>hab.</span>
                        </div>
                      </div>
                      {(isVisaoGeral ? popGeralAtingida != null : !!popCenData) && (
                        <div className="text-right shrink-0 min-w-0">
                          <div className="font-bold text-red-500 uppercase tracking-wider leading-none mb-0.5" style={{ fontSize: "clamp(7.5px, 0.95vh, 9px)" }}>
                            {isVisaoGeral ? "Atingida (piores)" : "Atingida"}
                          </div>
                          <div className="flex items-baseline gap-0.5 justify-end">
                            <span className="font-black text-red-700 tabular-nums" style={{ fontSize: "clamp(11px, 1.5vh, 13px)" }}>
                              {(isVisaoGeral ? popGeralAtingida : popCenData?.pop_atingida)?.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-red-400" style={{ fontSize: "clamp(7.5px, 0.95vh, 9px)" }}>
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

            <ResumoTab dash={{ municipio, cenario, mostraImpacto, isVisaoGeral, isCenarioAtivo, metricasEmp, metricasEdu, metricasSau, baseAgriStats, atingidosAgriStats, conabStats, allMunAgriStats, allMunAgriAtingidosStats, baseInfra, atingidosInfra, allMunInfraStats }} />

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

            {(isVisaoGeral || (INFRAESTRUTURA_CONFIG[municipio]?.length ?? 0) > 0) && (
              <InfraTab dash={{ municipio, isVisaoGeral, mostraImpacto, isCenarioAtivo, baseInfra, atingidosInfra, allMunInfraStats, showListaLogradouros, setShowListaLogradouros, showListaEixos, setShowListaEixos }} />
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
