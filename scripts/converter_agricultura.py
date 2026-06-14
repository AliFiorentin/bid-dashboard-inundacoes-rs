"""
Gera PNGs coloridos e JSONs de estatísticas (ha/cultura) da camada Agricultura.
Lê TIFs MapaBiomas Col.10, move-os para public/, gera BASE + mascarados por cenário.

Classes agrícolas usadas:
  39 = Soja
  40 = Arroz
  41 = Outras Lavouras Temporárias

Saída por município:
  public/dados_convertidos/{slug}/agricultura.tif     ← TIF original movido
  public/dados_convertidos/{slug}/agricultura_BASE.png
  public/dados_convertidos/{slug}/agricultura_stats_BASE.json
  public/dados_convertidos/{slug}/cenarios/agricultura_raster_{cen}.png
  public/dados_convertidos/{slug}/cenarios/agricultura_stats_{cen}.json
"""

import json, math, os, re, shutil, unicodedata, warnings
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.mask import mask as rasterio_mask
from PIL import Image

warnings.filterwarnings("ignore")

# ── Caminhos ──────────────────────────────────────────────────────────────────
TIFS_SRC = {
    "Lajeado":          "/home/alisson-fiorentin/Downloads/Agricultura - Lajeado.tif",
    "Eldorado do Sul":  "/home/alisson-fiorentin/Downloads/Agricultura - Eldorado do Sul.tif",
    "Porto Alegre":     "/home/alisson-fiorentin/Downloads/Agricultura - Porto Alegre.tif",
    "Rio Grande":       "/home/alisson-fiorentin/Downloads/Agricultura - Rio Grande.tif",
}
PUBLIC = "/home/alisson-fiorentin/Documentos/BID/public/dados_convertidos"

# ── Classes e cores ───────────────────────────────────────────────────────────
CLASSES = {
    39: ("Soja",                       (212, 160,  23)),   # amarelo
    40: ("Arroz",                      ( 79, 195, 247)),   # azul claro
    41: ("Outras Lavouras Temporárias",(174, 213, 129)),   # verde claro
}
OPACITY = 210  # ~82% opacidade

# ── Cenários por município (slug do arquivo de mancha) ────────────────────────
CENARIOS = {
    "Lajeado":         ["lajeado___cenario_27m", "lajeado___cenario_30m"],
    "Eldorado do Sul": ["eldorado_do_sul___cenario_ada"],
    "Porto Alegre":    ["porto_alegre___cenario_ada"],
    "Rio Grande":      ["rio_grande___cenario_maio_2024", "rio_grande___cenario_maio_2024_50",
                        "rio_grande___cenario_setembro_2023"],
}

