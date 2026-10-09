"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import katex from "katex";
import { TrendingDown, FlaskConical } from "lucide-react";
import { HeaderLogos } from "@/components/HeaderLogos";
import { cenarioLabel } from "@/lib/constants";

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
}

// ─── Constantes visuais — Danos Operacionais ───────────────────────────────────
const MUN_COLORS: Record<string, string> = {
  "Eldorado do Sul": "#055071",
  "Lajeado":         "#2da8cc",
  "Porto Alegre":    "#e35d4b",
  "Rio Grande":      "#4d9e3a",
};
const COMP_COLORS = {
  empresas:    "#055071",
  educacao:    "#2da8cc",
  saude:       "#e35d4b",
  agricultura: "#4d9e3a",
};
const DIAS_OPCOES = [30, 45, 60] as const;
type DiasOpcao = (typeof DIAS_OPCOES)[number];

// ─── Constantes visuais — CLIMADA ───────────────────────────────────────────────
const SETOR_LABEL: Record<string, string> = { empresas: "Empresas", educacao: "Educação", saude: "Saúde" };
const SETOR_COLORS: Record<string, string> = { empresas: "#055071", educacao: "#2da8cc", saude: "#e35d4b" };
const RP_ORDER = ["RP10", "RP20", "RP50", "RP75", "RP100", "RP200", "RP500"];
const RP_ANOS: Record<string, string> = {
  RP10: "10 anos", RP20: "20 anos", RP50: "50 anos", RP75: "75 anos",
  RP100: "100 anos", RP200: "200 anos", RP500: "500 anos",
};
const RP_PROBABILIDADE: Record<string, string> = {
  RP10: "10%", RP20: "5%", RP50: "2%", RP75: "1,3%",
  RP100: "1%", RP200: "0,5%", RP500: "0,2%",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmtBRL(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2).replace(".", ",")} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function scaleTo(v: CenarioDanos, dias: number): CenarioDanos {
  const s = dias / v.dias_efetivos;
  const emp = v.empresas_vab * s;
  const edu = v.educacao_perdas * s;
  const eduAdic = v.educacao_custo_adicional * s;
  const sau = v.saude_producao * s;
  const agr = v.agricultura_perdas; // custo fixo, independe da duração
  return {
    dias_agudo: v.dias_agudo,
    dias_efetivos: dias,
    f_interrup: dias / 365,
    empresas_vab: emp,
    educacao_perdas: edu,
    educacao_custo_adicional: eduAdic,
    saude_producao: sau,
    agricultura_perdas: agr,
    total: emp + edu + eduAdic + sau + agr,
  };
}

function eaiValor(eai: EaiAnualEsperado, setor: string): number {
  if (setor === "empresas") return eai.empresas;
  if (setor === "educacao") return eai.educacao;
  if (setor === "saude") return eai.saude;
  return 0;
}

