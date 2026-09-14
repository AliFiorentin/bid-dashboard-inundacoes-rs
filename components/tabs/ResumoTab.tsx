import type React from "react";
import { Users, Building2, GraduationCap, BookOpen, HeartPulse, Stethoscope, Wrench, DollarSign, Sprout, Map } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { DonutChart } from "@/components/ui/donut-chart";
import { COLORS, MUNICIPIOS, PIORES_CENARIOS, CENARIO_PERIODO, IMPACTO_AGRICOLA, PANEL_CARD_BG, C } from "@/lib/constants";
import { compactoBr, scenarioSlug, findCenarioData } from "@/lib/geo-utils";
import type { DashboardState } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
const COR_AGRICULTURA = "#6B8E23";
const COR_AREA = "#0891b2";
const COR_TRILHA = "#e2e8f0";

// Escala fluida com a altura da tela (vh) -- em telas baixas (notebook 14")
// os cards encolhem o suficiente pra caber sem rolagem; em telas altas usam
// o tamanho máximo. min/max escolhidos pra nunca ficar ilegível nem
// desproporcional. O DonutChart precisa do `style` de largura/altura (não só
// className) pra vencer o `size`/`strokeWidth` default do componente.
const DONUT_MINI = "clamp(26px, 5vh, 52px)";
const DONUT_AGRI = "clamp(32px, 6.5vh, 58px)";
const CARD_PAD = "clamp(0.2rem, 1.3vh, 0.625rem)";
const CARD_GAP = "clamp(0.2rem, 1vh, 0.625rem)";
const FONT_LABEL = "clamp(7px, 1.05vh, 9.5px)";
const FONT_VALOR = "clamp(12px, 2.1vh, 18px)";

interface Props {
  dash: Pick<
    DashboardState,
    | "municipio"
    | "cenario"
    | "mostraImpacto"
    | "isVisaoGeral"
    | "isCenarioAtivo"
    | "metricasEmp"
    | "metricasEdu"
    | "metricasSau"
    | "baseAgriStats"
    | "atingidosAgriStats"
    | "conabStats"
    | "allMunAgriStats"
    | "allMunAgriAtingidosStats"
    | "baseInfra"
    | "atingidosInfra"
    | "allMunInfraStats"
    | "areaData"
  >;
}

