import React from "react";
import { PieChart, Pie, Label } from "recharts";
import type { Feature } from "geojson";
import { ChevronDown } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { COLORS, DONUT_COLORS, normalizeDep } from "@/lib/constants";
import { compactoBr, inteiroBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { ChartCenterLabel } from "@/components/ChartCenterLabel";
import { cn } from "@/lib/utils";
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
        if (!baseEducacao?.features) return null;
        const baseCounts: Record<string, number> = {};
        const atgCounts: Record<string, number> = {};
        baseEducacao.features.forEach((f: Feature) => {
          const dep = normalizeDep(String(f.properties?.tp_dependencia || ""));
          if (dep) baseCounts[dep] = (baseCounts[dep] || 0) + 1;
        });
        (atingidosEducacao?.features ?? []).forEach((f: Feature) => {
          const dep = normalizeDep(String(f.properties?.tp_dependencia || ""));
          if (dep) atgCounts[dep] = (atgCounts[dep] || 0) + 1;
        });
        const escolasConfig: ChartConfig = {};
        const pieData = Object.entries(baseCounts).sort((a, b) => b[1] - a[1]).map(([name, value], i) => {
          const key = `e${i}`;
          escolasConfig[key] = { label: name, color: DONUT_COLORS[i % DONUT_COLORS.length] };
          return { key, name, value, atg: atgCounts[name] ?? 0, fill: `var(--color-e${i})` };
        });
        const totalBase = pieData.reduce((s, d) => s + d.value, 0);
        const totalAtg = pieData.reduce((s, d) => s + d.atg, 0);
        if (pieData.length === 0) return null;
        const lista = mostraImpacto && !isVisaoGeral && (atingidosEducacao?.features?.length ?? 0) > 0
          ? [...(atingidosEducacao?.features ?? [])].map((f: Feature) => String((f.properties as Record<string, unknown>)?.no_entidade ?? "").trim()).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "pt-BR"))
          : [];

        return (
          <>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Escolas</h3>
            <Separator className="mb-2" />
            <ChartContainer config={escolasConfig} className="aspect-auto h-[160px] w-full" initialDimension={{ width: 320, height: 160 }}>
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={70} dataKey="value" nameKey="key" strokeWidth={5}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox && viewBox.cx != null && viewBox.cy != null) {
                        return (
                          <ChartCenterLabel
                            cx={viewBox.cx}
                            cy={viewBox.cy}
                            big={mostraImpacto ? inteiroBr(totalAtg) : inteiroBr(totalBase)}
                            small={mostraImpacto ? `de ${inteiroBr(totalBase)} (${totalBase > 0 ? Math.round(totalAtg / totalBase * 100) : 0}%)` : "escolas"}
                          />
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-1.5 mb-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-xs flex-1 text-muted-foreground">{d.name}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {mostraImpacto ? `${inteiroBr(d.atg)}/${inteiroBr(d.value)}` : inteiroBr(d.value)}
                  </span>
                  <span className="text-xs w-9 text-right tabular-nums text-muted-foreground">
                    {mostraImpacto ? `${d.value > 0 ? Math.round(d.atg / d.value * 100) : 0}%` : `${Math.round(d.value / totalBase * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
            {lista.length > 0 && (
              <Collapsible open={showListaEscolas} onOpenChange={() => setShowListaEscolas(p => !p)} className="mb-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between text-[10px] font-bold">
                    <span>Escolas Atingidas ({lista.length})</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showListaEscolas && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-0.5 mt-1 max-h-52 overflow-y-auto rounded-lg p-1.5 bg-muted/50 border">
                    {lista.map((nome: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={nome}>{nome}</span>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        );
      })()}
      <div className="flex flex-col gap-2 mt-2">
        <KPIRow titulo="Profissionais" cor={COLORS.educacao} valor={compactoBr(mostraImpacto ? metricasEdu.impacto.prof : metricasEdu.base.prof, 0)} sub={mostraImpacto ? "Atingidos" : "Total"} delta={mostraImpacto ? `de ${compactoBr(metricasEdu.base.prof, 0)} (${calcPct(metricasEdu.impacto.prof, metricasEdu.base.prof)})` : undefined} />
        <KPIRow titulo="Docentes" cor={COLORS.educacao} valor={compactoBr(mostraImpacto ? metricasEdu.impacto.doc : metricasEdu.base.doc, 0)} sub={mostraImpacto ? "Atingidos" : "Total"} delta={mostraImpacto ? `de ${compactoBr(metricasEdu.base.doc, 0)} (${calcPct(metricasEdu.impacto.doc, metricasEdu.base.doc)})` : undefined} />
        {professoresDepChart.length > 0 && (
          <div className="flex flex-col gap-1 px-1 py-2 bg-muted/30 rounded-lg border -mt-1 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Professores por Dependência</span>
            {professoresDepChart.map(({ dep, base, atg }) => {
              const pct = base > 0 ? Math.round(atg / base * 100) : 0;
              return (
                <div key={dep} className="flex items-center gap-1.5">
                  <span className="text-[9px] w-14 shrink-0 text-muted-foreground">{dep}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-green-600" style={{ width: `${mostraImpacto ? pct : 100}%` }} />
                  </div>
                  <span className="text-[9px] font-bold tabular-nums text-foreground w-16 text-right shrink-0">
                    {mostraImpacto ? `${inteiroBr(atg)}/${inteiroBr(base)}` : inteiroBr(base)}{" "}
                    {mostraImpacto && <span className="text-muted-foreground font-normal">({pct}%)</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {(() => {
        const NIVEIS: [string, string][] = [
          ["Infantil","inf"],["Fundamental","fund"],["Medio","med"],
          ["Profissional","profis"],["EJA","eja"],["Especial","esp"],
        ];
        const baseRecord = metricasEdu.base as Record<string, number>;
        const atgRecord = metricasEdu.impacto as Record<string, number>;
        const alunosConfig: ChartConfig = {};
        const pieData = NIVEIS.map(([name, key]) => ({ name, value: baseRecord[key] || 0, atg: atgRecord[key] || 0 })).filter(d => d.value > 0).map((d, i) => {
          const k = `a${i}`;
          alunosConfig[k] = { label: d.name, color: DONUT_COLORS[i % DONUT_COLORS.length] };
          return { ...d, key: k, fill: `var(--color-a${i})` };
        });
        const totalBase = pieData.reduce((s, d) => s + d.value, 0);
        const totalAtg = pieData.reduce((s, d) => s + d.atg, 0);
        if (pieData.length === 0) return null;

        return (
          <>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mt-4 mb-1">Matriculas</h3>
            <Separator className="mb-2" />
            <ChartContainer config={alunosConfig} className="aspect-auto h-[170px] w-full" initialDimension={{ width: 320, height: 170 }}>
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} dataKey="value" nameKey="key" strokeWidth={5}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox && viewBox.cx != null && viewBox.cy != null) {
                        return (
                          <ChartCenterLabel
                            cx={viewBox.cx}
                            cy={viewBox.cy}
                            big={mostraImpacto ? compactoBr(totalAtg, 0) : compactoBr(totalBase, 0)}
                            small={mostraImpacto ? `de ${compactoBr(totalBase, 0)} (${totalBase > 0 ? Math.round(totalAtg / totalBase * 100) : 0}%)` : "alunos"}
                          />
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-1.5 pb-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-xs flex-1 text-muted-foreground">{d.name}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {mostraImpacto ? `${inteiroBr(d.atg)}/${inteiroBr(d.value)}` : inteiroBr(d.value)}
                  </span>
                  <span className="text-xs w-9 text-right tabular-nums text-muted-foreground">
                    {mostraImpacto ? `${d.value > 0 ? Math.round(d.atg / d.value * 100) : 0}%` : `${Math.round(d.value / totalBase * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      })()}
      <Separator className="mt-2" />
      <p className="text-[10px] italic mt-2 text-muted-foreground">Fonte: IBGE — Censo Escolar</p>
    </TabsContent>
  );
}
