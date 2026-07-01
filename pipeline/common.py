"""
Helpers compartilhados por todos os scripts do pipeline.
"""

import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"^_+|_+$", "", s)
    return s


def find_col(df, *keywords):
    """Encontra coluna cujo nome contem todas as keywords (case-insensitive)."""
    for c in df.columns:
        if all(k.lower() in c.lower() for k in keywords):
            return c
    return None


def limpar_numerico(series):
    """Converte serie para float, detectando formato BR (virgula decimal) vs internacional."""
    if pd.api.types.is_numeric_dtype(series):
        return series.astype(float)
    s = series.astype(str)
    tem_virgula = s.str.contains(",", na=False).any()
    if tem_virgula:
        s = s.str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
    return pd.to_numeric(
        s.str.extract(r"(\-?\d+\.?\d*)")[0],
        errors="coerce",
    )


def zfill_cnpj(series, width=14):
    """Zero-pad CNPJ para largura fixa, removendo caracteres nao-numericos."""
    return (
        series.astype(str)
        .str.replace(r"\D", "", regex=True)
        .str.zfill(width)
    )


def get_prop(props, *keys, default=0):
    """Retorna o primeiro valor nao-None entre as chaves (trata 0 como valor valido)."""
    for k in keys:
        v = props.get(k)
        if v is not None:
            return v
    return default


def coords_validas(lat, lon, lat_min=-34, lat_max=-27, lon_min=-58, lon_max=-49):
    """Retorna mask booleana: True se coordenadas estao dentro do bounding box do RS."""
    return (
        lat.notna() & lon.notna()
        & (lat != 0) & (lon != 0)
        & (lat >= lat_min) & (lat <= lat_max)
        & (lon >= lon_min) & (lon <= lon_max)
    )


def parse_endereco(nome_logradouro: str, numero_logradouro=0) -> tuple:
    """Separa logradouro RAIS em (rua, numero) para georreferenciamento.

    Na RAIS, o número do prédio (e complemento) vem embutido em nome_logradouro;
    numero_logradouro é quase sempre 0. Trata rodovias (KM), salas/lojas, e
    extrai o número do prédio do texto.
    """
    if pd.isna(nome_logradouro) or not str(nome_logradouro).strip():
        try:
            n = int(float(numero_logradouro))
            num = str(n) if n > 0 else "S/N"
        except (ValueError, TypeError):
            num = "S/N"
        return ("", num)

    raw = re.sub(r"\s+", " ", str(nome_logradouro).strip().upper())

    km_match = re.search(r"KM\s*([\d.,]+)", raw)
    if km_match:
        km_val = km_match.group(1).rstrip(".,")
        before_km = raw[:km_match.start()].strip()
        before_km = re.sub(r"\s*(PAV\.?\s*\d*|S/?N|SN)\s*$", "", before_km).strip()
        before_km = re.sub(r"\s+\d{4,}\s*$", "", before_km).strip()
        return (before_km or raw, f"KM {km_val}")

    is_rodovia = bool(re.match(r"^(ROD|RODOVIA|EST\s+BR|LOC\s+BR|BR\s*-?\s*\d|RS\s*-?\s*\d|ERS)", raw))
    if is_rodovia:
        m = re.search(r"\b(\d+)\s*$", raw)
        if m and m.group(1) != "0":
            return (raw[:m.start()].strip(), m.group(1))
        return (re.sub(r"\s*(S/?N|SN|0)\s*$", "", raw).strip(), "S/N")

    complementos = r"(?:SALA|LOJA|CONJ(?:UNTO)?|ANDAR|BLOCO|APT(?:O)?|APARTAMENTO|FARMACIA|GALPAO|GALP|PONTO|GUICH|HANGAR|CJ|PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO|QUINTO)"
    m_compl = re.search(r"\b" + complementos + r"\b", raw)
    if m_compl:
        before = raw[:m_compl.start()].strip()
        # Remove qualificadores de andar/sala so se houver outro numero antes
        before = re.sub(r"(\b\d+\s+)\d{1,2}\s*$", r"\1", before).strip()
        m_num = re.search(r"\b(\d+)\s*$", before)
        if m_num:
            return (before[:m_num.start()].strip(), m_num.group(1))
        return (before, "S/N")

    # Primeiro numero apos pelo menos uma palavra alfabetica de 3+ letras
    m_first = re.search(r"(?<=[A-Z]{3})\s+(\d+)", raw)
    if m_first and m_first.group(1) != "0":
        return (raw[:m_first.start()].strip(), m_first.group(1))

    m_last = re.search(r"\b(\d+)(?:\s+E\s+\d+)?\s*$", raw)
    if m_last and m_last.group(1) != "0":
        return (raw[:m_last.start()].strip(), m_last.group(1))

    return (raw, "S/N")


