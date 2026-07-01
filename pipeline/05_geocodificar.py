"""
05_geocodificar.py -- Geocodifica bases de Empresas e Escolas via Nominatim local.

Consulta Nominatim (Docker) para cada endereco unico, valida se o ponto cai
dentro do limite municipal (geobr/IBGE), salva cache incremental em Parquet
e gera mapas HTML Leaflet de verificacao.

Pre-requisito: Nominatim rodando em http://localhost:8080 (via Docker).
"""

import argparse
import gc
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import geobr
import pandas as pd
import requests
from shapely.geometry import Point

from config import DATA_BASES, DATA_INTERIM, MUNICIPIOS, NOMINATIM_URL


# ---------------------------------------------------------------------------
# Nominatim query
# ---------------------------------------------------------------------------

def _nominatim_search(query: str, viewbox: str = None) -> tuple:
    """Consulta Nominatim local. Retorna (lat, lon) ou (None, None)."""
    try:
        params = {"q": query, "format": "json", "limit": 1, "countrycodes": "br"}
        if viewbox:
            params["viewbox"] = viewbox
            params["bounded"] = 1
        r = requests.get(f"{NOMINATIM_URL}/search", params=params, timeout=10)
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass
    return None, None


def geocode_with_fallback(addr: str, viewbox: str = None) -> tuple:
    """Geocodifica endereco com fallbacks progressivos. Retorna (lat, lon, strategy)."""
    parts = addr.split(", ")
    if len(parts) < 5:
        lat, lon = _nominatim_search(addr, viewbox)
        return (lat, lon, "original") if lat else (None, None, "falhou")

    rua, numero, bairro, cep, cidade_uf = parts[0], parts[1], parts[2], parts[3], parts[4]
    cidade = cidade_uf.replace(" - RS", "").strip()

    attempts = [
        (addr, "original"),
        (f"{rua}, {numero}, {cidade_uf}", "sem_cep"),
        (f"{rua} {numero}, {cidade}, RS, Brasil", "simples"),
        (f"{rua}, {cidade}, RS, Brasil", "so_rua"),
    ]
    if cep.strip() not in ("0", "", "99999999"):
        attempts.append((f"{cep}, {cidade}, RS, Brasil", "cep"))

    for query, strategy in attempts:
        lat, lon = _nominatim_search(query, viewbox)
        if lat is not None:
            return lat, lon, strategy

    return None, None, "falhou"


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def load_municipio_boundary(ibge7: int) -> object:
    """Carrega geometria do municipio via geobr."""
    gdf = geobr.read_municipality(code_muni=ibge7, year=2022)
    return gdf.geometry.union_all()


def point_in_boundary(lat, lon, boundary) -> bool:
    if lat is None or lon is None:
        return False
    return boundary.contains(Point(lon, lat))


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

def load_cache() -> dict:
    cache_path = DATA_INTERIM / "geocode_cache.parquet"
    if cache_path.exists():
        df = pd.read_parquet(cache_path)
        return {
            row["endereco"]: (row["lat"], row["lon"], row["strategy"], row["dentro_limite"])
            for _, row in df.iterrows()
        }
    return {}


def save_cache(cache: dict):
    DATA_INTERIM.mkdir(parents=True, exist_ok=True)
    rows = [
        {"endereco": addr, "lat": v[0], "lon": v[1], "strategy": v[2], "dentro_limite": v[3]}
        for addr, v in cache.items()
    ]
    pd.DataFrame(rows).to_parquet(DATA_INTERIM / "geocode_cache.parquet", index=False)


# ---------------------------------------------------------------------------
# Map generation
# ---------------------------------------------------------------------------

