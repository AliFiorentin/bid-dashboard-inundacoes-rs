# P4 — Relatório de Modelagem Socioeconômica Espacializada (C0) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir um documento Word (.docx) em formato ABNT contendo as Seções 3 a 7 do Produto 4, com a formulação matemática completa da metodologia de modelagem espacializada e tabelas por município e camada extraídas do dashboard.

**Architecture:** Script Node.js único usando `docx` (npm), consumindo `dados_c0.json` (já extraído do dashboard). O script define helpers ABNT (fonte, margens, recuo, tabela aberta nas laterais, equações numeradas) e monta o documento seção a seção.

**Tech Stack:** Node.js + `docx` (npm, global em `C:/Users/Alisson Fiorentin/AppData/Roaming/npm/node_modules`, exige `NODE_PATH`).

## Global Constraints

- **Somente as Seções 3, 4, 5, 6 e 7.** Não incluir Introdução (1), Objetivo (2) nem Considerações Finais (8).
- **NÃO incluir a metodologia DaLA** nem qualquer valoração econômica de perdas, funções de dano ou coeficientes monetários.
- **NÃO usar travessão (—) no corpo do texto.** Substituir por vírgula, parêntese, dois-pontos ou reescrita da frase. Permitido apenas em títulos de tabela/quadro no padrão "Tabela 1 – Título" (usar en dash `–`).
- **NÃO incluir "Grupo de Exposição" (T10/T20/T30/T40/T50).** Pertence ao modelo DiD de Teixeira et al. (2025), não ao inventário C0.
- **Todos os valores numéricos vêm de `D:/Projetos/BID/dados_c0.json`**, extraído do dashboard. Nenhum valor inventado ou trazido de outra fonte sem citação explícita.
- **Omitir o campo `leitos_total` do CNES** (base praticamente vazia: Porto Alegre = 31, Eldorado do Sul = 0; publicar seria erro factual).
- **Cada tabela deve ter parágrafo analítico antes** (introduzindo o que será mostrado) **e comentário interpretativo depois**.
- **Formato ABNT:** Times New Roman 12 pt, espaçamento 1,5, recuo de primeira linha 1,25 cm, margens 3 cm (esq./sup.) e 2 cm (dir./inf.), texto justificado, título de tabela acima, fonte abaixo em 10 pt, tabelas abertas nas laterais (padrão IBGE), equações numeradas à direita.
- **Locale pt-BR** em todos os números (separador de milhar `.`, decimal `,`).
- Saída: `D:/Projetos/BID/P4_Modelagem_Socioeconomica_Espacializada_C0.docx` (sobrescreve a versão anterior).

## Constantes ABNT (DXA)

| Medida | Valor |
|---|---|
| 1 cm | 567 DXA |
| Margem superior / esquerda (3 cm) | 1701 |
| Margem inferior / direita (2 cm) | 1134 |
| Recuo de primeira linha (1,25 cm) | 709 |
| Espaçamento 1,5 linhas | `line: 360` |
| Largura útil da página A4 | 11906 − 1701 − 1134 = **9071** |
| Corpo do texto | `size: 24` (12 pt) |
| Conteúdo de tabela e fonte | `size: 20` (10 pt) |

---

### Task 1: Esqueleto ABNT e helpers de formatação

**Files:**
- Create: `C:/Users/ALISSO~1/AppData/Local/Temp/claude/D--Projetos-BID/9949e1ab-4485-4072-baaf-6391ed1a1c0f/scratchpad/gerar_p4_abnt.js`

**Interfaces:**
- Produces: `P(texto)`, `H1(txt,n)`, `H2(txt,n)`, `tabTitulo(txt)`, `tabFonte(txt)`, `tabelaABNT(headers, rows, widths)`, `eq(latexLike, numero)`, `br(n, dec)`.

- [ ] **Step 1: Criar o cabeçalho do script com constantes e helpers**

