"""Contrato das saidas commitadas em Dashboard BID/public/dados_convertidos (o que o app le).

Nao precisam de dados brutos: valida o formato e a coerencia dos JSONs/imagens do cenario
"Todas as cotas". Pula os municipios cujos arquivos nao existem (ex.: submodulo nao baixado)."""
import json

import pytest

import config

MUNICIPIOS_COTA = ["lajeado", "eldorado_do_sul", "porto_alegre"]
RAIZ = config.DASH_DATA


def _carrega(caminho):
    if not caminho.exists():
        pytest.skip(f"{caminho} ausente")
    return json.loads(caminho.read_text(encoding="utf-8"))


@pytest.mark.parametrize("slug", MUNICIPIOS_COTA)
def test_cota_mapa_json_e_webp_coerentes(slug):
    Image = pytest.importorskip("PIL.Image")
    meta = _carrega(RAIZ / slug / "cota_mapa.json")
    n = len(meta["cotas"])
    assert meta["cotas"] == sorted(meta["cotas"]) and n >= 2
    assert len(meta["pop_por_cota"]) == n
    assert all(a <= b for a, b in zip(meta["pop_por_cota"], meta["pop_por_cota"][1:], strict=False)), "populacao acumulada nao decresce"
    assert meta["pop_por_cota"][-1] <= meta["pop_grade"]
    w, s, e, nn = meta["bounds"]
    assert w < e and s < nn
    nw, ne, se, sw = meta["coordinates"]
    assert nw == [w, nn] and se == [e, s]
    img = Image.open(RAIZ / slug / "cota_mapa.webp")
    assert img.size == (meta["width"], meta["height"])
    r = img.convert("RGBA").getchannel("R").getextrema()
    assert r[1] <= n, "indice da 1a cota molhada maior que o numero de cotas"
    if "area_por_cota_km2" in meta:  # adicionado por 10_infra_stats.py
        assert len(meta["area_por_cota_km2"]) == n


@pytest.mark.parametrize("slug", MUNICIPIOS_COTA)
def test_detalhe_por_cota_e_cumulativo(slug):
    det = _carrega(RAIZ / f"climada_cota_detalhe_{slug}.json")
    cotas = sorted(det["por_cota"], key=float)
    for setor in ("empresas", "saude", "educacao"):
        n = [det["por_cota"][c][setor]["n"] for c in cotas]
        assert all(a <= b for a, b in zip(n, n[1:], strict=False)), f"{setor}: atingidos nao cumulativos"
        assert n[-1] <= det["totais"][setor]["n"]
        v = [det["por_cota"][c][setor]["valor_exposto_brl"] for c in cotas]
        assert all(a <= b + 1e-6 for a, b in zip(v, v[1:], strict=False)), f"{setor}: valor exposto nao cumulativo"


@pytest.mark.parametrize("slug", MUNICIPIOS_COTA)
def test_cotas_do_mapa_batem_com_o_detalhe(slug):
    meta = _carrega(RAIZ / slug / "cota_mapa.json")
    det = _carrega(RAIZ / f"climada_cota_detalhe_{slug}.json")
    assert sorted(det["por_cota"], key=float) == [f"{c:.2f}" for c in meta["cotas"]]


@pytest.mark.parametrize("slug", MUNICIPIOS_COTA)
def test_cota_pontos_bate_com_o_detalhe_por_cota(slug):
    """A contagem de pontos atingidos por cota (cota_pontos.json, usada nas abas do Dashboard) tem que ser
    IGUAL a da aba "Por cota" (climada_cota_detalhe_*.json): mesma amostragem de 5 m."""
    pontos = _carrega(RAIZ / slug / "cota_pontos.json")
    det = _carrega(RAIZ / f"climada_cota_detalhe_{slug}.json")
    cotas = sorted(det["por_cota"], key=float)
    assert [f"{c:.2f}" for c in pontos["cotas"]] == cotas
    for setor in ("empresas", "saude", "educacao"):
        idx = pontos["idx"][setor]
        assert len(idx) == pontos["n"][setor]
        assert sum(1 for k in idx if k >= 0) == det["totais"][setor]["n"], f"{setor}: pontos dentro do municipio"
        for j, c in enumerate(cotas, start=1):
            n = sum(1 for k in idx if 1 <= k <= j)
            assert n == det["por_cota"][c][setor]["n"], f"{setor} cota {c}: {n} != {det['por_cota'][c][setor]['n']}"
