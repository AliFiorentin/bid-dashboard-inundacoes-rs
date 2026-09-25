"""
vetorizar_climada.py -- Vetoriza os rasters de inundacao do CLIMADA (Porto Alegre) em
shapefiles de poligono, no formato esperado por MANCHAS (config.py): qualquer shapefile
legivel por geopandas, reprojetado para EPSG:4326 automaticamente pelas funcoes de
common.py (mancha_to_geojson / intersect_points_with_mancha / intersect_polygons_with_mancha).

Fonte (fora deste repo): D:\\Projetos\\Climada\\CLIMADA_starter_packs-main\\starter_pack_brazil\\
data\\hazard\\
  - PortoAlegre_RP{10,20,50,75,100,200,500}_depth.tif  -- profundidade maxima (m) por
    periodo de retorno, usados no calculo de risco do exercicio CLIMADA de adaptacao.
  - Brazil_Porto_Alegre_2024_duration.tif              -- duracao (dias) do evento real de
    maio/2024, usado la para calibracao.

Saida: data/raw/manchas/porto_alegre/climada/{nome}.shp -- um poligono (dissolvido) por
raster, so com os pixels de profundidade/duracao > 0. Estes shapefiles sao referenciados
em config.MANCHAS["Porto Alegre"] e config.MUNICIPIOS["Porto Alegre"]["cenarios"].

Uso:  python pipeline/vetorizar_climada.py
Dependencias (alem do pipeline padrao): rasterio
"""
import sys
from pathlib import Path

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.features import shapes
from shapely.geometry import shape
from shapely.ops import unary_union

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DATA_RAW

HAZARD_DIR = Path(r"D:\Projetos\Climada\CLIMADA_starter_packs-main\starter_pack_brazil\data\hazard")
OUT_DIR = DATA_RAW / "manchas" / "porto_alegre" / "climada"

RASTERS = {
    "climada_rp10": HAZARD_DIR / "PortoAlegre_RP10_depth.tif",
    "climada_rp20": HAZARD_DIR / "PortoAlegre_RP20_depth.tif",
    "climada_rp50": HAZARD_DIR / "PortoAlegre_RP50_depth.tif",
    "climada_rp75": HAZARD_DIR / "PortoAlegre_RP75_depth.tif",
    "climada_rp100": HAZARD_DIR / "PortoAlegre_RP100_depth.tif",
    "climada_rp200": HAZARD_DIR / "PortoAlegre_RP200_depth.tif",
    "climada_rp500": HAZARD_DIR / "PortoAlegre_RP500_depth.tif",
    "climada_evento_2024": HAZARD_DIR / "Brazil_Porto_Alegre_2024_duration.tif",
}

THRESHOLD = 0.0  # profundidade (m) ou duracao (dias) > 0

# Fechamento morfologico (buffer +r depois -r) para fins CARTOGRAFICOS: os rasters do
# CLIMADA tem resolucao de quadra urbana (30-90m) e o evento real (maio/2024) e
# especialmente irregular -- muitos pixels secos isolados (quadra/lote nao alagado) no
# meio da area alagada, que sem esse fechamento aparecem como centenas de buraquinhos
# na mancha (visualmente ruido, nao erro -- e detalhe hidrologico real a nivel de
# pixel). O fechamento preenche gaps/buracos menores que o raio e funde fragmentos
# proximos, ficando com a mesma leitura "area de inundacao" das demais manchas do
# pipeline (todas poligonos continuos, sem furos). Nao aplicado como abertura (nao
# remove specks isolados de agua) para nao subestimar a extensao alagada.
CLOSE_RADIUS_DEG = 0.0008  # ~80-90m nesta latitude


def vectorize(tif_path: Path, threshold: float, out_shp: Path, close_radius: float = CLOSE_RADIUS_DEG) -> int:
    with rasterio.open(tif_path) as src:
        band = src.read(1)
        nodata = src.nodata
        transform = src.transform
        crs = src.crs

    valid = np.isfinite(band)
    if nodata is not None:
        valid &= band != nodata
    mask = valid & (band > threshold)

    n_wet = int(mask.sum())
    if n_wet == 0:
        print(f"  AVISO: nenhum pixel > {threshold} em {tif_path.name}")
        return 0

    geoms = [
        shape(geom)
        for geom, val in shapes(mask.astype(np.uint8), mask=mask, transform=transform)
        if val == 1
    ]

    union = unary_union(geoms)
    if close_radius > 0:
        union = union.buffer(close_radius).buffer(-close_radius)

    parts = list(union.geoms) if hasattr(union, "geoms") else [union]
    gdf = gpd.GeoDataFrame({"depth_src": [tif_path.stem] * len(parts)}, geometry=parts, crs=crs)

    out_shp.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(out_shp)
    area_km2 = gdf.to_crs(31982).geometry.area.sum() / 1e6  # SIRGAS2000/UTM 22S
    print(f"  {out_shp.name}: {n_wet} px -> {len(gdf)} poligono(s), {area_km2:.2f} km2")
    return len(gdf)


def main():
    print("Vetorizando manchas CLIMADA (Porto Alegre)...")
    for nome, tif_path in RASTERS.items():
        if not tif_path.exists():
            print(f"  ERRO: nao encontrado: {tif_path}")
            continue
        vectorize(tif_path, THRESHOLD, OUT_DIR / f"{nome}.shp")
    print("Concluido.")


if __name__ == "__main__":
    main()
