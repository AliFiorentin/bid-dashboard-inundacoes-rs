import { Source, Layer } from "react-map-gl/maplibre"
import type { FeatureCollection } from "geojson"
import { COLORS, DANO_FISICO_COLOR_STOPS } from "@/lib/constants"
import type { DashboardState } from "@/hooks/useDashboard"

type Translate = [number, number]

/** Pontos clusterizados de um setor (empresas / educação / saúde). */
function PontosSetor({
  id,
  data,
  cor,
  translate,
  isVisaoGeral,
}: {
  id: string
  data: FeatureCollection
  cor: string
  /** Deslocamento do setor na Visão Geral, para os três clusters não se sobreporem. */
  translate: Translate
  isVisaoGeral: boolean
}) {
  const deslocamento: Translate = isVisaoGeral ? translate : [0, 0]
  return (
    <Source
      id={id}
      type="geojson"
      data={data}
      cluster={true}
      clusterMaxZoom={14}
      clusterRadius={40}
    >
      <Layer
        id={`${id}-cluster`}
        type="circle"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": cor,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            50,
            20,
            200,
            26,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-translate": deslocamento,
        }}
      />
      <Layer
        id={`${id}-count`}
        type="symbol"
        filter={["has", "point_count"]}
        layout={{
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        }}
        paint={{
          "text-color": "#fff",
          "text-translate": deslocamento,
        }}
      />
      <Layer
        id={`${id}-point`}
        type="circle"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": cor,
          "circle-radius": 5,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
          "circle-translate": deslocamento,
        }}
      />
    </Source>
  )
}

/**
 * Pontos de Dano Físico (CLIMADA): mesma geometria, cor por dano estimado (%)
 * no RP selecionado em vez de cor fixa por setor. Cluster com média do dano.
 */
function DanoFisicoSetor({
  id,
  data,
  cor,
  raioPonto,
}: {
  id: string
  data: FeatureCollection
  cor: string
  raioPonto: number
}) {
  // Sem key dinâmica: dano_fisico_pct_atual é copiado (em useDanoFisico,
  // mergeDanoFisico) do RP selecionado para um nome de propriedade FIXO,
  // então clusterProperties não precisa mudar quando o RP muda -- só o
  // `data` muda (setData(), que o MapLibre atualiza na mesma source). Uma
  // key dinâmica aqui força destruir/recriar a source inteira a cada troca
  // de RP; se isso acontecer enquanto o MapLibre ainda processa a anterior
  // (cluster em worker), o próprio MapLibre quebra internamente
  // ("Cannot read properties of null (reading 'signal')", abort de uma
  // requisição/worker já finalizado) -- já visto em produção.
  return (
    <Source
      id={id}
      type="geojson"
      data={data}
      cluster={true}
      clusterMaxZoom={18}
      clusterRadius={60}
      clusterProperties={{
        soma_dano: ["+", ["get", "dano_fisico_pct_atual"]],
      }}
    >
      <Layer
        id={`${id}-cluster`}
        type="circle"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": [
            "interpolate",
            ["linear"],
            ["/", ["get", "soma_dano"], ["get", "point_count"]],
            ...DANO_FISICO_COLOR_STOPS,
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            50,
            20,
            200,
            26,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": cor,
        }}
      />
      <Layer
        id={`${id}-count`}
        type="symbol"
        filter={["has", "point_count"]}
        layout={{ "text-field": "{point_count_abbreviated}", "text-size": 11 }}
        paint={{ "text-color": "#fff" }}
      />
      <Layer
        id={`${id}-point`}
        type="circle"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "dano_fisico_pct_atual"], 0],
            ...DANO_FISICO_COLOR_STOPS,
          ],
          "circle-radius": raioPonto,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": cor,
        }}
      />
    </Source>
  )
}

/**
 * Pontos de Empresas/Educação/Saúde. Ligada a camada "Dano Físico (CLIMADA)"
 * (mostraDanoFisico), os 3 pontos padrão (cor fixa) dão lugar aos pontos
 * coloridos por dano -- ver lib/constants.ts (DANO_FISICO_MUNICIPIO: só Porto
 * Alegre tem o raster de profundidade que esse cálculo exige).
 */
export function PontosLayers({
  dash,
  mostraDanoFisico,
}: {
  dash: DashboardState
  mostraDanoFisico: boolean
}) {
  const {
    camadas,
    isVisaoGeral,
    renderEmp,
    renderEdu,
    renderSau,
    danoFisicoEmpresas,
    danoFisicoEducacao,
    danoFisicoSaude,
  } = dash

  return (
    <>
      {camadas.includes("Empresas") &&
        renderEmp?.features &&
        !mostraDanoFisico && (
          <PontosSetor
            id="empresas"
            data={renderEmp}
            cor={COLORS.empresas}
            translate={[0, -14]}
            isVisaoGeral={isVisaoGeral}
          />
        )}
      {camadas.includes("Educação") &&
        renderEdu?.features &&
        !mostraDanoFisico && (
          <PontosSetor
            id="educacao"
            data={renderEdu}
            cor={COLORS.educacao}
            translate={[-12, 8]}
            isVisaoGeral={isVisaoGeral}
          />
        )}
      {camadas.includes("Saúde") &&
        renderSau?.features &&
        !mostraDanoFisico && (
          <PontosSetor
            id="saude"
            data={renderSau}
            cor={COLORS.saude}
            translate={[12, 8]}
            isVisaoGeral={isVisaoGeral}
          />
        )}

      {mostraDanoFisico &&
        camadas.includes("Empresas") &&
        danoFisicoEmpresas?.features && (
          <DanoFisicoSetor
            id="dano-fisico-empresas"
            data={danoFisicoEmpresas}
            cor={COLORS.empresas}
            raioPonto={5}
          />
        )}
      {mostraDanoFisico &&
        camadas.includes("Educação") &&
        danoFisicoEducacao?.features && (
          <DanoFisicoSetor
            id="dano-fisico-educacao"
            data={danoFisicoEducacao}
            cor={COLORS.educacao}
            raioPonto={5}
          />
        )}
      {mostraDanoFisico &&
        camadas.includes("Saúde") &&
        danoFisicoSaude?.features && (
          <DanoFisicoSetor
            id="dano-fisico-saude"
            data={danoFisicoSaude}
            cor={COLORS.saude}
            raioPonto={4}
          />
        )}
    </>
  )
}
