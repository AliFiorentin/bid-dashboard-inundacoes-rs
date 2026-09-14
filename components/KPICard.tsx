import React from "react";
import { PANEL_CARD_BG } from "@/lib/constants";

interface KPICardMetric {
  titulo?: string;
  valor: string | number;
  sub: string;
  delta?: string;
}

interface KPICardProps {
  titulo: string;
  cor?: string;
  principal: KPICardMetric;
  secundarios?: KPICardMetric[];
  children?: React.ReactNode;
}

/**
 * Card único por tipo de infra: um cabeçalho só (evita repetir "Ruas Únicas"
 * dentro de "Eixos Logradouros" -- são a mesma coisa, só subdividida), a
 * métrica principal em destaque e as demais como linhas compactas abaixo.
 * `children` fica dentro da mesma caixa (ex.: lista de "Ruas Atingidas").
 */
export function KPICard({ titulo, cor, principal, secundarios, children }: KPICardProps) {
  return (
    <div
      className="rounded-lg overflow-hidden print:break-inside-avoid"
      style={{ border: "1px solid rgba(5,80,113,0.15)" }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5"
        style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}
      >
        {cor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />}
        <span className="text-[10px] font-black uppercase tracking-wider text-white leading-none">
          {titulo}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2.5" style={{ backgroundColor: PANEL_CARD_BG }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold leading-none" style={{ color: "#0a4a63" }}>{principal.sub}</span>
            {principal.delta && (
              <span className="mt-1 text-[10px] font-semibold leading-none" style={{ color: "#3d6478" }}>{principal.delta}</span>
            )}
          </div>
          <span className="text-2xl font-black shrink-0 leading-none" style={{ color: "#022536" }}>
            {principal.valor}
          </span>
        </div>
        {secundarios?.map((s) => (
          <div key={s.titulo} className="flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5" style={{ backgroundColor: PANEL_CARD_BG }}>
            <div className="flex flex-col min-w-0">
              {s.titulo && <span className="text-[9px] font-bold uppercase tracking-wide leading-none" style={{ color: "#0a4a63" }}>{s.titulo}</span>}
              <span className="mt-0.5 text-[9.5px] font-semibold" style={{ color: "#3d6478" }}>{s.delta ?? s.sub}</span>
            </div>
            <span className="text-sm font-black shrink-0 leading-none" style={{ color: "#022536" }}>
              {s.valor}
            </span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
