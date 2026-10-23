// ─── Tipos — Danos Operacionais (DaLA) ─────────────────────────────────────────
export interface CenarioDanos {
  dias_agudo: number;
  dias_efetivos: number;
  f_interrup: number;
  empresas_vab: number;
  educacao_perdas: number;
  educacao_custo_adicional: number;
  saude_producao: number;
  agricultura_perdas: number;
  total: number;
}
export type DanosData = Record<string, Record<string, CenarioDanos>>;

// ─── Tipos — CLIMADA (protótipo) ───────────────────────────────────────────────
export interface SetorResultado {
  setor: string;
  n_total: number;
  n_atingidos_profundidade_gt_0: number;
  profundidade_media_atingidos_m: number;
  profundidade_max_m: number;
  valor_unitario_brl: number;
  exposicao_total_brl: number;
  dano_fisico_total_brl: number;
  dano_fisico_pct_exposicao: number;
  fonte_curva: string;
  porte_campo: string;
}
export interface CurvaInfo {
  depth: number[];
  mdd: number[];
  porte_campo: string;
  fonte: string;
  reposicao_fonte: string;
}
export interface EaiAnualEsperado {
  empresas: number;
  educacao: number;
  saude: number;
  total: number;
  rps_usados: string[];
}
export interface ProjecaoSetor {
  risco_2025_brl: number;
  risco_2050_brl: number;
  aumento_total_brl: number;
  parcela_crescimento_brl: number;
  parcela_clima_brl: number;
  pct_climatico: number;
}
export interface Projecao2050 {
  premissas: {
    crescimento_anual: number;
    anos_projecao: number;
    fator_crescimento: number;
    crescimento_fonte: string;
    rp_remapeamento_fonte: string;
    rp_remapeamento: Record<string, { freq_hist: number; freq_2050: number; rp_futuro_equivalente: number }>;
    rps_usados: string[];
  };
  por_setor: Record<string, ProjecaoSetor>;
  total: ProjecaoSetor;
}
export interface RpPorCota {
  frequencia: { metodo: string; serie: string; fonte: string; datum: string };
  rps: Record<string, { cota_regua_m: number; cota_raster_m: number }>;
  rps_acima_do_ultimo_raster: string[];
  cota_cobertura_raster_m: [number, number];
}
export interface ClimadaData {
  // Só nos municípios cujo RP foi derivado de rasters por cota (climada_rp_por_cota.py).
  rp_por_cota?: RpPorCota;
  projecao_2050?: Projecao2050 | null;
  premissas: {
    poa_calibration_factor: number;
    cub_comercial_rs: number;
    cub_institucional_rs: number;
    cub_industrial_rs: number;
    cub_fonte: string;
    cnae_industria_fonte: string;
    n_empresas_industria: number;
    n_empresas_total: number;
    area_m2_por_pessoa: number;
    area_m2_por_pessoa_fonte: string;
    area_escola_padrao_m2: number;
    area_escola_padrao_fonte: string;
    valor_escola_padrao_brl: number;
    area_por_sala_m2: number;
    area_por_sala_fonte: string;
    turnos_padrao: number;
    lotacao_infantil: number;
    lotacao_fundamental: number;
    lotacao_medio: number;
    lotacao_fonte: string;
    conteudo_fonte: string;
    multiplicador_empresas: number;
    multiplicador_empresas_industria: number;
    multiplicador_saude: number;
    multiplicador_educacao: number;
    curvas: Record<string, CurvaInfo>;
  };
  resultados_por_rp: Record<string, Record<string, SetorResultado>>;
  eai_anual_esperado: EaiAnualEsperado | null;
}

// ─── Tipos — CLIMADA por cota do rio (Lajeado, Eldorado do Sul, Porto Alegre) ─────────────────────────────────
export interface CotaSetor {
  n_total: number;
  n_atingidos: number;
  profundidade_media_atingidos_m: number;
  profundidade_max_m: number;
  exposicao_total_brl: number;
  dano_fisico_brl_poa: number;       // curvas com o fator de calibração de Porto Alegre
  dano_fisico_brl_jrc_crua: number;  // sensibilidade: curva JRC sem recalibração
}
export interface CotasData {
  municipio: string;
  premissas: {
    calibracao: string;
    poa_calibration_factor: number;
    raster_nota: string;
  };
  diagnostico: {
    pontos_molhados_na_cota_mais_baixa: Record<string, number>;
    pontos_fora_do_raster: Record<string, number>;
    pontos_excluidos_fora_do_municipio?: Record<string, number>;
    n_pontos: Record<string, number>;
    coordenadas_repetidas: Record<string, { n_pontos: number; n_coordenadas_unicas: number; maior_pilha: number }>;
    cota_mais_baixa: string;
    cota_mais_alta: string;
  };
  resultados_por_cota: Record<string, Record<string, CotaSetor>>;
}

