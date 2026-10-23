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

Alem do resumo do pior cenario (infraestrutura_stats.json, usado na Visao
Geral RS), gera infraestrutura_painel.json por municipio: metricas do Painel
(contagens, ruas unicas, comprimento, area, coberturas de servicos, lista de
ruas) para a BASE e para CADA cenario. Com isso o Dashboard nao precisa baixar
os GeoJSONs de infra so' para calcular os numeros -- eles so' sao baixados
quando a camada e' ligada no mapa.

Independente da cadeia numerada 01-09: le os GeoJSONs de infraestrutura que
ja estao no Dashboard (BASE em infraestrutura/, ATINGIDOS do pior cenario em
cenarios/), gerados fora deste pipeline. Rode de novo so quando os dados de
infraestrutura do Dashboard mudarem.
"""
import argparse
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


# ── Metricas do Painel (porta de lib/geo-utils.ts + secoes de components/tabs/infra) ──
def _props(f: dict) -> dict:
    return f.get("properties") or {}


def _num(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _count_flag(feats: list, prop: str) -> int:
    n = 0
    for f in feats:
        v = _props(f).get(prop)
        if v is None:
            continue
        try:
            if float(v) == 1:
                n += 1
            continue
        except (TypeError, ValueError):
            pass
        if str(v).strip().lower() in ("1", "sim", "true", "yes"):
            n += 1
    return n


def _count_equals(feats: list, prop: str, values: list[str]) -> int:
    vals = {v.lower() for v in values}
    return sum(1 for f in feats if str(_props(f).get(prop) or "").strip().lower() in vals)


def _ruas_unicas(feats: list) -> int:
    ids = set()
    for f in feats:
        p = _props(f)
        tipo = str(p.get("tipo") or p.get("Tipo") or "").strip()
        nome = str(p.get("nome") or p.get("Nome") or "").strip()
        if tipo or nome:
            ids.add(f"{tipo} {nome}".strip())
    return len(ids) or len(feats)


def _lista_logradouros(feats: list) -> list[str]:
    seen = set()
    for f in feats:
        p = _props(f)
        tipo = str(p.get("tipo") or "").strip().upper()
        nome = str(p.get("nome") or "").strip().upper()
        label = " ".join(x for x in (tipo, nome) if x)
        if label:
            seen.add(label)
    return sorted(seen, key=str.casefold)


def _lista_eixos(feats: list) -> list[str]:
    seen = set()
    for f in feats:
        p = _props(f)
        cat = str(p.get("CDIDECAT") or "").strip()
        nome = str(p.get("NMIDELOG") or "").strip()
        label = " ".join(x for x in (cat, nome) if x)
        if label:
            seen.add(label)
    return sorted(seen, key=str.casefold)


def _rotas(feats: list) -> int:
    return len({str(_props(f).get("ROTA") or _props(f).get("rota")).strip()
                for f in feats if _props(f).get("ROTA") or _props(f).get("rota")})


def _comprimento(feats: list) -> float:
    seen = set()
    total = 0.0
    for f in feats:
        geom = f.get("geometry") or {}
        h = json.dumps(geom.get("coordinates") or [])
        if h in seen:
            continue
        seen.add(h)
        p = _props(f)
        total += _num(p.get("LENGTH") or p.get("length") or p.get("shape_leng") or 0)
    return total


def _metricas(tipo: str, feats: list, com_lista: bool = False) -> dict:
    """Metricas que o Painel exibe para `tipo` a partir das feicoes (BASE ou de um cenario).

    A lista de ruas so' e' usada para as atingidas (com_lista=True); o Dashboard
    reordena com localeCompare("pt-BR")."""
    m: dict = {"count": len(feats)}
    if tipo == "Edificações":
        m["area_m2"] = round(sum(_num(_props(f).get("area_m2")) for f in feats), 1)
    elif tipo == "Ônibus":
        m["rotas"] = _rotas(feats)
        m["km"] = round(_comprimento(feats), 3)
    elif tipo == "Eixos Logradouros":
        lista = _lista_eixos(feats)
        m["ruas_unicas"] = len(lista)
        if com_lista:
            m["ruas"] = lista
    elif tipo == "Logradouros":
        m["ruas_unicas"] = _ruas_unicas(feats)
        m["drenagem"] = _count_flag(feats, "drenagem")
        m["iluminacao"] = _count_flag(feats, "iluminacao")
        if com_lista:
            m["ruas"] = _lista_logradouros(feats)
    elif tipo == "Terrenos":
        m["agua"] = _count_flag(feats, "agua")
        m["coleta_lix"] = _count_flag(feats, "coleta_lix")
        m["esgoto_plu"] = _count_flag(feats, "esgoto_plu")
        m["esgoto_cloacal"] = _count_equals(feats, "esgoto_clo", ["esgoto_cloacal", "cloacal", "1"])
        m["fossa"] = _count_equals(feats, "esgoto_clo", ["fossa_septica", "fossa"])
        m["condominio"] = _count_flag(feats, "condominio")
    return m


def _features(path: Path) -> list:
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f).get("features", [])


def gerar_painel(slug: str, tipos: list[str]) -> dict:
    """{tipo: {base: metricas, cenarios: {cen_slug: metricas}}} para o municipio."""
    cen_dir = DASH_DATA / slug / "cenarios"
    out: dict = {}
    for tipo in tipos:
        tipo_slug = slugify(tipo)
        entry: dict = {"base": _metricas(tipo, _features(DASH_DATA / slug / "infraestrutura" / f"{tipo_slug}_BASE.geojson")), "cenarios": {}}
        prefixo = f"infra_{tipo_slug}_ATINGIDOS_"
        for p in sorted(cen_dir.glob(f"{prefixo}*.geojson")):
            cen_slug = p.stem[len(prefixo):]
            entry["cenarios"][cen_slug] = _metricas(tipo, _features(p), com_lista=True)
        out[tipo] = entry
        print(f"  [painel] {tipo}: base={entry['base']['count']:,} cenarios={list(entry['cenarios'])}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mun", help="processa so' este municipio")
    args = ap.parse_args()

    print("=" * 60)
    print("  10 - Estatisticas de Infraestrutura (por municipio)")
    print("=" * 60)

    for nome, cfg in MUNICIPIOS.items():
        if args.mun and nome != args.mun:
            continue
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

        painel = gerar_painel(slug, tipos)
        painel_path = DASH_DATA / slug / "infraestrutura_painel.json"
        with open(painel_path, "w", encoding="utf-8") as f:
            json.dump(painel, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  -> {slug}/infraestrutura_painel.json ({painel_path.stat().st_size / 1024:,.0f} KB)")

    print("\nConcluido.")


if __name__ == "__main__":
    main()
