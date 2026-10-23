"use client";

import dynamic from "next/dynamic";
import { useDanosContext, type DanosProps } from "./ctx";
import { DanosHeader } from "./DanosHeader";
import { DanosToolbar } from "./DanosToolbar";
import { DanosIndice } from "./DanosIndice";
import { DanosOperacionais } from "./DanosOperacionais";

export * from "./types";

// Aba "Dano Físico": só é montada quando o usuário (ou ?aba=climada) a abre,
// então seus componentes pesados saem do bundle inicial.
const ExposicaoView = dynamic(() => import("./ExposicaoView").then((m) => m.ExposicaoView));
const ClimadaPorCota = dynamic(() => import("./ClimadaPorCota").then((m) => m.ClimadaPorCota));
const ClimadaPorRp = dynamic(() => import("./ClimadaPorRp").then((m) => m.ClimadaPorRp));

export function DanosClient(props: DanosProps) {
  const ctx = useDanosContext(props);
  const {
    aba, setAba, semCurva, expo, dadosCotas, atualCota, cotaAtiva, cotaAtivo,
    dadosClimada, atualClimada, rpAtivo, munClimadaAtivo, rp, cota,
  } = ctx;

  return (
    <div className="min-h-screen bg-[#f0f7fa] text-slate-800 font-sans">
      <DanosHeader />
      <DanosToolbar ctx={ctx} />

      <div className="max-w-[1200px] mx-auto px-6 py-10 print:py-5 flex gap-8 items-start print:block">
        <DanosIndice ctx={ctx} />

        <main className="flex-1 min-w-0">
          {aba === "dala" ? (
            <DanosOperacionais ctx={ctx} />
          ) : semCurva && expo ? (
            <ExposicaoView expo={expo} diag={dadosCotas?.diagnostico} mun={munClimadaAtivo} visao={cotaAtivo ? "cota" : "rp"} rp={rp} cota={cota} setAba={setAba} />
          ) : cotaAtivo && dadosCotas && atualCota && cotaAtiva ? (
            <ClimadaPorCota ctx={ctx} />
          ) : dadosClimada && atualClimada && rpAtivo ? (
            <ClimadaPorRp ctx={ctx} />
          ) : null}

        <footer className="mt-12 pt-6 border-t border-[#b3cdd8] text-center print:mt-4">
          <p className="text-[11px] text-[#2f6a83]">
            Painel desenvolvido por GPEA/FURG em parceria com o BID (Banco Interamericano de Desenvolvimento).
          </p>
          <p className="text-[11px] text-[#2f6a83] mt-0.5">© 2024 Alisson Tallys Geraldo Fiorentin · Dados de referência: 2024.</p>
        </footer>
        </main>
      </div>
    </div>
  );
}
