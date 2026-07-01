// ── Tema ────────────────────────────────────────────────────────────────────
export const C = {
  primary: "#055071",
  field:   "#0a6a90",
  bg:      "#ffffff",
  cardBg:  "#f0f7fa",
  border:  "#b3cdd8",
  muted:   "#3d7a94",
  dark:    "#033a52",
};

export const COLORS = {
  empresas: "#2563eb",
  educacao: "#16a34a",
  saude: "#dc2626",
  cenario: "#1f77b4",
  infra: "#f59e0b",
};

export const DONUT_COLORS = [
  "#055071","#2563eb","#16a34a","#dc2626",
  "#d97706","#7c3aed","#0891b2","#be185d","#059669","#b45309",
];

// ── CNAE — nomes curtos para exibição nos gráficos ──────────────────────────
export const CNAE_LABELS: Record<string, string> = {
  "ADMINISTRACAO PUBLICA, DEFESA E SEGURIDADE SOCIAL":                       "Adm. Pública",
  "AGRICULTURA, PECUARIA, PRODUCAO FLORESTAL, PESCA E AQUICULTURA":          "Agropecuária",
  "AGUA, ESGOTO, GESTAO DE RESIDUOS E DESCONTAMINACAO":                      "Saneamento",
  "ALOJAMENTO E ALIMENTACAO":                                                 "Alimentação",
  "ARTES, CULTURA, ESPORTE E RECREACAO":                                     "Cultura/Esporte",
  "ATIVIDADES ADMINISTRATIVAS E SERVICOS COMPLEMENTARES":                    "Serv. Administrativos",
  "ATIVIDADES FINANCEIRAS E SEGUROS":                                        "Finanças/Seguros",
  "ATIVIDADES IMOBILIARIAS":                                                  "Imobiliário",
  "ATIVIDADES PROFISSIONAIS, CIENTIFICAS E TECNICAS":                        "Prof./Científico",
  "COMERCIO; REPARACAO DE VEICULOS":                                         "Comércio",
  "CONSTRUCAO":                                                               "Construção",
  "EDUCACAO":                                                                 "Educação",
  "ELETRICIDADE E GAS":                                                       "Energia/Gás",
  "INDUSTRIAS DE TRANSFORMACAO":                                              "Ind. Transformação",
  "INDUSTRIAS EXTRATIVAS":                                                    "Ind. Extrativa",
  "INFORMACAO E COMUNICACAO":                                                 "TI/Comunicação",
  "ORGANISMOS INTERNACIONAIS":                                                "Org. Internacional",
  "OUTRAS ATIVIDADES DE SERVICOS":                                            "Outros Serviços",
  "SAUDE HUMANA E SERVICOS SOCIAIS":                                         "Saúde/Social",
  "SERVICOS DOMESTICOS":                                                      "Serv. Domésticos",
  "TRANSPORTE, ARMAZENAGEM E CORREIO":                                       "Transporte/Logística",
};

// ── Infraestrutura ───────────────────────────────────────────────────────────
export const INFRA_COLORS: Record<string, string> = {
  "Edificações":        "#6b7280",
  "Logradouros":        "#e67e22",
  "Quadras":            "#8e44ad",
  "Terrenos":           "#27ae60",
  "Prédios Públicos":   "#2980b9",
  "Segurança":          "#c0392b",
  "Imóveis":            "#16a085",
  "Lotes":              "#d35400",
  "Iluminação Pública": "#f39c12",
  "Eixos Logradouros":  "#e67e22",
  "Quarteirões":        "#8e44ad",
  "Terminais":          "#2980b9",
  "Rede Esgoto":        "#1abc9c",
  "Paradas":            "#9b59b6",
  "Ônibus":             "#e74c3c",
  "Hidrantes":          "#c0392b",
  "Gás":                "#7f8c8d",
  "Bocas de Lobo":      "#16a085",
  "Poste":              "#f1c40f",
};

export const INFRA_TAMANHOS_MB: Record<string, number> = {
  "Lotes": 123, "Rede Esgoto": 64, "Poste": 28, "Bocas de Lobo": 21, "Eixos Logradouros": 18,
  "Terrenos": 28, "Imóveis": 23,
  "Edificações": 65,
};

// ── Municípios / Cenários / Vistas ───────────────────────────────────────────
export const MUNICIPIOS = ["Eldorado do Sul", "Lajeado", "Porto Alegre", "Rio Grande"];

export const CENARIOS_CONFIG: Record<string, string[]> = {
  "Eldorado do Sul": ["Cenário ADA"],
  "Lajeado": ["Cenário 27m", "Cenário 30m"],
  "Porto Alegre": ["Cenário ADA"],
  "Rio Grande": ["Cenário Maio 2024", "Cenário Maio 2024 + 50%"],
};

export const INFRAESTRUTURA_CONFIG: Record<string, string[]> = {
  "Porto Alegre": [
    "Eixos Logradouros", "Lotes", "Quarteirões",
    "Terminais", "Rede Esgoto", "Paradas", "Ônibus", "Hidrantes", "Gás",
    "Bocas de Lobo", "Poste", "Edificações",
  ],
  "Rio Grande": [
    "Logradouros", "Quadras", "Terrenos", "Imóveis",
    "Prédios Públicos", "Segurança", "Edificações",
  ],
  "Lajeado": [
    "Iluminação Pública", "Logradouros", "Lotes", "Quadras", "Edificações",
  ],
  "Eldorado do Sul": [
    "Edificações",
  ],
};

