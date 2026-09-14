// ── Tema ────────────────────────────────────────────────────────────────────
export const C = {
  primary: "#055071",
  field: "#0a6a90",
  bg: "#ffffff",
  cardBg: "#f0f7fa",
  border: "#b3cdd8",
  muted: "#3d7a94",
  dark: "#033a52",
}

// Fundo translúcido único para o conteúdo de qualquer card/caixa dentro do
// Painel -- mesmo tom do glass do Painel (AnalysisPanel.tsx), para que todo
// card se funda visualmente com o painel em vez de destacar um bloco branco.
export const PANEL_CARD_BG = "rgba(255,255,255,0.55)"

export const COLORS = {
  empresas: "#2563eb",
  educacao: "#16a34a",
  saude: "#dc2626",
  cenario: "#1f77b4",
  infra: "#f59e0b",
}

export const DONUT_COLORS = [
  "#055071",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#059669",
  "#b45309",
]

// ── CNAE — nomes curtos para exibição nos gráficos ──────────────────────────
export const CNAE_LABELS: Record<string, string> = {
  "ADMINISTRACAO PUBLICA, DEFESA E SEGURIDADE SOCIAL": "Adm. Pública",
  "AGRICULTURA, PECUARIA, PRODUCAO FLORESTAL, PESCA E AQUICULTURA":
    "Agropecuária",
  "AGUA, ESGOTO, GESTAO DE RESIDUOS E DESCONTAMINACAO": "Saneamento",
  "ALOJAMENTO E ALIMENTACAO": "Alimentação",
  "ARTES, CULTURA, ESPORTE E RECREACAO": "Cultura/Esporte",
  "ATIVIDADES ADMINISTRATIVAS E SERVICOS COMPLEMENTARES":
    "Serv. Administrativos",
  "ATIVIDADES FINANCEIRAS E SEGUROS": "Finanças/Seguros",
  "ATIVIDADES IMOBILIARIAS": "Imobiliário",
  "ATIVIDADES PROFISSIONAIS, CIENTIFICAS E TECNICAS": "Prof./Científico",
  "COMERCIO; REPARACAO DE VEICULOS": "Comércio",
  CONSTRUCAO: "Construção",
  EDUCACAO: "Educação",
  "ELETRICIDADE E GAS": "Energia/Gás",
  "INDUSTRIAS DE TRANSFORMACAO": "Ind. Transformação",
  "INDUSTRIAS EXTRATIVAS": "Ind. Extrativa",
  "INFORMACAO E COMUNICACAO": "TI/Comunicação",
  "ORGANISMOS INTERNACIONAIS": "Org. Internacional",
  "OUTRAS ATIVIDADES DE SERVICOS": "Outros Serviços",
  "SAUDE HUMANA E SERVICOS SOCIAIS": "Saúde/Social",
  "SERVICOS DOMESTICOS": "Serv. Domésticos",
  "TRANSPORTE, ARMAZENAGEM E CORREIO": "Transporte/Logística",
}

// ── Infraestrutura ───────────────────────────────────────────────────────────
export const INFRA_COLORS: Record<string, string> = {
  Edificações: "#6b7280",
  Logradouros: "#e67e22",
  Quadras: "#8e44ad",
  Terrenos: "#27ae60",
  "Prédios Públicos": "#2980b9",
  Segurança: "#c0392b",
  Imóveis: "#16a085",
  Lotes: "#d35400",
  "Iluminação Pública": "#f39c12",
  "Eixos Logradouros": "#e67e22",
  Quarteirões: "#8e44ad",
  Terminais: "#2980b9",
  "Rede Esgoto": "#1abc9c",
  Paradas: "#9b59b6",
  Ônibus: "#e74c3c",
  Hidrantes: "#c0392b",
  Gás: "#7f8c8d",
  "Bocas de Lobo": "#16a085",
  Poste: "#f1c40f",
}

export const INFRA_TAMANHOS_MB: Record<string, number> = {
  Lotes: 123,
  "Rede Esgoto": 64,
  Poste: 28,
  "Bocas de Lobo": 21,
  "Eixos Logradouros": 18,
  Terrenos: 28,
  Imóveis: 23,
  Edificações: 65,
}

// Cada município nomeia o mesmo tipo de ativo de um jeito diferente (herdado
// da fonte de dados da prefeitura) -- usado so' na Visão Geral RS pra somar
// como uma única categoria em vez de listar 2-3 linhas parecidas lado a lado.
// A chave é o rótulo canônico exibido; a lista inclui a própria chave.
export const INFRA_GRUPOS_VISAO_GERAL: Record<string, string[]> = {
  "Logradouros": ["Logradouros", "Eixos Logradouros"],
  "Iluminação Pública": ["Iluminação Pública", "Poste"],
  "Quadras": ["Quadras", "Quarteirões"],
}

// ── Municípios / Cenários / Vistas ───────────────────────────────────────────
export const MUNICIPIOS = [
  "Eldorado do Sul",
  "Lajeado",
  "Porto Alegre",
  "Rio Grande",
]

