# Relatório de auditoria — Dashboard BID + pipeline

Data: 2026-10-22. Escopo: páginas `/` (Dashboard), `/danos`, `/metodologia`, `/climada` (redirect), rotas
interceptadas `@modal`, e o pipeline Python (`pipeline/`).

**Como foi feito:** `tsc --noEmit` (passa limpo), ESLint, `knip` (código/exports/dependências não usados),
`ruff` + `vulture` no Python, varredura por padrões (console.log, TODO, `any`, `eslint-disable`), medição de tamanho dos dados
em `public/`, benchmark do redesenho do mapa por cota no navegador e carga de cada página no preview (console).
**Não foi feito:** `next build` completo (o servidor de desenvolvimento estava em uso), testes automatizados (não há),
auditoria de acessibilidade com ferramenta (só leitura de código).

Resumo: nenhum erro de tipo ou de runtime nas páginas; os problemas relevantes são de **desempenho e peso dos dados**,
**duplicação/código morto** e **organização do repositório**.

---

## 1. Alta prioridade

| # | Achado | Onde | Impacto | Sugestão |
|---|--------|------|---------|----------|
| A1 | **Redesenho do mapa por cota usa `canvas.toBlob()` (PNG) a cada quadro.** Benchmark na grade de Porto Alegre (2200×1700): recolor 41 ms, **`toBlob` ~1,1 s**, decode 40 ms (ambiente de teste; em Chrome desktop costuma ser menor, mas continua sendo o gargalo). A animação fica em poucos quadros por segundo e consome CPU. | `hooks/useCotaRaster.ts` (efeito de recolor) | Animação "travada" em Porto Alegre; ventilador/bateria no notebook | Trocar por fonte `canvas` do MapLibre (sem codificar PNG) ou por camada WebGL custom com *shader* (a cota vira um `uniform`; a textura é a de índices, enviada uma vez). Alternativa rápida: reduzir a grade (MAX_PX 2200 → 1200) e limitar a ~15 quadros/s. |
| A2 | **Pré-carga de TODA a infraestrutura BASE ao escolher um município.** Em Porto Alegre são 12 arquivos (≈ 400 MB; `edificacoes` 162 MB, `lotes` 121 MB, `rede_esgoto` 65 MB), baixados mesmo sem nenhuma camada ligada. É um comentário "aceito de propósito" no código. | `hooks/useDashboard.ts` (efeito "Pre-carrega BASE de TODOS os tipos de infra") | Tempo de carregamento, dados móveis, memória do navegador; também inclui o cenário "Todas as cotas", que nem usa infra | Gerar um `infraestrutura_stats.json` por município (já existe parcial) com as métricas do painel e baixar o GeoJSON só quando a camada for ligada; ou servir FlatGeobuf/PMTiles por área visível (`flatgeobuf` já é dependência, mas não é usada). |
| A3 | **Repositório pai e submódulo apontam para o MESMO repositório GitHub** (`bid-dashboard-inundacoes-rs`; o submódulo usa `main`, o pai usa `master`). Nomes de branch colidem (o push de `feat/cenario-todas-as-cotas` do pai foi rejeitado). | `.gitmodules`, `git remote -v` | Risco de sobrescrever/misturar histórico e de a Vercel buildar o conteúdo errado | Criar um repositório separado para o pipeline (ou fazer o pai ser o repositório do pipeline) e manter o Dashboard só como submódulo. |
| A4 | **Peso dos dados no Git:** `public/` tem 926 MB (610 MB só Porto Alegre); `.git` ~1 GB nos dois repositórios; GeoJSONs > 100 MB estão em Git LFS, mas há vários de 20–70 MB comuns; o pai também versiona um `.docx` de 40 MB e um PDF de 9 MB. | `public/dados_convertidos/**`, raiz | Clone lento, builds lentos, limites de LFS/Vercel (já foi preciso `outputFileTracingExcludes`) | Mover dados pesados para armazenamento de objetos (R2/S3/Vercel Blob) + CDN, ou gerar tiles; manter no Git só os JSONs pequenos. `git lfs migrate` para o histórico se for preciso reduzir o `.git`. |
| A5 | **Nenhum `import()` dinâmico no app.** `xlsx` (~500 KB, usado só no botão "Baixar"), `recharts`, `katex` e `maplibre-gl` entram no bundle principal; `DanosClient.tsx` (2.688 linhas) e `MetodologiaContent.tsx` (1.581) são componentes cliente monolíticos. | `hooks/useDashboard.ts` (`import * as XLSX`), páginas | JS inicial grande, TTI pior em redes lentas | `const XLSX = await import("xlsx")` dentro de `exportarExcel`; `next/dynamic` para o mapa de `/danos` e para as abas pesadas; dividir `DanosClient` por aba. |

## 2. Média prioridade

