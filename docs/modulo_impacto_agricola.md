# Módulo de Impacto Agrícola — Como foi feito

Guia de referência para replicar em outros dashboards.

---

## Visão geral da arquitetura

```
TIF MapaBiomas          CONAB Shapefiles
      │                       │
      ▼                       ▼
converter_agricultura.py   converter_conab.py
      │                       │
      ▼                       ▼
agricultura_BASE.png        conab_stats_{cenSlug}.json
agricultura_raster_{cen}.png
agricultura_stats_BASE.json
agricultura_stats_{cenSlug}.json
      │                       │
      └───────────┬───────────┘
                  ▼
           page.tsx (frontend)
           aba Agricultura + Impacto Monetário
```

---

## Etapa 1 — Converter TIF MapaBiomas → PNG + stats JSON

**Script:** `scripts/converter_agricultura.py`

### O que faz
1. Lê TIF MapaBiomas Coleção 10 de cada município
2. Mapeia pixels por código de classe → RGBA (com opacidade)
3. Gera `agricultura_BASE.png` (mapa completo do município)
4. Para cada cenário: aplica máscara do GeoJSON da mancha → PNG recortado
5. Calcula área em hectares por cultura e salva JSONs de stats

### Classes MapaBiomas usadas
| Código | Cultura | Cor (RGB) |
|--------|---------|-----------|
| 39 | Soja | (212, 160, 23) — amarelo |
| 40 | Arroz | (79, 195, 247) — azul claro |
| 41 | Outras Lavouras Temporárias | (174, 213, 129) — verde claro |

> **Classe 41** captura Trigo, Aveia, Canola, Milho e demais lavouras temporárias — importante para culturas de inverno que o CONAB não cobre em dados recentes.

### Cálculo de área
Converte degrees → metros usando latitude central:
```python
m_lon = 111320 * math.cos(math.radians(center_lat))
m_lat = 111320
pixel_ha = (pw * m_lon * ph * m_lat) / 10000
```

### Saída por município
```
public/dados_convertidos/{munSlug}/
  agricultura.tif
  agricultura_BASE.png
  agricultura_stats_BASE.json
  cenarios/
    agricultura_raster_{cenSlug}.png
    agricultura_stats_{cenSlug}.json
```

---

## Etapa 2 — Clicar dados CONAB às manchas

**Script:** `scripts/converter_conab.py`

### O que faz
1. Carrega shapefiles CONAB de Soja e Arroz para o RS
2. Para cada mancha de inundação, clipa os polígonos CONAB
3. Recalcula área em ha via UTM (EPSG:32722) para precisão métrica
4. Salva `conab_stats_{cenSlug}.json` com área por cultivo

### Dados CONAB disponíveis para RS
| Cultura | Safras disponíveis | Download |
|---------|--------------------|---------|
| Soja | 2022-2023, 2024-2025 | `/downloads/mapas/soja/RS/RS_SOJA_2223.zip` |
| Arroz Irrigado | 2022-2023, 2023-2024, 2024-2025 | `/downloads/mapas/Arroz_Irrigado/RS/` |
| Milho 1ª Safra | 2024-2025 | `/downloads/mapas/MILHO_1_Safra/RS/` |
| Culturas de Inverno | até 2015 (**desatualizado**) | `/downloads/mapas/Culturas_de_Inverno/RS/` |

> **Soja 2023-2024 não existe no CONAB** — usa-se 2022-2023 como proxy (padrão de área estável).

### Lógica de safra por período de enchente
```python
CENARIO_PERIODO = {
    "lajeado___cenario_27m":              "maio_2024",
    "rio_grande___cenario_setembro_2023": "setembro_2023",
    # ...
}
# maio_2024  → Soja 2022-2023 (proxy) + Arroz 2023-2024
# setembro_2023 → Soja 2022-2023 + Arroz 2022-2023
```

### Saída
```
public/dados_convertidos/{munSlug}/cenarios/
  conab_stats_{cenSlug}.json
```
```json
{
  "periodo": "maio_2024",
  "soja":  { "area_ha": 746.65, "safra": "2022-2023", "fonte": "CONAB" },
  "arroz": { "area_ha": 7357.15, "safra": "2023-2024", "fonte": "CONAB" }
}
```

---

## Etapa 3 — Frontend (page.tsx)

### Constantes necessárias

```typescript
// Cores por cultura (devem bater com as do Python)
const AGRI_COLORS: Record<string, string> = {
  "Soja":                        "#D4A017",
  "Arroz":                       "#4FC3F7",
  "Outras Lavouras Temporárias": "#AED581",
};

// Coordenadas da imagem raster: [NW, NE, SE, SW] — lon, lat
const AGRI_BOUNDS: Record<string, [[number,number],[number,number],[number,number],[number,number]]> = {
  "Municipio": [[-lon_W, lat_N], [-lon_E, lat_N], [-lon_E, lat_S], [-lon_W, lat_S]],
  // ...
};
// Obter os bounds rodando converter_agricultura.py — ele imprime o bloco pronto no final.

// Período de cada cenário → define fase agrícola
const CENARIO_PERIODO: Record<string, string> = {
  "mun___cenario_x": "maio_2024",
  "mun___cenario_y": "setembro_2023",
};

// Coeficientes de impacto R$/ha por cultura × período
const IMPACTO_AGRICOLA: Record<string, Record<string, { coef: number; status: string; nota: string }>> = {
  "maio_2024": {
    "Soja":                        { coef: 1100, status: "Colhida (fev–abr)", nota: "..." },
    "Arroz":                       { coef: 1100, status: "Colhido (fev–abr)", nota: "..." },
    "Outras Lavouras Temporárias": { coef: 1400, status: "Plantio inicial (mai–jun)", nota: "..." },
  },
  "setembro_2023": {
    "Soja":                        { coef: 250,  status: "Pré-plantio", nota: "..." },
    "Arroz":                       { coef: 250,  status: "Pré-plantio", nota: "..." },
    "Outras Lavouras Temporárias": { coef: 2800, status: "Colheita (set–out)", nota: "..." },
  },
};
```

