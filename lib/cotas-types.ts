// Saída de pipeline/climada_cota_detalhe.py (climada_cota_detalhe_{slug}.json): o que fica sob
// água em cada cota do rio, por categoria.
interface DetalheGrupoCota {
  nome: string; n: number; valor_exposto_brl: number
  empregados?: number; massa_salarial_brl?: number; salario_medio_brl?: number
  leitos?: number; profissionais?: number; matriculas?: number; docentes?: number
}
export interface DetalheCotaValores {
  empresas: { n: number; empregados: number; massa_salarial_brl: number; salario_medio_brl: number; valor_exposto_brl: number; setores: DetalheGrupoCota[] }
  saude: { n: number; leitos: number; profissionais: number; valor_exposto_brl: number; tipos: DetalheGrupoCota[] }
  educacao: { n: number; matriculas: number; docentes: number; valor_exposto_brl: number; dependencias: DetalheGrupoCota[] }
  agricultura?: { area_ha: number; culturas: Record<string, number> }
}
export interface DetalheCotaMun {
  municipio: string
  totais: Record<string, { n: number }>
  por_cota: Record<string, DetalheCotaValores>
}
