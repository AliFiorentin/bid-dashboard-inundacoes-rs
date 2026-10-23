import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FeatureCollection } from "geojson";
import {
  MUNICIPIOS, CENARIOS_CONFIG, AGRI_BOUNDS, AGRI_ANO_BASE, PIORES_CENARIOS, COTAS_CENARIO,
} from "@/lib/constants";
import { slugify, scenarioSlug, mergeGeoJSON } from "@/lib/geo-utils";
import type { InfraStatsEntry, InfraFC, FC, AgriStats, ConabStats, PopupInfo } from "./types";

interface Args {
  municipio: string;
  cenario: string;
  setCenario: Dispatch<SetStateAction<string>>;
  setRenderMunicipio: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setPopupInfo: Dispatch<SetStateAction<PopupInfo | null>>;
  setFiltroSetor: Dispatch<SetStateAction<string>>;
  setFiltroDep: Dispatch<SetStateAction<string>>;
  setFiltroTipo: Dispatch<SetStateAction<string>>;
  setInfraAtivas: Dispatch<SetStateAction<string[]>>;
  setBaseInfra: Dispatch<SetStateAction<InfraFC>>;
  setAtingidosInfra: Dispatch<SetStateAction<InfraFC>>;
  permalinkCenarioRef: React.MutableRefObject<string | null>;
}

/**
 * Carga de dados do município/cenário selecionado: BASE (todos os pontos),
 * ATINGIDOS (pontos dentro da mancha do cenário), mancha e estatísticas de
 * agricultura. A Visão Geral RS agrega os piores cenários de todos os municípios.
 * A infraestrutura é carregada à parte (useInfraData).
 */
