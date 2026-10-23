import { useState, useEffect } from "react";
import type { FeatureCollection } from "geojson";
import { useCotaRaster } from "@/hooks/useCotaRaster";
import type { DetalheCotaMun } from "@/lib/cotas-types";
import { COTAS_CENARIO, COTAS_MUNICIPIOS } from "@/lib/constants";
import { slugify } from "@/lib/geo-utils";

/**
 * Cenário "Todas as cotas": água avançando por cota (raster) + painel com os
 * valores da cota atual. Devolve o estado derivado usado pelo resto do dashboard.
 */
export function useCotas(municipio: string, cenario: string) {
  const cotasAtivo = COTAS_MUNICIPIOS.includes(municipio) && cenario === COTAS_CENARIO;
  const cotaRaster = useCotaRaster(cotasAtivo ? slugify(municipio) : null, { autoplay: true });
  const [cotaDetalhe, setCotaDetalhe] = useState<DetalheCotaMun | null>(null);
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
  // (alaga se o índice da 1ª cota molhada <= nº de cotas já atingidas). Em reprodução, volta ao total.
  const cotaPausada = cotasAtivo && !cotaRaster.tocando && cotaRaster.cota !== null && cotaRaster.meta !== null;
  const nCotasAtingidas = cotaRaster.meta && cotaRaster.cota !== null
    ? cotaRaster.meta.cotas.filter(c => c <= cotaRaster.cota! + 1e-6).length
    : 0;

  return { cotasAtivo, cotaRaster, cotaDetalhe, cotaPausada, nCotasAtingidas };
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
  const { cotasAtivo, cotaRaster, cotaDetalhe, cotaPausada, nCotasAtingidas } = cotas;
  const amostrarCota = cotaRaster.amostrar;
  useEffect(() => {
    if (!cotasAtivo) return;
    const filtra = (fc: FeatureCollection | null): FeatureCollection | null => {
      if (!fc || !Array.isArray(fc.features)) return null;
      return { ...fc, features: fc.features.filter((f) => {
        const g = f.geometry as { type: string; coordinates: number[] } | null;
        if (!g || g.type !== "Point") return false;
        const k = amostrarCota(g.coordinates[0], g.coordinates[1]);
        return k > 0 && k <= nCotasAtingidas;
      }) };
    };
    setAtingidosEmpresas(cotaPausada ? filtra(baseEmpresas) : null);
    setAtingidosEducacao(cotaPausada ? filtra(baseEducacao) : null);
    setAtingidosSaude(cotaPausada ? filtra(baseSaude) : null);
    const culturas = cotaDetalhe?.por_cota[Object.keys(cotaDetalhe.por_cota).filter(c => parseFloat(c) <= (cotaRaster.cota ?? 0) + 1e-6).sort((a, b) => parseFloat(a) - parseFloat(b)).pop() ?? ""]?.agricultura?.culturas;
    setAtingidosAgriStats(cotaPausada ? (culturas ?? {}) : null);
  }, [cotasAtivo, cotaPausada, nCotasAtingidas, amostrarCota, baseEmpresas, baseEducacao, baseSaude, cotaDetalhe]); // eslint-disable-line react-hooks/exhaustive-deps
}
