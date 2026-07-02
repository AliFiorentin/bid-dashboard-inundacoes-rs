# Análise Comparativa: CCDR-Tools (World Bank) × Pipeline DaLA-BID

**Data:** Julho 2026  
**Escopo:** Cruzamento metodológico entre o toolkit do Banco Mundial para triagem climática
(CCDR-Tools) e o pipeline de danos operacionais do projeto BID/RS.

---

## 1. Visão Geral das Duas Metodologias

### 1.1 CCDR-Tools (World Bank)

**Propósito:** Triagem de risco climático e de desastres em escala nacional/subnacional
para subsidiar os Country Climate and Development Reports (CCDRs), 2022–2025.

**Framework central:** `Risco = Ameaça × Exposição × Vulnerabilidade`

**Natureza:** Probabilística — combina múltiplos cenários (períodos de retorno: 5, 10, 20,
50, 100, 200, 500 anos) e integra via soma de Riemann para obter o **Impacto Anual
Esperado (EAI — Expected Annual Impact)**.

**Funções de dano:** Curvas sigmoidais calibradas regionalmente (LAC, AFRICA, ASIA, GLOBAL)
com base em:
- Jonkman (2008) — mortalidade de inundações
- Huizinga et al. (2017) — dano a edificações e agricultura por profundidade d'água
- Eberenz et al. (2021) — dano por vento (ciclones tropicais)

**Camadas de exposição:** Dados globais — WorldPop (população), World Settlement Footprint
2019 (área construída em hectares), ESA WorldCover (uso agrícola em hectares).

**Unidade de análise:** Unidade administrativa (ADM0–ADM3) com estatísticas zonais.

**Output principal:** Tabela Excel + GeoPackage com EAI, EAI% e exposição por período
de retorno, por unidade administrativa.

---

### 1.2 Pipeline DaLA-BID (este projeto)

**Propósito:** Quantificar perdas operacionais causadas por enchentes específicas em
4 municípios do RS para relatório IDB, com granularidade microdata.

**Framework central:** DaLA (Damage and Loss Assessment) — CEPAL/BID (nov. 2024).
Foco em **perdas de fluxo de produção** (não destruição de ativos físicos).

**Natureza:** Determinística — um ou poucos cenários históricos de mancha de inundação
por município. Curva de recuperação linear (DaLA): fase aguda + fase de recuperação.

**Funções de dano:** Não há curvas de dano por profundidade. Assumido **100%
de interrupção** para estabelecimentos dentro da mancha durante a fase aguda;
50% de eficiência operacional na fase de recuperação.

**Camadas de exposição:** Microdados brasileiros — RAIS 2023 (vínculos empregatícios
por CNPJ), Censo Escolar 2024 (escolas/matrículas INEP), CNES abr/2024 (unidades
de saúde), MapBiomas 2023/2024 (uso agrícola vetorizado).

**Unidade de análise:** Estabelecimento individual (empresa/escola/US) ou polígono
agrícola — agregados por município/cenário.

**Output principal:** `danos_operacionais.json` com R$ por componente (empresas,
educação, saúde, agricultura) por município × cenário.

---

## 2. Tabela Comparativa Detalhada

| Dimensão | CCDR-Tools | Pipeline DaLA-BID |
|---|---|---|
| **Framework** | H × E × V (DRM/World Bank) | DaLA (CEPAL/BID) — perdas operacionais |
| **Abordagem temporal** | Probabilística (múltiplos RP → EAI) | Determinística (evento histórico) |
| **Métrica de dano** | Fração de valor destruído (0–1) × exposição | Fração de produção não realizada × VAB/custo unitário |
| **Dependência de profundidade** | **Sim** — curvas sigmoidais (cm → fator 0–1) | **Não** — binário (dentro/fora da mancha) |
| **Granularidade espacial** | Unidade administrativa (raster → zonal stats) | Estabelecimento individual (ponto ou polígono) |
| **Setor empresas** | Área construída (WSF) × curva Huizinga | Massa salarial × fator VAB (labor share SCN 2021) |
| **Setor educação** | Implícito na população/área construída | Matrículas × custo/dia (FUNDEB VAAT-MIN 2024) |
| **Setor saúde** | Implícito na população/área construída | Produção SIA+SIH (7m × 12/7) × fator interrupção |
| **Setor agricultura** | Área agrícola (ESA WorldCover) × curva Huizinga | Área (MapBiomas, ha) × coef R$/ha (cultura × fenologia) |
| **Curva de recuperação** | Não modelada explicitamente | Sim — DaLA: dias_agudo + dias_recuperacao × 0.5 |
| **Incerteza** | EAI com limites inferior/superior (Riemann) | Sensibilidade via `--dias N` (variação plana) |
| **Setor público (CNAE 84)** | Não segregado | Segregado — VAB = custo de pessoal (88.3% LS) |
| **Geocodificação** | Raster global (sem necessidade de endereço) | Nominatim local (endereço individual, 94–100% taxa) |
| **Dados de hazard** | GeoTIFF multi-RP (Fathom v3, 90m) | Shapefile de mancha única por cenário |
| **Escala** | Nacional/subnacional (qualquer país) | Municipal (4 municípios RS, dados BR-específicos) |
| **Licença** | GPL-3.0 (World Bank open source) | Pipeline proprietário (este projeto) |