export const CENARIOS_CONFIG: Record<string, string[]> = {
  "Eldorado do Sul": ["Cenário ADA"],
  Lajeado: ["Cenário 27m", "Cenário 30m"],
  // "Climada Evento 2024" primeiro -- vira o cenário padrão de Porto Alegre
  // (cenariosDisp[0] em useDashboard.ts, quando não há permalink específico).
  "Porto Alegre": ["Climada Evento 2024", "Cenário ADA"],
  "Rio Grande": ["Cenário Maio 2024", "Cenário Maio 2024 + 50%"],
}

export const INFRAESTRUTURA_CONFIG: Record<string, string[]> = {
  "Porto Alegre": [
    "Eixos Logradouros",
    "Lotes",
    "Quarteirões",
    "Terminais",
    "Rede Esgoto",
    "Paradas",
    "Ônibus",
    "Hidrantes",
    "Gás",
    "Bocas de Lobo",
    "Poste",
    "Edificações",
  ],
  "Rio Grande": [
    "Logradouros",
    "Quadras",
    "Terrenos",
    "Imóveis",
    "Prédios Públicos",
    "Segurança",
    "Edificações",
  ],
  Lajeado: [
    "Iluminação Pública",
    "Logradouros",
    "Lotes",
    "Quadras",
    "Edificações",
  ],
  "Eldorado do Sul": ["Edificações"],
}

export const MUNICIPIO_VIEW: Record<
  string,
  { center: [number, number]; zoom: number; pitch?: number; bearing?: number }
> = {
  "Visão Geral RS": { center: [-53.5, -29.8], zoom: 5.8 },
  "Eldorado do Sul": { center: [-51.31029, -30.00382], zoom: 14.14 },
  Lajeado: { center: [-51.96347, -29.46729], zoom: 13.92 },
  "Porto Alegre": { center: [-51.22750, -30.04205], zoom: 15.08, pitch: 72, bearing: -8.8 },
  "Rio Grande": { center: [-52.09086, -32.04344], zoom: 14.36 },
}

// ── Agricultura ──────────────────────────────────────────────────────────────
export const AGRI_COLORS: Record<string, string> = {
  Soja: "#D4A017",
  Arroz: "#4FC3F7",
  "Outras Lavouras Temporárias": "#AED581",
}

// Ano do MapBiomas usado como "atual" para a camada BASE de agricultura (sem cenario ativo)
export const AGRI_ANO_BASE = 2024

export const AGRI_BOUNDS: Record<
  string,
  [[number, number], [number, number], [number, number], [number, number]]
> = {
  Lajeado: [
    [-52.133728, -29.3962],
    [-51.913281, -29.3962],
    [-51.913281, -29.501303],
    [-52.133728, -29.501303],
  ],
  "Eldorado do Sul": [
    [-51.707387, -29.944082],
    [-51.256253, -29.944082],
    [-51.256253, -30.218697],
    [-51.707387, -30.218697],
  ],
  "Porto Alegre": [
    [-51.310422, -29.927643],
    [-51.006162, -29.927643],
    [-51.006162, -30.273944],
    [-51.310422, -30.273944],
  ],
  "Rio Grande": [
    [-52.69778, -31.76883],
    [-52.058269, -31.76883],
    [-52.058269, -32.648461],
    [-52.69778, -32.648461],
  ],
}

export const CENARIO_PERIODO: Record<string, string> = {
  lajeado___cenario_27m: "maio_2024",
  lajeado___cenario_30m: "maio_2024",
  eldorado_do_sul___cenario_ada: "maio_2024",
  porto_alegre___cenario_ada: "maio_2024",
  porto_alegre___climada_evento_2024: "maio_2024",
  rio_grande___cenario_maio_2024: "maio_2024",
  rio_grande___cenario_maio_2024_50: "maio_2024",
  rio_grande___cenario_setembro_2023: "setembro_2023",
}

export interface ImpactoCoef {
  coef: number
  status: string
  nota: string
}

// Coeficientes R$/ha por cultura × período — Fontes: CONAB Preços Mínimos 2024, EMATER-RS
export const IMPACTO_AGRICOLA: Record<string, Record<string, ImpactoCoef>> = {
  maio_2024: {
    Soja: {
      coef: 1100,
      status: "Colhida (fev–abr/2024)",
      nota: "Compactação do solo e insumos para próxima safra",
    },
    Arroz: {
      coef: 1100,
      status: "Colhido (fev–abr/2024)",
      nota: "Compactação do solo e infraestrutura de irrigação",
    },
    "Outras Lavouras Temporárias": {
      coef: 1400,
      status: "Plantio inicial (mai–jun/2024)",
      nota: "Trigo/aveia: perda de sementes e insumos de plantio",
    },
  },
  setembro_2023: {
    Soja: {
      coef: 250,
      status: "Pré-plantio (set/2023)",
      nota: "Solo em preparo; impacto mínimo direto",
    },
    Arroz: {
      coef: 250,
      status: "Pré-plantio (set/2023)",
      nota: "Solo em preparo; impacto mínimo direto",
    },
    "Outras Lavouras Temporárias": {
      coef: 2800,
      status: "Colheita (set–out/2023)",
      nota: "Trigo/aveia na colheita: perda quase total da safra de inverno",
    },
  },
}

