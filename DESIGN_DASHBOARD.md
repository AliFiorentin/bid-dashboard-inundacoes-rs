# Manual de Replicação do Dashboard — Avaliação de Impactos Socioeconômicos (BID)

Este documento é uma **instrução completa e autossuficiente** para reconstruir um dashboard com o mesmo visual, os mesmos componentes, a mesma organização de informação e as mesmas configurações técnicas deste projeto. Inclui stack, dependências exatas, tokens de design, estilos CSS literais (prontos para copiar), estrutura de pastas, padrões de componente e convenções de dados.

---

## 1. Stack técnica (versões exatas)

`package.json`:

```json
{
  "name": "BID",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "format": "prettier --write \"**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "flatgeobuf": "^4.4.0",
    "framer-motion": "^13.2.0",
    "katex": "^0.17.0",
    "lucide-react": "^1.14.0",
    "maplibre-gl": "^5.24.0",
    "next": "^16.2.4",
    "qs": "^6.15.2",
    "radix-ui": "^1.4.3",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-map-gl": "^8.1.1",
    "recharts": "^3.8.0",
    "shadcn": "^4.6.0",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4.2.1",
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/turf": "^3.5.32",
    "eslint": "^9.39.4",
    "eslint-config-next": "16.1.7",
    "postcss": "^8",
    "prettier": "^3.8.1",
    "prettier-plugin-tailwindcss": "^0.7.2",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3"
  }
}
```

Peças-chave e por que cada uma foi escolhida:
- **Next.js 16 (App Router) + Turbopack** — SSR mínimo (a página principal é 100% client-side), roteamento de arquivos, e **parallel routes** (`@modal`) para abrir `/danos` e `/metodologia` como modal quando navegados a partir da página principal, sem perder o estado do mapa.
- **react-map-gl (wrapper React do MapLibre GL JS)** + **maplibre-gl** — mapa vetorial sem custo de API key (usa basemap Carto e tiles OpenFreeMap, ambos gratuitos).
- **radix-ui** (pacote unificado) — primitives sem estilo para Select, DropdownMenu, Tabs, Collapsible; estilizados manualmente com Tailwind no padrão shadcn/ui.
- **class-variance-authority (cva)** — variantes de componentes (`variant`, `size`) nos componentes `ui/*`.
- **tailwind-merge + clsx** — helper `cn()` para mesclar classes condicionalmente sem conflito.
- **framer-motion** — animação do `DonutChart` (traçado do arco) e transições sutis.
- **recharts** — usado no wrapper genérico `components/ui/chart.tsx` para gráficos de barra além dos donuts customizados.
- **xlsx (SheetJS)** — exportação do painel de análise para `.xlsx` (botão "Baixar").
- **katex** — fórmulas matemáticas na página `/metodologia`.
- **flatgeobuf** — leitura eficiente de geometrias grandes (usado no pipeline/dados, não necessariamente na UI).
- **lucide-react** — ícone único para todo o produto (todos os ícones do header, abas, KPIs).
- Tailwind **v4** (config via CSS, não `tailwind.config.js`) com o plugin `@tailwindcss/postcss`.

`next.config.mjs`:
```js
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
```

---

## 2. Estrutura de pastas

```
app/
  layout.tsx                # RootLayout: fontes, <html lang="pt-BR">, slot {modal}
  page.tsx                  # Dashboard principal (mapa + header + painéis)
  globals.css                # Tema Tailwind v4, tokens, animações, print styles
  icon.svg                   # Favicon (pin de localização com gradiente de marca)
  danos/
    page.tsx                 # Server component: busca dados e passa pro client
    get-data.ts               # Leitura dos JSONs de danos do disco
    DanosClient.tsx           # UI client: abas DaLA / CLIMADA
  metodologia/
    page.tsx
    get-data.ts
    MetodologiaContent.tsx     # 12 seções técnicas com fórmulas KaTeX
  climada/
    page.tsx                  # Página dedicada ao protótipo de dano físico
  @modal/
    default.tsx                # Parallel route: null por padrão (sem modal)
    (.)danos/                  # Intercepted route → abre /danos como modal
    (.)metodologia/            # Intercepted route → abre /metodologia como modal

components/
  DashboardHeader.tsx          # Header fixo no topo
  FiltersPanel.tsx             # Painel de filtros (canto superior direito)
  AnalysisPanel.tsx            # Painel de análise (esquerda, com abas)
  DashboardMap.tsx             # Mapa MapLibre + todas as camadas
  MapPopup.tsx                 # Conteúdo do popup ao clicar num ponto
  WelcomeModal.tsx              # Modal de boas-vindas (abre ao carregar)
  RouteModal.tsx                 # Modal genérico usado pelas intercepted routes
  HeaderLogos.tsx                # Bloco de 4 logos (reuso em /danos e /metodologia)
  KPICard.tsx / KPIRow.tsx       # Cards de métrica reutilizáveis
  LegendItem.tsx                  # Linha de legenda (swatch + rótulo)
  AgriculturaTab.tsx
  tabs/
    ResumoTab.tsx
    EmpresasTab.tsx
    EducacaoTab.tsx
    SaudeTab.tsx
    InfraTab.tsx
  ui/                              # Camada "shadcn-like" de primitivos estilizados
    button.tsx, select.tsx, dropdown-menu.tsx, tabs.tsx,
    card.tsx, badge.tsx, separator.tsx, collapsible.tsx,
    donut-chart.tsx, chart.tsx, BarServico.tsx

hooks/
  useDashboard.ts                # ÚNICO hook com todo o estado/lógica da página "/"

lib/
  constants.ts                    # Fonte única de cores, municípios, cenários, rótulos
  geo-utils.ts                     # slugify, formatação numérica, cálculos de métricas
  utils.ts                          # cn() (clsx + tailwind-merge)

public/
  BID.png, GPEA.png, CIEX2.png, IPH.jpg     # Logos institucionais
  dados_convertidos/
    populacao_atingida.json, area_atingida.json, mancha_rs_enchente_2024.geojson
    {slug_do_municipio}/
      empresas_BASE.geojson, educacao_BASE.geojson, saude_BASE.geojson
      agricultura_{ano}_BASE.geojson, agricultura_stats.json, agricultura_stats_BASE.json
      limite_BASE.geojson, populacao.png
      infraestrutura/ , infraestrutura_stats.json
      cenarios/
        {setor}_ATINGIDOS_{cenario_slug}.geojson
        agricultura_stats_{cenario_slug}.json
        conab_stats_{cenario_slug}.json
```

Convenção de nomenclatura de dados: `{slug_municipio}___{slug_cenario}` (duplo underscore) — função `scenarioSlug()` em `lib/geo-utils.ts`. `slugify()` normaliza acentos, minúsculas, troca não-alfanumérico por `_`.

---

## 3. Configuração de tema — `app/globals.css` (Tailwind v4, sem `tailwind.config.js`)

Copie literalmente para obter os mesmos tokens:

