"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  /** Escala minima/maxima aplicada ao conteudo para caber na altura disponivel. */
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Ajusta o conteudo a altura disponivel (sem rolagem): mede a altura natural do
 * filho e aplica transform: scale para que ele ocupe exatamente o espaco do
 * pai, respeitando [min, max]. A largura e' compensada para nao encolher na horizontal.
 * O pai precisa ter altura definida (flex-1 min-h-0).
 */
export function FitHeight({ children, min = 0.55, max = 1.25, className }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [rolavel, setRolavel] = useState(false);

  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const medir = () => {
      // Celular/tablet (bottom sheet baixo): sem encolher, o conteudo rola.
      if (!window.matchMedia("(min-width: 1024px), (pointer: fine)").matches) {
        setEscala(prev => (prev === 1 ? prev : 1));
        setRolavel(true);
        return;
      }
      setRolavel(false);
      const cs = getComputedStyle(o);
      const disponivel = o.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      // A altura natural depende da escala (a largura do filho e' 100/escala %, e o texto quebra de
      // linha diferente). Calcular s = disponivel / altura-em-escala-atual oscilava entre dois valores
      // sem nunca parar: busca binaria pela maior escala cuja altura *escalada* cabe, medindo cada
      // candidata. O resultado so depende de `disponivel`, entao nao ha laco com o ResizeObserver.
      const cabe = (s: number) => {
        i.style.width = `${100 / s}%`;
        const h = i.offsetHeight; // transform nao altera o layout
        return h > 0 && h * s <= disponivel + 0.5;
      };
      let lo = min, hi = max;
      if (cabe(hi)) lo = hi;
      else for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        if (cabe(mid)) lo = mid; else hi = mid;
      }
      i.style.width = `${100 / lo}%`;
      setEscala(prev => (Math.abs(prev - lo) < 0.005 ? prev : lo));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(o); ro.observe(i);
    return () => ro.disconnect();
  }, [min, max]);

  return (
    <div ref={outer} tabIndex={rolavel ? 0 : undefined} className={`flex-1 min-h-0 overflow-hidden movel:overflow-y-auto ${className ?? ""}`}>
      <div ref={inner} style={{ transform: `scale(${escala})`, transformOrigin: "top left", width: `${100 / escala}%` }}>
        {children}
      </div>
    </div>
  );
}
