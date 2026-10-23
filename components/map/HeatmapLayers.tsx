import { Source, Layer } from "react-map-gl/maplibre"
import type { DashboardState } from "@/hooks/useDashboard"

export function HeatmapLayers({ dash }: { dash: DashboardState }) {
  const {
    showHeatmapEmpresas,
    showHeatmapSaude,
    showHeatmapEducacao,
    renderEmp,
    renderEdu,
    renderSau,
  } = dash

  return (
    <>
      {/* Heatmap Empresas */}
      {showHeatmapEmpresas && renderEmp?.features && (
        <Source id="heatmap-empresas" type="geojson" data={renderEmp}>
          <Layer
            id="heatmap-empresas-layer"
            beforeId="anchor-buildings"
            type="heatmap"
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "massa_salarial"],
                0,
                0,
                100000,
                0.2,
                1000000,
                1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                1,
                15,
                3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0, 0, 255, 0)",
                0.2,
                "rgba(29, 78, 216, 0.5)", // blue-700
                0.4,
                "rgba(0, 255, 255, 0.7)",
                0.6,
                "rgba(0, 255, 0, 0.8)",
                0.8,
                "rgba(255, 255, 0, 0.9)",
                1,
                "rgba(255, 0, 0, 1)",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                15,
                15,
                40,
              ],
              "heatmap-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {/* Heatmap Saúde */}
      {showHeatmapSaude && renderSau?.features && (
        <Source id="heatmap-saude" type="geojson" data={renderSau}>
          <Layer
            id="heatmap-saude-layer"
            beforeId="anchor-buildings"
            type="heatmap"
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                [
                  "+",
                  ["coalesce", ["get", "staff_medicos"], 0],
                  ["coalesce", ["get", "staff_enfermagem"], 0],
                ],
                0,
                0,
                10,
                0.2,
                50,
                1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                1,
                15,
                3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0, 0, 255, 0)",
                0.2,
                "rgba(185, 28, 28, 0.5)", // red-700
                0.4,
                "rgba(239, 68, 68, 0.7)",
                0.6,
                "rgba(248, 113, 113, 0.8)",
                0.8,
                "rgba(255, 255, 0, 0.9)",
                1,
                "rgba(255, 0, 0, 1)",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                15,
                15,
                40,
              ],
              "heatmap-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {/* Heatmap Educação */}
      {showHeatmapEducacao && renderEdu?.features && (
        <Source id="heatmap-educacao" type="geojson" data={renderEdu}>
          <Layer
            id="heatmap-educacao-layer"
            beforeId="anchor-buildings"
            type="heatmap"
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                [
                  "+",
                  ["coalesce", ["get", "qtd_matri_inf"], 0],
                  ["coalesce", ["get", "qtd_matri_fund"], 0],
                  ["coalesce", ["get", "qtd_matri_med"], 0],
                ],
                0,
                0,
                100,
                0.2,
                500,
                1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                1,
                15,
                3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0, 0, 255, 0)",
                0.2,
                "rgba(21, 128, 61, 0.5)", // green-700
                0.4,
                "rgba(34, 197, 94, 0.7)",
                0.6,
                "rgba(134, 239, 172, 0.8)",
                0.8,
                "rgba(255, 255, 0, 0.9)",
                1,
                "rgba(255, 0, 0, 1)",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                15,
                15,
                40,
              ],
              "heatmap-opacity": 0.8,
            }}
          />
        </Source>
      )}
    </>
  )
}
