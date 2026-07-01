"""
check_geojson.py — Validação dos GeoJSONs gerados pelo pipeline BID.

Verifica o contrato de dados do dashboard BID:
  V1. Existência de arquivos
  V2. Features BASE vs geocodificados nos CSVs
  V3. Properties obrigatórias por setor
  V4. ATINGIDOS ⊆ BASE (n_atingidos <= n_base)
  V5. Diagnóstico RG agricultura ATINGIDOS (CRS/bounds/sobreposição)
  V6. Coords dentro do bbox RS
  V7. Agricultura — acento e stats

Execução:
    & "C:\\Users\\Alisson Fiorentin\\miniconda3\\python.exe" pipeline/validation/check_geojson.py

Saída: [OK] / [WARN] / [FAIL] por item; resumo final; exit code 1 se houver FAIL.
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path
from typing import Any

import pandas as pd

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
BASE = Path("D:/Projetos/BID")
DASH_DATA = BASE / "Dashboard BID" / "public" / "dados_convertidos"
DATA_BASES = BASE / "data" / "processed" / "bases"
DATA_RAW = BASE / "data" / "raw"

MUNICIPIOS = {
    "Eldorado do Sul": {
        "slug": "eldorado_do_sul",
        "cenarios": ["Cenario ADA"],
    },
    "Lajeado": {
        "slug": "lajeado",
        "cenarios": ["Cenario 27m", "Cenario 30m"],
    },
    "Porto Alegre": {
        "slug": "porto_alegre",
        "cenarios": ["Cenario ADA"],
    },
    "Rio Grande": {
        "slug": "rio_grande",
        "cenarios": [
            "Cenario Maio 2024",
            "Cenario Maio 2024 + 50%",
            "Cenario Setembro 2023",
        ],
    },
}

MANCHAS_RAW = {
    "Eldorado do Sul": {
        "Cenario ADA": DATA_RAW / "manchas" / "eldorado_do_sul" / "ADA Eldorado.shp",
    },
    "Lajeado": {
        "Cenario 27m": DATA_RAW / "manchas" / "lajeado" / "27m00cm.shp",
        "Cenario 30m": DATA_RAW / "manchas" / "lajeado" / "30m00cm.shp",
    },
    "Porto Alegre": {
        "Cenario ADA": DATA_RAW / "manchas" / "porto_alegre" / "enchente_poa_intersects.shp",
    },
    "Rio Grande": {
        "Cenario Maio 2024": DATA_RAW / "manchas" / "rio_grande" / "CEN_MAI2024.shp",
        "Cenario Maio 2024 + 50%": DATA_RAW / "manchas" / "rio_grande" / "CEN_MAI24_MAIS60CM.shp",
        "Cenario Setembro 2023": DATA_RAW / "manchas" / "rio_grande" / "CEN_SET2023.shp",
    },
}

MAPBIOMAS_ANOS = [2023, 2024]

# Bounding box RS
LAT_MIN, LAT_MAX = -34.0, -27.0
LON_MIN, LON_MAX = -58.0, -49.0

# Properties obrigatórias por setor
PROPS_EMPRESAS = ["CNAE_2", "Empregados", "Massa_Salarial"]
PROPS_EDUCACAO = [
    "tp_dependencia", "qtd_prof", "qtd_doc",
    "qtd_matri_inf", "qtd_matri_fund", "qtd_matri_med",
    "qtd_matri_prof", "qtd_matri_eja", "qtd_matri_esp",
    "no_entidade",
]
PROPS_SAUDE_REQUIRED = [
    "co_tipo_estabelecimento", "no_fantasia",
    "staff_acs_endemias", "staff_admin_gestao_apoio", "staff_diag_lab_imagem",
    "staff_enfermagem", "staff_farmacia", "staff_medicos", "staff_odontologia",
    "staff_outros", "staff_outros_superior_saude", "staff_servicos_gerais",
    "staff_transporte_urgencia",
]
PROPS_SAUDE_WARN = ["no_razao_social"]  # ausente esperado (Task 3)
PROPS_AGRICULTURA = ["cultura"]

# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------
_results: list[tuple[str, str]] = []


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def slugify(text: str) -> str:
    """Normaliza NFD, remove acentos, lowercase, não-alfanum → _, trim _."""
    import unicodedata
    nfd = unicodedata.normalize("NFD", text)
    ascii_only = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    lower = ascii_only.lower()
    slug = ""
    for ch in lower:
        if ch.isalnum():
            slug += ch
        else:
            slug += "_"
    # colapsar múltiplos _ e trim
    import re
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug


def cenario_slug_composto(mun_slug: str, cenario: str) -> str:
    return f"{mun_slug}___{slugify(cenario)}"


def load_geojson(path: Path) -> dict[str, Any] | None:
    """Carrega GeoJSON. Retorna None se o arquivo não existir ou for inválido."""
    if not path.exists():
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        fail(f"Erro ao carregar {path.name}: {e}")
        return None


def load_json(path: Path) -> Any:
    """Carrega JSON genérico. Retorna None se não existir ou inválido."""
    if not path.exists():
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        fail(f"Erro ao carregar {path.name}: {e}")
        return None


def geojson_n_features(path: Path) -> int | None:
    """Retorna número de features ou None se arquivo inexistente/inválido."""
    data = load_geojson(path)
    if data is None:
        return None
    return len(data.get("features", []))


def check_props(features: list[dict], required_props: list[str], label: str,
                sample_size: int = 10) -> list[str]:
    """
    Verifica que todos os features (primeiro + amostra aleatória) têm as
    propriedades obrigatórias. Retorna lista de propriedades faltando.
    """
    if not features:
        return []

    # Selecionar índices a verificar: primeiro + amostra aleatória
    indices_to_check = {0}
    if len(features) > 1:
        sample_count = min(sample_size, len(features) - 1)
        indices_to_check.update(random.sample(range(1, len(features)), sample_count))

    missing_by_prop: dict[str, int] = {p: 0 for p in required_props}
    for idx in indices_to_check:
        props = features[idx].get("properties") or {}
        for p in required_props:
            if p not in props:
                missing_by_prop[p] += 1

    missing = [p for p, cnt in missing_by_prop.items() if cnt > 0]
    return missing


# ---------------------------------------------------------------------------
# V1. Existência de arquivos
# ---------------------------------------------------------------------------
def check_v1_existencia() -> None:
    section("V1. Existência de arquivos")

    # Arquivo raiz RS (WARN — ainda não existe)
    rs_path = DASH_DATA / "mancha_rs_enchente_2024.geojson"
    if rs_path.exists():
        ok(f"mancha_rs_enchente_2024.geojson existe")
    else:
        warn("mancha_rs_enchente_2024.geojson NÃO existe (será gerado na Task 3)")

    for mun_nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        slug_dir = DASH_DATA / slug
        cen_dir = slug_dir / "cenarios"

        # Arquivos BASE
        base_files = [
            slug_dir / "empresas_BASE.geojson",
            slug_dir / "educacao_BASE.geojson",
            slug_dir / "saude_BASE.geojson",
            slug_dir / "agricultura_2023_BASE.geojson",
            slug_dir / "agricultura_2024_BASE.geojson",
            slug_dir / "agricultura_stats.json",
            slug_dir / "agricultura_stats_BASE.json",
        ]
        for fpath in base_files:
            if not fpath.exists():
                fail(f"{mun_nome} | BASE | {fpath.name}: NÃO encontrado")
            elif fpath.stat().st_size == 0:
                fail(f"{mun_nome} | BASE | {fpath.name}: arquivo VAZIO")
            else:
                # Verificar conteúdo não-vazio
                suffix = fpath.suffix.lower()
                if suffix == ".geojson":
                    data = load_geojson(fpath)
                    if data is None:
                        fail(f"{mun_nome} | BASE | {fpath.name}: JSON inválido")
                    elif len(data.get("features", [])) == 0:
                        fail(f"{mun_nome} | BASE | {fpath.name}: 0 features")
                    else:
                        ok(f"{mun_nome} | BASE | {fpath.name}: {len(data['features'])} features")
                elif suffix == ".json":
                    data = load_json(fpath)
                    if data is None:
                        fail(f"{mun_nome} | BASE | {fpath.name}: JSON inválido")
                    elif isinstance(data, dict) and len(data) == 0:
                        fail(f"{mun_nome} | BASE | {fpath.name}: dict vazio")
                    elif isinstance(data, list) and len(data) == 0:
                        fail(f"{mun_nome} | BASE | {fpath.name}: lista vazia")
                    else:
                        n = len(data) if isinstance(data, (list, dict)) else "?"
                        ok(f"{mun_nome} | BASE | {fpath.name}: {n} entradas")

        # Arquivos por cenário
        for cenario in cfg["cenarios"]:
            cen_slug_comp = cenario_slug_composto(slug, cenario)
            cen_label = f"{mun_nome} | {cenario}"

            cen_files = [
                cen_dir / f"{cen_slug_comp}.geojson",
                cen_dir / f"empresas_ATINGIDOS_{cen_slug_comp}.geojson",
                cen_dir / f"educacao_ATINGIDOS_{cen_slug_comp}.geojson",
                cen_dir / f"saude_ATINGIDOS_{cen_slug_comp}.geojson",
                cen_dir / f"agricultura_ATINGIDOS_{cen_slug_comp}.geojson",
                cen_dir / f"agricultura_stats_{cen_slug_comp}.json",
            ]
            for fpath in cen_files:
                if not fpath.exists():
                    fail(f"{cen_label} | {fpath.name}: NÃO encontrado")
                elif fpath.stat().st_size == 0:
                    fail(f"{cen_label} | {fpath.name}: arquivo VAZIO")
                else:
                    suffix = fpath.suffix.lower()
                    if suffix == ".geojson":
                        data = load_geojson(fpath)
                        if data is None:
                            fail(f"{cen_label} | {fpath.name}: JSON inválido")
                        else:
                            n = len(data.get("features", []))
                            ok(f"{cen_label} | {fpath.name}: {n} features")
                    elif suffix == ".json":
                        data = load_json(fpath)
                        if data is None:
                            fail(f"{cen_label} | {fpath.name}: JSON inválido")
                        else:
                            n = len(data) if isinstance(data, (list, dict)) else "?"
                            ok(f"{cen_label} | {fpath.name}: {n} entradas")


# ---------------------------------------------------------------------------
# V2. Features BASE vs geocodificados nos CSVs
# ---------------------------------------------------------------------------
def check_v2_features_vs_geocodificados() -> None:
    section("V2. Features BASE vs geocodificados nos CSVs")

    # Carregar CSVs
    try:
        df_estab = pd.read_csv(
            DATA_BASES / "estabelecimentos.csv", encoding="utf-8-sig", low_memory=False
        )
    except FileNotFoundError:
        warn("V2: estabelecimentos.csv não encontrado — pulando verificação de empresas")
        df_estab = None

    try:
        df_escolas = pd.read_csv(
            DATA_BASES / "escolas.csv", encoding="utf-8-sig", low_memory=False
        )
    except FileNotFoundError:
        warn("V2: escolas.csv não encontrado — pulando verificação de educação")
        df_escolas = None

    try:
        df_saude = pd.read_csv(
            DATA_BASES / "saude_estabelecimentos.csv", encoding="utf-8-sig", low_memory=False
        )
    except FileNotFoundError:
        warn("V2: saude_estabelecimentos.csv não encontrado — pulando verificação de saúde")
        df_saude = None

    for mun_nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        slug_dir = DASH_DATA / slug

        # Empresas
        if df_estab is not None:
            sub = df_estab[df_estab["municipio"] == mun_nome]
            n_geocod = int(sub["latitude"].notna().sum())
            geojson_path = slug_dir / "empresas_BASE.geojson"
            n_geojson = geojson_n_features(geojson_path)
            if n_geojson is None:
                warn(f"{mun_nome} | empresas: GeoJSON BASE inexistente, não é possível comparar")
            else:
                _compare_counts(n_geocod, n_geojson, f"{mun_nome} | empresas_BASE")

        # Educação
        if df_escolas is not None:
            sub = df_escolas[df_escolas["municipio"] == mun_nome]
            n_geocod = int(sub["latitude"].notna().sum())
            geojson_path = slug_dir / "educacao_BASE.geojson"
            n_geojson = geojson_n_features(geojson_path)
            if n_geojson is None:
                warn(f"{mun_nome} | educacao: GeoJSON BASE inexistente, não é possível comparar")
            else:
                _compare_counts(n_geocod, n_geojson, f"{mun_nome} | educacao_BASE")

        # Saúde
        if df_saude is not None:
            sub = df_saude[df_saude["municipio"] == mun_nome]
            n_geocod = int(sub["latitude"].notna().sum())
            geojson_path = slug_dir / "saude_BASE.geojson"
            n_geojson = geojson_n_features(geojson_path)
            if n_geojson is None:
                warn(f"{mun_nome} | saude: GeoJSON BASE inexistente, não é possível comparar")
            else:
                _compare_counts(n_geocod, n_geojson, f"{mun_nome} | saude_BASE")


def _compare_counts(n_csv: int, n_geojson: int, label: str) -> None:
    diff = abs(n_csv - n_geojson)
    if n_csv == 0 and n_geojson == 0:
        warn(f"{label}: ambos zerados (CSV geocodificados=0, GeoJSON features=0)")
        return
    denom = max(n_csv, n_geojson)
    diff_pct = diff / denom * 100 if denom > 0 else 0
    msg = f"{label}: CSV_geocod={n_csv} | GeoJSON={n_geojson} | diff={diff} ({diff_pct:.1f}%)"
    if diff == 0:
        ok(msg)
    elif diff_pct <= 5.0:
        warn(msg)
    else:
        fail(msg)


# ---------------------------------------------------------------------------
# V3. Properties obrigatórias por setor
# ---------------------------------------------------------------------------
def check_v3_properties() -> None:
    section("V3. Properties obrigatórias por setor")

    for mun_nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        slug_dir = DASH_DATA / slug

        # Empresas
        path = slug_dir / "empresas_BASE.geojson"
        data = load_geojson(path)
        if data is not None:
            features = data.get("features", [])
            missing = check_props(features, PROPS_EMPRESAS, f"{mun_nome} | empresas_BASE")
            if missing:
                fail(f"{mun_nome} | empresas_BASE: properties faltando: {missing}")
            else:
                ok(f"{mun_nome} | empresas_BASE: todas as properties obrigatórias presentes")

        # Educação
        path = slug_dir / "educacao_BASE.geojson"
        data = load_geojson(path)
        if data is not None:
            features = data.get("features", [])
            missing = check_props(features, PROPS_EDUCACAO, f"{mun_nome} | educacao_BASE")
            if missing:
                fail(f"{mun_nome} | educacao_BASE: properties faltando: {missing}")
            else:
                ok(f"{mun_nome} | educacao_BASE: todas as properties obrigatórias presentes")

        # Saúde — required
        path = slug_dir / "saude_BASE.geojson"
        data = load_geojson(path)
        if data is not None:
            features = data.get("features", [])
            missing = check_props(features, PROPS_SAUDE_REQUIRED, f"{mun_nome} | saude_BASE")
            if missing:
                fail(f"{mun_nome} | saude_BASE: properties faltando: {missing}")
            else:
                ok(f"{mun_nome} | saude_BASE: todas as properties obrigatórias presentes")
            # Saúde — warn (faltante esperado)
            missing_warn = check_props(features, PROPS_SAUDE_WARN, f"{mun_nome} | saude_BASE (warn)")
            if missing_warn:
                warn(
                    f"{mun_nome} | saude_BASE: properties ausentes (esperado — será corrigido na Task 3): {missing_warn}"
                )
            else:
                ok(f"{mun_nome} | saude_BASE: {PROPS_SAUDE_WARN} presente(s)")

        # Agricultura (ambos os anos)
        for ano in MAPBIOMAS_ANOS:
            path = slug_dir / f"agricultura_{ano}_BASE.geojson"
            data = load_geojson(path)
            if data is not None:
                features = data.get("features", [])
                missing = check_props(features, PROPS_AGRICULTURA, f"{mun_nome} | agricultura_{ano}_BASE")
                if missing:
                    fail(f"{mun_nome} | agricultura_{ano}_BASE: properties faltando: {missing}")
                else:
                    ok(f"{mun_nome} | agricultura_{ano}_BASE: property 'cultura' presente")


# ---------------------------------------------------------------------------
# V4. ATINGIDOS ⊆ BASE
# ---------------------------------------------------------------------------
def check_v4_atingidos_subset() -> None:
    section("V4. ATINGIDOS ⊆ BASE (n_atingidos <= n_base)")

    for mun_nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        slug_dir = DASH_DATA / slug
        cen_dir = slug_dir / "cenarios"

        # Contar features BASE por setor
        base_counts: dict[str, int | None] = {}
        for setor in ["empresas", "educacao", "saude"]:
            base_counts[setor] = geojson_n_features(slug_dir / f"{setor}_BASE.geojson")

        # Agricultura: usar o ano correto por cenário (via CENARIO_PERIODO)
        # Definido em config.py como CENARIO_PERIODO → PERIODO_ANO
        CENARIO_PERIODO = {
            "lajeado___cenario_27m": "maio_2024",
            "lajeado___cenario_30m": "maio_2024",
            "eldorado_do_sul___cenario_ada": "maio_2024",
            "porto_alegre___cenario_ada": "maio_2024",
            "rio_grande___cenario_maio_2024": "maio_2024",
            "rio_grande___cenario_maio_2024_50": "maio_2024",
            "rio_grande___cenario_setembro_2023": "setembro_2023",
        }
        PERIODO_ANO = {"maio_2024": 2024, "setembro_2023": 2023}

        for cenario in cfg["cenarios"]:
            cen_slug_comp = cenario_slug_composto(slug, cenario)
            cen_label = f"{mun_nome} | {cenario}"

            # Setores de ponto
            for setor in ["empresas", "educacao", "saude"]:
                n_base = base_counts.get(setor)
                atingidos_path = cen_dir / f"{setor}_ATINGIDOS_{cen_slug_comp}.geojson"
                n_atingidos = geojson_n_features(atingidos_path)
                if n_base is None or n_atingidos is None:
                    warn(f"{cen_label} | {setor}: não é possível verificar subset (arquivo ausente)")
                    continue
                msg = f"{cen_label} | {setor}: atingidos={n_atingidos} <= base={n_base}"
                if n_atingidos <= n_base:
                    ok(msg)
                else:
                    fail(f"{cen_label} | {setor}: FAIL — atingidos={n_atingidos} > base={n_base}")

            # Agricultura
            periodo = CENARIO_PERIODO.get(cen_slug_comp)
            if periodo is not None:
                ano = PERIODO_ANO.get(periodo, 2024)
                n_base_agr = geojson_n_features(slug_dir / f"agricultura_{ano}_BASE.geojson")
                atingidos_path = cen_dir / f"agricultura_ATINGIDOS_{cen_slug_comp}.geojson"
                n_atingidos_agr = geojson_n_features(atingidos_path)
                if n_base_agr is None or n_atingidos_agr is None:
                    warn(f"{cen_label} | agricultura: não é possível verificar subset (arquivo ausente)")
                else:
                    msg = f"{cen_label} | agricultura (ano={ano}): atingidos={n_atingidos_agr} <= base={n_base_agr}"
                    if n_atingidos_agr <= n_base_agr:
                        ok(msg)
                    else:
                        fail(f"{cen_label} | agricultura: FAIL — atingidos={n_atingidos_agr} > base={n_base_agr}")


# ---------------------------------------------------------------------------
# V5. Diagnóstico RG agricultura ATINGIDOS
# ---------------------------------------------------------------------------
def check_v5_rg_agricultura_diagnostico() -> None:
    section("V5. Diagnóstico RG agricultura ATINGIDOS (CRS/bounds/sobreposição)")

    try:
        import geopandas as gpd
    except ImportError:
        warn("V5: geopandas não disponível — diagnóstico RG pulado")
        return

    slug = "rio_grande"
    agr_base_path = DASH_DATA / slug / "agricultura_2024_BASE.geojson"
    agr_base_2023_path = DASH_DATA / slug / "agricultura_2023_BASE.geojson"

    if not agr_base_path.exists():
        warn("V5: agricultura_2024_BASE.geojson não encontrado — diagnóstico pulado")
        return

    try:
        agr_2024 = gpd.GeoDataFrame.from_features(
            load_geojson(agr_base_path)["features"], crs="EPSG:4326"
        )
        agr_2023 = gpd.GeoDataFrame.from_features(
            load_geojson(agr_base_2023_path)["features"], crs="EPSG:4326"
        ) if agr_base_2023_path.exists() else None

        print(f"    Agricultura BASE 2024 bounds (lon_min, lat_min, lon_max, lat_max): {agr_2024.total_bounds}")
        print(f"    Agricultura BASE 2024 n_features: {len(agr_2024)}")
        if agr_2023 is not None:
            print(f"    Agricultura BASE 2023 bounds: {agr_2023.total_bounds}")
            print(f"    Agricultura BASE 2023 n_features: {len(agr_2023)}")
    except Exception as e:
        warn(f"V5: erro ao carregar agricultura BASE: {e}")
        return

    # Cenários de Rio Grande com seus anos BASE correspondentes
    cenarios_diag = {
        "Cenario Maio 2024": ("CEN_MAI2024.shp", agr_2024, 2024),
        "Cenario Maio 2024 + 50%": ("CEN_MAI24_MAIS60CM.shp", agr_2024, 2024),
        "Cenario Setembro 2023": ("CEN_SET2023.shp", agr_2023 if agr_2023 is not None else agr_2024, 2023),
    }

    for cenario_nome, (shp_fname, agr_gdf, ano) in cenarios_diag.items():
        cen_slug_comp = cenario_slug_composto(slug, cenario_nome)
        atingidos_path = DASH_DATA / slug / "cenarios" / f"agricultura_ATINGIDOS_{cen_slug_comp}.geojson"
        n_atingidos = geojson_n_features(atingidos_path) if atingidos_path.exists() else "?"

        print(f"\n    --- {cenario_nome} (shp: {shp_fname}, base_ano={ano}, n_atingidos={n_atingidos}) ---")

        shp_path = DATA_RAW / "manchas" / "rio_grande" / shp_fname
        if not shp_path.exists():
            warn(f"V5: {shp_fname} não encontrado")
            continue

        try:
            mancha = gpd.read_file(shp_path)
            print(f"      Mancha CRS: {mancha.crs}")
            print(f"      Mancha bounds (proj): {mancha.total_bounds}")
            print(f"      Mancha n_features: {len(mancha)}")

            # Reprojetar agricultura para o CRS da mancha e intersetar
            agr_r = agr_gdf.to_crs(mancha.crs)
            print(f"      Agricultura reprojected bounds: {agr_r.total_bounds}")

            try:
                inter = gpd.overlay(agr_r, mancha[["geometry"]], how="intersection")
                n_inter = len(inter)
                print(f"      Features intersectando: {n_inter}")
                msg = (
                    f"RG {cenario_nome}: mancha CRS={mancha.crs}, "
                    f"n_atingidos_geojson={n_atingidos}, "
                    f"n_intersect_geopandas={n_inter}"
                )
                if n_atingidos == "?" or n_inter == 0:
                    warn(msg)
                elif isinstance(n_atingidos, int) and abs(n_atingidos - n_inter) > max(5, n_inter * 0.1):
                    warn(f"{msg} — discrepância entre pipeline e diagnóstico")
                else:
                    ok(msg)
            except Exception as e:
                warn(f"V5: overlay falhou para {cenario_nome}: {e}")

        except Exception as e:
            warn(f"V5: erro ao processar {shp_fname}: {e}")


# ---------------------------------------------------------------------------
# V6. Coords dentro do bbox RS
# ---------------------------------------------------------------------------
def check_v6_coords_bbox() -> None:
    section("V6. Coords dentro do bbox RS")

    for mun_nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        slug_dir = DASH_DATA / slug

        for setor in ["empresas", "educacao"]:
            path = slug_dir / f"{setor}_BASE.geojson"
            data = load_geojson(path)
            if data is None:
                continue

            features = data.get("features", [])
            n_total = len(features)
            n_fora = 0
            n_sem_coords = 0

            for feat in features:
                geom = feat.get("geometry")
                if geom is None or geom.get("type") != "Point":
                    n_sem_coords += 1
                    continue
                coords = geom.get("coordinates", [])
                if len(coords) < 2:
                    n_sem_coords += 1
                    continue
                lon, lat = coords[0], coords[1]
                if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
                    n_fora += 1

            label = f"{mun_nome} | {setor}_BASE"
            if n_sem_coords > 0:
                warn(f"{label}: {n_sem_coords} features sem coords de ponto válidas")
            if n_fora == 0:
                ok(f"{label}: todas as {n_total} features dentro do bbox RS")
            else:
                warn(f"{label}: {n_fora}/{n_total} features fora do bbox RS (lat -34→-27, lon -58→-49)")


# ---------------------------------------------------------------------------
# V7. Agricultura — acento e stats
# ---------------------------------------------------------------------------
def check_v7_agricultura_acento() -> None:
    section("V7. Agricultura — acento e stats")

    SEM_ACENTO = "Outras Lavouras Temporarias"
    COM_ACENTO = "Outras Lavouras Temporárias"

    for mun_nome, cfg in MUNICIPIOS.items():
        slug = cfg["slug"]
        slug_dir = DASH_DATA / slug

        # Verificar nos GeoJSONs de agricultura BASE
        for ano in MAPBIOMAS_ANOS:
            path = slug_dir / f"agricultura_{ano}_BASE.geojson"
            data = load_geojson(path)
            if data is None:
                continue
            features = data.get("features", [])
            culturas = set()
            for feat in features:
                props = feat.get("properties") or {}
                c = props.get("cultura")
                if c:
                    culturas.add(c)

            if SEM_ACENTO in culturas and COM_ACENTO not in culturas:
                warn(
                    f"{mun_nome} | agricultura_{ano}_BASE: cultura '{SEM_ACENTO}' sem acento "
                    f"(dashboard espera '{COM_ACENTO}') — será corrigido na Task 3"
                )
            elif COM_ACENTO in culturas:
                ok(f"{mun_nome} | agricultura_{ano}_BASE: cultura '{COM_ACENTO}' com acento correto")
            else:
                # Cultura pode não existir neste município
                outras = [c for c in culturas if "lavoura" in c.lower() or "tempor" in c.lower()]
                if outras:
                    warn(f"{mun_nome} | agricultura_{ano}_BASE: culturas temporárias encontradas com nome diferente: {outras}")
                else:
                    ok(f"{mun_nome} | agricultura_{ano}_BASE: 'Outras Lavouras Temporárias' ausente neste município/ano (ok)")

        # Verificar agricultura_stats_BASE.json
        stats_base_path = slug_dir / "agricultura_stats_BASE.json"
        stats_base = load_json(stats_base_path)
        if stats_base is not None and isinstance(stats_base, dict):
            if SEM_ACENTO in stats_base and COM_ACENTO not in stats_base:
                warn(
                    f"{mun_nome} | agricultura_stats_BASE.json: chave '{SEM_ACENTO}' sem acento "
                    f"(dashboard espera '{COM_ACENTO}') — será corrigido na Task 3"
                )
            elif COM_ACENTO in stats_base:
                ok(f"{mun_nome} | agricultura_stats_BASE.json: chave '{COM_ACENTO}' com acento correto")
            else:
                ok(f"{mun_nome} | agricultura_stats_BASE.json: 'Outras Lavouras Temporárias' ausente (ok para este município)")

        # Verificar agricultura_stats.json (array de records)
        stats_path = slug_dir / "agricultura_stats.json"
        stats = load_json(stats_path)
        if stats is not None and isinstance(stats, list):
            culturas_stats = {rec.get("cultura") for rec in stats if isinstance(rec, dict)}
            if SEM_ACENTO in culturas_stats and COM_ACENTO not in culturas_stats:
                warn(
                    f"{mun_nome} | agricultura_stats.json: cultura '{SEM_ACENTO}' sem acento "
                    f"(dashboard espera '{COM_ACENTO}') — será corrigido na Task 3"
                )
            elif COM_ACENTO in culturas_stats:
                ok(f"{mun_nome} | agricultura_stats.json: cultura '{COM_ACENTO}' com acento correto")

        # Verificar cenários
        cen_dir = slug_dir / "cenarios"
        for cenario in cfg["cenarios"]:
            cen_slug_comp = cenario_slug_composto(slug, cenario)
            cen_stats_path = cen_dir / f"agricultura_stats_{cen_slug_comp}.json"
            cen_stats = load_json(cen_stats_path)
            if cen_stats is not None and isinstance(cen_stats, dict):
                if SEM_ACENTO in cen_stats and COM_ACENTO not in cen_stats:
                    warn(
                        f"{mun_nome} | {cenario} | agricultura_stats: chave '{SEM_ACENTO}' sem acento "
                        f"— será corrigido na Task 3"
                    )
                elif COM_ACENTO in cen_stats:
                    ok(f"{mun_nome} | {cenario} | agricultura_stats: chave '{COM_ACENTO}' com acento correto")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    print("=" * 70)
    print("  check_geojson.py — Validação dos GeoJSONs do pipeline BID")
    print("=" * 70)

    check_v1_existencia()
    check_v2_features_vs_geocodificados()
    check_v3_properties()
    check_v4_atingidos_subset()
    check_v5_rg_agricultura_diagnostico()
    check_v6_coords_bbox()
    check_v7_agricultura_acento()

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
    # Force UTF-8 output on Windows para evitar mojibake CP1252
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