```css
@import "tailwindcss";
@import "katex/dist/katex.min.css";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
    --font-heading: var(--font-sans);
    --font-sans: var(--font-sans);
    --color-sidebar-ring: var(--sidebar-ring);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar: var(--sidebar);
    --color-chart-5: var(--chart-5);
    --color-chart-4: var(--chart-4);
    --color-chart-3: var(--chart-3);
    --color-chart-2: var(--chart-2);
    --color-chart-1: var(--chart-1);
    --color-ring: var(--ring);
    --color-input: var(--input);
    --color-border: var(--border);
    --color-destructive: var(--destructive);
    --color-accent-foreground: var(--accent-foreground);
    --color-accent: var(--accent);
    --color-muted-foreground: var(--muted-foreground);
    --color-muted: var(--muted);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-secondary: var(--secondary);
    --color-primary-foreground: var(--primary-foreground);
    --color-primary: var(--primary);
    --color-popover-foreground: var(--popover-foreground);
    --color-popover: var(--popover);
    --color-card-foreground: var(--card-foreground);
    --color-card: var(--card);
    --color-foreground: var(--foreground);
    --color-background: var(--background);
    --radius-sm: calc(var(--radius) * 0.6);
    --radius-md: calc(var(--radius) * 0.8);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) * 1.4);
    --radius-2xl: calc(var(--radius) * 1.8);
    --radius-3xl: calc(var(--radius) * 2.2);
    --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
    /* Curvas de easing customizadas (Emil Kowalski / impeccable) */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.408 0.085 235.476);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.408 0.085 235.476);
    --chart-2: oklch(0.588 0.158 163.104);
    --chart-3: oklch(0.670 0.160 55.147);
    --chart-4: oklch(0.550 0.075 228.220);
    --chart-5: oklch(0.509 0.106 235.785);
    --radius: 0.625rem;
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
}

.dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.509 0.106 235.785);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.509 0.106 235.785);
    --chart-2: oklch(0.650 0.170 163.104);
    --chart-3: oklch(0.720 0.170 55.147);
    --chart-4: oklch(0.600 0.085 228.220);
    --chart-5: oklch(0.560 0.120 235.785);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
    }
  body {
    @apply bg-background text-foreground;
    }
  html {
    @apply font-sans;
    }
  .maplibregl-popup-content {
    @apply bg-transparent! shadow-none! p-0! rounded-none!;
    }
  .maplibregl-popup-tip {
    @apply hidden!;
    }
}

@keyframes panelSlideIn {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes chartBarIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

.chart-bar-item {
  animation: chartBarIn 220ms var(--ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media print {
  body {
    background: white !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .print\:hidden { display: none !important; }
  header, [class*="NavigationControl"] { display: none !important; }
  [class*="absolute top-\[100px\] left-4 bottom-4 w-\[360px\]"] {
    position: static !important;
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    box-shadow: none !important;
    border: 1px solid #e2e8f0 !important;
    overflow: visible !important;
  }
  [class*="absolute inset-0 z-0"] { display: none !important; }
  [class*="h-screen"][class*="overflow-hidden"],
  [class*="flex-1 flex flex-col overflow-hidden"] {
    overflow: visible !important;
    height: auto !important;
  }
  [class*="overflow-y-auto"] { overflow: visible !important; max-height: none !important; }
}

.maplibregl-popup-content {
  background-color: #ffffff !important;
  padding: 0 !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
}
.maplibregl-popup-tip {
  border-top-color: #ffffff !important;
  border-bottom-color: #ffffff !important;
}
.maplibregl-popup-close-button {
  right: 6px !important;
  top: 6px !important;
  font-size: 16px !important;
  color: #64748b !important;
  z-index: 10 !important;
}
.maplibregl-popup-close-button:hover {
  background-color: transparent !important;
  color: #000000 !important;
}
```

**Pontos importantes ao replicar:**
- Tailwind v4 usa `@theme inline` dentro do CSS em vez de `tailwind.config.js` — todos os tokens de cor do shadcn (`--background`, `--primary` etc.) são declarados em `oklch()`.
- `border-radius` global é parametrizado por uma única variável `--radius: 0.625rem`, e todos os demais raios (`sm/md/lg/xl/2xl/3xl/4xl`) são múltiplos dela — mudar só `--radius` re-escala o app inteiro.
- As 3 curvas de easing customizadas (`--ease-out`, `--ease-in-out`, `--ease-drawer`) são usadas em todas as transições "premium" do app (abrir/fechar painel, animação de barra).
- Bloco `@media print` é essencial para o botão "Baixar/Imprimir": remove mapa e controles, expande o painel para largura total, e remove todos os `overflow: hidden` que cortariam sombras/gráficos ao imprimir.
- Sobrescritas do `maplibregl-popup-*`: removem o padding/sombra padrão do MapLibre para o popup parecer um card custom (o conteúdo real vem do componente `MapPopup`, que já traz seu próprio `bg-white rounded-xl shadow-lg`).

### Fontes (`app/layout.tsx`)
```tsx
import { Geist, Geist_Mono } from "next/font/google"
const geist = Geist({subsets:['latin'],variable:'--font-sans'})
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
```
Aplicadas via `className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}` no `<html>`.

---

## 4. Paleta de cores e tokens de domínio — `lib/constants.ts`

Este é **o arquivo mais importante para o "design system de dados"**: nenhuma cor de camada é hardcoded em componente — tudo vem daqui.

```ts
// Tema de marca
export const C = {
  primary: "#055071",
  field: "#0a6a90",
  bg: "#ffffff",
  cardBg: "#f0f7fa",
  border: "#b3cdd8",
  muted: "#3d7a94",
  dark: "#033a52",
}

// Fundo translúcido único para o conteúdo de qualquer card dentro do Painel
export const PANEL_CARD_BG = "rgba(255,255,255,0.55)"

// Cores por camada temática (mapa + gráficos + KPIs)
export const COLORS = {
  empresas: "#2563eb",   // azul
  educacao: "#16a34a",   // verde
  saude: "#dc2626",      // vermelho
  cenario: "#1f77b4",    // azul da mancha de inundação
  infra: "#f59e0b",      // âmbar (cor default de infraestrutura)
}

// Paleta cíclica para donuts com N categorias (setores CNAE, etc.)
export const DONUT_COLORS = [
  "#055071", "#2563eb", "#16a34a", "#dc2626", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#059669", "#b45309",
]

// Cor fixa por subtipo de infraestrutura
export const INFRA_COLORS: Record<string, string> = {
  Edificações: "#6b7280", Logradouros: "#e67e22", Quadras: "#8e44ad",
  Terrenos: "#27ae60", "Prédios Públicos": "#2980b9", Segurança: "#c0392b",
  Imóveis: "#16a085", Lotes: "#d35400", "Iluminação Pública": "#f39c12",
  "Eixos Logradouros": "#e67e22", Quarteirões: "#8e44ad", Terminais: "#2980b9",
  "Rede Esgoto": "#1abc9c", Paradas: "#9b59b6", Ônibus: "#e74c3c",
  Hidrantes: "#c0392b", Gás: "#7f8c8d", "Bocas de Lobo": "#16a085", Poste: "#f1c40f",
}

// Cor por cultura agrícola
export const AGRI_COLORS: Record<string, string> = {
  Soja: "#D4A017", Arroz: "#4FC3F7", "Outras Lavouras Temporárias": "#AED581",
}

// Rampa "% do valor de reposição destruído" (dano físico, CLIMADA)
export const DANO_FISICO_COLOR_STOPS: (string | number)[] = [
  0, "#cbd5e1", 5, "#93c5fd", 20, "#fbbf24", 50, "#f97316", 80, "#dc2626", 100, "#7f1d1d",
]

// Gradiente da textura de duração de alagamento (paleta azul, distinta das demais)
export const MANCHA_DURACAO_GRADIENT_CSS =
  "linear-gradient(to right, #f7fbff, #c6dbef, #6baed6, #2171b5, #08306b)"

// Gradiente de população (plasma) usado inline no raster e na legenda
// "linear-gradient(to right, #0d0887, #9c179e, #ed7953, #f0f921)"
```

**Gradiente de marca (repetido em TODO cabeçalho de card/painel/legenda/modal):**
```css
background: linear-gradient(135deg, #055071 0%, #0a6e9a 100%);
```

**Cores de heatmap** (definidas inline no MapLibre `paint`, uma rampa por camada):
- Empresas (azul→vermelho, passando por ciano/verde/amarelo): `rgba(29,78,216,x)` → `rgba(0,255,255,x)` → `rgba(0,255,0,x)` → `rgba(255,255,0,x)` → `rgba(255,0,0,1)`
- Saúde (vermelho, mesma progressão de densidade): `rgba(185,28,28,x)` → `rgba(239,68,68,x)` → `rgba(248,113,113,x)` → `rgba(255,255,0,x)` → `rgba(255,0,0,1)`
- Educação (verde): `rgba(21,128,61,x)` → `rgba(34,197,94,x)` → `rgba(134,239,172,x)` → `rgba(255,255,0,x)` → `rgba(255,0,0,1)`

**Tabela de referência rápida (para copiar num novo projeto):**

