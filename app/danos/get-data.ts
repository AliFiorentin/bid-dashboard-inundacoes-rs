import { readFileSync } from "fs";
import { join } from "path";
import type { DanosData, ClimadaData, CotasData, MedidasMun, ExposicaoMun } from "./DanosClient";

/**
 * Leitura server-side compartilhada entre a página cheia (app/danos/page.tsx)
 * e a rota interceptada (app/@modal/(.)danos/page.tsx) -- as duas rodam esse
 * mesmo código no servidor, só muda o invólucro visual (página vs modal).
 */
export function getDanosPageData(): { dados: DanosData; dadosClimada: ClimadaData | null; dadosClimadaMun: Record<string, ClimadaData>; dadosCotas: Record<string, CotasData>; dadosMedidas: Record<string, MedidasMun>; dadosExposicao: Record<string, ExposicaoMun> } {
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

  // Mesmo cálculo por RP de Porto Alegre, replicado nos municípios com rasters por cota
  // (RP convertido em cota): pipeline/climada_rp_por_cota.py.
  const dadosClimadaMun: Record<string, ClimadaData> = {};
  const arquivosRp: Record<string, string> = {
    "Eldorado do Sul": "climada_dano_fisico_eldorado_do_sul.json",
    "Lajeado": "climada_dano_fisico_lajeado.json",
  };
  for (const [mun, arq] of Object.entries(arquivosRp)) {
    try {
      const p = join(process.cwd(), "public", "dados_convertidos", arq);
      dadosClimadaMun[mun] = JSON.parse(readFileSync(p, "utf8"));
    } catch { /* graceful degradation */ }
  }

  // Dano físico por COTA do rio (Lajeado, Eldorado do Sul, Porto Alegre): pipeline/climada_cota.py.
  const dadosCotas: Record<string, CotasData> = {};
  const arquivosCota: Record<string, string> = {
    "Porto Alegre": "climada_cota_porto_alegre.json",
    "Eldorado do Sul": "climada_cota_eldorado_do_sul.json",
    "Lajeado": "climada_cota_lajeado.json",
  };
  for (const [mun, arq] of Object.entries(arquivosCota)) {
    try {
      const p = join(process.cwd(), "public", "dados_convertidos", arq);
      dadosCotas[mun] = JSON.parse(readFileSync(p, "utf8"));
    } catch { /* graceful degradation */ }
  }

  // Medidas de adaptação (risco anual evitado por medida): pipeline/climada_medidas.py.
  let dadosMedidas: Record<string, MedidasMun> = {};
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", "climada_medidas.json");
    dadosMedidas = JSON.parse(readFileSync(p, "utf8"));
  } catch { /* graceful degradation */ }

  // CLIMADA sem curva de dano (valor exposto atingido): pipeline/climada_exposicao.py.
  const dadosExposicao: Record<string, ExposicaoMun> = {};
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", "climada_exposicao_lajeado.json");
    dadosExposicao["Lajeado"] = JSON.parse(readFileSync(p, "utf8"));
  } catch { /* graceful degradation */ }

  return { dados, dadosClimada, dadosClimadaMun, dadosCotas, dadosMedidas, dadosExposicao };
}
