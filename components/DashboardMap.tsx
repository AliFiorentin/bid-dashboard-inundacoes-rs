"use client";
import React from "react";
import Map, { Source, Layer, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { COLORS, INFRA_COLORS, AGRI_BOUNDS, AGRI_COLORS, MUNICIPIO_VIEW } from "@/lib/constants";
import { slugify } from "@/lib/geo-utils";
import { MapPopup } from "@/components/MapPopup";
import type { DashboardState } from "@/hooks/useDashboard";

interface Props {
  dash: DashboardState;
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
  } = dash;

  const AGRI_FILL_COLOR = [
    "match", ["get", "cultura"],
    ...Object.entries(AGRI_COLORS).flatMap(([cultura, cor]) => [cultura, cor]),
    "#6B8E23",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any;

  return (
    <div className="absolute inset-0 z-0">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MUNICIPIO_VIEW["Visão Geral RS"].center[0],
          latitude: MUNICIPIO_VIEW["Visão Geral RS"].center[1],
          zoom: MUNICIPIO_VIEW["Visão Geral RS"].zoom,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        cursor={cursor}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('grab')}
      >
        <NavigationControl position="bottom-right" />

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
            <MapPopup source={popupInfo.source} properties={popupInfo.properties} />
          </Popup>
        )}

        {/* 1. Manchas — primeiro (base da pilha) */}
        {isVisaoGeral && manchaRS && showMancha && (
          <Source id="mancha-rs" type="geojson" data={manchaRS}>
            <Layer id="mancha-rs-fill" type="fill" paint={{ "fill-color": COLORS.cenario, "fill-opacity": 0.22 }} />
            <Layer id="mancha-rs-line" type="line" paint={{ "line-color": COLORS.cenario, "line-width": 1.5, "line-opacity": 0.7 }} />
          </Source>
        )}

        {manchaCenario && !isVisaoGeral && showMancha && (
          <Source id="cenario" type="geojson" data={manchaCenario}>
            <Layer id="cenario-fill" type="fill" paint={{ "fill-color": COLORS.cenario, "fill-opacity": 0.18 }} />
            <Layer id="cenario-line" type="line" paint={{ "line-color": COLORS.cenario, "line-width": 2, "line-opacity": 0.8 }} />
          </Source>
        )}

        {/* 2. Limite, Agricultura, Infraestrutura */}
        {limitePA && (
          <Source id="limite-poa" type="geojson" data={limitePA}>
            <Layer id="limite-poa-line" type="line" paint={{ "line-color": "#055071", "line-width": 2, "line-opacity": 0.7, "line-dasharray": [4, 3] }} />
          </Source>
        )}

        {camadas.includes("Agricultura") && municipio === renderMunicipio && renderMunicipio !== "Visão Geral RS" && AGRI_BOUNDS[renderMunicipio] && (() => {
          const agriGeo = isCenarioAtivo ? atingidosAgriGeo : baseAgriGeo;
          if (!agriGeo?.features?.length) return null;
          return (
            <Source id="agricultura-geo" type="geojson" data={agriGeo}>
              <Layer id="agricultura-fill" type="fill" paint={{ "fill-color": AGRI_FILL_COLOR, "fill-opacity": 0.65 }} />
            </Source>
          );
        })()}

        {camadas.includes("Infraestrutura") && !isTransitioning && !isVisaoGeral && Object.entries(baseInfra).map(([nomeInfra, dadosTotal]) => {
          if (!dadosTotal) return null;
          const srcId = `infra-${slugify(nomeInfra)}`;
          const infraCor = INFRA_COLORS[nomeInfra] ?? COLORS.infra;
          const cenarioSelecionado = cenario !== "(nenhum)";
          const dataGeo = cenarioSelecionado
            ? (atingidosInfra[nomeInfra] ?? { type: 'FeatureCollection', features: [] })
            : dadosTotal;
          return (
            <Source key={srcId} id={srcId} type="geojson" data={dataGeo}>
              <Layer id={`${srcId}-fill`} beforeId="anchor-pts" type="fill" filter={['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']]} paint={{ 'fill-color': infraCor, 'fill-opacity': 0.25, 'fill-outline-color': infraCor }} />
              <Layer id={`${srcId}-line`} beforeId="anchor-pts" type="line" filter={['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']]} paint={{ 'line-color': infraCor, 'line-width': 2.5 }} />
              <Layer id={`${srcId}-point`} beforeId="anchor-pts" type="circle" filter={['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']]} paint={{ 'circle-color': infraCor, 'circle-radius': 4.5, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' }} />
            </Source>
          );
        })}

        {/* Âncora permanente: garante que Infra fique sempre abaixo dos pontos, independente do timing */}
        <Source id="anchor-src" type="geojson" data={{ type: 'FeatureCollection' as const, features: [] }}>
          <Layer id="anchor-pts" type="circle" paint={{ 'circle-radius': 0, 'circle-opacity': 0 }} />
        </Source>

        {camadas.includes("Empresas") && renderEmp?.features && (
          <Source id="empresas" type="geojson" data={renderEmp} cluster={true} clusterMaxZoom={14} clusterRadius={40}>
            <Layer
              id="empresas-cluster"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': COLORS.empresas,
                'circle-radius': ['step', ['get', 'point_count'], 14, 50, 20, 200, 26],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-translate': isVisaoGeral ? [0, -14] : [0, 0],
              }}
            />
            <Layer
              id="empresas-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{ 'text-field': '{point_count_abbreviated}', 'text-size': 11 }}
              paint={{
                'text-color': '#fff',
                'text-translate': isVisaoGeral ? [0, -14] : [0, 0],
              }}
            />
            <Layer
              id="empresas-point"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': COLORS.empresas,
                'circle-radius': 5,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#fff',
                'circle-translate': isVisaoGeral ? [0, -14] : [0, 0],
              }}
            />
          </Source>
        )}

        {camadas.includes("Educação") && renderEdu?.features && (
          <Source id="educacao" type="geojson" data={renderEdu} cluster={true} clusterMaxZoom={14} clusterRadius={40}>
            <Layer
              id="educacao-cluster"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': COLORS.educacao,
                'circle-radius': ['step', ['get', 'point_count'], 14, 50, 20, 200, 26],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-translate': isVisaoGeral ? [-12, 8] : [0, 0],
              }}
            />
            <Layer
              id="educacao-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{ 'text-field': '{point_count_abbreviated}', 'text-size': 11 }}
              paint={{
                'text-color': '#fff',
                'text-translate': isVisaoGeral ? [-12, 8] : [0, 0],
              }}
            />
            <Layer
              id="educacao-point"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': COLORS.educacao,
                'circle-radius': 5,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#fff',
                'circle-translate': isVisaoGeral ? [-12, 8] : [0, 0],
              }}
            />
          </Source>
        )}

        {camadas.includes("Saúde") && renderSau?.features && (
          <Source id="saude" type="geojson" data={renderSau} cluster={true} clusterMaxZoom={14} clusterRadius={40}>
            <Layer
              id="saude-cluster"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': COLORS.saude,
                'circle-radius': ['step', ['get', 'point_count'], 14, 50, 20, 200, 26],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-translate': isVisaoGeral ? [12, 8] : [0, 0],
              }}
            />
            <Layer
              id="saude-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{ 'text-field': '{point_count_abbreviated}', 'text-size': 11 }}
              paint={{
                'text-color': '#fff',
                'text-translate': isVisaoGeral ? [12, 8] : [0, 0],
              }}
            />
            <Layer
              id="saude-point"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': COLORS.saude,
                'circle-radius': 5,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#fff',
                'circle-translate': isVisaoGeral ? [12, 8] : [0, 0],
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
