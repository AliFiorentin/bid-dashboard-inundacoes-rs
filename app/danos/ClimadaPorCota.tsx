"use client";

import { SETOR_LABEL, SETOR_COLORS, fmtBRL } from "./helpers";
import { CotaBarChart } from "./charts";
import { KpiRow, Section, DataTable, Note } from "./ui";
import type { DanosCtx } from "./ctx";

export function ClimadaPorCota({ ctx }: { ctx: DanosCtx }) {
  const { atualCota, climadaSetores, cotaAtiva, cotasDisponiveis, dadosCotas, foraRasterTotal, maxTotalCota, munClimadaAtivo, setAba, totalCota, totalRp10 } = ctx;
  if (!dadosCotas || !atualCota || !cotaAtiva) return null;
  return (
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
                <p className="text-[10px] font-black uppercase tracking-wider text-white/95 mb-0.5">{munClimadaAtivo} · cota {cotaAtiva} m</p>
                <p className="text-2xl font-black text-white leading-none">{fmtBRL(totalCota(atualCota, "dano_fisico_brl_poa"))}</p>
                <p className="text-[9px] text-white/95 font-mono mt-1">
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
              <p className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83] mb-2">Exposição total (patrimônio no raio de risco)</p>
              <p className="text-2xl font-black text-slate-800 leading-none mb-3">
                {fmtBRL(climadaSetores.reduce((sum, st) => sum + atualCota[st].exposicao_total_brl, 0))}
              </p>
              {climadaSetores.map((st) => (
                <div key={st} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 first:border-t-0">
                  <span className="text-slate-600">{SETOR_LABEL[st]}: {atualCota[st].n_atingidos}/{atualCota[st].n_total} pontos atingidos</span>
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
            destaque={cotasDisponiveis.indexOf(cotaAtiva)}
            rows={[
              ["Cota (m)", "Empresas atingidas", "Escolas atingidas", "Unid. saúde atingidas", "Dano (fator POA)", "Dano (JRC crua)"],
              ...cotasDisponiveis.map((c) => {
                const r = dadosCotas.resultados_por_cota[c];
                return [
                  <span key="c" className={c === cotaAtiva ? "font-black text-amber-800" : "font-bold"}>{c}</span>,
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
  );
}
