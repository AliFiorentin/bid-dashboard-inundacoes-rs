import type { CenarioDanos, EaiAnualEsperado } from "./types";

// ─── Constantes visuais — Danos Operacionais ───────────────────────────────────
export const MUN_COLORS: Record<string, string> = {
  "Eldorado do Sul": "#055071",
  "Lajeado":         "#2da8cc",
  "Porto Alegre":    "#e35d4b",
  "Rio Grande":      "#4d9e3a",
};
export const COMP_COLORS = {
  empresas:    "#055071",
  educacao:    "#2da8cc",
  saude:       "#e35d4b",
  agricultura: "#4d9e3a",
};
export const DIAS_OPCOES = [30, 45, 60] as const;
export type DiasOpcao = (typeof DIAS_OPCOES)[number];

// ─── Constantes visuais — CLIMADA ───────────────────────────────────────────────
export const SETOR_LABEL: Record<string, string> = { empresas: "Empresas", educacao: "Educação", saude: "Saúde" };
export const SETOR_COLORS: Record<string, string> = { empresas: "#055071", educacao: "#2da8cc", saude: "#e35d4b" };
export const RP_ORDER = ["RP10", "RP20", "RP50", "RP75", "RP100", "RP200", "RP500"];
export const RP_ANOS: Record<string, string> = {
  RP10: "10 anos", RP20: "20 anos", RP50: "50 anos", RP75: "75 anos",
  RP100: "100 anos", RP200: "200 anos", RP500: "500 anos",
};
export const RP_PROBABILIDADE: Record<string, string> = {
  RP10: "10%", RP20: "5%", RP50: "2%", RP75: "1,3%",
  RP100: "1%", RP200: "0,5%", RP500: "0,2%",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
export function fmtBRL(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2).replace(".", ",")} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function scaleTo(v: CenarioDanos, dias: number): CenarioDanos {
  const s = dias / v.dias_efetivos;
  const emp = v.empresas_vab * s;
  const edu = v.educacao_perdas * s;
  const eduAdic = v.educacao_custo_adicional * s;
  const sau = v.saude_producao * s;
  const agr = v.agricultura_perdas; // custo fixo, independe da duração
  return {
    dias_agudo: v.dias_agudo,
    dias_efetivos: dias,
    f_interrup: dias / 365,
    empresas_vab: emp,
    educacao_perdas: edu,
    educacao_custo_adicional: eduAdic,
    saude_producao: sau,
    agricultura_perdas: agr,
    total: emp + edu + eduAdic + sau + agr,
  };
}

export function eaiValor(eai: EaiAnualEsperado, setor: string): number {
  if (setor === "empresas") return eai.empresas;
  if (setor === "educacao") return eai.educacao;
  if (setor === "saude") return eai.saude;
  return 0;
}

export const FAIXA_LABEL: [string, string][] = [
  ["ate_0_5m", "≤ 0,5 m"], ["0_5_a_1m", "0,5–1 m"], ["1_a_2m", "1–2 m"], ["2_a_3m", "2–3 m"], ["acima_3m", "> 3 m"],
];

// ─── Indicadores do painel, por categoria e por cota ───────────────────────────
export const fmtN = (v: number) => Math.round(v).toLocaleString("pt-BR");
export const fmtRS = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
export const fmtHa = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha`;
export const fmtPct = (parte: number, total: number) => `${((parte / (total || 1)) * 100).toFixed(1).replace(".", ",")}%`;
export const STAFF_LABEL: Record<string, string> = {
  staff_medicos: "Médicos", staff_enfermagem: "Enfermagem", staff_odontologia: "Odontologia", staff_farmacia: "Farmácia",
  staff_diag_lab_imagem: "Diag./Imagem", staff_acs_endemias: "ACS/Endemias", staff_admin_gestao_apoio: "Admin/Gestão",
  staff_servicos_gerais: "Serv. gerais", staff_transporte_urgencia: "Transp./Urgência",
  staff_outros_superior_saude: "Outros (sup. saúde)", staff_outros: "Outros",
};
export const ETAPA_LABEL: Record<string, string> = { infantil: "Infantil", fundamental: "Fundamental", medio: "Médio", profissional: "Profissional", eja: "EJA", especial: "Especial" };

export const MAPA_SLUG: Record<string, string> = { "Lajeado": "lajeado", "Eldorado do Sul": "eldorado_do_sul", "Porto Alegre": "porto_alegre" };
