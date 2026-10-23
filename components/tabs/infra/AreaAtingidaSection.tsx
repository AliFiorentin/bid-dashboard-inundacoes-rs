import React from "react";
import { compactoBr, calcPct, findCenarioData } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

const COR_AREA = "#0891b2";

interface Props {
  dash: Pick<DashboardState, "municipio" | "cenario" | "mostraImpacto" | "areaData" | "areaCotaKm2">;
}

export function AreaAtingidaSection({ dash }: Props) {
  const { municipio, cenario, mostraImpacto, areaData, areaCotaKm2 } = dash;

  const munData = areaData?.[municipio];
  if (!munData) return null;

  // "Todas as cotas" pausada: area sob agua vem do raster da cota (areaCotaKm2).
  const cenData = areaCotaKm2 != null
    ? { area_atingida_km2: areaCotaKm2 }
    : mostraImpacto && cenario !== "(nenhum)"
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
