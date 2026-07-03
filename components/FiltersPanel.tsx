"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { COLORS, CNAE_LABELS } from "@/lib/constants";
import type { DashboardState } from "@/hooks/useDashboard";

interface FiltersPanelProps {
  dash: DashboardState;
}

export function FiltersPanel({ dash }: FiltersPanelProps) {
  const {
    camadas,
    infraAtivas,
    filtroSetor, setFiltroSetor,
    filtroDep, setFiltroDep,
    filtroTipo, setFiltroTipo,
    showFiltros, setShowFiltros,
    showMancha, setShowMancha,
    isVisaoGeral, isCenarioAtivo, temCamadaTabular,
    setoresUnicos, depsUnicas, tiposUnicos,
    toggleInfra, toggleCamada,
  } = dash;

  const temPopulacao = camadas.includes("População") && !isVisaoGeral;
  const showPanel = temCamadaTabular && !isVisaoGeral;

  return (
    <>
      {showFiltros && showPanel && (
        <div className="print:hidden absolute top-[100px] right-4 flex flex-col gap-2 p-2.5 rounded-xl z-10 w-40 max-h-[calc(100vh-130px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex justify-between items-center mb-0.5 border-b border-slate-200/60 pb-1.5">
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Filtros de Mapa</span>
            <button onClick={() => setShowFiltros(false)} className="text-slate-400 hover:text-slate-600 font-black text-xs px-1">✖</button>
          </div>

          {camadas.includes("Empresas") && (
            <div className="flex flex-col gap-1 w-full overflow-hidden shrink-0">
              <label className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Setor (Empresas)</label>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="h-7 border-blue-200/60 bg-blue-50/50 text-[10px] w-full [&>span]:truncate">
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
            <div className="flex flex-col gap-1 w-full overflow-hidden shrink-0">
              <label className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Dependência (Escolas)</label>
              <Select value={filtroDep} onValueChange={setFiltroDep}>
                <SelectTrigger className="h-7 border-green-200/60 bg-green-50/50 text-[10px] w-full [&>span]:truncate">
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
            <div className="flex flex-col gap-1 w-full overflow-hidden shrink-0">
              <label className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Unidade (Saúde)</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-7 border-red-200/60 bg-red-50/50 text-[10px] w-full [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="(todas)">(todas)</SelectItem>
                  {tiposUnicos.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {camadas.includes("Infraestrutura") && infraAtivas.length > 0 && (
            <div className="flex flex-col gap-1 w-full overflow-hidden shrink-0">
              <label className="text-[9px] font-bold text-orange-700 uppercase tracking-wider">Infraestrutura</label>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-7 border-orange-200/60 bg-orange-50/50 text-[10px] w-full flex justify-between items-center px-2 rounded transition-colors">
                  <span className="truncate">
                    {infraAtivas.length === 0 ? "Nenhuma selecionada" : `${infraAtivas.length} selecionada(s)`}
                  </span>
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

          {isCenarioAtivo && !isVisaoGeral && (
            <div className="flex flex-col gap-1 w-full shrink-0">
              <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: COLORS.cenario }}>Mancha de Inundação</label>
              <button
                onClick={() => setShowMancha(p => !p)}
                className="h-7 w-full rounded text-[10px] font-bold border transition-colors duration-150"
                style={{
                  backgroundColor: showMancha ? `${COLORS.cenario}20` : "transparent",
                  borderColor: showMancha ? COLORS.cenario : "#cbd5e1",
                  color: showMancha ? COLORS.cenario : "#64748b",
                }}
              >
                {showMancha ? "Visível" : "Oculta"}
              </button>
            </div>
          )}

          {/* Heatmap de População */}
          {!isVisaoGeral && (
            <div className="flex flex-col gap-1 w-full shrink-0">
              <label className="text-[9px] font-bold text-purple-700 uppercase tracking-wider">Heatmap Pop.</label>
              <button
                onClick={() => toggleCamada("População")}
                className="h-7 w-full rounded text-[10px] font-bold border transition-colors duration-150"
                style={{
                  backgroundColor: temPopulacao ? "#9333ea20" : "transparent",
                  borderColor: temPopulacao ? "#9333ea" : "#cbd5e1",
                  color: temPopulacao ? "#9333ea" : "#64748b",
                }}
              >
                {temPopulacao ? "Visível" : "Oculto"}
              </button>
            </div>
          )}
        </div>
      )}

      {!showFiltros && showPanel && (
        <button
          onClick={() => setShowFiltros(true)}
          className="absolute top-[90px] right-4 text-slate-800 text-xs font-black px-4 py-2 rounded-xl z-20 transition-[opacity,transform] duration-150 active:scale-[0.97] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1"
          style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <SlidersHorizontal size={12} strokeWidth={2.5} />Mostrar Filtros
        </button>
      )}
    </>
  );
}