def classificar_cbo(cbo_raw: str) -> str:
    """Classifica codigo CBO (6 digitos) em bucket de staff de saude."""
    try:
        cbo = str(cbo_raw).strip()
        cbo4 = int(cbo[:4])
    except (ValueError, TypeError):
        return "staff_outros"

    if cbo4 in (2251, 2252, 2253, 2231):
        return "staff_medicos"
    if cbo4 == 2232:
        return "staff_odontologia"
    if cbo4 == 2234:
        return "staff_farmacia"
    if cbo4 in (2235, 3222):
        return "staff_enfermagem"
    if 2236 <= cbo4 <= 2239:
        return "staff_outros_superior_saude"
    if 3211 <= cbo4 <= 3214:
        return "staff_diag_lab_imagem"
    if cbo4 in (3531, 5151):
        return "staff_acs_endemias"
    if cbo4 == 3522:
        return "staff_transporte_urgencia"
    if cbo[0] == "4" or 2521 <= cbo4 <= 2524:
        return "staff_admin_gestao_apoio"
    if cbo[0] == "5":
        return "staff_servicos_gerais"
    return "staff_outros"


def cnae_to_denominacao(cnae_code):
    """Converte codigo CNAE para denominacao do setor (2 primeiros digitos)."""
    try:
        cnae2 = int(str(cnae_code).strip()[:2])
    except (ValueError, TypeError):
        return "OUTRAS ATIVIDADES DE SERVICOS"
    if 1 <= cnae2 <= 3: return "AGRICULTURA, PECUARIA, PRODUCAO FLORESTAL, PESCA E AQUICULTURA"
    if 5 <= cnae2 <= 9: return "INDUSTRIAS EXTRATIVAS"
    if 10 <= cnae2 <= 33: return "INDUSTRIAS DE TRANSFORMACAO"
    if cnae2 == 35: return "ELETRICIDADE E GAS"
    if 36 <= cnae2 <= 39: return "AGUA, ESGOTO, GESTAO DE RESIDUOS E DESCONTAMINACAO"
    if 41 <= cnae2 <= 43: return "CONSTRUCAO"
    if 45 <= cnae2 <= 47: return "COMERCIO; REPARACAO DE VEICULOS"
    if 49 <= cnae2 <= 53: return "TRANSPORTE, ARMAZENAGEM E CORREIO"
    if 55 <= cnae2 <= 56: return "ALOJAMENTO E ALIMENTACAO"
    if 58 <= cnae2 <= 63: return "INFORMACAO E COMUNICACAO"
    if 64 <= cnae2 <= 66: return "ATIVIDADES FINANCEIRAS E SEGUROS"
    if cnae2 == 68: return "ATIVIDADES IMOBILIARIAS"
    if 69 <= cnae2 <= 75: return "ATIVIDADES PROFISSIONAIS, CIENTIFICAS E TECNICAS"
    if 77 <= cnae2 <= 82: return "ATIVIDADES ADMINISTRATIVAS E SERVICOS COMPLEMENTARES"
    if cnae2 == 84: return "ADMINISTRACAO PUBLICA, DEFESA E SEGURIDADE SOCIAL"
    if cnae2 == 85: return "EDUCACAO"
    if 86 <= cnae2 <= 88: return "SAUDE HUMANA E SERVICOS SOCIAIS"
    if 90 <= cnae2 <= 93: return "ARTES, CULTURA, ESPORTE E RECREACAO"
    if 94 <= cnae2 <= 96: return "OUTRAS ATIVIDADES DE SERVICOS"
    if cnae2 == 97: return "SERVICOS DOMESTICOS"
    if cnae2 == 99: return "ORGANISMOS INTERNACIONAIS"
    return "OUTRAS ATIVIDADES DE SERVICOS"


def cnae_to_setor(cnae_str):
    """Mapeia CNAE para macrossetor (agro/industria/servicos/adm_pub)."""
    try:
        cnae2 = int(str(cnae_str).strip()[:2])
    except (ValueError, TypeError):
        return "servicos"
    if 1 <= cnae2 <= 3: return "agro"
    if 5 <= cnae2 <= 39: return "industria"
    if cnae2 == 84: return "adm_pub"
    return "servicos"


def df_to_geojson(df, lat_col, lon_col, prop_cols):
    """Converte DataFrame em GeoJSON FeatureCollection (pontos)."""
    features = []
    for _, row in df.iterrows():
        lat = row[lat_col]
        lon = row[lon_col]
        if pd.isna(lat) or pd.isna(lon) or (lat == 0 and lon == 0):
            continue
        props = {}
        for pc in prop_cols:
            val = row.get(pc)
            if val is None or (isinstance(val, float) and pd.isna(val)):
                props[pc] = None
            elif isinstance(val, (int, np.integer)):
                props[pc] = int(val)
            elif isinstance(val, (float, np.floating)):
                props[pc] = round(float(val), 2)
            else:
                try:
                    num = float(val)
                    props[pc] = int(num) if num == int(num) else round(num, 2)
                except (ValueError, TypeError):
                    props[pc] = str(val)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features}


