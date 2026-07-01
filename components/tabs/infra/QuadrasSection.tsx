import React from "react";
import { INFRA_COLORS } from "@/lib/constants";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
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
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Quadras</h3>
      </div>
      {!base || (mostraImpacto && !atg) ? (
        <p className="text-xs text-center py-2 text-muted-foreground">
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
