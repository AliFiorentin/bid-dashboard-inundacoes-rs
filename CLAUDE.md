# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Python data pipeline that quantifies flood impact across 4 municipalities in Rio Grande do Sul (Eldorado do Sul, Lajeado, Porto Alegre, Rio Grande) for an IDB (BID) project. It ingests employment, education, health, and agriculture microdata, geocodes establishments, intersects them with flood extent polygons, and computes operational damage estimates. (Asset exposure/CLIMADA valuation is being rebuilt as a separate script — not currently part of the pipeline.)

## Running the Pipeline

Core scripts run sequentially from the repo root — each step depends on outputs from prior steps:

```bash
python pipeline/01_rais.py              # RAIS formal employment
python pipeline/02_educacao.py           # Censo Escolar (education)
python pipeline/03_saude.py              # CNES health facilities + staff
python pipeline/04_agricultura.py        # MapBiomas/CONAB agriculture stats
python pipeline/05_geocodificar.py       # Geocode addresses via local Nominatim
python pipeline/06_geojson.py            # CSV/agricultura → GeoJSON (BASE + ATINGIDOS), copied into the Dashboard
python pipeline/07_danos.py              # Operational damages
```

All scripts accept `--mun "Municipality Name"` to process a single municipality. Script 07 also takes `--dias N` (interruption days, default 30).

Two supplementary scripts are not part of the dependency chain and can run independently once 01–07 have produced their outputs:

```bash
python pipeline/08_icms_validacao.py    # Cross-checks VAB-loss estimate (07) against observed ICMS shortfall
python pipeline/09_populacao.py         # WorldPop-derived exposed-population KPIs + density heatmap PNGs
```

Validation/QA tooling lives in `pipeline/validation/` (`check_bases.py`, `check_geojson.py`) and is run ad hoc, not as part of the numbered sequence; `check_logic.md` there records the methodology review findings per script. Narrative methodology docs live in `pipeline/docs/` (`07_danos_metodologia.md`, `comparativo_ccdr_dala.md`).


Further scripts (also independent of the 01–07 chain):

```bash
python pipeline/10_infra_stats.py       # infraestrutura_stats.json + infraestrutura_painel.json per municipality (Painel metrics for BASE and each scenario; lets the Dashboard skip downloading ~640 MB of infra GeoJSON)
python pipeline/11_area_atingida.py     # municipal area + flooded area per scenario -> area_atingida.json
```

**"Todas as cotas" scenario (Lajeado, Eldorado do Sul, Porto Alegre)** — river-level (cota) rasters feed an animated map + slider in the Dashboard. Run in this order (they need the depth rasters, see below):

```bash
python pipeline/climada_cota.py          # physical damage per cota (CLIMADA methodology) -> climada_cota_{slug}.json
python pipeline/climada_cota_detalhe.py  # per-category indicators per cota -> climada_cota_detalhe_{slug}.json
python pipeline/climada_cota_mapa.py     # (regenerating it resets cota_mapa.json: re-run 10_infra_stats.py afterwards, it adds area_por_cota_km2) cota_mapa.webp (first-wet cota index per pixel) + cota_mapa.json (incl. WorldPop population per cota)
python pipeline/climada_rp_por_cota.py   # RP -> cota conversion (RP views); climada_exposicao.py = exposure without damage curve
```

Tests: `python -m pytest pipeline/tests` (pure functions of `common.py`, `config.py` consistency and the contract of the committed Dashboard outputs; no raw data needed). CI: `.github/workflows/pipeline.yml`.

External sources are configurable by environment variable (defaults = original machine paths): `BID_RAIS_PARQUET`, `BID_RAIS_ESTAB_PARQUET`, `BID_CENSO_ESCOLAR_DIR`, `BID_RASTERS_DIR` (folder containing `Lajeado_WGS84/` and `POA_WGS84/`; default `~/Downloads`), `BID_ICMS_DIR` (SEFAZ-RS CSVs; default `~/Downloads`). See `pipeline/config.py`.

Python dependencies: `pip install -r pipeline/requirements.txt` (`geobr` and `openpyxl` are unpinned).

**Depth rasters:** `Downloads/Lajeado_WGS84/Profundidade_WGS84/*_clip.tif` and `Downloads/POA_WGS84/Profundidade_WGS84/*_clip.tif` (~1.3 GB each for POA) are NOT in the repo. Archives: `G:\Meu Drive\Projetos\BID\Lajeado_WGS84.rar` and `POA_WGS84.rar` (extract with `tar -xf <rar> -C Downloads <Pasta>/Profundidade_WGS84`). Regenerating `cota_mapa.webp` from them reproduces the committed image exactly (checked 2026-10-23).

## Architecture