// ─── Tipos — medidas de adaptação (climada_medidas.py) ─────────────────────────
export interface MedidaResultado {
  id: string;
  nome: string;
  mecanismo: string;
  eai_evitado_brl: number;
  pct_evitado: number;
  eai_evitado_sem_cauda_brl: number;
  pct_evitado_sem_cauda: number;
  eai_2050_evitado_brl: number | null;
  evitado_por_setor_brl: Record<string, number>;
  fonte?: string;
  fonte_url?: string | null;
  custo_beneficio?: {
    custo_brl: number | null;
    custo_min_brl?: number;
    bc_max?: number;
    bc_sem_cauda_max?: number;
    custo_equilibrio_brl?: number;
    custo_fonte: string;
    custo_descricao?: string;
    custo_fonte_url?: string | null;
    setores_com_custo: string[];
    beneficio_vp_brl: number;
    beneficio_vp_sem_cauda_brl: number;
    bc: number | null;
    bc_sem_cauda: number | null;
  };
}
export interface MedidasMun {
  base: { eai_brl: number; eai_sem_cauda_brl: number; eai_2050_brl: number; rps: string[] };
  custo_beneficio_premissas?: { cambio_brl_usd: number; taxa_desconto: number; horizonte: [number, number]; fonte_custos: string };
  medidas: MedidaResultado[];
}

// ─── Tipos — CLIMADA sem curva de dano (climada_exposicao.py) ──────────────────
export interface ExposicaoSetor {
  n_total: number;
  n_atingidos: number;
  valor_exposto_atingido_brl: number;
  exposicao_total_brl: number;
  profundidade_media_atingidos_m: number;
  profundidade_max_m: number;
  faixas_valor_brl: Record<string, number>;
}
export interface ExposicaoMun {
  resultados_por_rp: Record<string, Record<string, ExposicaoSetor>>;
  rp_por_cota: {
    rps: Record<string, { cota_regua_m: number }>;
    rps_acima_do_ultimo_raster: string[];
    cota_cobertura_raster_m: [number, number];
  };
  eai_exposto: { empresas: number; educacao: number; saude: number; total: number };
  eai_exposto_sem_cauda_brl: number;
  projecao_2050: Projecao2050 | null;
  medidas: MedidasMun;
  por_cota: Record<string, Record<string, ExposicaoSetor>>;
  detalhe?: DetalheCota;
}

// ─── Tipos — indicadores do painel por categoria e por cota (climada_cota_detalhe.py) ──
export interface DetalheGrupo { nome: string; n: number; valor_exposto_brl: number; empregados?: number; massa_salarial_brl?: number; salario_medio_brl?: number; leitos?: number; profissionais?: number; matriculas?: number; docentes?: number }
export interface DetalheCota {
  ano_agricultura: number;
  area_agricola_total_ha: Record<string, number>;
  totais: Record<string, { n: number }>;
  maior_pilha?: Record<string, { n_pontos: number; ruas_distintas: number; bairros_distintos: number; valor_reposicao_brl: number; cota_entrada?: string; valor_exposto_antes_brl?: number; valor_exposto_na_entrada_brl?: number }>;
  por_cota: Record<string, {
    empresas: { n: number; empregados: number; massa_salarial_brl: number; salario_medio_brl: number; valor_exposto_brl: number; setores: DetalheGrupo[] };
    saude: { n: number; leitos: number; profissionais: number; valor_exposto_brl: number; staff: Record<string, number>; tipos: DetalheGrupo[] };
    educacao: { n: number; matriculas: number; docentes: number; valor_exposto_brl: number; etapas: Record<string, number>; dependencias: DetalheGrupo[] };
    agricultura?: { area_ha: number; culturas: Record<string, number> };
  }>;
}
