import React from "react";
import { INFRA_COLORS } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { InfraMetricas } from "@/hooks/useDashboard";

interface Props {
  metricas?: InfraMetricas;
  metricasBase?: InfraMetricas;
  mostraImpacto: boolean;
  mapaAtivo: boolean;
  onToggleMapa: () => void;
}

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;

/** Rotas + KM não cabem num card de 1 KPI — span-2, mesmo padrão de
 *  LogradourosStatCard/TerrenosSection (só Porto Alegre tem esta camada). */
export function OnibusStatCard({ metricas, metricasBase, mostraImpacto, mapaAtivo, onToggleMapa }: Props) {
  const cor = INFRA_COLORS["Ônibus"];
  const atual = mostraImpacto ? metricas : metricasBase;

  return (
    <div className="col-span-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white flex-1">Ônibus</h3>
        <label className="flex items-center gap-1 text-[8px] font-bold text-white/90 cursor-pointer select-none shrink-0">
          <input type="checkbox" checked={mapaAtivo} onChange={onToggleMapa} className="h-3 w-3 accent-white cursor-pointer" />
          Exibir no mapa
        </label>
      </div>
      {!metricasBase ? (
        <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo="Rotas Únicas"
            cor={cor}
            valor={compactoBr(atual?.rotas ?? 0, 0)}
            sub={mostraImpacto ? "Atingidas" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(metricasBase.rotas ?? 0, 0)} (${calcPct(atual?.rotas ?? 0, metricasBase.rotas ?? 0)})` : undefined}
          />
          <KPIRow
            titulo="KM de Rotas"
            cor={cor}
            valor={compactoBr(atual?.km ?? 0, 1)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(metricasBase.km ?? 0, 1)} (${calcPct(atual?.km ?? 0, metricasBase.km ?? 0)})` : undefined}
          />
        </div>
      )}
    </div>
  );
}
