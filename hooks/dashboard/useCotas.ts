import { useState, useEffect, useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { useCotaRaster } from "@/hooks/useCotaRaster";
import type { CotaPontos, DetalheCotaMun } from "@/lib/cotas-types";
import { COTAS_CENARIO, COTAS_MUNICIPIOS } from "@/lib/constants";
import { slugify } from "@/lib/geo-utils";

/** Cota pausada guardada no link (?cota=27.05). */
function lerCotaDaURL(): number | null {
  if (typeof window === "undefined") return null;
  const v = parseFloat(new URLSearchParams(window.location.search).get("cota") ?? "");
  return Number.isFinite(v) ? v : null;
}

/**
 * Cenário "Todas as cotas": água avançando por cota (raster) + painel com os
 * valores da cota atual. Devolve o estado derivado usado pelo resto do dashboard.
 */
export function useCotas(municipio: string, cenario: string) {
  const cotasAtivo = COTAS_MUNICIPIOS.includes(municipio) && cenario === COTAS_CENARIO;
  // Link com ?cota=: abre pausado nessa cota; sem ele, a água avança sozinha.
  const [cotaPermalink] = useState<number | null>(() => lerCotaDaURL());
  const cotaRaster = useCotaRaster(cotasAtivo ? slugify(municipio) : null, {
    autoplay: cotaPermalink === null,
    cotaInicial: cotaPermalink === null ? undefined : String(cotaPermalink),
  });
  const cotaUrl = cotasAtivo && !cotaRaster.tocando && cotaRaster.cota !== null ? cotaRaster.cota : null;
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (cotaUrl !== null) params.set("cota", cotaUrl.toFixed(2));
      else params.delete("cota");
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [cotaUrl]);
  const [cotaDetalhe, setCotaDetalhe] = useState<DetalheCotaMun | null>(null);
  // Cota de entrada de cada ponto (5 m, igual à aba "Por cota"); sem ele cai na amostragem do raster reduzido.
  const [cotaPontos, setCotaPontos] = useState<CotaPontos | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCotaPontos(null);
    if (!cotasAtivo) return;
    const controller = new AbortController();
    fetch(`/dados_convertidos/${slugify(municipio)}/cota_pontos.json`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!controller.signal.aborted) setCotaPontos(d); })
      .catch(e => { if ((e as Error).name !== "AbortError") console.error(e); });
    return () => controller.abort();
  }, [cotasAtivo, municipio]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCotaDetalhe(null);
    if (!cotasAtivo) return;
    const controller = new AbortController();
    fetch(`/dados_convertidos/climada_cota_detalhe_${slugify(municipio)}.json`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!controller.signal.aborted) setCotaDetalhe(d); })
      .catch(e => { if ((e as Error).name !== "AbortError") console.error(e); });
    return () => controller.abort();
  }, [cotasAtivo, municipio]);

  // Cota pausada: as abas (Resumo, Empresas, Educação, Saúde, Agricultura) passam a mostrar o que
  // está sob água naquela cota. Cada ponto das bases é amostrado no raster de cota de alagamento
  // (alaga se o índice da 1ª cota molhada <= nº de cotas já atingidas).
  // Nome histórico: vale também em reprodução -- as abas acompanham a cota do slider enquanto a água avança.
  const cotaPausada = cotasAtivo && cotaRaster.cota !== null && cotaRaster.meta !== null;
  const nCotasAtingidas = cotaRaster.meta && cotaRaster.cota !== null
    ? cotaRaster.meta.cotas.filter(c => c <= cotaRaster.cota! + 1e-6).length
    : 0;

  return { cotasAtivo, cotaRaster, cotaDetalhe, cotaPontos, cotaPausada, nCotasAtingidas };
}

type Setor = "empresas" | "educacao" | "saude";

/** Índices por ponto de um setor, só se alinhados com a BASE carregada (mesmo nº de pontos). */
function idxDoSetor(pontos: CotaPontos | null, setor: Setor, fc: FeatureCollection | null): number[] | null {
  const idx = pontos?.idx[setor];
  if (!idx || !fc || !Array.isArray(fc.features) || idx.length !== fc.features.length) return null;
  return idx;
}

