"use client";

import React from "react";
import Image from "next/image";
import { Building2, GraduationCap, HeartPulse, Wrench, Sprout } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MUNICIPIOS, CENARIOS_CONFIG, INFRAESTRUTURA_CONFIG, AGRI_BOUNDS } from "@/lib/constants";
import type { DashboardState } from "@/hooks/useDashboard";

interface DashboardHeaderProps {
  dash: DashboardState;
}

export function DashboardHeader({ dash }: DashboardHeaderProps) {
  const {
    municipio, setMunicipio,
    cenario, setCenario,
    camadas,
    infraAtivas,
    isVisaoGeral, possuiInfra,
    toggleCamada, toggleInfra, toggleMenuInfra,
    headerRef,
  } = dash;

  return (
    <header ref={headerRef} className="absolute top-1.5 left-3 right-3 px-2.5 py-1 flex flex-wrap gap-2 items-center z-20 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-1.5 border-r border-slate-200/60 pr-2.5">
        <Image src="/BID.png" alt="BID Logo" width={64} height={24} className="h-5 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <Image src="/GPEA.png" alt="GPEA Logo" width={64} height={24} className="h-5 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <Image src="/CIEX2.png" alt="CIEX Logo" width={64} height={24} className="h-5 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="pl-1.5 flex flex-col justify-center">
          <h1 className="text-sm font-black text-slate-800 leading-tight">Avaliação de Impactos Socioeconômicos</h1>
          <span className="text-[9px] text-slate-500 font-medium tracking-wider uppercase">Painel de Monitoramento</span>
        </div>
      </div>
      <a
        href="/metodologia"
        target="_blank"
        rel="noopener noreferrer"
        className="h-6 px-2 rounded-md text-[10px] font-bold border border-slate-200/80 bg-white/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-colors duration-150 flex items-center gap-1 shrink-0 mr-auto"
        title="Ver metodologia de cálculo"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Metodologia
      </a>

      <div className="flex gap-1.5 items-center">
        <div className="flex flex-col gap-0 w-32">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Município</label>
          <Select value={municipio} onValueChange={setMunicipio}>
            <SelectTrigger className="bg-slate-50/80 h-6 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Visão Geral RS" className="font-bold text-blue-600">Visão Geral RS</SelectItem>
              {MUNICIPIOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-0 w-36 border-r border-slate-200/60 pr-2.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cenário de Inundação</label>
          <Select value={cenario} onValueChange={setCenario} disabled={isVisaoGeral}>
            <SelectTrigger className="bg-slate-50/80 h-6 text-[11px]"><SelectValue placeholder={isVisaoGeral ? "Piores Cenários" : "(nenhum)"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="(nenhum)">(Ver Total)</SelectItem>
              {(CENARIOS_CONFIG[municipio] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-1 items-center">
        {([
          { camada: "Empresas", icon: <Building2 size={10} strokeWidth={2.5} /> },
          { camada: "Educação", icon: <GraduationCap size={10} strokeWidth={2.5} /> },
          { camada: "Saúde", icon: <HeartPulse size={10} strokeWidth={2.5} /> },
          ...((isVisaoGeral || AGRI_BOUNDS[municipio]) ? [{ camada: "Agricultura", icon: <Sprout size={10} strokeWidth={2.5} /> }] : []),
        ] as { camada: string; icon: React.ReactNode }[]).map(({ camada, icon }) => (
          <Button
            key={camada}
            variant={camadas.includes(camada) ? "default" : "outline"}
            size="xs"
            onClick={() => toggleCamada(camada)}
            className="text-[10px] font-black gap-0.5 h-6 px-2"
          >
            {icon}{camada}
          </Button>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isVisaoGeral || !possuiInfra}>
            <Button
              variant={camadas.includes("Infraestrutura") && infraAtivas.length > 0 ? "default" : "outline"}
              size="xs"
              className="text-xs font-black gap-1"
            >
              <Wrench size={11} strokeWidth={2.5} />Infraestrutura {infraAtivas.length > 0 && `(${infraAtivas.length})`}
              <span className="text-[7px] opacity-70">▼</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <button onClick={toggleMenuInfra} className="w-full text-left text-xs font-bold px-2 py-1 mb-1 text-slate-500 hover:bg-slate-100 border-b border-slate-200/60 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-slate-100">
              {camadas.includes("Infraestrutura") ? "Ocultar Camada" : "Exibir Camada"}
            </button>
            {(INFRAESTRUTURA_CONFIG[municipio] || []).map((infraNome) => (
              <DropdownMenuCheckboxItem
                key={infraNome}
                checked={infraAtivas.includes(infraNome)}
                onCheckedChange={() => toggleInfra(infraNome)}
                className="text-xs hover:bg-slate-100"
              >
                {infraNome}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
