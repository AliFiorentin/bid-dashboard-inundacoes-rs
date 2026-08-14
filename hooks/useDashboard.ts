import { useState, useMemo, useEffect, useRef, useCallback } from "react";

/** Métricas pré-calculadas de uma camada de infraestrutura. Espelha o que
 *  GenericInfraSection/LogradourosSection calculariam em runtime — mas sem
 *  precisar baixar a geometria (Edificações sozinha tem 139 MB em POA). */
export interface InfraMetricas {
  n: number;
  area?: number;
  rotas?: number;
  km?: number;
  ruas?: number;
  drenagem?: number;
  iluminacao?: number;
  agua?: number;
  lixo?: number;
  esgotoPluvial?: number;
  esgotoCloacal?: number;
  fossa?: number;
  condominio?: number;
}
export interface InfraStats {
  base: Record<string, InfraMetricas>;
  cenarios: Record<string, Record<string, InfraMetricas>>;
}

export interface PopulacaoMunData {
  pop_total: number;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  cenarios: Record<string, { pop_atingida: number; pct_atingida: number }>;
}
export type PopulacaoData = Record<string, PopulacaoMunData>;
import type { FeatureCollection } from "geojson";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import * as XLSX from "xlsx";
import {
  MUNICIPIOS, CENARIOS_CONFIG, INFRAESTRUTURA_CONFIG, MUNICIPIO_VIEW,
  AGRI_BOUNDS, AGRI_ANO_BASE, CENARIO_PERIODO, IMPACTO_AGRICOLA, INFRA_TAMANHOS_MB,
  normalizeDep, PIORES_CENARIOS, CNAE_LABELS,
} from "@/lib/constants";
import {
  slugify, scenarioSlug, mergeGeoJSON,
  countRuasUnicas, getRuasListPOA, countRuasUnicasPOA,
  getRotas, getLen, calcEmp, calcEdu, calcSau,
} from "@/lib/geo-utils";

const VISAO_GERAL_VIEW = {
  longitude: MUNICIPIO_VIEW["Visão Geral RS"].center[0],
  latitude: MUNICIPIO_VIEW["Visão Geral RS"].center[1],
  zoom: MUNICIPIO_VIEW["Visão Geral RS"].zoom,
};

interface CameraPermalink {
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

export function useDashboard() {
  const mapRef = useRef<MapRef>(null);
  // Mora aqui (não como state local do DashboardMap) porque o efeito de
  // flyTo abaixo precisa saber quando o mapa fica pronto pela primeira vez —
  // não dá pra inferir isso checando `mapRef.current`, porque na carga
  // inicial o efeito roda ANTES do <Map> montar, então esse teste silenciosamente
  // não faz nada e só "conta como primeira vez" na primeira TROCA de
  // município, não no load. Ver bug corrigido no efeito de flyTo.
  const [mapReady, setMapReady] = useState(false);
  const permalinkCenarioRef = useRef<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerBottom, setHeaderBottom] = useState(82);

  const [municipio, setMunicipio] = useState<string>("Visão Geral RS");
  const [cenario, setCenario] = useState<string>("(nenhum)");
  const [renderMunicipio, setRenderMunicipio] = useState<string>("Visão Geral RS");

  const [camadas, setCamadas] = useState<string[]>(["Empresas", "Educação", "Saúde", "Agricultura"]);
  const [infraAtivas, setInfraAtivas] = useState<string[]>([]);

  const [filtroSetor, setFiltroSetor] = useState<string>("(todos)");
  const [filtroDep, setFiltroDep] = useState<string>("(todas)");
  const [filtroTipo, setFiltroTipo] = useState<string>("(todas)");

  const [showPainelAnalise, setShowPainelAnalise] = useState<boolean>(true);
  const [showFiltros, setShowFiltros] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [baseEmpresas, setBaseEmpresas] = useState<FeatureCollection | null>(null);
  const [baseEducacao, setBaseEducacao] = useState<FeatureCollection | null>(null);
  const [baseSaude, setBaseSaude] = useState<FeatureCollection | null>(null);
  const [baseInfra, setBaseInfra] = useState<Record<string, FeatureCollection>>({});
  // KPIs de TODAS as camadas de infraestrutura (municipais + OSM), pré-calculados (infra_stats.json,
  // ~1 KB por município). É o que permite o painel mostrar contagem de Lotes,
  // Edificações, Rede Esgoto etc. sem baixar as camadas — que somam 418 MB só
  // em Porto Alegre. O mapa continua carregando geometria só sob demanda.
  const [infraStats, setInfraStats] = useState<InfraStats | null>(null);

