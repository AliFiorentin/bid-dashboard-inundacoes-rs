"""
Regenera os ATINGIDOS de infraestrutura de Lajeado
lendo os BASE.geojson já prontos e aplicando gpd.clip() exato.
"""

import os, warnings
import geopandas as gpd
from shapely.validation import make_valid

warnings.filterwarnings("ignore")

BASE_DIR  = "/home/alisson-fiorentin/Documentos/BID/public/dados_convertidos/lajeado"
INFRA_DIR = f"{BASE_DIR}/infraestrutura"
CEN_DIR   = f"{BASE_DIR}/cenarios"

CENARIOS = [
    "lajeado___cenario_27m",
    "lajeado___cenario_30m",
]

CAMADAS = [
    "lotes_BASE.geojson",
    "quadras_BASE.geojson",
    "logradouros_BASE.geojson",
    "iluminacao_publica_BASE.geojson",
]

def carregar_mancha(slug):
    gdf = gpd.read_file(f"{CEN_DIR}/{slug}.geojson").to_crs("EPSG:4326")
    gdf["geometry"] = gdf["geometry"].apply(lambda g: make_valid(g) if g else g)
    return gpd.GeoDataFrame(geometry=[gdf.unary_union], crs="EPSG:4326")

def sjoin_infra(layer, mancha):
    geom_type = layer.geom_type.iloc[0]
    if geom_type in ("Point", "MultiPoint"):
        try:
            result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="within")
        except Exception:
            result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="intersects")
        return result[[c for c in layer.columns]].drop_duplicates()
    else:
        try:
            clipped = gpd.clip(layer, mancha)
            clipped = clipped[clipped.geometry.notna()].copy()
            # Explode MultiLineString/MultiPolygon em geometrias simples
            clipped = clipped.explode(index_parts=False).reset_index(drop=True)
            return clipped[clipped.geometry.notna()].copy()
        except Exception:
            result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="intersects")
            return result[[c for c in layer.columns]].drop_duplicates()

def salvar(gdf, path):
    if gdf is None or len(gdf) == 0:
        print(f"  ⚠ Vazio: {os.path.basename(path)}")
        return
    out = gdf.to_crs("EPSG:4326").copy()
    for col in ["index_right", "index_left"]:
        if col in out.columns:
            out = out.drop(columns=[col])
    out.to_file(path, driver="GeoJSON")
    mb = os.path.getsize(path) / 1024 / 1024
    print(f"  ✓ {os.path.basename(path)} ({len(out)} features, {mb:.1f} MB)")

print("\n" + "="*60)
print("  RECLIP: Infraestrutura Lajeado → ATINGIDOS com gpd.clip()")
print("="*60)

for cen_slug in CENARIOS:
    print(f"\n{'='*60}")
    print(f"  Cenário: {cen_slug}")
    mancha = carregar_mancha(cen_slug)

    for fname in CAMADAS:
        base_path = f"{INFRA_DIR}/{fname}"
        slug = fname.replace("_BASE.geojson", "")
        print(f"\n  Camada: {slug}")

        layer = gpd.read_file(base_path).to_crs("EPSG:4326")
        layer["geometry"] = layer["geometry"].apply(lambda g: make_valid(g) if g and not g.is_valid else g)
        layer = layer[layer.geometry.notna()].copy()
        print(f"  → {len(layer)} features base")

        atingidos = sjoin_infra(layer, mancha)
        print(f"  → {len(atingidos)} atingidos", end="  ")

        out_path = f"{CEN_DIR}/infra_{slug}_ATINGIDOS_{cen_slug}.geojson"
        salvar(atingidos, out_path)

print("\n" + "="*60)
print("  Concluído!")
print("="*60)