`pipeline/config.py` is the single source of truth for all paths, IBGE codes, flood scenarios, salary tables, CNAE mappings, and domain constants. `pipeline/common.py` provides shared utilities (coordinate validation, CNPJ formatting, Brazilian numeric parsing, GeoJSON conversion, point-in-polygon intersection via Shapely/GeoPandas). Every pipeline script does `sys.path.insert(0, str(Path(__file__).parent))` then `from config import ...` / `from common import ...` — both modules live alongside the numbered scripts in `pipeline/`, not at the repo root.

**Paths:** `BASE` is derived from the location of `config.py` (works anywhere). Only the external sources (RAIS, Censo Escolar, depth rasters, ICMS CSVs) live outside the repo; see the environment variables listed under "Further scripts".

Data flows through three directory tiers defined in `config.py`:
- `data/raw/` — geocoded Excel/CSV inputs, CNES CSVs, flood shapefiles (not generated by pipeline)
- `data/interim/` — cached lookups (e.g. `cnpj_lookup.parquet`)
- `data/processed/` — per-municipality CSVs and result JSONs

Script 06 writes directly to `Dashboard BID/public/dados_convertidos/{slug}/` (the `DASH_DATA` path) — it's the single point where the pipeline organizes everything the companion dashboard consumes: `{setor}_BASE.geojson` for empresas/educacao/saude, `agricultura_{ano}_BASE.geojson` + `agricultura_stats.json` for agricultura, and `cenarios/{setor}_ATINGIDOS_{cen_slug}.geojson` per flood scenario. For point layers (empresas/educacao/saude) this is a point-in-polygon test against `MANCHAS`; for agricultura (polygon layer) it's a geometric clip via `common.intersect_polygons_with_mancha`, picking the MapBiomas year through `config.PERIODO_ANO` (`CENARIO_PERIODO` label → year).

## External Data Dependencies

These paths are hardcoded in `config.py` and must exist locally:
- **RAIS 2023 Parquet**: `D:/RAIS/data/rais_db/vinculos/ano=2023/uf=43/RAIS_VINC_ID_SUL.parquet`
- **Censo Escolar 2024**: `D:/Censo Escolar 2024 - Microdados/dados/microdados_ed_basica_2024.csv` (~5 GB, read in chunks)
- **CNES establishment CSV**: `data/raw/cnes/tbEstabelecimento202404.csv`
- **Flood extent shapefiles**: `data/raw/manchas/{slug}/*.shp` (one per scenario)
- **Geocoded coordinates**: `data/raw/geocodificacao/{slug}.xlsx` (CNPJ→lat/lon), `data/raw/escolas/{slug}.csv`, `data/raw/saude/{slug}.csv`

## Key Domain Concepts

- **Cenário (scenario)**: each municipality has 1–3 flood scenarios (e.g. "Cenario ADA", "Cenario 27m"); the slug format is `{mun_slug}___{cenario_slug}`
- **BASE vs ATINGIDOS**: BASE GeoJSONs contain all geocoded points/polygons; ATINGIDOS are the subset inside the flood polygon — point-in-polygon for empresas/educacao/saude, geometric clip (smoothed, degenerate fragments dropped) for agricultura
- **Empresas**: each feature carries `qtd_vinculos` (employee count), `massa_salarial` (sum of salaries) and `salario_medio` (average salary) per estabelecimento — computed once in `06_geojson.py` from `estabelecimentos.csv`, inherited automatically by `empresas_ATINGIDOS_*` since ATINGIDOS is just a spatial filter of BASE
- **Operational damage**: VAB loss (firms, via labor share inversion), FUNDEB reposition cost (education), SUS production loss (health)
- **CBO classification**: health professionals are bucketed into 11 `staff_*` categories by 4-digit CBO code (Brazilian Occupation Classification)
- **ICMS validation (08)**: sanity-checks the 07 VAB-loss estimate against real tax data — compares observed ICMS revenue in the flood month/aftermath to a 2021–2023 (COVID-excluded) baseline, using a fixed effective ICMS-to-GDP rate for RS to back into an independent damage figure
- **Population exposure (09)**: independent of the empresas/educacao/saude/agricultura layers — clips a WorldPop raster (not RAIS/Censo/CNES/MapBiomas) against IBGE municipal boundaries and flood polygons to get exposed-population counts and a density heatmap PNG per municipality; writes to `populacao_atingida.json` and `{slug}/populacao.webp` in `DASH_DATA`, merging into any existing JSON rather than overwriting it (so partial `--mun` runs don't clobber other municipalities)

## Conventions

- Brazilian CSV locale: `;` separator, `,` decimal, `utf-8-sig` encoding. Use `common.limpar_numerico()` for numeric conversion.
- CNPJ is zero-padded to 14 digits via `common.zfill_cnpj()`.
- Municipality identity uses both 7-digit (`ibge7`) and 6-digit (`ibge6`) IBGE codes — scripts match on the one appropriate to each data source.
- Coordinate validation filters to RS bounding box (lat -34 to -27, lon -58 to -49) and excludes (0,0).
