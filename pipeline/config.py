"""
Configuracao centralizada do pipeline BID.

Todos os caminhos, codigos IBGE, cenarios e constantes em um unico lugar.
"""

from pathlib import Path

# --- Diretorios raiz ---
BASE = Path("D:/Projetos/BID")
DATA_RAW = BASE / "data" / "raw"
DATA_INTERIM = BASE / "data" / "interim"
DATA_PROCESSED = BASE / "data" / "processed"
DASH_DATA = BASE / "Dashboard BID" / "public" / "dados_convertidos"

# --- Fontes externas ---
RAIS_PARQUET = Path("D:/RAIS/data/rais_db/vinculos/ano=2023/uf=43/RAIS_VINC_ID_SUL.parquet")
CENSO_ESCOLAR_DIR = Path("D:/Censo Escolar 2024 - Microdados")
CENSO_ESCOLAR_CSV = CENSO_ESCOLAR_DIR / "dados" / "microdados_ed_basica_2024.csv"

CNES_ZIP = Path(r"D:\CNES 042024.ZIP")
DATA_RAW_DATASUS = DATA_RAW / "datasus"
SIA_SIH_ANO = 2024
SIA_MESES = [1, 2, 3, 4, 5, 6, 7]
SIH_MESES = [1, 2, 3, 4, 5, 6, 7]

NOMINATIM_URL = "http://localhost:8080"

MAPBIOMAS_TIFF_BASE = "https://storage.googleapis.com/mapbiomas-public/initiatives/brasil/collection_10/lulc/coverage/brazil_coverage_{year}.tif"
MAPBIOMAS_ANOS = [2023, 2024]
DATA_RAW_MAPBIOMAS = DATA_RAW / "mapbiomas"

MAPBIOMAS_CLASSES = {
    39: "Soja",
    20: "Arroz",
    40: "Arroz",
    41: "Outras Lavouras Temporárias",
    46: "Outras Lavouras Temporárias",
    62: "Outras Lavouras Temporárias",
}

# Colunas RAIS que usamos
RAIS_VINC_COLS = [
    "municipio", "vinculo_ativo_3112", "vl_remun_media_nom",
    "cnpj_cei", "cnae20_classe", "cbo_2002",
]

RAIS_ESTAB_PARQUET = Path("D:/RAIS/data/rais_db/estabelecimentos/ano=2023/uf=43/Estb2023ID.parquet")
RAIS_ESTAB_COLS = [
    "cnpj_cei", "municipio", "cep_estab",
    "nome_logradouro", "numero_logradouro", "nome_bairro", "cnae20_classe",
]

DATA_BASES = DATA_PROCESSED / "bases"

# --- Censo Escolar ---
PROF_CATEGORIES = [
    "ADMINISTRATIVOS", "SERVICOS_GERAIS", "BIBLIOTECARIO", "SAUDE",
    "COORDENADOR", "FONAUDIOLOGO", "NUTRICIONISTA", "PSICOLOGO",
    "ALIMENTACAO", "PEDAGOGIA", "SECRETARIO", "SEGURANCA",
    "MONITORES", "GESTAO", "ASSIST_SOCIAL", "TRAD_LIBRAS",
    "AGRICOLA", "REVISOR_BRAILLE",
]

CENSO_COLS = [
    "CO_ENTIDADE", "NO_ENTIDADE", "CO_MUNICIPIO", "NO_MUNICIPIO",
    "TP_DEPENDENCIA", "TP_SITUACAO_FUNCIONAMENTO",
    "DS_ENDERECO", "NU_ENDERECO", "DS_COMPLEMENTO", "NO_BAIRRO", "CO_CEP",
    "QT_MAT_INF_CRE", "QT_MAT_INF_PRE",
    "QT_MAT_FUND_AI", "QT_MAT_FUND_AF",
    "QT_MAT_MED", "QT_MAT_PROF",
    "QT_MAT_EJA_FUND", "QT_MAT_EJA_MED",
    "QT_MAT_ESP",
    "QT_DOC_BAS",
] + [f"QT_PROF_{cat}" for cat in PROF_CATEGORIES]

# --- Municipios ---
MUNICIPIOS = {
    "Eldorado do Sul": {
        "ibge7": 4306767,
        "ibge6": "430676",
        "slug": "eldorado_do_sul",
        "cenarios": ["Cenario ADA"],
    },
    "Lajeado": {
        "ibge7": 4311403,
        "ibge6": "431140",
        "slug": "lajeado",
        "cenarios": ["Cenario 27m", "Cenario 30m"],
    },
    "Porto Alegre": {
        "ibge7": 4314902,
        "ibge6": "431490",
        "slug": "porto_alegre",
        "cenarios": ["Cenario ADA"],
    },
    "Rio Grande": {
        "ibge7": 4315602,
        "ibge6": "431560",
        "slug": "rio_grande",
        "cenarios": [
            "Cenario Maio 2024",
            "Cenario Maio 2024 + 50%",
            "Cenario Setembro 2023",
        ],
    },
}

