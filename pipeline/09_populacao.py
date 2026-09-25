"""
09_populacao.py -- Extrai populacao exposta por cenario e gera PNGs de densidade.

Fonte: WorldPop 2024 Constrained (CN) 100m - bra_pop_2024_CN_100m_R2025A_v1.tif
Limites municipais: IBGE API v3 (cache em data/raw/ibge/)

Saidas (por municipio):
  Dashboard BID/public/dados_convertidos/{slug}/populacao.png      -- heatmap RGBA
  Dashboard BID/public/dados_convertidos/populacao_atingida.json   -- KPIs e bbox

Uso:
  python pipeline/09_populacao.py
  python pipeline/09_populacao.py --mun "Lajeado"

Dependencias (alem do pipeline padrao):
  pip install rasterio matplotlib Pillow requests
"""

import argparse
import io
import json
import sys
from pathlib import Path

import numpy as np
import requests
import geopandas as gpd
import rasterio
from rasterio.mask import mask as rio_mask
from rasterio.warp import transform_bounds

import matplotlib
matplotlib.use("Agg")
import matplotlib.cm as cm
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from config import BASE, MUNICIPIOS, MANCHAS, DASH_DATA

TIFF_PATH = BASE / "data" / "raw" / "bra_pop_2024_CN_100m_R2025A_v1.tif"
IBGE_CACHE = BASE / "data" / "raw" / "ibge"
IBGE_CACHE.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_ibge_boundary(ibge7: int) -> gpd.GeoDataFrame:
    cache = IBGE_CACHE / f"{ibge7}.geojson"
    if cache.exists():
        return gpd.read_file(cache)
    url = (
        f"https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{ibge7}"
        "?formato=application/vnd.geo+json"
    )
    print(f"  Baixando limite IBGE {ibge7}...")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    cache.write_text(resp.text, encoding="utf-8")
    return gpd.read_file(io.StringIO(resp.text))


def shapes_in_crs(gdf: gpd.GeoDataFrame, target_crs) -> list:
    if str(gdf.crs).upper() != str(target_crs).upper():
        gdf = gdf.to_crs(target_crs)
    return [geom.__geo_interface__ for geom in gdf.geometry]


def clip_sum(src: rasterio.DatasetReader, shapes: list, nodata) -> float:
    """Clip raster to shapes and sum positive pixel values."""
    try:
        arr, _ = rio_mask(src, shapes, crop=True, nodata=nodata if nodata is not None else -9999, all_touched=False)
        a = arr[0].astype(np.float64)
        nd = nodata if nodata is not None else -9999
        return float(a[np.isfinite(a) & (a != nd) & (a > 0)].sum())
    except Exception as e:
        print(f"    Aviso clip_sum: {e}")
        return 0.0


