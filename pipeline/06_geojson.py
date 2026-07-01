"""
06_geojson.py -- Gera todos os GeoJSONs (BASE + ATINGIDOS) para o Dashboard.

Le estabelecimentos/escolas/saude_estabelecimentos de data/processed/bases/
(geocodificadas pelo 05_geocodificar.py) e os GeoJSONs de agricultura gerados
pelo 04_agricultura.py, organiza tudo em
Dashboard BID/public/dados_convertidos/{slug}/:
  - {setor}_BASE.geojson           (empresas, educacao, saude: todos os pontos geocodificados;
                                     empresas/educacao/saude carregam aliases de propriedades
                                     no formato esperado pelo Dashboard -- ver _add_dashboard_aliases_*)
  - agricultura_{ano}_BASE.geojson (poligonos de uso do solo agricola, por ano)
  - agricultura_stats_BASE.json    (dict {cultura: area_ha} do ano mais recente, formato Dashboard)
  - agricultura_stats.json         (area ha/% por cultura x ano, formato interno/relatorios)
  - cenarios/{cen_slug}.geojson
        (a propria mancha de inundacao convertida em GeoJSON -- usada pelo Dashboard para saber
         se o cenario esta "ativo")
  - cenarios/{setor}_ATINGIDOS_{cen_slug}.geojson
        (empresas/educacao/saude: subconjunto dentro da mancha de inundacao de cada cenario,
         ponto-em-poligono; agricultura: poligonos recortados pela mancha, suavizados)
  - cenarios/agricultura_stats_{cen_slug}.json
        (dict {cultura: area_ha} da agricultura atingida, formato Dashboard)

Uso:  python 06_geojson.py [--mun "Porto Alegre"]
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd

from config import (
    MUNICIPIOS, DATA_BASES, DASH_DATA, MANCHAS, MAPBIOMAS_ANOS,
    CENARIO_PERIODO, PERIODO_ANO, STAFF_BUCKETS,
)
from common import (
    df_to_geojson, save_geojson, load_geojson,
    intersect_points_with_mancha, intersect_polygons_with_mancha,
    mancha_to_geojson, slugify, pct,
)


SETORES_PONTOS = ["empresas", "educacao", "saude"]


# ---------------------------------------------------------------------------
# Aliases de propriedades (schema esperado pelo Dashboard)
# ---------------------------------------------------------------------------

def _add_dashboard_aliases_empresas(empresas: pd.DataFrame) -> None:
    empresas["salario_medio"] = 0.0
    mask = empresas["qtd_vinculos"] > 0
    empresas.loc[mask, "salario_medio"] = (
        empresas.loc[mask, "massa_salarial"] / empresas.loc[mask, "qtd_vinculos"]
    ).round(2)
    empresas["CNAE_2"] = empresas["setor"]
    empresas["Empregados"] = empresas["qtd_vinculos"]
    empresas["Massa_Salarial"] = empresas["massa_salarial"]


def _add_dashboard_aliases_educacao(escolas: pd.DataFrame) -> None:
    escolas["qtd_prof"] = escolas["qtd_prof_total"]
    escolas["qtd_doc"] = escolas["qtd_doc_total"]
    escolas["qtd_matri_inf"] = escolas["qtd_mat_infantil"]
    escolas["qtd_matri_fund"] = escolas["qtd_mat_fundamental"]
    escolas["qtd_matri_med"] = escolas["qtd_mat_medio"]
    escolas["qtd_matri_prof"] = escolas["qtd_mat_profissional"]
    escolas["qtd_matri_eja"] = escolas["qtd_mat_eja"]
    escolas["qtd_matri_esp"] = escolas["qtd_mat_especial"]


_LABEL_ACCENT_FIX = {
    "Unidade Basica de Saude": "Unidade Básica de Saúde",
    "Ambulatorio": "Ambulatório",
}


def _add_dashboard_aliases_saude(saude: pd.DataFrame) -> pd.DataFrame:
    saude["co_tipo_estabelecimento"] = saude["tp_unidade_label"].replace(_LABEL_ACCENT_FIX)

    prof_path = DATA_BASES / "saude_profissionais.csv"
    if not prof_path.exists():
        print("    AVISO: saude_profissionais.csv nao encontrado, staff_* ficara zerado")
        for col in STAFF_BUCKETS:
            saude[col] = 0
        return saude

    prof = pd.read_csv(prof_path, encoding="utf-8-sig", dtype={"co_cnes": str})
    staff_counts = (
        prof.pivot_table(index="co_cnes", columns="cbo_classificacao", aggfunc="size", fill_value=0)
        .reindex(columns=STAFF_BUCKETS, fill_value=0)
        .reset_index()
    )
    saude = saude.merge(staff_counts, on="co_cnes", how="left")
    for col in STAFF_BUCKETS:
        saude[col] = saude[col].fillna(0).astype(int)
    return saude


# ---------------------------------------------------------------------------
# BASE (empresas / educacao / saude)
# ---------------------------------------------------------------------------

def _geocoded(df: pd.DataFrame, nome: str) -> pd.DataFrame:
    sub = df[df["municipio"] == nome].copy()
    return sub[sub["latitude"].notna() & sub["longitude"].notna()]


def _make_base(df_all: pd.DataFrame, nome: str, slug: str, setor: str, label: str) -> int:
    sub = _geocoded(df_all, nome)
    if sub.empty:
        print(f"    AVISO: nenhum(a) {label} geocodificado(a) para {nome}")
        return 0

    prop_cols = [c for c in sub.columns if c not in ["latitude", "longitude"]]
    gj = df_to_geojson(sub, "latitude", "longitude", prop_cols)

    out_path = DASH_DATA / slug / f"{setor}_BASE.geojson"
    return save_geojson(gj, out_path)


# ---------------------------------------------------------------------------
# Agricultura (copia os GeoJSONs/stats gerados pelo 04_agricultura.py)
# ---------------------------------------------------------------------------

def make_agricultura(df_stats: pd.DataFrame, nome: str, slug: str) -> int:
    n_total = 0
    for ano in MAPBIOMAS_ANOS:
        src_path = DATA_BASES / f"agricultura_{slug}_{ano}.geojson"
        gj = load_geojson(src_path)
        if not gj:
            print(f"    AVISO: agricultura {ano} nao encontrada para {nome}")
            continue
        out_path = DASH_DATA / slug / f"agricultura_{ano}_BASE.geojson"
        n = save_geojson(gj, out_path)
        n_total += n

    sub_stats = df_stats[df_stats["municipio"] == nome] if df_stats is not None else pd.DataFrame()
    if not sub_stats.empty:
        out_stats = DASH_DATA / slug / "agricultura_stats.json"
        out_stats.parent.mkdir(parents=True, exist_ok=True)
        with open(out_stats, "w", encoding="utf-8") as f:
            json.dump(sub_stats.drop(columns=["municipio"]).to_dict(orient="records"), f, ensure_ascii=False, indent=2)

        ano_recente = max(MAPBIOMAS_ANOS)
        sub_recente = sub_stats[sub_stats["ano"] == ano_recente]
        stats_dict = dict(zip(sub_recente["cultura"], sub_recente["area_ha"].round(1)))
        out_stats_base = DASH_DATA / slug / "agricultura_stats_BASE.json"
        with open(out_stats_base, "w", encoding="utf-8") as f:
            json.dump(stats_dict, f, ensure_ascii=False, indent=2)

    return n_total


# ---------------------------------------------------------------------------
# Atingidos (intersecao ponto-em-poligono com manchas de inundacao)
# ---------------------------------------------------------------------------

def make_atingidos(nome: str, cfg: dict, slug: str) -> None:
    manchas_mun = MANCHAS.get(nome, {})

    for cen in cfg["cenarios"]:
        cen_slug = f"{slug}___{slugify(cen)}"
        mancha_path = manchas_mun.get(cen)

        if not mancha_path or not mancha_path.exists():
            print(f"    {cen}: mancha nao encontrada, pulando")
            continue

        cen_label = cen.replace("Cenario ", "")
        print(f"    {cen_label}:")

        # --- mancha (a propria area de inundacao, em GeoJSON) ---
        mancha_gj = mancha_to_geojson(mancha_path)
        if mancha_gj:
            save_geojson(mancha_gj, DASH_DATA / slug / "cenarios" / f"{cen_slug}.geojson")

        # --- empresas / educacao / saude (ponto-em-poligono) ---
        for setor in SETORES_PONTOS:
            base_path = DASH_DATA / slug / f"{setor}_BASE.geojson"
            base_gj = load_geojson(base_path)

            if not base_gj:
                print(f"      {setor}: BASE nao encontrado")
                continue

            n_base = len(base_gj["features"])
            at_gj = intersect_points_with_mancha(base_gj, mancha_path)

            if at_gj is None:
                print(f"      {setor}: erro na intersecao")
                continue

            out_path = DASH_DATA / slug / "cenarios" / f"{setor}_ATINGIDOS_{cen_slug}.geojson"
            n_at = save_geojson(at_gj, out_path)
            print(f"      {setor}: {n_base} -> {n_at} atingidos ({pct(n_at, n_base)}%)")

        # --- agricultura (poligono recortado pela mancha) ---
        periodo = CENARIO_PERIODO.get(cen_slug)
        ano = PERIODO_ANO.get(periodo)
        if ano is None:
            print(f"      agricultura: periodo/ano nao mapeado para {cen_slug}, pulando")
            continue

        agr_base_gj = load_geojson(DASH_DATA / slug / f"agricultura_{ano}_BASE.geojson")
        if not agr_base_gj:
            print(f"      agricultura: BASE {ano} nao encontrada")
            continue

        agr_at_gj = intersect_polygons_with_mancha(agr_base_gj, mancha_path)
        if agr_at_gj is None:
            print("      agricultura: erro na intersecao")
            continue

        out_path = DASH_DATA / slug / "cenarios" / f"agricultura_ATINGIDOS_{cen_slug}.geojson"
        n_at = save_geojson(agr_at_gj, out_path)
        area_total = sum(f["properties"].get("area_ha", 0) for f in agr_at_gj["features"])
        print(f"      agricultura (MapBiomas {ano}): {n_at} poligonos, {area_total:,.1f} ha atingidos")

        area_by_cultura = defaultdict(float)
        for f in agr_at_gj["features"]:
            area_by_cultura[f["properties"].get("cultura", "?")] += f["properties"].get("area_ha", 0)
        stats_dict = {k: round(v, 1) for k, v in area_by_cultura.items()}
        out_stats = DASH_DATA / slug / "cenarios" / f"agricultura_stats_{cen_slug}.json"
        with open(out_stats, "w", encoding="utf-8") as f:
            json.dump(stats_dict, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Gera GeoJSONs BASE + ATINGIDOS para o Dashboard")
    parser.add_argument("--mun", type=str, default=None)
    args = parser.parse_args()

    print("=" * 60)
    print("  06 - Gerar GeoJSONs (BASE + ATINGIDOS) para o Dashboard")
    print("=" * 60)

    targets = {args.mun: MUNICIPIOS[args.mun]} if args.mun else MUNICIPIOS

    print("\nCarregando bases...")
    empresas = pd.read_csv(DATA_BASES / "estabelecimentos.csv", encoding="utf-8-sig")
    _add_dashboard_aliases_empresas(empresas)

    escolas = pd.read_csv(DATA_BASES / "escolas.csv", encoding="utf-8-sig")
    _add_dashboard_aliases_educacao(escolas)

    saude = pd.read_csv(DATA_BASES / "saude_estabelecimentos.csv", encoding="utf-8-sig", dtype={"co_cnes": str})
    saude = _add_dashboard_aliases_saude(saude)
    print(f"  Empresas: {len(empresas):,} | Escolas: {len(escolas):,} | Saude: {len(saude):,}")

    agricultura_csv = DATA_BASES / "agricultura.csv"
    df_agricultura = pd.read_csv(agricultura_csv, encoding="utf-8-sig") if agricultura_csv.exists() else None
    if df_agricultura is None:
        print("  AVISO: agricultura.csv nao encontrado (rode 04_agricultura.py antes)")

    for nome, cfg in targets.items():
        slug = cfg["slug"]
        print(f"\n{'='*60}")
        print(f"  {nome}")
        print(f"{'='*60}")

        print("  BASE:")
        n_emp = _make_base(empresas, nome, slug, "empresas", "estabelecimento")
        n_edu = _make_base(escolas, nome, slug, "educacao", "escola")
        n_sau = _make_base(saude, nome, slug, "saude", "estabelecimento de saude")
        n_agr = make_agricultura(df_agricultura, nome, slug)
        print(f"    empresas:    {n_emp} features")
        print(f"    educacao:    {n_edu} features")
        print(f"    saude:       {n_sau} features")
        print(f"    agricultura: {n_agr} features")

        print("  ATINGIDOS:")
        make_atingidos(nome, cfg, slug)

    print("\nConcluido.")


if __name__ == "__main__":
    main()
