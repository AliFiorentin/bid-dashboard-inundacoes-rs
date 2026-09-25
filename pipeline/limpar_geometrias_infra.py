"""
limpar_geometrias_infra.py -- Limpeza geometrica em lote das camadas de
infraestrutura (quadras, lotes, edificacoes, terrenos, quarteiroes, imoveis,
predios_publicos, seguranca) do Dashboard BID.

Essas camadas nao sao geradas por nenhum script numerado do pipeline (nao ha
fonte correspondente em data/raw/) -- foram importadas prontas de uma
extracao externa (provavelmente OSM/dado municipal). Por isso a correcao e
feita diretamente nos GeoJSONs ja publicados em
"Dashboard BID/public/dados_convertidos", em vez de regenerar a partir de uma
fonte.

Corrige, por arquivo (so os que tem geometria Polygon/MultiPolygon):
  - auto-intersecao / topologia invalida (make_valid)
  - buracos internos que ocupam mais de 50% da area do poligono externo
    (sintoma de corte/overlay quebrado, nao vao real na quadra/lote)
  - poligonos "sliver" (< 2 m²) que sobram de recortes ATINGIDOS pela mancha
  - serrilhado: simplify leve com tolerancia em METROS (calculada em
    EPSG:5880), calibrada pelo tipo de camada -- bem menor para
    edificacoes/lotes (feicoes pequenas, nao pode distorcer) do que para
    quadras/quarteiroes (feicoes maiores)

Uso:
    python pipeline/limpar_geometrias_infra.py            # todas as camadas
    python pipeline/limpar_geometrias_infra.py --dry-run  # so mostra o que mudaria
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import geopandas as gpd

from common import fix_polygon_geometry, save_geojson, clean_polygon_geom

DASH_DATA = Path("D:/Projetos/BID/Dashboard BID/public/dados_convertidos")
EQUAL_AREA_CRS = "EPSG:5880"

MIN_AREA_M2 = 2.0
MAX_HOLE_RATIO = 0.5

# Tolerancia de simplify em metros, por prefixo do nome da camada (a parte
# antes de "_BASE" ou depois de "infra_..._ATINGIDOS_").
SIMPLIFY_TOL_M = {
    "quadras": 0.8,
    "quarteiroes": 0.8,
    "edificacoes": 0.35,
    "lotes": 0.35,
    "terrenos": 0.35,
    "imoveis": 0.35,
    "predios_publicos": 0.35,
    "seguranca": 0.35,
}


def layer_key(path: Path) -> str:
    name = path.stem
    for prefix in ("infra_",):
        if name.startswith(prefix):
            name = name[len(prefix):]
    # corta no primeiro "_BASE" ou "_ATINGIDOS_"
    for marker in ("_ATINGIDOS_", "_BASE"):
        idx = name.find(marker)
        if idx != -1:
            name = name[:idx]
            break
    return name


def find_candidate_files() -> list[Path]:
    files = set()
    for pattern in ("*/infraestrutura/*.geojson", "*/cenarios/infra_*.geojson"):
        files.update(DASH_DATA.glob(pattern))
    return sorted(files)


def clean_file(path: Path, dry_run: bool) -> None:
    try:
        gdf = gpd.read_file(path)
    except Exception as e:
        print(f"  [ERRO] {path.name}: falha ao ler ({e})")
        return

    if gdf.empty:
        return
    geom_types = set(gdf.geometry.geom_type.dropna().unique())
    if not (geom_types & {"Polygon", "MultiPolygon"}):
        return  # camada de pontos/linhas -- fora de escopo

    key = layer_key(path)
    tol_m = SIMPLIFY_TOL_M.get(key, 0.35)

    n_before = len(gdf)
    orig_crs = gdf.crs or "EPSG:4326"

    gdf_m = gdf.to_crs(EQUAL_AREA_CRS)
    cleaned_m = fix_polygon_geometry(
        gdf_m, simplify_tol=tol_m, min_area_m2=MIN_AREA_M2, max_hole_ratio=MAX_HOLE_RATIO
    )
    n_after = len(cleaned_m)

    label = str(path.relative_to(DASH_DATA)).replace("\\", "/")
    print(f"  {label}: {n_before} -> {n_after} features (tol={tol_m}m, key={key})")

    if dry_run:
        return

    cleaned = cleaned_m.to_crs(orig_crs)
    # Reprojetar de volta para o CRS original (graus) pode, por precisao
    # numerica, reintroduzir auto-intersecao em pontos onde a geometria so
    # se toca (valido pela regra OGC) -- revalida uma ultima vez ja no CRS
    # de saida, sem reprojetar de novo.
    cleaned["geometry"] = cleaned.geometry.apply(lambda g: clean_polygon_geom(g, 1.0))
    cleaned = cleaned[cleaned.geometry.notna() & ~cleaned.geometry.is_empty].copy()
    gj = json_loads_gdf(cleaned)
    save_geojson(gj, path)


def json_loads_gdf(gdf):
    import json
    return json.loads(gdf.to_json())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    files = find_candidate_files()
    print(f"Arquivos candidatos (infraestrutura/ e cenarios/infra_*): {len(files)}\n")

    for path in files:
        clean_file(path, args.dry_run)

    print("\nConcluido." if not args.dry_run else "\nDry-run concluido (nenhum arquivo alterado).")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
