import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KPIRowProps {
  titulo: string;
  valor: string | number;
  sub: string;
  delta?: string;
  cor?: string;
}

export function KPIRow({ titulo, valor, sub, delta, cor }: KPIRowProps) {
  return (
    <Card
      size="sm"
      className="py-0 gap-0 print:break-inside-avoid"
      style={{ borderLeftWidth: 3, borderLeftColor: cor ?? "#055071" }}
    >
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider leading-tight text-muted-foreground">{titulo}</span>
          <span className="text-[10px] leading-none mt-0.5 text-muted-foreground/60">{sub}</span>
          {delta && (
            <Badge variant="outline" className="mt-1.5 text-[9px] font-semibold w-fit">
              {delta}
            </Badge>
          )}
        </div>
        <span className="text-2xl font-black shrink-0 leading-none text-card-foreground">{valor}</span>
      </CardContent>
    </Card>
  );
}
