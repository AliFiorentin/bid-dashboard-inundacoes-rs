import React from "react";
import { PieChart, Pie, Label } from "recharts";
import type { Feature } from "geojson";
import { ChevronDown } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { COLORS, DONUT_COLORS, STAFF_COLS, STAFF_LABELS } from "@/lib/constants";
import { compactoBr, inteiroBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { ChartCenterLabel } from "@/components/ChartCenterLabel";
import { cn } from "@/lib/utils";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
const PANEL_GLASS: React.CSSProperties = {
  border: "1px solid rgba(5,80,113,0.15)",
};

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
    metricasSau, mostraImpacto, isVisaoGeral,
    atingidosSaude,
    showListaHospitais, setShowListaHospitais,
    showListaUBS, setShowListaUBS,
    showListaAmbulat, setShowListaAmbulat,
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
            <div className="flex items-center px-2.5 py-1.5 rounded-lg mb-3 mt-2" style={PANEL_HDR}>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Unidades por Tipo</h3>
            </div>
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
                    <Collapsible key={tipoKey} open={cfg.state} onOpenChange={() => cfg.setState(p => !p)} className="rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-white" style={PANEL_HDR}>
                          <span>{cfg.label} ({lista.length})</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", cfg.state && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto p-1.5" style={PANEL_GLASS}>
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
      <div className="flex items-center px-2.5 py-1.5 rounded-lg mt-2 mb-2" style={PANEL_HDR}>
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Profissionais de Saúde</h3>
      </div>
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
      <p className="text-[10px] italic pt-2 text-muted-foreground">Fonte: CNES — Cadastro Nacional de Estabelecimentos de Saúde</p>
    </TabsContent>
  );
}