  const [atingidosEmpresas, setAtingidosEmpresas] = useState<FeatureCollection | null>(null);
  const [atingidosEducacao, setAtingidosEducacao] = useState<FeatureCollection | null>(null);
  const [atingidosSaude, setAtingidosSaude] = useState<FeatureCollection | null>(null);
  const [atingidosInfra, setAtingidosInfra] = useState<Record<string, FeatureCollection>>({});
  const [manchaCenario, setManchaCenario] = useState<FeatureCollection | null>(null);
  const [limitePA, setLimitePA] = useState<FeatureCollection | null>(null);
  const [baseAgriStats, setBaseAgriStats] = useState<Record<string, number> | null>(null);
  const [atingidosAgriStats, setAtingidosAgriStats] = useState<Record<string, number> | null>(null);
  const [baseAgriGeo, setBaseAgriGeo] = useState<FeatureCollection | null>(null);
  const [atingidosAgriGeo, setAtingidosAgriGeo] = useState<FeatureCollection | null>(null);
  const [conabStats, setConabStats] = useState<{ soja: { area_ha: number }; arroz: { area_ha: number } } | null>(null);
  const [allMunAgriStats, setAllMunAgriStats] = useState<Record<string, Record<string, number>> | null>(null);
  const [allMunAgriAtingidosStats, setAllMunAgriAtingidosStats] = useState<Record<string, Record<string, number>> | null>(null);
  const [manchaRS, setManchaRS] = useState<FeatureCollection | null>(null);
  const [danosData, setDanosData] = useState<import("@/components/tabs/DanosTab").DanosData | null>(null);
  const [popData, setPopData] = useState<PopulacaoData | null>(null);

  const [cursor, setCursor] = useState<string>("grab");
  const [popupInfo, setPopupInfo] = useState<{ lngLat: [number, number], properties: Record<string, unknown>, source: string } | null>(null);

  const [tabAtiva, setTabAtiva] = useState<string>("empresas");
  const [showMancha, setShowMancha] = useState<boolean>(true);
  const [showLegenda, setShowLegenda] = useState<boolean>(false);
  // Lido uma única vez, no mount. Quando existe, a câmera do link tem prioridade
  // sobre o enquadramento padrão do município.
  const [permalinkView] = useState<CameraPermalink | null>(lerCameraDaURL);

  // Mora aqui, e não no DashboardMap, porque o efeito de troca de município
  // liga/desliga o 3D junto com o reenquadramento.
  //
  // Nasce ligado quando o link compartilhado traz inclinação: sem isso o efeito
  // de terreno do DashboardMap veria is3D=false e achataria a câmera recém
  // restaurada, jogando fora justamente o enquadramento que o link carregava.
  const [is3D, setIs3D] = useState<boolean>(() => (permalinkView?.pitch ?? 0) > 0);
  const [showHeatmapEmpresas, setShowHeatmapEmpresas] = useState<boolean>(false);
  const [showHeatmapSaude, setShowHeatmapSaude] = useState<boolean>(false);
  const [showHeatmapEducacao, setShowHeatmapEducacao] = useState<boolean>(false);
  const [showListaEscolas, setShowListaEscolas] = useState(false);
  const [showListaHospitais, setShowListaHospitais] = useState(false);
  const [showListaUBS, setShowListaUBS] = useState(false);
  const [showListaAmbulat, setShowListaAmbulat] = useState(false);
  const [showListaLogradouros, setShowListaLogradouros] = useState(false);
  const [showListaEixos, setShowListaEixos] = useState(false);

  useEffect(() => {
    fetch("/dados_convertidos/danos_operacionais.json")
      .then(r => r.ok ? r.json() : null)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      .then(d => d && setDanosData(d))
      .catch(() => {/* silently ignore if file not available */});
  }, []);

