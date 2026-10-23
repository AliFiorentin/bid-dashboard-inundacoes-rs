"use client";

import { CotaMapa } from "@/components/CotaMapa";
import type { SetorResultado, CotasData, ExposicaoSetor, ExposicaoMun } from "./types";
import { SETOR_LABEL, SETOR_COLORS, RP_ORDER, fmtBRL, FAIXA_LABEL, fmtN, MAPA_SLUG } from "./helpers";
import { RpBarChart } from "./charts";
import { KpiRow, Section, SubTitle, MathBlock, DataTable, Note } from "./ui";
import { DetalhePorCategoria } from "./DetalhePorCategoria";
import { MedidasTable } from "./MedidasTable";

export function ExposicaoView({ expo, mun, visao, rp, cota, setAba, diag }: {
  expo: ExposicaoMun; diag?: CotasData["diagnostico"] | null; mun: string; visao: "rp" | "cota"; rp: string; cota: string; setAba: (a: "dala" | "climada") => void;
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
          <strong>Este indicador é exposição, não dano.</strong> Sem curva de dano (JRC) não há como converter a
          profundidade da água em fração destruída, e não há perda observada para calibrar. Por isso o painel
          mostra o <strong>valor exposto atingido</strong>: o valor de reposição de tudo o que fica sob água.
          Ele é o <strong>teto</strong> do dano (equivale a perda total de tudo que molha), não uma estimativa
          dele, e <strong>não deve ser somado</strong> aos Danos Operacionais (
          <button onClick={() => setAba("dala")} className="underline underline-offset-2 font-bold">DaLA</button>
          ), que medem outra coisa (produção e serviço interrompidos){mun !== "Porto Alegre" && "; também não se compara ao dano físico de Porto Alegre"}.
        </Note>
        <div className="my-4 rounded-xl border border-[#b3cdd8] bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Como ler os resultados</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>Como é calculado:</strong> cada empresa, escola ou unidade de saúde é um ponto com um valor de
              reposição estimado. O ponto conta como <em>atingido</em> quando a profundidade do raster
              {visao === "cota" ? " naquela cota" : " naquele período de retorno"} é maior que 0; o valor exposto
              atingido é a soma desses valores. Não há fração de dano: o ponto entra com 100% do valor ou não entra.
            </li>
            <li>
              <strong>Os percentuais:</strong> &ldquo;% da exposição total&rdquo; e &ldquo;% do setor&rdquo; comparam o valor atingido
              com o patrimônio de todos os pontos do município (atingidos ou não).{" "}
              {visao === "cota" && "Cada cota é um cenário independente; os valores crescem com a cota porque o máximo é acumulado (a água de uma cota maior cobre pelo menos o que a menor cobria)."}
            </li>
            <li>
              {visao === "cota" ? (
                <>
                  <strong>Os dados por categoria</strong> (empresas, saúde, educação) somam os atributos dos pontos atingidos:
                  empregados e massa salarial (RAIS), leitos e profissionais (CNES), matrículas e docentes (Censo Escolar).
                  A agricultura é medida em hectares sob água, sem valor em R$.
                </>
              ) : (
                <>
                  <strong>Os setores</strong> (empresas, saúde, educação) são somados ponto a ponto, cada um com o seu valor de reposição.
                </>
              )}
            </li>
            <li>
              <strong>Ordem de grandeza, não precisão:</strong> muitos estabelecimentos compartilham a mesma coordenada, então o valor
              sobe em degraus (cada pilha entra de uma vez), e o valor de reposição é estimado. Use os números para
              comparar cotas e setores, não como perda a ser paga.
            </li>
          </ul>
        </div>
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
            Valor exposto atingido em cada cota (rasters de {cotasLista[0]} a {cotasLista[cotasLista.length - 1]} m), com o máximo
            acumulado entre cotas. Sem período de retorno associado a cada cota, não há EAI nesta visão.
          </p>
          <DataTable
            destaque={cotasLista.indexOf(cotaAtiva)}
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

      {visao === "cota" && expo.detalhe && <DetalhePorCategoria det={expo.detalhe} cota={cotaAtiva} mun={mun} />}

      <Section id="c-limitacoes" num={visao === "rp" ? "7" : expo.detalhe ? "7" : "3"} title="Limitações">
        <Note type="warning">
          {visao === "cota" ? (
            <>
              Estes números medem a <strong>exposição</strong> a cada cota do rio: o que fica sob água segundo os rasters de
              profundidade, cruzado com os dados de empresas (RAIS), escolas (Censo Escolar), saúde (CNES) e
              agricultura (MapBiomas). Não usam o modelo CLIMADA nem curva de dano, e não substituem os Danos
              Operacionais (DaLA) da aba principal. Leia os limites abaixo antes de usar qualquer valor:
            </>
          ) : (
            <>
              Estes números são um <strong>protótipo</strong> de exposição por período de retorno, a partir de profundidades derivadas das cotas do
              rio e dos dados de empresas (RAIS), escolas (Censo Escolar) e saúde (CNES). Não substituem os Danos Operacionais
              (DaLA) da aba principal; ver{" "}
              <a href="/metodologia#dano-fisico" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-bold">metodologia completa ↗</a>:
            </>
          )}
        </Note>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 mt-3">
          <li>
            <strong>Exposição, não dano.</strong> Todo ponto com profundidade &gt; 0 conta com 100% do
            seu valor de reposição. Não há curva de dano nem calibração para {mun}; o dano real fica entre
            zero e este valor.
          </li>
          <li>
            <strong>Valor de reposição é estimativa</strong> (CUB/RS × área por proxy: 9 m² por pessoa,
            salas por matrícula; ver metodologia), não cadastro de valor de mercado.
          </li>
          {mun === "Lajeado" && (
            <li>
              <strong>Coordenada corrigida em um estabelecimento.</strong> O Hospital Bruno Born
              (1.867 profissionais e 201 leitos) estava geocodificado na coordenada genérica do
              centro, dentro da mancha; foi movido para o endereço real (Av. Benjamin Constant, 881,
              coordenada do OpenStreetMap), que fica fora dela. É a única exceção à regra de manter
              a base como reportada, porque sozinho ele respondia pela maior parte do valor atingido
              de Saúde.
            </li>
          )}
          <li>
            <strong>Coordenadas repetidas (geocodificação).</strong>{" "}
            {diag ? (
              <>
                Em {mun}: {(["empresas", "saude", "educacao"] as const).map((k, i) => {
                  const r = diag.coordenadas_repetidas[k];
                  return <span key={k}>{i > 0 ? "; " : ""}{{ empresas: "empresas", saude: "saúde", educacao: "educação" }[k]} {fmtN(r.n_pontos)} em {fmtN(r.n_coordenadas_unicas)} coordenadas (maior pilha: {fmtN(r.maior_pilha)})</span>;
                })}.
              </>
            ) : "Muitos estabelecimentos compartilham a mesma coordenada."}{" "}
            {expo.detalhe?.maior_pilha?.empresas && (() => {
              const e = expo.detalhe.maior_pilha.empresas;
              return <>A maior pilha de empresas reúne {fmtN(e.n_pontos)} estabelecimentos de {fmtN(e.ruas_distintas)} ruas e {fmtN(e.bairros_distintos)} bairros num único ponto, o que indica o geocodificador caindo num ponto padrão e não um endereço real. </>;
            })()}
            A base é mantida como reportada, sem filtro nem correção. Efeito: cada pilha entra de uma vez, com a profundidade de um
            único pixel de ~5 m, o que gera degraus no valor atingido.{" "}
            {visao === "cota" && expo.detalhe?.maior_pilha && (() => {
              const pil = expo.detalhe.maior_pilha;
              const partes = (["empresas", "saude", "educacao"] as const)
                .filter((k) => pil[k]?.cota_entrada && pil[k].n_pontos > 1)
                .map((k) => `${{ empresas: "empresas", saude: "saúde", educacao: "educação" }[k]}: ${fmtN(pil[k].n_pontos)} pontos entram na cota ${pil[k].cota_entrada} m (valor exposto de ${fmtBRL(pil[k].valor_exposto_antes_brl ?? 0)} para ${fmtBRL(pil[k].valor_exposto_na_entrada_brl ?? 0)})`);
              if (partes.length) return <>Neste município, a maior pilha de cada setor molha de uma vez: {partes.join("; ")}.</>;
              return <>Neste município, a maior pilha de cada setor não é molhada em nenhuma cota dos rasters, então não causa degrau.</>;
            })()}
          </li>
          {visao === "cota" && (
            <>
              {diag?.pontos_excluidos_fora_do_municipio && Object.values(diag.pontos_excluidos_fora_do_municipio).some((v) => v > 0) && (
                <li>
                  <strong>Pontos fora do município excluídos:</strong>{" "}
                  {(["empresas", "saude", "educacao"] as const).filter((k) => (diag.pontos_excluidos_fora_do_municipio?.[k] ?? 0) > 0)
                    .map((k) => `${fmtN(diag.pontos_excluidos_fora_do_municipio?.[k] ?? 0)} ${{ empresas: "empresas", saude: "unidades de saúde", educacao: "escolas" }[k]}`).join(", ")}.
                  A coordenada geocodificada cai fora do polígono do município (IBGE), em alguns casos a dezenas de quilômetros, e o
                  ponto não entra nos totais nem nos percentuais.
                </li>
              )}
              {diag && Object.values(diag.pontos_fora_do_raster).some((v) => v > 0) && (
                <li>
                  <strong>Pontos fora da grade do raster</strong> entram com profundidade 0 (subestima):{" "}
                  {(["empresas", "saude", "educacao"] as const).filter((k) => diag.pontos_fora_do_raster[k] > 0)
                    .map((k) => `${fmtN(diag.pontos_fora_do_raster[k])} de ${fmtN(diag.n_pontos[k])} ${{ empresas: "empresas", saude: "unidades de saúde", educacao: "escolas" }[k]}`).join(", ")}. O mesmo vale para a área agrícola fora da grade.
                </li>
              )}
              {mun !== "Lajeado" && (
                <li>
                  <strong>Rasters do Guaíba.</strong> Os mesmos rasters cobrem Porto Alegre e Eldorado do Sul (cota do
                  Guaíba); cada município é amostrado com os seus próprios pontos. A cota é o rótulo do raster, sem conversão:
                  a correspondência com a leitura na régua do Guaíba não foi verificada.
                </li>
              )}
              {mun === "Lajeado" && (
                <li>
                  <strong>Datum:</strong> os rasters (18,45 a 34,45 m) estão em altitude ortométrica; a cota na régua do
                  Taquari seria a do raster + 0,55 m, hipótese deduzida do parecer do SGB e não confirmada pelo autor dos rasters.
                </li>
              )}
              <li>
                <strong>Agricultura:</strong> área, não valor. Usa o MapBiomas {expo.detalhe?.ano_agricultura ?? 2024} sobreposto à
                grade do raster; a área de cada pixel é calculada pela latitude, e bordas de polígono podem ter erro de até um pixel.
                A área total de cada cultura é a soma geodésica dos polígonos, e a área fora da grade conta como seca.
              </li>
              <li>
                <strong>Setores não disjuntos:</strong> as fontes são distintas (RAIS, CNES, Censo Escolar), e estabelecimentos de saúde e
                educação aparecem em mais de uma delas; a soma dos três setores não é de ativos disjuntos.
              </li>
            </>
          )}
          {visao === "rp" && (
            <>
              <li>
                <strong>Frequência (RP):</strong> Gumbel por L-momentos sobre a série de cotas máximas anuais
                do SGB (1939–2023) mais 2024 provisório; o datum dos rasters (régua − 0,55 m) é hipótese não
                confirmada pelo autor dos rasters.
              </li>
              <li>
                <strong>Projeção 2050</strong> herda de Porto Alegre o remapeamento de frequência e o
                crescimento de 2%/ano, sem validação para o Taquari.
              </li>
            </>
          )}
          <li>
            <strong>Rasters não monotônicos entre cotas:</strong> aplicado o máximo acumulado por ponto (e por pixel,
            na agricultura). Amostragem por pixel de ~5 m (vizinho mais próximo).
          </li>
        </ul>
      </Section>

      {visao === "cota" && (
        <Section id="c-mapa" num={expo.detalhe ? "8" : "4"} title="Mapa por cota">
          <p>
            A água avança sozinha em loop (pause ou arraste a cota para controlar). A frente de avanço, em azul-claro, mostra o que
            está alagando entre uma cota e a seguinte. Mesmos rasters das tabelas acima; a cota é o rótulo do raster.
          </p>
          <CotaMapa slug={MAPA_SLUG[mun] ?? ""} cotaInicial={cotaAtiva} />
        </Section>
      )}
    </>
  );
}
