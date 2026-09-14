"""
11_area_atingida.py -- Area territorial de cada municipio e area atingida por cenario de inundacao.

Calcula, por municipio:
  - area_km2: area territorial total do municipio
  - cenarios: { nome_cenario: { area_atingida_km2, pct_atingida } } -- area da
    mancha de inundacao recortada ao limite municipal, e seu percentual sobre
    a area territorial. Alem dos cenarios proprios de MUNICIPIOS[mun]["cenarios"],
    todo municipio ganha tambem a entrada especial "ADA Estadual" (mancha
    unica do RS inteiro, MANCHA_RS_ADA, recortada ao limite do municipio) --
    e' o mesmo evento usado como "cenario" da Visao Geral RS no Dashboard, em
    vez de misturar o pior cenario individual de cada municipio (que podem
    ser eventos diferentes entre si).

Alem dos 4 municipios, grava uma entrada agregada "Visão Geral RS" (mesmo
formato) com area_km2 = soma dos 4 municipios e a area atingida pela mesma
"ADA Estadual" = soma da entrada "ADA Estadual" de cada municipio -- assim o
total bate exatamente com o detalhamento por municipio que o Dashboard
mostra ao lado.

Usa limite_BASE.geojson (ja commitado no Dashboard por 06_geojson.py via
geobr) como limite municipal -- a mesma geometria usada para recortar a
mancha exibida no mapa (make_atingidos/mancha_to_geojson), garantindo que a
area calculada aqui bate com o que o usuario ve.

Independente da cadeia numerada 01-09: so' precisa que 06_geojson.py ja tenha
rodado (para existir limite_BASE.geojson). Rode de novo so quando limites
municipais ou manchas mudarem.

Uso:
  python pipeline/11_area_atingida.py
  python pipeline/11_area_atingida.py --mun "Lajeado"
"""
import argparse
import json
import sys
from pathlib import Path

import geopandas as gpd

sys.path.insert(0, str(Path(__file__).parent))
from config import MUNICIPIOS, MANCHAS, MANCHA_RS_ADA, DASH_DATA
from common import pct

UTM_CRS = "EPSG:32722"  # mesma convencao de common.py / vetorizar_climada.py

VISAO_GERAL_LABEL = "Visão Geral RS"
VISAO_GERAL_CENARIO_LABEL = "ADA Estadual"


def process(mun_nome: str, cfg: dict, mancha_rs_utm=None) -> dict | None:
    slug = cfg["slug"]
    limite_path = DASH_DATA / slug / "limite_BASE.geojson"
    if not limite_path.exists():
        print(f"  AVISO: {limite_path} nao encontrado -- rode 06_geojson.py antes. Pulando {mun_nome}.")
        return None

    print(f"\n[{mun_nome}]")
    limite_gdf = gpd.read_file(str(limite_path))
    limite_utm = limite_gdf.to_crs(UTM_CRS)
    limite_union = limite_utm.geometry.buffer(0).union_all()
    area_km2 = limite_union.area / 1e6
    print(f"  area territorial: {area_km2:,.1f} km2")

    manchas_mun = MANCHAS.get(mun_nome, {})
    cenarios_data: dict = {}
    for cen in cfg["cenarios"]:
        mancha_path = manchas_mun.get(cen)
        if not mancha_path or not mancha_path.exists():
            print(f"  {cen}: mancha nao encontrada, pulando")
            continue

        mancha = gpd.read_file(str(mancha_path))
        mancha_union = mancha.geometry.buffer(0).union_all()
        mancha_utm = gpd.GeoSeries([mancha_union], crs=mancha.crs or "EPSG:4326").to_crs(UTM_CRS).iloc[0]
        atingida = mancha_utm.intersection(limite_union)

        area_atg_km2 = atingida.area / 1e6
        pct_atg = pct(area_atg_km2, area_km2)
        print(f"  {cen}: {area_atg_km2:,.1f} km2 ({pct_atg}%)")
        cenarios_data[cen] = {
            "area_atingida_km2": round(area_atg_km2, 2),
            "pct_atingida": pct_atg,
        }

    if mancha_rs_utm is not None:
        atingida_rs = mancha_rs_utm.intersection(limite_union)
        area_atg_rs_km2 = atingida_rs.area / 1e6
        pct_atg_rs = pct(area_atg_rs_km2, area_km2)
        print(f"  {VISAO_GERAL_CENARIO_LABEL}: {area_atg_rs_km2:,.1f} km2 ({pct_atg_rs}%)")
        cenarios_data[VISAO_GERAL_CENARIO_LABEL] = {
            "area_atingida_km2": round(area_atg_rs_km2, 2),
            "pct_atingida": pct_atg_rs,
        }

    return {"area_km2": round(area_km2, 2), "cenarios": cenarios_data}