def generate_map(slug: str, nome: str, boundary_gdf, emp_points, esc_points, saude_points, stats):
    """Gera HTML Leaflet de verificacao."""
    boundary_geojson = json.loads(boundary_gdf.to_crs(epsg=4326).to_json())

    html = f"""<!DOCTYPE html>
<html>
<head>
<title>Geocodificacao {nome}</title>
<meta charset="utf-8">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body {{ margin: 0; font-family: Arial, sans-serif; }}
  #map {{ height: 100vh; }}
  .legend {{ background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }}
  .legend h4 {{ margin: 0 0 8px 0; }}
  .legend-item {{ display: flex; align-items: center; margin: 4px 0; font-size: 13px; }}
  .legend-dot {{ width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; flex-shrink: 0; }}
  .stats {{ position: fixed; top: 10px; right: 10px; background: white; padding: 15px;
            border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 1000;
            font-size: 13px; max-width: 300px; }}
</style>
</head>
<body>
<div class="stats">
  <b>{nome}</b><br><br>
  <b>Empresas:</b> {stats['emp_ok']}/{stats['emp_total']} ({stats['emp_pct']:.0f}%)<br>
  <b>Escolas:</b> {stats['esc_ok']}/{stats['esc_total']} ({stats['esc_pct']:.0f}%)<br>
  <b>Saude:</b> {stats['saude_n']}<br>
  <b>Fora do limite:</b> {stats['fora']}<br><br>
  <small>{json.dumps(stats['strategies'])}</small>
</div>
<div id="map"></div>
<script>
var map = L.map('map').setView([-30, -51.3], 12);
L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
  attribution: '&copy; OSM'
}}).addTo(map);

L.geoJSON({json.dumps(boundary_geojson)}, {{
  style: {{ color: '#E91E63', weight: 2, fillOpacity: 0.05, dashArray: '5,5' }}
}}).addTo(map);

var empresas = {json.dumps(emp_points)};
var escolas = {json.dumps(esc_points)};
var saude = {json.dumps(saude_points)};

var lE = L.layerGroup();
empresas.forEach(function(e) {{
  L.circleMarker([e.lat, e.lon], {{radius: 3, color: '#2196F3', fillOpacity: 0.5, weight: 1}})
    .bindPopup('<b>Empresa</b><br>' + (e.rua||'') + ', ' + (e.numero||'') + '<br>' + (e.setor||''))
    .addTo(lE);
}});

var lS = L.layerGroup();
escolas.forEach(function(e) {{
  L.circleMarker([e.lat, e.lon], {{radius: 6, color: '#FF9800', fillOpacity: 0.8, weight: 2}})
    .bindPopup('<b>' + (e.nome||'') + '</b><br>' + (e.endereco||''))
    .addTo(lS);
}});

var lH = L.layerGroup();
saude.forEach(function(e) {{
  L.circleMarker([e.lat, e.lon], {{radius: 6, color: '#4CAF50', fillOpacity: 0.8, weight: 2}})
    .bindPopup('<b>' + (e.nome||'') + '</b><br>' + (e.tipo||''))
    .addTo(lH);
}});

lE.addTo(map); lS.addTo(map); lH.addTo(map);
L.control.layers(null, {{
  'Empresas ({stats["emp_ok"]})': lE,
  'Escolas ({stats["esc_ok"]})': lS,
  'Saude ({stats["saude_n"]})': lH
}}).addTo(map);

var pts = empresas.map(e=>[e.lat,e.lon]).concat(escolas.map(e=>[e.lat,e.lon]));
if (pts.length) map.fitBounds(pts);
</script>
</body>
</html>"""

    path = DATA_INTERIM / f"mapa_geocodificacao_{slug}.html"
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  Mapa: {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Geocodifica Empresas e Escolas via Nominatim local")
    parser.add_argument("--mun", type=str, default=None, help="Nome do municipio")
    args = parser.parse_args()

    if args.mun:
        if args.mun not in MUNICIPIOS:
            print(f"Municipio '{args.mun}' nao encontrado. Disponiveis: {list(MUNICIPIOS.keys())}")
            sys.exit(1)
        targets = {args.mun: MUNICIPIOS[args.mun]}
    else:
        targets = MUNICIPIOS

    # Check Nominatim
    print("Verificando Nominatim local...")
    try:
        r = requests.get(f"{NOMINATIM_URL}/status", timeout=5)
        print(f"  Status: {r.status_code} - OK")
    except Exception as e:
        print(f"  ERRO: Nominatim nao acessivel em {NOMINATIM_URL}")
        print(f"  {e}")
        print(f"  Suba o container: docker start nominatim")
        sys.exit(1)

    # Load data
    print("\nCarregando bases...")
    emp = pd.read_csv(DATA_BASES / "estabelecimentos.csv", encoding="utf-8-sig")
    esc = pd.read_csv(DATA_BASES / "escolas.csv", encoding="utf-8-sig")
    saude = pd.read_csv(DATA_BASES / "saude_estabelecimentos.csv", encoding="utf-8-sig")
    print(f"  Empresas: {len(emp):,} | Escolas: {len(esc):,} | Saude: {len(saude):,}")

    # Load cache
    cache = load_cache()
    print(f"  Cache: {len(cache):,} enderecos ja geocodificados")

    # Process each municipality
    for nome, cfg in targets.items():
        ibge7 = cfg["ibge7"]
        slug = cfg["slug"]
        print(f"\n{'='*60}")
        print(f"  {nome}")
        print(f"{'='*60}")

        # Filter to this municipality
        emp_mun = emp[emp["municipio"] == nome].copy()
        esc_mun = esc[esc["municipio"] == nome].copy()
        saude_mun = saude[saude["municipio"] == nome].copy()

        # Unique addresses to geocode
        addrs_emp = set(emp_mun["endereco_geocode"].dropna().unique())
        addrs_esc = set(esc_mun["endereco_geocode"].dropna().unique())
        all_addrs = sorted(addrs_emp | addrs_esc)
        new_addrs = [a for a in all_addrs if a not in cache]
        print(f"  Enderecos: {len(all_addrs):,} unicos, {len(new_addrs):,} novos")

        if not new_addrs:
            print(f"  Tudo em cache!")
        else:
            # Load boundary for validation
            boundary = load_municipio_boundary(ibge7)
            b = boundary.bounds
            viewbox = f"{b[0]},{b[1]},{b[2]},{b[3]}"

            # Geocode new addresses
            strategies = {"original": 0, "sem_cep": 0, "simples": 0, "so_rua": 0, "cep": 0, "falhou": 0}
            n_dentro = 0
            n_fora = 0
            t0 = time.time()

            for i, addr in enumerate(new_addrs):
                lat, lon, strategy = geocode_with_fallback(addr, viewbox=viewbox)

                if lat is not None:
                    dentro = point_in_boundary(lat, lon, boundary)
                    if dentro:
                        cache[addr] = (lat, lon, strategy, True)
                        strategies[strategy] += 1
                        n_dentro += 1
                    else:
                        cache[addr] = (None, None, "fora_limite", False)
                        strategies["falhou"] += 1
                        n_fora += 1
                else:
                    cache[addr] = (None, None, strategy, False)
                    strategies[strategy] += 1

                if (i + 1) % 100 == 0:
                    elapsed = time.time() - t0
                    rate = (i + 1) / elapsed
                    remaining = (len(new_addrs) - i - 1) / rate if rate > 0 else 0
                    print(f"    {i+1}/{len(new_addrs)} | dentro={n_dentro} fora={n_fora} | {remaining:.0f}s restantes")

                # Save cache periodically
                if (i + 1) % 500 == 0:
                    save_cache(cache)

            elapsed = time.time() - t0
            print(f"  Geocodificado: {n_dentro} dentro, {n_fora} fora, {strategies['falhou']} falhou em {elapsed:.0f}s")
            print(f"  Estrategias: {strategies}")
            save_cache(cache)

        # Apply coordinates
        def get_coords(addr):
            entry = cache.get(addr)
            if entry and entry[3]:
                return entry[0], entry[1]
            return None, None

        emp_mun["latitude"] = emp_mun["endereco_geocode"].apply(lambda a: get_coords(a)[0])
        emp_mun["longitude"] = emp_mun["endereco_geocode"].apply(lambda a: get_coords(a)[1])
        esc_mun["latitude"] = esc_mun["endereco_geocode"].apply(lambda a: get_coords(a)[0])
        esc_mun["longitude"] = esc_mun["endereco_geocode"].apply(lambda a: get_coords(a)[1])

        n_emp_ok = emp_mun["latitude"].notna().sum()
        n_esc_ok = esc_mun["latitude"].notna().sum()
        saude_with_coords = saude_mun[saude_mun["latitude"].notna()]

        pct_emp = n_emp_ok / len(emp_mun) * 100 if len(emp_mun) > 0 else 0
        pct_esc = n_esc_ok / len(esc_mun) * 100 if len(esc_mun) > 0 else 0
        print(f"  Empresas: {n_emp_ok}/{len(emp_mun)} ({pct_emp:.0f}%)")
        print(f"  Escolas: {n_esc_ok}/{len(esc_mun)} ({pct_esc:.0f}%)")

        # Collect strategy stats from cache for this municipality
        mun_strategies = {}
        for addr in all_addrs:
            entry = cache.get(addr)
            if entry:
                s = entry[2]
                mun_strategies[s] = mun_strategies.get(s, 0) + 1

        n_fora_total = mun_strategies.get("fora_limite", 0) + mun_strategies.get("falhou", 0)

        # Generate map
        emp_pts = emp_mun[emp_mun["latitude"].notna()].apply(
            lambda r: {"lat": r["latitude"], "lon": r["longitude"], "rua": str(r.get("rua", "")), "numero": str(r.get("numero", "")), "setor": str(r.get("setor", ""))},
            axis=1,
        ).tolist()
        esc_pts = esc_mun[esc_mun["latitude"].notna()].apply(
            lambda r: {"lat": r["latitude"], "lon": r["longitude"], "nome": str(r.get("no_entidade", "")), "endereco": str(r.get("endereco_geocode", ""))},
            axis=1,
        ).tolist()
        saude_pts = saude_with_coords.apply(
            lambda r: {"lat": r["latitude"], "lon": r["longitude"], "nome": str(r.get("no_fantasia", "")), "tipo": str(r.get("tp_unidade_label", ""))},
            axis=1,
        ).tolist()

        mun_gdf = geobr.read_municipality(code_muni=ibge7, year=2022)
        stats_map = {
            "emp_ok": int(n_emp_ok), "emp_total": len(emp_mun), "emp_pct": n_emp_ok / len(emp_mun) * 100 if emp_mun.shape[0] > 0 else 0,
            "esc_ok": int(n_esc_ok), "esc_total": len(esc_mun), "esc_pct": n_esc_ok / len(esc_mun) * 100 if esc_mun.shape[0] > 0 else 0,
            "saude_n": len(saude_pts),
            "fora": n_fora_total,
            "strategies": mun_strategies,
        }
        generate_map(slug, nome, mun_gdf, emp_pts, esc_pts, saude_pts, stats_map)

        # Update main dataframes
        emp.loc[emp_mun.index, "latitude"] = emp_mun["latitude"]
        emp.loc[emp_mun.index, "longitude"] = emp_mun["longitude"]
        esc.loc[esc_mun.index, "latitude"] = esc_mun["latitude"]
        esc.loc[esc_mun.index, "longitude"] = esc_mun["longitude"]

        gc.collect()

    # Save updated bases
    print(f"\n{'='*60}")
    print("  Salvando bases atualizadas")
    print(f"{'='*60}")

    emp.to_csv(DATA_BASES / "estabelecimentos.csv", index=False, encoding="utf-8-sig")
    esc.to_csv(DATA_BASES / "escolas.csv", index=False, encoding="utf-8-sig")

    n_emp_total = emp["latitude"].notna().sum()
    n_esc_total = esc["latitude"].notna().sum()
    print(f"  estabelecimentos.csv: {n_emp_total}/{len(emp)} com coordenadas ({n_emp_total/len(emp)*100:.1f}%)")
    print(f"  escolas.csv: {n_esc_total}/{len(esc)} com coordenadas ({n_esc_total/len(esc)*100:.1f}%)")
    print(f"  Cache: {len(cache):,} enderecos")


if __name__ == "__main__":
    main()
