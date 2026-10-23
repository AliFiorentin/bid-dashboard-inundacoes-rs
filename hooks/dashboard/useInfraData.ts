import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FeatureCollection } from "geojson";
import { INFRAESTRUTURA_CONFIG, COTAS_CENARIO } from "@/lib/constants";
import { slugify, scenarioSlug } from "@/lib/geo-utils";
import type { InfraFC } from "./types";

interface Args {
  municipio: string;
  cenario: string;
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
export function useInfraData({ municipio, cenario, setBaseInfra, setAtingidosInfra, setIsLoading }: Args) {
  // Cache em memoria (dura so' a sessao da aba) dos dados de infraestrutura ja
  // baixados, por municipio (base) e por municipio+cenario (atingidos) --
  // evita rebaixar os mesmos ~400MB (Porto Alegre) toda vez que o usuario
  // volta a um municipio ja visitado nesta sessao.
  const infraBaseCacheRef = useRef<Record<string, Record<string, FeatureCollection>>>({});
  const infraAtingidosCacheRef = useRef<Record<string, Record<string, FeatureCollection>>>({});

  // Pre-carrega ATINGIDOS de TODOS os tipos de infra do municipio (leves e
  // pesados, marcados ou nao em infraAtivas) -- as metricas do Painel devem
  // aparecer mesmo sem nenhuma camada marcada no mapa (infraAtivas so
  // controla o que desenha no mapa, ver DashboardMap.tsx). Efeito separado do
  // de empresas/educacao/saude/agricultura pra nao re-buscar tudo isso toda
  // vez que cenario muda por causa so da infra.
  useEffect(() => {
    if (municipio === "Visão Geral RS" || !cenario || cenario === "(nenhum)" || cenario === COTAS_CENARIO) return;

    const cacheKey = `${municipio}::${cenario}`;
    const cache = infraAtingidosCacheRef.current[cacheKey] ?? (infraAtingidosCacheRef.current[cacheKey] = {});
    if (Object.keys(cache).length > 0) setAtingidosInfra(prev => ({ ...cache, ...prev }));

    const tipos = (INFRAESTRUTURA_CONFIG[municipio] || []).filter(infra => !cache[infra]);
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
  }, [municipio, cenario]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-carrega BASE de TODOS os tipos de infra do municipio (leves e
  // pesados), independente de estarem marcados em infraAtivas -- mesma logica
  // do efeito acima, so que para o total (nao filtrado por cenario). Isso
  // baixa todos os arquivos de infra do municipio de uma vez (para Porto
  // Alegre, ~400MB+ somados) -- aceito de proposito para que o Painel mostre
  // a metrica de qualquer camada sem exigir selecao previa; INFRA_TAMANHOS_MB
  // continua usado so para o aviso de confirmacao antes de desenhar a camada
  // no MAPA (toggleInfra), que e' a parte cara de renderizar, nao de baixar.
  useEffect(() => {
    const tipos = INFRAESTRUTURA_CONFIG[municipio] || [];
    if (municipio === "Visão Geral RS" || tipos.length === 0) {
      setBaseInfra(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }

    const cache = infraBaseCacheRef.current[municipio] ?? (infraBaseCacheRef.current[municipio] = {});
    if (Object.keys(cache).length > 0) setBaseInfra(prev => ({ ...cache, ...prev }));

    const toLoad = tipos.filter(infra => !cache[infra]);
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

    return () => controller.abort();
  }, [municipio]); // eslint-disable-line react-hooks/exhaustive-deps
}
