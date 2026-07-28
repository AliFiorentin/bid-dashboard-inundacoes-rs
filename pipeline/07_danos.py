"""
07_danos.py -- Calcula danos operacionais (VAB perdido, reposicao, producao SUS, perdas agricolas).

Metodologia DaLA (CEPAL/BID): perdas = fluxo de producao nao realizado durante a interrupcao.
- Empresas: VAB = massa_salarial_anual / labor_share; perda = VAB * f_interrup
- Educacao: perda = matriculas * (FUNDEB_VAAT_MIN / dias_letivos) * dias_interrupcao (LDB Art.24,I)
- Saude: perda = producao_SUS_anual * f_interrup  (SIA + SIH, anualizado 7->12 meses)
- Agricultura: perda = area_ha_atingida * coef_R$_por_ha (por cultura e periodo do cenario)

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
    FUNDEB_VAAT_MIN, DIAS_LETIVOS, DATA_PROCESSED, DATA_INTERIM, DATA_BASES,
    CENARIO_PERIODO, IMPACTO_AGRICOLA, INTERRUPCAO_DALA,
)
from common import load_geojson, get_prop, slugify, cnae_to_setor, fmt_brl


# ---------------------------------------------------------------------------
# SUS: agregar producao SIA + SIH por CNES, anualizar 7 -> 12 meses
# ---------------------------------------------------------------------------

def preparar_producao_sus() -> pd.DataFrame:
    """Agrega SIA (valor_aprovado) + SIH (valor_total) por CNES, anualiza 7->12 meses."""
    parquet_path = DATA_INTERIM / "producao_sus_por_cnes.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
        print(f"  Producao SUS: {len(df):,} CNES (cache)")
        return df

    MESES_DISPONIVEIS = 7  # jan-jul 2024
    fator_anual = 12 / MESES_DISPONIVEIS

    frames = []

    sia_path = DATA_BASES / "sia_producao.csv"
    if sia_path.exists():
        sia = pd.read_csv(
            sia_path, usecols=["co_cnes", "valor_aprovado"],
            dtype={"co_cnes": str}, encoding="utf-8-sig",
        )
        sia["co_cnes"] = sia["co_cnes"].astype(str).str.strip().str.zfill(7)
        sia["valor_aprovado"] = pd.to_numeric(sia["valor_aprovado"], errors="coerce").fillna(0)
        frames.append(sia.groupby("co_cnes")["valor_aprovado"].sum().rename("producao"))
    else:
        print(f"  AVISO: {sia_path} nao encontrado")

    sih_path = DATA_BASES / "sih_internacoes.csv"
    if sih_path.exists():
        sih = pd.read_csv(
            sih_path, usecols=["co_cnes", "valor_total"],
            dtype={"co_cnes": str}, encoding="utf-8-sig",
        )
        sih["co_cnes"] = sih["co_cnes"].astype(str).str.strip().str.zfill(7)
        sih["valor_total"] = pd.to_numeric(sih["valor_total"], errors="coerce").fillna(0)
        frames.append(sih.groupby("co_cnes")["valor_total"].sum().rename("producao"))
    else:
        print(f"  AVISO: {sih_path} nao encontrado")

    if not frames:
        print("  AVISO: sem dados SIA/SIH — saude sera R$ 0")
        return pd.DataFrame(columns=["cnes", "producao_anual_total"])

    combined = pd.concat(frames).groupby(level=0).sum().reset_index()
    combined.columns = ["cnes", "producao_anual_total"]
    combined["producao_anual_total"] = combined["producao_anual_total"] * fator_anual

    DATA_INTERIM.mkdir(parents=True, exist_ok=True)
    combined.to_parquet(parquet_path, index=False)
    print(f"  Producao SUS: {len(combined):,} CNES -> {parquet_path}")
    return combined


# ---------------------------------------------------------------------------
# Operational damages
# ---------------------------------------------------------------------------

def calcular_dano_empresas(gj, f_interrup):
    total = 0
    for feat in gj["features"]:
        props = feat["properties"]
        massa = float(get_prop(props, "massa_salarial", "Massa_Salarial", default=0) or 0)
        cnae = get_prop(props, "cnae_classe", "cnae", "cnae20_classe", "CNAE", default="")
        ls = LABOR_SHARE[cnae_to_setor(cnae)]
        total += (massa * 12 / ls) * f_interrup
    return total


def calcular_dano_educacao(gj, dias):
    """Perda FUNDEB: matriculas * (VAAT_MIN / dias_letivos) * dias_interrupcao."""
    total_mat = 0
    for feat in gj["features"]:
        props = feat["properties"]
        for col in ["qtd_matri_inf", "qtd_matri_fund", "qtd_matri_med",
                     "qtd_matri_prof", "qtd_matri_eja", "qtd_matri_esp"]:
            val = props.get(col, 0)
            if val and str(val) not in ("None", "nan", ""):
                total_mat += float(val)
    return total_mat * (FUNDEB_VAAT_MIN / DIAS_LETIVOS) * dias


def calcular_dano_saude(gj, f_interrup, sus_index=None):
    """sus_index: pd.Series indexada por cnes com producao_anual_total."""
    if sus_index is None or sus_index.empty:
        return 0.0
    total = 0.0
    for feat in gj["features"]:
        cnes = str(feat["properties"].get("co_cnes", "")).strip().split(".")[0].zfill(7)
        if not cnes or cnes == "0000000":
            continue
        total += float(sus_index.get(cnes, 0)) * f_interrup
    return total


def calcular_dano_agricultura(cen_slug):
    """Perdas agricolas: area_ha_atingida * coef_R$/ha por cultura e periodo."""
    periodo = CENARIO_PERIODO.get(cen_slug)
    if not periodo:
        return 0.0
    coefs = IMPACTO_AGRICOLA.get(periodo, {})
    mun_slug = cen_slug.split("___")[0]
    stats_path = DASH_DATA / mun_slug / "cenarios" / f"agricultura_stats_{cen_slug}.json"
    if not stats_path.exists():
        return 0.0
    with open(stats_path, encoding="utf-8") as f:
        stats = json.load(f)
    return sum(
        float(area) * coefs.get(cult, {}).get("coef", 0)
        for cult, area in stats.items()
    )


def _dala_params(periodo, dias_override):
    """Retorna (f_interrup, da, dias_ef_int, label) para o periodo dado.

    da        = dias_agudo = fechamento real (usado para educacao: perdas + reposicao)
    dias_ef_int = round(dias_agudo + dias_recuperacao * 0.5) = dias efetivos (empresas/saude)

    Educacao segue custo duplo: perda de servico (da dias) + reposicao obrigatoria (da dias)
    = 2*da, que coincide com dias_ef quando dr = 2*da (parametros CEPAL atuais).
    Empresas/saude usam curva DaLA: f = dias_ef / 365 (interrupcao 100% na fase aguda, 50% na recuperacao).

    No modo plano (--dias N) usa-se da = N/2 para que o total educacional (2*da) tambem
    corresponda a N dias efetivos, mantendo a mesma base de comparacao de empresas/saude
    (f = N/365). Isso reproduz a relacao da curva DaLA, onde dr = 2*da implica da = dias_ef/2.
    """
    if dias_override is not None:
        return dias_override / 365, dias_override / 2, dias_override, f"{dias_override}d (plano)"
    params = INTERRUPCAO_DALA.get(periodo, {"dias_agudo": 30, "dias_recuperacao": 60})
    da, dr = params["dias_agudo"], params["dias_recuperacao"]
    dias_ef = da + dr * 0.5
    return dias_ef / 365, da, round(dias_ef), f"DaLA {da}d+{dr}d×0,5={dias_ef:.0f}d ef."


def calcular_operacional(dias=None):
    """Calcula danos operacionais para todos os municipios.

    dias: se fornecido, usa interrupcao plana (sensibilidade). Se None, usa
          curva de recuperacao linear DaLA por periodo do cenario (padrao).
    """
    modo = f"--dias {dias} (plano)" if dias is not None else "DaLA (curva linear por periodo)"
    print(f"\n{'='*70}")
    print(f"  Danos Operacionais — {modo}")
    print(f"{'='*70}")

    producao_sus = preparar_producao_sus()
    sus_index = (
        producao_sus.set_index("cnes")["producao_anual_total"]
        if not producao_sus.empty and "cnes" in producao_sus.columns
        else pd.Series(dtype=float)
    )

    resultados = {}

    for nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        print(f"\n  {nome}:")

        for cen in cfg["cenarios"]:
            dano_emp = 0.0
            dano_edu = 0.0
            dano_sau = 0.0

            cen_slug = f"{slug}___{slugify(cen)}"
            periodo = CENARIO_PERIODO.get(cen_slug)
            f_interrup, da, dias_ef_int, label_modo = _dala_params(periodo, dias)

            for setor, calc_fn in [
                ("empresas", lambda gj: calcular_dano_empresas(gj, f_interrup)),
                ("educacao", lambda gj: calcular_dano_educacao(gj, da)),
                ("saude",    lambda gj: calcular_dano_saude(gj, f_interrup, sus_index)),
            ]:
                at_path = DASH_DATA / slug / "cenarios" / f"{setor}_ATINGIDOS_{cen_slug}.geojson"
                at_gj = load_geojson(at_path)
                if at_gj:
                    val = calc_fn(at_gj)
                    if setor == "empresas": dano_emp = val
                    elif setor == "educacao": dano_edu = val
                    elif setor == "saude": dano_sau = val

            # Custo adicional de educacao: reposicao obrigatoria das aulas perdidas
            # (LDB art.24, I — escolas devem compensar dias nao letivos; custo = mesmo FUNDEB/dia × da)
            custo_adicional_edu = dano_edu

            dano_agr = calcular_dano_agricultura(cen_slug)

            total = dano_emp + dano_edu + custo_adicional_edu + dano_sau + dano_agr
            cen_label = cen.replace("Cenario ", "")
            print(
                f"    {cen_label} [{label_modo}]: emp {fmt_brl(dano_emp)}"
                f" + edu {fmt_brl(dano_edu)} + edu_adic {fmt_brl(custo_adicional_edu)}"
                f" + sau {fmt_brl(dano_sau)} + agr {fmt_brl(dano_agr)} = {fmt_brl(total)}"
            )

            resultados.setdefault(nome, {})[cen] = {
                "dias_agudo":                da,
                "dias_efetivos":             dias_ef_int,
                "f_interrup":                round(f_interrup, 6),
                "empresas_vab":              round(dano_emp, 2),
                "educacao_perdas":           round(dano_edu, 2),
                "educacao_custo_adicional":  round(custo_adicional_edu, 2),
                "saude_producao":            round(dano_sau, 2),
                "agricultura_perdas":        round(dano_agr, 2),
                "total":                     round(total, 2),
            }

    # O modo plano (--dias N) e' apenas sensibilidade: grava em arquivo proprio para
    # nao sobrescrever o JSON canonico (curva DaLA) que alimenta o dashboard.
    nome_arq = "danos_operacionais.json" if dias is None else f"danos_operacionais_sens_{dias}d.json"
    out_path = DATA_PROCESSED / nome_arq
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    print(f"\n  Operacional salvo: {out_path}")

    return resultados


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Calcula danos operacionais")
    parser.add_argument(
        "--dias", type=int, default=None,
        help="Dias de interrupcao plana (sensibilidade). Omitir para usar curva DaLA por cenario.",
    )
    args = parser.parse_args()

    calcular_operacional(dias=args.dias)


if __name__ == "__main__":
    main()
