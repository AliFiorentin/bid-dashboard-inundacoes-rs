"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { TabsContent } from "@/components/ui/tabs";
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
  // Visão Geral: stats por município { "Lajeado": {"Soja": 1022, ...}, ... }
  allMunAgriStats?: Record<string, Record<string, number>>;
  // Visão Geral: atingidos pela mancha de cada município
  allMunAgriAtingidosStats?: Record<string, Record<string, number>>;
}

export function AgriculturaTab({
  municipio, cenario, isVisaoGeral, isCenarioAtivo,
  baseAgriStats, atingidosAgriStats, conabStats, allMunAgriStats, allMunAgriAtingidosStats,
}: AgriculturaTabProps) {

  // ── Visão Geral RS ─────────────────────────────────────────────────────────
  if (isVisaoGeral) {
    const culturas = Object.keys(AGRI_COLORS);
    // Prefer atingidos stats (per-municipality flood zone); fall back to BASE
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
        <h3 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-slate-200/60 pb-1" style={{ color: C.primary }}>
          Área Agrícola Atingida — Todos os Municípios
        </h3>
        {hasAtingidos && (
          <p className="text-[9px] mb-3 px-2 py-1.5 rounded-md" style={{ color: C.muted, backgroundColor: "#f0f7fa", borderLeft: `2px solid ${C.border}` }}>
            Área dentro da mancha de inundação de cada município (pior cenário).
          </p>
        )}
        {/* Totais RS */}
        <div className="flex flex-col gap-2 mb-4">
          {culturas.map(nome => {
            const ha = totalRS[nome] ?? 0;
            if (ha === 0) return null;
            const cor = AGRI_COLORS[nome] ?? "#6B8E23";
            const pct = totalHa > 0 ? (ha / totalHa * 100).toFixed(1) : "0";
            return (
              <div key={nome} className="rounded-lg border p-2.5 print:break-inside-avoid" style={{ borderColor: C.border, backgroundColor: "#fafafa" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                    <span className="text-[10px] font-bold" style={{ color: C.dark }}>{nome}</span>
                  </div>
                  <span className="text-[10px] font-black tabular-nums" style={{ color: C.primary }}>
                    {ha.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha
                  </span>
                </div>
                {/* Barra por município */}
                <div className="flex flex-col gap-0.5 mt-1">
                  {MUNICIPIOS.map(mun => {
                    const mHa = statsSource?.[mun]?.[nome] ?? 0;
                    const mHaBase = baseSource?.[mun]?.[nome] ?? 0;
                    if (mHa === 0 && mHaBase === 0) return null;
                    const mPct = ha > 0 ? (mHa / ha * 100) : 0;
                    return (
                      <div key={mun} className="flex items-center gap-1.5">
                        <span className="text-[9px] w-24 shrink-0 truncate" style={{ color: C.muted }}>{mun}</span>
                        <div className="flex-1 rounded-full h-1.5 overflow-hidden bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${mPct}%`, backgroundColor: cor }} />
                        </div>
                        <span className="text-[9px] tabular-nums w-20 text-right shrink-0" style={{ color: C.muted }}>
                          {mHa.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha
                          {hasAtingidos && mHaBase > 0 && (
                            <span className="text-[8px] opacity-60"> ({(mHa / mHaBase * 100).toFixed(0)}%)</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] mt-1" style={{ color: C.muted }}>{pct}% do total atingido no RS</p>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] italic pt-2 border-t" style={{ color: C.muted, borderColor: C.border }}>
          Fonte: MapaBiomas — Coleção 10{hasAtingidos ? " · Manchas por município (pior cenário)" : ""}
        </p>
      </TabsContent>
    );
  }

  // ── Município específico ───────────────────────────────────────────────────
  if (!baseAgriStats) {
    return (
      <TabsContent value="agricultura" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2">
        <p className="text-xs text-center py-4" style={{ color: C.muted }}>Carregando...</p>
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
        <div className="relative flex items-center justify-center print:hidden">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
                {pieData.map((d, i) => <Cell key={i} fill={d.cor} />)}
              </Pie>
              <Tooltip formatter={(v: ValueType | undefined) => [`${Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${C.border}`, padding: "4px 10px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center pointer-events-none">
            <span className="text-xl font-black leading-none" style={{ color: C.primary }}>
              {haTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
            {isCenarioAtivo
              ? <>
                  <span className="text-[9px] font-medium" style={{ color: C.muted }}>{haTotalBase > 0 ? (haTotal / haTotalBase * 100).toFixed(1) : "0,0"}% da área</span>
                  <span className="text-[9px]" style={{ color: C.muted }}>de {haTotalBase.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha</span>
                </>
              : <span className="text-[9px] font-medium" style={{ color: C.muted }}>ha</span>}
          </div>
        </div>
      )}

      {/* Card total impacto */}
      {isCenarioAtivo && coefs && impactoTotal > 0 && (
        <div className="rounded-lg px-3 py-2.5 mb-3 border print:break-inside-avoid" style={{ backgroundColor: "#fff7ed", borderColor: "#fdba74" }}>
          <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "#c2410c" }}>Prejuízo Agrícola Estimado</p>
          <p className="text-[22px] font-black leading-none" style={{ color: "#ea580c" }}>
            R$ {impactoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: "#9a3412" }}>
            {Object.keys(areaImpacto).length} cultura{Object.keys(areaImpacto).length !== 1 ? "s" : ""} afetada{Object.keys(areaImpacto).length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Lista unificada por cultura */}
      <h3 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-slate-200/60 pb-1" style={{ color: C.primary }}>
        Culturas {isCenarioAtivo ? "Atingidas" : "no Município"}
      </h3>
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
            <div key={nome} className="rounded-lg border p-2.5 print:break-inside-avoid" style={{ borderColor: C.border, backgroundColor: "#fafafa" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                  <span className="text-[10px] font-bold" style={{ color: C.dark }}>{nome}</span>
                </div>
                {isCenarioAtivo && impacto > 0
                  ? <span className="text-[10px] font-black tabular-nums" style={{ color: "#ea580c" }}>R$ {impacto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  : <span className="text-[10px] font-bold tabular-nums" style={{ color: C.primary }}>{haExib.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha</span>
                }
              </div>
              <div className="text-[9px] flex flex-col gap-0.5" style={{ color: C.muted }}>
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
            </div>
          );
        })}
        {isCenarioAtivo && Object.keys(atingidosAgriStats ?? {}).length === 0 && Object.keys(areaImpacto).length === 0 && (
          <p className="text-xs text-center py-2" style={{ color: C.muted }}>Nenhuma cultura atingida neste cenário.</p>
        )}
      </div>

      {/* Metodologia */}
      {isCenarioAtivo && coefs && (
        <div className="rounded-lg border p-2 mt-1 print:break-inside-avoid" style={{ backgroundColor: "#f0f7fa", borderColor: C.border }}>
          <p className="text-[9px] font-bold mb-0.5" style={{ color: C.primary }}>Metodologia</p>
          <p className="text-[9px] leading-relaxed" style={{ color: C.muted }}>
            Coeficientes baseados no calendário agrícola RS e preços mínimos CONAB.
            Soja/Arroz: área via CONAB (quando disponível), demais via MapaBiomas Col. 10.
            &ldquo;Outras Lavouras&rdquo; inclui principalmente Trigo e Aveia.
            Estimativa de custo direto — não inclui perdas indiretas.
          </p>
        </div>
      )}

      <p className="text-[9px] italic mt-3 pt-2 border-t" style={{ color: C.muted, borderColor: C.border }}>
        Fontes: MapaBiomas Col. 10 · CONAB Mapeamentos Agrícolas · Preços Mínimos CONAB 2024
      </p>
    </TabsContent>
  );
}
