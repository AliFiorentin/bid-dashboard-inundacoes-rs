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
      className="rounded-lg overflow-hidden print:break-inside-avoid"
      style={{
        border: "1px solid rgba(5,80,113,0.15)",
      }}
    >
      <div
        className="flex items-center px-3 py-1.5"
        style={{
          background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)",
          borderLeft: `3px solid ${cor ?? "rgba(255,255,255,0.4)"}`,
        }}
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-white leading-none">
          {titulo}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] leading-none text-muted-foreground">{sub}</span>
          {delta && (
            <span className="mt-1 text-[9px] font-medium text-muted-foreground">{delta}</span>
          )}
        </div>
        <span className="text-2xl font-black shrink-0 leading-none" style={{ color: "#022536" }}>
          {valor}
        </span>
      </div>
    </div>
  );
}
