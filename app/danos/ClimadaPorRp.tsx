"use client";

import { SETOR_LABEL, SETOR_COLORS, RP_PROBABILIDADE, fmtBRL, eaiValor } from "./helpers";
import { CompositionBarClimada, RpBarChart } from "./charts";
import { KpiRow, Section, SubTitle, MathBlock, DataTable, Note } from "./ui";
import { MedidasTable } from "./MedidasTable";
import type { DanosCtx } from "./ctx";

export function ClimadaPorRp({ ctx }: { ctx: DanosCtx }) {
  const { atualClimada, climadaSetores, dadosClimada, eai, exposicaoAtualClimada, maxTotalClimada, medidasMun, munClimadaAtivo, rpAtivo, rpsDisponiveis, setAba, totalAtualClimada } = ctx;
  if (!dadosClimada || !atualClimada || !rpAtivo) return null;
  return (
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
            (não apenas se o ponto foi atingido). <strong>Eldorado do Sul</strong> só tem a visão por
            cota (valor exposto, sem curva de dano). Rio Grande não está disponível nesta aba.
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
                <p className="text-[10px] font-black uppercase tracking-wider text-white/95 mb-0.5">{munClimadaAtivo} · {rpAtivo}</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(totalAtualClimada)}</p>
                <p className="text-[9px] text-white/95 font-mono mt-1">
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
              <p className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83] mb-2">Exposição total (patrimônio no raio de risco)</p>
              <p className="text-2xl font-black text-slate-800 leading-none mb-3">{fmtBRL(exposicaoAtualClimada)}</p>
              {climadaSetores.map((s) => (
                <div key={s} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 first:border-t-0">
                  <span className="text-slate-600">{SETOR_LABEL[s]}: {atualClimada[s].n_atingidos_profundidade_gt_0}/{atualClimada[s].n_total} pontos atingidos</span>
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
                <p className="text-[10px] font-black uppercase tracking-wider text-white/95 mb-0.5">{munClimadaAtivo} · todos os setores</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(eai.total)} / ano</p>
                <p className="text-[9px] text-white/95 font-mono mt-1">
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
            <p className="text-[11px] text-slate-600">
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
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/95 mb-0.5">Risco anual esperado</p>
                        <p className="text-2xl font-black text-white leading-none">
                          {fmtBRL(t.risco_2025_brl)} <span className="text-sm opacity-60">→</span> {fmtBRL(t.risco_2050_brl)}
                        </p>
                        <p className="text-[9px] text-white/95 font-mono mt-1">2025 → 2050 · {premissas.rps_usados.length} RPs com remapeamento oficial</p>
                      </div>
                      <div className="px-4 py-4 grid grid-cols-1 gap-y-1.5">
                        <KpiRow label="Aumento total" value={`${fmtBRL(t.aumento_total_brl)}/ano`} sub="2025→2050" color="#055071" />
                        <KpiRow label="Por crescimento econômico" value={`${fmtBRL(t.parcela_crescimento_brl)}/ano`} sub={`${(100 - t.pct_climatico).toFixed(0)}% do aumento`} color="#2563eb" />
                        <KpiRow label="Por mudança climática" value={`${fmtBRL(t.parcela_clima_brl)}/ano`} sub={`${t.pct_climatico.toFixed(0)}% do aumento`} color="#dc2626" />
                      </div>
                    </div>

                    <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83] mb-2">Premissas</p>
                      <div className="flex flex-col gap-1.5 text-[11px]">
                        <div className="flex justify-between border-t border-slate-100 pt-1 first:border-t-0 first:pt-0">
                          <span className="text-slate-600">Crescimento econômico</span>
                          <span className="font-bold text-slate-700">{(premissas.crescimento_anual * 100).toFixed(0)}%/ano · {premissas.anos_projecao} anos (×{premissas.fator_crescimento.toFixed(2)})</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1">
                          <span className="text-slate-600">RPs usados</span>
                          <span className="font-bold text-slate-700">{premissas.rps_usados.join(", ")}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">{premissas.crescimento_fonte}</p>
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
            <p className="text-[10px] text-slate-600 font-medium mb-2">
              Cada barra soma o dano físico dos 3 setores para aquele RP, dividida por cor
              (proporcional). O número no topo é o total; a barra com contorno âmbar é o RP
              selecionado acima.
            </p>
            <RpBarChart rpsDisponiveis={rpsDisponiveis} resultados={dadosClimada.resultados_por_rp} setores={climadaSetores} maxTotal={maxTotalClimada} rpAtivo={rpAtivo} />
            <div className="flex gap-4 flex-wrap mt-4 justify-center">
              {climadaSetores.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SETOR_COLORS[s] }} />
                  <span className="text-[10px] text-slate-600 font-medium">{SETOR_LABEL[s]}</span>
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
          <p className="text-[11px] text-slate-600">
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
  );
}
