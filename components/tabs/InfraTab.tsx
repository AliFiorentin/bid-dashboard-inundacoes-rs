import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { C, INFRA_COLORS, INFRAESTRUTURA_CONFIG, INFRA_GRUPOS_VISAO_GERAL, MUNICIPIOS, AREA_VISAO_GERAL_LABEL, AREA_VISAO_GERAL_CENARIO } from "@/lib/constants";
import { compactoBr, calcPct, findCenarioData } from "@/lib/geo-utils";
import { KPICard } from "@/components/KPICard";
import { LogradourosSection } from "@/components/tabs/infra/LogradourosSection";
import { QuadrasSection } from "@/components/tabs/infra/QuadrasSection";
import { TerrenosSection } from "@/components/tabs/infra/TerrenosSection";
import { GenericInfraSection } from "@/components/tabs/infra/GenericInfraSection";
import { AreaAtingidaSection } from "@/components/tabs/infra/AreaAtingidaSection";
import type { DashboardState } from "@/hooks/useDashboard";

const COR_AREA = "#0891b2";

interface Props {
  dash: Pick<
    DashboardState,
    | "municipio"
    | "cenario"
    | "isVisaoGeral"
    | "mostraImpacto"
    | "isCenarioAtivo"
    | "baseInfra"
    | "atingidosInfra"
    | "allMunInfraStats"
    | "showListaLogradouros"
    | "setShowListaLogradouros"
    | "showListaEixos"
    | "setShowListaEixos"
    | "areaData"
  >;
}