| # | Achado | Onde | Sugestão |
|---|--------|------|----------|
| M1 | **Regra `react-hooks/set-state-in-effect` falha (2 erros)**: `DanosClient.tsx:302` e `useCotaRaster.ts:68` (reset de estado no efeito). Além disso há um `eslint-disable` sem efeito em `useDashboard.ts:635`. | ESLint | Derivar o estado (chave por `slug`) ou usar `key` no componente em vez de resetar no efeito; remover o disable inútil. `npm run lint` hoje retorna erro. |
| M2 | **Chip "Mancha" some durante a reprodução** do cenário "Todas as cotas": ele depende de `isCenarioAtivo`, que só é verdadeiro com a cota pausada. O usuário não consegue ocultar a água enquanto ela anima. | `components/FiltersPanel.tsx`, `hooks/useDashboard.ts` | Mostrar o chip quando `cotasAtivo`. |
| M3 | **Legenda mostra Empresas/Educação/Saúde mesmo com os pontos ocultos** (durante a reprodução). | `app/page.tsx` | Esconder os itens enquanto `cotasTocando`. |
| M4 | **A cota não vai para o permalink** (só município, cenário e câmera), então o link não reproduz um instante pausado. | `hooks/useDashboard.ts` (URL) | Adicionar `?cota=` quando pausada. |
| M5 | **Contagens divergentes entre abas no cenário "Todas as cotas"**: a aba "Por cota" usa o amostrador de 5 m (pipeline); as demais abas, com a cota pausada, amostram o raster reduzido (~10–20 m, max-pooling, tende a superestimar). | `hooks/useDashboard.ts`, `pipeline/climada_cota_mapa.py` | Ou aceitar e documentar, ou gerar no pipeline o ATINGIDOS por cota com a mesma amostragem de 5 m. |
| M6 | **Formatação numérica inconsistente**: o cartão de população mostra `0.5%` (ponto) enquanto o resto usa vírgula. | `components/AnalysisPanel.tsx` | Usar um `fmtPct` único (já existe `formatoBr` em `lib/geo-utils.ts`, exportado e sem uso). |
| M7 | **Imagens `next/image` com `fill` sem `sizes`** (aviso no console em todas as páginas). | `app/page.tsx` (logos mobile), `HeaderLogos` | Adicionar `sizes`. |
| M8 | **Vazamento pequeno de Blob URLs** no hook de cota: a última URL não é revogada ao desmontar/trocar de município. | `hooks/useCotaRaster.ts` | Revogar no cleanup do efeito de `slug`. |
| M9 | **Hook `useDashboard` com 1.045 linhas e ~18 efeitos** misturando carga de dados, URL, filtros e exportação; `DashboardMap` com 1.070 linhas. Difícil de testar e de otimizar. | `hooks/useDashboard.ts`, `components/DashboardMap.tsx` | Extrair `useScenarioData`, `usePermalink`, `useInfraData`, `exportarExcel`; camadas do mapa em subcomponentes. |

## 3. Código morto e dependências (knip)

- **Arquivos sem uso (3):** `components/ui/badge.tsx`, `components/ui/chart.tsx` (373 linhas), `components/ui/separator.tsx`.
- **Dependências sem uso:** `flatgeobuf`, `qs` (e `shadcn` como pacote de runtime — é CLI, deveria ser devDependency ou `npx`). **devDependencies:** `@eslint/eslintrc`, `@types/turf` (obsoleto). `geojson` e `postcss-load-config` usados mas **não declarados**.
- **Exports sem uso:** `DEP_LABELS`, `CENARIO_DISPLAY_LABEL`, `DANO_FISICO_SETORES` (`lib/constants.ts`), `formatoBr` (`lib/geo-utils.ts`), vários exports de `ui/*` (padrão shadcn, normal), e ~10 tipos exportados em `DanosClient.tsx` (podem ficar internos).
- **Rota `/climada`:** só redireciona para `/danos?aba=climada` (mantida por compatibilidade — ok, mas documente a data para remover).
- **Pipeline (ruff/vulture):** imports não usados (`08_icms_validacao.py`: `MUNICIPIOS`, `DASH_DATA`; `09_populacao.py`: `matplotlib.cm`); variáveis não usadas (`04_agricultura.py:124 slug`, `05_geocodificar.py:55 bairro`, `climada_cota_detalhe.py:149 cobertura`, `climada_exposicao.py:104 is_ind`); 10 f-strings sem placeholder; 8 `zip()` sem `strict=`. O alerta B023 em `07_danos.py:200-202` é falso positivo (as *lambdas* são chamadas dentro da mesma iteração).
- **Dois arquivos de protótipo grandes** (`climada_risco_prototipo.py` 924 linhas, `climada_medidas.py` 364) são importados por vários scripts; considere promover para módulo `climada/` com testes.

## 4. Robustez, pipeline e organização

