import React from "react";
import type { Feature } from "geojson";
import { ChevronDown } from "lucide-react";
import { INFRA_COLORS, PANEL_CARD_BG } from "@/lib/constants";
import { compactoBr, calcPct, countFlag, countRuasUnicas } from "@/lib/geo-utils";
import { KPICard } from "@/components/KPICard";
import { BarServico } from "@/components/ui/BarServico";
import { cn } from "@/lib/utils";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;

interface Props {
  dash: Pick<
    DashboardState,
    | "baseInfra"
    | "atingidosInfra"
    | "mostraImpacto"
    | "isCenarioAtivo"
    | "showListaLogradouros"
    | "setShowListaLogradouros"
  >;
}

export function LogradourosSection({ dash }: Props) {
  const { baseInfra, atingidosInfra, mostraImpacto, showListaLogradouros, setShowListaLogradouros } = dash;

  const base = baseInfra["Logradouros"];
  const atg = atingidosInfra["Logradouros"];
  const baseF = base?.features ?? [];
  const atgF = atg?.features ?? [];

  const segBase = baseF.length;
  const segAtg = atgF.length;
  const ruasBase = countRuasUnicas(baseF);
  const ruasAtg = countRuasUnicas(atgF);
  const drenBase = countFlag(baseF, "drenagem");
  const drenAtg = countFlag(atgF, "drenagem");
  const ilumBase = countFlag(baseF, "iluminacao");
  const ilumAtg = countFlag(atgF, "iluminacao");
  const cor = INFRA_COLORS["Logradouros"];

  const listaRuas = (() => {
    if (!mostraImpacto) return [];
    const seen = new Set<string>();
    const lista: string[] = [];
    atgF.forEach((f: Feature) => {
      const props = f.properties as Record<string, unknown>;
      const tipo = String(props?.tipo ?? "").trim().toUpperCase();
      const nome = String(props?.nome ?? "").trim().toUpperCase();
      const label = [tipo, nome].filter(Boolean).join(" ");
      if (label && !seen.has(label)) { seen.add(label); lista.push(label); }
    });
    lista.sort((a, b) => a.localeCompare(b, "pt-BR"));
    return lista;
  })();

  return (
    <div>
      {!base || (mostraImpacto && !atg) ? (
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Logradouros</h3>
          </div>
          <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
        </>
      ) : (
        <KPICard
          titulo="Logradouros"
          cor={cor}
          principal={{
            valor: compactoBr(mostraImpacto ? ruasAtg : ruasBase, 0),
            sub: mostraImpacto ? "Atingidas" : "Total",
            delta: mostraImpacto ? `de ${compactoBr(ruasBase, 0)} (${calcPct(ruasAtg, ruasBase)})` : undefined,
          }}
          secundarios={[{
            titulo: "Segmentos",
            valor: compactoBr(mostraImpacto ? segAtg : segBase, 0),
            sub: mostraImpacto ? "Atingidos" : "Total",
            delta: mostraImpacto ? `de ${compactoBr(segBase, 0)} (${calcPct(segAtg, segBase)})` : undefined,
          }]}
        >
          {listaRuas.length > 0 && (
            <div className="border-t" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
              <button
                onClick={() => setShowListaLogradouros((p) => !p)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-white"
                style={PANEL_HDR}
              >
                <span>Ruas Atingidas ({listaRuas.length})</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showListaLogradouros && "rotate-180")} />
              </button>
              {showListaLogradouros && (
                <div
                  className="flex flex-col gap-0.5 max-h-52 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#055071] [&::-webkit-scrollbar-thumb]:rounded-full"
                  style={{ backgroundColor: PANEL_CARD_BG, scrollbarColor: "#055071 transparent" }}
                >
                  {listaRuas.map((label, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={label}>{label}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          {(drenBase > 0 || ilumBase > 0) && (
            <div className="border-t px-3 py-2.5 flex flex-col gap-2" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Cobertura de Serviços</span>
              {drenBase > 0 && <BarServico label="Drenagem" value={mostraImpacto ? drenAtg : drenBase} total={segBase} cor={cor} />}
              {ilumBase > 0 && <BarServico label="Iluminação" value={mostraImpacto ? ilumAtg : ilumBase} total={segBase} cor={cor} />}
            </div>
          )}
        </KPICard>
      )}
    </div>
  );
}
