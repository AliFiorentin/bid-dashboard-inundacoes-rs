"""
check_bases.py — Validação dos CSVs gerados pelo pipeline BID.

Execução:
    & "C:\\Users\\Alisson Fiorentin\\miniconda3\\python.exe" pipeline/validation/check_bases.py

Saída: [OK] / [WARN] / [FAIL] por item; resumo final; exit code 1 se houver FAIL.
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE = Path("D:/Projetos/BID")
DATA_BASES = BASE / "data" / "processed" / "bases"

MUNICIPIOS_VALIDOS = ["Eldorado do Sul", "Lajeado", "Porto Alegre", "Rio Grande"]

MUN_SLUGS = {
    "Eldorado do Sul": "eldorado_do_sul",
    "Lajeado": "lajeado",
    "Porto Alegre": "porto_alegre",
    "Rio Grande": "rio_grande",
}

# CNES ZIP paths
CNES_ZIP_CONFIG = Path(r"C:\Users\Alisson Fiorentin\Downloads\BASE_DE_DADOS_CNES_202404.ZIP")
CNES_ZIP_REAL = Path(r"D:\CNES 042024.ZIP")

# Bounding box RS
LAT_MIN, LAT_MAX = -34.0, -27.0
LON_MIN, LON_MAX = -58.0, -49.0

# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------
_results: list[tuple[str, str]] = []  # (status, message)


def ok(msg: str) -> None:
    _results.append(("[OK]", msg))
    print(f"  [OK]   {msg}")


def warn(msg: str) -> None:
    _results.append(("[WARN]", msg))
    print(f"  [WARN] {msg}")


def fail(msg: str) -> None:
    _results.append(("[FAIL]", msg))
    print(f"  [FAIL] {msg}")


def section(title: str) -> None:
    print(f"\n{'='*70}")
    print(f"  {title}")
    print("=" * 70)


def _check_cols(df: pd.DataFrame, expected: list[str], label: str) -> bool:
    missing = [c for c in expected if c not in df.columns]
    if missing:
        fail(f"{label}: colunas ausentes: {missing}")
        return False
    ok(f"{label}: todas as {len(expected)} colunas esperadas presentes")
    return True


# ---------------------------------------------------------------------------
# 1. RAIS
# ---------------------------------------------------------------------------
def check_rais() -> None:
    section("1. RAIS — estabelecimentos.csv + vinculos.csv")

    # --- Estabelecimentos ---
    estab_path = DATA_BASES / "estabelecimentos.csv"
    estab_cols = [
        "id", "municipio", "rua", "numero", "bairro", "cep",
        "cnae_classe", "setor", "qtd_vinculos", "massa_salarial",
        "endereco_geocode", "latitude", "longitude",
    ]
    df_estab = pd.read_csv(estab_path, encoding="utf-8-sig", low_memory=False)
    _check_cols(df_estab, estab_cols, "estabelecimentos.csv")
    print(f"    Linhas: {len(df_estab):,}")

    # Municípios: sinalizar valores fora dos 4 nomes válidos
    mun_counts = df_estab["municipio"].value_counts()
    for mun in MUNICIPIOS_VALIDOS:
        n = mun_counts.get(mun, 0)
        print(f"    {mun}: {n:,} estabelecimentos")

    invalidos_mask = ~df_estab["municipio"].isin(MUNICIPIOS_VALIDOS)
    n_invalidos = invalidos_mask.sum()
    if n_invalidos > 0:
        vals = df_estab.loc[invalidos_mask, "municipio"].value_counts().to_dict()
        warn(f"estabelecimentos.csv: {n_invalidos} linhas com município fora dos 4 válidos: {vals}")
    else:
        ok("estabelecimentos.csv: todos os municípios são válidos")

    # Taxa de geocodificação por município
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_estab[df_estab["municipio"] == mun]
        if len(sub) == 0:
            warn(f"Geocodificação {mun}: sem registros")
            continue
        n_geo = sub["latitude"].notna().sum()
        taxa = n_geo / len(sub) * 100
        msg = f"Geocodificação estab. {mun}: {n_geo}/{len(sub)} ({taxa:.1f}%)"
        if taxa < 50:
            warn(msg)
        else:
            ok(msg)

    # --- Vínculos ---
    vinc_path = DATA_BASES / "vinculos.csv"
    vinc_cols = [
        "id", "municipio", "cnae_classe", "setor", "cbo",
        "remuneracao_media", "remuneracao_imputada",
    ]
    df_vinc = pd.read_csv(vinc_path, encoding="utf-8-sig", low_memory=False)
    _check_cols(df_vinc, vinc_cols, "vinculos.csv")
    print(f"    Linhas: {len(df_vinc):,}")

    # Municípios inválidos em vínculos
    inv_vinc = ~df_vinc["municipio"].isin(MUNICIPIOS_VALIDOS)
    n_inv_vinc = inv_vinc.sum()
    if n_inv_vinc > 0:
        vals = df_vinc.loc[inv_vinc, "municipio"].value_counts().to_dict()
        warn(f"vinculos.csv: {n_inv_vinc} linhas com município fora dos 4 válidos: {vals}")
    else:
        ok("vinculos.csv: todos os municípios são válidos")

    # Consistência: qtd_vinculos no estabelecimentos vs contagem em vínculos por município
    vinc_por_mun = df_vinc.groupby("municipio").size().rename("count_vinc")
    qtd_estab_por_mun = df_estab.groupby("municipio")["qtd_vinculos"].sum().rename("sum_qtd_vinculos")
    for mun in MUNICIPIOS_VALIDOS:
        count_v = int(vinc_por_mun.get(mun, 0))
        sum_q = int(qtd_estab_por_mun.get(mun, 0))
        diff = abs(count_v - sum_q)
        msg = f"Consistência vínculos {mun}: vinculos.csv={count_v:,} | sum(qtd_vinculos)={sum_q:,} | diff={diff:,}"
        if diff > 0:
            warn(msg)
        else:
            ok(msg)

    # Consistência: massa_salarial vs soma remuneracao_media por município (±5%)
    mass_estab = df_estab.groupby("municipio")["massa_salarial"].sum()
    mass_vinc = df_vinc.groupby("municipio")["remuneracao_media"].sum()
    for mun in MUNICIPIOS_VALIDOS:
        me = float(mass_estab.get(mun, 0))
        mv = float(mass_vinc.get(mun, 0))
        if me == 0 and mv == 0:
            ok(f"Massa salarial {mun}: ambos zero")
            continue
        denom = max(me, mv)
        diff_pct = abs(me - mv) / denom * 100 if denom > 0 else 0
        msg = f"Massa salarial {mun}: estab={me:,.0f} | vinc={mv:,.0f} | diff={diff_pct:.1f}%"
        if diff_pct > 5:
            warn(msg)
        else:
            ok(msg)

    # % remuneracao_imputada == True por município
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_vinc[df_vinc["municipio"] == mun]
        if len(sub) == 0:
            continue
        # remuneracao_imputada pode ser bool, string ou int
        imp_col = sub["remuneracao_imputada"]
        if imp_col.dtype == object:
            n_imp = (imp_col.str.strip().str.lower() == "true").sum()
        elif imp_col.dtype == bool:
            n_imp = imp_col.sum()
        else:
            n_imp = (imp_col == 1).sum()
        pct = n_imp / len(sub) * 100
        msg = f"Imputação {mun}: {n_imp}/{len(sub)} ({pct:.1f}%) remuneracao_imputada=True"
        if pct > 30:
            warn(msg)
        else:
            ok(msg)


# ---------------------------------------------------------------------------
# 2. Educação
# ---------------------------------------------------------------------------
def check_educacao() -> None:
    section("2. Educação — escolas.csv")

    path = DATA_BASES / "escolas.csv"
    cols_esperadas = [
        "co_entidade", "no_entidade", "municipio", "tp_dependencia",
        "tp_dependencia_label", "ds_endereco", "nu_endereco", "ds_complemento",
        "no_bairro", "co_cep", "endereco_geocode",
        "qtd_mat_infantil", "qtd_mat_fundamental", "qtd_mat_medio",
        "qtd_mat_profissional", "qtd_mat_eja", "qtd_mat_especial", "qtd_mat_total",
        "qtd_doc_total", "qtd_prof_total", "latitude", "longitude",
    ]
    df = pd.read_csv(path, encoding="utf-8-sig", low_memory=False)
    _check_cols(df, cols_esperadas, "escolas.csv")
    print(f"    Linhas: {len(df):,}")

    # Contagens por município e tp_dependencia_label
    print("\n    Distribuição por município e dependência:")
    grp = df.groupby(["municipio", "tp_dependencia_label"]).size().unstack(fill_value=0)
    print(grp.to_string())

    # Verificar sentinela INEP >= 88888 nas colunas qtd_mat_*
    mat_cols = [c for c in df.columns if c.startswith("qtd_mat_")]
    sentinela_encontrada = False
    for col in mat_cols:
        n = (df[col] >= 88888).sum()
        if n > 0:
            fail(f"escolas.csv: coluna {col} tem {n} valores >= 88888 (sentinela INEP não zerada)")
            sentinela_encontrada = True
    if not sentinela_encontrada:
        ok("escolas.csv: nenhuma sentinela INEP >= 88888 encontrada nas colunas qtd_mat_*")

    # qtd_prof_total por município (informativo — possível dupla contagem)
    print("\n    [INFO] qtd_prof_total por município (possível dupla contagem):")
    for mun in MUNICIPIOS_VALIDOS:
        sub = df[df["municipio"] == mun]
        total_prof = sub["qtd_prof_total"].sum() if len(sub) > 0 else 0
        print(f"      {mun}: {total_prof:,.0f}")
    ok("escolas.csv: qtd_prof_total registrado (apenas informativo — ver possível dupla contagem)")

    # Taxa de geocodificação por município
    for mun in MUNICIPIOS_VALIDOS:
        sub = df[df["municipio"] == mun]
        if len(sub) == 0:
            warn(f"Geocodificação escolas {mun}: sem registros")
            continue
        n_geo = sub["latitude"].notna().sum()
        taxa = n_geo / len(sub) * 100
        msg = f"Geocodificação escolas {mun}: {n_geo}/{len(sub)} ({taxa:.1f}%)"
        if taxa < 50:
            warn(msg)
        else:
            ok(msg)


# ---------------------------------------------------------------------------
# 3. Saúde
# ---------------------------------------------------------------------------
def check_saude() -> None:
    section("3a. Saúde — saude_estabelecimentos.csv")

    path_estab = DATA_BASES / "saude_estabelecimentos.csv"
    cols_estab = [
        "co_cnes", "no_fantasia", "municipio", "tp_unidade", "tp_unidade_label",
        "rua", "numero", "complemento", "bairro", "cep",
        "latitude", "longitude", "vinc_sus", "leitos_total",
        "qtd_profissionais", "endereco_geocode",
    ]
    df_estab = pd.read_csv(path_estab, encoding="utf-8-sig", low_memory=False)
    _check_cols(df_estab, cols_estab, "saude_estabelecimentos.csv")
    print(f"    Linhas: {len(df_estab):,}")

    # Distribuição tp_unidade_label por município
    print("\n    Distribuição tp_unidade_label por município (top 5 por mun):")
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_estab[df_estab["municipio"] == mun]
        if len(sub) == 0:
            print(f"      {mun}: sem registros")
            continue
        dist = sub["tp_unidade_label"].value_counts().head(5)
        print(f"      {mun} ({len(sub)} registros):")
        for lbl, cnt in dist.items():
            print(f"        {lbl}: {cnt}")

    # Taxa geocodificação por município
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_estab[df_estab["municipio"] == mun]
        if len(sub) == 0:
            warn(f"Geocodificação saúde estab. {mun}: sem registros")
            continue
        n_geo = sub["latitude"].notna().sum()
        taxa = n_geo / len(sub) * 100
        msg = f"Geocodificação saúde estab. {mun}: {n_geo}/{len(sub)} ({taxa:.1f}%)"
        if taxa < 50:
            warn(msg)
        else:
            ok(msg)

    # --- Diagnóstico de coords Rio Grande vs ZIP fonte ---
    print("\n    [DIAGNÓSTICO] Rio Grande — coords na fonte CNES ZIP:")
    if CNES_ZIP_CONFIG.exists():
        ok(f"CNES_ZIP do config existe: {CNES_ZIP_CONFIG}")
    elif CNES_ZIP_REAL.exists():
        warn(f"MISMATCH: config aponta para {CNES_ZIP_CONFIG} (não existe), mas ZIP real está em {CNES_ZIP_REAL}")
        # Diagnóstico via ZIP real
        _diagnostico_rg_zip(CNES_ZIP_REAL, df_estab)
    else:
        warn(f"ZIP CNES não encontrado em nenhum path: {CNES_ZIP_CONFIG} | {CNES_ZIP_REAL}")

    section("3b. Saúde — saude_profissionais.csv")

    path_prof = DATA_BASES / "saude_profissionais.csv"
    cols_prof = [
        "co_cnes", "municipio", "cbo", "cbo_classificacao", "vinculacao",
        "prof_sus", "hora_ambulatorio", "hora_hospitalar", "hora_outros",
    ]
    df_prof = pd.read_csv(path_prof, encoding="utf-8-sig", low_memory=False)
    _check_cols(df_prof, cols_prof, "saude_profissionais.csv")
    print(f"    Linhas: {len(df_prof):,}")

    # Contagem por município e cbo_classificacao
    print("\n    Profissionais por município e cbo_classificacao:")
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_prof[df_prof["municipio"] == mun]
        if len(sub) == 0:
            print(f"      {mun}: sem registros")
            continue
        dist = sub["cbo_classificacao"].value_counts()
        print(f"      {mun} ({len(sub):,} profissionais):")
        for lbl, cnt in dist.items():
            print(f"        {lbl}: {cnt:,}")

    # Todo co_cnes em profissionais deve existir em estabelecimentos
    cnes_estab = set(df_estab["co_cnes"].astype(str))
    cnes_prof = set(df_prof["co_cnes"].astype(str))
    orphans = cnes_prof - cnes_estab
    if orphans:
        sample = sorted(orphans)[:10]
        warn(f"saude_profissionais.csv: {len(orphans)} co_cnes sem correspondente em saude_estabelecimentos.csv — amostra: {sample}")
    else:
        ok("saude_profissionais.csv: todos co_cnes existem em saude_estabelecimentos.csv")

    section("3c. SIA vs SIH — residência vs movimento")

    # SIA
    path_sia = DATA_BASES / "sia_producao.csv"
    print("\n    [INFO] Lendo sia_producao.csv (pode demorar ~8M linhas)...")
    df_sia = pd.read_csv(
        path_sia, encoding="utf-8-sig", low_memory=False,
        usecols=["municipio", "municipio_residencia", "municipio_estabelecimento"],
    )
    print(f"    Linhas SIA: {len(df_sia):,}")

    print("\n    SIA — residência vs movimento por município:")
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_sia[df_sia["municipio"] == mun]
        if len(sub) == 0:
            print(f"      {mun}: sem registros")
            continue
        n_res = (sub["municipio_residencia"].notna() & (sub["municipio_residencia"] != "")).sum()
        n_mov = (sub["municipio_estabelecimento"].notna() & (sub["municipio_estabelecimento"] != "")).sum()
        n_ambos = (
            (sub["municipio_residencia"].notna() & (sub["municipio_residencia"] != "")) &
            (sub["municipio_estabelecimento"].notna() & (sub["municipio_estabelecimento"] != ""))
        ).sum()
        total = len(sub)
        diff_pct = abs(n_res - n_mov) / total * 100 if total > 0 else 0
        print(f"      {mun}: total={total:,} | residência={n_res:,} | movimento={n_mov:,} | ambos={n_ambos:,} | diff={diff_pct:.1f}%")
    ok("SIA: residência vs movimento registrado (informativo)")

    # SIH
    path_sih = DATA_BASES / "sih_internacoes.csv"
    print("\n    [INFO] Lendo sih_internacoes.csv...")
    df_sih = pd.read_csv(
        path_sih, encoding="utf-8-sig", low_memory=False,
        usecols=["municipio", "municipio_residencia", "municipio_hospital"],
    )
    print(f"    Linhas SIH: {len(df_sih):,}")

    print("\n    SIH — residência vs hospital por município:")
    for mun in MUNICIPIOS_VALIDOS:
        sub = df_sih[df_sih["municipio"] == mun]
        if len(sub) == 0:
            print(f"      {mun}: sem registros")
            continue
        n_res = (sub["municipio_residencia"].notna() & (sub["municipio_residencia"] != "")).sum()
        n_hosp = (sub["municipio_hospital"].notna() & (sub["municipio_hospital"] != "")).sum()
        n_ambos = (
            (sub["municipio_residencia"].notna() & (sub["municipio_residencia"] != "")) &
            (sub["municipio_hospital"].notna() & (sub["municipio_hospital"] != ""))
        ).sum()
        total = len(sub)
        diff_pct = abs(n_res - n_hosp) / total * 100 if total > 0 else 0
        print(f"      {mun}: total={total:,} | residência={n_res:,} | hospital={n_hosp:,} | ambos={n_ambos:,} | diff={diff_pct:.1f}%")
    ok("SIH: residência vs hospital registrado (informativo)")


def _diagnostico_rg_zip(zip_path: Path, df_estab_processado: pd.DataFrame) -> None:
    """Lê ZIP CNES e diagnostica cobertura de coords para Rio Grande (ibge6=431560)."""
    try:
        # Identificar arquivo CSV dentro do ZIP
        with zipfile.ZipFile(zip_path) as z:
            members = z.namelist()
            csv_members = [m for m in members if m.lower().endswith(".csv")]
            print(f"      ZIP members CSV: {csv_members}")
            if not csv_members:
                warn("ZIP CNES: nenhum arquivo CSV encontrado dentro do ZIP")
                return
            csv_name = csv_members[0]
            print(f"      Lendo {csv_name} do ZIP (apenas cols relevantes, em chunks)...")

            rg_ibge6_prefix = "431560"
            total_rg = 0
            com_lat = 0
            com_lat_valida = 0

            with z.open(csv_name) as f:
                reader = pd.read_csv(
                    f, sep=";", encoding="latin1", dtype=str,
                    usecols=lambda c: c in ["CO_MUNICIPIO_GESTOR", "NU_LATITUDE", "NU_LONGITUDE"],
                    chunksize=50_000,
                )
                for chunk in reader:
                    # Filtrar Rio Grande
                    mask_rg = chunk["CO_MUNICIPIO_GESTOR"].astype(str).str.startswith(rg_ibge6_prefix)
                    sub = chunk[mask_rg]
                    if len(sub) == 0:
                        continue
                    total_rg += len(sub)
                    # Com latitude não-nula/não-vazia
                    lat_nao_vazio = sub["NU_LATITUDE"].notna() & (sub["NU_LATITUDE"].astype(str).str.strip() != "")
                    com_lat += lat_nao_vazio.sum()
                    # Numérico válido dentro do bbox RS
                    lat_num = pd.to_numeric(
                        sub.loc[lat_nao_vazio, "NU_LATITUDE"].str.replace(",", "."), errors="coerce"
                    )
                    lon_num = pd.to_numeric(
                        sub.loc[lat_nao_vazio, "NU_LONGITUDE"].str.replace(",", "."), errors="coerce"
                    )
                    valid_bbox = (
                        lat_num.between(LAT_MIN, LAT_MAX) & lon_num.between(LON_MIN, LON_MAX)
                    ).sum()
                    com_lat_valida += valid_bbox

        n_processado = len(df_estab_processado[df_estab_processado["municipio"] == "Rio Grande"])
        n_geo_processado = df_estab_processado[df_estab_processado["municipio"] == "Rio Grande"]["latitude"].notna().sum()

        print(f"      Rio Grande na fonte ZIP  : {total_rg} estabelecimentos")
        print(f"      Com NU_LATITUDE preenchida: {com_lat} ({com_lat/total_rg*100:.1f}% da fonte)" if total_rg else "")
        print(f"      Com lat/lon válido (bbox RS): {com_lat_valida}")
        print(f"      No CSV processado          : {n_processado} estab. | {n_geo_processado} geocodificados")

        if total_rg > 0:
            taxa_fonte = com_lat_valida / total_rg * 100
            taxa_proc = n_geo_processado / n_processado * 100 if n_processado > 0 else 0
            msg = (
                f"Diagnóstico RG: fonte ZIP tem {total_rg} estab., "
                f"{com_lat_valida} com coords válidas ({taxa_fonte:.1f}%); "
                f"CSV processado tem {n_processado} estab., {n_geo_processado} geocodificados ({taxa_proc:.1f}%)"
            )
            ok(msg)
    except Exception as e:
        warn(f"Diagnóstico RG ZIP falhou: {e}")


# ---------------------------------------------------------------------------
# 4. Agricultura
# ---------------------------------------------------------------------------
def check_agricultura() -> None:
    section("4. Agricultura — agricultura.csv")

    path = DATA_BASES / "agricultura.csv"
    cols_esperadas = ["municipio", "ano", "cultura", "area_ha", "area_pct"]
    df = pd.read_csv(path, encoding="utf-8-sig", low_memory=False)
    _check_cols(df, cols_esperadas, "agricultura.csv")
    print(f"    Linhas: {len(df):,}")

    # Listar todos os pares
    print("\n    Todos os registros de agricultura:")
    print(df[cols_esperadas].to_string(index=False))

    # Verificar acento
    sem_acento = "Outras Lavouras Temporarias"
    com_acento = "Outras Lavouras Temporárias"
    if sem_acento in df["cultura"].values:
        warn(f"agricultura.csv: cultura '{sem_acento}' encontrada sem acento — dashboard espera '{com_acento}'")
    else:
        ok(f"agricultura.csv: cultura '{com_acento}' com acento correto (ou ausente)")

    # Bug de área: comparar com GeoJSONs reprojetados para EPSG:32722
    print("\n    [VERIFICAÇÃO DE BUG] Área CSV vs área UTM (EPSG:32722):")
    anos = [2023, 2024]
    any_area_flag = False

    for mun, slug in MUN_SLUGS.items():
        for ano in anos:
            geojson_path = DATA_BASES / f"agricultura_{slug}_{ano}.geojson"
            if not geojson_path.exists():
                print(f"      {mun} {ano}: GeoJSON não encontrado ({geojson_path.name})")
                continue

            try:
                gdf = gpd.read_file(geojson_path)
                if gdf.empty:
                    print(f"      {mun} {ano}: GeoJSON vazio")
                    continue

                # Área por cultura via UTM
                gdf_utm = gdf.to_crs("EPSG:32722")

                # Tentar usar coluna area_ha existente; se não existir, calcular
                if "area_ha" in gdf_utm.columns:
                    area_utm_por_cultura = gdf_utm.groupby("cultura")["area_ha"].sum()
                    fonte = "coluna area_ha do GeoJSON"
                else:
                    gdf_utm["_area_ha_utm"] = gdf_utm.geometry.area / 10_000
                    area_utm_por_cultura = gdf_utm.groupby("cultura")["_area_ha_utm"].sum()
                    fonte = "geometry.area/10000 (reprojetado UTM)"

                # Buscar entradas correspondentes no CSV
                df_mun_ano = df[(df["municipio"] == mun) & (df["ano"] == ano)]
                if df_mun_ano.empty:
                    print(f"      {mun} {ano}: sem entrada no CSV")
                    continue

                print(f"      {mun} {ano} (fonte UTM: {fonte}):")
                for _, row in df_mun_ano.iterrows():
                    cultura = row["cultura"]
                    area_csv = float(row["area_ha"])
                    area_utm = float(area_utm_por_cultura.get(cultura, np.nan))
                    if np.isnan(area_utm):
                        print(f"        {cultura}: CSV={area_csv:.1f} ha | UTM=N/A (cultura ausente no GeoJSON)")
                        continue
                    diff_pct = abs(area_csv - area_utm) / area_utm * 100 if area_utm > 0 else 0
                    flag = " <-- FLAG BUG" if diff_pct > 5 else ""
                    print(f"        {cultura}: CSV={area_csv:.1f} ha | UTM={area_utm:.1f} ha | diff={diff_pct:.1f}%{flag}")
                    if diff_pct > 5:
                        any_area_flag = True

            except Exception as e:
                warn(f"Erro ao processar GeoJSON {geojson_path.name}: {e}")

    if any_area_flag:
        fail("Agricultura: diferença > 5% entre área CSV e área UTM em pelo menos um município×ano — BUG de área (pixel_ha calculado com lat errada)")
    else:
        ok("Agricultura: diferenças de área dentro de ±5% (ou GeoJSONs sem comparação disponível)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    print("=" * 70)
    print("  check_bases.py — Validação dos CSVs do pipeline BID")
    print("=" * 70)

    check_rais()
    check_educacao()
    check_saude()
    check_agricultura()

    # Resumo
    n_ok = sum(1 for s, _ in _results if s == "[OK]")
    n_warn = sum(1 for s, _ in _results if s == "[WARN]")
    n_fail = sum(1 for s, _ in _results if s == "[FAIL]")

    print("\n" + "=" * 70)
    print(f"  TOTAL: {n_ok} ok | {n_warn} avisos | {n_fail} falhas")
    print("=" * 70)

    if n_fail > 0:
        print("\nFALHAS:")
        for s, m in _results:
            if s == "[FAIL]":
                print(f"  {s} {m}")
        return 1
    return 0


if __name__ == "__main__":
    # Force UTF-8 output on Windows to avoid CP1252 mojibake
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
