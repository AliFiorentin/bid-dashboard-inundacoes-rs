# 07_danos.py — Danos Operacionais: Metodologia e Referência

Script de estimativa de **perdas econômicas operacionais** causadas por interrupção de inundações em 4 municípios do RS (Eldorado do Sul, Lajeado, Porto Alegre, Rio Grande).

---

## Uso rápido

```bash
cd D:\Projetos\BID

# Estimativa com 30 dias de interrupção (default)
python pipeline/07_danos.py

# Parâmetro --dias controla a duração assumida da interrupção
python pipeline/07_danos.py --dias 60
```

**Pré-requisitos:** scripts 01 a 06 já executados — os GeoJSONs `*_ATINGIDOS_*.geojson` e `agricultura_stats_*.json` devem existir em `Dashboard BID/public/dados_convertidos/`.

---

## Metodologia: DaLA (Damage and Loss Assessment)

A abordagem DaLA (CEPAL/BID/Banco Mundial) distingue:

- **Danos** — destruição de ativos físicos (estoque)
- **Perdas** — fluxo de produção/serviços não realizado durante a recuperação

Este script estima **perdas** (não danos físicos), calculando o valor da produção que deixou de ser gerada durante o período de interrupção.

> Referência: CEPAL (2024). *Avaliação dos efeitos e impactos das inundações no Rio Grande do Sul*, novembro 2024. Metodologia DaLA aplicada a R$ 88,9 bi de impacto total.

---

## Componentes de Perda

### 1. Empresas — Perda de VAB (Valor Adicionado Bruto)

**Fórmula:**
```
VAB_anual = massa_salarial_mensal × 12 / labor_share_setorial
perda_emp  = VAB_anual × (dias / 365)
```

**Fundamentação:** A RAIS fornece remunerações por estabelecimento (`vl_remun_media_nom`, campo `massa_salarial`), mas não o VAB diretamente. A inversão pelo *labor share* (LS) é o método padrão quando só se dispõe de dados salariais:

```
LS = Remunerações / VAB   →   VAB = Remunerações / LS
```

| Setor (`cnae_to_setor`) | Labor Share | Setores Tab17 | VAB (R$ mi) | Rem (R$ mi) | LS calculado |
|------------------------|------------|--------------|------------|------------|------------|
| `agro`                 | **17,6%**  | 01 (empresas)| 312.235    | 55.047     | = 55.047/312.235 |
| `industria`            | **33,8%**  | 02+03+04     | 1.718.688  | 580.273    | = 580.273/1.718.688 |
| `servicos`             | **43,3%**  | 05+06+07+08+09+10+11 | 4.185.270 | 1.811.470 | = 1.811.470/4.185.270 |
| `adm_pub`              | **88,3%**  | 12           | 1.218.956  | 1.076.913  | = 1.076.913/1.218.956 |
| `total` (fallback)     | **45,8%**  | total        | 7.713.999  | 3.534.648  | = 3.534.648/7.713.999 |

**Fonte dos dados:** IBGE, *Tabela 17 — Conta de Geração da Renda por Atividade*, Sistema de Contas Nacionais 2021.
`ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/tab17.xls`

**Notas metodológicas:**

- **`agro` (17,6%):** Calculado sobre a coluna "empresas não financeiras" da Tab17 (VAB 312.235, Rem 55.047). A coluna "total economia" (LS = 11,2%) inclui rendimento misto de agricultores familiares que não possuem vínculo CLT — distorcendo o LS para baixo em relação ao setor formal coberto pelo RAIS. A coluna "empresas" representa estabelecimentos com emprego formal, equivalentes aos estabelecimentos RAIS.

- **`industria` (33,8%):** Setores 02 (Indústrias extrativas, CNAE 05-09), 03 (Transformação, CNAE 10-33) e 04 (Eletricidade/gás/água, CNAE 35-39) — que correspondem ao range `cnae_to_setor` de CNAE 05-39.

