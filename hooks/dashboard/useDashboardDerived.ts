import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { normalizeDep, CNAE_LABELS } from "@/lib/constants";
import { calcEmp, calcEdu, calcSau } from "@/lib/geo-utils";

interface Args {
  isTransitioning: boolean;
  showEmp: FeatureCollection | null;
  showEdu: FeatureCollection | null;
  showSau: FeatureCollection | null;
  filtroSetor: string;
  filtroDep: string;
  filtroTipo: string;
  baseEmpresas: FeatureCollection | null;
  baseEducacao: FeatureCollection | null;
  baseSaude: FeatureCollection | null;
  atingidosEmpresas: FeatureCollection | null;
  atingidosEducacao: FeatureCollection | null;
  atingidosSaude: FeatureCollection | null;
}

/** Pontos filtrados para o mapa, métricas base/impacto, valores únicos dos filtros e dados dos gráficos. */
export function useDashboardDerived({
  isTransitioning, showEmp, showEdu, showSau, filtroSetor, filtroDep, filtroTipo,
  baseEmpresas, baseEducacao, baseSaude, atingidosEmpresas, atingidosEducacao, atingidosSaude,
}: Args) {
  const renderEmp = useMemo(() => {
    if (isTransitioning || !showEmp || !Array.isArray(showEmp.features)) return null;
    if (filtroSetor === "(todos)") return showEmp;
    return { ...showEmp, features: showEmp.features.filter((f) => String((f.properties as Record<string, unknown>)?.CNAE_2 || "") === filtroSetor) };
  }, [isTransitioning, showEmp, filtroSetor]);

  const renderEdu = useMemo(() => {
    if (isTransitioning || !showEdu || !Array.isArray(showEdu.features)) return null;
    if (filtroDep === "(todas)") return showEdu;
    return { ...showEdu, features: showEdu.features.filter((f) => normalizeDep(String((f.properties as Record<string, unknown>)?.tp_dependencia || "")).toLowerCase() === filtroDep.toLowerCase()) };
  }, [isTransitioning, showEdu, filtroDep]);

  const renderSau = useMemo(() => {
    if (isTransitioning || !showSau || !Array.isArray(showSau.features)) return null;
    if (filtroTipo === "(todas)") return showSau;
    return { ...showSau, features: showSau.features.filter((f) => String((f.properties as Record<string, unknown>)?.co_tipo_estabelecimento || "").toLowerCase() === filtroTipo.toLowerCase()) };
  }, [isTransitioning, showSau, filtroTipo]);

  const metricasEmp = useMemo(() => ({ base: calcEmp(baseEmpresas), impacto: calcEmp(atingidosEmpresas) }), [baseEmpresas, atingidosEmpresas]);
  const metricasEdu = useMemo(() => ({ base: calcEdu(baseEducacao), impacto: calcEdu(atingidosEducacao) }), [baseEducacao, atingidosEducacao]);
  const metricasSau = useMemo(() => ({ base: calcSau(baseSaude), impacto: calcSau(atingidosSaude) }), [baseSaude, atingidosSaude]);

  const setoresUnicos = useMemo((): string[] => {
    if (!baseEmpresas || !Array.isArray(baseEmpresas.features)) return [];
    return (Array.from(new Set(baseEmpresas.features.map((f) => String((f.properties as Record<string, unknown>)?.CNAE_2 || "")).filter(Boolean))).sort() as string[]);
  }, [baseEmpresas]);

  const depsUnicas = useMemo((): string[] => {
    if (!baseEducacao || !Array.isArray(baseEducacao.features)) return [];
    return (Array.from(new Set(baseEducacao.features.map((f) => normalizeDep(String((f.properties as Record<string, unknown>)?.tp_dependencia || ""))).filter(Boolean))).sort() as string[]);
  }, [baseEducacao]);

  const tiposUnicos = useMemo((): string[] => {
    if (!baseSaude || !Array.isArray(baseSaude.features)) return [];
    return (Array.from(new Set(baseSaude.features.map((f) => String((f.properties as Record<string, unknown>)?.co_tipo_estabelecimento || "")).filter(Boolean))).sort() as string[]);
  }, [baseSaude]);

  const setoresChart = useMemo(() => {
    if (!baseEmpresas?.features) return [] as { setor: string; base: number; atg: number }[];
    const baseCounts: Record<string, number> = {};
    const atgCounts: Record<string, number> = {};
    baseEmpresas.features.forEach((f) => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 || '');
      if (s) baseCounts[s] = (baseCounts[s] || 0) + 1;
    });
    (atingidosEmpresas?.features ?? []).forEach((f) => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 || '');
      if (s) atgCounts[s] = (atgCounts[s] || 0) + 1;
    });
    const sorted = Object.entries(baseCounts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 9);
    const outrosBase = sorted.slice(9).reduce((s, [, c]) => s + c, 0);
    const outrosAtg = sorted.slice(9).reduce((s, [k]) => s + (atgCounts[k] ?? 0), 0);
    const result = top.map(([setor, base]) => ({ setor: CNAE_LABELS[setor] ?? setor, base, atg: atgCounts[setor] ?? 0 }));
    if (outrosBase > 0) result.push({ setor: "Outros", base: outrosBase, atg: outrosAtg });
    return result;
  }, [baseEmpresas, atingidosEmpresas]);

  const setoresEmpregadosChart = useMemo(() => {
    const baseFeats = baseEmpresas?.features ?? [];
    const atgFeats  = atingidosEmpresas?.features ?? [];
    const baseAcc: Record<string, number> = {};
    const atgAcc:  Record<string, number> = {};
    baseFeats.forEach(f => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 ?? "");
      const v = Number((f.properties as Record<string, unknown>)?.Empregados ?? 0);
      if (s) baseAcc[s] = (baseAcc[s] ?? 0) + v;
    });
    atgFeats.forEach(f => {
      const s = String((f.properties as Record<string, unknown>)?.CNAE_2 ?? "");
      const v = Number((f.properties as Record<string, unknown>)?.Empregados ?? 0);
      if (s) atgAcc[s] = (atgAcc[s] ?? 0) + v;
    });
    return Object.entries(baseAcc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([setor, base]) => ({ setor: CNAE_LABELS[setor] ?? setor, base, atg: atgAcc[setor] ?? 0 }));
  }, [baseEmpresas, atingidosEmpresas]);

  const professoresDepChart = useMemo(() => {
    const baseFeats = baseEducacao?.features ?? [];
    const atgFeats  = atingidosEducacao?.features ?? [];
    const DEP: Record<string, string> = { "1": "Federal", "2": "Estadual", "3": "Municipal", "4": "Privada" };
    const baseAcc: Record<string, number> = {};
    const atgAcc:  Record<string, number> = {};
    baseFeats.forEach(f => {
      const d = DEP[String((f.properties as Record<string, unknown>)?.tp_dependencia ?? "")];
      const v = Number((f.properties as Record<string, unknown>)?.qtd_prof ?? 0);
      if (d) baseAcc[d] = (baseAcc[d] ?? 0) + v;
    });
    atgFeats.forEach(f => {
      const d = DEP[String((f.properties as Record<string, unknown>)?.tp_dependencia ?? "")];
      const v = Number((f.properties as Record<string, unknown>)?.qtd_prof ?? 0);
      if (d) atgAcc[d] = (atgAcc[d] ?? 0) + v;
    });
    return Object.entries(baseAcc)
      .sort((a, b) => b[1] - a[1])
      .map(([dep, base]) => ({ dep, base, atg: atgAcc[dep] ?? 0 }));
  }, [baseEducacao, atingidosEducacao]);

  return {
    renderEmp, renderEdu, renderSau,
    metricasEmp, metricasEdu, metricasSau,
    setoresUnicos, depsUnicas, tiposUnicos,
    setoresChart, setoresEmpregadosChart, professoresDepChart,
  };
}
