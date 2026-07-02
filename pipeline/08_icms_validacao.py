"""
08_icms_validacao.py — Validação cruzada ICMS vs. estimativa DaLA de VAB perdido.

Método:
  1. Para cada município: baseline ICMS = média mensal dos mesmos meses em 2021-2023
     (exclui 2020 por distorção COVID)
  2. Anomalia maio/2024 = (ICMS_obs - ICMS_esperado) / ICMS_esperado × 100
  3. Shortfall acumulado Apr-Dez 2024 vs baseline
  4. Para CNAE/setor: top classes RS por queda em mai-jun/2024 vs. mesmos meses 2021-2023
  5. Razão indicativa: nossa estimativa DaLA × taxa ICMS efetiva RS / shortfall observado
     (taxa_efetiva = ICMS_arrecadado_RS_2023 / PIB_RS_2023 ≈ 5,9%)

Fontes externas (SEFAZ-RS):
  - Arrecadação por Município e por Corede.csv
  - Arrecadação de ICMS por CNAE - Classe.csv

Resultado salvo em data/processed/icms_validacao.json e impresso no console.
"""

import csv, json, sys, io
from pathlib import Path
from collections import defaultdict

# Força UTF-8 no stdout do Windows (evita UnicodeEncodeError com cp1252)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import MUNICIPIOS, DATA_PROCESSED, DASH_DATA

# ── Caminhos ──────────────────────────────────────────────────────────────────
ICMS_MUNIC  = Path(r"C:\Users\Alisson Fiorentin\Downloads\Arrecadação por Município e por Corede.csv")
ICMS_CNAE   = Path(r"C:\Users\Alisson Fiorentin\Downloads\Arrecadação de ICMS por CNAE - Classe.csv")
DANOS_JSON  = DATA_PROCESSED / "danos_operacionais.json"
OUT_JSON    = DATA_PROCESSED / "icms_validacao.json"

# Taxa ICMS efetiva RS: ICMS arrecadado RS 2023 / PIB RS 2023
# Fonte: SEFAZ-RS (arrecadação ~R$56 bi) / IBGE PIB RS 2022 ~R$578 bi (mais recente disponível)
# Usamos 2023 estimado ~R$635 bi → taxa ≈ 8,8%
# Conservador: 8% (incerteza na estimativa do PIB RS 2023)
TAXA_ICMS_EFETIVA_RS = 0.088

# Ano base: 2021-2023 (3 anos, excluindo 2020 COVID)
ANOS_BASE = ["2021", "2022", "2023"]

# Meses da fase aguda/recuperação maio/2024 → monitoramos abr-dez/2024
MESES_ANALISE = list(range(1, 13))   # 1-12
MES_EVENTO    = 5                    # maio

# Piores cenários por município (alinhados com danos_operacionais.json)
PIORES_CENARIOS = {
    "Eldorado do Sul": "Cenario ADA",
    "Lajeado":         "Cenario 27m",
    "Porto Alegre":    "Cenario ADA",
    "Rio Grande":      "Cenario Maio 2024",
}

# Códigos municipais SEFAZ-RS (encontrados no CSV)
COD_MUNIC_SEFAZ = {
    "Eldorado do Sul": "267",
    "Lajeado":         "364",
    "Porto Alegre":    "96",
    "Rio Grande":      "100",
}


def fmt_brl(v: float) -> str:
    if v >= 1e9:  return f"R$ {v/1e9:.2f} bi"
    if v >= 1e6:  return f"R$ {v/1e6:.1f} mi"
    if v >= 1e3:  return f"R$ {v/1e3:.0f} mil"
    return f"R$ {v:.0f}"


def parse_valor(s: str) -> float:
    return float(s.replace(".", "").replace(",", ".")) if s else 0.0