---

## 3. Convergências Metodológicas

### 3.1 Ambas usam interseção espacial hazard × exposição
- CCDR: raster de profundidade sobreposto ao raster de exposição → estatísticas zonais
- BID: polígono de mancha testado contra pontos (empresas/escolas/saúde) via STRtree
  ou clipado contra polígonos (agricultura) via `gpd.overlay`

### 3.2 Agricultura: área como unidade intermediária
- Ambas medem **área afetada** como passo intermediário antes da monetização
- CCDR: fração de dano (0–1) × área total → área destruída
- BID: área clipada (ha) × R$/ha (por cultura e fase fenológica) → R$ perdidos

### 3.3 Reconhecimento de incerteza
- CCDR: limites inf/sup na integração probabilística
- BID: CLI `--dias` para sensibilidade + documentação das limitações metodológicas

### 3.4 Alinhamento com frameworks internacionais
- CCDR: DRM framework (IPCC, World Bank)
- BID: DaLA framework (CEPAL, mesma família BID/World Bank)
- Ambas referenciadas nos mesmos documentos de avaliação de perdas (CAH — Comprehensive
  Assessment of Hazards)

---

## 4. Divergências Críticas

### 4.1 Dependência de profundidade d'água

**CCDR:** A profundidade d'água (em cm) determina o fator de dano via curva sigmoidal.
Para inundações na América Latina (região LAC, Huizinga 2017):
- 20 cm → ~2% de dano
- 100 cm → ~45% de dano
- 200 cm → ~85% de dano
- >300 cm → ~98% de dano

**BID atual:** Qualquer estabelecimento dentro da mancha recebe 100% de interrupção
na fase aguda — independentemente de estar em lâmina d'água de 5 cm ou 300 cm.

**Consequência:** O pipeline BID pode **superestimar perdas** em áreas marginalmente
atingidas (profundidades rasas) e **não diferencia** estabelecimentos em zonas de
alta severidade vs. baixa severidade dentro da mesma mancha.

### 4.2 Abordagem probabilística vs. determinística

**CCDR:** Calcula EAI — valor médio de perdas anuais integrado sobre toda a curva
de frequência-intensidade. Isso permite comparar:
- Risco atual (baseline 2020)
- Risco futuro (SSP2-4.5, SSP5-8.5 em 2050)
- Custo-benefício de medidas de proteção

**BID atual:** Produz estimativa pontual para o evento maio/2024 (e setembro/2023 para
Rio Grande). Não há periodicidade de retorno nem comparação futura/histórica.

**Consequência:** Os resultados BID são **não comparáveis entre municípios** em termos
de risco relativo (um município pode ter resultado alto porque o cenário é extremo, não
porque o risco anual médio é alto).

### 4.3 Tipo de perda

**CCDR:** **Perdas diretas físicas** — fração do valor do ativo destruído. Inclui custos
de reconstrução, substituição de bens.

**BID:** **Perdas operacionais/indiretas de curto prazo** — fluxo de produção não
realizado durante o período de interrupção. Explicitamente **exclui destruição de ativos**
(exceto, parcialmente, nos coeficientes agrícolas que incorporam custos de insumos).

Ambas as abordagens são complementares — DaLA + CCDR juntas cobrem o espectro completo
(perdas de fluxo + danos a ativos).

### 4.4 Setor público (CNAE 84)

**CCDR:** Não segrega administração pública — está embutida na área construída.