- **`servicos` (43,3%):** Inclui Construção (setor 05, CNAE 41-43 → mapeada como `servicos` em `cnae_to_setor`), Comércio, Transporte, Informação, Financeiras, Imobiliárias e Outras. Atividades imobiliárias têm LS = 1,4% pela inclusão de aluguéis imputados de imóveis próprios (sem vínculos CLT); excluindo-as, LS = 51,7%. O valor de 43,3% (com imobiliárias) foi mantido por consistência com a Tab17 sem exclusões ad hoc.

- **`adm_pub` (88,3%):** Setor 12 da Tab17. Consistente com a metodologia SCN/IBGE que mede o VAB do setor público essencialmente como custo dos empregados.

**Efeito da atualização sobre danos estimados:**

Os valores anteriores eram sistematicamente maiores que os valores IBGE, **subestimando** o VAB e os danos. Com os valores oficiais, o VAB estimado aumenta:

| Setor | LS anterior | LS IBGE 2021 | Fator de correção (VAB) |
|-------|------------|-------------|------------------------|
| agro | 23,5% | 17,6% | ×1,34 |
| industria | 42,6% | 33,8% | ×1,26 |
| servicos | 49,4% | 43,3% | ×1,14 |
| adm_pub | 90,6% | 88,3% | ×1,03 |

**Fontes:**
- **IBGE (2023).** *Tabela 17 — Conta de Geração da Renda por Atividade*. Sistema de Contas Nacionais, edição 2021. `ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/tab17.xls`
- Karabarbounis & Neiman (2014). "The Global Decline of the Labor Share". *QJE* / NBER Working Paper 19136 — labor share como identidade canônica de distribuição funcional da renda.
- PDNA Vol. A Guidelines 2013 (GFDRR/UNDP/BM): "Losses estimated from the value of changes in output flows for productive sectors."

**Nota — Inclusão de CNAE 84 (Administração Pública):** O cálculo inclui estabelecimentos de CNAE 84 (Administração Pública, Defesa e Seguridade Social). Em Porto Alegre/ADA, apenas 51 estabelecimentos de CNAE 84 representam 45,3% da folha salarial total atingida (R$ 559,7 mi/mês de R$ 1,24 bi totais), gerando ~R$ 625 mi dos R$ 2,21 bi estimados de VAB. Excluindo CNAE 84, o VAB de empresas em POA/ADA seria R$ 1,58 bi.

Diferentemente das empresas privadas, cujo VAB cessa com a interrupção operacional, os salários de servidores públicos continuam sendo pagos durante desastres — o "VAB" do setor público no SCN é medido essencialmente como custo dos empregados (LS = 88,3%), não como produção comercializável. A DaLA (CEPAL/BID) trata perdas de serviços públicos em componente separado. A inclusão aqui representa o custo de oportunidade dos recursos públicos imobilizados durante a interrupção, interpretação metodologicamente defensável mas que deve ser declarada explicitamente nos relatórios.

**Dados de entrada:** `empresas_ATINGIDOS_{cen_slug}.geojson` (produzido pelo script 06), propriedades `massa_salarial` e `cnae_classe` por estabelecimento.

---

### 2. Educação — Reposição FUNDEB

**Fórmula:**
```
custo_dia_aluno = FUNDEB_VAAT_MIN / DIAS_LETIVOS
perda_edu       = total_matriculas × custo_dia_aluno × dias_interrupcao
```

**Fundamentação:** A LDB (Art. 24, I) exige mínimo de 200 dias letivos por ano. Toda interrupção gera **obrigação legal de reposição** pelo mesmo número de dias, gerando custo adicional ao sistema educacional. O FUNDEB VAAT-MIN é o valor mínimo de investimento por aluno/ano que o sistema deve garantir.

**Parâmetros:**
- `FUNDEB_VAAT_MIN = R$ 8.481,21` — Portaria Interministerial MEC/MF nº 9, de 28/08/2024 (revisão quadrimestral de agosto; DOU 30/08/2024). Fonte: [FNDE — Legislação FUNDEB 2024](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/financiamento/fundeb/legislacao/2024)
- `DIAS_LETIVOS = 200` — mínimo legal (LDB Art. 24, I)
- `dias` — parâmetro `--dias` (igual ao número de dias de interrupção real)

