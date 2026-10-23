"use client";

import { cenarioLabel } from "@/lib/constants";
import { MUN_COLORS, MUN_CARD_COLORS, COMP_COLORS, DIAS_OPCOES, fmtBRL, pct, scaleTo } from "./helpers";
import { CompositionBar, TotaisBarChart, SensibChart } from "./charts";
import { DiasBadge, KpiRow, Section, SubTitle, DataTable, Note } from "./ui";
import type { DanosCtx } from "./ctx";

export function DanosOperacionais({ ctx }: { ctx: DanosCtx }) {
  const { dados, dadosClimada, dadosEscalados, dias, maxTotalDala, pioresCenarios, setAba, todosCenarios } = ctx;
  return (
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
                <div className="px-4 py-3" style={{ backgroundColor: MUN_CARD_COLORS[mun] ?? "#055071" }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/95 mb-0.5">{mun}</p>
                  <p className="text-2xl font-black text-white leading-none">{fmtBRL(cenVal.total)}</p>
                  <p className="text-[9px] text-white/95 font-mono mt-1">{cenarioLabel(cenNome)} · {dias} dias ef.</p>
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
                  <span className="text-[10px] text-slate-600 font-medium">{mun}</span>
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
                Dano Físico
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
                      <p className="text-[9px] text-slate-600 font-mono">{dias} dias ef. · f = {v.f_interrup.toFixed(4)}</p>
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
                                <span className="text-slate-600">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{fmtBRL(value)}</span>
                                <span className="text-slate-600 w-8 text-right">{pct(value, v.total)}</span>
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
            <p className="text-[11px] font-black uppercase tracking-wider text-[#2f6a83] mb-4">
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
                      <span key="d" className={`font-mono font-black ${isSelected ? "text-[#055071]" : "text-slate-600"}`}>
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
  );
}
