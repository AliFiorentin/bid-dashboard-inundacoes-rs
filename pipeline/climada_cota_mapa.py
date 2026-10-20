"""
climada_cota_mapa.py -- raster de "cota de alagamento" para o mapa com slider de cota do
Dashboard (pagina Danos por cota).

Para cada pixel, guarda o INDICE da primeira cota (rasters em ordem crescente) em que ha agua
(profundidade > 0). No navegador, dada uma cota c do slider, o pixel esta molhado se
cota[idx] <= c; a intensidade vem de (c - cota[idx]) e a borda e' suavizada pela fracao de
passo, dando transicao gradual entre as manchas. Como o indice da primeira cota molhada e'
monotonico por construcao, equivale ao cummax entre cotas usado em climada_cota.py (celulas que
ficam mais rasas com cota maior continuam molhadas).

Os rasters (~5 m) sao reduzidos com Resampling.max (preserva pixel molhado) a no maximo
MAX_PX no lado maior e recortados ao poligono do municipio (IBGE). Pixel fora do municipio ou
nunca molhado -> alpha 0. Parte oeste de Eldorado do Sul fora da grade fica sem dado.

Saida (em DASH_DATA/{slug}/):
  cota_mapa.webp   RGBA lossless: R = indice (1..N) da 1a cota molhada, A = 255 se molhado
  cota_mapa.json   {cotas:[...], bounds:[W,S,E,N], coordinates:[NW,NE,SE,SW], width, height,
                    pop_por_cota:[hab. atingidos acumulados por cota], pop_grade:hab. na grade}

Populacao atingida por cota: o WorldPop (100 m, hab./celula) e' reamostrado (vizinho mais proximo) na
grade fina da mancha e cada pixel recebe valor x (area do pixel / area da celula WorldPop); soma-se
os pixels molhados ate' a cota. pop_grade e' o total dentro do municipio NA GRADE: em Eldorado do Sul
a grade nao cobre o oeste do municipio (ver climada_cota.py), entao e' subestimativa.

Uso:  python pipeline/climada_cota_mapa.py [--mun "Lajeado" | "Eldorado do Sul" | "Porto Alegre"]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio import features
from rasterio.warp import reproject, Resampling
from rasterio.windows import Window, from_bounds

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA, DATA_RAW
import climada_cota as cc

MAX_PX = 2200
POP_TIF = DATA_RAW / "bra_pop_2024_CN_100m_R2025A_v1.tif"


def listar_cotas(raster_dir: Path) -> list[tuple[float, Path]]:
    return sorted((float(p.stem.split("_")[0]), p) for p in raster_dir.glob("*_clip.tif"))


def ler_max(src, win: Window, f: int, h: int, w: int) -> np.ndarray:
    """Profundidade reduzida por max-pooling fxf (preserva pixel molhado), lida em faixas de linhas."""
    out = np.full((h, w), -9999, dtype=np.float32)
    faixa = f * 256
    for r0 in range(0, int(win.height), faixa):
        nr = min(faixa, int(win.height) - r0)
        a = src.read(1, window=Window(win.col_off, win.row_off + r0, win.width, nr))
        pr, pc = -nr % f, -int(win.width) % f
        a = np.pad(a, ((0, pr), (0, pc)), constant_values=-9999)
        a = a.reshape(a.shape[0] // f, f, a.shape[1] // f, f).max(axis=(1, 3))
        out[r0 // f : r0 // f + a.shape[0]] = a
    return out


def populacao_por_cota(primeira: np.ndarray, dentro: np.ndarray, tr, n_cotas: int) -> tuple[list[float], float]:
    """Habitantes (WorldPop) sob agua acumulados por cota e total do municipio, na grade fina."""
    h, w = primeira.shape
    with rasterio.open(POP_TIF) as src:
        pop = np.zeros((h, w), dtype=np.float32)
        reproject(rasterio.band(src, 1), pop, dst_transform=tr, dst_crs="EPSG:4326",
                  resampling=Resampling.nearest, src_nodata=src.nodata, dst_nodata=0)
        razao = abs(tr.a * tr.e) / abs(src.transform.a * src.transform.e)
    pop = np.where(pop > 0, pop, 0).astype(np.float64) * razao
    pop_grade = float(pop[dentro].sum())
    por_idx = np.bincount(primeira.ravel(), weights=pop.ravel(), minlength=n_cotas + 1)
    return [float(v) for v in np.cumsum(por_idx[1:])], pop_grade


def rodar(mun: str) -> None:
    cfg = cc.MUNICIPIOS[mun]
    slug = cfg["slug"]
    cotas = listar_cotas(cfg["raster_dir"])
    poly = cc.poligono_municipio(mun)
    print(f"\n=== {mun}: {len(cotas)} cotas ({cotas[0][0]} a {cotas[-1][0]} m)")

    with rasterio.open(cotas[0][1]) as src:
        W, S, E, N = poly.bounds
        W, S = max(W, src.bounds.left), max(S, src.bounds.bottom)
        E, N = min(E, src.bounds.right), min(N, src.bounds.top)
        win = from_bounds(W, S, E, N, src.transform).round_offsets().round_lengths()
        win = win.intersection(Window(0, 0, src.width, src.height))
        f = max(1, -(-max(win.width, win.height) // MAX_PX))  # fator inteiro de reducao (max-pooling)
        h, w = -(-win.height // f), -(-win.width // f)
        tr = src.window_transform(win) * rasterio.Affine.scale(f)
        bounds = rasterio.transform.array_bounds(h, w, tr)  # W, S, E, N
    print(f"  janela {int(win.width)}x{int(win.height)} -> {w}x{h}")

    primeira = np.zeros((h, w), dtype=np.uint8)  # 0 = nunca molhado
    for i, (cota, tif) in enumerate(cotas, start=1):
        with rasterio.open(tif) as src:
            d = ler_max(src, win, f, h, w)
        molhado = (d > 0) & (primeira == 0)
        primeira[molhado] = i
        print(f"  cota {cota:>6.2f}: +{int(molhado.sum()):>8,} px")

    dentro = features.rasterize([(poly, 1)], out_shape=(h, w), transform=tr, fill=0, dtype="uint8").astype(bool)
    primeira[~dentro] = 0

    pop_cota, pop_grade = populacao_por_cota(primeira, dentro, tr, len(cotas))
    print(f"  populacao na grade: {pop_grade:,.0f} hab.; atingida na ultima cota: {pop_cota[-1]:,.0f}")

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = primeira
    rgba[..., 3] = np.where(primeira > 0, 255, 0)
    out = DASH_DATA / slug
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(out / "cota_mapa.webp", "WEBP", lossless=True, method=6)

    west, south, east, north = bounds
    meta = {
        "cotas": [c for c, _ in cotas],
        "bounds": [west, south, east, north],
        "coordinates": [[west, north], [east, north], [east, south], [west, south]],
        "width": w, "height": h,
        "pop_por_cota": [round(v) for v in pop_cota], "pop_grade": round(pop_grade),
    }
    (out / "cota_mapa.json").write_text(json.dumps(meta), encoding="utf-8")
    print(f"  -> {out / 'cota_mapa.webp'} ({(out / 'cota_mapa.webp').stat().st_size / 1024:.0f} KB)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mun", choices=list(cc.MUNICIPIOS))
    args = ap.parse_args()
    for mun in ([args.mun] if args.mun else list(cc.MUNICIPIOS)):
        rodar(mun)


if __name__ == "__main__":
    main()