export const MUNICIPIO_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  "Visão Geral RS": { center: [-53.80, -30.45], zoom: 5.5 },
  "Eldorado do Sul": { center: [-51.40, -30.01], zoom: 11.2 },
  "Lajeado": { center: [-52.02, -29.45], zoom: 11.8 },
  "Porto Alegre": { center: [-51.20, -30.08], zoom: 10 },
  "Rio Grande": { center: [-52.16, -32.06], zoom: 12 },
};

// ── Agricultura ──────────────────────────────────────────────────────────────
export const AGRI_COLORS: Record<string, string> = {
  "Soja":                        "#D4A017",
  "Arroz":                       "#4FC3F7",
  "Outras Lavouras Temporárias": "#AED581",
};

// Ano do MapBiomas usado como "atual" para a camada BASE de agricultura (sem cenario ativo)
export const AGRI_ANO_BASE = 2024;

export const AGRI_BOUNDS: Record<string, [[number,number],[number,number],[number,number],[number,number]]> = {
  "Lajeado":         [[-52.133728,-29.396200],[-51.913281,-29.396200],[-51.913281,-29.501303],[-52.133728,-29.501303]],
  "Eldorado do Sul": [[-51.707387,-29.944082],[-51.256253,-29.944082],[-51.256253,-30.218697],[-51.707387,-30.218697]],
  "Porto Alegre":    [[-51.310422,-29.927643],[-51.006162,-29.927643],[-51.006162,-30.273944],[-51.310422,-30.273944]],
  "Rio Grande":      [[-52.697780,-31.768830],[-52.058269,-31.768830],[-52.058269,-32.648461],[-52.697780,-32.648461]],
};

export const CENARIO_PERIODO: Record<string, string> = {
  "lajeado___cenario_27m":              "maio_2024",
  "lajeado___cenario_30m":              "maio_2024",
  "eldorado_do_sul___cenario_ada":      "maio_2024",
  "porto_alegre___cenario_ada":         "maio_2024",
  "rio_grande___cenario_maio_2024":     "maio_2024",
  "rio_grande___cenario_maio_2024_50":  "maio_2024",
  "rio_grande___cenario_setembro_2023": "setembro_2023",
};

export interface ImpactoCoef { coef: number; status: string; nota: string }

// Coeficientes R$/ha por cultura × período — Fontes: CONAB Preços Mínimos 2024, EMATER-RS
export const IMPACTO_AGRICOLA: Record<string, Record<string, ImpactoCoef>> = {
  "maio_2024": {
    "Soja":                        { coef: 1100, status: "Colhida (fev–abr/2024)", nota: "Compactação do solo e insumos para próxima safra" },
    "Arroz":                       { coef: 1100, status: "Colhido (fev–abr/2024)", nota: "Compactação do solo e infraestrutura de irrigação" },
    "Outras Lavouras Temporárias": { coef: 1400, status: "Plantio inicial (mai–jun/2024)", nota: "Trigo/aveia: perda de sementes e insumos de plantio" },
  },
  "setembro_2023": {
    "Soja":                        { coef: 250,  status: "Pré-plantio (set/2023)",  nota: "Solo em preparo; impacto mínimo direto" },
    "Arroz":                       { coef: 250,  status: "Pré-plantio (set/2023)",  nota: "Solo em preparo; impacto mínimo direto" },
    "Outras Lavouras Temporárias": { coef: 2800, status: "Colheita (set–out/2023)", nota: "Trigo/aveia na colheita: perda quase total da safra de inverno" },
  },
};

// ── Saúde ────────────────────────────────────────────────────────────────────
export const STAFF_COLS = [
  "staff_acs_endemias", "staff_admin_gestao_apoio", "staff_diag_lab_imagem",
  "staff_enfermagem", "staff_farmacia", "staff_medicos", "staff_odontologia",
  "staff_outros", "staff_outros_superior_saude", "staff_servicos_gerais",
  "staff_transporte_urgencia",
];

export const DEP_LABELS: Record<string, string> = {
  "1": "Federal", "2": "Estadual", "3": "Municipal", "4": "Privada",
};
export const normalizeDep = (val: string) => DEP_LABELS[val] || val;

export const STAFF_LABELS: Record<string, string> = {
  "staff_acs_endemias": "ACS/Endemias", "staff_admin_gestao_apoio": "Admin/Gestão",
  "staff_diag_lab_imagem": "Diag/Imagem", "staff_enfermagem": "Enfermagem",
  "staff_farmacia": "Farmácia", "staff_medicos": "Médicos", "staff_odontologia": "Odontologia",
  "staff_outros": "Outros", "staff_outros_superior_saude": "Outros (Sup.)",
  "staff_servicos_gerais": "Serviços Gerais", "staff_transporte_urgencia": "Transporte",
};

export const PIORES_CENARIOS: Record<string, string> = {
  "Eldorado do Sul": "Cenário ADA",
  "Lajeado":         "Cenário 27m",
  "Porto Alegre":    "Cenário ADA",
  "Rio Grande":      "Cenário Maio 2024",
};
