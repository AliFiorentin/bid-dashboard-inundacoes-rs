import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { C, INFRA_COLORS, INFRAESTRUTURA_CONFIG } from "@/lib/constants";
import { LogradourosSection } from "@/components/tabs/infra/LogradourosSection";
import { QuadrasSection } from "@/components/tabs/infra/QuadrasSection";
import { TerrenosSection } from "@/components/tabs/infra/TerrenosSection";
import { GenericInfraSection } from "@/components/tabs/infra/GenericInfraSection";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<
    DashboardState,
    | "infraAtivas"
    | "toggleInfra"
    | "municipio"
    | "mostraImpacto"
    | "isCenarioAtivo"
    | "baseInfra"
    | "atingidosInfra"
    | "showListaLogradouros"
    | "setShowListaLogradouros"
    | "showListaEixos"
    | "setShowListaEixos"
  >;
}

export function InfraTab({ dash }: Props) {
  const {
    infraAtivas,
    toggleInfra,
    municipio,
    mostraImpacto,
    isCenarioAtivo,
    baseInfra,
    atingidosInfra,
    showListaLogradouros,
    setShowListaLogradouros,
    showListaEixos,
    setShowListaEixos,
  } = dash;

  const disponiveis = (INFRAESTRUTURA_CONFIG[municipio] ?? []).filter(
    (n) => !infraAtivas.includes(n)
  );

  return (
    <TabsContent
      value="infra"
      className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{ scrollbarColor: `${C.border} transparent` }}
    >
      {disponiveis.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 mb-4 p-2.5 rounded-lg border"
          style={{ backgroundColor: "#f0f7fa", borderColor: C.border }}
        >
          <span
            className="w-full text-[9px] font-black uppercase tracking-wider mb-0.5"
            style={{ color: C.primary }}
          >
            Camadas disponíveis
          </span>
          {disponiveis.map((nome) => (
            <button
              key={nome}
              onClick={() => toggleInfra(nome)}
              className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-150 hover:text-white"
              style={{
                color: INFRA_COLORS[nome] ?? C.muted,
                borderColor: INFRA_COLORS[nome] ?? C.border,
                backgroundColor: `${INFRA_COLORS[nome] ?? C.muted}15`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  INFRA_COLORS[nome] ?? C.muted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${
                  INFRA_COLORS[nome] ?? C.muted
                }15`;
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: INFRA_COLORS[nome] ?? C.muted }}
              />
              {nome}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5 pb-2">
        {infraAtivas.includes("Logradouros") && (
          <LogradourosSection
            dash={{
              baseInfra,
              atingidosInfra,
              mostraImpacto,
              isCenarioAtivo,
              showListaLogradouros,
              setShowListaLogradouros,
            }}
          />
        )}

        {infraAtivas.includes("Quadras") && (
          <QuadrasSection
            dash={{ baseInfra, atingidosInfra, mostraImpacto }}
          />
        )}

        {infraAtivas.includes("Terrenos") && (
          <TerrenosSection
            dash={{ baseInfra, atingidosInfra, mostraImpacto }}
          />
        )}

        {infraAtivas
          .filter((n) => !["Logradouros", "Quadras", "Terrenos"].includes(n))
          .map((infraNome) => (
            <GenericInfraSection
              key={infraNome}
              infraNome={infraNome}
              dash={{
                baseInfra,
                atingidosInfra,
                mostraImpacto,
                showListaEixos,
                setShowListaEixos,
              }}
            />
          ))}
      </div>

      <p
        className="text-[9px] italic mt-3 pt-2 border-t"
        style={{ color: C.muted, borderColor: C.border }}
      >
        Fonte: Prefeituras Municipais
      </p>
    </TabsContent>
  );
}
