"""
04_agricultura.py -- Extrai uso do solo agricola do MapBiomas Collection 10.1.

Baixa o GeoTIFF de cobertura do Brasil (2024), recorta por municipio usando
limites IBGE (geobr), conta pixels por classe de cultura e gera:
  - CSV com area (ha) por municipio x cultura
  - GeoJSON com poligonos das areas agricolas por municipio
"""

import argparse
import gc
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
import requests
from rasterio.features import shapes as rasterio_shapes, sieve as rasterio_sieve
from rasterio.mask import mask as rasterio_mask
from shapely.geometry import shape as shapely_shape
from shapely.ops import unary_union

from config import (
    DATA_BASES,
    DATA_RAW,
    DATA_RAW_MAPBIOMAS,
    MAPBIOMAS_ANOS,
    MAPBIOMAS_CLASSES,
    MAPBIOMAS_TIFF_BASE,
    MUNICIPIOS,
)
from common import clean_polygon_geom


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download_geotiff(year: int) -> Path:
    """Baixa o GeoTIFF do MapBiomas para um ano se nao existir localmente."""
    DATA_RAW_MAPBIOMAS.mkdir(parents=True, exist_ok=True)
    url = MAPBIOMAS_TIFF_BASE.format(year=year)
    fname = url.split("/")[-1]
    local_path = DATA_RAW_MAPBIOMAS / fname

    if local_path.exists():
        print(f"  Cache: {fname} ({local_path.stat().st_size / 1024 / 1024:.0f} MB)")
        return local_path

    print(f"  Baixando {fname} (~765 MB)...")
    r = requests.get(url, stream=True, timeout=30)
    r.raise_for_status()
    total = int(r.headers.get("Content-Length", 0))
    downloaded = 0
    with open(local_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8 * 1024 * 1024):
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                pct = downloaded / total * 100
                print(f"    {pct:.0f}% ({downloaded / 1024 / 1024:.0f} MB)", end="\r")
    print(f"  Baixado: {local_path.stat().st_size / 1024 / 1024:.0f} MB")
    return local_path


# ---------------------------------------------------------------------------
# Limites municipais
# ---------------------------------------------------------------------------

def get_municipio_geom(ibge7: int) -> gpd.GeoDataFrame:
    """Obtem geometria do municipio via geobr, com fallback para o GeoJSON
    IBGE ja commitado em data/raw/ibge quando o pacote geobr nao esta
    disponivel no ambiente (mesmo fallback usado em 06_geojson.py:make_limite)."""
    try:
        import geobr
        return geobr.read_municipality(code_muni=ibge7, year=2022)
    except ImportError:
        local_path = DATA_RAW / "ibge" / f"{ibge7}.geojson"
        if not local_path.exists():
            raise
        gdf = gpd.read_file(local_path)
        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        return gdf.to_crs(epsg=4326)


# ---------------------------------------------------------------------------
# Processamento raster
# ---------------------------------------------------------------------------

# Despeckle antes de vetorizar (ver rasterio.features.sieve): remove/funde grupos
# de pixels conectados menores que este limiar (mesmo criterio pra "ilhas" de uma
# classe cercadas por outra e pra "buracos" de outra classe cercados por uma area
# maior -- os dois sao o mesmo tipo de ruido de classificacao pixel-a-pixel do
# MapBiomas). Auditoria em Porto Alegre encontrou 56% dos poligonos com area
# menor que ~1,4 pixel (fragmentos de 1 pixel isolado) e 48 buracos internos em
# 10 poligonos, todos de 1-2 pixels -- 4 pixels (~0,36 ha) elimina esse ruido sem
# descartar manchas agricolas pequenas mas reais.
SIEVE_MIN_PIXELS = 4


def compute_pixel_area_ha(transform, shape):
    """Calcula area de um pixel em hectares usando a latitude central da janela recortada."""
    nrows, ncols = shape
    # Coordenadas do centro da janela recortada (geografico)
    lat_center = transform.f + transform.e * (nrows / 2)
    if abs(lat_center) > 90:  # sanity check
        lat_center = -15.0
    m_per_deg_lon = 111320 * math.cos(math.radians(lat_center))
    m_per_deg_lat = 111320
    pixel_area_m2 = abs(transform.a * m_per_deg_lon * transform.e * m_per_deg_lat)
    return pixel_area_m2 / 10000