def load_icms_munic() -> dict:
    """Retorna {cod_munic: {(ano, mes): valor}} apenas para nossos municípios."""
    cod_set = set(COD_MUNIC_SEFAZ.values())
    data: dict = defaultdict(lambda: defaultdict(float))

    with open(ICMS_MUNIC, encoding="latin-1") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            if row["sigla_tipo_arr"] != "ICMS":
                continue
            cod = row["cod_munic"].strip()
            if cod not in cod_set:
                continue
            ano, mes = row["ano"].strip(), row["mes"].strip()
            data[cod][(ano, mes)] += parse_valor(row["valor"])

    return {k: dict(v) for k, v in data.items()}


def load_icms_cnae() -> dict:
    """Retorna {(cod_classe, nome_classe): {(ano, mes): valor}} para CNAE 2.0."""
    data: dict = defaultdict(lambda: defaultdict(float))

    with open(ICMS_CNAE, encoding="latin-1") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            if row["cod_versao"].strip() != "2.0":
                continue
            key = (row["cod_classe"].strip(), row["nome_classe"].strip())
            ano, mes = row["ano"].strip(), row["mes"].strip()
            data[key][(ano, mes)] += parse_valor(row["valor"])

    return {k: dict(v) for k, v in data.items()}


def baseline_mes(serie: dict, mes: int, anos_base=ANOS_BASE) -> float:
    """Média do mês `mes` nos anos base."""
    vals = [serie.get((a, str(mes)), 0.0) for a in anos_base]
    vals_ok = [v for v in vals if v > 0]
    return sum(vals_ok) / len(vals_ok) if vals_ok else 0.0


def anomalia_pct(obs: float, esperado: float) -> float:
    if esperado == 0:
        return 0.0
    return (obs - esperado) / esperado * 100


def municipio_analise(cod: str, serie: dict) -> dict:
    """Análise completa de um município: série, baseline, anomalias, shortfalls."""
    result = {}

    # Série mensal 2021-2024
    serie_2024 = {m: serie.get(("2024", str(m)), 0.0) for m in MESES_ANALISE}
    baselines   = {m: baseline_mes(serie, m) for m in MESES_ANALISE}

    # Anomalia mês a mês
    anomalias = {m: anomalia_pct(serie_2024[m], baselines[m]) for m in MESES_ANALISE}
    shortfalls = {m: baselines[m] - serie_2024[m] for m in MESES_ANALISE}

    # Shortfall acumulado abr-dez/2024 (impacto total do evento maio/2024)
    meses_impacto = list(range(4, 13))
    shortfall_acum = sum(shortfalls[m] for m in meses_impacto if shortfalls[m] > 0)

    # Tendência YoY: crescimento médio maio 2021→2022→2023
    may_series = [serie.get((a, "5"), 0.0) for a in ANOS_BASE]
    if len(may_series) >= 2 and may_series[0] > 0:
        yoy = (may_series[-1] / may_series[0]) ** (1 / (len(ANOS_BASE) - 1)) - 1
    else:
        yoy = 0.0

    result["serie_mensal_2024"]       = serie_2024
    result["baselines_mensais"]       = baselines
    result["anomalia_pct_por_mes"]    = anomalias
    result["shortfall_por_mes"]       = shortfalls
    result["shortfall_acumulado_abr_dez"] = shortfall_acum
    result["anomalia_maio_pct"]       = anomalias.get(MES_EVENTO, 0.0)
    result["icms_maio_obs"]           = serie_2024.get(MES_EVENTO, 0.0)
    result["icms_maio_esperado"]      = baselines.get(MES_EVENTO, 0.0)
    result["yoy_tendencia_maio"]      = round(yoy * 100, 2)

    # Série histórica completa (para gráfico)
    serie_hist = {}
    for ano in ["2019", "2020", "2021", "2022", "2023", "2024"]:
        for mes in MESES_ANALISE:
            v = serie.get((ano, str(mes)), None)
            if v is not None:
                serie_hist[f"{ano}-{mes:02d}"] = v
    result["serie_historica"] = serie_hist

    return result


