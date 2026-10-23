"use client";

import type { CenarioDanos, DanosData, SetorResultado, CotaSetor } from "./types";
import { MUN_COLORS, COMP_COLORS, DIAS_OPCOES, SETOR_COLORS, scaleTo } from "./helpers";
import type { DiasOpcao } from "./helpers";

// ─── Gráficos SVG — Danos Operacionais ──────────────────────────────────────────

export function CompositionBar({ v }: { v: CenarioDanos }) {
  const comps = [
    { value: v.empresas_vab,       color: COMP_COLORS.empresas },
    { value: v.educacao_perdas + v.educacao_custo_adicional, color: COMP_COLORS.educacao },
    { value: v.saude_producao,     color: COMP_COLORS.saude },
    { value: v.agricultura_perdas, color: COMP_COLORS.agricultura },
  ].filter((c) => c.value > 0);
  const total = comps.reduce((s, c) => s + c.value, 0);
  let offset = 0;
  return (
    <svg viewBox="0 0 400 14" className="w-full" style={{ height: 14 }}>
      {comps.map((c, i) => {
        const w = Math.max((c.value / total) * 400, 1);
        const x = offset;
        offset += w;
        return (
          <rect key={i} x={x} y={0} width={w} height={14} fill={c.color}
            rx={i === 0 || i === comps.length - 1 ? 3 : 0} ry={3} />
        );
      })}
    </svg>
  );
}

