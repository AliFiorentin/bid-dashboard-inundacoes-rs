import { useState, useEffect } from "react";
import type { PopulacaoData, AreaAtingidaData, ManchaDuracaoClimada } from "./types";

/** Arquivos pequenos e independentes de município/cenário, buscados uma vez no mount. */
export function useStaticData() {
  const [popData, setPopData] = useState<PopulacaoData | null>(null);
  const [areaData, setAreaData] = useState<AreaAtingidaData | null>(null);
  const [manchaDuracaoClimada, setManchaDuracaoClimada] = useState<ManchaDuracaoClimada | null>(null);

  useEffect(() => {
    fetch("/dados_convertidos/populacao_atingida.json")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPopData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/dados_convertidos/area_atingida.json")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setAreaData(d))
      .catch(() => {});
  }, []);

  // Metadados (coordenadas + min/max) do PNG de duração do "Climada Evento
  // 2024" -- arquivo pequeno, carregado uma vez no mount como popData/areaData.
  useEffect(() => {
    fetch("/dados_convertidos/porto_alegre/mancha_duracao_climada_evento_2024.json")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setManchaDuracaoClimada(d))
      .catch(() => {});
  }, []);

  return { popData, areaData, manchaDuracaoClimada };
}