  useEffect(() => {
    fetch("/dados_convertidos/populacao_atingida.json")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPopData(d))
      .catch(() => {});
  }, []);

  const hasFlownInitial = useRef(false);

  useEffect(() => {
    const view = MUNICIPIO_VIEW[municipio];
    const map = mapRef.current?.getMap();
    if (!view || !map) return;

    const voar = () => {
      // Na primeira passagem (primeira vez que o mapa está de fato pronto),
      // se a URL trouxe câmera própria ela vence: o initialViewState já a
      // aplicou e o is3D já nasceu coerente com ela, então reenquadrar aqui
      // só destruiria o que o link carregava.
      const primeiraVez = !hasFlownInitial.current;
      hasFlownInitial.current = true;
      if (primeiraVez && permalinkView) return;

      const isVg = municipio === "Visão Geral RS";
      const padLeft = showPainelAnalise ? 412 : 0;
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
    };

    // Mesmo padrão do efeito de terreno em DashboardMap.tsx: não confiar só no
    // prop onLoad do react-map-gl (mapReady) para saber que o mapa está pronto
    // — em alguns ambientes esse evento simplesmente não dispara de forma
    // confiável, e depender só dele deixava o flyTo travado pra sempre, não
    // só na primeira troca. isStyleLoaded()/once('load') é o sinal direto do
    // próprio MapLibre, sem depender do ciclo de props do React.
    if (map.isStyleLoaded()) {
      voar();
    } else {
      map.once("load", voar);
      return () => { map.off("load", voar); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipio, mapReady]);

  // Reajusta o enquadramento (padding) quando o painel é mostrado/ocultado, sem re-voar.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.easeTo({ padding: { left: showPainelAnalise ? 412 : 0, top: 0, right: 0, bottom: 0 }, duration: 400 });
  }, [showPainelAnalise]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPopupInfo(null);
    setIsLoading(true);

    // Clear all visible layer data immediately so the map is clean during flyTo
    setBaseEmpresas(null); setBaseEducacao(null); setBaseSaude(null);
    setAtingidosEmpresas(null); setAtingidosEducacao(null); setAtingidosSaude(null);
    setManchaCenario(null); setManchaRS(null); setLimitePA(null);
    setBaseInfra({}); setAtingidosInfra({});
    setBaseAgriGeo(null); setAtingidosAgriGeo(null);

    if (municipio === "Visão Geral RS") {
      const carregarVisaoGeral = async () => {
        const bEmp: FeatureCollection[] = []; const bEdu: FeatureCollection[] = []; const bSau: FeatureCollection[] = [];
        const aEmp: FeatureCollection[] = []; const aEdu: FeatureCollection[] = []; const aSau: FeatureCollection[] = [];
        const agriStats: Record<string, Record<string, number>> = {};
        const agriAtingidosStats: Record<string, Record<string, number>> = {};

        const fetchPromises = MUNICIPIOS.map(async (mun) => {
          const mSlug = slugify(mun);
          const cSlug = scenarioSlug(mun, PIORES_CENARIOS[mun]);
          try {
            const [emp, edu, sau, empAtg, eduAtg, sauAtg, agri, agriAtg] = await Promise.all([
              fetch(`/dados_convertidos/${mSlug}/empresas_BASE.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/educacao_BASE.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/saude_BASE.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/empresas_ATINGIDOS_${cSlug}.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/educacao_ATINGIDOS_${cSlug}.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/saude_ATINGIDOS_${cSlug}.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/agricultura_stats_BASE.json?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/agricultura_stats_${cSlug}.json?v=3`, { signal }).then(r => r.ok ? r.json() : null),
            ]);
            if (emp) bEmp.push(emp);
            if (edu) bEdu.push(edu);
            if (sau) bSau.push(sau);
            if (empAtg) aEmp.push(empAtg);
            if (eduAtg) aEdu.push(eduAtg);
            if (sauAtg) aSau.push(sauAtg);
            if (agri) agriStats[mun] = agri;
            if (agriAtg) agriAtingidosStats[mun] = agriAtg;
          } catch (e) { if ((e as Error).name !== 'AbortError') console.error(e); }
        });

        const manchaRSPromise = fetch("/dados_convertidos/mancha_rs_enchente_2024.geojson", { signal }).then(r => r.ok ? r.json() : null);

        Promise.all([
          ...fetchPromises,
          manchaRSPromise,
          new Promise(res => setTimeout(res, 1500))
        ]).then((values) => {
          if (signal.aborted) return;

          setRenderMunicipio("Visão Geral RS");
          setAtingidosInfra({}); setCenario("(nenhum)");
          setBaseAgriStats(null); setAtingidosAgriStats(null); setConabStats(null);
          setBaseInfra({}); setInfraAtivas([]);

          const manchaData = values[values.length - 2];
          setManchaRS(manchaData);
          setBaseEmpresas(mergeGeoJSON(bEmp)); setBaseEducacao(mergeGeoJSON(bEdu)); setBaseSaude(mergeGeoJSON(bSau));
          setAtingidosEmpresas(mergeGeoJSON(aEmp)); setAtingidosEducacao(mergeGeoJSON(aEdu)); setAtingidosSaude(mergeGeoJSON(aSau));
          setAllMunAgriStats(agriStats);
          setAllMunAgriAtingidosStats(agriAtingidosStats);

          setIsLoading(false);
        }).catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
      };
      carregarVisaoGeral();

      return () => controller.abort();
    }

    const munSlug = slugify(municipio);

    const basePromises = Promise.all([
      fetch(`/dados_convertidos/${munSlug}/empresas_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      fetch(`/dados_convertidos/${munSlug}/educacao_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      fetch(`/dados_convertidos/${munSlug}/saude_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      AGRI_BOUNDS[municipio] ? fetch(`/dados_convertidos/${munSlug}/agricultura_stats_BASE.json`, { signal }).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
      fetch(`/dados_convertidos/${munSlug}/limite_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      AGRI_BOUNDS[municipio] ? fetch(`/dados_convertidos/${munSlug}/agricultura_${AGRI_ANO_BASE}_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]);

    Promise.all([
      basePromises,
      new Promise(res => setTimeout(res, 3000))
    ]).then(([[emp, edu, sau, agri, limite, agriGeo]]) => {
      if (signal.aborted) return;

      setRenderMunicipio(municipio);
      setAtingidosInfra({});
      setBaseAgriStats(null); setAtingidosAgriStats(null); setConabStats(null);
      setAllMunAgriStats(null); setAllMunAgriAtingidosStats(null);
      setBaseAgriGeo(null); setAtingidosAgriGeo(null);
      setFiltroSetor("(todos)"); setFiltroDep("(todas)"); setFiltroTipo("(todas)");
      setBaseInfra({});

      // Defaults deliberadamente enxutos: o painel mostra o KPI de TODAS as
      // camadas sempre (via infraStats, pré-calculado — ver efeito abaixo),
      // então marcar tudo pra carregar no mapa por padrão só pesaria (Porto
      // Alegre sozinho tem 418 MB de geometria somando as camadas) sem
      // adicionar informação que o painel já mostra. O resto é opcional.
      if (municipio === "Rio Grande") {
        setInfraAtivas(["Logradouros", "Quadras", "Edificações"]);
        setCamadas(prev => prev.includes("Infraestrutura") ? prev : [...prev, "Infraestrutura"]);
      } else if (municipio === "Porto Alegre") {
        // Nomes internos (arquivo/slug) continuam "Eixos Logradouros" e
        // "Quarteirões" — só o RÓTULO exibido virou "Logradouros"/"Quadras"
        // (ver infraLabel em lib/constants.ts). Mudar o nome interno colidiria
        // com os "Logradouros"/"Quadras" de Rio Grande e Lajeado, que são
        // camadas com esquema de dados diferente.
        setInfraAtivas(["Eixos Logradouros", "Quarteirões"]);
        setCamadas(prev => prev.includes("Infraestrutura") ? prev : [...prev, "Infraestrutura"]);
      } else if (municipio === "Lajeado") {
        setInfraAtivas(["Logradouros", "Quadras", "Edificações"]);
        setCamadas(prev => prev.includes("Infraestrutura") ? prev : [...prev, "Infraestrutura"]);
      } else if (municipio === "Eldorado do Sul") {
        setInfraAtivas(["Edificações"]);
        setCamadas(prev => prev.includes("Infraestrutura") ? prev : [...prev, "Infraestrutura"]);
      } else {
        setInfraAtivas([]);
      }

      const cenariosDisp = CENARIOS_CONFIG[municipio] || [];
      const desiredCenario = permalinkCenarioRef.current;
      permalinkCenarioRef.current = null;
      // A URL guarda o cenário em slug ("cenario_30m"), mas CENARIOS_CONFIG
      // guarda o rótulo ("Cenário 30m") — comparar os dois direto nunca casa e
      // faz todo permalink cair no primeiro cenário da lista. Em Lajeado e Rio
      // Grande isso trocava o cenário do link em silêncio (e o efeito de URL
      // abaixo ainda regravava o slug errado por cima). Casar por slug.
      const initialCenario = cenariosDisp.find(c => slugify(c) === desiredCenario)
        ?? (cenariosDisp.length > 0 ? cenariosDisp[0] : "(nenhum)");
      setCenario(initialCenario);

      setBaseEmpresas(emp); setBaseEducacao(edu); setBaseSaude(sau);
      setBaseAgriStats(agri);
      setLimitePA(limite);
      setBaseAgriGeo(agriGeo);

      setIsLoading(false);
    }).catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });

    return () => controller.abort();
  }, [municipio]);

  useEffect(() => {
    if (municipio === "Visão Geral RS") return; // managed by [municipio] effect
    if (!cenario || cenario === "(nenhum)") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManchaCenario(null); setAtingidosEmpresas(null); setAtingidosEducacao(null); setAtingidosSaude(null);
      setAtingidosInfra(prev => Object.keys(prev).length === 0 ? prev : {});
      setAtingidosAgriStats(null); setConabStats(null); setAtingidosAgriGeo(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const munSlug = slugify(municipio);
    const sSlug = scenarioSlug(municipio, cenario);
    setIsLoading(true);

    const baseUrls = [
      `/dados_convertidos/${munSlug}/cenarios/${sSlug}.geojson`,
      `/dados_convertidos/${munSlug}/cenarios/empresas_ATINGIDOS_${sSlug}.geojson`,
      `/dados_convertidos/${munSlug}/cenarios/educacao_ATINGIDOS_${sSlug}.geojson`,
      `/dados_convertidos/${munSlug}/cenarios/saude_ATINGIDOS_${sSlug}.geojson`,
    ];

    Promise.all(baseUrls.map(url => fetch(url, { signal }).then(r => r.ok ? r.json() : null)))
      .then(([mancha, emp, edu, sau]) => {
        if (signal.aborted) return;
        setManchaCenario(mancha); setAtingidosEmpresas(emp); setAtingidosEducacao(edu); setAtingidosSaude(sau);
        setIsLoading(false);
      })
      .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });

    if (AGRI_BOUNDS[municipio]) {
      fetch(`/dados_convertidos/${munSlug}/cenarios/agricultura_stats_${sSlug}.json`, { signal })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!signal.aborted) setAtingidosAgriStats(d); })
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });

      fetch(`/dados_convertidos/${munSlug}/cenarios/conab_stats_${sSlug}.json`, { signal })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!signal.aborted) setConabStats(d); })
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });

      fetch(`/dados_convertidos/${munSlug}/cenarios/agricultura_ATINGIDOS_${sSlug}.geojson`, { signal })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!signal.aborted) setAtingidosAgriGeo(d); })
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
    }

    infraAtivas.forEach(infra => {
      const url = `/dados_convertidos/${munSlug}/cenarios/infra_${slugify(infra)}_ATINGIDOS_${sSlug}.geojson`;
      fetch(url, { signal })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && !signal.aborted) setAtingidosInfra(prev => ({ ...prev, [infra]: d })); })
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
    });

    return () => controller.abort();
  }, [municipio, cenario, infraAtivas]);

  useEffect(() => {
    if (municipio === "Visão Geral RS" || infraAtivas.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseInfra(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const munSlug = slugify(municipio);

    setBaseInfra(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { if (!infraAtivas.includes(k)) delete updated[k]; });
      return updated;
    });

    const toLoad = infraAtivas.filter(infra => !baseInfra[infra]);
    if (toLoad.length > 0) setIsLoading(true);

    Promise.all(toLoad.map(infra => {
      const url = `/dados_convertidos/${munSlug}/infraestrutura/${slugify(infra)}_BASE.geojson`;
      return fetch(url, { signal })
        .then(res => res.ok ? res.json() : null)
        .then(d => ({ infra, d }))
        .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); return null; });
    })).then(results => {
      if (signal.aborted) return;
      results.forEach(r => { if (r?.d) setBaseInfra(prev => ({ ...prev, [r.infra]: r.d })); });
      setIsLoading(false);
    });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipio, infraAtivas]);

  // KPIs pré-calculados de infraestrutura (ver infraStats acima).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfraStats(null);
    if (municipio === "Visão Geral RS") return;
    // Sem o reset acima, trocar direto de um município pro outro (ex.: Porto
    // Alegre → Lajeado) deixava infraStats com os números do município
    // ANTERIOR até o fetch novo resolver — e como várias categorias têm o
    // mesmo nome em municípios diferentes (Logradouros, Quadras, Edificações,
    // Pontes, Saneamento, Energia, Torres/Antenas), os cards mostravam por um
    // instante um KPI de aparência válida mas errado, em vez de "Carregando...".
    const controller = new AbortController();
    const { signal } = controller;
    fetch(`/dados_convertidos/${slugify(municipio)}/infra_stats.json`, { signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!signal.aborted) setInfraStats(d); })
      .catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
    return () => controller.abort();
  }, [municipio]);

  const toggleCamada = (camada: string) => { setCamadas(prev => prev.includes(camada) ? prev.filter(c => c !== camada) : [...prev, camada]); setPopupInfo(null); };
  const toggleInfra = (infra: string) => {
    const isAtivando = !infraAtivas.includes(infra);
    if (isAtivando && INFRA_TAMANHOS_MB[infra]) {
      const mb = INFRA_TAMANHOS_MB[infra];
      if (!window.confirm(`A camada "${infra}" tem ~${mb}MB. Carregar pode ser lento. Continuar?`)) return;
    }
    setInfraAtivas(prev => prev.includes(infra) ? prev.filter(i => i !== infra) : [...prev, infra]);
    setCamadas(prev => prev.includes("Infraestrutura") ? prev : [...prev, "Infraestrutura"]);
    setPopupInfo(null);
  };
  const toggleMenuInfra = () => { setCamadas(camadas.includes("Infraestrutura") ? camadas.filter(c => c !== "Infraestrutura") : [...camadas, "Infraestrutura"]); };

  const isVisaoGeral = renderMunicipio === "Visão Geral RS";
  const isCenarioAtivo = isVisaoGeral ? true : (cenario !== "(nenhum)" && manchaCenario != null);

  const showEmp = isCenarioAtivo ? atingidosEmpresas : baseEmpresas;
  const showEdu = isCenarioAtivo ? atingidosEducacao : baseEducacao;
  const showSau = isCenarioAtivo ? atingidosSaude : baseSaude;

  const isTransitioning = municipio !== renderMunicipio;

  const renderEmp = useMemo(() => {
    if (isTransitioning || !showEmp || !Array.isArray(showEmp.features)) return null;
    if (filtroSetor === "(todos)") return showEmp;
    return { ...showEmp, features: showEmp.features.filter((f) => String((f.properties as Record<string, unknown>)?.CNAE_2 || "") === filtroSetor) };
  }, [isTransitioning, showEmp, filtroSetor]);

  const renderEdu = useMemo(() => {
    if (isTransitioning || !showEdu || !Array.isArray(showEdu.features)) return null;
    if (filtroDep === "(todas)") return showEdu;
    return { ...showEdu, features: showEdu.features.filter((f) => normalizeDep(String((f.properties as Record<string, unknown>)?.tp_dependencia || "")).toLowerCase() === filtroDep.toLowerCase()) };
  }, [isTransitioning, showEdu, filtroDep]);

  const renderSau = useMemo(() => {
    if (isTransitioning || !showSau || !Array.isArray(showSau.features)) return null;
    if (filtroTipo === "(todas)") return showSau;
    return { ...showSau, features: showSau.features.filter((f) => String((f.properties as Record<string, unknown>)?.co_tipo_estabelecimento || "").toLowerCase() === filtroTipo.toLowerCase()) };
  }, [isTransitioning, showSau, filtroTipo]);

  const metricasEmp = useMemo(() => ({ base: calcEmp(baseEmpresas), impacto: calcEmp(atingidosEmpresas) }), [baseEmpresas, atingidosEmpresas]);
  const metricasEdu = useMemo(() => ({ base: calcEdu(baseEducacao), impacto: calcEdu(atingidosEducacao) }), [baseEducacao, atingidosEducacao]);
  const metricasSau = useMemo(() => ({ base: calcSau(baseSaude), impacto: calcSau(atingidosSaude) }), [baseSaude, atingidosSaude]);

  const setoresUnicos = useMemo((): string[] => {
    if (!baseEmpresas || !Array.isArray(baseEmpresas.features)) return [];
    return (Array.from(new Set(baseEmpresas.features.map((f) => String((f.properties as Record<string, unknown>)?.CNAE_2 || "")).filter(Boolean))).sort() as string[]);
  }, [baseEmpresas]);

  const depsUnicas = useMemo((): string[] => {
    if (!baseEducacao || !Array.isArray(baseEducacao.features)) return [];
    return (Array.from(new Set(baseEducacao.features.map((f) => normalizeDep(String((f.properties as Record<string, unknown>)?.tp_dependencia || ""))).filter(Boolean))).sort() as string[]);
  }, [baseEducacao]);

  const tiposUnicos = useMemo((): string[] => {
    if (!baseSaude || !Array.isArray(baseSaude.features)) return [];
    return (Array.from(new Set(baseSaude.features.map((f) => String((f.properties as Record<string, unknown>)?.co_tipo_estabelecimento || "")).filter(Boolean))).sort() as string[]);
  }, [baseSaude]);

  // Read permalink from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('m');
    const c = params.get('c');
    if (m) {
      const munLabel = [...MUNICIPIOS, "Visão Geral RS"].find(x => slugify(x) === m);
      if (munLabel) {
        if (c) permalinkCenarioRef.current = c;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMunicipio(munLabel);
      }
    }
  }, []);

  // Update URL when municipio/cenario changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('m', slugify(municipio));
    if (cenario !== "(nenhum)") params.set('c', slugify(cenario));
    else params.delete('c');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [municipio, cenario]);

  useEffect(() => {
    if (tabAtiva === "infra" && (!camadas.includes("Infraestrutura") || isVisaoGeral || infraAtivas.length === 0)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTabAtiva("empresas");
    }
    if (tabAtiva === "agricultura" && !camadas.includes("Agricultura")) {
      setTabAtiva("empresas");
    }
  }, [camadas, infraAtivas, isVisaoGeral, tabAtiva]);

  const possuiInfra = INFRAESTRUTURA_CONFIG[municipio] && INFRAESTRUTURA_CONFIG[municipio].length > 0;
  const mostraImpacto = isVisaoGeral || isCenarioAtivo;
  const temCamadaTabular = camadas.includes("Empresas") || camadas.includes("Educação") || camadas.includes("Saúde") || camadas.includes("Agricultura") || camadas.includes("Infraestrutura") || camadas.includes("População");

  const setoresChart = useMemo(() => {
    if (!baseEmpresas?.features) return [] as { setor: string; base: number; atg: number }[];
    const baseCounts: Record<string, number> = {};
    const atgCounts: Record<string, number> = {};
    baseEmpresas.features.forEach((f) => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 || '');
      if (s) baseCounts[s] = (baseCounts[s] || 0) + 1;
    });
    (atingidosEmpresas?.features ?? []).forEach((f) => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 || '');
      if (s) atgCounts[s] = (atgCounts[s] || 0) + 1;
    });
    const sorted = Object.entries(baseCounts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 9);
    const outrosBase = sorted.slice(9).reduce((s, [, c]) => s + c, 0);
    const outrosAtg = sorted.slice(9).reduce((s, [k]) => s + (atgCounts[k] ?? 0), 0);
    const result = top.map(([setor, base]) => ({ setor: CNAE_LABELS[setor] ?? setor, base, atg: atgCounts[setor] ?? 0 }));
    if (outrosBase > 0) result.push({ setor: "Outros", base: outrosBase, atg: outrosAtg });
    return result;
  }, [baseEmpresas, atingidosEmpresas]);

  const setoresEmpregadosChart = useMemo(() => {
    const baseFeats = baseEmpresas?.features ?? [];
    const atgFeats  = atingidosEmpresas?.features ?? [];
    const baseAcc: Record<string, number> = {};
    const atgAcc:  Record<string, number> = {};
    baseFeats.forEach(f => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 ?? "");
      const v = Number((f.properties as Record<string, unknown>)?.Empregados ?? 0);
      if (s) baseAcc[s] = (baseAcc[s] ?? 0) + v;
    });
    atgFeats.forEach(f => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 ?? "");
      const v = Number((f.properties as Record<string, unknown>)?.Empregados ?? 0);
      if (s) atgAcc[s] = (atgAcc[s] ?? 0) + v;
    });
    return Object.entries(baseAcc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([setor, base]) => ({ setor: CNAE_LABELS[setor] ?? setor, base, atg: atgAcc[setor] ?? 0 }));
  }, [baseEmpresas, atingidosEmpresas]);

  const professoresDepChart = useMemo(() => {
    const baseFeats = baseEducacao?.features ?? [];
    const atgFeats  = atingidosEducacao?.features ?? [];
    const DEP: Record<string, string> = { "1": "Federal", "2": "Estadual", "3": "Municipal", "4": "Privada" };
    const baseAcc: Record<string, number> = {};
    const atgAcc:  Record<string, number> = {};
    baseFeats.forEach(f => {
      const d = DEP[String((f.properties as Record<string, unknown>)?.tp_dependencia ?? "")];
      const v = Number((f.properties as Record<string, unknown>)?.qtd_prof ?? 0);
      if (d) baseAcc[d] = (baseAcc[d] ?? 0) + v;
    });
    atgFeats.forEach(f => {
      const d = DEP[String((f.properties as Record<string, unknown>)?.tp_dependencia ?? "")];
      const v = Number((f.properties as Record<string, unknown>)?.qtd_prof ?? 0);
      if (d) atgAcc[d] = (atgAcc[d] ?? 0) + v;
    });
    return Object.entries(baseAcc)
      .sort((a, b) => b[1] - a[1])
      .map(([dep, base]) => ({ dep, base, atg: atgAcc[dep] ?? 0 }));
  }, [baseEducacao, atingidosEducacao]);

  const exportarExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const adicionarAba = (dadosGeograficos: FeatureCollection | null | undefined, nomeDaAba: string) => {
      if (dadosGeograficos && Array.isArray(dadosGeograficos.features) && dadosGeograficos.features.length > 0) {
        const linhas = dadosGeograficos.features.map((f) => f.properties);
        const worksheet = XLSX.utils.json_to_sheet(linhas);
        XLSX.utils.book_append_sheet(workbook, worksheet, nomeDaAba);
      }
    };
    if (camadas.includes("Empresas")) {
      adicionarAba(atingidosEmpresas || baseEmpresas, "Empresas");
    }
    if (camadas.includes("Educação")) adicionarAba(atingidosEducacao || baseEducacao, "Educação");
    if (camadas.includes("Saúde")) adicionarAba(atingidosSaude || baseSaude, "Saúde");
    if (camadas.includes("Infraestrutura") && !isVisaoGeral) {
      infraAtivas.forEach(infra => {
        const sourceData = isCenarioAtivo ? atingidosInfra[infra] : baseInfra[infra];
        if (sourceData) adicionarAba(sourceData, `Infra - ${infra}`);
      });
    }
    if (camadas.includes("Agricultura") && !isVisaoGeral && baseAgriStats) {
      const sSlugCen = isCenarioAtivo ? scenarioSlug(municipio, cenario) : null;
      const periodo  = sSlugCen ? CENARIO_PERIODO[sSlugCen] : null;
      const coefs    = periodo ? IMPACTO_AGRICOLA[periodo] : null;
      const linhasAgri = Object.entries(baseAgriStats).map(([nome, haBase]) => {
        let haExib = haBase;
        let fonte  = "MapaBiomas";
        if (isCenarioAtivo) {
          haExib = atingidosAgriStats?.[nome] ?? 0;
          if (nome === "Soja"  && conabStats && conabStats.soja.area_ha  > 0) { haExib = conabStats.soja.area_ha;  fonte = "CONAB"; }
          if (nome === "Arroz" && conabStats && conabStats.arroz.area_ha > 0) { haExib = conabStats.arroz.area_ha; fonte = "CONAB"; }
        }
        const c       = coefs?.[nome];
        const impacto = c && haExib > 0 ? haExib * c.coef : 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: Record<string, any> = { Cultura: nome, Area_ha: haExib, Fonte: fonte };
        if (isCenarioAtivo && c) { row.Situacao = c.status; row.Coef_R_ha = c.coef; row.Impacto_R = impacto; }
        return row;
      });
      if (linhasAgri.length > 0) {
        const ws = XLSX.utils.json_to_sheet(linhasAgri);
        XLSX.utils.book_append_sheet(workbook, ws, "Agricultura");
      }
    }
    const sufixoCenario = isVisaoGeral ? "_piores_cenarios" : (cenario !== "(nenhum)" ? `_${slugify(cenario)}` : "");
    XLSX.writeFile(workbook, `Impacto_${slugify(municipio)}${sufixoCenario}.xlsx`);
  }, [camadas, municipio, cenario, isVisaoGeral, isCenarioAtivo, infraAtivas, atingidosEmpresas, baseEmpresas, atingidosEducacao, baseEducacao, atingidosSaude, baseSaude, atingidosInfra, baseInfra, baseAgriStats, atingidosAgriStats, conabStats]);

  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    if (camadas.includes("Empresas") && renderEmp?.features) ids.push("empresas-cluster", "empresas-point");
    if (camadas.includes("Educação") && renderEdu?.features) ids.push("educacao-cluster", "educacao-point");
    if (camadas.includes("Saúde") && renderSau?.features) ids.push("saude-cluster", "saude-point");
    if (camadas.includes("Infraestrutura") && !isVisaoGeral) {
      Object.keys(baseInfra).forEach(nomeInfra => {
        const dataGeo = isCenarioAtivo ? atingidosInfra[nomeInfra] : baseInfra[nomeInfra];
        if (dataGeo?.features) {
          const sid = `infra-${slugify(nomeInfra)}`;
          ids.push(`${sid}-fill`, `${sid}-line`, `${sid}-point`);
        }
      });
    }
    return ids;
  }, [camadas, renderEmp, renderEdu, renderSau, baseInfra, atingidosInfra, isVisaoGeral, isCenarioAtivo]);

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

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setHeaderBottom(el.getBoundingClientRect().bottom + 8);
    });
    ro.observe(el);
    setHeaderBottom(el.getBoundingClientRect().bottom + 8);
    return () => ro.disconnect();
  }, []);

  const [initialViewState] = useState(() => permalinkView ?? VISAO_GERAL_VIEW);

  const handleMapMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();

    const params = new URLSearchParams(window.location.search);
    params.set('lng', center.lng.toFixed(5));
    params.set('lat', center.lat.toFixed(5));
    params.set('z', zoom.toFixed(2));
    if (pitch > 0) params.set('p', pitch.toFixed(0));
    else params.delete('p');
    if (bearing !== 0) params.set('b', bearing.toFixed(1));
    else params.delete('b');
    
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  return {
    mapRef, headerRef, headerBottom,
    municipio, setMunicipio, renderMunicipio,
    cenario, setCenario,
    camadas,
    infraAtivas,
    filtroSetor, setFiltroSetor,
    filtroDep, setFiltroDep,
    filtroTipo, setFiltroTipo,
    showPainelAnalise, setShowPainelAnalise,
    showFiltros, setShowFiltros,
    showMancha, setShowMancha,
    showLegenda, setShowLegenda,
    is3D, setIs3D,
    mapReady, setMapReady,
    isLoading,
    baseEmpresas, baseEducacao, baseSaude, baseInfra, infraStats,
    atingidosEmpresas, atingidosEducacao, atingidosSaude, atingidosInfra,
    manchaCenario, manchaRS, limitePA,
    baseAgriStats, atingidosAgriStats, conabStats,
    baseAgriGeo, atingidosAgriGeo,
    allMunAgriStats, allMunAgriAtingidosStats,
    cursor, setCursor,
    popupInfo, setPopupInfo,
    tabAtiva, setTabAtiva,
    showHeatmapEmpresas, setShowHeatmapEmpresas,
    showHeatmapSaude, setShowHeatmapSaude,
    showHeatmapEducacao, setShowHeatmapEducacao,
    showListaEscolas, setShowListaEscolas,
    showListaHospitais, setShowListaHospitais,
    showListaUBS, setShowListaUBS,
    showListaAmbulat, setShowListaAmbulat,
    showListaLogradouros, setShowListaLogradouros,
    showListaEixos, setShowListaEixos,
    isTransitioning, isVisaoGeral, isCenarioAtivo, mostraImpacto, possuiInfra, temCamadaTabular,
    renderEmp, renderEdu, renderSau,
    metricasEmp, metricasEdu, metricasSau,
    setoresUnicos, depsUnicas, tiposUnicos,
    setoresChart,
    setoresEmpregadosChart,
    professoresDepChart,
    interactiveLayerIds,
    toggleCamada, toggleInfra, toggleMenuInfra,
    handleMapClick,
    exportarExcel,
    danosData,
    popData,
    // geo-utils re-exports needed in JSX
    countRuasUnicas, getRuasListPOA, countRuasUnicasPOA, getRotas, getLen,
    handleMapMoveEnd,
    initialViewState,
    // O DashboardMap precisa saber disso para não reenquadrar uma câmera que
    // veio pronta do link (ver ultimoModo3D lá).
    cameraVeioDoLink: permalinkView !== null,
  };
}

export type DashboardState = ReturnType<typeof useDashboard>;
