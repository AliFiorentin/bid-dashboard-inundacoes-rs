import type { Metadata } from "next";
import React from "react";
import katex from "katex";

export const metadata: Metadata = {
  title: "Metodologia — Avaliação de Impactos Socioeconômicos RS",
  description: "Metodologias de cálculo utilizadas no painel de impactos das enchentes no Rio Grande do Sul.",
};

export default function MetodologiaPage() {
  return (
    <div className="min-h-screen bg-[#f0f7fa] text-slate-800 font-sans">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-[#055071] text-white px-6 py-10 print:py-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-60 mb-2">
            BID · GPEA · FURG
          </p>
          <h1 className="text-4xl font-black leading-none mb-2 tracking-tight">Metodologia</h1>
          <p className="text-base opacity-75 font-medium">
            Avaliação de Impactos Socioeconômicos das Enchentes no Rio Grande do Sul
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 print:py-5">

        {/* ── Índice ─────────────────────────────────────────────── */}
        <nav className="bg-white border border-[#b3cdd8] rounded-xl p-5 mb-10 print:hidden shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-3">Índice</p>
          <ol className="space-y-1.5">
            {([
              ["#manchas",        "1. Manchas de Inundação — Definição dos Cenários"],
              ["#sobreposicao",   "2. Sobreposição Espacial — Cálculo dos Atingidos"],
              ["#empresas",       "3. Impacto Econômico — Empresas"],
              ["#agricultura",    "4. Impacto Econômico — Agricultura"],
              ["#educacao",       "5. Educação — Estrutura Atingida"],
              ["#saude",          "6. Saúde — Estrutura Atingida"],
              ["#infraestrutura", "7. Infraestrutura Urbana"],
              ["#edificacoes",    "8. Edificações — Google Open Buildings"],
              ["#fontes",         "9. Fontes e Referências"],
            ] as [string, string][]).map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-sm text-[#055071] font-medium hover:underline underline-offset-4 transition-colors duration-150"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── 1. Manchas ──────────────────────────────────────────── */}
        <Section id="manchas" num="1" title="Manchas de Inundação — Definição dos Cenários">
          <p>
            As manchas de inundação (polígonos de área inundada) definem a extensão geográfica de
            cada cenário modelado. Para cada município foram elaborados um ou mais cenários
            representando cotas de cheia distintas:
          </p>
          <DataTable rows={[
            ["Município",       "Cenário",                 "Referência temporal",            "Fonte da mancha"],
            ["Eldorado do Sul", "Cenário ADA",             "Maio 2024",                      "MUP / Gov. RS"],
            ["Lajeado",         "Cenário 27 m",            "Maio 2024 — cota de 27 m",       "LabModel"],
            ["Lajeado",         "Cenário 30 m",            "Maio 2024 — cota de 30 m",       "LabModel"],
            ["Porto Alegre",    "Cenário ADA",             "Maio 2024",                      "MUP / Gov. RS"],
            ["Rio Grande",      "Cenário Maio 2024",       "Maio 2024",                      "CIEX/FURG"],
            ["Rio Grande",      "Cenário Maio 2024 + 50%", "Maio 2024 com extensão de 50%",  "CIEX/FURG"],
          ]} />
          <p>
            <strong>ADA (Área Diretamente Afetada)</strong> refere-se à extensão máxima da mancha
            registrada durante o evento de maio de 2024. As manchas provêm de três origens:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-[#3d7a94]">
            <li>
              <strong className="text-slate-800">Eldorado do Sul · Porto Alegre —{" "}</strong>
              <ExtLink href="https://mup.rs.gov.br/">MUP — Mapa Único do Plano Rio Grande (Governo do RS)</ExtLink>
            </li>
            <li>
              <strong className="text-slate-800">Lajeado —{" "}</strong>
              LabModel — Laboratório de Modelagem
            </li>
            <li>
              <strong className="text-slate-800">Rio Grande —{" "}</strong>
              <ExtLink href="https://ciex.furg.br">CIEX — Centro Interinstitucional de Observação e Previsão de Eventos Extremos da FURG</ExtLink>
            </li>
          </ul>
          <SectionSources links={[
            ["MUP — Mapa Único do Plano Rio Grande (Gov. RS)", "https://mup.rs.gov.br/"],
            ["LabModel — Laboratório de Modelagem", ""],
            ["CIEX/FURG — Centro Interinstitucional de Observação e Previsão de Eventos Extremos", "https://ciex.furg.br"],
          ]} />
        </Section>

        {/* ── 2. Sobreposição ─────────────────────────────────────── */}
        <Section id="sobreposicao" num="2" title="Sobreposição Espacial — Cálculo dos Atingidos">
          <p>
            O cálculo de quais features são atingidas é feito{" "}
            <strong>inteiramente offline</strong> por um pipeline Python com{" "}
            <ExtLink href="https://geopandas.org">GeoPandas</ExtLink>.
            O painel web <strong>não realiza interseção espacial em tempo real</strong> — apenas
            carrega os arquivos pré-computados.
          </p>

          <GeoCard
            title="Pontos — Empresas · Escolas · Unidades de Saúde"
            operation='sjoin(predicate="within")'
          >
            <p className="text-sm text-[#3d7a94] mb-2">
              Um ponto <em>p</em> é classificado como atingido se está contido no polígono da
              mancha <em>M</em>:
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingido}(p) = 1 \\iff p \\in M" },
            ]} />
          </GeoCard>

          <GeoCard
            title="Polígonos — Lotes · Quadras · Terrenos · Agricultura"
            operation='sjoin(predicate="intersects") + intersection()'
          >
            <p className="text-sm text-[#3d7a94] mb-2">
              Um polígono <em>F</em> é atingido se intersecta a mancha; a área atingida é
              calculada reprojetando em EPSG:31982 (UTM Zone 22S):
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingido}(F) = 1 \\iff F \\cap M \\neq \\emptyset" },
              { label: "Área atingida [m²] =", tex: "\\text{area}(F \\cap M) \\quad \\small{\\text{(EPSG:31982)}}" },
              { label: "Área atingida [ha] =", tex: "\\dfrac{\\text{area}(F \\cap M)}{10{.}000}" },
            ]} />
          </GeoCard>

          <GeoCard
            title="Linhas — Logradouros · Eixos · Rede de Esgoto"
            operation='sjoin(predicate="intersects") + intersection()'
          >
            <p className="text-sm text-[#3d7a94] mb-2">
              Um segmento <em>L</em> é atingido se intersecta a mancha; o comprimento é a
              porção da linha dentro do polígono:
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingido}(L) = 1 \\iff L \\cap M \\neq \\emptyset" },
              { label: "Comprimento [m] =",  tex: "\\text{length}(L \\cap M) \\quad \\small{\\text{(EPSG:31982)}}" },
              { label: "Comprimento [km] =", tex: "\\dfrac{\\text{length}(L \\cap M)}{1{.}000}" },
            ]} />
          </GeoCard>

          <SubTitle>Fundamentação Matemática — Notação Formal</SubTitle>
          <p>
            A metodologia segue os princípios de geometria analítica e teoria da medida aplicados
            a dados geográficos vetoriais, conforme descrito em Câmara &amp; Davis (2004) e
            Druck et al. (2004).
          </p>
          <MathBlock exprs={[
            { label: "Indicadora de impacto", tex: "\\chi_i = \\begin{cases} 1 & \\text{se}\\ \\mathcal{A}(F_i \\cap M_j) > 0 \\\\ 0 & \\text{caso contrário} \\end{cases}" },
            { label: "Unidades afetadas",     tex: "N_a = \\sum_{i=1}^{N_t} \\chi_i" },
            { label: "Percentual",            tex: "P = \\dfrac{N_a}{N_t} \\times 100\\,\\%" },
            { label: "Atributo ponderado",    tex: "Q_a = \\sum_{i=1}^{N_t} q_i \\cdot \\chi_i" },
            { label: "Percentual ponderado",  tex: "P_q = \\dfrac{Q_a}{\\sum_i q_i} \\times 100\\,\\%" },
            { label: "Razão por feição",      tex: "r_i = \\dfrac{\\mathcal{A}(F_i \\cap M_j)}{\\mathcal{A}(F_i)}, \\quad 0 \\leq r_i \\leq 1" },
            { label: "Intensidade média",     tex: "R = \\dfrac{\\sum_i \\mathcal{A}(F_i \\cap M_j)}{\\sum_i \\mathcal{A}(F_i)} \\times 100\\,\\%" },
          ]} />
          <p className="text-[11px] italic text-[#3d7a94]">
            CRS: SIRGAS 2000 (EPSG:4674) nos dados cadastrais RS →
            EPSG:31982 para cálculos de área/comprimento →
            WGS 84 (EPSG:4326) na saída para MapLibre GL.
          </p>
          <SectionSources links={[
            ["GeoPandas Documentation", "https://geopandas.org/en/stable/docs.html"],
            ["IBGE — Malha Municipal RS", "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html"],
          ]} />
        </Section>

        {/* ── 3. Empresas ─────────────────────────────────────────── */}
        <Section id="empresas" num="3" title="Empresas — Estabelecimentos Atingidos">
          <p>
            O painel quantifica a <strong>exposição física dos estabelecimentos formais</strong>{" "}
            dentro da mancha de inundação, sem estimativa monetária de perdas.
          </p>

          <SubTitle>Dados base — RAIS 2023</SubTitle>
          <p>
            Os dados provêm da{" "}
            <ExtLink href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais">
              RAIS — Relação Anual de Informações Sociais (MTE)
            </ExtLink>,
            complementados por endereços da Receita Federal e georreferenciados via Google API.
            Cada estabelecimento é representado como um ponto{" "}
            <code className="text-xs font-mono bg-[#e8f4f8] px-1 py-0.5 rounded">Cᵢ ⊂ ℝ²</code>.
          </p>

          <SubTitle>Indicadores calculados</SubTitle>
          <DataTable rows={[
            ["Indicador",                   "Descrição"],
            ["Estabelecimentos atingidos",  <span key="estab">Contagem de pontos dentro da mancha (<Math tex={"\\chi_i = 1"} />)</span>],
            ["Empregados expostos",         <span key="emp"><Math tex={"Q_a = \\sum \\text{Empregados} \\cdot \\chi_i"} /></span>],
            ["Massa salarial exposta",      <span key="massa"><Math tex={"Q_a = \\sum \\text{Massa\\_Salarial} \\cdot \\chi_i"} /></span>],
            ["Setor (CNAE 2.0)",            "Distribuição dos atingidos por divisão e subclasse CNAE"],
            ["Salário médio",               <span key="salario"><Math tex={"\\overline{w} = \\text{Massa\\_Salarial} / \\text{Empregados}"} /></span>],
          ]} />
          <Note type="info">
            Para estimativas causais de perdas econômicas e impactos no mercado de trabalho
            formal, ver Teixeira et al. (2025) — metodologia Diferenças em Diferenças sobre RAIS
            — nas referências.
          </Note>
          <SectionSources links={[
            ["RAIS — Microdados MTE", "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais"],
            ["Receita Federal — Dados Abertos (CNPJ)", "https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj"],
          ]} />
        </Section>

        {/* ── 4. Agricultura ──────────────────────────────────────── */}
        <Section id="agricultura" num="4" title="Impacto Econômico — Agricultura">
          <p>
            A estimativa combina mapeamento de uso do solo (MapaBiomas) com dados de área cultivada
            (CONAB) e coeficientes de prejuízo por hectare calibrados ao calendário agrícola do RS.
          </p>

          <SubTitle>Mapeamento de uso do solo — MapaBiomas Coleção 10</SubTitle>
          <p>
            Classes de culturas temporárias extraídas do{" "}
            <ExtLink href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/">
              MapaBiomas Coleção 10
            </ExtLink>{" "}
            (resolução 30 m, referência 2024). A área é calculada por contagem de pixels:
          </p>
          <DataTable rows={[
            ["Código", "Classe",                      "Cor"],
            ["39",     "Soja",                        "#D4A017"],
            ["40",     "Arroz",                       "#4FC3F7"],
            ["41",     "Outras Lavouras Temporárias", "#AED581"],
          ]} />
          <MathBlock exprs={[
            { tex: "\\text{Área [ha]} = N_{\\text{pixels}} \\times \\frac{30 \\times 30\\,\\text{m}^2}{10{.}000} = N_{\\text{pixels}} \\times 0{,}09\\ \\text{ha/pixel}" },
          ]} />

          <SubTitle>Dados de área cultivada — CONAB</SubTitle>
          <p>
            Para Soja e Arroz, quando disponível, a área atingida é substituída pelos{" "}
            <ExtLink href="https://www.conab.gov.br/info-agro/safras/mapeamento-agricola">
              mapeamentos agrícolas georeferenciados da CONAB
            </ExtLink>{" "}
            (shapefiles, EPSG:4674, coluna{" "}
            <code className="text-xs font-mono bg-[#e8f4f8] px-1 py-0.5 rounded">AREA_HA</code>).
          </p>

          <SubTitle>Coeficientes de impacto (R$/ha)</SubTitle>
          <DataTable rows={[
            ["Cultura",                     "Período",       "Status",                        "Coef.",     "Referência"],
            ["Soja",                        "Maio 2024",     "Colhida (fev–abr/2024)",        "R$ 1.100",  "CONAB Preços Mínimos 2024 — insumos próxima safra + compactação"],
            ["Arroz",                       "Maio 2024",     "Colhido (fev–abr/2024)",        "R$ 1.100",  "CONAB Preços Mínimos 2024 — compactação + irrigação"],
            ["Outras Lavouras Temporárias", "Maio 2024",     "Plantio inicial (mai–jun/2024)","R$ 1.400",  "Trigo/aveia: sementes + insumos de plantio"],
            ["Soja",                        "Set. 2023",     "Pré-plantio",                   "R$ 250",    "Solo em preparo — impacto mínimo direto"],
            ["Arroz",                       "Set. 2023",     "Pré-plantio",                   "R$ 250",    "Solo em preparo — impacto mínimo direto"],
            ["Outras Lavouras Temporárias", "Set. 2023",     "Colheita (set–out/2023)",       "R$ 2.800",  "Trigo/aveia na colheita — perda quase total"],
          ]} />
          <p className="text-[11px] text-[#3d7a94]">
            Coeficientes baseados nos preços mínimos CONAB 2024 e no calendário agrícola do RS.
          </p>
          <MathBlock exprs={[
            { tex: "\\text{Prejuízo agrícola} = \\sum_i \\bigl(\\text{Área}_i\\;[\\text{ha}] \\times \\text{Coef}_i\\;[\\text{R}\\$/\\text{ha}]\\bigr)" },
          ]} />
          <Note type="warning">
            Custos diretos de produção apenas. Não inclui renda futura, contratos forward,
            recuperação de solo ou pecuária.
          </Note>
          <SectionSources links={[
            ["MapaBiomas — Coleção 10", "https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"],
            ["CONAB — Mapeamento Agrícola", "https://www.conab.gov.br/info-agro/safras/mapeamento-agricola"],
            ["CONAB — Preços Mínimos 2024", "https://www.conab.gov.br/politica-agricola/precos-minimos"],
          ]} />
        </Section>

        {/* ── 5. Educação ─────────────────────────────────────────── */}
        <Section id="educacao" num="5" title="Educação — Estrutura Atingida">
          <p>
            O painel quantifica a <strong>infraestrutura educacional atingida</strong>, sem
            estimativa monetária direta. Perdas no setor educacional são principalmente de
            reconstrução e continuidade do serviço público.
          </p>
          <DataTable rows={[
            ["Indicador",                  "Descrição"],
            ["Escolas atingidas",          "Estabelecimentos com ponto dentro da mancha"],
            ["Matrículas afetadas",        "Soma das matrículas ativas nas escolas atingidas"],
            ["Dependência administrativa", "Federal / Estadual / Municipal / Privada"],
          ]} />
          <Note type="info">
            Interrupção do ano letivo, reconstrução predial e reposição de equipamentos requerem
            levantamento de campo específico e não são estimados pelo painel.
          </Note>
          <SectionSources links={[
            ["INEP — Censo Escolar", "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar"],
            ["INEP — Microdados Censo Escolar 2023", "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar"],
          ]} />
        </Section>

        {/* ── 6. Saúde ────────────────────────────────────────────── */}
        <Section id="saude" num="6" title="Saúde — Estrutura Atingida">
          <p>
            O painel quantifica a <strong>capacidade instalada atingida</strong> no setor de saúde,
            sem estimativa monetária.
          </p>
          <DataTable rows={[
            ["Indicador",              "Descrição"],
            ["Unidades atingidas",     "Estabelecimentos com ponto dentro da mancha"],
            ["Profissionais afetados", "Vínculos de saúde por categoria CBO"],
            ["Tipo de unidade",        "Hospital, UBS, Ambulatório, etc. — CNES"],
            ["Dependência",            "Federal / Estadual / Municipal / Privada"],
          ]} />
          <p className="text-sm">Categorias de profissionais agregadas (CNES):</p>
          <ul className="list-disc list-inside text-sm text-[#3d7a94] columns-2 gap-x-8">
            {["ACS/Endemias","Admin/Gestão","Diagnóstico/Imagem","Enfermagem",
              "Farmácia","Médicos","Odontologia","Outros","Outros (Sup.)","Serv. Gerais","Transporte/Urgência",
            ].map(c => <li key={c}>{c}</li>)}
          </ul>
          <Note type="info">
            Reconstrução e reposição de equipamentos hospitalares exigem avaliação técnica de
            engenharia — não estimados pelo painel.
          </Note>
          <SectionSources links={[
            ["CNES — DataSUS", "https://cnes.datasus.gov.br"],
            ["DataSUS — Dados Abertos", "https://datasus.saude.gov.br/acesso-a-informacao/producao-hospitalar-sih-sus"],
          ]} />
        </Section>

        {/* ── 7. Infraestrutura ───────────────────────────────────── */}
        <Section id="infraestrutura" num="7" title="Infraestrutura Urbana">
          <DataTable rows={[
            ["Município",    "Camadas",                                                                                                     "Geometria"],
            ["Porto Alegre", "Eixos Logradouros, Lotes, Quarteirões, Terminais, Rede Esgoto, Paradas, Ônibus, Hidrantes, Gás, Bocas de Lobo, Postes", "Linha, Polígono, Ponto"],
            ["Rio Grande",   "Logradouros, Quadras, Terrenos, Imóveis, Prédios Públicos, Segurança",                                        "Linha, Polígono, Ponto"],
            ["Lajeado",      "Iluminação Pública, Logradouros, Lotes, Quadras",                                                             "Ponto, Linha, Polígono"],
          ]} />
          <ul className="list-disc list-inside space-y-1 text-sm text-[#3d7a94]">
            <li><strong className="text-slate-800">Contagem atingida</strong> — pontos/segmentos/polígonos com interseção com a mancha.</li>
            <li><strong className="text-slate-800">Comprimento (km)</strong> — interseção geométrica de linhas em EPSG:31982.</li>
            <li><strong className="text-slate-800">Área (ha)</strong> — interseção geométrica de polígonos em EPSG:31982.</li>
          </ul>
          <SectionSources links={[
            ["POA Dados Abertos", "https://dadosabertos.poa.br"],
            ["EPTC Porto Alegre", "https://www2.portoalegre.rs.gov.br/eptc"],
          ]} />
        </Section>

        {/* ── 8. Edificações ──────────────────────────────────────── */}
        <Section id="edificacoes" num="8" title="Edificações — Google Open Buildings">
          <p>
            A camada de edificações exibe os <strong>polígonos de footprint de construções</strong>{" "}
            detectados por visão computacional a partir de imagens de satélite de alta resolução,
            fornecidos pelo{" "}
            <ExtLink href="https://sites.research.google/open-buildings/">
              Google Open Buildings
            </ExtLink>{" "}
            (Google Research, 2023). Cada feição representa a projeção horizontal de uma edificação
            e inclui a área estimada em metros quadrados.
          </p>

          <SubTitle>Cobertura e Filtragem</SubTitle>
          <p>
            O arquivo-fonte cobre todo o estado do Rio Grande do Sul com <strong>7.438.931 edificações</strong>.
            Para cada município, as feições são extraídas pela sobreposição com a bounding box
            territorial e filtradas por um limiar de confiança do modelo de detecção:
          </p>
          <DataTable rows={[
            ["Município",      "Edificações",  "Conf. mínima", "Arquivo BASE"],
            ["Porto Alegre",   "494.590",       "0,80",         "~146 MB"],
            ["Rio Grande",     "220.655",       "0,65",         "~64 MB"],
            ["Eldorado do Sul","142.554",       "0,65",         "~42 MB"],
            ["Lajeado",        "84.925",        "0,65",         "~25 MB"],
          ]} />
          <Note type="info">
            Porto Alegre usa limiar 0,80 (em vez de 0,65) para reduzir o volume de dados de
            ~998 mil para ~494 mil edificações, mantendo apenas detecções de maior confiança.
          </Note>
          <p className="text-sm">
            Simplificação geométrica aplicada (tolerância 2 m, algoritmo Douglas-Peucker via{" "}
            <code className="text-xs font-mono bg-[#e8f4f8] px-1 py-0.5 rounded">shapely.simplify(0.00002)</code>)
            para reduzir o número de vértices sem perda visual perceptível.
          </p>

          <SubTitle>Cálculo dos Atingidos</SubTitle>
          <GeoCard
            title="Polígonos — Edificações"
            operation="shapely.intersects(mancha) — pré-computado offline"
          >
            <p className="text-sm text-[#3d7a94] mb-2">
              Uma edificação <em>F</em> é classificada como atingida se o seu polígono intersecta
              o polígono da mancha de inundação <em>M</em>:
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingida}(F) = 1 \\iff F \\cap M \\neq \\emptyset" },
            ]} />
            <p className="text-sm text-[#3d7a94] mt-2">
              O recorte é feito offline pelo script{" "}
              <code className="text-xs font-mono bg-[#e8f4f8] px-1 py-0.5 rounded">recorte_edificacoes_atingidos.py</code>{" "}
              usando <code className="text-xs font-mono bg-[#e8f4f8] px-1 py-0.5 rounded">shapely.geometry.shape.intersects()</code>.
              O painel carrega apenas o arquivo pré-filtrado — sem interseção em tempo real.
            </p>
          </GeoCard>

          <SubTitle>Indicadores calculados</SubTitle>
          <DataTable rows={[
            ["Indicador",               "Fórmula",                                                                    "Unidade"],
            ["Edificações atingidas",   <Math key="cnt" tex={"N_a = \\sum_{i} \\mathbf{1}[F_i \\cap M \\neq \\emptyset]"} />, "unidades"],
            ["Percentual atingido",     <Math key="pct" tex={"P = N_a / N_t \\times 100\\,\\%"} />,                  "%"],
            ["Área construída atingida",<Math key="area" tex={"A_a = \\sum_{i: \\text{atingida}} \\text{area\\_m2}_i"} />, "m²"],
          ]} />

          <SubTitle>Resultados por cenário</SubTitle>
          <DataTable rows={[
            ["Município",      "Cenário",                  "Atingidas", "% do total", "Arquivo ATINGIDOS"],
            ["Porto Alegre",   "Cenário ADA",               "32.005",    "6,5%",       "~9,6 MB"],
            ["Rio Grande",     "Cenário Maio 2024",         "19.897",    "9,0%",       "~5,8 MB"],
            ["Rio Grande",     "Cenário Maio 2024 + 50%",  "66.353",    "30,1%",      "~19,3 MB"],
            ["Lajeado",        "Cenário 27 m",              "2.571",     "3,0%",       "~0,8 MB"],
            ["Lajeado",        "Cenário 30 m",              "4.162",     "4,9%",       "~1,2 MB"],
            ["Eldorado do Sul","Cenário ADA",               "22.557",    "15,8%",      "~6,6 MB"],
          ]} />

          <Note type="warning">
            Os footprints são detectados automaticamente por modelo de visão computacional —
            podem incluir estruturas provisórias, cobertas ou outras feições não-residenciais.
            A confiança mínima de 0,65 já exclui a maior parte dos falsos positivos.
          </Note>
          <SectionSources links={[
            ["Google Open Buildings — Research Page", "https://sites.research.google/open-buildings/"],
            ["Google Open Buildings — Dataset no Earth Engine", "https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings_v3_polygons"],
            ["Sirko et al. (2021) — Continent-Scale Building Detection from High Resolution Satellite Imagery", "https://arxiv.org/abs/2107.12283"],
          ]} />
        </Section>

        {/* ── 9. Fontes ───────────────────────────────────────────── */}
        <Section id="fontes" num="9" title="Fontes e Referências">
          <div className="space-y-4">
            <RefBlock title="Manchas de Inundação">
              <RefItem href="https://mup.rs.gov.br/"
                label="MUP — Mapa Único do Plano Rio Grande (Gov. RS)"
                desc="Eldorado do Sul · Porto Alegre — plataforma geoespacial oficial com delimitação das áreas inundadas pelos eventos de 2024 no RS" />
              <RefItem href=""
                label="LabModel — Laboratório de Modelagem"
                desc="Lajeado — modelagem hidráulica das cotas de 27 m e 30 m no Rio Taquari" />
              <RefItem href="https://ciex.furg.br"
                label="CIEX/FURG — Centro Interinstitucional de Observação e Previsão de Eventos Extremos"
                desc="Rio Grande — modelagem hidrológica e hidráulica das manchas de inundação" />
              <RefItem href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html"
                label="IBGE — Malha Municipal"
                desc="Limites territoriais municipais (SIRGAS 2000)" />
            </RefBlock>

            <RefBlock title="Dados Socioeconômicos">
              <RefItem href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais"
                label="RAIS — Relação Anual de Informações Sociais (MTE)"
                desc="Microdados de estabelecimentos, empregados e massa salarial por município" />
              <RefItem href="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar"
                label="INEP — Censo Escolar"
                desc="Estabelecimentos de ensino, matrículas, turmas e dependência administrativa" />
              <RefItem href="https://cnes.datasus.gov.br"
                label="CNES — DataSUS"
                desc="Unidades de saúde e vínculos de profissionais de saúde por categoria" />
            </RefBlock>

            <RefBlock title="Dados Agrícolas">
              <RefItem href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"
                label="MapaBiomas — Coleção 10"
                desc="Mapeamento anual de uso e cobertura do solo no Brasil (resolução 30 m, referência 2024)" />
              <RefItem href="https://www.conab.gov.br/info-agro/safras/mapeamento-agricola"
                label="CONAB — Mapeamento Agrícola"
                desc="Shapefiles georeferenciados de área cultivada de soja e arroz por safra" />
              <RefItem href="https://www.conab.gov.br/politica-agricola/precos-minimos"
                label="CONAB — Preços Mínimos 2024"
                desc="Base dos coeficientes R$/ha para estimativa de perdas agrícolas" />
            </RefBlock>

            <RefBlock title="Dados de Edificações">
              <RefItem href="https://sites.research.google/open-buildings/"
                label="Google Open Buildings"
                desc="Polígonos de footprint de edificações detectados por visão computacional a partir de imagens de satélite de alta resolução (Google Research, 2023)" />
              <RefItem href="https://arxiv.org/abs/2107.12283"
                label="Sirko et al. (2021) — Continent-Scale Building Detection from High Resolution Satellite Imagery"
                desc="Artigo científico descrevendo o modelo de detecção e as métricas de confiança do dataset Google Open Buildings" />
            </RefBlock>

            <RefBlock title="Referências Metodológicas">
              <RefItem href="https://geopandas.org/en/stable/docs.html"
                label="GeoPandas"
                desc="Biblioteca Python para operações de sobreposição espacial (sjoin, intersection)" />
            </RefBlock>
          </div>
        </Section>

        {/* ── Rodapé ──────────────────────────────────────────────── */}
        <footer className="mt-12 pt-6 border-t border-[#b3cdd8] text-center print:mt-4">
          <p className="text-[11px] text-[#3d7a94]">
            Painel desenvolvido por GPEA/FURG em parceria com o BID — Banco Interamericano de
            Desenvolvimento.
          </p>
          <p className="text-[11px] text-[#3d7a94] mt-0.5">
            Dados de referência: 2024.
          </p>
        </footer>

      </main>
    </div>
  );
}