- **Caminhos absolutos do Windows** no pipeline (`D:/Projetos/BID`, `C:\Users\...\Downloads\...`; 10 ocorrências). Hoje só roda na máquina do autor. Usar variáveis de ambiente / `.env` ou `config.local.py`.
- **Sem testes automatizados e sem `requirements.txt`/lockfile Python.** Há `pipeline/validation/`, mas é manual. Sugestão: um teste de "fumaça" por script (entrada pequena) e `pip freeze`/`pyproject.toml`.
- **Sem CI**: nem `tsc`, `eslint` nem verificação dos GeoJSONs/JSONs gerados rodam a cada push. Um workflow simples (typecheck + lint + `check_geojson.py`) já pega regressões.
- **Finais de linha misturados** (CRLF/LF; o Git avisa a cada commit). Adicionar `.gitattributes` com `* text=auto eol=lf`.
- **`vercel.json` ignora builds fora de produção** (`ignoreCommand`), ou seja, *previews* de branch não são gerados: bom para custo, ruim para revisar PRs. Considere liberar só para a branch de feature ativa.
- **`next.config` `output: "standalone"`** com 900 MB de estáticos: confirme que o deploy não copia `public/dados_convertidos/*/**` para a função (o `outputFileTracingExcludes` cuida disso; vale checar o tamanho do artefato em cada deploy).

## 5. Páginas (resultado da verificação)

| Página | Estado |
|--------|--------|
| `/` Dashboard | Carrega sem erro de console; único aviso: `sizes` em `next/image`. Cenário "Todas as cotas" funcional (ver A1 para desempenho). |
| `/danos` | Carrega sem erro. Componente único de 2,7 mil linhas; muitos `useState`/derivações no mesmo escopo (re-render de tudo a cada troca de aba/cota). |
| `/metodologia` | Carrega sem erro. Conteúdo estático em componente cliente (`katex` no cliente) — poderia ser Server Component com `katex.renderToString` no servidor, reduzindo JS. |
| `/climada` | Redireciona corretamente para `/danos?aba=climada`. |
| Rotas `@modal` | Reutilizam `get-data.ts` das páginas (boa prática); não testei o modal em dispositivo móvel. |

## 6. Acessibilidade e UX (leitura de código)

- Slider da cota: falta `aria-valuetext` ("cota 27,05 metros") e o botão play/pause não anuncia o estado de reprodução além do rótulo; a animação automática deveria respeitar `prefers-reduced-motion`.
- Cores das camadas (azul-claro/azul-escuro) e dos KPIs dependem só de cor; acrescentar rótulos/padrões ajuda daltonismo.
- Abaixo de 1024 px o painel é substituído por um aviso "acesse pelo computador" — considerar uma versão móvel simplificada (só mapa + painel recolhível).

## 7. Melhorias sugeridas (roadmap)

**Curto prazo (1–2 dias) — APLICADO em 2026-10-22, exceto `.gitattributes` e M3 (a legenda já oculta os itens durante a reprodução)**
1. `import("xlsx")` dinâmico; remover `flatgeobuf`, `qs`, `@types/turf`, `@eslint/eslintrc`; apagar `ui/badge|chart|separator`; corrigir os 2 erros de lint; `sizes` nas imagens. (A5, M1, M7, seção 3)
2. Corrigir M2/M3/M8 (chip da mancha, legenda, revogação de Blob).
3. `.gitattributes` e um workflow de CI (typecheck + lint).

**Médio prazo (1–2 semanas)**
4. Trocar o redesenho por PNG por WebGL/canvas source (A1) e limitar a taxa de quadros; `prefers-reduced-motion`.
5. Carga sob demanda da infraestrutura + estatísticas pré-calculadas (A2); avaliar FlatGeobuf/PMTiles.
6. Separar repositórios e tirar dados pesados do Git (A3, A4).
7. Quebrar `useDashboard`, `DashboardMap` e `DanosClient` em módulos menores (M9); `/metodologia` como Server Component.
8. Cota no permalink (M4) e unificar a amostragem de 5 m para todas as abas por cota (M5).

**Longo prazo**
9. Testes de pipeline (dados pequenos de exemplo) e `requirements.txt`; configuração por ambiente em vez de caminhos fixos.
10. Versão móvel simplificada e verificação de acessibilidade (axe/Lighthouse) no CI.
11. Documentar em `CLAUDE.md`/README o cenário "Todas as cotas" (arquivos `cota_mapa.*`, `climada_cota_detalhe_*.json`, como regenerar).

---

*Observação:* os números de tempo (A1) vêm do navegador embutido do app e servem como ordem de grandeza; meça no navegador do usuário
final antes de decidir a técnica. Itens "Alta prioridade" foram classificados por impacto percebido (tempo de carga/travamento) e risco
operacional (A3).
