"""
07_danos.py -- Calcula danos operacionais (VAB perdido, reposicao, producao SUS).

VAB perdido (empresas), reposicao FUNDEB (educacao), producao SUS (saude).

Uso:  python 07_danos.py [--dias 30]
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd

from config import (
    MUNICIPIOS, DASH_DATA, LABOR_SHARE,
    FUNDEB_VAAT_MIN, DIAS_LETIVOS, DIAS_REPOSICAO_PADRAO, DATA_PROCESSED,
)
from common import load_geojson, get_prop, slugify, cnae_to_setor, fmt_brl


# ---------------------------------------------------------------------------
# Operational damages
# ---------------------------------------------------------------------------

def calcular_dano_empresas(gj, f_interrup):
    total = 0
    for feat in gj["features"]:
        props = feat["properties"]
        massa = float(get_prop(props, "massa_salarial", "Massa_Salarial"))
        cnae = get_prop(props, "cnae_classe", "cnae", "cnae20_classe", "CNAE", default="")
        ls = LABOR_SHARE[cnae_to_setor(cnae)]
        total += (massa * 12 / ls) * f_interrup
    return total


def calcular_dano_educacao(gj, d_rep):
    total_mat = 0
    for feat in gj["features"]:
        props = feat["properties"]
        for col in ["qtd_matri_inf", "qtd_matri_fund", "qtd_matri_med",
                     "qtd_matri_prof", "qtd_matri_eja", "qtd_matri_esp"]:
            val = props.get(col, 0)
            if val and str(val) not in ("None", "nan", ""):
                total_mat += float(val)
    return total_mat * (FUNDEB_VAAT_MIN / DIAS_LETIVOS) * d_rep


def calcular_dano_saude(gj, f_interrup, producao_sus=None):
    if producao_sus is None or producao_sus.empty:
        return 0.0
    total = 0.0
    for feat in gj["features"]:
        cnes = str(feat["properties"].get("co_cnes", "")).strip().split(".")[0].zfill(7)
        if not cnes:
            continue
        match = producao_sus[producao_sus["cnes"] == cnes]
        if not match.empty:
            prod = float(match.iloc[0].get("producao_anual_total", 0) or match.iloc[0].get("val_anual", 0))
            total += prod * f_interrup
    return total


def calcular_operacional(dias=30):
    """Calcula danos operacionais para todos os municipios."""
    f_interrup = dias / 365
    d_rep = DIAS_REPOSICAO_PADRAO

    print(f"\n{'='*70}")
    print(f"  Danos Operacionais ({dias} dias interrupcao)")
    print(f"{'='*70}")
    print(f"  f_interrup = {f_interrup:.4f}, d_rep = {d_rep}")

    producao_sus = None
    prod_path = DATA_PROCESSED.parent / "interim" / "producao_sus_por_cnes.parquet"
    if prod_path.exists():
        producao_sus = pd.read_parquet(prod_path)
        print(f"  Producao SUS: {len(producao_sus)} CNES carregados")

    resultados = {}

    for nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        print(f"\n  {nome}:")

        for cen in cfg["cenarios"]:
            dano_emp = 0
            dano_edu = 0
            dano_sau = 0

            cen_slug = f"{slug}___{slugify(cen)}"

            for setor, calc_fn, var_name in [
                ("empresas", lambda gj: calcular_dano_empresas(gj, f_interrup), "emp"),
                ("educacao", lambda gj: calcular_dano_educacao(gj, d_rep), "edu"),
                ("saude", lambda gj: calcular_dano_saude(gj, f_interrup, producao_sus), "sau"),
            ]:
                at_path = DASH_DATA / slug / "cenarios" / f"{setor}_ATINGIDOS_{cen_slug}.geojson"
                at_gj = load_geojson(at_path)
                if at_gj:
                    val = calc_fn(at_gj)
                    if var_name == "emp": dano_emp = val
                    elif var_name == "edu": dano_edu = val
                    elif var_name == "sau": dano_sau = val

            total = dano_emp + dano_edu + dano_sau
            cen_label = cen.replace("Cenario ", "")
            print(f"    {cen_label}: emp {fmt_brl(dano_emp)} + edu {fmt_brl(dano_edu)} + sau {fmt_brl(dano_sau)} = {fmt_brl(total)}")

            resultados.setdefault(nome, {})[cen] = {
                "empresas_vab": round(dano_emp, 2),
                "educacao_reposicao": round(dano_edu, 2),
                "saude_producao": round(dano_sau, 2),
                "total": round(total, 2),
            }

    out_path = DATA_PROCESSED / "danos_operacionais.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    print(f"\n  Operacional salvo: {out_path}")

    return resultados


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Calcula danos operacionais")
    parser.add_argument("--dias", type=int, default=30, help="Dias de interrupcao (default: 30)")
    args = parser.parse_args()

    calcular_operacional(dias=args.dias)


if __name__ == "__main__":
    main()