| Token | Valor | Uso |
|---|---|---|
| Marca (escuro) | `#055071` | Base de todo gradiente de cabeçalho |
| Marca (claro) | `#0a6e9a` | Ponto final do gradiente 135° |
| Empresas | `#2563eb` | Pontos/cluster/KPI de empresas |
| Educação | `#16a34a` | Pontos/cluster/KPI de educação |
| Saúde | `#dc2626` | Pontos/cluster/KPI de saúde |
| Infraestrutura (default) | `#f59e0b` | Cor genérica de infra sem cor própria |
| Cenário/Mancha | `#1f77b4` | Polígono de área alagada |
| População (heatmap/raster) | `#9333ea` → `#dc2626` | Roxo → vermelho (card + raster) |
| Agricultura | `#6B8E23` (fallback), por cultura acima | — |
| Fundo de card no painel | `rgba(255,255,255,0.55)` | `PANEL_CARD_BG` |
| Borda sutil de card | `rgba(5,80,113,0.15)` | Borda de KPICard/KPIRow |

---

## 5. Efeito "glass" (glassmorphism) — o padrão visual central

Todo painel flutuante sobre o mapa (header, painel de filtros, painel de análise, legenda, badge de copyright, botões de reabrir painel) usa **exatamente** este bloco de estilo (via `style={{...}}` inline, não classe Tailwind, porque `backdrop-filter` com `saturate()` não é padrão utilitário do Tailwind):

```ts
const GLASS_STYLE = {
  backgroundColor: "rgba(255,255,255,0.55)",
  backdropFilter: "saturate(200%) blur(24px)",
  WebkitBackdropFilter: "saturate(200%) blur(24px)",
  border: "0.5px solid rgba(255,255,255,0.6)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
} as const;
```
Combinado com `rounded-xl` (`border-radius: 0.75rem`) do Tailwind.

Variante um pouco mais forte usada no **header** (sombra menor, mais "colada"):
```ts
boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)"
```

Variante usada no **modal de boas-vindas** (menos transparência, mais contraste, pois cobre a tela toda):
```ts
backgroundColor: "rgba(255,255,255,0.97)";
border: "0.5px solid rgba(255,255,255,0.7)";
boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)";
```
Overlay por trás do modal: `backgroundColor: rgba(5,30,45,0.55)` + `backdropFilter: blur(6px)`.

**Animação de entrada do painel lateral** (`AnalysisPanel`):
```css
animation: panelSlideIn 320ms var(--ease-drawer) both;
/* @keyframes panelSlideIn { from { opacity:0; transform: translateX(-16px) } to { opacity:1; transform: translateX(0) } } */
```

**Importante — o fundo dos KPIs/gráficos NÃO é o mesmo "glass" do painel**, mesmo usando a mesma cor `rgba(255,255,255,0.55)`: o painel aplica `backdrop-filter` (borra o mapa atrás dele), os cards internos (`KPICard`, `KPIRow`, corpo dos gráficos) usam essa cor **sem** `backdrop-filter` — como já estão por cima do painel borrado, o resultado é um branco mais opaco/sólido, que separa visualmente cada card do fundo de vidro fosco do painel. Detalhe completo com os dois blocos de estilo lado a lado na seção 12.6.

---

## 6. Tipografia e escala fluida (`clamp()`)

Em vez de tamanhos fixos, o header e os cards do painel usam `clamp(min, preferido-em-vw|vh, max)` para escalar com a viewport sem quebrar layout em notebooks pequenos. Valores usados no **Header**:

```ts
const LOGO_H = "clamp(20px, 1.7vw, 28px)";
const LOGO_W = "clamp(40px, 3.4vw, 56px)";
const LOGO_GAP = "clamp(2px, 0.35vw, 6px)";
const TITLE_SIZE = "clamp(10px, 0.95vw, 14px)";
const SUBTITLE_SIZE = "clamp(6.5px, 0.6vw, 9px)";
const SELECT_LABEL_SIZE = "clamp(7px, 0.65vw, 9px)";
const SELECT_TRIGGER_SIZE = "clamp(9px, 0.85vw, 11px)";
const SELECT_H = "clamp(18px, 1.7vw, 24px)";
const BTN_SIZE = "clamp(7.5px, 0.75vw, 10px)";
const BTN_H = "clamp(18px, 1.7vw, 24px)";
const SECTION_GAP = "clamp(4px, 0.9vw, 8px)";
const SELECT_GAP = "clamp(12px, 2vw, 24px)";
```

Valores usados nos **cards do Painel de Análise** (`ResumoTab` e afins), agora em `vh` (altura da viewport, pois o painel rola verticalmente):
```ts
const DONUT_MINI = "clamp(26px, 5vh, 52px)";
const DONUT_AGRI = "clamp(32px, 6.5vh, 58px)";
const CARD_PAD = "clamp(0.2rem, 1.3vh, 0.625rem)";
const CARD_GAP = "clamp(0.2rem, 1vh, 0.625rem)";
const FONT_LABEL = "clamp(7px, 1.05vh, 9.5px)";
const FONT_VALOR = "clamp(12px, 2.1vh, 18px)";
```

Regra geral: **larguras/gaps usam `vw`, alturas/paddings de conteúdo que rola usam `vh`** — porque o que limita o header é a largura da tela, e o que limita o painel é a altura disponível abaixo do header.

Fonte: **Geist** (sans) para todo o texto, **Geist Mono** disponível via variável CSS (não usada visivelmente na UI atual, reservada para números/código).

---

## 7. Biblioteca de componentes `ui/` (padrão shadcn, radix-ui por baixo)

| Componente | Base | Observações de estilo |
|---|---|---|
| `Button` | `radix-ui` Slot + `cva` | Variantes `default/outline/secondary/ghost/destructive/link`; tamanhos `xs/sm/default/lg/icon*`. Tamanho `xs` (`h-6`) é o mais usado no dashboard (botões do header/painel). Active state: `translate-y-px` (leve "afundar" ao clicar). |
| `Select` | `radix-ui Select` | Trigger com `rounded-lg`, ícone `ChevronDown` à direita, altura `h-8`/`h-7` (`data-size`). |
| `DropdownMenu` | `radix-ui DropdownMenu` | Usado para o menu de Infraestrutura (checkboxes múltiplos). |
| `Tabs` | `radix-ui Tabs` | Variante `default` (fundo `bg-muted`) vs `line` (sublinhado). O Painel de Análise usa **botões próprios estilizados como pills** fora do `TabsList` padrão — só `TabsContent` do Radix é reaproveitado para o conteúdo. |
| `Card` | div simples | `rounded-xl`, `ring-1 ring-foreground/10`, usado nas páginas de conteúdo (não no mapa). |
| `Badge` | `cva` | Pill pequena, não muito usada no dashboard principal. |
| `Collapsible` | `radix-ui Collapsible` | Usado para "Ver lista de Escolas/Hospitais/Logradouros atingidos". |
| `DonutChart` | SVG + `framer-motion` | Componente customizado (não é do shadcn) — ver seção 7.1. |
| `chart.tsx` | wrapper de `recharts` | Para gráficos de barra quando necessário. |
| `BarServico` | div customizada | Barra de progresso simples com rótulo + valor + %. |

### 7.1 `DonutChart` (peça central dos KPIs)
Especificação para reimplementar:
- Recebe `data: {value, color, label}[]`, `totalValue?`, `size` (px, default 200), `strokeWidth` (default 20).
- Desenha um `<circle>` de fundo (`stroke="var(--border)"`) + um `<circle>` por segmento, usando `stroke-dasharray`/`stroke-dashoffset` para simular o arco proporcional — SVG rotacionado `-rotate-90` para começar do topo.
- Cada segmento anima com `framer-motion` (`initial`/`animate` no `strokeDashoffset` + fade), com `delay = index * animationDelayPerSegment` (default 0.05s) para um efeito cascata.
- `centerContent` (ReactNode) é posicionado `absolute` no centro, dimensionado como `% do tamanho do contêiner` (não px fixo) para acompanhar tamanhos fluidos (`clamp()`).
- `highlightOnHover`: no hover, o segmento ativo ganha `filter: drop-shadow(0 0 6px <cor>) brightness(1.1)` e `scale(1.03)`.

