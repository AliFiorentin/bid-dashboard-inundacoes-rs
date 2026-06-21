import React, { useMemo } from "react";
import { PieChart, Pie, Label } from "recharts";
import { TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { COLORS, DONUT_COLORS } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<DashboardState, "setoresChart" | "setoresEmpregadosChart" | "metricasEmp" | "mostraImpacto">;
}

export function EmpresasTab({ dash }: Props) {
  const { setoresChart, setoresEmpregadosChart, metricasEmp, mostraImpacto } = dash;

  const { pieData, total, chartConfig, setorColorMap } = useMemo(() => {
    const cfg: ChartConfig = {};
    const colorMap: Record<string, string> = {};
    const data = setoresChart.map(([name, value], i) => {
      const key = `s${i}`;
      const color = DONUT_COLORS[i % DONUT_COLORS.length];
      cfg[key] = { label: name as string, color };
      colorMap[name as string] = color;
      return { key, name, value, fill: `var(--color-s${i})` };
    });
    const t = data.reduce((s, d) => s + (d.value as number), 0);
    return { pieData: data, total: t, chartConfig: cfg, setorColorMap: colorMap };
  }, [setoresChart]);

  return (
    <TabsContent value="empresas" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      {setoresChart.length > 0 && (() => {
        const totalBase = metricasEmp.base.estab;
        return (
          <>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider mb-1 pb-1">Empresas</h3>
            <Separator className="mb-2" />
            <ChartContainer config={chartConfig} className="aspect-auto h-[170px] w-full" initialDimension={{ width: 320, height: 170 }}>
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} dataKey="value" nameKey="key" strokeWidth={5}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-black">
                              {total}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-[9px]">
                              {mostraImpacto ? `${Math.round(total / totalBase * 100)}% de ${totalBase}` : "empresas"}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-1.5 mb-3">
              {setoresChart.map(([setor, count], i) => (
                <div key={setor} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[10px] flex-1 truncate text-muted-foreground" title={setor}>{setor}</span>
                  <span className="text-[10px] font-bold tabular-nums text-foreground">{count}</span>
                  <span className="text-[10px] w-9 text-right tabular-nums text-muted-foreground">{Math.round((count as number / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}
      <div className="flex flex-col gap-2 pb-2">
        <KPIRow titulo="Empregados" cor={COLORS.empresas} valor={compactoBr(mostraImpacto ? metricasEmp.impacto.emp : metricasEmp.base.emp, 0)} sub={mostraImpacto ? "Atingidos" : "Total"} delta={mostraImpacto ? `de ${compactoBr(metricasEmp.base.emp, 0)} (${calcPct(metricasEmp.impacto.emp, metricasEmp.base.emp)})` : undefined} />
        {mostraImpacto && setoresEmpregadosChart.length > 0 && (
          <div className="flex flex-col gap-1.5 px-2 py-2.5 bg-muted/40 rounded-lg border -mt-1 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Empregados por Setor</span>
            {setoresEmpregadosChart.map(({ setor, base, atg }) => {
              const barColor = setorColorMap[setor] ?? DONUT_COLORS[0];
              return (
                <div key={setor} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: barColor }} />
                  <span className="text-[9px] flex-1 truncate text-muted-foreground" title={setor}>{setor}</span>
                  <div className="w-16 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${base > 0 ? (atg / base) * 100 : 0}%`, backgroundColor: barColor }} />
                  </div>
                  <span className="text-[9px] font-bold tabular-nums text-foreground w-16 text-right shrink-0">
                    {compactoBr(atg, 0)}{" "}
                    <span className="text-muted-foreground font-normal">({base > 0 ? Math.round(atg / base * 100) : 0}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <KPIRow titulo="Massa Salarial" cor={COLORS.empresas} valor={`R$ ${compactoBr(mostraImpacto ? metricasEmp.impacto.massa : metricasEmp.base.massa, 1)}`} sub="Mensal Estimada" delta={mostraImpacto ? `de R$ ${compactoBr(metricasEmp.base.massa, 1)} (${calcPct(metricasEmp.impacto.massa, metricasEmp.base.massa)})` : undefined} />
        <KPIRow titulo="Média Salarial" cor={COLORS.empresas} valor={`R$ ${compactoBr(mostraImpacto ? metricasEmp.impacto.media : metricasEmp.base.media, 1)}`} sub="Por Estabelecimento" />
      </div>
      <Separator className="mt-2" />
      <p className="text-[10px] italic mt-2 text-muted-foreground">Fonte: RAIS — Relação Anual de Informações Sociais</p>
    </TabsContent>
  );
}
