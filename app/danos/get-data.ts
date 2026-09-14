import { readFileSync } from "fs";
import { join } from "path";
import type { DanosData, ClimadaData } from "./DanosClient";

/**
 * Leitura server-side compartilhada entre a página cheia (app/danos/page.tsx)
 * e a rota interceptada (app/@modal/(.)danos/page.tsx) -- as duas rodam esse
 * mesmo código no servidor, só muda o invólucro visual (página vs modal).
 */
export function getDanosPageData(): { dados: DanosData; dadosClimada: ClimadaData | null } {
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

  return { dados, dadosClimada };
}
