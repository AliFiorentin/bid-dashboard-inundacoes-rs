interface BarServicoProps {
  label: string;
  value: number;
  total: number;
  cor: string;
}

export function BarServico({ label, value, total, cor }: BarServicoProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[10px] font-bold shrink-0 text-slate-700">
          {value.toLocaleString("pt-BR")} <span className="font-normal text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${cor}25` }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}
