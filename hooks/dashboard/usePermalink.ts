import { useState, useEffect, useRef, useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { MUNICIPIOS, MUNICIPIO_VIEW } from "@/lib/constants";
import { slugify } from "@/lib/geo-utils";

const VISAO_GERAL_VIEW = {
  longitude: MUNICIPIO_VIEW["Visão Geral RS"].center[0],
  latitude: MUNICIPIO_VIEW["Visão Geral RS"].center[1],
  zoom: MUNICIPIO_VIEW["Visão Geral RS"].zoom,
};

export interface CameraPermalink {
  longitude: number; latitude: number; zoom: number; pitch: number; bearing: number;
}

/**
 * Lê a câmera do permalink (?lng&lat&z&p&b), gravada por handleMapMoveEnd.
 * Retorna null quando a URL não traz câmera própria — aí quem manda é o
 * MUNICIPIO_VIEW do município selecionado.
 *
 * Todo número passa por Number.isFinite: um parâmetro corrompido na URL não pode
 * virar NaN e deixar o mapa em branco sem nenhum erro visível.
 */
function lerCameraDaURL(): CameraPermalink | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const num = (v: string | null) => {
    if (!v) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const longitude = num(p.get('lng'));
  const latitude = num(p.get('lat'));
  const zoom = num(p.get('z'));
  if (longitude === null || latitude === null || zoom === null) return null;
  return {
    longitude, latitude, zoom,
    pitch: num(p.get('p')) ?? 0,
    bearing: num(p.get('b')) ?? 0,
  };
}

interface Args {
  municipio: string;
  cenario: string;
  setMunicipio: (m: string) => void;
  mapRef: React.RefObject<MapRef | null>;
}

/** Estado <-> URL: município (?m), cenário (?c) e câmera (?lng&lat&z&p&b). */
export function usePermalink({ municipio, cenario, setMunicipio, mapRef }: Args) {
  const permalinkCenarioRef = useRef<string | null>(null);
  // Lido uma única vez, no mount. Quando existe, a câmera do link tem prioridade
  // sobre o enquadramento padrão do município.
  const [permalinkView] = useState<CameraPermalink | null>(lerCameraDaURL);
  const [initialViewState] = useState(() => permalinkView ?? VISAO_GERAL_VIEW);

  // Read permalink from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('m');
    const c = params.get('c');
    if (m) {
      const munLabel = [...MUNICIPIOS, "Visão Geral RS"].find(x => slugify(x) === m);
      if (munLabel) {
        if (c) permalinkCenarioRef.current = c;
        setMunicipio(munLabel);
      }
    }
  }, [setMunicipio]);

  // Update URL when municipio/cenario changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('m', slugify(municipio));
    if (cenario !== "(nenhum)") params.set('c', slugify(cenario));
    else params.delete('c');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [municipio, cenario]);

  const handleMapMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();

    const params = new URLSearchParams(window.location.search);

    // Permalink amigável: se a câmera está essencialmente no enquadramento
    // padrão do município (dentro de uma tolerância pequena), omite
    // lng/lat/z/p/b da URL -- assim só trocar de município/cenário mantém o
    // link curto (?m=porto_alegre&c=cenario_ada) e a câmera só aparece na
    // URL quando o usuário de fato a ajustou manualmente.
    const view = MUNICIPIO_VIEW[municipio];
    const isVg = municipio === "Visão Geral RS";
    const isDefaultView = !!view &&
      Math.abs(center.lng - view.center[0]) < 0.0005 &&
      Math.abs(center.lat - view.center[1]) < 0.0005 &&
      Math.abs(zoom - view.zoom) < 0.05 &&
      Math.abs(pitch - (view.pitch ?? (isVg ? 0 : 65))) < 1 &&
      Math.abs(bearing - (view.bearing ?? (isVg ? 0 : -12))) < 1;

    if (isDefaultView) {
      params.delete('lng'); params.delete('lat'); params.delete('z'); params.delete('p'); params.delete('b');
    } else {
      params.set('lng', center.lng.toFixed(5));
      params.set('lat', center.lat.toFixed(5));
      params.set('z', zoom.toFixed(2));
      if (pitch > 0) params.set('p', pitch.toFixed(0));
      else params.delete('p');
      if (bearing !== 0) params.set('b', bearing.toFixed(1));
      else params.delete('b');
    }

    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [municipio, mapRef]);

  return { permalinkCenarioRef, permalinkView, initialViewState, handleMapMoveEnd };
}
