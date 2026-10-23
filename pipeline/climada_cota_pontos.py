"""
climada_cota_pontos.py -- cota de entrada (1a cota molhada) de CADA ponto das bases de empresas,
educacao e saude, para o Dashboard filtrar os pontos atingidos em cada cota do slider
("Todas as cotas") com EXATAMENTE a mesma amostragem da aba "Por cota" (pixel de ~5 m,
vizinho mais proximo, maximo acumulado entre cotas -- ver climada_cota.py e climada_cota_detalhe.py).

Antes o Dashboard amostrava o raster reduzido (cota_mapa.webp, ~10-20 m) no navegador, o que dava
contagens ligeiramente diferentes das da aba "Por cota" (ex.: 48 x 45 empresas).

Saida: Dashboard BID/public/dados_convertidos/{slug}/cota_pontos.json
  {
    "cotas": [18.45, 19.45, ...],                 # rasters em ordem crescente
    "n": {"empresas": N, ...},                    # numero de pontos da BASE (para validar o alinhamento)
    "idx": {"empresas": [i0, i1, ...], ...}       # por ponto, NA ORDEM de {setor}_BASE.geojson:
  }                                               #   k >= 1 = indice (1..N) da 1a cota molhada
                                                  #   0 = nunca molhado; -1 = fora do municipio (excluido)

Um ponto esta atingido na cota de indice j se 1 <= k <= j.

Uso:  python pipeline/climada_cota_pontos.py [--mun "Lajeado" | "Eldorado do Sul" | "Porto Alegre"]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from shapely import contains_xy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import load_geojson
from config import DASH_DATA
import climada_cota as cc

SETORES = ["empresas", "educacao", "saude"]


def rodar(mun: str) -> None:
    cfg = cc.MUNICIPIOS[mun]
    slug = cfg["slug"]
    tifs = sorted(cfg["raster_dir"].glob("*_clip.tif"), key=lambda p: float(p.stem.split("_")[0]))
    if not tifs:
        sys.exit(f"ERRO: nenhum raster em {cfg['raster_dir']}")

    gjs = {s: load_geojson(DASH_DATA / slug / f"{s}_BASE.geojson") for s in SETORES}
    for s, g in gjs.items():
        if not g:
            sys.exit(f'ERRO: BASE de {s} nao encontrada -- rode 06_geojson.py --mun "{mun}"')
    coords = {s: np.array([f["geometry"]["coordinates"][:2] for f in g["features"]], dtype=float) for s, g in gjs.items()}

    poly = cc.poligono_municipio(mun)
    dentro = {s: contains_xy(poly, c[:, 0], c[:, 1]) for s, c in coords.items()}

    idx = {s: np.zeros(len(c), dtype=np.int32) for s, c in coords.items()}
    for i, tif in enumerate(tifs, start=1):
        print(f"  {mun} cota {tif.stem.split('_')[0]}...", flush=True)
        profs, _ = cc.amostrar_todos(tif, coords)
        for s in SETORES:
            novo = (profs[s] > 0) & (idx[s] == 0)
            idx[s][novo] = i  # 1a cota molhada == maximo acumulado > 0
    for s in SETORES:
        idx[s][~dentro[s]] = -1

    out = {
        "cotas": [float(t.stem.split("_")[0]) for t in tifs],
        "n": {s: int(len(idx[s])) for s in SETORES},
        "idx": {s: idx[s].tolist() for s in SETORES},
    }
    dest = DASH_DATA / slug / "cota_pontos.json"
    dest.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    resumo = ", ".join(f"{s}: {int((idx[s] > 0).sum())}/{int(dentro[s].sum())} atingidos na ultima cota" for s in SETORES)
    print(f"  -> {dest} ({dest.stat().st_size / 1024:.0f} KB) | {resumo}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mun", choices=list(cc.MUNICIPIOS))
    args = ap.parse_args()
    for mun in ([args.mun] if args.mun else list(cc.MUNICIPIOS)):
        rodar(mun)


if __name__ == "__main__":
    main()