**BID:** CNAE 84 recebe labor share de 88.3% (VAB ≈ custo de pessoal). Em Porto
Alegre/ADA, isso representa ~45% da massa salarial afetada. Metodologicamente defensável
como custo de oportunidade, mas conceitualmente diferente das perdas privadas.

---

## 5. O que o CCDR-Tools Agrega à Metodologia BID

### 5.1 Curvas de dano por profundidade (alta prioridade)

Se os shapefiles de mancha puderem ser substituídos ou complementados por rasters de
profundidade d'água, é possível aplicar a função de dano LAC (Huizinga 2017) para
modular o fator de interrupção:

```python
# Atual (binário):
f_dano = 1.0 if ponto_dentro_da_mancha else 0.0

# Proposto (função de profundidade):
from ccdr_damageFunctions import FL_damage_factor_builtup
depth_cm = raster.sample(point)   # extrair profundidade no ponto
f_dano = FL_damage_factor_builtup(depth_cm / 100, wb_region="LAC")  # converte cm→m
```

**Dados necessários:** Raster de profundidade máxima de inundação (ex.: Fathom v3,
modelagem LabModel/CIEX já usada no projeto).

### 5.2 Camada de dano a ativos físicos (complementar)

CCDR quantifica destruição de área construída (WSF) em hectares. Combinando com
valores unitários de reposição (ex.: IBGE SINAPI — Sistema Nacional de Pesquisa de
Custos e Índices da Construção Civil), seria possível estimar o custo de reconstrução
complementar às perdas operacionais:

```
dano_ativos = area_construida_atingida_ha × valor_reposicao_R$/ha
```

Isso preencheria a lacuna atual: o pipeline BID cobre apenas perdas de fluxo, não
destruição patrimonial.

### 5.3 Cálculo de EAI para priorização de investimentos

Adaptando o módulo `calc_EAEI()` do CCDR com os cenários de período de retorno
disponíveis para os municípios, seria possível calcular:

```
EAI_empresas = ∫ perda_VAB(RP) × P(RP) dRP
```

Isso permitiria **comparar municípios entre si** e calcular **custo-benefício** de
obras de proteção (e.g., dique) usando a redução do EAI como benefício.

### 5.4 Projeção climática futura (SSP)

CCDR suporta cenários CMIP6 (SSP2-4.5, SSP5-8.5 para 2050). Se dados de inundação
futura estiverem disponíveis para os municípios RS (ex.: Fathom Climate), é possível
calcular aumento projetado de perdas por mudança climática.

---

## 6. O que o Pipeline BID Oferece que o CCDR Não Cobre

| Capacidade BID | Relevância |
|---|---|
| Granularidade microdata (CNPJ, INEP, CNES) | Identificar estabelecimentos específicos, não apenas área construída |
| Setor educação via FUNDEB (custo legal de reposição) | Mais preciso que fração de valor construído |
| Setor saúde via produção SUS (SIA+SIH) | Captura valor de serviço, não valor do prédio |
| Labor share por setor CNAE (SCN 2021) | Métrica de perda econômica, não física |
| Fenologia agrícola nos coeficientes | Diferencia perda por estágio da cultura no campo |
| Curva de recuperação DaLA (agudo + recuperação) | Modela dinâmica temporal pós-evento |
| Dados brasileiros obrigatórios (RAIS, Censo, DataSUS) | Insubstituível por dados globais |

---

## 7. Recomendações de Integração

> **Restrição confirmada:** rasters de profundidade d'água não estão disponíveis para
> nenhum dos municípios. As recomendações R1 e R4 (que dependem de `depth_cm`/`depth_m`
> como input) não são implementáveis na configuração atual.

### Viável sem raster de profundidade

**R2 — Documentar explicitamente o complemento CCDR para ativos físicos (imediato)**

Registrar nos relatórios que o pipeline BID cobre **apenas perdas operacionais** (DaLA),
e que para cobertura completa seria necessário adicionar estimativa de destruição de
ativos via abordagem CCDR com World Settlement Footprint + SINAPI.

**R3 — Calcular EAI rudimentar para municípios com múltiplos cenários**

Rio Grande possui 3 cenários (set/2023, maio/2024, maio/2024+50%); Lajeado possui 2
(cota 27m, cota 30m). Se os períodos de retorno aproximados desses eventos forem
conhecidos (ex.: mai/2024 ≈ RP50, cota 30m ≈ RP100), é possível estimar EAI usando
o módulo `calc_EAEI()` do CCDR com as perdas em R$ já calculadas por `07_danos.py`:

