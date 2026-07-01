"""
03_saude.py -- Gera bases de saude: Estabelecimentos, Profissionais, SIA e SIH.

Baixa dados do FTP DataSUS (CNES PF/ST, SIA PA, SIH RD) e cruza com
tbEstabelecimento do ZIP do CNES para endereco/lat/lon. Salva 4 tabelas
linkadas por CO_CNES.
"""

import argparse
import ftplib
import gc
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd
from pyreaddbc import dbc2dbf
import dbfread

from config import (
    CNES_ZIP,
    DATA_BASES,
    DATA_RAW_DATASUS,
    MUNICIPIOS,
    SIA_SIH_ANO,
    SIA_MESES,
    SIH_MESES,
    TIPO_ESTAB_DEPARA,
)
from common import classificar_cbo


FTP_HOST = "ftp.datasus.gov.br"
FTP_CNES = "/dissemin/publicos/CNES/200508_/Dados"
FTP_SIA = "/dissemin/publicos/SIASUS/200801_/Dados"
FTP_SIH = "/dissemin/publicos/SIHSUS/200801_/Dados"

DBF_CHUNK_SIZE = 50_000


# ---------------------------------------------------------------------------
# FTP download + DBC → DBF (sem carregar em memória)
# ---------------------------------------------------------------------------

def _get_ftp():
    ftp = ftplib.FTP(FTP_HOST, timeout=120)
    ftp.login()
    return ftp


def _ensure_dbc(ftp_dir: str, filename: str) -> Path:
    """Baixa DBC do FTP se não existir localmente. Retorna path do DBC."""
    DATA_RAW_DATASUS.mkdir(parents=True, exist_ok=True)
    dbc_path = DATA_RAW_DATASUS / filename

    if not dbc_path.exists():
        print(f"    Baixando {filename}...")
        ftp = _get_ftp()
        try:
            ftp.cwd(ftp_dir)
            with open(dbc_path, "wb") as f:
                ftp.retrbinary(f"RETR {filename}", f.write)
            print(f"    Baixado: {dbc_path.stat().st_size:,} bytes")
        finally:
            try:
                ftp.quit()
            except Exception:
                pass
    else:
        print(f"    Cache: {filename}")

    dbf_path = dbc_path.with_suffix(".dbf")
    if not dbf_path.exists():
        dbc2dbf(str(dbc_path), str(dbf_path))

    return dbf_path


def _map_municipio(cod: str, ibge6_to_nome: dict) -> str | None:
    """Retorna nome do município se o código bate, senão None."""
    cod = str(cod).strip()
    for ibge6, nome in ibge6_to_nome.items():
        if cod.startswith(ibge6):
            return nome
    return None


def read_dbf_filtered(dbf_path: Path, mun_col: str, ibge6_to_nome: dict,
                      mun_col2: str | None = None) -> pd.DataFrame:
    """Lê DBF filtrando por município durante a iteração.

    Se mun_col2 fornecido, filtra por OR (mun_col OU mun_col2 bate).
    Mapeia mun_col → 'municipio' e mun_col2 → 'municipio_col2'.
    """
    table = dbfread.DBF(str(dbf_path), encoding="latin1")
    rows = []
    n_total = 0
    for record in table:
        n_total += 1
        mun1 = _map_municipio(record.get(mun_col, ""), ibge6_to_nome)
        mun2 = _map_municipio(record.get(mun_col2, ""), ibge6_to_nome) if mun_col2 else None
        if mun1 is not None or mun2 is not None:
            record["municipio"] = mun1 or mun2
            if mun_col2:
                record["municipio_res"] = mun1 if mun1 else ""
                record["municipio_mov"] = mun2 if mun2 else ""
            rows.append(record)
        if n_total % 500_000 == 0:
            print(f"      ... {n_total:,} lidos, {len(rows):,} filtrados")

    print(f"      Total: {n_total:,} lidos, {len(rows):,} filtrados")
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows)


