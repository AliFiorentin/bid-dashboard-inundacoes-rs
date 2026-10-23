"use client";

import type { DanosCtx } from "./ctx";

export function DanosIndice({ ctx }: { ctx: DanosCtx }) {
  const { aba, cotaAtivo, expo, semCurva } = ctx;
  return (
        <aside className="hidden lg:block w-52 shrink-0 print:hidden">
          <div className="sticky top-[56px] flex flex-col gap-3">
            <nav className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83] mb-2">Índice</p>
              <ol className="flex flex-col gap-1">
                {(aba === "dala" ? [
                  ["#resumo",      "1. Resumo Geral"],
                  ["#cenarios",    "2. Análise por Cenário"],
                  ["#sensib",      "3. Sensibilidade por Duração"],
                  ["#notas",       "4. Notas e Ressalvas"],
                ] : semCurva ? (cotaAtivo ? [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-tabela",       "2. Valor por Cota"],
                  ...(expo?.detalhe ? [
                    ["#c-empresas",   "3. Empresas"],
                    ["#c-saude",      "4. Saúde"],
                    ["#c-educacao",   "5. Educação"],
                    ["#c-agricultura","6. Agricultura"],
                  ] : []),
                  ["#c-limitacoes",   expo?.detalhe ? "7. Limitações" : "3. Limitações"],
                ] : [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-faixas",       "2. Faixas de Profundidade"],
                  ["#c-eai",          "3. Exposição Anual Esperada"],
                  ["#c-projecao",     "4. Projeção 2025→2050"],
                  ["#c-comparativo",  "5. Comparativo por RP"],
                  ["#c-medidas",      "6. Medidas de Adaptação"],
                  ["#c-limitacoes",   "7. Limitações"],
                ]) : cotaAtivo ? [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-curva",        "2. Dano por Cota"],
                  ["#c-tabela",       "3. Tabela por Cota"],
                  ["#c-limitacoes",   "4. Limitações"],
                ] : [
                  ["#c-resumo",       "1. Resumo"],
                  ["#c-eai",          "2. Risco Anual Esperado"],
                  ["#c-projecao",     "3. Projeção 2025→2050"],
                  ["#c-comparativo",  "4. Comparativo por RP"],
                  ["#c-medidas",      "5. Medidas de Adaptação"],
                  ["#c-limitacoes",   "6. Limitações"],
                ] as [string, string][]).map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-[11px] text-[#055071] font-medium hover:underline underline-offset-4 transition-colors duration-150 leading-snug block py-0.5">
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>
  );
}
