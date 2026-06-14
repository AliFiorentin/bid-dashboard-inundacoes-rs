import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { Feature } from "geojson";
import { TabsContent } from "@/components/ui/tabs";
import { COLORS, DONUT_COLORS, normalizeDep } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<DashboardState,
    "metricasEdu" | "mostraImpacto" | "isVisaoGeral" |
    "atingidosEducacao" | "baseEducacao" |
    "showListaEscolas" | "setShowListaEscolas" |
    "professoresDepChart"
  >;
}

export function EducacaoTab({ dash }: Props) {
  const {
    metricasEdu,
    mostraImpacto,
    isVisaoGeral,
    atingidosEducacao,
    baseEducacao,
    showListaEscolas,
    setShowListaEscolas,
    professoresDepChart,
  } = dash;

  return (
    <TabsContent value="educacao" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {(() => {
        const src = mostraImpacto ? atingidosEducacao : baseEducacao;
        if (!src?.features) return null;
        const counts: Record<string, number> = {};
        src.features.forEach((f: Feature) => {
          const dep = normalizeDep(String(f.properties?.tp_dependencia || ""));
          if (dep) counts[dep] = (counts[dep] || 0) + 1;
        });
        const pieData = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
        const totalDep = pieData.reduce((s, d) => s + d.value, 0);
        const baseTotalDep = mostraImpacto ? (baseEducacao?.features?.length ?? 0) : totalDep;
        if (pieData.length === 0) return null;
        const lista = mostraImpacto && !isVisaoGeral && (atingidosEducacao?.features?.length ?? 0) > 0
          ? [...(atingidosEducacao?.features ?? [])].map((f: Feature) => String((f.properties as Record<string, unknown>)?.no_entidade ?? "").trim()).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "pt-BR"))
          : [];
        return (
          <>
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 border-b border-slate-200/60 pb-1">Escolas</h3>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: ValueType | undefined) => [`${v} escola${v !== 1 ? "s" : ""}`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e5e2", padding: "4px 10px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black leading-none text-slate-800">{totalDep}</span>
                {mostraImpacto
                  ? <><span className="text-[9px] font-medium text-slate-500">{Math.round(totalDep / baseTotalDep * 100)}% escolas</span><span className="text-[9px] text-slate-500">de {baseTotalDep}</span></>
                  : <span className="text-[10px] font-medium text-slate-500">escolas</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[11px] flex-1 text-slate-500">{d.name}</span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">{d.value}</span>
                  <span className="text-[11px] w-9 text-right tabular-nums text-slate-500">{Math.round(d.value / totalDep * 100)}%</span>
                </div>
              ))}
            </div>
            {lista.length > 0 && (
              <div className="flex flex-col gap-1 mb-2">
                <button onClick={() => setShowListaEscolas(p => !p)}
                  className="w-full flex items-center justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100/60 text-slate-700 border border-slate-200/60">
                  <span>Escolas Atingidas ({lista.length})</span>
                  <span style={{ fontSize: 9 }}>{showListaEscolas ? "▲" : "▼"}</span>
                </button>
                {showListaEscolas && (
                  <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto rounded-lg p-1.5 bg-slate-100/60 border border-slate-200/60">
                    {lista.map((nome: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-slate-500" title={nome}>{nome}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
      <div className="flex flex-col gap-2 mt-2">
        <KPIRow titulo="Professores" cor={COLORS.educacao} valor={compactoBr(mostraImpacto ? metricasEdu.impacto.prof : metricasEdu.base.prof, 0)} sub={mostraImpacto ? "Atingidos" : "Total"} delta={mostraImpacto ? `de ${compactoBr(metricasEdu.base.prof, 0)} (${calcPct(metricasEdu.impacto.prof, metricasEdu.base.prof)})` : undefined} />
        {mostraImpacto && professoresDepChart.length > 0 && (
          <div className="flex flex-col gap-1 px-1 py-2 bg-slate-50/70 rounded-lg border border-slate-200/60 -mt-1 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5">Professores por Dependência</span>
            {professoresDepChart.map(({ dep, base, atg }) => (
              <div key={dep} className="flex items-center gap-1.5">
                <span className="text-[8px] w-14 shrink-0 text-slate-500">{dep}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-green-600" style={{ width: `${base > 0 ? (atg / base) * 100 : 0}%` }} />
                </div>
                <span className="text-[8px] font-bold tabular-nums text-slate-700 w-16 text-right shrink-0">
                  {compactoBr(atg, 0)}{" "}
                  <span className="text-slate-400 font-normal">({base > 0 ? Math.round(atg / base * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {(() => {
        const NIVEIS: [string, string][] = [
          ["Infantil","inf"],["Fundamental","fund"],["Médio","med"],
          ["Profissional","profis"],["EJA","eja"],["Especial","esp"],
        ];
        const srcM = mostraImpacto ? metricasEdu.impacto : metricasEdu.base;
        const srcMRecord = srcM as Record<string, number>;
        const pieData = NIVEIS.map(([name, key]) => ({ name, value: srcMRecord[key] })).filter(d => d.value > 0);
        const totalAlunos = pieData.reduce((s, d) => s + d.value, 0);
        const baseRecord = metricasEdu.base as Record<string, number>;
        const baseAlunos = NIVEIS.reduce((s, [, key]) => s + (baseRecord[key] || 0), 0);
        if (pieData.length === 0) return null;
        return (
          <>
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mt-4 mb-1 border-b border-slate-200/60 pb-1">Educação</h3>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: ValueType | undefined) => [`${compactoBr(Number(v ?? 0), 0)} alunos`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e5e2", padding: "4px 10px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black leading-none text-slate-800">{compactoBr(totalAlunos, 0)}</span>
                {mostraImpacto
                  ? <><span className="text-[9px] font-medium text-slate-500">{baseAlunos > 0 ? Math.round(totalAlunos / baseAlunos * 100) : 0}% alunos</span><span className="text-[9px] text-slate-500">de {compactoBr(baseAlunos, 0)}</span></>
                  : <span className="text-[10px] font-medium text-slate-500">alunos</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 pb-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[11px] flex-1 text-slate-500">{d.name}</span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">{compactoBr(d.value, 0)}</span>
                  <span className="text-[11px] w-9 text-right tabular-nums text-slate-500">{Math.round(d.value / totalAlunos * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}
      <p className="text-[9px] italic mt-2 pt-2 border-t border-slate-200/60 text-slate-400">Fonte: IBGE — Censo Escolar</p>
    </TabsContent>
  );
}