def cnae_analise(icms_cnae: dict) -> list:
    """Top classes por maior queda em mai/2024 vs. baseline."""
    rows = []
    for (cod, nome), serie in icms_cnae.items():
        if cod == "0":
            continue
        obs_maio   = serie.get(("2024", "5"), 0.0)
        base_maio  = baseline_mes(serie, 5)
        if base_maio < 100_000:  # ignora classes com ICMS residual
            continue
        delta = obs_maio - base_maio
        delta_pct = anomalia_pct(obs_maio, base_maio)
        rows.append({
            "cod_classe":   cod,
            "nome_classe":  nome,
            "icms_maio_obs":      round(obs_maio, 2),
            "icms_maio_esperado": round(base_maio, 2),
            "delta":        round(delta, 2),
            "delta_pct":    round(delta_pct, 1),
        })
    rows.sort(key=lambda r: r["delta"])  # maiores quedas primeiro
    return rows


def cruzamento(mun_nome: str, mun_res: dict, danos: dict) -> dict:
    """Cruza nossa estimativa DaLA com o sinal ICMS."""
    cen = PIORES_CENARIOS[mun_nome]
    dala = danos.get(mun_nome, {}).get(cen, {})

    vab_dala = dala.get("empresas_vab", 0.0)
    total_dala = dala.get("total", 0.0)

    # ICMS implicado pela nossa perda de VAB (se a queda fosse inteiramente capturada no ICMS)
    icms_implicado = vab_dala * TAXA_ICMS_EFETIVA_RS

    # Shortfall ICMS observado (um mês ou acumulado)
    shortfall_mes   = mun_res["shortfall_por_mes"].get(MES_EVENTO, 0.0)
    shortfall_acum  = mun_res["shortfall_acumulado_abr_dez"]

    # Razão: VAB_DaLA × taxa / shortfall_ICMS
    # Se razão > 1: estimamos mais perda do que o sinal ICMS captura (esperado — ICMS não cobre ISS, etc.)
    # Se razão << 1: ICMS caiu mais do que implica nosso VAB loss → subestimamos ou há efeito além da mancha
    razao_mes  = icms_implicado / shortfall_mes  if shortfall_mes  > 0 else None
    razao_acum = icms_implicado / shortfall_acum if shortfall_acum > 0 else None

    return {
        "cenario":             cen,
        "vab_dala":            round(vab_dala, 2),
        "total_dala":          round(total_dala, 2),
        "icms_implicado_taxa": round(icms_implicado, 2),
        "taxa_efetiva_usada":  TAXA_ICMS_EFETIVA_RS,
        "shortfall_icms_maio": round(shortfall_mes, 2),
        "shortfall_icms_acum": round(shortfall_acum, 2),
        "razao_maio":          round(razao_mes, 2)  if razao_mes  is not None else None,
        "razao_acumulada":     round(razao_acum, 2) if razao_acum is not None else None,
    }


