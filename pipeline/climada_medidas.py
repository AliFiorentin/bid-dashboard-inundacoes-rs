"""
climada_medidas.py -- medidas de adaptacao aplicadas ao dano fisico por periodo de retorno de
Porto Alegre e Lajeado: quanto do risco anual esperado (EAI) cada medida evita, e a razao
beneficio/custo.

Base: a mesma profundidade por ponto e por RP do painel (Porto Alegre: rasters RP10..RP500;
Lajeado: RPs derivados das cotas do rio, climada_rp_por_cota.profundidades_por_rp), com as
mesmas curvas de dano e valores de reposicao de climada_risco_prototipo.py.

MEDIDAS E PARAMETROS (literatura; fonte e link em cada entrada de MEDIDAS):
  alerta          Sistema de alerta antecipado -- reducao de 28% no dano de CONTEUDO: empresas
                  que salvaram equipamentos na cheia do Elba (2002) reduziram em 28% o dano a
                  equipamentos (Kreibich et al. 2007, Water Resources Research).
  estoque         Estoque e equipamento elevados -- reducao de 48% no dano de CONTEUDO, so
                  Empresas: "uso adaptado a cheia" (Kreibich et al. 2005, NHESS).
  protecao_imovel Vedacao do imovel (barreiras, dry floodproofing) -- reducao de 45% do dano
                  onde a profundidade e' <= 1 m, sem efeito acima (Kreibich et al. 2015, revisao:
                  efetividade media 45%, faixa 10-85%, valida ate ~1 m de agua). 3 setores.
  dique_rp20/100  Protecao coletiva ate o RP de projeto (cenario de projeto, sem parametro
                  empirico): dano zero abaixo do RP, inteiro acima (DEGRAU, eai_degrau).
  relocacao       Relocacao parcial (cenario de projeto): os pontos de maior profundidade no RP100
                  perdem 60% do valor exposto; 0,5% dos pontos de Empresas e Saude, 4% de Educacao.
A reducao sobre o CONTEUDO vira fator sobre o dano total pela parcela de conteudo do valor de
reposicao (mesmos percentuais de climada_risco_prototipo.py, Huizinga et al. 2017, Tab. 3-26):
conteudo/(estrutura+conteudo) = 50% em Empresas, 33% em Educacao, 56% em Saude.
Limites: os estudos de efetividade sao alemaes (cheia de 2002) e o de 48% e' de residencias.

BENEFICIO = EAI sem a medida - EAI com a medida, hoje e em 2050 (mesmas funcoes do prototipo).
Cada medida traz tambem o beneficio "sem cauda assumida" (so entre o RP10 e o RP500, mais o
plato raro): a reta "evento anual, dano zero" ate o RP10 e' premissa, nao dado.

CUSTO-BENEFICIO (so Porto Alegre): beneficio = valor presente do risco evitado em 2025-2050 (o
evitado de 2025 e o de 2050 interpolados linearmente, desconto TAXA_DESCONTO = 6% a.a.).
Custos (CUSTOS, com fonte e link em cada entrada):
  - DIQUES: custo GENERICO para qualquer municipio = proporcao custo/exposicao do programa de
    protecao contra cheias e drenagem de Porto Alegre aplicada a exposicao do municipio.
    RP100: R$ 2,3 bi (R$ 624 mi estruturas + R$ 1,1 bi casas de bombas + R$ 600 mi arroios e
    galerias); RP20: R$ 624 mi (so estruturas; premissa: a cota de projeto, 5,8 m, nao tem RP).
  - alerta: R$ 47,175 mi, contrato do Plano Rio Grande para 130 estacoes hidrometeorologicas em
    24 bacias (sistema ESTADUAL inteiro atribuido ao municipio: teto de custo).
  - relocacao: 60% do valor de reposicao dos pontos relocados (refazer o ativo em outro lugar).
  - protecao_imovel: US$ 45 mil por EDIFICACAO (dry floodproofing, Aerts 2018), uma edificacao por
    coordenada atingida no RP500 (a vedacao protege o predio; aproximacao, ver CUSTOS).
  - estoque: mezanino metalico instalado, R$ 380 a R$ 850 por m2 (precos de mercado no Sul do
    Brasil), sobre 100% da area de cada empresa atingida no RP500 (area = 9 m2 x vinculos, a mesma
    do valor de reposicao). 100% e' TETO: a fracao da area a elevar nao tem fonte. O B/C principal
    usa o teto da faixa; bc_*_max usa o piso.
  Custos em US$ (vedacao, valor dos EUA) convertidos a CAMBIO_BRL_USD.

Uso:  python pipeline/climada_medidas.py
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA, DATA_PROCESSED
import climada_risco_prototipo as proto
import climada_cota as cc
import climada_rp_por_cota as rpc

SETORES = cc.SETORES
HAZARD_DIR_POA = Path(r"G:\Meu Drive\Projetos\Climada\climada-brazil-adaptation\data\hazard")
CURVAS = cc.curvas(proto.POA_CALIBRATION_FACTOR)

# Parcela de conteudo no valor de reposicao (estrutura + conteudo), dos mesmos percentuais usados
# no valor de reposicao (Huizinga et al. 2017, Tab. 3-26)
def _parcela_conteudo(pct: float) -> float:
    return pct / (1 + pct)


PARCELA_CONTEUDO = {
    "empresas": _parcela_conteudo(proto.CONTEUDO_PCT_COMERCIAL),
    "educacao": _parcela_conteudo(proto.CONTEUDO_PCT_RESIDENCIAL),
    "saude": _parcela_conteudo((proto.CONTEUDO_PCT_COMERCIAL + proto.CONTEUDO_PCT_INDUSTRIAL) / 2),
}
RED_ALERTA_CONTEUDO = 0.28   # Kreibich et al. 2007
RED_ESTOQUE_CONTEUDO = 0.48  # Kreibich et al. 2005
RED_VEDACAO = 0.45           # Kreibich et al. 2015 (media; faixa 10-85%)
LIMITE_VEDACAO_M = 1.0       # Kreibich et al. 2015: dry floodproofing so' funciona ate ~1 m

F_K2007 = {"fonte": "Kreibich et al. (2007), Flood precaution of companies and their ability to cope with the flood in August 2002 in Saxony, Germany. Water Resources Research 43, W03408", "fonte_url": "https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/2005WR004691"}
F_K2005 = {"fonte": "Kreibich et al. (2005), Flood loss reduction of private households due to building precautionary measures. Natural Hazards and Earth System Sciences 5, 117-126", "fonte_url": "https://nhess.copernicus.org/articles/5/117/2005/"}
F_K2015 = {"fonte": "Kreibich et al. (2015), A review of damage-reducing measures to manage fluvial flood risks in a changing climate. Mitigation and Adaptation Strategies for Global Change 20, 967-989", "fonte_url": "https://link.springer.com/article/10.1007/s11027-014-9629-5"}
F_CENARIO = {"fonte": "Cenário de projeto (sem parâmetro empírico)", "fonte_url": None}


def _pct(x: float) -> str:
    return f"{x:.2f}".replace(".", ",")


MEDIDAS = [
    {"id": "alerta", "nome": "Sistema de alerta antecipado",
     "mecanismo": "−28% no dano de conteúdo: dano × " + ", ".join(f"{_pct(1 - RED_ALERTA_CONTEUDO * PARCELA_CONTEUDO[s])} ({n})" for s, n in [("empresas", "Empresas"), ("educacao", "Educação"), ("saude", "Saúde")]),
     "mdd": {s: 1 - RED_ALERTA_CONTEUDO * PARCELA_CONTEUDO[s] for s in SETORES}, **F_K2007},
    {"id": "estoque", "nome": "Estoque e equipamento elevados",
     "mecanismo": f"−48% no dano de conteúdo: dano × {_pct(1 - RED_ESTOQUE_CONTEUDO * PARCELA_CONTEUDO['empresas'])} (só Empresas)",
     "mdd": {"empresas": 1 - RED_ESTOQUE_CONTEUDO * PARCELA_CONTEUDO["empresas"]}, **F_K2005},
    {"id": "protecao_imovel", "nome": "Vedação do imóvel (barreiras)",
     "mecanismo": "−45% do dano onde a profundidade é ≤ 1 m; sem efeito acima (3 setores)",
     "vedacao": {"limite_m": LIMITE_VEDACAO_M, "reducao": RED_VEDACAO}, **F_K2015},
    {"id": "dique_rp20", "nome": "Proteção coletiva até RP20 (dique/drenagem)", "mecanismo": "dano zero em eventos de RP ≤ 20; dano inteiro acima",
     "corte_rp": 20, **F_CENARIO},
    {"id": "dique_rp100", "nome": "Proteção coletiva até RP100 (dique)", "mecanismo": "dano zero em eventos de RP ≤ 100; dano inteiro acima",
     "corte_rp": 100, **F_CENARIO},
    {"id": "relocacao", "nome": "Relocação parcial dos pontos mais profundos", "mecanismo": "60% do valor dos pontos mais profundos no RP100 (0,5% de Empresas e Saúde, 4% de Educação)",
     "reloc": {"empresas": 0.005, "educacao": 0.04, "saude": 0.005}, "reloc_valor": 0.6, **F_CENARIO},
]


def depths_porto_alegre() -> dict:
    gjs, _, is_ind, valores = rpc.carregar_pontos("porto_alegre", "Porto Alegre")
    depths = {}
    for rp in proto.RPS:
        tif = HAZARD_DIR_POA / f"PortoAlegre_{rp}_depth.tif"
        if not tif.exists():
            sys.exit(f"ERRO: raster nao encontrado: {tif}")
        depths[rp] = {s: proto.sample_depth(gjs[s], tif) for s in SETORES}
    return {"gjs": gjs, "valores": valores, "is_ind": is_ind, "depths": depths}


def perdas(d: dict, medida: dict | None) -> dict:
    """{setor: [dano por RP]} com a medida aplicada (None = sem medida)."""
    m = medida or {}
    rps = list(d["depths"])
    valores = dict(d["valores"])
    if "reloc" in m:
        for s, frac in m["reloc"].items():
            ref = d["depths"]["RP100"][s]
            n = min(int(round(frac * len(ref))), int((ref > 0).sum()))
            if n > 0:
                idx = np.argsort(-ref, kind="stable")[:n]
                v = valores[s].copy()
                v[idx] *= 1 - m["reloc_valor"]
                valores[s] = v
    out = {}
    for s in SETORES:
        linha = []
        for rp in rps:
            prof = d["depths"][rp][s]
            dano = cc.mdd(s, prof, CURVAS, d["is_ind"] if s == "empresas" else None) * valores[s]
            if "vedacao" in m:  # vedacao so' segura ate o limite de profundidade
                v = m["vedacao"]
                dano = np.where((prof > 0) & (prof <= v["limite_m"]), dano * (1 - v["reducao"]), dano)
            linha.append(float(dano.sum()) * m.get("mdd", {}).get(s, 1.0))
        out[s] = linha
    return out


def eai_sem_cauda(freqs: list, losses: list) -> float:
    """EAI so com o que os RPs calculados sustentam: trapezio entre o 1o e o ultimo RP,
    mais o plato alem do mais raro. Sem a reta assumida de frequencia 1 ate o 1o RP."""
    total = sum((freqs[i] - freqs[i + 1]) * (losses[i] + losses[i + 1]) / 2.0 for i in range(len(freqs) - 1))
    return total + freqs[-1] * losses[-1]


def eai_degrau(freqs: list, losses: list, k: int) -> float:
    """EAI com protecao coletiva ate o RP de indice k: DEGRAU na frequencia de projeto. Tudo
    que e' mais frequente que o RP de projeto (inclusive a cauda assumida) vale zero; acima
    dele a perda volta INTEIRA (sem interpolar de zero ate o RP seguinte, o que superestimava
    o beneficio)."""
    return sum((freqs[i] - freqs[i + 1]) * (losses[i] + losses[i + 1]) / 2.0 for i in range(k, len(freqs) - 1)) + freqs[-1] * losses[-1]


def metricas(rps: list, loss: dict, corte_rp: int | None = None) -> dict:
    """loss: {setor: [perda por RP]}. corte_rp: RP de projeto de uma protecao coletiva (dique),
    aplicado como degrau (eai_degrau) sobre a perda SEM a medida."""
    if corte_rp is not None:
        freqs = [1.0 / proto.RP_ANOS[rp] for rp in rps]
        k = rps.index(f"RP{corte_rp}")
        por_setor = {s: eai_degrau(freqs, loss[s], k) for s in SETORES}
        rps50 = sorted([rp for rp in proto.RP_REMAP_2050 if rp in rps], key=lambda rp: proto.RP_ANOS[rp])
        f50 = [proto.RP_REMAP_2050[rp]["freq_2050"] for rp in rps50]
        k50 = rps50.index(f"RP{corte_rp}")  # mesma lamina d'agua de projeto, frequencia de 2050
        e50 = sum(eai_degrau(f50, [loss[s][rps.index(rp)] * proto.FATOR_CRESCIMENTO_2050 for rp in rps50], k50) for s in SETORES)
        tot = sum(por_setor.values())
        return {"eai_2050_sem_cauda": e50, "eai_por_setor": por_setor, "eai": tot, "eai_sem_cauda": tot, "eai_2050": e50}
    freqs = [1.0 / proto.RP_ANOS[rp] for rp in rps]
    eai = proto._eai_trapezio(rps, freqs, loss)
    resultados = {rp: {s: {"dano_fisico_total_brl": loss[s][i]} for s in SETORES} for i, rp in enumerate(rps)}
    proj = proto.calcular_projecao_2050(resultados, SETORES)
    rps50 = sorted([rp for rp in proto.RP_REMAP_2050 if rp in rps], key=lambda rp: proto.RP_ANOS[rp])
    f50 = [proto.RP_REMAP_2050[rp]["freq_2050"] for rp in rps50]
    sem50 = sum(eai_sem_cauda(f50, [loss[s][rps.index(rp)] * proto.FATOR_CRESCIMENTO_2050 for rp in rps50]) for s in SETORES) if len(rps50) >= 2 else None
    return {
        "eai_2050_sem_cauda": sem50,
        "eai_por_setor": {s: eai[s] for s in SETORES},
        "eai": sum(eai[s] for s in SETORES),
        "eai_sem_cauda": sum(eai_sem_cauda(freqs, loss[s]) for s in SETORES),
        "eai_2050": proj["total"]["risco_2050_brl"] if proj else None,
    }


# --- Custo-beneficio ---
CAMBIO_BRL_USD = 5.5556  # R$/US$ de referencia para converter custos em dolar
TAXA_DESCONTO = 0.06  # 6% a.a., definida pelo usuario
ANO_INI, ANO_FIM = 2025, 2050
F_PMPA = {"fonte": "Prefeitura de Porto Alegre, balanço de investimentos em prevenção e obras de proteção contra cheias", "fonte_url": "https://prefeitura.poa.br/gp/noticias/prefeitura-apresenta-balanco-de-investimentos-em-prevencao-e-obras-de-protecao-contra"}
F_AERTS = {"fonte": "Aerts (2018), A Review of Cost Estimates for Flood Adaptation. Water 10(11), 1646", "fonte_url": "https://doi.org/10.3390/w10111646"}
# tipo: dique_proporcional | coletiva_brl | valor_relocado | por_estabelecimento (US$ por estabelecimento
# atingido no RP500; "usd_min" da' a ponta barata da faixa) | por_coordenada (US$ por coordenada atingida no
# RP500: a vedacao protege o PREDIO, e varios estabelecimentos dividem o mesmo endereco. Aproximacao: parte
# das pilhas e' erro de geocodificacao, o que junta predios diferentes e subestima o custo)
CUSTOS = {
    "dique_rp20": {"tipo": "dique_proporcional", "brl_mi": 624.0, "descricao": "R$ 624 mi em melhorias das estruturas de proteção (diques, muro, comportas), como proporção da exposição", **F_PMPA},
    "dique_rp100": {"tipo": "dique_proporcional", "brl_mi": 2300.0, "descricao": "R$ 2,3 bi do programa de proteção e drenagem (R$ 624 mi estruturas + R$ 1,1 bi casas de bombas + R$ 600 mi arroios e galerias), como proporção da exposição", **F_PMPA},
    "alerta": {"tipo": "coletiva_brl", "brl_mi": 47.175, "descricao": "R$ 47,175 mi, contrato do Plano Rio Grande para 130 estações hidrometeorológicas em 24 bacias (sistema estadual inteiro)",
               "fonte": "Defesa Civil do Rio Grande do Sul, estações de monitoramento hidrometeorológicas (Plano Rio Grande)", "fonte_url": "https://www.defesacivil.rs.gov.br/estacoes-de-monitoramento-hidrometeorologicas-ja-estao-instaladas-em-20-pontos"},
    "protecao_imovel": {"tipo": "por_coordenada", "usd": {"empresas": 45000.0, "educacao": 45000.0, "saude": 45000.0}, "descricao": "US$ 45 mil por edificação (dry floodproofing), contando uma edificação por coordenada atingida no RP500", **F_AERTS},
    "estoque": {"tipo": "por_area", "brl_m2": {"empresas": 850.0}, "brl_m2_min": {"empresas": 380.0},
                "descricao": "mezanino metálico instalado, R$ 380 a R$ 850 por m², sobre 100% da área de cada empresa atingida no RP500 (teto: supõe elevar toda a área)",
                "fonte": "Preços de mercado de mezanino metálico no Sul do Brasil (Estruturas Metálicas MLN; Mezanino para Lojas, SC/PR)", "fonte_url": "https://www.estruturasmetalicasmln.com.br/mezanino-metalico-preco"},
    "relocacao": {"tipo": "valor_relocado", "descricao": "60% do valor de reposição dos pontos relocados (refazer o ativo em outro lugar)",
                  "fonte": "Valor de reposição do próprio modelo (CUB/RS, Sinduscon-RS)", "fonte_url": None},
}


def exposicao_poa_referencia() -> float:
    """Exposicao total (R$) de Porto Alegre nos 3 setores, a base da proporcao custo/exposicao
    dos diques (saida do prototipo: climada_dano_fisico_prototipo.json)."""
    r = json.load(open(DATA_PROCESSED / "climada_dano_fisico_prototipo.json", encoding="utf-8"))["resultados_por_rp"]["RP10"]
    return float(sum(v["exposicao_total_brl"] for v in r.values()))


def custo_medida(mid: str, d: dict) -> tuple[float, list]:
    """(custo em R$, setores com custo) da medida, pelas regras de CUSTOS."""
    c = CUSTOS[mid]
    if c["tipo"] == "dique_proporcional":
        pct = c["brl_mi"] * 1e6 / exposicao_poa_referencia()
        return pct * float(sum(d["valores"][s].sum() for s in SETORES)), list(SETORES)
    if c["tipo"] == "coletiva_brl":
        return c["brl_mi"] * 1e6, list(SETORES)
    if c["tipo"] == "valor_relocado":
        m = next(x for x in MEDIDAS if x["id"] == mid)
        total = 0.0
        for s in SETORES:
            ref = d["depths"]["RP100"][s]
            n = min(int(round(m["reloc"][s] * len(ref))), int((ref > 0).sum()))
            if n > 0:
                idx = np.argsort(-ref, kind="stable")[:n]
                total += float(d["valores"][s][idx].sum()) * m["reloc_valor"]
        return total, list(SETORES)
    if c["tipo"] == "por_area":
        return _custo_area(d, c["brl_m2"]), list(c["brl_m2"])
    return _custo_unitario(c, d, c["usd"]) * CAMBIO_BRL_USD, list(c["usd"])


def _custo_area(d: dict, brl_m2: dict) -> float:
    """R$/m2 x area (porte x AREA_M2_POR_PESSOA, a mesma do valor de reposicao) dos pontos atingidos
    no RP mais raro. Usa 100% da area: teto de custo (a fracao a elevar nao tem fonte)."""
    rp_max = list(d["depths"])[-1]
    total = 0.0
    for s, r in brl_m2.items():
        w = d["depths"][rp_max][s] > 0
        area = proto.porte_por_ponto(s, d["gjs"][s]) * proto.AREA_M2_POR_PESSOA
        total += r * float(area[w].sum())
    return total


def _custo_unitario(c: dict, d: dict, usd: dict) -> float:
    """Soma US$ x unidades atingidas no RP mais raro: estabelecimentos ou coordenadas unicas."""
    rp_max = list(d["depths"])[-1]
    total = 0.0
    for s in usd:
        w = d["depths"][rp_max][s] > 0
        if c["tipo"] == "por_coordenada":
            xy = np.array([f["geometry"]["coordinates"][:2] for f in d["gjs"][s]["features"]], dtype=float)[w]
            n = len(np.unique(np.round(xy, 7), axis=0)) if len(xy) else 0
        else:
            n = int(w.sum())
        total += usd[s] * n
    return total


def custo_min_medida(mid: str, d: dict) -> float | None:
    """Ponta barata da faixa de custo (R$), quando a fonte da' uma faixa ("usd_min")."""
    c = CUSTOS[mid]
    if "brl_m2_min" in c:
        return _custo_area(d, c["brl_m2_min"])
    return _custo_unitario(c, d, c["usd_min"]) * CAMBIO_BRL_USD if "usd_min" in c else None


