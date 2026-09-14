"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, GraduationCap, HeartPulse, Wrench, Sprout } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MUNICIPIOS, CENARIOS_CONFIG, INFRAESTRUTURA_CONFIG, AGRI_BOUNDS } from "@/lib/constants";
import type { DashboardState } from "@/hooks/useDashboard";

interface DashboardHeaderProps {
  dash: DashboardState;
}

// Escala fluida com a largura da tela (vw) -- em telas estreitas (notebook)
// logos/fontes/espacamentos encolhem o suficiente pra tudo caber numa linha
// só, sem o header quebrar em duas (o que reduz a altura util do mapa).
const LOGO_H = "clamp(20px, 1.7vw, 28px)";
const LOGO_W = "clamp(40px, 3.4vw, 56px)";
const LOGO_GAP = "clamp(2px, 0.35vw, 6px)";
const TITLE_SIZE = "clamp(10px, 0.95vw, 14px)";
const SUBTITLE_SIZE = "clamp(6.5px, 0.6vw, 9px)";
const SELECT_LABEL_SIZE = "clamp(7px, 0.65vw, 9px)";
const SELECT_TRIGGER_SIZE = "clamp(9px, 0.85vw, 11px)";
const SELECT_H = "clamp(18px, 1.7vw, 24px)";
const BTN_SIZE = "clamp(7.5px, 0.75vw, 10px)";
const BTN_H = "clamp(18px, 1.7vw, 24px)";
const SECTION_GAP = "clamp(4px, 0.9vw, 8px)";
const SELECT_GAP = "clamp(12px, 2vw, 24px)";

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
    <header ref={headerRef} className="absolute top-1.5 left-3 right-3 flex flex-wrap items-center z-20 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)", paddingInline: "0.625rem", paddingBlock: "0.25rem", gap: SECTION_GAP }}>
      <div className="flex items-center border-r border-slate-200/60 shrink-0" style={{ gap: LOGO_GAP, paddingRight: SECTION_GAP }}>
        {/* Caixa fixa igual para as 4 logos: BID/GPEA são bem mais largas que
            altas e CIEX/IPH mais quadradas/altas -- só igualar a altura (como
            antes) deixava CIEX e IPH visualmente menores. `fill` +
            object-contain é o jeito confiável de encaixar proporções bem
            diferentes numa caixa fixa com next/image -- w-auto/h-auto por si
            só cortava a CIEX. Tamanho em clamp() (vw) pra nao forcar o header
            a quebrar em duas linhas em telas mais estreitas. */}
        <div className="relative shrink-0" style={{ height: LOGO_H, width: LOGO_W }}>
          <Image src="/BID.png" alt="BID Logo" fill className="object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
        <div className="relative shrink-0" style={{ height: LOGO_H, width: LOGO_W }}>
          <Image src="/GPEA.png" alt="GPEA Logo" fill className="object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
        <div className="relative shrink-0" style={{ height: LOGO_H, width: LOGO_W }}>
          <Image src="/CIEX2.png" alt="CIEX Logo" fill className="object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
        <div className="relative shrink-0" style={{ height: LOGO_H, width: LOGO_W }}>
          <Image src="/IPH.jpg" alt="IPH Logo" fill className="object-contain rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
        <div className="flex flex-col justify-center min-w-0" style={{ paddingLeft: LOGO_GAP, maxWidth: "clamp(130px, 15vw, 260px)" }}>
          {/* Sem whitespace-nowrap de propósito: com titulo curto o texto cabe
              numa linha; em telas mais estreitas ele quebra em 2 linhas em vez
              de forçar o header inteiro (selects/botões) pra baixo -- essa
              caixa cresce só em altura, sem empurrar o resto pra 2a linha. */}
          <h1 className="font-black text-slate-800 leading-tight" style={{ fontSize: TITLE_SIZE }}>Avaliação de Impactos Socioeconômicos</h1>
          <span className="text-slate-500 font-medium tracking-wider uppercase whitespace-nowrap" style={{ fontSize: SUBTITLE_SIZE }}>Painel de Monitoramento</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 shrink-0 mr-auto">
        <Link
          href="/danos"
          className="h-5 px-2 rounded-md text-[10px] font-bold border border-slate-200/80 bg-white/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-colors duration-150 flex items-center gap-1 shrink-0"
          title="Ver danos operacionais estimados"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          Danos
        </Link>
        <Link
          href="/metodologia"
          className="h-5 px-2 rounded-md text-[10px] font-bold border border-slate-200/80 bg-white/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-colors duration-150 flex items-center gap-1 shrink-0"
          title="Ver metodologia de cálculo"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Metodologia
        </Link>
      </div>

      <div className="flex items-center" style={{ gap: SELECT_GAP }}>
        <div className="flex flex-col gap-0 shrink-0" style={{ width: "clamp(122px, 9vw, 160px)" }}>
          <label className="font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ fontSize: SELECT_LABEL_SIZE }}>Município</label>
          <Select value={municipio} onValueChange={setMunicipio}>
            <SelectTrigger className="bg-slate-50/80 w-full min-w-0" style={{ height: SELECT_H, fontSize: SELECT_TRIGGER_SIZE }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Visão Geral RS" className="font-bold text-blue-600">Visão Geral RS</SelectItem>
              {MUNICIPIOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-0 border-r border-slate-200/60 shrink-0" style={{ width: "clamp(155px, 13vw, 210px)", paddingRight: SELECT_GAP }}>
          <label className="font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ fontSize: SELECT_LABEL_SIZE }}>Cenário de Inundação</label>
          <Select value={cenario} onValueChange={setCenario} disabled={isVisaoGeral}>
            <SelectTrigger className="bg-slate-50/80 w-full min-w-0" style={{ height: SELECT_H, fontSize: SELECT_TRIGGER_SIZE }}><SelectValue placeholder={isVisaoGeral ? "Piores Cenários" : "(nenhum)"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="(nenhum)">(Ver Total)</SelectItem>
              {(CENARIOS_CONFIG[municipio] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center" style={{ gap: "clamp(2px, 0.4vw, 4px)" }}>
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
            className="font-black gap-0.5 shrink-0"
            style={{ fontSize: BTN_SIZE, height: BTN_H, paddingInline: "clamp(0.3rem, 0.6vw, 0.5rem)" }}
          >
            {icon}{camada}
          </Button>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isVisaoGeral || !possuiInfra}>
            <Button
              variant={camadas.includes("Infraestrutura") && infraAtivas.length > 0 ? "default" : "outline"}
              size="xs"
              className="font-black gap-1 shrink-0"
              style={{ fontSize: BTN_SIZE, height: BTN_H, paddingInline: "clamp(0.3rem, 0.6vw, 0.5rem)" }}
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
