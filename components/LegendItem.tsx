interface LegendItemProps { cor: string; label: string; area?: boolean }

export function LegendItem({ cor, label, area }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      {area
        ? <div className="w-4 h-3 rounded-sm border-2 shrink-0" style={{ borderColor: cor, backgroundColor: `${cor}30` }} />
        : <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cor }} />
      }
      <span className="text-[10px] text-slate-700 font-medium leading-none truncate max-w-[120px]">{label}</span>
    </div>
  );
}
