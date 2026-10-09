"""
climada_cota.py -- dano fisico (metodologia CLIMADA: profundidade x curva MDD x valor de
reposicao) por COTA do rio, para municipios com rasters de profundidade indexados por
cota (Lajeado, Eldorado do Sul e Porto Alegre). Reaproveita curvas, valores de reposicao
e portes de climada_risco_prototipo.py (Porto Alegre, por RP) sem alterar aquele script.

Entrada: rasters de profundidade (m) por cota, EPSG:4326, ~5 m/pixel, nodata -9999.
  - Lajeado: Downloads/Lajeado_WGS84/Profundidade_WGS84/{cota}_clip.tif (18.45 a 34.45,
    passo 1 m)
  - Porto Alegre e Eldorado do Sul: MESMOS rasters, Downloads/POA_WGS84/Profundidade_WGS84
    (1.75 a 6.00, passo 0,25 m); o raster cobre os dois municipios e cada um e' amostrado
    com seus proprios pontos. A parte oeste de Eldorado do Sul fica FORA da grade (lon <
    -51.626): esses pontos entram com profundidade 0 (subestima) e sao contados no
    diagnostico (pontos_fora_do_raster).

CALIBRACAO (premissa, nao calibracao propria): as curvas de Empresas e Saude usam o
fator de Porto Alegre (POA_CALIBRATION_FACTOR = 0,360351, ancorado no evento de 2024 do
exercicio CLIMADA de POA). Nao ha perda observada usada aqui. O script roda tambem a
curva JRC CRUA (fator 1) como sensibilidade -- a faixa entre as duas e' a incerteza da
calibracao. Educacao usa a curva de escolas do CLIMADA (nao reescalada).

NAO calcula EAI: os rasters nao tem periodo de retorno/frequencia, so cota. EAI exige a
ligacao cota -> probabilidade (serie historica de cotas), ainda nao disponivel.

Uso dos rasters: as manchas por cota servem SO ao calculo CLIMADA -- nao entram em
config.MANCHAS/cenarios do painel (as manchas antigas continuam so para visualizacao).

Tratamento por ponto:
  - profundidade amostrada no pixel do ponto (nearest, 5 m); nodata/<0 -> 0
  - cummax entre cotas por ponto (dano nao diminui quando a cota sobe): os rasters de
    Lajeado tem celulas que ficam mais rasas com cota maior
  - pontos molhados ja na cota mais baixa sao reportados no diagnostico, NAO excluidos:
    sem cota nao ha cenario, entao a area molhada de uma cota e' alagamento daquele
    cenario, nao "agua permanente".

LIMITACAO -- coordenadas repetidas na base oficial: as bases de origem (RAIS/CNES/Censo
Escolar, geocodificadas) trazem muitos estabelecimentos na MESMA coordenada, tipico de
endereco incompleto ou geocode no centroide de rua/bairro. As contagens por municipio
vao no JSON (diagnostico.coordenadas_repetidas); ex. Lajeado: empresas 3.443 em 649
coordenadas (maior pilha 300), saude 587 em 384 (87). A base e' mantida como reportada
pelo governo (nao ha filtro nem correcao); consequencia: o dano por cota sobe em DEGRAUS,
pois cada pilha entra ou sai da mancha inteira de uma vez, e a profundidade atribuida a
uma pilha e' a de um unico pixel de 5 m. Tratar o resultado por cota como ordem de
grandeza.

Uso:  python pipeline/climada_cota.py [--mun "Lajeado" | "Eldorado do Sul" | "Porto Alegre"]
      (default: todos)
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window, from_bounds

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA, DATA_PROCESSED
from common import load_geojson
import climada_risco_prototipo as proto

POA_RASTERS = Path(r"C:\Users\Alisson Fiorentin\Downloads\POA_WGS84\Profundidade_WGS84")
MUNICIPIOS = {
    "Lajeado": {
        "slug": "lajeado",
        "raster_dir": Path(r"C:\Users\Alisson Fiorentin\Downloads\Lajeado_WGS84\Profundidade_WGS84"),
        "raster_nota": "Rasters de Lajeado (Taquari), 18.45 a 34.45 m, passo 1 m.",
    },
    "Eldorado do Sul": {
        "slug": "eldorado_do_sul",
        "raster_dir": POA_RASTERS,
        "raster_nota": "Rasters de Porto Alegre (cota do Guaiba), 1.75 a 6.00 m, passo 0,25 m, amostrados nos pontos de Eldorado do Sul; a parte oeste do municipio fica fora da grade.",
    },
    "Porto Alegre": {
        "slug": "porto_alegre",
        "raster_dir": POA_RASTERS,
        "raster_nota": "Rasters por cota do Guaiba, 1.75 a 6.00 m, passo 0,25 m (visao complementar aos RP10-RP500 do prototipo).",
    },
}
SETORES = ["empresas", "educacao", "saude"]


def curvas(fator: float) -> dict:
    """Curvas MDD por setor. fator=POA_CALIBRATION_FACTOR reproduz o prototipo de POA;
    fator=1.0 e' a JRC crua (Educacao nao muda: curva do CLIMADA, sem reescala)."""
    if fator == proto.POA_CALIBRATION_FACTOR:
        return {
            "empresas": proto.CURVAS_MDD["empresas"],
            "empresas_industria": proto.CURVAS_MDD["empresas_industria"],
            "educacao": proto.CURVAS_MDD["educacao"],
            "saude": proto.CURVAS_MDD["saude"],
        }
    return {
        "empresas": proto._scale(proto._JRC_SA_COMMERCE, fator),
        "empresas_industria": proto._scale(proto._JRC_SA_INDUSTRY, fator),
        "educacao": proto.CURVAS_MDD["educacao"],
        "saude": proto._blend_and_scale(proto._JRC_SA_COMMERCE, proto._JRC_SA_INDUSTRY, fator),
    }


