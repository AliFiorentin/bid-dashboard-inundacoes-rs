"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DonutChart } from "@/components/ui/donut-chart";
import {
  C, AGRI_COLORS, CENARIO_PERIODO, IMPACTO_AGRICOLA, MUNICIPIOS, PANEL_CARD_BG,
} from "@/lib/constants";
import { scenarioSlug, calcPct } from "@/lib/geo-utils";
import { KPICard } from "@/components/KPICard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;

interface ConabStats {
  soja: { area_ha: number };
  arroz: { area_ha: number };
}

interface AgriculturaTabProps {
  municipio: string;
  cenario: string;
  isVisaoGeral: boolean;
  isCenarioAtivo: boolean;
  baseAgriStats: Record<string, number> | null;
  atingidosAgriStats: Record<string, number> | null;
  conabStats: ConabStats | null;
  allMunAgriStats?: Record<string, Record<string, number>>;
  allMunAgriAtingidosStats?: Record<string, Record<string, number>>;
}

export function AgriculturaTab({
  municipio, cenario, isVisaoGeral, isCenarioAtivo,
  baseAgriStats, atingidosAgriStats, conabStats, allMunAgriStats, allMunAgriAtingidosStats,
}: AgriculturaTabProps) {

  // ── Visão Geral RS ─────────────────────────────────────────────────────────
  if (isVisaoGeral) {
    const culturas = Object.keys(AGRI_COLORS);
    const hasAtingidos = !!allMunAgriAtingidosStats && Object.keys(allMunAgriAtingidosStats).length > 0;
    const statsSource = hasAtingidos ? allMunAgriAtingidosStats! : allMunAgriStats;
    const baseSource  = allMunAgriStats;

    const totalRS: Record<string, number> = {};
    const totalRSBase: Record<string, number> = {};
    culturas.forEach(c => { totalRS[c] = 0; totalRSBase[c] = 0; });
    MUNICIPIOS.forEach(mun => {
      const stats = statsSource?.[mun] ?? {};
      const statsBase = baseSource?.[mun] ?? {};
      culturas.forEach(c => {
        totalRS[c] = (totalRS[c] ?? 0) + (stats[c] ?? 0);
        totalRSBase[c] = (totalRSBase[c] ?? 0) + (statsBase[c] ?? 0);
      });
    });
    const totalHa = Object.values(totalRS).reduce((s, v) => s + v, 0);

    return (
      <TabsContent value="agricultura" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex flex-col gap-2 mb-4">
          {culturas.map(nome => {
            const ha = totalRS[nome] ?? 0;
            const haBase = totalRSBase[nome] ?? 0;
            if (ha === 0 && haBase === 0) return null;
            const cor = AGRI_COLORS[nome] ?? "#6B8E23";
            const pct = totalHa > 0 ? (ha / totalHa * 100).toFixed(1) : "0";
            return (
              <KPICard
                key={nome}
                titulo={nome}
                cor={cor}
                principal={{
                  valor: `${ha.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha`,
                  sub: hasAtingidos ? "Atingida" : "Total",
                  delta: hasAtingidos ? `de ${haBase.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha (${calcPct(ha, haBase)})` : undefined,
                }}
              >
                <div className="border-t px-3 py-2.5 flex flex-col gap-1.5" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Por Município</span>
                  {MUNICIPIOS.map(mun => {
                    const mHa = statsSource?.[mun]?.[nome] ?? 0;
                    const mHaBase = baseSource?.[mun]?.[nome] ?? 0;
                    if (mHa === 0 && mHaBase === 0) return null;
                    const mPct = ha > 0 ? (mHa / ha * 100) : 0;
                    return (
                      <div key={mun} className="flex items-center gap-1.5">
                        <span className="text-[10px] w-24 shrink-0 truncate" style={{ color: C.muted }}>{mun}</span>
                        <div className="flex-1 rounded-full h-1.5 overflow-hidden bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${mPct}%`, backgroundColor: cor }} />
                        </div>
                        <span className="text-[10px] tabular-nums w-24 text-right shrink-0" style={{ color: C.muted }}>
                          {mHa.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha
                          {hasAtingidos && mHaBase > 0 && (
                            <span className="text-[9px] opacity-60"> ({(mHa / mHaBase * 100).toFixed(0)}%)</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[10px] pt-0.5" style={{ color: C.muted }}>{pct}% do total atingido no RS</p>
                </div>
              </KPICard>
            );
          })}
        </div>
        <p className="text-[10px] italic mt-2 text-muted-foreground">
          Fonte: MapaBiomas — Coleção 10{hasAtingidos ? " · Manchas por município (pior cenário)" : ""}
        </p>
      </TabsContent>
    );
  }

  // ── Município específico ───────────────────────────────────────────────────
  if (!baseAgriStats) {
    return (
      <TabsContent value="agricultura" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2">
        <p className="text-xs text-center py-4 text-muted-foreground">Carregando...</p>
      </TabsContent>
    );
  }

  const stats       = isCenarioAtivo ? atingidosAgriStats : baseAgriStats;
  const haTotal     = Object.values(stats ?? {}).reduce((s, v) => s + v, 0);
  const haTotalBase = Object.values(baseAgriStats).reduce((s, v) => s + v, 0);
  const pieData     = Object.entries(stats ?? {}).map(([nome, ha]) => ({
    name: nome, value: ha, cor: AGRI_COLORS[nome] ?? "#6B8E23",
  }));

  const sSlugCen = isCenarioAtivo ? scenarioSlug(municipio, cenario) : null;
  const periodo  = sSlugCen ? CENARIO_PERIODO[sSlugCen] : null;
  const coefs    = periodo ? IMPACTO_AGRICOLA[periodo] : null;

  const areaImpacto: Record<string, { ha: number; fonte: string }> = {};
  if (isCenarioAtivo && coefs) {
    Object.keys(coefs).forEach(nome => {
      let ha = atingidosAgriStats?.[nome] ?? 0;
      let fonte = "MapaBiomas";
      if (nome === "Soja"  && conabStats && conabStats.soja.area_ha  > 0) { ha = conabStats.soja.area_ha;  fonte = "CONAB"; }
      if (nome === "Arroz" && conabStats && conabStats.arroz.area_ha > 0) { ha = conabStats.arroz.area_ha; fonte = "CONAB"; }
      if (ha > 0) areaImpacto[nome] = { ha, fonte };
    });
  }
  const impactoTotal = Object.entries(areaImpacto)
    .reduce((sum, [nome, { ha }]) => sum + ha * (coefs?.[nome]?.coef ?? 0), 0);

  return (
    <TabsContent value="agricultura" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {/* Donut */}
      {pieData.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-3 print:hidden" style={{ border: "1px solid rgba(5,80,113,0.15)" }}>
          <div className="flex items-center px-2.5 py-1.5" style={PANEL_HDR}>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Área por Cultura</h3>
          </div>
          <div className="flex flex-col" style={{ backgroundColor: PANEL_CARD_BG }}>
            <div className="flex items-center justify-center py-2">
              <DonutChart
                data={pieData.map(d => ({ label: d.name, value: d.value, color: d.cor }))}
                size={170}
                strokeWidth={22}
                centerContent={
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-foreground leading-none">
                      {haTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="mt-1 text-[9px] text-muted-foreground leading-none">
                      {isCenarioAtivo
                        ? `de ${haTotalBase.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha (${haTotalBase > 0 ? (haTotal / haTotalBase * 100).toFixed(1) : "0,0"}%)`
                        : "ha"}
                    </span>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Card total impacto */}
      {isCenarioAtivo && coefs && impactoTotal > 0 && (
        <Card size="sm" className="mb-3 border-orange-300 bg-orange-50 print:break-inside-avoid">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5 text-orange-700">Prejuízo Agrícola Estimado</p>
            <p className="text-[22px] font-black leading-none text-orange-600">
              R$ {impactoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] mt-0.5 text-orange-800">
              {Object.keys(areaImpacto).length} cultura{Object.keys(areaImpacto).length !== 1 ? "s" : ""} afetada{Object.keys(areaImpacto).length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista unificada por cultura */}
      <div className="flex flex-col gap-2 pb-2">
        {Object.entries(baseAgriStats).map(([nome, haBase]) => {
          const haAtg  = atingidosAgriStats?.[nome] ?? 0;
          const cor    = AGRI_COLORS[nome] ?? "#6B8E23";
          if (isCenarioAtivo && haAtg === 0 && !areaImpacto[nome]) return null;

          const aiEntry = areaImpacto[nome];
          const haExib  = isCenarioAtivo ? (aiEntry?.ha ?? haAtg) : haBase;
          const fonte   = aiEntry?.fonte ?? "MapaBiomas";
          const c       = coefs?.[nome];
          const impacto = c && aiEntry ? aiEntry.ha * c.coef : 0;

          return (
            <KPICard
              key={nome}
              titulo={nome}
              cor={cor}
              principal={{
                valor: isCenarioAtivo && impacto > 0
                  ? `R$ ${impacto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                  : `${haExib.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha`,
                sub: isCenarioAtivo ? "Atingida" : "No Município",
                delta: isCenarioAtivo
                  ? `Área (${fonte}): ${haExib.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha${haBase > 0 ? ` de ${haBase.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha (${(haExib / haBase * 100).toFixed(1)}%)` : ""}`
                  : undefined,
              }}
            >
              {isCenarioAtivo && c && (
                <div className="border-t px-3 py-2 flex flex-col gap-0.5 text-[10px]" style={{ borderColor: "rgba(5,80,113,0.15)", color: C.muted }}>
                  <span>Situação: <b className="text-slate-600">{c.status}</b> · R$ {c.coef.toLocaleString("pt-BR")}/ha</span>
                  <span className="italic">{c.nota}</span>
                </div>
              )}
            </KPICard>
          );
        })}
        {isCenarioAtivo && Object.keys(atingidosAgriStats ?? {}).length === 0 && Object.keys(areaImpacto).length === 0 && (
          <p className="text-xs text-center py-2 text-muted-foreground">Nenhuma cultura atingida neste cenário.</p>
        )}
      </div>

      {/* Metodologia */}
      {isCenarioAtivo && coefs && (
        <Card size="sm" className="mt-1 py-0 gap-0 bg-sky-50/60 print:break-inside-avoid">
          <CardContent className="p-2">
            <p className="text-[10px] font-bold mb-0.5" style={{ color: C.primary }}>Metodologia</p>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Coeficientes baseados no calendário agrícola RS e preços mínimos CONAB.
              Soja/Arroz: área via CONAB (quando disponível), demais via MapaBiomas Col. 10.
              &ldquo;Outras Lavouras&rdquo; inclui principalmente Trigo e Aveia.
              Estimativa de custo direto — não inclui perdas indiretas.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] italic mt-3 text-muted-foreground">
        Fontes: MapaBiomas Col. 10 · CONAB Mapeamentos Agrícolas · Preços Mínimos CONAB 2024
      </p>
    </TabsContent>
  );
}