// ─── Componentes internos ────────────────────────────────────────────────────

function Section({ id, num, title, children }: {
  id: string; num: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-8">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-[10px] font-black text-white bg-[#055071] rounded-md px-2 py-1 shrink-0 tabular-nums">
          {num}
        </span>
        <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
      <div className="mt-8 border-b border-[#b3cdd8]" />
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-black text-[#055071] mt-5 mb-1.5 uppercase tracking-wide">
      {children}
    </h3>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#055071] font-medium hover:underline underline-offset-4
                 transition-colors duration-150">
      {children}
    </a>
  );
}

function Math({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    trust: false,
  });
  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      className={display ? "block my-1" : "inline"}
    />
  );
}

function MathBlock({ exprs }: { exprs: Array<{ label?: string; tex: string }> }) {
  return (
    <div className="my-3 px-5 py-4 bg-[#f0f7fa] border border-[#b3cdd8] rounded-lg overflow-x-auto space-y-3">
      {exprs.map(({ label, tex }, i) => (
        <div key={i} className="flex items-baseline gap-4 flex-wrap">
          {label && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3d7a94] shrink-0 w-52">
              {label}
            </span>
          )}
          <Math tex={tex} display />
        </div>
      ))}
    </div>
  );
}

function GeoCard({ title, operation, children }: {
  title: string; operation: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#b3cdd8] bg-white p-4 mt-3 shadow-sm">
      <p className="text-[11px] font-black text-[#055071] uppercase tracking-wider mb-0.5">{title}</p>
      <p className="text-[10px] text-[#3d7a94] font-mono mb-3">{operation}</p>
      {children}
    </div>
  );
}

