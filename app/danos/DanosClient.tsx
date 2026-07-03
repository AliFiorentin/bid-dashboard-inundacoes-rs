"use client";

import React, { useState } from "react";
import katex from "katex";

// ─── Tipos ────────────────────────────────────────────────────────────────────
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

// ─── Constantes visuais ───────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Componente principal ─────────────────────────────────────────────────────
export function DanosClient({ dados }: { dados: DanosData }) {
  const [dias, setDias] = useState<DiasOpcao>(30);

  // Dados escalados para a duração selecionada
  const dadosEscalados: DanosData = Object.fromEntries(
    Object.entries(dados).map(([mun, cens]) => [
      mun,
      Object.fromEntries(
        Object.entries(cens).map(([cen, v]) => [cen, scaleTo(v, dias)])
      ),
    ])
  );

  // Cenários selecionados por município para o agregado da Visão Geral
  // (correspondente ao PIORES_CENARIOS do mapa — sem acentos para bater com as chaves do JSON)
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

  // Todos pares para o gráfico comparativo
  const todosCenarios = Object.entries(dadosEscalados).flatMap(([mun, cens]) =>
    Object.entries(cens).map(([cen, v]) => ({ mun, cen, v }))
  );
  const maxTotal = Math.max(...todosCenarios.map((c) => c.v.total));

  return (
    <div className="min-h-screen bg-[#f0f7fa] text-slate-800 font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-[#055071] text-white px-6 py-10 print:py-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2 mb-5 print:hidden">
            <a href="/" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Dashboard</a>
            <a href="/metodologia" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Metodologia</a>
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-60 mb-2">
            BID · GPEA · FURG
          </p>
          <h1 className="text-4xl font-black leading-none mb-2 tracking-tight">Danos Operacionais</h1>
          <p className="text-base opacity-75 font-medium">
            Estimativa de Perdas Econômicas — Enchentes no Rio Grande do Sul
          </p>
          <p className="text-[11px] opacity-50 mt-3 font-mono">
            Metodologia DaLA (CEPAL/BID) · Maio 2024 e Setembro 2023
          </p>
        </div>
      </header>

      {/* ── Seletor de duração (sticky) ──────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 border-b border-[#b3cdd8] shadow-sm print:hidden"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-2.5 flex items-center gap-4 flex-wrap">
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
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-10 print:py-5 flex gap-8 items-start print:block">

        {/* ── Sidebar (Índice fixo) ────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-52 shrink-0 print:hidden">
          <div className="sticky top-[56px] flex flex-col gap-3">
            <nav className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Índice</p>
              <ol className="flex flex-col gap-1">
                {([
                  ["#resumo",      "1. Resumo Geral"],
                  ["#cenarios",    "2. Análise por Cenário"],
                  ["#sensib",      "3. Sensibilidade por Duração"],
                  ["#dala",        "4. Metodologia DaLA"],
                  ["#componentes", "5. Componentes do Cálculo"],
                  ["#parametros",  "6. Parâmetros Utilizados"],
                  ["#cnae84",      "7. Nota — Admin. Pública"],
                  ["#fontes",      "8. Fontes e Referências"],
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
            <TotaisBarChart todosCenarios={todosCenarios} maxTotal={maxTotal} />
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
            SEÇÃO 4 — METODOLOGIA
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="dala" num="4" title="Metodologia DaLA — Curva de Recuperação Linear">
          <p>
            A avaliação segue a metodologia{" "}
            <strong>DaLA (Damage and Loss Assessment)</strong> da CEPAL/BID, que distingue
            <em> danos</em> (destruição de ativos físicos) de <em>perdas</em>{" "}
            (fluxo de produção não realizado durante o período de interrupção e recuperação).
          </p>
          <SubTitle>Curva de Recuperação Linear</SubTitle>
          <p>
            Durante a fase aguda (d<sub>a</sub> dias) a produção cessa; na recuperação
            (d<sub>r</sub> dias) retorna gradualmente a 50% em média. O fator de
            interrupção efetivo é:
          </p>
          <MathBlock exprs={[
            { label: "Dias efetivos", tex: "d_{\\text{ef}} = d_a + \\dfrac{d_r}{2}" },
            { label: "Fator de interrupção", tex: "f = \\dfrac{d_{\\text{ef}}}{365}" },
          ]} />
          <DataTable rows={[
            ["Período",       "Fase aguda (dₐ)", "Recuperação (dᵣ)", "Dias ef.", "f",      "Referência"],
            ["Maio 2024",     "30 dias",         "60 dias",          "60 dias",  "0,1644", "DaLA RS — CEPAL, 2024"],
            ["Setembro 2023", "15 dias",         "30 dias",          "30 dias",  "0,0822", "DaLA RS — CEPAL, 2024"],
          ]} />
          <SectionSources links={[
            ["CEPAL (2024) — Avaliação dos Efeitos e Impactos das Inundações no Rio Grande do Sul", "https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024"],
            ["PDNA Guidelines Vol. A — GFDRR/UNDP/BM, 2013", "https://www.gfdrr.org/sites/default/files/2017-09/PDNA-Volume-A.pdf"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 5 — COMPONENTES
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="componentes" num="5" title="Componentes do Cálculo">

          <SubTitle>5.1 — Empresas: Perda de VAB</SubTitle>
          <p>
            Os dados de folha salarial da RAIS 2023 fornecem a massa salarial mensal por
            estabelecimento. A inversão pelo <em>labor share</em> é o método padrão da
            contabilidade nacional quando apenas o dado salarial está disponível:
          </p>
          <MathBlock exprs={[
            { label: "VAB anual (est.)", tex: "\\widehat{\\text{VAB}}_i = \\dfrac{w_{i,\\text{anual}}}{LS_s}" },
            { label: "Perda total", tex: "\\text{EmpresasVAB} = \\sum_{i \\in \\text{atingidos}} \\widehat{\\text{VAB}}_i \\times f" },
          ]} />
          <DataTable rows={[
            ["Setor (CNAE)",         "Labor share (LS)", "Fonte"],
            ["Agropecuária (01–03)", "17,6%",            "IBGE SCN 2021 — Tab17"],
            ["Indústria (05–39)",    "33,8%",            "IBGE SCN 2021 — Tab17"],
            ["Adm. Pública (84)",    "88,3%",            "IBGE SCN 2021 — Tab17"],
            ["Serviços e demais",    "43,3%",            "IBGE SCN 2021 — Tab17"],
          ]} />
          <SectionSources links={[
            ["IBGE — SCN 2021, Tabela 17", "https://ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/"],
            ["Karabarbounis & Neiman (2014, QJE) — The Global Decline of the Labor Share", "https://doi.org/10.1093/qje/qjt032"],
          ]} />

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 mt-1 mb-2 text-[11px] leading-relaxed text-amber-900 space-y-1.5">
            <p className="font-bold text-[12px]">Nota — Por que não usar ICMS como alternativa?</p>
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

          <SubTitle>5.2 — Educação: Perdas + Custo de Reposição (DaLA)</SubTitle>
          <p>
            Dois componentes DaLA distintos, ambos com o mesmo custo unitário FUNDEB/aluno/dia:
          </p>
          <MathBlock exprs={[
            { label: "Custo/aluno/dia", tex: "c = \\dfrac{\\text{VAAT-MIN}}{D_{\\text{letivos}}}" },
            { label: "Perdas (serv. não prestado)", tex: "P_{\\text{edu}} = c \\times N_{\\text{alunos}} \\times d_a" },
            { label: "Custo adicional (reposição)", tex: "C_{\\text{adic}} = c \\times N_{\\text{alunos}} \\times d_a" },
            { label: "Total educação", tex: "\\text{Educação} = P_{\\text{edu}} + C_{\\text{adic}} = 2\\,c\\,N\\,d_a" },
          ]} />
          <p className="text-[12px] text-slate-500 mt-1">
            A fase de recuperação usa <em>d</em><sub>a</sub> (dias de fechamento real), não <em>d</em><sub>ef</sub>,
            porque escolas são obrigadas a compensar 100% dos dias perdidos —
            não há recuperação parcial como em firmas.
          </p>
          <DataTable rows={[
            ["Parâmetro",     "Valor",       "Fonte"],
            ["VAAT-MIN 2024", "R$ 8.481,21", "Portaria Interministerial MEC/MF nº 9, 28/08/2024"],
            ["Dias letivos",  "200",         "LDB Art. 24, I"],
            ["dₐ — Maio 2024", "30 dias",   "DaLA RS — CEPAL, 2024"],
            ["dₐ — Set. 2023", "15 dias",   "DaLA RS — CEPAL, 2024"],
          ]} />
          <SectionSources links={[
            ["FNDE — FUNDEB 2024", "https://www.fnde.gov.br"],
            ["LDB — Lei nº 9.394/1996, Art. 24", "https://www.planalto.gov.br/ccivil_03/leis/l9394.htm"],
            ["Parecer CNE/CP nº 11/2024 — Flexibilização calendário escolar RS", "https://www.gov.br/mec/pt-br/assuntos/conselho-nacional-de-educacao"],
          ]} />

          <SubTitle>5.3 — Saúde: Perda de Produção SUS</SubTitle>
          <MathBlock exprs={[
            { label: "Produção anual CNES", tex: "P_k = \\bigl(P_{\\text{SIA},k} + P_{\\text{SIH},k}\\bigr) \\times \\dfrac{12}{7}" },
            { label: "Perda saúde", tex: "\\text{Saúde} = \\sum_{k \\in \\text{atingidos}} P_k \\times f" },
          ]} />
          <SectionSources links={[
            ["DataSUS — Produção Hospitalar SIH/SUS", "https://datasus.saude.gov.br/acesso-a-informacao/producao-hospitalar-sih-sus"],
            ["DataSUS — Produção Ambulatorial SIA/SUS", "https://datasus.saude.gov.br/acesso-a-informacao/producao-ambulatorial-sia-sus"],
          ]} />

          <SubTitle>5.4 — Agricultura: Custo Direto de Produção</SubTitle>
          <MathBlock exprs={[
            { tex: "\\text{Agricultura} = \\sum_i \\text{Área}_i\\,[\\text{ha}] \\times \\text{Coef}_i\\,[\\text{R}\\$/\\text{ha}]" },
          ]} />
          <DataTable rows={[
            ["Cultura",                     "Período",    "Status",                      "Coef. (R$/ha)"],
            ["Soja",                        "Maio 2024",  "Colhida — fev–abr/2024",      "R$ 1.100"],
            ["Arroz",                       "Maio 2024",  "Colhido — fev–abr/2024",      "R$ 1.100"],
            ["Outras Lavouras Temporárias", "Maio 2024",  "Plantio inicial — mai/2024",  "R$ 1.400"],
            ["Soja",                        "Set. 2023",  "Pré-plantio",                 "R$ 250"],
            ["Arroz",                       "Set. 2023",  "Pré-plantio",                 "R$ 250"],
            ["Outras Lavouras Temporárias", "Set. 2023",  "Colheita — set–out/2023",     "R$ 2.800"],
          ]} />
          <SectionSources links={[
            ["CONAB — Preços Mínimos 2024", "https://www.conab.gov.br/politica-agricola/precos-minimos"],
            ["MapBiomas — Coleção 10", "https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 6 — PARÂMETROS
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="parametros" num="6" title="Parâmetros Utilizados">
          <DataTable rows={[
            ["Parâmetro",                   "Valor",         "Fonte"],
            ["VAAT-MIN FUNDEB 2024",        "R$ 8.481,21",  "Portaria Interministerial MEC/MF nº 9/2024"],
            ["Dias letivos/ano",            "200",           "LDB Art. 24, I"],
            ["Labor share — Agropecuária",  "17,6%",         "IBGE SCN 2021 — Tab17"],
            ["Labor share — Indústria",     "33,8%",         "IBGE SCN 2021 — Tab17"],
            ["Labor share — Adm. Pública",  "88,3%",         "IBGE SCN 2021 — Tab17"],
            ["Labor share — Serviços",      "43,3%",         "IBGE SCN 2021 — Tab17"],
            ["Fase aguda — Maio 2024",      "30 dias",       "DaLA RS — CEPAL, 2024"],
            ["Recuperação — Maio 2024",     "60 dias",       "DaLA RS — CEPAL, 2024"],
            ["Fase aguda — Set. 2023",      "15 dias",       "DaLA RS — CEPAL, 2024"],
            ["Recuperação — Set. 2023",     "30 dias",       "DaLA RS — CEPAL, 2024"],
            ["Meses SIA/SIH disponíveis",   "7 (jan–jul/24)","DataSUS"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 7 — CNAE 84
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="cnae84" num="7" title="Nota — Administração Pública (CNAE 84)">
          <p>
            Os estabelecimentos com CNAE 84 (<em>Administração Pública, Defesa e Seguridade Social</em>)
            são <strong>incluídos</strong> na estimativa — a interrupção de serviços governamentais
            representa perdas reais para a sociedade, conforme a metodologia DaLA (CEPAL, 2024).
          </p>
          <SubTitle>Impacto quantitativo — Porto Alegre / Cenário ADA</SubTitle>
          <DataTable rows={[
            ["Indicador",                     "Valor"],
            ["Estabelecimentos CNAE 84",      "51"],
            ["Participação na massa salarial", "45,3%  (R$ 559,7 mi/mês)"],
            ["Contribuição ao total (60 dias)","≈ R$ 625 mi de R$ 4,5 bi"],
          ]} />
          <Note type="warning">
            O labor share de Adm. Pública (88,3%) é elevado, pois o VAB deste setor é
            predominantemente composto por remunerações. Leitores que desejam excluir o setor
            público devem subtrair a contribuição do CNAE 84 dos valores apresentados.
          </Note>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 8 — FONTES
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="fontes" num="8" title="Fontes e Referências">
          <div className="space-y-4">
            <RefBlock title="Metodologia DaLA">
              <RefItem href="https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024"
                label="CEPAL (nov/2024) — Avaliação dos Efeitos e Impactos das Inundações no Rio Grande do Sul"
                desc="Avaliação DaLA de R$ 88,9 bi nas enchentes RS 2024 — metodologia de referência para a curva linear de recuperação." />
              <RefItem href="https://www.gfdrr.org/sites/default/files/2017-09/PDNA-Volume-A.pdf"
                label="PDNA Vol. A Guidelines — GFDRR/UNDP/BM, 2013"
                desc="Perdas = mudanças nos fluxos econômicos durante e após o desastre, estimadas pelo declínio no valor dos fluxos de produção." />
            </RefBlock>
            <RefBlock title="Dados Socioeconômicos">
              <RefItem href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais"
                label="RAIS — MTE, 2023"
                desc="Microdados de estabelecimentos, vínculos ativos e massa salarial — base da estimativa de VAB." />
              <RefItem href="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar"
                label="INEP — Censo Escolar, 2024"
                desc="Matrículas ativas nas escolas atingidas — base do custo de reposição FUNDEB." />
              <RefItem href="https://cnes.datasus.gov.br"
                label="CNES — DataSUS, abr/2024"
                desc="Estabelecimentos de saúde — chave de ligação com a produção SUS." />
              <RefItem href="https://datasus.saude.gov.br"
                label="SIA/SIH — DataSUS, jan–jul/2024"
                desc="Produção ambulatorial e hospitalar por estabelecimento — base da perda de produção SUS." />
            </RefBlock>
            <RefBlock title="Parâmetros Setoriais">
              <RefItem href="https://ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/"
                label="IBGE — SCN 2021, Tabela 17"
                desc="Única fonte pública com Remunerações por atividade econômica — base dos labor shares setoriais." />
              <RefItem href="https://www.fnde.gov.br"
                label="Portaria Interministerial MEC/MF nº 9, 28/08/2024"
                desc="Define VAAT-MIN 2024 = R$ 8.481,21 — parâmetro do custo de reposição educacional." />
              <RefItem href="https://doi.org/10.1093/qje/qjt032"
                label="Karabarbounis & Neiman (2014, QJE) — The Global Decline of the Labor Share"
                desc="Referência canônica para o labor share como métrica de distribuição funcional da renda." />
            </RefBlock>
            <RefBlock title="Dados Agrícolas">
              <RefItem href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"
                label="MapBiomas — Coleção 10"
                desc="Mapeamento de uso do solo (raster 30 m) — origem das áreas cultivadas por cultura." />
              <RefItem href="https://www.conab.gov.br/politica-agricola/precos-minimos"
                label="CONAB — Preços Mínimos 2024"
                desc="Base para os coeficientes R$/ha de impacto agrícola por cultura e período." />
            </RefBlock>
          </div>
        </Section>

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

// ─── Gráficos SVG ─────────────────────────────────────────────────────────────

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

// ─── Componentes UI ───────────────────────────────────────────────────────────

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

function SectionSources({ links }: { links: [string, string][] }) {
  return (
    <div className="mt-4 pt-3 border-t border-[#b3cdd8]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d7a94] mb-1.5">Fontes</p>
      <ul className="space-y-0.5">
        {links.map(([label, href]) => (
          <li key={label}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-[#055071] hover:underline underline-offset-4 transition-colors duration-150">
                ↗ {label}
              </a>
            ) : (
              <span className="text-[11px] text-[#3d7a94]">— {label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RefItem({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold text-[#055071] hover:underline underline-offset-4 transition-colors duration-150">
          {label} ↗
        </a>
      ) : (
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      )}
      <p className="text-[11px] text-[#3d7a94] mt-0.5 leading-relaxed">{desc}</p>
    </div>
  );
}
