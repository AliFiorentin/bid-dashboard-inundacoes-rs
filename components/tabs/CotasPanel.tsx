"use client";

import React from "react";
import { Building2, GraduationCap, HeartPulse, Sprout, Coins } from "lucide-react";
import { FitHeight } from "@/components/FitHeight";
import type { CotaRaster } from "@/hooks/useCotaRaster";
import type { DetalheCotaMun, DetalheCotaValores } from "@/lib/cotas-types";

// Painel do cenário "Todas as cotas": valores (do que fica sob água) na cota atual do slider.
// Os valores vêm de climada_cota_detalhe_{slug}.json, que tem uma entrada por cota-raster; entre
// duas cotas vale a última cota já atingida (o valor exposto é cumulativo, não diminui com a cota).

const fmtN = (v: number) => Math.round(v).toLocaleString("pt-BR");
const fmtBRL = (v: number) => {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2).replace(".", ",")} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${fmtN(v)}`;
};
const fmtCota = (v: number) => v.toFixed(2).replace(".", ",");
const totalExposto = (v: DetalheCotaValores) => v.empresas.valor_exposto_brl + v.saude.valor_exposto_brl + v.educacao.valor_exposto_brl;

interface Props { raster: CotaRaster; detalhe: DetalheCotaMun | null; municipio: string }

export function CotasPanel({ raster, detalhe, municipio }: Props) {
  const { cota, meta } = raster;
  if (!detalhe || !meta || cota === null) {
    return <div className="py-6 text-center text-[11px] text-slate-500">Carregando valores por cota…</div>;
  }
  const chaves = Object.keys(detalhe.por_cota).sort((a, b) => parseFloat(a) - parseFloat(b));
  const alcancadas = chaves.filter((c) => parseFloat(c) <= cota + 1e-6);
  const chave = alcancadas[alcancadas.length - 1] ?? null;
  const v = chave ? detalhe.por_cota[chave] : null;
  const total = v ? totalExposto(v) : 0;
  const serie = chaves.map((c) => totalExposto(detalhe.por_cota[c]));
  const maxSerie = Math.max(...serie, 1);
  const cotas = chaves.map(parseFloat);
  const x0 = cotas[0], x1 = cotas[cotas.length - 1];
  const px = (c: number) => 4 + ((c - x0) / (x1 - x0 || 1)) * 232;
  const py = (val: number) => 50 - (val / maxSerie) * 44;
  const linha = cotas.map((c, i) => `${px(c).toFixed(1)},${py(serie[i]).toFixed(1)}`).join(" ");
  const xAtual = px(Math.min(Math.max(cota, x0), x1));

  // Layout compacto (cabe no painel sem rolagem): empresas em largura total; educação e saúde
  // lado a lado; agricultura em uma linha.
  const card = (titulo: string, icone: React.ReactNode, cor: string, linhas: [string, string][], valor: number, colunas = 2) => (
    <div className="rounded-lg border bg-white/70 px-3 py-2 min-w-0 flex flex-col justify-center h-full" style={{ borderColor: cor + "55" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 font-black text-xs shrink-0" style={{ color: cor }}>{icone}{titulo}</div>
        <div className="font-black text-[13px] whitespace-nowrap tabular-nums text-slate-800">{fmtBRL(valor)}</div>
      </div>
      <div className={`mt-1 grid gap-x-3 gap-y-1 ${colunas === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {linhas.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-1 text-[11px] leading-snug text-slate-600"><span className="truncate">{k}</span><span className="font-bold tabular-nums text-slate-800 shrink-0">{val}</span></div>
        ))}
      </div>
    </div>
  );

  return (
    <FitHeight className="pb-2"><div className="flex flex-col gap-2">
      <div className="rounded-lg px-3 py-2 text-white flex flex-col flex-[1.2] min-h-[120px]" style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}>
        <div className="text-[9px] uppercase tracking-wider font-bold text-white/80">Valor exposto atingido · cota {fmtCota(cota)} m</div>
        <div className="text-2xl font-black tabular-nums leading-tight">{fmtBRL(total)}</div>
        <svg viewBox="0 0 240 54" preserveAspectRatio="none" className="w-full flex-1 min-h-9 mt-1" role="img" aria-label="Valor exposto por cota">
          <polyline points={linha} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <line x1={xAtual} x2={xAtual} y1="2" y2="52" stroke="#fbbf24" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-[8px] text-white/70"><span>{fmtCota(x0)} m</span><span>{fmtCota(x1)} m</span></div>
      </div>

      {!v ? (
        <p className="text-[11px] text-slate-500 px-1">Abaixo da menor cota ({fmtCota(x0)} m) ainda não há ponto sob água em {municipio}.</p>
      ) : (
        <div className="flex-[3] flex flex-col gap-2">
          <div className="flex-1">{card("Empresas", <Building2 size={12} strokeWidth={2.5} />, "#055071", [
            ["Atingidas", `${fmtN(v.empresas.n)}/${fmtN(detalhe.totais.empresas?.n ?? 0)}`],
            ["Empregados", fmtN(v.empresas.empregados)],
            ["Massa salarial", fmtBRL(v.empresas.massa_salarial_brl)],
            ["Salário médio", `R$ ${fmtN(v.empresas.salario_medio_brl)}`],
          ], v.empresas.valor_exposto_brl)}</div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {card("Educação", <GraduationCap size={12} strokeWidth={2.5} />, "#2da8cc", [
              ["Escolas", `${fmtN(v.educacao.n)}/${fmtN(detalhe.totais.educacao?.n ?? 0)}`],
              ["Matrículas", fmtN(v.educacao.matriculas)],
              ["Docentes", fmtN(v.educacao.docentes)],
            ], v.educacao.valor_exposto_brl, 1)}
            {card("Saúde", <HeartPulse size={12} strokeWidth={2.5} />, "#e35d4b", [
              ["Unidades", `${fmtN(v.saude.n)}/${fmtN(detalhe.totais.saude?.n ?? 0)}`],
              ["Leitos", fmtN(v.saude.leitos)],
              ["Profissionais", fmtN(v.saude.profissionais)],
            ], v.saude.valor_exposto_brl, 1)}
          </div>
          {v.agricultura && (
            <div className="rounded-lg border bg-white/70 px-3 py-2 flex items-center justify-between shrink-0" style={{ borderColor: "#4d9e3a55" }}>
              <div className="flex items-center gap-1 font-black text-xs" style={{ color: "#4d9e3a" }}><Sprout size={12} strokeWidth={2.5} />Agricultura</div>
              <div className="text-[11px] text-slate-600">Área atingida <span className="font-black text-slate-800 tabular-nums">{fmtN(v.agricultura.area_ha)} ha</span></div>
            </div>
          )}
          <div className="flex items-start gap-1 text-[8.5px] leading-tight text-slate-500 px-0.5">
            <Coins size={9} className="shrink-0 mt-px" />
            Exposição (valor de reposição sob água), não dano. Valores da cota-raster {fmtCota(parseFloat(chave!))} m. Ver página de Danos.
          </div>
        </div>
      )}
    </div></FitHeight>
  );
}
