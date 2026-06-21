"use client";

import { useMemo } from "react";
import { PieChart, Pie, Label } from "recharts";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  C, AGRI_COLORS, CENARIO_PERIODO, IMPACTO_AGRICOLA, MUNICIPIOS,
} from "@/lib/constants";
import { scenarioSlug } from "@/lib/geo-utils";

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
    culturas.forEach(c => { totalRS[c] = 0; });
    MUNICIPIOS.forEach(mun => {
      const stats = statsSource?.[mun] ?? {};
      culturas.forEach(c => { totalRS[c] = (totalRS[c] ?? 0) + (stats[c] ?? 0); });
    });
    const totalHa = Object.values(totalRS).reduce((s, v) => s + v, 0);

    return (
      <TabsContent value="agricultura" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1" style={{ color: C.primary }}>
          Área Agrícola Atingida — Todos os Municípios
        </h3>
        <Separator className="mb-2" />
        {hasAtingidos && (
          <p className="text-[10px] mb-3 px-2 py-1.5 rounded-md" style={{ color: C.muted, backgroundColor: "#f0f7fa", borderLeft: `2px solid ${C.border}` }}>
            Área dentro da mancha de inundação de cada município (pior cenário).
          </p>
        )}
        <div className="flex flex-col gap-2 mb-4">
          {culturas.map(nome => {
            const ha = totalRS[nome] ?? 0;
            if (ha === 0) return null;
            const cor = AGRI_COLORS[nome] ?? "#6B8E23";
            const pct = totalHa > 0 ? (ha / totalHa * 100).toFixed(1) : "0";
            return (
              <Card key={nome} size="sm" className="py-0 gap-0 print:break-inside-avoid">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                      <span className="text-[10px] font-bold" style={{ color: C.dark }}>{nome}</span>
                    </div>
                    <span className="text-[10px] font-black tabular-nums" style={{ color: C.primary }}>
                      {ha.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
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
                          <span className="text-[10px] tabular-nums w-20 text-right shrink-0" style={{ color: C.muted }}>
                            {mHa.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha
                            {hasAtingidos && mHaBase > 0 && (
                              <span className="text-[9px] opacity-60"> ({(mHa / mHaBase * 100).toFixed(0)}%)</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: C.muted }}>{pct}% do total atingido no RS</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Separator className="mb-2" />
        <p className="text-[10px] italic pt-2 text-muted-foreground">
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
  const pieData     = Object.entries(stats ?? {}).map(([nome, ha], i) => ({
    key: `c${i}`, name: nome, value: ha, cor: AGRI_COLORS[nome] ?? "#6B8E23", fill: `var(--color-c${i})`,
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    for (const d of pieData) {
      cfg[d.key] = { label: d.name, color: d.cor };
    }
    return cfg;
  }, [pieData]);

  return (
    <TabsContent value="agricultura" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {/* Donut */}
      {pieData.length > 0 && (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[160px] w-full print:hidden"
          initialDimension={{ width: 320, height: 160 }}
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" nameKey="key" strokeWidth={5}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-black">
                          {haTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-[10px]">
                          {isCenarioAtivo
                            ? `${haTotalBase > 0 ? (haTotal / haTotalBase * 100).toFixed(1) : "0,0"}% de ${haTotalBase.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha`
                            : "ha"}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
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
      <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1" style={{ color: C.primary }}>
        Culturas {isCenarioAtivo ? "Atingidas" : "no Município"}
      </h3>
      <Separator className="mb-2" />
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
            <Card key={nome} size="sm" className="py-0 gap-0 print:break-inside-avoid">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                    <span className="text-[10px] font-bold" style={{ color: C.dark }}>{nome}</span>
                  </div>
                  {isCenarioAtivo && impacto > 0
                    ? <span className="text-[10px] font-black tabular-nums text-orange-600">R$ {impacto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                    : <span className="text-[10px] font-bold tabular-nums" style={{ color: C.primary }}>{haExib.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha</span>
                  }
                </div>
                <div className="text-[10px] flex flex-col gap-0.5" style={{ color: C.muted }}>
                  {isCenarioAtivo ? (
                    <>
                      <span>
                        Área ({fonte}): <b className="text-slate-600">{haExib.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha</b>
                        {haBase > 0 && <span> — de {haBase.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha totais ({(haExib / haBase * 100).toFixed(1)}%)</span>}
                      </span>
                      {c && <span>Situação: <b className="text-slate-600">{c.status}</b> · R$ {c.coef.toLocaleString("pt-BR")}/ha</span>}
                      {c && <span className="italic">{c.nota}</span>}
                    </>
                  ) : (
                    <span>{haExib.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha no município</span>
                  )}
                </div>
              </CardContent>
            </Card>
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

      <Separator className="mt-3 mb-2" />
      <p className="text-[10px] italic text-muted-foreground">
        Fontes: MapaBiomas Col. 10 · CONAB Mapeamentos Agrícolas · Preços Mínimos CONAB 2024
      </p>
    </TabsContent>
  );
}
