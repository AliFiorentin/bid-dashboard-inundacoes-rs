import React from "react";
import { C, INFRA_COLORS } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<DashboardState, "baseInfra" | "atingidosInfra" | "mostraImpacto">;
}

export function QuadrasSection({ dash }: Props) {
  const { baseInfra, atingidosInfra, mostraImpacto } = dash;

  const base = baseInfra["Quadras"];
  const atg = atingidosInfra["Quadras"];
  const total = base?.features?.length ?? 0;
  const totalAtg = atg?.features?.length ?? 0;
  const cor = INFRA_COLORS["Quadras"];

  return (
    <div>
      <h3
        className="text-[11px] font-black uppercase tracking-wider pb-1 mb-2 flex items-center gap-1.5"
        style={{ color: cor, borderBottom: `1px solid ${C.border}` }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: cor }}
        />
        Quadras
      </h3>
      {!base || (mostraImpacto && !atg) ? (
        <p className="text-xs text-center py-2" style={{ color: C.muted }}>
          Carregando...
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo="Quadras"
            cor={cor}
            valor={compactoBr(mostraImpacto ? totalAtg : total, 0)}
            sub={mostraImpacto ? "Atingidas" : "Total"}
            delta={
              mostraImpacto
                ? `de ${compactoBr(total, 0)} (${calcPct(totalAtg, total)})`
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