/**
 * Base do setor SEM os pontos geocodificados fora do município (os mesmos que a aba "Por cota" exclui),
 * para os totais ("de N") baterem entre as abas. Fora do cenário "Todas as cotas" devolve a base inteira.
 */
export function useBaseDentroDoMunicipio(cotas: { cotasAtivo: boolean; cotaPontos: CotaPontos | null }, setor: Setor, base: FeatureCollection | null) {
  const { cotasAtivo, cotaPontos } = cotas;
  return useMemo(() => {
    const idx = cotasAtivo ? idxDoSetor(cotaPontos, setor, base) : null;
    if (!idx || !base) return base;
    return { ...base, features: base.features.filter((_, i) => idx[i] >= 0) };
  }, [cotasAtivo, cotaPontos, setor, base]);
}

type Cotas = ReturnType<typeof useCotas>;

interface FiltroArgs {
  cotas: Cotas;
  baseEmpresas: FeatureCollection | null;
  baseEducacao: FeatureCollection | null;
  baseSaude: FeatureCollection | null;
  setAtingidosEmpresas: (fc: FeatureCollection | null) => void;
  setAtingidosEducacao: (fc: FeatureCollection | null) => void;
  setAtingidosSaude: (fc: FeatureCollection | null) => void;
  setAtingidosAgriStats: (s: Record<string, number> | null) => void;
}

/** Com a cota pausada, "atingidos" = pontos do BASE amostrados sob a água naquela cota. */
export function useCotaFiltro({
  cotas, baseEmpresas, baseEducacao, baseSaude,
  setAtingidosEmpresas, setAtingidosEducacao, setAtingidosSaude, setAtingidosAgriStats,
}: FiltroArgs) {
  const { cotasAtivo, cotaRaster, cotaDetalhe, cotaPontos, cotaPausada, nCotasAtingidas } = cotas;
  const amostrarCota = cotaRaster.amostrar;
  useEffect(() => {
    if (!cotasAtivo) return;
    // Atingido na cota j: 1 <= k <= j, com k = cota de entrada do ponto (cota_pontos.json, 5 m, igual à
    // aba "Por cota"). Sem esse arquivo (ou desalinhado com a BASE), cai na amostragem do raster reduzido.
    const filtra = (fc: FeatureCollection | null, setor: Setor): FeatureCollection | null => {
      if (!fc || !Array.isArray(fc.features)) return null;
      const idx = idxDoSetor(cotaPontos, setor, fc);
      return { ...fc, features: fc.features.filter((f, i) => {
        if (idx) return idx[i] > 0 && idx[i] <= nCotasAtingidas;
        const g = f.geometry as { type: string; coordinates: number[] } | null;
        if (!g || g.type !== "Point") return false;
        const k = amostrarCota(g.coordinates[0], g.coordinates[1]);
        return k > 0 && k <= nCotasAtingidas;
      }) };
    };
    setAtingidosEmpresas(cotaPausada ? filtra(baseEmpresas, "empresas") : null);
    setAtingidosEducacao(cotaPausada ? filtra(baseEducacao, "educacao") : null);
    setAtingidosSaude(cotaPausada ? filtra(baseSaude, "saude") : null);
    const culturas = cotaDetalhe?.por_cota[Object.keys(cotaDetalhe.por_cota).filter(c => parseFloat(c) <= (cotaRaster.cota ?? 0) + 1e-6).sort((a, b) => parseFloat(a) - parseFloat(b)).pop() ?? ""]?.agricultura?.culturas;
    setAtingidosAgriStats(cotaPausada ? (culturas ?? {}) : null);
  }, [cotasAtivo, cotaPausada, nCotasAtingidas, amostrarCota, baseEmpresas, baseEducacao, baseSaude, cotaDetalhe, cotaPontos]); // eslint-disable-line react-hooks/exhaustive-deps
}
