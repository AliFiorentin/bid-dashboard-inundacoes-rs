import type { Feature, FeatureCollection } from "geojson";
import { STAFF_COLS } from "./constants";

// ── Slugs ────────────────────────────────────────────────────────────────────
export const slugify = (str: string) =>
  str.normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const scenarioSlug = (mun: string, cen: string) =>
  `${slugify(mun)}___${slugify(cen)}`;

// ── Formatação ───────────────────────────────────────────────────────────────
export const formatoBr = (num: number, casas = 0) =>
  num.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const compactoBr = (n: number, casas = 1): string => {
  if (n === undefined || n === null || isNaN(n)) return "0";
  const abs = Math.abs(n);
  const sinal = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sinal}${formatoBr(abs / 1e9, casas)} Bi`;
  if (abs >= 1e6) return `${sinal}${formatoBr(abs / 1e6, casas)} Mi`;
  if (abs >= 1e3) return `${sinal}${formatoBr(abs / 1e3, casas)} Mil`;
  return `${sinal}${formatoBr(abs, casas)}`;
};

export const calcPct = (parte: number, total: number) => {
  if (!total || total === 0) return "0%";
  return `${formatoBr((parte / total) * 100, 0)}%`;
};

// ── GeoJSON helpers ──────────────────────────────────────────────────────────
export const mergeGeoJSON = (arrays: (FeatureCollection | null | undefined)[]): FeatureCollection | null => {
  let globalId = 1;
  const allFeatures = arrays
    .filter((d): d is FeatureCollection => d != null && Array.isArray(d.features))
    .flatMap(d => d.features.map(f => {
      const feature = { ...f, id: globalId++ };
      if (feature.properties) {
        feature.properties = { ...feature.properties, id: feature.id };
      }
      return feature;
    }));
  if (allFeatures.length === 0) return null;
  return { type: "FeatureCollection", features: allFeatures };
};

// ── Contagens / métricas ─────────────────────────────────────────────────────
export const countFlag = (feats: Feature[], prop: string): number => {
  if (!feats?.length) return 0;
  return feats.filter(f => {
    const v = (f.properties as Record<string, unknown>)?.[prop];
    if (v === null || v === undefined) return false;
    const n = Number(v);
    if (!isNaN(n)) return n === 1;
    return ["1", "sim", "true", "yes"].includes(String(v).trim().toLowerCase());
  }).length;
};

export const countEquals = (feats: Feature[], prop: string, values: string[]): number => {
  if (!feats?.length) return 0;
  const set = new Set(values.map(v => v.toLowerCase()));
  return feats.filter(f =>
    set.has(String((f.properties as Record<string, unknown>)?.[prop] ?? "").trim().toLowerCase())
  ).length;
};

export const countRuasUnicas = (feats: Feature[]): number => {
  if (!feats?.length) return 0;
  const ids = new Set(feats.map(f => {
    const props = f.properties as Record<string, unknown>;
    const tipo = String(props?.tipo ?? props?.Tipo ?? "").trim();
    const nome = String(props?.nome ?? props?.Nome ?? "").trim();
    return tipo || nome ? `${tipo} ${nome}`.trim() : null;
  }).filter(Boolean));
  return ids.size || feats.length;
};

export const getRuasListPOA = (feats: Feature[]): string[] => {
  const seen = new Set<string>();
  feats.forEach(f => {
    const props = f.properties as Record<string, unknown>;
    const cat  = String(props?.CDIDECAT ?? "").trim();
    const nome = String(props?.NMIDELOG  ?? "").trim();
    const label = [cat, nome].filter(Boolean).join(" ");
    if (label) seen.add(label);
  });
  return [...seen].sort((a, b) => a.localeCompare(b, "pt-BR"));
};

export const countRuasUnicasPOA = (feats: Feature[]): number => getRuasListPOA(feats).length;

export const getRotas = (feats: Feature[]): number => {
  if (!Array.isArray(feats)) return 0;
  const set = new Set<string>();
  feats.forEach(x => {
    const props = x.properties as Record<string, unknown>;
    const r = props?.ROTA || props?.rota;
    if (r) set.add(String(r).trim());
  });
  return set.size;
};

export const getLen = (feats: Feature[]): number => {
  if (!Array.isArray(feats)) return 0;
  const seen = new Set<string>();
  let s = 0;
  feats.forEach(x => {
    const props = x.properties as Record<string, unknown>;
    const h = JSON.stringify(x.geometry ? (x.geometry as { coordinates?: unknown }).coordinates ?? [] : []);
    if (!seen.has(h)) {
      seen.add(h);
      s += Number(props?.LENGTH || props?.length || props?.shape_leng || 0);
    }
  });
  return s;
};

// ── Calculadores de métricas por camada ──────────────────────────────────────
export const calcEmp = (base: FeatureCollection | null | undefined) => {
  if (!base || !Array.isArray(base.features)) return { estab: 0, emp: 0, massa: 0, media: 0 };
  const estab = base.features.length;
  const emp   = base.features.reduce((acc, f) => acc + ((f.properties as Record<string, unknown>)?.Empregados    as number || 0), 0);
  const massa = base.features.reduce((acc, f) => acc + ((f.properties as Record<string, unknown>)?.Massa_Salarial as number || 0), 0);
  return { estab, emp, massa, media: emp > 0 ? massa / emp : 0 };
};

export const calcEdu = (base: FeatureCollection | null | undefined) => {
  if (!base || !Array.isArray(base.features)) return { escolas: 0, prof: 0, inf: 0, fund: 0, med: 0, profis: 0, eja: 0, esp: 0 };
  const sum = (prop: string) => base.features.reduce((acc, f) => acc + ((f.properties as Record<string, unknown>)?.[prop] as number || 0), 0);
  return { escolas: base.features.length, prof: sum("qtd_prof"), inf: sum("qtd_matri_inf"), fund: sum("qtd_matri_fund"), med: sum("qtd_matri_med"), profis: sum("qtd_matri_prof"), eja: sum("qtd_matri_eja"), esp: sum("qtd_matri_esp") };
};

export const calcSau = (base: FeatureCollection | null | undefined) => {
  if (!base || !Array.isArray(base.features)) return { unidades: 0, tipos: {} as Record<string,number>, staff: {} as Record<string,number> };
  const tipos: Record<string,number> = {};
  const staff: Record<string,number> = {};
  STAFF_COLS.forEach(c => (staff[c] = 0));
  base.features.forEach(f => {
    const props = f.properties as Record<string, unknown>;
    const t = props?.co_tipo_estabelecimento;
    if (t && t !== "nan" && t !== "") tipos[String(t)] = (tipos[String(t)] || 0) + 1;
    STAFF_COLS.forEach(c => (staff[c] += (props?.[c] as number || 0)));
  });
  return { unidades: base.features.length, tipos, staff };
};
