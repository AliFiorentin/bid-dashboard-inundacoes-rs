"""Consistencia de pipeline/config.py (sem dados externos)."""
import importlib

import config


def test_base_e_relativa_ao_repositorio():
    assert (config.BASE / "pipeline" / "config.py").exists()
    assert config.DASH_DATA == config.BASE / "Dashboard BID" / "public" / "dados_convertidos"


def test_municipios_tem_campos_obrigatorios():
    assert set(config.MUNICIPIOS) == {"Eldorado do Sul", "Lajeado", "Porto Alegre", "Rio Grande"}
    for nome, cfg in config.MUNICIPIOS.items():
        assert cfg["slug"] and cfg["slug"] == cfg["slug"].lower()
        assert len(str(cfg["ibge7"])) == 7, nome
        assert cfg["cenarios"], nome


def test_variaveis_de_ambiente_trocam_fontes_externas(monkeypatch, tmp_path):
    monkeypatch.setenv("BID_RASTERS_DIR", str(tmp_path))
    monkeypatch.setenv("BID_ICMS_DIR", str(tmp_path / "icms"))
    monkeypatch.setenv("BID_RAIS_PARQUET", str(tmp_path / "rais.parquet"))
    try:
        cfg = importlib.reload(config)
        assert cfg.RASTERS_DIR == tmp_path
        assert cfg.ICMS_DIR == tmp_path / "icms"
        assert cfg.RAIS_PARQUET == tmp_path / "rais.parquet"
    finally:
        monkeypatch.undo()
        importlib.reload(config)
