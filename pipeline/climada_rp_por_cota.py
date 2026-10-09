"""
climada_rp_por_cota.py -- replica a metodologia do prototipo de Porto Alegre
(climada_risco_prototipo.py: dano fisico por PERIODO DE RETORNO, EAI e projecao 2050)
nos municipios que so tem rasters de profundidade por COTA do rio (Lajeado e Eldorado do
Sul), convertendo cada RP na cota correspondente.

Passos:
  1. RP -> cota na regua (analise de frequencia de cotas maximas anuais, ver COTA_POR_RP)
  2. cota na regua -> cota do raster (datum) e interpolacao entre os dois rasters vizinhos
     (profundidade por ponto), gerando a "profundidade do RP"
  3. mesmo calculo do prototipo: profundidade x curva MDD x valor de reposicao, EAI
     (calcular_eai) e projecao 2050 (calcular_projecao_2050), sem alteracao.
Saida no MESMO formato de climada_dano_fisico_prototipo.json, para a pagina /danos exibir
com o mesmo layout de Porto Alegre.

RP -> COTA (premissas, por municipio):

  Lajeado (rio Taquari): distribuicao de Gumbel ajustada por L-momentos a serie de cotas
    maximas anuais do SGB, 1939-2023 (parecer "Revisao e consolidacao da serie historica
    dos niveis das cheias do rio Taquari em Lajeado", Tabela 8, cota na regua do posto
    86879300), mais 2024 = 33,35 m (Governo de Lajeado; ainda nao consolidado pelo SGB).
    Arquivo: data/raw/series/lajeado_cotas_maximas_anuais.csv.
    Datum: os rasters (18.45 ... 34.45) estao em altitude ortometrica H; a regua le
    R = H + 0,55 (zero da regua em -0,55 m, CPRM 2015, Tabela 7 do mesmo parecer) -- por
    isso os rasters correspondem a R = 19 ... 35 m (19,00 = cota de inundacao). HIPOTESE
    deduzida do padrao "x.45" dos rasters, nao confirmada pelo autor dos rasters.
    Os rasters acabam em R = 35 m: RP200/RP500 (37,2 / 40,2 m pela Gumbel) ficam acima do
    ultimo raster e sao EXTRAPOLADOS (ver INTERPOLACAO): subestimam o dano, porque pontos
    que so molhariam acima de 35 m continuam secos.
    A GEV (cauda limitada) foi descartada: nao reproduz o evento de 2024.

  Eldorado do Sul (Guaiba, rasters de Porto Alegre): tabela publicada de niveis por tempo
    de retorno de Germano & Silva (ABRH, XIII SBRH), Log-Pearson III sobre 1899-1995, Doca
    4: RP2 1,79 | RP5 2,25 | RP10 2,56 | RP25 2,96 | RP50 3,27 | RP100 3,58 | RP610 4,75 m.
    RPs fora da tabela (20, 75, 200, 500) interpolados linearmente em log(RP).
    LIMITACOES: (a) tabela DEFASADA -- nao inclui 2024 (5,35 m), que por ela teria RP >>
    610 anos; subestima a frequencia das cheias altas; (b) assume que a cota dos rasters
    esta no mesmo referencial da regua da Doca 4 (nao verificado); (c) 20/524 empresas e
    4/45 unidades de saude ficam fora da grade (profundidade 0).

INTERPOLACAO ENTRE RASTERS (por ponto, cota alvo entre cota_lo e cota_hi, peso w):
  - molhado nas duas cotas: linear, d = d_lo + w (d_hi - d_lo)
  - seco em cota_lo, molhado em cota_hi: d = max(0, d_hi - (cota_hi - cota_alvo)) -- a
    lamina sobe junto com a cota; evita "molhar" o ponto antes da agua chegar nele
  - maximo acumulado entre cotas antes de interpolar (rasters de Lajeado nao monotonicos)
  - cota alvo ACIMA do ultimo raster (extrapolacao): pontos molhados no ultimo raster
    ganham a diferenca de cota, d = d_ultimo + (cota_alvo - cota_ultimo); pontos secos
    nele continuam secos (nao ha como saber onde a agua chegaria) -- subestima

HERDADO DE PORTO ALEGRE (premissas, nao calibracao local): fator de calibracao das
curvas (POA_CALIBRATION_FACTOR), remapeamento de frequencia 2025->2050 (RP_REMAP_2050) e
crescimento de 2%/ano. Mesmo metodo de EAI do prototipo (trapezio + caudas).

Uso:  python pipeline/climada_rp_por_cota.py [--mun "Lajeado" | "Eldorado do Sul"]
"""
import argparse
import csv
import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA, DATA_PROCESSED, DATA_RAW
from common import load_geojson
import climada_risco_prototipo as proto
import climada_cota as cc

SETORES = cc.SETORES
SERIE_LAJEADO = DATA_RAW / "series" / "lajeado_cotas_maximas_anuais.csv"
OFFSET_REGUA_LAJEADO = 0.55  # R (regua 86879300) = H (altitude ortometrica, datum dos rasters) + 0,55