def read_zip_csv_filtered(zip_path: Path, csv_name: str, mun_col: str,
                          ibge6_to_nome: dict, chunk_size: int = 50_000) -> pd.DataFrame:
    """Lê CSV de dentro de um ZIP em chunks, filtrando por município."""
    frames = []
    n_total = 0
    with zipfile.ZipFile(zip_path) as z:
        with z.open(csv_name) as f:
            reader = pd.read_csv(f, sep=";", encoding="latin1", dtype=str,
                                 low_memory=False, chunksize=chunk_size)
            for chunk in reader:
                n_total += len(chunk)
                chunk[mun_col] = chunk[mun_col].astype(str).str.strip()
                mask = pd.Series(False, index=chunk.index)
                for ibge6 in ibge6_to_nome:
                    mask |= chunk[mun_col].str.startswith(ibge6)
                filtered = chunk[mask].copy()
                if len(filtered) > 0:
                    filtered["municipio"] = filtered[mun_col].apply(
                        lambda c: next((n for ib, n in ibge6_to_nome.items()
                                        if str(c).startswith(ib)), str(c))
                    )
                    frames.append(filtered)
                if n_total % 200_000 == 0:
                    print(f"      ... {n_total:,} lidos")

    print(f"      Total: {n_total:,} lidos")
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Gera bases de saude (CNES + SIA + SIH)")
    parser.add_argument("--mun", type=str, default=None, help="Nome do municipio")
    args = parser.parse_args()

    if args.mun:
        if args.mun not in MUNICIPIOS:
            print(f"Municipio '{args.mun}' nao encontrado. Disponiveis: {list(MUNICIPIOS.keys())}")
            sys.exit(1)
        targets = {args.mun: MUNICIPIOS[args.mun]}
    else:
        targets = MUNICIPIOS

    ibge6_to_nome = {cfg["ibge6"]: nome for nome, cfg in targets.items()}

    if not CNES_ZIP.exists():
        print(f"ERRO: ZIP do CNES nao encontrado: {CNES_ZIP}")
        sys.exit(1)

    # ==================================================================
    # ETAPA 1: Estabelecimentos (tbEstabelecimento do ZIP)
    # ==================================================================
    print("=" * 60)
    print("  ETAPA 1: Estabelecimentos (ZIP CNES)")
    print("=" * 60)

    estab = read_zip_csv_filtered(CNES_ZIP, "tbEstabelecimento202404.csv",
                                  "CO_MUNICIPIO_GESTOR", ibge6_to_nome)
    print(f"  Estabelecimentos filtrados: {len(estab):,}")
    gc.collect()

    # Cruzar com CNES ST do FTP para VINC_SUS e LEITHOSP
    print("  Baixando CNES ST (leitos + vinc SUS)...")
    dbf_st = _ensure_dbc(f"{FTP_CNES}/ST/", "STRS2404.dbc")
    df_st = read_dbf_filtered(dbf_st, "CODUFMUN", ibge6_to_nome)
    df_st["CNES"] = df_st["CNES"].astype(str).str.strip()
    st_agg = df_st[["CNES", "VINC_SUS", "LEITHOSP"]].copy()
    st_agg["LEITHOSP"] = pd.to_numeric(st_agg["LEITHOSP"], errors="coerce").fillna(0).astype(int)
    st_agg = st_agg.drop_duplicates(subset="CNES", keep="first")

    estab["CO_CNES"] = estab["CO_CNES"].astype(str).str.strip()
    estab = estab.merge(st_agg, left_on="CO_CNES", right_on="CNES", how="left")
    estab = estab.drop(columns=["CNES"], errors="ignore")
    estab["VINC_SUS"] = estab["VINC_SUS"].fillna("")
    estab["LEITHOSP"] = estab["LEITHOSP"].fillna(0).astype(int)

    estab["NU_LATITUDE"] = pd.to_numeric(estab["NU_LATITUDE"], errors="coerce")
    estab["NU_LONGITUDE"] = pd.to_numeric(estab["NU_LONGITUDE"], errors="coerce")

    tp_col = "CO_TIPO_ESTABELECIMENTO"
    if tp_col in estab.columns:
        estab["tp_unidade_label"] = (
            pd.to_numeric(estab[tp_col], errors="coerce")
            .map(TIPO_ESTAB_DEPARA)
            .fillna("Outros")
        )
    else:
        estab["tp_unidade_label"] = "Outros"

    for mun_nome in targets:
        n = (estab["municipio"] == mun_nome).sum()
        print(f"  {mun_nome}: {n:,} estabelecimentos")

    # ==================================================================
    # ETAPA 2: Profissionais (CNES PF do FTP)
    # ==================================================================
    print(f"\n{'='*60}")
    print("  ETAPA 2: Profissionais (CNES PF)")
    print("=" * 60)

    dbf_pf = _ensure_dbc(f"{FTP_CNES}/PF/", "PFRS2404.dbc")
    prof = read_dbf_filtered(dbf_pf, "CODUFMUN", ibge6_to_nome)
    gc.collect()
    print(f"  Profissionais filtrados: {len(prof):,}")

    prof["CNES"] = prof["CNES"].astype(str).str.strip()
    prof["CBO"] = prof["CBO"].astype(str).str.strip()
    prof["cbo_classificacao"] = prof["CBO"].apply(classificar_cbo)

    for col in ["HORA_AMB", "HORAHOSP", "HORAOUTR"]:
        prof[col] = pd.to_numeric(prof[col], errors="coerce").fillna(0).astype(int)
    prof["PROF_SUS"] = prof["PROF_SUS"].astype(str).str.strip()
    prof["VINCULAC"] = prof["VINCULAC"].astype(str).str.strip()

    # Agregar contagem por CNES para a tabela de estabelecimentos
    prof_count = prof.groupby("CNES").size().reset_index(name="qtd_profissionais")
    estab = estab.merge(prof_count, left_on="CO_CNES", right_on="CNES", how="left")
    estab = estab.drop(columns=["CNES"], errors="ignore")
    estab["qtd_profissionais"] = estab["qtd_profissionais"].fillna(0).astype(int)

    classif_counts = prof["cbo_classificacao"].value_counts()
    print("  Classificacao CBO:")
    for bucket, n in classif_counts.items():
        print(f"    {bucket}: {n:,}")

    # ==================================================================
    # ETAPA 3: SIA PA (FTP, 4 meses)
    # ==================================================================
    print(f"\n{'='*60}")
    print(f"  ETAPA 3: SIA PA ({SIA_SIH_ANO})")
    print("=" * 60)

    sia_frames = []
    for mes in SIA_MESES:
        yymm = f"{SIA_SIH_ANO % 100:02d}{mes:02d}"
        fname = f"PARS{yymm}.dbc"
        try:
            dbf_path = _ensure_dbc(FTP_SIA, fname)
            df_mes = read_dbf_filtered(dbf_path, "PA_MUNPCN", ibge6_to_nome, mun_col2="PA_UFMUN")
            if not df_mes.empty:
                sia_frames.append(df_mes)
                print(f"    {fname}: {len(df_mes):,} registros filtrados")
            del df_mes
            gc.collect()
        except Exception as e:
            print(f"    AVISO: {fname} falhou: {e}")

    if sia_frames:
        sia = pd.concat(sia_frames, ignore_index=True)
        del sia_frames
        gc.collect()
        print(f"  SIA total filtrado: {len(sia):,} registros")

        for col in ["PA_QTDAPR", "PA_VALAPR"]:
            sia[col] = pd.to_numeric(sia[col], errors="coerce").fillna(0)

        for mun_nome in targets:
            n = (sia["municipio"] == mun_nome).sum()
            v = sia.loc[sia["municipio"] == mun_nome, "PA_VALAPR"].sum()
            print(f"  {mun_nome}: {n:,} registros | R$ {v:,.2f}")
    else:
        sia = pd.DataFrame()
        print("  AVISO: nenhum dado SIA encontrado")

    # ==================================================================
    # ETAPA 4: SIH RD (FTP, 4 meses)
    # ==================================================================
    print(f"\n{'='*60}")
    print(f"  ETAPA 4: SIH RD (Jan-Jul {SIA_SIH_ANO})")
    print("=" * 60)

    sih_frames = []
    for mes in SIH_MESES:
        yymm = f"{SIA_SIH_ANO % 100:02d}{mes:02d}"
        fname = f"RDRS{yymm}.dbc"
        try:
            dbf_path = _ensure_dbc(FTP_SIH, fname)
            df_mes = read_dbf_filtered(dbf_path, "MUNIC_RES", ibge6_to_nome, mun_col2="MUNIC_MOV")
            if not df_mes.empty:
                sih_frames.append(df_mes)
                print(f"    {fname}: {len(df_mes):,} internacoes filtradas")
            del df_mes
            gc.collect()
        except Exception as e:
            print(f"    AVISO: {fname} falhou: {e}")

    if sih_frames:
        sih = pd.concat(sih_frames, ignore_index=True)
        del sih_frames
        gc.collect()
        print(f"  SIH total filtrado: {len(sih):,} internacoes")

        for col in ["DIAS_PERM", "VAL_TOT"]:
            sih[col] = pd.to_numeric(sih[col], errors="coerce").fillna(0)
        sih["MORTE"] = pd.to_numeric(sih["MORTE"], errors="coerce").fillna(0).astype(int)
        sih["IDADE"] = pd.to_numeric(sih["IDADE"], errors="coerce").fillna(0).astype(int)

        for mun_nome in targets:
            n = (sih["municipio"] == mun_nome).sum()
            ob = sih.loc[sih["municipio"] == mun_nome, "MORTE"].sum()
            print(f"  {mun_nome}: {n:,} internacoes | {int(ob)} obitos")
    else:
        sih = pd.DataFrame()
        print("  AVISO: nenhum dado SIH encontrado")

    # ==================================================================
    # ETAPA 5: Salvar
    # ==================================================================
    print(f"\n{'='*60}")
    print("  ETAPA 5: Salvar bases")
    print("=" * 60)

    DATA_BASES.mkdir(parents=True, exist_ok=True)

    # --- Estabelecimentos ---
    estab["NU_ENDERECO"] = estab["NU_ENDERECO"].fillna("S/N").astype(str).str.strip()
    estab.loc[estab["NU_ENDERECO"] == "", "NU_ENDERECO"] = "S/N"
    estab["NO_LOGRADOURO"] = estab["NO_LOGRADOURO"].fillna("").astype(str).str.strip()
    estab["NO_COMPLEMENTO"] = estab["NO_COMPLEMENTO"].fillna("").astype(str).str.strip()
    estab["NO_BAIRRO"] = estab["NO_BAIRRO"].fillna("").astype(str).str.strip()
    estab["CO_CEP"] = estab["CO_CEP"].fillna("").astype(str).str.strip()
    estab["NO_FANTASIA"] = estab["NO_FANTASIA"].fillna("").astype(str).str.strip()

    estab["endereco_geocode"] = estab.apply(
        lambda r: f"{r['NO_LOGRADOURO']}, {r['NU_ENDERECO']}, {r['NO_BAIRRO']}, {r['CO_CEP']}, {r['municipio']} - RS",
        axis=1,
    )

    estab_out = estab[[
        "CO_CNES", "NO_FANTASIA", "municipio",
        "CO_TIPO_ESTABELECIMENTO", "tp_unidade_label",
        "NO_LOGRADOURO", "NU_ENDERECO", "NO_COMPLEMENTO", "NO_BAIRRO", "CO_CEP",
        "NU_LATITUDE", "NU_LONGITUDE",
        "VINC_SUS", "LEITHOSP", "qtd_profissionais",
        "endereco_geocode",
    ]].copy()
    estab_out.columns = [
        "co_cnes", "no_fantasia", "municipio",
        "tp_unidade", "tp_unidade_label",
        "rua", "numero", "complemento", "bairro", "cep",
        "latitude", "longitude",
        "vinc_sus", "leitos_total", "qtd_profissionais",
        "endereco_geocode",
    ]

    path_estab = DATA_BASES / "saude_estabelecimentos.csv"
    estab_out.to_csv(path_estab, index=False, encoding="utf-8-sig")
    print(f"  saude_estabelecimentos.csv: {len(estab_out):,} -> {path_estab}")

    # --- Profissionais ---
    prof_out = prof[[
        "CNES", "municipio", "CBO", "cbo_classificacao",
        "VINCULAC", "PROF_SUS", "HORA_AMB", "HORAHOSP", "HORAOUTR",
    ]].copy()
    prof_out.columns = [
        "co_cnes", "municipio", "cbo", "cbo_classificacao",
        "vinculacao", "prof_sus", "hora_ambulatorio", "hora_hospitalar", "hora_outros",
    ]

    path_prof = DATA_BASES / "saude_profissionais.csv"
    prof_out.to_csv(path_prof, index=False, encoding="utf-8-sig")
    print(f"  saude_profissionais.csv: {len(prof_out):,} -> {path_prof}")

    # --- SIA ---
    if not sia.empty:
        sia["PA_CODUNI"] = sia["PA_CODUNI"].astype(str).str.strip()
        sia["PA_MUNPCN"] = sia["PA_MUNPCN"].astype(str).str.strip()
        sia["PA_UFMUN"] = sia["PA_UFMUN"].astype(str).str.strip()
        sia["municipio_res"] = sia["municipio_res"].fillna("")
        sia["municipio_mov"] = sia["municipio_mov"].fillna("")
        sia_out = sia[[
            "PA_CODUNI", "municipio", "municipio_res", "PA_MUNPCN",
            "municipio_mov", "PA_UFMUN",
            "PA_CMP", "PA_PROC_ID", "PA_CBOCOD",
            "PA_QTDAPR", "PA_VALAPR", "PA_NIVCPL", "PA_CIDPRI",
        ]].copy()
        sia_out.columns = [
            "co_cnes", "municipio", "municipio_residencia", "cod_mun_residencia",
            "municipio_estabelecimento", "cod_mun_estabelecimento",
            "competencia", "procedimento", "cbo",
            "qtd_aprovada", "valor_aprovado", "complexidade", "cid_principal",
        ]
        path_sia = DATA_BASES / "sia_producao.csv"
        sia_out.to_csv(path_sia, index=False, encoding="utf-8-sig")
        print(f"  sia_producao.csv: {len(sia_out):,} -> {path_sia}")

    # --- SIH ---
    if not sih.empty:
        sih["CNES"] = sih["CNES"].astype(str).str.strip()
        sih["competencia"] = sih["ANO_CMPT"].astype(str) + sih["MES_CMPT"].astype(str).str.zfill(2)
        sih["MUNIC_RES"] = sih["MUNIC_RES"].astype(str).str.strip()
        sih["MUNIC_MOV"] = sih["MUNIC_MOV"].astype(str).str.strip()
        sih["municipio_res"] = sih["municipio_res"].fillna("")
        sih["municipio_mov"] = sih["municipio_mov"].fillna("")
        sih_out = sih[[
            "CNES", "municipio", "municipio_res", "MUNIC_RES",
            "municipio_mov", "MUNIC_MOV",
            "competencia", "PROC_REA", "DIAG_PRINC",
            "DIAS_PERM", "VAL_TOT", "COMPLEX", "MORTE", "IDADE", "SEXO",
        ]].copy()
        sih_out.columns = [
            "co_cnes", "municipio", "municipio_residencia", "cod_mun_residencia",
            "municipio_hospital", "cod_mun_hospital",
            "competencia", "procedimento", "diag_principal",
            "dias_permanencia", "valor_total", "complexidade", "obito", "idade", "sexo",
        ]
        path_sih = DATA_BASES / "sih_internacoes.csv"
        sih_out.to_csv(path_sih, index=False, encoding="utf-8-sig")
        print(f"  sih_internacoes.csv: {len(sih_out):,} -> {path_sih}")

    # ==================================================================
    # Resumo
    # ==================================================================
    print(f"\n{'='*60}")
    print("  RESUMO")
    print("=" * 60)
    for mun_nome in targets:
        ne = (estab_out["municipio"] == mun_nome).sum()
        np_ = (prof_out["municipio"] == mun_nome).sum()
        ns = (sia_out["municipio"] == mun_nome).sum() if not sia.empty else 0
        nh = (sih_out["municipio"] == mun_nome).sum() if not sih.empty else 0
        print(f"  {mun_nome}: {ne:,} estab | {np_:,} prof | {ns:,} SIA | {nh:,} SIH")


if __name__ == "__main__":
    main()
