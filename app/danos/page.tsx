import type { Metadata } from "next";
import { DanosClient } from "./DanosClient";
import { getDanosPageData } from "./get-data";

export const metadata: Metadata = {
  title: "Danos & Risco — Avaliação de Impactos Socioeconômicos RS",
  description: "Estimativa de perdas econômicas operacionais (DaLA/CEPAL) e protótipo de dano físico estimado (CLIMADA) causados pelas enchentes no Rio Grande do Sul.",
};

export default function DanosPage() {
  const { dados, dadosClimada } = getDanosPageData();
  return <DanosClient dados={dados} dadosClimada={dadosClimada} />;
}
