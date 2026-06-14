"""
Clipa dados CONAB (Soja 2022-2023, Arroz 2022-2023 / 2023-2024) às manchas de inundação.
Gera cenarios/conab_stats_{cenSlug}.json com área (ha) de cada cultivo dentro da mancha.

Lógica de safra:
  - Enchentes de maio 2024: Soja 2022-2023 (proxy área) + Arroz 2023-2024
  - Enchente set 2023 (Rio Grande): Soja 2022-2023 + Arroz 2022-2023

Arquivos CONAB esperados em /tmp/conab_rs/:
  soja_2223/RS_SOJA_2223.shp
  arroz_2324/RS_ARROZ_IRRIG_2324.shp
  arroz_2223/RS_ARROZ_IRRIG_2223.shp
"""

import json, os, warnings
import geopandas as gpd
from shapely.validation import make_valid

warnings.filterwarnings("ignore")

# ── Caminhos ──────────────────────────────────────────────────────────────────
PUBLIC = "/home/alisson-fiorentin/Documentos/BID/public/dados_convertidos"
CONAB_SOJA_2223   = "/tmp/conab_rs/soja_2223/RS_SOJA_2223.shp"
CONAB_ARROZ_2324  = "/tmp/conab_rs/arroz_2324/RS_ARROZ_IRRIG_2324.shp"
CONAB_ARROZ_2223  = "/tmp/conab_rs/arroz_2223/RS_ARROZ_IRRIG_2223.shp"

# ── Período por cenário ───────────────────────────────────────────────────────
CENARIO_PERIODO = {
    "lajeado___cenario_27m":              "maio_2024",
    "lajeado___cenario_30m":              "maio_2024",
    "eldorado_do_sul___cenario_ada":      "maio_2024",
    "porto_alegre___cenario_ada":         "maio_2024",
    "rio_grande___cenario_maio_2024":     "maio_2024",
    "rio_grande___cenario_maio_2024_50":  "maio_2024",
    "rio_grande___cenario_setembro_2023": "setembro_2023",
}

MUNICIPIOS = ["lajeado", "eldorado_do_sul", "porto_alegre", "rio_grande"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def fix_geom(gdf):
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].apply(
        lambda g: make_valid(g) if g and not g.is_valid else g
    )
    return gdf[gdf.geometry.notna()].copy()

def carregar_mancha(path):
    gdf = gpd.read_file(path).to_crs("EPSG:4326")
    gdf = fix_geom(gdf)
    return gpd.GeoDataFrame(geometry=[gdf.unary_union], crs="EPSG:4326")

def clip_area_ha(conab_gdf, mancha_gdf):
    """Clipa CONAB à mancha e retorna soma de área recalculada em ha (UTM 22S)."""
    try:
        clipped = gpd.clip(conab_gdf, mancha_gdf)
        if clipped is None or len(clipped) == 0:
            return 0.0
        clipped = fix_geom(clipped)
        clipped_m = clipped.to_crs("EPSG:32722")   # UTM zone 22S – RS
        return round(float(clipped_m.geometry.area.sum() / 10_000), 2)  # m² → ha
    except Exception as e:
        print(f"    ⚠ Erro clip: {e}")
        return 0.0

# ── Carregar CONAB ────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  PIPELINE: CONAB → BID Dashboard (clip por mancha)")
print("="*60)

print("\nCarregando shapefiles CONAB...")
gdf_soja      = fix_geom(gpd.read_file(CONAB_SOJA_2223).to_crs("EPSG:4326"))
gdf_arroz2324 = fix_geom(gpd.read_file(CONAB_ARROZ_2324).to_crs("EPSG:4326"))
gdf_arroz2223 = fix_geom(gpd.read_file(CONAB_ARROZ_2223).to_crs("EPSG:4326"))
print(f"  Soja 2222-2023:  {len(gdf_soja):>7,} features")
print(f"  Arroz 2023-2024: {len(gdf_arroz2324):>7,} features")
print(f"  Arroz 2022-2023: {len(gdf_arroz2223):>7,} features")

# ── Processar por cenário ─────────────────────────────────────────────────────
for mun_slug in MUNICIPIOS:
    cen_dir = f"{PUBLIC}/{mun_slug}/cenarios"

    for cen_slug, periodo in CENARIO_PERIODO.items():
        if not cen_slug.startswith(mun_slug):
            continue

        mancha_path = f"{cen_dir}/{cen_slug}.geojson"
        if not os.path.exists(mancha_path):
            print(f"\n  ⚠ Mancha ausente: {cen_slug}")
            continue

        print(f"\n{'='*60}")
        print(f"  {mun_slug} / {cen_slug}")
        print(f"  Período: {periodo}")

        mancha = carregar_mancha(mancha_path)

        arroz_gdf   = gdf_arroz2324 if periodo == "maio_2024" else gdf_arroz2223
        arroz_safra = "2023-2024"   if periodo == "maio_2024" else "2022-2023"

        print("  Clipando Soja...", end="", flush=True)
        soja_ha = clip_area_ha(gdf_soja, mancha)
        print(f" {soja_ha:.2f} ha")

        print(f"  Clipando Arroz ({arroz_safra})...", end="", flush=True)
        arroz_ha = clip_area_ha(arroz_gdf, mancha)
        print(f" {arroz_ha:.2f} ha")

        stats = {
            "periodo": periodo,
            "soja":  {"area_ha": soja_ha,  "safra": "2022-2023",  "fonte": "CONAB"},
            "arroz": {"area_ha": arroz_ha, "safra": arroz_safra,   "fonte": "CONAB"},
        }

        out_path = f"{cen_dir}/conab_stats_{cen_slug}.json"
        with open(out_path, "w") as f:
            json.dump(stats, f, ensure_ascii=False)
        print(f"  ✓ {out_path.replace(PUBLIC,'…')}")

print("\n" + "="*60)
print("  Concluído!")
print("="*60)