### 7.2 `KPICard` / `KPIRow`
Padrão de card de métrica usado em todas as abas do painel:
```tsx
<div style={{ border: "1px solid rgba(5,80,113,0.15)" }} className="rounded-lg overflow-hidden">
  {/* Cabeçalho: faixa com gradiente de marca */}
  <div style={{ background: "linear-gradient(135deg, #055071 0%, #0a6e9a 100%)" }}
       className="flex items-center gap-1.5 px-3 py-1.5">
    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} /> {/* opcional */}
    <span className="text-[10px] font-black uppercase tracking-wider text-white">{titulo}</span>
  </div>
  {/* Corpo: fundo glass translúcido, métrica principal grande + secundárias compactas */}
  <div style={{ backgroundColor: "rgba(255,255,255,0.55)" }} className="flex flex-col gap-2 px-3 py-2.5">
    <div className="flex items-center justify-between gap-3">
      <div><span className="text-[11px] font-bold" style={{ color: "#0a4a63" }}>{sub}</span></div>
      <span className="text-2xl font-black" style={{ color: "#022536" }}>{valor}</span>
    </div>
    {/* secundários, cada um num pill de fundo levemente diferenciado */}
  </div>
</div>
```
`KPIRow` é a mesma estrutura sem a lista de métricas secundárias (uma métrica só).

---

## 8. Estrutura de rotas e o padrão de "modal interceptado"

| Rota | Descrição |
|---|---|
| `/` | Dashboard principal (client-side) |
| `/danos` | Página de danos operacionais (SSR: lê JSON no servidor via `get-data.ts`, passa como prop pro client component) |
| `/metodologia` | Documento técnico de metodologia (mesmo padrão SSR + client) |
| `/climada` | Página isolada do protótipo de dano físico |

### 8.1 Como as páginas abrem *dentro* do dashboard (mecanismo completo)

Isso é o comportamento mais sutil do app: clicar em "Danos" ou "Metodologia" a partir da página `/` **não navega para uma página nova** — abre o conteúdo como um cartão flutuante por cima do mapa, sem descarregar o dashboard por trás. Se a mesma URL é aberta direto (F5, link colado no navegador, nova guia), o conteúdo aparece como página normal, cheia, sem o mapa. É o padrão **Parallel Routes + Intercepting Routes** do Next.js App Router, e depende de 4 peças trabalhando juntas:

**Peça 1 — o slot paralelo, declarado no layout raiz** (`app/layout.tsx`):
```tsx
export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}   {/* a rota "normal" atual (/, /danos, /metodologia quando acessada direto) */}
        {modal}      {/* o slot paralelo @modal, renderizado por cima quando ativo */}
      </body>
    </html>
  )
}
```
O parâmetro `modal` é injetado automaticamente pelo Next porque existe uma pasta `app/@modal/` — `@nome` é a sintaxe de **parallel route** (slot nomeado que renderiza ao lado da árvore principal, não em vez dela).

**Peça 2 — o "vazio" por padrão** (`app/@modal/default.tsx`):
```tsx
export default function Default() {
  return null;
}
```
Sem esse arquivo, o Next não saberia o que renderizar no slot `@modal` para rotas que não têm uma versão interceptada (por exemplo, `/`) — ele cairia num 404 do slot. `null` = "nenhum modal aberto".

**Peça 3 — a rota interceptada** (`app/@modal/(.)danos/page.tsx` e `app/@modal/(.)metodologia/page.tsx`):
```tsx
// app/@modal/(.)danos/page.tsx
import { DanosClient } from "@/app/danos/DanosClient";
import { getDanosPageData } from "@/app/danos/get-data";
import { RouteModal } from "@/components/RouteModal";

export default function DanosModal() {
  const { dados, dadosClimada } = getDanosPageData();     // mesmíssima função de leitura de dados da página real
  return (
    <RouteModal hrefNovaGuia="/danos">
      <DanosClient dados={dados} dadosClimada={dadosClimada} />   {/* mesmíssimo componente de conteúdo da página real */}
    </RouteModal>
  );
}
```
`(.)danos` é a sintaxe de **intercepting route**: o `(.)` diz "intercepta uma navegação para `danos` a partir **deste mesmo nível** de rota" (aqui, a raiz `/`). Quando o usuário navega para `/danos` clicando num `<Link>` estando em `/`, o Next entrega esta versão (dentro do slot `@modal`, envolvida em `RouteModal`) em vez da `page.tsx` normal de `app/danos/`. **A página real (`app/danos/page.tsx`) e a interceptada reaproveitam exatamente os mesmos `get-data.ts` e componente de conteúdo (`DanosClient`/`MetodologiaContent`)** — só o "invólucro" visual muda (modal vs. página cheia). Isso evita duplicar lógica ou UI entre os dois modos de abertura.

**Peça 4 — o invólucro visual do modal** (`components/RouteModal.tsx`):
```tsx
export function RouteModal({ hrefNovaGuia, children }: { hrefNovaGuia: string; children: React.ReactNode }) {
  const router = useRouter();
  const fechar = useCallback(() => router.back(), [router]);   // SEMPRE back(), nunca push("/")

  useEffect(() => {
    document.body.style.overflow = "hidden";                    // trava o scroll do dashboard por trás
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKeyDown); };
  }, [fechar]);

  return (
    <div
      onClick={(e) => { if (e.target === overlayRef.current) fechar(); }}   // clique fora fecha
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-2 sm:p-4 md:p-6"
      style={{ backgroundColor: "rgba(2,20,30,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-[1400px]" style={{ maxHeight: "calc(100vh - 1rem)" }}>
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: "calc(100vh - 1rem)" }}>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 1rem)" }}>{children}</div>
        </div>
      </div>

      {/* Botões fixos na VIEWPORT (não no cartão) — nunca cortam em telas baixas */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[210] flex items-center gap-2">
        <a href={hrefNovaGuia} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#022536" }}>Nova guia</a>
        <button onClick={fechar} style={{ backgroundColor: "#022536" }}>✕</button>
      </div>
    </div>
  );
}
```

Detalhes de comportamento a preservar:
- **`router.back()` é obrigatório para fechar** — nunca `router.push("/")` ou um `<Link href="/">`. Como a rota interceptada é uma "sobreposição" da navegação anterior, `back()` é o único jeito de desmontá-la corretamente e voltar ao estado exato do dashboard sem empilhar uma entrada extra no histórico do navegador.
- **`Esc` fecha** e o **clique no overlay escuro fora do cartão fecha** (clique dentro do cartão não propaga, pois o `onClick` só dispara se `e.target === overlayRef.current`).
- **Botão "Nova guia"** usa uma tag `<a>` HTML pura (não `<Link>` do Next) de propósito — isso escapa da interceptação do Next.js e força uma navegação de página cheia de verdade numa aba nova, útil para compartilhar a URL real por fora do dashboard.
- **`document.body.style.overflow = "hidden"`** enquanto o modal está aberto, revertido ao fechar — trava o scroll do dashboard por trás do overlay.
- Overlay em `rgba(2,20,30,0.55)` + `blur(4px)` — mais escuro que o overlay do `WelcomeModal` (`rgba(5,30,45,0.55)`), porque aqui cobre conteúdo mais denso (texto/gráficos) e precisa de mais contraste.
- `z-[200]`/`z-[210]` — deliberadamente bem acima de qualquer `z-20/z-50` usado no resto do dashboard, para nunca ficar atrás de nada.

**Resumo do fluxo**: usuário em `/` clica em `<Link href="/danos">` → Next detecta a intercepting route `(.)danos` → renderiza `RouteModal` com `DanosClient` dentro do slot `@modal`, por cima do dashboard intacto → URL muda para `/danos` mas o `children` do layout continua sendo a página `/` (não remonta) → fechar chama `router.back()`, que remove a entrada e desmonta o slot `@modal` de volta para `default.tsx` (`null`).