def process_municipio(tiff_path: Path, nome: str, cfg: dict, ano: int) -> tuple:
    """Recorta raster pelo municipio, conta areas e gera GeoJSON."""
    ibge7 = cfg["ibge7"]
    slug = cfg["slug"]
    print(f"\n  {nome} ({ano}):")

    mun_gdf = get_municipio_geom(ibge7)
    mun_area_km2 = mun_gdf.to_crs(epsg=32722).geometry.area.sum() / 1e6
    mun_area_ha = mun_area_km2 * 100
    print(f"    Area municipal: {mun_area_ha:,.0f} ha")

    with rasterio.open(tiff_path) as src:
        mun_reproj = mun_gdf.to_crs(src.crs)
        geoms = mun_reproj.geometry.values

        try:
            out_image, out_transform = rasterio_mask(src, geoms, crop=True, nodata=0)
        except Exception as e:
            print(f"    ERRO ao recortar: {e}")
            return pd.DataFrame(), None

        data = out_image[0]
        pixel_ha = compute_pixel_area_ha(out_transform, data.shape)
        print(f"    Pixel: {pixel_ha:.4f} ha ({math.sqrt(pixel_ha * 10000):.0f} m)")

    # --- Estatisticas ---
    stats_rows = []
    class_ids = set(MAPBIOMAS_CLASSES.keys())
    for class_id, cultura in MAPBIOMAS_CLASSES.items():
        n_pixels = int(np.sum(data == class_id))
        if n_pixels > 0:
            area_ha = round(n_pixels * pixel_ha, 2)
            existing = next((r for r in stats_rows if r["cultura"] == cultura), None)
            if existing:
                existing["area_ha"] += area_ha
            else:
                stats_rows.append({"municipio": nome, "ano": ano, "cultura": cultura, "area_ha": area_ha})

    for row in stats_rows:
        row["area_ha"] = round(row["area_ha"], 2)
        row["area_pct"] = round(row["area_ha"] / mun_area_ha * 100, 2) if mun_area_ha > 0 else 0
        print(f"    {row['cultura']}: {row['area_ha']:,.1f} ha ({row['area_pct']:.1f}%)")

    # --- GeoJSON (vetorizacao) ---
    mask_agri = np.isin(data, list(class_ids))

    # Remapeia classe MapBiomas bruta -> codigo de CULTURA consolidada (ex.: Arroz
    # = classes 20 e 40 -- ver MAPBIOMAS_CLASSES) ANTES de vetorizar, para que
    # pixels vizinhos da mesma cultura (mas classe bruta diferente) virem uma unica
    # regiao continua, em vez de dois poligonos separados que so' compartilham o
    # rotulo de exibicao (a causa da maior parte dos "cortes" entre vizinhos
    # observados antes desta correcao -- ver pipeline/docs, auditoria de poligonos
    # de agricultura).
    culturas_unicas = sorted(set(MAPBIOMAS_CLASSES.values()))
    cultura_por_codigo = dict(enumerate(culturas_unicas, start=1))
    codigo_por_cultura = {c: k for k, c in cultura_por_codigo.items()}
    data_cultura = np.zeros_like(data, dtype=np.int16)
    for class_id, cultura in MAPBIOMAS_CLASSES.items():
        data_cultura[data == class_id] = codigo_por_cultura[cultura]

    features = []
    if mask_agri.any():
        # Despeckle (ver SIEVE_MIN_PIXELS): remove ruido de 1-2 pixels antes de
        # vetorizar -- tanto fragmentos soltos quanto buracos internos.
        data_cultura = rasterio_sieve(data_cultura, size=SIEVE_MIN_PIXELS, connectivity=8)

        # Vetoriza direto por codigo de cultura (mask exclui o fundo/codigo 0) e
        # agrupa os fragmentos por cultura -- cada fragmento ainda sai como um
        # poligono por pixel-conectado do rasterio.features.shapes, sem tocar a
        # borda compartilhada com o vizinho da MESMA cultura.
        fragmentos_por_cultura: dict[str, list] = {}
        for geom_dict, value in rasterio_shapes(data_cultura, mask=(data_cultura != 0), transform=out_transform):
            codigo = int(value)
            if codigo == 0:
                continue
            poly = shapely_shape(geom_dict)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue
            fragmentos_por_cultura.setdefault(cultura_por_codigo[codigo], []).append(poly)

        # Dissolve (une) os fragmentos de cada cultura ANTES de simplificar --
        # simplificar cada fragmento isoladamente (como antes) quebra a borda
        # compartilhada entre vizinhos, deixando gaps/overlaps de sub-pixel que
        # aparecem como falhas/serrilhado entre poligonos adjacentes da mesma
        # cultura. Unir primeiro elimina essas bordas internas -- so' sobra o
        # contorno externo real da mancha agricola, simplificado uma unica vez.
        for cultura, polys in fragmentos_por_cultura.items():
            merged = unary_union(polys)
            merged = merged.simplify(tolerance=0.0005, preserve_topology=True)
            # simplify() com preserve_topology=True ainda pode devolver uma
            # geometria invalida (auto-intersecao) ou com buracos internos
            # enormes (>50% da area) quando une centenas de fragmentos pixel-
            # a-pixel -- sintoma de topologia quebrada, nao enclave real de
            # uso do solo. Corrige antes de gravar (ver auditoria de poligonos).
            merged = clean_polygon_geom(merged, max_hole_ratio=0.5)
            if merged.is_empty:
                continue
            geoms_finais = list(merged.geoms) if merged.geom_type == "MultiPolygon" else [merged]
            for g in geoms_finais:
                if g.is_empty:
                    continue
                features.append({
                    "type": "Feature",
                    "geometry": g.__geo_interface__,
                    "properties": {"cultura": cultura},
                })

    geojson = {"type": "FeatureCollection", "features": features}
    print(f"    GeoJSON: {len(features):,} features")

    del data, data_cultura, mask_agri, out_image
    gc.collect()

    return pd.DataFrame(stats_rows), geojson


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Extrai uso do solo agricola (MapBiomas)")
    parser.add_argument("--mun", type=str, default=None, help="Nome do municipio")
    args = parser.parse_args()

    if args.mun:
        if args.mun not in MUNICIPIOS:
            print(f"Municipio '{args.mun}' nao encontrado. Disponiveis: {list(MUNICIPIOS.keys())}")
            sys.exit(1)
        targets = {args.mun: MUNICIPIOS[args.mun]}
    else:
        targets = MUNICIPIOS

    # ==================================================================
    # ETAPA 1: Download GeoTIFFs
    # ==================================================================
    print("=" * 60)
    print(f"  ETAPA 1: GeoTIFFs MapBiomas {MAPBIOMAS_ANOS}")
    print("=" * 60)
    tiff_paths = {}
    for ano in MAPBIOMAS_ANOS:
        tiff_paths[ano] = download_geotiff(ano)

    # ==================================================================
    # ETAPA 2: Processar municipios x anos
    # ==================================================================
    print(f"\n{'='*60}")
    print("  ETAPA 2: Recorte e contagem por municipio x ano")
    print("=" * 60)

    all_stats = []
    geojsons = {}

    for ano, tiff_path in tiff_paths.items():
        print(f"\n  --- {ano} ---")
        for nome, cfg in targets.items():
            stats_df, geojson = process_municipio(tiff_path, nome, cfg, ano)
            if not stats_df.empty:
                all_stats.append(stats_df)
            if geojson and geojson["features"]:
                geojsons[f"{cfg['slug']}_{ano}"] = geojson

    # ==================================================================
    # ETAPA 3: Salvar
    # ==================================================================
    print(f"\n{'='*60}")
    print("  ETAPA 3: Salvar bases")
    print("=" * 60)

    DATA_BASES.mkdir(parents=True, exist_ok=True)

    if all_stats:
        df_stats = pd.concat(all_stats, ignore_index=True)
        path_csv = DATA_BASES / "agricultura.csv"
        df_stats.to_csv(path_csv, index=False, encoding="utf-8-sig")
        print(f"  agricultura.csv: {len(df_stats):,} linhas -> {path_csv}")
    else:
        print("  AVISO: nenhum dado agricola encontrado")

    for key, gj in geojsons.items():
        path_gj = DATA_BASES / f"agricultura_{key}.geojson"
        with open(path_gj, "w", encoding="utf-8") as f:
            json.dump(gj, f, ensure_ascii=False)
        print(f"  agricultura_{key}.geojson: {len(gj['features']):,} features -> {path_gj}")

    # ==================================================================
    # Resumo
    # ==================================================================
    print(f"\n{'='*60}")
    print("  RESUMO")
    print("=" * 60)
    if all_stats:
        for ano in MAPBIOMAS_ANOS:
            print(f"\n  {ano}:")
            for nome in targets:
                sub = df_stats[(df_stats["municipio"] == nome) & (df_stats["ano"] == ano)]
                total_ha = sub["area_ha"].sum()
                culturas = ", ".join(f"{r['cultura']}={r['area_ha']:,.0f}ha" for _, r in sub.iterrows())
                print(f"    {nome}: {total_ha:,.0f} ha | {culturas}")


if __name__ == "__main__":
    main()