### State necessário

```typescript
const [baseAgriStats,     setBaseAgriStats]     = useState<Record<string,number> | null>(null);
const [atingidosAgriStats, setAtingidosAgriStats] = useState<Record<string,number> | null>(null);
const [conabStats, setConabStats] = useState<{
  soja: { area_ha: number }; arroz: { area_ha: number }
} | null>(null);
```

### Fetches nos useEffects

```typescript
// No useEffect [municipio]: reset
setBaseAgriStats(null); setAtingidosAgriStats(null); setConabStats(null);

// Fetch BASE
if (AGRI_BOUNDS[municipio]) {
  fetch(`/dados_convertidos/${munSlug}/agricultura_stats_BASE.json`, { signal })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (!signal.aborted) setBaseAgriStats(d); });
}

// No useEffect [municipio, cenario]: reset
setAtingidosAgriStats(null); setConabStats(null);

// Fetch cenário
if (AGRI_BOUNDS[municipio]) {
  fetch(`/dados_convertidos/${munSlug}/cenarios/agricultura_stats_${sSlug}.json`, { signal })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (!signal.aborted) setAtingidosAgriStats(d); });

  fetch(`/dados_convertidos/${munSlug}/cenarios/conab_stats_${sSlug}.json`, { signal })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (!signal.aborted) setConabStats(d); });
}
```

### Camada raster no mapa

```tsx
{camadas.includes("Agricultura") && !isVisaoGeral && AGRI_BOUNDS[municipio] && (() => {
  const munSlug = slugify(municipio);
  const agriUrl = isCenarioAtivo
    ? `/dados_convertidos/${munSlug}/cenarios/agricultura_raster_${scenarioSlug(municipio, cenario)}.png`
    : `/dados_convertidos/${munSlug}/agricultura_BASE.png`;
  return (
    <Source key={`agri-${agriUrl}`} id="agricultura-raster" type="image"
      url={agriUrl} coordinates={AGRI_BOUNDS[municipio]}>
      <Layer id="agricultura-raster-layer" type="raster"
        paint={{ "raster-opacity": 0.82 }}
        beforeId={/* id de uma layer já existente para z-order */undefined} />
    </Source>
  );
})()}
```

### Lógica de área com prioridade CONAB > MapaBiomas

```typescript
const areaImpacto: Record<string, { ha: number; fonte: string }> = {};
if (isCenarioAtivo && coefs) {
  Object.keys(coefs).forEach(nome => {
    let ha = atingidosAgriStats?.[nome] ?? 0;
    let fonte = "MapaBiomas";
    if (nome === "Soja"  && conabStats?.soja.area_ha  > 0) { ha = conabStats.soja.area_ha;  fonte = "CONAB"; }
    if (nome === "Arroz" && conabStats?.arroz.area_ha > 0) { ha = conabStats.arroz.area_ha; fonte = "CONAB"; }
    if (ha > 0) areaImpacto[nome] = { ha, fonte };
  });
}
const impactoTotal = Object.entries(areaImpacto)
  .reduce((sum, [nome, { ha }]) => sum + ha * (coefs?.[nome]?.coef ?? 0), 0);
```

---

## Calendário agrícola RS (referência para novos períodos)

| Cultura | Plantio | Colheita | Status em mai/2024 | Status em set/2023 |
|---------|---------|----------|--------------------|--------------------|
| Soja | out–nov | fev–abr | **Colhida** | Pré-plantio |
| Arroz Irrigado | out–nov | fev–abr | **Colhido** | Pré-plantio |
| Trigo / Aveia | mai–jun | set–out | **Plantio inicial** | **Na colheita** |
| Canola | mai–jun | out–nov | **Plantio inicial** | Crescimento |
| Milho 1ª Safra | set–out | jan–mar | Colhido | Plantio/germinar |

---

## Coeficientes de impacto usados — base metodológica

Fontes: EMATER-RS (custos de produção), CONAB Preços Mínimos 2024.

| Situação da cultura | Lógica | Coef. usado |
|---------------------|--------|------------|
| **Colhida** — dano ao solo | Compactação + remediation para próxima safra (~20–25% do custo de produção) | R$ 1.100/ha |
| **Plantio inicial** — trigo/aveia | Sementes + preparo + 1ª adubação perdidos; cultura ainda não estabelecida | R$ 1.400/ha |
| **Pré-plantio** | Solo em preparo; impacto mínimo | R$ 250/ha |
| **Na colheita** — trigo/aveia | Safra completa perdida: receita bruta – custo já investido ≈ R$ 2.800/ha | R$ 2.800/ha |

> Esses valores são **estimativas de custo direto**. Não incluem: lucro cessante, custos de limpeza pós-enchente, depreciação de máquinas/equipamentos, impacto em armazéns/silos.

---

## Para adicionar um novo município

1. **Baixar TIF MapaBiomas** do município no site mapbiomas.org
2. **Adicionar ao `TIFS_SRC`** em `converter_agricultura.py` e rodar o script
3. **Baixar shapefiles CONAB** relevantes (se ainda não tiver) e rodar `converter_conab.py`
4. **No `page.tsx`**, atualizar:
   - `AGRI_BOUNDS` com as coordenadas impressas pelo script
   - `CENARIO_PERIODO` com os slugs dos novos cenários e o período correspondente
5. Garantir que os GeoJSONs das manchas já estejam em `cenarios/` antes de rodar os scripts
