"use client";

import React, { useState } from "react";
import Image from "next/image";

export function WelcomeModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
      style={{ backgroundColor: "rgba(5,30,45,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "rgba(255,255,255,0.97)", border: "0.5px solid rgba(255,255,255,0.7)", boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)" }}
      >
        {/* Fechar */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors duration-150"
          aria-label="Fechar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white rounded-md px-2 py-1 flex items-center">
              <Image src="/BID.png"   alt="BID"  width={48} height={20} className="h-5 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
            <div className="bg-white rounded-md px-2 py-1 flex items-center">
              <Image src="/GPEA.png"  alt="GPEA" width={48} height={20} className="h-5 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
            <div className="bg-white rounded-md px-2 py-1 flex items-center">
              <Image src="/CIEX2.png" alt="CIEX" width={48} height={20} className="h-5 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
          </div>
          <h2 className="text-xl font-black text-white leading-tight tracking-tight">
            Avaliação de Impactos Socioeconômicos
          </h2>
          <p className="text-sm text-white/70 font-medium mt-0.5">
            Enchentes no Rio Grande do Sul — 2024
          </p>
        </div>

        {/* Conteúdo */}
        <div className="px-6 pt-5 pb-4">
          <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
            Este painel interativo permite explorar o impacto das enchentes em quatro municípios
            gaúchos. Veja abaixo como navegar:
          </p>

          <div className="space-y-3">
            <FeatureItem
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#055071" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              }
              title="Município e Cenário de Inundação"
              desc="Use os seletores no cabeçalho para escolher o município e o cenário de inundação a analisar."
            />
            <FeatureItem
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#055071" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              }
              title="Camadas de Dados"
              desc="Ative as camadas de Empresas, Educação, Saúde, Agricultura e Infraestrutura para visualizar os estabelecimentos atingidos no mapa."
            />
            <FeatureItem
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#055071" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              }
              title="Danos Operacionais"
              desc="Consulte a estimativa de perdas econômicas (VAB, educação, saúde e agricultura) para cada cenário, com análise de sensibilidade por duração."
            />
            <FeatureItem
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#055071" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              }
              title="Metodologia"
              desc="Acesse a fundamentação técnica completa — sobreposição espacial, fontes de dados e cálculo de danos operacionais (DaLA/CEPAL)."
            />
          </div>
        </div>

        {/* Botões */}
        <div className="px-6 pb-6 flex gap-2.5 flex-wrap">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 min-w-[120px] h-9 rounded-xl text-[12px] font-black text-white flex items-center justify-center gap-1.5 transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}
          >
            Explorar Impacto
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          <a
            href="/danos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[100px] h-9 rounded-xl text-[12px] font-black border flex items-center justify-center gap-1.5 transition-all duration-150 hover:bg-slate-50"
            style={{ color: "#055071", borderColor: "#b3cdd8" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            Danos
          </a>
          <a
            href="/metodologia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[100px] h-9 rounded-xl text-[12px] font-black border flex items-center justify-center gap-1.5 transition-all duration-150 hover:bg-slate-50"
            style={{ color: "#055071", borderColor: "#b3cdd8" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Metodologia
          </a>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: "#f0f7fa", border: "1px solid #b3cdd8" }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-black text-slate-800 leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