```js
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel,
} = require("docx");
const fs = require("fs");
const D = require("D:/Projetos/BID/dados_c0.json");
const MUNS = ["Eldorado do Sul", "Lajeado", "Porto Alegre", "Rio Grande"];

const CM = 567;
const LARGURA_UTIL = 9071;
const FONTE = "Times New Roman";
const NADA = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const LINHA = { style: BorderStyle.SINGLE, size: 6, color: "000000" };

const br = (n, dec = 0) =>
  n === null || n === undefined ? "-" :
  Number(n).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Parágrafo ABNT: justificado, recuo 1,25 cm, entrelinha 1,5
function P(texto, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: opts.semRecuo ? 0 : 709 },
    spacing: { line: 360, after: 120 },
    children: [new TextRun({ text: texto, size: 24, font: FONTE })],
  });
}

// Título de seção primária (ABNT: numeração progressiva, caixa alta, negrito)
function H1(numero, texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 240, line: 360 },
    children: [new TextRun({ text: `${numero} ${texto.toUpperCase()}`, bold: true, size: 24, font: FONTE, color: "000000" })],
  });
}

// Título de seção secundária (negrito, caixa baixa)
function H2(numero, texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 360, after: 200, line: 360 },
    children: [new TextRun({ text: `${numero} ${texto}`, bold: true, size: 24, font: FONTE, color: "000000" })],
  });
}

// Título de tabela: ACIMA da tabela, alinhado à esquerda, 10 pt
function tabTitulo(texto) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 280, after: 80, line: 240 },
    children: [new TextRun({ text: texto, size: 20, font: FONTE })],
  });
}

// Fonte da tabela: ABAIXO, 10 pt
function tabFonte(texto) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 60, after: 280, line: 240 },
    children: [new TextRun({ text: texto, size: 20, font: FONTE })],
  });
}

// Equação numerada: expressão centralizada + número à direita
function eq(expressao, numero) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200, line: 360 },
    tabStops: [{ type: "right", position: LARGURA_UTIL }],
    children: [
      new TextRun({ text: expressao, size: 24, font: FONTE, italics: true }),
      new TextRun({ text: `\t(${numero})`, size: 24, font: FONTE }),
    ],
  });
}
```

- [ ] **Step 2: Adicionar o helper de tabela ABNT (laterais abertas)**

```js
function celula(texto, { w, bold, align, bordaInferior }) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: {
      top: NADA, left: NADA, right: NADA,
      bottom: bordaInferior ? LINHA : NADA,
    },
    margins: { top: 70, bottom: 70, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: String(texto), bold, size: 20, font: FONTE })],
    })],
  });
}

/** Tabela no padrão IBGE/ABNT: traço no topo, sob o cabeçalho e no rodapé; laterais abertas. */
function tabelaABNT(headers, rows, widths) {
  const alinha = i => i === 0 ? AlignmentType.LEFT : (i === 1 ? AlignmentType.CENTER : AlignmentType.RIGHT);
  return new Table({
    columnWidths: widths,
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    borders: { top: LINHA, bottom: LINHA, left: NADA, right: NADA, insideHorizontal: NADA, insideVertical: NADA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => celula(h, {
          w: widths[i], bold: true, bordaInferior: true,
          align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        })),
      }),
      ...rows.map(r => new TableRow({
        children: r.map((c, i) => celula(c, { w: widths[i], align: alinha(i) })),
      })),
    ],
  });
}

// Tabela padrão "Município | Cenário | indicadores..."
function tabCenario(indicadores, valorFn, larguras) {
  return tabelaABNT(
    ["Município", "Cenário", ...indicadores],
    MUNS.map(m => [m, "C0", ...valorFn(D[m])]),
    larguras
  );
}
```

- [ ] **Step 3: Verificar que o script carrega sem erro de sintaxe**

Run:
```bash
cd "D:/Projetos/BID" && NODE_PATH="C:/Users/Alisson Fiorentin/AppData/Roaming/npm/node_modules" node --check "C:/Users/ALISSO~1/AppData/Local/Temp/claude/D--Projetos-BID/9949e1ab-4485-4072-baaf-6391ed1a1c0f/scratchpad/gerar_p4_abnt.js"
```
Expected: sem saída (sintaxe válida).

---

### Task 2: Seção 3 — Área de Estudo e Regiões-Foco

**Files:**
- Modify: `scratchpad/gerar_p4_abnt.js` (acrescentar ao array `children`)

**Interfaces:**
- Consumes: `P`, `H1`, `H2`, `tabTitulo`, `tabFonte`, `tabelaABNT`, `br` (Task 1).

- [ ] **Step 1: Escrever a Seção 3 com a Tabela 3.1 sem "Grupo de Exposição"**

A tabela comparativa substitui a coluna removida por indicadores derivados do próprio inventário (densidade de vínculos por mil habitantes), calculados a partir de `dados_c0.json`:

