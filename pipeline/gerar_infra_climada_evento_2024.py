"""
gerar_infra_climada_evento_2024.py -- Gera os GeoJSONs ATINGIDOS de infraestrutura
para Porto Alegre no cenario "Climada Evento 2024", que nunca foram gerados (so
existiam para "Cenario ADA" -- as camadas de infra foram produzidas antes desse
cenario existir e ninguem rodou de novo quando ele foi adicionado). Sem esses
arquivos, o frontend (hooks/useDashboard.ts) faz fetch, recebe 404, e mantem
silenciosamente os dados do cenario anterior (ADA) na tela -- parece que a
camada "nao muda" ao trocar de cenario.

Replica o formato dos arquivos ja existentes de Cenario ADA: feature inteira
mantida se intersecta a mancha (nao e' um recorte/clip -- sem campo area_ha),
mesmo criterio para Point/LineString/Polygon.

Uso: python pipeline/gerar_infra_climada_evento_2024.py
"""
import json
import sys
from pathlib import Path

import geopandas as gpd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA, MANCHAS

MUNICIPIO = "Porto Alegre"
SLUG = "porto_alegre"
CENARIO = "Climada Evento 2024"
CENARIO_SLUG = "climada_evento_2024"

INFRA_TIPOS = [
    "eixos_logradouros", "lotes", "quarteiroes", "terminais", "rede_esgoto",
    "paradas", "onibus", "hidrantes", "gas", "bocas_de_lobo", "poste", "edificacoes",
]


def main():
    mancha_path = MANCHAS[MUNICIPIO][CENARIO]
    if not mancha_path.exists():
        print(f"ERRO: mancha nao encontrada: {mancha_path}")
        sys.exit(1)

    mancha = gpd.read_file(str(mancha_path))
    if mancha.crs is not None and str(mancha.crs) != "EPSG:4326":
        mancha = mancha.to_crs(epsg=4326)
    mancha_union = mancha.geometry.buffer(0).union_all()
    mancha_gdf = gpd.GeoDataFrame(geometry=[mancha_union], crs="EPSG:4326")

    out_dir = DASH_DATA / SLUG / "cenarios"
    out_dir.mkdir(parents=True, exist_ok=True)

    for tipo in INFRA_TIPOS:
        base_path = DASH_DATA / SLUG / "infraestrutura" / f"{tipo}_BASE.geojson"
        if not base_path.exists():
            print(f"  AVISO: base nao encontrada para {tipo}: {base_path}")
            continue

        base_gdf = gpd.read_file(str(base_path))
        if base_gdf.crs is not None and str(base_gdf.crs) != "EPSG:4326":
            base_gdf = base_gdf.to_crs(epsg=4326)

        # Alguns layers (ex.: rede_esgoto) tem colunas de data (DATAINSTAL) que o
        # to_json do geopandas nao serializa -- converte pra string antes.
        for col in base_gdf.columns:
            if col != "geometry" and str(base_gdf[col].dtype).startswith(("datetime", "date")):
                base_gdf[col] = base_gdf[col].astype(str)

        joined = gpd.sjoin(base_gdf, mancha_gdf, how="inner", predicate="intersects")
        joined = joined.drop(columns=[c for c in joined.columns if c == "index_right"], errors="ignore")

        out_path = out_dir / f"infra_{tipo}_ATINGIDOS_{SLUG}___{CENARIO_SLUG}.geojson"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(json.loads(joined.to_json()), f, ensure_ascii=False)
        print(f"  {tipo}: {len(base_gdf):,} -> {len(joined):,} atingidos ({out_path.name})")

    print("Concluido.")


if __name__ == "__main__":
    main()