# --- Lookup de coordenadas (arquivos georreferenciados) ---
GEORREF_FILES = {
    nome: DATA_RAW / "geocodificacao" / f"{cfg['slug']}.xlsx"
    for nome, cfg in MUNICIPIOS.items()
}

# --- Escolas geocodificadas ---
ESCOLA_GEORREF_FILES = {
    nome: DATA_RAW / "escolas" / f"{cfg['slug']}.csv"
    for nome, cfg in MUNICIPIOS.items()
}

# --- Saude geocodificados ---
SAUDE_GEORREF_FILES = {
    nome: DATA_RAW / "saude" / f"{cfg['slug']}.csv"
    for nome, cfg in MUNICIPIOS.items()
}

# --- CNES ---
CNES_ESTAB_CSV = DATA_RAW / "cnes" / "tbEstabelecimento202404.csv"

CNES_PROF_FILES = {
    nome: DATA_RAW / "profissionais" / f"{cfg['slug']}.csv"
    for nome, cfg in MUNICIPIOS.items()
}

# --- Manchas de inundacao ---
MANCHAS = {
    "Eldorado do Sul": {
        "Cenario ADA": DATA_RAW / "manchas" / "eldorado_do_sul" / "ADA Eldorado.shp",
    },
    "Lajeado": {
        "Cenario 27m": DATA_RAW / "manchas" / "lajeado" / "27m00cm.shp",
        "Cenario 30m": DATA_RAW / "manchas" / "lajeado" / "30m00cm.shp",
    },
    "Porto Alegre": {
        "Cenario ADA": DATA_RAW / "manchas" / "porto_alegre" / "enchente_poa_intersects.shp",
    },
    "Rio Grande": {
        "Cenario Maio 2024": DATA_RAW / "manchas" / "rio_grande" / "CEN_MAI2024.shp",
        "Cenario Maio 2024 + 50%": DATA_RAW / "manchas" / "rio_grande" / "CEN_MAI24_MAIS60CM.shp",
        "Cenario Setembro 2023": DATA_RAW / "manchas" / "rio_grande" / "CEN_SET2023.shp",
    },
}

# Tabela de-para CO_TIPO_ESTABELECIMENTO (0-25)
TIPO_ESTAB_DEPARA = {
    0: "Outros", 1: "Unidade Básica de Saúde", 2: "Central de Gestao em Saude",
    3: "Central de Regulacao", 4: "Central de Abastecimento", 5: "Central de Transplante",
    6: "Hospital", 7: "Centro de Assistencia Obstetrica e Neonatal Normal",
    8: "Pronto Atendimento", 9: "Farmacia",
    10: "Unidade de Atencao Hematologica", 11: "Nucleo de Telessaude",
    12: "Unidade de Atencao Domiciliar",
    13: "Polo de Prevencao de Doencas e Agravos e Promocao da Saude",
    14: "Casas de Apoio a Saude", 15: "Unidade de Reabilitacao",
    16: "Ambulatório", 17: "Unidade de Atencao Psicossocial",
    18: "Unidade de Apoio Diagnostico", 19: "Unidade de Terapias Especiais",
    20: "Laboratorio de Protese Dentaria", 21: "Unidade de Vigilancia de Zoonoses",
    22: "Laboratorio de Saude Publica",
    23: "Centro de Referencia em Saude do Trabalhador",
    24: "Servico de Verificacao de Obito", 25: "Centro de Imunizacao",
}

CNES_COLUNAS_REMOVER = [
    "CO_REGIAO_SAUDE", "CO_MICRO_REGIAO", "CO_DISTRITO_SANITARIO",
    "CO_DISTRITO_ADMINISTRATIVO", "NU_TELEFONE", "NU_FAX", "NO_EMAIL",
    "NU_CPF", "NU_CNPJ", "NU_ALVARA", "DT_EXPEDICAO", "TP_ORGAO_EXPEDIDOR",
    "DT_VAL_LIC_SANI", "TP_LIC_SANI", "CO_TURNO_ATENDIMENTO",
    "CO_ESTADO_GESTOR",
    "TO_CHAR(DT_ATUALIZACAO,'DD/MM/YYYY')", "CO_USUARIO", "CO_CPFDIRETORCLN",
    "REG_DIRETORCLN", "ST_ADESAO_FILANTROP", "CO_MOTIVO_DESAB", "NO_URL",
    "TO_CHAR(DT_ATU_GEO,'DD/MM/YYYY')",
    "NO_USUARIO_GEO", "TP_ESTAB_SEMPRE_ABERTO",
    "ST_GERACREDITO_GERENTE_SGIF", "ST_CONEXAO_INTERNET",
    "NO_FANTASIA_ABREV", "TP_GESTAO",
    "TO_CHAR(DT_ATUALIZACAO_ORIGEM,'DD/MM/YYYY')",
    "ST_CONTRATO_FORMALIZADO", "CO_TIPO_ABRANGENCIA",
]

# Buckets de staff (classificacao CBO)
STAFF_BUCKETS = [
    "staff_acs_endemias", "staff_admin_gestao_apoio", "staff_diag_lab_imagem",
    "staff_enfermagem", "staff_farmacia", "staff_medicos", "staff_odontologia",
    "staff_outros", "staff_outros_superior_saude", "staff_servicos_gerais",
    "staff_transporte_urgencia",
]