```js
H1("3", "Área de estudo e regiões-foco"),
P("A modelagem socioeconômica espacializada é desenvolvida em quatro municípios do Rio Grande do Sul: Eldorado do Sul, Lajeado, Porto Alegre e Rio Grande. Em conjunto, essas regiões-foco representam os principais contextos hidrológicos e socioeconômicos da bacia hidrográfica do sistema Jacuí, Guaíba e Lagoa dos Patos."),
P("Os critérios de seleção combinam três dimensões. A primeira é a representatividade hidrológica, contemplando vale fluvial, área metropolitana e planície costeira lagunar. A segunda é a representatividade socioeconômica, abrangendo diferentes escalas urbanas e perfis produtivos. A terceira é a disponibilidade de dados desagregados e georreferenciados, condição necessária à modelagem espacializada proposta."),
P("A Tabela 3.1 sintetiza os indicadores comparativos das quatro regiões-foco no Cenário de Referência, permitindo dimensionar as assimetrias de escala entre elas."),
tabTitulo("Tabela 3.1 – Indicadores comparativos das regiões-foco no Cenário de Referência (C0)"),
tabelaABNT(
  ["Município", "População (hab.)", "Estabelecimentos", "Vínculos ativos", "Vínculos por mil hab."],
  MUNS.map(m => {
    const d = D[m];
    return [m, br(d.populacao), br(d.empresas.estab), br(d.empresas.empregados),
            br(d.empresas.empregados / d.populacao * 1000, 1)];
  }),
  [2200, 1500, 1750, 1700, 1921]
),
tabFonte("Fonte: elaboração dos autores com base em WorldPop (2024) e RAIS (2023)."),
P("Porto Alegre concentra a maior escala absoluta em todas as dimensões, com população cerca de trinta e duas vezes superior à de Eldorado do Sul. A razão de vínculos por mil habitantes, contudo, revela padrão distinto: Eldorado do Sul e Lajeado apresentam valores intermediários, enquanto Porto Alegre registra a maior intensidade de emprego formal por habitante, compatível com sua função de polo metropolitano de serviços."),

H2("3.1", "Caracterização das regiões-foco"),
P("Eldorado do Sul integra a Região Metropolitana de Porto Alegre e situa-se na planície de várzea próxima à foz do rio Jacuí no lago Guaíba. As baixas altitudes e as declividades reduzidas conferem elevada suscetibilidade à inundação. Em maio de 2024, o município registrou submersão generalizada da área urbana, com deslocamento significativo da população."),
P("Lajeado representa os municípios dos vales dos rios afluentes do sistema Jacuí e Guaíba, na região do Vale do Taquari. Caracteriza-se pela interação intensa entre a ocupação urbana e o curso d'água, com histórico recorrente de enchentes associadas ao rio Taquari, e atua como polo regional industrial, comercial e de serviços."),
P("Porto Alegre, capital do estado, concentra a maior população e a maior densidade de ativos econômicos e de infraestrutura crítica entre as regiões-foco. Ocupa posição estratégica na confluência dos rios Jacuí, Caí, Sinos e Gravataí com o lago Guaíba. Dispõe de sistema histórico de proteção contra cheias, composto por diques, casas de bombas e comportas, cuja eficiência foi parcialmente comprometida durante o evento de 2024."),
P("Rio Grande representa as cidades da planície costeira, em contexto hidrodinâmico lagunar e estuarino influenciado por ventos, marés meteorológicas e pelo acúmulo de volumes provenientes de toda a bacia. Abriga complexo portuário de relevância nacional, com atividades industriais, pesqueiras e logísticas."),
```

- [ ] **Step 2: Gerar e conferir**

Run:
```bash
cd "D:/Projetos/BID" && NODE_PATH="C:/Users/Alisson Fiorentin/AppData/Roaming/npm/node_modules" node "C:/Users/ALISSO~1/AppData/Local/Temp/claude/D--Projetos-BID/9949e1ab-4485-4072-baaf-6391ed1a1c0f/scratchpad/gerar_p4_abnt.js"
```
Expected: `gerado: D:/Projetos/BID/P4_...docx`

---

### Task 3: Seção 4 — Estruturação da Base Socioeconômica Espacializada

**Files:**
- Modify: `scratchpad/gerar_p4_abnt.js`

- [ ] **Step 1: Escrever a Seção 4 com as Tabelas 4.1 e 4.2 e a formulação da validação**

