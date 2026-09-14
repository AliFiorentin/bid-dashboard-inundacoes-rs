"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface RouteModalProps {
  /** URL da página real (para o link "abrir em nova guia") — usa <a> puro de propósito, pra escapar da interceptação e abrir uma navegação de página inteira numa aba nova. */
  hrefNovaGuia: string;
  children: React.ReactNode;
}

/**
 * Envolve o conteúdo de uma rota interceptada (app/@modal/(.)*) como um
 * painel flutuante sobre o Dashboard. Fechar SEMPRE usa router.back() (nunca
 * router.push/<Link href="/">) -- é o único jeito que desmonta corretamente a
 * rota interceptada sem empurrar uma entrada extra no histórico.
 */
export function RouteModal({ hrefNovaGuia, children }: RouteModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => router.back(), [router]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [fechar]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) fechar();
  }, [fechar]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-2 sm:p-4 md:p-6 print:p-0 print:static print:overflow-visible"
      style={{ backgroundColor: "rgba(2,20,30,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-[1400px] my-0 md:my-2 print:max-w-none"
        style={{ maxHeight: "calc(100vh - 1rem)", minHeight: 0 }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl print:rounded-none print:shadow-none"
          style={{ maxHeight: "calc(100vh - 1rem)" }}
        >
          <div className="overflow-y-auto print:overflow-visible" style={{ maxHeight: "calc(100vh - 1rem)" }}>
            {children}
          </div>
        </div>
      </div>

      {/* Botões ancorados na VIEWPORT (fixed), não no card -- presos ao card
          (absolute + saindo do seu canto) eles cortavam em telas baixas: o
          card quase encosta no topo (padding pequeno do overlay) e os botões,
          saindo ainda mais pra cima do canto do card, ultrapassavam o limite
          da própria janela. Fixed na tela nunca corta e nunca se move com
          scroll do conteúdo. */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[210] flex items-center gap-2 print:hidden">
        <a
          href={hrefNovaGuia}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir em nova guia"
          className="h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 text-white shadow-lg hover:brightness-110 transition-[filter] duration-150"
          style={{ backgroundColor: "#022536" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          Nova guia
        </a>
        <button
          onClick={fechar}
          aria-label="Fechar"
          title="Fechar (Esc)"
          className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-[filter] duration-150"
          style={{ backgroundColor: "#022536" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </div>
  );
}
