import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { Feature } from "geojson";
import { TabsContent } from "@/components/ui/tabs";
import { COLORS, DONUT_COLORS, STAFF_COLS, STAFF_LABELS } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<DashboardState,
    "metricasSau" | "mostraImpacto" | "isVisaoGeral" |
    "atingidosSaude" |
    "showListaHospitais" | "setShowListaHospitais" |
    "showListaUBS" | "setShowListaUBS" |
    "showListaAmbulat" | "setShowListaAmbulat"
  >;
}

export function SaudeTab({ dash }: Props) {
  const {
    metricasSau,
    mostraImpacto,
    isVisaoGeral,
    atingidosSaude,
    showListaHospitais,
    setShowListaHospitais,
    showListaUBS,
    setShowListaUBS,
    showListaAmbulat,
    setShowListaAmbulat,
  } = dash;

  return (
    <TabsContent value="saude" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {(() => {
        const LISTAS: Record<string, { label: string; state: boolean; setState: (v: (p: boolean) => boolean) => void }> = {
          "Hospital":                { label: "Hospitais",                  state: showListaHospitais, setState: setShowListaHospitais },
          "Unidade Básica de Saúde": { label: "Unidades Básicas de Saúde", state: showListaUBS,       setState: setShowListaUBS },
          "Ambulatório":             { label: "Ambulatórios",               state: showListaAmbulat,   setState: setShowListaAmbulat },
        };
        const srcFeats = atingidosSaude?.features ?? [];
        const tipos = mostraImpacto ? metricasSau.impacto.tipos : metricasSau.base.tipos;
        const pieData = Object.entries(tipos).filter(([, v]) => (v as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, value]) => ({ name, value: value as number }));
        const totalU = pieData.reduce((s, d) => s + d.value, 0);
        if (pieData.length === 0) return null;
        return (
          <>
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mt-2 mb-1 border-b border-slate-200/60 pb-1">Unidades por Tipo</h3>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: ValueType | undefined) => [`${v} unidade${v !== 1 ? "s" : ""}`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e5e2", padding: "4px 10px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black leading-none text-slate-800">{totalU}</span>
                {mostraImpacto
                  ? <><span className="text-[9px] font-medium text-slate-500">{Math.round(totalU / metricasSau.base.unidades * 100)}% unidades</span><span className="text-[9px] text-slate-500">de {metricasSau.base.unidades}</span></>
                  : <span className="text-[10px] font-medium text-slate-500">unidades</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[11px] flex-1 truncate text-slate-500" title={d.name}>{d.name}</span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">{d.value}</span>
                  <span className="text-[11px] w-9 text-right tabular-nums text-slate-500">{Math.round(d.value / totalU * 100)}%</span>
                </div>
              ))}
            </div>
            {mostraImpacto && !isVisaoGeral && (
              <div className="flex flex-col gap-2 mb-3">
                {Object.entries(LISTAS).map(([tipoKey, cfg]) => {
                  const feats = srcFeats.filter((f: Feature) => (f.properties as Record<string, unknown>)?.co_tipo_estabelecimento === tipoKey);
                  const lista = feats.map((f: Feature) => { const p = f.properties as Record<string, unknown>; return String(p?.no_fantasia || p?.no_razao_social || "").trim(); }).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));
                  if (lista.length === 0) return null;
                  return (
                    <div key={tipoKey}>
                      <button onClick={() => cfg.setState(p => !p)}
                        className="w-full flex items-center justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100/60 text-slate-700 border border-slate-200/60">
                        <span>{cfg.label} ({lista.length})</span>
                        <span style={{ fontSize: 9 }}>{cfg.state ? "▲" : "▼"}</span>
                      </button>
                      {cfg.state && (
                        <div className="flex flex-col gap-0.5 mt-1 max-h-44 overflow-y-auto rounded-lg p-1.5 bg-slate-100/60 border border-slate-200/60">
                          {lista.map((nome: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-slate-500" title={nome}>{nome}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
      <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mt-2 mb-2 border-b border-slate-200/60 pb-1">Profissionais</h3>
      {(() => {
        const totalBase = STAFF_COLS.reduce((s, c) => s + (metricasSau.base.staff[c] ?? 0), 0);
        const totalAtg  = STAFF_COLS.reduce((s, c) => s + (metricasSau.impacto.staff[c] ?? 0), 0);
        return (
          <KPIRow
            titulo="Total de Profissionais"
            cor={COLORS.saude}
            valor={compactoBr(mostraImpacto ? totalAtg : totalBase, 0)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(totalBase, 0)} (${calcPct(totalAtg, totalBase)})` : undefined}
          />
        );
      })()}
      {(() => {
        const baseStaff    = metricasSau.base.staff;
        const impactoStaff = metricasSau.impacto.staff;
        const staffData = STAFF_COLS
          .map(c => ({ name: STAFF_LABELS[c], base: baseStaff[c] ?? 0, atg: impactoStaff[c] ?? 0 }))
          .filter(d => d.base > 0)
          .sort((a, b) => b.base - a.base);
        return (
          <div className="flex flex-col gap-1.5 pb-2 mt-2">
            {staffData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="text-[9px] w-20 shrink-0 truncate text-slate-500" title={d.name}>{d.name}</span>
                <div className="flex-1 rounded-full h-2.5 overflow-hidden bg-slate-100">
                  <div className="h-full rounded-full" style={{
                    width: mostraImpacto
                      ? `${d.base > 0 ? Math.min((d.atg / d.base) * 100, 100) : 0}%`
                      : `${staffData[0]?.base > 0 ? (d.base / staffData[0].base) * 100 : 0}%`,
                    backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                  }} />
                </div>
                <span className="text-[9px] font-bold tabular-nums w-14 text-right shrink-0 text-slate-700">
                  {compactoBr(mostraImpacto ? d.atg : d.base, 0)}
                  {mostraImpacto && d.base > 0 && (
                    <span className="text-slate-400 font-normal ml-0.5">({Math.round(d.atg / d.base * 100)}%)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
      <p className="text-[9px] italic mt-2 pt-2 border-t border-slate-200/60 text-slate-400">Fonte: CNES — Cadastro Nacional de Estabelecimentos de Saúde</p>
    </TabsContent>
  );
}
