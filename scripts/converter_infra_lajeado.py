"""
Pipeline geo-converter — Lajeado
Camadas: Iluminação Pública (Certel + RGE), Logradouros, Lotes, Quadras
Metodologia BID: BASE + ATINGIDOS por cenário, EPSG:4326, GeoJSON.
"""

import os, re, unicodedata, warnings
import geopandas as gpd
import pandas as pd
from shapely.validation import make_valid

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
TMP      = "/tmp/geo_lajeado"
ILUM_DIR = f"{TMP}/iluminacao/Iluminação Pública"
CAM_DIR  = f"{TMP}/camadas"
BID_OUT  = "/home/alisson/Documentos/BID/public/dados_convertidos/lajeado"
INFRA_OUT    = f"{BID_OUT}/infraestrutura"
CENARIOS_DIR = f"{BID_OUT}/cenarios"
os.makedirs(INFRA_OUT, exist_ok=True)

# ── Slugify (idêntico ao JS) ──────────────────────────────────────────────────
def slugify(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")

def scenario_slug(mun, cen):
    return f"{slugify(mun)}___{slugify(cen)}"

# ── Cenários de Lajeado ───────────────────────────────────────────────────────
CENARIOS = {
    "Cenário 27m": scenario_slug("Lajeado", "Cenário 27m"),
    "Cenário 30m": scenario_slug("Lajeado", "Cenário 30m"),
}

def carregar_mancha(slug):
    path = f"{CENARIOS_DIR}/{slug}.geojson"
    gdf = gpd.read_file(path).to_crs("EPSG:4326")
    return gpd.GeoDataFrame(geometry=[gdf.unary_union], crs="EPSG:4326")

# ── Spatial join / clip ───────────────────────────────────────────────────────
def sjoin_infra(layer, mancha):
    geom_type = layer.geom_type.iloc[0]
    if geom_type in ("Point", "MultiPoint"):
        try:
            result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="within")
        except Exception:
            result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="intersects")
        cols = [c for c in layer.columns]
        return result[cols].drop_duplicates()
    else:
        # Lines and Polygons: clip to flood boundary (exact intersection, not full feature)
        try:
            clipped = gpd.clip(layer, mancha)
            return clipped[clipped.geometry.notna()].copy()
        except Exception:
            result = gpd.sjoin(layer, mancha[["geometry"]], how="inner", predicate="intersects")
            cols = [c for c in layer.columns]
            return result[cols].drop_duplicates()

# ── Salvar GeoJSON ────────────────────────────────────────────────────────────
def salvar(gdf, path):
    if gdf is None or len(gdf) == 0:
        print(f"  ⚠ Vazio: {os.path.basename(path)}")
        return
    out = gdf.to_crs("EPSG:4326").copy()
    for col in ["index_right", "index_left"]:
        if col in out.columns: out = out.drop(columns=[col])
    out.to_file(path, driver="GeoJSON")
    mb = os.path.getsize(path) / 1024 / 1024
    print(f"  ✓ {os.path.basename(path)} ({len(out)} features, {mb:.1f} MB)")

# ── Processar camada ──────────────────────────────────────────────────────────
def processar(nome, gdf):
    slug = slugify(nome)
    print(f"\n{'='*60}")
    print(f"  {nome} ({len(gdf)} features brutos)")

    # Reprojetar
    if gdf.crs is None: gdf = gdf.set_crs("EPSG:31982")
    gdf = gdf.to_crs("EPSG:4326")

    # Corrigir geometrias inválidas e remover nulas
    gdf["geometry"] = gdf["geometry"].apply(lambda g: make_valid(g) if g and not g.is_valid else g)
    gdf = gdf[gdf.geometry.notna()].copy()
    print(f"  → Após limpeza: {len(gdf)} features")

    # BASE
    salvar(gdf, f"{INFRA_OUT}/{slug}_BASE.geojson")

    # ATINGIDOS por cenário
    for cen_nome, cen_slug in CENARIOS.items():
        mancha  = carregar_mancha(cen_slug)
        ating   = sjoin_infra(gdf, mancha)
        print(f"  {cen_nome}: {len(ating)} atingidos", end="  ")
        salvar(ating, f"{CENARIOS_DIR}/infra_{slug}_ATINGIDOS_{cen_slug}.geojson")


# ════════════════════════════════════════════════════════════════════════════
# CAMADA 1 — Iluminação Pública (Certel + RGE unificados)
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("  PIPELINE: Infraestrutura Lajeado → BID Dashboard")
print("="*60)

def limpar_col(gdf, idx, novo_nome):
    """Renomeia coluna por índice (evita problema de encoding no nome)."""
    col_atual = gdf.columns[idx]
    return gdf.rename(columns={col_atual: novo_nome})