export function InfraTab({ dash }: Props) {
  const {
    municipio,
    cenario,
    isVisaoGeral,
    mostraImpacto,
    isCenarioAtivo,
    baseInfra,
    atingidosInfra,
    allMunInfraStats,
    showListaLogradouros,
    setShowListaLogradouros,
    showListaEixos,
    setShowListaEixos,
    areaData,
  } = dash;

  // ── Visão Geral RS ─────────────────────────────────────────────────────────
  // Os GeoJSONs brutos de infra somam ~640MB entre os 4 municipios -- inviavel
  // baixar tudo para desenhar mapa/KPIs detalhados aqui. Mostra so a contagem
  // (e, para Edificações, a área construída) pré-calculada por município
  // (ver pipeline/10_infra_stats.py), tipo a tipo -- cada tipo de infra so
  // existe num subconjunto de municípios, entao nao ha um "total RS" universal
  // como em Agricultura, so a comparação lado a lado dos que existem.
  if (isVisaoGeral) {
    // Município a município os tipos tem nomes diferentes pro mesmo ativo
    // (ex.: "Eixos Logradouros" de Porto Alegre é a mesma coisa que
    // "Logradouros" de Rio Grande/Lajeado) -- agrupa pelo rótulo canônico
    // (INFRA_GRUPOS_VISAO_GERAL) em vez de listar cada nome bruto como uma
    // categoria separada.
    const rawParaGrupo: Record<string, string> = {};
    Object.entries(INFRA_GRUPOS_VISAO_GERAL).forEach(([grupo, brutos]) => {
      brutos.forEach(bruto => { rawParaGrupo[bruto] = grupo; });
    });

    const gruposComDado = new Set<string>();
    MUNICIPIOS.forEach(mun => {
      Object.keys(allMunInfraStats?.[mun] ?? {}).forEach(tipoBruto => {
        gruposComDado.add(rawParaGrupo[tipoBruto] ?? tipoBruto);
      });
    });
    const grupos = [...gruposComDado].sort((a, b) => a.localeCompare(b, "pt-BR"));

    if (grupos.length === 0) {
      return (
        <TabsContent value="infra" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2">
          <p className="text-xs text-center py-4 text-muted-foreground">Carregando...</p>
        </TabsContent>
      );
    }

    // Área territorial x área atingida pelo cenário da própria Visão Geral
    // (mancha estadual única "ADA Estadual", ver pipeline/11_area_atingida.py)
    // por município -- não é um "tipo de infra" como os grupos acima, mas
    // mora aqui (e não no Resumo) porque é a mesma lógica de "por município
    // lado a lado" já usada nesta aba. Usa a entrada agregada pronta para o
    // total (bate exatamente com a soma do detalhamento por município).
    const areaVisaoGeral = areaData?.[AREA_VISAO_GERAL_LABEL];
    const areaTerrTotal = areaVisaoGeral?.area_km2 ?? 0;
    const areaAtgTotal = findCenarioData(areaVisaoGeral?.cenarios ?? {}, AREA_VISAO_GERAL_CENARIO)?.area_atingida_km2 ?? 0;

    return (
      <TabsContent value="infra" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex flex-col gap-2 pb-2">
          {areaVisaoGeral && (
            <KPICard
              titulo="Área Atingida"
              cor={COR_AREA}
              principal={{
                valor: `${compactoBr(areaAtgTotal, 1)} km²`,
                sub: "Atingida (ADA Estadual)",
                delta: `de ${compactoBr(areaTerrTotal, 1)} km² (${calcPct(areaAtgTotal, areaTerrTotal)})`,
              }}
            >
              <div className="border-t px-3 py-2.5 flex flex-col gap-1.5" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
                <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Por Município</span>
                {MUNICIPIOS.map(mun => {
                  const d = areaData?.[mun];
                  if (!d) return null;
                  const cenData = findCenarioData(d.cenarios, AREA_VISAO_GERAL_CENARIO);
                  const atg = cenData?.area_atingida_km2 ?? 0;
                  const pctMun = d.area_km2 > 0 ? (atg / d.area_km2 * 100) : 0;
                  return (
                    <div key={mun} className="flex items-center gap-1.5">
                      <span className="text-[10px] w-24 shrink-0 truncate" style={{ color: C.muted }} title={mun}>
                        {mun}
                      </span>
                      <div className="flex-1 rounded-full h-1.5 overflow-hidden bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${pctMun}%`, backgroundColor: COR_AREA }} />
                      </div>
                      <span className="text-[10px] tabular-nums w-28 text-right shrink-0" style={{ color: C.muted }}>
                        {compactoBr(atg, 1)} de {compactoBr(d.area_km2, 1)} km²
                      </span>
                    </div>
                  );
                })}
              </div>
            </KPICard>
          )}

          {grupos.map(grupo => {
            const cor = INFRA_COLORS[grupo] ?? "#f59e0b";
            // Cada município entra com no máximo um dos nomes brutos do grupo.
            const entradas = MUNICIPIOS.flatMap(mun => {
              const statsMun = allMunInfraStats?.[mun];
              if (!statsMun) return [];
              const tipoBruto = Object.keys(statsMun).find(t => (rawParaGrupo[t] ?? t) === grupo);
              return tipoBruto ? [{ mun, tipoBruto, entry: statsMun[tipoBruto] }] : [];
            });
            const totalBase = entradas.reduce((s, { entry }) => s + entry.count_base, 0);
            const totalAtg = entradas.reduce((s, { entry }) => s + entry.count_atingido, 0);
            const temArea = entradas.some(({ entry }) => entry.area_m2_base != null);
            const areaBase = temArea ? entradas.reduce((s, { entry }) => s + (entry.area_m2_base ?? 0), 0) : 0;
            const areaAtg = temArea ? entradas.reduce((s, { entry }) => s + (entry.area_m2_atingido ?? 0), 0) : 0;

            return (
              <KPICard
                key={grupo}
                titulo={grupo}
                cor={cor}
                principal={{
                  valor: compactoBr(totalAtg, 0),
                  sub: "Atingidos",
                  delta: `de ${compactoBr(totalBase, 0)} (${calcPct(totalAtg, totalBase)})`,
                }}
                secundarios={temArea ? [{
                  titulo: "Área Construída (m²)",
                  valor: compactoBr(areaAtg, 0),
                  sub: "Atingidos",
                  delta: `de ${compactoBr(areaBase, 0)} (${calcPct(areaAtg, areaBase)})`,
                }] : undefined}
              >
                <div className="border-t px-3 py-2.5 flex flex-col gap-1.5" style={{ borderColor: "rgba(5,80,113,0.15)" }}>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Por Município</span>
                  {entradas.map(({ mun, tipoBruto, entry }) => {
                    const pct = entry.count_base > 0 ? (entry.count_atingido / entry.count_base * 100) : 0;
                    return (
                      <div key={mun} className="flex items-center gap-1.5">
                        <span className="text-[10px] w-24 shrink-0 truncate" style={{ color: C.muted }} title={tipoBruto !== grupo ? `${mun} (${tipoBruto})` : mun}>
                          {mun}{tipoBruto !== grupo && <span className="opacity-60"> ({tipoBruto})</span>}
                        </span>
                        <div className="flex-1 rounded-full h-1.5 overflow-hidden bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                        </div>
                        <span className="text-[10px] tabular-nums w-24 text-right shrink-0" style={{ color: C.muted }}>
                          {compactoBr(entry.count_atingido, 0)} de {compactoBr(entry.count_base, 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </KPICard>
            );
          })}
        </div>
        <p className="text-[10px] italic mt-2 text-muted-foreground">
          Fonte: Prefeituras Municipais
        </p>
      </TabsContent>
    );
  }

  // Mostra a KPI de TODOS os tipos de infra do municipio, marcados ou nao no
  // mapa -- infraAtivas so controla o que desenha no mapa (DashboardMap.tsx),
  // nao o que aparece aqui. Os dados sao pre-carregados em useDashboard.ts
  // assim que o municipio/cenario muda, entao a metrica ja vem pronta.
  const todosTipos = INFRAESTRUTURA_CONFIG[municipio] ?? [];

  return (
    <TabsContent
      value="infra"
      className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{ scrollbarColor: `${C.border} transparent` }}
    >
      <div className="flex flex-col gap-5 pb-2">
        <AreaAtingidaSection dash={{ municipio, cenario, mostraImpacto, areaData }} />

        {todosTipos.includes("Logradouros") && (
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

        {todosTipos.includes("Quadras") && (
          <QuadrasSection
            dash={{ baseInfra, atingidosInfra, mostraImpacto }}
          />
        )}

        {todosTipos.includes("Terrenos") && (
          <TerrenosSection
            dash={{ baseInfra, atingidosInfra, mostraImpacto }}
          />
        )}

        {todosTipos
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
