"use client";

import React, { useEffect, useState } from "react";
import katex from "katex";
import { TrendingDown, FlaskConical } from "lucide-react";
import { HeaderLogos } from "@/components/HeaderLogos";

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
export interface ClimadaData {
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
export function DanosClient({ dados, dadosClimada }: { dados: DanosData; dadosClimada: ClimadaData | null }) {
  const [aba, setAba] = useState<"dala" | "climada">("dala");
  const [dias, setDias] = useState<DiasOpcao>(30);
  const [rp, setRp] = useState("RP200");

  // Deep-link opcional: /danos?aba=climada abre direto na aba CLIMADA (ex.: botão do header do mapa).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("aba") === "climada" && dadosClimada) setAba("climada");
  }, [dadosClimada]);

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
    "Porto Alegre":    "Cenario ADA",
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

  // ── Dados CLIMADA para o RP selecionado ──
  const climadaSetores = ["empresas", "educacao", "saude"];
  const rpsDisponiveis = dadosClimada ? RP_ORDER.filter((r) => dadosClimada.resultados_por_rp[r]) : [];
  const rpAtivo = dadosClimada && dadosClimada.resultados_por_rp[rp] ? rp : rpsDisponiveis[0];
  const atualClimada = rpAtivo ? dadosClimada?.resultados_por_rp[rpAtivo] : undefined;
  const totalAtualClimada = atualClimada ? climadaSetores.reduce((s, k) => s + atualClimada[k].dano_fisico_total_brl, 0) : 0;
  const exposicaoAtualClimada = atualClimada ? climadaSetores.reduce((s, k) => s + atualClimada[k].exposicao_total_brl, 0) : 0;
  const maxTotalClimada = dadosClimada && rpsDisponiveis.length
    ? Math.max(...rpsDisponiveis.map((r) => climadaSetores.reduce((s, k) => s + dadosClimada.resultados_por_rp[r][k].dano_fisico_total_brl, 0)))
    : 0;
  const eai = dadosClimada?.eai_anual_esperado ?? null;

  return (
    <div className="min-h-screen bg-[#f0f7fa] text-slate-800 font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-[#055071] text-white px-6 py-10 print:py-5">
        <div className="max-w-[1200px] mx-auto flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-5 print:hidden">
              <a href="/" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Dashboard</a>
              <a href="/metodologia" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Metodologia</a>
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-60 mb-2">
              BID · GPEA · FURG
            </p>
            <h1 className="text-4xl font-black leading-none mb-2 tracking-tight flex items-center gap-3">
              <TrendingDown size={36} strokeWidth={2.5} className="opacity-80 shrink-0" />
              Danos & Risco de Inundação
            </h1>
            <p className="text-base opacity-75 font-medium">
              Perdas Econômicas e Dano Físico Estimado — Enchentes no Rio Grande do Sul
            </p>
            <p className="text-[11px] opacity-50 mt-3 font-mono">
              Metodologia DaLA (CEPAL/BID) — Maio 2024 e Setembro 2023 · Protótipo CLIMADA/CCDR — Porto Alegre
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
            {dadosClimada && (
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94]">
                  Período de retorno
                </span>
                <span className="text-[9px] text-slate-400">(cenário sintético CLIMADA)</span>
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
                  RP200 é a âncora de calibração usada pelo CLIMADA
                </span>
              </div>
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
                ] : [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-eai",          "2. Risco Anual Esperado"],
                  ["#c-comparativo",  "3. Comparativo por RP"],
                  ["#c-limitacoes",   "4. Limitações"],
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
                  <p className="text-[9px] text-white/60 font-mono mt-1">{cenNome} · {dias} dias ef.</p>
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
          <SubTitle>Total de Perdas por Cenário — {dias} dias ef.</SubTitle>
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
            A soma dos piores cenários <strong>não é um agregado único</strong> — cada município
            pode ter cenários com extensões distintas. Os valores representam impactos independentes.
          </Note>
          {dadosClimada && (
            <Note type="info">
              Esta seção mede <strong>perda de fluxo</strong> (DaLA — produção/serviço não
              realizado). Para <strong>destruição de patrimônio</strong> (estoque) em Porto
              Alegre, ver a aba{" "}
              <button onClick={() => setAba("climada")} className="underline underline-offset-2 font-bold">
                Dano Físico (Protótipo)
              </button>{" "}
              acima — são métricas complementares, não somáveis.
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
                      <p className="text-[11px] font-black text-[#055071] uppercase tracking-wide">{cen}</p>
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
            do evento — independem da duração.
          </p>

          {/* Gráfico agrupado */}
          <div className="bg-white border border-[#b3cdd8] rounded-xl p-5 shadow-sm mt-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-4">
              Total por duração — cenário principal de cada município
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
                <SubTitle>{mun} — {cenNome}</SubTitle>
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
            são <strong>incluídos</strong> na estimativa — a interrupção de serviços governamentais
            representa perdas reais para a sociedade, conforme a metodologia DaLA (CEPAL, 2024).
          </p>
          <DataTable rows={[
            ["Indicador — Porto Alegre / ADA", "Valor"],
            ["Estabelecimentos CNAE 84",      "51"],
            ["Participação na massa salarial", "45,3%  (R$ 559,7 mi/mês)"],
            ["Contribuição ao total (60 dias)","≈ R$ 625 mi de R$ 4,5 bi"],
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
                implica R$ 1,74 mi de queda de ICMS — razão de 206×. Grandes empregadoras como Tramontina
                recolhem ICMS na sede em Carlos Barbosa (RS), não em Lajeado, tornando o ICMS municipal
                completamente dissociado da atividade econômica local.
              </li>
              <li>
                <strong>2. Cobertura setorial parcial.</strong>{" "}
                O ICMS incide sobre circulação de mercadorias e alguns serviços de comunicação e transporte.
                Serviços em geral — que representam a maior parcela do VAB nas cidades maiores —
                recolhem ISS ao município, não ICMS ao Estado. Em Porto Alegre, o ICMS capturou apenas
                R$ 136,8 mi de shortfall frente a R$ 388 mi implicados pelo nosso VAB estimado (razão 2,84×),
                refletindo que bancos, consultorias e tecnologia estão fora do escopo do ICMS.
              </li>
              <li>
                <strong>3. Timing divergente e efeitos de compensação.</strong>{" "}
                Em Rio Grande, o ICMS de maio/2024 apresentou alta de +43,8% em relação ao baseline,
                enquanto o evento de cheia afetou principalmente abril/2024 (−41,4%). O movimento positivo
                em maio reflete provavelmente a refinaria e o porto — atividades não atingidas — gerando
                ICMS normalmente, além de demanda emergencial de combustíveis. O ICMS municipal, por ser
                agregado, não permite isolar a parcela gerada por estabelecimentos dentro da mancha de inundação.
              </li>
            </ul>
            <p>
              O método RAIS + <em>labor share</em> resolve as três limitações: opera no nível do
              estabelecimento (CNPJ), aplica o teste ponto-em-polígono para isolar apenas firmas dentro
              da mancha, e cobre todos os setores formais independentemente do tributo recolhido.
              O ICMS permanece útil apenas como sinal de validação de ordem de grandeza —
              consistente com Eldorado do Sul (razão 1,12×) —, não como metodologia de estimação.
            </p>
          </div>
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
            Disponível <strong>só para Porto Alegre</strong>: o cálculo depende de profundidade da
            água por ponto (não apenas se o ponto foi atingido), e só Porto Alegre tem raster de
            profundidade (produzido pelo exercício CLIMADA). Eldorado do Sul, Lajeado e Rio Grande
            têm somente polígonos de extensão da mancha (atingido sim/não, sem profundidade), que
            não permitem esse cálculo.
          </Note>

          <Note type="info">
            <strong>O que é um Período de Retorno (RP)?</strong> É a magnitude estatística de um
            evento raro, expressa pelo intervalo médio (em anos) entre ocorrências dessa magnitude
            ou maior (não é uma previsão de &ldquo;acontece exatamente a cada N anos&rdquo;). Um evento{" "}
            <strong>RP100</strong> tem <strong>1% de chance</strong> de ocorrer em um ano qualquer
            (probabilidade = 1/RP); um <strong>RP500</strong> é mais raro e mais severo (0,2% ao
            ano), mas quando ocorre, alaga mais fundo e atinge mais área. São cenários{" "}
            <em>sintéticos</em> do modelo de risco do CLIMADA, diferentes do Cenário ADA e do
            Climada Evento 2024 do mapa principal, que representam a extensão de um evento real
            observado (maio/2024).
          </Note>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            <div className="bg-white border border-[#b3cdd8] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">Porto Alegre · {rpAtivo}</p>
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
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70 mb-0.5">Porto Alegre · todos os setores</p>
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
            SEÇÃO 3 — COMPARATIVO POR RP
        ══════════════════════════════════════════════════════════════════ */}
        <Section id="c-comparativo" num="3" title="Comparativo por Período de Retorno">
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
        <Section id="c-limitacoes" num="4" title="Limitações">
          <Note type="warning">
            Estes números são um <strong>protótipo</strong> para explorar a viabilidade de aplicar a
            metodologia CLIMADA/CCDR (destruição de estoque) em cima dos nossos próprios dados
            (RAIS/Censo Escolar/CNES). Não substituem os Danos Operacionais (DaLA) da aba principal,
            e carregam premissas explícitas que precisam de validação antes de qualquer
            uso além de exploração metodológica — ver{" "}
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
              Além disso, a fórmula assume que toda turma está cheia no teto legal — escolas
              reais costumam operar com turmas menores que esse teto, o que também tende a
              subestimar o número real de salas.
            </li>
            <li>
              <strong>Estabelecimentos industriais</strong> (CNAE 05-39, {dadosClimada.premissas.n_empresas_industria} de{" "}
              {dadosClimada.premissas.n_empresas_total.toLocaleString("pt-BR")} empresas de Porto Alegre) usam custo
              de construção e curva de dano próprios (categoria industrial); o restante — comércio,
              serviços, agropecuária e administração pública — segue todo sob o mesmo tratamento
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
            Painel desenvolvido por GPEA/FURG em parceria com o BID — Banco Interamericano de Desenvolvimento.
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

