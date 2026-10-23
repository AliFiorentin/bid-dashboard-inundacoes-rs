import type { FeatureCollection } from "geojson";
import { CENARIO_PERIODO, IMPACTO_AGRICOLA } from "@/lib/constants";
import { slugify, scenarioSlug } from "@/lib/geo-utils";

export interface ExportarExcelParams {
  camadas: string[];
  municipio: string;
  cenario: string;
  isVisaoGeral: boolean;
  isCenarioAtivo: boolean;
  infraAtivas: string[];
  atingidosEmpresas: FeatureCollection | null;
  baseEmpresas: FeatureCollection | null;
  atingidosEducacao: FeatureCollection | null;
  baseEducacao: FeatureCollection | null;
  atingidosSaude: FeatureCollection | null;
  baseSaude: FeatureCollection | null;
  atingidosInfra: Record<string, FeatureCollection>;
  baseInfra: Record<string, FeatureCollection>;
  baseAgriStats: Record<string, number> | null;
  atingidosAgriStats: Record<string, number> | null;
  conabStats: { soja: { area_ha: number }; arroz: { area_ha: number } } | null;
}

/** Gera e baixa a planilha de impacto (uma aba por camada ativa). */
export async function exportarExcel(p: ExportarExcelParams) {
  const XLSX = await import("xlsx"); // ~500 KB: carregado só ao clicar em "Baixar"
  const workbook = XLSX.utils.book_new();
  const adicionarAba = (dadosGeograficos: FeatureCollection | null | undefined, nomeDaAba: string) => {
    if (dadosGeograficos && Array.isArray(dadosGeograficos.features) && dadosGeograficos.features.length > 0) {
      const linhas = dadosGeograficos.features.map((f) => f.properties);
      const worksheet = XLSX.utils.json_to_sheet(linhas);
      XLSX.utils.book_append_sheet(workbook, worksheet, nomeDaAba);
    }
  };
  if (p.camadas.includes("Empresas")) {
    adicionarAba(p.atingidosEmpresas || p.baseEmpresas, "Empresas");
  }
  if (p.camadas.includes("Educação")) adicionarAba(p.atingidosEducacao || p.baseEducacao, "Educação");
  if (p.camadas.includes("Saúde")) adicionarAba(p.atingidosSaude || p.baseSaude, "Saúde");
  if (p.camadas.includes("Infraestrutura") && !p.isVisaoGeral) {
    p.infraAtivas.forEach(infra => {
      const sourceData = p.isCenarioAtivo ? p.atingidosInfra[infra] : p.baseInfra[infra];
      if (sourceData) adicionarAba(sourceData, `Infra - ${infra}`);
    });
  }
  if (p.camadas.includes("Agricultura") && !p.isVisaoGeral && p.baseAgriStats) {
    const sSlugCen = p.isCenarioAtivo ? scenarioSlug(p.municipio, p.cenario) : null;
    const periodo  = sSlugCen ? CENARIO_PERIODO[sSlugCen] : null;
    const coefs    = periodo ? IMPACTO_AGRICOLA[periodo] : null;
    const conabStats = p.conabStats;
    const linhasAgri = Object.entries(p.baseAgriStats).map(([nome, haBase]) => {
      let haExib = haBase;
      let fonte  = "MapaBiomas";
      if (p.isCenarioAtivo) {
        haExib = p.atingidosAgriStats?.[nome] ?? 0;
        if (nome === "Soja"  && conabStats && conabStats.soja.area_ha  > 0) { haExib = conabStats.soja.area_ha;  fonte = "CONAB"; }
        if (nome === "Arroz" && conabStats && conabStats.arroz.area_ha > 0) { haExib = conabStats.arroz.area_ha; fonte = "CONAB"; }
      }
      const c       = coefs?.[nome];
      const impacto = c && haExib > 0 ? haExib * c.coef : 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: Record<string, any> = { Cultura: nome, Area_ha: haExib, Fonte: fonte };
      if (p.isCenarioAtivo && c) { row.Situacao = c.status; row.Coef_R_ha = c.coef; row.Impacto_R = impacto; }
      return row;
    });
    if (linhasAgri.length > 0) {
      const ws = XLSX.utils.json_to_sheet(linhasAgri);
      XLSX.utils.book_append_sheet(workbook, ws, "Agricultura");
    }
  }
  const sufixoCenario = p.isVisaoGeral ? "_piores_cenarios" : (p.cenario !== "(nenhum)" ? `_${slugify(p.cenario)}` : "");
  XLSX.writeFile(workbook, `Impacto_${slugify(p.municipio)}${sufixoCenario}.xlsx`);
}
