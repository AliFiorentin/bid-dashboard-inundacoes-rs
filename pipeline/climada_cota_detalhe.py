"""
climada_cota_detalhe.py -- indicadores do painel (por categoria) para cada COTA do rio, no
mesmo criterio do valor exposto (sem curva de dano): o que fica sob agua (profundidade > 0,
maximo acumulado entre cotas) em cada cota.

Categorias (mesmos campos das camadas BASE do painel):
  - empresas: estabelecimentos, empregados (qtd_vinculos), massa salarial, salario medio e valor
    exposto, no total e por setor CNAE (CNAE_2)
  - saude: estabelecimentos, leitos, profissionais (total e por categoria staff_*), valor exposto
    e por tipo de unidade
  - educacao: escolas, matriculas (total e por etapa), docentes, valor exposto e por dependencia
  - agricultura: area (ha) sob agua por cultura (MapBiomas {ANO_AGRI}); os poligonos sao
    rasterizados na grade do raster de profundidade e conta-se a area dos pixels com agua
    (pixel de ~5 m; a area do pixel varia com a latitude)

Pontos: mesma amostragem e mesmos valores de reposicao de climada_exposicao.py (nearest, 5 m;
nodata/<0 -> 0; cummax entre cotas). Coordenadas repetidas na base oficial NAO sao filtradas
(ver LIMITACAO em climada_cota.py): as pilhas entram/saem juntas.

Saida: data/processed/climada_cota_detalhe_{slug}.json (copiado para o Dashboard).

Uso:  python pipeline/climada_cota_detalhe.py [--mun "Lajeado" | "Eldorado do Sul" | "Porto Alegre"]
"""
import argparse
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import rasterio
from rasterio import features
from rasterio.windows import Window, from_bounds
from pyproj import Geod
from shapely.geometry import shape

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import load_geojson
from config import DASH_DATA, DATA_PROCESSED
import climada_cota as cc
import climada_rp_por_cota as rpc

ANO_AGRI = 2024
STAFF = ["staff_medicos", "staff_enfermagem", "staff_odontologia", "staff_farmacia", "staff_diag_lab_imagem",
         "staff_acs_endemias", "staff_admin_gestao_apoio", "staff_servicos_gerais", "staff_transporte_urgencia",
         "staff_outros_superior_saude", "staff_outros"]
ETAPAS = {"infantil": "qtd_mat_infantil", "fundamental": "qtd_mat_fundamental", "medio": "qtd_mat_medio",
          "profissional": "qtd_mat_profissional", "eja": "qtd_mat_eja", "especial": "qtd_mat_especial"}


def num(p: dict, k: str) -> float:
    v = p.get(k)
    try:
        v = float(v)
    except (TypeError, ValueError):
        return 0.0
    return v if np.isfinite(v) else 0.0


def nome_cultura(c: str) -> str:
    return (c or "").replace("Tempor�rias", "Temporárias")


def agrupar(props: list[dict], valores: np.ndarray, mask: np.ndarray, chave, campos: dict) -> list[dict]:
    """Agrega os pontos molhados por `chave`; campos = {saida: funcao(props)}."""
    acc = defaultdict(lambda: defaultdict(float))
    for i in np.flatnonzero(mask):
        k = chave(props[i]) or "(sem classificacao)"
        a = acc[k]
        a["n"] += 1
        a["valor_exposto_brl"] += float(valores[i])
        for nome, f in campos.items():
            a[nome] += f(props[i])
    return sorted(({"nome": k, **{kk: round(vv, 2) if kk.endswith("brl") else int(round(vv)) for kk, vv in v.items()}}
                   for k, v in acc.items()), key=lambda x: -x["valor_exposto_brl"])


def empresas(props, valores, mask):
    emp = lambda p: num(p, "qtd_vinculos")
    massa = lambda p: num(p, "massa_salarial")
    idx = np.flatnonzero(mask)
    empregados = sum(emp(props[i]) for i in idx)
    ms = sum(massa(props[i]) for i in idx)
    setores = agrupar(props, valores, mask, lambda p: p.get("CNAE_2"), {"empregados": emp, "massa_salarial_brl": massa})
    for s in setores:
        s["salario_medio_brl"] = round(s["massa_salarial_brl"] / s["empregados"], 2) if s["empregados"] else 0.0
    return {
        "n": int(mask.sum()), "empregados": int(empregados), "massa_salarial_brl": round(ms, 2),
        "salario_medio_brl": round(ms / empregados, 2) if empregados else 0.0,
        "valor_exposto_brl": round(float(valores[mask].sum()), 2), "setores": setores,
    }


