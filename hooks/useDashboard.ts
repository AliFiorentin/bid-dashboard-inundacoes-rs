import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { INFRAESTRUTURA_CONFIG, INFRA_TAMANHOS_MB } from "@/lib/constants";
import { scenarioSlug, countRuasUnicas, getRuasListPOA, countRuasUnicasPOA, getRotas, getLen } from "@/lib/geo-utils";
import { exportarExcel as exportarExcelArquivo } from "@/lib/exportar-excel";
import type { InfraFC, InfraPainelMetricas, PopupInfo } from "@/hooks/dashboard/types";
import { usePermalink } from "@/hooks/dashboard/usePermalink";
import { useMapCamera } from "@/hooks/dashboard/useMapCamera";
import { useCotas, useCotaFiltro, useBaseDentroDoMunicipio } from "@/hooks/dashboard/useCotas";
import { useStaticData } from "@/hooks/dashboard/useStaticData";
import { useScenarioData } from "@/hooks/dashboard/useScenarioData";
import { useInfraData } from "@/hooks/dashboard/useInfraData";
import { useDanoFisico } from "@/hooks/dashboard/useDanoFisico";
import { useDashboardDerived } from "@/hooks/dashboard/useDashboardDerived";
import { useMapInteraction } from "@/hooks/dashboard/useMapInteraction";

/**
 * Estado central do dashboard. Orquestra os hooks de `hooks/dashboard/`:
 * seleção (município/cenário/camadas) mora aqui; carga de dados, permalink,
 * câmera, cotas, infra, dano físico e derivados ficam nos hooks especializados.
 *
 * A ORDEM das chamadas importa: os efeitos rodam na ordem de declaração, e
 * useInfraData precisa vir depois de useScenarioData (ver comentário lá).
 */