def valor_presente(evitado_2025: float, evitado_2050: float) -> float:
    """VP do risco evitado em 2025-2050: interpolacao linear entre os dois anos, desconto
    TAXA_DESCONTO a.a. (ano inicial sem desconto, como o CostBenefit do CLIMADA)."""
    anos = np.arange(ANO_INI, ANO_FIM + 1)
    fluxo = np.interp(anos, [ANO_INI, ANO_FIM], [evitado_2025, evitado_2050])
    return float((fluxo / (1 + TAXA_DESCONTO) ** (anos - ANO_INI)).sum())


def custo_beneficio(m: dict, d: dict, rps: list, perda_base: dict, perda_med: dict) -> dict:
    """Custo, VP do beneficio e razao B/C da medida m (so os setores com custo, ver CUSTOS)."""
    custo, cob = custo_medida(m["id"], d)
    zeros = [0.0] * len(rps)
    b = metricas(rps, {s: perda_base[s] if s in cob else zeros for s in SETORES})
    r = metricas(rps, {s: perda_med[s] if s in cob else zeros for s in SETORES}, m.get("corte_rp"))
    vp_total = valor_presente(b["eai"] - r["eai"], b["eai_2050"] - r["eai_2050"])
    vp_sc = valor_presente(b["eai_sem_cauda"] - r["eai_sem_cauda"], b["eai_2050_sem_cauda"] - r["eai_2050_sem_cauda"])
    cmin = custo_min_medida(m["id"], d)
    faixa = {} if cmin is None else {
        "custo_min_brl": round(cmin, 2),  # custo_brl e' o teto da faixa; bc_* usam o teto (conservador)
        "bc_max": round(vp_total / cmin, 2), "bc_sem_cauda_max": round(vp_sc / cmin, 2),
    }
    return {
        **faixa,
        "custo_brl": round(custo, 2),
        "custo_descricao": CUSTOS[m["id"]]["descricao"],
        "custo_fonte": CUSTOS[m["id"]]["fonte"],
        "custo_fonte_url": CUSTOS[m["id"]]["fonte_url"],
        "setores_com_custo": cob,
        "beneficio_vp_brl": round(vp_total, 2),
        "beneficio_vp_sem_cauda_brl": round(vp_sc, 2),
        "bc": round(vp_total / custo, 2) if custo else None,
        "bc_sem_cauda": round(vp_sc / custo, 2) if custo else None,
    }