def make_png(arr2d: np.ndarray, nodata) -> Image.Image:
    """Colorize population array with plasma colormap on log scale -> RGBA PNG."""
    nd = nodata if nodata is not None else -9999
    valid = np.isfinite(arr2d) & (arr2d != nd) & (arr2d > 0.5)

    # Log scale, cap at 300 pessoas/pixel (urbano denso)
    log_arr = np.where(valid, np.log1p(np.clip(arr2d, 0, 300)), 0.0)
    vmax = np.log1p(300)
    norm = log_arr / vmax  # 0..1

    import matplotlib
    cmap = matplotlib.colormaps["plasma"]
    rgba = (cmap(norm) * 255).astype(np.uint8)          # H x W x 4

    # Alpha: 0 para novalor/vazio, gradiente para pixels validos
    alpha = np.where(valid, np.clip(60 + 195 * norm, 0, 255), 0).astype(np.uint8)
    rgba[:, :, 3] = alpha

    return Image.fromarray(rgba, "RGBA")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process(mun_nome: str, cfg: dict, src: rasterio.DatasetReader) -> dict:
    slug = cfg["slug"]
    ibge7 = cfg["ibge7"]
    raster_crs = src.crs
    nodata = src.nodata

    print(f"\n[{mun_nome}]")

    # 1. Limite municipal
    limite_gdf = get_ibge_boundary(ibge7)
    limite_shapes = shapes_in_crs(limite_gdf, raster_crs)

    # 2. Populacao total
    print("  pop_total...", end=" ", flush=True)
    pop_total = clip_sum(src, limite_shapes, nodata)
    print(f"{pop_total:,.0f}")

    # 3. PNG colorizado
    print("  Gerando PNG...")
    arr, arr_transform = rio_mask(
        src, limite_shapes, crop=True, nodata=nodata if nodata is not None else -9999
    )
    arr2d = arr[0].astype(np.float32)
    nd = nodata if nodata is not None else -9999
    arr2d[arr2d == nd] = 0.0

    img = make_png(arr2d, nodata)

    # Bounds -> WGS84 para MapLibre
    h, w = arr2d.shape
    bounds = rasterio.transform.array_bounds(h, w, arr_transform)   # W, S, E, N
    if str(raster_crs).split(":")[-1] != "4326":
        bounds = transform_bounds(raster_crs, "EPSG:4326", *bounds)
    west, south, east, north = bounds

    # MapLibre image-source corners: NW, NE, SE, SW
    coordinates = [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
    ]

    out_dir = DASH_DATA / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / "populacao.png"
    img.save(str(png_path), "PNG", optimize=True)
    print(f"  PNG: {png_path.name}  ({png_path.stat().st_size / 1024:.0f} KB)")

    # 4. Pop atingida por cenario
    cenarios_data: dict = {}
    for cen_nome, shp_path in MANCHAS.get(mun_nome, {}).items():
        print(f"  {cen_nome}...", end=" ", flush=True)
        mancha_gdf = gpd.read_file(shp_path)
        # Recorta a mancha ao limite municipal: varias manchas se estendem sobre
        # municipios vizinhos (ex.: a ADA de Porto Alegre cobre ~89% de area fora da
        # capital, em Canoas etc.) e sem o recorte a populacao deles seria atribuida
        # a regiao-foco.
        mancha_gdf = mancha_gdf.to_crs(limite_gdf.crs)
        mancha_gdf["geometry"] = mancha_gdf.geometry.buffer(0)  # saneamento (Eq. 6), como em common.py
        mancha_gdf = gpd.clip(mancha_gdf, limite_gdf)
        if mancha_gdf.empty:
            print("0 (mancha fora do limite)")
            cenarios_data[cen_nome] = {"pop_atingida": 0, "pct_atingida": 0.0}
            continue
        mancha_shapes = shapes_in_crs(mancha_gdf, raster_crs)
        pop_atg = clip_sum(src, mancha_shapes, nodata)
        pct = 100 * pop_atg / pop_total if pop_total > 0 else 0
        print(f"{pop_atg:,.0f} ({pct:.1f}%)")
        cenarios_data[cen_nome] = {
            "pop_atingida": round(pop_atg),
            "pct_atingida": round(pct, 1),
        }

    return {
        "pop_total": round(pop_total),
        "coordinates": coordinates,
        "cenarios": cenarios_data,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mun", help="Processar apenas este municipio")
    args = parser.parse_args()

    if not TIFF_PATH.exists():
        print(f"ERRO: TIFF nao encontrado em {TIFF_PATH}")
        sys.exit(1)

    muns = {k: v for k, v in MUNICIPIOS.items() if not args.mun or k == args.mun}
    if not muns:
        print(f"Municipio nao encontrado: {args.mun}")
        sys.exit(1)

    resultados: dict = {}

    # Abre o TIFF uma vez e processa todos os municipios
    with rasterio.open(str(TIFF_PATH)) as src:
        print(f"TIFF aberto: CRS={src.crs}, {src.width}x{src.height}px, nodata={src.nodata}")
        for nome, cfg in muns.items():
            resultados[nome] = process(nome, cfg, src)

    # Se processou parcialmente, carregar o arquivo existente para nao apagar outros municipios
    out_path = DASH_DATA / "populacao_atingida.json"
    existing = {}
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    existing.update(resultados)
    out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSalvo: {out_path}")
    print("Concluido!")


if __name__ == "__main__":
    main()