Para replicar esse padrão num projeto novo: crie `app/@modal/default.tsx` (retorna `null`), declare `modal` como prop do `RootLayout` e renderize-o junto de `children`, e para cada rota "de conteúdo" que deve abrir como overlay, crie `app/@modal/(.)<rota>/page.tsx` reaproveitando os mesmos dados/componente da página real, envolvidos num componente de modal com fechamento por `router.back()`.

---

## 9. Layout da página principal (`app/page.tsx`)

Contêiner raiz:
```tsx
<div className="relative w-screen h-screen font-sans overflow-hidden bg-slate-100 text-slate-900 print:overflow-visible print:h-auto print:w-full">
```

Ordem de camadas (z-index):
```
z-100  Aviso "Acesse pelo computador" (só em telas < lg)
z-50   WelcomeModal
z-50   Overlay de loading (spinner central com blur de fundo, enquanto isLoading)
z-20   DashboardHeader / AnalysisPanel / botão "Abrir Painel"
z-20   FiltersPanel
z-10   Legenda + Copyright (bottom-left)
z-0    DashboardMap (camada base, absolute inset-0)
```

**Bloqueio mobile/tablet** (`lg:hidden fixed inset-0`): tela branca cheia com logo BID, título, ícone de monitor e texto "Acesse pelo computador — Este painel interativo com mapas e gráficos foi projetado para telas maiores", mais os 3 logos parceiros (GPEA/CIEX/IPH) embaixo. Isso substitui qualquer tentativa de layout responsivo mobile — a decisão de design foi **não** adaptar o dashboard, e sim pedir explicitamente por uma tela maior.

**Overlay de loading**:
```tsx
<div style={{ backdropFilter: "blur(8px) saturate(120%)", backgroundColor: "rgba(255,255,255,0.2)" }}
     className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center print:hidden">
  <div style={{ backgroundColor: "rgba(255,255,255,0.9)", boxShadow: "0 24px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)" }}
       className="flex flex-col items-center gap-3 rounded-2xl px-9 py-7">
    {/* spinner SVG animate-spin cor #055071 */}
    <span className="text-sm font-black tracking-wide" style={{ color: "#055071" }}>Carregando dados...</span>
  </div>
</div>
```

---

## 10. Header (`components/DashboardHeader.tsx`)

Posição: `absolute top-1.5 left-3 right-3`, `rounded-xl`, estilo glass (seção 5), `display: flex; flex-wrap: wrap; align-items: center; gap: SECTION_GAP`.

Conteúdo, da esquerda para a direita:
1. **Logos** (BID, GPEA, CIEX2, IPH) — cada uma numa caixa `relative` de tamanho fixo (`LOGO_H` × `LOGO_W`) usando `<Image fill className="object-contain">` (nunca `w-auto/h-auto`, pois logos com proporções muito diferentes cortariam). `onError` esconde a imagem se o arquivo faltar. Borda direita divisória (`border-r border-slate-200/60`).
2. Bloco de **título** (`Avaliação de Impactos Socioeconômicos`) + subtítulo uppercase (`Painel de Monitoramento`), sem `whitespace-nowrap` (permite quebrar em 2 linhas em telas estreitas sem forçar o resto do header pra baixo).
3. **Links secundários em DUAS LINHAS** (`Danos` na linha de cima, `Metodologia` na linha de baixo — nunca lado a lado): o wrapper é `flex flex-col gap-0.5`, então os dois botões empilham verticalmente dentro do mesmo bloco, com `margin-left: auto` empurrando o bloco inteiro para a direita, encostado no fim do bloco de logos/título. Cada botão é pequeno (`h-5`, `px-2`), borda cinza clara (`border-slate-200/80`), fundo quase branco (`bg-white/70`), ícone SVG inline de 11px + texto `text-[10px] font-bold`:
```tsx
<div className="flex flex-col gap-0.5 shrink-0 mr-auto">
  <Link href="/danos" className="h-5 px-2 rounded-md text-[10px] font-bold border border-slate-200/80 bg-white/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 flex items-center gap-1">
    {/* ícone seta/gráfico 11px */} Danos
  </Link>
  <Link href="/metodologia" className="h-5 px-2 rounded-md text-[10px] font-bold border border-slate-200/80 bg-white/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 flex items-center gap-1">
    {/* ícone livro 11px */} Metodologia
  </Link>
</div>
```
Por que duas linhas e não lado a lado: mantém o bloco estreito (largura de um botão só), o que deixa mais espaço horizontal livre pros seletores/toggles de camada à direita — importante porque o header inteiro precisa caber numa única linha mesmo em notebooks (ver `clamp()` na seção 6).
4. **Select de Município**: rótulo uppercase pequeno acima, trigger `bg-slate-50/80`. Opção especial "Visão Geral RS" em negrito azul.
5. **Select de Cenário de Inundação**: desabilitado quando `isVisaoGeral`; opções vêm de `CENARIOS_CONFIG[municipio]`; primeira opção sempre `"(nenhum)"` → rótulo `(Ver Total)`.
6. **Botões de camada** (toggle `variant={ativo ? "default" : "outline"}`, `size="xs"`): Empresas (`Building2`), Educação (`GraduationCap`), Saúde (`HeartPulse`), Agricultura (`Sprout`, só se o município tiver dado agrícola).
7. **Dropdown de Infraestrutura** (`Wrench`): botão mostra contagem de subcamadas ativas; menu com um botão "Exibir/Ocultar Camada" no topo + checkbox por subtipo (`INFRAESTRUTURA_CONFIG[municipio]`).

---

### 10.1 Organização dos botões e blocos do Header (ordem exata e agrupamento)

O header é um único `<header>` `flex flex-wrap items-center` com `gap: SECTION_GAP` entre os **5 blocos** a seguir, nesta ordem estrita da esquerda para a direita:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logos×4│Título]  [Danos↕│Metodologia↕]  ...auto-margin...  [Município][Cenário]  [Empresas][Educação][Saúde][Agricultura][Infra▾] │
│  Bloco 1 (fixo)     Bloco 2 (fixo)                          Bloco 3 (selects)      Bloco 4 (toggles de camada + dropdown)          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Bloco de identidade** (`shrink-0`, borda direita divisória `border-r border-slate-200/60`): 4 logos em sequência fixa **BID → GPEA → CIEX2 → IPH**, seguidas do bloco de texto (título + subtítulo). Cada logo é uma caixa de tamanho igual (`LOGO_H × LOGO_W`), nunca redimensionada por proporção própria.
2. **Bloco de navegação secundária** (`shrink-0`, `flex flex-col`, **empilhado verticalmente** — não lado a lado): botão `Danos` em cima, botão `Metodologia` embaixo, cada um `h-5`, borda cinza clara, ícone SVG 11px + texto 10px bold. Este é o único bloco com `mr-auto`, o que empurra tudo que vem depois para a direita.
3. **Bloco de seletores** (`flex items-center gap-[SELECT_GAP]`): **Select de Município** primeiro, depois **Select de Cenário de Inundação** — nessa ordem fixa (o cenário depende do município, então vem logo depois, nunca antes). Uma borda direita (`border-r`) fecha esse bloco antes do próximo.
4. **Bloco de camadas** (`flex items-center`, gap pequeno `clamp(2px,0.4vw,4px)`): botões de toggle na ordem **Empresas → Educação → Saúde → Agricultura*** (\*só aparece se o município tiver dado agrícola), seguidos do **dropdown de Infraestrutura** por último (ele é visualmente diferente dos outros — tem uma seta `▼` e um contador `(N)` — para sinalizar que abre um submenu em vez de alternar direto).

Regras de agrupamento a preservar ao replicar:
- Os **seletores** (Município/Cenário) sempre ficam **à esquerda** dos **toggles de camada** — a leitura é "primeiro escolho onde/qual evento, depois o que quero ver nesse recorte".
- Os **toggles de camada** seguem sempre a mesma ordem fixa entre si (Empresas, Educação, Saúde, Agricultura, Infraestrutura) em qualquer lugar do app onde aparecem (header, abas do painel, filtros) — isso cria previsibilidade: a cor e a posição de "Saúde" nunca mudam de lugar relativo aos outros.
- O **dropdown de Infraestrutura** é sempre o último item da fileira de camadas, nunca misturado entre os toggles simples — ele é conceitualmente "uma categoria com sub-opções", então fica visualmente ao final.
- Os **links de página** (`Danos`/`Metodologia`) ficam sempre **antes** dos seletores de dados, nunca depois — são navegação estrutural do site, não filtros do mapa atual.
- Cada botão de camada usa `variant={ativo ? "default" : "outline"}` — nunca uma cor customizada de fundo; o estado ativo/inativo é resolvido pelo próprio design system de botões (seção 7), não por CSS ad-hoc.