# Certel — UTF-8 (já em EPSG:4326)
gdf_certel = gpd.read_file(f"{ILUM_DIR}/Cadastro_Certel.shp")
# Colunas relevantes por índice: 14=Potência, 15=Soma_Qtd, 16=Tipo_Eq
gdf_certel = gdf_certel.iloc[:, [14, 15, 16, -1]].copy()  # -1 = geometry
gdf_certel.columns = ["Potencia", "Quantidade", "Tipo", "geometry"]
gdf_certel["Fonte"] = "Certel"

# RGE — cp1252 (já em EPSG:4326)
gdf_rge = gpd.read_file(f"{ILUM_DIR}/Cadastro_RGE.shp", encoding="cp1252")
# Colunas relevantes por índice: 12=Tipo_Lamp, 13=Potência, 14=Quantidade
gdf_rge = gdf_rge.iloc[:, [12, 13, 14, -1]].copy()
gdf_rge.columns = ["Tipo", "Potencia", "Quantidade", "geometry"]
gdf_rge["Fonte"] = "RGE"

# Unificar
gdf_ilum = pd.concat([
    gpd.GeoDataFrame(gdf_certel, geometry="geometry", crs="EPSG:4326"),
    gpd.GeoDataFrame(gdf_rge,    geometry="geometry", crs="EPSG:4326"),
], ignore_index=True)
gdf_ilum = gpd.GeoDataFrame(gdf_ilum, geometry="geometry", crs="EPSG:4326")

processar("Iluminação Pública", gdf_ilum)


# ════════════════════════════════════════════════════════════════════════════
# CAMADA 2 — Logradouros (ruas)
# ════════════════════════════════════════════════════════════════════════════
gdf_log = gpd.read_file(f"{CAM_DIR}/camada_logradouro_13_1776173139055.shp", encoding="cp1252")
# Manter: nome, tipo, codigo
cols_log = [c for c in ["nome", "tipo", "codigo", "geometry"] if c in gdf_log.columns]
gdf_log = gdf_log[cols_log].copy()
if gdf_log.crs is None: gdf_log = gdf_log.set_crs("EPSG:31982")

processar("Logradouros", gdf_log)


# ════════════════════════════════════════════════════════════════════════════
# CAMADA 3 — Lotes
# ════════════════════════════════════════════════════════════════════════════
gdf_lotes = gpd.read_file(f"{CAM_DIR}/camada_lote_8_1776173139055.shp", encoding="cp1252")

# Selecionar colunas mais úteis para análise de impacto
colunas_lotes = ["id", "codigo", "numero", "fl_rural", "geometry"]
# Coluna de área (nome pode variar por encoding)
area_col = next((c for c in gdf_lotes.columns if "rea" in c.lower() and "lot" in c.lower()), None)
if area_col: colunas_lotes.insert(4, area_col)
# Coluna de destinação
dest_col = next((c for c in gdf_lotes.columns if "destina" in c.lower()), None)
if dest_col: colunas_lotes.insert(4, dest_col)

colunas_lotes = [c for c in colunas_lotes if c in gdf_lotes.columns]
gdf_lotes = gdf_lotes[colunas_lotes].copy()

# Renomear area para nome limpo
if area_col:
    gdf_lotes = gdf_lotes.rename(columns={area_col: "Area_m2"})

if gdf_lotes.crs is None: gdf_lotes = gdf_lotes.set_crs("EPSG:31982")
processar("Lotes", gdf_lotes)


# ════════════════════════════════════════════════════════════════════════════
# CAMADA 4 — Quadras
# ════════════════════════════════════════════════════════════════════════════
gdf_qua = gpd.read_file(f"{CAM_DIR}/camada_quadra_6_1776173139055.shp", encoding="cp1252")

# Selecionar colunas úteis
colunas_qua = ["id", "codigo", "geometry"]
area_col_q = next((c for c in gdf_qua.columns if "rea" in c.lower()), None)
if area_col_q: colunas_qua.insert(2, area_col_q)
colunas_qua = [c for c in colunas_qua if c in gdf_qua.columns]
gdf_qua = gdf_qua[colunas_qua].copy()
if area_col_q:
    gdf_qua = gdf_qua.rename(columns={area_col_q: "Area_m2"})

if gdf_qua.crs is None: gdf_qua = gdf_qua.set_crs("EPSG:31982")
processar("Quadras", gdf_qua)


# ── Relatório final ───────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  Conversão concluída!")
print("="*60)

print("\nArquivos BASE em infraestrutura/:")
for f in sorted(os.listdir(INFRA_OUT)):
    mb = os.path.getsize(f"{INFRA_OUT}/{f}") / 1024 / 1024
    aviso = " ⚠ >18MB" if mb > 18 else ""
    print(f"  {f:45s} {mb:6.1f} MB{aviso}")

print("\nArquivos ATINGIDOS em cenarios/:")
for f in sorted(f for f in os.listdir(CENARIOS_DIR) if "infra_" in f):
    mb = os.path.getsize(f"{CENARIOS_DIR}/{f}") / 1024 / 1024
    print(f"  {f:70s} {mb:5.1f} MB")
