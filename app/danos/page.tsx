import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import { DanosClient } from "./DanosClient";
import type { DanosData } from "./DanosClient";

export const metadata: Metadata = {
  title: "Danos Operacionais — Avaliação de Impactos Socioeconômicos RS",
  description: "Estimativa de perdas econômicas operacionais causadas pelas enchentes no Rio Grande do Sul — metodologia DaLA/CEPAL.",
};

export default function DanosPage() {
  let dados: DanosData = {};
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", "danos_operacionais.json");
    dados = JSON.parse(readFileSync(p, "utf8"));
  } catch { /* graceful degradation */ }

  return <DanosClient dados={dados} />;
}
