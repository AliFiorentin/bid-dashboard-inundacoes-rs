import React from "react";
import { ChevronDown } from "lucide-react";
import { INFRA_COLORS } from "@/lib/constants";
import {
  compactoBr,
  calcPct,
  getRotas,
  getLen,
  countRuasUnicasPOA,
  getRuasListPOA,
} from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { cn } from "@/lib/utils";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
const PANEL_GLASS: React.CSSProperties = {
  border: "1px solid rgba(5,80,113,0.15)",
};

interface Props {
  infraNome: string;
  dash: Pick<
    DashboardState,
    | "baseInfra"
    | "atingidosInfra"
    | "mostraImpacto"
    | "showListaEixos"
    | "setShowListaEixos"
  >;
}

export function GenericInfraSection({ infraNome, dash }: Props) {
  const { baseInfra, atingidosInfra, mostraImpacto, showListaEixos, setShowListaEixos } = dash;

  const base     = baseInfra[infraNome];
  const atingido = atingidosInfra[infraNome];
  const totalBase = base?.features?.length ?? 0;
  const totalAtg  = atingido?.features?.length ?? 0;
  const cor = INFRA_COLORS[infraNome] ?? "#f59e0b";
  const baseF = base?.features ?? [];
  const atgF  = atingido?.features ?? [];

  let valBase = totalBase;
  let valAtg  = totalAtg;
  let kpi2: { titulo: string; valBase: number; valAtg: number } | null = null;
  let titulo = "Elementos";

  switch (infraNome) {
    case "Edificações":
      titulo = "Edificações";
      kpi2 = {
        titulo: "Área Construída (m²)",
        valBase: baseF.reduce((s, f) => s + (Number((f.properties as Record<string, unknown>)?.area_m2) || 0), 0),
        valAtg:  atgF.reduce((s, f) => s + (Number((f.properties as Record<string, unknown>)?.area_m2) || 0), 0),
      };
      break;
    case "Terminais":         titulo = "Terminais"; break;
    case "Rede Esgoto":       titulo = "Segmentos de Esgoto"; break;
    case "Paradas":           titulo = "Paradas de Ônibus"; break;
    case "Ônibus":
      titulo = "Rotas Únicas";
      valBase = getRotas(baseF);
      valAtg  = getRotas(atgF);
      kpi2 = { titulo: "KM de Rotas", valBase: getLen(baseF), valAtg: getLen(atgF) };
      break;
    case "Hidrantes":         titulo = "Hidrantes"; break;
    case "Gás":               titulo = "Segmentos de Gás"; break;
    case "Quarteirões":       titulo = "Quarteirões"; break;
    case "Bocas de Lobo":     titulo = "Bocas de Lobo"; break;
    case "Eixos Logradouros":
      titulo = "Ruas Únicas";
      valBase = countRuasUnicasPOA(baseF);
      valAtg  = countRuasUnicasPOA(atgF);
      kpi2 = { titulo: "Segmentos", valBase: totalBase, valAtg: totalAtg };
      break;
    case "Poste":              titulo = "Postes"; break;
    case "Lotes":              titulo = "Lotes"; break;
    case "Imóveis":            titulo = "Imóveis Cadastrados"; break;
    case "Prédios Públicos":   titulo = "Prédios Públicos"; break;
    case "Segurança":          titulo = "Equip. Segurança"; break;
    case "Iluminação Pública": titulo = "Pontos de Iluminação"; break;
  }

  return (
    <div key={infraNome}>
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">{infraNome}</h3>
      </div>

      {!base ? (
        <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo={titulo}
            cor={cor}
            valor={compactoBr(mostraImpacto ? valAtg : valBase, 0)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(valBase, 0)} (${calcPct(valAtg, valBase)})` : undefined}
          />
          {kpi2 && (
            <KPIRow
              titulo={kpi2.titulo}
              cor={cor}
              valor={compactoBr(mostraImpacto ? kpi2.valAtg : kpi2.valBase, 1)}
              sub={mostraImpacto ? "Atingidos" : "Total"}
              delta={mostraImpacto ? `de ${compactoBr(kpi2.valBase, 1)} (${calcPct(kpi2.valAtg, kpi2.valBase)})` : undefined}
            />
          )}
          {infraNome === "Eixos Logradouros" && mostraImpacto && (() => {
            const lista = getRuasListPOA(atgF);
            if (!lista.length) return null;
            return (
              <div className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowListaEixos((p) => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-white"
                  style={PANEL_HDR}
                >
                  <span>Ruas Atingidas ({lista.length})</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showListaEixos && "rotate-180")} />
                </button>
                {showListaEixos && (
                  <div
                    className="flex flex-col gap-0.5 max-h-52 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#055071] [&::-webkit-scrollbar-thumb]:rounded-full"
                    style={{ ...PANEL_GLASS, scrollbarColor: "#055071 transparent" }}
                  >
                    {lista.map((label, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
