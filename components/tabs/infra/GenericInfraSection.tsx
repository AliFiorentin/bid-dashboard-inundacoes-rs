import React from "react";
import { C, COLORS, INFRA_COLORS } from "@/lib/constants";
import {
  compactoBr,
  calcPct,
  getRotas,
  getLen,
  countRuasUnicasPOA,
  getRuasListPOA,
} from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import type { DashboardState } from "@/hooks/useDashboard";

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
  const cor = INFRA_COLORS[infraNome] ?? COLORS.infra;
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
      <h3
        className="text-[11px] font-black uppercase tracking-wider pb-1 mb-2 flex items-center gap-1.5"
        style={{ color: cor, borderBottom: `1px solid ${C.border}` }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: cor }}
        />
        {infraNome}
      </h3>
      {!base ? (
        <p className="text-xs text-center py-2" style={{ color: C.muted }}>
          Carregando...
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo={titulo}
            cor={cor}
            valor={compactoBr(mostraImpacto ? valAtg : valBase, 0)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={
              mostraImpacto
                ? `de ${compactoBr(valBase, 0)} (${calcPct(valAtg, valBase)})`
                : undefined
            }
          />
          {kpi2 && (
            <KPIRow
              titulo={kpi2.titulo}
              cor={cor}
              valor={compactoBr(mostraImpacto ? kpi2.valAtg : kpi2.valBase, 1)}
              sub={mostraImpacto ? "Atingidos" : "Total"}
              delta={
                mostraImpacto
                  ? `de ${compactoBr(kpi2.valBase, 1)} (${calcPct(kpi2.valAtg, kpi2.valBase)})`
                  : undefined
              }
            />
          )}
          {infraNome === "Eixos Logradouros" &&
            mostraImpacto &&
            (() => {
              const lista = getRuasListPOA(atgF);
              if (!lista.length) return null;
              return (
                <>
                  <button
                    onClick={() => setShowListaEixos((p) => !p)}
                    className="w-full flex items-center justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: C.cardBg,
                      color: C.primary,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <span>Ruas Atingidas ({lista.length})</span>
                    <span style={{ fontSize: 9 }}>{showListaEixos ? "▲" : "▼"}</span>
                  </button>
                  {showListaEixos && (
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
        </div>
      )}
    </div>
  );
}