```js
H1("4", "Estruturação da base socioeconômica espacializada"),
P("A base socioeconômica é estruturada em camadas temáticas georreferenciadas, cada uma correspondendo a um setor de análise. A escolha das fontes privilegia registros administrativos de cobertura censitária, com identificação de endereço no nível do estabelecimento. Esse critério permite superar a limitação imposta por dados agregados por município e viabiliza a análise espacial dos impactos."),

H2("4.1", "Fontes de dados por camada"),
P("A Tabela 4.1 relaciona as fontes utilizadas para cada camada temática, com o respectivo período de referência e o conteúdo aproveitado na modelagem."),
tabTitulo("Tabela 4.1 – Fontes de dados por camada temática"),
tabelaABNT(
  ["Camada", "Fonte", "Referência", "Conteúdo aproveitado"],
  [
    ["População", "WorldPop (Constrained)", "2024", "Densidade populacional em grade de 100 m"],
    ["Empresas", "RAIS, Ministério do Trabalho", "2023", "Estabelecimentos, vínculos, massa salarial, CNAE"],
    ["Educação", "Censo Escolar, INEP", "2024", "Escolas, matrículas por nível, docentes"],
    ["Saúde", "CNES, DataSUS", "abr. 2024", "Estabelecimentos, tipo de unidade, profissionais"],
    ["Agricultura", "MapBiomas, Coleção 10", "2024", "Uso e cobertura do solo agrícola por cultura"],
    ["Infraestrutura", "Cadastros técnicos municipais", "variável", "Edificações, lotes, quadras, logradouros, redes"],
  ],
  [1450, 2500, 1121, 4000]
),
tabFonte("Fonte: elaboração dos autores."),
P("As camadas de empresas, educação e saúde derivam de registros administrativos de declaração obrigatória, o que assegura cobertura censitária do universo formal. A camada de população provém de produto de sensoriamento remoto com desagregação sub-municipal, e a camada agrícola resulta de classificação supervisionada de imagens orbitais. As camadas de infraestrutura dependem de cadastros técnicos municipais, cuja cobertura e nível de detalhamento variam entre os municípios."),

H2("4.2", "Unidade espacial de análise"),
P("A unidade espacial de análise varia conforme a natureza do fenômeno representado, adotando-se sempre a maior desagregação disponível na fonte. O município não constitui unidade de análise: o valor municipal resulta da agregação dos elementos individualmente espacializados, conforme detalhado na Seção 6. A Tabela 4.2 apresenta a unidade adotada, a geometria correspondente e a operação de sobreposição aplicável a cada camada."),
tabTitulo("Tabela 4.2 – Unidade espacial de análise, geometria e operação de sobreposição por camada"),
tabelaABNT(
  ["Camada", "Unidade de análise", "Geometria", "Operação de sobreposição"],
  [
    ["População", "Célula de 100 por 100 m", "Matricial", "Soma zonal"],
    ["Empresas", "Estabelecimento (CNPJ)", "Ponto", "Pertinência ponto em polígono"],
    ["Educação", "Escola (código INEP)", "Ponto", "Pertinência ponto em polígono"],
    ["Saúde", "Estabelecimento (CNES)", "Ponto", "Pertinência ponto em polígono"],
    ["Agricultura", "Polígono de cultura", "Polígono", "Interseção com recálculo de área"],
    ["Infraestrutura", "Feição cadastral", "Ponto, linha ou polígono", "Pertinência ou interseção"],
  ],
  [1450, 2300, 2100, 3221]
),
tabFonte("Fonte: elaboração dos autores."),
P("A heterogeneidade das geometrias exige tratamento diferenciado na etapa de sobreposição. Camadas pontuais admitem teste binário de pertinência, ao passo que camadas poligonais requerem interseção geométrica com recálculo do atributo de área, uma vez que a inundação pode atingir apenas parte da feição."),

H2("4.3", "Georreferenciamento e controle de qualidade"),
P("Os registros de empresas, educação e saúde são disponibilizados pelas fontes com endereço textual, sem coordenadas geográficas. O georreferenciamento é realizado por geocodificação em instância local do serviço Nominatim, baseado na base cartográfica OpenStreetMap, o que assegura reprodutibilidade e independência de serviços externos sujeitos a limitação de requisições."),
P("Formalmente, seja E o conjunto de registros de uma camada e g a função de geocodificação que associa a cada registro um par de coordenadas geográficas. O conjunto validado V resulta da aplicação de dois critérios de consistência, expressos na Equação 1."),
eq("V = { e ∈ E : (λe, φe) ≠ (0, 0)  ∧  −58° ≤ λe ≤ −49°  ∧  −34° ≤ φe ≤ −27° }", 1),
P("O primeiro critério descarta pares nulos, retorno usual de falha de geocodificação. O segundo restringe os pontos ao retângulo envolvente do estado do Rio Grande do Sul, eliminando correspondências espúrias em outras unidades da federação. A taxa de georreferenciamento da camada, definida na Equação 2, é reportada junto aos resultados para preservar a rastreabilidade."),
eq("τ = |V| ⁄ |E|", 2),
P("Registros não georreferenciados permanecem na base tabular e são excluídos apenas das operações espaciais, de modo que o total tabular e o total espacializado permaneçam auditáveis de forma independente."),
```

