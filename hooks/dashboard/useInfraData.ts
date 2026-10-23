import { useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FeatureCollection } from "geojson";
import { INFRAESTRUTURA_CONFIG, COTAS_CENARIO } from "@/lib/constants";
import { slugify, scenarioSlug } from "@/lib/geo-utils";
import type { InfraFC, InfraPainel } from "./types";

interface Args {
  municipio: string;
  cenario: string;
  infraAtivas: string[];
  setBaseInfra: Dispatch<SetStateAction<InfraFC>>;
  setAtingidosInfra: Dispatch<SetStateAction<InfraFC>>;
  setIsLoading: (v: boolean) => void;
}

/**
 * Pré-carga da infraestrutura do município (BASE e ATINGIDOS de todos os tipos).
 *
 * O estado (baseInfra/atingidosInfra) fica no useDashboard e entra por
 * parâmetro: o efeito de troca de município (useScenarioData) zera esses
 * estados, e este hook precisa ser declarado DEPOIS dele para que o
 * re-preenchimento a partir do cache aconteça por último no mesmo commit.
 */
export function useInfraData({ municipio, cenario, infraAtivas, setBaseInfra, setAtingidosInfra, setIsLoading }: Args) {
  // Cache em memoria (dura so' a sessao da aba) dos dados de infraestrutura ja
  // baixados, por municipio (base) e por municipio+cenario (atingidos) --
  // evita rebaixar os mesmos ~400MB (Porto Alegre) toda vez que o usuario
  // volta a um municipio ja visitado nesta sessao.
  const infraBaseCacheRef = useRef<Record<string, Record<string, FeatureCollection>>>({});
  const infraAtingidosCacheRef = useRef<Record<string, Record<string, FeatureCollection>>>({});
  const infraPainelCacheRef = useRef<Record<string, InfraPainel>>({});
  const [infraPainel, setInfraPainel] = useState<InfraPainel | null>(null);

  // As metricas do Painel (abas Resumo e Infraestrutura) vem de um JSON leve
  // pre-calculado por municipio e cenario (pipeline/10_infra_stats.py ->
  // infraestrutura_painel.json), entao nenhum GeoJSON de infra e' baixado so'
  // para mostrar numeros. Os GeoJSONs (pesados: ~400MB em Porto Alegre) so'
  // sao buscados quando o tipo e' ligado no mapa (infraAtivas), nos dois
  // efeitos abaixo.
  useEffect(() => {
    if (municipio === "Visão Geral RS" || (INFRAESTRUTURA_CONFIG[municipio]?.length ?? 0) === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInfraPainel(null);
      return;
    }
    const cached = infraPainelCacheRef.current[municipio];
    if (cached) { setInfraPainel(cached); return; }

    setInfraPainel(null);
    const controller = new AbortController();
    fetch(`/dados_convertidos/${slugify(municipio)}/infraestrutura_painel.json?v=2`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: InfraPainel | null) => {
        if (d && !controller.signal.aborted) {
          infraPainelCacheRef.current[municipio] = d;
          setInfraPainel(d);
        }
      })
      .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
    return () => controller.abort();
  }, [municipio]);

  // Baixa o ATINGIDOS do cenario so' dos tipos ligados no mapa.
  useEffect(() => {
    if (municipio === "Visão Geral RS" || !cenario || cenario === "(nenhum)" || cenario === COTAS_CENARIO) return;

    const cacheKey = `${municipio}::${cenario}`;
    const cache = infraAtingidosCacheRef.current[cacheKey] ?? (infraAtingidosCacheRef.current[cacheKey] = {});
    const cacheados = infraAtivas.filter(infra => cache[infra]);
    if (cacheados.length > 0) {
      setAtingidosInfra(prev => {
        const novo = { ...prev };
        cacheados.forEach(infra => { novo[infra] = cache[infra]; });
        return novo;
      });
    }

    const tipos = infraAtivas.filter(infra => !cache[infra]);
    if (tipos.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;
    const munSlug = slugify(municipio);
    const sSlug = scenarioSlug(municipio, cenario);

    tipos.forEach(infra => {
      const url = `/dados_convertidos/${munSlug}/cenarios/infra_${slugify(infra)}_ATINGIDOS_${sSlug}.geojson`;
      fetch(url, { signal })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && !signal.aborted) {
            cache[infra] = d;
            setAtingidosInfra(prev => ({ ...prev, [infra]: d }));
          }
        })
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
    });

    return () => controller.abort();
  }, [municipio, cenario, infraAtivas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Baixa o BASE so' dos tipos ligados no mapa (infraAtivas).
  useEffect(() => {
    if (municipio === "Visão Geral RS" || infraAtivas.length === 0) return;

    const cache = infraBaseCacheRef.current[municipio] ?? (infraBaseCacheRef.current[municipio] = {});
    const cacheados = infraAtivas.filter(infra => cache[infra]);
    if (cacheados.length > 0) {
      setBaseInfra(prev => {
        const novo = { ...prev };
        cacheados.forEach(infra => { novo[infra] = cache[infra]; });
        return novo;
      });
    }

    const toLoad = infraAtivas.filter(infra => !cache[infra]);
    if (toLoad.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;
    const munSlug = slugify(municipio);
    setIsLoading(true);

    Promise.all(toLoad.map(infra => {
      const url = `/dados_convertidos/${munSlug}/infraestrutura/${slugify(infra)}_BASE.geojson`;
      return fetch(url, { signal })
        .then(res => res.ok ? res.json() : null)
        .then(d => ({ infra, d }))
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); return null; });
    })).then(results => {
      if (signal.aborted) return;
      results.forEach(r => {
        if (r?.d) {
          cache[r.infra] = r.d;
          setBaseInfra(prev => ({ ...prev, [r.infra]: r.d }));
        }
      });
      setIsLoading(false);
    });

    return () => { controller.abort(); setIsLoading(false); };
  }, [municipio, infraAtivas]); // eslint-disable-line react-hooks/exhaustive-deps

  return { infraPainel };
}
