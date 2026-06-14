import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { TabsContent } from "@/components/ui/tabs";
import { COLORS, DONUT_COLORS } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<DashboardState, "setoresChart" | "setoresEmpregadosChart" | "metricasEmp" | "mostraImpacto">;
}

export function EmpresasTab({ dash }: Props) {
  const { setoresChart, setoresEmpregadosChart, metricasEmp, mostraImpacto } = dash;

  return (
    <TabsContent value="empresas" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {setoresChart.length > 0 && (() => {
        const totalBase = metricasEmp.base.estab;
        const total = setoresChart.reduce((s, [, c]) => s + (c as number), 0);
        const pieData = setoresChart.map(([name, value]) => ({ name, value }));
        return (
          <>
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 border-b border-slate-200/60 pb-1">Empresas</h3>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: ValueType | undefined) => [`${v} empresa${v !== 1 ? "s" : ""}`, ""]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e5e2", padding: "4px 10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black leading-none text-slate-800">{total}</span>
                {mostraImpacto
                  ? <><span className="text-[9px] font-medium text-slate-500">{Math.round(total / totalBase * 100)}% empresas</span><span className="text-[9px] text-slate-500">de {totalBase}</span></>
                  : <span className="text-[9px] font-medium text-slate-500">empresas</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-3">
              {setoresChart.map(([setor, count], i) => (
                <div key={setor} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[9px] flex-1 truncate text-slate-500" title={setor}>{setor}</span>
                  <span className="text-[9px] font-bold tabular-nums text-slate-700">{count}</span>
                  <span className="text-[9px] w-8 text-right tabular-nums text-slate-500">{Math.round((count as number / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}
      <div className="flex flex-col gap-2 pb-2">
        <KPIRow titulo="Empregados" cor={COLORS.empresas} valor={compactoBr(mostraImpacto ? metricasEmp.impacto.emp : metricasEmp.base.emp, 0)} sub={mostraImpacto ? "Atingidos" : "Total"} delta={mostraImpacto ? `de ${compactoBr(metricasEmp.base.emp, 0)} (${calcPct(metricasEmp.impacto.emp, metricasEmp.base.emp)})` : undefined} />
        {mostraImpacto && setoresEmpregadosChart.length > 0 && (
          <div className="flex flex-col gap-1 px-1 py-2 bg-slate-50/70 rounded-lg border border-slate-200/60 -mt-1 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5">Empregados por Setor</span>
            {setoresEmpregadosChart.map(({ setor, base, atg }) => (
              <div key={setor} className="flex items-center gap-1.5">
                <span className="text-[8px] flex-1 truncate text-slate-500" title={setor}>{setor}</span>
                <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${base > 0 ? (atg / base) * 100 : 0}%` }} />
                </div>
                <span className="text-[8px] font-bold tabular-nums text-slate-700 w-16 text-right shrink-0">
                  {compactoBr(atg, 0)}{" "}
                  <span className="text-slate-400 font-normal">({base > 0 ? Math.round(atg / base * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}
        <KPIRow titulo="Massa Salarial" cor={COLORS.empresas} valor={`R$ ${compactoBr(mostraImpacto ? metricasEmp.impacto.massa : metricasEmp.base.massa, 1)}`} sub="Mensal Estimada" delta={mostraImpacto ? `de R$ ${compactoBr(metricasEmp.base.massa, 1)} (${calcPct(metricasEmp.impacto.massa, metricasEmp.base.massa)})` : undefined} />
        <KPIRow titulo="Média Salarial" cor={COLORS.empresas} valor={`R$ ${compactoBr(mostraImpacto ? metricasEmp.impacto.media : metricasEmp.base.media, 1)}`} sub="Por Estabelecimento" />
      </div>
      <p className="text-[9px] italic mt-2 pt-2 border-t border-slate-200/60 text-slate-400">Fonte: RAIS — Relação Anual de Informações Sociais</p>
    </TabsContent>
  );
}
