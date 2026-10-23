import type { FeatureCollection } from "geojson";

interface PopulacaoMunData {
  pop_total: number;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  cenarios: Record<string, { pop_atingida: number; pct_atingida: number }>;
}
export type PopulacaoData = Record<string, PopulacaoMunData>;

interface AreaAtingidaMunData {
  area_km2: number;
  cenarios: Record<string, { area_atingida_km2: number; pct_atingida: number }>;
}
export type AreaAtingidaData = Record<string, AreaAtingidaMunData>;

// Metricas do Painel por tipo de infra (BASE e cada cenario) -- ver
// pipeline/10_infra_stats.py (infraestrutura_painel.json).
export interface InfraPainelMetricas {
  count: number;
  area_m2?: number;
  rotas?: number;
  km?: number;
  ruas_unicas?: number;
  ruas?: string[];
  drenagem?: number;
  iluminacao?: number;
  agua?: number;
  coleta_lix?: number;
  esgoto_plu?: number;
  esgoto_cloacal?: number;
  fossa?: number;
  condominio?: number;
}
interface InfraPainelEntry {
  base: InfraPainelMetricas;
  cenarios: Record<string, InfraPainelMetricas>;
  /** Acumulado por cota-raster ("Todas as cotas"), indice i = cota i+1. */
  por_cota?: InfraPainelMetricas[];
}
export type InfraPainel = Record<string, InfraPainelEntry>;

export interface InfraStatsEntry {
  count_base: number;
  count_atingido: number;
  area_m2_base?: number;
  area_m2_atingido?: number;
}

// Indice {id_do_ponto: {propriedades por RP}} da camada "Dano Físico
// (CLIMADA)" -- SEM geometria (ver pipeline/climada_risco_prototipo.py,
// gerar_indice_dano_pontos). O id é o campo estável de cada setor (id p/
// empresas, co_entidade p/ educação, co_cnes p/ saúde) -- mergeDanoFisico
// (useDanoFisico) casa este índice com os pontos JÁ exibidos no mapa (BASE ou
// ATINGIDOS, conforme o cenário ativo), em vez de desenhar uma coleção
// separada com todos os ~40 mil pontos da cidade.
export type DanoFisicoIndice = Record<string, Record<string, number>>;

export interface ManchaDuracaoClimada {
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  duracao_max_dias: number;
  duracao_media_dias: number;
}

export type FC = FeatureCollection | null;
export type InfraFC = Record<string, FeatureCollection>;
export type AgriStats = Record<string, number> | null;
export type ConabStats = { soja: { area_ha: number }; arroz: { area_ha: number } } | null;

export interface PopupInfo {
  lngLat: [number, number];
  properties: Record<string, unknown>;
  source: string;
}
