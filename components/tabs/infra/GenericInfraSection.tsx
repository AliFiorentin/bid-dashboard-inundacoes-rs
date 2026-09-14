import React from "react";
import { ChevronDown } from "lucide-react";
import { INFRA_COLORS, PANEL_CARD_BG } from "@/lib/constants";
import {
  compactoBr,
  calcPct,
  getRotas,
  getLen,
  countRuasUnicasPOA,
  getRuasListPOA,
} from "@/lib/geo-utils";
import { KPICard } from "@/components/KPICard";
import { cn } from "@/lib/utils";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;

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

  switch (infraNome) {
    case "Edificações":
      kpi2 = {
        titulo: "Área Construída (m²)",
        valBase: baseF.reduce((s, f) => s + (Number((f.properties as Record<string, unknown>)?.area_m2) || 0), 0),
        valAtg:  atgF.reduce((s, f) => s + (Number((f.properties as Record<string, unknown>)?.area_m2) || 0), 0),
      };
      break;
    case "Ônibus":
      valBase = getRotas(baseF);
      valAtg  = getRotas(atgF);
      kpi2 = { titulo: "KM de Rotas", valBase: getLen(baseF), valAtg: getLen(atgF) };
      break;
    case "Eixos Logradouros":
      valBase = countRuasUnicasPOA(baseF);
      valAtg  = countRuasUnicasPOA(atgF);
      kpi2 = { titulo: "Segmentos", valBase: totalBase, valAtg: totalAtg };
      break;
  }

  const listaRuas = infraNome === "Eixos Logradouros" && mostraImpacto ? getRuasListPOA(atgF) : [];

  return (
    <div key={infraNome}>
      {!base ? (
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white">{infraNome}</h3>
          </div>
          <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
        </>
      ) : (
        <KPICard
          titulo={infraNome}
          cor={cor}
          principal={{
            valor: compactoBr(mostraImpacto ? valAtg : valBase, 0),
            sub: mostraImpacto ? "Atingidos" : "Total",
            delta: mostraImpacto ? `de ${compactoBr(valBase, 0)} (${calcPct(valAtg, valBase)})` : undefined,
          }}
          secundarios={kpi2 ? [{
            titulo: kpi2.titulo,
            valor: compactoBr(mostraImpacto ? kpi2.valAtg : kpi2.valBase, 1),
            sub: mostraImpacto ? "Atingidos" : "Total",
            delta: mostraImpacto ? `de ${compactoBr(kpi2.valBase, 1)} (${calcPct(kpi2.valAtg, kpi2.valBase)})` : undefined,
          }] : undefined}
        >
          {listaRuas.length > 0 && (
            <div className="border-t" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
              <button
                onClick={() => setShowListaEixos((p) => !p)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-white"
                style={PANEL_HDR}
              >
                <span>Ruas Atingidas ({listaRuas.length})</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showListaEixos && "rotate-180")} />
              </button>
              {showListaEixos && (
                <div
                  className="flex flex-col gap-0.5 max-h-52 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#055071] [&::-webkit-scrollbar-thumb]:rounded-full"
                  style={{ backgroundColor: PANEL_CARD_BG, scrollbarColor: "#055071 transparent" }}
                >
                  {listaRuas.map((label, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={label}>
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </KPICard>
      )}
    </div>
  );
}