# Germano & Silva (ABRH, XIII SBRH), Log-Pearson III, 1899-1995, Doca 4 (Guaiba)
GUAIBA_NIVEIS_TR = {2: 1.79, 5: 2.25, 10: 2.56, 25: 2.96, 50: 3.27, 100: 3.58, 610: 4.75}
GUAIBA_FONTE = "Germano & Silva, Determinacao dos niveis de enchente do Guaiba em Porto Alegre/RS (ABRH, XIII SBRH), Log-Pearson III, 1899-1995"


def gumbel_lmom(x: np.ndarray) -> tuple[float, float]:
    """Parametros (posicao, escala) da Gumbel por L-momentos."""
    x = np.sort(np.asarray(x, dtype=float))
    n = len(x)
    i = np.arange(1, n + 1)
    b0 = x.mean()
    b1 = ((i - 1) / (n - 1) * x).sum() / n
    escala = (2 * b1 - b0) / math.log(2)
    return b0 - 0.5772156649 * escala, escala


def cotas_lajeado() -> tuple[dict, dict]:
    with open(SERIE_LAJEADO, encoding="utf-8") as f:
        serie = [(int(r["ano"]), float(r["cota_regua_posto_86879300_m"])) for r in csv.DictReader(f)]
    xi, a = gumbel_lmom(np.array([v for _, v in serie]))
    regua = {rp: xi - a * math.log(-math.log(1 - 1 / proto.RP_ANOS[rp])) for rp in proto.RPS}
    meta = {
        "metodo": "Gumbel por L-momentos sobre cotas maximas anuais",
        "serie": f"SGB 1939-2023 (Tabela 8) + 2024 provisorio; n={len(serie)}",
        "fonte": "SGB, Revisao e consolidacao da serie historica dos niveis das cheias do rio Taquari em Lajeado de 1939 a 2023",
        "gumbel_posicao": round(xi, 3),
        "gumbel_escala": round(a, 3),
        "datum": f"cota do raster (altitude ortometrica) = cota na regua - {OFFSET_REGUA_LAJEADO:.2f} m (hipotese)".replace(".", ","),
    }
    return {rp: (r, r - OFFSET_REGUA_LAJEADO) for rp, r in regua.items()}, meta


def cotas_eldorado() -> tuple[dict, dict]:
    trs = sorted(GUAIBA_NIVEIS_TR)
    logs = [math.log(t) for t in trs]
    niveis = [GUAIBA_NIVEIS_TR[t] for t in trs]
    out = {}
    for rp in proto.RPS:
        n = float(np.interp(math.log(proto.RP_ANOS[rp]), logs, niveis))
        out[rp] = (n, n)
    meta = {
        "metodo": "tabela publicada de niveis por tempo de retorno; RPs ausentes interpolados em log(RP)",
        "serie": "Guaiba, Doca 4, 1899-1995 (nao inclui 2024)",
        "fonte": GUAIBA_FONTE,
        "tabela_tr_nivel_m": GUAIBA_NIVEIS_TR,
        "datum": "assume cota do raster = cota da regua da Doca 4 (nao verificado)",
    }
    return out, meta


COTA_POR_RP = {"Lajeado": cotas_lajeado, "Eldorado do Sul": cotas_eldorado}


def profundidade_na_cota(alvo: float, niveis: list[float], profs: dict) -> tuple[dict, dict]:
    """Profundidade por ponto na cota alvo, interpolando entre os rasters vizinhos (ver
    INTERPOLACAO no docstring). profs: {nivel: {setor: depths}} ja com cummax."""
    if alvo <= niveis[0]:
        # abaixo do primeiro raster: lamina desce junto com a cota
        return {s: np.maximum(profs[niveis[0]][s] - (niveis[0] - alvo), 0.0) for s in SETORES}, {"lo": None, "hi": niveis[0], "w": 0.0}
    if alvo > niveis[-1]:
        topo = niveis[-1]
        return {s: np.where(profs[topo][s] > 0, profs[topo][s] + (alvo - topo), 0.0) for s in SETORES}, {"lo": topo, "hi": None, "w": 0.0}
    hi_i = next(i for i, n in enumerate(niveis) if n >= alvo)
    lo, hi = niveis[hi_i - 1], niveis[hi_i]
    w = (alvo - lo) / (hi - lo)
    out = {}
    for s in SETORES:
        d_lo, d_hi = profs[lo][s], profs[hi][s]
        linear = d_lo + w * (d_hi - d_lo)
        chegada = np.maximum(d_hi - (hi - alvo), 0.0)
        out[s] = np.where(d_lo > 0, linear, chegada)
    return out, {"lo": lo, "hi": hi, "w": round(w, 3)}


def carregar_pontos(slug: str, mun: str) -> tuple[dict, dict, np.ndarray, dict]:
    """BASE dos 3 setores + coordenadas, mascara de industria e valor de reposicao por
    ponto (mesmas funcoes do prototipo). Compartilhado com climada_medidas.py."""
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
    return gjs, coords, is_ind, valores


