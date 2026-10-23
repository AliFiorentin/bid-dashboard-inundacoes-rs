"use client";

import type { MedidasMun } from "./types";
import { SETOR_LABEL, SETOR_COLORS, fmtBRL } from "./helpers";

export function MedidasTable({ medidasMun, exposicao }: { medidasMun: MedidasMun; exposicao?: boolean }) {
  const cb = !!medidasMun.custo_beneficio_premissas;
  const fmt2 = (v: number | null | undefined) => (v === null || v === undefined ? "n/d" : v.toFixed(2).replace(".", ","));
  const link = (txt?: string, url?: string | null) =>
    url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{txt} ↗</a> : <span>{txt}</span>;
  return (
    <>
    <div className="overflow-x-auto my-3 rounded-xl border border-[#b3cdd8] shadow-sm">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#055071] text-white">
            <th className="text-left px-3 py-2.5 font-bold">Medida</th>
            <th className="text-right px-3 py-2.5 font-bold">{exposicao ? "Exposição evitada / ano" : "Risco evitado / ano"}</th>
            <th className="text-right px-3 py-2.5 font-bold">Sem cauda assumida</th>
            <th className="text-right px-3 py-2.5 font-bold">Evitado em 2050 / ano</th>
            {cb && (<>
              <th className="text-right px-3 py-2.5 font-bold">Custo</th>
              <th className="text-right px-3 py-2.5 font-bold">{exposicao ? "Custo de equilíbrio" : "Benefício (VP)"}</th>
              <th className="text-right px-3 py-2.5 font-bold">{exposicao ? "B/C máx." : "B/C"}</th>
            </>)}
          </tr>
        </thead>
        <tbody>
          {medidasMun.medidas.map((m, i) => (
            <tr key={m.id} className="border-t border-[#b3cdd8]" style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f0f7fa" }}>
              <td className="px-3 py-2 align-top">
                <p className="font-bold text-slate-800">{m.nome}</p>
                <p className="text-[10px] text-slate-600">{m.mecanismo}</p>
                <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(m.pct_evitado_sem_cauda, 100)}%` }} />
                </div>
                {(() => {
                  const tot = Object.values(m.evitado_por_setor_brl).reduce((x, y) => x + y, 0);
                  if (!(tot > 0)) return null;
                  return (
                    <div className="mt-1.5" title="Evitado por setor (EAI, com a cauda assumida)">
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                        {Object.keys(SETOR_LABEL).map((st) => (
                          <div key={st} style={{ width: `${((m.evitado_por_setor_brl[st] ?? 0) / tot) * 100}%`, backgroundColor: SETOR_COLORS[st] }} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {Object.keys(SETOR_LABEL).filter((st) => (m.evitado_por_setor_brl[st] ?? 0) > 0).map((st) => (
                          <span key={st} className="flex items-center gap-1 text-[10px] text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SETOR_COLORS[st] }} />
                            {SETOR_LABEL[st]} {fmtBRL(m.evitado_por_setor_brl[st])}/ano
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </td>
              <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                <span className="font-bold text-slate-800">{fmtBRL(m.eai_evitado_brl)}</span>
                <span className="block text-[10px] text-slate-600">{m.pct_evitado.toFixed(1).replace(".", ",")}% do EAI</span>
              </td>
              <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                <span className="font-bold text-slate-800">{fmtBRL(m.eai_evitado_sem_cauda_brl)}</span>
                <span className="block text-[10px] text-slate-600">{m.pct_evitado_sem_cauda.toFixed(1).replace(".", ",")}%</span>
              </td>
              <td className="px-3 py-2 align-top text-right whitespace-nowrap font-bold text-slate-800">
                {m.eai_2050_evitado_brl !== null ? fmtBRL(m.eai_2050_evitado_brl) : "n/d"}
              </td>
              {cb && m.custo_beneficio && (<>
                <td className="px-3 py-2 align-top text-right whitespace-nowrap" title={m.custo_beneficio.custo_fonte}>
                  <span className="font-bold text-slate-800">
                    {m.custo_beneficio.custo_min_brl !== undefined ? `${fmtBRL(m.custo_beneficio.custo_min_brl)} a ` : ""}
                    {m.custo_beneficio.custo_brl !== null ? fmtBRL(m.custo_beneficio.custo_brl) : "n/d"}
                  </span>
                  {m.custo_beneficio.setores_com_custo.length > 0 && m.custo_beneficio.setores_com_custo.length < 3 && (
                    <span className="block text-[10px] text-slate-600">só {m.custo_beneficio.setores_com_custo.map((x) => SETOR_LABEL[x]).join(" e ")}</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                  <span className="font-bold text-slate-800">{fmtBRL(m.custo_beneficio.beneficio_vp_sem_cauda_brl)}</span>
                  <span className="block text-[10px] text-slate-600">com cauda: {fmtBRL(m.custo_beneficio.beneficio_vp_brl)}</span>
                </td>
                <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                  {m.custo_beneficio.bc_sem_cauda_max !== undefined ? (
                    <>
                      {/* faixa de custo: o B/C vai do custo mais alto ao mais baixo */}
                      <span className={`font-black ${(m.custo_beneficio.bc_sem_cauda ?? 0) >= 1 ? "text-[#2d7a2d]" : m.custo_beneficio.bc_sem_cauda_max >= 1 ? "text-amber-800" : "text-[#b23a2b]"}`}>
                        {fmt2(m.custo_beneficio.bc_sem_cauda)} a {fmt2(m.custo_beneficio.bc_sem_cauda_max)}
                      </span>
                      <span className="block text-[10px] text-slate-600">com cauda: {fmt2(m.custo_beneficio.bc)} a {fmt2(m.custo_beneficio.bc_max)}</span>
                    </>
                  ) : (
                    <>
                      <span className={`font-black ${(m.custo_beneficio.bc_sem_cauda ?? 0) >= 1 ? "text-[#2d7a2d]" : "text-[#b23a2b]"}`}>{fmt2(m.custo_beneficio.bc_sem_cauda)}</span>
                      <span className="block text-[10px] text-slate-600">com cauda: {fmt2(m.custo_beneficio.bc)}</span>
                    </>
                  )}
                </td>
              </>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm my-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83] mb-2">Fontes dos parâmetros e dos custos</p>
      <ul className="flex flex-col gap-2 text-[11px] text-slate-600 leading-relaxed">
        {medidasMun.medidas.map((m) => (
          <li key={m.id}>
            <span className="font-bold text-slate-800">{m.nome}.</span>{" "}
            <span className="text-slate-600">Parâmetro:</span> {link(m.fonte, m.fonte_url)}.
            {m.custo_beneficio && (<>
              {" "}<span className="text-slate-600">Custo:</span> {m.custo_beneficio.custo_descricao ?? "n/d"} ({link(m.custo_beneficio.custo_fonte, m.custo_beneficio.custo_fonte_url)}).
            </>)}
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}
