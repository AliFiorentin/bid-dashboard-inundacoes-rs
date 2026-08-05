"use client"
import React, { useEffect, useRef, useState } from "react"
import Map, {
  Source,
  Layer,
  NavigationControl,
  Popup,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  COLORS,
  INFRA_COLORS,
  AGRI_BOUNDS,
  AGRI_COLORS,
} from "@/lib/constants"
import { slugify } from "@/lib/geo-utils"
import { MapPopup } from "@/components/MapPopup"
import type { DashboardState } from "@/hooks/useDashboard"

const TERRAIN_EXAGGERATION = 1.0
const PASSO_ROTACAO = 15
const PASSO_INCLINACAO = 10
const PITCH_MAXIMO = 85

interface Props {
  dash: DashboardState
}

export function DashboardMap({ dash }: Props) {
  const {
    mapRef,
    municipio,
    renderMunicipio,
    cenario,
    camadas,
    showMancha,
    baseInfra,
    atingidosInfra,
    manchaCenario,
    manchaRS,
    limitePA,
    cursor,
    setCursor,
    popupInfo,
    setPopupInfo,
    isTransitioning,
    isVisaoGeral,
    isCenarioAtivo,
    renderEmp,
    renderEdu,
    renderSau,
    baseAgriGeo,
    atingidosAgriGeo,
    interactiveLayerIds,
    handleMapClick,
    popData,
    is3D,
    setIs3D,
    showHeatmapEmpresas,
    showHeatmapSaude,
    showHeatmapEducacao,
    cameraVeioDoLink,
  } = dash

  const popMunData =
    !isVisaoGeral && !isTransitioning ? popData?.[renderMunicipio] : null
  const popImgUrl = popMunData
    ? `/dados_convertidos/${slugify(renderMunicipio)}/populacao.png`
    : null

  // mapRef é um objeto estável (sua identidade não muda quando .current é
  // preenchido), e o <Map> do @vis.gl/react-maplibre cria a instância de forma
  // assíncrona — então um efeito com deps [is3D, mapRef] pode rodar antes do
  // mapa existir, sair no "if (!map) return" e nunca mais re-executar sozinho.
  // onLoad nos avisa quando o mapa está pronto, forçando o efeito a rodar de novo.
  const [mapReady, setMapReady] = useState(false)

  // Guarda o is3D da última vez que o efeito abaixo reposicionou a câmera. Sem
  // isso, qualquer re-execução do efeito (o mapReady virando true, por exemplo)
  // arrancaria a câmera de volta para 65°/-12°, desfazendo sem aviso o que o
  // usuário tivesse ajustado nos controles de rotação/inclinação.
  //
  // Quando a câmera veio de um permalink, a ref já nasce com o is3D atual: assim
  // a PRIMEIRA execução também pula o easeTo e preserva o pitch/bearing exatos do
  // link, em vez de sobrescrevê-los pelos 65°/-12° padrão.
  const ultimoModo3D = useRef<boolean | null>(cameraVeioDoLink ? is3D : null)

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

  // A mancha é desenhada como "fill" plano (ver a Source "cenario" no JSX): com
  // terreno ativo o MapLibre drapeja o preenchimento sobre o relevo vértice a
  // vértice, sem degraus em nenhum zoom.
  //
  // Houve uma tentativa anterior de recortar a mancha numa grade de células
  // extrudadas, para dar espessura à lâmina d'água. Foi abandonada: a grade
  // serrilhava a borda (aproximar um polígono por quadrados sempre deixa
  // degraus) e perdia os fragmentos menores que a célula — a mancha de Porto
  // Alegre tem 64 polígonos, 14 deles menores que uma célula de 80×80 m.

  // O NavigationControl já gira o mapa quando se arrasta a bússola, mas isso
  // não é descobrível e não dá controle nenhum de inclinação — daí os botões.
  const ajustarCamera = (deltaBearing: number, deltaPitch: number) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    map.easeTo({
      bearing: map.getBearing() + deltaBearing,
      pitch: Math.min(
        PITCH_MAXIMO,
        Math.max(0, map.getPitch() + deltaPitch)
      ),
      duration: 300,
    })
  }

  const CONTROLES_CAMERA = [
    { rotulo: "↺", titulo: "Girar à esquerda", db: -PASSO_ROTACAO, dp: 0 },
    { rotulo: "↻", titulo: "Girar à direita", db: PASSO_ROTACAO, dp: 0 },
    { rotulo: "▲", titulo: "Aumentar inclinação", db: 0, dp: PASSO_INCLINACAO },
    { rotulo: "▼", titulo: "Reduzir inclinação", db: 0, dp: -PASSO_INCLINACAO },
  ]

  const AGRI_FILL_COLOR = [
    "match",
    ["get", "cultura"],
    ...Object.entries(AGRI_COLORS).flatMap(([cultura, cor]) => [cultura, cor]),
    "#6B8E23",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any

  return (
    <div className="absolute inset-0 z-0">
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
      >
        <NavigationControl position="bottom-right" visualizePitch />

        {/* Controles de câmera em linha, à ESQUERDA do NavigationControl: ficam
            todos no mesmo canto sem depender da altura dele (empilhar por cima
            colidia com os botões de zoom).
            Todos aparecem sempre, inclusive em 2D: o toggle 3D precisa estar lá
            para dar como voltar, e girar/inclinar funciona igual sem o terreno
            ligado — esconder os botões só tirava controle sem motivo. */}
        <div className="absolute bottom-[45px] right-[48px] z-10 flex flex-row gap-1 print:hidden">
          <button
            onClick={() => setIs3D((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black transition-colors duration-150"
            style={{
              backgroundColor: is3D ? COLORS.cenario : "#ffffff",
              color: is3D ? "#ffffff" : "#333333",
              border: "2px solid rgba(0,0,0,0.1)",
            }}
            title={
              is3D
                ? "Voltar para mapa 2D"
                : "Ver mancha em 3D (terreno + elevação)"
            }
          >
            3D
          </button>

          {CONTROLES_CAMERA.map((c) => (
            <button
              key={c.rotulo}
              onClick={() => ajustarCamera(c.db, c.dp)}
              title={c.titulo}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black text-[#333333] transition-colors duration-150 hover:bg-slate-100"
              style={{
                backgroundColor: "#ffffff",
                border: "2px solid rgba(0,0,0,0.1)",
              }}
            >
              {c.rotulo}
            </button>
          ))}
        </div>

        {popupInfo && (
          <Popup
            longitude={popupInfo.lngLat[0]}
            latitude={popupInfo.lngLat[1]}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="z-50 !p-0"
            maxWidth="250px"
          >
            <MapPopup
              source={popupInfo.source}
              properties={popupInfo.properties}
            />
          </Popup>
        )}

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

        {/* Âncora permanente: garante que Infra e Prédios fiquem sempre abaixo dos pontos, independente do timing */}
        <Source
          id="anchor-src"
          type="geojson"
          data={{ type: "FeatureCollection" as const, features: [] }}
        >
          <Layer
            id="anchor-mancha"
            type="circle"
            paint={{ "circle-radius": 0, "circle-opacity": 0 }}
          />
          <Layer
            id="anchor-buildings"
            type="circle"
            paint={{ "circle-radius": 0, "circle-opacity": 0 }}
          />
          <Layer
            id="anchor-pts"
            type="circle"
            paint={{ "circle-radius": 0, "circle-opacity": 0 }}
          />
        </Source>

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

        {/* 1. Manchas — primeiro (base da pilha) */}
        {isVisaoGeral && manchaRS && showMancha && (
          <Source id="mancha-rs" type="geojson" data={manchaRS}>
            {/* "fill" (2D) acompanha o relevo do terreno 3D automaticamente;
                "fill-extrusion" sempre teria um topo plano numa altura fixa,
                ignorando as variações do terreno por baixo — por isso não
                extrudimos a mancha, só a deixamos mais opaca em 3D. */}
            <Layer
              id="mancha-rs-fill"
              beforeId="anchor-mancha"
              type="fill"
              paint={{
                "fill-color": COLORS.cenario,
                "fill-opacity": is3D ? 0.32 : 0.22,
              }}
            />
            <Layer
              id="mancha-rs-line"
              beforeId="anchor-mancha"
              type="line"
              paint={{
                "line-color": COLORS.cenario,
                "line-width": 1.5,
                "line-opacity": 0.7,
              }}
            />
          </Source>
        )}

        {manchaCenario && !isVisaoGeral && showMancha && (
          <Source id="cenario" type="geojson" data={manchaCenario}>
            {/* Em 3D a extrusão já cobre todo o footprint da mancha, então este
                fill desenharia a mesma área uma segunda vez, escurecendo em
                dobro. Fica bem fraco só para segurar o contorno. */}
            <Layer
              id="cenario-fill"
              beforeId="anchor-mancha"
              type="fill"
              paint={{
                "fill-color": COLORS.cenario,
                "fill-opacity": is3D ? 0.45 : 0.25,
              }}
            />
            <Layer
              id="cenario-line"
              beforeId="anchor-mancha"
              type="line"
              paint={{
                "line-color": COLORS.cenario,
                "line-width": 2,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* 2. Limite, Agricultura, Infraestrutura */}
        {limitePA && (
          <Source id="limite-poa" type="geojson" data={limitePA}>
            <Layer
              id="limite-poa-line"
              type="line"
              paint={{
                "line-color": "#055071",
                "line-width": 2,
                "line-opacity": 0.7,
                "line-dasharray": [4, 3],
              }}
            />
          </Source>
        )}

        {camadas.includes("Agricultura") &&
          municipio === renderMunicipio &&
          renderMunicipio !== "Visão Geral RS" &&
          AGRI_BOUNDS[renderMunicipio] &&
          (() => {
            const agriGeo = isCenarioAtivo ? atingidosAgriGeo : baseAgriGeo
            if (!agriGeo?.features?.length) return null
            return (
              <Source id="agricultura-geo" type="geojson" data={agriGeo}>
                <Layer
                  id="agricultura-fill"
                  type="fill"
                  paint={{
                    "fill-color": AGRI_FILL_COLOR,
                    "fill-opacity": 0.65,
                  }}
                />
              </Source>
            )
          })()}

        {camadas.includes("Infraestrutura") &&
          !isTransitioning &&
          !isVisaoGeral &&
          Object.entries(baseInfra).map(([nomeInfra, dadosTotal]) => {
            if (!dadosTotal) return null
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
                      "line-color": ((nomeInfra === "Eixos Logradouros" || nomeInfra === "Logradouros") && cenarioSelecionado) ? "#ef4444" : infraCor,
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
                {(nomeInfra === "Eixos Logradouros" || nomeInfra === "Logradouros") && cenarioSelecionado && (
                  <Source id={`${srcId}-base-lines`} type="geojson" data={dadosTotal}>
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
              "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                6,
              ],
              "fill-extrusion-color": "#c7c7c7",
              "fill-extrusion-opacity": 0.85,
            }}
          />
        </Source>

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
                  0, 0,
                  100000, 0.2,
                  1000000, 1
                ],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(0, 0, 255, 0)",
                  0.2, "rgba(29, 78, 216, 0.5)", // blue-700
                  0.4, "rgba(0, 255, 255, 0.7)",
                  0.6, "rgba(0, 255, 0, 0.8)",
                  0.8, "rgba(255, 255, 0, 0.9)",
                  1, "rgba(255, 0, 0, 1)"
                ],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 15, 40],
                "heatmap-opacity": 0.8
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
                  ["+", ["coalesce", ["get", "staff_medicos"], 0], ["coalesce", ["get", "staff_enfermagem"], 0]],
                  0, 0,
                  10, 0.2,
                  50, 1
                ],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(0, 0, 255, 0)",
                  0.2, "rgba(185, 28, 28, 0.5)", // red-700
                  0.4, "rgba(239, 68, 68, 0.7)",
                  0.6, "rgba(248, 113, 113, 0.8)",
                  0.8, "rgba(255, 255, 0, 0.9)",
                  1, "rgba(255, 0, 0, 1)"
                ],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 15, 40],
                "heatmap-opacity": 0.8
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
                  ["+", ["coalesce", ["get", "qtd_matri_inf"], 0], ["coalesce", ["get", "qtd_matri_fund"], 0], ["coalesce", ["get", "qtd_matri_med"], 0]],
                  0, 0,
                  100, 0.2,
                  500, 1
                ],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(0, 0, 255, 0)",
                  0.2, "rgba(21, 128, 61, 0.5)", // green-700
                  0.4, "rgba(34, 197, 94, 0.7)",
                  0.6, "rgba(134, 239, 172, 0.8)",
                  0.8, "rgba(255, 255, 0, 0.9)",
                  1, "rgba(255, 0, 0, 1)"
                ],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 15, 40],
                "heatmap-opacity": 0.8
              }}
            />
          </Source>
        )}

        {camadas.includes("Empresas") && renderEmp?.features && (
          <Source
            id="empresas"
            type="geojson"
            data={renderEmp}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="empresas-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": COLORS.empresas,
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
                "circle-translate": isVisaoGeral ? [0, -14] : [0, 0],
              }}
            />
            <Layer
              id="empresas-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{
                "text-color": "#fff",
                "text-translate": isVisaoGeral ? [0, -14] : [0, 0],
              }}
            />
            <Layer
              id="empresas-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": COLORS.empresas,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
                "circle-translate": isVisaoGeral ? [0, -14] : [0, 0],
              }}
            />
          </Source>
        )}

        {camadas.includes("Educação") && renderEdu?.features && (
          <Source
            id="educacao"
            type="geojson"
            data={renderEdu}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="educacao-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": COLORS.educacao,
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
                "circle-translate": isVisaoGeral ? [-12, 8] : [0, 0],
              }}
            />
            <Layer
              id="educacao-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{
                "text-color": "#fff",
                "text-translate": isVisaoGeral ? [-12, 8] : [0, 0],
              }}
            />
            <Layer
              id="educacao-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": COLORS.educacao,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
                "circle-translate": isVisaoGeral ? [-12, 8] : [0, 0],
              }}
            />
          </Source>
        )}

        {camadas.includes("Saúde") && renderSau?.features && (
          <Source
            id="saude"
            type="geojson"
            data={renderSau}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="saude-cluster"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": COLORS.saude,
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
                "circle-translate": isVisaoGeral ? [12, 8] : [0, 0],
              }}
            />
            <Layer
              id="saude-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{
                "text-color": "#fff",
                "text-translate": isVisaoGeral ? [12, 8] : [0, 0],
              }}
            />
            <Layer
              id="saude-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": COLORS.saude,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
                "circle-translate": isVisaoGeral ? [12, 8] : [0, 0],
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  )
}
