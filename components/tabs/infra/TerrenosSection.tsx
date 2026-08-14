import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { C, INFRA_COLORS } from "@/lib/constants";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
import { compactoBr } from "@/lib/geo-utils";
import { BarServico } from "@/components/ui/BarServico";
import type { InfraMetricas } from "@/hooks/useDashboard";

interface Props {
  metricas?: InfraMetricas;
  metricasBase?: InfraMetricas;
  mostraImpacto: boolean;
  mapaAtivo: boolean;
  onToggleMapa: () => void;
}

/**
 * Lê de infra_stats.json (metricas/metricasBase), não de baseInfra/
 * atingidosInfra — Terrenos sozinho tem 36,6 MB em Rio Grande, e o gráfico
 * de rosca + as barras de cobertura de serviço são só contagens, que já
 * vêm prontas do pré-cálculo (ver gerar_infra_stats.js). Span-2 no InfraTab:
 * tem gráfico + 6 barras, não cabe em meia coluna.
 */
export function TerrenosSection({ metricas, metricasBase, mostraImpacto, mapaAtivo, onToggleMapa }: Props) {
  const cor = INFRA_COLORS["Terrenos"];
  const total = metricasBase?.n ?? 0;
  const totalAtg = metricas?.n ?? 0;

  return (
    <div className="col-span-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white flex-1">Terrenos</h3>
        <label className="flex items-center gap-1 text-[8px] font-bold text-white/90 cursor-pointer select-none shrink-0">
          <input type="checkbox" checked={mapaAtivo} onChange={onToggleMapa} className="h-3 w-3 accent-white cursor-pointer" />
          Exibir no mapa
        </label>
      </div>
      {!metricasBase ? (
        <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mostraImpacto && total > 0 && (() => {
            const pct = Math.round((totalAtg / total) * 100);
            const pieData = [
              { name: "Atingidos", value: totalAtg },
              { name: "Não Atingidos", value: Math.max(0, total - totalAtg) },
            ];
            return (
              <div className="relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value" stroke="none">
                      <Cell fill={cor} />
                      <Cell fill={`${cor}25`} />
                    </Pie>
                    <Tooltip
                      formatter={(v: ValueType | undefined) => [compactoBr(Number(v ?? 0), 0), ""]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${C.border}`, padding: "4px 10px" }}
                      itemStyle={{ color: C.primary }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-lg font-black leading-none" style={{ color: cor }}>{compactoBr(totalAtg, 0)}</span>
                  <span className="text-[9px] font-medium" style={{ color: C.muted }}>{pct}% atingidos</span>
                  <span className="text-[9px]" style={{ color: C.muted }}>de {compactoBr(total, 0)}</span>
                </div>
              </div>
            );
          })()}
          <div className="flex items-center px-2.5 py-1 rounded-lg mt-1" style={PANEL_HDR}>
            <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Cobertura de Serviços</h4>
          </div>
          {(() => {
            const atual = mostraImpacto ? metricas : metricasBase;
            const items: { label: string; val: number }[] = [
              { label: "Água", val: atual?.agua ?? 0 },
              { label: "Coleta de Lixo", val: atual?.lixo ?? 0 },
              { label: "Esgoto Pluvial", val: atual?.esgotoPluvial ?? 0 },
              { label: "Esgoto Cloacal", val: atual?.esgotoCloacal ?? 0 },
              { label: "Fossa Séptica", val: atual?.fossa ?? 0 },
              { label: "Condomínios", val: atual?.condominio ?? 0 },
            ];
            return (
              <div className="flex flex-col gap-2">
                {items.map(({ label, val }) => (
                  <BarServico key={label} label={label} value={val} total={total} cor={cor} />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
