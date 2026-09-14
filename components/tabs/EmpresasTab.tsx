import React, { useMemo } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { DonutChart } from "@/components/ui/donut-chart";
import { COLORS, DONUT_COLORS, PANEL_CARD_BG } from "@/lib/constants";
import { compactoBr, inteiroBr, calcPct, formatName } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
const PANEL_GLASS: React.CSSProperties = {
  border: "1px solid rgba(5,80,113,0.15)",
  backgroundColor: PANEL_CARD_BG,
};

interface Props {
  dash: Pick<DashboardState, "setoresChart" | "setoresEmpregadosChart" | "metricasEmp" | "mostraImpacto">;
}

export function EmpresasTab({ dash }: Props) {
  const { setoresChart, setoresEmpregadosChart, metricasEmp, mostraImpacto } = dash;

  const { donutData, total, totalAtg, setorColorMap } = useMemo(() => {
    const colorMap: Record<string, string> = {};
    const data = setoresChart.map((item, i) => {
      const color = DONUT_COLORS[i % DONUT_COLORS.length];
      colorMap[item.setor] = color;
      return { label: formatName(item.setor), value: item.base, color };
    });
    const t = data.reduce((s, d) => s + d.value, 0);
    const tAtg = setoresChart.reduce((s, d) => s + d.atg, 0);
    return { donutData: data, total: t, totalAtg: tAtg, setorColorMap: colorMap };
  }, [setoresChart]);

  return (
    <TabsContent value="empresas" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {setoresChart.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid rgba(5,80,113,0.15)" }}>
          <div className="flex items-center px-2.5 py-1.5" style={PANEL_HDR}>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Empresas por Setor</h3>
          </div>
          <div className="flex flex-col" style={{ backgroundColor: PANEL_CARD_BG }}>
            <div className="flex items-center justify-center py-2">
              <DonutChart
                data={donutData}
                size={170}
                strokeWidth={22}
                centerContent={
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-foreground leading-none">
                      {mostraImpacto ? inteiroBr(totalAtg) : inteiroBr(total)}
                    </span>
                    <span className="mt-1 text-[9px] text-muted-foreground leading-none">
                      {mostraImpacto ? `de ${inteiroBr(total)} (${total > 0 ? Math.round(totalAtg / total * 100) : 0}%)` : "empresas"}
                    </span>
                  </div>
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
              {setoresChart.map((item, i) => (
                <div key={item.setor} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[10px] flex-1 truncate text-muted-foreground" title={item.setor}>{item.setor}</span>
                  <span className="text-[10px] font-bold tabular-nums text-foreground">
                    {mostraImpacto ? `${inteiroBr(item.atg)}/${inteiroBr(item.base)}` : inteiroBr(item.base)}
                  </span>
                  <span className="text-[10px] w-9 text-right tabular-nums text-muted-foreground">
                    {mostraImpacto ? `${item.base > 0 ? Math.round(item.atg / item.base * 100) : 0}%` : `${Math.round(item.base / total * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 pb-2">
        <KPIRow titulo="Empregados" cor={COLORS.empresas} valor={compactoBr(mostraImpacto ? metricasEmp.impacto.emp : metricasEmp.base.emp, 0)} sub={mostraImpacto ? "Atingidos" : "Total"} delta={mostraImpacto ? `de ${compactoBr(metricasEmp.base.emp, 0)} (${calcPct(metricasEmp.impacto.emp, metricasEmp.base.emp)})` : undefined} />
        {setoresEmpregadosChart.length > 0 && (
          <div className="rounded-lg overflow-hidden -mt-1 mb-1">
            <div className="flex items-center px-2.5 py-1.5" style={PANEL_HDR}>
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Empregados por Setor</span>
            </div>
            <div className="flex flex-col gap-1.5 px-2.5 py-2.5" style={PANEL_GLASS}>
              {setoresEmpregadosChart.map(({ setor, base, atg }, i) => {
                const barColor = setorColorMap[setor] ?? DONUT_COLORS[i % DONUT_COLORS.length];
                const totalBase = setoresEmpregadosChart.reduce((s, r) => s + r.base, 0);
                return (
                  <div key={setor} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: barColor }} />
                    <span className="text-[10px] flex-1 truncate text-muted-foreground" title={setor}>{setor}</span>
                    <span className="text-[10px] font-bold tabular-nums text-foreground">
                      {mostraImpacto ? `${inteiroBr(atg)}/${inteiroBr(base)}` : inteiroBr(base)}
                    </span>
                    <span className="text-[10px] w-9 text-right tabular-nums text-muted-foreground">
                      {mostraImpacto ? `${base > 0 ? Math.round(atg / base * 100) : 0}%` : `${Math.round(base / totalBase * 100)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <KPIRow titulo="Massa Salarial" cor={COLORS.empresas} valor={`R$ ${compactoBr(mostraImpacto ? metricasEmp.impacto.massa : metricasEmp.base.massa, 1)}`} sub="Mensal Estimada" delta={mostraImpacto ? `de R$ ${compactoBr(metricasEmp.base.massa, 1)} (${calcPct(metricasEmp.impacto.massa, metricasEmp.base.massa)})` : undefined} />
        <KPIRow titulo="Média Salarial" cor={COLORS.empresas} valor={`R$ ${compactoBr(mostraImpacto ? metricasEmp.impacto.media : metricasEmp.base.media, 1)}`} sub="Por Estabelecimento" />
      </div>
      <p className="text-[10px] italic mt-2 text-muted-foreground">Fonte: RAIS — Relação Anual de Informações Sociais</p>
    </TabsContent>
  );
}