def print_relatorio(resultados: dict) -> None:
    sep = "=" * 72
    print(f"\n{sep}")
    print("  VALIDAÇÃO CRUZADA — ICMS MUNICIPAL vs. ESTIMATIVA DaLA")
    print(f"  Taxa ICMS efetiva RS usada: {TAXA_ICMS_EFETIVA_RS*100:.1f}%")
    print(f"  Baseline: média mensal 2021-2023")
    print(sep)

    for mun, res in resultados["municipios"].items():
        ic = res["icms"]
        cx = res["cruzamento"]
        print(f"\n  {'-'*68}")
        print(f"  {mun.upper()} -- {cx['cenario']}")
        print(f"  {'-'*68}")

        # Série mai/2024
        obs  = ic["icms_maio_obs"]
        esp  = ic["icms_maio_esperado"]
        anom = ic["anomalia_maio_pct"]
        sf   = ic["shortfall_por_mes"].get(5, 0.0)
        print(f"  ICMS Maio/2024:  obs={fmt_brl(obs)}  esperado={fmt_brl(esp)}  anomalia={anom:+.1f}%  shortfall={fmt_brl(sf)}")

        # Shortfall acumulado
        print(f"  Shortfall acum. Abr-Dez/2024: {fmt_brl(ic['shortfall_acumulado_abr_dez'])}")

        # Tendência histórica maio
        print(f"  Tendência YoY maio (2021→2023): {ic['yoy_tendencia_maio']:+.1f}%/ano")

        # Anomalias mensais 2024
        print(f"  Anomalia mensal 2024 (vs. baseline):")
        anos_str = "  " + "  ".join(f"[{m:02d}]{ic['anomalia_pct_por_mes'][m]:+5.1f}%" for m in MESES_ANALISE)
        print(anos_str)

        # Cruzamento DaLA
        print(f"\n  -- Cruzamento com DaLA --")
        print(f"  VAB perdido (DaLA)  : {fmt_brl(cx['vab_dala'])}")
        print(f"  Total DaLA          : {fmt_brl(cx['total_dala'])}")
        print(f"  ICMS implicado      : {fmt_brl(cx['icms_implicado_taxa'])}  (VAB × {TAXA_ICMS_EFETIVA_RS*100:.1f}%)")
        print(f"  Shortfall ICMS maio : {fmt_brl(cx['shortfall_icms_maio'])}")
        print(f"  Razão maio          : {cx['razao_maio']}×")
        if cx["razao_maio"] is not None:
            if cx["razao_maio"] > 5:
                print(f"    -> Nossa estimativa e {cx['razao_maio']:.1f}x o sinal ICMS (esperado: ICMS nao cobre servicos ISS)")
            elif cx["razao_maio"] < 0.5:
                print(f"    [!] ICMS caiu mais do que implica nosso VAB loss -> possivel subestimacao")
            else:
                print(f"    [OK] Consistente -- nossa estimativa dentro da ordem de magnitude do sinal ICMS")

    # CNAE: top quedas
    print(f"\n{sep}")
    print("  TOP 15 CLASSES CNAE — MAIOR QUEDA ICMS EM MAIO/2024 (RS)")
    print(f"{sep}")
    print(f"  {'Classe':<8} {'Nome':<40} {'Obs (R$mi)':>10} {'Esp (R$mi)':>10} {'Δ%':>7}")
    print(f"  {'-'*76}")
    for r in resultados["cnae_top_quedas"][:15]:
        print(f"  {r['cod_classe']:<8} {r['nome_classe'][:38]:<40} "
              f"{r['icms_maio_obs']/1e6:>9.1f}  {r['icms_maio_esperado']/1e6:>9.1f}  {r['delta_pct']:>6.1f}%")

    # CNAE: top altas (recuperação / contrapartida)
    print(f"\n  TOP 5 CLASSES COM MAIOR ALTA (setor de reconstrução/emergência?):")
    for r in sorted(resultados["cnae_top_quedas"], key=lambda x: -x["delta"])[:5]:
        print(f"    {r['cod_classe']}: {r['nome_classe'][:50]}  {r['delta_pct']:+.1f}%")


def main():
    print("Carregando ICMS por município...")
    icms_munic = load_icms_munic()

    print("Carregando ICMS por CNAE classe...")
    icms_cnae = load_icms_cnae()

    print("Carregando danos_operacionais.json...")
    if not DANOS_JSON.exists():
        print(f"  AVISO: {DANOS_JSON} não encontrado — cruzamento DaLA será vazio")
        danos = {}
    else:
        with open(DANOS_JSON, encoding="utf-8") as f:
            danos = json.load(f)

    resultados = {"municipios": {}, "cnae_top_quedas": []}

    for mun_nome, cod in COD_MUNIC_SEFAZ.items():
        serie = icms_munic.get(cod, {})
        if not serie:
            print(f"  AVISO: sem dados ICMS para {mun_nome} (cod={cod})")
            continue
        ic = municipio_analise(cod, serie)
        cx = cruzamento(mun_nome, ic, danos)
        resultados["municipios"][mun_nome] = {"icms": ic, "cruzamento": cx}

    resultados["cnae_top_quedas"] = cnae_analise(icms_cnae)

    # Salvar JSON
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    print(f"\n  Resultado salvo: {OUT_JSON}")

    # Imprimir relatório
    print_relatorio(resultados)

    return resultados


if __name__ == "__main__":
    main()
