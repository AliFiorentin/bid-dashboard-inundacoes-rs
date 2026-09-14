import { readFileSync } from "fs";
import { join } from "path";
import type { ClimadaData } from "@/app/danos/DanosClient";

/**
 * Leitura server-side compartilhada entre a página cheia (app/metodologia/page.tsx)
 * e a rota interceptada (app/@modal/(.)metodologia/page.tsx).
 */
export function getMetodologiaPageData(): { dadosClimada: ClimadaData | null } {
  let dadosClimada: ClimadaData | null = null;
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", "climada_dano_fisico_prototipo.json");
    dadosClimada = JSON.parse(readFileSync(p, "utf8"));
  } catch { /* graceful degradation */ }
  return { dadosClimada };
}
