"""
02_educacao.py -- Gera base de escolas a partir dos microdados do Censo Escolar 2024.

Le o CSV de microdados (~5 GB em chunks), filtra escolas em atividade nos
municipios configurados, agrega matriculas por nivel, docentes e profissionais,
e salva tabela unica com endereco para geocodificacao.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd

from config import (
    CENSO_COLS,
    CENSO_ESCOLAR_CSV,
    DATA_BASES,
    MUNICIPIOS,
    PROF_CATEGORIES,
)

DEP_LABEL = {1: "Federal", 2: "Estadual", 3: "Municipal", 4: "Privada"}

PROF_QT_COLS = [f"QT_PROF_{cat}" for cat in PROF_CATEGORIES]


def main():
    parser = argparse.ArgumentParser(description="Gera base Escolas (Censo Escolar 2024)")
    parser.add_argument("--mun", type=str, default=None, help="Nome do municipio (ex: 'Porto Alegre')")
    args = parser.parse_args()

    if args.mun:
        if args.mun not in MUNICIPIOS:
            print(f"Municipio '{args.mun}' nao encontrado. Disponiveis: {list(MUNICIPIOS.keys())}")
            sys.exit(1)
        targets = {args.mun: MUNICIPIOS[args.mun]}
    else:
        targets = MUNICIPIOS

    if not CENSO_ESCOLAR_CSV.exists():
        print(f"ERRO: arquivo de microdados nao encontrado: {CENSO_ESCOLAR_CSV}")
        sys.exit(1)

    ibge7s = [cfg["ibge7"] for cfg in targets.values()]
    ibge7_to_nome = {cfg["ibge7"]: nome for nome, cfg in targets.items()}

    # ------------------------------------------------------------------
    # 1. Ler CSV em chunks, filtrar municipios + em atividade
    # ------------------------------------------------------------------
    print("=" * 60)
    print("  ETAPA 1: Leitura dos microdados")
    print("=" * 60)
    print(f"  Fonte: {CENSO_ESCOLAR_CSV}")
    print(f"  Municipios: {list(targets.keys())}")

    reader = pd.read_csv(
        CENSO_ESCOLAR_CSV,
        sep=";",
        encoding="latin1",
        usecols=CENSO_COLS,
        dtype={"CO_ENTIDADE": str, "CO_MUNICIPIO": int, "CO_CEP": str},
        chunksize=100_000,
    )

    frames = []
    n_total = 0
    for i, chunk in enumerate(reader, 1):
        n_total += len(chunk)
        sub = chunk[
            (chunk["CO_MUNICIPIO"].isin(ibge7s))
            & (chunk["TP_SITUACAO_FUNCIONAMENTO"] == 1)
        ]
        if len(sub) > 0:
            frames.append(sub)
        if i % 10 == 0:
            print(f"  ... {n_total:,} linhas lidas")

    if not frames:
        print("  ERRO: nenhuma escola encontrada nos municipios filtrados!")
        sys.exit(1)

    df = pd.concat(frames, ignore_index=True)
    print(f"  Total lido: {n_total:,} linhas")
    print(f"  Escolas em atividade: {len(df):,}")

    # ------------------------------------------------------------------
    # 2. Agregar metricas
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  ETAPA 2: Agregar metricas")
    print("=" * 60)

    qt_cols = [c for c in CENSO_COLS if c.startswith("QT_")]
    for col in qt_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            # INEP marca valores extremos como 88888
            df.loc[df[col] >= 88888, col] = 0
            df[col] = df[col].fillna(0).astype(int)

    df["qtd_mat_infantil"] = df["QT_MAT_INF_CRE"] + df["QT_MAT_INF_PRE"]
    df["qtd_mat_fundamental"] = df["QT_MAT_FUND_AI"] + df["QT_MAT_FUND_AF"]
    df["qtd_mat_medio"] = df["QT_MAT_MED"]
    df["qtd_mat_profissional"] = df["QT_MAT_PROF"]
    df["qtd_mat_eja"] = df["QT_MAT_EJA_FUND"] + df["QT_MAT_EJA_MED"]
    df["qtd_mat_especial"] = df["QT_MAT_ESP"]
    df["qtd_mat_total"] = (
        df["qtd_mat_infantil"] + df["qtd_mat_fundamental"]
        + df["qtd_mat_medio"] + df["qtd_mat_profissional"]
        + df["qtd_mat_eja"] + df["qtd_mat_especial"]
    )

    df["qtd_doc_total"] = df["QT_DOC_BAS"]

    prof_available = [c for c in PROF_QT_COLS if c in df.columns]
    df["qtd_prof_total"] = df[prof_available].sum(axis=1).astype(int)

    # ------------------------------------------------------------------
    # 3. Municipio, dependencia, endereco
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  ETAPA 3: Endereco e identificacao")
    print("=" * 60)

    df["municipio"] = df["CO_MUNICIPIO"].map(ibge7_to_nome)
    df["tp_dependencia_label"] = df["TP_DEPENDENCIA"].map(DEP_LABEL).fillna("Desconhecida")

    df["NU_ENDERECO"] = df["NU_ENDERECO"].fillna("S/N").astype(str).str.strip()
    df.loc[df["NU_ENDERECO"] == "", "NU_ENDERECO"] = "S/N"
    df["DS_COMPLEMENTO"] = df["DS_COMPLEMENTO"].fillna("").astype(str).str.strip()
    df["DS_ENDERECO"] = df["DS_ENDERECO"].fillna("").astype(str).str.strip()
    df["NO_BAIRRO"] = df["NO_BAIRRO"].fillna("").astype(str).str.strip()
    df["CO_CEP"] = df["CO_CEP"].fillna("").astype(str).str.strip()

    df["endereco_geocode"] = df.apply(
        lambda r: f"{r['DS_ENDERECO']}, {r['NU_ENDERECO']}, {r['NO_BAIRRO']}, {r['CO_CEP']}, {r['municipio']} - RS",
        axis=1,
    )

    for mun_nome in targets:
        n = (df["municipio"] == mun_nome).sum()
        print(f"  {mun_nome}: {n:,} escolas")

    # ------------------------------------------------------------------
    # 4. Salvar
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  ETAPA 4: Salvar base")
    print("=" * 60)

    out_cols = [
        "CO_ENTIDADE", "NO_ENTIDADE", "municipio",
        "TP_DEPENDENCIA", "tp_dependencia_label",
        "DS_ENDERECO", "NU_ENDERECO", "DS_COMPLEMENTO", "NO_BAIRRO", "CO_CEP",
        "endereco_geocode",
        "qtd_mat_infantil", "qtd_mat_fundamental", "qtd_mat_medio",
        "qtd_mat_profissional", "qtd_mat_eja", "qtd_mat_especial", "qtd_mat_total",
        "qtd_doc_total", "qtd_prof_total",
    ]

    out = df[out_cols].copy()
    out.columns = [c.lower() for c in out.columns]

    DATA_BASES.mkdir(parents=True, exist_ok=True)
    path_out = DATA_BASES / "escolas.csv"
    out.to_csv(path_out, index=False, encoding="utf-8-sig")
    print(f"  escolas.csv: {len(out):,} linhas -> {path_out}")

    # ------------------------------------------------------------------
    # Resumo
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  RESUMO")
    print("=" * 60)
    for mun_nome in targets:
        sub = out[out["municipio"] == mun_nome]
        mat = sub["qtd_mat_total"].sum()
        doc = sub["qtd_doc_total"].sum()
        prof = sub["qtd_prof_total"].sum()
        dep_counts = sub["tp_dependencia_label"].value_counts()
        dep_str = ", ".join(f"{k}={v}" for k, v in dep_counts.items())
        print(f"  {mun_nome}: {len(sub):,} escolas | {mat:,} matr | {doc:,} doc | {prof:,} prof")
        print(f"    {dep_str}")

    total_mat = out["qtd_mat_total"].sum()
    print(f"\n  Total: {len(out):,} escolas, {total_mat:,} matriculas")


if __name__ == "__main__":
    main()