```python
# Exemplo conceitual para Lajeado (Taquari):
RPs   = [27, 30]   # cotas como proxy de período de retorno (verificar com LabModel)
perdas = [perda_cen_27m, perda_cen_30m]   # R$ de 07_danos.py
probs  = [1/rp for rp in RPs]
EAI = sum((p1 - p2) * (l1 + l2) / 2 for (p1, l1), (p2, l2)
          in zip(zip(probs, perdas), zip(probs[1:], perdas[1:])))
```

Isso permitiria comparar **risco anual esperado** entre municípios, não apenas o
impacto de um evento específico.

### Requer dados adicionais (bloqueada)

**R1 — Curvas Huizinga LAC no fator de interrupção** ❌ Requer raster de profundidade

**R4 — Mortalidade Jonkman 2008** ❌ Requer raster de profundidade

**R5 — Projeção SSP futura** ❌ Requer raster Fathom Climate (não disponível)
Aplicada sobre a população IBGE dentro da mancha (ou RAIS), geraria estimativa de
mortalidade esperada.

### Prioridade Baixa

**R5 — Integrar projeções SSP (2050)**

Depende de disponibilidade de rasters de inundação futura para municípios RS.
O framework CCDR já tem a estrutura; o gargalo é a fonte de dados de hazard.

---

## 8. Síntese: Matriz de Complementaridade

```
┌─────────────────────┬────────────────────────┬──────────────────────────┐
│ Dimensão            │ CCDR-Tools             │ Pipeline DaLA-BID        │
├─────────────────────┼────────────────────────┼──────────────────────────┤
│ Destruição de ativos│ ✅ Sim (WSF, Huizinga) │ ❌ Não modelado          │
│ Perdas operacionais │ ❌ Não                 │ ✅ Sim (DaLA, 4 setores) │
│ Profundidade d'água │ ✅ Sim (curvas sigmoid) │ ❌ Binário (dentro/fora) │
│ Probabilístico (EAI)│ ✅ Sim (multi-RP)      │ ❌ Determinístico        │
│ Projeção futura     │ ✅ Sim (SSP2/5)        │ ❌ Apenas histórico      │
│ Microdata setorial  │ ❌ Apenas agregado ADM │ ✅ Sim (CNPJ, INEP, CNES)│
│ Custo legal (educ.) │ ❌ Não                 │ ✅ Sim (FUNDEB VAAT-MIN) │
│ Produção saúde SUS  │ ❌ Não                 │ ✅ Sim (SIA+SIH DataSUS) │
│ Fenologia agrícola  │ ❌ Não                 │ ✅ Sim (maio/set, R$/ha) │
│ Curva de recuperação│ ❌ Não                 │ ✅ Sim (DaLA agudo+recup)│
│ Dados BR-específicos│ ❌ Globais apenas      │ ✅ RAIS, Censo, DataSUS  │
└─────────────────────┴────────────────────────┴──────────────────────────┘
```

**Conclusão:** As duas metodologias são **complementares, não concorrentes**. O CCDR-Tools
cobre destruição de ativos, probabilística e projeção futura; o pipeline DaLA-BID cobre
perdas operacionais setoriais com granularidade de microdados brasileiros. A integração
prioritária é a adoção das **curvas de dano por profundidade (LAC, Huizinga 2017)** do
CCDR para modular o fator de interrupção atual (hoje binário) em função da profundidade
d'água nos pontos afetados.

---

## Referências

- Huizinga, J., De Moel, H., Szewczyk, W. (2017). *Global flood depth-damage functions:
  Methodology and the database*. EU-JRC. https://publications.jrc.ec.europa.eu/repository/handle/JRC105688
- Jonkman, S.N. (2008). *Loss of life due to floods*. Journal of Flood Risk Management.
  https://doi.org/10.1111/j.1753-318X.2008.00006.x
- Eberenz, S. et al. (2021). *Regional tropical cyclone impact functions for globally
  consistent risk assessments*. NHESS. https://nhess.copernicus.org/articles/21/393/2021/
- CEPAL/BID (2024). *Avaliação dos efeitos e impactos das inundações no Rio Grande do Sul*.
  Novembro 2024.
- World Bank CCDR-Tools: https://github.com/GFDRR/CCDR-tools (GPL-3.0)
