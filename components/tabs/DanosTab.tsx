"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight } from "lucide-react";

export type CenarioDanos = {
  dias_agudo: number;
  dias_efetivos: number;
  f_interrup: number;
  empresas_vab: number;
  educacao_perdas: number;
  educacao_custo_adicional: number;
  saude_producao: number;
  agricultura_perdas: number;
  total: number;
};
export type DanosData = Record<string, Record<string, CenarioDanos>>;

const DC = {
  empresas:    "#2563eb",
  educacao:    "#16a34a",
  saude:       "#dc2626",
  agricultura: "#d97706",
  total:       "#055071",
};

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;

const PIORES_CENS_JSON: Record<string, string> = {
  "Eldorado do Sul": "Cenario ADA",
  "Lajeado":         "Cenario 27m",
  "Porto Alegre":    "Cenario ADA",
  "Rio Grande":      "Cenario Maio 2024",
};

function fmtBRL(v: number, dec = 1): string {
  if (!v || isNaN(v)) return "R$ 0";
  if (Math.abs(v) >= 1e9)
    return `R$ ${(v / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} bi`;
  if (Math.abs(v) >= 1e6)
    return `R$ ${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} mi`;
  if (Math.abs(v) >= 1e3)
    return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function pct(a: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((a / total) * 100)}%`;
}

// Strip accents for loose cenário key comparison
function normStr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

interface Props {
  municipio: string;
  cenario: string;
  isVisaoGeral: boolean;
  isCenarioAtivo: boolean;
  danosData: DanosData | null;
}

export function DanosTab({ municipio, cenario, isVisaoGeral, isCenarioAtivo, danosData }: Props) {
  const [metodAberto, setMetodAberto] = useState(false);

  const { kpis, chartData, tableRows } = useMemo(() => {
    if (!danosData) return { kpis: null, chartData: [], tableRows: [] };

    const rows: { label: string; sublabel?: string; data: CenarioDanos; highlight: boolean }[] = [];

    if (isVisaoGeral) {
      for (const mun of ["Eldorado do Sul", "Lajeado", "Porto Alegre", "Rio Grande"]) {
        const cenKey = PIORES_CENS_JSON[mun];
        const d = danosData[mun]?.[cenKey];
        if (d) rows.push({ label: mun, sublabel: cenKey.replace("Cenario ", "Cenário "), data: d, highlight: false });
      }
    } else {
      const munData = danosData[municipio];
      if (munData) {
        for (const [cenKey, d] of Object.entries(munData)) {
          const isHigh = isCenarioAtivo && normStr(cenKey) === normStr(cenario);
          rows.push({ label: cenKey.replace("Cenario ", "Cenário "), data: d, highlight: isHigh });
        }
      }
    }

    const totalEmp = rows.reduce((s, r) => s + r.data.empresas_vab, 0);
    const totalEdu = rows.reduce((s, r) => s + r.data.educacao_perdas + r.data.educacao_custo_adicional, 0);
    const totalSau = rows.reduce((s, r) => s + r.data.saude_producao, 0);
    const totalAgr = rows.reduce((s, r) => s + r.data.agricultura_perdas, 0);
    const totalAll = rows.reduce((s, r) => s + r.data.total, 0);

    const chartData = rows.map(r => ({
      name: r.label.length > 14 ? r.label.slice(0, 13) + "…" : r.label,
      fullName: r.label,
      empresas:    r.data.empresas_vab / 1e6,
      educacao:    (r.data.educacao_perdas + r.data.educacao_custo_adicional) / 1e6,
      saude:       r.data.saude_producao / 1e6,
      agricultura: r.data.agricultura_perdas / 1e6,
    }));

    return { kpis: { totalEmp, totalEdu, totalSau, totalAgr, totalAll }, chartData, tableRows: rows };
  }, [danosData, municipio, cenario, isVisaoGeral, isCenarioAtivo]);

  const scrollClass = "flex-1 overflow-y-auto mt-4 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full";

  if (!danosData) {
    return (
      <TabsContent value="danos" className={scrollClass}>
        <p className="text-[11px] text-muted-foreground text-center mt-8">Carregando...</p>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="danos" className={scrollClass}>

      {/* ── KPI principal ─────────────────────────────────────────────────── */}
      <div className="flex items-center px-2.5 py-1.5 rounded-lg mb-2.5" style={PANEL_HDR}>
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Danos Operacionais — DaLA</h3>
      </div>

      {kpis && (
        <>
          <Card size="sm" className="mb-2 border-[#b3cdd8] bg-[#f0f7fa]">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: DC.total }}>
                {isVisaoGeral ? "Total — piores cenários" : `${municipio} — total`}
              </p>
              <p className="text-[26px] font-black leading-none" style={{ color: DC.total }}>
                {fmtBRL(kpis.totalAll)}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">
                DaLA: 30d fechamento + 60d recuperação × 0,5 = 60d ef. · educação: perdas + reposição obrigatória
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {([
              ["Empresas (VAB)",   kpis.totalEmp, DC.empresas],
              ["Educação (FUNDEB)",kpis.totalEdu, DC.educacao],
              ["Saúde (SUS)",      kpis.totalSau, DC.saude],
              ["Agricultura",      kpis.totalAgr, DC.agricultura],
            ] as [string, number, string][]).map(([label, value, color]) => (
              <Card key={label} size="sm" className="py-0 gap-0">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
                  </div>
                  <p className="text-[13px] font-black tabular-nums" style={{ color }}>{fmtBRL(value)}</p>
                  <p className="text-[9px] text-muted-foreground">{pct(value, kpis.totalAll)} do total</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Separator className="my-2" />

      {/* ── Gráfico stacked bar ───────────────────────────────────────────── */}
      <div className="flex items-center px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Por componente (R$ mi)</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-2 px-0.5">
        {([
          ["Empresas", DC.empresas], ["Educação", DC.educacao],
          ["Saúde",    DC.saude],    ["Agricultura", DC.agricultura],
        ] as [string, string][]).map(([l, c]) => (
          <span key={l} className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c }} />{l}
          </span>
        ))}
      </div>

      <div className="h-[190px] w-full mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#64748b" }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#64748b" }}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}bi` : `${v}`}
              width={36}
            />
            <Tooltip
              formatter={(val, name) => [
                fmtBRL(Number(val) * 1e6),
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
              labelFormatter={(l) => chartData.find(d => d.name === String(l))?.fullName ?? String(l)}
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
            />
            <Bar dataKey="empresas"    stackId="a" fill={DC.empresas} />
            <Bar dataKey="educacao"    stackId="a" fill={DC.educacao} />
            <Bar dataKey="saude"       stackId="a" fill={DC.saude} />
            <Bar dataKey="agricultura" stackId="a" fill={DC.agricultura} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Separator className="my-2" />

      {/* ── Tabela detalhada ──────────────────────────────────────────────── */}
      <div className="flex items-center px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Detalhamento por cenário</h3>
      </div>

      <div className="space-y-1.5 mb-3">
        {tableRows.map(({ label, sublabel, data, highlight }) => (
          <Card
            key={label}
            size="sm"
            className={`py-0 gap-0 ${highlight ? "border-blue-400 ring-1 ring-blue-300 bg-blue-50/30" : ""}`}
          >
            <CardContent className="p-2.5">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <span className="text-[10px] font-black text-slate-700 leading-tight">{label}</span>
                  {sublabel && <p className="text-[8.5px] text-muted-foreground leading-tight">{sublabel}</p>}
                </div>
                <span className="text-[12px] font-black tabular-nums flex-shrink-0 ml-2" style={{ color: DC.total }}>
                  {fmtBRL(data.total)}
                </span>
              </div>

              {/* Mini barra de composição */}
              <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5 w-full">
                {([
                  [data.empresas_vab, DC.empresas],
                  [data.educacao_perdas + data.educacao_custo_adicional, DC.educacao],
                  [data.saude_producao, DC.saude],
                  [data.agricultura_perdas, DC.agricultura],
                ] as [number, string][]).map(([v, c], i) => (
                  <div
                    key={i}
                    style={{ width: `${data.total > 0 ? (v / data.total) * 100 : 0}%`, background: c }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {([
                  ["Empresas",   data.empresas_vab,       DC.empresas],
                  ["Educação",   data.educacao_perdas + data.educacao_custo_adicional, DC.educacao],
                  ["Saúde",      data.saude_producao,      DC.saude],
                  ["Agricultura",data.agricultura_perdas,  DC.agricultura],
                ] as [string, number, string][]).map(([k, v, c]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[8.5px] text-muted-foreground">{k}</span>
                    <span className="text-[8.5px] font-bold tabular-nums" style={{ color: c }}>{fmtBRL(v, 0)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-slate-400 mt-1">
                {data.dias_agudo}d fechamento · {data.dias_efetivos}d ef. empresas · f = {(data.f_interrup * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-2" />

      {/* ── Metodologia (colapsível) ─────────────────────────────────────── */}
      <button
        onClick={() => setMetodAberto(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg mb-1.5 text-left"
        style={PANEL_HDR}
      >
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Metodologia</h3>
        {metodAberto
          ? <ChevronDown size={12} className="text-white/80" />
          : <ChevronRight size={12} className="text-white/80" />}
      </button>

      {metodAberto && (
        <div className="space-y-1.5 pb-6">

          <Card size="sm" className="py-0 gap-0">
            <CardContent className="p-2.5">
              <p className="text-[10px] font-black text-slate-700 mb-1">Abordagem DaLA (CEPAL/BID)</p>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                A metodologia DaLA distingue <strong>danos</strong> (destruição de ativos físicos)
                de <strong>perdas</strong> (fluxo de produção não realizado durante a recuperação).
                Este módulo estima perdas operacionais usando curva de recuperação linear:
              </p>
              <div className="mt-1.5 bg-slate-50 rounded px-2 py-1.5">
                <p className="text-[9px] font-mono text-slate-600">f = (30d agudo + 60d × 0,5) / 365 ≈ 16,4%</p>
                <p className="text-[8.5px] text-slate-500 mt-0.5">Setembro/2023: 15d + 30d × 0,5 = 30d ef. (f ≈ 8,2%)</p>
              </div>
              <p className="text-[8px] text-muted-foreground mt-1.5">
                Ref.: CEPAL (2024). <em>Avaliação dos efeitos e impactos das inundações no RS</em>, nov/2024.
              </p>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0 gap-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: DC.empresas }} />
                <p className="text-[10px] font-black text-slate-700">Empresas — Perda de VAB</p>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed mb-1.5">
                VAB = massa_salarial × 12 / labor_share &nbsp;→&nbsp; Perda = VAB × f_interrup
              </p>
              <p className="text-[9px] font-bold text-slate-600 mb-0.5">Labor share setorial (IBGE Tab17 SCN 2021)</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {([
                  ["Agropecuária", "17,6%"],
                  ["Indústria",    "33,8%"],
                  ["Serviços",     "43,3%"],
                  ["Adm. Pública", "88,3%"],
                ] as [string, string][]).map(([s, v]) => (
                  <div key={s} className="flex items-center justify-between">
                    <span className="text-[8.5px] text-muted-foreground">{s}</span>
                    <span className="text-[8.5px] font-bold" style={{ color: DC.empresas }}>{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-slate-400 mt-1.5">
                Fonte: ftp.ibge.gov.br/…/sinoticas/tab17.xls (SCN 2021)
              </p>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0 gap-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: DC.educacao }} />
                <p className="text-[10px] font-black text-slate-700">Educação — Perdas + Custo de Reposição</p>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Dois componentes DaLA — mesmo custo unitário (FUNDEB/dia):
              </p>
              <div className="mt-1.5 bg-slate-50 rounded px-2 py-1.5 space-y-1">
                <div>
                  <p className="text-[8.5px] font-bold text-slate-600">Perda (dias de fechamento)</p>
                  <p className="text-[8px] text-slate-500">matrículas × (VAAT-MIN ÷ 200) × dias_agudo</p>
                </div>
                <div>
                  <p className="text-[8.5px] font-bold text-slate-600">Custo adicional (reposição obrigatória)</p>
                  <p className="text-[8px] text-slate-500">LDB art. 24, I — escolas devem compensar os dias: mesmo custo × dias_agudo</p>
                </div>
                <p className="text-[8.5px] text-slate-600 pt-0.5">VAAT-MIN 2024: <strong>R$ 8.481,21</strong></p>
                <p className="text-[8px] text-slate-500">Portaria Interministerial MEC/MF nº 9 (28/08/2024) · Parecer CNE/CP nº 11/2024</p>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0 gap-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: DC.saude }} />
                <p className="text-[10px] font-black text-slate-700">Saúde — Produção SUS</p>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Perda = Σ(SIA + SIH por CNES atingido) × (12/7) × f_interrup<br />
                SIA = procedimentos ambulatoriais; SIH = internações.<br />
                Período base: jan–jul 2024 (7 meses), anualizado para 12.
              </p>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0 gap-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: DC.agricultura }} />
                <p className="text-[10px] font-black text-slate-700">Agricultura — Perdas por Cultura</p>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed mb-1.5">
                Perda = Σ(área_ha × coef_R$/ha) — coeficientes por cultura e período:
              </p>
              <div className="space-y-0.5">
                {([
                  ["Maio/2024 — Soja/Arroz",   "R$ 1.100/ha", "colhidos"],
                  ["Maio/2024 — Outras Lavouras","R$ 1.400/ha","plantio inicial"],
                  ["Set./2023 — Outras Lavouras","R$ 2.800/ha","colheita em curso"],
                  ["Set./2023 — Soja/Arroz",    "R$ 250/ha",  "pré-plantio"],
                ] as [string, string, string][]).map(([cult, coef, status]) => (
                  <div key={cult} className="flex items-start justify-between gap-2">
                    <span className="text-[8.5px] text-muted-foreground leading-tight">{cult} <em>({status})</em></span>
                    <span className="text-[8.5px] font-bold flex-shrink-0" style={{ color: DC.agricultura }}>{coef}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0 gap-0 border-amber-200 bg-amber-50/50">
            <CardContent className="p-2.5">
              <p className="text-[9px] font-black text-amber-800 mb-0.5">Nota — CNAE 84 (Adm. Pública)</p>
              <p className="text-[9px] text-amber-700 leading-relaxed">
                Em Porto Alegre/ADA, 51 estabelecimentos de CNAE 84 representam ~45% da folha atingida
                (R$ 560 mi/mês), gerando ~R$ 625 mi do total estimado para empresas.
                A DaLA trata perdas de serviços públicos separadamente; a inclusão aqui representa
                o custo de oportunidade dos recursos imobilizados durante a interrupção.
              </p>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0 gap-0">
            <CardContent className="p-2.5">
              <p className="text-[10px] font-black text-slate-700 mb-1">Hipóteses e limitações</p>
              <ul className="text-[9px] text-muted-foreground space-y-0.5 leading-relaxed">
                {[
                  "Empresas/saúde: interrupção 100% na fase aguda, recuperação linear em 60d (maio/2024)",
                  "Labor share nacional (IBGE 2021); variações estaduais não capturadas",
                  "Saúde: anualização simples 7→12 meses; sazonalidade não ajustada",
                  "Agricultura: apenas perdas de fluxo (danos a estoque são separados)",
                  "Base de emprego: RAIS 2023 (variações 2023→2024 não refletidas)",
                  "Cenário Set./2023 (Rio Grande): saúde e agricultura retornam R$ 0 por ausência de dados naquele cenário",
                ].map(l => (
                  <li key={l} className="flex gap-1.5">
                    <span className="text-slate-400 flex-shrink-0 mt-px">·</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </div>
      )}
    </TabsContent>
  );
}
