"""
Pipeline de conversão de infraestrutura — Rio Grande
Metodologia idêntica ao BID: BASE + ATINGIDOS por cenário, EPSG:4326, GeoJSON.
"""

import json
import os
import re
import unicodedata
import warnings

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

warnings.filterwarnings("ignore")

# ─── Paths ───────────────────────────────────────────────────────────────────

DADOS   = "/home/alisson/Downloads/Dashboard CIEX (Streamlit)/Dados"
BID_OUT = "/home/alisson/Documentos/BID/public/dados_convertidos/rio_grande"

INFRA_OUT    = f"{BID_OUT}/infraestrutura"
CENARIOS_DIR = f"{BID_OUT}/cenarios"

os.makedirs(INFRA_OUT, exist_ok=True)

# ─── Slugify (idêntico ao JS do dashboard) ───────────────────────────────────

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")

def scenario_slug(mun: str, cen: str) -> str:
    return f"{slugify(mun)}___{slugify(cen)}"

# ─── Cenários já convertidos ─────────────────────────────────────────────────

CENARIOS = {
    "Cenário Setembro 2023":  scenario_slug("Rio Grande", "Cenário Setembro 2023"),
    "Cenário Maio 2024":      scenario_slug("Rio Grande", "Cenário Maio 2024"),
    "Cenário Maio 2024 + 50%": scenario_slug("Rio Grande", "Cenário Maio 2024 + 50%"),
}

def carregar_mancha(slug: str) -> gpd.GeoDataFrame:
    path = f"{CENARIOS_DIR}/{slug}.geojson"
    gdf = gpd.read_file(path).to_crs("EPSG:4326")
    # Unifica em um único polígono
    return gpd.GeoDataFrame(geometry=[gdf.unary_union], crs="EPSG:4326")

# ─── Spatial join (mesma lógica do Streamlit: within → intersects) ───────────

def sjoin_infra(layer: gpd.GeoDataFrame, mancha: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    predicate = "within" if layer.geom_type.iloc[0] == "Point" else "intersects"
    try:
        result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate=predicate)
    except Exception:
        result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="intersects")
    result = result[layer.columns]
    return result.drop_duplicates()

# ─── Salvar como GeoJSON limpo ───────────────────────────────────────────────

def salvar_geojson(gdf: gpd.GeoDataFrame, path: str):
    if gdf is None or len(gdf) == 0:
        print(f"  ⚠ Vazio, não salvo: {os.path.basename(path)}")
        return
    gdf_out = gdf.to_crs("EPSG:4326").copy()
    # Remove colunas auxiliares do sjoin se existirem
    for col in ["index_right", "index_left"]:
        if col in gdf_out.columns:
            gdf_out = gdf_out.drop(columns=[col])
    gdf_out.to_file(path, driver="GeoJSON")
    size_mb = os.path.getsize(path) / 1024 / 1024
    print(f"  ✓ {os.path.basename(path)}  ({len(gdf_out)} features, {size_mb:.1f} MB)")

# ─── Processamento genérico de uma camada ────────────────────────────────────

def processar_camada(nome: str, gdf: gpd.GeoDataFrame):
    slug = slugify(nome)
    print(f"\n{'='*60}")
    print(f"  Camada: {nome}  ({len(gdf)} features, CRS: {gdf.crs})")

    # Reprojetar para WGS84
    gdf = gdf.to_crs("EPSG:4326")
    # Remove geometrias nulas
    gdf = gdf[gdf.geometry.notna() & gdf.geometry.is_valid].copy()
    print(f"  → Após limpeza: {len(gdf)} features")

    # Salvar BASE
    base_path = f"{INFRA_OUT}/{slug}_BASE.geojson"
    salvar_geojson(gdf, base_path)

    # Salvar ATINGIDOS para cada cenário
    for cen_nome, cen_slug in CENARIOS.items():
        mancha = carregar_mancha(cen_slug)
        atingidos = sjoin_infra(gdf, mancha)
        out_path = f"{CENARIOS_DIR}/infra_{slug}_ATINGIDOS_{cen_slug}.geojson"
        print(f"  {cen_nome}: {len(atingidos)} atingidos", end="")
        salvar_geojson(atingidos, out_path)

# ─── Carregar shapefiles (EPSG:31982 → 4326) ─────────────────────────────────

def carregar_shp(caminho: str) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(caminho)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:31982")
    return gdf

# ─── MAIN ────────────────────────────────────────────────────────────────────

print("\n" + "="*60)
print("  PIPELINE: Infraestrutura Rio Grande → BID Dashboard")
print("="*60)

# 1. Logradouros (ruas — LineString)
gdf_log = carregar_shp(f"{DADOS}/PMRG_231215_layer_Logradouros_segmentos.shp")
gdf_log = gdf_log[gdf_log.geom_type.isin(["LineString", "MultiLineString"])].copy()
processar_camada("Logradouros", gdf_log)

# 2. Quadras (polígonos)
gdf_qua = carregar_shp(f"{DADOS}/PMRG_231215_layer_Quadras.shp")
processar_camada("Quadras", gdf_qua)

# 3. Terrenos (polígonos — pode ser grande)
gdf_ter = carregar_shp(f"{DADOS}/PMRG_231215_layer_Terrenos.shp")
processar_camada("Terrenos", gdf_ter)

# 4. Imóveis (CAD_IMOB — pontos com atributos)
gdf_imo = carregar_shp(f"{DADOS}/PMRG_CAD_IMOB.shp")
processar_camada("Imóveis", gdf_imo)

# 5. Prédios Públicos (Excel → GeoDataFrame de pontos)
df_pp = pd.read_excel(f"{DADOS}/parcial prédios públicos.xlsx")
df_pp = df_pp.dropna(subset=["Latitude", "Longitude"])
gdf_pp = gpd.GeoDataFrame(
    df_pp,
    geometry=[Point(lon, lat) for lat, lon in zip(df_pp["Latitude"], df_pp["Longitude"])],
    crs="EPSG:4326"
)
processar_camada("Prédios Públicos", gdf_pp)

# 6. Segurança (Excel → GeoDataFrame de pontos)
df_seg = pd.read_excel(f"{DADOS}/parcial segurança.xlsx")
df_seg = df_seg.dropna(subset=["Latitude", "Longitude"])
gdf_seg = gpd.GeoDataFrame(
    df_seg,
    geometry=[Point(lon, lat) for lat, lon in zip(df_seg["Latitude"], df_seg["Longitude"])],
    crs="EPSG:4326"
)
processar_camada("Segurança", gdf_seg)

print("\n" + "="*60)
print("  Conversão concluída!")
print("="*60)

# Resumo dos arquivos gerados
print("\nArquivos em infraestrutura/:")
for f in sorted(os.listdir(INFRA_OUT)):
    size = os.path.getsize(f"{INFRA_OUT}/{f}") / 1024 / 1024
    print(f"  {f:45s}  {size:6.1f} MB")

print("\nArquivos ATINGIDOS em cenarios/:")
for f in sorted(f for f in os.listdir(CENARIOS_DIR) if "infra_" in f):
    size = os.path.getsize(f"{CENARIOS_DIR}/{f}") / 1024 / 1024
    print(f"  {f:70s}  {size:6.1f} MB")