function MiniStatCard({
  icon, titulo, cor, atingido, base, mostraImpacto, prefixo, sufixo, casas = 0,
}: {
  icon: React.ReactNode; titulo: string; cor: string;
  atingido: number; base: number; mostraImpacto: boolean;
  prefixo?: string; sufixo?: string; casas?: number;
}) {
  const pct = base > 0 ? (atingido / base) * 100 : 0;
  const valor = mostraImpacto ? atingido : base;
  const fmt = (n: number) => `${prefixo ?? ""}${compactoBr(n, casas)}${sufixo ?? ""}`;

  return (
    <div className="rounded-lg overflow-hidden print:break-inside-avoid" style={{ border: "1px solid rgba(5,80,113,0.15)", backgroundColor: PANEL_CARD_BG }}>
      <div className="flex items-center" style={{ gap: CARD_GAP, padding: CARD_PAD }}>
        <DonutChart
          data={[
            { value: pct, color: cor, label: "atingido" },
            { value: Math.max(0, 100 - pct), color: COR_TRILHA, label: "resto" },
          ]}
          totalValue={100}
          size={52}
          strokeWidth={5}
          highlightOnHover={false}
          animationDuration={0.7}
          className="shrink-0"
          style={{ width: DONUT_MINI, height: DONUT_MINI }}
          centerContent={<div className="w-full h-full flex items-center justify-center" style={{ color: cor }}>{icon}</div>}
        />
        <div className="min-w-0 flex-1">
          <div className="font-bold uppercase tracking-wide leading-tight" style={{ color: C.muted, fontSize: FONT_LABEL }}>{titulo}</div>
          <div className="font-black leading-tight tabular-nums mt-0.5" style={{ color: C.dark, fontSize: FONT_VALOR }}>
            {fmt(valor)}
          </div>
          {mostraImpacto ? (
            <div className="tabular-nums leading-tight mt-0.5" style={{ color: C.muted, fontSize: FONT_LABEL }}>
              de {fmt(base)} ({pct.toFixed(0)}%)
            </div>
          ) : (
            <div className="leading-tight mt-0.5" style={{ color: C.muted, fontSize: FONT_LABEL }}>total</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Resumo (aba inicial do Painel): uma métrica-chave por camada, em grade de
 * 2 colunas com mini-donuts de progresso, para caber numa tela só antes de
 * entrar nos detalhes de cada aba.
 */
export function ResumoTab({ dash }: Props) {
  const {
    municipio, cenario, mostraImpacto, isVisaoGeral, isCenarioAtivo,
    metricasEmp, metricasEdu, metricasSau,
    baseAgriStats, atingidosAgriStats, conabStats,
    allMunAgriStats, allMunAgriAtingidosStats,
    baseInfra, atingidosInfra, allMunInfraStats,
    areaData,
  } = dash;

  const somaValores = (rec: Record<string, number> | undefined) =>
    Object.values(rec ?? {}).reduce((s, v) => s + v, 0);

  // ── Agricultura: hectares + prejuízo estimado (R$) ──────────────────────────
  const temAgri = isVisaoGeral
    ? !!allMunAgriStats && Object.keys(allMunAgriStats).length > 0
    : !!baseAgriStats;
  const agriBase = isVisaoGeral
    ? Object.values(allMunAgriStats ?? {}).reduce((s, stats) => s + somaValores(stats), 0)
    : somaValores(baseAgriStats ?? undefined);
  const agriAtg = isVisaoGeral
    ? Object.values(allMunAgriAtingidosStats ?? {}).reduce((s, stats) => s + somaValores(stats), 0)
    : somaValores(atingidosAgriStats ?? undefined);

  let impactoAgricola = 0;
  if (isVisaoGeral) {
    MUNICIPIOS.forEach(mun => {
      const periodo = CENARIO_PERIODO[scenarioSlug(mun, PIORES_CENARIOS[mun])];
      const coefs = periodo ? IMPACTO_AGRICOLA[periodo] : null;
      if (!coefs) return;
      const statsMun = allMunAgriAtingidosStats?.[mun] ?? {};
      Object.keys(coefs).forEach(nome => {
        impactoAgricola += (statsMun[nome] ?? 0) * (coefs[nome]?.coef ?? 0);
      });
    });
  } else if (isCenarioAtivo) {
    const periodo = CENARIO_PERIODO[scenarioSlug(municipio, cenario)];
    const coefs = periodo ? IMPACTO_AGRICOLA[periodo] : null;
    if (coefs) {
      Object.keys(coefs).forEach(nome => {
        let ha = atingidosAgriStats?.[nome] ?? 0;
        if (nome === "Soja" && conabStats && conabStats.soja.area_ha > 0) ha = conabStats.soja.area_ha;
        if (nome === "Arroz" && conabStats && conabStats.arroz.area_ha > 0) ha = conabStats.arroz.area_ha;
        impactoAgricola += ha * (coefs[nome]?.coef ?? 0);
      });
    }
  }

  // ── Edificações (Infraestrutura) ────────────────────────────────────────────
  const edifBase = isVisaoGeral
    ? MUNICIPIOS.reduce((s, mun) => s + (allMunInfraStats?.[mun]?.["Edificações"]?.count_base ?? 0), 0)
    : (baseInfra["Edificações"]?.features?.length ?? 0);
  const edifAtg = isVisaoGeral
    ? MUNICIPIOS.reduce((s, mun) => s + (allMunInfraStats?.[mun]?.["Edificações"]?.count_atingido ?? 0), 0)
    : (atingidosInfra["Edificações"]?.features?.length ?? 0);

  // ── Área Atingida: território do município x extensão da mancha ────────────
  const areaBase = isVisaoGeral
    ? MUNICIPIOS.reduce((s, mun) => s + (areaData?.[mun]?.area_km2 ?? 0), 0)
    : (areaData?.[municipio]?.area_km2 ?? 0);
  const areaAtg = isVisaoGeral
    ? MUNICIPIOS.reduce((s, mun) => {
        const d = areaData?.[mun];
        if (!d) return s;
        const cenData = findCenarioData(d.cenarios, PIORES_CENARIOS[mun]);
        return s + (cenData?.area_atingida_km2 ?? 0);
      }, 0)
    : (isCenarioAtivo ? findCenarioData(areaData?.[municipio]?.cenarios ?? {}, cenario)?.area_atingida_km2 ?? 0 : 0);

  // ── Saúde: unidades (todos os tipos) + profissionais ────────────────────────
  const staffTotal = (rec: Record<string, number>) => Object.values(rec).reduce((s, v) => s + v, 0);
  const staffBase = staffTotal(metricasSau.base.staff);
  const staffAtg = staffTotal(metricasSau.impacto.staff);

  const agriPct = agriBase > 0 ? (agriAtg / agriBase) * 100 : 0;

  return (
    <TabsContent value="resumo" className="flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div className="grid grid-cols-2" style={{ gap: CARD_GAP }}>
        <MiniStatCard
          icon={<Users strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Empregados"
          cor={COLORS.empresas}
          atingido={metricasEmp.impacto.emp}
          base={metricasEmp.base.emp}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<Building2 strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Empresas"
          cor={COLORS.empresas}
          atingido={metricasEmp.impacto.estab}
          base={metricasEmp.base.estab}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<GraduationCap strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Escolas"
          cor={COLORS.educacao}
          atingido={metricasEdu.impacto.escolas}
          base={metricasEdu.base.escolas}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<BookOpen strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Profissionais Educação"
          cor={COLORS.educacao}
          atingido={metricasEdu.impacto.prof}
          base={metricasEdu.base.prof}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<HeartPulse strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Unidades de Saúde"
          cor={COLORS.saude}
          atingido={metricasSau.impacto.unidades}
          base={metricasSau.base.unidades}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<Stethoscope strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Profissionais Saúde"
          cor={COLORS.saude}
          atingido={staffAtg}
          base={staffBase}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<Wrench strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Edificações"
          cor={COLORS.infra}
          atingido={edifAtg}
          base={edifBase}
          mostraImpacto={mostraImpacto}
        />
        <MiniStatCard
          icon={<DollarSign strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Massa Salarial"
          cor={COLORS.empresas}
          atingido={metricasEmp.impacto.massa}
          base={metricasEmp.base.massa}
          mostraImpacto={mostraImpacto}
          prefixo="R$ "
          casas={1}
        />
        <MiniStatCard
          icon={<Map strokeWidth={2.5} className="w-[45%] h-[45%]" />}
          titulo="Área Atingida"
          cor={COR_AREA}
          atingido={areaAtg}
          base={areaBase}
          mostraImpacto={mostraImpacto}
          sufixo=" km²"
          casas={1}
        />
      </div>

      {temAgri && (
        <div className="rounded-lg overflow-hidden print:break-inside-avoid" style={{ border: "1px solid rgba(5,80,113,0.15)", marginTop: CARD_GAP }}>
          <div className="flex items-center gap-1.5" style={{ ...PANEL_HDR, paddingInline: "0.75rem", paddingBlock: CARD_PAD }}>
            <Sprout size={13} strokeWidth={2.5} className="text-white shrink-0" />
            <span className="font-black uppercase tracking-wider text-white" style={{ fontSize: FONT_LABEL }}>Área Agrícola</span>
          </div>
          <div className="flex items-center" style={{ backgroundColor: PANEL_CARD_BG, gap: CARD_GAP, padding: CARD_PAD }}>
            <DonutChart
              data={[
                { value: agriPct, color: COR_AGRICULTURA, label: "atingido" },
                { value: Math.max(0, 100 - agriPct), color: COR_TRILHA, label: "resto" },
              ]}
              totalValue={100}
              size={58}
              strokeWidth={6}
              highlightOnHover={false}
              animationDuration={0.7}
              className="shrink-0"
              style={{ width: DONUT_AGRI, height: DONUT_AGRI }}
              centerContent={<span className="font-black" style={{ color: COR_AGRICULTURA, fontSize: FONT_VALOR }}>{agriPct.toFixed(0)}%</span>}
            />
            <div className="flex-1 grid grid-cols-2 gap-2.5 min-w-0">
              <div className="min-w-0">
                <div className="font-bold uppercase tracking-wide leading-none" style={{ color: C.muted, fontSize: FONT_LABEL }}>
                  Área {mostraImpacto ? "Atingida" : "Total"}
                </div>
                <div className="font-black leading-tight tabular-nums" style={{ color: C.dark, fontSize: FONT_VALOR }}>
                  {compactoBr(mostraImpacto ? agriAtg : agriBase, 0)} ha
                </div>
                {mostraImpacto && (
                  <div className="tabular-nums leading-tight mt-0.5" style={{ color: C.muted, fontSize: FONT_LABEL }}>de {compactoBr(agriBase, 0)} ha</div>
                )}
              </div>
              {impactoAgricola > 0 && (
                <div className="min-w-0">
                  <div className="font-bold uppercase tracking-wide leading-none" style={{ color: C.muted, fontSize: FONT_LABEL }}>Prejuízo Estimado</div>
                  <div className="font-black leading-tight tabular-nums text-orange-600" style={{ fontSize: FONT_VALOR }}>
                    R$ {compactoBr(impactoAgricola, 1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="italic text-muted-foreground" style={{ fontSize: FONT_LABEL, marginTop: CARD_GAP }}>
        Resumo das principais métricas por camada — veja o detalhamento em cada aba.
      </p>
    </TabsContent>
  );
}
