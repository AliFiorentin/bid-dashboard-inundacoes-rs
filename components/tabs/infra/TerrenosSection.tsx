import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { C, INFRA_COLORS } from "@/lib/constants";
import { compactoBr, calcPct, countFlag, countEquals } from "@/lib/geo-utils";
import { BarServico } from "@/components/ui/BarServico";
import { KPICard } from "@/components/KPICard";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;

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

  // Mesmo padrao de GenericInfraSection/LogradourosSection: header manual so'
  // durante o carregamento -- uma vez pronto, o KPICard assume o unico
  // header, com o grafico/coberturas dentro da mesma caixa com borda/fundo
  // (antes o pie chart e as barras de servico ficavam soltos, sem caixa).
  if (!base || (mostraImpacto && !atg)) {
    return (
      <div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Terrenos</h3>
        </div>
        <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const pct = total > 0 ? Math.round((totalAtg / total) * 100) : 0;
  const pieData = [
    { name: "Atingidos", value: totalAtg },
    { name: "Não Atingidos", value: Math.max(0, total - totalAtg) },
  ];
  const servicos = [
    { label: "Água",           val: mostraImpacto ? agua.a    : agua.b    },
    { label: "Coleta de Lixo", val: mostraImpacto ? lixo.a    : lixo.b    },
    { label: "Esgoto Pluvial", val: mostraImpacto ? pluvial.a : pluvial.b },
    { label: "Esgoto Cloacal", val: mostraImpacto ? cloacal.a : cloacal.b },
    { label: "Fossa Séptica",  val: mostraImpacto ? fossa.a   : fossa.b   },
    { label: "Condomínios",    val: mostraImpacto ? condo.a   : condo.b   },
  ];

  return (
    <KPICard
      titulo="Terrenos"
      cor={cor}
      principal={{
        valor: compactoBr(mostraImpacto ? totalAtg : total, 0),
        sub: mostraImpacto ? "Atingidos" : "Total",
        delta: mostraImpacto ? `de ${compactoBr(total, 0)} (${calcPct(totalAtg, total)})` : undefined,
      }}
    >
      {mostraImpacto && total > 0 && (
        <div className="relative flex items-center justify-center border-t" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
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
            <span className="text-lg font-black leading-none" style={{ color: cor }}>
              {compactoBr(totalAtg, 0)}
            </span>
            <span className="text-[9px] font-medium" style={{ color: C.muted }}>{pct}% atingidos</span>
            <span className="text-[9px]" style={{ color: C.muted }}>de {compactoBr(total, 0)}</span>
          </div>
        </div>
      )}
      <div className="border-t px-3 py-2.5 flex flex-col gap-2" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Cobertura de Serviços</span>
        {servicos.map(({ label, val }) => (
          <BarServico key={label} label={label} value={val} total={total} cor={cor} />
        ))}
      </div>
    </KPICard>
  );
}
