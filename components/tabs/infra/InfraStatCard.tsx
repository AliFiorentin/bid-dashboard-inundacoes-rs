import React from "react";
import { INFRA_COLORS, INFRA_OSM_NAMES, infraLabel } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import type { InfraMetricas } from "@/hooks/useDashboard";

const TITULOS: Record<string, string> = {
  Terminais: "Terminais",
  "Rede Esgoto": "Segmentos de Esgoto",
  Paradas: "Paradas de Ônibus",
  Hidrantes: "Hidrantes",
  Gás: "Segmentos de Gás",
  "Bocas de Lobo": "Bocas de Lobo",
  Poste: "Postes",
  Lotes: "Lotes",
  "Iluminação Pública": "Pontos de Iluminação",
  Quarteirões: "Quadras",
  Quadras: "Quadras",
  Pontes: "Pontos Mapeados",
  "Diques/Muros": "Pontos Mapeados",
  "Casas de Bomba": "Pontos Mapeados",
  Saneamento: "Pontos Mapeados",
  Energia: "Pontos Mapeados",
  "Torres/Antenas": "Pontos Mapeados",
  "Barragens/Vertedouros": "Pontos Mapeados",
};

interface Props {
  infraNome: string;
  metricas?: InfraMetricas;
  metricasBase?: InfraMetricas;
  mostraImpacto: boolean;
  mapaAtivo: boolean;
  onToggleMapa: () => void;
}

/**
 * Card compacto para 2 colunas — usado por toda categoria de infraestrutura
 * cujo KPI é "uma contagem, com no máximo um número secundário" (Edificações
 * tem área; o resto é só n). Categorias mais ricas (Logradouros — lista de
 * ruas —, Terrenos — gráfico + cobertura de serviços —, Ônibus — rotas+km)
 * têm componente próprio e ocupam a largura cheia no InfraTab.
 *
 * Lê de infraStats (pré-calculado, ~1 KB por município), não de baseInfra —
 * é isso que permite mostrar o número sem baixar a geometria completa
 * (Edificações sozinha chega a 139 MB em Porto Alegre).
 */
export function InfraStatCard({
  infraNome,
  metricas,
  metricasBase,
  mostraImpacto,
  mapaAtivo,
  onToggleMapa,
}: Props) {
  const cor = INFRA_COLORS[infraNome] ?? "#f59e0b";
  const titulo = TITULOS[infraNome] ?? "Elementos";

  const atual = mostraImpacto ? metricas : metricasBase;
  const base = metricasBase;
  const valor = atual?.n ?? 0;
  const valorBase = base?.n ?? 0;
  const area = atual?.area;
  const areaBase = base?.area;

  return (
    <div
      className="rounded-lg overflow-hidden print:break-inside-avoid flex flex-col"
      style={{ border: "1px solid rgba(5,80,113,0.15)" }}
    >
      <div
        className="flex items-center gap-1 px-2 py-1"
        style={{
          background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)",
          borderLeft: `3px solid ${cor}`,
        }}
      >
        <span className="text-[9px] font-black uppercase tracking-wide text-white leading-tight flex-1 min-w-0 break-words">
          {infraLabel(infraNome)}
        </span>
        <input
          type="checkbox"
          checked={mapaAtivo}
          onChange={onToggleMapa}
          title="Exibir no mapa"
          className="h-3 w-3 accent-white cursor-pointer shrink-0"
        />
      </div>

      {!base ? (
        <p className="text-[10px] text-center py-3 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="px-2 py-2 flex flex-col gap-0.5">
          <span className="text-[9px] leading-none text-muted-foreground">{titulo}</span>
          <span className="text-xl font-black leading-none" style={{ color: "#022536" }}>
            {compactoBr(valor, 0)}
          </span>
          <span className="text-[9px] leading-none text-muted-foreground mt-0.5">
            {mostraImpacto ? "Atingidos" : "Total"}
          </span>
          {mostraImpacto && (
            <span className="text-[9px] font-medium text-muted-foreground">
              de {compactoBr(valorBase, 0)} ({calcPct(valor, valorBase)})
            </span>
          )}
          {area !== undefined && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[9px] leading-none text-muted-foreground">
                Área {mostraImpacto ? "Atingida" : "Total"} (m²)
              </span>
              <span className="text-sm font-black leading-none" style={{ color: "#022536" }}>
                {compactoBr(area, 0)}
              </span>
              {mostraImpacto && areaBase !== undefined && (
                <span className="text-[9px] text-muted-foreground">
                  de {compactoBr(areaBase, 0)} ({calcPct(area, areaBase)})
                </span>
              )}
            </div>
          )}
          {INFRA_OSM_NAMES.has(infraNome) && (
            <span className="text-[8px] italic text-muted-foreground mt-1">Fonte: OpenStreetMap</span>
          )}
        </div>
      )}
    </div>
  );
}
