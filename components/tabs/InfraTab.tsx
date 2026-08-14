import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { C, INFRAESTRUTURA_CONFIG, CENARIOS_CONFIG } from "@/lib/constants";
import { LogradourosStatCard } from "@/components/tabs/infra/LogradourosStatCard";
import { TerrenosSection } from "@/components/tabs/infra/TerrenosSection";
import { OnibusStatCard } from "@/components/tabs/infra/OnibusStatCard";
import { InfraStatCard } from "@/components/tabs/infra/InfraStatCard";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: Pick<
    DashboardState,
    | "infraAtivas"
    | "toggleInfra"
    | "municipio"
    | "cenario"
    | "mostraImpacto"
    | "isCenarioAtivo"
    | "infraStats"
    | "atingidosInfra"
    | "showListaLogradouros"
    | "setShowListaLogradouros"
  >;
}

// Categorias com componente próprio (mais de um KPI, lista, gráfico) — usam a
// largura cheia do painel. Tudo que não está aqui vira um InfraStatCard
// compacto, 2 por linha.
const LOGRADOUROS_NOMES = new Set(["Eixos Logradouros", "Logradouros"]);

export function InfraTab({ dash }: Props) {
  const {
    infraAtivas,
    toggleInfra,
    municipio,
    cenario,
    mostraImpacto,
    isCenarioAtivo,
    infraStats,
    atingidosInfra,
    showListaLogradouros,
    setShowListaLogradouros,
  } = dash;

  const categorias = INFRAESTRUTURA_CONFIG[municipio] ?? [];
  // Cenário "pior" default usado pelas telas de KPI fixo — mas aqui o usuário
  // já escolheu um cenário real (isCenarioAtivo cobre isso); infraStats só
  // tem uma entrada por cenário selecionável, então usamos o cenário atual
  // quando ativo, senão caímos no primeiro da lista só para não quebrar o
  // formato (mostraImpacto fica false nesse caso, então esse valor nem é lido).
  const cenarioParaStats = isCenarioAtivo && cenario !== "(nenhum)"
    ? cenario
    : (CENARIOS_CONFIG[municipio]?.[0] ?? cenario);

  const metricasDe = (nome: string) => ({
    metricasBase: infraStats?.base[nome],
    metricas: infraStats?.cenarios[cenarioParaStats]?.[nome],
  });

  return (
    <TabsContent
      value="infra"
      className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{ scrollbarColor: `${C.border} transparent` }}
    >
      <div
        className="rounded-lg px-2.5 py-2 mb-3"
        style={{ backgroundColor: `${C.primary}0d`, border: `1px solid ${C.primary}22` }}
      >
        <span className="text-[9px] leading-tight block" style={{ color: C.muted }}>
          Os indicadores abaixo valem para todas as camadas, estejam ou não desenhadas no
          mapa. Marque <strong>Exibir no mapa</strong> em cada uma para desenhá-la — por
          padrão só as principais aparecem, para o mapa não ficar poluído.
        </span>
      </div>

      {!infraStats ? (
        <p className="text-xs text-center py-4 text-muted-foreground">Carregando indicadores...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 pb-2">
          {categorias.map((nome) => {
            const mapaAtivo = infraAtivas.includes(nome);
            const onToggleMapa = () => toggleInfra(nome);
            const { metricas, metricasBase } = metricasDe(nome);

            if (LOGRADOUROS_NOMES.has(nome)) {
              return (
                <LogradourosStatCard
                  key={nome}
                  infraNome={nome}
                  metricas={metricas}
                  metricasBase={metricasBase}
                  mostraImpacto={mostraImpacto}
                  mapaAtivo={mapaAtivo}
                  onToggleMapa={onToggleMapa}
                  atingidoReal={mapaAtivo ? atingidosInfra[nome] : undefined}
                  showLista={showListaLogradouros}
                  setShowLista={setShowListaLogradouros}
                />
              );
            }
            if (nome === "Terrenos") {
              return (
                <TerrenosSection
                  key={nome}
                  metricas={metricas}
                  metricasBase={metricasBase}
                  mostraImpacto={mostraImpacto}
                  mapaAtivo={mapaAtivo}
                  onToggleMapa={onToggleMapa}
                />
              );
            }
            if (nome === "Ônibus") {
              return (
                <OnibusStatCard
                  key={nome}
                  metricas={metricas}
                  metricasBase={metricasBase}
                  mostraImpacto={mostraImpacto}
                  mapaAtivo={mapaAtivo}
                  onToggleMapa={onToggleMapa}
                />
              );
            }
            return (
              <InfraStatCard
                key={nome}
                infraNome={nome}
                metricas={metricas}
                metricasBase={metricasBase}
                mostraImpacto={mostraImpacto}
                mapaAtivo={mapaAtivo}
                onToggleMapa={onToggleMapa}
              />
            );
          })}
        </div>
      )}

      <p className="text-[9px] italic mt-3 pt-2 border-t" style={{ color: C.muted, borderColor: C.border }}>
        Fonte: Prefeituras Municipais e OpenStreetMap (ver nota em cada camada).
      </p>
    </TabsContent>
  );
}