function DataTable({ rows }: { rows: React.ReactNode[][] }) {
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto my-3 rounded-xl border border-[#b3cdd8] shadow-sm">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#055071] text-white">
            {header.map((h, i) => (
              <th key={i} className="text-left px-3 py-2.5 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}
              className="border-t border-[#b3cdd8] transition-colors duration-100 hover:bg-[#e8f4f8]"
              style={{ backgroundColor: ri % 2 === 0 ? "#ffffff" : "#f0f7fa" }}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ type, children }: { type: "warning" | "info"; children: React.ReactNode }) {
  const cfg = {
    warning: { bg: "bg-amber-50",  border: "border-amber-300", text: "text-amber-900", icon: "⚠" },
    info:    { bg: "bg-[#eff6ff]", border: "border-[#93c5fd]", text: "text-[#1e40af]", icon: "ℹ" },
  }[type];
  return (
    <div className={`rounded-lg px-4 py-3 text-[12px] leading-relaxed my-3 border-l-[3px] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className="font-bold mr-1.5">{cfg.icon}</span>{children}
    </div>
  );
}

function SectionSources({ links }: { links: [string, string][] }) {
  return (
    <div className="mt-4 pt-3 border-t border-[#b3cdd8]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d7a94] mb-1.5">Fontes</p>
      <ul className="space-y-0.5">
        {links.map(([label, href]) => (
          <li key={label}>
            {href && href !== "#" ? (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-[#055071] hover:underline underline-offset-4
                           transition-colors duration-150">
                ↗ {label}
              </a>
            ) : (
              <span className="text-[11px] text-[#3d7a94]">— {label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#b3cdd8] rounded-xl p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RefItem({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold text-[#055071] hover:underline underline-offset-4
                     transition-colors duration-150">
          {label} ↗
        </a>
      ) : (
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      )}
      <p className="text-[11px] text-[#3d7a94] mt-0.5 leading-relaxed">{desc}</p>
    </div>
  );
}
