"""
01_rais.py -- Gera bases anonimizadas de Estabelecimentos e Vinculos RAIS 2023.

Le os Parquets de Vinculos (ativos) e Estabelecimentos para os municipios
configurados, gera ID anonimo sequencial, trata enderecos para geocodificacao,
imputa remuneracoes zero e salva duas tabelas linkadas por ID.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd

from config import (
    DATA_BASES,
    DATA_INTERIM,
    MUNICIPIOS,
    RAIS_ESTAB_COLS,
    RAIS_ESTAB_PARQUET,
    RAIS_PARQUET,
    RAIS_VINC_COLS,
)
from common import cnae_to_denominacao, parse_endereco, zfill_cnpj


# ---------------------------------------------------------------------------
# Medias estaduais para imputacao de remuneracao
# ---------------------------------------------------------------------------

def build_medias_estaduais() -> tuple:
    """Calcula medias estaduais (RS) por (cnae,cbo), por cnae, e geral."""
    cache = DATA_INTERIM / "medias_estaduais.parquet"
    if cache.exists():
        cached = pd.read_parquet(cache)
        media_cnae_cbo = cached.set_index(["cnae20_classe", "cbo_2002"])["media_cnae_cbo"].to_dict()
        media_cnae = cached.drop_duplicates("cnae20_classe").set_index("cnae20_classe")["media_cnae"].to_dict()
        media_geral = cached["media_geral"].iloc[0]
        return media_cnae_cbo, media_cnae, media_geral

    print("  Calculando medias estaduais (RS inteiro)...")
    cols = ["vinculo_ativo_3112", "vl_remun_media_nom", "cnae20_classe", "cbo_2002"]
    df = pd.read_parquet(RAIS_PARQUET, columns=cols)
    df["vinculo_ativo_3112"] = df["vinculo_ativo_3112"].astype(str).str.strip()
    df = df[df["vinculo_ativo_3112"] == "1"]
    df["vl_remun_media_nom"] = pd.to_numeric(df["vl_remun_media_nom"], errors="coerce")
    pos = df[df["vl_remun_media_nom"] > 0].copy()
    pos["cnae20_classe"] = pos["cnae20_classe"].astype(str).str.strip()
    pos["cbo_2002"] = pos["cbo_2002"].astype(str).str.strip()

    media_geral = pos["vl_remun_media_nom"].mean()

    g_cnae = pos.groupby("cnae20_classe")["vl_remun_media_nom"].mean()
    media_cnae = g_cnae.to_dict()

    g_cnae_cbo = pos.groupby(["cnae20_classe", "cbo_2002"])["vl_remun_media_nom"].mean()
    media_cnae_cbo = g_cnae_cbo.to_dict()

    cache_df = g_cnae_cbo.reset_index()
    cache_df.columns = ["cnae20_classe", "cbo_2002", "media_cnae_cbo"]
    cache_df["media_cnae"] = cache_df["cnae20_classe"].map(media_cnae)
    cache_df["media_geral"] = media_geral
    DATA_INTERIM.mkdir(parents=True, exist_ok=True)
    cache_df.to_parquet(cache, index=False)
    print(f"  Medias estaduais salvas ({len(media_cnae_cbo):,} pares cnae/cbo)")

    return media_cnae_cbo, media_cnae, media_geral


# ---------------------------------------------------------------------------
# Imputacao de remuneracao zero
# ---------------------------------------------------------------------------

def imputar_remuneracao(df: pd.DataFrame, media_cnae_cbo_est, media_cnae_est, media_geral_est) -> int:
    """Imputa remuneracao_media em vinculos com valor <= 0. Retorna n imputados.

    Hierarquia (vectorizada):
    1. Media municipal por (cnae, cbo) — se >= 2 positivos no municipio
    2. Media municipal por cnae — se >= 2 positivos
    3. Fallback estadual: (cnae,cbo) → cnae → geral
    """
    df["remuneracao_imputada"] = False
    mask_zero = df["remuneracao_media"] <= 0
    n_zero = mask_zero.sum()
    if n_zero == 0:
        return 0

    pos = df[df["remuneracao_media"] > 0]

    # Medias municipais por (cnae, cbo, mun) com filtro de contagem >= 2
    g_cc = pos.groupby(["cnae_classe", "cbo", "municipio"])["remuneracao_media"]
    media_cc = g_cc.mean()
    contagem_cc = g_cc.size()
    media_cc = media_cc[contagem_cc >= 2]

    # Medias municipais por (cnae, mun) com filtro de contagem >= 2
    g_c = pos.groupby(["cnae_classe", "municipio"])["remuneracao_media"]
    media_c = g_c.mean()
    contagem_c = g_c.size()
    media_c = media_c[contagem_c >= 2]

    # Mapear valores para os zeros via merge (vectorizado)
    zeros = df.loc[mask_zero, ["cnae_classe", "cbo", "municipio"]].copy()

    # Nivel 1: media municipal (cnae, cbo, mun)
    zeros["_key_cc"] = list(zip(zeros["cnae_classe"], zeros["cbo"], zeros["municipio"]))
    zeros["_val_cc"] = zeros["_key_cc"].map(media_cc)

    # Nivel 2: media municipal (cnae, mun)
    zeros["_key_c"] = list(zip(zeros["cnae_classe"], zeros["municipio"]))
    zeros["_val_c"] = zeros["_key_c"].map(media_c)

    # Nivel 3: fallback estadual (cnae, cbo) → cnae → geral
    zeros["_key_est_cc"] = list(zip(zeros["cnae_classe"], zeros["cbo"]))
    zeros["_val_est_cc"] = zeros["_key_est_cc"].map(media_cnae_cbo_est)
    zeros["_val_est_c"] = zeros["cnae_classe"].map(media_cnae_est)

    # Cascata: usa o primeiro valor disponivel na hierarquia
    imputed = (
        zeros["_val_cc"]
        .fillna(zeros["_val_c"])
        .fillna(zeros["_val_est_cc"])
        .fillna(zeros["_val_est_c"])
        .fillna(media_geral_est)
    )

    df.loc[mask_zero, "remuneracao_media"] = imputed.values
    df.loc[mask_zero, "remuneracao_imputada"] = True

    return int(mask_zero.sum())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Gera bases RAIS Estabelecimentos + Vinculos")
    parser.add_argument("--mun", type=str, default=None, help="Nome do municipio (ex: 'Porto Alegre')")
    args = parser.parse_args()

    if args.mun:
        if args.mun not in MUNICIPIOS:
            print(f"Municipio '{args.mun}' nao encontrado. Disponiveis: {list(MUNICIPIOS.keys())}")
            sys.exit(1)
        targets = {args.mun: MUNICIPIOS[args.mun]}
    else:
        targets = MUNICIPIOS

    # ------------------------------------------------------------------
    # 1. Vinculos ativos (todos os municipios de uma vez)
    # ------------------------------------------------------------------
    print("=" * 60)
    print("  ETAPA 1: Vinculos ativos")
    print("=" * 60)

    vinc_raw = pd.read_parquet(RAIS_PARQUET, columns=RAIS_VINC_COLS)
    vinc_raw["municipio"] = vinc_raw["municipio"].astype(str).str.strip()
    vinc_raw["vinculo_ativo_3112"] = vinc_raw["vinculo_ativo_3112"].astype(str).str.strip()

    frames_v = []
    for nome, cfg in targets.items():
        ibge6 = cfg["ibge6"]
        sub = vinc_raw[
            (vinc_raw["municipio"].str.startswith(ibge6))
            & (vinc_raw["vinculo_ativo_3112"] == "1")
        ].copy()
        sub["municipio"] = nome
        frames_v.append(sub)
        print(f"  {nome}: {len(sub):,} vinculos ativos")

    vinculos = pd.concat(frames_v, ignore_index=True)
    del vinc_raw

    vinculos["cnpj_cei"] = zfill_cnpj(vinculos["cnpj_cei"])
    vinculos["cnae20_classe"] = vinculos["cnae20_classe"].astype(str).str.strip()
    vinculos["cbo_2002"] = vinculos["cbo_2002"].astype(str).str.strip()
    vinculos["vl_remun_media_nom"] = pd.to_numeric(vinculos["vl_remun_media_nom"], errors="coerce").fillna(0)

    vinculos = vinculos.rename(columns={
        "cnae20_classe": "cnae_classe",
        "cbo_2002": "cbo",
        "vl_remun_media_nom": "remuneracao_media",
    })
    vinculos = vinculos.drop(columns=["vinculo_ativo_3112"])

    print(f"\n  Total vinculos: {len(vinculos):,}")
    print(f"  CNPJs unicos: {vinculos['cnpj_cei'].nunique():,}")

    # ------------------------------------------------------------------
    # 2. Imputacao de remuneracao zero
    # ------------------------------------------------------------------
    n_zeros = (vinculos["remuneracao_media"] <= 0).sum()
    print(f"\n  Vinculos com remuneracao <= 0: {n_zeros:,} ({n_zeros/len(vinculos)*100:.1f}%)")

    if n_zeros > 0:
        media_cnae_cbo_est, media_cnae_est, media_geral_est = build_medias_estaduais()
        n_imputados = imputar_remuneracao(vinculos, media_cnae_cbo_est, media_cnae_est, media_geral_est)
        print(f"  Imputados: {n_imputados:,}")
        restantes = (vinculos["remuneracao_media"] <= 0).sum()
        if restantes > 0:
            print(f"  AVISO: {restantes} vinculos ainda com remuneracao <= 0 apos imputacao")
    else:
        vinculos["remuneracao_imputada"] = False

    # ------------------------------------------------------------------
    # 3. Estabelecimentos (filtrar pelos CNPJs dos vinculos)
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  ETAPA 2: Estabelecimentos")
    print("=" * 60)

    cnpjs_vinculos = set(vinculos["cnpj_cei"].unique())

    estab_raw = pd.read_parquet(RAIS_ESTAB_PARQUET, columns=RAIS_ESTAB_COLS)
    estab_raw["municipio"] = estab_raw["municipio"].astype(str).str.strip()
    estab_raw["cnpj_cei"] = zfill_cnpj(estab_raw["cnpj_cei"])

    estab = estab_raw[estab_raw["cnpj_cei"].isin(cnpjs_vinculos)].copy()
    del estab_raw

    estab = estab.drop_duplicates(subset="cnpj_cei", keep="first")
    print(f"  Estabelecimentos encontrados: {len(estab):,}")

    cnpjs_sem_estab = cnpjs_vinculos - set(estab["cnpj_cei"].unique())
    if cnpjs_sem_estab:
        print(f"  AVISO: {len(cnpjs_sem_estab)} CNPJs dos vinculos nao encontrados em Estabelecimentos")

    mun_map = {}
    for nome, cfg in targets.items():
        mun_map[cfg["ibge6"]] = nome

    def map_mun(cod):
        for ibge6, nome in mun_map.items():
            if str(cod).startswith(ibge6):
                return nome
        return str(cod)

    estab["municipio"] = estab["municipio"].apply(map_mun)

    estab["cnae20_classe"] = estab["cnae20_classe"].astype(str).str.strip()
    parsed = estab.apply(
        lambda r: parse_endereco(r["nome_logradouro"], r["numero_logradouro"]),
        axis=1,
        result_type="expand",
    )
    estab["rua"] = parsed[0]
    estab["numero"] = parsed[1]

    estab = estab.rename(columns={
        "nome_bairro": "bairro",
        "cep_estab": "cep",
        "cnae20_classe": "cnae_classe",
    })

    for mun_nome in targets:
        n = (estab["municipio"] == mun_nome).sum()
        print(f"  {mun_nome}: {n:,} estabelecimentos")

    # ------------------------------------------------------------------
    # 4. Mapa de ID anonimo
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  ETAPA 3: Mapa de ID anonimo")
    print("=" * 60)

    todos_cnpjs = sorted(set(vinculos["cnpj_cei"].unique()) | set(estab["cnpj_cei"].unique()))
    id_map = pd.DataFrame({"cnpj_cei": todos_cnpjs})
    id_map["id"] = range(1, len(id_map) + 1)
    cnpj_to_id = id_map.set_index("cnpj_cei")["id"]

    DATA_INTERIM.mkdir(parents=True, exist_ok=True)
    id_map.to_parquet(DATA_INTERIM / "cnpj_id_map.parquet", index=False)
    print(f"  IDs gerados: {len(id_map):,}")

    # ------------------------------------------------------------------
    # 5. Montar tabelas finais e salvar
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  ETAPA 4: Salvar bases")
    print("=" * 60)

    vinculos["id"] = vinculos["cnpj_cei"].map(cnpj_to_id)
    vinculos["setor"] = vinculos["cnae_classe"].apply(cnae_to_denominacao)
    vinculos_out = vinculos[["id", "municipio", "cnae_classe", "setor", "cbo", "remuneracao_media", "remuneracao_imputada"]]

    estab["id"] = estab["cnpj_cei"].map(cnpj_to_id)
    estab["setor"] = estab["cnae_classe"].apply(cnae_to_denominacao)
    estab["endereco_geocode"] = estab.apply(
        lambda r: f"{r['rua']}, {r['numero']}, {r['bairro']}, {r['cep']}, {r['municipio']} - RS",
        axis=1,
    )

    agg_vinc = vinculos.groupby("cnpj_cei")["remuneracao_media"].agg(
        qtd_vinculos="count",
        massa_salarial="sum",
    ).reset_index()
    estab = estab.merge(agg_vinc, on="cnpj_cei", how="left")
    estab["qtd_vinculos"] = estab["qtd_vinculos"].fillna(0).astype(int)
    estab["massa_salarial"] = estab["massa_salarial"].fillna(0).round(2)

    estab_out = estab[["id", "municipio", "rua", "numero", "bairro", "cep", "cnae_classe", "setor", "qtd_vinculos", "massa_salarial", "endereco_geocode"]]

    DATA_BASES.mkdir(parents=True, exist_ok=True)
    path_vinc = DATA_BASES / "vinculos.csv"
    path_estab = DATA_BASES / "estabelecimentos.csv"
    vinculos_out.to_csv(path_vinc, index=False, encoding="utf-8-sig")
    estab_out.to_csv(path_estab, index=False, encoding="utf-8-sig")
    print(f"  vinculos.csv: {len(vinculos_out):,} linhas -> {path_vinc}")
    print(f"  estabelecimentos.csv: {len(estab_out):,} linhas -> {path_estab}")

    # ------------------------------------------------------------------
    # Resumo
    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print("  RESUMO")
    print("=" * 60)
    for mun_nome in targets:
        nv = (vinculos_out["municipio"] == mun_nome).sum()
        ne = (estab_out["municipio"] == mun_nome).sum()
        ni = vinculos.loc[vinculos["municipio"] == mun_nome, "remuneracao_imputada"].sum()
        print(f"  {mun_nome}: {ne:,} estab | {nv:,} vinculos | {int(ni):,} imputados")

    if cnpjs_sem_estab:
        print(f"\n  Orfaos (vinculos sem estabelecimento): {len(cnpjs_sem_estab)}")


if __name__ == "__main__":
    main()