def mdd(setor: str, depths: np.ndarray, cv: dict, is_ind) -> np.ndarray:
    def f(c):
        return np.interp(depths, c["depth"], c["mdd"], left=0.0, right=c["mdd"][-1])
    if setor == "empresas":
        return np.where(is_ind, f(cv["empresas_industria"]), f(cv["empresas"]))
    return f(cv[setor])


def amostrar_todos(tif: Path, coords: dict) -> tuple[dict, dict]:
    """Profundidade (m) por ponto para todos os setores, lendo UMA janela do raster (bbox
    de todos os pontos). Retorna ({setor: depths}, {setor: n_pontos_fora_da_grade})."""
    todos = np.vstack(list(coords.values()))
    with rasterio.open(tif) as src:
        nd = src.nodata
        win = from_bounds(todos[:, 0].min(), todos[:, 1].min(), todos[:, 0].max(), todos[:, 1].max(), src.transform)
        win = win.round_offsets().round_lengths()
        win = Window(win.col_off - 2, win.row_off - 2, win.width + 4, win.height + 4)
        win = win.intersection(Window(0, 0, src.width, src.height))
        arr = src.read(1, window=win)
        r0, c0 = int(win.row_off), int(win.col_off)
        out, fora = {}, {}
        for s, c in coords.items():
            rows, cols = rasterio.transform.rowcol(src.transform, c[:, 0], c[:, 1])
            rows, cols = np.asarray(rows), np.asarray(cols)
            # "fora da grade" = fora do raster inteiro (nao so da janela lida)
            dentro = (rows >= 0) & (rows < src.height) & (cols >= 0) & (cols < src.width)
            rw, cw = rows - r0, cols - c0
            ok = (rw >= 0) & (rw < arr.shape[0]) & (cw >= 0) & (cw < arr.shape[1])
            v = np.zeros(len(c))
            v[ok] = arr[rw[ok], cw[ok]]
            if nd is not None:
                v[v == nd] = 0.0
            v[~np.isfinite(v)] = 0.0
            v[v < 0] = 0.0
            out[s], fora[s] = v, int((~dentro).sum())
    return out, fora


def pilhas(c: np.ndarray) -> dict:
    """Estatistica de coordenadas repetidas (ver LIMITACAO no docstring)."""
    _, counts = np.unique(np.round(c, 7), axis=0, return_counts=True)
    return {"n_pontos": int(len(c)), "n_coordenadas_unicas": int(len(counts)), "maior_pilha": int(counts.max())}


