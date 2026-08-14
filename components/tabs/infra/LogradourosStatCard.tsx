import React from "react";
import type { Feature, FeatureCollection } from "geojson";
import { ChevronDown } from "lucide-react";
import { INFRA_COLORS, infraLabel } from "@/lib/constants";
import { compactoBr, calcPct } from "@/lib/geo-utils";
import { KPIRow } from "@/components/KPIRow";
import { BarServico } from "@/components/ui/BarServico";
import { cn } from "@/lib/utils";
import type { InfraMetricas } from "@/hooks/useDashboard";

const PANEL_HDR = { background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" } as const;
const PANEL_GLASS: React.CSSProperties = { border: "1px solid rgba(5,80,113,0.15)" };

interface Props {
  infraNome: string; // "Eixos Logradouros" (Porto Alegre) ou "Logradouros" (Rio Grande/Lajeado)
  metricas?: InfraMetricas;
  metricasBase?: InfraMetricas;
  mostraImpacto: boolean;
  mapaAtivo: boolean;
  onToggleMapa: () => void;
  /** Nomes reais das ruas atingidas — só existe quando a camada está de fato
   *  carregada no mapa (mapaAtivo=true); infraStats não guarda nomes, só
   *  contagens, então a lista fica indisponível até o usuário marcar
   *  "Exibir no mapa". */
  atingidoReal?: FeatureCollection;
  showLista: boolean;
  setShowLista: (v: boolean | ((p: boolean) => boolean)) => void;
}

/**
 * Unifica as duas versões de "Logradouros" que o app já tinha em componentes
 * separados (LogradourosSection para Rio Grande/Lajeado, o case "Eixos
 * Logradouros" dentro de GenericInfraSection para Porto Alegre) — os dois
 * KPIs (segmentos + ruas únicas) vêm do mesmo formato em infra_stats.json,
 * então um componente só cobre ambos. Nome de exibição sempre "Logradouros"
 * via infraLabel; o nome interno continua distinto por município (ver
 * comentário em lib/constants.ts).
 */
export function LogradourosStatCard({
  infraNome,
  metricas,
  metricasBase,
  mostraImpacto,
  mapaAtivo,
  onToggleMapa,
  atingidoReal,
  showLista,
  setShowLista,
}: Props) {
  const cor = INFRA_COLORS[infraNome] ?? "#e67e22";
  const atual = mostraImpacto ? metricas : metricasBase;
  const base = metricasBase;

  const lista = React.useMemo(() => {
    if (!mostraImpacto || !atingidoReal?.features) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    atingidoReal.features.forEach((f: Feature) => {
      const p = f.properties as Record<string, unknown>;
      // Duas fontes de nome, conforme o schema do município (ver
      // countRuasUnicas/getRuasListPOA em lib/geo-utils.ts).
      const tipo = String(p?.tipo ?? p?.CDIDECAT ?? "").trim().toUpperCase();
      const nome = String(p?.nome ?? p?.NMIDELOG ?? "").trim().toUpperCase();
      const label = [tipo, nome].filter(Boolean).join(" ");
      if (label && !seen.has(label)) { seen.add(label); out.push(label); }
    });
    return out.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [mostraImpacto, atingidoReal]);

  return (
    <div className="col-span-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2" style={PANEL_HDR}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <h3 className="text-[10px] font-black uppercase tracking-wider text-white flex-1">
          {infraLabel(infraNome)}
        </h3>
        <label className="flex items-center gap-1 text-[8px] font-bold text-white/90 cursor-pointer select-none shrink-0">
          <input type="checkbox" checked={mapaAtivo} onChange={onToggleMapa} className="h-3 w-3 accent-white cursor-pointer" />
          Exibir no mapa
        </label>
      </div>

      {!base ? (
        <p className="text-xs text-center py-2 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          <KPIRow
            titulo="Segmentos"
            cor={cor}
            valor={compactoBr(atual?.n ?? 0, 0)}
            sub={mostraImpacto ? "Atingidos" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(base.n, 0)} (${calcPct(atual?.n ?? 0, base.n)})` : undefined}
          />
          <KPIRow
            titulo="Ruas Únicas"
            cor={cor}
            valor={compactoBr(atual?.ruas ?? 0, 0)}
            sub={mostraImpacto ? "Atingidas" : "Total"}
            delta={mostraImpacto ? `de ${compactoBr(base.ruas ?? 0, 0)} (${calcPct(atual?.ruas ?? 0, base.ruas ?? 0)})` : undefined}
          />

          {mostraImpacto && !mapaAtivo && (
            <p className="text-[9px] italic text-muted-foreground">
              Marque &quot;Exibir no mapa&quot; para ver a lista de ruas atingidas pelo nome.
            </p>
          )}
          {mostraImpacto && mapaAtivo && lista.length > 0 && (
            <div className="rounded-lg overflow-hidden">
              <button
                onClick={() => setShowLista((p) => !p)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-white"
                style={PANEL_HDR}
              >
                <span>Ruas Atingidas ({lista.length})</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showLista && "rotate-180")} />
              </button>
              {showLista && (
                <div
                  className="flex flex-col gap-0.5 max-h-52 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#055071] [&::-webkit-scrollbar-thumb]:rounded-full"
                  style={{ ...PANEL_GLASS, scrollbarColor: "#055071 transparent" }}
                >
                  {lista.map((label, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground" title={label}>{label}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {((base.drenagem ?? 0) > 0 || (base.iluminacao ?? 0) > 0) && (
            <>
              <div className="flex items-center px-2.5 py-1 rounded-lg mt-1" style={PANEL_HDR}>
                <h4 className="text-[9px] font-black uppercase tracking-wider text-white">Cobertura de Serviços</h4>
              </div>
              <div className="flex flex-col gap-2">
                {(base.drenagem ?? 0) > 0 && (
                  <BarServico label="Drenagem" value={mostraImpacto ? (atual?.drenagem ?? 0) : (base.drenagem ?? 0)} total={base.n} cor={cor} />
                )}
                {(base.iluminacao ?? 0) > 0 && (
                  <BarServico label="Iluminação" value={mostraImpacto ? (atual?.iluminacao ?? 0) : (base.iluminacao ?? 0)} total={base.n} cor={cor} />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