def save_geojson(geojson, path):
    """Salva GeoJSON em arquivo, criando diretorios se necessario."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)
    return len(geojson["features"])


def load_geojson(path):
    """Carrega GeoJSON de arquivo."""
    path = Path(path)
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def intersect_points_with_mancha(base_gj, mancha_path):
    """Filtra features do base_gj que estao dentro da mancha (point-in-polygon)."""
    import geopandas as gpd
    from shapely.geometry import Point
    from shapely import STRtree

    mancha_path = Path(mancha_path)
    if not mancha_path.exists():
        print(f"    AVISO: mancha nao encontrada: {mancha_path}")
        return None

    mancha = gpd.read_file(str(mancha_path))
    if mancha.crs is not None and str(mancha.crs) != "EPSG:4326":
        mancha = mancha.to_crs(epsg=4326)
    mancha_union = mancha.geometry.buffer(0).union_all()

    points = []
    for f in base_gj["features"]:
        coords = f["geometry"]["coordinates"]
        points.append(Point(coords[0], coords[1]))

    tree = STRtree(points)
    indices = tree.query(mancha_union, predicate="contains")

    features_at = [base_gj["features"][i] for i in sorted(indices)]
    return {"type": "FeatureCollection", "features": features_at}


def mancha_to_geojson(mancha_path):
    """Converte o shapefile da mancha em GeoJSON (EPSG:4326), corrigindo geometria invalida."""
    import geopandas as gpd

    mancha_path = Path(mancha_path)
    if not mancha_path.exists():
        return None

    mancha = gpd.read_file(str(mancha_path))
    if mancha.crs is not None and str(mancha.crs) != "EPSG:4326":
        mancha = mancha.to_crs(epsg=4326)
    union = mancha.geometry.buffer(0).union_all()
    gdf = gpd.GeoDataFrame(geometry=[union], crs="EPSG:4326")
    return json.loads(gdf.to_json())


def intersect_polygons_with_mancha(base_gj, mancha_path, simplify_tolerance=0.0005):
    """Recorta poligonos do base_gj pelo limite da mancha (overlay), suavizando a borda do recorte.

    O recorte usa a geometria da propria mancha como limite. Fragmentos
    degenerados que podem sobrar de um overlay numerico (pontos/linhas, sem
    area) sao descartados -- so poligonos validos ficam. O resultado e
    simplificado com a mesma tolerancia usada em 04_agricultura.py para a
    borda nao ficar com serrilhado, e a area_ha e recalculada so da parte
    recortada.
    """
    import geopandas as gpd

    mancha_path = Path(mancha_path)
    if not mancha_path.exists():
        print(f"    AVISO: mancha nao encontrada: {mancha_path}")
        return None

    if not base_gj["features"]:
        return {"type": "FeatureCollection", "features": []}

    mancha = gpd.read_file(str(mancha_path))
    mancha_union = mancha.geometry.buffer(0).union_all()

    base_gdf = gpd.GeoDataFrame.from_features(base_gj["features"], crs="EPSG:4326")
    mancha_gdf = gpd.GeoDataFrame(geometry=[mancha_union], crs=mancha.crs or "EPSG:4326").to_crs(base_gdf.crs)

    clipped = gpd.overlay(base_gdf, mancha_gdf, how="intersection")
    if clipped.empty:
        return {"type": "FeatureCollection", "features": []}

    # Descarta fragmentos degenerados (pontos/linhas) que podem sobrar do
    # overlay e mantem so poligonos; suaviza a borda recortada.
    clipped = clipped.explode(index_parts=False)
    clipped = clipped[clipped.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()
    clipped["geometry"] = clipped.geometry.simplify(simplify_tolerance, preserve_topology=True)
    clipped = clipped[~clipped.geometry.is_empty]
    if clipped.empty:
        return {"type": "FeatureCollection", "features": []}

    area_ha = clipped.to_crs(epsg=32722).geometry.area / 10000
    clipped["area_ha"] = area_ha.round(2)

    features = json.loads(clipped.to_json())["features"]
    return {"type": "FeatureCollection", "features": features}


def pct(at, base):
    return round(at / base * 100, 1) if base > 0 else 0.0


def fmt_brl(valor):
    if abs(valor) >= 1e9: return f"R$ {valor/1e9:,.2f} bi"
    if abs(valor) >= 1e6: return f"R$ {valor/1e6:,.1f} mi"
    if abs(valor) >= 1e3: return f"R$ {valor/1e3:,.1f} mil"
    return f"R$ {valor:,.2f}"
