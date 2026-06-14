# Design — Refatoração Dashboard + Limpeza de Código

**Data:** 2026-05-24  
**Status:** Aprovado  
**Escopo:** `app/page.tsx` (1.753 linhas) → módulos isolados + remoção de código morto

---

## Motivação

`app/page.tsx` concentra estado, efeitos, lógica de negócio, camadas de mapa e cinco abas de análise num único arquivo de 1.753 linhas. Qualquer alteração pontual exige navegar por centenas de linhas sem relação com a mudança. A refatoração mantém comportamento idêntico e não introduz novas funcionalidades.

---

## Estrutura de módulos alvo

```
app/
  page.tsx                          (~80 linhas — composição pura)

hooks/
  useDashboard.ts                   (~480 linhas — todo estado, effects, memos, handlers)

components/
  DashboardHeader.tsx               (~110 linhas)
  DashboardMap.tsx                  (~260 linhas — Sources/Layers MapLibre)
  MapPopup.tsx                      (~200 linhas — renderPopupContent)
  FiltersPanel.tsx                  (~120 linhas)
  AnalysisPanel.tsx                 (~100 linhas — container Tabs + botões Baixar/Imprimir/Ocultar)
  tabs/
    EmpresasTab.tsx                 (~110 linhas)
    EducacaoTab.tsx                 (~140 linhas)
    SaudeTab.tsx                    (~130 linhas)
    InfraTab.tsx                    (~90 linhas — container + "camadas disponíveis")
    infra/
      LogradourosSection.tsx        (~90 linhas)
      QuadrasSection.tsx            (~40 linhas)
      TerrenosSection.tsx           (~90 linhas)
      GenericInfraSection.tsx       (~60 linhas — demais tipos via switch)
  ui/
    BarServico.tsx                  (~30 linhas)
    KPIRow.tsx                      (existente — sem alteração)
    LegendItem.tsx                  (existente — sem alteração)
  AgriculturaTab.tsx                (existente — sem alteração)
  theme-provider.tsx                (existente — sem alteração)

lib/
  constants.ts                      (adicionar PIORES_CENARIOS)
  geo-utils.ts                      (reduzir eslint-disable com tipos adequados)
  utils.ts                          (sem alteração)
```

---

## Fluxo de dados

`useDashboard` é chamado uma única vez em `page.tsx`. Retorna tudo por destructuring. Não há Context API — prop drilling máximo de 1 nível.

### O que o hook expõe

| Grupo | Exemplos |
|---|---|
| Estado de seleção | `municipio`, `cenario`, `setMunicipio`, `setCenario` |
| Visibilidade | `camadas`, `infraAtivas`, `showPainelAnalise`, `showMancha`, `showFiltros` |
| GeoJSON base | `baseEmpresas`, `baseEducacao`, `baseSaude`, `baseInfra` |
| GeoJSON atingidos | `atingidosEmpresas`, `atingidosEducacao`, `atingidosSaude`, `atingidosInfra` |
| Agricultura | `baseAgriStats`, `atingidosAgriStats`, `conabStats`, `allMunAgriStats`, `allMunAgriAtingidosStats` |
| Mancha/limite | `manchaCenario`, `manchaRS`, `limitePA` |
| UI estado | `isLoading`, `cursor`, `popupInfo`, `tabAtiva` |
| Listas expansíveis | `showListaEscolas`, `showListaHospitais`, `showListaUBS`, `showListaAmbulat`, `showListaLogradouros`, `showListaEixos` |
| Filtros | `filtroSetor`, `filtroDep`, `filtroTipo` |
| Derivados | `isVisaoGeral`, `isCenarioAtivo`, `mostraImpacto`, `possuiInfra`, `temCamadaTabular` |
| Memos de render | `renderEmp`, `renderEdu`, `renderSau` |
| Métricas | `metricasEmp`, `metricasEdu`, `metricasSau`, `setoresChart` |
| Listas únicas | `setoresUnicos`, `depsUnicas`, `tiposUnicos` |
| Handlers | `toggleCamada`, `toggleInfra`, `handleMapClick`, `exportarExcel` |
| Setters de UI | `setTabAtiva`, `setShowPainelAnalise`, `setShowFiltros`, `setShowMancha`, `setCursor`, `setPopupInfo` |
| Setters de listas | `setShowListaEscolas`, `setShowListaHospitais`, `setShowListaUBS`, `setShowListaAmbulat`, `setShowListaLogradouros`, `setShowListaEixos` |
| Refs | `mapRef` |
| Setters de filtro | `setFiltroSetor`, `setFiltroDep`, `setFiltroTipo` |