# --- Salarios RAIS 2023 RS ---
SALARIOS = {
    "professores": 5968,
    "staff_medicos": 16652,
    "staff_odontologia": 8951,
    "staff_farmacia": 5605,
    "staff_outros_superior_saude": 4714,
    "staff_enfermagem": 4802,
    "staff_diag_lab_imagem": 4373,
    "staff_transporte_urgencia": 3137,
    "staff_acs_endemias": 3030,
    "staff_admin_gestao_apoio": 2840,
    "staff_servicos_gerais": 1978,
    "staff_outros": 4470,
}

# --- Agricultura ---
# Parametros de interrupcao DaLA por periodo do cenario.
# Curva de recuperacao linear: f_efetivo = dias_agudo + dias_recuperacao * 0.5
# Fonte: CEPAL/BID — "Avaliacao dos efeitos e impactos das inundacoes no RS", nov/2024.
# Logica: durante fase aguda (area alagada) interrupcao = 100%;
#         durante recuperacao gradual (escoamento + retomada) interrupcao media = 50%.
#   Maio 2024  : area alagada ~30 dias; recuperacao operacional ~60 dias -> f = 60/365
#   Setembro 2023: evento menor, area alagada ~15 dias; recuperacao ~30 dias -> f = 30/365
INTERRUPCAO_DALA = {
    "maio_2024":     {"dias_agudo": 30, "dias_recuperacao": 60},
    "setembro_2023": {"dias_agudo": 15, "dias_recuperacao": 30},
}

CENARIO_PERIODO = {
    "lajeado___cenario_27m": "maio_2024",
    "lajeado___cenario_30m": "maio_2024",
    "eldorado_do_sul___cenario_ada": "maio_2024",
    "porto_alegre___cenario_ada": "maio_2024",
    "rio_grande___cenario_maio_2024": "maio_2024",
    "rio_grande___cenario_maio_2024_50": "maio_2024",
    "rio_grande___cenario_setembro_2023": "setembro_2023",
}

# Periodo (CENARIO_PERIODO) -> ano do raster MapBiomas correspondente,
# usado para escolher qual snapshot de uso do solo intersectar com cada mancha.
PERIODO_ANO = {
    "maio_2024": 2024,
    "setembro_2023": 2023,
}

IMPACTO_AGRICOLA = {
    "maio_2024": {
        "Soja": {"coef": 1100, "status": "Colhida (fev-abr/2024)"},
        "Arroz": {"coef": 1100, "status": "Colhido (fev-abr/2024)"},
        "Outras Lavouras Temporárias": {"coef": 1400, "status": "Plantio inicial (mai-jun/2024)"},
    },
    "setembro_2023": {
        "Soja": {"coef": 250, "status": "Pre-plantio (set/2023)"},
        "Arroz": {"coef": 250, "status": "Pre-plantio (set/2023)"},
        "Outras Lavouras Temporárias": {"coef": 2800, "status": "Colheita (set-out/2023)"},
    },
}

# Labor share setorial (LS = Remuneracoes / VAB).
# Fonte: IBGE, Tabela 17 — Conta de Geracao da Renda por Atividade (SCN 2021).
# URL: ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/tab17.xls
#
# Calculo por categoria (mapeamento via cnae_to_setor):
#   agro      = setor 01 empresas nao financeiras: Rem 55.047 / VAB 312.235
#               (coluna empresas exclui rendimento misto agricultores familiares,
#                que distorceria para baixo o LS do setor formal coberto pelo RAIS)
#   industria = setores 02+03+04 (extrativas+transformacao+eletric/gas/agua):
#               Rem 580.273 / VAB 1.718.688
#   servicos  = setores 05+06+07+08+09+10+11 (construcao+comercio+transporte+
#               info+financeiras+imobiliarias+outras — CNAE 41-43,45-83,85-96):
#               Rem 1.811.470 / VAB 4.185.270
#               Obs: Imobiliarias (LS=1,4%) inclui alugueis imputados sem vinculos;
#               sem imobiliarias LS seria 51,7%; valor total utilizado por consistencia.
#   adm_pub   = setor 12: Rem 1.076.913 / VAB 1.218.956
#   total     = total economia: Rem 3.534.648 / VAB 7.713.999
LABOR_SHARE = {
    "agro":      0.176,
    "industria": 0.338,
    "servicos":  0.433,
    "adm_pub":   0.883,
    "total":     0.458,
}

# FUNDEB VAAT-MIN 2024 (Portaria Interministerial MEC/MF nº 9, de 28/08/2024, DOU 30/08/2024)
# Revisao quadrimestral de agosto: R$ 8.481,21 (VAAT-MIN) e R$ 5.559,73 (VAAF-MIN)
# Fonte: fnde.gov.br/acesso-a-informacao/financiamento/fundeb/legislacao/2024
FUNDEB_VAAT_MIN = 8481.21
DIAS_LETIVOS = 200

# Bounding box RS
LAT_MIN, LAT_MAX = -34.0, -27.0
LON_MIN, LON_MAX = -58.0, -49.0
