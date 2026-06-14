import gzip, csv, json, os
from shapely import wkt
from shapely.geometry import mapping

MUNICIPIOS = {
    "porto_alegre":    (-51.3105, -30.2740, -51.0062, -29.9276),
    "rio_grande":      (-52.6978, -32.6485, -52.0583, -31.7688),
    "lajeado":         (-52.1337, -29.5013, -51.9133, -29.3962),
    "eldorado_do_sul": (-51.7074, -30.2187, -51.2563, -29.9441),
}
CONF_MIN  = 0.65
TOLERANCE = 0.00002
SRC       = r"C:\Users\Administrator\Downloads\951_buildings.csv.gz"
OUT_DIR   = r"F:\Projetos\BID\Dashboard BID\public\dados_convertidos"

buckets: dict = {m: [] for m in MUNICIPIOS}

print("Lendo CSV...")
with gzip.open(SRC, "rt", encoding="utf-8") as f:
    for i, row in enumerate(csv.DictReader(f)):
        if i % 1_000_000 == 0:
            print(f"  {i:,} linhas processadas...")
        if float(row["confidence"]) < CONF_MIN:
            continue
        lat, lon = float(row["latitude"]), float(row["longitude"])
        for mun, (x0, y0, x1, y1) in MUNICIPIOS.items():
            if x0 <= lon <= x1 and y0 <= lat <= y1:
                geom = wkt.loads(row["geometry"]).simplify(TOLERANCE, preserve_topology=True)
                buckets[mun].append({
                    "type": "Feature",
                    "geometry": mapping(geom),
                    "properties": {"area_m2": round(float(row["area_in_meters"]), 1)},
                })

print("\nSalvando GeoJSONs...")
for mun, feats in buckets.items():
    path = os.path.join(OUT_DIR, mun, "infraestrutura", "edificacoes_BASE.geojson")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    mb = os.path.getsize(path) / 1e6
    print(f"  {mun}: {len(feats):,} edificacoes -> {mb:.1f} MB")

print("\nConcluído.")