// ── Saúde ────────────────────────────────────────────────────────────────────
export const STAFF_COLS = [
  "staff_acs_endemias",
  "staff_admin_gestao_apoio",
  "staff_diag_lab_imagem",
  "staff_enfermagem",
  "staff_farmacia",
  "staff_medicos",
  "staff_odontologia",
  "staff_outros",
  "staff_outros_superior_saude",
  "staff_servicos_gerais",
  "staff_transporte_urgencia",
]

export const DEP_LABELS: Record<string, string> = {
  "1": "Federal",
  "2": "Estadual",
  "3": "Municipal",
  "4": "Privada",
}
export const normalizeDep = (val: string) => DEP_LABELS[val] || val

export const STAFF_LABELS: Record<string, string> = {
  staff_acs_endemias: "ACS/Endemias",
  staff_admin_gestao_apoio: "Admin/Gestão",
  staff_diag_lab_imagem: "Diag/Imagem",
  staff_enfermagem: "Enfermagem",
  staff_farmacia: "Farmácia",
  staff_medicos: "Médicos",
  staff_odontologia: "Odontologia",
  staff_outros: "Outros",
  staff_outros_superior_saude: "Outros (Sup.)",
  staff_servicos_gerais: "Serviços Gerais",
  staff_transporte_urgencia: "Transporte",
}

// Rótulo de EXIBIÇÃO de um cenário, quando difere da chave interna usada para
// estado/slug de arquivo (scenarioSlug -- ver lib/geo-utils.ts) e para casar
// com os dados já publicados (CENARIOS_CONFIG, PIORES_CENARIOS,
// CENARIO_PERIODO, danos_operacionais.json etc. continuam usando a chave
// interna sem alteração). Use cenarioLabel(cen) em todo texto visível ao
// usuário; nunca troque a chave interna só para "renomear" um cenário --
// quebraria o casamento com os arquivos *_ATINGIDOS_<slug>.geojson já
// publicados pelo pipeline.
export const CENARIO_DISPLAY_LABEL: Record<string, string> = {
  "Climada Evento 2024": "Climada - UNU/EHS",
}
export const cenarioLabel = (cen: string): string => CENARIO_DISPLAY_LABEL[cen] ?? cen

export const PIORES_CENARIOS: Record<string, string> = {
  "Eldorado do Sul": "Cenário ADA",
  Lajeado: "Cenário 27m",
  "Porto Alegre": "Climada Evento 2024",
  "Rio Grande": "Cenário Maio 2024",
}

// Área Atingida na Visão Geral RS usa a mancha estadual única (ADA
// Estadual, evento de maio/2024 para todo o RS) em vez de somar o pior
// cenário de cada município (que podem ser eventos diferentes entre si) --
// ver pipeline/11_area_atingida.py, que grava essa mesma entrada dentro de
// cada município (para o detalhamento bater com o agregado) e também como
// entrada própria "Visão Geral RS" em area_atingida.json.
export const AREA_VISAO_GERAL_LABEL = "Visão Geral RS"
export const AREA_VISAO_GERAL_CENARIO = "ADA Estadual"

// ── Dano Físico (CLIMADA, protótipo) — camada de mapa ───────────────────────
// Só existe para Porto Alegre: é o único município com raster de profundidade
// (ver pipeline/climada_risco_prototipo.py) -- os outros 3 só têm polígono de
// extensão da mancha (atingido sim/não), sem lâmina d'água por ponto.
export const DANO_FISICO_MUNICIPIO = "Porto Alegre"
export const DANO_FISICO_RPS = ["RP10", "RP20", "RP50", "RP75", "RP100", "RP200", "RP500"] as const
export const DANO_FISICO_SETORES = ["empresas", "educacao", "saude"] as const

// Rampa de cor por "% do valor de reposição destruído" (0-100), usada no
// circle-color (interpolate) da camada -- do cinza (sem dano) ao vermelho
// escuro (destruição quase total), mesma leitura de calor das demais camadas.
export const DANO_FISICO_COLOR_STOPS: (string | number)[] = [
  0, "#cbd5e1",
  5, "#93c5fd",
  20, "#fbbf24",
  50, "#f97316",
  80, "#dc2626",
  100, "#7f1d1d",
]

// ── Mancha por Duração (CLIMADA, evento real maio/2024) ─────────────────────
// Só existe para o cenário "Climada Evento 2024" em Porto Alegre -- é o único
// dado por pixel disponível para esse evento observado (o CLIMADA só tem
// profundidade para os cenários sintéticos RP10..RP500, usados na camada Dano
// Físico acima; ver pipeline/gerar_mancha_duracao_climada.py). Paleta azul
// (Blues), deliberadamente distinta das demais (plasma da população,
// vermelho/laranja dos heatmaps e do Dano Físico).
export const MANCHA_DURACAO_CENARIO = "Climada Evento 2024"
export const MANCHA_DURACAO_GRADIENT_CSS =
  "linear-gradient(to right, #f7fbff, #c6dbef, #6baed6, #2171b5, #08306b)"
