import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FeatureCollection } from "geojson";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import { slugify } from "@/lib/geo-utils";
import type { InfraFC, PopupInfo } from "./types";

interface Args {
  mapRef: React.RefObject<MapRef | null>;
  camadas: string[];
  infraAtivas: string[];
  isVisaoGeral: boolean;
  isCenarioAtivo: boolean;
  showDanoFisico: boolean;
  renderMunicipio: string;
  renderEmp: FeatureCollection | null;
  renderEdu: FeatureCollection | null;
  renderSau: FeatureCollection | null;
  danoFisicoEmpresas: FeatureCollection | null;
  danoFisicoEducacao: FeatureCollection | null;
  danoFisicoSaude: FeatureCollection | null;
  baseInfra: InfraFC;
  atingidosInfra: InfraFC;
  setPopupInfo: Dispatch<SetStateAction<PopupInfo | null>>;
}

/** Camadas clicáveis do mapa e o handler de clique (popup / zoom em cluster). */
export function useMapInteraction({
  mapRef, camadas, infraAtivas, isVisaoGeral, isCenarioAtivo, showDanoFisico, renderMunicipio,
  renderEmp, renderEdu, renderSau, danoFisicoEmpresas, danoFisicoEducacao, danoFisicoSaude,
  baseInfra, atingidosInfra, setPopupInfo,
}: Args) {
  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    const mostraDanoFisico = showDanoFisico && renderMunicipio === "Porto Alegre";
    if (camadas.includes("Empresas") && renderEmp?.features && !mostraDanoFisico) ids.push("empresas-cluster", "empresas-point");
    if (camadas.includes("Educação") && renderEdu?.features && !mostraDanoFisico) ids.push("educacao-cluster", "educacao-point");
    if (camadas.includes("Saúde") && renderSau?.features && !mostraDanoFisico) ids.push("saude-cluster", "saude-point");
    if (mostraDanoFisico) {
      if (camadas.includes("Empresas") && danoFisicoEmpresas?.features) ids.push("dano-fisico-empresas-cluster", "dano-fisico-empresas-point");
      if (camadas.includes("Educação") && danoFisicoEducacao?.features) ids.push("dano-fisico-educacao-cluster", "dano-fisico-educacao-point");
      if (camadas.includes("Saúde") && danoFisicoSaude?.features) ids.push("dano-fisico-saude-cluster", "dano-fisico-saude-point");
    }
    if (camadas.includes("Infraestrutura") && !isVisaoGeral) {
      infraAtivas.forEach(nomeInfra => {
        const dataGeo = isCenarioAtivo ? atingidosInfra[nomeInfra] : baseInfra[nomeInfra];
        if (dataGeo?.features) {
          const sid = `infra-${slugify(nomeInfra)}`;
          ids.push(`${sid}-fill`, `${sid}-line`, `${sid}-point`);
        }
      });
    }
    return ids;
  }, [camadas, renderEmp, renderEdu, renderSau, baseInfra, atingidosInfra, infraAtivas, isVisaoGeral, isCenarioAtivo, showDanoFisico, renderMunicipio, danoFisicoEmpresas, danoFisicoEducacao, danoFisicoSaude]);

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features && event.features[0];
    if (!feature) { setPopupInfo(null); return; }

    if (feature.source.startsWith("infra-")) {
      const infrNome = feature.source.replace('infra-', '').toLowerCase();
      const semPopup = ['bocas_de_lobo', 'poste', 'terrenos'];
      if (semPopup.includes(infrNome)) { setPopupInfo(null); return; }
    }

    const props = feature.properties as Record<string, unknown>;
    if (props?.cluster) {
      const clusterId = props.cluster_id;
      const sourceId = feature.source;
      const map = mapRef.current?.getMap();
      if (!map) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const source: any = map.getSource(sourceId);
      if (source && source.getClusterExpansionZoom) {
        source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
          if (err) return;
          map.easeTo({ center: [event.lngLat.lng, event.lngLat.lat], zoom: zoom + 0.5, duration: 800 });
        });
      }
      return;
    }

    setPopupInfo({ lngLat: [event.lngLat.lng, event.lngLat.lat], properties: props ?? {}, source: feature.source });
  };

  return { interactiveLayerIds, handleMapClick };
}
