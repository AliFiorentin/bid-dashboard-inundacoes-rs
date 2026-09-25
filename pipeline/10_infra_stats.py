"""
10 - Estatisticas leves de infraestrutura por municipio.

Calcula, por municipio e por tipo de infraestrutura, a contagem de feicoes
(BASE e atingidas no pior cenario) e, para Edificacoes, a area construida
(m2) -- o unico tipo de infra presente em todos os 4 municipios. O resultado
e' um JSON pequeno (infraestrutura_stats.json) por municipio, usado pelo
Dashboard para mostrar a Infraestrutura tambem na "Visao Geral RS": os
GeoJSONs brutos de infra somam ~640MB entre os 4 municipios (Porto Alegre
sozinho tem ~420MB), inviavel de baixar tudo de uma vez so pra exibir uma
metrica agregada.

Independente da cadeia numerada 01-09: le os GeoJSONs de infraestrutura que
ja estao no Dashboard (BASE em infraestrutura/, ATINGIDOS do pior cenario em
cenarios/), gerados fora deste pipeline. Rode de novo so quando os dados de
infraestrutura do Dashboard mudarem.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import MUNICIPIOS, DASH_DATA
from common import slugify

# Espelha Dashboard BID/lib/constants.ts (INFRAESTRUTURA_CONFIG / PIORES_CENARIOS)
# -- manter em sincronia se um municipio ganhar/perder um tipo de infra.
INFRAESTRUTURA_CONFIG = {
    "Porto Alegre": [
        "Eixos Logradouros", "Lotes", "Quarteirões", "Terminais", "Rede Esgoto",
        "Paradas", "Ônibus", "Hidrantes", "Gás", "Bocas de Lobo", "Poste", "Edificações",
    ],
    "Rio Grande": [
        "Logradouros", "Quadras", "Terrenos", "Imóveis", "Prédios Públicos", "Segurança", "Edificações",
    ],
    "Lajeado": ["Iluminação Pública", "Logradouros", "Lotes", "Quadras", "Edificações"],
    "Eldorado do Sul": ["Edificações"],
}
PIORES_CENARIOS = {
    "Eldorado do Sul": "Cenario ADA",
    "Lajeado": "Cenario 27m",
    "Porto Alegre": "Cenario ADA",
    "Rio Grande": "Cenario Maio 2024",
}


def _count_and_area(path: Path) -> tuple[int, float]:
    if not path.exists():
        return 0, 0.0
    with open(path, encoding="utf-8") as f:
        gj = json.load(f)
    feats = gj.get("features", [])
    area = sum(float(f.get("properties", {}).get("area_m2") or 0) for f in feats)
    return len(feats), area


def main():
    print("=" * 60)
    print("  10 - Estatisticas de Infraestrutura (por municipio)")
    print("=" * 60)

    for nome, cfg in MUNICIPIOS.items():
        tipos = INFRAESTRUTURA_CONFIG.get(nome, [])
        if not tipos:
            continue

        slug = cfg["slug"]
        cen = PIORES_CENARIOS[nome]
        cen_slug = f"{slug}___{slugify(cen)}"
        print(f"\n{nome} (pior cenario: {cen}):")

        stats: dict[str, dict[str, float]] = {}
        for tipo in tipos:
            tipo_slug = slugify(tipo)
            base_path = DASH_DATA / slug / "infraestrutura" / f"{tipo_slug}_BASE.geojson"
            atg_path = DASH_DATA / slug / "cenarios" / f"infra_{tipo_slug}_ATINGIDOS_{cen_slug}.geojson"

            count_base, area_base = _count_and_area(base_path)
            count_atg, area_atg = _count_and_area(atg_path)

            entry: dict[str, float] = {"count_base": count_base, "count_atingido": count_atg}
            if tipo == "Edificações":
                entry["area_m2_base"] = round(area_base, 1)
                entry["area_m2_atingido"] = round(area_atg, 1)
                print(f"  {tipo}: {count_base:,} -> {count_atg:,} atingidas | {area_base:,.0f} -> {area_atg:,.0f} m²")
            else:
                print(f"  {tipo}: {count_base:,} -> {count_atg:,} atingidos")

            stats[tipo] = entry

        out_path = DASH_DATA / slug / "infraestrutura_stats.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        print(f"  -> {slug}/infraestrutura_stats.json")

    print("\nConcluido.")


if __name__ == "__main__":
    main()