- [ ] **Step 2: Gerar e conferir a numeração das equações (1 e 2)**

Run: mesmo comando da Task 2, Step 2.

---

### Task 4: Seções 5 e 6 — Cenário C0 e formulação matemática da modelagem

**Files:**
- Modify: `scratchpad/gerar_p4_abnt.js`

- [ ] **Step 1: Escrever a Seção 5**

```js
H1("5", "Construção do cenário socioeconômico de referência (C0)"),
P("O Cenário Socioeconômico de Referência, doravante designado C0, corresponde à representação espacializada da estrutura socioeconômica das quatro regiões-foco na ausência de qualquer intervenção estrutural e sem a aplicação de mancha de inundação. Constitui a linha de base contra a qual os cenários de intervenção serão comparados."),

H2("5.1", "Definição e delimitação"),
P("O C0 responde a duas perguntas fundamentais para cada região-foco: o que existe no território e onde está localizado. Cada elemento socioeconômico, seja estabelecimento produtivo, escola, unidade de saúde, área agrícola ou edificação, é posicionado geograficamente e caracterizado por atributos quantitativos relevantes à análise de exposição, tais como número de vínculos empregatícios, massa salarial, matrículas ou profissionais alocados."),
P("O C0 não incorpora valoração econômica de perdas nem funções de dano. Sua função é estabelecer o inventário espacializado de exposição, sobre o qual as etapas subsequentes aplicarão as manchas de inundação correspondentes a cada cenário de intervenção. Essa delimitação é deliberada: a separação entre o inventário de exposição e a atribuição de valor econômico permite que ambos evoluam de forma independente, e assegura que eventual revisão dos parâmetros de valoração não exija reprocessamento da base espacial."),

H2("5.2", "Articulação com os cenários de intervenção"),
P("A estrutura do C0 foi concebida para receber, sem reprocessamento da base, as manchas de inundação produzidas pelos modelos hidrológico e hidrodinâmico. Cada cenário de intervenção será representado por uma mancha, e a sobreposição desta com as camadas do C0 produzirá o subconjunto de elementos atingidos, preservando os mesmos atributos e as mesmas unidades de análise."),
P("Em consequência, as tabelas apresentadas na Seção 7 estão organizadas com uma coluna explícita de identificação de cenário, atualmente preenchida com o valor C0. À medida que os cenários de intervenção forem disponibilizados, novas linhas serão acrescentadas a cada tabela, permitindo leitura comparativa direta entre a situação de referência e cada alternativa avaliada."),
```

- [ ] **Step 2: Escrever a Seção 6 com a formulação matemática completa**

