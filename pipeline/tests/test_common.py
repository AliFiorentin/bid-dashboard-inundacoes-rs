"""Testes das funcoes puras de pipeline/common.py (sem dados externos)."""
import pandas as pd

import common


def test_slugify_remove_acentos_e_pontuacao():
    assert common.slugify("Eldorado do Sul") == "eldorado_do_sul"
    assert common.slugify("  Cenário 27m!  ") == "cenario_27m"
    assert common.slugify("Climada Evento 2024") == "climada_evento_2024"


def test_limpar_numerico_formato_brasileiro_e_internacional():
    br = common.limpar_numerico(pd.Series(["1.234,56", "2,5", "abc"]))
    assert br.iloc[0] == 1234.56 and br.iloc[1] == 2.5 and pd.isna(br.iloc[2])
    intl = common.limpar_numerico(pd.Series(["1234.5", "7"]))
    assert list(intl) == [1234.5, 7.0]
    num = common.limpar_numerico(pd.Series([1, 2]))
    assert list(num) == [1.0, 2.0]


def test_zfill_cnpj_remove_nao_numericos():
    out = common.zfill_cnpj(pd.Series(["12.345.678/0001-90", "123"]))
    assert out.iloc[0] == "12345678000190"
    assert out.iloc[1] == "00000000000123"


def test_get_prop_trata_zero_como_valor_valido():
    assert common.get_prop({"a": 0, "b": 5}, "a", "b") == 0
    assert common.get_prop({"b": 5}, "a", "b") == 5
    assert common.get_prop({}, "a", default=-1) == -1


def test_coords_validas_filtra_bbox_do_rs_e_zeros():
    lat = pd.Series([-30.0, 0.0, -10.0, None, -29.5])
    lon = pd.Series([-51.0, -51.0, -51.0, -51.0, -60.0])
    assert list(common.coords_validas(lat, lon)) == [True, False, False, False, False]


def test_pct_e_fmt_brl():
    assert common.pct(25, 200) == 12.5
    assert common.pct(5, 0) == 0.0
    assert common.fmt_brl(1_500_000) == "R$ 1.5 mi"
    assert common.fmt_brl(2_300_000_000) == "R$ 2.30 bi"
    assert common.fmt_brl(12.5) == "R$ 12.50"
