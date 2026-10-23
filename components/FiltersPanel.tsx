"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { COLORS, CNAE_LABELS, DANO_FISICO_MUNICIPIO, DANO_FISICO_RPS } from "@/lib/constants";
import type { DashboardState } from "@/hooks/useDashboard";

interface FiltersPanelProps {
  dash: DashboardState;
}

interface Chip { id: string; label: string; cor: string; on: boolean; toggle: () => void }

export function FiltersPanel({ dash }: FiltersPanelProps) {
  const {
    municipio,
    camadas,
    infraAtivas,
    filtroSetor, setFiltroSetor,
    filtroDep, setFiltroDep,
    filtroTipo, setFiltroTipo,
    showFiltros, setShowFiltros,
    showMancha, setShowMancha,
    showDanoFisico, setShowDanoFisico,
    rpDanoFisico, setRpDanoFisico,
    isVisaoGeral, isCenarioAtivo, temCamadaTabular, cotasAtivo,
    setoresUnicos, depsUnicas, tiposUnicos,
    toggleInfra, toggleCamada,
  } = dash;

  const temPopulacao = camadas.includes("População") && !isVisaoGeral;
  const showPanel = temCamadaTabular && !isVisaoGeral;
  const [abertoFiltros, setAbertoFiltros] = React.useState(false);
  // Celular/tablet: o popover nasce aberto (descobribilidade) e se recolhe sozinho uma vez, a menos
  // que a pessoa interaja com ele antes.
  const interagiu = React.useRef(false);
  const jaRecolheu = React.useRef(false);
  const visivel = showFiltros && showPanel;
  React.useEffect(() => {
    if (!visivel || jaRecolheu.current || window.matchMedia("(min-width: 1024px)").matches) return;
    const t = setTimeout(() => {
      jaRecolheu.current = true;
      if (!interagiu.current) setShowFiltros(false);
    }, 6000);
    return () => clearTimeout(t);
  }, [visivel, setShowFiltros]);
  const nFiltros = [filtroSetor !== "(todos)", filtroDep !== "(todas)", filtroTipo !== "(todas)"].filter(Boolean).length;

  // Camadas viram chips pequenos (cor + ligado/desligado) em grade de 2 colunas, no lugar de um
  // rótulo + botão de largura total para cada uma. Os filtros de dados (selects) ficam recolhidos.
  const camadasMapa: (Chip & { mostrar: boolean })[] = [
    { id: "mancha", label: "Mancha", cor: COLORS.cenario, on: showMancha, toggle: () => setShowMancha(p => !p), mostrar: (isCenarioAtivo && !isVisaoGeral) || cotasAtivo },
    { id: "dano", label: "Dano físico", cor: "#d97706", on: showDanoFisico, toggle: () => setShowDanoFisico(p => !p), mostrar: municipio === DANO_FISICO_MUNICIPIO },
  ];
  const chipsMapa = camadasMapa.filter(c => c.mostrar);
  const heatmaps: Chip[] = [
    { id: "pop", label: "População", cor: "#9333ea", on: temPopulacao, toggle: () => toggleCamada("População") },
    { id: "emp", label: "Empresas", cor: "#1d4ed8", on: dash.showHeatmapEmpresas, toggle: () => dash.setShowHeatmapEmpresas(p => !p) },
    { id: "sau", label: "Saúde", cor: "#b91c1c", on: dash.showHeatmapSaude, toggle: () => dash.setShowHeatmapSaude(p => !p) },
    { id: "edu", label: "Educação", cor: "#15803d", on: dash.showHeatmapEducacao, toggle: () => dash.setShowHeatmapEducacao(p => !p) },
  ];
  const chip = (c: Chip) => (
    <button
      key={c.id}
      onClick={c.toggle}
      aria-pressed={c.on}
      className="h-6 max-lg:h-11 min-w-0 flex items-center gap-1 px-1.5 rounded-full text-[9px] max-lg:text-[11px] font-bold border transition-colors duration-150"
      style={{
        backgroundColor: c.on ? `${c.cor}20` : "transparent",
        borderColor: c.on ? c.cor : "#cbd5e1",
        color: c.on ? c.cor : "#64748b",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: c.on ? c.cor : "#cbd5e1" }} />
      <span className="truncate">{c.label}</span>
    </button>
  );
  const titulo = (txt: string) => <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{txt}</div>;

  return (
    <>
      {showFiltros && showPanel && (
        <div onPointerDown={() => { interagiu.current = true; }} className="print:hidden absolute top-[var(--hb)] lg:top-[100px] right-2 lg:right-4 flex flex-col gap-1.5 p-2 rounded-xl z-10 w-56 lg:w-44 max-h-[calc(100dvh-var(--hb)-var(--dock)-8px)] lg:max-h-[calc(100vh-130px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Filtros de Mapa</span>
            <button onClick={() => setShowFiltros(false)} className="text-slate-500 hover:text-slate-600 font-black text-xs px-1 max-lg:min-h-11 max-lg:min-w-11" aria-label="Fechar filtros">✖</button>
          </div>

          {chipsMapa.length > 0 && (
            <div className="flex flex-col gap-1">
              {titulo("Camadas")}
              <div className="grid grid-cols-2 gap-1">{chipsMapa.map(chip)}</div>
              {showDanoFisico && municipio === DANO_FISICO_MUNICIPIO && (
                <div className="flex flex-wrap gap-1">
                  {DANO_FISICO_RPS.map((rp) => (
                    <button
                      key={rp}
                      onClick={() => setRpDanoFisico(rp)}
                      className="px-1.5 py-0.5 max-lg:min-h-11 max-lg:px-3 rounded text-[9px] max-lg:text-[11px] font-bold border transition-colors duration-150"
                      style={{
                        backgroundColor: rpDanoFisico === rp ? "#d97706" : "transparent",
                        borderColor: rpDanoFisico === rp ? "#d97706" : "#cbd5e1",
                        color: rpDanoFisico === rp ? "#fff" : "#64748b",
                      }}
                    >
                      {rp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {titulo("Heatmaps")}
            <div className="grid grid-cols-2 gap-1">{heatmaps.map(chip)}</div>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-1">
            <button
              onClick={() => setAbertoFiltros(v => !v)}
              aria-expanded={abertoFiltros}
              className="flex items-center justify-between text-[8px] max-lg:text-[10px] max-lg:min-h-11 font-black text-slate-500 uppercase tracking-wider"
            >
              <span>Filtrar dados{nFiltros > 0 && <span className="ml-1 rounded-full bg-[#055071] text-white px-1.5 py-px">{nFiltros}</span>}</span>
              <span className="opacity-70">{abertoFiltros ? "▲" : "▼"}</span>
            </button>
            {abertoFiltros && (
              <>
                {camadas.includes("Empresas") && (
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden shrink-0">
                    <label className="text-[8px] font-bold text-blue-700 uppercase tracking-wider">Setor (empresas)</label>
                    <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                      <SelectTrigger className="h-6 max-lg:h-11 border-blue-200/60 bg-blue-50/50 text-[10px] w-full [&>span]:truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="(todos)">(todos)</SelectItem>
                        {setoresUnicos.map((s: string) => <SelectItem key={s} value={s}>{CNAE_LABELS[s] ?? s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {camadas.includes("Educação") && (
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden shrink-0">
                    <label className="text-[8px] font-bold text-green-700 uppercase tracking-wider">Dependência (escolas)</label>
                    <Select value={filtroDep} onValueChange={setFiltroDep}>
                      <SelectTrigger className="h-6 max-lg:h-11 border-green-200/60 bg-green-50/50 text-[10px] w-full [&>span]:truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="(todas)">(todas)</SelectItem>
                        {depsUnicas.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {camadas.includes("Saúde") && (
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden shrink-0">
                    <label className="text-[8px] font-bold text-red-700 uppercase tracking-wider">Unidade (saúde)</label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="h-6 max-lg:h-11 border-red-200/60 bg-red-50/50 text-[10px] w-full [&>span]:truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="(todas)">(todas)</SelectItem>
                        {tiposUnicos.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          {camadas.includes("Infraestrutura") && infraAtivas.length > 0 && (
            <div className="flex flex-col gap-0.5 w-full overflow-hidden shrink-0">
              <label className="text-[8px] font-bold text-orange-700 uppercase tracking-wider">Infraestrutura</label>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-6 max-lg:h-11 border-orange-200/60 bg-orange-50/50 text-[10px] w-full flex justify-between items-center px-2 rounded transition-colors">
                  <span className="truncate">{`${infraAtivas.length} selecionada(s)`}</span>
                  <span className="text-[8px] opacity-70">▼</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="end">
                  {infraAtivas.map((infraNome) => (
                    <DropdownMenuCheckboxItem
                      key={infraNome}
                      checked={true}
                      onCheckedChange={() => toggleInfra(infraNome)}
                      className="text-[10px] hover:bg-slate-100"
                    >
                      {infraNome}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}

      {!showFiltros && showPanel && (
        <button
          onClick={() => setShowFiltros(true)}
          className="absolute top-[var(--hb)] lg:top-[90px] right-2 lg:right-4 text-slate-800 text-xs font-black px-4 py-2 max-lg:min-h-11 rounded-xl z-20 transition-[opacity,transform] duration-150 active:scale-[0.97] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1"
          style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <SlidersHorizontal size={12} strokeWidth={2.5} /><span className="lg:hidden">Filtros</span><span className="max-lg:hidden">Mostrar Filtros</span>
        </button>
      )}
    </>
  );
}