```js
H1("6", "Metodologia de modelagem espacializada no cenário sem intervenção (C0)"),
P("A construção do C0 segue um fluxo de processamento sequencial, implementado de forma automatizada e reprodutível, no qual cada etapa consome os produtos da etapa anterior. Esta seção formaliza as operações aplicadas."),

H2("6.1", "Fluxo de processamento"),
P("A primeira etapa consiste na ingestão dos microdados setoriais, com filtragem pelos códigos do Instituto Brasileiro de Geografia e Estatística correspondentes aos quatro municípios e seleção das variáveis de interesse. Na sequência, os registros de empresas, educação e saúde passam pelo processo de geocodificação e validação de coordenadas formalizado na Seção 4.3."),
P("A terceira etapa converte os registros validados em camadas vetoriais, referenciadas ao sistema geodésico WGS 84, correspondente ao código EPSG 4326. Esse referencial é adotado em todo o projeto e assegura a compatibilidade geométrica entre as camadas socioeconômicas e as manchas de inundação produzidas pelos modelos hidrodinâmicos. Para a camada agrícola, os polígonos de uso do solo são vetorizados a partir do produto matricial e têm sua área calculada em hectares. Para a camada de população, o produto matricial de densidade é recortado pelos limites municipais oficiais."),
P("A etapa final agrega os atributos por camada e por município, gerando os quantitativos que compõem o Cenário C0 e que são apresentados na Seção 7."),

H2("6.2", "Agregação de atributos no cenário de referência"),
P("Seja Vm o conjunto de elementos validados de uma camada localizados no município m, e seja a um atributo quantitativo associado a cada elemento, tal como número de vínculos ou de matrículas. O valor agregado do atributo no Cenário C0 é dado pela Equação 3."),
eq("A(Vm) = Σ e∈Vm  ae", 3),
P("Para a camada de empresas, dois indicadores derivam dessa agregação. A massa salarial municipal corresponde ao somatório das remunerações mensais dos vínculos ativos, conforme a Equação 4, e o salário médio resulta da razão entre a massa salarial e o número de vínculos, conforme a Equação 5."),
eq("Wm = Σ e∈Vm  we", 4),
eq("w̄m = Wm ⁄ Lm ,  em que  Lm = Σ e∈Vm  ℓe", 5),
P("Cabe registrar que o salário médio assim definido é ponderado pelo número de vínculos, e não pela quantidade de estabelecimentos. Essa escolha evita que estabelecimentos de pequeno porte exerçam influência desproporcional sobre a medida."),

H2("6.3", "Estimativa da população residente"),
P("A população é obtida por soma zonal sobre o produto matricial de densidade populacional. Seja R o conjunto de células do produto matricial, cada célula cij associada ao valor vij, e seja Ω a região de interesse. A população contida em Ω é dada pela Equação 6."),
eq("P(Ω) = Σ (i,j) : centro(cij) ∈ Ω ∧ vij > 0   vij", 6),
P("O critério de pertinência considera o centro da célula, e não qualquer sobreposição parcial, o que evita dupla contagem em fronteiras. Valores nulos ou negativos, correspondentes a ausência de dado, são descartados. No Cenário C0, a região Ω corresponde ao limite municipal oficial; nos cenários de intervenção, corresponderá à mancha de inundação."),

H2("6.4", "Cálculo da área agrícola"),
P("A área ocupada por cada cultura é obtida por contagem de células classificadas no produto de uso e cobertura do solo. Como o produto matricial é referenciado em coordenadas geográficas, a área de cada célula varia com a latitude, sendo calculada pela Equação 7, na qual Δλ e Δφ representam a resolução angular da célula e φc a latitude central da janela recortada."),
eq("apx = |Δλ · 111320 · cos(φc) · Δφ · 111320| ⁄ 10 000   [ha]", 7),
P("A área total da cultura k no município m resulta do produto entre o número de células classificadas e a área unitária da célula, conforme a Equação 8."),
eq("Ak,m = nk,m · apx", 8),
P("O fator 111320 corresponde ao comprimento aproximado, em metros, de um grau de latitude. A correção pelo cosseno da latitude ajusta a convergência dos meridianos, e a divisão por dez mil converte metros quadrados em hectares."),

H2("6.5", "Operação de sobreposição espacial"),
P("A operação que articula o C0 aos cenários de intervenção difere conforme a geometria da camada. Seja M a mancha de inundação de um cenário, composta pela união de polígonos Pi. Previamente ao teste, a geometria é saneada por operação de buffer de raio nulo, procedimento que corrige autointerseções e assegura a validade topológica, conforme a Equação 9."),
eq("M* = ⋃ i  buffer(Pi , 0)", 9),
P("Para camadas pontuais, um elemento é classificado como atingido quando suas coordenadas situam-se no interior da mancha saneada. O subconjunto atingido no cenário c é definido pela Equação 10."),
eq("Ac = { e ∈ V : pe ∈ M* },  em que  pe = (λe , φe)", 10),
P("Para camadas poligonais, aplica-se interseção geométrica entre a feição e a mancha, com recálculo do atributo de área exclusivamente sobre a porção efetivamente atingida, conforme a Equação 11. Fragmentos degenerados, isto é, resultados de dimensão inferior a dois que decorrem de imprecisão numérica do procedimento, são descartados."),
eq("Gf c = Gf ∩ M* ,  com  área recalculada sobre Gf c", 11),
P("Para a camada de população, a operação corresponde à aplicação da Equação 6 com Ω igual a M*."),
P("Essa arquitetura garante que os elementos atingidos herdem integralmente os atributos do Cenário C0. Em consequência, qualquer indicador presente na linha de base pode ser recalculado para qualquer cenário de intervenção mediante substituição do conjunto de agregação, sem alteração da formulação metodológica. Formalmente, o indicador no cenário c obtém-se pela Equação 12."),
eq("A(Ac ∩ Vm) = Σ e ∈ Ac ∩ Vm   ae", 12),
```

