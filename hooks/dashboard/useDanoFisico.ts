import { useState, useEffect, useMemo, useCallback } from "react";
import type { FeatureCollection } from "geojson";
import type { DanoFisicoIndice } from "./types";

interface Args {
  municipio: string;
  renderMunicipio: string;
  baseEmpresas: FeatureCollection | null;
  baseEducacao: FeatureCollection | null;
  baseSaude: FeatureCollection | null;
}

/** Camada "Dano Físico (CLIMADA)": índice por RP mesclado nos pontos do BASE (só Porto Alegre). */
export function useDanoFisico({ municipio, renderMunicipio, baseEmpresas, baseEducacao, baseSaude }: Args) {
  const [showDanoFisico, setShowDanoFisico] = useState<boolean>(false);
  const [rpDanoFisico, setRpDanoFisico] = useState<string>("RP200");
  const [danoFisicoIndiceEmpresas, setDanoFisicoIndiceEmpresas] = useState<DanoFisicoIndice | null>(null);
  const [danoFisicoIndiceEducacao, setDanoFisicoIndiceEducacao] = useState<DanoFisicoIndice | null>(null);
  const [danoFisicoIndiceSaude, setDanoFisicoIndiceSaude] = useState<DanoFisicoIndice | null>(null);

  // Camada "Dano Físico (CLIMADA)" -- so' existe para Porto Alegre (ver
  // lib/constants.ts, DANO_FISICO_MUNICIPIO). Carregada sob demanda (so'
  // quando o toggle e' ligado) porque os 3 arquivos somados ja' tem um volume
  // razoavel (saude sozinho tem ~7 mil pontos x 7 RPs de propriedades).
  useEffect(() => {
    if (!showDanoFisico || municipio !== "Porto Alegre") return;
    if (danoFisicoIndiceEmpresas || danoFisicoIndiceEducacao || danoFisicoIndiceSaude) return; // ja carregado nesta sessao

    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      fetch("/dados_convertidos/porto_alegre/empresas_dano_fisico_indice.json", { signal }).then(r => r.ok ? r.json() : null),
      fetch("/dados_convertidos/porto_alegre/educacao_dano_fisico_indice.json", { signal }).then(r => r.ok ? r.json() : null),
      fetch("/dados_convertidos/porto_alegre/saude_dano_fisico_indice.json", { signal }).then(r => r.ok ? r.json() : null),
    ]).then(([emp, edu, sau]) => {
      if (signal.aborted) return;
      setDanoFisicoIndiceEmpresas(emp); setDanoFisicoIndiceEducacao(edu); setDanoFisicoIndiceSaude(sau);
    }).catch(e => { if ((e as Error).name !== 'AbortError') console.error(e); });

    return () => controller.abort();
  }, [showDanoFisico, municipio, danoFisicoIndiceEmpresas, danoFisicoIndiceEducacao, danoFisicoIndiceSaude]);

  // Desliga a camada e libera os dados ao sair de Porto Alegre -- nos outros
  // municipios ela nao tem sentido (sem raster de profundidade) nem dado pra
  // mostrar.
  useEffect(() => {
    if (municipio === "Porto Alegre") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowDanoFisico(false);
    setDanoFisicoIndiceEmpresas(null); setDanoFisicoIndiceEducacao(null); setDanoFisicoIndiceSaude(null);
  }, [municipio]);

  // Mescla o indice de dano fisico nos MESMOS pontos ja exibidos pelo mapa,
  // casando pelo campo id de cada setor. Sem isso a camada desenharia
  // uma coleção paralela com todo o BASE (~40 mil pontos em Empresas), fazendo
  // parecer que pontos "aparecem do nada" ao ligar o toggle -- ver
  // pipeline/climada_risco_prototipo.py, gerar_indice_dano_pontos.
  // rp: além de mesclar TODAS as propriedades por RP do índice (usadas no
  // popup), copia as do RP atualmente selecionado para chaves FIXAS
  // (..._atual) -- assim clusterProperties/paint na camada do mapa referenciam
  // um nome de propriedade constante, e trocar de RP vira só um `setData()`
  // (o mesmo Source/GeoJSONSource do MapLibre é reaproveitado). Antes disso a
  // troca de RP forçava remontar a Source inteira (key dinâmica, necessária
  // porque clusterProperties não é reativo a uma troca de propriedade dentro
  // da mesma source) -- destruir/recriar a source enquanto o MapLibre ainda
  // processava a anterior (cluster em worker) causava um crash interno do
  // MapLibre ("Cannot read properties of null (reading 'signal')", abort de
  // uma requisição/worker já finalizado).
  const mergeDanoFisico = useCallback((fc: FeatureCollection | null, indice: DanoFisicoIndice | null, idField: string, rp: string): FeatureCollection | null => {
    if (!fc || !indice || !Array.isArray(fc.features)) return null;
    return {
      ...fc,
      features: fc.features.map((f) => {
        const chave = String((f.properties as Record<string, unknown> | null)?.[idField] ?? "");
        const extra = indice[chave];
        if (!extra) return f;
        const atual = {
          dano_fisico_pct_atual: extra[`dano_fisico_pct_${rp}`] ?? 0,
          dano_fisico_brl_atual: extra[`dano_fisico_brl_${rp}`] ?? 0,
          profundidade_m_atual: extra[`profundidade_m_${rp}`] ?? 0,
        };
        return { ...f, properties: { ...f.properties, ...extra, ...atual } };
      }),
    };
  }, []);

  // Só compõe (map sobre todos os pontos) quando a camada está realmente
  // ligada -- evita esse trabalho toda vez que baseEmpresas/Edu/Sau mudam por
  // qualquer outro motivo enquanto Dano Físico está desligado.
  //
  // Usa BASE (todos os pontos da cidade), não renderEmp/Edu/Sau (que seguem o
  // cenário/ATINGIDOS ativo): a exposição ao RP é uma análise independente do
  // polígono do cenário selecionado. mergeDanoFisico reaproveita a geometria do
  // BASE já carregado e o DashboardMap agrupa em cluster para não poluir o mapa.
  const mostraDanoFisicoAtivo = showDanoFisico && renderMunicipio === "Porto Alegre";
  const danoFisicoEmpresas = useMemo(
    () => (mostraDanoFisicoAtivo ? mergeDanoFisico(baseEmpresas, danoFisicoIndiceEmpresas, "id", rpDanoFisico) : null),
    [mostraDanoFisicoAtivo, baseEmpresas, danoFisicoIndiceEmpresas, rpDanoFisico, mergeDanoFisico]
  );
  const danoFisicoEducacao = useMemo(
    () => (mostraDanoFisicoAtivo ? mergeDanoFisico(baseEducacao, danoFisicoIndiceEducacao, "co_entidade", rpDanoFisico) : null),
    [mostraDanoFisicoAtivo, baseEducacao, danoFisicoIndiceEducacao, rpDanoFisico, mergeDanoFisico]
  );
  const danoFisicoSaude = useMemo(
    () => (mostraDanoFisicoAtivo ? mergeDanoFisico(baseSaude, danoFisicoIndiceSaude, "co_cnes", rpDanoFisico) : null),
    [mostraDanoFisicoAtivo, baseSaude, danoFisicoIndiceSaude, rpDanoFisico, mergeDanoFisico]
  );

  return {
    showDanoFisico, setShowDanoFisico, rpDanoFisico, setRpDanoFisico,
    danoFisicoEmpresas, danoFisicoEducacao, danoFisicoSaude,
  };
}