export function TotaisBarChart({
  todosCenarios,
  maxTotal,
}: {
  todosCenarios: { mun: string; cen: string; v: CenarioDanos }[];
  maxTotal: number;
}) {
  const barW = 44;
  const gap = 8;
  const chartH = 140;
  const pL = 60;
  const pB = 52;
  const W = pL + todosCenarios.length * (barW + gap) - gap + 10;

  return (
    <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const val = p * maxTotal;
        const y = chartH - p * chartH + 4;
        return (
          <g key={i}>
            <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
            <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#6b7280">
              {val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0"}
            </text>
          </g>
        );
      })}
      {todosCenarios.map(({ mun, cen, v }, i) => {
        const barH = Math.max((v.total / maxTotal) * chartH, 2);
        const x = pL + i * (barW + gap);
        const y = chartH - barH + 4;
        const color = MUN_COLORS[mun] ?? "#055071";
        const label = cen.replace(/Cenario\s*/i, "").substring(0, 10);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx="3" opacity="0.9" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="7" fill={color} fontWeight="bold">
              {v.total >= 1e9 ? `${(v.total / 1e9).toFixed(1)}bi` : `${(v.total / 1e6).toFixed(0)}mi`}
            </text>
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize="7.5" fill="#374151" fontWeight="bold">
              {mun.split(" ")[0]}
            </text>
            <text x={x + barW / 2} y={chartH + 26} textAnchor="middle" fontSize="6" fill="#6b7280">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SensibChart({
  dados,
  diasSelecionado,
}: {
  dados: DanosData;
  diasSelecionado: DiasOpcao;
}) {
  const municipios = Object.entries(dados).map(([mun, cens]) => {
    const cenValOrig = Object.values(cens).reduce((a, b) => (b.total > a.total ? b : a));
    return { mun, cenValOrig };
  });

  const allVals = municipios.flatMap(({ cenValOrig }) =>
    DIAS_OPCOES.map((d) => scaleTo(cenValOrig, d).total)
  );
  const maxVal = Math.max(...allVals);

  const bW = 18;
  const bGap = 3;
  const gGap = 22;
  const gW = DIAS_OPCOES.length * bW + (DIAS_OPCOES.length - 1) * bGap;
  const chartH = 110;
  const pL = 55;
  const pB = 48;
  const W = pL + municipios.length * (gW + gGap) - gGap + 10;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
        {[0, 0.5, 1].map((p, i) => {
          const val = p * maxVal;
          const y = chartH - p * chartH + 4;
          return (
            <g key={i}>
              <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
              <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="7.5" fill="#6b7280">
                {val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0"}
              </text>
            </g>
          );
        })}
        {municipios.map(({ mun, cenValOrig }, gi) => {
          const gx = pL + gi * (gW + gGap);
          return (
            <g key={mun}>
              {DIAS_OPCOES.map((d, di) => {
                const sc = scaleTo(cenValOrig, d);
                const barH = Math.max((sc.total / maxVal) * chartH, 1);
                const bx = gx + di * (bW + bGap);
                const by = chartH - barH + 4;
                const isSel = d === diasSelecionado;
                const color = MUN_COLORS[mun] ?? "#055071";
                return (
                  <g key={d}>
                    <rect x={bx} y={by} width={bW} height={barH}
                      fill={color}
                      opacity={isSel ? 1 : 0.3}
                      rx="2"
                      style={{ transition: "opacity 0.2s" }}
                    />
                    {isSel && (
                      <text x={bx + bW / 2} y={by - 4} textAnchor="middle" fontSize="6.5" fill={color} fontWeight="bold">
                        {sc.total >= 1e9 ? `${(sc.total / 1e9).toFixed(1)}bi` : `${(sc.total / 1e6).toFixed(0)}mi`}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={gx + gW / 2} y={chartH + 16} textAnchor="middle" fontSize="7.5" fill="#374151" fontWeight="bold">
                {mun.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex gap-5 justify-center mt-2 flex-wrap">
        {DIAS_OPCOES.map((d) => (
          <div key={d} className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-sm bg-[#055071]"
              style={{ opacity: d === diasSelecionado ? 1 : 0.3 }} />
            <span className={`text-[10px] font-medium ${d === diasSelecionado ? "text-[#055071]" : "text-slate-600"}`}>
              {d} dias{d === diasSelecionado ? " ◀" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gráficos SVG — CLIMADA ──────────────────────────────────────────────────────

export function CompositionBarClimada({ atual, setores }: { atual: Record<string, SetorResultado>; setores: string[] }) {
  const total = setores.reduce((s, k) => s + atual[k].dano_fisico_total_brl, 0) || 1;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
      {setores.map((s) => (
        <div key={s} style={{ width: `${(atual[s].dano_fisico_total_brl / total) * 100}%`, backgroundColor: SETOR_COLORS[s] }} />
      ))}
    </div>
  );
}

export function RpBarChart({ rpsDisponiveis, resultados, setores, maxTotal, rpAtivo }: {
  rpsDisponiveis: string[];
  resultados: Record<string, Record<string, SetorResultado>>;
  setores: string[];
  maxTotal: number;
  rpAtivo: string;
}) {
  const barW = 56;
  const gap = 14;
  const chartH = 150;
  const pL = 46;
  const pB = 24;
  const W = pL + rpsDisponiveis.length * (barW + gap) - gap + 10;

  return (
    <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const val = p * maxTotal;
        const y = chartH - p * chartH + 4;
        return (
          <g key={i}>
            <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
            <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#6b7280">
              {val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0"}
            </text>
          </g>
        );
      })}
      {rpsDisponiveis.map((r, i) => {
        const d = resultados[r];
        const x = pL + i * (barW + gap);
        let yTop = chartH + 4;
        const segs = setores.map((s) => {
          const h = Math.max((d[s].dano_fisico_total_brl / maxTotal) * chartH, d[s].dano_fisico_total_brl > 0 ? 1 : 0);
          yTop -= h;
          return { s, y: yTop, h };
        });
        const total = setores.reduce((sum, k) => sum + d[k].dano_fisico_total_brl, 0);
        return (
          <g key={r} opacity={r === rpAtivo ? 1 : 0.55}>
            {segs.map(({ s, y, h }) => (
              <rect key={s} x={x} y={y} width={barW} height={h} fill={SETOR_COLORS[s]} />
            ))}
            <rect x={x} y={chartH - Math.max((total / maxTotal) * chartH, 1) + 4} width={barW} height={Math.max((total / maxTotal) * chartH, 1)}
              fill="none" stroke={r === rpAtivo ? "#d97706" : "none"} strokeWidth="2" rx="2" />
            <text x={x + barW / 2} y={yTop - 5} textAnchor="middle" fontSize="8" fill="#374151" fontWeight="bold">
              {total >= 1e9 ? `${(total / 1e9).toFixed(1)}bi` : `${(total / 1e6).toFixed(0)}mi`}
            </text>
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="9" fill={r === rpAtivo ? "#b45309" : "#6b7280"} fontWeight="bold">
              {r}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CotaBarChart({ cotas, resultados, setores, maxTotal, cotaAtiva }: {
  cotas: string[];
  resultados: Record<string, Record<string, CotaSetor>>;
  setores: string[];
  maxTotal: number;
  cotaAtiva: string;
}) {
  const barW = 26;
  const gap = 8;
  const chartH = 150;
  const pL = 46;
  const pB = 24;
  const W = pL + cotas.length * (barW + gap) - gap + 10;
  const fmtAxis = (val: number) => (val >= 1e9 ? `${(val / 1e9).toFixed(1)}bi` : val >= 1e6 ? `${(val / 1e6).toFixed(0)}mi` : "0");

  return (
    <svg viewBox={`0 0 ${W} ${chartH + pB}`} className="w-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = chartH - p * chartH + 4;
        return (
          <g key={i}>
            <line x1={pL - 4} y1={y} x2={W} y2={y} stroke="#e2eef3" strokeWidth={i === 0 ? 1.5 : 0.75} />
            <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#6b7280">{fmtAxis(p * maxTotal)}</text>
          </g>
        );
      })}
      {cotas.map((c, i) => {
        const d = resultados[c];
        const x = pL + i * (barW + gap);
        let yTop = chartH + 4;
        const segs = setores.map((st) => {
          const v = d[st].dano_fisico_brl_poa;
          const h = Math.max((v / maxTotal) * chartH, v > 0 ? 1 : 0);
          yTop -= h;
          return { st, y: yTop, h };
        });
        const crua = setores.reduce((sum, k) => sum + d[k].dano_fisico_brl_jrc_crua, 0);
        const yCrua = chartH + 4 - (crua / maxTotal) * chartH;
        const ativa = c === cotaAtiva;
        return (
          <g key={c} opacity={ativa ? 1 : 0.6}>
            {segs.map(({ st, y, h }) => (
              <rect key={st} x={x} y={y} width={barW} height={h} fill={SETOR_COLORS[st]} />
            ))}
            <line x1={x - 2} x2={x + barW + 2} y1={yCrua} y2={yCrua} stroke="#334155" strokeWidth="1.5" strokeDasharray="3 2" />
            {ativa && <rect x={x - 2} y={yCrua - 2} width={barW + 4} height={chartH + 4 - yCrua + 2} fill="none" stroke="#d97706" strokeWidth="2" rx="2" />}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="8" fill={ativa ? "#b45309" : "#6b7280"} fontWeight="bold">
              {c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── CLIMADA sem curva de dano: valor exposto atingido (Lajeado) ───────────────
