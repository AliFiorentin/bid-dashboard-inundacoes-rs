"use client"
import { useEffect, useRef } from "react"
import Map, { NavigationControl, AttributionControl } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { DashboardState } from "@/hooks/useDashboard"
import { MapControls } from "@/components/map/MapControls"
import { PopulacaoLayer, MapAnchors } from "@/components/map/BaseLayers"
import { ManchaCotaLayers } from "@/components/map/ManchaCotaLayers"
import { AgriculturaLayer } from "@/components/map/AgriculturaLayer"
import { InfraLayers, Edificios3D } from "@/components/map/InfraLayers"
import { HeatmapLayers } from "@/components/map/HeatmapLayers"
import { PontosLayers } from "@/components/map/PontosLayers"

const TERRAIN_EXAGGERATION = 1.0

interface Props {
  dash: DashboardState
}

/**
 * Mapa principal. As camadas vivem em components/map/, montadas aqui na ordem
 * da pilha (a ordem visual real é garantida pelas âncoras `anchor-*` de MapAnchors):
 * população < âncoras/terreno < mancha/cota < agricultura < infra/prédios < heatmaps < pontos.
 */
export function DashboardMap({ dash }: Props) {
  const {
    mapRef,
    mapReady,
    setMapReady,
    renderMunicipio,
    cursor,
    setCursor,
    isTransitioning,
    interactiveLayerIds,
    handleMapClick,
    is3D,
    showDanoFisico,
    cameraVeioDoLink,
  } = dash

  // Ligada, a camada "Dano Físico (CLIMADA)" substitui os pontos padrão de
  // Empresas/Educação/Saúde (cor fixa) pelos mesmos pontos coloridos por dano
  // estimado no RP selecionado -- ver lib/constants.ts (DANO_FISICO_MUNICIPIO:
  // só Porto Alegre tem o raster de profundidade que esse cálculo exige).
  const mostraDanoFisico = showDanoFisico && renderMunicipio === "Porto Alegre" && !isTransitioning

  // mapRef é um objeto estável (sua identidade não muda quando .current é
  // preenchido), e o <Map> do @vis.gl/react-maplibre cria a instância de forma
  // assíncrona — então um efeito com deps [is3D, mapRef] pode rodar antes do
  // mapa existir, sair no "if (!map) return" e nunca mais re-executar sozinho.
  // onLoad nos avisa quando o mapa está pronto, forçando o efeito a rodar de novo.
  // Mora no useDashboard (não aqui) porque o efeito de flyTo por troca de
  // município precisa da mesma garantia.

  // Guarda o is3D da última vez que o efeito abaixo reposicionou a câmera. Sem
  // isso, qualquer re-execução do efeito (o mapReady virando true, por exemplo)
  // arrancaria a câmera de volta para 65°/-12°, desfazendo sem aviso o que o
  // usuário tivesse ajustado nos controles de rotação/inclinação.
  //
  // Quando a câmera veio de um permalink, a ref já nasce com o is3D atual: assim
  // a PRIMEIRA execução também pula o easeTo e preserva o pitch/bearing exatos do
  // link, em vez de sobrescrevê-los pelos 65°/-12° padrão.
  const ultimoModo3D = useRef<boolean | null>(cameraVeioDoLink ? is3D : null)

  // O AttributionControl compacto do maplibre-gl nasce com a classe
  // "maplibregl-compact-show" já aplicada (ver _updateCompact no código-fonte
  // da lib) -- ou seja, começa AABERTO em vez de recolhido, ao contrário do
  // que o nome "compact" sugere. O clique do usuário no ícone "i" (via
  // _toggleAttribution) só alterna essa mesma classe, então removê-la aqui
  // uma vez restaura o padrão recolhido sem quebrar o toggle manual depois.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const recolher = () => {
      map.getContainer()
        .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact-show")
        ?.classList.remove("maplibregl-compact-show")
    }
    recolher()
    map.on("resize", recolher)
    return () => { map.off("resize", recolher) }
  }, [mapReady, mapRef])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Retorna false se a fonte do terreno ainda não foi registrada no mapa
    // (corrida comum no carregamento inicial, quando is3D já nasce true).
    const aplicar = () => {
      if (!map.getSource("terrain-dem")) return false
      // setTerrain é idempotente e roda sempre: precisa reagir ao registro
      // tardio da fonte do DEM, independente de a câmera se mover ou não.
      map.setTerrain(
        is3D
          ? { source: "terrain-dem", exaggeration: TERRAIN_EXAGGERATION }
          : null
      )
      // Já o enquadramento só muda numa transição real 2D <-> 3D.
      if (ultimoModo3D.current !== is3D) {
        ultimoModo3D.current = is3D
        map.easeTo({
          pitch: is3D ? 65 : 0,
          bearing: is3D ? -12 : 0,
          duration: 800,
        })
      }
      return true
    }

    const tentar = () => {
      if (!aplicar()) map.once("sourcedata", tentar)
    }

    if (map.isStyleLoaded()) tentar()
    else map.once("load", tentar)

    // map.off em um listener não registrado com esse nome é no-op — seguro
    // remover os dois incondicionalmente (evita vazar o listener de "load"
    // quando quem resolveu foi o de "sourcedata", e vice-versa).
    return () => {
      map.off("load", tentar)
      map.off("sourcedata", tentar)
    }
  }, [is3D, mapReady, mapRef])

  // A mancha é desenhada como "fill" plano (ver ManchaCotaLayers): com
  // terreno ativo o MapLibre drapeja o preenchimento sobre o relevo vértice a
  // vértice, sem degraus em nenhum zoom.
  //
  // Houve uma tentativa anterior de recortar a mancha numa grade de células
  // extrudadas, para dar espessura à lâmina d'água. Foi abandonada: a grade
  // serrilhava a borda (aproximar um polígono por quadrados sempre deixa
  // degraus) e perdia os fragmentos menores que a célula — a mancha de Porto
  // Alegre tem 64 polígonos, 14 deles menores que uma célula de 80×80 m.

  return (
    <div className="absolute inset-x-0 top-0 bottom-[var(--dock)] lg:bottom-0 z-0">
      <Map
        ref={mapRef}
        initialViewState={dash.initialViewState}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("grab")}
        onLoad={() => setMapReady(true)}
        onMoveEnd={dash.handleMapMoveEnd}
        maxPitch={85}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" visualizePitch />
        <AttributionControl compact position="bottom-left" />

        <MapControls dash={dash} />

        <PopulacaoLayer dash={dash} />
        <MapAnchors />
        <ManchaCotaLayers dash={dash} />
        <AgriculturaLayer dash={dash} />
        <InfraLayers dash={dash} />
        <Edificios3D is3D={is3D} />
        <HeatmapLayers dash={dash} />
        <PontosLayers dash={dash} mostraDanoFisico={mostraDanoFisico} />
      </Map>
    </div>
  )
}