# ── Slugify ───────────────────────────────────────────────────────────────────
def slugify(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", s.lower().strip()).strip("_")

# ── Band → RGBA PIL Image ─────────────────────────────────────────────────────
def band_to_rgba(band):
    rgba = np.zeros((*band.shape, 4), dtype=np.uint8)
    for code, (_, (r, g, b)) in CLASSES.items():
        m = band == code
        rgba[m, 0] = r; rgba[m, 1] = g; rgba[m, 2] = b; rgba[m, 3] = OPACITY
    return Image.fromarray(rgba, "RGBA")

# ── Área por cultura (ha) ─────────────────────────────────────────────────────
def calcular_stats(band, pixel_area_ha):
    stats = {}
    for code, (nome, _) in CLASSES.items():
        count = int((band == code).sum())
        if count > 0:
            stats[nome] = round(count * pixel_area_ha, 2)
    return stats

def pixel_area_ha(src):
    b = src.bounds
    center_lat = (b.top + b.bottom) / 2
    pw = abs(src.transform.a)
    ph = abs(src.transform.e)
    m_lon = 111320 * math.cos(math.radians(center_lat))
    m_lat = 111320
    return (pw * m_lon * ph * m_lat) / 10000

# ── Main ──────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  PIPELINE: Agricultura MapaBiomas → BID Dashboard")
print("="*60)

bounds_output = {}

for mun, tif_src in TIFS_SRC.items():
    mslug   = slugify(mun)
    out_dir = f"{PUBLIC}/{mslug}"
    cen_dir = f"{out_dir}/cenarios"
    os.makedirs(cen_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  {mun}  ({mslug})")

    # ── Mover TIF ────────────────────────────────────────────────────────────
    tif_dst = f"{out_dir}/agricultura.tif"
    shutil.copy2(tif_src, tif_dst)
    print(f"  ✓ TIF copiado → {tif_dst.replace(PUBLIC,'…')}")

    with rasterio.open(tif_dst) as src:
        b     = src.bounds
        band  = src.read(1)
        paha  = pixel_area_ha(src)
        crs   = src.crs
        bounds_output[mun] = {
            "W": round(b.left, 6), "S": round(b.bottom, 6),
            "E": round(b.right, 6), "N": round(b.top, 6),
        }

    print(f"  Pixel area: {paha:.4f} ha   |   Bounds: {bounds_output[mun]}")

    # ── BASE PNG ─────────────────────────────────────────────────────────────
    img = band_to_rgba(band)
    img.save(f"{out_dir}/agricultura_BASE.png", "PNG")
    sz = os.path.getsize(f"{out_dir}/agricultura_BASE.png") // 1024
    print(f"  ✓ agricultura_BASE.png  ({sz} KB, {img.width}×{img.height}px)")

    # ── BASE stats JSON ───────────────────────────────────────────────────────
    stats_base = calcular_stats(band, paha)
    with open(f"{out_dir}/agricultura_stats_BASE.json", "w") as f:
        json.dump(stats_base, f, ensure_ascii=False)
    print(f"  ✓ agricultura_stats_BASE.json  {stats_base}")

    # ── Por cenário ───────────────────────────────────────────────────────────
    for cen_slug in CENARIOS.get(mun, []):
        mancha_path = f"{cen_dir}/{cen_slug}.geojson"
        if not os.path.exists(mancha_path):
            print(f"  ⚠ Mancha não encontrada: {cen_slug} — pulando")
            continue

        mancha = gpd.read_file(mancha_path).to_crs("EPSG:4326")
        shapes = [f.__geo_interface__ for f in mancha.geometry]

        with rasterio.open(tif_dst) as src:
            band_m, _ = rasterio_mask(src, shapes, crop=False, nodata=0)
            band_masked = band_m[0]

        img_m = band_to_rgba(band_masked)
        img_m.save(f"{cen_dir}/agricultura_raster_{cen_slug}.png", "PNG")
        sz_m = os.path.getsize(f"{cen_dir}/agricultura_raster_{cen_slug}.png") // 1024

        stats_cen = calcular_stats(band_masked, paha)
        with open(f"{cen_dir}/agricultura_stats_{cen_slug}.json", "w") as f:
            json.dump(stats_cen, f, ensure_ascii=False)

        print(f"  ✓ {cen_slug}: {sz_m} KB PNG  |  stats: {stats_cen}")

# ── Imprimir bounds para page.tsx ─────────────────────────────────────────────
print("\n" + "="*60)
print("  AGRI_BOUNDS para page.tsx:")
print("="*60)
print("const AGRI_BOUNDS: Record<string, [[number,number],[number,number],[number,number],[number,number]]> = {")
for mun, bnd in bounds_output.items():
    nw = f"[{bnd['W']},{bnd['N']}]"
    ne = f"[{bnd['E']},{bnd['N']}]"
    se = f"[{bnd['E']},{bnd['S']}]"
    sw = f"[{bnd['W']},{bnd['S']}]"
    print(f'  "{mun}": [{nw},{ne},{se},{sw}],')
print("};")
print("\nConcluído!")
