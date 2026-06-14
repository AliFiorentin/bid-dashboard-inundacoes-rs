# Dashboard BID — Impacto de Inundações no Sul do Brasil

> Painel WebGIS interativo para análise socioeconômica do impacto das enchentes de 2024 nos municípios do Rio Grande do Sul, desenvolvido em parceria com o BID (Banco Interamericano de Desenvolvimento), GPEa e CIEX/FURG.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre-5-2563EB)](https://maplibre.org/)

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
| Porto Alegre    | Cenário ADA                                     | Enchentes de maio de 2024  |
| Rio Grande      | Cenário Maio 2024 · Cenário Maio 2024 +50%      | Tormenta de maio de 2024   |

A **Visão Geral RS** exibe os 4 municípios simultaneamente com o pior cenário de cada um aplicado e a mancha de inundação estadual de referência.

---

## Metodologia

### 1. Delimitação das Manchas de Inundação

As manchas de inundação (polígonos vetoriais) provêm de estudos hidrológicos específicos por município:

- **Porto Alegre e Eldorado do Sul:** Área Diretamente Afetada (ADA) mapeada pelo IPH/UFRGS com base em imagens de satélite e dados de monitoramento hidrométrico (maio/2024).
- **Lajeado:** Simulação hidráulica do rio Taquari para cotas de 27 m e 30 m (SNO/ANA).
- **Rio Grande:** Cenário observado (maio/2024) e projeção +50% de precipitação.

As manchas são armazenadas como `{municipio_slug}___{cenario_slug}.geojson` em projeção WGS 84 (EPSG:4326).

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

---

## Estrutura do Projeto

```
Dashboard BID/
├── app/
│   ├── page.tsx              # Shell do dashboard (monta componentes, passa `dash`)
│   ├── layout.tsx            # Root layout + fonte Geist
│   ├── globals.css           # Tailwind v4 + variáveis de tema + CSS MapLibre
│   └── metodologia/
│       └── page.tsx          # Página de metodologia completa
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
├── scripts/                  # Pipeline Python para pré-processamento dos dados
│   ├── converter_edificacoes.py
│   ├── recorte_edificacoes_atingidos.py
│   └── ...
└── public/
    └── dados_convertidos/
        ├── {municipio_slug}/
        │   ├── empresas_BASE.geojson
        │   ├── educacao_BASE.geojson
        │   ├── saude_BASE.geojson
        │   ├── limite_BASE.geojson
        │   ├── agricultura_stats_BASE.json
        │   ├── infraestrutura/
        │   │   └── {nome}_BASE.geojson
        │   └── cenarios/
        │       ├── {cenario_slug}.geojson            ← mancha de inundação
        │       ├── empresas_ATINGIDOS_{slug}.geojson
        │       ├── educacao_ATINGIDOS_{slug}.geojson
        │       ├── saude_ATINGIDOS_{slug}.geojson
        │       ├── infra_{nome}_ATINGIDOS_{slug}.geojson
        │       └── agricultura_stats_{slug}.json
        └── mancha_rs_enchente_2024.geojson           ← mancha estadual
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

Os GeoJSONs em `public/dados_convertidos/` são gerados por scripts Python que realizam a interseção espacial offline. Dependências: `shapely`, `geopandas`, `pandas`.

```
Fontes brutas (RAIS, INEP, CNES, MapBiomas, Google Open Buildings, shapefiles IPH/SNO)
        ↓  Python / GeoPandas / Shapely
Limpeza + transformação para GeoJSON (WGS 84)
        ↓  Interseção espacial com mancha de inundação
*_ATINGIDOS_*.geojson  →  public/dados_convertidos/  →  Next.js serve estático
```

Para regenerar as edificações atingidas:
```bash
python scripts/converter_edificacoes.py        # BASE: CSV.gz → GeoJSON por município
python scripts/recorte_edificacoes_atingidos.py # ATINGIDOS: clip edificações × mancha
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
| Empregos e estabelecimentos | RAIS/MTE | 2022–2023 |
| Escolas e matrículas | Censo Escolar/INEP | 2023 |
| Estabelecimentos de saúde | CNES/DataSUS | 2024 |
| Manchas de inundação PA e EDS | IPH/UFRGS | maio/2024 |
| Manchas de inundação Lajeado | SNO/ANA | maio/2024 |
| Manchas de inundação Rio Grande | Elaboração própria | maio/2024 |
| Infraestrutura urbana POA | IPPOA / Dados Abertos | 2023–2024 |
| Infraestrutura Rio Grande | Prefeitura RG | 2023–2024 |
| Infraestrutura Lajeado | Prefeitura Lajeado | 2023–2024 |
| Edificações | Google Open Buildings v3 | 2023 |
| Uso do solo agrícola | MapBiomas Coleção 8 | 2023 |
| Área cultivada (contexto) | CONAB | Safra 2023/24 |
| Coeficientes de perda agrícola | EMATER-RS / CONAB | 2024 |

---

## Autores

**Alisson T. G. Fiorentin**
Universidade Federal do Rio Grande (FURG) — [ORCID](https://orcid.org/0009-0002-7233-3640)

**Patrízia Raggi Abdallah**
Universidade Federal do Rio Grande (FURG) — [ORCID](https://orcid.org/0000-0001-6417-7524)

**Grupo de Pesquisa em Economia Azul (GPEa)**
FURG — [gpea-furg.com](https://sites.google.com/view/gpea-furg/home)

**Centro Interinstitucional de Observação e Previsão de Eventos Extremos (CIEX)**
FURG — [@ciexfurg](https://www.instagram.com/ciexfurg/)

---

## Como Citar

Se você utilizar este software ou os dados gerados por ele, por favor cite:

```bibtex
@software{fiorentin2026bid,
  author       = {Fiorentin, Alisson T. G. and Abdallah, Patrízia Raggi and
                  {Grupo de Pesquisa em Economia Azul (GPEa)} and
                  {Centro Interinstitucional de Observação e Previsão de Eventos Extremos (CIEX)}},
  title        = {{Dashboard BID — Impacto de Inundações no Sul do Brasil}},
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
