import json, os
from shapely.geometry import shape

OUT_DIR = r"F:\Projetos\BID\Dashboard BID\public\dados_convertidos"

CENARIOS = {
    "porto_alegre":    ["porto_alegre___cenario_ada"],
    "rio_grande":      ["rio_grande___cenario_maio_2024", "rio_grande___cenario_maio_2024_50"],
    "lajeado":         ["lajeado___cenario_27m", "lajeado___cenario_30m"],
    "eldorado_do_sul": ["eldorado_do_sul___cenario_ada"],
}

for mun, cenarios in CENARIOS.items():
    base_path = os.path.join(OUT_DIR, mun, "infraestrutura", "edificacoes_BASE.geojson")
    if not os.path.exists(base_path):
        print(f"  {mun}: BASE não encontrado, pulando.")
        continue

    print(f"\n{mun}: carregando BASE...")
    with open(base_path, encoding="utf-8") as f:
        base = json.load(f)
    base_shapes = [(feat, shape(feat["geometry"])) for feat in base["features"]]
    print(f"  {len(base_shapes):,} edificações carregadas.")

    for slug in cenarios:
        mancha_path = os.path.join(OUT_DIR, mun, "cenarios", f"{slug}.geojson")
        if not os.path.exists(mancha_path):
            print(f"  {slug}: mancha não encontrada, pulando.")
            continue

        with open(mancha_path, encoding="utf-8") as f:
            mancha_fc = json.load(f)
        mancha = shape(mancha_fc["features"][0]["geometry"])

        atingidos = [feat for feat, s in base_shapes if s.intersects(mancha)]
        out_path = os.path.join(OUT_DIR, mun, "cenarios", f"infra_edificacoes_ATINGIDOS_{slug}.geojson")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"type": "FeatureCollection", "features": atingidos}, f, separators=(",", ":"))
        pct = len(atingidos) / len(base_shapes) * 100 if base_shapes else 0
        mb  = os.path.getsize(out_path) / 1e6
        print(f"  {slug}: {len(atingidos):,} atingidas ({pct:.1f}%) -> {mb:.1f} MB")

print("\nConcluído.")
