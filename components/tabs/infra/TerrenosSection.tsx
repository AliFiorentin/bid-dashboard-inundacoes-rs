import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { C, INFRA_COLORS } from "@/lib/constants";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
import { compactoBr, countFlag, countEquals } from "@/lib/geo-utils";
import { BarServico } from "@/components/ui/BarServico";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<DashboardState, "baseInfra" | "atingidosInfra" | "mostraImpacto">;
}

export function TerrenosSection({ dash }: Props) {
  const { baseInfra, atingidosInfra, mostraImpacto } = dash;

  const base = baseInfra["Terrenos"];
  const atg = atingidosInfra["Terrenos"];
  const baseF = base?.features ?? [];
  const atgF = atg?.features ?? [];

  const total = baseF.length;
  const totalAtg = atgF.length;

  const agua    = { b: countFlag(baseF, "agua"),        a: countFlag(atgF, "agua") };
  const lixo    = { b: countFlag(baseF, "coleta_lix"),  a: countFlag(atgF, "coleta_lix") };
  const pluvial = { b: countFlag(baseF, "esgoto_plu"),  a: countFlag(atgF, "esgoto_plu") };
  const cloacal = {
    b: countEquals(baseF, "esgoto_clo", ["esgoto_cloacal", "cloacal", "1"]),
    a: countEquals(atgF,  "esgoto_clo", ["esgoto_cloacal", "cloacal", "1"]),
  };
  const fossa = {
    b: countEquals(baseF, "esgoto_clo", ["fossa_septica", "fossa"]),
    a: countEquals(atgF,  "esgoto_clo", ["fossa_septica", "fossa"]),
  };
  const condo = { b: countFlag(baseF, "condominio"), a: countFlag(atgF, "condominio") };

  const cor = INFRA_COLORS["Terrenos"];

  return (
    <div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Terrenos</h3>
      </div>
      {!base || (mostraImpacto && !atg) ? (
        <p className="text-xs text-center py-2 text-muted-foreground">
          Carregando...
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {mostraImpacto &&
            total > 0 &&
            (() => {
              const pct = Math.round((totalAtg / total) * 100);
              const pieData = [
                { name: "Atingidos", value: totalAtg },
                { name: "Não Atingidos", value: Math.max(0, total - totalAtg) },
              ];
              return (
                <div className="relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={cor} />
                        <Cell fill={`${cor}25`} />
                      </Pie>
                      <Tooltip
                        formatter={(v: ValueType | undefined) => [compactoBr(Number(v ?? 0), 0), ""]}
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: `1px solid ${C.border}`,
                          padding: "4px 10px",
                        }}
                        itemStyle={{ color: C.primary }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center pointer-events-none">
                    <span
                      className="text-lg font-black leading-none"
                      style={{ color: cor }}
                    >
                      {compactoBr(totalAtg, 0)}
                    </span>
                    <span className="text-[9px] font-medium" style={{ color: C.muted }}>
                      {pct}% atingidos
                    </span>
                    <span className="text-[9px]" style={{ color: C.muted }}>
                      de {compactoBr(total, 0)}
                    </span>
                  </div>
                </div>
              );
            })()}
          <div className="flex items-center px-2.5 py-1 rounded-lg mt-1" style={PANEL_HDR}>
            <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Cobertura de Serviços</h4>
          </div>
          {(() => {
            const t = total;
            const items = [
              { label: "Água",           val: mostraImpacto ? agua.a    : agua.b    },
              { label: "Coleta de Lixo", val: mostraImpacto ? lixo.a    : lixo.b    },
              { label: "Esgoto Pluvial", val: mostraImpacto ? pluvial.a : pluvial.b },
              { label: "Esgoto Cloacal", val: mostraImpacto ? cloacal.a : cloacal.b },
              { label: "Fossa Séptica",  val: mostraImpacto ? fossa.a   : fossa.b   },
              { label: "Condomínios",    val: mostraImpacto ? condo.a   : condo.b   },
            ];
            return (
              <div className="flex flex-col gap-2">
                {items.map(({ label, val }) => (
                  <BarServico key={label} label={label} value={val} total={t} cor={cor} />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
