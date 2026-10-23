import { Source, Layer } from "react-map-gl/maplibre"
import { AGRI_BOUNDS, AGRI_COLORS } from "@/lib/constants"
import type { DashboardState } from "@/hooks/useDashboard"

const AGRI_FILL_COLOR = [
  "match",
  ["get", "cultura"],
  ...Object.entries(AGRI_COLORS).flatMap(([cultura, cor]) => [cultura, cor]),
  "#6B8E23",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any

/** Polígonos de uso agrícola (MapBiomas): BASE ou recorte do cenário ativo. */
export function AgriculturaLayer({ dash }: { dash: DashboardState }) {
  const {
    camadas,
    municipio,
    renderMunicipio,
    isCenarioAtivo,
    atingidosAgriGeo,
    baseAgriGeo,
  } = dash

  return (
    <>
      {camadas.includes("Agricultura") &&
        municipio === renderMunicipio &&
        renderMunicipio !== "Visão Geral RS" &&
        AGRI_BOUNDS[renderMunicipio] &&
        (() => {
          // A Source fica montada mesmo sem dados (FeatureCollection vazia).
          // Desmontá-la enquanto os fetches de base/atingidos chegam fazia o
          // react-map-gl remontar a mesma id em sequência e estourar
          // "source id changed", derrubando a camada de vez -- por isso a
          // agricultura nunca aparecia no mapa dos municípios.
          const agriGeo = isCenarioAtivo ? atingidosAgriGeo : baseAgriGeo
          return (
            <Source
              id="agricultura-geo"
              type="geojson"
              data={agriGeo ?? { type: "FeatureCollection", features: [] }}
            >
              <Layer
                id="agricultura-fill"
                beforeId="anchor-agua"
                type="fill"
                paint={{
                  "fill-color": AGRI_FILL_COLOR,
                  "fill-opacity": 0.65,
                }}
              />
            </Source>
          )
        })()}
    </>
  )
}