---

## 11. Painel de Filtros (`components/FiltersPanel.tsx`)

Posição: `absolute top-[100px] right-4`, largura fixa `w-40`, `max-h-[calc(100vh-130px)]` com scroll interno (scrollbar fina customizada via `[&::-webkit-scrollbar]`). Estilo glass. Só renderiza se `temCamadaTabular && !isVisaoGeral`.

Cada seção tem sua **cor de destaque própria** (label + borda do Select tingidas):
| Seção | Cor |
|---|---|
| Setor (Empresas) | azul (`text-blue-700`, `border-blue-200/60`, `bg-blue-50/50`) |
| Dependência (Educação) | verde |
| Unidade (Saúde) | vermelho |
| Infraestrutura | laranja |
| Mancha de Inundação | `COLORS.cenario` |
| Dano Físico (CLIMADA) | âmbar (`#d97706`), só em Porto Alegre |
| Heatmap População | roxo (`#9333ea`) |
| Heatmap Empresas | azul forte (`#1d4ed8`) |
| Heatmap Saúde | vermelho forte (`#b91c1c`) |
| Heatmap Educação | verde forte (`#15803d`) |

Padrão de **toggle-botão binário** (usado em Mancha/Dano Físico/Heatmaps):
```tsx
<button style={{
  backgroundColor: ativo ? `${cor}20` : "transparent",  // 20 = ~12% opacidade em hex
  borderColor: ativo ? cor : "#cbd5e1",
  color: ativo ? cor : "#64748b",
}} className="h-7 w-full rounded text-[10px] font-bold border transition-colors duration-150">
  {ativo ? "Visível" : "Oculto"}
</button>
```
Quando fechado, um botão flutuante `Mostrar Filtros` (mesmo glass, ícone `SlidersHorizontal`) substitui o painel.

---

## 12. Painel de Análise (`components/AnalysisPanel.tsx`) — layout completo

Contêiner: `absolute left-3 bottom-1.5 w-[400px]`, `top: headerBottom` (calculado dinamicamente a partir da altura real do header), estilo glass + animação `panelSlideIn`.

### 12.1 Cabeçalho do painel
Faixa com gradiente de marca, `rounded-t-xl`:
- Título "Painel" + dois botões (`Baixar` com ícone `Download` → chama `exportarExcel()`; `Ocultar` com ícone `EyeOff` → fecha o painel).
- Linha abaixo: `<município em negrito> · <cenário ou "Piores Cenários">`.

### 12.2 Barra de abas (pills)
Não usa o `TabsList` padrão do Radix — são `<Button variant={ativo?"default":"outline"} size="xs" className="rounded-full">` com ícone, dispostos em `flex flex-wrap gap-1.5`. Abas: **Resumo, Empresas, Educação, Saúde, Agricultura*, Infraestrutura***  (\* condicionais).

### 12.3 KPI fixo de População
Card roxo (`border-color: #e9d5ff`, `background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)`), sempre visível abaixo das abas independente de qual está selecionada: população total (roxo `#7c3aed`/`#6b21a8` tons) + população atingida (vermelho) + barra de progresso com gradiente `linear-gradient(to right, #9333ea, #dc2626)`.

### 12.4 Aba "Resumo" (`tabs/ResumoTab.tsx`) — a aba inicial do painel, KPI por KPI

É a **primeira aba** do painel (selecionada por padrão, `tabAtiva = "resumo"`) e funciona como um "raio-x" de uma métrica por camada, tudo numa tela só, antes de o usuário entrar no detalhe de cada aba individual. Estrutura: uma **grade de 2 colunas** (`grid grid-cols-2`) de `MiniStatCard` seguida de **um card largo** de Agricultura.

Cada `MiniStatCard` é: donut fino (`strokeWidth: 5`, tamanho fluido `DONUT_MINI` = `clamp(26px,5vh,52px)`) com um **ícone Lucide no centro** (cor = cor da camada), à direita um bloco de texto com rótulo uppercase pequeno, valor grande em negrito, e a legenda secundária ("de X (Y%)" com cenário ativo, ou "total" sem cenário).

Os **8 KPIs da grade**, na ordem exata em que aparecem (esquerda→direita, cima→baixo):

| # | Título | Ícone (lucide) | Cor | Métrica (`atingido`/`base`) | Formatação |
|---|---|---|---|---|---|
| 1 | Empregados | `Users` | `COLORS.empresas` (`#2563eb`) | `metricasEmp.impacto.emp` / `.base.emp` | inteiro compacto (ex.: `12,3 Mil`) |
| 2 | Empresas | `Building2` | `COLORS.empresas` (`#2563eb`) | `metricasEmp.impacto.estab` / `.base.estab` | inteiro compacto |
| 3 | Massa Salarial | `DollarSign` | `COLORS.empresas` (`#2563eb`) | `metricasEmp.impacto.massa` / `.base.massa` | `R$ ` + compacto, 1 casa decimal |
| 4 | Escolas | `GraduationCap` | `COLORS.educacao` (`#16a34a`) | `metricasEdu.impacto.escolas` / `.base.escolas` | inteiro compacto |
| 5 | Unidades de Saúde | `HeartPulse` | `COLORS.saude` (`#dc2626`) | `metricasSau.impacto.unidades` / `.base.unidades` | inteiro compacto |
| 6 | Profissionais Saúde | `Stethoscope` | `COLORS.saude` (`#dc2626`) | soma de todas as `STAFF_COLS` (impacto/base) | inteiro compacto |
| 7 | Edificações | `Wrench` | `COLORS.infra` (`#f59e0b`) | contagem de features da subcamada "Edificações" (impacto/base) | inteiro compacto |
| 8 | Área Atingida | `Map` (lucide) | `#0891b2` (ciano, cor própria só deste KPI — não é nenhuma das `COLORS` de camada) | km² atingidos / km² do território | compacto + sufixo `" km²"`, 1 casa decimal |

Cada linha do donut mostra: **círculo colorido** = `% atingido` (`atingido/base × 100`), **trilha cinza clara** (`#e2e8f0`) = resto. O ícone no centro do donut fica sempre na cor da própria camada (não muda com o %).

Abaixo da grade, **card largo "Área Agrícola"** (só aparece se o município/Visão Geral tiver dado agrícola): cabeçalho com ícone `Sprout` + faixa de gradiente de marca; corpo com donut maior (`DONUT_AGRI` = `clamp(32px,6.5vh,58px)`, cor `#6B8E23`) mostrando `% de hectares atingidos`, e ao lado, em 2 colunas: **"Área Atingida/Total" em hectares** e **"Prejuízo Estimado"** em R$ (laranja, `text-orange-600`) — calculado multiplicando hectares atingidos por cultura pelos coeficientes R$/ha de `IMPACTO_AGRICOLA` (por período do evento).

Rodapé da aba: nota em itálico `"Resumo das principais métricas por camada — veja o detalhamento em cada aba."`.

### 12.5 Demais abas (Empresas / Educação / Saúde / Agricultura / Infraestrutura)

**Empresas** — donut grande (170px) de "Empresas por Setor" com legenda em lista abaixo (cor + nome + valor + %), depois `KPIRow` de Empregados (com breakdown "Empregados por Setor" em barras coloridas), Massa Salarial e Média Salarial.

**Educação / Saúde / Infraestrutura / Agricultura** — mesmo padrão: 1–2 KPICards de destaque + gráfico (donut ou barras) + listas expansíveis (`Collapsible`) para drill-down em unidades individuais atingidas.

Toggle universal **Base vs. Impacto** (`mostraImpacto`): quando há cenário ativo, todo número principal mostra o valor **atingido**, com "de `<total>` (`<%>`)" como legenda secundária; sem cenário, mostra o total puro com legenda "total".

