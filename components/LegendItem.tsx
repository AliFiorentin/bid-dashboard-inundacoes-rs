interface LegendItemProps { cor: string; label: string; area?: boolean }

export function LegendItem({ cor, label, area }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2 desk:gap-1.5">
      {area
        ? <div className="w-4 h-3 desk:w-3.5 desk:h-2.5 rounded-sm border-2 shrink-0" style={{ borderColor: cor, backgroundColor: `${cor}30` }} />
        : <div className="w-3 h-3 desk:w-2.5 desk:h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
      }
      <span className="text-[10px] desk:text-[9px] text-slate-700 font-medium leading-none truncate max-w-[120px] desk:max-w-[100px]">{label}</span>
    </div>
  );
}