def rodar(mun: str) -> None:
    cfg = MUNICIPIOS[mun]
    slug = cfg["slug"]
    cotas = sorted(cfg["raster_dir"].glob("*_clip.tif"), key=lambda p: float(p.stem.split("_")[0]))
    if not cotas:
        sys.exit(f"ERRO: nenhum raster em {cfg['raster_dir']}")

    gjs = {s: load_geojson(DASH_DATA / slug / f"{s}_BASE.geojson") for s in SETORES}
    for s, g in gjs.items():
        if not g:
            sys.exit(f'ERRO: BASE de {s} nao encontrada -- rode 06_geojson.py --mun "{mun}"')

    coords = {s: np.array([f["geometry"]["coordinates"][:2] for f in g["features"]], dtype=float) for s, g in gjs.items()}
    is_ind = proto.classificar_empresas_industria(gjs["empresas"])
    valores = {}
    for s, g in gjs.items():
        porte = proto.porte_por_ponto(s, g)
        valores[s] = proto.valor_por_ponto_reposicao(s, porte, is_ind) if s == "empresas" else proto.valor_por_ponto_reposicao(s, porte)

    cenarios = {"poa": curvas(proto.POA_CALIBRATION_FACTOR), "jrc_crua": curvas(1.0)}
    resultados = {}
    prev = {s: np.zeros(len(coords[s])) for s in SETORES}
    fora = {}
    primeira = {}
    print(f"\n== {mun} ({len(cotas)} cotas) ==")
    for tif in cotas:
        cota = tif.stem.split("_")[0]
        print(f"  cota {cota}...", flush=True)
        profs, fora = amostrar_todos(tif, coords)
        res_cota = {}
        for s in SETORES:
            d = np.maximum(profs[s], prev[s])  # cummax entre cotas
            prev[s] = d
            if s not in primeira:
                primeira[s] = int((d > 0).sum())
            res_s = {
                "n_total": len(d),
                "n_atingidos": int((d > 0).sum()),
                "profundidade_media_atingidos_m": round(float(d[d > 0].mean()), 3) if (d > 0).any() else 0.0,
                "profundidade_max_m": round(float(d.max()), 3),
                "exposicao_total_brl": round(float(valores[s].sum()), 2),
            }
            for nome, cv in cenarios.items():
                dano = mdd(s, d, cv, is_ind if s == "empresas" else None) * valores[s]
                res_s[f"dano_fisico_brl_{nome}"] = round(float(dano.sum()), 2)
            res_cota[s] = res_s
        resultados[cota] = res_cota

    diag = {
        "pontos_molhados_na_cota_mais_baixa": {s: primeira[s] for s in SETORES},
        "pontos_fora_do_raster": fora,
        "n_pontos": {s: int(len(coords[s])) for s in SETORES},
        "coordenadas_repetidas": {s: pilhas(coords[s]) for s in SETORES},
        "cota_mais_baixa": cotas[0].stem.split("_")[0],
        "cota_mais_alta": cotas[-1].stem.split("_")[0],
    }

    print(f"  {mun} -- dano fisico total (R$ mi) por cota [fator POA | JRC crua]")
    for cota, r in resultados.items():
        t_poa = sum(r[s]["dano_fisico_brl_poa"] for s in SETORES) / 1e6
        t_cru = sum(r[s]["dano_fisico_brl_jrc_crua"] for s in SETORES) / 1e6
        at = {s: r[s]["n_atingidos"] for s in SETORES}
        print(f"    {cota:>6}: {t_poa:>10,.1f} | {t_cru:>10,.1f}   atingidos emp/esc/saude: {at['empresas']}/{at['educacao']}/{at['saude']}")
    print(f"  Diagnostico: {diag}")

    out = DATA_PROCESSED / f"climada_cota_{slug}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({
            "municipio": mun,
            "premissas": {
                "calibracao": "fator de Porto Alegre (POA_CALIBRATION_FACTOR) herdado como premissa; sem perda observada por cota",
                "poa_calibration_factor": proto.POA_CALIBRATION_FACTOR,
                "sensibilidade": "jrc_crua = fator 1.0 (Educacao inalterada)",
                "cummax_entre_cotas": True,
                "eai": "nao calculado -- rasters sem periodo de retorno/frequencia",
                "uso_dos_rasters": "so calculo CLIMADA; nao entram em cenarios do painel (manchas antigas = so visual)",
                "raster_nota": cfg["raster_nota"],
                "curvas_poa": {k: v for k, v in cenarios["poa"].items()},
            },
            "diagnostico": diag,
            "resultados_por_cota": resultados,
        }, f, ensure_ascii=False, indent=2)
    print(f"  Salvo: {out}")
    dash = DASH_DATA / out.name  # a pagina /danos (aba CLIMADA) le este arquivo
    shutil.copyfile(out, dash)
    print(f"  Copiado: {dash}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mun", default=None, choices=list(MUNICIPIOS), help="default: todos")
    args = ap.parse_args()
    for mun in ([args.mun] if args.mun else list(MUNICIPIOS)):
        rodar(mun)


if __name__ == "__main__":
    main()