- [ ] **Step 3: Gerar e conferir que as equações estão numeradas de 1 a 12**

Run: mesmo comando da Task 2, Step 2.

---

### Task 5: Seção 7 — Tabelas do Cenário C0 com parágrafos analíticos

**Files:**
- Modify: `scratchpad/gerar_p4_abnt.js`

- [ ] **Step 1: Escrever a Seção 7 completa**

Cada uma das nove tabelas recebe parágrafo introdutório e parágrafo interpretativo. Estrutura por subseção:

```js
H1("7", "Cenário C0: estrutura socioeconômica espacializada das quatro regiões"),
P("Esta seção apresenta o inventário espacializado das quatro regiões-foco no Cenário de Referência, organizado por camada temática. Todas as tabelas incluem a coluna Cenário, que identifica a situação representada e viabiliza a incorporação futura dos cenários de intervenção conforme descrito na Seção 5.2."),

H2("7.1", "População"),
P("A Tabela 7.1 apresenta a população residente estimada em cada região-foco, obtida pela aplicação da Equação 6 ao limite municipal oficial."),
tabTitulo("Tabela 7.1 – População residente por região-foco no Cenário C0"),
tabCenario(["População (hab.)"], d => [br(d.populacao)], [3000, 1500, 4571]),
tabFonte("Fonte: elaboração dos autores com base em WorldPop (2024)."),
P("O contingente populacional das quatro regiões-foco totaliza 1.683.101 habitantes. Porto Alegre responde por 79,7 por cento desse total, o que evidencia a assimetria de escala entre as regiões e antecipa que proporções semelhantes de área inundada resultarão em magnitudes absolutas de população exposta muito distintas."),
```

Repetir o padrão para as demais subseções, com os seguintes conteúdos:

**7.2 Empresas e mercado de trabalho formal** (Tabela 7.2: Estabelecimentos, Vínculos ativos, Massa salarial mensal, Salário médio). Parágrafo introdutório referenciando as Equações 3 a 5. Parágrafo interpretativo: Porto Alegre concentra 84,7 por cento dos estabelecimentos e 87,3 por cento dos vínculos; Lajeado apresenta o menor salário médio e Eldorado do Sul o maior, o que reflete composição setorial distinta.

**7.3 Educação** (Tabela 7.3: Escolas, Docentes, Profissionais de apoio, Matrículas totais; Tabela 7.4: matrículas por nível; Tabela 7.5: escolas por dependência administrativa). Interpretação: razão aluno por docente em torno de dezenove nas quatro regiões; predomínio da rede municipal em Eldorado do Sul, Lajeado e Rio Grande, e da rede privada em Porto Alegre.

**7.4 Saúde** (Tabela 7.6: Estabelecimentos e Profissionais; Tabela 7.7: por tipo de unidade). Parágrafo de ressalva: o cadastro do CNES inclui consultórios e ambulatórios privados, o que explica o elevado número de estabelecimentos em Porto Alegre e Lajeado; o campo de leitos não é apresentado por apresentar preenchimento insuficiente na fonte.

**7.5 Agricultura** (Tabela 7.8: Soja, Arroz, Outras lavouras temporárias, Total). Parágrafo introdutório referenciando as Equações 7 e 8. Interpretação: Rio Grande e Eldorado do Sul concentram a área agrícola; Lajeado não registra área de arroz.

**7.6 Infraestrutura urbana** (Tabela 7.9: Edificações, Lotes ou imóveis, Quadras, Logradouros). Ressalva sobre heterogeneidade de cadastros e nota sobre as camadas específicas de cada município.

**7.7 Síntese do Cenário C0** com os totais agregados calculados dinamicamente.

- [ ] **Step 2: Gerar o documento final**

