"""
climada_exposicao.py -- CLIMADA de Lajeado SEM curva de dano (sem JRC): o que da' para
calcular so' com profundidade por ponto, frequencia (RP) e valor de reposicao.

Sem curva profundidade -> fracao destruida nao ha' DANO em R$. O indicador e' o VALOR
EXPOSTO ATINGIDO: valor de reposicao dos pontos com profundidade > 0 (teto do dano: equivale
a assumir perda total de tudo que molha). Todo o resto da cadeia CLIMADA usa esse indicador
no lugar do dano, com as mesmas funcoes de climada_risco_prototipo.py:
  - por RP (RP10..RP500, profundidade derivada das cotas -- climada_rp_por_cota.py)
  - por cota do rio (rasters 18.45..34.45 m)
  - faixas de profundidade (<=0,5 | 0,5-1 | 1-2 | 2-3 | >3 m): gravidade sem premissa de curva
  - "exposicao atingida anual esperada" (EAI do valor exposto): trapezio + caudas, hoje e 2050
  - medidas que NAO dependem de curva: protecao coletiva (dique ate RP20/RP100), vedacao do
    imovel (-45% do valor atingido onde a profundidade e' <= 1 m, Kreibich et al. 2015) e
    relocacao parcial. FORA (atuam sobre a fracao destruida): alerta antecipado, estoque elevado.

CUSTO-BENEFICIO (so o que os dados sustentam): o beneficio e' em valor EXPOSTO (teto, nao dano),
entao toda razao B/C e' um MAXIMO. Valor presente 2025-2050 e desconto como em climada_medidas.py.
  - Custo de EQUILIBRIO de cada medida = VP do beneficio (sem cauda assumida): quanto ela poderia
    custar e ainda se pagar, mesmo supondo perda total do que molha. Vale para todas as medidas.
  - Custos pelas mesmas regras de climada_medidas.py (CUSTOS, com fonte em cada medida): diques
    pela proporcao custo/exposicao do programa de Porto Alegre, relocacao = 60% do valor de
    reposicao dos pontos relocados, vedacao = US$ 45 mil por edificacao (Aerts 2018), uma por
    coordenada atingida no RP500.

Nada aqui e' dano, calibracao ou perda: e' exposicao. Premissas herdadas de climada_rp_por_cota
(frequencia: Gumbel/SGB; datum -0,55 m; RP200/RP500 extrapolados acima do ultimo raster;
remapeamento 2050 e crescimento 2%/ano de Porto Alegre) e as limitacoes de coordenadas
repetidas (pontos empilhados entram/saem juntos).

Uso:  python pipeline/climada_exposicao.py
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA, DATA_PROCESSED
import climada_risco_prototipo as proto
import climada_cota as cc
import climada_rp_por_cota as rpc
import climada_medidas as cm

MUN = "Lajeado"
SETORES = cc.SETORES
FAIXAS = [(0.0, 0.5, "ate_0_5m"), (0.5, 1.0, "0_5_a_1m"), (1.0, 2.0, "1_a_2m"), (2.0, 3.0, "2_a_3m"), (3.0, np.inf, "acima_3m")]
# medidas do CLIMADA que independem da curva de dano (as de MDD ficam de fora)
MEDIDAS_SEM_CURVA = ["dique_rp20", "dique_rp100", "protecao_imovel", "relocacao"]


def resumo_setor(d: np.ndarray, v: np.ndarray) -> dict:
    w = d > 0
    r = {
        "n_total": int(len(d)),
        "n_atingidos": int(w.sum()),
        "valor_exposto_atingido_brl": round(float(v[w].sum()), 2),
        "exposicao_total_brl": round(float(v.sum()), 2),
        "profundidade_media_atingidos_m": round(float(d[w].mean()), 3) if w.any() else 0.0,
        "profundidade_max_m": round(float(d.max()), 3),
        "faixas_valor_brl": {k: round(float(v[(d > a) & (d <= b)].sum()), 2) for a, b, k in FAIXAS},
    }
    return r


def expostos(d: dict, medida: dict | None) -> dict:
    """{setor: [valor exposto atingido por RP]} com a medida aplicada (None = sem medida)."""
    m = medida or {}
    rps = list(d["depths"])
    valores = dict(d["valores"])
    if "reloc" in m:
        for s, frac in m["reloc"].items():
            ref = d["depths"]["RP100"][s]
            n = min(int(round(frac * len(ref))), int((ref > 0).sum()))
            if n > 0:
                idx = np.argsort(-ref, kind="stable")[:n]
                v = valores[s].copy()
                v[idx] *= 1 - m["reloc_valor"]
                valores[s] = v
    out = {}
    for s in SETORES:
        linha = []
        for rp in rps:
            prof = d["depths"][rp][s]
            peso = np.ones(len(prof))
            if "vedacao" in m:  # vedacao: -45% do valor atingido onde a profundidade e' <= 1 m (teto)
                v = m["vedacao"]
                peso = np.where((prof > 0) & (prof <= v["limite_m"]), 1 - v["reducao"], 1.0)
            linha.append(float((valores[s] * peso)[prof > 0].sum()))
        out[s] = linha
    return out


def por_cota(d: dict) -> dict:
    cfg = cc.MUNICIPIOS[MUN]
    gjs, coords, is_ind, valores = d["gjs"], None, d["is_ind"], d["valores"]
    coords = {s: np.array([f["geometry"]["coordinates"][:2] for f in g["features"]], dtype=float) for s, g in gjs.items()}
    rasters = sorted(cfg["raster_dir"].glob("*_clip.tif"), key=lambda p: float(p.stem.split("_")[0]))
    prev = {s: np.zeros(len(coords[s])) for s in SETORES}
    out = {}
    for tif in rasters:
        cota = tif.stem.split("_")[0]
        print(f"  cota {cota}...", flush=True)
        profs, _ = cc.amostrar_todos(tif, coords)
        prev = {s: np.maximum(profs[s], prev[s]) for s in SETORES}
        out[cota] = {s: resumo_setor(prev[s], valores[s]) for s in SETORES}
    return out


def main():
    d = rpc.profundidades_por_rp(MUN)
    rps = list(d["depths"])

    resultados = {rp: {s: resumo_setor(d["depths"][rp][s], d["valores"][s]) for s in SETORES} for rp in rps}
    for rp in rps:
        tot = sum(resultados[rp][s]["valor_exposto_atingido_brl"] for s in SETORES)
        at = {s: resultados[rp][s]["n_atingidos"] for s in SETORES}
        print(f"  {rp:6s}: valor exposto atingido R$ {tot/1e6:8.1f} mi | atingidos emp/esc/saude {at['empresas']}/{at['educacao']}/{at['saude']}")

    # Mesma integral do prototipo, sobre o valor exposto atingido
    proxy = {rp: {s: {"dano_fisico_total_brl": resultados[rp][s]["valor_exposto_atingido_brl"]} for s in SETORES} for rp in rps}
    eai = proto.calcular_eai(proxy, SETORES)
    projecao = proto.calcular_projecao_2050(proxy, SETORES)
    base = cm.metricas(rps, expostos(d, None))
    print(f"  Exposicao atingida anual esperada: R$ {eai['total']/1e6:.1f} mi/ano (sem cauda assumida {base['eai_sem_cauda']/1e6:.1f}) | 2050 {base['eai_2050']/1e6:.1f}")

    medidas = []
    for m in [x for x in cm.MEDIDAS if x["id"] in MEDIDAS_SEM_CURVA]:
        r = cm.metricas(rps, expostos(d, m), m.get("corte_rp"))
        item = {
            "id": m["id"], "nome": m["nome"], "mecanismo": m["mecanismo"],
            "fonte": m["fonte"], "fonte_url": m["fonte_url"],
            "eai_evitado_brl": round(base["eai"] - r["eai"], 2),
            "pct_evitado": round(100 * (base["eai"] - r["eai"]) / base["eai"], 1) if base["eai"] else 0.0,
            "eai_evitado_sem_cauda_brl": round(base["eai_sem_cauda"] - r["eai_sem_cauda"], 2),
            "pct_evitado_sem_cauda": round(100 * (base["eai_sem_cauda"] - r["eai_sem_cauda"]) / base["eai_sem_cauda"], 1) if base["eai_sem_cauda"] else 0.0,
            "eai_2050_evitado_brl": round(base["eai_2050"] - r["eai_2050"], 2) if base["eai_2050"] is not None else None,
            "evitado_por_setor_brl": {s: round(base["eai_por_setor"][s] - r["eai_por_setor"][s], 2) for s in SETORES},
        }
        # custo-beneficio: ver docstring (teto; custo so' onde ha' fonte)
        perda_b, perda_m = expostos(d, None), expostos(d, m)
        b, rr = cm.metricas(rps, perda_b), cm.metricas(rps, perda_m, m.get("corte_rp"))
        vp_t = cm.valor_presente(b["eai"] - rr["eai"], b["eai_2050"] - rr["eai_2050"])
        vp_sc = cm.valor_presente(b["eai_sem_cauda"] - rr["eai_sem_cauda"], b["eai_2050_sem_cauda"] - rr["eai_2050_sem_cauda"])
        custo, _ = cm.custo_medida(m["id"], d)
        cdef = cm.CUSTOS[m["id"]]
        item["custo_beneficio"] = {
            "custo_brl": round(custo, 2) if custo else None,
            "custo_descricao": cdef["descricao"],
            "custo_fonte": cdef["fonte"],
            "custo_fonte_url": cdef["fonte_url"],
            "setores_com_custo": list(SETORES) if custo else [],
            "beneficio_vp_brl": round(vp_t, 2),
            "beneficio_vp_sem_cauda_brl": round(vp_sc, 2),
            "bc": round(vp_t / custo, 2) if custo else None,
            "bc_sem_cauda": round(vp_sc / custo, 2) if custo else None,
            "custo_equilibrio_brl": round(vp_sc, 2),
        }
        medidas.append(item)
        print(f"  {m['id']:16s} evita R$ {item['eai_evitado_brl']/1e6:7.2f} mi/ano ({item['pct_evitado']:5.1f}%) | sem cauda {item['pct_evitado_sem_cauda']:5.1f}%")
    medidas.sort(key=lambda x: -x["eai_evitado_sem_cauda_brl"])

    out = {
        "municipio": MUN,
        "indicador": "valor exposto atingido (valor de reposicao dos pontos com profundidade > 0); NAO e' dano",
        "premissas": {
            "sem_curva": True,
            "leitura": "teto do dano: equivale a perda total de tudo que molha; sem curva JRC nem calibracao",
            "medidas_fora": ["Sistema de alerta antecipado (MDD x 0,90)", "Estoque e equipamento elevados (MDD x 0,80)"],
            "herdado_de_porto_alegre": ["remapeamento de frequencia 2025-2050", "crescimento 2%/ano", "parametros das medidas"],
            "valor_reposicao": proto.montar_premissas(d["is_ind"]),
        },
        "rp_por_cota": {
            "frequencia": d["meta_freq"], "rps": d["rp_cota"],
            "rps_acima_do_ultimo_raster": d["fora"],
            "cota_cobertura_raster_m": [d["niveis"][0], d["niveis"][-1]],
        },
        "resultados_por_rp": resultados,
        "eai_exposto": eai,
        "eai_exposto_sem_cauda_brl": round(base["eai_sem_cauda"], 2),
        "projecao_2050": projecao,
        "medidas": {
            "base": {"eai_brl": round(base["eai"], 2), "eai_sem_cauda_brl": round(base["eai_sem_cauda"], 2), "eai_2050_brl": round(base["eai_2050"], 2), "rps": rps},
            "custo_beneficio_premissas": {"cambio_brl_usd": cm.CAMBIO_BRL_USD, "taxa_desconto": cm.TAXA_DESCONTO, "horizonte": [cm.ANO_INI, cm.ANO_FIM], "fonte_custos": "relocacao: 60% do valor de reposicao; diques: proporcao custo/exposicao de Porto Alegre; barreiras sem custo"},
            "medidas": medidas,
        },
        "por_cota": por_cota(d),
    }
    path = DATA_PROCESSED / "climada_exposicao_lajeado.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    shutil.copyfile(path, DASH_DATA / path.name)
    print(f"  Salvo: {path}\n  Copiado: {DASH_DATA / path.name}")


if __name__ == "__main__":
    main()
