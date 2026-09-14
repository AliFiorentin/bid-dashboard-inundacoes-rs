"""
11_area_atingida.py -- Area territorial de cada municipio e area atingida por cenario de inundacao.

Calcula, por municipio:
  - area_km2: area territorial total do municipio
  - cenarios: { nome_cenario: { area_atingida_km2, pct_atingida } } -- area da
    mancha de inundacao recortada ao limite municipal, e seu percentual sobre
    a area territorial

Usa limite_BASE.geojson (ja commitado no Dashboard por 06_geojson.py via
geobr) como limite municipal -- a mesma geometria usada para recortar a
mancha exibida no mapa (make_atingidos/mancha_to_geojson), garantindo que a
area calculada aqui bate com o que o usuario ve. So considera os cenarios
listados em MUNICIPIOS[mun]["cenarios"] (mesmo subconjunto usado por
06_geojson.py -- ex.: os RPs sinteticos do CLIMADA em Porto Alegre ficam de
fora).

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
from config import MUNICIPIOS, MANCHAS, DASH_DATA
from common import pct

UTM_CRS = "EPSG:32722"  # mesma convencao de common.py / vetorizar_climada.py


def process(mun_nome: str, cfg: dict) -> dict | None:
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

    return {"area_km2": round(area_km2, 2), "cenarios": cenarios_data}


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

    resultados: dict = {}
    for nome, cfg in muns.items():
        resultado = process(nome, cfg)
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
    out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSalvo: {out_path}")
    print("Concluido!")


if __name__ == "__main__":
    main()