### 12.6 Fundo dos KPIs/gráficos **é diferente do fundo do painel** — camada extra de "cartão dentro do vidro"

Isso é fácil de perder de vista porque as duas cores parecem iguais no papel (`rgba(255,255,255,0.55)` nos dois casos), mas o **efeito visual final é diferente** porque só um dos dois tem `backdrop-filter`:

- O **painel** (`AnalysisPanel`, contêiner externo) tem o estilo glass completo da seção 5: `backgroundColor: rgba(255,255,255,0.55)` **+ `backdropFilter: saturate(200%) blur(24px)`** — ele borra e satura o que está atrás dele (o mapa), criando o efeito de vidro fosco translúcido onde dá pra perceber o mapa borrado por trás.
- Cada **KPICard/KPIRow/bloco de gráfico dentro do painel** usa `PANEL_CARD_BG = rgba(255,255,255,0.55)` **sem nenhum `backdrop-filter` próprio** (só a cor sólida translúcida). Como esse card já está por cima do painel (que já é borrado), o resultado é um **branco mais opaco e "chapado"**, sem o borrão adicional — o card lê como uma peça sólida flutuando *dentro* do vidro fosco do painel, não como mais uma camada de vidro.

Na prática isso cria uma hierarquia de 3 camadas visíveis ao mesmo tempo: **mapa (nítido) → painel (vidro fosco, translúcido, com blur) → KPI/gráfico (branco semi-opaco “sólido”, sem blur)**. Essa diferença é o que faz cada card de métrica se destacar como uma unidade própria dentro do painel, em vez de tudo se misturar num único bloco branco.

Resumo de valores para replicar exatamente:
```ts
// Painel externo (AnalysisPanel) — vidro fosco de verdade
{ backgroundColor: "rgba(255,255,255,0.55)", backdropFilter: "saturate(200%) blur(24px)", WebkitBackdropFilter: "saturate(200%) blur(24px)" }

// Card/gráfico interno (KPICard, KPIRow, corpo dos gráficos de cada aba) — SEM backdrop-filter
{ backgroundColor: "rgba(255,255,255,0.55)" }  // = PANEL_CARD_BG, lib/constants.ts
```
A única cor que muda de fato entre os dois é a **borda**: o painel usa `0.5px solid rgba(255,255,255,0.6)` (borda quase branca, típica de glass), enquanto cada KPICard usa `1px solid rgba(5,80,113,0.15)` (um azul-petróleo bem diluído, dando um contorno sutil que ajuda a separar visualmente um card do outro dentro do mesmo painel).

---

## 13. Mapa (`components/DashboardMap.tsx`)

