import { useState, useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { MUNICIPIO_VIEW } from "@/lib/constants";
import type { CameraPermalink } from "./usePermalink";

interface Args {
  mapRef: React.RefObject<MapRef | null>;
  headerRef: React.RefObject<HTMLElement | null>;
  municipio: string;
  showPainelAnalise: boolean;
  permalinkView: CameraPermalink | null;
  setIs3D: (v: boolean) => void;
}

// Painel lateral só existe a partir de lg (1024px); abaixo disso é bottom sheet e o
// mapa já é redimensionado para ficar acima dele (sem padding).
const PADDING_PAINEL = 412;
const painelLateral = () => window.matchMedia("(min-width: 1024px)").matches;

/** Enquadramento do mapa: flyTo na troca de município, padding do painel e posição do header. */
export function useMapCamera({ mapRef, headerRef, municipio, showPainelAnalise, permalinkView, setIs3D }: Args) {
  const [headerBottom, setHeaderBottom] = useState(82);
  const hasFlownInitial = useRef(false);
  // O <Map> do react-map-gl cria a instância maplibre de forma assíncrona: o
  // ref já existe (map != null) antes do estilo terminar de carregar, e um
  // flyTo disparado nesse meio-tempo é silenciosamente ignorado pelo
  // maplibre-gl. Por isso esperamos mapReady (onLoad, setado no DashboardMap)
  // antes de voar — sem isso, a primeira troca de município depois do carregamento
  // da página não movia a câmera (só a segunda, quando o estilo já tinha carregado).
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const view = MUNICIPIO_VIEW[municipio];
    const map = mapRef.current?.getMap();
    if (view && map && mapReady) {
      // Na primeira passagem, se a URL trouxe câmera própria ela vence: o
      // initialViewState já a aplicou e o is3D já nasceu coerente com ela, então
      // reenquadrar aqui só destruiria o que o link carregava.
      const primeiraVez = !hasFlownInitial.current;
      hasFlownInitial.current = true;
      if (primeiraVez && permalinkView) return;

      const isVg = municipio === "Visão Geral RS";
      const padLeft = showPainelAnalise && painelLateral() ? PADDING_PAINEL : 0;
      map.flyTo({
        center: view.center,
        zoom: view.zoom,
        pitch: view.pitch ?? (isVg ? 0 : 65),
        bearing: view.bearing ?? (isVg ? 0 : -12),
        padding: { left: padLeft, top: 0, right: 0, bottom: 0 },
        duration: isVg ? 1500 : 3000,
        essential: true
      });

      // Auto-toggle 3D: Desliga na Visão Geral e liga no Município
      setIs3D(!isVg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipio, mapReady]);

  // Reajusta o enquadramento (padding) quando o painel é mostrado/ocultado, sem re-voar.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.easeTo({ padding: { left: showPainelAnalise && painelLateral() ? PADDING_PAINEL : 0, top: 0, right: 0, bottom: 0 }, duration: 400 });
  }, [showPainelAnalise, mapRef]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setHeaderBottom(el.getBoundingClientRect().bottom + 8);
    });
    ro.observe(el);
    setHeaderBottom(el.getBoundingClientRect().bottom + 8);
    return () => ro.disconnect();
  }, [headerRef]);

  return { mapReady, setMapReady, headerBottom };
}