def saude(props, valores, mask):
    idx = np.flatnonzero(mask)
    campos = {"leitos": lambda p: num(p, "leitos_total"), "profissionais": lambda p: num(p, "qtd_profissionais")}
    return {
        "n": int(mask.sum()),
        "leitos": int(sum(num(props[i], "leitos_total") for i in idx)),
        "profissionais": int(sum(num(props[i], "qtd_profissionais") for i in idx)),
        "valor_exposto_brl": round(float(valores[mask].sum()), 2),
        "staff": {k: int(sum(num(props[i], k) for i in idx)) for k in STAFF},
        "tipos": agrupar(props, valores, mask, lambda p: p.get("tp_unidade_label") or p.get("co_tipo_estabelecimento"), campos),
    }


def educacao(props, valores, mask):
    idx = np.flatnonzero(mask)
    campos = {"matriculas": lambda p: num(p, "qtd_mat_total"), "docentes": lambda p: num(p, "qtd_doc_total")}
    return {
        "n": int(mask.sum()),
        "matriculas": int(sum(num(props[i], "qtd_mat_total") for i in idx)),
        "docentes": int(sum(num(props[i], "qtd_doc_total") for i in idx)),
        "valor_exposto_brl": round(float(valores[mask].sum()), 2),
        "etapas": {k: int(sum(num(props[i], c) for i in idx)) for k, c in ETAPAS.items()},
        "dependencias": agrupar(props, valores, mask, lambda p: p.get("tp_dependencia_label"), campos),
    }


def carregar_agricultura(slug: str):
    g = load_geojson(DASH_DATA / slug / f"agricultura_{ANO_AGRI}_BASE.geojson")
    if not g or not g["features"]:
        return None
    geoms = [shape(f["geometry"]) for f in g["features"]]
    nomes = [nome_cultura(f["properties"].get("cultura")) for f in g["features"]]
    classes = sorted(set(nomes))
    ids = [classes.index(n) + 1 for n in nomes]
    # Area total por cultura = soma GEODESICA dos poligonos (elipsoide WGS84), independente da grade do raster
    geod = Geod(ellps="WGS84")
    total = {c: 0.0 for c in classes}
    for g_, n in zip(geoms, nomes):
        total[n] += abs(geod.geometry_area_perimeter(g_)[0]) / 1e4
    return geoms, ids, classes, {c: round(v, 2) for c, v in total.items()}


def area_pixel_ha(transform, rows: np.ndarray) -> np.ndarray:
    """Area (ha) de um pixel por linha: dx*cos(lat) * dy em metros (1 grau ~ 111.32 / 110.57 km)."""
    lat = transform.f + (rows + 0.5) * transform.e
    dx = abs(transform.a) * 111320.0 * np.cos(np.radians(lat))
    dy = abs(transform.e) * 110574.0
    return dx * dy / 1e4


def agricultura_por_cota(agri, tifs: list[Path]):
    geoms, ids, classes, _ = agri
    minx = min(g.bounds[0] for g in geoms); miny = min(g.bounds[1] for g in geoms)
    maxx = max(g.bounds[2] for g in geoms); maxy = max(g.bounds[3] for g in geoms)
    out, prev, cobertura, area_total = {}, None, None, None
    for tif in tifs:
        cota = tif.stem.split("_")[0]
        with rasterio.open(tif) as src:
            win = from_bounds(minx, miny, maxx, maxy, src.transform).round_offsets().round_lengths()
            win = win.intersection(Window(0, 0, src.width, src.height))
            if win.width <= 0 or win.height <= 0:
                out[cota] = {"area_ha": 0.0, "culturas": {c: 0.0 for c in classes}}
                continue
            arr = src.read(1, window=win)
            tr = src.window_transform(win)
            nd = src.nodata
            wet = np.isfinite(arr) & (arr > 0)
            if nd is not None:
                wet &= arr != nd
            if prev is None or prev.shape != wet.shape:
                prev = np.zeros_like(wet)
                lab = features.rasterize(zip(geoms, ids), out_shape=arr.shape, transform=tr, fill=0, dtype="int16")
                ha = area_pixel_ha(tr, np.arange(arr.shape[0]))[:, None] * np.ones((1, arr.shape[1]))
                area_total = {c: float(ha[lab == i + 1].sum()) for i, c in enumerate(classes)}
            prev = prev | wet  # maximo acumulado entre cotas
            cult = {c: round(float(ha[(lab == i + 1) & prev].sum()), 2) for i, c in enumerate(classes)}
            out[cota] = {"area_ha": round(sum(cult.values()), 2), "culturas": cult}
    return out, {c: round(v, 2) for c, v in (area_total or {}).items()}  # area na grade do raster (so referencia)


