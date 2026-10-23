import { useEffect, useState } from "react";
import type { CenarioDanos, DanosData, ClimadaData, CotaSetor, CotasData, MedidasMun, ExposicaoMun } from "./types";
import { RP_ORDER, scaleTo } from "./helpers";
import type { DiasOpcao } from "./helpers";

export interface DanosProps {
  dados: DanosData; dadosClimada: ClimadaData | null; dadosClimadaMun: Record<string, ClimadaData>;
  dadosCotas: Record<string, CotasData>; dadosMedidas: Record<string, MedidasMun>; dadosExposicao: Record<string, ExposicaoMun>;
}

/** Estado e valores derivados da página Danos, compartilhados pelas abas/seções. */
export function useDanosContext({ dados, dadosClimada: climadaPA, dadosClimadaMun, dadosCotas: cotasPorMun, dadosMedidas, dadosExposicao }: DanosProps) {
  const [aba, setAba] = useState<"dala" | "climada">("dala");
  const [dias, setDias] = useState<DiasOpcao>(30);
  const [rp, setRp] = useState("RP200");
  // Município e visão da aba CLIMADA: por período de retorno (RP) ou por cota do rio.
  const [munClimada, setMunClimada] = useState("Porto Alegre");
  const [visao, setVisao] = useState<"rp" | "cota">("cota");
  const [cota, setCota] = useState("29.45");

  // Deep-link opcional: /danos?aba=climada abre direto na aba CLIMADA (ex.: botão do header do mapa).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Ler a URL só é possível após a hidratação, então o setState no efeito é intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("aba") === "climada" && (climadaPA || Object.keys(cotasPorMun).length)) setAba("climada");
  }, [climadaPA, cotasPorMun]);

  // ── Dados escalados (Danos Operacionais) para a duração selecionada ──
  const dadosEscalados: DanosData = Object.fromEntries(
    Object.entries(dados).map(([mun, cens]) => [
      mun,
      Object.fromEntries(
        Object.entries(cens).map(([cen, v]) => [cen, scaleTo(v, dias)])
      ),
    ])
  );

  const CENARIOS_VISAO_GERAL: Record<string, string> = {
    "Eldorado do Sul": "Cenario ADA",
    "Lajeado":         "Cenario 27m",
    "Porto Alegre":    "Climada Evento 2024",
    "Rio Grande":      "Cenario Maio 2024",
  };

  const pioresCenarios = Object.entries(dadosEscalados).map(([mun, cens]) => {
    const cenarioFixo = CENARIOS_VISAO_GERAL[mun];
    const entry = cenarioFixo && cens[cenarioFixo]
      ? [cenarioFixo, cens[cenarioFixo]] as [string, CenarioDanos]
      : Object.entries(cens).reduce((acc, cur) => (cur[1].total > acc[1].total ? cur : acc));
    return { mun, cenNome: entry[0], cenVal: entry[1] };
  });

  const todosCenarios = Object.entries(dadosEscalados).flatMap(([mun, cens]) =>
    Object.entries(cens).map(([cen, v]) => ({ mun, cen, v }))
  );
  const maxTotalDala = Math.max(...todosCenarios.map((c) => c.v.total));

  // ── Município ativo da aba CLIMADA ──
  // Porto Alegre: RPs do estudo de risco de inundação de Porto Alegre (UNU-EHS). Lajeado: RPs derivados das cotas.
  // Eldorado do Sul: rasters de Porto Alegre; RP do Guaíba vem de tabela defasada (sem 2024), ver a nota na aba.
  const climadaPorMun: Record<string, ClimadaData | null | undefined> = { ...dadosClimadaMun, "Porto Alegre": climadaPA };
  const munsClimada = ["Porto Alegre", "Lajeado", "Eldorado do Sul"].filter((m) => !!(climadaPorMun[m] || cotasPorMun[m]));
  const munClimadaAtivo = munsClimada.includes(munClimada) ? munClimada : munsClimada[0];
  // Eldorado do Sul: só a visão por cota (a frequência do Guaíba é de tabela defasada, sem 2024).
  const dadosClimada: ClimadaData | null = munClimadaAtivo === "Eldorado do Sul" ? null : climadaPorMun[munClimadaAtivo] ?? null;
  const medidasMun: MedidasMun | null = dadosMedidas[munClimadaAtivo] ?? null;

  // ── Dados CLIMADA para o RP selecionado ──
  const climadaSetores = ["empresas", "educacao", "saude"];
  const rpsDisponiveis = dadosClimada ? RP_ORDER.filter((r) => dadosClimada.resultados_por_rp[r]) : [];
  const rpAtivo = dadosClimada && dadosClimada.resultados_por_rp[rp] ? rp : rpsDisponiveis[rpsDisponiveis.length - 1];
  const atualClimada = rpAtivo ? dadosClimada?.resultados_por_rp[rpAtivo] : undefined;
  const totalAtualClimada = atualClimada ? climadaSetores.reduce((s, k) => s + atualClimada[k].dano_fisico_total_brl, 0) : 0;
  const exposicaoAtualClimada = atualClimada ? climadaSetores.reduce((s, k) => s + atualClimada[k].exposicao_total_brl, 0) : 0;
  const maxTotalClimada = dadosClimada && rpsDisponiveis.length
    ? Math.max(...rpsDisponiveis.map((r) => climadaSetores.reduce((s, k) => s + dadosClimada.resultados_por_rp[r][k].dano_fisico_total_brl, 0)))
    : 0;
  const eai = dadosClimada?.eai_anual_esperado ?? null;

  // ── Dados CLIMADA por cota (Lajeado, Eldorado do Sul, Porto Alegre) ──
  const dadosCotas: CotasData | null = cotasPorMun[munClimadaAtivo] ?? null;
  const cotasDisponiveis = dadosCotas
    ? Object.keys(dadosCotas.resultados_por_cota).sort((a, b) => parseFloat(a) - parseFloat(b))
    : [];
  const cotaAtiva = cotasDisponiveis.includes(cota) ? cota : cotasDisponiveis[Math.floor(cotasDisponiveis.length / 2)];
  const atualCota = dadosCotas && cotaAtiva ? dadosCotas.resultados_por_cota[cotaAtiva] : undefined;
  const totalCota = (c: Record<string, CotaSetor>, k: "dano_fisico_brl_poa" | "dano_fisico_brl_jrc_crua") =>
    climadaSetores.reduce((s, st) => s + c[st][k], 0);
  const maxTotalCota = dadosCotas && cotasDisponiveis.length
    ? Math.max(...cotasDisponiveis.map((c) => totalCota(dadosCotas.resultados_por_cota[c], "dano_fisico_brl_jrc_crua")))
    : 0;
  // Visão por cota: quando escolhida, ou quando o município não tem a visão por RP.
  // Municípios sem curva de dano (Lajeado): valor exposto atingido no lugar do dano.
  const expo: ExposicaoMun | null = dadosExposicao[munClimadaAtivo] ?? null;
  const cotaAtivo = !!dadosCotas && !!atualCota && (visao === "cota" || !dadosClimada);
  // Lajeado: exposição também por RP; Porto Alegre e Eldorado do Sul: só a visão por cota.
  const semCurva = !!expo && (Object.keys(expo.resultados_por_rp).length > 0 || cotaAtivo);
  const totalRp10 = dadosClimada?.resultados_por_rp?.RP10
    ? climadaSetores.reduce((sum, k) => sum + dadosClimada.resultados_por_rp.RP10[k].dano_fisico_total_brl, 0)
    : 0;
  const foraRasterTotal = dadosCotas ? Object.values(dadosCotas.diagnostico.pontos_fora_do_raster).reduce((a, b) => a + b, 0) : 0;

  return {
    CENARIOS_VISAO_GERAL,
    aba,
    atualClimada,
    atualCota,
    climadaPA,
    climadaPorMun,
    climadaSetores,
    cota,
    cotaAtiva,
    cotaAtivo,
    cotasDisponiveis,
    cotasPorMun,
    dados,
    dadosClimada,
    dadosClimadaMun,
    dadosCotas,
    dadosEscalados,
    dadosExposicao,
    dadosMedidas,
    dias,
    eai,
    expo,
    exposicaoAtualClimada,
    foraRasterTotal,
    maxTotalClimada,
    maxTotalCota,
    maxTotalDala,
    medidasMun,
    munClimada,
    munClimadaAtivo,
    munsClimada,
    pioresCenarios,
    rp,
    rpAtivo,
    rpsDisponiveis,
    semCurva,
    setAba,
    setCota,
    setDias,
    setMunClimada,
    setRp,
    setVisao,
    todosCenarios,
    totalAtualClimada,
    totalCota,
    totalRp10,
    visao,
  };
}

export type DanosCtx = ReturnType<typeof useDanosContext>;