Run:
```bash
cd "D:/Projetos/BID" && NODE_PATH="C:/Users/Alisson Fiorentin/AppData/Roaming/npm/node_modules" node "C:/Users/ALISSO~1/AppData/Local/Temp/claude/D--Projetos-BID/9949e1ab-4485-4072-baaf-6391ed1a1c0f/scratchpad/gerar_p4_abnt.js"
```
Expected: `gerado: D:/Projetos/BID/P4_Modelagem_Socioeconomica_Espacializada_C0.docx`

---

### Task 6: Verificação final do documento

**Files:**
- Nenhum arquivo modificado; apenas validação.

- [ ] **Step 1: Extrair o texto do .docx gerado**

```bash
cd "D:/Projetos/BID" && node -e "
const {execSync}=require('child_process');
" ; powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; \$z=[System.IO.Compression.ZipFile]::OpenRead('D:\Projetos\BID\P4_Modelagem_Socioeconomica_Espacializada_C0.docx'); \$e=\$z.Entries | Where-Object {\$_.FullName -eq 'word/document.xml'}; \$r=New-Object System.IO.StreamReader(\$e.Open()); \$x=\$r.ReadToEnd(); \$r.Close(); \$z.Dispose(); [System.IO.File]::WriteAllText('C:\Users\ALISSO~1\AppData\Local\Temp\claude\D--Projetos-BID\9949e1ab-4485-4072-baaf-6391ed1a1c0f\scratchpad\doc_abnt.xml',\$x)"
```

- [ ] **Step 2: Rodar as verificações objetivas**

```bash
cd "C:/Users/ALISSO~1/AppData/Local/Temp/claude/D--Projetos-BID/9949e1ab-4485-4072-baaf-6391ed1a1c0f/scratchpad" && node -e "
const fs=require('fs');
const x=fs.readFileSync('doc_abnt.xml','utf8');
const txt=x.replace(/<[^>]+>/g,' ');
const check=(nome,cond)=>console.log((cond?'OK   ':'FALHA')+'  '+nome);
check('nenhum travessao em U+2014 no corpo', !txt.includes('\u2014'));
check('sem mencao a DaLA', !/DaLA|CEPAL/i.test(txt));
check('sem Grupo de Exposicao (T10/T30/T50)', !/T10|T30|T50/.test(txt));
check('12 equacoes numeradas', [...txt.matchAll(/\(\s*(\d{1,2})\s*\)/g)].filter(m=>+m[1]>=1&&+m[1]<=12).length>=12);
check('9 tabelas na secao 7 + 3 nas secoes 3-4', (x.match(/<w:tbl>/g)||[]).length>=12);
check('fonte Times New Roman', x.includes('Times New Roman'));
check('sem campo leitos', !/leitos/i.test(txt));
console.log('tabelas:',(x.match(/<w:tbl>/g)||[]).length,'| paragrafos:',(x.match(/<w:p[ >]/g)||[]).length);
"
```
Expected: todas as linhas com `OK`.

- [ ] **Step 3: Entregar o arquivo ao usuário**

Usar `SendUserFile` com o caminho `D:/Projetos/BID/P4_Modelagem_Socioeconomica_Espacializada_C0.docx`.

---

## Self-Review

**1. Cobertura da especificação.** Seções 3 a 7 (Tasks 2 a 5); exclusão do DaLA (constraint global, verificada na Task 6); remoção de "Grupo de Exposição" (Task 2, verificada na Task 6); ausência de travessão no corpo (constraint global, verificada na Task 6); matemática da metodologia (Task 4, doze equações numeradas); parágrafo por tabela (Task 5); formato ABNT (Task 1, helpers de fonte, margem, recuo, entrelinha e tabela aberta); tabelas por município e camada com coluna de cenário (Tasks 2 e 5).

**2. Placeholders.** Nenhum "TBD" ou "implementar depois". A Task 5, Step 1 descreve o conteúdo de cada subseção de forma prescritiva, com os valores interpretativos já calculados a partir de `dados_c0.json`.

**3. Consistência de tipos.** Os helpers `P`, `H1`, `H2`, `tabTitulo`, `tabFonte`, `tabelaABNT`, `tabCenario`, `eq` e `br` são definidos na Task 1 e usados com a mesma assinatura nas Tasks 2 a 5. As larguras de coluna somam sempre 9071 DXA.

**4. Ambiguidade.** "Formato ABNT" foi resolvido como NBR 14724 para o corpo e padrão IBGE para tabelas (título acima, fonte abaixo, laterais abertas), escolha registrada nas constantes da Task 1.