export function useDashboard() {
  const mapRef = useRef<MapRef>(null);
  const headerRef = useRef<HTMLElement>(null);

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

  // Abaixo de lg o painel de análise vira bottom sheet e nasce recolhido para o mapa ocupar a
  // tela (os filtros nascem abertos e se recolhem sozinhos, ver FiltersPanel).
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px), (pointer: fine)").matches) {
      // Só no mount: ler o viewport no useState quebraria a hidratação (o servidor assume desktop).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPainelAnalise(false);
    }
  }, []);

  const [baseInfra, setBaseInfra] = useState<InfraFC>({});
  const [atingidosInfra, setAtingidosInfra] = useState<InfraFC>({});

  const [cursor, setCursor] = useState<string>("grab");
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

  const [tabAtiva, setTabAtiva] = useState<string>("resumo");
  const [showMancha, setShowMancha] = useState<boolean>(true);
  const [showLegenda, setShowLegenda] = useState<boolean>(false);
  const [showHeatmapEmpresas, setShowHeatmapEmpresas] = useState<boolean>(false);
  const [showHeatmapSaude, setShowHeatmapSaude] = useState<boolean>(false);
  const [showHeatmapEducacao, setShowHeatmapEducacao] = useState<boolean>(false);
  const [showListaEscolas, setShowListaEscolas] = useState(false);
  const [showListaHospitais, setShowListaHospitais] = useState(false);
  const [showListaUBS, setShowListaUBS] = useState(false);
  const [showListaAmbulat, setShowListaAmbulat] = useState(false);
  const [showListaLogradouros, setShowListaLogradouros] = useState(false);
  const [showListaEixos, setShowListaEixos] = useState(false);

  const { permalinkCenarioRef, permalinkView, initialViewState, handleMapMoveEnd } =
    usePermalink({ municipio, cenario, setMunicipio, mapRef });

  // Mora aqui, e não no DashboardMap, porque o efeito de troca de município
  // liga/desliga o 3D junto com o reenquadramento.
  //
  // Nasce ligado quando o link compartilhado traz inclinação: sem isso o efeito
  // de terreno do DashboardMap veria is3D=false e achataria a câmera recém
  // restaurada, jogando fora justamente o enquadramento que o link carregava.
  const [is3D, setIs3D] = useState<boolean>(() => (permalinkView?.pitch ?? 0) > 0);

  const { mapReady, setMapReady, headerBottom } =
    useMapCamera({ mapRef, headerRef, municipio, showPainelAnalise, permalinkView, setIs3D });

  const cotas = useCotas(municipio, cenario);
  const { cotasAtivo, cotaRaster, cotaDetalhe, cotaPausada, nCotasAtingidas } = cotas;

  const { popData, areaData, manchaDuracaoClimada } = useStaticData();

  const scenario = useScenarioData({
    municipio, cenario, setCenario, setRenderMunicipio, setIsLoading, setPopupInfo,
    setFiltroSetor, setFiltroDep, setFiltroTipo, setInfraAtivas, setBaseInfra, setAtingidosInfra,
    permalinkCenarioRef,
  });
  const {
    baseEmpresas, baseEducacao, baseSaude,
    atingidosEmpresas, atingidosEducacao, atingidosSaude,
    manchaCenario, manchaRS, limitePA,
    baseAgriStats, atingidosAgriStats, conabStats, baseAgriGeo, atingidosAgriGeo,
    allMunAgriStats, allMunAgriAtingidosStats, allMunInfraStats,
  } = scenario;

  useCotaFiltro({
    cotas, baseEmpresas, baseEducacao, baseSaude,
    setAtingidosEmpresas: scenario.setAtingidosEmpresas,
    setAtingidosEducacao: scenario.setAtingidosEducacao,
    setAtingidosSaude: scenario.setAtingidosSaude,
    setAtingidosAgriStats: scenario.setAtingidosAgriStats,
  });

  const { infraPainel } = useInfraData({ municipio, cenario, infraAtivas, setBaseInfra, setAtingidosInfra, setIsLoading });

  const dano = useDanoFisico({ municipio, renderMunicipio, baseEmpresas, baseEducacao, baseSaude });

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
  const isCenarioAtivo = isVisaoGeral ? true : ((cenario !== "(nenhum)" && manchaCenario != null) || cotaPausada);

  // "Todas as cotas" em reprodução: a água avança sozinha, então os pontos (e seus clusters) ficam
  // ocultos para não se sobreporem à mancha em transição; ao pausar, aparecem só os atingidos.
  const cotasTocando = cotasAtivo && cotaRaster.tocando;
  // Em "Todas as cotas" a base exclui os pontos fora do município, como a aba "Por cota" (totais iguais).
  const baseEmpMun = useBaseDentroDoMunicipio(cotas, "empresas", baseEmpresas);
  const baseEduMun = useBaseDentroDoMunicipio(cotas, "educacao", baseEducacao);
  const baseSauMun = useBaseDentroDoMunicipio(cotas, "saude", baseSaude);
  const showEmp = cotasTocando ? null : isCenarioAtivo ? atingidosEmpresas : baseEmpMun;
  const showEdu = cotasTocando ? null : isCenarioAtivo ? atingidosEducacao : baseEduMun;
  const showSau = cotasTocando ? null : isCenarioAtivo ? atingidosSaude : baseSauMun;

  const isTransitioning = municipio !== renderMunicipio;

  const derived = useDashboardDerived({
    isTransitioning, showEmp, showEdu, showSau, filtroSetor, filtroDep, filtroTipo,
    baseEmpresas: baseEmpMun, baseEducacao: baseEduMun, baseSaude: baseSauMun, atingidosEmpresas, atingidosEducacao, atingidosSaude,
  });
  const { renderEmp, renderEdu, renderSau } = derived;

  // A aba Infraestrutura fica disponivel sempre que o municipio tem infra
  // configurada (INFRAESTRUTURA_CONFIG) ou estamos na Visao Geral (que
  // agrega os stats pre-calculados de todos os municipios -- ver
  // pipeline/10_infra_stats.py), independente de camadas/infraAtivas -- as
  // KPIs de tipos leves aparecem la mesmo sem nenhuma camada marcada (ver
  // InfraTab.tsx). So reseta se o municipio realmente nao tem infra.
  useEffect(() => {
    if (tabAtiva === "infra" && !isVisaoGeral && (INFRAESTRUTURA_CONFIG[municipio]?.length ?? 0) === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTabAtiva("resumo");
    }
    if (tabAtiva === "agricultura" && !camadas.includes("Agricultura")) {
      setTabAtiva("resumo");
    }
  }, [camadas, isVisaoGeral, tabAtiva, municipio]);

  // Metricas de infra "atingidas" por tipo: da cota-raster (Todas as cotas) ou do cenario.
  const infraAtg = useMemo(() => {
    const out: Record<string, InfraPainelMetricas | undefined> = {};
    if (!infraPainel) return out;
    const slugCen = scenarioSlug(municipio, cenario);
    Object.entries(infraPainel).forEach(([tipo, e]) => {
      out[tipo] = cotaPausada
        ? (nCotasAtingidas === 0 ? { count: 0 } : e.por_cota?.[nCotasAtingidas - 1])
        : e.cenarios[slugCen];
    });
    return out;
  }, [infraPainel, municipio, cenario, cotaPausada, nCotasAtingidas]);
  // Area (km2) sob agua na cota atual; null fora desse modo.
  const areaCotaKm2 = cotaPausada && cotaRaster.meta?.area_por_cota_km2
    ? (nCotasAtingidas === 0 ? 0 : cotaRaster.meta.area_por_cota_km2[nCotasAtingidas - 1] ?? 0)
    : null;
  const possuiInfra = INFRAESTRUTURA_CONFIG[municipio] && INFRAESTRUTURA_CONFIG[municipio].length > 0;
  const mostraImpacto = isVisaoGeral || isCenarioAtivo;
  const temCamadaTabular = camadas.includes("Empresas") || camadas.includes("Educação") || camadas.includes("Saúde") || camadas.includes("Agricultura") || camadas.includes("Infraestrutura") || camadas.includes("População");

  const exportarExcel = useCallback(() => exportarExcelArquivo({
    camadas, municipio, cenario, isVisaoGeral, isCenarioAtivo, infraAtivas,
    atingidosEmpresas, baseEmpresas, atingidosEducacao, baseEducacao, atingidosSaude, baseSaude,
    atingidosInfra, baseInfra, baseAgriStats, atingidosAgriStats, conabStats,
  }), [camadas, municipio, cenario, isVisaoGeral, isCenarioAtivo, infraAtivas, atingidosEmpresas, baseEmpresas, atingidosEducacao, baseEducacao, atingidosSaude, baseSaude, atingidosInfra, baseInfra, baseAgriStats, atingidosAgriStats, conabStats]);

  const { interactiveLayerIds, handleMapClick } = useMapInteraction({
    mapRef, camadas, infraAtivas, isVisaoGeral, isCenarioAtivo,
    showDanoFisico: dano.showDanoFisico, renderMunicipio,
    renderEmp, renderEdu, renderSau,
    danoFisicoEmpresas: dano.danoFisicoEmpresas,
    danoFisicoEducacao: dano.danoFisicoEducacao,
    danoFisicoSaude: dano.danoFisicoSaude,
    baseInfra, atingidosInfra, setPopupInfo,
  });

  return {
    mapRef, mapReady, setMapReady, headerRef, headerBottom,
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
    isLoading,
    baseEmpresas, baseEducacao, baseSaude, baseInfra, infraPainel, infraAtg, areaCotaKm2,
    atingidosEmpresas, atingidosEducacao, atingidosSaude, atingidosInfra,
    manchaCenario, manchaRS, limitePA,
    baseAgriStats, atingidosAgriStats, conabStats,
    baseAgriGeo, atingidosAgriGeo,
    allMunAgriStats, allMunAgriAtingidosStats, allMunInfraStats,
    cursor, setCursor,
    popupInfo, setPopupInfo,
    tabAtiva, setTabAtiva,
    showHeatmapEmpresas, setShowHeatmapEmpresas,
    showHeatmapSaude, setShowHeatmapSaude,
    showHeatmapEducacao, setShowHeatmapEducacao,
    showDanoFisico: dano.showDanoFisico, setShowDanoFisico: dano.setShowDanoFisico,
    rpDanoFisico: dano.rpDanoFisico, setRpDanoFisico: dano.setRpDanoFisico,
    danoFisicoEmpresas: dano.danoFisicoEmpresas,
    danoFisicoEducacao: dano.danoFisicoEducacao,
    danoFisicoSaude: dano.danoFisicoSaude,
    manchaDuracaoClimada,
    cotasAtivo, cotaRaster, cotaDetalhe,
    showListaEscolas, setShowListaEscolas,
    showListaHospitais, setShowListaHospitais,
    showListaUBS, setShowListaUBS,
    showListaAmbulat, setShowListaAmbulat,
    showListaLogradouros, setShowListaLogradouros,
    showListaEixos, setShowListaEixos,
    isTransitioning, isVisaoGeral, isCenarioAtivo, mostraImpacto, possuiInfra, temCamadaTabular,
    renderEmp, renderEdu, renderSau,
    metricasEmp: derived.metricasEmp, metricasEdu: derived.metricasEdu, metricasSau: derived.metricasSau,
    setoresUnicos: derived.setoresUnicos, depsUnicas: derived.depsUnicas, tiposUnicos: derived.tiposUnicos,
    setoresChart: derived.setoresChart,
    setoresEmpregadosChart: derived.setoresEmpregadosChart,
    professoresDepChart: derived.professoresDepChart,
    interactiveLayerIds,
    toggleCamada, toggleInfra, toggleMenuInfra,
    handleMapClick,
    exportarExcel,
    popData,
    areaData,
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
