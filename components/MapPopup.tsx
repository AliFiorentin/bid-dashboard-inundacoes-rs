"use client";
import React from "react";
import { STAFF_COLS, normalizeDep } from "@/lib/constants";
import { compactoBr } from "@/lib/geo-utils";

interface Props {
  source: string;
  properties: Record<string, unknown>;
}

export function MapPopup({ source, properties: p }: Props) {
  if (source === "empresas") {
    return (
      <div className="flex flex-col gap-1.5 p-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100">
        <strong className="text-blue-700 uppercase tracking-wider text-[10px] border-b border-slate-100 pb-1">🏢 Empresa</strong>
        <span className="font-bold text-xs text-slate-800 leading-tight">{p.CNAE_2 as string || 'Sem Setor Informado'}</span>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Empregados</span>
            <span className="text-xs font-black text-slate-800">{p.Empregados as number}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Massa Sal.</span>
            <span className="text-xs font-black text-slate-800">R$ {compactoBr(p.Massa_Salarial as number, 1)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (source === "educacao") {
    return (
      <div className="flex flex-col gap-1.5 p-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100">
        <strong className="text-green-700 uppercase tracking-wider text-[10px] border-b border-slate-100 pb-1">🎓 Educação ({normalizeDep(String(p.tp_dependencia || '')) || 'N/A'})</strong>
        <span className="font-bold text-xs text-slate-800 leading-tight">{p.no_entidade as string || 'Escola sem nome'}</span>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Professores</span>
            <span className="text-xs font-black text-slate-800">{p.qtd_prof as number || 0}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Total Alunos</span>
            <span className="text-xs font-black text-slate-800">
              {((p.qtd_matri_inf as number) || 0) + ((p.qtd_matri_fund as number) || 0) + ((p.qtd_matri_med as number) || 0)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (source === "saude") {
    const totalProfissionais = STAFF_COLS.reduce((acc, col) => acc + ((p[col] as number) || 0), 0);
    return (
      <div className="flex flex-col gap-1.5 p-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100">
        <strong className="text-red-700 uppercase tracking-wider text-[10px] border-b border-slate-100 pb-1">🏥 Saúde ({p.co_tipo_estabelecimento as string || 'N/A'})</strong>
        <span className="font-bold text-xs text-slate-800 leading-tight">{(p.no_fantasia as string) || (p.no_razao_social as string) || 'Unidade de Saúde'}</span>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Médicos</span>
            <span className="text-xs font-black text-slate-800">{(p.staff_medicos as number) || 0}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Enfermagem</span>
            <span className="text-xs font-black text-slate-800">{(p.staff_enfermagem as number) || 0}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100 col-span-2">
            <span className="block text-[9px] text-slate-500 uppercase font-bold">Total de Profissionais</span>
            <span className="text-xs font-black text-slate-800">{totalProfissionais}</span>
          </div>
        </div>
      </div>
    );
  }

  if (source.startsWith("infra-")) {
    const nomeLower = source.replace('infra-', '');
    const displayNome = nomeLower.replace(/_/g, ' ');
    let content: React.ReactNode = null;

    if (nomeLower === 'terminais') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Nome:</span><span className="text-slate-800 font-medium text-right">{p.NOME as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Classe:</span><span className="text-slate-800 font-medium text-right">{p.CLASSE as string}</span></div>
        </>
      );
    } else if (nomeLower === 'paradas') {
      content = <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Nome:</span><span className="text-slate-800 font-medium text-right">{p.PLOGR as string}</span></div>;
    } else if (nomeLower === 'onibus') {
      content = <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Rota:</span><span className="text-slate-800 font-medium text-right">{(p.ROTA || p.rota) as string}</span></div>;
    } else if (nomeLower === 'hidrantes') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Número:</span><span className="text-slate-800 font-medium text-right">{p.NO as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Endereço:</span><span className="text-slate-800 font-medium text-right">{p.DESLOC as string}</span></div>
        </>
      );
    } else if (nomeLower === 'gas') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">ID:</span><span className="text-slate-800 font-medium text-right">{(p.ID || p.OBJECTID || p.id) as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Material:</span><span className="text-slate-800 font-medium text-right">{p.MATERIAL as string}</span></div>
        </>
      );
    } else if (nomeLower === 'quarteiroes') {
      content = <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Número:</span><span className="text-slate-800 font-medium text-right">{p.qtr as string}</span></div>;
    } else if (nomeLower === 'eixos_logradouros') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Nome:</span><span className="text-slate-800 font-medium text-right">{p.NMIDEABR as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Ímpar Ini:</span><span className="text-slate-800 font-medium text-right">{p.NRINPINI as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Ímpar Fin:</span><span className="text-slate-800 font-medium text-right">{p.NRINPFIN as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Par Ini:</span><span className="text-slate-800 font-medium text-right">{p.NRPARINI as string}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Par Fin:</span><span className="text-slate-800 font-medium text-right">{p.NRPARFIN as string}</span></div>
        </>
      );
    } else if (nomeLower === 'lotes') {
      content = (
        <>
          {(p.Area_m2 || p.AREA) && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Área:</span><span className="text-slate-800 font-medium text-right">{p.Area_m2 ? `${Number(p.Area_m2).toFixed(1)} m²` : p.AREA as string}</span></div>}
          {p.TIPO && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Tipo:</span><span className="text-slate-800 font-medium text-right">{p.TIPO as string}</span></div>}
          {p.codigo && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Código:</span><span className="text-slate-800 font-medium text-right">{p.codigo as string}</span></div>}
          {p.numero && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Número:</span><span className="text-slate-800 font-medium text-right">{p.numero as string}</span></div>}
        </>
      );
    } else if (nomeLower === 'imoveis') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Uso:</span><span className="text-slate-800 font-medium text-right">{(p.Uso as string) || '—'}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Patrimônio:</span><span className="text-slate-800 font-medium text-right">{(p.Patrim as string) || '—'}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Condomínio:</span><span className="text-slate-800 font-medium text-right">{(p.Condom as string) || '—'}</span></div>
        </>
      );
    } else if (nomeLower === 'predios_publicos') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Nome:</span><span className="text-slate-800 font-medium text-right">{(p.Nome as string) || '—'}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Endereço:</span><span className="text-slate-800 font-medium text-right">{(p['Endereço'] as string) || '—'}</span></div>
        </>
      );
    } else if (nomeLower === 'seguranca') {
      content = (
        <>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Nome:</span><span className="text-slate-800 font-medium text-right">{(p.Nome as string) || '—'}</span></div>
          <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Endereço:</span><span className="text-slate-800 font-medium text-right">{(p['Endereço'] as string) || '—'}</span></div>
        </>
      );
    } else if (nomeLower === 'iluminacao_publica') {
      content = (
        <>
          {p.Fonte && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Fonte:</span><span className="text-slate-800 font-medium text-right">{p.Fonte as string}</span></div>}
          {p.Potencia && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Potência:</span><span className="text-slate-800 font-medium text-right">{p.Potencia as string} W</span></div>}
          {p.Quantidade && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Qtd:</span><span className="text-slate-800 font-medium text-right">{p.Quantidade as string}</span></div>}
        </>
      );
    } else if (nomeLower === 'logradouros') {
      if (p.nome || p.tipo || p.codigo) {
        const nomeExibe = p.nome && String(p.nome).length > 1 ? p.nome as string : null;
        content = (
          <>
            {p.tipo && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Tipo:</span><span className="text-slate-800 font-medium text-right">{p.tipo as string}</span></div>}
            {nomeExibe && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Nome:</span><span className="text-slate-800 font-medium text-right">{nomeExibe}</span></div>}
            {p.codigo && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Código:</span><span className="text-slate-800 font-medium text-right">{p.codigo as string}</span></div>}
          </>
        );
      }
    } else if (nomeLower === 'quadras') {
      if (p.codigo || p.Area_m2) {
        content = (
          <>
            {p.codigo && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Código:</span><span className="text-slate-800 font-medium text-right">{p.codigo as string}</span></div>}
            {p.Area_m2 && <div className="text-[10px] flex justify-between gap-2 border-b border-slate-50 pb-0.5"><span className="text-slate-500 uppercase font-bold">Área:</span><span className="text-slate-800 font-medium text-right">{Number(p.Area_m2).toFixed(1)} m²</span></div>}
          </>
        );
      }
    }

    if (!content) return null;

    return (
      <div className="flex flex-col gap-1.5 p-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100">
        <strong className="text-orange-600 uppercase tracking-wider text-[10px] border-b border-slate-100 pb-1">🏗️ Infraestrutura ({displayNome})</strong>
        <div className="max-h-32 overflow-y-auto pr-1 flex flex-col gap-1 mt-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {content}
        </div>
      </div>
    );
  }

  return null;
}