**Nota — Parecer CNE/CP nº 11/2024 (9/05/2024):** Em resposta às enchentes de 2024, o CNE dispensou escolas do RS do mínimo de 200 **dias** de efetivo trabalho escolar, autorizando o cumprimento da carga horária mínima por meios alternativos (atividades não presenciais, espaços alternativos) ou com recuperação nos dois anos letivos subsequentes. Isso não altera o custo de reposição — apenas a forma e o prazo de sua realização. A fórmula `matriculas × (VAAT_MIN / DIAS_LETIVOS) × dias_interrupção` estima o **valor econômico do serviço educacional não entregue** durante a interrupção, que permanece como custo independente do modo de recuperação. Fonte: [MEC — Calendário Escolar RS 2024](https://www.gov.br/mec/pt-br/assuntos/noticias/2024/maio/calendario-escolar-do-rio-grande-do-sul-sera-flexibilizado)

**Dados de entrada:** `educacao_ATINGIDOS_{cen_slug}.geojson`, campos `qtd_matri_*` (matrículas por nível de ensino).

---

### 3. Saúde — Perda de Produção SUS

**Fórmula:**
```
producao_anual_CNES = (SIA_valor_aprovado + SIH_valor_total) × (12 / 7)
perda_sau           = Σ(producao_anual por CNES atingido) × (dias / 365)
```

**Fundamentação:** A produção SUS é medida em valor aprovado (SIA — procedimentos ambulatoriais) e valor total (SIH — internações). Os dados cobrem Jan–Jul 2024 (7 meses), sendo anualizado pelo fator 12/7.

**Cache:** Na primeira execução, `preparar_producao_sus()` agrega os CSVs e salva em `data/interim/producao_sus_por_cnes.parquet`. Execuções subsequentes usam o cache.

**Dados de entrada:**
- `data/processed/bases/sia_producao.csv` — colunas `co_cnes`, `valor_aprovado`
- `data/processed/bases/sih_internacoes.csv` — colunas `co_cnes`, `valor_total`
- `saude_ATINGIDOS_{cen_slug}.geojson` — identifica os CNES dentro da mancha

---

### 4. Agricultura — Perdas por Cultura e Período

**Fórmula:**
```
perda_agr = Σ(area_ha_atingida × coef_R$/ha)   por cultura
```

Os coeficientes variam por cultura **e** por período do cenário (maio/2024 ou setembro/2023), refletindo a fase do ciclo agrícola no momento do evento:

| Período        | Cultura                   | Coef (R$/ha) | Status                          |
|----------------|---------------------------|-------------:|---------------------------------|
| `maio_2024`    | Soja                      | 1.100        | Colhida (fev–abr/2024)         |
| `maio_2024`    | Arroz                     | 1.100        | Colhido (fev–abr/2024)         |
| `maio_2024`    | Outras Lavouras Temp.     | 1.400        | Plantio inicial (mai–jun/2024) |
| `setembro_2023`| Soja                      | 250          | Pré-plantio (set/2023)         |
| `setembro_2023`| Arroz                     | 250          | Pré-plantio (set/2023)         |
| `setembro_2023`| Outras Lavouras Temp.     | 2.800        | Colheita (set–out/2023)        |

**Dados de entrada:** `Dashboard BID/public/dados_convertidos/{mun}/cenarios/agricultura_stats_{cen_slug}.json`
```json
{"Arroz": 7729.0, "Soja": 80.4, "Outras Lavouras Temporárias": 361.3}
```
(área em hectares por cultura dentro da mancha, produzido pelo script 06)

---

## Parâmetros e Configuração

| Parâmetro | Onde | Descrição |
|-----------|------|-----------|
| `--dias`  | CLI  | Duração assumida da interrupção operacional (default: 30) |
| `FUNDEB_VAAT_MIN` | `config.py` | Valor mínimo FUNDEB por aluno/ano (R$ 8.481,21) |
| `DIAS_LETIVOS` | `config.py` | Mínimo legal de dias letivos (200) |
| `LABOR_SHARE` | `config.py` | Labor share setorial para inversão VAB |
| `CENARIO_PERIODO` | `config.py` | Mapa `cen_slug → período` para escolher coeficientes agrícolas |
| `IMPACTO_AGRICOLA` | `config.py` | Coeficientes R$/ha por período e cultura |

---

## Saída

### JSON: `data/processed/danos_operacionais.json`

```json
{
  "Porto Alegre": {
    "Cenario ADA": {
      "dias_agudo":                  30,
      "dias_efetivos":               60,
      "f_interrup":              0.164384,
      "empresas_vab":       1980000000.00,
      "educacao_perdas":      21000000.00,
      "educacao_custo_adicional": 21000000.00,
      "saude_producao":        3900000.00,
      "agricultura_perdas":     456800.00,
      "total":             2026356800.00
    }
  }
}
```

| Campo                       | Descrição |
|-----------------------------|-----------|
| `dias_agudo`                | Dias de fechamento real (fase aguda) — base do cálculo de educação |
| `dias_efetivos`             | Dias efetivos DaLA para empresas/saúde (agudo + recuperação × 0,5) |
| `f_interrup`                | Fração de interrupção anual para empresas/saúde (dias_efetivos / 365) |
| `empresas_vab`              | VAB perdido por empresas formais (RAIS) durante a interrupção |
| `educacao_perdas`           | Perda DaLA: serviço educacional não prestado nos dias de fechamento (FUNDEB × dias_agudo × matrículas) |
| `educacao_custo_adicional`  | Custo adicional DaLA: reposição obrigatória das aulas (LDB art. 24, I) — mesmo valor que `educacao_perdas` |
| `saude_producao`            | Produção SUS não realizada (SIA + SIH anualizado) |
| `agricultura_perdas`        | Perdas por cultura × área atingida × fase do ciclo |
| `total`                     | Soma de todos os componentes |

### Parquet cache: `data/interim/producao_sus_por_cnes.parquet`

| Coluna                | Tipo   | Descrição |
|-----------------------|--------|-----------|
| `cnes`                | str(7) | Código CNES zero-padded |
| `producao_anual_total`| float  | SIA + SIH anualizado (× 12/7) |

---

## Hipóteses e Limitações

1. **Interrupção total durante `dias`** — assume que 100% da produção é interrompida pelo período completo. Interrupções parciais ou recuperação gradual não são modeladas.
2. **Labor share constante por setor** — usa valores médios nacionais (IBGE SCN 2023); variações municipais não são capturadas.
3. **Saúde: anualização simples** — 7 meses (jan–jul 2024) × 12/7. Sazonalidade da demanda de saúde não é ajustada.
4. **Agricultura sem danos a estoque** — este script calcula apenas perdas de fluxo; perdas de estoque (máquinas, benfeitorias, safra armazenada) são tratadas separadamente.
5. **RAIS 2023** — emprego formal base 2023; variações entre 2023 e 2024 não são capturadas.
6. **Cenário `Setembro 2023` de Rio Grande** — saúde retorna R$ 0 se nenhum CNES atingido naquele cenário tiver produção SIA/SIH registrada nos dados disponíveis.

---

## Dependências e Fluxo

```
01_rais.py          → data/processed/bases/estabelecimentos.csv (massa_salarial)
02_educacao.py      → data/processed/bases/escolas.csv (matrículas)
03_saude.py         → data/processed/bases/sia_producao.csv
                    → data/processed/bases/sih_internacoes.csv
06_geojson.py       → Dashboard BID/public/.../cenarios/*_ATINGIDOS_*.geojson
                    → Dashboard BID/public/.../cenarios/agricultura_stats_*.json
                         ↓
07_danos.py         → data/processed/danos_operacionais.json
                    → data/interim/producao_sus_por_cnes.parquet (cache)
```
