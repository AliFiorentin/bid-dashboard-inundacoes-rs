"use client";

import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { HeaderLogos } from "@/components/HeaderLogos";

export function DanosHeader() {
  return (
      <header className="bg-[#055071] text-white px-6 py-10 print:py-5">
        <div className="max-w-[1200px] mx-auto flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-5 print:hidden">
              <Link href="/" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Dashboard</Link>
              <Link href="/metodologia" className="text-[10px] font-bold text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/20 hover:border-white/40 flex items-center gap-1.5">← Metodologia</Link>
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-60 mb-2">
              BID · GPEA · FURG
            </p>
            <h1 className="text-4xl font-black leading-none mb-2 tracking-tight flex items-center gap-3">
              <TrendingDown size={36} strokeWidth={2.5} className="opacity-80 shrink-0" />
              Danos & Risco de Inundação
            </h1>
            <p className="text-base opacity-75 font-medium">
              Perdas Econômicas e Dano Físico Estimado: Enchentes no Rio Grande do Sul
            </p>
            <p className="text-[11px] opacity-50 mt-3 font-mono">
              Metodologia DaLA (CEPAL/BID), Maio 2024 e Setembro 2023 · Dano Físico por cota, Porto Alegre, Lajeado e Eldorado do Sul
            </p>
          </div>
          <HeaderLogos />
        </div>
      </header>
  );
}