export function useScenarioData({
  municipio, cenario, setCenario, setRenderMunicipio, setIsLoading, setPopupInfo,
  setFiltroSetor, setFiltroDep, setFiltroTipo, setInfraAtivas, setBaseInfra, setAtingidosInfra,
  permalinkCenarioRef,
}: Args) {
  const [baseEmpresas, setBaseEmpresas] = useState<FC>(null);
  const [baseEducacao, setBaseEducacao] = useState<FC>(null);
  const [baseSaude, setBaseSaude] = useState<FC>(null);

  const [atingidosEmpresas, setAtingidosEmpresas] = useState<FC>(null);
  const [atingidosEducacao, setAtingidosEducacao] = useState<FC>(null);
  const [atingidosSaude, setAtingidosSaude] = useState<FC>(null);
  const [manchaCenario, setManchaCenario] = useState<FC>(null);
  const [limitePA, setLimitePA] = useState<FC>(null);
  const [baseAgriStats, setBaseAgriStats] = useState<AgriStats>(null);
  const [atingidosAgriStats, setAtingidosAgriStats] = useState<AgriStats>(null);
  const [baseAgriGeo, setBaseAgriGeo] = useState<FC>(null);
  const [atingidosAgriGeo, setAtingidosAgriGeo] = useState<FC>(null);
  const [conabStats, setConabStats] = useState<ConabStats>(null);
  const [allMunAgriStats, setAllMunAgriStats] = useState<Record<string, Record<string, number>> | null>(null);
  const [allMunAgriAtingidosStats, setAllMunAgriAtingidosStats] = useState<Record<string, Record<string, number>> | null>(null);
  const [allMunInfraStats, setAllMunInfraStats] = useState<Record<string, Record<string, InfraStatsEntry>> | null>(null);
  const [manchaRS, setManchaRS] = useState<FC>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setPopupInfo(null);
    setIsLoading(true);

    // Clear all visible layer data immediately so the map is clean during flyTo
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        const infraStats: Record<string, Record<string, InfraStatsEntry>> = {};

        const fetchPromises = MUNICIPIOS.map(async (mun) => {
          const mSlug = slugify(mun);
          const cSlug = scenarioSlug(mun, PIORES_CENARIOS[mun]);
          try {
            const [emp, edu, sau, empAtg, eduAtg, sauAtg, agri, agriAtg, infra] = await Promise.all([
              fetch(`/dados_convertidos/${mSlug}/empresas_BASE.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/educacao_BASE.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/saude_BASE.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/empresas_ATINGIDOS_${cSlug}.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/educacao_ATINGIDOS_${cSlug}.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/saude_ATINGIDOS_${cSlug}.geojson?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/agricultura_stats_BASE.json?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/cenarios/agricultura_stats_${cSlug}.json?v=3`, { signal }).then(r => r.ok ? r.json() : null),
              fetch(`/dados_convertidos/${mSlug}/infraestrutura_stats.json?v=3`, { signal }).then(r => r.ok ? r.json() : null),
            ]);
            if (emp) bEmp.push(emp);
            if (edu) bEdu.push(edu);
            if (sau) bSau.push(sau);
            if (empAtg) aEmp.push(empAtg);
            if (eduAtg) aEdu.push(eduAtg);
            if (sauAtg) aSau.push(sauAtg);
            if (agri) agriStats[mun] = agri;
            if (agriAtg) agriAtingidosStats[mun] = agriAtg;
            if (infra) infraStats[mun] = infra;
          } catch (e) { if ((e as Error).name !== 'AbortError') console.error(e); }
        });

        const manchaRSPromise = fetch("/dados_convertidos/mancha_rs_enchente_2024.geojson", { signal }).then(r => r.ok ? r.json() : null);

        Promise.all([
          ...fetchPromises,
          manchaRSPromise,
          new Promise(res => setTimeout(res, 300))
        ]).then((values) => {
          if (signal.aborted) return;

          setRenderMunicipio("Visão Geral RS");
          setAtingidosInfra({}); setCenario("(nenhum)");
          setBaseAgriStats(null); setAtingidosAgriStats(null); setConabStats(null);
          setBaseInfra({}); setInfraAtivas([]);

          const manchaData = values[values.length - 2];
          setManchaRS(manchaData as FC);
          setBaseEmpresas(mergeGeoJSON(bEmp)); setBaseEducacao(mergeGeoJSON(bEdu)); setBaseSaude(mergeGeoJSON(bSau));
          setAtingidosEmpresas(mergeGeoJSON(aEmp)); setAtingidosEducacao(mergeGeoJSON(aEdu)); setAtingidosSaude(mergeGeoJSON(aSau));
          setAllMunAgriStats(agriStats);
          setAllMunAgriAtingidosStats(agriAtingidosStats);
          setAllMunInfraStats(infraStats);

          setIsLoading(false);
        }).catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });
      };
      carregarVisaoGeral();

      return () => controller.abort();
    }

    const munSlug = slugify(municipio);

    // Decide o cenario JA, sem esperar nenhum fetch -- so' depende de
    // municipio e do permalink (ambos disponiveis na hora). Antes isso so'
    // era decidido dentro do .then() do basePromises, atras do delay
    // artificial abaixo: o efeito de cenario (que busca os dados "atingidos")
    // so' comecava a rodar DEPOIS do delay + fetch principal terminarem, em
    // serie. Decidindo aqui, os dois fetches (principal e atingidos) rodam em
    // paralelo, cortando bastante do tempo ate' os numeros "atingidos"
    // aparecerem na troca de municipio.
    const cenariosDisp = CENARIOS_CONFIG[municipio] || [];
    const desiredCenario = permalinkCenarioRef.current;
    permalinkCenarioRef.current = null;
    // A URL guarda o cenário em slug ("cenario_30m"), mas CENARIOS_CONFIG
    // guarda o rótulo ("Cenário 30m") — comparar os dois direto nunca casa e
    // faz todo permalink cair no primeiro cenário da lista. Em Lajeado e Rio
    // Grande isso trocava o cenário do link em silêncio (e o efeito de URL
    // ainda regravava o slug errado por cima). Casar por slug.
    const initialCenario = cenariosDisp.find(c => slugify(c) === desiredCenario)
      ?? (cenariosDisp.length > 0 ? cenariosDisp[0] : "(nenhum)");
    setCenario(initialCenario);

    // Nenhuma camada de infra vem marcada por padrao -- o usuario escolhe.
    // As metricas de todos os tipos sao pre-carregadas nos efeitos de
    // useInfraData de qualquer forma, entao marcar uma camada depois disso e' instantaneo.
    setInfraAtivas([]);

    const basePromises = Promise.all([
      fetch(`/dados_convertidos/${munSlug}/empresas_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      fetch(`/dados_convertidos/${munSlug}/educacao_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      fetch(`/dados_convertidos/${munSlug}/saude_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      AGRI_BOUNDS[municipio] ? fetch(`/dados_convertidos/${munSlug}/agricultura_stats_BASE.json`, { signal }).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
      fetch(`/dados_convertidos/${munSlug}/limite_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null),
      AGRI_BOUNDS[municipio] ? fetch(`/dados_convertidos/${munSlug}/agricultura_${AGRI_ANO_BASE}_BASE.geojson`, { signal }).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]);

    // Pequeno piso de tempo (nao mais 3s) so' pra evitar um "pisca" caso o
    // fetch responda quase instantaneo (cache do navegador) enquanto a camera
    // ainda esta' voando -- nao trava mais o carregamento por segundos.
    Promise.all([
      basePromises,
      new Promise(res => setTimeout(res, 400))
    ]).then(([[emp, edu, sau, agri, limite, agriGeo]]) => {
      if (signal.aborted) return;

      setRenderMunicipio(municipio);
      // baseInfra/atingidosInfra NAO sao resetados aqui: ja foram zerados na
      // troca de municipio (acima, logo no inicio do efeito) e os efeitos de
      // pre-carga de infra (useInfraData) podem ja ter preenchido eles de novo
      // nesse meio-tempo -- resetar aqui jogaria fora esse trabalho.
      //
      // O mesmo vale para o que pertence ao efeito de cenario (atingidos de
      // agricultura, stats do cenario, CONAB): este callback e' assincrono e
      // roda DEPOIS do efeito de cenario ter buscado esses dados. Zerar aqui
      // apagava a agricultura atingida sem ninguem re-buscar -- em Porto
      // Alegre, onde as bases sao as mais pesadas, isso acontecia sempre e a
      // camada nunca aparecia no mapa.
      setAllMunAgriStats(null); setAllMunAgriAtingidosStats(null); setAllMunInfraStats(null);
      setFiltroSetor("(todos)"); setFiltroDep("(todas)"); setFiltroTipo("(todas)");

      setBaseEmpresas(emp); setBaseEducacao(edu); setBaseSaude(sau);
      setBaseAgriStats(agri);
      setLimitePA(limite);
      setBaseAgriGeo(agriGeo);

      setIsLoading(false);
    }).catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });

    return () => controller.abort();
  }, [municipio]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (municipio === "Visão Geral RS") return; // managed by [municipio] effect
    if (!cenario || cenario === "(nenhum)" || cenario === COTAS_CENARIO) {
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

    return () => controller.abort();
  }, [municipio, cenario]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    baseEmpresas, baseEducacao, baseSaude,
    atingidosEmpresas, setAtingidosEmpresas,
    atingidosEducacao, setAtingidosEducacao,
    atingidosSaude, setAtingidosSaude,
    manchaCenario, manchaRS, limitePA,
    baseAgriStats, atingidosAgriStats, setAtingidosAgriStats, conabStats,
    baseAgriGeo, atingidosAgriGeo,
    allMunAgriStats, allMunAgriAtingidosStats, allMunInfraStats,
  };
}