def maior_pilha(setor: str, props: list[dict], coords: np.ndarray, valores: np.ndarray) -> dict:
    """Maior pilha de coordenadas repetidas do setor: quantos pontos, de quantas ruas/bairros
    distintos (muitas ruas num so ponto = geocodificacao cai num ponto padrao, nao um endereco
    real) e o valor de reposicao. A cota de entrada e o impacto no valor exposto vem depois."""
    c = np.round(coords, 7)
    u, inv, cnt = np.unique(c, axis=0, return_inverse=True, return_counts=True)
    inv = inv.ravel()
    t = int(cnt.argmax())
    idx = np.flatnonzero(inv == t)
    k_rua, k_bairro = ("ds_endereco", "no_bairro") if setor == "educacao" else ("rua", "bairro")
    return {
        "n_pontos": int(len(idx)), "lon": float(u[t][0]), "lat": float(u[t][1]),
        "ruas_distintas": len({str(props[i].get(k_rua)) for i in idx}),
        "bairros_distintos": len({str(props[i].get(k_bairro)) for i in idx}),
        "valor_reposicao_brl": round(float(valores[idx].sum()), 2),
        "_idx": idx,
    }


def rodar(mun: str) -> None:
    cfg = cc.MUNICIPIOS[mun]
    gjs, coords, is_ind, valores = rpc.carregar_pontos(cfg["slug"], mun, filtrar=True)
    props = {s: [f["properties"] for f in g["features"]] for s, g in gjs.items()}
    tifs = sorted(cfg["raster_dir"].glob("*_clip.tif"), key=lambda p: float(p.stem.split("_")[0]))
    if not tifs:
        sys.exit(f"ERRO: sem rasters em {cfg['raster_dir']}")
    funcs = {"empresas": empresas, "saude": saude, "educacao": educacao}
    prev = {s: np.zeros(len(coords[s])) for s in funcs}
    pilhas = {s: maior_pilha(s, props[s], coords[s], valores[s]) for s in funcs}
    por_cota = {}
    for tif in tifs:
        cota = tif.stem.split("_")[0]
        print(f"  {mun} cota {cota}...", flush=True)
        profs, _ = cc.amostrar_todos(tif, coords)
        prev = {s: np.maximum(profs[s], prev[s]) for s in funcs}
        por_cota[cota] = {s: funcs[s](props[s], valores[s], prev[s] > 0) for s in funcs}
        for s, pl in pilhas.items():
            if "cota_entrada" not in pl and (prev[s][pl["_idx"]] > 0).any():
                pl["cota_entrada"] = cota
    ks = list(por_cota)
    for s, pl in pilhas.items():
        pl.pop("_idx")
        ent = pl.get("cota_entrada")
        if ent:
            i = ks.index(ent)
            pl["valor_exposto_antes_brl"] = por_cota[ks[i - 1]][s]["valor_exposto_brl"] if i > 0 else 0.0
            pl["valor_exposto_na_entrada_brl"] = por_cota[ent][s]["valor_exposto_brl"]
    agri = carregar_agricultura(cfg["slug"])
    area_total, area_na_grade = {}, {}
    if agri:
        ag, area_na_grade = agricultura_por_cota(agri, tifs)
        area_total = agri[3]
        for cota, v in ag.items():
            por_cota[cota]["agricultura"] = v
    out = {
        "municipio": mun,
        "indicador": "o que fica sob agua (profundidade > 0, maximo acumulado entre cotas) em cada cota; sem curva de dano",
        "ano_agricultura": ANO_AGRI,
        "area_agricola_total_ha": area_total,
        "area_agricola_na_grade_ha": area_na_grade,
        "totais": {s: {"n": len(props[s])} for s in funcs},
        "pontos_excluidos_fora_do_municipio": cc.EXCLUIDOS.get(mun),
        "maior_pilha": pilhas,
        "por_cota": por_cota,
    }
    path = DATA_PROCESSED / f"climada_cota_detalhe_{cfg['slug']}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    shutil.copyfile(path, DASH_DATA / path.name)
    print(f"  Salvo: {path}\n  Copiado: {DASH_DATA / path.name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mun", default=None, choices=list(cc.MUNICIPIOS), help="default: todos")
    args = ap.parse_args()
    for mun in ([args.mun] if args.mun else list(cc.MUNICIPIOS)):
        rodar(mun)


if __name__ == "__main__":
    main()
