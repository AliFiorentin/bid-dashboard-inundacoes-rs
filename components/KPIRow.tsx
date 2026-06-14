interface KPIRowProps {
  titulo: string;
  valor: string | number;
  sub: string;
  delta?: string;
  cor?: string;
}

export function KPIRow({ titulo, valor, sub, delta, cor }: KPIRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 print:break-inside-avoid"
      style={{ borderLeft: `3px solid ${cor ?? "#055071"}` }}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider leading-tight text-slate-500">{titulo}</span>
        <span className="text-[10px] leading-none mt-0.5 text-slate-400">{sub}</span>
        {delta && (
          <span className="text-[9px] font-semibold mt-1.5 inline-block px-1.5 py-0.5 rounded w-fit bg-white border border-slate-200/80 text-slate-700">
            {delta}
          </span>
        )}
      </div>
      <span className="text-2xl font-black shrink-0 leading-none text-slate-800">{valor}</span>
    </div>
  );
}