// ─── Componente principal ───────────────────────────────────────────────────────
export function DanosClient({ dados, dadosClimada: climadaPA, dadosClimadaMun, dadosCotas: cotasPorMun, dadosMedidas, dadosExposicao }: { dados: DanosData; dadosClimada: ClimadaData | null; dadosClimadaMun: Record<string, ClimadaData>; dadosCotas: Record<string, CotasData>; dadosMedidas: Record<string, MedidasMun>; dadosExposicao: Record<string, ExposicaoMun> }) {
  const [aba, setAba] = useState<"dala" | "climada">("dala");
  const [dias, setDias] = useState<DiasOpcao>(30);
  const [rp, setRp] = useState("RP200");
  // Município e visão da aba CLIMADA: por período de retorno (RP) ou por cota do rio.
  const [munClimada, setMunClimada] = useState("Porto Alegre");
  const [visao, setVisao] = useState<"rp" | "cota">("rp");
  const [cota, setCota] = useState("29.45");

  // Deep-link opcional: /danos?aba=climada abre direto na aba CLIMADA (ex.: botão do header do mapa).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("aba") === "climada" && (climadaPA || Object.keys(cotasPorMun).length)) setAba("climada");
  }, [climadaPA, cotasPorMun]);

  // ── Dados escalados (Danos Operacionais) para a duração selecionada ──
  const dadosEscalados: DanosData = Object.fromEntries(
    Object.entries(dados).map(([mun, cens]) => [
      mun,
      Object.fromEntries(
        Object.entries(cens).map(([cen, v]) => [cen, scaleTo(v, dias)])
      ),
    ])
  );

  const CENARIOS_VISAO_GERAL: Record<string, string> = {
    "Eldorado do Sul": "Cenario ADA",
    "Lajeado":         "Cenario 27m",
    "Porto Alegre":    "Climada Evento 2024",
    "Rio Grande":      "Cenario Maio 2024",
  };

  const pioresCenarios = Object.entries(dadosEscalados).map(([mun, cens]) => {
    const cenarioFixo = CENARIOS_VISAO_GERAL[mun];
    const entry = cenarioFixo && cens[cenarioFixo]
      ? [cenarioFixo, cens[cenarioFixo]] as [string, CenarioDanos]
      : Object.entries(cens).reduce((acc, cur) => (cur[1].total > acc[1].total ? cur : acc));
    return { mun, cenNome: entry[0], cenVal: entry[1] };
  });

  const todosCenarios = Object.entries(dadosEscalados).flatMap(([mun, cens]) =>
    Object.entries(cens).map(([cen, v]) => ({ mun, cen, v }))
  );
  const maxTotalDala = Math.max(...todosCenarios.map((c) => c.v.total));

  // ── Município ativo da aba CLIMADA ──
  // Porto Alegre: RPs do estudo de risco de inundação de Porto Alegre (UNU-EHS). Lajeado: RPs derivados das cotas.
  // Eldorado do Sul fica fora da aba por enquanto (os JSONs existem, mas a frequência do
  // Guaíba vem de uma tabela defasada, sem 2024): basta incluí-lo na lista para reativar.
  const climadaPorMun: Record<string, ClimadaData | null | undefined> = { ...dadosClimadaMun, "Porto Alegre": climadaPA };
  const munsClimada = ["Porto Alegre", "Lajeado"].filter((m) => !!(climadaPorMun[m] || cotasPorMun[m]));
  const munClimadaAtivo = munsClimada.includes(munClimada) ? munClimada : munsClimada[0];
  const dadosClimada: ClimadaData | null = climadaPorMun[munClimadaAtivo] ?? null;
  const medidasMun: MedidasMun | null = dadosMedidas[munClimadaAtivo] ?? null;

  // ── Dados CLIMADA para o RP selecionado ──
  const climadaSetores = ["empresas", "educacao", "saude"];
  const rpsDisponiveis = dadosClimada ? RP_ORDER.filter((r) => dadosClimada.resultados_por_rp[r]) : [];
  const rpAtivo = dadosClimada && dadosClimada.resultados_por_rp[rp] ? rp : rpsDisponiveis[rpsDisponiveis.length - 1];
  const atualClimada = rpAtivo ? dadosClimada?.resultados_por_rp[rpAtivo] : undefined;
  const totalAtualClimada = atualClimada ? climadaSetores.reduce((s, k) => s + atualClimada[k].dano_fisico_total_brl, 0) : 0;
  const exposicaoAtualClimada = atualClimada ? climadaSetores.reduce((s, k) => s + atualClimada[k].exposicao_total_brl, 0) : 0;
  const maxTotalClimada = dadosClimada && rpsDisponiveis.length
    ? Math.max(...rpsDisponiveis.map((r) => climadaSetores.reduce((s, k) => s + dadosClimada.resultados_por_rp[r][k].dano_fisico_total_brl, 0)))
    : 0;
  const eai = dadosClimada?.eai_anual_esperado ?? null;

  // ── Dados CLIMADA por cota (Lajeado, Eldorado do Sul, Porto Alegre) ──
  const dadosCotas: CotasData | null = cotasPorMun[munClimadaAtivo] ?? null;
  const cotasDisponiveis = dadosCotas
    ? Object.keys(dadosCotas.resultados_por_cota).sort((a, b) => parseFloat(a) - parseFloat(b))
    : [];
  const cotaAtiva = cotasDisponiveis.includes(cota) ? cota : cotasDisponiveis[Math.floor(cotasDisponiveis.length / 2)];
  const atualCota = dadosCotas && cotaAtiva ? dadosCotas.resultados_por_cota[cotaAtiva] : undefined;
  const totalCota = (c: Record<string, CotaSetor>, k: "dano_fisico_brl_poa" | "dano_fisico_brl_jrc_crua") =>
    climadaSetores.reduce((s, st) => s + c[st][k], 0);
  const maxTotalCota = dadosCotas && cotasDisponiveis.length
    ? Math.max(...cotasDisponiveis.map((c) => totalCota(dadosCotas.resultados_por_cota[c], "dano_fisico_brl_jrc_crua")))
    : 0;
  // Visão por cota: quando escolhida, ou quando o município não tem a visão por RP.
  // Municípios sem curva de dano (Lajeado): valor exposto atingido no lugar do dano.
  const expo: ExposicaoMun | null = dadosExposicao[munClimadaAtivo] ?? null;
  const semCurva = !!expo;
  const cotaAtivo = !!dadosCotas && !!atualCota && (visao === "cota" || !dadosClimada);
  const totalRp10 = dadosClimada?.resultados_por_rp?.RP10
    ? climadaSetores.reduce((sum, k) => sum + dadosClimada.resultados_por_rp.RP10[k].dano_fisico_total_brl, 0)
    : 0;
  const foraRasterTotal = dadosCotas ? Object.values(dadosCotas.diagnostico.pontos_fora_do_raster).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-[#f0f7fa] text-slate-800 font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-[#055071] text-white px-6 py-10 print:py-5">
        <div className="max-w-[1200px] mx-auto flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-5 print:hidden">
              <Link href="/" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Dashboard</Link>
              <Link href="/metodologia" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Metodologia</Link>
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-60 mb-2">
              BID · GPEA · FURG
            </p>
            <h1 className="text-4xl font-black leading-none mb-2 tracking-tight flex items-center gap-3">
              <TrendingDown size={36} strokeWidth={2.5} className="opacity-80 shrink-0" />
              Danos & Risco de Inundação
            </h1>
            <p className="text-base opacity-75 font-medium">
              Perdas Econômicas e Dano Físico Estimado: Enchentes no Rio Grande do Sul
            </p>
            <p className="text-[11px] opacity-50 mt-3 font-mono">
              Metodologia DaLA (CEPAL/BID), Maio 2024 e Setembro 2023 · Protótipo CLIMADA/CCDR, Porto Alegre e Lajeado
            </p>
          </div>
          <HeaderLogos />
        </div>
      </header>

      {/* ── Abas + seletor de contexto (sticky) ───────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 border-b border-[#b3cdd8] shadow-sm print:hidden"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-2.5 flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setAba("dala")}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-black border-2 transition-all duration-150 flex items-center gap-2 ${
                aba === "dala"
                  ? "bg-[#055071] text-white border-[#055071] shadow-md scale-[1.02]"
                  : "bg-white text-slate-500 border-slate-200 hover:border-[#055071] hover:text-[#055071]"
              }`}
            >
              <TrendingDown size={16} strokeWidth={2.5} />
              Danos Operacionais
            </button>
            {munsClimada.length > 0 && (
              <button
                onClick={() => setAba("climada")}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-black border-2 transition-all duration-150 flex items-center gap-2 ${
                  aba === "climada"
                    ? "bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]"
                    : "bg-white text-amber-700 border-amber-200 hover:border-amber-400"
                }`}
              >
                <FlaskConical size={16} strokeWidth={2.5} />
                Dano Físico (Protótipo)
              </button>
            )}
          </div>

          <div className="w-px self-stretch bg-slate-200 hidden sm:block" />

          {aba === "dala" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94]">
                  Duração da interrupção
                </span>
                <span className="text-[9px] text-slate-400">(dias efetivos)</span>
              </div>
              <div className="flex gap-1.5">
                {DIAS_OPCOES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDias(d)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                      dias === d
                        ? "bg-[#055071] text-white border-[#055071] shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-[#055071] hover:text-[#055071]"
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4d9e3a] animate-pulse" />
                <span className="text-[10px] text-slate-500 font-medium">
                  f = {(dias / 365).toFixed(4)} · Todos os resultados atualizados
                </span>
              </div>
            </>
          ) : (
            <>
              {munsClimada.length > 1 && (
                <div className="flex gap-1.5">
                  {munsClimada.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMunClimada(m)}
                      className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                        munClimadaAtivo === m
                          ? "bg-[#055071] text-white border-[#055071] shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-[#055071] hover:text-[#055071]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              {dadosClimada && dadosCotas && (
                <div className="flex gap-1.5">
                  {([["rp", "Por RP"], ["cota", "Por cota"]] as const).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setVisao(v)}
                      className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                        visao === v
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {cotaAtivo ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94]">Cota do rio</span>
                    <span className="text-[9px] text-slate-400">(m)</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {cotasDisponiveis.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCota(c)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                          cotaAtiva === c
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-medium">
                      Sem período de retorno: sem EAI
                    </span>
                  </div>
                </>
              ) : (
              <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94]">
                  Período de retorno
                </span>
                <span className="text-[9px] text-slate-400">{dadosClimada?.rp_por_cota ? "(derivado das cotas do rio)" : "(cenário sintético CLIMADA)"}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {rpsDisponiveis.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRp(r)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                      rpAtivo === r
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                    }`}
                    title={`Período de retorno de ${RP_ANOS[r]}, ${RP_PROBABILIDADE[r]} de chance/ano de ocorrer`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-medium">
                  {dadosClimada?.rp_por_cota ? "RPs convertidos em cota por análise de frequência" : "RP200 é a âncora de calibração usada pelo CLIMADA"}
                </span>
              </div>
              </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-10 print:py-5 flex gap-8 items-start print:block">

        {/* ── Sidebar (Índice fixo, muda conforme a aba) ───────────────────────── */}
        <aside className="hidden lg:block w-52 shrink-0 print:hidden">
          <div className="sticky top-[56px] flex flex-col gap-3">
            <nav className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Índice</p>
              <ol className="flex flex-col gap-1">
                {(aba === "dala" ? [
                  ["#resumo",      "1. Resumo Geral"],
                  ["#cenarios",    "2. Análise por Cenário"],
                  ["#sensib",      "3. Sensibilidade por Duração"],
                  ["#notas",       "4. Notas e Ressalvas"],
                ] : semCurva ? (cotaAtivo ? [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-tabela",       "2. Valor por Cota"],
                  ["#c-limitacoes",   "3. Limitações"],
                ] : [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-faixas",       "2. Faixas de Profundidade"],
                  ["#c-eai",          "3. Exposição Anual Esperada"],
                  ["#c-projecao",     "4. Projeção 2025→2050"],
                  ["#c-comparativo",  "5. Comparativo por RP"],
                  ["#c-medidas",      "6. Medidas de Adaptação"],
                  ["#c-limitacoes",   "7. Limitações"],
                ]) : cotaAtivo ? [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-curva",        "2. Dano por Cota"],
                  ["#c-tabela",       "3. Tabela por Cota"],
                  ["#c-limitacoes",   "4. Limitações"],
                ] : [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-eai",          "2. Risco Anual Esperado"],
                  ["#c-projecao",     "3. Projeção 2025→2050"],
                  ["#c-comparativo",  "4. Comparativo por RP"],
                  ["#c-medidas",      "5. Medidas de Adaptação"],
                  ["#c-limitacoes",   "6. Limitações"],
                ] as [string, string][]).map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-[11px] text-[#055071] font-medium hover:underline underline-offset-4 transition-colors duration-150 leading-snug block py-0.5">
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0">

        {aba === "dala" ? (
        <>
        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 1 — RESUMO GERAL
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="resumo" num="1" title="Resumo Geral">
          <DiasBadge dias={dias} />

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 my-5">
            {pioresCenarios.map(({ mun, cenNome, cenVal }) => (
              <div key={mun} className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3" style={{ backgroundColor: MUN_COLORS[mun] ?? "#055071" }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">{mun}</p>
                  <p className="text-2xl font-black text-white leading-none">{fmtBRL(cenVal.total)}</p>
                  <p className="text-[9px] text-white/60 font-mono mt-1">{cenarioLabel(cenNome)} · {dias} dias ef.</p>
                </div>
                <div className="px-4 pt-3 pb-1">
                  <CompositionBar v={cenVal} />
                </div>
                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <KpiRow label="Empresas (VAB)"   value={fmtBRL(cenVal.empresas_vab)}       sub={pct(cenVal.empresas_vab, cenVal.total)}       color={COMP_COLORS.empresas} />
                  <KpiRow label="Educação"          value={fmtBRL(cenVal.educacao_perdas + cenVal.educacao_custo_adicional)} sub={pct(cenVal.educacao_perdas + cenVal.educacao_custo_adicional, cenVal.total)} color={COMP_COLORS.educacao} />
                  <KpiRow label="Saúde (SUS)"       value={fmtBRL(cenVal.saude_producao)}     sub={pct(cenVal.saude_producao, cenVal.total)}     color={COMP_COLORS.saude} />
                  <KpiRow label="Agricultura"       value={fmtBRL(cenVal.agricultura_perdas)} sub={pct(cenVal.agricultura_perdas, cenVal.total)} color={COMP_COLORS.agricultura} />
                </div>
              </div>
            ))}
          </div>

          {/* Gráfico de barras total por cenário */}
          <SubTitle>Total de Perdas por Cenário ({dias} dias ef.)</SubTitle>
          <p>Comparação de todos os cenários avaliados (em R$ milhões).</p>
          <div className="bg-white border border-[#b3cdd8] rounded-xl p-5 shadow-sm mt-3">
            <TotaisBarChart todosCenarios={todosCenarios} maxTotal={maxTotalDala} />
            <div className="flex gap-4 flex-wrap mt-4 justify-center">
              {Object.entries(MUN_COLORS).map(([mun, cor]) => (
                <div key={mun} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cor }} />
                  <span className="text-[10px] text-slate-500 font-medium">{mun}</span>
                </div>
              ))}
            </div>
          </div>

          <Note type="warning">
            A soma dos piores cenários <strong>não é um agregado único</strong>: cada município
            pode ter cenários com extensões distintas. Os valores representam impactos independentes.
          </Note>
          {dadosClimada && (
            <Note type="info">
              Esta seção mede <strong>perda de fluxo</strong> (DaLA: produção/serviço não
              realizado). Para <strong>destruição de patrimônio</strong> (estoque) em Porto
              Alegre, ver a aba{" "}
              <button onClick={() => setAba("climada")} className="underline underline-offset-2 font-bold">
                Dano Físico (Protótipo)
              </button>{" "}
              acima. São métricas complementares, não somáveis.
            </Note>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 2 — ANÁLISE POR CENÁRIO
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="cenarios" num="2" title="Análise por Cenário">
          <DiasBadge dias={dias} />

          {Object.entries(dadosEscalados).map(([mun, cens]) => (
            <div key={mun} className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: MUN_COLORS[mun] ?? "#055071" }} />
                <h3 className="text-base font-black text-slate-800">{mun}</h3>
              </div>

              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(cens).length, 2)}, 1fr)` }}
              >
                {Object.entries(cens).map(([cen, v]) => (
                  <div key={cen} className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-[#f0f7fa] border-b border-[#b3cdd8] flex items-baseline justify-between">
                      <p className="text-[11px] font-black text-[#055071] uppercase tracking-wide">{cenarioLabel(cen)}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{dias} dias ef. · f = {v.f_interrup.toFixed(4)}</p>
                    </div>
                    <div className="px-4 pt-3 pb-4">
                      <p className="text-xl font-black text-slate-800 mb-3">{fmtBRL(v.total)}</p>
                      <CompositionBar v={v} />
                      {/* Breakdown com barras horizontais */}
                      <div className="mt-3 space-y-2">
                        {([
                          { label: "Empresas (VAB)", value: v.empresas_vab, color: COMP_COLORS.empresas },
                          { label: "Educação", value: v.educacao_perdas + v.educacao_custo_adicional, color: COMP_COLORS.educacao },
                          { label: "Saúde (SUS)", value: v.saude_producao, color: COMP_COLORS.saude },
                          { label: "Agricultura", value: v.agricultura_perdas, color: COMP_COLORS.agricultura },
                        ] as const).map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-slate-500">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{fmtBRL(value)}</span>
                                <span className="text-slate-400 w-8 text-right">{pct(value, v.total)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-[#e8f4f8] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: pct(value, v.total), backgroundColor: color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 3 — SENSIBILIDADE
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="sensib" num="3" title="Sensibilidade por Duração da Interrupção">
          <p>
            Comparação do total estimado para <strong>30, 45 e 60 dias efetivos</strong>.
            Perdas agrícolas refletem custo de produção no estágio da cultura no momento
            do evento. Independem da duração.
          </p>

          {/* Gráfico agrupado */}
          <div className="bg-white border border-[#b3cdd8] rounded-xl p-5 shadow-sm mt-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-4">
              Total por duração (cenário principal de cada município)
            </p>
            <SensibChart dados={dados} diasSelecionado={dias} />
          </div>

          {/* Tabelas por município */}
          {Object.entries(dados).map(([mun, cens]) => {
            const [cenNome, cenValOrig] = Object.entries(cens).reduce(
              (acc, cur) => (cur[1].total > acc[1].total ? cur : acc)
            );
            return (
              <div key={mun} className="mt-6">
                <SubTitle>{mun} · {cenarioLabel(cenNome)}</SubTitle>
                <DataTable rows={[
                  ["Duração", "Empresas (VAB)", "Educação", "Saúde (SUS)", "Agricultura", "Total"],
                  ...DIAS_OPCOES.map((d) => {
                    const sc = scaleTo(cenValOrig, d);
                    const isSelected = d === dias;
                    return [
                      <span key="d" className={`font-mono font-black ${isSelected ? "text-[#055071]" : "text-slate-500"}`}>
                        {d} dias{isSelected ? " ◀" : ""}
                      </span>,
                      fmtBRL(sc.empresas_vab),
                      fmtBRL(sc.educacao_perdas + sc.educacao_custo_adicional),
                      fmtBRL(sc.saude_producao),
                      fmtBRL(sc.agricultura_perdas),
                      <span key="t" className={`font-black ${isSelected ? "text-[#055071]" : "text-slate-700"}`}>
                        {fmtBRL(sc.total)}
                      </span>,
                    ];
                  }),
                ]} />
              </div>
            );
          })}

          <Note type="info">
            Empresas, educação e saúde escalam linearmente com a duração. O marcador ◀ indica
            a duração atualmente selecionada no painel.
          </Note>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 4 — NOTAS E RESSALVAS
            (a metodologia completa — curva DaLA, componentes, parâmetros e
            fontes — foi movida para /metodologia#danos; aqui ficam só as
            ressalvas de interpretação específicas destes resultados)
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="notas" num="4" title="Notas e Ressalvas">
          <Note type="info">
            A metodologia completa (curva de recuperação DaLA, fórmulas por componente,
            parâmetros e fontes) está na{" "}
            <a href="/metodologia#danos" target="_blank" rel="noopener noreferrer"
              className="font-semibold hover:underline underline-offset-4">
              página de Metodologia ↗
            </a>. Esta seção reúne apenas as ressalvas de interpretação dos números acima.
          </Note>

          <SubTitle>Administração Pública (CNAE 84)</SubTitle>
          <p>
            Os estabelecimentos com CNAE 84 (<em>Administração Pública, Defesa e Seguridade Social</em>)
            são <strong>incluídos</strong> na estimativa: a interrupção de serviços governamentais
            representa perdas reais para a sociedade, conforme a metodologia DaLA (CEPAL, 2024).
          </p>
          <DataTable rows={[
            ["Indicador (Porto Alegre / ADA)", "Valor"],
            ["Estabelecimentos CNAE 84",      "51"],
            ["Participação na massa salarial", "45,3%  (R$ 559,7 mi/mês)"],
            ["Contribuição ao total (60 dias)","≈ R$ 1,25 bi de R$ 4,42 bi (28,3%)"],
          ]} />
          <Note type="warning">
            O labor share de Adm. Pública (88,3%) é elevado, pois o VAB deste setor é
            predominantemente composto por remunerações. Leitores que desejam excluir o setor
            público devem subtrair a contribuição do CNAE 84 dos valores apresentados.
          </Note>

          <SubTitle>Por que não usar ICMS como alternativa?</SubTitle>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 mt-1 mb-2 text-[11px] leading-relaxed text-amber-900 space-y-1.5">
            <p>
              A arrecadação de ICMS municipal (SEFAZ-RS) foi avaliada como possível proxy de VAB perdido,
              seguindo abordagem similar à adotada pela CEPAL (2024) em nível estadual via série ARIMA.
              A validação cruzada realizada identificou três limitações estruturais que inviabilizam o ICMS
              como substituto do método RAIS + <em>labor share</em>:
            </p>
            <ul className="list-none space-y-1 pl-1">
              <li>
                <strong>1. Domicílio fiscal fora do município atingido.</strong>{" "}
                Em Lajeado, o shortfall ICMS maio/2024 foi de apenas R$ 8 mil, enquanto nosso VAB estimado
                implica R$ 1,90 mi de queda de ICMS (razão de 225×). Grandes empregadoras como Tramontina
                recolhem ICMS na sede em Carlos Barbosa (RS), não em Lajeado, tornando o ICMS municipal
                completamente dissociado da atividade econômica local.
              </li>
              <li>
                <strong>2. Cobertura setorial parcial.</strong>{" "}
                O ICMS incide sobre circulação de mercadorias e alguns serviços de comunicação e transporte.
                Serviços em geral, que representam a maior parcela do VAB nas cidades maiores,
                recolhem ISS ao município, não ICMS ao Estado. Em Porto Alegre, o ICMS capturou apenas
                R$ 136,8 mi de shortfall frente a R$ 389 mi implicados pelo nosso VAB estimado (razão 2,84×),
                refletindo que bancos, consultorias e tecnologia estão fora do escopo do ICMS.
              </li>
              <li>
                <strong>3. Timing divergente e efeitos de compensação.</strong>{" "}
                Em Rio Grande, o ICMS de maio/2024 apresentou alta de +43,8% em relação ao baseline,
                enquanto o evento de cheia afetou principalmente abril/2024 (−41,4%). O movimento positivo
                em maio reflete provavelmente a refinaria e o porto (atividades não atingidas), gerando
                ICMS normalmente, além de demanda emergencial de combustíveis. O ICMS municipal, por ser
                agregado, não permite isolar a parcela gerada por estabelecimentos dentro da mancha de inundação.
              </li>
            </ul>
            <p>
              O método RAIS + <em>labor share</em> resolve as três limitações: opera no nível do
              estabelecimento (CNPJ), aplica o teste ponto-em-polígono para isolar apenas firmas dentro
              da mancha, e cobre todos os setores formais independentemente do tributo recolhido.
              O ICMS permanece útil apenas como sinal de validação de ordem de grandeza
              (consistente com Eldorado do Sul, razão 1,12×), não como metodologia de estimação.
            </p>
          </div>
        </Section>
        </>
        ) : semCurva && expo ? (
          <ExposicaoView expo={expo} mun={munClimadaAtivo} visao={cotaAtivo ? "cota" : "rp"} rp={rp} cota={cota} setAba={setAba} />
        ) : cotaAtivo && dadosCotas && atualCota && cotaAtiva ? (
        <>
        <Section id="c-resumo" num="1" title={`Resumo: ${munClimadaAtivo}`}>
          <Note type="warning">
            <strong>Protótipo exploratório</strong>, não uma métrica oficial do painel. Mede{" "}
            <strong>destruição de patrimônio</strong> (estoque), diferente da aba{" "}
            <button onClick={() => setAba("dala")} className="underline underline-offset-2 font-bold">Danos Operacionais</button>{" "}
            (fluxo, DaLA): os dois números não devem ser somados.{" "}
            <strong>Calibração herdada de Porto Alegre</strong> (fator{" "}
            {dadosCotas.premissas.poa_calibration_factor.toString().replace(".", ",")}), sem perda
            observada para {munClimadaAtivo}. Ver <a href="#c-limitacoes" className="underline underline-offset-2">Limitações</a>.
          </Note>
          <Note type="info">
            Aqui o cenário é a <strong>cota do rio</strong> (profundidade por pixel de ~5 m), não um
            período de retorno: não há frequência associada a cada cota, então{" "}
            <strong>não há risco anual esperado (EAI) nem projeção 2050</strong> para {munClimadaAtivo}.
            Estas manchas por cota alimentam só o cálculo CLIMADA e não são cenários do mapa.
            {munClimadaAtivo === "Eldorado do Sul" && (
              <> Os rasters são os de <strong>Porto Alegre</strong> (cota do Guaíba), amostrados nos
              pontos de Eldorado do Sul.</>
            )}
          </Note>
          {munClimadaAtivo === "Porto Alegre" && totalRp10 > 0 && (
            <Note type="warning">
              <strong>Esta visão por cota não é comparável à visão por RP.</strong> No topo da série
              (cota {dadosCotas.diagnostico.cota_mais_alta} m) o dano total é{" "}
              {fmtBRL(totalCota(dadosCotas.resultados_por_cota[dadosCotas.diagnostico.cota_mais_alta], "dano_fisico_brl_poa"))},
              bem abaixo do RP10 ({fmtBRL(totalRp10)}). São fontes de perigo diferentes e a causa da
              diferença ainda não foi investigada: não somar nem misturar as duas visões.
            </Note>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">{munClimadaAtivo} · cota {cotaAtiva} m</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(totalCota(atualCota, "dano_fisico_brl_poa"))}</p>
                <p className="text-[9px] text-white/60 font-mono mt-1">
                  dano físico estimado (3 setores) · incerteza até {fmtBRL(totalCota(atualCota, "dano_fisico_brl_jrc_crua"))} (curva JRC crua)
                </p>
              </div>
              <div className="px-4 pt-3 pb-1">
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                  {climadaSetores.map((st) => (
                    <div key={st} style={{ width: `${(atualCota[st].dano_fisico_brl_poa / (totalCota(atualCota, "dano_fisico_brl_poa") || 1)) * 100}%`, backgroundColor: SETOR_COLORS[st] }} />
                  ))}
                </div>
              </div>
              <div className="px-4 pb-4 pt-2 grid grid-cols-1 gap-y-1">
                {climadaSetores.map((st) => (
                  <KpiRow
                    key={st}
                    label={SETOR_LABEL[st]}
                    value={fmtBRL(atualCota[st].dano_fisico_brl_poa)}
                    sub={`${atualCota[st].exposicao_total_brl ? ((atualCota[st].dano_fisico_brl_poa / atualCota[st].exposicao_total_brl) * 100).toFixed(1) : "0.0"}% da exposição`}
                    color={SETOR_COLORS[st]}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Exposição total (patrimônio no raio de risco)</p>
              <p className="text-2xl font-black text-slate-800 leading-none mb-3">
                {fmtBRL(climadaSetores.reduce((sum, st) => sum + atualCota[st].exposicao_total_brl, 0))}
              </p>
              {climadaSetores.map((st) => (
                <div key={st} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 first:border-t-0">
                  <span className="text-slate-500">{SETOR_LABEL[st]}: {atualCota[st].n_atingidos}/{atualCota[st].n_total} pontos atingidos</span>
                  <span className="font-bold text-slate-700">prof. média {atualCota[st].profundidade_media_atingidos_m.toFixed(2)}m</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="c-curva" num="2" title="Dano por Cota">
          <p>
            Dano físico total por cota do rio, com as curvas calibradas pelo fator de Porto Alegre
            (barras empilhadas por setor) e a curva JRC crua como limite superior da incerteza
            (traço). O dano sobe em degraus: ver a limitação sobre coordenadas repetidas.
          </p>
          <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm my-4">
            <CotaBarChart
              cotas={cotasDisponiveis}
              resultados={dadosCotas.resultados_por_cota}
              setores={climadaSetores}
              maxTotal={maxTotalCota}
              cotaAtiva={cotaAtiva}
            />
            <div className="flex gap-4 mt-3 flex-wrap">
              {climadaSetores.map((st) => (
                <div key={st} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SETOR_COLORS[st] }} />
                  {SETOR_LABEL[st]}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <div className="w-3 border-t-2 border-dashed border-slate-700" />
                Total com curva JRC crua
              </div>
            </div>
          </div>
        </Section>

        <Section id="c-tabela" num="3" title="Tabela por Cota">
          <DataTable
            rows={[
              ["Cota (m)", "Empresas atingidas", "Escolas atingidas", "Unid. saúde atingidas", "Dano (fator POA)", "Dano (JRC crua)"],
              ...cotasDisponiveis.map((c) => {
                const r = dadosCotas.resultados_por_cota[c];
                return [
                  <span key="c" className={c === cotaAtiva ? "font-black text-amber-700" : "font-bold"}>{c}</span>,
                  `${r.empresas.n_atingidos}/${r.empresas.n_total}`,
                  `${r.educacao.n_atingidos}/${r.educacao.n_total}`,
                  `${r.saude.n_atingidos}/${r.saude.n_total}`,
                  fmtBRL(totalCota(r, "dano_fisico_brl_poa")),
                  fmtBRL(totalCota(r, "dano_fisico_brl_jrc_crua")),
                ];
              }),
            ]}
          />
        </Section>

        <Section id="c-limitacoes" num="4" title="Limitações">
          <Note type="warning">
            Resultados de {munClimadaAtivo} são um <strong>protótipo</strong> e carregam as mesmas premissas
            do de Porto Alegre por RP (valor de reposição, curvas JRC, conteúdo/equipamento; ver{" "}
            <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-bold">metodologia ↗</a>),
            mais as limitações específicas abaixo.
          </Note>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 mt-3">
            <li>
              <strong>Coordenadas repetidas na base oficial.</strong> Muitos estabelecimentos
              (RAIS/CNES/Censo Escolar, geocodificados) compartilham o mesmo ponto, típico de
              endereço incompleto ou geocode no centroide de rua/bairro. Em {munClimadaAtivo}:{" "}
              {climadaSetores.map((st) => {
                const r = dadosCotas.diagnostico.coordenadas_repetidas[st];
                return `${SETOR_LABEL[st].toLowerCase()} ${r.n_pontos.toLocaleString("pt-BR")} em ${r.n_coordenadas_unicas.toLocaleString("pt-BR")} coordenadas (maior pilha: ${r.maior_pilha.toLocaleString("pt-BR")})`;
              }).join("; ")}
              . A base é mantida como reportada pelo governo, sem filtro: cada pilha entra ou sai da
              mancha de uma vez e recebe a profundidade de um único pixel, o que gera degraus no
              dano. Tratar como ordem de grandeza.
            </li>
            <li>
              <strong>Calibração herdada de Porto Alegre.</strong> O fator{" "}
              {dadosCotas.premissas.poa_calibration_factor.toString().replace(".", ",")} (Empresas e
              Saúde) foi ancorado no evento de 2024 em Porto Alegre; não há
              perda observada por cota. A curva JRC crua mostra o limite superior da incerteza
              (≈2× o valor calibrado). A curva de Educação não é reescalada. A curva de Saúde é
              sintetizada (ver Porto Alegre).
            </li>
            <li>
              <strong>Sem risco anual esperado (EAI).</strong> Os rasters são indexados por cota,
              sem período de retorno ou frequência. EAI exigiria a relação cota → probabilidade
              (série histórica de cotas), ainda não disponível.
            </li>
            <li>
              <strong>Origem dos rasters.</strong> {dadosCotas.premissas.raster_nota}
            </li>
            {foraRasterTotal > 0 && (
              <li>
                <strong>Pontos fora da grade do raster:</strong>{" "}
                {climadaSetores.map((st) => `${SETOR_LABEL[st].toLowerCase()} ${dadosCotas.diagnostico.pontos_fora_do_raster[st]}/${dadosCotas.diagnostico.n_pontos[st]}`).join("; ")}.
                Esses pontos entram com profundidade 0, o que subestima o dano em {munClimadaAtivo}.
              </li>
            )}
            <li>
              <strong>Pontos já molhados na cota mais baixa</strong> ({dadosCotas.diagnostico.cota_mais_baixa} m):{" "}
              {climadaSetores.map((st) => `${SETOR_LABEL[st].toLowerCase()} ${dadosCotas.diagnostico.pontos_molhados_na_cota_mais_baixa[st]}`).join("; ")}.
              Mantidos: cada cota é um cenário próprio.
            </li>
            <li>
              <strong>Máximo acumulado entre cotas.</strong> Alguns rasters (notadamente Lajeado)
              têm células que ficam mais rasas quando a cota sobe; aplicado o máximo por ponto
              entre cotas (o dano não diminui com a cota).
            </li>
            <li>
              <strong>Amostragem por pixel de ~5 m</strong> (vizinho mais próximo), mais fina que a
              da visão por RP de Porto Alegre (~90 m), mas ainda sujeita a erro de geocodificação do ponto.
            </li>
          </ul>
        </Section>
        </>
        ) : dadosClimada && atualClimada && rpAtivo ? (
        <>
        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO 1 — RESUMO (CLIMADA)
        ══════════════════════════════════════════════════════════════════ */}
        <Section id="c-resumo" num="1" title="Resumo">
          <Note type="warning">
            <strong>Protótipo exploratório</strong>, não uma métrica oficial do painel. Mede{" "}
            <strong>destruição de patrimônio</strong> (estoque: prédio + equipamento), diferente
            da aba <button onClick={() => setAba("dala")} className="underline underline-offset-2 font-bold">Danos Operacionais</button>{" "}
            (fluxo: produção/serviço não realizado, metodologia DaLA). Os dois números não devem
            ser somados. Ver <a href="#c-limitacoes" className="underline underline-offset-2">Limitações</a>{" "}
            antes de usar qualquer valor abaixo para tomada de decisão.
          </Note>
          <Note type="info">
            Disponível para <strong>Porto Alegre</strong> (RPs do estudo de risco de inundação de Porto Alegre (UNU-EHS)) e{" "}
            <strong>Lajeado</strong> (RPs derivados das cotas do rio), ambos também por cota
            (alternar nos seletores acima): o cálculo depende de profundidade da água por ponto
            (não apenas se o ponto foi atingido). Eldorado do Sul e Rio Grande não estão
            disponíveis nesta aba.
          </Note>
          {dadosClimada.rp_por_cota && (
            <>
              <Note type="warning">
                <strong>RPs de {munClimadaAtivo} derivados das cotas do rio</strong>, não de um
                modelo de risco próprio: cada período de retorno foi convertido em cota (
                {dadosClimada.rp_por_cota.frequencia.metodo}; série: {dadosClimada.rp_por_cota.frequencia.serie})
                e a profundidade veio dos rasters por cota (cobertura{" "}
                {dadosClimada.rp_por_cota.cota_cobertura_raster_m[0]} a {dadosClimada.rp_por_cota.cota_cobertura_raster_m[1]} m).
                Datum: {dadosClimada.rp_por_cota.frequencia.datum}.
                {dadosClimada.rp_por_cota.rps_acima_do_ultimo_raster.length > 0 && (
                  <> {dadosClimada.rp_por_cota.rps_acima_do_ultimo_raster.join(" e ")} ficam acima do
                  último raster e são <strong>extrapolados</strong>: os pontos já molhados ganham a
                  diferença de cota, mas os que só molhariam acima do último raster continuam
                  secos, então o dano desses RPs está subestimado.</>
                )}{" "}
                <strong>Herdados de Porto Alegre, como premissa:</strong> o fator de calibração das
                curvas, o remapeamento de frequência 2025→2050 e o crescimento de 2% ao ano. Fonte da
                frequência: {dadosClimada.rp_por_cota.frequencia.fonte}.
              </Note>
              <DataTable
                rows={[
                  ["Período de retorno", "Cota na régua (m)", "Cota no raster (m)"],
                  ...rpsDisponiveis.map((r) => [
                    r,
                    dadosClimada.rp_por_cota!.rps[r].cota_regua_m.toFixed(2).replace(".", ","),
                    dadosClimada.rp_por_cota!.rps[r].cota_raster_m.toFixed(2).replace(".", ","),
                  ]),
                ]}
              />
            </>
          )}

          <Note type="info">
            <strong>O que é um Período de Retorno (RP)?</strong> É a magnitude estatística de um
            evento raro, expressa pelo intervalo médio (em anos) entre ocorrências dessa magnitude
            ou maior (não é uma previsão de &ldquo;acontece exatamente a cada N anos&rdquo;). Um evento{" "}
            <strong>RP100</strong> tem <strong>1% de chance</strong> de ocorrer em um ano qualquer
            (probabilidade = 1/RP); um <strong>RP500</strong> é mais raro e mais severo (0,2% ao
            ano), mas quando ocorre, alaga mais fundo e atinge mais área. São cenários{" "}
            <em>sintéticos</em> do modelo de risco do CLIMADA, diferentes do Cenário ADA e do
            Climada - UNU/EHS do mapa principal, que representam a extensão de um evento real
            observado (maio/2024).
          </Note>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">{munClimadaAtivo} · {rpAtivo}</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(totalAtualClimada)}</p>
                <p className="text-[9px] text-white/60 font-mono mt-1">
                  dano físico estimado (3 setores) · {RP_PROBABILIDADE[rpAtivo]} de chance/ano de ocorrer
                </p>
              </div>
              <div className="px-4 pt-3 pb-1">
                <CompositionBarClimada atual={atualClimada} setores={climadaSetores} />
              </div>
              <div className="px-4 pb-4 pt-2 grid grid-cols-1 gap-y-1">
                {climadaSetores.map((s) => (
                  <KpiRow
                    key={s}
                    label={SETOR_LABEL[s]}
                    value={fmtBRL(atualClimada[s].dano_fisico_total_brl)}
                    sub={`${atualClimada[s].dano_fisico_pct_exposicao.toFixed(1)}% da exposição`}
                    color={SETOR_COLORS[s]}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Exposição total (patrimônio no raio de risco)</p>
              <p className="text-2xl font-black text-slate-800 leading-none mb-3">{fmtBRL(exposicaoAtualClimada)}</p>
              {climadaSetores.map((s) => (
                <div key={s} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 first:border-t-0">
                  <span className="text-slate-500">{SETOR_LABEL[s]}: {atualClimada[s].n_atingidos_profundidade_gt_0}/{atualClimada[s].n_total} pontos atingidos</span>
                  <span className="font-bold text-slate-700">prof. média {atualClimada[s].profundidade_media_atingidos_m.toFixed(2)}m</span>
                </div>
              ))}
            </div>
          </div>

          <SubTitle>Como interpretar os resultados</SubTitle>
          <p>
            <strong>Exposição total</strong> é o valor de reposição de tudo que existe dentro do
            raio de risco (todos os pontos do setor, atingidos ou não pelo RP selecionado): o
            &ldquo;patrimônio em jogo&rdquo;. <strong>Dano físico</strong> é a fração desse patrimônio que o
            modelo estima destruída, ponto a ponto, pela profundidade de água em cada um (curvas da{" "}
            <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">metodologia ↗</a>). A razão entre
            os dois (<strong>% da exposição</strong>) é a <em>taxa de perda</em>, que cresce com o
            RP porque eventos mais raros alagam mais fundo e atingem mais pontos, empurrando mais
            deles para a parte alta (mais destrutiva) da curva de dano.
          </p>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO 2 — RISCO ANUAL ESPERADO (EAI)
        ══════════════════════════════════════════════════════════════════ */}
        {eai && (
          <Section id="c-eai" num="2" title="Risco Anual Esperado (EAI)">
            <p>
              As seções anteriores mostram o dano de <em>um evento</em> de cada RP. O EAI
              (<em>Expected/Average Annual Impact</em>, impacto médio anual) resume tudo isso
              num único número: quanto se espera perder, <strong>em média por ano</strong>,
              somando eventos frequentes e pequenos com eventos raros e grandes, ponderados
              pela probabilidade de cada um. É o mesmo tipo de resultado que o CLIMADA usa
              como indicador principal de risco.
            </p>
            <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm mt-3">
              <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">{munClimadaAtivo} · todos os setores</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(eai.total)} / ano</p>
                <p className="text-[9px] text-white/60 font-mono mt-1">
                  risco anual esperado, integrado sobre {eai.rps_usados.length} período(s) de retorno ({eai.rps_usados[0]}..{eai.rps_usados[eai.rps_usados.length - 1]})
                </p>
              </div>
              <div className="px-4 py-4 grid grid-cols-1 gap-y-1.5">
                {climadaSetores.map((s) => {
                  const valor = eaiValor(eai, s);
                  return (
                    <KpiRow
                      key={s}
                      label={SETOR_LABEL[s]}
                      value={`${fmtBRL(valor)} / ano`}
                      sub={`${((valor / eai.total) * 100).toFixed(0)}% do total`}
                      color={SETOR_COLORS[s]}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-[13px]">
              Regra do trapézio sobre a curva frequência de excedência × perda, com
              extrapolação linear a zero acima de RP10 e platô constante abaixo de RP500:
            </p>
            <MathBlock exprs={[
              { label: "Frequência de excedência", tex: "f_i = \\dfrac{1}{RP_i}" },
              { label: "EAI (aproximado)", tex: "\\text{EAI} \\approx \\sum_i \\dfrac{(f_i - f_{i+1})(L_i + L_{i+1})}{2}" },
            ]} />
            <p className="text-[11px] text-slate-500">
              Aproximação do impacto médio anual que o CLIMADA calcula sobre o conjunto
              completo de eventos do modelo, não sobre pontos de RP interpolados: tratar como
              ordem de grandeza. Ver <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a>.
            </p>
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO 3 — PROJEÇÃO 2025→2050 (crescimento x clima)
        ══════════════════════════════════════════════════════════════════ */}
        {dadosClimada.projecao_2050 && (
          <Section id="c-projecao" num="3" title="Projeção 2025→2050">
            <p>
              As seções anteriores mostram o risco de <strong>hoje</strong> (2025). Esta projeção
              estima como esse risco muda até 2050, decomposto em dois motores independentes: o{" "}
              <strong>crescimento econômico</strong> (mais patrimônio exposto, mesma lâmina d&apos;água)
              e a <strong>mudança climática</strong> (eventos ficam mais frequentes: a lâmina d&apos;água
              de hoje passa a ocorrer com frequência maior). Segue a decomposição do
              estudo de risco de inundação de Porto Alegre (UNU-EHS) (ver{" "}
              <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a>).
            </p>

            {(() => {
              const t = dadosClimada.projecao_2050!.total;
              const premissas = dadosClimada.projecao_2050!.premissas;
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
                    <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">Risco anual esperado</p>
                        <p className="text-2xl font-black text-white leading-none">
                          {fmtBRL(t.risco_2025_brl)} <span className="text-sm opacity-60">→</span> {fmtBRL(t.risco_2050_brl)}
                        </p>
                        <p className="text-[9px] text-white/60 font-mono mt-1">2025 → 2050 · {premissas.rps_usados.length} RPs com remapeamento oficial</p>
                      </div>
                      <div className="px-4 py-4 grid grid-cols-1 gap-y-1.5">
                        <KpiRow label="Aumento total" value={`${fmtBRL(t.aumento_total_brl)}/ano`} sub="2025→2050" color="#055071" />
                        <KpiRow label="Por crescimento econômico" value={`${fmtBRL(t.parcela_crescimento_brl)}/ano`} sub={`${(100 - t.pct_climatico).toFixed(0)}% do aumento`} color="#2563eb" />
                        <KpiRow label="Por mudança climática" value={`${fmtBRL(t.parcela_clima_brl)}/ano`} sub={`${t.pct_climatico.toFixed(0)}% do aumento`} color="#dc2626" />
                      </div>
                    </div>

                    <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Premissas</p>
                      <div className="flex flex-col gap-1.5 text-[11px]">
                        <div className="flex justify-between border-t border-slate-100 pt-1 first:border-t-0 first:pt-0">
                          <span className="text-slate-500">Crescimento econômico</span>
                          <span className="font-bold text-slate-700">{(premissas.crescimento_anual * 100).toFixed(0)}%/ano · {premissas.anos_projecao} anos (×{premissas.fator_crescimento.toFixed(2)})</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1">
                          <span className="text-slate-500">RPs usados</span>
                          <span className="font-bold text-slate-700">{premissas.rps_usados.join(", ")}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{premissas.crescimento_fonte}</p>
                    </div>
                  </div>

                  <SubTitle>Decomposição por setor</SubTitle>
                  <DataTable rows={[
                    ["Setor", "Risco 2025", "Risco 2050", "Crescimento", "Clima", "% climático"],
                    ...climadaSetores.map((s) => {
                      const ps = dadosClimada.projecao_2050!.por_setor[s];
                      return [
                        SETOR_LABEL[s],
                        fmtBRL(ps.risco_2025_brl),
                        fmtBRL(ps.risco_2050_brl),
                        fmtBRL(ps.parcela_crescimento_brl),
                        fmtBRL(ps.parcela_clima_brl),
                        `${ps.pct_climatico.toFixed(0)}%`,
                      ];
                    }),
                  ]} />

                  <Note type="info">
                    Como não há raster de profundidade futuro,
                    a lâmina d&apos;água de cada RP é mantida igual: o efeito de crescimento escala o
                    valor de reposição (mesma profundidade, patrimônio maior), e o efeito climático
                    só troca a frequência associada a essa mesma lâmina. Não é uma simulação de
                    chuvas mais intensas em 2050, só de eventos historicamente raros se tornando mais
                    comuns. Ver <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a> para o remapeamento RP completo.
                  </Note>
                </>
              );
            })()}
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO 4 — COMPARATIVO POR RP
        ══════════════════════════════════════════════════════════════════ */}
        <Section id="c-comparativo" num="4" title="Comparativo por Período de Retorno">
          <p>
            Quanto maior o período de retorno (RP), mais rara e mais severa a inundação modelada,
            e maior a área/profundidade atingida. O gráfico mostra o dano físico total (3 setores)
            para cada RP disponível.
          </p>
          <div className="bg-white border border-[#b3cdd8] rounded-xl p-5 shadow-sm mt-3">
            <p className="text-[10px] text-slate-400 font-medium mb-2">
              Cada barra soma o dano físico dos 3 setores para aquele RP, dividida por cor
              (proporcional). O número no topo é o total; a barra com contorno âmbar é o RP
              selecionado acima.
            </p>
            <RpBarChart rpsDisponiveis={rpsDisponiveis} resultados={dadosClimada.resultados_por_rp} setores={climadaSetores} maxTotal={maxTotalClimada} rpAtivo={rpAtivo} />
            <div className="flex gap-4 flex-wrap mt-4 justify-center">
              {climadaSetores.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SETOR_COLORS[s] }} />
                  <span className="text-[10px] text-slate-500 font-medium">{SETOR_LABEL[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <SubTitle>Tabela completa</SubTitle>
          <DataTable rows={[
            ["RP", "Empresas", "Educação", "Saúde", "Total", "Exposição total"],
            ...rpsDisponiveis.map((r) => {
              const d = dadosClimada.resultados_por_rp[r];
              const total = climadaSetores.reduce((s, k) => s + d[k].dano_fisico_total_brl, 0);
              const exp = climadaSetores.reduce((s, k) => s + d[k].exposicao_total_brl, 0);
              return [
                <strong key="rp">{r}</strong>,
                fmtBRL(d.empresas.dano_fisico_total_brl),
                fmtBRL(d.educacao.dano_fisico_total_brl),
                fmtBRL(d.saude.dano_fisico_total_brl),
                <strong key="tot">{fmtBRL(total)}</strong>,
                fmtBRL(exp),
              ];
            }),
          ]} />
        </Section>


        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO 4 — LIMITAÇÕES
            (a metodologia completa — fórmulas, curvas, premissas e fontes —
            foi movida para /metodologia#dano-fisico; aqui ficam as limitações
            específicas destes resultados, como pedido)
        ══════════════════════════════════════════════════════════════════ */}
        {medidasMun && (
        <Section id="c-medidas" num="5" title="Medidas de Adaptação">
          <p>
            Quanto do risco anual esperado de {munClimadaAtivo} cada medida evitaria, aplicando os
            mecanismos de adaptação da metodologia CLIMADA, com parâmetros da literatura (fontes
            abaixo da tabela), sobre a mesma profundidade por ponto e por RP usada acima. Ordenado pelo risco evitado
            sem a cauda assumida do EAI.
          </p>
          {medidasMun.custo_beneficio_premissas && (
            <Note type="warning">
              <strong>Custo-benefício.</strong> Benefício = valor presente do risco evitado em{" "}
              {medidasMun.custo_beneficio_premissas.horizonte[0]}–{medidasMun.custo_beneficio_premissas.horizonte[1]}, com desconto de{" "}
              {(medidasMun.custo_beneficio_premissas.taxa_desconto * 100).toFixed(0)}% a.a. O B/C principal usa o risco{" "}
              <strong>sem a cauda assumida</strong> (conservador); o valor &ldquo;com cauda&rdquo; infla
              sobretudo os diques. Custos em dólar convertidos a{" "}
              {medidasMun.custo_beneficio_premissas.cambio_brl_usd.toFixed(2).replace(".", ",")} R$/US$. O custo e a
              fonte de cada medida estão listados abaixo da tabela.
            </Note>
          )}
          <MedidasTable medidasMun={medidasMun} />
          <p className="text-[11px] text-slate-500">
            Risco sem medidas: {fmtBRL(medidasMun.base.eai_brl)}/ano hoje ({fmtBRL(medidasMun.base.eai_sem_cauda_brl)}/ano
            sem a cauda assumida) e {fmtBRL(medidasMun.base.eai_2050_brl)}/ano em 2050.
          </p>
          <SubTitle>Como ler</SubTitle>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
            <li>
              <strong>Sem cauda assumida:</strong> o EAI do painel liga por uma reta &ldquo;evento
              anual, dano zero&rdquo; ao RP10, e essa parte é premissa, não dado. Uma proteção
              coletiva que zera o RP10 apaga essa cauda inteira, o que infla o benefício dela na
              primeira coluna. A coluna &ldquo;sem cauda assumida&rdquo; conta só o que os RPs
              calculados sustentam e é a comparação mais justa entre medidas.
            </li>
            <li>
              <strong>Proteção coletiva (dique)</strong> entra como degrau: dano zero até o RP de
              projeto e dano inteiro acima dele, sem falha nem galgamento. Em Porto Alegre o sistema
              de proteção existente falhou em 2024, então esse benefício é um teto. O custo até
              RP100 é o programa completo de proteção e drenagem; até RP20, só as estruturas (que
              a obra menor dê proteção menor é premissa: a cota de projeto, 5,8 m, não tem RP).
            </li>
            <li>
              <strong>Custos de vedação e estoque.</strong> A vedação (valor dos EUA) protege o
              prédio, então é contada por coordenada atingida no RP500, uma aproximação de
              edificação: onde a pilha de pontos é erro de geocodificação, prédios diferentes são
              contados como um e o custo fica subestimado. O estoque usa o preço de mercado de
              mezanino metálico no Sul do Brasil (R$ 380 a R$ 850 por m²) sobre 100% da área de cada
              empresa atingida. Elevar toda a área é um teto de custo, porque a fração realmente
              necessária não tem fonte; o B/C em âmbar indica que a medida só se paga na ponta
              barata da faixa. O alerta usa o custo do sistema estadual inteiro, que também é teto.
            </li>
            <li>
              <strong>Parâmetros:</strong> vêm da literatura (ver Fontes). A redução de alerta e de
              estoque incide só sobre o conteúdo, convertida pela parcela de conteúdo do valor de
              reposição (50% em Empresas, 33% em Educação, 56% em Saúde). Os estudos são da cheia
              do Elba de 2002, na Alemanha, e o de estoque é de residências. As medidas não se
              somam: aplicar duas juntas evita menos que a soma das duas.
            </li>
            <li>
              <strong>Calibração:</strong> o valor em R$ herda toda a incerteza das curvas de dano;
              a ordem entre as medidas é mais robusta que os valores.
            </li>
          </ul>
        </Section>
        )}

        <Section id="c-limitacoes" num="6" title="Limitações">
          <Note type="warning">
            Estes números são um <strong>protótipo</strong> para explorar a viabilidade de aplicar a
            metodologia CLIMADA/CCDR (destruição de estoque) em cima dos nossos próprios dados
            (RAIS/Censo Escolar/CNES). Não substituem os Danos Operacionais (DaLA) da aba principal,
            e carregam premissas explícitas que precisam de validação antes de qualquer
            uso além de exploração metodológica: ver{" "}
            <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 font-bold">
              metodologia completa ↗
            </a>:
          </Note>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 mt-3">
            <li>
              <strong>A curva de Saúde foi criada a partir dos dados brutos do CLIMADA</strong>{" "}
              (a base JRC, Huizinga et al. 2017, que o CLIMADA usa), não é uma saída real do
              modelo: o CLIMADA não modela saúde (só Schools, Residential e Companies), e a
              própria base JRC não tem categoria de saúde/hospital entre suas 6 categorias
              (Residential, Commercial, Industry, Transport, Infrastructure, Agriculture). A curva
              aqui é a média ponto a ponto das curvas cruas JRC de Commerce e Industry, recalibrada
              pelo mesmo fator empírico de Empresas. Tratar como ilustrativa, não calibrada.
            </li>
            <li>
              <strong>9 m²/pessoa é um padrão de ocupação de escritório</strong> (administração
              pública federal, ver <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a>),
              não a área real de cada estabelecimento (esse dado não existe no RAIS/CNES). Tende a
              subestimar indústrias e galpões (que ocupam mais m²/pessoa que escritório) e pode não
              refletir comércio de rua ou varejo pequeno. O uso do número de vínculos como proxy de
              porte também assume valor proporcional a funcionários, o que subestima
              estabelecimentos capital-intensivos com pouca gente (posto de combustível, galpão
              automatizado) e pode superestimar os intensivos em mão de obra com pouco patrimônio
              físico.
            </li>
            <li>
              <strong>O CUB não tem categoria &ldquo;escolar&rdquo; nem &ldquo;saúde&rdquo;.</strong> PP 4-N (Prédio
              Popular) é a aproximação mais próxima de prédio público/institucional simples
              disponível no Sinduscon-RS, não uma categoria feita para isso.
            </li>
            <li>
              <strong>Os multiplicadores de conteúdo/equipamento</strong> (ver{" "}
              <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a>)
              usam as categorias JRC mais próximas disponíveis (Commercial, Industrial,
              Residential), não uma medição brasileira de conteúdo por tipo de estabelecimento,
              que não existe publicamente.
            </li>
            <li>
              <strong>A área por sala</strong> vem de um único projeto padrão (FNDE, 6 salas)
              aplicado a todas as escolas, sem captar diferenças de padrão construtivo (por
              exemplo, escola técnica versus infantil). Já inclui administração, cozinha e pátio
              coberto, mas não inclui quadra coberta (escolas com ginásio coberto ficam
              subestimadas) nem área externa aberta e descoberta.
            </li>
            <li>
              <strong>Dois turnos é assumido para todas as etapas</strong>, inclusive Médio/EJA
              (que às vezes funcionam num turno único, período integral ou noturno): escolas
              que fogem desse padrão terão o número de salas <em>subestimado</em> (a fórmula
              divide a matrícula por 2 turnos mesmo quando a escola roda só 1, calculando menos
              salas do que ela realmente tem). A lotação do Ensino Fundamental é uma média
              ponderada por ano (o dado de origem não discrimina série), e a lotação do Ensino
              Médio também é usada para Profissional e EJA por falta de norma específica
              encontrada; Educação Especial usa a lotação do Fundamental pelo mesmo motivo.
              Além disso, a fórmula assume que toda turma está cheia no teto legal. Escolas
              reais costumam operar com turmas menores que esse teto, o que também tende a
              subestimar o número real de salas.
            </li>
            <li>
              <strong>Estabelecimentos industriais</strong> (CNAE 05-39, {dadosClimada.premissas.n_empresas_industria} de{" "}
              {dadosClimada.premissas.n_empresas_total.toLocaleString("pt-BR")} empresas de {munClimadaAtivo}) usam custo
              de construção e curva de dano próprios (categoria industrial); o restante (comércio,
              serviços, agropecuária e administração pública) segue todo sob o mesmo tratamento
              comercial genérico, mesmo cobrindo setores heterogêneos entre si.
            </li>
            <li>
              <strong>Todo porte tem piso mínimo de 1</strong> (nenhum ponto fica com valor zero).
              Isso afeta menos de 0,1% dos pontos de Empresas e Educação, mas 3,4% dos pontos de
              Saúde (236 de 7.022, sem leitos nem profissionais registrados) recebem um valor de
              reposição mínimo mesmo sem nenhum dado de porte, inflando levemente a exposição
              total do setor.
            </li>
            <li>
              <strong>As curvas de Empresas e Saúde têm um teto de ~36% de dano físico</strong>,
              mesmo em profundidades extremas: a recalibração para Porto Alegre (ver{" "}
              <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a>)
              multiplica a curva JRC bruta inteira pelo fator empírico de 0,36, o que comprime
              também o teto da curva (a curva de Educação, que não passou por essa recalibração,
              chega a 100%). Em uma inundação muito mais severa que o evento de referência de 2024,
              isso pode subestimar o dano de pontos atingidos por lâminas d&apos;água extremas nesses
              dois setores.
            </li>
            <li>
              <strong>Amostragem de profundidade por vizinho mais próximo</strong> (raster ~90 m/pixel):
              pode super ou subestimar a profundidade real em pontos próximos de bordas de quadra.
            </li>
          </ul>
        </Section>

        </>
        ) : null}

        <footer className="mt-12 pt-6 border-t border-[#b3cdd8] text-center print:mt-4">
          <p className="text-[11px] text-[#3d7a94]">
            Painel desenvolvido por GPEA/FURG em parceria com o BID (Banco Interamericano de Desenvolvimento).
          </p>
          <p className="text-[11px] text-[#3d7a94] mt-0.5">© 2024 Alisson Tallys Geraldo Fiorentin · Dados de referência: 2024.</p>
        </footer>
        </main>
      </div>
    </div>
  );
}

// ─── Gráficos SVG — Danos Operacionais ──────────────────────────────────────────

function CompositionBar({ v }: { v: CenarioDanos }) {
  const comps = [
    { value: v.empresas_vab,       color: COMP_COLORS.empresas },
    { value: v.educacao_perdas + v.educacao_custo_adicional, color: COMP_COLORS.educacao },
    { value: v.saude_producao,     color: COMP_COLORS.saude },
    { value: v.agricultura_perdas, color: COMP_COLORS.agricultura },
  ].filter((c) => c.value > 0);
  const total = comps.reduce((s, c) => s + c.value, 0);
  let offset = 0;
  return (
    <svg viewBox="0 0 400 14" className="w-full" style={{ height: 14 }}>
      {comps.map((c, i) => {
        const w = Math.max((c.value / total) * 400, 1);
        const x = offset;
        offset += w;
        return (
          <rect key={i} x={x} y={0} width={w} height={14} fill={c.color}
            rx={i === 0 || i === comps.length - 1 ? 3 : 0} ry={3} />
        );
      })}
    </svg>
  );
}

function TotaisBarChart({
  todosCenarios,
  maxTotal,
}: {
  todosCenarios: { mun: string; cen: string; v: CenarioDanos }[];
  maxTotal: number;
}) {
  const barW = 44;
  const gap = 8;
  const chartH = 140;
  const pL = 60;
  const pB = 52;
  const W = pL + todosCenarios.length * (barW + gap) - gap + 10;

  return (
    <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const val = p * maxTotal;
        const y = chartH - p * chartH + 4;
        return (
          <g key={i}>
            <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
            <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0"}
            </text>
          </g>
        );
      })}
      {todosCenarios.map(({ mun, cen, v }, i) => {
        const barH = Math.max((v.total / maxTotal) * chartH, 2);
        const x = pL + i * (barW + gap);
        const y = chartH - barH + 4;
        const color = MUN_COLORS[mun] ?? "#055071";
        const label = cen.replace(/Cenario\s*/i, "").substring(0, 10);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx="3" opacity="0.9" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="7" fill={color} fontWeight="bold">
              {v.total >= 1e9 ? `${(v.total / 1e9).toFixed(1)}bi` : `${(v.total / 1e6).toFixed(0)}mi`}
            </text>
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize="7.5" fill="#374151" fontWeight="bold">
              {mun.split(" ")[0]}
            </text>
            <text x={x + barW / 2} y={chartH + 26} textAnchor="middle" fontSize="6" fill="#9ca3af">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SensibChart({
  dados,
  diasSelecionado,
}: {
  dados: DanosData;
  diasSelecionado: DiasOpcao;
}) {
  const municipios = Object.entries(dados).map(([mun, cens]) => {
    const cenValOrig = Object.values(cens).reduce((a, b) => (b.total > a.total ? b : a));
    return { mun, cenValOrig };
  });

  const allVals = municipios.flatMap(({ cenValOrig }) =>
    DIAS_OPCOES.map((d) => scaleTo(cenValOrig, d).total)
  );
  const maxVal = Math.max(...allVals);

  const bW = 18;
  const bGap = 3;
  const gGap = 22;
  const gW = DIAS_OPCOES.length * bW + (DIAS_OPCOES.length - 1) * bGap;
  const chartH = 110;
  const pL = 55;
  const pB = 48;
  const W = pL + municipios.length * (gW + gGap) - gGap + 10;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
        {[0, 0.5, 1].map((p, i) => {
          const val = p * maxVal;
          const y = chartH - p * chartH + 4;
          return (
            <g key={i}>
              <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
              <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="7.5" fill="#9ca3af">
                {val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0"}
              </text>
            </g>
          );
        })}
        {municipios.map(({ mun, cenValOrig }, gi) => {
          const gx = pL + gi * (gW + gGap);
          return (
            <g key={mun}>
              {DIAS_OPCOES.map((d, di) => {
                const sc = scaleTo(cenValOrig, d);
                const barH = Math.max((sc.total / maxVal) * chartH, 1);
                const bx = gx + di * (bW + bGap);
                const by = chartH - barH + 4;
                const isSel = d === diasSelecionado;
                const color = MUN_COLORS[mun] ?? "#055071";
                return (
                  <g key={d}>
                    <rect x={bx} y={by} width={bW} height={barH}
                      fill={color}
                      opacity={isSel ? 1 : 0.3}
                      rx="2"
                      style={{ transition: "opacity 0.2s" }}
                    />
                    {isSel && (
                      <text x={bx + bW / 2} y={by - 4} textAnchor="middle" fontSize="6.5" fill={color} fontWeight="bold">
                        {sc.total >= 1e9 ? `${(sc.total / 1e9).toFixed(1)}bi` : `${(sc.total / 1e6).toFixed(0)}mi`}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={gx + gW / 2} y={chartH + 16} textAnchor="middle" fontSize="7.5" fill="#374151" fontWeight="bold">
                {mun.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex gap-5 justify-center mt-2 flex-wrap">
        {DIAS_OPCOES.map((d) => (
          <div key={d} className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-sm bg-[#055071]"
              style={{ opacity: d === diasSelecionado ? 1 : 0.3 }} />
            <span className={`text-[10px] font-medium ${d === diasSelecionado ? "text-[#055071]" : "text-slate-400"}`}>
              {d} dias{d === diasSelecionado ? " ◀" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gráficos SVG — CLIMADA ──────────────────────────────────────────────────────

function CompositionBarClimada({ atual, setores }: { atual: Record<string, SetorResultado>; setores: string[] }) {
  const total = setores.reduce((s, k) => s + atual[k].dano_fisico_total_brl, 0) || 1;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
      {setores.map((s) => (
        <div key={s} style={{ width: `${(atual[s].dano_fisico_total_brl / total) * 100}%`, backgroundColor: SETOR_COLORS[s] }} />
      ))}
    </div>
  );
}

function RpBarChart({ rpsDisponiveis, resultados, setores, maxTotal, rpAtivo }: {
  rpsDisponiveis: string[];
  resultados: Record<string, Record<string, SetorResultado>>;
  setores: string[];
  maxTotal: number;
  rpAtivo: string;
}) {
  const barW = 56;
  const gap = 14;
  const chartH = 150;
  const pL = 46;
  const pB = 24;
  const W = pL + rpsDisponiveis.length * (barW + gap) - gap + 10;

  return (
    <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const val = p * maxTotal;
        const y = chartH - p * chartH + 4;
        return (
          <g key={i}>
            <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
            <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0"}
            </text>
          </g>
        );
      })}
      {rpsDisponiveis.map((r, i) => {
        const d = resultados[r];
        const x = pL + i * (barW + gap);
        let yTop = chartH + 4;
        const segs = setores.map((s) => {
          const h = Math.max((d[s].dano_fisico_total_brl / maxTotal) * chartH, d[s].dano_fisico_total_brl > 0 ? 1 : 0);
          yTop -= h;
          return { s, y: yTop, h };
        });
        const total = setores.reduce((sum, k) => sum + d[k].dano_fisico_total_brl, 0);
        return (
          <g key={r} opacity={r === rpAtivo ? 1 : 0.55}>
            {segs.map(({ s, y, h }) => (
              <rect key={s} x={x} y={y} width={barW} height={h} fill={SETOR_COLORS[s]} />
            ))}
            <rect x={x} y={chartH - Math.max((total / maxTotal) * chartH, 1) + 4} width={barW} height={Math.max((total / maxTotal) * chartH, 1)}
              fill="none" stroke={r === rpAtivo ? "#d97706" : "none"} strokeWidth="2" rx="2" />
            <text x={x + barW / 2} y={yTop - 5} textAnchor="middle" fontSize="8" fill="#374151" fontWeight="bold">
              {total >= 1e9 ? `${(total / 1e9).toFixed(1)}bi` : `${(total / 1e6).toFixed(0)}mi`}
            </text>
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="9" fill={r === rpAtivo ? "#d97706" : "#9ca3af"} fontWeight="bold">
              {r}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CotaBarChart({ cotas, resultados, setores, maxTotal, cotaAtiva }: {
  cotas: string[];
  resultados: Record<string, Record<string, CotaSetor>>;
  setores: string[];
  maxTotal: number;
  cotaAtiva: string;
}) {
  const barW = 26;
  const gap = 8;
  const chartH = 150;
  const pL = 46;
  const pB = 24;
  const W = pL + cotas.length * (barW + gap) - gap + 10;
  const fmtAxis = (val: number) => (val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0");

  return (
    <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = chartH - p * chartH + 4;
        return (
          <g key={i}>
            <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
            <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{fmtAxis(p * maxTotal)}</text>
          </g>
        );
      })}
      {cotas.map((c, i) => {
        const d = resultados[c];
        const x = pL + i * (barW + gap);
        let yTop = chartH + 4;
        const segs = setores.map((st) => {
          const v = d[st].dano_fisico_brl_poa;
          const h = Math.max((v / maxTotal) * chartH, v > 0 ? 1 : 0);
          yTop -= h;
          return { st, y: yTop, h };
        });
        const crua = setores.reduce((sum, k) => sum + d[k].dano_fisico_brl_jrc_crua, 0);
        const yCrua = chartH + 4 - (crua / maxTotal) * chartH;
        const ativa = c === cotaAtiva;
        return (
          <g key={c} opacity={ativa ? 1 : 0.6}>
            {segs.map(({ st, y, h }) => (
              <rect key={st} x={x} y={y} width={barW} height={h} fill={SETOR_COLORS[st]} />
            ))}
            <line x1={x - 2} x2={x + barW + 2} y1={yCrua} y2={yCrua} stroke="#334155" strokeWidth="1.5" strokeDasharray="3 2" />
            {ativa && <rect x={x - 2} y={yCrua - 2} width={barW + 4} height={chartH + 4 - yCrua + 2} fill="none" stroke="#d97706" strokeWidth="2" rx="2" />}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="8" fill={ativa ? "#d97706" : "#9ca3af"} fontWeight="bold">
              {c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── CLIMADA sem curva de dano: valor exposto atingido (Lajeado) ───────────────

const FAIXA_LABEL: [string, string][] = [
  ["ate_0_5m", "≤ 0,5 m"], ["0_5_a_1m", "0,5–1 m"], ["1_a_2m", "1–2 m"], ["2_a_3m", "2–3 m"], ["acima_3m", "> 3 m"],
];

function ExposicaoView({ expo, mun, visao, rp, cota, setAba }: {
  expo: ExposicaoMun; mun: string; visao: "rp" | "cota"; rp: string; cota: string; setAba: (a: "dala" | "climada") => void;
}) {
  const setores = ["empresas", "educacao", "saude"];
  const soma = (r: Record<string, ExposicaoSetor>, k: "valor_exposto_atingido_brl" | "exposicao_total_brl") =>
    setores.reduce((s, st) => s + r[st][k], 0);
  const rpsLista = RP_ORDER.filter((r) => expo.resultados_por_rp[r]);
  const rpAtivo = expo.resultados_por_rp[rp] ? rp : rpsLista[rpsLista.length - 1];
  const cotasLista = Object.keys(expo.por_cota).sort((a, b) => parseFloat(a) - parseFloat(b));
  const cotaAtiva = expo.por_cota[cota] ? cota : cotasLista[Math.floor(cotasLista.length / 2)];
  const atual = visao === "rp" ? expo.resultados_por_rp[rpAtivo] : expo.por_cota[cotaAtiva];
  const titulo = visao === "rp" ? `${mun} · ${rpAtivo}` : `${mun} · cota ${cotaAtiva} m`;
  const acima = new Set(expo.rp_por_cota.rps_acima_do_ultimo_raster);
  const total = soma(atual, "valor_exposto_atingido_brl");
  const expTotal = soma(atual, "exposicao_total_brl");
  const proj = expo.projecao_2050;

  return (
    <>
      <Section id="c-resumo" num="1" title="Resumo">
        <Note type="warning">
          <strong>Aqui não há dano em R$.</strong> Sem curva de dano (JRC) não dá para converter
          profundidade em fração destruída, e não há perda observada para calibrar. O indicador é o{" "}
          <strong>valor exposto atingido</strong>: valor de reposição de tudo o que fica sob água
          (profundidade &gt; 0). Ele é o <strong>teto</strong> do dano (equivale a perda total de
          tudo que molha), não uma estimativa dele. Não somar com os Danos Operacionais (
          <button onClick={() => setAba("dala")} className="underline underline-offset-2 font-bold">DaLA</button>
          ) nem comparar com o dano de Porto Alegre.
        </Note>
        {visao === "rp" && acima.size > 0 && (
          <Note type="info">
            {Array.from(acima).join(" e ")} ficam acima do último raster de profundidade (
            {expo.rp_por_cota.cota_cobertura_raster_m[1]} m): o valor é extrapolado e subestima o
            que seria atingido por cotas maiores.
          </Note>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
          <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">{titulo}</p>
              <p className="text-2xl font-black text-white leading-none">{fmtBRL(total)}</p>
              <p className="text-[9px] text-white/60 font-mono mt-1">
                valor exposto atingido (3 setores) · {expTotal ? ((total / expTotal) * 100).toFixed(1) : "0,0"}% da exposição total · teto, não dano
              </p>
            </div>
            <div className="px-4 pt-3 pb-1">
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                {setores.map((st) => (
                  <div key={st} style={{ width: `${(atual[st].valor_exposto_atingido_brl / (total || 1)) * 100}%`, backgroundColor: SETOR_COLORS[st] }} />
                ))}
              </div>
            </div>
            <div className="px-4 pb-4 pt-2 grid grid-cols-1 gap-y-1">
              {setores.map((st) => (
                <KpiRow
                  key={st}
                  label={SETOR_LABEL[st]}
                  value={fmtBRL(atual[st].valor_exposto_atingido_brl)}
                  sub={`${atual[st].exposicao_total_brl ? ((atual[st].valor_exposto_atingido_brl / atual[st].exposicao_total_brl) * 100).toFixed(1) : "0,0"}% do setor`}
                  color={SETOR_COLORS[st]}
                />
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Exposição total (patrimônio no município)</p>
            <p className="text-2xl font-black text-slate-800 leading-none mb-3">{fmtBRL(expTotal)}</p>
            {setores.map((st) => (
              <div key={st} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 first:border-t-0">
                <span className="text-slate-500">{SETOR_LABEL[st]}: {atual[st].n_atingidos}/{atual[st].n_total} pontos atingidos</span>
                <span className="font-bold text-slate-700">prof. média {atual[st].profundidade_media_atingidos_m.toFixed(2)}m</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {visao === "rp" ? (
        <>
          <Section id="c-faixas" num="2" title="Gravidade por faixa de profundidade">
            <p>
              Valor exposto atingido em {rpAtivo}, por faixa de profundidade da água. Mostra a gravidade
              sem nenhuma premissa de curva: quanto mais valor nas faixas fundas, maior o dano
              provável, mas o quanto exatamente depende de uma curva que não temos.
            </p>
            <DataTable
              rows={[
                ["Setor", ...FAIXA_LABEL.map(([, l]) => l), "Total atingido"],
                ...setores.map((st) => [
                  SETOR_LABEL[st],
                  ...FAIXA_LABEL.map(([k]) => fmtBRL(atual[st].faixas_valor_brl[k] ?? 0)),
                  fmtBRL(atual[st].valor_exposto_atingido_brl),
                ]),
              ]}
            />
          </Section>

          <Section id="c-eai" num="3" title="Exposição atingida anual esperada">
            <p>
              As seções anteriores mostram o valor atingido por <em>um evento</em> de cada RP. A
              exposição atingida anual esperada resume tudo num único número: quanto valor, <strong>em
              média por ano</strong>, fica sob água, somando eventos frequentes e pequenos com raros e
              grandes, ponderados pela probabilidade de cada um. É a mesma integral do risco anual
              esperado (EAI), aplicada ao valor exposto em vez do dano: o teto do EAI.
            </p>
            <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm mt-3">
              <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">{mun} · todos os setores</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(expo.eai_exposto.total)} / ano</p>
                <p className="text-[9px] text-white/60 font-mono mt-1">
                  exposição atingida anual esperada, integrada sobre {rpsLista.length} período(s) de retorno ({rpsLista[0]}..{rpsLista[rpsLista.length - 1]}) · sem a cauda assumida: {fmtBRL(expo.eai_exposto_sem_cauda_brl)}/ano
                </p>
              </div>
              <div className="px-4 py-4 grid grid-cols-1 gap-y-1.5">
                {setores.map((st) => {
                  const valor = expo.eai_exposto[st as "empresas" | "educacao" | "saude"];
                  return (
                    <KpiRow
                      key={st}
                      label={SETOR_LABEL[st]}
                      value={`${fmtBRL(valor)} / ano`}
                      sub={`${((valor / expo.eai_exposto.total) * 100).toFixed(0)}% do total`}
                      color={SETOR_COLORS[st]}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-[13px]">
              Regra do trapézio sobre a curva frequência de excedência × valor atingido, com
              extrapolação linear a zero acima de RP10 e platô constante abaixo de RP500:
            </p>
            <MathBlock exprs={[
              { label: "Frequência de excedência", tex: "f_i = \\dfrac{1}{RP_i}" },
              { label: "Exposição anual esperada (aproximada)", tex: "\\text{EAI} \\approx \\sum_i \\dfrac{(f_i - f_{i+1})(L_i + L_{i+1})}{2}" },
            ]} />
            <p className="text-[11px] text-slate-500">
              A cauda abaixo do RP10 é uma reta assumida até &ldquo;evento anual, nada atingido&rdquo; e
              responde por boa parte do número; a versão sem ela é a que os RPs calculados sustentam.
              Aproximação por pontos de RP interpolados: tratar como ordem de grandeza. Ver{" "}
              <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Metodologia</a>.
            </p>
          </Section>

          {proj && (
            <Section id="c-projecao" num="4" title="Projeção 2025→2050">
              <p>
                As seções anteriores mostram a exposição de <strong>hoje</strong> (2025). Esta projeção
                estima como ela muda até 2050, decomposta em dois motores independentes: o{" "}
                <strong>crescimento econômico</strong> (mais patrimônio exposto, mesma lâmina d&apos;água)
                e a <strong>mudança climática</strong> (a lâmina d&apos;água de hoje passa a ocorrer com
                frequência maior). Segue a mesma decomposição de Porto Alegre.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
                <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">Exposição atingida anual esperada</p>
                    <p className="text-2xl font-black text-white leading-none">
                      {fmtBRL(proj.total.risco_2025_brl)} <span className="text-sm opacity-60">→</span> {fmtBRL(proj.total.risco_2050_brl)}
                    </p>
                    <p className="text-[9px] text-white/60 font-mono mt-1">2025 → 2050 · {proj.premissas.rps_usados.length} RPs com remapeamento oficial</p>
                  </div>
                  <div className="px-4 py-4 grid grid-cols-1 gap-y-1.5">
                    <KpiRow label="Aumento total" value={`${fmtBRL(proj.total.aumento_total_brl)}/ano`} sub="2025→2050" color="#055071" />
                    <KpiRow label="Por crescimento econômico" value={`${fmtBRL(proj.total.parcela_crescimento_brl)}/ano`} sub={`${(100 - proj.total.pct_climatico).toFixed(0)}% do aumento`} color="#2563eb" />
                    <KpiRow label="Por mudança climática" value={`${fmtBRL(proj.total.parcela_clima_brl)}/ano`} sub={`${proj.total.pct_climatico.toFixed(0)}% do aumento`} color="#dc2626" />
                  </div>
                </div>
                <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Premissas</p>
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between border-t border-slate-100 pt-1 first:border-t-0 first:pt-0">
                      <span className="text-slate-500">Crescimento econômico</span>
                      <span className="font-bold text-slate-700">{(proj.premissas.crescimento_anual * 100).toFixed(0)}%/ano · {proj.premissas.anos_projecao} anos (×{proj.premissas.fator_crescimento.toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1">
                      <span className="text-slate-500">RPs usados</span>
                      <span className="font-bold text-slate-700">{proj.premissas.rps_usados.join(", ")}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{proj.premissas.crescimento_fonte}. O remapeamento de frequência é o do Guaíba, aplicado ao Taquari como premissa.</p>
                </div>
              </div>
              <SubTitle>Decomposição por setor</SubTitle>
              <DataTable rows={[
                ["Setor", "Exposição 2025", "Exposição 2050", "Crescimento", "Clima", "% climático"],
                ...setores.map((st) => {
                  const ps = proj.por_setor[st];
                  return [SETOR_LABEL[st], fmtBRL(ps.risco_2025_brl), fmtBRL(ps.risco_2050_brl), fmtBRL(ps.parcela_crescimento_brl), fmtBRL(ps.parcela_clima_brl), `${ps.pct_climatico.toFixed(0)}%`];
                }),
              ]} />
            </Section>
          )}

          <Section id="c-comparativo" num="5" title="Comparativo por Período de Retorno">
            <p>
              Quanto maior o período de retorno (RP), mais rara e mais severa a inundação modelada, e
              maior a área atingida. O gráfico mostra o valor exposto atingido (3 setores) para cada RP.
            </p>
            <div className="bg-white border border-[#b3cdd8] rounded-xl p-5 shadow-sm mt-3">
              <p className="text-[10px] text-slate-400 font-medium mb-2">
                Cada barra soma o valor exposto atingido dos 3 setores para aquele RP, dividida por cor
                (proporcional). O número no topo é o total; a barra com contorno âmbar é o RP
                selecionado acima.{acima.size > 0 ? ` ${Array.from(acima).join(" e ")} estão acima do último raster (extrapolados).` : ""}
              </p>
              <RpBarChart
                rpsDisponiveis={rpsLista}
                resultados={Object.fromEntries(rpsLista.map((r) => [r, Object.fromEntries(setores.map((st) => [st, { dano_fisico_total_brl: expo.resultados_por_rp[r][st].valor_exposto_atingido_brl } as unknown as SetorResultado]))]))}
                setores={setores}
                maxTotal={Math.max(...rpsLista.map((r) => soma(expo.resultados_por_rp[r], "valor_exposto_atingido_brl")))}
                rpAtivo={rpAtivo}
              />
              <div className="flex gap-4 flex-wrap mt-4 justify-center">
                {setores.map((st) => (
                  <div key={st} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SETOR_COLORS[st] }} />
                    <span className="text-[10px] text-slate-500 font-medium">{SETOR_LABEL[st]}</span>
                  </div>
                ))}
              </div>
            </div>
            <SubTitle>Tabela completa</SubTitle>
            <DataTable rows={[
              ["RP", "Cota na régua (m)", "Empresas", "Educação", "Saúde", "Total", "Exposição total"],
              ...rpsLista.map((r) => {
                const a = expo.resultados_por_rp[r];
                return [
                  <strong key="rp">{r}{acima.has(r) ? " *" : ""}</strong>,
                  expo.rp_por_cota.rps[r].cota_regua_m.toFixed(2).replace(".", ","),
                  fmtBRL(a.empresas.valor_exposto_atingido_brl),
                  fmtBRL(a.educacao.valor_exposto_atingido_brl),
                  fmtBRL(a.saude.valor_exposto_atingido_brl),
                  <strong key="tot">{fmtBRL(soma(a, "valor_exposto_atingido_brl"))}</strong>,
                  fmtBRL(soma(a, "exposicao_total_brl")),
                ];
              }),
            ]} />
            <p className="text-[11px] text-slate-500">* acima do último raster (extrapolado).</p>
          </Section>

          <Section id="c-medidas" num="6" title="Medidas de Adaptação">
            <p>
              Quanto da exposição atingida anual esperada cada medida evitaria. Só entram as medidas
              cujo efeito não depende da curva de dano: proteção coletiva, vedação do imóvel (−45% do
              valor atingido onde a profundidade é de até 1 m) e relocação. Ficam de
              fora o <strong>alerta antecipado</strong> e o <strong>estoque elevado</strong>, que
              atuam reduzindo a fração destruída (MDD) e portanto exigem a curva.
            </p>
            <Note type="warning">
              <strong>Custo-benefício limitado ao que os dados sustentam.</strong> O benefício é em
              valor <em>exposto</em> (teto, não dano), então todo B/C é um <strong>máximo</strong>. O
              <strong> custo de equilíbrio</strong> é quanto a medida poderia custar e ainda se pagar,
              mesmo supondo perda total do que molha (valor presente 2025–2050, desconto de 6% a.a.,
              risco sem a cauda assumida). Os custos seguem as mesmas regras de Porto Alegre, aplicadas a
              {mun}; o custo e a fonte de cada medida estão abaixo da tabela.
            </Note>
            <MedidasTable medidasMun={expo.medidas} exposicao />
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
              <li>
                <strong>Proteção coletiva (dique)</strong> supõe nenhum alagamento até o RP de projeto,
                sem falha nem galgamento: é um teto. Como zera o RP10, também apaga a cauda assumida do
                EAI, por isso a coluna &ldquo;sem cauda assumida&rdquo; é a comparação mais justa.
              </li>
              <li>
                Parâmetros da literatura (ver Fontes); relocação e diques são cenários de projeto. O
                custo do dique é genérico: a proporção custo/exposição do programa de proteção de
                Porto Alegre aplicada à exposição de {mun}, não um orçamento local. A vedação é contada
                por coordenada atingida (aproximação de edificação). As medidas não se somam.
              </li>
            </ul>
          </Section>
        </>
      ) : (
        <Section id="c-tabela" num="2" title="Valor exposto atingido por cota do rio">
          <p>
            Valor exposto atingido em cada cota (rasters de 18,45 a 34,45 m, passo 1 m), com o máximo
            acumulado entre cotas. Sem período de retorno associado a cada cota, não há EAI nesta visão.
          </p>
          <DataTable
            rows={[
              ["Cota (m)", "Empresas atingidas", "Escolas atingidas", "Unid. saúde atingidas", "Valor exposto atingido"],
              ...cotasLista.map((c) => {
                const r = expo.por_cota[c];
                return [
                  <span key="c" className={c === cotaAtiva ? "font-black text-amber-700" : "font-bold"}>{c}</span>,
                  `${r.empresas.n_atingidos}/${r.empresas.n_total}`,
                  `${r.educacao.n_atingidos}/${r.educacao.n_total}`,
                  `${r.saude.n_atingidos}/${r.saude.n_total}`,
                  fmtBRL(soma(r, "valor_exposto_atingido_brl")),
                ];
              }),
            ]}
          />
        </Section>
      )}

      <Section id="c-limitacoes" num={visao === "rp" ? "7" : "3"} title="Limitações">
        <Note type="warning">
          Estes números são um <strong>protótipo</strong> para explorar a metodologia CLIMADA/CCDR em
          cima dos nossos próprios dados (RAIS/Censo Escolar/CNES). Não substituem os Danos
          Operacionais (DaLA) da aba principal; ver{" "}
          <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-bold">metodologia completa ↗</a>:
        </Note>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 mt-3">
          <li>
            <strong>Exposição, não dano.</strong> Todo ponto com profundidade &gt; 0 conta com 100% do
            seu valor de reposição. Não há curva JRC nem calibração para {mun}; o dano real fica entre
            zero e este valor.
          </li>
          <li>
            <strong>Valor de reposição é estimativa</strong> (CUB/RS × área por proxy: 9 m² por pessoa,
            salas por matrícula; ver metodologia), não cadastro de valor de mercado.
          </li>
          <li>
            <strong>Coordenada corrigida em um estabelecimento.</strong> O Hospital Bruno Born
            (1.867 profissionais e 201 leitos) estava geocodificado na coordenada genérica do
            centro, dentro da mancha; foi movido para o endereço real (Av. Benjamin Constant, 881,
            coordenada do OpenStreetMap), que fica fora dela. É a única exceção à regra de manter
            a base como reportada, porque sozinho ele respondia pela maior parte do valor atingido
            de Saúde.
          </li>
          <li>
            <strong>Coordenadas repetidas na base oficial.</strong> Em {mun}: empresas 3.443 em 649
            coordenadas (maior pilha: 300), saúde 587 em 385 (maior: 86), educação 74 em 62. A base é
            mantida como reportada; cada pilha entra ou sai da mancha de uma vez, o que gera degraus
            no valor atingido.
          </li>
          <li>
            <strong>Frequência (RP):</strong> Gumbel por L-momentos sobre a série de cotas máximas anuais
            do SGB (1939–2023) mais 2024 provisório; o datum dos rasters (régua − 0,55 m) é hipótese não
            confirmada pelo autor dos rasters.
          </li>
          <li>
            <strong>Rasters não monotônicos entre cotas:</strong> aplicado o máximo acumulado por ponto.
            Amostragem por pixel de ~5 m (vizinho mais próximo).
          </li>
          <li>
            <strong>Projeção 2050</strong> herda de Porto Alegre o remapeamento de frequência e o
            crescimento de 2%/ano, sem validação para o Taquari.
          </li>
        </ul>
      </Section>
    </>
  );
}

function MedidasTable({ medidasMun, exposicao }: { medidasMun: MedidasMun; exposicao?: boolean }) {
  const cb = !!medidasMun.custo_beneficio_premissas;
  const fmt2 = (v: number | null | undefined) => (v === null || v === undefined ? "n/d" : v.toFixed(2).replace(".", ","));
  const link = (txt?: string, url?: string | null) =>
    url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{txt} ↗</a> : <span>{txt}</span>;
  return (
    <>
    <div className="overflow-x-auto my-3 rounded-xl border border-[#b3cdd8] shadow-sm">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#055071] text-white">
            <th className="text-left px-3 py-2.5 font-bold">Medida</th>
            <th className="text-right px-3 py-2.5 font-bold">{exposicao ? "Exposição evitada / ano" : "Risco evitado / ano"}</th>
            <th className="text-right px-3 py-2.5 font-bold">Sem cauda assumida</th>
            <th className="text-right px-3 py-2.5 font-bold">Evitado em 2050 / ano</th>
            {cb && (<>
              <th className="text-right px-3 py-2.5 font-bold">Custo</th>
              <th className="text-right px-3 py-2.5 font-bold">{exposicao ? "Custo de equilíbrio" : "Benefício (VP)"}</th>
              <th className="text-right px-3 py-2.5 font-bold">{exposicao ? "B/C máx." : "B/C"}</th>
            </>)}
          </tr>
        </thead>
        <tbody>
          {medidasMun.medidas.map((m, i) => (
            <tr key={m.id} className="border-t border-[#b3cdd8]" style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f0f7fa" }}>
              <td className="px-3 py-2 align-top">
                <p className="font-bold text-slate-800">{m.nome}</p>
                <p className="text-[10px] text-slate-500">{m.mecanismo}</p>
                <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(m.pct_evitado_sem_cauda, 100)}%` }} />
                </div>
                {(() => {
                  const tot = Object.values(m.evitado_por_setor_brl).reduce((x, y) => x + y, 0);
                  if (!(tot > 0)) return null;
                  return (
                    <div className="mt-1.5" title="Evitado por setor (EAI, com a cauda assumida)">
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                        {Object.keys(SETOR_LABEL).map((st) => (
                          <div key={st} style={{ width: `${((m.evitado_por_setor_brl[st] ?? 0) / tot) * 100}%`, backgroundColor: SETOR_COLORS[st] }} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {Object.keys(SETOR_LABEL).filter((st) => (m.evitado_por_setor_brl[st] ?? 0) > 0).map((st) => (
                          <span key={st} className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SETOR_COLORS[st] }} />
                            {SETOR_LABEL[st]} {fmtBRL(m.evitado_por_setor_brl[st])}/ano
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </td>
              <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                <span className="font-bold text-slate-800">{fmtBRL(m.eai_evitado_brl)}</span>
                <span className="block text-[10px] text-slate-500">{m.pct_evitado.toFixed(1).replace(".", ",")}% do EAI</span>
              </td>
              <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                <span className="font-bold text-slate-800">{fmtBRL(m.eai_evitado_sem_cauda_brl)}</span>
                <span className="block text-[10px] text-slate-500">{m.pct_evitado_sem_cauda.toFixed(1).replace(".", ",")}%</span>
              </td>
              <td className="px-3 py-2 align-top text-right whitespace-nowrap font-bold text-slate-800">
                {m.eai_2050_evitado_brl !== null ? fmtBRL(m.eai_2050_evitado_brl) : "n/d"}
              </td>
              {cb && m.custo_beneficio && (<>
                <td className="px-3 py-2 align-top text-right whitespace-nowrap" title={m.custo_beneficio.custo_fonte}>
                  <span className="font-bold text-slate-800">
                    {m.custo_beneficio.custo_min_brl !== undefined ? `${fmtBRL(m.custo_beneficio.custo_min_brl)} a ` : ""}
                    {m.custo_beneficio.custo_brl !== null ? fmtBRL(m.custo_beneficio.custo_brl) : "n/d"}
                  </span>
                  {m.custo_beneficio.setores_com_custo.length > 0 && m.custo_beneficio.setores_com_custo.length < 3 && (
                    <span className="block text-[10px] text-slate-500">só {m.custo_beneficio.setores_com_custo.map((x) => SETOR_LABEL[x]).join(" e ")}</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                  <span className="font-bold text-slate-800">{fmtBRL(m.custo_beneficio.beneficio_vp_sem_cauda_brl)}</span>
                  <span className="block text-[10px] text-slate-500">com cauda: {fmtBRL(m.custo_beneficio.beneficio_vp_brl)}</span>
                </td>
                <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                  {m.custo_beneficio.bc_sem_cauda_max !== undefined ? (
                    <>
                      {/* faixa de custo: o B/C vai do custo mais alto ao mais baixo */}
                      <span className={`font-black ${(m.custo_beneficio.bc_sem_cauda ?? 0) >= 1 ? "text-[#2d7a2d]" : m.custo_beneficio.bc_sem_cauda_max >= 1 ? "text-amber-700" : "text-[#b23a2b]"}`}>
                        {fmt2(m.custo_beneficio.bc_sem_cauda)} a {fmt2(m.custo_beneficio.bc_sem_cauda_max)}
                      </span>
                      <span className="block text-[10px] text-slate-500">com cauda: {fmt2(m.custo_beneficio.bc)} a {fmt2(m.custo_beneficio.bc_max)}</span>
                    </>
                  ) : (
                    <>
                      <span className={`font-black ${(m.custo_beneficio.bc_sem_cauda ?? 0) >= 1 ? "text-[#2d7a2d]" : "text-[#b23a2b]"}`}>{fmt2(m.custo_beneficio.bc_sem_cauda)}</span>
                      <span className="block text-[10px] text-slate-500">com cauda: {fmt2(m.custo_beneficio.bc)}</span>
                    </>
                  )}
                </td>
              </>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm my-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Fontes dos parâmetros e dos custos</p>
      <ul className="flex flex-col gap-2 text-[11px] text-slate-600 leading-relaxed">
        {medidasMun.medidas.map((m) => (
          <li key={m.id}>
            <span className="font-bold text-slate-800">{m.nome}.</span>{" "}
            <span className="text-slate-500">Parâmetro:</span> {link(m.fonte, m.fonte_url)}.
            {m.custo_beneficio && (<>
              {" "}<span className="text-slate-500">Custo:</span> {m.custo_beneficio.custo_descricao ?? "n/d"} ({link(m.custo_beneficio.custo_fonte, m.custo_beneficio.custo_fonte_url)}).
            </>)}
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}

// ─── Componentes UI compartilhados ────────────────────────────────────────────

function DiasBadge({ dias }: { dias: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#055071]/10 border border-[#055071]/20 mb-2">
      <div className="w-1.5 h-1.5 rounded-full bg-[#055071]" />
      <span className="text-[10px] font-black text-[#055071] uppercase tracking-wider">
        {dias} dias efetivos selecionados · f = {(dias / 365).toFixed(4)}
      </span>
    </div>
  );
}

function KpiRow({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-1 text-[11px]">
      <div className="flex items-center gap-1 min-w-0">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-slate-500 truncate">{label}</span>
      </div>
      <span className="font-bold text-slate-700 shrink-0">
        {value} <span className="text-[9px] font-normal text-slate-400">({sub})</span>
      </span>
    </div>
  );
}

function Section({ id, num, title, children }: {
  id: string; num: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-[10px] font-black text-white bg-[#055071] rounded-md px-2 py-1 shrink-0">
          {num}
        </span>
        <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
      <div className="mt-8 border-b border-[#b3cdd8]" />
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-black text-[#055071] mt-5 mb-1.5 uppercase tracking-wide">
      {children}
    </h3>
  );
}

function MathBlock({ exprs }: { exprs: Array<{ label?: string; tex: string }> }) {
  return (
    <div className="my-3 px-5 py-4 bg-[#f0f7fa] border border-[#b3cdd8] rounded-lg overflow-x-auto space-y-3">
      {exprs.map(({ label, tex }, i) => {
        const html = katex.renderToString(tex, { displayMode: true, throwOnError: false, trust: false });
        return (
          <div key={i} className="flex items-baseline gap-4 flex-wrap">
            {label && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3d7a94] shrink-0 w-44">
                {label}
              </span>
            )}
            <span dangerouslySetInnerHTML={{ __html: html }} className="block my-1" />
          </div>
        );
      })}
    </div>
  );
}

function DataTable({ rows }: { rows: React.ReactNode[][] }) {
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto my-3 rounded-xl border border-[#b3cdd8] shadow-sm">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#055071] text-white">
            {header.map((h, i) => <th key={i} className="text-left px-3 py-2.5 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-t border-[#b3cdd8] hover:bg-[#e8f4f8] transition-colors duration-100"
              style={{ backgroundColor: ri % 2 === 0 ? "#ffffff" : "#f0f7fa" }}>
              {row.map((cell, ci) => <td key={ci} className="px-3 py-2 align-top">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ type, children }: { type: "warning" | "info"; children: React.ReactNode }) {
  const cfg = {
    warning: { bg: "bg-amber-50",  border: "border-amber-300", text: "text-amber-900", icon: "⚠" },
    info:    { bg: "bg-[#eff6ff]", border: "border-[#93c5fd]", text: "text-[#1e40af]", icon: "ℹ" },
  }[type];
  return (
    <div className={`rounded-lg px-4 py-3 text-[12px] leading-relaxed my-3 border-l-[3px] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className="font-bold mr-1.5">{cfg.icon}</span>{children}
    </div>
  );
}