def avaliar(mun: str, d: dict) -> dict:
    rps = list(d["depths"])
    perda_base = perdas(d, None)
    base = metricas(rps, perda_base)
    print(f"\n== {mun} ==  EAI base R$ {base['eai']/1e6:.1f} mi/ano (sem cauda assumida: {base['eai_sem_cauda']/1e6:.1f}) | 2050: {base['eai_2050']/1e6:.1f}")
    medidas = []
    for m in MEDIDAS:
        r = metricas(rps, perdas(d, m), m.get("corte_rp"))
        item = {
            "id": m["id"], "nome": m["nome"], "mecanismo": m["mecanismo"],
            "fonte": m["fonte"], "fonte_url": m["fonte_url"],
            "eai_evitado_brl": round(base["eai"] - r["eai"], 2),
            "pct_evitado": round(100 * (base["eai"] - r["eai"]) / base["eai"], 1) if base["eai"] else 0.0,
            "eai_evitado_sem_cauda_brl": round(base["eai_sem_cauda"] - r["eai_sem_cauda"], 2),
            "pct_evitado_sem_cauda": round(100 * (base["eai_sem_cauda"] - r["eai_sem_cauda"]) / base["eai_sem_cauda"], 1) if base["eai_sem_cauda"] else 0.0,
            "eai_2050_evitado_brl": round(base["eai_2050"] - r["eai_2050"], 2) if base["eai_2050"] is not None else None,
            "evitado_por_setor_brl": {s: round(base["eai_por_setor"][s] - r["eai_por_setor"][s], 2) for s in SETORES},
        }
        if mun == "Porto Alegre":
            item["custo_beneficio"] = custo_beneficio(m, d, rps, perda_base, perdas(d, m))
        medidas.append(item)
        print(f"  {m['id']:16s} evita R$ {item['eai_evitado_brl']/1e6:7.2f} mi/ano ({item['pct_evitado']:5.1f}%) | sem cauda: {item['eai_evitado_sem_cauda_brl']/1e6:6.2f} ({item['pct_evitado_sem_cauda']:5.1f}%) | 2050: {item['eai_2050_evitado_brl']/1e6:7.2f}")
    medidas.sort(key=lambda x: -x["eai_evitado_sem_cauda_brl"])
    return {
        "base": {"eai_brl": round(base["eai"], 2), "eai_sem_cauda_brl": round(base["eai_sem_cauda"], 2), "eai_2050_brl": round(base["eai_2050"], 2), "rps": rps},
        "medidas": medidas,
        **({"custo_beneficio_premissas": {"cambio_brl_usd": CAMBIO_BRL_USD, "taxa_desconto": TAXA_DESCONTO, "horizonte": [ANO_INI, ANO_FIM], "fonte_custos": "Prefeitura de Porto Alegre, Defesa Civil RS e Aerts (2018); ver custo_fonte de cada medida"}} if mun == "Porto Alegre" else {}),
    }


def main():
    saida = {
        "Porto Alegre": avaliar("Porto Alegre", depths_porto_alegre()),
        "Lajeado": avaliar("Lajeado", rpc.profundidades_por_rp("Lajeado")),
    }
    out = DATA_PROCESSED / "climada_medidas.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=2)
    shutil.copyfile(out, DASH_DATA / out.name)
    print(f"\n  Salvo: {out}\n  Copiado: {DASH_DATA / out.name}")


if __name__ == "__main__":
    main()
