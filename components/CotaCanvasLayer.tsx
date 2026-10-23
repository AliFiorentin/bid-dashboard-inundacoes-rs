"use client"
import { useEffect } from "react"
import { useMap } from "react-map-gl/maplibre"
import type { CotaRaster } from "@/hooks/useCotaRaster"

type FonteCanvas = { play?: () => void; pause?: () => void }

/**
 * Água por cota como fonte `canvas` do MapLibre: o canvas do hook é recolorido a cada cota e o
 * MapLibre só relê a textura quando pedimos (play -> próximo quadro -> pause), sem codificar PNG
 * nem criar Blob URL a cada quadro. O react-map-gl não tipa `<Source type="canvas">`, então a
 * fonte/camada são gerenciadas direto no mapa. Deve ser renderizado dentro de <Map>.
 */
export function CotaCanvasLayer({ raster, beforeId, opacity = 0.82 }: { raster: CotaRaster; beforeId?: string; opacity?: number }) {
  const { current: mapRef } = useMap()
  const { meta, canvasId, frame } = raster
  const pronto = !!meta && !!canvasId && frame > 0
  const sourceId = canvasId ? `cota-src-${canvasId}` : ""
  const layerId = canvasId ? `cota-raster-${canvasId}` : ""

  // Cria a fonte/camada uma vez por canvas (o frame>0 garante que já há imagem colorida).
  useEffect(() => {
    const map = mapRef?.getMap()
    if (!map || !pronto || !meta || !canvasId) return
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "canvas", canvas: canvasId, coordinates: meta.coordinates, animate: false })
    }
    if (!map.getLayer(layerId)) {
      // A âncora (beforeId) é montada pelo react-map-gl de forma assíncrona: se ainda não existe,
      // a camada entra no topo e é reposicionada assim que a âncora aparecer.
      map.addLayer(
        { id: layerId, type: "raster", source: sourceId, paint: { "raster-opacity": opacity, "raster-fade-duration": 0 } },
        beforeId && map.getLayer(beforeId) ? beforeId : undefined,
      )
    }
    const reposicionar = () => {
      if (beforeId && map.getLayer(layerId) && map.getLayer(beforeId)) {
        map.moveLayer(layerId, beforeId)
        map.off("styledata", reposicionar)
      }
    }
    if (beforeId) { map.on("styledata", reposicionar); reposicionar() }
    return () => {
      try { // o mapa pode já ter sido destruído ao desmontar
        map.off("styledata", reposicionar)
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch { /* mapa removido */ }
    }
  }, [mapRef, pronto, canvasId, meta, sourceId, layerId, beforeId, opacity])

  // A cada quadro novo, pede ao MapLibre que releia o canvas (play -> 2 quadros -> pause).
  useEffect(() => {
    if (!pronto) return
    const fonte = mapRef?.getMap().getSource(sourceId) as FonteCanvas | undefined
    if (!fonte?.play) return
    fonte.play()
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => fonte.pause?.()) })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [frame, pronto, sourceId, mapRef])

  return null
}
