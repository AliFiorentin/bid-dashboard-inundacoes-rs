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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-[#055071] text-white px-6 py-10 print:py-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-60 mb-2">
            BID · GPEA · FURG
          </p>
          <h1 className="text-4xl font-black leading-none mb-2 tracking-tight">Metodologia</h1>
          <p className="text-base opacity-75 font-medium">
            Avaliação de Impactos Socioeconômicos das Enchentes no Rio Grande do Sul
          </p>
          <p className="text-[11px] opacity-50 mt-3 font-mono">
            Enchentes de Maio/2024 e Setembro/2023 · 4 municípios avaliados
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 print:py-5">

        {/* ── Contexto ────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#b3cdd8] rounded-xl p-5 mb-8 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-2">Contexto</p>
          <p className="text-sm leading-relaxed text-slate-700">
            As enchentes de maio de 2024 no Rio Grande do Sul constituíram o maior desastre
            climático da história do estado, com mais de 400 municípios afetados, cerca de
            580 mil pessoas desalojadas e danos estimados em R$ 88,9 bilhões (CEPAL, nov. 2024).
            Este painel avalia os impactos socioeconômicos em quatro municípios selecionados —{" "}
            <strong>Eldorado do Sul, Lajeado, Porto Alegre e Rio Grande</strong> — combinando
            dados geoespaciais de manchas de inundação com microdados de emprego formal (RAIS),
            educação (Censo Escolar), saúde (CNES/DataSUS) e uso do solo (MapBiomas/CONAB).
          </p>
          <p className="text-sm leading-relaxed text-slate-700 mt-2">
            A metodologia distingue dois planos analíticos: (a) a{" "}
            <strong>exposição física</strong> — identificação dos estabelecimentos, escolas,
            unidades de saúde e áreas agrícolas dentro da mancha de inundação — e (b) as{" "}
            <strong>perdas econômicas operacionais</strong> — estimativa do fluxo de produção e
            serviços não realizado durante o período de interrupção, seguindo a abordagem
            DaLA (CEPAL/BID).
          </p>
        </div>

        {/* ── Índice ─────────────────────────────────────────────────────────── */}
        <nav className="bg-white border border-[#b3cdd8] rounded-xl p-5 mb-10 print:hidden shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#3d7a94] mb-3">Índice</p>
          <ol className="grid grid-cols-2 gap-1.5">
            {([
              ["#manchas",        "1. Manchas de Inundação — Cenários"],
              ["#sobreposicao",   "2. Sobreposição Espacial"],
              ["#empresas",       "3. Empresas — Estabelecimentos Formais"],
              ["#agricultura",    "4. Agricultura — Impacto por Cultura"],
              ["#educacao",       "5. Educação — Estrutura Atingida"],
              ["#saude",          "6. Saúde — Capacidade Instalada"],
              ["#infraestrutura", "7. Infraestrutura Urbana"],
              ["#edificacoes",    "8. Edificações — Google Open Buildings"],
              ["#danos",          "9. Danos Operacionais — Metodologia DaLA"],
              ["#populacao",      "10. População Exposta — WorldPop"],
              ["#fontes",         "11. Fontes e Referências"],
            ] as [string, string][]).map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-sm text-[#055071] font-medium hover:underline underline-offset-4 transition-colors duration-150">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ══════════════════════════════════════════════════════════════════════
            1. MANCHAS
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="manchas" num="1" title="Manchas de Inundação — Definição dos Cenários">
          <p>
            As manchas de inundação são <strong>polígonos vetoriais que delimitam a extensão
            geográfica máxima de cada evento</strong>. Cada município possui um ou mais cenários,
            representando eventos históricos distintos ou cotas de cheia alternativas para análise
            de sensibilidade. Os polígonos foram elaborados por diferentes instituições com base
            em modelagem hidráulica, sensoriamento remoto e dados de campo.
          </p>

          <DataTable rows={[
            ["Município",       "Cenário",                  "Referência temporal",           "Descrição",                               "Fonte"],
            ["Eldorado do Sul", "Cenário ADA",              "Maio 2024",                     "Área Diretamente Afetada — extensão máxima registrada", "MUP / Gov. RS"],
            ["Lajeado",         "Cenário 27 m",             "Maio 2024 — cota 27 m",         "Cota de 27 m no Rio Taquari",             "LabModel"],
            ["Lajeado",         "Cenário 30 m",             "Maio 2024 — cota 30 m",         "Cota de 30 m no Rio Taquari",             "LabModel"],
            ["Porto Alegre",    "Cenário ADA",              "Maio 2024",                     "Área Diretamente Afetada — extensão máxima registrada", "MUP / Gov. RS"],
            ["Rio Grande",      "Cenário Maio 2024",        "Maio 2024",                     "Extensão modelada para o evento de maio", "CIEX/FURG"],
            ["Rio Grande",      "Cenário Maio 2024 + 50%",  "Maio 2024 — extensão ampliada", "Extensão hipotética com 50% de área adicional — análise de sensibilidade", "CIEX/FURG"],
            ["Rio Grande",      "Cenário Setembro 2023",    "Setembro 2023",                 "Evento de menor magnitude — setembro 2023", "CIEX/FURG"],
          ]} />

          <SubTitle>Definições-chave</SubTitle>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
            <li>
              <strong>ADA (Área Diretamente Afetada)</strong> — extensão máxima da mancha
              registrada durante o evento de maio de 2024, derivada do Mapa Único do Plano Rio
              Grande (MUP), que integrou imagens de satélite, dados de nível dos rios e
              registros de campo em tempo real.
            </li>
            <li>
              <strong>Cenário Maio 2024 + 50%</strong> — extensão hipotética obtida expandindo
              geometricamente a mancha do evento de maio em 50% da área. Utilizado para análise
              de sensibilidade em Rio Grande, onde a urbanização costeira torna a extensão da
              inundação especialmente relevante para planejamento de risco.
            </li>
            <li>
              <strong>Cotas do Rio Taquari (Lajeado)</strong> — as manchas de 27 m e 30 m foram
              geradas pelo LabModel por modelagem hidráulica 2D, correspondendo a diferentes
              níveis de extravasamento do Rio Taquari sobre a área urbana.
            </li>
          </ul>

          <SubTitle>Sistema de Referência de Coordenadas (CRS)</SubTitle>
          <DataTable rows={[
            ["CRS",                     "EPSG",   "Uso no pipeline"],
            ["SIRGAS 2000 / Geográfico", "4674",  "Dados cadastrais RS (RAIS, CNES, Censo Escolar)"],
            ["WGS 84 / Geográfico",     "4326",   "Manchas de entrada e saída para MapLibre GL"],
            ["WGS 84 / UTM Zone 22S",   "32722",  "Cálculos de área (ha) e comprimento (km) em metros"],
          ]} />

          <SubTitle>Origem dos dados</SubTitle>
          <DataTable rows={[
            ["Fonte",        "Período",                    "Municípios",                        "Método de mapeamento"],
            ["MUP / Gov. RS","Maio 2024",                  "Eldorado do Sul · Porto Alegre",    "Fusão de imagens SAR + registros de campo + nível hidrométrico"],
            ["LabModel",     "Maio 2024",                  "Lajeado — cotas 27 m e 30 m",       "Modelagem hidráulica 2D (HEC-RAS)"],
            ["CIEX/FURG",    "Maio 2024 · Setembro 2023",  "Rio Grande",                        "Modelagem hidrológica e hidráulica costeira"],
          ]} />
          <SectionSources links={[
            ["MUP — Mapa Único do Plano Rio Grande (Gov. RS)", "https://mup.rs.gov.br/"],
            ["CIEX/FURG — Centro Interinstitucional de Observação e Previsão de Eventos Extremos", "https://ciex.furg.br"],
            ["CEPAL (2024) — Avaliação dos Efeitos e Impactos das Inundações no RS", "https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            2. SOBREPOSIÇÃO ESPACIAL
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="sobreposicao" num="2" title="Sobreposição Espacial — Cálculo dos Atingidos">
          <p>
            A identificação dos elementos atingidos é feita por{" "}
            <strong>sobreposição espacial (spatial overlay)</strong> entre cada camada de feições
            georreferenciadas e o polígono da mancha de inundação do cenário selecionado. Todo
            o processamento é realizado offline com{" "}
            <ExtLink href="https://geopandas.org">GeoPandas</ExtLink> e{" "}
            <ExtLink href="https://shapely.readthedocs.io">Shapely</ExtLink>, em Python.
            O painel web carrega apenas os arquivos pré-computados — não realiza interseção
            em tempo real.
          </p>

          <SubTitle>Método por tipo de geometria</SubTitle>
          <DataTable rows={[
            ["Geometria", "Camadas", "Predicado", "Resultado"],
            ["Ponto",    "Empresas · Escolas · Unidades de Saúde", "within", "Ponto dentro do polígono da mancha"],
            ["Polígono", "Lotes · Quadras · Terrenos · Agricultura · Edificações", "intersects + intersection()", "Área de interseção em ha (EPSG:32722)"],
            ["Linha",    "Logradouros · Eixos · Rede de Esgoto", "intersects + intersection()", "Comprimento de interseção em km (EPSG:32722)"],
          ]} />

          <GeoCard title="Pontos — Empresas · Escolas · Unidades de Saúde" operation='geopandas.sjoin(predicate="within")'>
            <p className="text-sm text-[#3d7a94] mb-2">
              Um ponto <em>p</em> com coordenadas <Math tex={"(\\lambda, \\phi)"} /> é classificado
              como atingido se e somente se está geometricamente contido no interior ou fronteira
              do polígono da mancha <em>M</em>:
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingido}(p) = \\mathbf{1}[p \\in M]" },
            ]} />
            <p className="text-[11px] text-[#3d7a94] mt-2">
              Coordenadas validadas para o bounding box do RS: lat ∈ [−34°, −27°], lon ∈ [−58°, −49°].
              Pontos em (0, 0) ou fora da caixa são excluídos da análise.
            </p>
          </GeoCard>

          <GeoCard title="Polígonos — Lotes · Quadras · Agricultura · Edificações" operation='sjoin(predicate="intersects") → intersection() → área em EPSG:32722'>
            <p className="text-sm text-[#3d7a94] mb-2">
              Um polígono <em>F</em> é atingido se sua interseção com a mancha é não-vazia.
              A área atingida é calculada reprojetando para UTM Zone 22S (EPSG:32722):
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingido}(F) = \\mathbf{1}[\\mathcal{A}(F \\cap M) > 0]" },
              { label: "Área atingida [m²]", tex: "A = \\mathcal{A}(F \\cap M) \\quad \\text{(EPSG:32722)}" },
              { label: "Área atingida [ha]", tex: "A_{\\text{ha}} = A / 10{.}000" },
            ]} />
          </GeoCard>

          <GeoCard title="Linhas — Logradouros · Eixos · Rede de Esgoto" operation='sjoin(predicate="intersects") → intersection() → comprimento em EPSG:32722'>
            <p className="text-sm text-[#3d7a94] mb-2">
              Um segmento <em>L</em> é atingido se intersecta a mancha. O comprimento atingido
              é o trecho da linha dentro do polígono:
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingido}(L) = \\mathbf{1}[\\ell(L \\cap M) > 0]" },
              { label: "Comprimento [m]",  tex: "C = \\ell(L \\cap M) \\quad \\text{(EPSG:32722)}" },
              { label: "Comprimento [km]", tex: "C_{\\text{km}} = C / 1{.}000" },
            ]} />
          </GeoCard>

          <SubTitle>Notação formal — indicadores agregados</SubTitle>
          <p>
            Para um conjunto de <Math tex={"N_t"} /> feições e uma mancha <Math tex={"M_j"} />
            do cenário <em>j</em>:
          </p>
          <MathBlock exprs={[
            { label: "Indicadora de impacto",  tex: "\\chi_i = \\begin{cases} 1 & \\text{se}\\ \\mathcal{A}(F_i \\cap M_j) > 0 \\\\ 0 & \\text{caso contrário} \\end{cases}" },
            { label: "Unidades afetadas",      tex: "N_a = \\sum_{i=1}^{N_t} \\chi_i" },
            { label: "Percentual",             tex: "P = \\dfrac{N_a}{N_t} \\times 100\\,\\%" },
            { label: "Atributo ponderado",     tex: "Q_a = \\sum_{i=1}^{N_t} q_i \\cdot \\chi_i \\quad (q_i = \\text{empregados, matrículas, etc.})" },
            { label: "Percentual ponderado",   tex: "P_q = \\dfrac{Q_a}{\\sum_i q_i} \\times 100\\,\\%" },
            { label: "Razão de cobertura",     tex: "r_i = \\dfrac{\\mathcal{A}(F_i \\cap M_j)}{\\mathcal{A}(F_i)}, \\quad r_i \\in [0,\\,1]" },
            { label: "Intensidade média",      tex: "R = \\dfrac{\\sum_i \\mathcal{A}(F_i \\cap M_j)}{\\sum_i \\mathcal{A}(F_i)} \\times 100\\,\\%" },
          ]} />
          <p className="text-[11px] italic text-[#3d7a94]">
            Fluxo CRS: SIRGAS 2000 (EPSG:4674) nos dados cadastrais →
            WGS 84 (EPSG:4326) para as manchas → EPSG:32722 para cálculos de área e comprimento →
            EPSG:4326 na saída GeoJSON para MapLibre GL.
          </p>
          <SectionSources links={[
            ["GeoPandas Documentation", "https://geopandas.org/en/stable/docs.html"],
            ["Shapely Documentation", "https://shapely.readthedocs.io"],
            ["IBGE — Malha Municipal RS", "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            3. EMPRESAS
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="empresas" num="3" title="Empresas — Estabelecimentos Formais Atingidos">
          <p>
            O painel quantifica a <strong>exposição física dos estabelecimentos do setor formal</strong>{" "}
            dentro de cada mancha de inundação, com base na{" "}
            <ExtLink href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais">
              RAIS — Relação Anual de Informações Sociais (MTE)
            </ExtLink>,
            ano-base 2023. Cada estabelecimento é georreferenciado a partir do endereço
            constante na própria RAIS, geocodificado via instância local do Nominatim
            (OpenStreetMap).
          </p>

          <SubTitle>Dados base — RAIS 2023</SubTitle>
          <p>
            A RAIS 2023 contém todos os vínculos empregatícios ativos em 31/12/2022 no
            território nacional. Para este painel foram selecionados apenas estabelecimentos
            nos quatro municípios avaliados (filtragem por código IBGE de 6 dígitos).
            As variáveis extraídas por estabelecimento (CNPJ) são:
          </p>
          <DataTable rows={[
            ["Variável RAIS",           "Uso no painel"],
            ["cnpj_cei",                "Identificador do estabelecimento (14 dígitos, com zeros à esquerda)"],
            ["municipio (ibge6)",        "Filtragem dos 4 municípios de interesse"],
            ["qtd_vinc_ativos",         "Contagem de vínculos ativos = empregados expostos"],
            ["vl_remun_media_nom",      "Remuneração média mensal por vínculo → soma = folha salarial do estabelecimento"],
            ["cnae20_classe",           "CNAE 2.0 (5 dígitos) → classificação setorial → labor share para estimativa de VAB"],
            ["logradouro + município",  "Endereço para geocodificação via Nominatim"],
          ]} />

          <SubTitle>Geocodificação dos endereços</SubTitle>
          <p>
            A geocodificação é realizada com uma instância local do{" "}
            <ExtLink href="https://nominatim.org">Nominatim</ExtLink> (OpenStreetMap),
            que converte o endereço textual em coordenadas geográficas (lat/lon, EPSG:4326).
            As coordenadas são então validadas pelo bounding box do Rio Grande do Sul
            (lat ∈ [−34°, −27°], lon ∈ [−58°, −49°]) e armazenadas em cache para uso posterior.
          </p>
          <Note type="info">
            Estabelecimentos sem endereço geocodificável — endereços incompletos, caixas postais
            ou rurais sem numeração — são excluídos do mapeamento mas contabilizados separadamente
            no relatório de cobertura de geocodificação.
          </Note>

          <SubTitle>Classificação setorial por CNAE</SubTitle>
          <p>
            O código CNAE 2.0 (Classificação Nacional de Atividades Econômicas) de cada
            estabelecimento determina o setor para fins de cálculo de perdas operacionais:
          </p>
          <DataTable rows={[
            ["Divisão CNAE",     "Setor",             "Labor share (LS)", "Exemplos de atividades"],
            ["01–03",            "Agropecuária",       "17,6%",            "Lavouras, criação de animais, silvicultura"],
            ["05–39",            "Indústria",          "33,8%",            "Extração mineral, manufatura, utilidades"],
            ["41–43",            "Construção",         "43,3%",            "Obras, instalações, acabamento"],
            ["84",               "Adm. Pública",       "88,3%",            "Administração, defesa, seguridade social"],
            ["Demais (45–99)",   "Serviços",           "43,3%",            "Comércio, transporte, TI, saúde privada, educação privada"],
          ]} />

          <SubTitle>Indicadores calculados</SubTitle>
          <DataTable rows={[
            ["Indicador",                  "Fórmula / Descrição"],
            ["Estabelecimentos atingidos", <span key="e">Contagem <Math tex={"N_a = \\sum \\chi_i"} /> — pontos dentro da mancha</span>],
            ["Empregados expostos",        <span key="emp"><Math tex={"Q_{\\text{emp}} = \\sum_{i} \\text{qtd\\_vinculos}_i \\cdot \\chi_i"} /></span>],
            ["Massa salarial exposta",     <span key="ms"><Math tex={"W = \\sum_{i} w_i \\cdot \\chi_i"} /> (R$/mês, soma das remunerações médias)</span>],
            ["Salário médio",              <span key="sm"><Math tex={"\\bar{w} = W / Q_{\\text{emp}}"} /></span>],
            ["Distribuição por setor",     "Participação de cada divisão CNAE no total de estabelecimentos e empregados atingidos"],
          ]} />

          <Note type="info">
            Para estimativas causais de perdas no mercado de trabalho formal — comparando
            municípios atingidos com controles similares antes e após o evento — ver Teixeira et al.
            (2025), que aplica o método Diferenças em Diferenças sobre microdados RAIS mensais.
            Os indicadores deste painel medem a <em>exposição estática</em> (snap-shot de 2023),
            não o efeito causal.
          </Note>

          <SubTitle>Origem dos dados</SubTitle>
          <DataTable rows={[
            ["Fonte",                      "Referência temporal", "Variáveis utilizadas"],
            ["RAIS — MTE",                 "Ano-base 2023",       "Vínculos ativos, endereços, CNAE, remuneração"],
            ["OpenStreetMap / Nominatim",  "—",                   "Geocodificação de endereços (instância local)"],
          ]} />
          <SectionSources links={[
            ["RAIS — Microdados MTE", "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais"],
            ["Nominatim — OpenStreetMap Geocoder", "https://nominatim.org"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            4. AGRICULTURA
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="agricultura" num="4" title="Agricultura — Impacto por Cultura e Período">
          <p>
            A estimativa de perdas agrícolas combina o <strong>mapeamento de uso do solo</strong>{" "}
            (MapBiomas) com dados de <strong>área cultivada georeferenciada</strong> (CONAB)
            e <strong>coeficientes de impacto direto</strong> (R$/ha) calibrados ao estágio
            fenológico de cada cultura no momento do evento. O resultado representa o custo
            direto de produção perdido — insumos, sementes, corretivos e trabalho — sem
            considerar renda futura, preços de mercado ou perdas de solo de longo prazo.
          </p>

          <SubTitle>Mapeamento de uso do solo — MapBiomas Coleção 10</SubTitle>
          <p>
            O{" "}
            <ExtLink href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/">
              MapBiomas Coleção 10
            </ExtLink>{" "}
            fornece rasters anuais de uso e cobertura do solo com resolução de 30 m. Para cada
            cenário, o ano do raster é selecionado conforme o período do evento:
          </p>
          <DataTable rows={[
            ["Cenário",         "Ano do raster MapBiomas", "Justificativa"],
            ["Maio 2024",       "2024",                    "Reflete a ocupação agrícola da safra 2023/24"],
            ["Setembro 2023",   "2023",                    "Reflete a ocupação agrícola da safra 2022/23"],
          ]} />
          <p>
            As classes de lavouras temporárias mapeadas são:
          </p>
          <DataTable rows={[
            ["Código MapBiomas", "Classe",                       "Cor no painel"],
            ["39",               "Soja",                         "#D4A017 (amarelo-ouro)"],
            ["40",               "Arroz",                        "#4FC3F7 (azul-claro)"],
            ["41",               "Outras Lavouras Temporárias",  "#AED581 (verde-claro)"],
          ]} />
          <MathBlock exprs={[
            { label: "Área por pixel [ha]", tex: "a_{\\text{pixel}} = \\frac{30 \\times 30}{10{.}000} = 0{,}09\\ \\text{ha}" },
            { label: "Área total [ha]",     tex: "A_{\\text{total}} = N_{\\text{pixels}} \\times 0{,}09" },
          ]} />

          <SubTitle>Prioridade: CONAB sobre MapBiomas</SubTitle>
          <p>
            Para Soja e Arroz, quando disponíveis, os shapefiles georeferenciados da{" "}
            <ExtLink href="https://www.conab.gov.br/info-agro/safras/mapeamento-agricola">
              CONAB (Mapeamento Agrícola, safra 2023/24)
            </ExtLink>{" "}
            substituem o MapBiomas como fonte de área cultivada. O campo utilizado é{" "}
            <code className="text-xs font-mono bg-[#e8f4f8] px-1 py-0.5 rounded">AREA_HA</code>{" "}
            (EPSG:4674), que representa a área declarada pelo produtor. O MapBiomas é mantido
            como fonte para Outras Lavouras Temporárias (trigo, aveia, etc.) e quando os
            shapefiles CONAB não cobrem o município.
          </p>

          <SubTitle>Coeficientes de impacto — calendário agrícola do RS</SubTitle>
          <p>
            Os coeficientes (R$/ha) refletem o estágio fenológico no momento do evento
            e representam o custo direto de produção incorrido até aquele ponto da safra:
          </p>
          <DataTable rows={[
            ["Cultura",                     "Período",    "Status fenológico",                "Coef. (R$/ha)", "Componentes estimados"],
            ["Soja",                        "Maio 2024",  "Colhida — fev–abr/2024",           "R$ 1.100",      "Insumos para próxima safra já aplicados + compactação de solo"],
            ["Arroz",                       "Maio 2024",  "Colhido — fev–abr/2024",           "R$ 1.100",      "Infraestrutura de irrigação danificada + compactação"],
            ["Outras Lavouras Temporárias", "Maio 2024",  "Plantio inicial — mai–jun/2024",   "R$ 1.400",      "Sementes, fertilizantes base, preparo do solo"],
            ["Soja",                        "Set. 2023",  "Pré-plantio",                      "R$ 250",        "Solo em preparo — impacto mínimo, insumos não aplicados"],
            ["Arroz",                       "Set. 2023",  "Pré-plantio",                      "R$ 250",        "Solo em preparo — impacto mínimo"],
            ["Outras Lavouras Temporárias", "Set. 2023",  "Colheita — set–out/2023",          "R$ 2.800",      "Perda quase total de trigo/aveia em ponto de colheita"],
          ]} />
          <MathBlock exprs={[
            { label: "Perda total [R$]", tex: "L_{\\text{agr}} = \\sum_{c \\in \\text{culturas}} A_c\\,[\\text{ha}] \\times \\text{Coef}_c\\,[\\text{R}\\$/\\text{ha}]" },
          ]} />
          <Note type="warning">
            Escopo restrito a custos diretos de produção. Excluídos: variação de preço de mercado,
            contratos forward, renda futura de safras seguintes, recuperação de solo (calcário,
            gesso) e perdas na pecuária.
          </Note>

          <SubTitle>Origem dos dados</SubTitle>
          <DataTable rows={[
            ["Fonte",                      "Referência temporal", "Variáveis"],
            ["MapBiomas — Coleção 10",     "2023 e 2024",         "Raster 30 m; classes 39 (Soja), 40 (Arroz), 41 (Outras)"],
            ["CONAB — Mapeamento Agrícola","Safra 2023/24",       "Shapefiles georeferenciados, campo AREA_HA"],
            ["CONAB — Preços Mínimos",     "2024",                "Base para calibração dos coeficientes R$/ha"],
          ]} />
          <SectionSources links={[
            ["MapBiomas — Coleção 10", "https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"],
            ["CONAB — Mapeamento Agrícola", "https://www.conab.gov.br/info-agro/safras/mapeamento-agricola"],
            ["CONAB — Preços Mínimos 2024", "https://www.conab.gov.br/politica-agricola/precos-minimos"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            5. EDUCAÇÃO
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="educacao" num="5" title="Educação — Estrutura Atingida">
          <p>
            O painel mapeia a <strong>infraestrutura educacional da educação básica</strong>{" "}
            dentro das manchas de inundação, com base no{" "}
            <ExtLink href="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar">
              Censo Escolar 2024 (INEP)
            </ExtLink>.
            O Censo Escolar é o maior levantamento estatístico educacional do Brasil, cobrindo
            todas as escolas de educação básica (pré-escola ao ensino médio) dos sistemas
            federal, estadual, municipal e privado.
          </p>

          <SubTitle>Indicadores de exposição</SubTitle>
          <DataTable rows={[
            ["Indicador",                  "Descrição"],
            ["Escolas atingidas",          "Estabelecimentos com ponto geocodificado dentro da mancha"],
            ["Matrículas afetadas",        "Soma de todas as matrículas ativas nas escolas atingidas (pré-escola ao EM)"],
            ["Turmas afetadas",            "Número de turmas em funcionamento nas escolas atingidas"],
            ["Professores afetados",       "Vínculos de docentes nas escolas atingidas"],
            ["Dependência administrativa", "Federal / Estadual / Municipal / Privada"],
            ["Tipo de atendimento",        "Creche, Pré-escola, EF Anos Iniciais, EF Anos Finais, EM, EJA, Educação Especial"],
          ]} />

          <SubTitle>Dependência administrativa</SubTitle>
          <DataTable rows={[
            ["Código", "Dependência",  "Mantenedora"],
            ["1",      "Federal",      "União — IFs, colégios de aplicação e militares"],
            ["2",      "Estadual",     "Governo do estado — escolas estaduais de EF e EM"],
            ["3",      "Municipal",    "Prefeituras — principalmente pré-escola e EF inicial"],
            ["4",      "Privada",      "Entidades privadas com ou sem fins lucrativos"],
          ]} />

          <SubTitle>Geocodificação das escolas</SubTitle>
          <p>
            O Censo Escolar 2024 fornece latitude e longitude para a maioria dos estabelecimentos.
            Para escolas sem coordenadas na base INEP, o endereço é geocodificado via Nominatim
            (OSM). Coordenadas são validadas para o bounding box do RS antes de uso.
          </p>

          <Note type="info">
            A interrupção do calendário letivo e os custos de reconstrução predial não são
            estimados nesta seção. A estimativa do custo de <strong>reposição dos dias letivos</strong>{" "}
            perdidos (via FUNDEB/VAAT-MIN) é calculada na{" "}
            <a href="#danos" className="text-[#055071] font-semibold hover:underline underline-offset-4">
              Seção 9 — Danos Operacionais
            </a>.
          </Note>

          <SubTitle>Origem dos dados</SubTitle>
          <DataTable rows={[
            ["Fonte",                     "Referência temporal", "Variáveis"],
            ["INEP — Censo Escolar",      "2024",               "Estabelecimentos, matrículas, turmas, docentes, coordenadas"],
            ["OpenStreetMap / Nominatim", "—",                  "Geocodificação de escolas sem coordenada na base INEP"],
          ]} />
          <SectionSources links={[
            ["INEP — Censo Escolar", "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar"],
            ["INEP — Microdados Censo Escolar 2024", "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            6. SAÚDE
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="saude" num="6" title="Saúde — Capacidade Instalada Atingida">
          <p>
            O painel quantifica a <strong>capacidade instalada do sistema de saúde</strong>{" "}
            dentro das manchas de inundação, com base no{" "}
            <ExtLink href="https://cnes.datasus.gov.br">
              CNES — Cadastro Nacional de Estabelecimentos de Saúde (DataSUS)
            </ExtLink>,
            referência de abril/2024. O CNES registra todos os estabelecimentos de saúde do
            SUS e do setor privado, com localização georreferenciada por latitude/longitude
            disponível diretamente na fonte.
          </p>

          <SubTitle>Tipos de estabelecimento (TP_UNID)</SubTitle>
          <DataTable rows={[
            ["Tipo",  "Descrição"],
            ["Hospital Geral",                 "Atendimento de internação geral, urgência e emergência"],
            ["Hospital Especializado",         "Internação para especialidade específica (cardio, onco, psiquiatria, etc.)"],
            ["Pronto-Socorro",                 "Atendimento de urgência/emergência sem internação"],
            ["UBS — Unidade Básica de Saúde",  "Atenção primária, prevenção e acompanhamento de crônicas"],
            ["Ambulatório",                    "Consultas e procedimentos especializados sem internação"],
            ["CAPS",                           "Centro de Atenção Psicossocial"],
            ["Clínica Especializada",          "Serviços especializados (hemodiálise, radioterapia, etc.)"],
            ["Laboratório",                    "Diagnósticos e análises clínicas"],
          ]} />

          <SubTitle>Categorias de profissionais (CBO)</SubTitle>
          <p>
            Os vínculos de profissionais de saúde são agrupados em 11 categorias com base no
            código CBO (Classificação Brasileira de Ocupações) de 4 dígitos:
          </p>
          <DataTable rows={[
            ["Categoria painel",     "Códigos CBO (4 dígitos)",          "Exemplos de ocupações"],
            ["Médicos",              "2251–2252, 2231–2235",              "Clínicos, cirurgiões, especialistas"],
            ["Enfermagem",           "3222–3225, 2235",                   "Enfermeiros, técnicos e auxiliares de enfermagem"],
            ["Odontologia",          "2232, 3224",                        "Cirurgiões-dentistas, técnicos em saúde bucal"],
            ["Farmácia",             "2234, 3227",                        "Farmacêuticos e auxiliares"],
            ["Diagnóstico/Imagem",   "3241–3242, 2236",                   "Técnicos em radiologia, biomédicos, laboratoristas"],
            ["ACS/Endemias",         "5151–5152",                         "Agentes Comunitários de Saúde, agentes de endemias"],
            ["Transporte/Urgência",  "5162–5163",                         "Socorristas, condutores de ambulância"],
            ["Admin/Gestão",         "4110–4130",                         "Auxiliares administrativos, recepcionistas"],
            ["Serv. Gerais",         "5143, 7100–7200",                   "Higienização, limpeza, manutenção"],
            ["Outros (Sup.)",        "2030, 2040",                        "Psicólogos, fisioterapeutas, nutricionistas"],
            ["Outros",               "Demais",                            "Ocupações não classificadas nas anteriores"],
          ]} />

          <SubTitle>Indicadores calculados</SubTitle>
          <DataTable rows={[
            ["Indicador",              "Fórmula"],
            ["Unidades atingidas",     <span key="u"><Math tex={"N_a = \\sum_k \\chi_k"} /> (CNES dentro da mancha)</span>],
            ["Profissionais afetados", <span key="p"><Math tex={"P_a = \\sum_k \\sum_c \\text{staff}_{k,c} \\cdot \\chi_k"} /> (soma por categoria CBO)</span>],
            ["Leitos expostos",        "Soma de leitos SUS nas unidades atingidas (quando disponível no CNES)"],
          ]} />

          <Note type="info">
            A estimativa da <strong>perda de produção SUS</strong> (valor não realizado de
            procedimentos ambulatoriais e internações durante a interrupção) está na{" "}
            <a href="#danos" className="text-[#055071] font-semibold hover:underline underline-offset-4">
              Seção 9 — Danos Operacionais
            </a>.
          </Note>

          <SubTitle>Origem dos dados</SubTitle>
          <DataTable rows={[
            ["Fonte",                "Referência temporal", "Variáveis"],
            ["CNES — DataSUS",       "Abril/2024",          "co_cnes, tipo de unidade, lat/lon, vínculos por CBO"],
            ["SIA/SIH — DataSUS",    "Jan–Jul/2024",        "Produção ambulatorial (SIA) e hospitalar (SIH) por CNES"],
          ]} />
          <SectionSources links={[
            ["CNES — DataSUS", "https://cnes.datasus.gov.br"],
            ["DataSUS — Produção Hospitalar SIH/SUS", "https://datasus.saude.gov.br/acesso-a-informacao/producao-hospitalar-sih-sus"],
            ["DataSUS — Produção Ambulatorial SIA/SUS", "https://datasus.saude.gov.br/acesso-a-informacao/producao-ambulatorial-sia-sus"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            7. INFRAESTRUTURA
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="infraestrutura" num="7" title="Infraestrutura Urbana">
          <p>
            As camadas de infraestrutura urbana são fornecidas pelas prefeituras e órgãos
            municipais de cada cidade, em formato vetorial (shapefile / GeoJSON). A análise
            identifica os elementos com interseção com a mancha de inundação e calcula a
            extensão atingida conforme o tipo de geometria.
          </p>

          <SubTitle>Camadas por município</SubTitle>
          <DataTable rows={[
            ["Município",       "Camada",                  "Geometria",  "Métrica calculada"],
            ["Porto Alegre",    "Eixos de Logradouros",    "Linha",      "Comprimento atingido (km)"],
            ["Porto Alegre",    "Lotes",                   "Polígono",   "Área atingida (ha), contagem"],
            ["Porto Alegre",    "Quarteirões",             "Polígono",   "Área atingida (ha), contagem"],
            ["Porto Alegre",    "Terminais / Paradas",     "Ponto",      "Contagem atingida"],
            ["Porto Alegre",    "Rede de Esgoto",          "Linha",      "Comprimento atingido (km)"],
            ["Porto Alegre",    "Hidrantes / Postes / Gás","Ponto",      "Contagem atingida"],
            ["Porto Alegre",    "Bocas de Lobo",           "Ponto",      "Contagem atingida"],
            ["Rio Grande",      "Logradouros",             "Linha",      "Comprimento atingido (km)"],
            ["Rio Grande",      "Quadras / Terrenos",      "Polígono",   "Área atingida (ha), contagem"],
            ["Rio Grande",      "Imóveis / Prédios Públicos","Polígono", "Área atingida (ha), contagem"],
            ["Rio Grande",      "Pontos de Segurança",     "Ponto",      "Contagem atingida"],
            ["Lajeado",         "Iluminação Pública",      "Ponto",      "Contagem atingida"],
            ["Lajeado",         "Logradouros / Lotes / Quadras","Linha/Polígono","Comprimento / Área atingida"],
            ["Eldorado do Sul", "Edificações",             "Polígono",   "Contagem e área construída atingida (m²)"],
          ]} />

          <SubTitle>Métricas calculadas</SubTitle>
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li><strong>Contagem atingida</strong> — número de elementos com interseção com a mancha (<Math tex={"N_a = \\sum \\chi_i"} />).</li>
            <li><strong>Comprimento (km)</strong> — trecho de linhas dentro da mancha, calculado em EPSG:32722 e convertido para km.</li>
            <li><strong>Área (ha)</strong> — interseção geométrica de polígonos com a mancha, em EPSG:32722, convertida para hectares.</li>
            <li><strong>Percentual atingido</strong> — razão entre o total atingido e o total da camada dentro do município.</li>
          </ul>

          <Note type="info">
            Camadas de infraestrutura variam entre municípios conforme disponibilidade de dados
            abertos das prefeituras. Porto Alegre possui a cobertura mais abrangente via{" "}
            <ExtLink href="https://dadosabertos.poa.br">POA Dados Abertos</ExtLink>.
          </Note>

          <SubTitle>Origem dos dados</SubTitle>
          <DataTable rows={[
            ["Fonte",                         "Tipo",        "Municípios"],
            ["Prefeitura de Porto Alegre / EPTC", "Aberto", "Porto Alegre — logradouros, lotes, terminais, rede esgoto"],
            ["Prefeitura de Rio Grande",       "Fornecido",  "Rio Grande — logradouros, quadras, terrenos, imóveis"],
            ["Prefeitura de Lajeado",          "Fornecido",  "Lajeado — iluminação, logradouros, lotes, quadras"],
            ["Google Open Buildings",          "Aberto",     "Todos os municípios — edificações"],
          ]} />
          <SectionSources links={[
            ["POA Dados Abertos", "https://dadosabertos.poa.br"],
            ["EPTC Porto Alegre", "https://www2.portoalegre.rs.gov.br/eptc"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            8. EDIFICAÇÕES
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="edificacoes" num="8" title="Edificações — Google Open Buildings">
          <p>
            A camada de edificações exibe <strong>polígonos de footprint de construções</strong>{" "}
            detectados por visão computacional a partir de imagens de satélite de alta resolução,
            fornecidos pelo{" "}
            <ExtLink href="https://sites.research.google/open-buildings/">
              Google Open Buildings
            </ExtLink>{" "}
            (Google Research, 2023). Cada feição representa a projeção horizontal da edificação
            e inclui a área estimada em m², a pontuação de confiança do modelo e o código
            Plus Code do centróide.
          </p>

          <SubTitle>Cobertura e filtragem por município</SubTitle>
          <p>
            O arquivo-fonte cobre todo o Rio Grande do Sul com <strong>7.438.931 edificações</strong>.
            Para cada município, as feições são recortadas pela bounding box territorial e
            filtradas por limiar mínimo de confiança do modelo de detecção:
          </p>
          <DataTable rows={[
            ["Município",       "Edificações BASE", "Confiança mínima", "Justificativa do limiar"],
            ["Porto Alegre",    "494.590",           "0,80",             "Reduz volume de ~998 mil para ~494 mil; área densa exige maior precisão"],
            ["Rio Grande",      "220.655",           "0,65",             "Limiar padrão — área mista urbana/rural"],
            ["Eldorado do Sul", "142.554",           "0,65",             "Limiar padrão"],
            ["Lajeado",         "84.925",            "0,65",             "Limiar padrão"],
          ]} />
          <p>
            A pontuação de confiança (0–1) reflete a probabilidade de que a feição detectada
            seja de fato uma edificação. Valores abaixo do limiar tendem a corresponder a
            sombras, cobertura vegetal densa ou artefatos de processamento.
          </p>
          <p>
            Simplificação geométrica aplicada (tolerância 2 m, algoritmo Douglas-Peucker)
            para reduzir o número de vértices sem perda visual perceptível na escala municipal.
          </p>

          <SubTitle>Cálculo dos atingidos</SubTitle>
          <GeoCard
            title="Polígonos — Edificações"
            operation="geopandas.sjoin(predicate=intersects) — pré-computado offline"
          >
            <p className="text-sm text-[#3d7a94] mb-2">
              Uma edificação <em>F</em> é classificada como atingida se seu polígono intersecta
              o polígono da mancha <em>M</em>:
            </p>
            <MathBlock exprs={[
              { tex: "\\text{atingida}(F) = \\mathbf{1}[F \\cap M \\neq \\emptyset]" },
            ]} />
          </GeoCard>

          <SubTitle>Indicadores calculados</SubTitle>
          <DataTable rows={[
            ["Indicador",                "Fórmula",                                                                     "Unidade"],
            ["Edificações atingidas",    <Math key="c" tex={"N_a = \\sum_{i} \\mathbf{1}[F_i \\cap M \\neq \\emptyset]"} />, "unidades"],
            ["Percentual atingido",      <Math key="p" tex={"P = N_a / N_t \\times 100\\,\\%"} />,                     "%"],
            ["Área construída atingida", <Math key="a" tex={"A_a = \\sum_{i:\\,\\text{atingida}} \\text{area\\_m2}_i"} />, "m²"],
          ]} />

          <Note type="warning">
            Os footprints são detectados por modelo de visão computacional — podem incluir
            estruturas provisórias, galpões, coberturas e feições não-residenciais.
            O limiar de confiança de 0,65 exclui a maioria dos falsos positivos, mas não
            todos. Recomenda-se interpretar as contagens como <em>estimativas de ordem de
            grandeza</em>, não como inventário cadastral preciso.
          </Note>
          <SectionSources links={[
            ["Google Open Buildings — Research Page", "https://sites.research.google/open-buildings/"],
            ["Google Open Buildings — Dataset (Earth Engine)", "https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings_v3_polygons"],
            ["Sirko et al. (2021) — Continent-Scale Building Detection from High Resolution Satellite Imagery", "https://arxiv.org/abs/2107.12283"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            9. DANOS OPERACIONAIS — DaLA
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="danos" num="9" title="Danos Operacionais — Metodologia DaLA">
          <p>
            A estimativa de perdas econômicas segue a metodologia{" "}
            <strong>DaLA (Damage and Loss Assessment)</strong>, desenvolvida pela CEPAL em
            parceria com o BID e o Banco Mundial, aplicada pela CEPAL na avaliação das enchentes
            RS/2024. O DaLA distingue dois conceitos:
          </p>
          <DataTable rows={[
            ["Conceito",  "Definição",                                           "Exemplo"],
            ["Danos",     "Destruição total ou parcial de ativos físicos (estoque)", "Edificação destruída, equipamento perdido"],
            ["Perdas",    "Fluxo de produção ou serviço não realizado durante a interrupção", "VAB não gerado, aulas não ministradas, consultas não realizadas"],
          ]} />
          <p>
            Este painel estima as <strong>perdas operacionais</strong> — o fluxo econômico que
            deixou de ocorrer. Os danos físicos (estoque) não são estimados, pois exigiriam
            dados de profundidade de inundação por ativo e curvas de vulnerabilidade calibradas
            localmente.
          </p>

          <SubTitle>Curva de Recuperação Linear (DaLA)</SubTitle>
          <p>
            A produção não se recupera instantaneamente após o evento. O DaLA modela a
            recuperação como uma função linear: durante a{" "}
            <strong>fase aguda</strong> (d<sub>a</sub> dias) a capacidade produtiva é zero;
            durante a <strong>fase de recuperação</strong> (d<sub>r</sub> dias) ela retorna
            gradualmente, atingindo plena capacidade ao final. A perda integrada equivale a
            d<sub>a</sub> dias de produção zero mais d<sub>r</sub>/2 dias de produção perdida
            (média de 50% do fluxo durante a recuperação):
          </p>
          <MathBlock exprs={[
            { label: "Dias efetivos perdidos", tex: "d_{\\text{ef}} = d_a + \\dfrac{d_r}{2}" },
            { label: "Fator de interrupção",   tex: "f = \\dfrac{d_{\\text{ef}}}{365} \\in (0,\\,1)" },
          ]} />
          <DataTable rows={[
            ["Período",       "Fase aguda (dₐ)", "Recuperação (dᵣ)", "Dias ef.", "f",      "Base"],
            ["Maio 2024",     "30 dias",         "60 dias",          "60 dias",  "0,1644", "DaLA RS — CEPAL, nov. 2024"],
            ["Setembro 2023", "15 dias",         "30 dias",          "30 dias",  "0,0822", "DaLA RS — CEPAL, nov. 2024"],
          ]} />
          <Note type="info">
            A análise de sensibilidade do painel permite testar d<sub>ef</sub> = 30, 45 ou 60
            dias para todos os cenários — ver{" "}
            <a href="/danos" target="_blank" rel="noopener noreferrer"
              className="text-[#055071] font-semibold hover:underline underline-offset-4">
              página de Danos Operacionais ↗
            </a>.
          </Note>

          <SubTitle>Componente 1 — Empresas: Perda de VAB</SubTitle>
          <p>
            A RAIS fornece a folha salarial mensal por estabelecimento, mas não o Valor
            Adicionado Bruto (VAB). A inversão pelo <em>labor share</em> setorial é o método
            padrão da contabilidade nacional quando apenas o dado salarial está disponível
            (Karabarbounis &amp; Neiman, 2014; IBGE SCN):
          </p>
          <MathBlock exprs={[
            { label: "Labor share",       tex: "LS_s = \\dfrac{\\text{Remunerações}_s}{\\text{VAB}_s} \\quad \\text{(por setor } s \\text{)}" },
            { label: "VAB anual (est.)",  tex: "\\widehat{\\text{VAB}}_i = \\dfrac{w_{i,\\text{anual}}}{LS_s}, \\quad w_{i,\\text{anual}} = w_{i,\\text{mensal}} \\times 12" },
            { label: "Perda operacional", tex: "\\Delta_i = \\widehat{\\text{VAB}}_i \\times f" },
            { label: "Total empresas",    tex: "L_{\\text{emp}} = \\sum_{i \\in \\text{atingidos}} \\Delta_i" },
          ]} />
          <DataTable rows={[
            ["Setor (CNAE)",         "Labor share (LS)",  "Fonte (IBGE SCN 2021 — Tab17)"],
            ["Agropecuária (01–03)", "17,6%",             "SCN 2021 — Tabela 17, linha Agropecuária"],
            ["Indústria (05–39)",    "33,8%",             "SCN 2021 — Tabela 17, linha Indústria"],
            ["Construção (41–43)",   "43,3%",             "SCN 2021 — Tabela 17, linha Construção"],
            ["Adm. Pública (84)",    "88,3%",             "SCN 2021 — Tab17 (VAB ≈ custo salarial na Adm. Pública)"],
            ["Serviços (demais)",    "43,3%",             "SCN 2021 — Tabela 17, linha Serviços"],
          ]} />
          <Note type="warning">
            Estabelecimentos CNAE 84 (Administração Pública) em Porto Alegre/ADA representam
            51 unidades e ~45% da folha salarial total da área atingida. Sua inclusão é coerente
            com o DaLA (a interrupção do serviço público é uma perda real), mas amplifica o
            total estimado. Ver{" "}
            <a href="/danos#cnae84" target="_blank" rel="noopener noreferrer"
              className="text-[#055071] font-semibold hover:underline underline-offset-4">
              nota completa na página de Danos ↗
            </a>.
          </Note>

          <SubTitle>Componente 2 — Educação: Custo de Reposição FUNDEB</SubTitle>
          <p>
            A Lei de Diretrizes e Bases (LDB, Art. 24, I) exige mínimo de 200 dias letivos
            por ano. Dias interrompidos por calamidade geram obrigação legal de reposição.
            O custo é estimado pelo Valor Anual por Aluno Total Mínimo (VAAT-MIN) do FUNDEB:
          </p>
          <MathBlock exprs={[
            { label: "Custo por aluno/dia", tex: "c = \\dfrac{\\text{VAAT-MIN}}{D_{\\text{letivos}}} = \\dfrac{\\text{R}\\$\\,8.481{,}21}{200} = \\text{R}\\$\\,42{,}41/\\text{aluno/dia}" },
            { label: "Reposição total",     tex: "L_{\\text{edu}} = c \\times N_{\\text{alunos}} \\times d_{\\text{ef}}" },
          ]} />
          <DataTable rows={[
            ["Parâmetro",     "Valor",       "Fonte"],
            ["VAAT-MIN 2024", "R$ 8.481,21", "Portaria Interministerial MEC/MF nº 9, 28/08/2024"],
            ["Dias letivos",  "200/ano",     "LDB, Art. 24, I"],
          ]} />

          <SubTitle>Componente 3 — Saúde: Perda de Produção SUS</SubTitle>
          <p>
            A perda de produção do SUS é estimada pela receita de procedimentos não realizada
            durante a interrupção. A produção anual de cada unidade CNES é calculada a partir
            dos dados de produção ambulatorial (SIA) e hospitalar (SIH) disponíveis no DataSUS,
            com anualização por projeção dos 7 meses disponíveis:
          </p>
          <MathBlock exprs={[
            { label: "Produção anual CNES", tex: "P_k = \\bigl(P_{\\text{SIA},k} + P_{\\text{SIH},k}\\bigr) \\times \\dfrac{12}{7}" },
            { label: "Perda saúde",        tex: "L_{\\text{sau}} = \\sum_{k \\in \\text{atingidos}} P_k \\times f" },
          ]} />

          <SubTitle>Componente 4 — Agricultura: Custo Direto de Produção</SubTitle>
          <MathBlock exprs={[
            { label: "Perda agrícola", tex: "L_{\\text{agr}} = \\sum_{c \\in \\text{culturas}} A_c\\,[\\text{ha}] \\times \\text{Coef}_c\\,[\\text{R}\\$/\\text{ha}]" },
          ]} />
          <p>
            Custo fixo por área — independente de <em>f</em> (não é um fluxo contínuo,
            mas um custo incorrido no momento do evento). Ver metodologia detalhada na{" "}
            <a href="#agricultura" className="text-[#055071] font-semibold hover:underline underline-offset-4">
              Seção 4 — Agricultura
            </a>.
          </p>

          <SubTitle>Perda total estimada</SubTitle>
          <MathBlock exprs={[
            { label: "Total (por cenário)", tex: "L_{\\text{total}} = L_{\\text{emp}} + L_{\\text{edu}} + L_{\\text{sau}} + L_{\\text{agr}}" },
          ]} />

          <SectionSources links={[
            ["CEPAL (2024) — Avaliação dos Efeitos e Impactos das Inundações no Rio Grande do Sul", "https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024"],
            ["PDNA Vol. A Guidelines — GFDRR/UNDP/BM, 2013", "https://www.gfdrr.org/sites/default/files/2017-09/PDNA-Volume-A.pdf"],
            ["IBGE — SCN 2021, Tabela 17 (Tab17.xls)", "https://ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/"],
            ["Karabarbounis & Neiman (2014, QJE) — The Global Decline of the Labor Share", "https://doi.org/10.1093/qje/qjt032"],
            ["LDB — Lei nº 9.394/1996, Art. 24", "https://www.planalto.gov.br/ccivil_03/leis/l9394.htm"],
            ["Portaria Interministerial MEC/MF nº 9, 28/08/2024 — VAAT-MIN FUNDEB 2024", "https://www.fnde.gov.br"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            10. POPULAÇÃO EXPOSTA
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="populacao" num="10" title="População Exposta — WorldPop 2024">
          <p>
            A camada de população exposta quantifica o número de habitantes residentes dentro
            de cada mancha de inundação, cruzando as geometrias de flood extent com o raster
            de população do{" "}
            <ExtLink href="https://data.humdata.org/dataset/worldpop-population-counts-for-brazil">WorldPop</ExtLink>.
            Esse dado complementa as estimativas de danos operacionais com a perspectiva humana
            direta: <strong>quantas pessoas vivem na área afetada</strong>.
          </p>

          <SubTitle>Fonte dos dados</SubTitle>
          <DataTable rows={[
            ["Atributo",      "Valor"],
            ["Produto",       "WorldPop Global Mosaic 2024 — Population Counts (Constrained)"],
            ["Sigla do arquivo", "bra_pop_2024_CN_100m_R2025A_v1.tif"],
            ["Tipo",          "Constrained (CN) — ajustado ao censo demográfico brasileiro"],
            ["Resolução",     "100 m × 100 m por pixel (~1 ha)"],
            ["CRS",           "WGS 84 geográfico (EPSG:4326)"],
            ["Unidade",       "Número de habitantes por pixel"],
            ["Cobertura",     "Brasil inteiro"],
            ["Referência",    "Estimativa para 2024 (Revisão A, 2025)"],
            ["Repositório",   "Humanitarian Data Exchange (HDX) — data.humdata.org"],
          ]} />

          <SubTitle>Método de cálculo</SubTitle>
          <p>
            O processamento é realizado pelo script{" "}
            <code className="bg-[#f0f7fa] border border-[#b3cdd8] rounded px-1 text-[12px] font-mono">pipeline/09_populacao.py</code>{" "}
            com <ExtLink href="https://rasterio.readthedocs.io">rasterio</ExtLink> e{" "}
            <ExtLink href="https://geopandas.org">GeoPandas</ExtLink>:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700 mt-2">
            <li>
              <strong>Limite municipal</strong> — baixado via IBGE API v3
              (<code className="bg-[#f0f7fa] text-[11px] font-mono px-1 rounded">/api/v3/malhas/municipios/&#123;ibge7&#125;</code>)
              e cacheado localmente em <code className="bg-[#f0f7fa] text-[11px] font-mono px-1 rounded">data/raw/ibge/</code>.
            </li>
            <li>
              <strong>Pop. total municipal</strong> — clip do raster pelo polígono IBGE com{" "}
              <code className="bg-[#f0f7fa] text-[11px] font-mono px-1 rounded">rasterio.mask.mask()</code>;
              soma de todos os pixels válidos (valor &gt; 0 e ≠ nodata).
            </li>
            <li>
              <strong>Pop. atingida por cenário</strong> — clip pelo polígono da mancha de
              inundação correspondente; mesma soma. Pixels de nodata (−99999) excluídos.
            </li>
            <li>
              <strong>Heatmap</strong> — array recortado pelo limite municipal convertido a PNG
              RGBA com colormap <em>plasma</em> em escala logarítmica
              (log₁₀(1 + pop), máximo em 300 hab/pixel). Pixels nulos ou zero recebem
              alpha = 0 (transparente). O PNG é georreferenciado por quatro cantos em WGS 84
              e servido como <code className="bg-[#f0f7fa] text-[11px] font-mono px-1 rounded">image source</code>{" "}
              no MapLibre GL.
            </li>
          </ol>

          <SubTitle>Fórmulas</SubTitle>
          <div className="bg-[#f0f7fa] border border-[#b3cdd8] rounded-lg p-4 font-mono text-sm space-y-2">
            <div>
              <span className="text-[#055071] font-bold">Pop_total(M)</span>
              {" = ∑ pixel(i,j)  ∀ (i,j) ∈ Limite_Municipal(M)"}
            </div>
            <div>
              <span className="text-[#055071] font-bold">Pop_atingida(M, C)</span>
              {" = ∑ pixel(i,j)  ∀ (i,j) ∈ Mancha(M, C)"}
            </div>
            <div>
              <span className="text-[#055071] font-bold">% atingida</span>
              {" = Pop_atingida / Pop_total × 100"}
            </div>
          </div>

          <SubTitle>Limitações</SubTitle>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
            <li>
              Os modelos WorldPop são estimativas estatísticas baseadas em dados censitários de
              2022 e covariáveis geoespaciais (construções, uso do solo, luminosidade noturna);
              não capturam migrações pós-enchente nem desalojamentos.
            </li>
            <li>
              A resolução de 100 m é adequada para análises municipais, mas pode superestimar
              a população em áreas de uso misto (industrial/comercial) onde residentes não existem.
            </li>
            <li>
              A população <em>exposta</em> (dentro da mancha) não equivale a população{" "}
              <em>afetada</em> (que efetivamente sofreu impactos): parte das edificações pode
              ter sido evacuada antes da inundação ou estar em pavimentos superiores.
            </li>
          </ul>

          <SubTitle>Resultados</SubTitle>
          <DataTable rows={[
            ["Município",       "Pop. Total (WorldPop)",  "Cenário",                   "Pop. Atingida",  "% Exposta"],
            ["Eldorado do Sul", "41.958",                 "Cenário ADA",               "29.406",         "70,1%"],
            ["Lajeado",         "100.717",                "Cenário 27 m",              "5.124",          "5,1%"],
            ["Lajeado",         "100.717",                "Cenário 30 m",              "7.453",          "7,4%"],
            ["Porto Alegre",    "1.342.008",              "Cenário ADA",               "379.596",        "28,3%"],
            ["Rio Grande",      "198.418",                "Cenário Maio 2024",         "23.058",         "11,6%"],
            ["Rio Grande",      "198.418",                "Cenário Maio 2024 + 50%",   "80.124",         "40,4%"],
            ["Rio Grande",      "198.418",                "Cenário Setembro 2023",     "7.844",          "4,0%"],
          ]} />

          <SectionSources links={[
            ["WorldPop (2025) — Brazil Population Counts 100m 2024, constrained individual countries", "https://data.humdata.org/dataset/worldpop-population-counts-for-brazil"],
            ["IBGE — Malhas Municipais (API v3)", "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/"],
            ["rasterio — Raster I/O in Python", "https://rasterio.readthedocs.io"],
          ]} />
        </Section>

        {/* ══════════════════════════════════════════════════════════════════════
            11. FONTES E REFERÊNCIAS
        ══════════════════════════════════════════════════════════════════════ */}
        <Section id="fontes" num="11" title="Fontes e Referências">
          <div className="space-y-4">

            <RefBlock title="Manchas de Inundação e Contexto">
              <RefItem href="https://mup.rs.gov.br/"
                label="MUP — Mapa Único do Plano Rio Grande (Gov. RS)"
                desc="Plataforma geoespacial oficial do RS com delimitação das áreas inundadas em 2024. Fonte das manchas ADA de Eldorado do Sul e Porto Alegre." />
              <RefItem href="https://ciex.furg.br"
                label="CIEX/FURG — Centro Interinstitucional de Observação e Previsão de Eventos Extremos"
                desc="Modelagem hidrológica e hidráulica costeira para Rio Grande — manchas de Maio 2024, Maio 2024 + 50% e Setembro 2023." />
              <RefItem href="https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024"
                label="CEPAL (nov/2024) — Avaliação dos Efeitos e Impactos das Inundações no Rio Grande do Sul"
                desc="Avaliação oficial DaLA das enchentes RS 2024: R$ 88,9 bi em danos e perdas. Referência metodológica para a curva de recuperação linear e parâmetros de interrupção." />
              <RefItem href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html"
                label="IBGE — Malha Municipal RS"
                desc="Limites territoriais municipais em SIRGAS 2000 (EPSG:4674), usados para delimitação geográfica e filtragem por município." />
            </RefBlock>

            <RefBlock title="Dados Socioeconômicos">
              <RefItem href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais"
                label="RAIS — Relação Anual de Informações Sociais (MTE, 2023)"
                desc="Microdados de vínculos ativos, estabelecimentos, CNAE, remuneração e endereços. Base para mapeamento de empresas atingidas e estimativa de VAB." />
              <RefItem href="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar"
                label="INEP — Censo Escolar 2024"
                desc="Levantamento completo de estabelecimentos de educação básica, matrículas, turmas e docentes. Base para mapeamento de escolas atingidas e custo de reposição FUNDEB." />
              <RefItem href="https://cnes.datasus.gov.br"
                label="CNES — Cadastro Nacional de Estabelecimentos de Saúde (DataSUS, abr/2024)"
                desc="Registro de todos os estabelecimentos de saúde com localização georeferenciada, vínculos profissionais por CBO e tipo de unidade." />
              <RefItem href="https://datasus.saude.gov.br/acesso-a-informacao/producao-hospitalar-sih-sus"
                label="SIH/SUS — Produção Hospitalar (DataSUS, jan–jul/2024)"
                desc="Autorização de Internação Hospitalar (AIH) por estabelecimento CNES — base para estimativa da perda de produção hospitalar durante a interrupção." />
              <RefItem href="https://datasus.saude.gov.br/acesso-a-informacao/producao-ambulatorial-sia-sus"
                label="SIA/SUS — Produção Ambulatorial (DataSUS, jan–jul/2024)"
                desc="Boletim de Produção Ambulatorial (BPA) por estabelecimento CNES — base para estimativa da perda de produção ambulatorial durante a interrupção." />
              <RefItem href="https://nominatim.org"
                label="OpenStreetMap / Nominatim"
                desc="Geocodificador de endereços baseado em dados OSM, instância local. Usado para estabelecimentos RAIS e escolas sem coordenadas próprias." />
            </RefBlock>

            <RefBlock title="Dados Agrícolas">
              <RefItem href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"
                label="MapBiomas — Coleção 10"
                desc="Mapeamento anual de uso e cobertura do solo no Brasil em raster de 30 m. Anos 2023 e 2024 utilizados conforme o período do cenário. Classes: Soja (39), Arroz (40), Outras Lavouras Temporárias (41)." />
              <RefItem href="https://www.conab.gov.br/info-agro/safras/mapeamento-agricola"
                label="CONAB — Mapeamento Agrícola (safra 2023/24)"
                desc="Shapefiles georeferenciados de área cultivada de soja e arroz com campo AREA_HA declarado pelo produtor. Tem prioridade sobre MapBiomas quando disponível." />
              <RefItem href="https://www.conab.gov.br/politica-agricola/precos-minimos"
                label="CONAB — Preços Mínimos 2024"
                desc="Base para calibração dos coeficientes R$/ha de impacto direto por cultura e estágio fenológico." />
            </RefBlock>

            <RefBlock title="Edificações">
              <RefItem href="https://sites.research.google/open-buildings/"
                label="Google Open Buildings (Google Research, 2023)"
                desc="Dataset de footprints de edificações detectados por visão computacional a partir de imagens de satélite de alta resolução. Cobre o RS com 7,4 milhões de feições." />
              <RefItem href="https://arxiv.org/abs/2107.12283"
                label="Sirko et al. (2021) — Continent-Scale Building Detection from High Resolution Satellite Imagery"
                desc="Artigo científico descrevendo o modelo de detecção, as métricas de confiança e a metodologia de avaliação do dataset Google Open Buildings. arXiv:2107.12283." />
            </RefBlock>

            <RefBlock title="Metodologia DaLA e Referências Econômicas">
              <RefItem href="https://www.gfdrr.org/sites/default/files/2017-09/PDNA-Volume-A.pdf"
                label="PDNA Vol. A Guidelines — GFDRR/UNDP/BM, 2013"
                desc="Guia metodológico para avaliação de pós-desastre: danos ao estoque e perdas de fluxo. Define que perdas = mudanças nos fluxos econômicos durante e após o desastre." />
              <RefItem href="https://ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/"
                label="IBGE — SCN 2021, Tabela 17 (Tab17.xls)"
                desc="Sistema de Contas Nacionais 2021 — única fonte pública IBGE com Remunerações por atividade econômica. Base dos labor shares setoriais usados na inversão VAB = w_anual / LS." />
              <RefItem href="https://doi.org/10.1093/qje/qjt032"
                label="Karabarbounis & Neiman (2014, QJE) — The Global Decline of the Labor Share"
                desc="Referência canônica para o labor share como métrica de distribuição funcional da renda. Valida VAB = Remunerações / LS como identidade contábil padrão em análises macroeconômicas." />
              <RefItem href="https://www.fnde.gov.br"
                label="Portaria Interministerial MEC/MF nº 9, 28/08/2024"
                desc="Define o VAAT-MIN FUNDEB 2024 = R$ 8.481,21 — parâmetro do custo de reposição dos dias letivos interrompidos." />
              <RefItem href="https://www.planalto.gov.br/ccivil_03/leis/l9394.htm"
                label="Lei nº 9.394/1996 (LDB) — Art. 24, I"
                desc="Estabelece o mínimo de 200 dias letivos por ano e a obrigatoriedade de reposição dos dias perdidos por calamidade pública." />
            </RefBlock>

            <RefBlock title="Ferramentas e Infraestrutura Geoespacial">
              <RefItem href="https://geopandas.org/en/stable/docs.html"
                label="GeoPandas"
                desc="Biblioteca Python para análise de dados geoespaciais vetoriais. Utilizada para operações de sobreposição (sjoin, intersection) e transformação de CRS." />
              <RefItem href="https://shapely.readthedocs.io"
                label="Shapely"
                desc="Biblioteca Python para manipulação de geometrias vetoriais (interseção, diferença, simplificação). Base das operações de cálculo de área e comprimento atingido." />
              <RefItem href="https://maplibre.org/maplibre-gl-js/docs/"
                label="MapLibre GL JS"
                desc="Motor de renderização de mapas vetoriais no navegador. Utilizado para exibição das camadas GeoJSON e manchas de inundação no painel interativo." />
            </RefBlock>

          </div>
        </Section>

        {/* ── Rodapé ──────────────────────────────────────────────────────────── */}
        <footer className="mt-12 pt-6 border-t border-[#b3cdd8] text-center print:mt-4">
          <p className="text-[11px] text-[#3d7a94]">
            Painel desenvolvido por GPEA/FURG em parceria com o BID — Banco Interamericano de Desenvolvimento.
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
      className="text-[#055071] font-medium hover:underline underline-offset-4 transition-colors duration-150">
      {children}
    </a>
  );
}

function Math({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={display ? "block my-1" : "inline"} />;
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
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d7a94] mb-1.5">Fontes desta seção</p>
      <ul className="space-y-0.5">
        {links.map(([label, href]) => (
          <li key={label}>
            {href && href !== "#" ? (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-[#055071] hover:underline underline-offset-4 transition-colors duration-150">
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
          className="text-sm font-semibold text-[#055071] hover:underline underline-offset-4 transition-colors duration-150">
          {label} ↗
        </a>
      ) : (
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      )}
      <p className="text-[11px] text-[#3d7a94] mt-0.5 leading-relaxed">{desc}</p>
    </div>
  );
}
