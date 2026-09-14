import React from "react";
import { compactoBr, calcPct, findCenarioData } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

const COR_AREA = "#0891b2";

interface Props {
  dash: Pick<DashboardState, "municipio" | "cenario" | "mostraImpacto" | "areaData">;
}

export function AreaAtingidaSection({ dash }: Props) {
  const { municipio, cenario, mostraImpacto, areaData } = dash;

  const munData = areaData?.[municipio];
  if (!munData) return null;

  const cenData = mostraImpacto && cenario !== "(nenhum)"
    ? findCenarioData(munData.cenarios, cenario)
    : null;

  return (
    <KPIRow
      titulo="Área Atingida"
      cor={COR_AREA}
      valor={`${compactoBr(cenData ? cenData.area_atingida_km2 : munData.area_km2, 1)} km²`}
      sub={cenData ? "Atingida" : "Território"}
      delta={cenData ? `de ${compactoBr(munData.area_km2, 1)} km² (${calcPct(cenData.area_atingida_km2, munData.area_km2)})` : undefined}
    />
  );
}
