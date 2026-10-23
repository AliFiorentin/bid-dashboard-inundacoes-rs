import { Source, Layer } from "react-map-gl/maplibre"
import { slugify } from "@/lib/geo-utils"
import type { DashboardState } from "@/hooks/useDashboard"

/** Raster de população (WorldPop) -- abaixo de tudo. */
export function PopulacaoLayer({ dash }: { dash: DashboardState }) {
  const { camadas, popData, renderMunicipio, isVisaoGeral, isTransitioning } =
    dash
  const popMunData =
    !isVisaoGeral && !isTransitioning ? popData?.[renderMunicipio] : null
  const popImgUrl = popMunData
    ? `/dados_convertidos/${slugify(renderMunicipio)}/populacao.webp`
    : null

  return (
    <>
      {/* 0. Raster de população — abaixo de tudo */}
      {camadas.includes("População") && popImgUrl && popMunData && (
        <Source
          id="populacao-img"
          type="image"
          url={popImgUrl}
          coordinates={
            popMunData.coordinates as [
              [number, number],
              [number, number],
              [number, number],
              [number, number],
            ]
          }
        >
          <Layer
            id="populacao-raster"
            type="raster"
            paint={{ "raster-opacity": 0.65, "raster-resampling": "nearest" }}
          />
        </Source>
      )}
    </>
  )
}

/**
 * Âncoras permanentes de ordem das camadas + fonte do terreno 3D.
 * Ordem da pilha: mancha < agricultura < água por cota < infraestrutura <
 * prédios < pontos (anchor-mancha, anchor-agua, anchor-infra, anchor-buildings, anchor-pts).
 */
export function MapAnchors() {
  return (
    <>
      {/* Âncoras permanentes: garantem que Infra e Prédios fiquem sempre
          abaixo dos pontos, independente do timing.

          São layers "background" (sem source) de propósito. Dentro de uma
          <Source>, o react-map-gl só renderiza os filhos depois que a source
          existe, e ele reage ao "styledata" com setTimeout(0) -- enquanto o
          <Layer> reage de forma síncrona. Ou seja: toda camada com beforeId
          era re-adicionada ANTES de as âncoras voltarem a existir, e o
          maplibre recusava a camada inteira ("Cannot add layer ... before
          non-existing layer"). Sem source, a âncora só depende do estilo
          estar carregado e é criada junto das demais, na ordem do JSX. */}
      <Layer
        id="anchor-mancha"
        type="background"
        paint={{ "background-opacity": 0 }}
      />
      {/* Ordem: mancha < agricultura < água por cota ("Todas as cotas") < infraestrutura/prédios < pontos. */}
      <Layer
        id="anchor-agua"
        type="background"
        paint={{ "background-opacity": 0 }}
      />
      <Layer
        id="anchor-infra"
        type="background"
        paint={{ "background-opacity": 0 }}
      />
      <Layer
        id="anchor-buildings"
        type="background"
        paint={{ "background-opacity": 0 }}
      />
      <Layer
        id="anchor-pts"
        type="background"
        paint={{ "background-opacity": 0 }}
      />

      {/* Terreno (DEM global Terrarium) — só ativa quando is3D=true via setTerrain */}
      <Source
        id="terrain-dem"
        type="raster-dem"
        tiles={[
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        ]}
        tileSize={256}
        encoding="terrarium"
        maxzoom={14}
      />
    </>
  )
}