### 13.1 Configuração base
```tsx
<Map
  mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
  maxPitch={85}
  attributionControl={false}
>
  <NavigationControl position="bottom-right" visualizePitch />
  <AttributionControl compact position="bottom-left" />
</Map>
```
- Basemap: **Carto Voyager** (claro, ruas e labels discretos, gratuito, sem API key).
- Terreno 3D: DEM Terrarium público (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`), ativado via `map.setTerrain()` só quando `is3D === true`. Exagero de elevação `1.0`.
- Edifícios 3D: fonte vetorial `https://tiles.openfreemap.org/planet` (schema OpenMapTiles), camada `fill-extrusion` (`source-layer: "building"`, `minzoom: 13`), visível só em modo 3D, cor `#c7c7c7`, opacidade `0.85`.

### 13.2 Controles customizados (canto inferior direito, ao lado do `NavigationControl`)
```
[3D] [↺] [↻] [▲] [▼]
```
Botões quadrados de 28×28px (`h-7 w-7`), fundo branco, borda `2px solid rgba(0,0,0,0.1)`; o botão `3D` fica destacado com `COLORS.cenario` quando ativo. Rotação em passos de 15°, inclinação em passos de 10°, pitch máximo 85°.

### 13.3 Logo GPEa no mapa (posicionamento detalhado)

A logo fica **dentro do próprio `<Map>` do react-map-gl** (não é um elemento solto por cima do mapa) — assim ela nasce como filho direto do contêiner posicionado do MapLibre e some junto quando o mapa some (`print:hidden`). Ela ocupa **o vão vazio acima da linha de botões de câmera (`3D ↺ ↻ ▲ ▼`) e ao lado do `NavigationControl`** (zoom +/− e bússola do canto inferior direito) — nunca empilhada por cima de nenhum dos dois.

Matemática do posicionamento (por que `bottom-[45px]` e não outro valor): o `NavigationControl` nativo do MapLibre nasce com `10px` de margem padrão da borda + 3 botões empilhados de `29px` cada = **97px** de altura total a partir do fundo. A caixa da logo precisa terminar exatamente onde o `NavigationControl` começa, então seu topo (`bottom + height` = `45 + 52` = `97px`) bate certinho com esse valor — os dois ficam alinhados pelo topo sem se tocar.

```tsx
{/* Dentro do <Map>, como filho direto (dentro de react-map-gl) */}
<div className="absolute bottom-[45px] right-[48px] z-10 print:hidden pointer-events-none">
  <div
    className="flex items-center justify-center h-[52px] w-[156px] rounded-md bg-white/90 shadow-sm"
    style={{ border: "2px solid rgba(0,0,0,0.1)" }}
  >
    <Image
      src="/GPEA.png"
      alt="GPEa"
      width={124}
      height={41}
      style={{ width: "auto", height: "auto", maxWidth: "132px", maxHeight: "40px" }}
    />
  </div>
</div>
```

Pontos de design a preservar:
- **`right-[48px]`**: desloca a logo para a esquerda do `NavigationControl` (que fica colado em `right: 10px` por padrão) — não ficam na mesma coluna.
- **`pointer-events-none`** no wrapper externo: a logo nunca intercepta cliques/drag do mapa por baixo dela.
- **`print:hidden`**: some ao imprimir, junto com o resto dos controles do mapa.
- **Sem `fill`/`object-contain`**: aqui a decisão é o oposto do header — como a proporção do PNG (1024×339 ≈ 3.02:1) é conhecida e fixa, usar `width`/`height` explícitos + `maxWidth/maxHeight` centralizados por flex garante que a imagem **nunca é cortada**, mesmo dentro de contextos de stacking/transform do mapa (o MapLibre cria vários) que poderiam quebrar um `fill` com `position: relative` herdado incorretamente.
- **Caixa branca `bg-white/90`** com borda cinza sutil (`2px solid rgba(0,0,0,0.1)`) — mesmo tratamento visual dos botões de câmera ao lado (fundo branco opaco, borda de 2px), para os elementos lerem como um conjunto único de "controles do mapa", mesmo vindo de fontes diferentes (um é imagem, os outros são botões).

### 13.4 Camadas do mapa — ordem de empilhamento (de baixo para cima)
Usa 3 camadas-âncora invisíveis (`type: "background"`, `background-opacity: 0`) para garantir ordem estável independente da ordem de montagem assíncrona das fontes: `anchor-mancha`, `anchor-buildings`, `anchor-pts`.

1. Raster de **densidade populacional** (WorldPop, imagem PNG por município, opacidade 0.65, `raster-resampling: nearest`)
2. Terreno 3D (fonte DEM, sem camada visual própria)
3. **Mancha de inundação** — fill + line, cor `COLORS.cenario`; opacidade do fill varia com `is3D` (0.22 em 2D / 0.32 em 3D para "Visão Geral", 0.25/0.45 por cenário — reduzido a 0.05 quando há a textura de duração por cima)
4. Textura de **duração de alagamento** (só Porto Alegre / cenário real de 2024) — raster com gradiente azul, opacidade 0.85
5. Limite administrativo (linha tracejada `#055071`, `line-dasharray: [4,3]`)
6. **Agricultura** — fill por cultura (`match` na propriedade `cultura`), opacidade 0.65
7. **Infraestrutura** — fill (polígonos, opacidade 0.25 + outline), line (linhas — vermelhas quando "atingidas" e há cenário ativo, verdes para a base completa de logradouros), circle (pontos, raio 4, borda branca)
8. Edifícios 3D extrudados (só modo 3D)
9. **Heatmaps** opcionais (Empresas/Saúde/Educação) — combináveis entre si, cada um com sua rampa de cor própria (seção 4)
10. **Pontos de Empresas/Educação/Saúde** — clustering (`clusterMaxZoom: 14`, `clusterRadius: 40`), círculo de cluster com raio por `step` (`14px` até 50 pontos, `20px` até 200, `26px` acima), contagem abreviada em texto branco, ponto individual raio 5 com borda branca 1.5px. Na "Visão Geral RS", os 3 clusters de um mesmo local são deslocados (`circle-translate`) em direções diferentes para não empilhar exatamente no mesmo pixel.
11. **Dano Físico (CLIMADA)** — substitui os pontos de Empresas/Educação/Saúde (mesma geometria) por cor interpolada na rampa `DANO_FISICO_COLOR_STOPS`, só quando ativado e só em Porto Alegre.

### 13.5 Popup (`components/MapPopup.tsx`)
Card branco `w-56 rounded-xl shadow-lg border border-slate-100`, título com emoji + cor por camada (🏢 azul Empresas, 🎓 verde Educação, 🏥 vermelho Saúde, 🏗️ laranja Infraestrutura, 🧪 âmbar Dano Físico), corpo em grid 2 colunas de mini-cards (`bg-slate-50 rounded border`) com rótulo uppercase 9px + valor 12px bold. Conteúdo específico por `source` (uma função de mapeamento de propriedades por tipo de infraestrutura, já que cada camada de infra tem campos de dado diferentes).

---

## 14. Legenda + Copyright (rodapé esquerdo)

Dois blocos lado a lado (`items-end`), deslizam para a direita (`left-[440px]`) quando o painel de análise está aberto:
- **Legenda**: cabeçalho clicável (gradiente de marca) que expande/recolhe (`▼`/`▲`); lista dinâmica de `LegendItem` conforme camadas ativas — bolinha para pontos, quadrado com borda para áreas.
- **Copyright**: chip fixo, texto `© GPEa - Grupo de Pesquisa em Economia Azul | Alisson Tallys Geraldo Fiorentin`, cor `#055071`, não-clicável (`pointer-events-none`).

---

## 15. Modal de boas-vindas (`components/WelcomeModal.tsx`)

Abre automaticamente ao montar (`useState(true)`), overlay escuro com blur, fecha ao clicar fora ou no X. Estrutura:
1. Cabeçalho com gradiente de marca + 4 logos em chips brancos (`h-8 w-14`) + título + subtítulo.
2. Corpo: texto introdutório + lista de 5 `FeatureItem` (ícone SVG 18×18 num quadrado `bg-[#f0f7fa] border-[#b3cdd8]` + título bold + descrição).
3. Rodapé: 3 botões (`Explorar Impacto` primário com gradiente; `Danos` e `Metodologia` secundários com borda).

---

## 16. Favicon / ícone do app (`app/icon.svg`)

SVG 512×512, fundo com o mesmo gradiente de marca (`#055071` → `#0a6e9a`, `rx=112` para cantos arredondados estilo app icon), um pin de localização em gradiente laranja (`#f9a03c` → `#e2761b`) com círculo branco no centro, e 3 arcos concêntricos brancos semi-transparentes abaixo do pin sugerindo "ondas de impacto":
```svg
<svg width="512" height="512" viewBox="0 0 512 512">
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#055071"/><stop offset="100%" stop-color="#0a6e9a"/>
  </linearGradient>
  <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#f9a03c"/><stop offset="100%" stop-color="#e2761b"/>
  </linearGradient>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- 3 arcos concêntricos (opacidade 0.55/0.32/0.18) -->
  <!-- pin (path) + círculo branco + círculo laranja no centro do pin -->
</svg>
```

---

## 17. Convenção de dados e fetch (para o front funcionar sem backend)

Todo dado é **JSON/GeoJSON estático servido de `public/dados_convertidos/`** — não há API/backend em runtime; um pipeline offline gera esses arquivos (ver `CLAUDE.md` da raiz do projeto de origem). Padrão de fetch usado em `useDashboard.ts`:

```ts
fetch(`/dados_convertidos/${slugify(municipio)}/empresas_BASE.geojson`, { signal })
  .then(r => r.ok ? r.json() : null)
```
- `signal` de um `AbortController` cancelado a cada troca de município/cenário (evita race condition entre requests).
- Arquivos "BASE" = todos os pontos/polígonos geocodificados; arquivos "ATINGIDOS_{cenario}" (dentro de `cenarios/`) = apenas o subconjunto dentro da mancha daquele cenário — pré-calculados pelo pipeline, o frontend nunca faz interseção geoespacial em runtime.
- Estatísticas agregadas (agricultura, infraestrutura, população, área atingida) também vêm pré-calculadas em JSON simples (`{municipio: {...}}`), permitindo o card "Visão Geral RS" apenas somar os valores dos 4 municípios no client.

Para replicar esse padrão num projeto novo: gere seus dados via pipeline/script offline, publique como arquivos estáticos versionados em `public/`, e mantenha **toda métrica derivada pré-calculada** — o cliente só soma/filtra o que já veio pronto, nunca reprocessa geometria.

---

## 18. Exportação para Excel

Botão "Baixar" no cabeçalho do Painel de Análise, usando **SheetJS (`xlsx`)**:
```ts
const exportarExcel = useCallback(() => {
  const workbook = XLSX.utils.book_new();
  // uma aba por camada de dado relevante:
  const worksheet = XLSX.utils.json_to_sheet(linhas);
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeDaAba);
  // ...
  XLSX.writeFile(workbook, `Impacto_${slugify(municipio)}${sufixoCenario}.xlsx`);
}, [...]);
```
Cada aba do Excel corresponde a uma camada de dado (Empresas, Educação, Saúde, Agricultura...), com uma linha por feature/registro relevante.

---

## 19. Impressão / geração de PDF

O botão de imprimir usa o `@media print` de `globals.css` (seção 3): esconde o mapa e os controles (`print:hidden`), remove `overflow: hidden` de todos os contêineres que cortariam sombra/gráfico, e expande o Painel de Análise para 100% da largura da página, virando efetivamente um relatório estático de uma coluna.

---

## 20. Checklist de implementação (ordem sugerida para reconstruir do zero)

1. `create-next-app` com App Router + Tailwind v4 + TypeScript; instalar as dependências exatas da seção 1.
2. Copiar `globals.css` (seção 3) e configurar fontes Geist/Geist Mono no `layout.tsx`.
3. Criar `lib/constants.ts` com sua própria paleta seguindo a mesma estrutura de chaves (`COLORS`, `*_COLORS` por camada, municípios/cenários se aplicável) e `lib/utils.ts` (`cn()`).
4. Construir a camada `components/ui/` (Button, Select, DropdownMenu, Tabs, Collapsible, DonutChart) no padrão shadcn — copiar a estrutura de variantes da seção 7.
5. Montar o layout base da página principal: contêiner tela cheia + mapa em `z-0` (seção 9).
6. Implementar o `DashboardMap` com o basemap Carto Voyager e a ordem de camadas da seção 13.4 (usar camadas-âncora `background` para ordem estável).
7. Implementar `DashboardHeader` com o padrão de `clamp()` da seção 6 e 10.
8. Implementar `FiltersPanel` e `AnalysisPanel` reaproveitando `KPICard`/`KPIRow`/`DonutChart` (seções 11–12).
9. Adicionar `WelcomeModal`, `LegendItem` + copyright, e os controles de câmera/3D do mapa (seções 13.2, 14, 15).
10. Publicar os dados pré-calculados em `public/` seguindo a convenção de nomenclatura da seção 17, e ligar tudo num hook único de estado (`useDashboard.ts`) que os componentes apenas consomem.
11. Adicionar páginas de conteúdo longo (`/danos`, `/metodologia`) com o padrão de parallel/intercepting routes da seção 8, se quiser o efeito de modal.
12. Por último: exportação Excel (seção 18) e estilos de impressão (seção 19).
