import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import { DanosClient } from "./DanosClient";
import type { DanosData, ClimadaData } from "./DanosClient";

export const metadata: Metadata = {
  title: "Danos & Risco — Avaliação de Impactos Socioeconômicos RS",
  description: "Estimativa de perdas econômicas operacionais (DaLA/CEPAL) e protótipo de dano físico estimado (CLIMADA) causados pelas enchentes no Rio Grande do Sul.",
};

export default function DanosPage() {
  let dados: DanosData = {};
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", "danos_operacionais.json");
    dados = JSON.parse(readFileSync(p, "utf8"));
  } catch { /* graceful degradation */ }

  let dadosClimada: ClimadaData | null = null;
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", "climada_dano_fisico_prototipo.json");
    dadosClimada = JSON.parse(readFileSync(p, "utf8"));
  } catch { /* graceful degradation */ }

  return <DanosClient dados={dados} dadosClimada={dadosClimada} />;
}