def profundidades_por_rp(mun: str) -> dict:
    """Profundidade por ponto em cada RP, derivada dos rasters por cota (passos 1 e 2 do
    docstring). Retorna gjs, valores, is_ind, depths {rp: {setor: array}} e os metadados."""
    cfg = cc.MUNICIPIOS[mun]
    rasters = sorted(cfg["raster_dir"].glob("*_clip.tif"), key=lambda p: float(p.stem.split("_")[0]))
    niveis = [float(p.stem.split("_")[0]) for p in rasters]
    cota_rp, meta_freq = COTA_POR_RP[mun]()
    gjs, coords, is_ind, valores = carregar_pontos(cfg["slug"], mun)

    rps = list(proto.RPS)
    fora = [rp for rp in rps if cota_rp[rp][1] > niveis[-1]]  # extrapolados acima do ultimo raster
    print(f"\n== {mun} ==  RPs: {rps} | extrapolados acima do ultimo raster ({niveis[-1]}): {fora}")
    # So le os rasters necessarios (vizinhos de cada cota alvo dentro da faixa coberta)
    alvo_max = min(max(cota_rp[rp][1] for rp in rps), niveis[-1])
    usar = [n for n in niveis if n <= alvo_max] + [n for n in niveis if n > alvo_max][:1]
    profs, prev = {}, {s: np.zeros(len(coords[s])) for s in SETORES}
    for n, tif in zip(niveis, rasters):
        if n not in usar:
            continue
        print(f"  lendo raster {n}...", flush=True)
        d, _ = cc.amostrar_todos(tif, coords)
        prev = {s: np.maximum(d[s], prev[s]) for s in SETORES}  # cummax entre cotas
        profs[n] = prev
    niveis_lidos = sorted(profs)

    depths, rp_cota = {}, {}
    for rp in rps:
        regua, alvo = cota_rp[rp]
        depths[rp], interp = profundidade_na_cota(alvo, niveis_lidos, profs)
        rp_cota[rp] = {"cota_regua_m": round(regua, 2), "cota_raster_m": round(alvo, 2), "raster_inferior": interp["lo"], "raster_superior": interp["hi"], "peso_superior": interp["w"]}
    return {"slug": cfg["slug"], "gjs": gjs, "valores": valores, "is_ind": is_ind, "depths": depths,
            "rp_cota": rp_cota, "meta_freq": meta_freq, "fora": fora, "niveis": niveis}


def rodar(mun: str) -> None:
    d = profundidades_por_rp(mun)
    slug, gjs, valores, is_ind = d["slug"], d["gjs"], d["valores"], d["is_ind"]

    resultados = {}
    for rp, depths in d["depths"].items():
        resultados[rp] = {}
        total = 0.0
        for s in SETORES:
            r, _, _ = proto.calcular_dano_fisico(s, gjs[s], None, valores[s], is_ind if s == "empresas" else None, depths=depths[s])
            resultados[rp][s] = r
            total += r["dano_fisico_total_brl"]
        at = {s: resultados[rp][s]["n_atingidos_profundidade_gt_0"] for s in SETORES}
        c = d["rp_cota"][rp]
        print(f"  {rp:6s} regua {c['cota_regua_m']:5.2f} m (raster {c['cota_raster_m']:5.2f}): R$ {total/1e6:8.1f} mi | atingidos emp/esc/saude {at['empresas']}/{at['educacao']}/{at['saude']}")

    eai = proto.calcular_eai(resultados, SETORES)
    projecao = proto.calcular_projecao_2050(resultados, SETORES)
    if eai:
        print(f"  EAI: R$ {eai['total']/1e6:.1f} mi/ano ({eai['rps_usados']})")
    if projecao:
        t = projecao["total"]
        print(f"  2050: R$ {t['risco_2025_brl']/1e6:.1f} -> {t['risco_2050_brl']/1e6:.1f} mi/ano ({t['pct_climatico']:.0f}% clima)")

    out = DATA_PROCESSED / f"climada_dano_fisico_{slug}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump({
            "municipio": mun,
            "premissas": proto.montar_premissas(is_ind),
            "rp_por_cota": {
                "frequencia": d["meta_freq"],
                "rps": d["rp_cota"],
                "rps_acima_do_ultimo_raster": d["fora"],
                "cota_cobertura_raster_m": [d["niveis"][0], d["niveis"][-1]],
                "herdado_de_porto_alegre": ["fator de calibracao das curvas", "remapeamento de frequencia 2025-2050", "crescimento 2%/ano"],
            },
            "resultados_por_rp": resultados,
            "eai_anual_esperado": eai,
            "projecao_2050": projecao,
        }, f, ensure_ascii=False, indent=2)
    print(f"  Salvo: {out}")
    shutil.copyfile(out, DASH_DATA / out.name)
    print(f"  Copiado: {DASH_DATA / out.name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mun", default=None, choices=list(COTA_POR_RP), help="default: todos")
    args = ap.parse_args()
    for mun in ([args.mun] if args.mun else list(COTA_POR_RP)):
        rodar(mun)


if __name__ == "__main__":
    main()
