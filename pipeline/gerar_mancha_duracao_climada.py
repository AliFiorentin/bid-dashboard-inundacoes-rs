"""
gerar_mancha_duracao_climada.py -- PNG colorizado da duracao de alagamento (dias)
do evento real de maio/2024 em Porto Alegre, a partir do raster de duracao do
exercicio CLIMADA (Brazil_Porto_Alegre_2024_duration.tif), para sobrepor no mapa
principal como camada de imagem (mesma tecnica de 09_populacao.py: PNG RGBA +
coordenadas WGS84 dos 4 cantos).

Por que DURACAO e nao PROFUNDIDADE: o exercicio CLIMADA so' tem raster de
PROFUNDIDADE para os cenarios sinteticos de periodo de retorno (RP10..RP500,
usados em climada_risco_prototipo.py) -- o evento REAL observado de maio/2024
(cenario "Climada Evento 2024" no seletor do painel) so' tem um raster de
DURACAO (dias que cada pixel ficou alagado), usado no proprio exercicio para
CALIBRAR os cenarios de RP (ver climada_risco_prototipo.py, secao CURVAS DE
DANO). Nao ha profundidade por pixel para este evento especifico -- rotulado
como duracao (nao profundidade) para nao inventar um dado que nao existe.

Paleta: azul sequencial (matplotlib "Blues") -- claro para poucos dias, escuro
para muitos dias -- deliberadamente distinta das paletas ja usadas em outras
camadas do painel (plasma da populacao, vermelho/laranja dos heatmaps e do
prototipo de dano fisico).

Uso: python pipeline/gerar_mancha_duracao_climada.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
import rasterio.transform
from rasterio.warp import transform_bounds
from PIL import Image
import matplotlib
matplotlib.use("Agg")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA

TIFF_PATH = Path(
    r"D:\Projetos\Climada\CLIMADA_starter_packs-main\starter_pack_brazil\data\hazard"
    r"\Brazil_Porto_Alegre_2024_duration.tif"
)
OUT_DIR = DASH_DATA / "porto_alegre"


def make_png(arr2d: np.ndarray, nodata) -> tuple[Image.Image, float, float]:
    """Coloriza a duracao (dias) com colormap Blues -- claro=poucos dias,
    escuro=muitos dias. Alpha 0 fora da mancha (seco / nodata)."""
    nd = nodata if nodata is not None else -9999
    valid = np.isfinite(arr2d) & (arr2d != nd) & (arr2d > 0)
    dur_max = float(arr2d[valid].max()) if valid.any() else 0.0
    dur_media = float(arr2d[valid].mean()) if valid.any() else 0.0

    norm = np.where(valid, np.clip(arr2d, 0, dur_max) / dur_max if dur_max > 0 else 0.0, 0.0)

    cmap = matplotlib.colormaps["Blues"]
    rgba = (cmap(norm) * 255).astype(np.uint8)
    alpha = np.where(valid, np.clip(80 + 175 * norm, 0, 255), 0).astype(np.uint8)
    rgba[:, :, 3] = alpha

    return Image.fromarray(rgba, "RGBA"), dur_max, dur_media


def main():
    if not TIFF_PATH.exists():
        print(f"ERRO: raster nao encontrado: {TIFF_PATH}")
        sys.exit(1)

    with rasterio.open(TIFF_PATH) as src:
        arr = src.read(1).astype(np.float32)
        nodata = src.nodata
        raster_crs = src.crs
        transform_ = src.transform
        h, w = arr.shape

        img, dur_max, dur_media = make_png(arr, nodata)

        bounds = rasterio.transform.array_bounds(h, w, transform_)  # W, S, E, N
        if str(raster_crs).split(":")[-1] != "4326":
            bounds = transform_bounds(raster_crs, "EPSG:4326", *bounds)
        west, south, east, north = bounds
        coordinates = [[west, north], [east, north], [east, south], [west, south]]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path = OUT_DIR / "mancha_duracao_climada_evento_2024.png"
    img.save(str(png_path), "PNG", optimize=True)

    json_path = OUT_DIR / "mancha_duracao_climada_evento_2024.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "coordinates": coordinates,
            "duracao_max_dias": round(dur_max, 1),
            "duracao_media_dias": round(dur_media, 2),
            "fonte": "Brazil_Porto_Alegre_2024_duration.tif (exercicio CLIMADA/UNU-EHS, evento real maio/2024)",
            "paleta": "matplotlib Blues (claro=poucos dias, escuro=muitos dias)",
        }, f, ensure_ascii=False, indent=2)

    print(f"Salvo: {png_path} ({png_path.stat().st_size / 1024:.0f} KB)")
    print(f"Salvo: {json_path}")
    print(f"Duracao max: {dur_max:.1f} dias | media (pixels alagados): {dur_media:.2f} dias")


if __name__ == "__main__":
    main()
