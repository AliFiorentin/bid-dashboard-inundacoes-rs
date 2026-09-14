import type { Metadata } from "next";
import { MetodologiaContent } from "./MetodologiaContent";
import { getMetodologiaPageData } from "./get-data";

export const metadata: Metadata = {
  title: "Metodologia — Avaliação de Impactos Socioeconômicos RS",
  description: "Metodologias de cálculo utilizadas no painel de impactos das enchentes no Rio Grande do Sul.",
};

export default function MetodologiaPage() {
  const { dadosClimada } = getMetodologiaPageData();
  return <MetodologiaContent dadosClimada={dadosClimada} />;
}