def build_visao_geral(municipios_data: dict) -> dict | None:
    """Agrega os 4 municipios usando a entrada "ADA Estadual" de cada um --
    soma, entao bate exatamente com o detalhamento por municipio."""
    faltantes = [
        nome for nome in MUNICIPIOS
        if nome not in municipios_data or VISAO_GERAL_CENARIO_LABEL not in municipios_data[nome].get("cenarios", {})
    ]
    if faltantes:
        print(f"\nAVISO: '{VISAO_GERAL_CENARIO_LABEL}' incompleto para {faltantes} -- pulando {VISAO_GERAL_LABEL}")
        return None

    area_km2 = sum(municipios_data[nome]["area_km2"] for nome in MUNICIPIOS)
    area_atg_km2 = sum(
        municipios_data[nome]["cenarios"][VISAO_GERAL_CENARIO_LABEL]["area_atingida_km2"] for nome in MUNICIPIOS
    )
    pct_atg = pct(area_atg_km2, area_km2)
    print(f"\n[{VISAO_GERAL_LABEL}]")
    print(f"  {VISAO_GERAL_CENARIO_LABEL}: {area_atg_km2:,.1f} km2 ({pct_atg}%) do territorio combinado")

    return {
        "area_km2": round(area_km2, 2),
        "cenarios": {VISAO_GERAL_CENARIO_LABEL: {"area_atingida_km2": round(area_atg_km2, 2), "pct_atingida": pct_atg}},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mun", help="Processar apenas este municipio")
    args = parser.parse_args()

    muns = {k: v for k, v in MUNICIPIOS.items() if not args.mun or k == args.mun}
    if not muns:
        print(f"Municipio nao encontrado: {args.mun}")
        sys.exit(1)

    print("=" * 60)
    print("  11 - Area Territorial e Area Atingida (por municipio)")
    print("=" * 60)

    mancha_rs_utm = None
    if MANCHA_RS_ADA.exists():
        print(f"\nCarregando mancha estadual ({VISAO_GERAL_CENARIO_LABEL})...")
        mancha_rs = gpd.read_file(str(MANCHA_RS_ADA))
        mancha_rs_union = mancha_rs.geometry.buffer(0).union_all()
        mancha_rs_utm = gpd.GeoSeries([mancha_rs_union], crs=mancha_rs.crs or "EPSG:4326").to_crs(UTM_CRS).iloc[0]
    else:
        print(f"\nAVISO: mancha estadual nao encontrada ({MANCHA_RS_ADA}) -- '{VISAO_GERAL_CENARIO_LABEL}' ficara de fora")

    resultados: dict = {}
    for nome, cfg in muns.items():
        resultado = process(nome, cfg, mancha_rs_utm)
        if resultado is not None:
            resultados[nome] = resultado

    out_path = DASH_DATA / "area_atingida.json"
    existing = {}
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    existing.update(resultados)

    visao_geral = build_visao_geral(existing)
    if visao_geral is not None:
        existing[VISAO_GERAL_LABEL] = visao_geral

    out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSalvo: {out_path}")
    print("Concluido!")


if __name__ == "__main__":
    main()
