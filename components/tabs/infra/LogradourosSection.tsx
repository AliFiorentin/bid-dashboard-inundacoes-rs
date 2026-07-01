import React from "react";
import type { Feature } from "geojson";
import { ChevronDown } from "lucide-react";
import { INFRA_COLORS } from "@/lib/constants";
import { compactoBr, calcPct, countFlag, countRuasUnicas } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { BarServico } from "@/components/ui/BarServico";
import { cn } from "@/lib/utils";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
const PANEL_GLASS: React.CSSProperties = {
  border: "1px solid rgba(5,80,113,0.15)",
};

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

  return (
    <div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Logradouros</h3>
      </div>
      {!base || (mostraImpacto && !atg) ? (
        <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo="Segmentos"
            cor={cor}
            valor={compactoBr(mostraImpacto ? segAtg : segBase, 0)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(segBase, 0)} (${calcPct(segAtg, segBase)})` : undefined}
          />
          <KPIRow
            titulo="Ruas Únicas"
            cor={cor}
            valor={compactoBr(mostraImpacto ? ruasAtg : ruasBase, 0)}
            sub={mostraImpacto ? "Atingidas" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(ruasBase, 0)} (${calcPct(ruasAtg, ruasBase)})` : undefined}
          />
          {mostraImpacto && (() => {
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
            if (!lista.length) return null;
            return (
              <div className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowListaLogradouros((p) => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-white"
                  style={PANEL_HDR}
                >
                  <span>Ruas Atingidas ({lista.length})</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showListaLogradouros && "rotate-180")} />
                </button>
                {showListaLogradouros && (
                  <div
                    className="flex flex-col gap-0.5 max-h-52 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#055071] [&::-webkit-scrollbar-thumb]:rounded-full"
                    style={{ ...PANEL_GLASS, scrollbarColor: "#055071 transparent" }}
                  >
                    {lista.map((label, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={label}>{label}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {(drenBase > 0 || ilumBase > 0) && (
            <>
              <div className="flex items-center px-2.5 py-1 rounded-lg mt-1" style={PANEL_HDR}>
                <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Cobertura de Serviços</h4>
              </div>
              <div className="flex flex-col gap-2">
                {drenBase > 0 && <BarServico label="Drenagem" value={mostraImpacto ? drenAtg : drenBase} total={segBase} cor={cor} />}
                {ilumBase > 0 && <BarServico label="Iluminação" value={mostraImpacto ? ilumAtg : ilumBase} total={segBase} cor={cor} />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