### Composição de `page.tsx` alvo

```tsx
export default function Dashboard() {
  const dash = useDashboard();
  return (
    <div className="relative w-screen h-screen ...">
      <DashboardMap    dash={dash} />
      <LoadingSpinner  visible={dash.isLoading} />
      <LegendaWidget   dash={dash} />
      <Copyright />
      <DashboardHeader dash={dash} />
      <FiltersPanel    dash={dash} />
      <AnalysisPanel   dash={dash} />
      {!dash.showPainelAnalise && <BotaoAbrirPainel onClick={...} />}
    </div>
  );
}
```

> `LegendaWidget` (botão legenda + lista) e `Copyright` (rodapé fixo) ficam como JSX inline em `page.tsx` — cada um tem menos de 25 linhas e não justifica arquivo separado.

---

## Limpeza junto à refatoração

| Item | Ação |
|---|---|
| `pioresCenarios` inline no useEffect `[municipio]` | Mover para `PIORES_CENARIOS` em `constants.ts` |
| `BarServico` no final de `page.tsx` | Extrair para `components/ui/BarServico.tsx` |
| CSS inline MapLibre popup (`<style dangerouslySetInnerHTML>`) | Mover para `globals.css` (já tem seção `.maplibregl-*`) |
| `@turf/turf` instalado mas não usado | Remover do `package.json` + `npm install` |
| 10× `eslint-disable-next-line @typescript-eslint/no-explicit-any` em `geo-utils.ts` | Substituir `any[]` por tipo `GeoFeature` local ou `Feature` do `geojson` |
| `formatoBr` em `geo-utils.ts` exportada mas usada só internamente | Manter como `export` (sem risco, pequeno) |

---

## Restrições

- **Zero mudança de comportamento** — nenhuma feature nova, nenhuma remoção de funcionalidade
- **Zero novo estado global** — sem Zustand, Redux, Context
- **Todos os `useEffect` com AbortController** mantidos intactos no hook
- **`"use client"`** permanece em `page.tsx` e em qualquer componente que use hooks; `useDashboard` não precisa de diretiva (é um hook, não um módulo de servidor)
- O arquivo `app/metodologia/page.tsx` **não é tocado**

---

## Ordem de implementação recomendada

1. Extrair `BarServico` e mover CSS do popup → menor risco, valida o fluxo
2. Criar `useDashboard` copiando estado+effects de `page.tsx`; fazer `page.tsx` consumir o hook; verificar que tudo funciona
3. Extrair componentes de folha primeiro (sem filhos): `DashboardHeader`, `FiltersPanel`
4. Extrair abas: `EmpresasTab`, `EducacaoTab`, `SaudeTab`
5. Extrair seções infra: `LogradourosSection`, `QuadrasSection`, `TerrenosSection`, `GenericInfraSection` → montar `InfraTab`
6. Extrair `MapPopup`, `DashboardMap`
7. Extrair `AnalysisPanel`
8. Limpeza final: `@turf/turf`, `geo-utils.ts` tipos, `PIORES_CENARIOS`
9. `npm run typecheck && npm run lint` — zero erros

---

## Critério de conclusão

- `npm run typecheck` — zero erros
- `npm run lint` — zero erros
- `page.tsx` ≤ 120 linhas
- Nenhum arquivo novo ultrapassa 500 linhas
- Funcionalidade idêntica ao estado atual (dashboard abre, mapa carrega, abas funcionam, exports funcionam)
