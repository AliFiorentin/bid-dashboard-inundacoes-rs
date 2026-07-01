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
from rasterio.features import shapes as rasterio_shapes
from rasterio.mask import mask as rasterio_mask
from shapely.geometry import shape as shapely_shape

from config import (
    DATA_BASES,
    DATA_RAW_MAPBIOMAS,
    MAPBIOMAS_ANOS,
    MAPBIOMAS_CLASSES,
    MAPBIOMAS_TIFF_BASE,
    MUNICIPIOS,
)


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
    """Obtem geometria do municipio via geobr."""
    import geobr
    gdf = geobr.read_municipality(code_muni=ibge7, year=2022)
    return gdf


# ---------------------------------------------------------------------------
# Processamento raster
# ---------------------------------------------------------------------------

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
    data_filtered = np.where(mask_agri, data, 0).astype(np.int16)

    features = []
    if mask_agri.any():
        for geom_dict, value in rasterio_shapes(data_filtered, transform=out_transform):
            if value == 0:
                continue
            cultura = MAPBIOMAS_CLASSES.get(int(value), "Outros")
            poly = shapely_shape(geom_dict)
            poly = poly.simplify(tolerance=0.0005, preserve_topology=True)
            if poly.is_empty:
                continue
            features.append({
                "type": "Feature",
                "geometry": poly.__geo_interface__,
                "properties": {
                    "cultura": cultura,
                    "classe_id": int(value),
                },
            })

    geojson = {"type": "FeatureCollection", "features": features}
    print(f"    GeoJSON: {len(features):,} features")

    del data, data_filtered, mask_agri, out_image
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
