import React from "react"
import { Source, Layer } from "react-map-gl/maplibre"
import { COLORS, INFRA_COLORS } from "@/lib/constants"
import { slugify } from "@/lib/geo-utils"
import type { DashboardState } from "@/hooks/useDashboard"

/** Camadas de infraestrutura marcadas (BASE ou ATINGIDOS conforme o cenário). */
export function InfraLayers({ dash }: { dash: DashboardState }) {
  const {
    camadas,
    cenario,
    baseInfra,
    atingidosInfra,
    infraAtivas,
    isTransitioning,
    isVisaoGeral,
  } = dash

  return (
    <>
      {camadas.includes("Infraestrutura") &&
        !isTransitioning &&
        !isVisaoGeral &&
        Object.entries(baseInfra).map(([nomeInfra, dadosTotal]) => {
          if (!dadosTotal || !infraAtivas.includes(nomeInfra)) return null
          const srcId = `infra-${slugify(nomeInfra)}`
          const infraCor = INFRA_COLORS[nomeInfra] ?? COLORS.infra
          const cenarioSelecionado = cenario !== "(nenhum)"
          const dataGeo = cenarioSelecionado
            ? (atingidosInfra[nomeInfra] ?? {
                type: "FeatureCollection",
                features: [],
              })
            : dadosTotal
          return (
            <React.Fragment key={srcId}>
              <Source id={srcId} type="geojson" data={dataGeo}>
                <Layer
                  id={`${srcId}-fill`}
                  beforeId="anchor-buildings"
                  type="fill"
                  filter={[
                    "any",
                    ["==", ["geometry-type"], "Polygon"],
                    ["==", ["geometry-type"], "MultiPolygon"],
                  ]}
                  paint={{
                    "fill-color": infraCor,
                    "fill-opacity": 0.25,
                    "fill-outline-color": infraCor,
                  }}
                />
                {/* Linhas (Logradouros/Rotas) Atingidas */}
                <Layer
                  id={`${srcId}-line`}
                  beforeId="anchor-buildings"
                  type="line"
                  filter={[
                    "any",
                    ["==", ["geometry-type"], "LineString"],
                    ["==", ["geometry-type"], "MultiLineString"],
                  ]}
                  paint={{
                    "line-color":
                      (nomeInfra === "Eixos Logradouros" ||
                        nomeInfra === "Logradouros") &&
                      cenarioSelecionado
                        ? "#ef4444"
                        : infraCor,
                    "line-width": 3,
                  }}
                />
                {/* Pontos */}
                <Layer
                  id={`${srcId}-point`}
                  type="circle"
                  filter={["==", ["geometry-type"], "Point"]}
                  paint={{
                    "circle-color": infraCor,
                    "circle-radius": 4,
                    "circle-stroke-color": "#fff",
                    "circle-stroke-width": 1,
                  }}
                />
              </Source>

              {/* Base Completa de Logradouros (Verde/Livre) */}
              {(nomeInfra === "Eixos Logradouros" ||
                nomeInfra === "Logradouros") &&
                cenarioSelecionado && (
                  <Source
                    id={`${srcId}-base-lines`}
                    type="geojson"
                    data={dadosTotal}
                  >
                    <Layer
                      id={`${srcId}-line-base`}
                      beforeId={`${srcId}-line`} // Coloca abaixo das linhas vermelhas
                      type="line"
                      filter={[
                        "any",
                        ["==", ["geometry-type"], "LineString"],
                        ["==", ["geometry-type"], "MultiLineString"],
                      ]}
                      paint={{
                        "line-color": "#22c55e",
                        "line-width": 2,
                      }}
                    />
                  </Source>
                )}
            </React.Fragment>
          )
        })}
    </>
  )
}

/** Edifícios em 3D (OpenFreeMap): fonte sempre montada, só a visibilidade muda com is3D. */
export function Edificios3D({ is3D }: { is3D: boolean }) {
  return (
    <>
      {/* Edifícios em 3D (extrusão real via render_height/render_min_height) — o basemap
          Positron não traz altura por prédio, então usamos o schema OpenMapTiles do
          OpenFreeMap (grátis, sem API key) só para a camada de edifícios. Fonte e camada
          sempre montadas; só a visibilidade muda com is3D (evita reprocessar addSource/
          addLayer a cada toggle, que travava o resto do efeito 3D). */}
      <Source
        id="buildings-src"
        type="vector"
        url="https://tiles.openfreemap.org/planet"
      >
        <Layer
          id="buildings-3d"
          beforeId="anchor-pts"
          source-layer="building"
          minzoom={13}
          type="fill-extrusion"
          layout={{ visibility: is3D ? "visible" : "none" }}
          paint={{
            "fill-extrusion-base": [
              "coalesce",
              ["get", "render_min_height"],
              0,
            ],
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
            "fill-extrusion-color": "#c7c7c7",
            "fill-extrusion-opacity": 0.85,
          }}
        />
      </Source>
    </>
  )
}
