"use client";

import { TrendingDown, FlaskConical } from "lucide-react";
import { DIAS_OPCOES, RP_ANOS, RP_PROBABILIDADE } from "./helpers";
import type { DanosCtx } from "./ctx";

export function DanosToolbar({ ctx }: { ctx: DanosCtx }) {
  const { aba, cotaAtiva, cotaAtivo, cotasDisponiveis, dadosClimada, dadosCotas, dias, munClimadaAtivo, munsClimada, rpAtivo, rpsDisponiveis, setAba, setCota, setDias, setMunClimada, setRp, setVisao, visao } = ctx;
  return (
      <div role="navigation" aria-label="Município, visão e cota" className="sticky top-0 z-30 bg-white/90 border-b border-[#b3cdd8] shadow-sm print:hidden"
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-2.5 flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setAba("dala")}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-black border-2 transition-all duration-150 flex items-center gap-2 ${
                aba === "dala"
                  ? "bg-[#055071] text-white border-[#055071] shadow-md scale-[1.02]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#055071] hover:text-[#055071]"
              }`}
            >
              <TrendingDown size={16} strokeWidth={2.5} />
              Danos Operacionais
            </button>
            {munsClimada.length > 0 && (
              <button
                onClick={() => setAba("climada")}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-black border-2 transition-all duration-150 flex items-center gap-2 ${
                  aba === "climada"
                    ? "bg-amber-700 text-white border-amber-700 shadow-md scale-[1.02]"
                    : "bg-white text-amber-800 border-amber-200 hover:border-amber-400"
                }`}
              >
                <FlaskConical size={16} strokeWidth={2.5} />
                Danos Físicos
              </button>
            )}
          </div>

          <div className="w-px self-stretch bg-slate-200 hidden sm:block" />

          {aba === "dala" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83]">
                  Duração da interrupção
                </span>
                <span className="text-[9px] text-slate-600">(dias efetivos)</span>
              </div>
              <div className="flex gap-1.5">
                {DIAS_OPCOES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDias(d)}
                    className={`px-3 py-1 max-lg:min-h-11 rounded-full text-[11px] font-black border transition-all duration-150 ${
                      dias === d
                        ? "bg-[#055071] text-white border-[#055071] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#055071] hover:text-[#055071]"
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1.5 whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4d9e3a] animate-pulse" />
                <span className="text-[10px] text-slate-600 font-medium" title="f = fator de interrupção: fração do ano em que a atividade ficou parada (dias efetivos ÷ 365). Ver 'O que é o f' em Notas e Ressalvas.">
                  f = {(dias / 365).toFixed(4)} (fração do ano parada)
                </span>
              </div>
            </>
          ) : (
            <>
              {munsClimada.length > 1 && (
                <div className="flex gap-1.5">
                  {munsClimada.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMunClimada(m)}
                      className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                        munClimadaAtivo === m
                          ? "bg-[#055071] text-white border-[#055071] shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#055071] hover:text-[#055071]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              {dadosClimada && dadosCotas && (
                <div className="flex gap-1.5">
                  {([["rp", "CLIMADA"], ["cota", "Por cota"]] as const).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setVisao(v)}
                      className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                        visao === v
                          ? "bg-amber-700 text-white border-amber-700 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {cotaAtivo ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83]">Cota do rio</span>
                    <span className="text-[9px] text-slate-600">(m)</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {cotasDisponiveis.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCota(c)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                          cotaAtiva === c
                            ? "bg-amber-700 text-white border-amber-700 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-800"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] text-slate-600 font-medium">
                      Sem período de retorno: sem EAI
                    </span>
                  </div>
                </>
              ) : (
              <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83]">
                  Período de retorno
                </span>
                <span className="text-[9px] text-slate-600">{dadosClimada?.rp_por_cota ? "(derivado das cotas do rio)" : "(cenário sintético CLIMADA)"}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {rpsDisponiveis.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRp(r)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 ${
                      rpAtivo === r
                        ? "bg-amber-700 text-white border-amber-700 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-800"
                    }`}
                    title={`Período de retorno de ${RP_ANOS[r]}, ${RP_PROBABILIDADE[r]} de chance/ano de ocorrer`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] text-slate-600 font-medium">
                  {dadosClimada?.rp_por_cota ? "RPs convertidos em cota por análise de frequência" : "RP200 é a âncora de calibração usada pelo CLIMADA"}
                </span>
              </div>
              </>
              )}
            </>
          )}
        </div>
      </div>
  );
}
