import React from "react";
import { PieChart, Pie, Label } from "recharts";
import type { Feature } from "geojson";
import { ChevronDown } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { COLORS, DONUT_COLORS, STAFF_COLS, STAFF_LABELS } from "@/lib/constants";
import { compactoBr, inteiroBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { ChartCenterLabel } from "@/components/ChartCenterLabel";
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
        const baseTipos = metricasSau.base.tipos;
        const atgTipos = metricasSau.impacto.tipos;
        const chartConfig: ChartConfig = {};
        const pieData = Object.entries(baseTipos).filter(([, v]) => (v as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, value], i) => {
          const key = `h${i}`;
          chartConfig[key] = { label: name, color: DONUT_COLORS[i % DONUT_COLORS.length] };
          return { key, name, value: value as number, atg: (atgTipos[name] as number) ?? 0, fill: `var(--color-h${i})` };
        });
        const totalBase = pieData.reduce((s, d) => s + d.value, 0);
        const totalAtg = pieData.reduce((s, d) => s + d.atg, 0);
        if (pieData.length === 0) return null;

        return (
          <>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-2 mb-1 pb-1">Unidades por Tipo</h3>
            <Separator className="mb-2" />
            <ChartContainer config={chartConfig} className="aspect-auto h-[170px] w-full" initialDimension={{ width: 320, height: 170 }}>
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
                            big={mostraImpacto ? inteiroBr(totalAtg) : inteiroBr(totalBase)}
                            small={mostraImpacto ? `de ${inteiroBr(totalBase)} (${totalBase > 0 ? Math.round(totalAtg / totalBase * 100) : 0}%)` : "unidades"}
                          />
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-1.5 mb-3">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-xs flex-1 truncate text-muted-foreground" title={d.name}>{d.name}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {mostraImpacto ? `${inteiroBr(d.atg)}/${inteiroBr(d.value)}` : inteiroBr(d.value)}
                  </span>
                  <span className="text-xs w-9 text-right tabular-nums text-muted-foreground">
                    {mostraImpacto ? `${d.value > 0 ? Math.round(d.atg / d.value * 100) : 0}%` : `${Math.round(d.value / totalBase * 100)}%`}
                  </span>
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
                    <Collapsible key={tipoKey} open={cfg.state} onOpenChange={() => cfg.setState(p => !p)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between text-[10px] font-bold">
                          <span>{cfg.label} ({lista.length})</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", cfg.state && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-col gap-0.5 mt-1 max-h-44 overflow-y-auto rounded-lg p-1.5 bg-muted/50 border">
                          {lista.map((nome: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={nome}>{nome}</span>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-2 mb-2 pb-1">Profissionais</h3>
      <Separator className="mb-2" />
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
            {staffData.map((d, i) => {
              const pct = d.base > 0 ? Math.round(d.atg / d.base * 100) : 0;
              return (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-[10px] w-20 shrink-0 truncate text-muted-foreground" title={d.name}>{d.name}</span>
                  <div className="flex-1 rounded-full h-2.5 overflow-hidden bg-muted">
                    <div className="h-full rounded-full" style={{
                      width: mostraImpacto
                        ? `${Math.min(pct, 100)}%`
                        : `${staffData[0]?.base > 0 ? (d.base / staffData[0].base) * 100 : 0}%`,
                      backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                    }} />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums w-20 text-right shrink-0 text-foreground">
                    {mostraImpacto ? `${inteiroBr(d.atg)}/${inteiroBr(d.base)}` : inteiroBr(d.base)}
                    {mostraImpacto && d.base > 0 && (
                      <span className="text-muted-foreground font-normal ml-0.5">({pct}%)</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
      <Separator className="mt-2" />
      <p className="text-[10px] italic pt-2 text-muted-foreground">Fonte: CNES — Cadastro Nacional de Estabelecimentos de Saúde</p>
    </TabsContent>
  );
}
