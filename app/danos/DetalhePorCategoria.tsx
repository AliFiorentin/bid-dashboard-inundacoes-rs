"use client";

import { CNAE_LABELS } from "@/lib/constants";
import type { DetalheCota } from "./types";
import { fmtBRL, fmtN, fmtRS, fmtHa, fmtPct, STAFF_LABEL, ETAPA_LABEL } from "./helpers";
import { Section, DataTable } from "./ui";

export function DetalhePorCategoria({ det, cota, mun }: { det: DetalheCota; cota: string; mun: string }) {
  const cotas = Object.keys(det.por_cota).sort((a, b) => parseFloat(a) - parseFloat(b));
  const c = det.por_cota[cota] ?? det.por_cota[cotas[Math.floor(cotas.length / 2)]];
  const idxCota = cotas.indexOf(cota);
  const destaque = (k: string) => (k === cota ? "font-black text-amber-800" : "font-bold");
  const kpis = (itens: [string, string][]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
      {itens.map(([l, v]) => (
        <div key={l} className="bg-white border border-[#b3cdd8] rounded-xl px-4 py-3 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#2f6a83]">{l}</p>
          <p className="text-xl font-black text-slate-800 leading-tight">{v}</p>
        </div>
      ))}
    </div>
  );
  const sub = (t: string) => <h3 className="text-sm font-black text-[#055071] mt-5 mb-2">{t}</h3>;
  const cotaCell = (k: string) => <span key="c" className={destaque(k)}>{k}</span>;
  return (
    <>
      <Section id="c-empresas" num="3" title="Empresas">
        <p>Estabelecimentos formais (RAIS) sob água em cada cota, com empregados, massa salarial, salário médio e valor exposto. Destaque: cota {cota} m.</p>
        {kpis([
          ["Estabelecimentos", `${fmtN(c.empresas.n)} de ${fmtN(det.totais.empresas.n)}`],
          ["Empregados", fmtN(c.empresas.empregados)],
          ["Massa salarial", `${fmtBRL(c.empresas.massa_salarial_brl)}/mês`],
          ["Salário médio", fmtRS(c.empresas.salario_medio_brl)],
          ["Valor exposto", fmtBRL(c.empresas.valor_exposto_brl)],
        ])}
        {sub(`Por setor (CNAE) · cota ${cota} m`)}
        <DataTable rows={[
          ["Setor", "Estabelecimentos", "Empregados", "Massa salarial", "Salário médio", "Valor exposto"],
          ...c.empresas.setores.map((s) => [CNAE_LABELS[s.nome] ?? s.nome, fmtN(s.n), fmtN(s.empregados ?? 0), fmtBRL(s.massa_salarial_brl ?? 0), fmtRS(s.salario_medio_brl ?? 0), fmtBRL(s.valor_exposto_brl)]),
        ]} />
        {sub("Por cota")}
        <DataTable destaque={idxCota} rows={[
          ["Cota (m)", "Estabelecimentos", "Empregados", "Massa salarial", "Salário médio", "Valor exposto"],
          ...cotas.map((k) => { const e = det.por_cota[k].empresas; return [cotaCell(k), fmtN(e.n), fmtN(e.empregados), fmtBRL(e.massa_salarial_brl), fmtRS(e.salario_medio_brl), fmtBRL(e.valor_exposto_brl)]; }),
        ]} />
        <p className="text-[11px] text-slate-600 mt-2">Massa salarial = soma dos salários mensais dos vínculos (RAIS 2023). Salário médio = massa salarial ÷ empregados.</p>
      </Section>

      <Section id="c-saude" num="4" title="Saúde">
        <p>Estabelecimentos de saúde (CNES) sob água em cada cota, com leitos, profissionais e valor exposto. Destaque: cota {cota} m.</p>
        {kpis([
          ["Estabelecimentos", `${fmtN(c.saude.n)} de ${fmtN(det.totais.saude.n)}`],
          ["Leitos", fmtN(c.saude.leitos)],
          ["Profissionais", fmtN(c.saude.profissionais)],
          ["Valor exposto", fmtBRL(c.saude.valor_exposto_brl)],
        ])}
        {sub(`Profissionais por categoria · cota ${cota} m`)}
        <DataTable rows={[
          ["Categoria", "Profissionais"],
          ...Object.entries(c.saude.staff).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => [STAFF_LABEL[k] ?? k, fmtN(v)]),
        ]} />
        {sub(`Por tipo de unidade · cota ${cota} m`)}
        <DataTable rows={[
          ["Tipo", "Estabelecimentos", "Leitos", "Profissionais", "Valor exposto"],
          ...c.saude.tipos.map((t) => [t.nome, fmtN(t.n), fmtN(t.leitos ?? 0), fmtN(t.profissionais ?? 0), fmtBRL(t.valor_exposto_brl)]),
        ]} />
        {sub("Por cota")}
        <DataTable destaque={idxCota} rows={[
          ["Cota (m)", "Estabelecimentos", "Leitos", "Profissionais", "Valor exposto"],
          ...cotas.map((k) => { const e = det.por_cota[k].saude; return [cotaCell(k), fmtN(e.n), fmtN(e.leitos), fmtN(e.profissionais), fmtBRL(e.valor_exposto_brl)]; }),
        ]} />
      </Section>

      <Section id="c-educacao" num="5" title="Educação">
        <p>Escolas (Censo Escolar) sob água em cada cota, com matrículas, docentes e valor exposto. Destaque: cota {cota} m.</p>
        {kpis([
          ["Escolas", `${fmtN(c.educacao.n)} de ${fmtN(det.totais.educacao.n)}`],
          ["Matrículas", fmtN(c.educacao.matriculas)],
          ["Docentes", fmtN(c.educacao.docentes)],
          ["Valor exposto", fmtBRL(c.educacao.valor_exposto_brl)],
        ])}
        {sub(`Matrículas por etapa · cota ${cota} m`)}
        <DataTable rows={[
          ["Etapa", "Matrículas"],
          ...Object.entries(c.educacao.etapas).map(([k, v]) => [ETAPA_LABEL[k] ?? k, fmtN(v)]),
        ]} />
        {sub(`Por dependência administrativa · cota ${cota} m`)}
        <DataTable rows={[
          ["Dependência", "Escolas", "Matrículas", "Docentes", "Valor exposto"],
          ...c.educacao.dependencias.map((d) => [d.nome, fmtN(d.n), fmtN(d.matriculas ?? 0), fmtN(d.docentes ?? 0), fmtBRL(d.valor_exposto_brl)]),
        ]} />
        {sub("Por cota")}
        <DataTable destaque={idxCota} rows={[
          ["Cota (m)", "Escolas", "Matrículas", "Docentes", "Valor exposto"],
          ...cotas.map((k) => { const e = det.por_cota[k].educacao; return [cotaCell(k), fmtN(e.n), fmtN(e.matriculas), fmtN(e.docentes), fmtBRL(e.valor_exposto_brl)]; }),
        ]} />
      </Section>

      <Section id="c-agricultura" num="6" title="Agricultura">
        <p>
          Área agrícola ({det.ano_agricultura}, MapBiomas) sob água em cada cota, por cultura. Os polígonos são sobrepostos à
          grade do raster e conta-se a área dos pixels com água. Destaque: cota {cota} m.
        </p>
        {c.agricultura ? (
          <>
            {kpis([
              ["Área sob água", fmtHa(c.agricultura.area_ha)],
              ["% da área agrícola", fmtPct(c.agricultura.area_ha, Object.values(det.area_agricola_total_ha).reduce((s, v) => s + v, 0))],
            ])}
            {sub(`Por cultura · cota ${cota} m`)}
            <DataTable rows={[
              ["Cultura", "Área sob água", `Área total em ${mun}`, "% da cultura"],
              ...Object.entries(c.agricultura.culturas).map(([k, v]) => [k, fmtHa(v), fmtHa(det.area_agricola_total_ha[k] ?? 0), fmtPct(v, det.area_agricola_total_ha[k])]),
            ]} />
            {sub("Por cota")}
            <DataTable destaque={idxCota} rows={[
              ["Cota (m)", ...Object.keys(det.area_agricola_total_ha), "Total"],
              ...cotas.map((k) => {
                const a = det.por_cota[k].agricultura;
                return [cotaCell(k), ...Object.keys(det.area_agricola_total_ha).map((cl) => fmtHa(a?.culturas[cl] ?? 0)), fmtHa(a?.area_ha ?? 0)];
              }),
            ]} />
            <p className="text-[11px] text-slate-600 mt-2">Sem valor exposto: não há valor de reposição para lavouras nesta metodologia.</p>
          </>
        ) : <p>Sem dados de agricultura para este município.</p>}
      </Section>
    </>
  );
}
