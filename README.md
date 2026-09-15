# Avaliação de Impactos Socioeconômicos

> Painel WebGIS interativo para análise socioeconômica do impacto das enchentes de 2024 nos municípios do Rio Grande do Sul, desenvolvido em parceria com o BID (Banco Interamericano de Desenvolvimento), GPEa e CIEX/FURG.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre-5-2563EB)](https://maplibre.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)

---

## Resumo

O Dashboard BID responde à pergunta: **"Quanto uma inundação afeta economicamente um município?"**

Sobrepondo manchas de inundação com dados georreferenciados de empresas, estabelecimentos de educação, unidades de saúde, infraestrutura urbana e uso do solo agrícola, o painel quantifica o impacto em termos de empregos, massa salarial, matrículas, profissionais de saúde, edificações e perdas agrícolas estimadas — por município e por cenário de cheia.

O painel integra dados das enchentes de 2024 que afetaram mais de 400 municípios gaúchos, com destaque para Porto Alegre, Rio Grande, Lajeado e Eldorado do Sul.

---

## Objetivos

- Quantificar o impacto econômico das inundações sobre os setores produtivos (empresas formais por CNAE, empregos, massa salarial)
- Mapear a exposição da rede de educação (escolas, professores, matrículas por etapa)
- Analisar a vulnerabilidade da rede de saúde (estabelecimentos CNES, profissionais por categoria)
- Mensurar o impacto na infraestrutura urbana (logradouros, saneamento, transporte, edificações)
- Estimar perdas agrícolas por cultura com base no estágio fenológico no momento da inundação
- Disponibilizar os resultados em ferramenta interativa de acesso público para subsidiar políticas de recuperação e resiliência

---

## Municípios e Cenários

| Município       | Cenários                                        | Evento de referência       |
|-----------------|-------------------------------------------------|----------------------------|
| Eldorado do Sul | Cenário ADA                                     | Enchentes de maio de 2024  |
| Lajeado         | Cenário 27m · Cenário 30m                       | Enchentes de maio de 2024  |
| Porto Alegre    | Cenário ADA · Climada Evento 2024               | Enchentes de maio de 2024  |
| Rio Grande      | Cenário Maio 2024 · Cenário Maio 2024 +50% · Cenário Setembro 2023 | Tormenta de maio de 2024 · Setembro de 2023 |

A **Visão Geral RS** exibe os 4 municípios simultaneamente com o pior cenário de cada um aplicado e a mancha de inundação estadual de referência (`mancha_rs_enchente_2024.geojson`).

> **Porto Alegre** também tem um protótipo de **Dano Físico (CLIMADA)**, independente dos cenários acima: usa 7 rasters de profundidade máxima por período de retorno sintético (RP10 a RP500) do exercício de adaptação climática CLIMADA/UNU-EHS para estimar destruição de patrimônio (não perda de fluxo) — ver [§ 5 abaixo](#5-dano-físico--climada-protótipo) e a página `/danos` (aba Dano Físico).

---

## Metodologia

### 1. Delimitação das Manchas de Inundação

As manchas de inundação (polígonos vetoriais) provêm de estudos hidrológicos específicos por município:

- **Porto Alegre e Eldorado do Sul:** Área Diretamente Afetada (ADA) — MUP / Mapa Único do Plano Rio Grande (Gov. RS), maio/2024.
- **Porto Alegre (Climada Evento 2024):** raster de duração (dias) do evento real de maio/2024 usado na calibração do exercício de adaptação climática CLIMADA/UNU-EHS (BID), vetorizado (pixels > 0) via `pipeline/vetorizar_climada.py`. O mesmo script também vetoriza os rasters de profundidade por período de retorno sintético (RP10 a RP500) do exercício CLIMADA — mantidos em `data/raw/manchas/porto_alegre/climada/`. Não aparecem como cenário selecionável no mapa (não são "manchas observadas"), mas alimentam o protótipo de Dano Físico (§ 5 abaixo).
- **Lajeado:** Simulação hidráulica do rio Taquari para cotas de 27 m e 30 m (LabModel).
- **Rio Grande:** Modelagem hidrológica e hidráulica (CIEX/FURG) — cenários de maio/2024 e setembro/2023.

As manchas são armazenadas como `{municipio_slug}___{cenario_slug}.geojson` em projeção WGS 84 (EPSG:4326).

**Qualidade geométrica:** todas as camadas poligonais (manchas, agricultura, infraestrutura) passam por uma etapa de validação e correção (`pipeline/common.py: clean_polygon_geom / fix_polygon_geometry`) antes de chegar ao dashboard — repara auto-interseção/topologia inválida (`shapely.make_valid`), remove buracos internos anormais (>50% da área do polígono, sintoma de corte/overlay quebrado, não enclave real), descarta fragmentos "sliver" residuais de recortes pela mancha e suaviza serrilhado de conversão raster→vetor com `simplify()` calibrado por tipo de camada. Camadas de infraestrutura sem gerador no pipeline (ver tabela de fontes abaixo) são corrigidas em-lugar por `pipeline/limpar_geometrias_infra.py`.

### 2. Identificação de Elementos Atingidos

#### 2.1 Elementos pontuais (empresas, escolas, saúde)

Um elemento $a$ do conjunto base $A_\text{base}$ é classificado como **atingido** se seu ponto georreferenciado cair dentro da mancha de inundação $M$:

$$A_\text{at} = \lbrace\, a \in A_\text{base} \mid \text{ponto}(a) \in M \,\rbrace$$

O percentual atingido é:

$$p = \frac{\lvert A_\text{at} \rvert}{\lvert A_\text{base} \rvert} \times 100\%$$

A interseção espacial é realizada em Python (GeoPandas / Shapely) durante o pipeline de pré-processamento. O frontend recebe os GeoJSONs já filtrados (`*_ATINGIDOS_*.geojson`) e não executa operações geoespaciais em tempo real.

#### 2.2 Edificações (polígonos — Google Open Buildings)

As edificações são representadas como polígonos. Uma edificação $e$ é classificada como **atingida** se seu polígono intersecta a mancha $M$:

$$E_\text{at} = \lbrace\, e \in E_\text{base} \mid \text{geom}(e) \cap M \neq \emptyset \,\rbrace$$

O dataset base provém do **Google Open Buildings v3** (arquivo `951_buildings.csv.gz`, ~7,4 M polígonos para o RS), filtrado por:
- Confiança $\geq 0{,}65$ (geral) ou $\geq 0{,}80$ (Porto Alegre, para controle de tamanho de arquivo)
- Bounding box do município
- Simplificação de polígonos com tolerância $\delta = 0{,}00002°$ (~2 m), reduzindo vértices em ~60% sem perda perceptível de forma

#### 2.3 Infraestrutura linear/poligonal

Para camadas de linha (logradouros, rede de esgoto, rotas de ônibus) e polígonos (lotes, quarteirões), aplica-se a mesma lógica de interseção não-vazia com a mancha:

$$I_\text{at} = \lbrace\, i \in I_\text{base} \mid \text{geom}(i) \cap M \neq \emptyset \,\rbrace$$

Para rotas de ônibus, o KPI "Rotas Únicas" deduplica pelo identificador da linha antes de contar. O KPI "KM de Rotas" soma os comprimentos geodésicos dos segmentos atingidos.

### 3. Indicadores Econômicos

#### 3.1 Empregos e Massa Salarial (RAIS)

Dado o conjunto de estabelecimentos atingidos $A_\text{at}$, os empregos formais atingidos por setor CNAE $s$ são:

$$\text{Emp}_s = \sum_{a \in A_\text{at},\ \text{cnae}(a) = s} \text{emp}(a)$$

A massa salarial atingida (R$/mês) é:

$$W = \sum_{a \in A_\text{at}} w(a)$$

onde $w(a)$ é a massa salarial mensal do estabelecimento $a$ (em R$).

#### 3.2 Impacto Agrícola

A área atingida por cultura $c$ (em hectares) é obtida pelo recorte do raster MapBiomas (30 m/pixel) pela mancha de inundação. A estimativa de perda econômica em reais é:

$$I_c = A_c \cdot \kappa_c$$

onde $\kappa_c$ é o coeficiente de perda em R$/ha para a cultura $c$ no período fenológico do evento, tabelado a partir de preços mínimos CONAB 2024 e dados EMATER-RS:

| Cultura | Período (evento maio/2024) | Coef. R$/ha | Justificativa |
|---|---|---:|---|
| Soja | Colhida (fev–abr/2024) | 1.100 | Compactação do solo e insumos para próxima safra |
| Arroz | Colhido (fev–abr/2024) | 1.100 | Compactação e infraestrutura de irrigação |
| Outras Lavouras Temporárias | Plantio inicial (mai–jun/2024) | 1.400 | Trigo/aveia: perda de sementes e insumos |

O impacto total estimado é:

$$I_\text{total} = \sum_c I_c = \sum_c A_c \cdot \kappa_c$$

#### 3.3 Educação

O número de matrículas atingidas por etapa $e$ é:

$$M_e = \sum_{\substack{u \in A_\text{at} \\ \text{etapa}(u) = e}} m(u)$$

onde $m(u)$ é o número de matrículas do estabelecimento $u$ na etapa $e$.

As etapas consideradas seguem a classificação INEP: Educação Infantil, Ensino Fundamental I/II, Ensino Médio, EJA, Educação Especial e Ensino Superior.

#### 3.4 Saúde

O número de profissionais de saúde vinculados a estabelecimentos atingidos, por categoria $k$:

$$P_k = \sum_{u \in A_\text{at}} \text{staff}_k(u)$$

As 11 categorias seguem o padrão CNES: Médicos, Enfermagem, Odontologia, Farmácia, Diagnóstico/Imagem, ACS/Endemias, Administrativo, Transporte/Urgência, Serviços Gerais, e outros.

### 4. Danos Operacionais (Metodologia DaLA)

Estimados por `pipeline/07_danos.py`, expostos na página **`/danos`** e detalhados na página `/metodologia` (§ 9). Segue o **DaLA (Damage and Loss Assessment)**, metodologia CEPAL/BID/Banco Mundial aplicada na avaliação oficial das enchentes RS/2024, que distingue:

| Conceito | Definição | Exemplo |
|---|---|---|
| Danos | Destruição total ou parcial de ativos físicos (estoque) | Edificação destruída, equipamento perdido |
| Perdas | Fluxo de produção/serviço não realizado durante a interrupção | VAB não gerado, aulas não ministradas, consultas não realizadas |

Este painel estima **perdas operacionais** (fluxo). Danos físicos (estoque) têm estimativa à parte — ver § 5 abaixo.

**Curva de recuperação linear:** a capacidade produtiva é zero durante a fase aguda ($d_a$ dias) e retorna gradualmente durante a recuperação ($d_r$ dias):

$$d_{\text{ef}} = d_a + \frac{d_r}{2} \qquad f = \frac{d_{\text{ef}}}{365}$$

| Componente | Fórmula | Fonte dos parâmetros |
|---|---|---|
| Empresas (perda de VAB) | $\widehat{\text{VAB}}_i = \dfrac{w_{i,\text{mensal}} \times 12}{LS_s}$, $\ \Delta_i = \widehat{\text{VAB}}_i \times f$ | Labor share $LS_s$ = Remunerações/VAB por setor, IBGE SCN 2021 Tab.17 (inversão pelo labor share; Karabarbounis & Neiman, 2014) |
| Educação (reposição FUNDEB) | $L_{\text{edu}} = 2 \times c \times N_{\text{alunos}} \times d_a$, $\ c = \text{VAAT-MIN}/200$ | VAAT-MIN FUNDEB 2024 = R$ 8.481,21 (Portaria Interministerial MEC/MF nº 9/2024); LDB Art. 24, I (200 dias letivos/ano) |
| Saúde (produção SUS não realizada) | $P_k = \dfrac{P_{\text{SIA},k}+P_{\text{SIH},k}}{7} \times 12$, $\ L_{\text{sau}} = \sum P_k \times f$ | SIA/SUS + SIH/SUS (DataSUS), 7 meses de competência disponíveis, projetados linearmente para 12 |
| Agricultura (custo direto) | $L_{\text{agr}} = \sum_c A_c \times \text{Coef}_c$ | Coeficientes R$/ha por cultura e período fenológico (CONAB, EMATER-RS) — custo fixo, independente de $f$ |

$$L_{\text{total}} = L_{\text{emp}} + L_{\text{edu}} + L_{\text{sau}} + L_{\text{agr}}$$

A página `/danos` permite testar $d_{\text{ef}} \in \{30, 45, 60\}$ dias em análise de sensibilidade para todos os cenários.

### 5. Dano Físico — CLIMADA (Protótipo)

> **Protótipo exploratório**, disponível apenas para **Porto Alegre**, não uma métrica oficial do painel. Mede **destruição de patrimônio** (estoque: prédio + equipamento) — diferente do DaLA acima, que mede perdas de fluxo. Gerado por `pipeline/climada_risco_prototipo.py`, exposto em `climada_dano_fisico_prototipo.json` e na aba "Dano Físico" de `/danos`.

**Fórmula geral:** $D_i = \text{MDD}(h_i) \times PAA \times V_i$, onde $\text{MDD}(h)$ (*Mean Damage Degree*) é a fração do valor de reposição destruída na profundidade de água $h$ (curvas calibradas pelo CLIMADA a partir da base JRC — Huizinga et al., 2017), $PAA=1$, e $V_i$ é o valor de reposição do ponto (construção via CUB/RS Sinduscon + conteúdo/equipamento via multiplicador JRC Table 3-26, diferenciado por setor: Empresas, Saúde, Educação).

A profundidade $h_i$ é amostrada do raster de profundidade máxima do CLIMADA (~90 m/pixel) para o período de retorno (RP) selecionado, em cada ponto geocodificado. A curva de Empresas foi recalibrada com um fator $\lambda$ ancorado no RP200 (única evidência empírica disponível para Porto Alegre), reaproveitado na curva sintética de Saúde.

**Risco Anual Esperado (EAI):** integra o dano de cada período de retorno (RP10 a RP500) pela sua frequência anual de excedência, via regra do trapézio:

$$\text{EAI} \approx \sum_i \frac{(f_i - f_{i+1})(L_i + L_{i+1})}{2}$$

**Projeção 2050:** decompõe o aumento do EAI entre 2025 e 2050 em duas parcelas — crescimento de exposição (mais empresas/escolas/leitos no tempo) e mudança climática (remapeamento de frequência dos períodos de retorno para um clima futuro mais extremo).

⚠️ Ambos (protótipo de Dano Físico e Projeção 2050) têm premissas explícitas que precisam de validação antes de qualquer uso além de exploração metodológica — ver a lista de limitações na própria página `/danos?aba=climada`.

---

## Estrutura do Projeto

```
Dashboard BID/
├── app/
│   ├── page.tsx              # Shell do dashboard (monta componentes, passa `dash`)
│   ├── layout.tsx            # Root layout + fonte Geist
│   ├── globals.css           # Tailwind v4 + variáveis de tema + CSS MapLibre
│   ├── danos/
│   │   ├── page.tsx          # Página cheia: Danos Operacionais (DaLA) + Dano Físico (CLIMADA)
│   │   ├── DanosClient.tsx   # Componente client (gráficos, sensibilidade, EAI, projeção 2050)
│   │   └── get-data.ts       # Leitura server-side dos JSONs de danos
│   ├── climada/
│   │   └── page.tsx          # Redirect para /danos?aba=climada (compat. com links antigos)
│   ├── @modal/(.)danos/      # Rota interceptada — abre /danos como modal sobre o mapa
│   ├── @modal/(.)metodologia/ # Idem para /metodologia
│   └── metodologia/
│       ├── page.tsx          # Página de metodologia completa
│       └── MetodologiaContent.tsx
├── components/
│   ├── DashboardMap.tsx      # Mapa MapLibre (Source/Layer) + popup
│   ├── DashboardHeader.tsx   # Seleção município/cenário + botões de camada
│   ├── AnalysisPanel.tsx     # Painel lateral com abas
│   ├── FiltersPanel.tsx      # Filtros dinâmicos
│   ├── KPIRow.tsx            # Par de KPICards (base + atingidos)
│   ├── MapPopup.tsx          # Popup ao clicar numa feature
│   ├── AgriculturaTab.tsx    # Aba de impacto agrícola
│   └── tabs/
│       ├── EmpresasTab.tsx
│       ├── SaudeTab.tsx
│       ├── EducacaoTab.tsx
│       ├── InfraTab.tsx
│       └── infra/            # Seções específicas de infraestrutura
│           ├── GenericInfraSection.tsx
│           ├── LogradourosSection.tsx
│           ├── QuadrasSection.tsx
│           └── TerrenosSection.tsx
├── hooks/
│   └── useDashboard.ts       # Todo o estado, fetches, memos, callbacks
├── lib/
│   ├── constants.ts          # Configurações (municípios, cenários, cores, coeficientes)
│   └── geo-utils.ts          # slugify, scenarioSlug, formatoBr, calcEmp/Edu/Sau
├── pipeline/                 # Pipeline Python para pré-processamento dos dados (raiz do repo BID)
│   ├── 01_rais.py            # RAIS → estabelecimentos geocodificados
│   ├── 02_educacao.py        # Censo Escolar → escolas geocodificadas
│   ├── 03_saude.py           # CNES → unidades de saúde
│   ├── 04_agricultura.py     # MapBiomas → uso do solo agrícola
│   ├── 05_geocodificar.py    # Geocodificação via Nominatim (OSM local)
│   ├── 06_geojson.py         # Gera BASE + ATINGIDOS → public/dados_convertidos/
│   ├── 07_danos.py           # Danos operacionais (DaLA): VAB, FUNDEB, SUS, agricultura
│   ├── 08_icms_validacao.py  # (supl.) Valida a perda de VAB (07) contra o ICMS observado
│   ├── 09_populacao.py       # (supl.) População exposta (WorldPop) + PNGs de densidade
│   ├── 10_infra_stats.py     # (supl.) Estatísticas leves de infraestrutura por município
│   ├── 11_area_atingida.py   # (supl.) Área territorial x área atingida por cenário
│   ├── common.py             # Helpers geoespaciais compartilhados (inclui limpeza de geometria)
│   ├── vetorizar_climada.py           # Rasters de inundação CLIMADA (POA) → shapefiles de mancha
│   ├── gerar_mancha_duracao_climada.py # PNG de duração de alagamento (dias) do evento CLIMADA
│   ├── gerar_infra_climada_evento_2024.py # ATINGIDOS de infraestrutura p/ cenário Climada Evento 2024
│   ├── climada_risco_prototipo.py     # Protótipo de Dano Físico (CLIMADA): profundidade × MDD × valor
│   ├── limpar_geometrias_infra.py     # Corrige em-lugar geometria das camadas de infraestrutura
│   └── validation/            # check_bases.py, check_geojson.py — QA ad hoc do contrato de dados
└── public/
    └── dados_convertidos/
        ├── danos_operacionais.json    ← saída de 07_danos.py (Perdas DaLA por município/cenário)
        ├── climada_dano_fisico_prototipo.json ← saída de climada_risco_prototipo.py (POA)
        ├── populacao_atingida.json    ← saída de 09_populacao.py
        ├── {municipio_slug}/
        │   ├── empresas_BASE.geojson
        │   ├── educacao_BASE.geojson
        │   ├── saude_BASE.geojson
        │   ├── limite_BASE.geojson
        │   ├── agricultura_stats_BASE.json
        │   ├── infraestrutura_stats.json  ← saída de 10_infra_stats.py
        │   ├── populacao.png               ← heatmap de densidade (09_populacao.py)
        │   ├── infraestrutura/
        │   │   └── {nome}_BASE.geojson
        │   └── cenarios/
        │       ├── {cenario_slug}.geojson            ← mancha de inundação
        │       ├── empresas_ATINGIDOS_{slug}.geojson
        │       ├── educacao_ATINGIDOS_{slug}.geojson
        │       ├── saude_ATINGIDOS_{slug}.geojson
        │       ├── infra_{nome}_ATINGIDOS_{slug}.geojson
        │       └── agricultura_stats_{slug}.json
        └── mancha_rs_enchente_2024.geojson           ← mancha estadual (Visão Geral RS)
```

**Convenção de nomes (slugify):** espaços → `_`, acentos removidos, lowercase. Ex: `"Porto Alegre"` → `porto_alegre`. Slug de cenário: `{mun_slug}___{cen_slug}` (três underscores).

---

## Instalação e Execução

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Turbopack)
npm run dev        # → http://localhost:3000

# Build de produção
npm run build

# Verificação de tipos TypeScript
npm run typecheck

# Linting e formatação
npm run lint
npm run format
```

> **Atenção:** nunca rodar `npm run build` e depois `npm run dev` sem antes deletar a pasta `.next/`.

---

## Pipeline de Dados (Python)

Os GeoJSONs em `public/dados_convertidos/` são gerados pelo pipeline Python em `pipeline/` (raiz do repo BID). Dependências: `shapely`, `geopandas`, `pandas`.

```
Fontes brutas (RAIS, INEP, CNES, MapBiomas Coleção 10, Google Open Buildings, shapefiles manchas)
        ↓  pipeline/01..05 — limpeza, filtragem, geocodificação (Nominatim/OSM)
Dados processados (CSV por município)
        ↓  pipeline/06_geojson.py — interseção espacial, BASE + ATINGIDOS
*_BASE.geojson / *_ATINGIDOS_*.geojson  →  public/dados_convertidos/  →  Next.js serve estático
```

Para regenerar todos os GeoJSONs do dashboard (assumindo dados brutos disponíveis):
```bash
# Executar na raiz do repo BID, em sequência
python pipeline/01_rais.py
python pipeline/02_educacao.py
python pipeline/03_saude.py
python pipeline/04_agricultura.py
python pipeline/05_geocodificar.py   # requer Nominatim em localhost:8080
python pipeline/06_geojson.py
python pipeline/07_danos.py          # → danos_operacionais.json (aceita --dias N)
```

Scripts **08–11** são independentes da cadeia acima (rodam ad hoc, uma vez que 01–07 já tenham gerado seus outputs): `08_icms_validacao.py` (valida a perda de VAB contra o ICMS observado), `09_populacao.py` (população exposta via WorldPop), `10_infra_stats.py` (estatísticas leves de infraestrutura) e `11_area_atingida.py` (área territorial × área atingida). Os scripts do protótipo CLIMADA (`vetorizar_climada.py`, `gerar_mancha_duracao_climada.py`, `gerar_infra_climada_evento_2024.py`, `climada_risco_prototipo.py`) também são independentes e específicos de Porto Alegre.

Para corrigir/suavizar as geometrias das camadas de infraestrutura (sem gerador próprio no pipeline):
```bash
python pipeline/limpar_geometrias_infra.py
```

---

## Tecnologias

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 15 |
| UI | React | 19 |
| Mapa | MapLibre GL + react-map-gl | 5 / 8 |
| Estilo | Tailwind CSS v4 + shadcn/ui | 4 |
| Gráficos | Recharts | — |
| Excel | xlsx (SheetJS) | 0.18 |
| Tema | next-themes | — |
| Geoprocessamento offline | GeoPandas / Shapely | — |

---

## Fontes de Dados

| Dado | Fonte | Período |
|---|---|---|
| Empregos e estabelecimentos | RAIS/MTE | 2023 |
| Escolas e matrículas | Censo Escolar/INEP | 2024 |
| Estabelecimentos de saúde | CNES/DataSUS | abril/2024 |
| Geocodificação de endereços | OpenStreetMap / Nominatim | — |
| Manchas de inundação PA e EDS | MUP / Gov. RS | maio/2024 |
| Manchas de inundação Lajeado | LabModel | maio/2024 |
| Manchas de inundação Rio Grande | CIEX/FURG | maio/2024 · set/2023 |
| Infraestrutura urbana POA | IPPOA / Dados Abertos | 2023–2024 |
| Infraestrutura Rio Grande | Prefeitura RG | 2023–2024 |
| Infraestrutura Lajeado | Prefeitura Lajeado | 2023–2024 |
| Edificações | Google Open Buildings v3 | 2023 |
| Uso do solo agrícola | MapBiomas Coleção 10 | 2023 e 2024 |
| Área cultivada (contexto) | CONAB | Safra 2023/24 |
| Coeficientes de perda agrícola | EMATER-RS / CONAB | 2024 |
| Labor share setorial (perda de VAB) | IBGE — Sistema de Contas Nacionais, Tab. 17 | 2021 |
| Custo de reposição educação (FUNDEB) | Portaria Interministerial MEC/MF nº 9/2024 (VAAT-MIN) | 2024 |
| Produção SUS (ambulatorial/hospitalar) | DataSUS — SIA/SUS e SIH/SUS | jan–jul/2024 |
| Validação cruzada de VAB perdido | ICMS — SEFAZ-RS | 2021–2024 |
| Profundidade/duração de inundação (Dano Físico, EAI, projeção 2050) | CLIMADA / UNU-EHS (BID) | Evento maio/2024 + RP10–RP500 |
| Curvas de dano por profundidade (MDD) | JRC — Huizinga, de Moel & Szewczyk (2017) | — |
| Custo de construção (CUB, Dano Físico) | Sinduscon-RS | dez/2024 |
| População exposta | WorldPop Constrained (100 m) | 2024 |

---

## Dados

### Disponibilidade

Todos os GeoJSONs processados estão incluídos neste repositório em `public/dados_convertidos/`. Os arquivos acima de ~50 MB são armazenados via **Git LFS** (evita o limite rígido de 100 MB por arquivo do GitHub e não infla o clone normal do repositório):

| Arquivo | Tamanho | Armazenamento |
|---|---:|---|
| `porto_alegre/infraestrutura/edificacoes_BASE.geojson` | 162 MB | Git LFS |
| `porto_alegre/infraestrutura/lotes_BASE.geojson` | 121 MB | Git LFS |
| `rio_grande/infraestrutura/edificacoes_BASE.geojson` | 70 MB | Git LFS |
| `porto_alegre/infraestrutura/rede_esgoto_BASE.geojson` | 65 MB | Git LFS |

> Para clonar incluindo os arquivos LFS: `git lfs pull` após o `git clone`.

Os dados brutos originais (RAIS, INEP, CNES, MapBiomas raster, Google Open Buildings CSV) **não estão incluídos** — devem ser obtidos diretamente nas fontes listadas acima e processados com os scripts em `pipeline/`.

---

### Dicionário de Dados

#### Empresas (`empresas_BASE.geojson`)

Fonte: RAIS/MTE. Um ponto por estabelecimento formal.

| Campo | Tipo | Descrição |
|---|---|---|
| `cnae` | int | Código CNAE 7 dígitos |
| `cnae_2` | str | Seção CNAE (nível 2) por extenso |
| `classe` | int | Código CNAE classe (5 dígitos) |
| `empregados` | int | Vínculos empregatícios ativos |
| `massa_salarial` | float | Massa salarial mensal (R$) |
| `média salarial` | float | Salário médio mensal (R$) |
| `razão social` | str | Razão social |
| `nome logradouro` | str | Endereço |
| `nome bairro` | str | Bairro |
| `latitude` / `longitude` | float | Coordenadas WGS 84 |
| `tipo_precisao` | str | Qualidade da geocodificação |
| `municipio` | int | Código IBGE do município |

#### Educação (`educacao_BASE.geojson`)

Fonte: Censo Escolar INEP 2024. Um ponto por escola.

| Campo | Tipo | Descrição |
|---|---|---|
| `co_entidade` | int | Código INEP da escola |
| `no_entidade` | str | Nome da escola |
| `tp_dependencia` | str | Dependência: Federal / Estadual / Municipal / Privada |
| `tp_localizacao` | str | 1 = Urbana, 2 = Rural |
| `qtd_prof` | int | Total de professores |
| `qtd_matri_inf` | int | Matrículas — Educação Infantil |
| `qtd_matri_fund` | int | Matrículas — Ensino Fundamental |
| `qtd_matri_med` | int | Matrículas — Ensino Médio |
| `qtd_matri_prof` | int | Matrículas — Educação Profissional |
| `qtd_matri_eja` | int | Matrículas — EJA |
| `qtd_matri_esp` | int | Matrículas — Educação Especial |
| `no_municipio` | str | Nome do município |
| `ds_endereco` | str | Logradouro |
| `no_bairro` | str | Bairro |

#### Saúde (`saude_BASE.geojson`)

Fonte: CNES/DataSUS 2024. Um ponto por estabelecimento de saúde.

| Campo | Tipo | Descrição |
|---|---|---|
| `co_cnes` | str | Código CNES |
| `no_fantasia` | str | Nome fantasia |
| `tp_unidade` | str | Código do tipo de unidade (CNES) |
| `nivel_dep` | str | 1=Federal, 2=Estadual, 3=Municipal, 4=Privada |
| `co_atividade` | str | Código de atividade do estabelecimento |
| `staff_medicos` | int | Médicos |
| `staff_enfermagem` | int | Profissionais de enfermagem |
| `staff_odontologia` | int | Profissionais de odontologia |
| `staff_farmacia` | int | Profissionais de farmácia |
| `staff_diag_lab_imagem` | int | Diagnóstico / laboratório / imagem |
| `staff_acs_endemias` | int | ACS e agentes de endemias |
| `staff_admin_gestao_apoio` | int | Administrativo e gestão |
| `staff_transporte_urgencia` | int | Transporte e urgência |
| `staff_servicos_gerais` | int | Serviços gerais |
| `staff_outros` | int | Outros profissionais |
| `nu_latitude` / `nu_longitude` | str | Coordenadas WGS 84 |
| `no_logradouro` / `no_bairro` | str | Endereço |

#### Edificações (`infraestrutura/edificacoes_BASE.geojson`)

Fonte: Google Open Buildings v3. Um polígono por edificação.

| Campo | Tipo | Descrição |
|---|---|---|
| `area_m2` | float | Área da planta baixa em m² |
| `geometry` | Polygon | Polígono WGS 84 simplificado (tolerância 0,00002°) |

Filtros aplicados: confiança ≥ 0,65 (geral) ou ≥ 0,80 (Porto Alegre).

#### Agricultura (`agricultura_stats_BASE.json`)

Estatísticas pré-computadas — não é GeoJSON de pontos.

```json
{
  "Soja": 12345.6,
  "Arroz": 8901.2,
  "Outras Lavouras Temporárias": 3456.7
}
```

Valores em hectares. Gerado pelo recorte do raster MapBiomas (30 m/pixel) pela bounding box do município.

#### Danos Operacionais (`danos_operacionais.json`)

Fonte: `pipeline/07_danos.py` (metodologia DaLA). Estrutura `{ município: { cenário: { ... } } }`.

| Campo | Tipo | Descrição |
|---|---|---|
| `dias_agudo` | int | Dias de fase aguda ($d_a$) do cenário |
| `dias_efetivos` | int | Dias efetivos de interrupção ($d_{\text{ef}} = d_a + d_r/2$) |
| `f_interrup` | float | Fator de interrupção anualizado ($f = d_{\text{ef}}/365$) |
| `empresas_vab` | float | Perda de VAB das empresas atingidas (R$), via inversão pelo labor share |
| `educacao_perdas` | float | Perda de serviço educacional não prestado (R$) |
| `educacao_custo_adicional` | float | Custo adicional de reposição dos dias letivos (R$, FUNDEB) |
| `saude_producao` | float | Produção SUS não realizada (R$) |
| `agricultura_perdas` | float | Custo direto de perda agrícola (R$) |
| `total` | float | Soma dos quatro componentes (R$) |

#### Dano Físico — CLIMADA (`climada_dano_fisico_prototipo.json`)

Fonte: `pipeline/climada_risco_prototipo.py`. Protótipo exclusivo de Porto Alegre — ver [§ 5](#5-dano-físico--climada-protótipo) acima.

| Campo | Tipo | Descrição |
|---|---|---|
| `premissas` | object | Parâmetros do modelo: CUB por categoria, multiplicadores de conteúdo, curvas MDD por setor, fator de recalibração de POA |
| `resultados_por_rp` | object | `{ RP: { setor: { dano_fisico_total_brl, exposicao_total_brl, profundidade_media_atingidos_m, ... } } }` — um resultado por período de retorno (RP10–RP500) e setor |
| `eai_anual_esperado` | object | Risco anual esperado (EAI) por setor, integrado sobre os RPs disponíveis |
| `projecao_2050` | object \| null | Decomposição do aumento de risco 2025→2050 em crescimento de exposição vs. mudança climática |

---

## Autores

**Alisson T. G. Fiorentin**
Universidade Federal do Rio Grande do Sul (UFRGS) — [ORCID](https://orcid.org/0009-0002-7233-3640)

**Patrízia Raggi Abdallah**
Universidade Federal do Rio Grande (FURG) — [ORCID](https://orcid.org/0000-0001-6417-7524)

**Centro Interinstitucional de Observação e Previsão de Eventos Extremos (CIEX)**
FURG — [@ciexfurg](https://www.instagram.com/ciexfurg/)

---

## Como Citar

Se você utilizar este software ou os dados gerados por ele, por favor cite:

```bibtex
@software{fiorentin2026bid,
  author       = {Fiorentin, Alisson T. G. and Abdallah, Patrízia Raggi and Centro Interinstitucional de Observação e Previsão de Eventos Extremos - {CIEX}},
  title        = {{Avaliação de Impactos Socioeconômicos}},
  year         = {2026},
  version      = {1.0.0},
  publisher    = {GitHub},
  url          = {https://github.com/AliFiorentin/bid-dashboard-inundacoes-rs},
  license      = {GPL-3.0-only AND CC-BY-4.0}
}
```

Ou consulte o arquivo [`CITATION.cff`](CITATION.cff) para o formato CFF.

---

## Licença

O **código-fonte** deste projeto está licenciado sob a [GNU General Public License v3.0](LICENSE).

Os **dados geoespaciais e estatísticos** produzidos e disponibilizados neste repositório estão licenciados sob [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

Os dados de terceiros (RAIS, INEP, CNES, MapBiomas, Google Open Buildings) estão sujeitos às suas respectivas licenças de uso.

---

**Projeto desenvolvido com apoio do Banco Interamericano de Desenvolvimento (BID) e do Centro Interinstitucional de Observação e Previsão de Eventos Extremos (CIEX)**
