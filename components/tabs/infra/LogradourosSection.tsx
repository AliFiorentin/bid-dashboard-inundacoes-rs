import React from "react";
import type { Feature } from "geojson";
import { C, INFRA_COLORS } from "@/lib/constants";
import { compactoBr, calcPct, countFlag, countRuasUnicas } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { BarServico } from "@/components/ui/BarServico";
import type { DashboardState } from "@/hooks/useDashboard";

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
  const {
    baseInfra,
    atingidosInfra,
    mostraImpacto,
    showListaLogradouros,
    setShowListaLogradouros,
  } = dash;

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
      <h3
        className="text-[11px] font-black uppercase tracking-wider pb-1 mb-2 flex items-center gap-1.5"
        style={{ color: cor, borderBottom: `1px solid ${C.border}` }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: cor }}
        />
        Logradouros
      </h3>
      {!base || (mostraImpacto && !atg) ? (
        <p className="text-xs text-center py-2" style={{ color: C.muted }}>
          Carregando...
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo="Segmentos"
            cor={cor}
            valor={compactoBr(mostraImpacto ? segAtg : segBase, 0)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={
              mostraImpacto
                ? `de ${compactoBr(segBase, 0)} (${calcPct(segAtg, segBase)})`
                : undefined
            }
          />
          <KPIRow
            titulo="Ruas Únicas"
            cor={cor}
            valor={compactoBr(mostraImpacto ? ruasAtg : ruasBase, 0)}
            sub={mostraImpacto ? "Atingidas" : "Total"}
            delta={
              mostraImpacto
                ? `de ${compactoBr(ruasBase, 0)} (${calcPct(ruasAtg, ruasBase)})`
                : undefined
            }
          />
          {mostraImpacto &&
            (() => {
              const seen = new Set<string>();
              const lista: string[] = [];
              atgF.forEach((f: Feature) => {
                const props = f.properties as Record<string, unknown>;
                const tipo = String(props?.tipo ?? "")
                  .trim()
                  .toUpperCase();
                const nome = String(props?.nome ?? "")
                  .trim()
                  .toUpperCase();
                const label = [tipo, nome].filter(Boolean).join(" ");
                if (label && !seen.has(label)) {
                  seen.add(label);
                  lista.push(label);
                }
              });
              lista.sort((a, b) => a.localeCompare(b, "pt-BR"));
              if (!lista.length) return null;
              return (
                <>
                  <button
                    onClick={() => setShowListaLogradouros((p) => !p)}
                    className="w-full flex items-center justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: C.cardBg,
                      color: C.primary,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <span>Ruas Atingidas ({lista.length})</span>
                    <span style={{ fontSize: 9 }}>
                      {showListaLogradouros ? "▲" : "▼"}
                    </span>
                  </button>
                  {showListaLogradouros && (
                    <div
                      className="flex flex-col gap-0.5 max-h-52 overflow-y-auto rounded-lg p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#055071] [&::-webkit-scrollbar-thumb]:rounded-full"
                      style={{
                        backgroundColor: "#ffffff",
                        border: `1px solid ${C.border}`,
                        scrollbarColor: "#055071 transparent",
                      }}
                    >
                      {lista.map((label, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ color: C.muted }}
                          title={label}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          {(drenBase > 0 || ilumBase > 0) && (
            <>
              <h4
                className="text-[10px] font-bold uppercase tracking-wider pt-2 pb-1 border-t"
                style={{ color: cor, borderColor: C.border }}
              >
                Cobertura de Serviços
              </h4>
              <div className="flex flex-col gap-2">
                {drenBase > 0 && (
                  <BarServico
                    label="Drenagem"
                    value={mostraImpacto ? drenAtg : drenBase}
                    total={segBase}
                    cor={cor}
                  />
                )}
                {ilumBase > 0 && (
                  <BarServico
                    label="Iluminação"
                    value={mostraImpacto ? ilumAtg : ilumBase}
                    total={segBase}
                    cor={cor}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
