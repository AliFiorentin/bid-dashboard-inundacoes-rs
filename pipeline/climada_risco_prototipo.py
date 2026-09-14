"""
climada_risco_prototipo.py -- PROTOTIPO: dano fisico estimado (destruicao patrimonial)
para Porto Alegre usando a metodologia do CLIMADA (profundidade x funcao de dano x valor
de reposicao), em vez da metodologia DaLA/fluxo do pipeline (07_danos.py).

Isso e' uma metrica DIFERENTE e COMPLEMENTAR ao 07_danos.py, nao um substituto:
- 07_danos.py (DaLA): perda de FLUXO -- producao/servico nao realizado durante a
  interrupcao (VAB, FUNDEB, producao SUS).
- Este script (CCDR/CLIMADA): destruicao de ESTOQUE -- fracao do valor de reposicao
  fisico do ativo (predio) destruida pela profundidade de agua.
Ver pipeline/docs/comparativo_ccdr_dala.md para a discussao completa dessa diferenca
metodologica -- a "Restricao confirmada" la registrada (falta de raster de profundidade)
e' o que este prototipo resolve, usando os rasters do CLIMADA (D:\\Projetos\\Climada)
vetorizados por vetorizar_climada.py.

SO PORTO ALEGRE: este calculo so e' possivel aqui porque so Porto Alegre tem raster de
profundidade (produzido pelo exercicio CLIMADA, ver HAZARD_DIR abaixo). As manchas dos
outros 3 municipios (config.MANCHAS -- Eldorado do Sul "ADA Eldorado.shp", Lajeado
"27m00cm.shp"/"30m00cm.shp", Rio Grande "CEN_*.shp") sao poligonos de extensao (atingido
sim/nao, sem profundidade por ponto -- verificado: nenhum atributo de profundidade/cota
nessas shapefiles, so um id de mascara raster->vetor), entao nao alimentam a formula
MDD(profundidade) usada aqui. Sem um raster de profundidade proprio para esses municipios
(precisaria de modelagem hidrologica -- HAND, HEC-RAS, ou nivel d'agua x MDT -- fora do
escopo deste pipeline), este prototipo nao pode ser estendido a eles.

CURVAS DE DANO (profundidade -> MDD, fracao do valor destruida):

  Empresas  (impf 201 "Company damage" do Entity .xlsx calibrado do exercicio CLIMADA --
             ver D:\\Projetos\\Climada\\...\\entity_files_adaptation\\
             Porto_Alegre_BRAZIL_Entity_Floods_Companies_calibrated_measures_v2.xlsx):
    curva: JRC South America "commerce" (Huizinga et al. 2017, Table 3-9) reescalada
    pelo proprio exercicio via ancora RP200 contra a perda observada em 2024 (fator
    0.360351 -- ver POA_CALIBRATION_FACTOR)

  Educacao (impf 301 "School damage", mesmo arquivo, categoria Schools):
    curva propria do pacote CLIMADA (nao e' a JRC crua nem reescalada pelo mesmo fator
    -- formato em metros desde a entrega original, sem alteracao pelo fix JRC)

  Saude: O CLIMADA NAO modela saude neste exercicio (so Schools/Residential/
    Companies) -- nao existe categoria "Health"/"Hospital" nem na base JRC (Huizinga
    et al. 2017 tem 6 categorias: Residential, Commercial, Industry, Transport,
    Infrastructure, Agriculture). Curva SINTETIZADA aqui a partir dos dados brutos do
    CLIMADA/JRC (nao e' saida real do CLIMADA nem do exercicio): media ponto-a-ponto
    das curvas cruas JRC South America "commerce" (Table 3-9) e "industry" (Table 3-13)
    -- premissa de que uma unidade de saude tem tanto carater institucional/comercial
    (predio) quanto sensibilidade a equipamento fixo tipica de industria (aparelhagem
    medica, geradores, farmacia) -- reescalada pelo MESMO fator empirico 0.360351 usado
    em Empresas (unica evidencia real disponivel de quanto a curva JRC crua superestima
    perda observada nesta cidade; nao ha ancora observada propria para saude).

  PAA (percentual de ativos afetados) = 1 sempre nos 3 -- padrao CLIMADA para FL
  quando so ha uma categoria de ativo por ponto.

VALOR DE REPOSICAO -- de onde vem (substituiu as constantes sem fonte do CLIMADA):

  O Entity original do CLIMADA usa 3 valores fixos (375.275 USD/empresa, 2.500.000
  USD/escola -- ver HISTORICO abaixo) sem calculo nem citacao externa. Substituidos
  aqui por uma estimativa de custo de reposicao baseada em referencias brasileiras
  REAIS, datadas e verificaveis:

  1. CUSTO DE CONSTRUCAO POR M2 (CUB -- Custo Unitario Basico, NBR 12.721/2006):
     Sinduscon-RS, "Precos e Custos da Construcao", CUB/RS de DEZEMBRO/2024
     (https://sinduscon-rs.com.br/wp-content/uploads/2025/01/PRECOS-E-CUSTOS-DA-CONSTRUCAO-JANEIRO-2025.pdf):
       - CSL 8-N (Comercial Salas e Lojas, padrao Normal): R$ 2.604,24/m2
       - PP 4-N  (Predio Popular, padrao Normal): R$ 2.995,52/m2
       - GI (Galpao Industrial): R$ 1.301,56/m2
     O CUB nao tem categoria "escolar" nem "saude" (so Residencial e Comercial) -- PP
     4-N (predio publico/institucional simples, sem elevador) e' a aproximacao mais
     proxima disponivel pra escola/unidade de saude; CSL 8-N pra empresas em geral
     (comercio/servicos, a maioria das empresas atingidas por CNAE). Estabelecimentos
     com CNAE industrial (05-39: extrativa, transformacao, eletricidade/gas,
     agua/esgoto -- ver CNAE_INDUSTRIA_FONTE/classificar_empresas_industria) usam GI em
     vez de CSL 8-N: ~5% dos estabelecimentos de Porto Alegre (4,5% dos vinculos), mas
     capital-intensivos e mal representados pela curva/custo comercial generico usados
     para o resto (ver item 4 e LIMITACOES).

  2. AREA CONSTRUIDA POR PESSOA (empresas e saude, ja que RAIS/CNES nao tem area do
     imovel): 9 m2/pessoa -- teto de "Indice de Ocupacao" do Manual de Padrao de
     Ocupacao e Dimensionamento de Ambientes em Imoveis (Projeto Racionaliza,
     Ministerio da Gestao, https://www.gov.br/gestao/.../manual-racionalia-v1-1-junho-2022.pdf),
     usado para imoveis da administracao publica federal -- na falta de um numero
     especifico para comercio/saude privados, e' a referencia brasileira mais proxima
     e publicamente documentada.
     value_i = 9 m2/pessoa x porte_i x CUB_comercial_ou_institucional

  3. AREA VIA NUMERO DE SALAS (educacao): RAIS/CNES nao tem area do imovel, mas
     tambem nao tem contagem de professores/funcionarios -- entao nem "area por
     pessoa" (como em Empresas/Saude) nem "area por aluno" direto sao boas proxies:
     ambas ignoram o espaco de apoio (administracao, cozinha, banheiros, circulacao)
     que a escola precisa alem das salas de aula. A saida usada aqui: estimar quantas
     SALAS DE AULA a matricula da escola implica (via lotacao maxima por turma,
     abaixo) e converter salas em area pela mesma proporcao do projeto padrao FNDE
     (853,20 m2 / 6 salas = 142,20 m2/sala -- ver AREA_POR_SALA_M2) -- assim o espaco
     de apoio (que escala com o TAMANHO da escola, nao com o aluno individual) fica
     embutido proporcionalmente, sem precisar saber quantos funcionarios ela tem.
     Numero de salas = matricula / (turnos x lotacao_maxima_por_turma). A maioria das
     escolas funciona em 2 turnos (manha e tarde): a MESMA sala atende 2 grupos de
     alunos diferentes ao longo do dia, entao a matricula anual (cabeca-contada) e'
     bem maior que a ocupacao simultanea que a sala precisa suportar. Ignorar os
     turnos dobraria o numero de salas estimado (ver TURNOS_PADRAO).
     Lotacao maxima por turma, por etapa (ver LOTACAO_* acima, fontes la citadas):
     Infantil 20, Fundamental 32,2 (media ponderada por ano), Medio/Profissional/EJA
     50 (Especial usa a lotacao de Fundamental por falta de norma especifica achada).
     VALOR_ESCOLA_PADRAO_BRL abaixo continua sendo o valor de UMA escola de referencia
     com exatamente 6 salas (360 matriculas equivalentes, 2 turnos, etapa generica) --
     usado so como numero de referencia na pagina, nao mais multiplicado direto pela
     matricula de cada escola (isso agora e' feito via AREA_POR_SALA_M2 x salas_i).
     O QUE OS 853,20 m2 COBREM: conferida a planilha orcamentaria item a item -- inclui
     salas de aula, bloco administrativo (tem ate quadro eletrico proprio, "QDL - BLOCO
     ADMINISTRATIVO"), cozinha, banheiros, circulacao e o patio coberto do projeto (e'
     a area construida/coberta TOTAL do projeto, nao so as 6 salas -- confirmado por
     duas linhas independentes da planilha que batem exatamente nos mesmos 853,20 m2:
     item 1.3 "Locacao de construcao de edificacao com gabarito de madeira", que marca
     o footprint total do predio ANTES da obra comecar, e item 17.1.1 "Limpeza geral",
     ao final da obra). O patio coberto nao aparece como linha propria porque nao tem
     paredes -- o custo dele se distribui nas linhas de estrutura/cobertura/piso, nao
     numa linha "patio" isolada; ainda assim faz parte do footprint contado nos 853,20
     m2. NAO inclui quadra coberta (estrutura separada, so presente na variante "com
     quadra coberta" do projeto, cuja pagina de capacidade foi usada acima -- essa
     variante deve ter area maior que esta) nem area externa aberta/descoberta (fora do
     footprint do predio). Escolas com quadra coberta de fato terao a area (e o valor
     de reposicao) subestimados aqui.
     Referencia de area de exemplos reais de licitacao, mesma ordem de grandeza:
     Passo Fundo/RS, 957 m2 para 6 salas,
     https://rduirapuru.com.br/licitacao-para-nova-escola-no-bairro-sao-luiz-gonzaga-e-aberta-em-passo-fundo/;
     Campina da Lagoa/PR, 1.323,11 m2 por R$ 2.956.146,27 em licitacao real de 2022,
     ou seja ~R$ 2.234/m2 antes de corrigir pela inflacao da construcao -- na mesma
     ordem de grandeza do CUB institucional usado aqui.
     VALOR_ESCOLA_PADRAO_BRL (valor de uma escola de referencia, 360 matriculas) =
     853,20 m2 x R$ 2.995,52/m2 x 1,50 (conteudo, ver item 4) = R$ 3.833.666.

  4. CONTEUDO/EQUIPAMENTO (fator multiplicativo sobre o valor de construcao acima):
     o CUB so cobre a CASCA CONSTRUTIVA (estrutura, alvenaria, acabamento basico) --
     exclui explicitamente equipamentos e instalacoes (Sinduscon-RS, mesma fonte do
     item 1). Sem esse ajuste o valor fica sistematicamente subestimado, porque o
     proprio relatorio JRC que fundamenta as curvas de dano do CLIMADA (Huizinga et
     al. 2017) trata "maximum damage" como ESTRUTURA + CONTEUDO somados (ver Table
     3-26 do relatorio, "Contents damage as % of building damage"): Residential 50%,
     Commercial 100%, Industrial 150% -- os proprios valores maximos usados pelo
     CLIMADA (incluindo os de Schools/Companies) ja embutem essa soma. Aplicado aqui
     como multiplicador sobre o valor de construcao (CUB x area):
       Empresas (comercio/servicos/agro/adm.publica): x (1 + 1,00) = x2,00 -- categoria
                 "Commercial" da Table 3-26
       Empresas industriais (CNAE 05-39): x (1 + 1,50) = x2,50 -- categoria
                 "Industrial" da Table 3-26 (mesmo criterio de classificacao do item 1)
       Saude:    x (1 + (1,00+1,50)/2) = x2,25  -- media Commercial+Industrial, mesma
                 logica de blend usado na curva MDD de Saude (aparelhagem/farmacia
                 tem carater mais industrial que uma loja comum)
       Educacao: x (1 + 0,50) = x1,50  -- categoria "Residential" da Table 3-26 (mais
                 proxima de mobiliario/material didatico do que de estoque comercial
                 -- escola nao tem mercadoria para vender, ao contrario de "Commercial")
     MULTIPLICADOR_* abaixo. Nao e' uma correspondencia exata do CLIMADA (ele aplica
     isso na propria curva MDD via o valor maximo de dano, nao como um fator separado
     sobre um valor CUB brasileiro) -- e' a aplicacao mais direta possivel da mesma
     logica documentada a uma base de custo diferente da usada por eles.

  Ainda uma estimativa (nao um cadastro de valor de mercado real por estabelecimento
  -- esse dado nao existe no RAIS/Censo/CNES), mas agora rastreavel a fontes publicas
  datadas (Sinduscon-RS, FNDE, Min. da Gestao) e a literatura que fundamenta o proprio
  CLIMADA (JRC/Huizinga et al. 2017), em vez de constantes de origem desconhecida.

REFINAMENTO -- valor de reposicao ponderado por porte:
  Cada ponto recebe um valor proporcional ao seu porte (nao mais um valor medio
  flat redistribuido), com o multiplicador de conteudo/equipamento (item 4 acima)
  aplicado sobre o valor de construcao:
    Empresas: value_i = 9 m2/pessoa x qtd_vinculos_i x CUB_comercial x 2,00
              (CUB_industrial x 2,50 em vez de CUB_comercial x 2,00 se a empresa e'
              industrial -- ver item 1/4 e classificar_empresas_industria)
    Saude:    value_i = 9 m2/pessoa x porte_i x CUB_institucional x 2,25
              (porte = leitos_total; qtd_profissionais se leitos = 0)
    Educacao: value_i = salas_i x 142,20 m2/sala x CUB_institucional x 1,50
              (salas_i = numero de salas de aula equivalentes, estimado a partir das
              matriculas por etapa e a lotacao maxima de cada uma -- ver item 3 acima)
  Todos com piso de porte = 1 (nenhum ponto fica com valor 0 -- pra Educacao, isso
  equivale a no minimo 1 sala de aula por escola).

LIMITACOES REMANESCENTES (ainda documentar antes de usar os numeros; auditoria de
2026-09-12 revisou cada uma a fundo e confirmou/atualizou os itens abaixo, incluindo
achados novos marcados como "NOVO"):
  1. 9 m2/pessoa e' um padrao de OCUPACAO DE ESCRITORIO (administracao publica
     federal) -- superestima a densidade de industrias/galpoes (mais m2/pessoa) e
     pode nao refletir comercio de rua/varejo pequeno. Sem dado de area real por
     estabelecimento (nao existe no RAIS), e' a melhor referencia publica disponivel.
     Vale tambem para o headcount em si como proxy de porte: valor ~ nº de vinculos
     assume relacao linear entre empregados e patrimonio, o que subestima
     estabelecimentos capital-intensivos com poucos funcionarios (posto de
     combustivel, galpao automatizado, silo) e pode superestimar os intensivos em mao
     de obra com pouco patrimonio fisico (call center, escritorio de servicos) --
     mitigado parcialmente para industria pelo item 8 (NOVO), mas nao eliminado.
  2. CUB nao tem categoria "escolar" nem "saude" -- PP 4-N (predio popular) e' a
     aproximacao mais proxima de predio publico/institucional simples, nao uma
     categoria feita para isso.
  3. A curva de saude e' sintetizada (media Commerce+Industry da JRC, sem ancora
     observada propria) -- tratar como ilustrativa, nao calibrada.
     CORRIGIDO (2026-09-12): leitos_total vinha de LEITHOSP (tabela CNES ST), um
     campo de 1 caractere ("tem leito? 0/1"), nao uma contagem -- so 31/7.022 pontos
     tinham leitos_total > 0, todos com o valor fixo 1, e nenhum hospital grande
     aparecia com leitos reais (ver 03_saude.py). Agora vem da tabela CNES LT (uma
     linha por CNES x tipo de leito, somada por QT_EXIST), com contagens reais e
     plausiveis (ex.: Santa Casa de Misericordia 1.162 leitos, Hospital de Clinicas
     911, Hospital Moinhos de Vento 485). 42/7.022 pontos de Porto Alegre tem
     leitos_total > 0 apos a correcao (exposicao total de Saude subiu de
     R$ 1,84 bi para R$ 2,28 bi).
  4. Profundidade amostrada do raster RP mais proximo (nearest neighbor, ~90m/pixel).
     Verificado empiricamente (auditoria 2026-09-12): 0 pontos de Empresas/Educacao e
     8/7.022 de Saude caem fora da extensao (bbox) do raster CLIMADA -- praticamente
     todos os pontos estao cobertos. A maioria dos valores "nodata" do raster (87-95%
     dos pontos, dependendo do setor) e' a propria codificacao de "seco" do raster
     (nao ha celula de profundidade onde o modelo hidrologico nao computou lamina
     d'agua), corretamente tratada aqui como profundidade=0 -- nao e' um buraco de
     dados.
  5. AREA_POR_SALA_M2 vem de UM projeto padrao (6 salas) aplicado a TODAS as escolas
     -- nao capta diferencas de padrao construtivo (ex.: escola tecnica vs. infantil).
     Ja inclui administracao, cozinha e patio coberto (ver item 3 de VALOR DE
     REPOSICAO), mas nao inclui quadra coberta (escolas com ginasio coberto tem
     area/valor subestimados) nem area externa aberta/descoberta.
  6. Os multiplicadores de conteudo/equipamento usam as categorias JRC mais proximas
     (Commercial/Industrial/Residential), nao uma medicao brasileira de conteudo por
     tipo de estabelecimento -- essa medicao nao existe publicamente.
  7. TURNOS_PADRAO=2 e' aplicado a TODAS as etapas -- escolas que fogem disso (periodo
     integral de turno unico, ou EJA/noturno de turno unico) terao numero de salas
     SUBESTIMADO (a formula divide por 2 turnos mesmo quando a escola real roda so 1,
     entao calcula MENOS salas do que ela realmente tem -- ex.: matricula que precisaria
     de 3 salas num turno unico aparece aqui como ~1,5). LOTACAO_FUNDAMENTAL e' uma media
     ponderada por ano
     (nao ha discriminacao de ano/serie no dado de origem) e LOTACAO_MEDIO tambem e'
     usada para Profissional e EJA por falta de norma especifica encontrada -- ambas
     sao aproximacoes, nao limites exatos por etapa real de cada escola. NOVO: alem
     disso, "salas necessarias = matricula / (turnos x lotacao_MAXIMA_legal)" assume
     que toda turma esta cheia no teto legal -- escolas reais costumam operar com
     turmas menores que esse teto (turma de 20 alunos numa escola cujo limite legal e'
     32, por exemplo), o que faz essa formula SUBESTIMAR sistematicamente o numero
     real de salas (e a area/valor) para essas escolas. Nao ha correcao possivel sem
     um dado direto de numero de turmas por escola (potencialmente disponivel nos
     microdados do Censo Escolar, nao extraido hoje pelo pipeline).
  8. NOVO -- estabelecimentos industriais (CNAE 05-39, ~5% dos estabelecimentos de
     Porto Alegre, 4,5% dos vinculos) usam custo GI e curva JRC industry proprios (ver
     VALOR DE REPOSICAO, itens 1/4, e classificar_empresas_industria) em vez do
     tratamento comercial generico -- mas o restante das "Empresas" (comercio,
     servicos, agropecuaria, administracao publica) continua todo sob a mesma curva
     JRC "commerce" e custo CSL 8-N, mesmo cobrindo setores heterogeneos (ex.:
     administracao publica, 0,2% dos estabelecimentos mas 23% dos vinculos, tratada
     como comercio por falta de uma curva/custo institucional proprios no calculo por
     ponto).
  9. NOVO -- todo "porte" (vinculos/leitos-ou-profissionais/salas) tem piso minimo de
     1 (nenhum ponto fica com valor 0). Para Empresas e Educacao isso afeta <0,1% dos
     pontos (dado quase sempre preenchido), mas para Saude afeta 236/7.022 pontos
     (3,4%, sem leitos NEM profissionais registrados) -- esses pontos recebem um valor
     de reposicao minimo mesmo sem nenhum dado de porte, inflando levemente a
     exposicao total do setor.
  10. NOVO -- as curvas de Empresas e Saude foram recalibradas multiplicando a curva
     JRC bruta inteira pelo fator empirico POA_CALIBRATION_FACTOR (0,360351,
     ancorado so no evento observado de maio/2024, um evento moderado). Isso comprime
     tambem o TETO da curva: nenhum ponto desses dois setores pode ultrapassar ~36% de
     dano fisico neste modelo, nao importa quao fundo alague (a curva de Educacao, que
     nao passou por essa recalibracao linear, chega a 100%). Em uma inundacao muito
     mais severa que a de 2024, isso pode subestimar o dano de pontos atingidos por
     laminas d'agua extremas em Empresas/Saude -- nao ha correcao possivel sem um dado
     de calibracao real do proprio exercicio CLIMADA para um evento mais severo.

HISTORICO -- valores originais do CLIMADA (substituidos, mantidos aqui so como
referencia de proveniencia): 375.275 USD/empresa e 2.500.000 USD/escola, rastreados
ate D:\\Projetos\\Climada\\climada-brazil-adaptation\\notebooks\\04_uncalibrated_risk.ipynb,
onde sao 3 constantes definidas direto no codigo sob o comentario "Set values of
individual assets" -- sem calculo nem citacao de fonte externa. Os NOMES dessas
variaveis no notebook (RESIDENCE_VALUE_USD=375275, COMPANY_VALUE_USD=90932) nao batem
com o setor de cada valor nos Entity files finais que o exercicio efetivamente usa
(onde Companies=375275, nao Residential) -- provavel renomeacao/troca em algum ponto
da evolucao do exercicio. O valor de escola tambem mudou de 500.000 USD (nesse
notebook) para 2.500.000 USD (nos arquivos calibrados finais), sem justificativa
documentada da revisao.

EAI (Expected/Average Annual Impact) -- risco anual esperado por setor, integrando o
dano fisico ao longo da curva de probabilidade de excedencia (1/RP), igual ao numero
"Risk 2025/2050" que o proprio CLIMADA destaca nos graficos waterfall do exercicio (ver
D:\\Projetos\\Climada\\climada-brazil-adaptation\\report\\figures\\*_waterfall_averted_risk.png).
Metodo (regra do trapezio sobre a curva frequencia-de-excedencia x perda, ja que so
temos 7 pontos discretos de RP, nao o conjunto completo de eventos do CLIMADA):
  1. Entre RP10 e RP500 (os 7 pontos calculados): trapezio entre cada par consecutivo,
     ponderado pela diferenca de frequencia de excedencia (1/RP).
  2. Cauda de eventos mais frequentes que RP10 (freq > 0.1): extrapolada linearmente ate
     frequencia=1 (evento anual "certo") com perda=0 -- premissa de que um evento mais
     frequente que RP10 nao modelado causa dano proximo de zero neste conjunto de dados.
  3. Cauda de eventos mais raros que RP500 (freq < 0.002): perda mantida constante no
     nivel de RP500 (plato conservador) em vez de extrapolar crescimento -- unica opcao
     razoavel sem dados de RP > 500.
Isso e' uma APROXIMACAO do aai_agg que o proprio CLIMADA calcula (ele usa o conjunto
completo de eventos probabilisticos do hazard, nao 7 pontos de RP interpolados) -- tratar
como ordem de grandeza, nao como o numero exato que uma rodada real do CLIMADA daria.

PROJECAO 2025->2050 (crescimento economico x mudanca climatica) -- replica a
decomposicao que o proprio relatorio CLIMADA destaca como resultado central (secao
"Risk decomposition", pag. dos graficos waterfall): dado o MESMO evento (mesma lamina
d'agua por RP -- nao ha raster de profundidade futuro, so o exercicio original tem
esse dado), o risco cresce ate 2050 por dois motores independentes:
  1. CRESCIMENTO ECONOMICO: o patrimonio exposto cresce (mais empresas, escolas maiores,
     mais leitos) -- mesma lamina d'agua, mesma curva MDD, mas aplicada sobre um valor de
     reposicao maior. Taxa usada: 2%/ano (mesma do exercicio CLIMADA original -- fonte:
     report_brazil_adaptation_exercise_pt.tex, secao de decomposicao de risco: "a mesma
     taxa de crescimento economico de 2% ao ano" para os 3 ativos), sobre 25 anos
     (2025->2050): fator = 1.02**25 ~ 1.641.
  2. MUDANCA CLIMATICA: eventos ficam mais frequentes (a lamina d'agua que hoje e' um
     evento raro passa a ocorrer com frequencia maior) -- fonte:
     D:\\Projetos\\Climada\\climada-brazil-adaptation\\data\\hazard\\
     porto_alegre_rp_mapping_2025_2050.csv (RP_REMAP_2050 abaixo), tabela oficial do
     exercicio que remapeia o RP historico para o RP futuro equivalente (ex.: profundidade
     de RP100 hoje ocorre com a frequencia de um RP50 em 2050 -- frequencia dobra).
  Como isolar as duas parcelas (mesma logica do exercicio original, que roda variantes
  de Exposures "2025" e "2050" separadas para nao misturar os efeitos):
    - risco_2025            = EAI com frequencia HISTORICA e exposicao ATUAL (2025)
    - risco_2050_crescimento = EAI com frequencia HISTORICA (constante) e exposicao
                               CRESCIDA (2050) -- isola SO o efeito de crescimento
                               economico, porque dano_por_ponto escala linear com
                               valor_por_ponto (mesma profundidade/MDD): basta multiplicar
                               risco_2025 pelo fator de crescimento, sem reamostrar raster.
    - risco_2050_total      = EAI com frequencia FUTURA (RP_REMAP_2050) e exposicao
                               CRESCIDA (2050) -- efeito combinado.
    - parcela_clima         = risco_2050_total - risco_2050_crescimento (o que sobra ao
                               isolar o crescimento -- atribuivel so a frequencia maior)
    - parcela_crescimento   = risco_2050_crescimento - risco_2025
  RESTRICAO: a tabela oficial de remapeamento so cobre RP10/20/50/100/200/500 (RP75 fica
  de fora -- nao existe RP75 no exercicio original, foi um RP extra que este prototipo
  adicionou por ja ter o raster correspondente). Para a comparacao 2025 vs. 2050 ficar
  "maca com maca", esta projecao usa so os 6 RPs com remapeamento oficial -- o EAI
  "atual" (secao anterior, `calcular_eai`) continua usando os 7 RPs disponiveis.
  Mesma ressalva do EAI atual: aproximacao por trapezio sobre pontos discretos de RP, nao
  o calculo probabilistico completo do CLIMADA.

Uso:  python pipeline/climada_risco_prototipo.py [--rp RP100]
      (--rp aceita: RP10, RP20, RP50, RP75, RP100, RP200, RP500; default roda todos)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DASH_DATA
from common import load_geojson, cnae_to_setor

HAZARD_DIR = Path(r"D:\Projetos\Climada\CLIMADA_starter_packs-main\starter_pack_brazil\data\hazard")
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"

# --- Custo de reposicao: referencias brasileiras reais (ver docstring, secao "VALOR DE
# REPOSICAO") -- substituem os valores CLIMADA sem fonte. ---
CUB_COMERCIAL_RS = 2604.24     # R$/m2 -- CSL 8-N, Sinduscon-RS, dez/2024
CUB_INSTITUCIONAL_RS = 2995.52  # R$/m2 -- PP 4-N, Sinduscon-RS, dez/2024
CUB_INDUSTRIAL_RS = 1301.56    # R$/m2 -- GI (Galpao Industrial), Sinduscon-RS, dez/2024
CUB_FONTE = "Sinduscon-RS, Precos e Custos da Construcao, CUB/RS dez/2024 (NBR 12.721/2006)"

AREA_M2_POR_PESSOA = 9.0  # m2/pessoa -- teto do Indice de Ocupacao, Manual de Padrao de
# Ocupacao e Dimensionamento de Ambientes em Imoveis (Projeto Racionaliza, Min. da Gestao)
AREA_M2_POR_PESSOA_FONTE = "Manual de Padrao de Ocupacao (Projeto Racionaliza, gov.br/gestao) -- teto adm. publica federal"

AREA_ESCOLA_PADRAO_M2 = 853.20  # m2 -- area construida do projeto padrao FNDE "Escola 6 Salas"
AREA_ESCOLA_PADRAO_FONTE = "Planilha orcamentaria oficial FNDE, projeto padrao Escola 6 Salas (item Limpeza geral)"

# AREA POR SALA (nao mais area/matricula flat): o projeto padrao FNDE tem 6 salas em
# 853,20 m2 -- a area de apoio (administracao, cozinha, banheiros, circulacao) escala
# com o NUMERO DE SALAS, nao com o aluno isolado (embora professores/funcionarios nao
# estejam no nosso dado, a area por sala ja embute proporcionalmente o espaco de apoio
# que a estrutura de 6 salas do FNDE precisa pra funcionar).
AREA_POR_SALA_M2 = AREA_ESCOLA_PADRAO_M2 / 6  # = 142,20 m2/sala
AREA_POR_SALA_FONTE = "Planilha orcamentaria FNDE, projeto padrao Escola 6 Salas: 853,20 m2 / 6 salas"

# Numero de salas necessario a partir da matricula: alunos_matriculados / (turnos x
# lotacao_maxima_por_turma). A maioria das escolas funciona em 2 turnos (manha/tarde) --
# a MESMA sala atende 2 grupos de alunos diferentes ao longo do dia, entao a matricula
# anual (cabeca-contada) e' bem maior que a ocupacao simultanea que a sala precisa
# suportar. Lotacao maxima por turma, por etapa:
#   Infantil: 20 aluno/turma -- CNE/CEB Resolucao no 1, de 17/10/2024, Art. 6o, inciso V
#     (20 criancas/educador de 4 a 5 anos -- a faixa etaria mais numerosa da pre-escola
#     obrigatoria; as faixas mais novas tem limites menores -- 5/8/12/18 -- mas
#     "matriculas_inf" no nosso dado nao discrimina idade)
#   Fundamental: 32,2 aluno/turma -- media ponderada pelos 9 anos dos limites da rede
#     estadual RS (25 no 1o ano, 30 do 2o ao 4o, 35 do 5o ao 9o; "espaco fisico 1,20
#     m2/aluno" no mesmo parametro): (1x25 + 3x30 + 5x35) / 9 = 32,2
#   Medio (tambem usado p/ Profissional e EJA, sem norma especifica achada): 50
#     aluno/turma -- Parecer CEEd/RS no 580/2000 (partes curriculares revogadas pela
#     Resolucao CEEd/RS no 340/2018, mas o parametro de lotacao/area por aluno segue
#     amplamente referenciado em comunicados oficiais da SEDUC/RS)
TURNOS_PADRAO = 2  # manha/tarde -- padrao nacional de educacao basica
LOTACAO_INFANTIL = 20
LOTACAO_FUNDAMENTAL = round((1 * 25 + 3 * 30 + 5 * 35) / 9, 1)  # 32.2
LOTACAO_MEDIO = 50
LOTACAO_FONTE = (
    "Infantil: CNE/CEB Resolucao 1/2024, Art. 6o-V (20 crianças de 4-5 anos/educador); "
    "Fundamental: media ponderada dos limites da rede estadual RS (25/30/35 conforme o ano); "
    "Medio/Profissional/EJA: Parecer CEEd/RS 580/2000 (50 alunos/turma)"
)

# --- Conteudo/equipamento: fator multiplicativo sobre o valor de construcao (ver
# docstring, item 4 de "VALOR DE REPOSICAO"). Fonte: Huizinga et al. 2017 (JRC105688),
# Table 3-26 "Contents damage as % of building damage" -- Residential 50%, Commercial
# 100%, Industrial 150%. O proprio CLIMADA ja soma isso nos valores maximos de dano que
# usa (estrutura + conteudo); sem esse fator o valor de reposicao aqui ficaria
# sistematicamente subestimado (o CUB cobre so a casca construtiva). ---
CONTEUDO_PCT_RESIDENCIAL = 0.50
CONTEUDO_PCT_COMERCIAL = 1.00
CONTEUDO_PCT_INDUSTRIAL = 1.50
CONTEUDO_FONTE = "Huizinga, de Moel & Szewczyk (2017), JRC105688, Table 3-26"

MULTIPLICADOR_EMPRESAS = 1 + CONTEUDO_PCT_COMERCIAL                                    # 2.00 -- categoria Commercial
MULTIPLICADOR_EMPRESAS_INDUSTRIA = 1 + CONTEUDO_PCT_INDUSTRIAL                          # 2.50 -- categoria Industrial (empresas industriais, ver CNAE_INDUSTRIA abaixo)
MULTIPLICADOR_SAUDE = 1 + (CONTEUDO_PCT_COMERCIAL + CONTEUDO_PCT_INDUSTRIAL) / 2        # 2.25 -- blend Commercial+Industrial (mesma logica da curva MDD)
MULTIPLICADOR_EDUCACAO = 1 + CONTEUDO_PCT_RESIDENCIAL                                   # 1.50 -- categoria Residential (mobiliario/didatico, sem estoque comercial)

VALOR_ESCOLA_PADRAO_BRL = round(AREA_ESCOLA_PADRAO_M2 * CUB_INSTITUCIONAL_RS * MULTIPLICADOR_EDUCACAO, 2)

# Fator empirico de recalibracao POA: rescaled_MDD / raw_JRC_MDD para Companies (impf
# 201), derivado comparando a curva crua JRC South America commerce (Table 3-9, ex:
# MDD(0.5m)=0.61) com a curva final do exercicio (MDD(0.5m)=0.219814) --
# 0.219814/0.61 = 0.360351. E' a UNICA evidencia real disponivel de quanto a amplitude
# crua da JRC superestima a perda observada nesta cidade (o proprio exercicio achou
# fatores parecidos por assunto: ~2.8x para Companies, ~20.7x para Residential) --
# reaproveitado para Saude por falta de ancora propria (ver docstring).
POA_CALIBRATION_FACTOR = 0.360351

RPS = ["RP10", "RP20", "RP50", "RP75", "RP100", "RP200", "RP500"]
RP_ANOS = {"RP10": 10, "RP20": 20, "RP50": 50, "RP75": 75, "RP100": 100, "RP200": 200, "RP500": 500}

# --- Projecao 2025->2050 (ver docstring, secao "PROJECAO 2025->2050") ---
CRESCIMENTO_ANUAL = 0.02  # 2%/ano -- mesma taxa do exercicio CLIMADA original (report, decomposicao de risco)
ANOS_PROJECAO = 25  # 2025 -> 2050
FATOR_CRESCIMENTO_2050 = (1 + CRESCIMENTO_ANUAL) ** ANOS_PROJECAO
CRESCIMENTO_FONTE = (
    "report_brazil_adaptation_exercise_pt.tex (exercicio CLIMADA original): "
    "\"mesma taxa de crescimento economico de 2% ao ano\" para os 3 ativos, 2025-2050"
)

# Remapeamento RP historico -> RP futuro (2050), do exercicio CLIMADA original:
# D:\Projetos\Climada\climada-brazil-adaptation\data\hazard\porto_alegre_rp_mapping_2025_2050.csv
# So cobre RP10/20/50/100/200/500 (sem RP75 -- ver docstring).
RP_REMAP_2050 = {
    "RP10":  {"freq_hist": 0.100, "freq_2050": 0.200, "rp_futuro_equivalente": 5},
    "RP20":  {"freq_hist": 0.050, "freq_2050": 0.100, "rp_futuro_equivalente": 10},
    "RP50":  {"freq_hist": 0.020, "freq_2050": 0.050, "rp_futuro_equivalente": 20},
    "RP100": {"freq_hist": 0.010, "freq_2050": 0.020, "rp_futuro_equivalente": 50},
    "RP200": {"freq_hist": 0.005, "freq_2050": 0.010, "rp_futuro_equivalente": 100},
    "RP500": {"freq_hist": 0.002, "freq_2050": 0.005, "rp_futuro_equivalente": 200},
}
RP_REMAP_FONTE = (
    "D:\\Projetos\\Climada\\climada-brazil-adaptation\\data\\hazard\\"
    "porto_alegre_rp_mapping_2025_2050.csv (tabela oficial do exercicio CLIMADA)"
)

# Curvas cruas JRC South America (Huizinga et al. 2017), antes de qualquer
# recalibracao -- Table 3-9 (commerce) e Table 3-13 (industry) do relatorio JRC105688.
_JRC_SA_COMMERCE = {"depth": [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6], "mdd": [0, 0.61, 0.84, 0.92, 0.99, 1.00, 1.00, 1.00, 1.00]}
_JRC_SA_INDUSTRY = {"depth": [0, 0.5, 1, 1.5, 2, 3, 4], "mdd": [0, 0.67, 0.89, 0.95, 1.00, 1.00, 1.00]}


def _blend_and_scale(curve_a, curve_b, factor):
    depths = sorted(set(curve_a["depth"]) | set(curve_b["depth"]))
    mdd_a = np.interp(depths, curve_a["depth"], curve_a["mdd"])
    mdd_b = np.interp(depths, curve_b["depth"], curve_b["mdd"])
    mdd = ((mdd_a + mdd_b) / 2) * factor
    return {"depth": depths, "mdd": mdd.tolist()}


def _scale(curve, factor):
    mdd = np.array(curve["mdd"]) * factor
    return {"depth": list(curve["depth"]), "mdd": mdd.tolist()}


# CNAE (2 primeiros digitos) das empresas classificadas como industriais para fins de
# custo/curva de dano proprios -- mesmo criterio de common.cnae_to_setor(): CNAE 05-39
# (industrias extrativas, de transformacao, eletricidade/gas, agua/esgoto). Cerca de 5%
# dos estabelecimentos de Porto Alegre (4,5% dos vinculos) -- o resto (comercio, servicos,
# agro, administracao publica) continua na curva/custo "empresas" (comercial) abaixo, por
# falta de categoria JRC/CUB propria para cada um desses (ver Limitacoes).
CNAE_INDUSTRIA_FONTE = "common.cnae_to_setor() -- CNAE 05-39 (industrias extrativas, transformacao, eletricidade/gas, agua/esgoto)"


# --- curvas profundidade(m) -> MDD (ver docstring para a fonte de cada uma) ---
CURVAS_MDD = {
    "empresas": {
        "depth": [0.00, 0.05, 0.50, 1.00, 1.50, 2.00, 3.00],
        "mdd":   [0.000, 0.000, 0.219814, 0.302695, 0.331523, 0.356747, 0.360351],
        "porte_campo": "qtd_vinculos",
        "fonte": "Curva JRC South America commerce, calibrada pelo CLIMADA com ancora no RP200",
        "reposicao_fonte": f"{AREA_M2_POR_PESSOA:.0f} m2/vinculo x R$ {CUB_COMERCIAL_RS:,.2f}/m2 ({CUB_FONTE})",
    },
    "empresas_industria": {
        **_scale(_JRC_SA_INDUSTRY, POA_CALIBRATION_FACTOR),
        "porte_campo": "qtd_vinculos",
        "fonte": "Curva JRC South America industry, reescalada pelo fator de Empresas (sem ancora observada propria)",
        "reposicao_fonte": f"{AREA_M2_POR_PESSOA:.0f} m2/vinculo x R$ {CUB_INDUSTRIAL_RS:,.2f}/m2 (GI, {CUB_FONTE})",
    },
    "educacao": {
        "depth": [0.00, 0.05, 0.50, 1.00, 1.50, 2.00, 3.00, 4.00],
        "mdd":   [0.000, 0.000, 0.491, 0.711, 0.842, 0.949, 0.984, 1.000],
        "porte_campo": "salas_equivalentes",
        "fonte": "Curva de dano para escolas calibrada pelo CLIMADA",
        "reposicao_fonte": f"{AREA_ESCOLA_PADRAO_M2:,.2f} m2 (projeto padrao FNDE, {AREA_ESCOLA_PADRAO_FONTE}) x R$ {CUB_INSTITUCIONAL_RS:,.2f}/m2 ({CUB_FONTE})",
    },
    "saude": {
        **_blend_and_scale(_JRC_SA_COMMERCE, _JRC_SA_INDUSTRY, POA_CALIBRATION_FACTOR),
        "porte_campo": "leitos_ou_profissionais",
        "fonte": "Sintetizada a partir das curvas JRC South America commerce e industry (Huizinga et al. 2017), reescalada pelo fator de Empresas",
        "reposicao_fonte": f"{AREA_M2_POR_PESSOA:.0f} m2/leito-ou-profissional x R$ {CUB_INSTITUCIONAL_RS:,.2f}/m2 ({CUB_FONTE})",
    },
}


def sample_depth(gj: dict, tif_path: Path) -> np.ndarray:
    """Amostra profundidade (m) do raster em cada ponto do GeoJSON (nearest neighbor)."""
    coords = [f["geometry"]["coordinates"] for f in gj["features"]]
    with rasterio.open(tif_path) as src:
        nodata = src.nodata
        vals = np.array([v[0] for v in src.sample(coords)], dtype=np.float64)
    if nodata is not None:
        vals[vals == nodata] = 0.0
    vals[~np.isfinite(vals)] = 0.0
    vals[vals < 0] = 0.0
    return vals


def porte_por_ponto(setor: str, gj: dict) -> np.ndarray:
    """Proxy de porte por ponto: usado para escalar o valor de reposicao de cada ponto
    (ver REFINAMENTO no docstring). Piso de 1 (nenhum ponto fica com porte 0)."""
    props_list = [f["properties"] for f in gj["features"]]

    if setor == "empresas":
        vals = [float(p.get("qtd_vinculos") or 0) for p in props_list]
    elif setor == "educacao":
        # Porte = numero de salas de aula equivalentes (nao mais matricula bruta) --
        # cada etapa tem sua propria lotacao maxima por turma e roda em TURNOS_PADRAO
        # turnos/dia (ver LOTACAO_* e docstring). Especial (qtd_matri_esp) usa a mesma
        # lotacao de Fundamental por falta de norma especifica achada -- simplificacao
        # documentada nas limitacoes.
        def _salas(p):
            inf = float(p.get("qtd_matri_inf") or 0) / (TURNOS_PADRAO * LOTACAO_INFANTIL)
            fund = (float(p.get("qtd_matri_fund") or 0) + float(p.get("qtd_matri_esp") or 0)) / (TURNOS_PADRAO * LOTACAO_FUNDAMENTAL)
            medio = (
                float(p.get("qtd_matri_med") or 0) + float(p.get("qtd_matri_prof") or 0) + float(p.get("qtd_matri_eja") or 0)
            ) / (TURNOS_PADRAO * LOTACAO_MEDIO)
            return inf + fund + medio
        vals = [_salas(p) for p in props_list]
    elif setor == "saude":
        vals = []
        for p in props_list:
            leitos = float(p.get("leitos_total") or 0)
            profs = float(p.get("qtd_profissionais") or 0)
            vals.append(leitos if leitos > 0 else profs)
    else:
        vals = [0.0] * len(props_list)

    return np.maximum(np.array(vals, dtype=np.float64), 1.0)


def classificar_empresas_industria(gj: dict) -> np.ndarray:
    """Mascara booleana (1 por ponto de 'empresas'): True para estabelecimentos
    industriais, que usam custo de construcao (GI) e curva de dano (JRC industry)
    proprios em vez do tratamento comercial generico (ver CNAE_INDUSTRIA_FONTE)."""
    return np.array([
        cnae_to_setor(f["properties"].get("cnae_classe")) == "industria"
        for f in gj["features"]
    ])


def valor_por_ponto_reposicao(setor: str, porte: np.ndarray, is_industria: np.ndarray | None = None) -> np.ndarray:
    """Valor de reposicao (R$) de cada ponto, a partir do porte e das referencias
    brasileiras reais (ver docstring, secao 'VALOR DE REPOSICAO'). Para 'empresas',
    is_industria seleciona custo/multiplicador industrial (GI) nos pontos industriais,
    mantendo o tratamento comercial (CSL 8-N) para o resto (ver CNAE_INDUSTRIA_FONTE)."""
    if setor == "empresas":
        if is_industria is not None:
            cub = np.where(is_industria, CUB_INDUSTRIAL_RS, CUB_COMERCIAL_RS)
            mult = np.where(is_industria, MULTIPLICADOR_EMPRESAS_INDUSTRIA, MULTIPLICADOR_EMPRESAS)
            return AREA_M2_POR_PESSOA * cub * mult * porte
        return AREA_M2_POR_PESSOA * CUB_COMERCIAL_RS * MULTIPLICADOR_EMPRESAS * porte
    if setor == "saude":
        return AREA_M2_POR_PESSOA * CUB_INSTITUCIONAL_RS * MULTIPLICADOR_SAUDE * porte
    if setor == "educacao":
        return AREA_POR_SALA_M2 * CUB_INSTITUCIONAL_RS * MULTIPLICADOR_EDUCACAO * porte
    raise ValueError(f"setor desconhecido: {setor}")


def calcular_dano_fisico(setor: str, gj: dict, tif_path: Path, valor_por_ponto: np.ndarray, is_industria: np.ndarray | None = None) -> tuple[dict, np.ndarray, np.ndarray]:
    """valor_por_ponto: valor de reposicao ja calculado por porte (ver
    valor_por_ponto_reposicao) -- independe do RP/raster, entao o chamador o calcula
    fora do loop de RPs em vez de refazer a cada chamada. Para 'empresas', is_industria
    seleciona a curva MDD industrial nos pontos industriais (ver classificar_empresas_industria).
    Retorna (resumo agregado, profundidade por ponto, dano fisico por ponto) -- os dois
    arrays servem para exportar o GeoJSON por ponto (mapa), sem reamostrar o raster."""
    depths = sample_depth(gj, tif_path)

    if setor == "empresas" and is_industria is not None and is_industria.any():
        curva_com = CURVAS_MDD["empresas"]
        curva_ind = CURVAS_MDD["empresas_industria"]
        mdd_com = np.interp(depths, curva_com["depth"], curva_com["mdd"], left=0.0, right=curva_com["mdd"][-1])
        mdd_ind = np.interp(depths, curva_ind["depth"], curva_ind["mdd"], left=0.0, right=curva_ind["mdd"][-1])
        mdd = np.where(is_industria, mdd_ind, mdd_com)
        fonte_curva = f"{curva_com['fonte']} ({int((~is_industria).sum())} pontos); {curva_ind['fonte']} ({int(is_industria.sum())} pontos industriais)"
        porte_campo = curva_com["porte_campo"]
    else:
        curva = CURVAS_MDD[setor]
        mdd = np.interp(depths, curva["depth"], curva["mdd"], left=0.0, right=curva["mdd"][-1])
        fonte_curva = curva["fonte"]
        porte_campo = curva["porte_campo"]

    dano_por_ponto = mdd * valor_por_ponto  # PAA = 1

    n_atingidos = int((depths > 0).sum())
    n_total = len(depths)
    exposicao_total_brl = float(valor_por_ponto.sum())
    dano_total_brl = float(dano_por_ponto.sum())

    resumo = {
        "setor": setor,
        "n_total": n_total,
        "n_atingidos_profundidade_gt_0": n_atingidos,
        "profundidade_media_atingidos_m": round(float(depths[depths > 0].mean()), 3) if n_atingidos else 0.0,
        "profundidade_max_m": round(float(depths.max()), 3),
        "valor_unitario_brl": round(exposicao_total_brl / n_total, 2) if n_total else 0.0,
        "exposicao_total_brl": round(exposicao_total_brl, 2),
        "dano_fisico_total_brl": round(dano_total_brl, 2),
        "dano_fisico_pct_exposicao": round(100 * dano_total_brl / exposicao_total_brl, 2) if exposicao_total_brl else 0.0,
        "fonte_curva": fonte_curva,
        "porte_campo": porte_campo,
    }
    return resumo, depths, dano_por_ponto


def gerar_geojson_pontos(setor: str, gj: dict, valor_por_ponto: np.ndarray, por_rp: dict) -> dict:
    """GeoJSON por ponto para o mapa (camada 'Dano Fisico (CLIMADA)'): mesma geometria do
    BASE do setor, com o dano fisico e a profundidade de cada RP calculado como
    propriedades (o front-end troca de RP so trocando de propriedade, sem recarregar
    arquivo). por_rp: {rp: (depths, dano_por_ponto)} na mesma ordem de features de gj.
    Arquivo separado do *_BASE.geojson (nao mutamos a saida do pipeline 06_geojson.py --
    ver docstring do modulo)."""
    features = []
    for i, feat in enumerate(gj["features"]):
        props = {"valor_reposicao_brl": round(float(valor_por_ponto[i]), 2)}
        for rp, (depths, dano_por_ponto) in por_rp.items():
            props[f"profundidade_m_{rp}"] = round(float(depths[i]), 3)
            props[f"dano_fisico_brl_{rp}"] = round(float(dano_por_ponto[i]), 2)
            props[f"dano_fisico_pct_{rp}"] = (
                round(100 * dano_por_ponto[i] / valor_por_ponto[i], 2) if valor_por_ponto[i] else 0.0
            )
        features.append({
            "type": "Feature",
            "geometry": feat["geometry"],
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features}


def _eai_trapezio(rps_presentes: list, freqs: list, losses_por_setor: dict) -> dict:
    """Nucleo do calculo de EAI (regra do trapezio + caudas) -- ver docstring do modulo.
    freqs: frequencia de excedencia (1/RP) de cada rp em rps_presentes, na mesma ordem,
    ja decrescente (RP mais frequente -> mais raro). losses_por_setor: {setor: [perda em
    cada rp, mesma ordem]}. Fatorado de calcular_eai() para ser reaproveitado pela
    projecao 2025->2050 (calcular_projecao_2050), que precisa rodar a mesma integral com
    frequencias historicas OU futuras sobre o mesmo conjunto de perdas."""
    eai = {}
    for setor, losses in losses_por_setor.items():
        total = (1.0 - freqs[0]) * (0.0 + losses[0]) / 2.0  # cauda: freq=1 (perda 0) ate o 1o RP
        for i in range(len(freqs) - 1):
            total += (freqs[i] - freqs[i + 1]) * (losses[i] + losses[i + 1]) / 2.0
        total += freqs[-1] * losses[-1]  # cauda: plato alem do RP mais raro calculado
        eai[setor] = round(total, 2)
    return eai


def calcular_eai(resultados_por_rp: dict, setores: list) -> dict | None:
    """Risco anual esperado (EAI) por setor -- ver docstring do modulo para o metodo
    (regra do trapezio sobre a curva frequencia-de-excedencia x perda, com caudas)."""
    rps_presentes = [rp for rp in RPS if rp in resultados_por_rp]
    if len(rps_presentes) < 2:
        return None

    freqs = [1.0 / RP_ANOS[rp] for rp in rps_presentes]  # ja em ordem decrescente (RP10 -> RP500)
    losses_por_setor = {
        setor: [resultados_por_rp[rp][setor]["dano_fisico_total_brl"] for rp in rps_presentes]
        for setor in setores
    }
    eai = _eai_trapezio(rps_presentes, freqs, losses_por_setor)
    eai["total"] = round(sum(eai[s] for s in setores), 2)
    eai["rps_usados"] = rps_presentes
    return eai


def calcular_projecao_2050(resultados_por_rp: dict, setores: list) -> dict | None:
    """Projecao de risco 2025->2050, decomposta em crescimento economico x mudanca
    climatica -- ver docstring do modulo, secao "PROJECAO 2025->2050". Reaproveita os
    danos ja calculados por RP (nao reamostra raster): o efeito de crescimento e' uma
    escala linear (dano_por_ponto = mdd x valor_por_ponto), e o efeito de clima e' so
    uma troca de frequencia associada a mesma lamina d'agua/perda (sem raster futuro)."""
    rps_presentes = [rp for rp in RP_REMAP_2050 if rp in resultados_por_rp]
    if len(rps_presentes) < 2:
        return None
    rps_presentes = sorted(rps_presentes, key=lambda rp: RP_ANOS[rp])  # RP10 -> RP500

    freqs_hist = [RP_REMAP_2050[rp]["freq_hist"] for rp in rps_presentes]
    freqs_2050 = [RP_REMAP_2050[rp]["freq_2050"] for rp in rps_presentes]

    losses_2025 = {
        setor: [resultados_por_rp[rp][setor]["dano_fisico_total_brl"] for rp in rps_presentes]
        for setor in setores
    }
    # Efeito de crescimento isolado: mesma frequencia (historica), perda escalada pelo
    # fator de crescimento (mesma profundidade/MDD, valor de reposicao maior em 2050).
    losses_2050_crescimento = {
        setor: [v * FATOR_CRESCIMENTO_2050 for v in losses]
        for setor, losses in losses_2025.items()
    }

    eai_2025 = _eai_trapezio(rps_presentes, freqs_hist, losses_2025)
    eai_2050_crescimento = _eai_trapezio(rps_presentes, freqs_hist, losses_2050_crescimento)
    eai_2050_total = _eai_trapezio(rps_presentes, freqs_2050, losses_2050_crescimento)

    por_setor = {}
    for setor in setores:
        risco_2025 = eai_2025[setor]
        risco_2050_crescimento = eai_2050_crescimento[setor]
        risco_2050_total = eai_2050_total[setor]
        parcela_crescimento = round(risco_2050_crescimento - risco_2025, 2)
        parcela_clima = round(risco_2050_total - risco_2050_crescimento, 2)
        aumento_total = round(risco_2050_total - risco_2025, 2)
        por_setor[setor] = {
            "risco_2025_brl": risco_2025,
            "risco_2050_brl": risco_2050_total,
            "aumento_total_brl": aumento_total,
            "parcela_crescimento_brl": parcela_crescimento,
            "parcela_clima_brl": parcela_clima,
            "pct_climatico": round(100 * parcela_clima / aumento_total, 1) if aumento_total else 0.0,
        }

    total_2025 = round(sum(por_setor[s]["risco_2025_brl"] for s in setores), 2)
    total_2050 = round(sum(por_setor[s]["risco_2050_brl"] for s in setores), 2)
    total_crescimento = round(sum(por_setor[s]["parcela_crescimento_brl"] for s in setores), 2)
    total_clima = round(sum(por_setor[s]["parcela_clima_brl"] for s in setores), 2)
    total_aumento = round(total_2050 - total_2025, 2)

    return {
        "premissas": {
            "crescimento_anual": CRESCIMENTO_ANUAL,
            "anos_projecao": ANOS_PROJECAO,
            "fator_crescimento": round(FATOR_CRESCIMENTO_2050, 4),
            "crescimento_fonte": CRESCIMENTO_FONTE,
            "rp_remapeamento_fonte": RP_REMAP_FONTE,
            "rp_remapeamento": RP_REMAP_2050,
            "rps_usados": rps_presentes,
        },
        "por_setor": por_setor,
        "total": {
            "risco_2025_brl": total_2025,
            "risco_2050_brl": total_2050,
            "aumento_total_brl": total_aumento,
            "parcela_crescimento_brl": total_crescimento,
            "parcela_clima_brl": total_clima,
            "pct_climatico": round(100 * total_clima / total_aumento, 1) if total_aumento else 0.0,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Prototipo de dano fisico (CLIMADA) para Porto Alegre")
    parser.add_argument("--rp", choices=RPS, default=None, help="Rodar so um periodo de retorno (default: todos)")
    args = parser.parse_args()

    rps = [args.rp] if args.rp else RPS

    setores_gj = {
        "empresas": load_geojson(DASH_DATA / "porto_alegre" / "empresas_BASE.geojson"),
        "educacao": load_geojson(DASH_DATA / "porto_alegre" / "educacao_BASE.geojson"),
        "saude":    load_geojson(DASH_DATA / "porto_alegre" / "saude_BASE.geojson"),
    }
    for setor, gj in setores_gj.items():
        if not gj:
            print(f"ERRO: BASE nao encontrada para {setor} -- rode pipeline/06_geojson.py --mun \"Porto Alegre\" antes")
            sys.exit(1)

    print("=" * 78)
    print("  PROTOTIPO -- Dano fisico estimado (CLIMADA) -- Porto Alegre")
    print(f"  Custo construcao: CSL 8-N R$ {CUB_COMERCIAL_RS:,.2f}/m2 · PP 4-N R$ {CUB_INSTITUCIONAL_RS:,.2f}/m2 ({CUB_FONTE})")
    print("=" * 78)

    # Valor de reposicao por ponto independe do RP -- calculado uma unica vez por
    # setor aqui, fora do loop de RPs abaixo.
    is_industria_empresas = classificar_empresas_industria(setores_gj["empresas"])
    print(f"  Empresas industriais (CNAE 05-39, {CNAE_INDUSTRIA_FONTE.split(' -- ')[1]}): "
          f"{int(is_industria_empresas.sum())}/{len(is_industria_empresas)}")

    valores_por_ponto = {}
    for setor, gj in setores_gj.items():
        porte = porte_por_ponto(setor, gj)
        if setor == "empresas":
            valores_por_ponto[setor] = valor_por_ponto_reposicao(setor, porte, is_industria_empresas)
        else:
            valores_por_ponto[setor] = valor_por_ponto_reposicao(setor, porte)

    resultados = {}
    pontos_por_rp = {setor: {} for setor in setores_gj}  # {setor: {rp: (depths, dano_por_ponto)}} -- p/ GeoJSON do mapa
    for rp in rps:
        tif_path = HAZARD_DIR / f"PortoAlegre_{rp}_depth.tif"
        if not tif_path.exists():
            print(f"  AVISO: raster nao encontrado para {rp}: {tif_path}")
            continue

        print(f"\n  {rp}:")
        resultados[rp] = {}
        total_rp = 0.0
        for setor, gj in setores_gj.items():
            is_ind = is_industria_empresas if setor == "empresas" else None
            r, depths, dano_por_ponto = calcular_dano_fisico(setor, gj, tif_path, valores_por_ponto[setor], is_ind)
            resultados[rp][setor] = r
            pontos_por_rp[setor][rp] = (depths, dano_por_ponto)
            total_rp += r["dano_fisico_total_brl"]
            print(
                f"    {setor:10s}: {r['n_atingidos_profundidade_gt_0']:>5}/{r['n_total']:<5} atingidos"
                f" (prof. media {r['profundidade_media_atingidos_m']:.2f}m, max {r['profundidade_max_m']:.2f}m)"
                f" | exposicao R$ {r['exposicao_total_brl']:,.0f} | dano fisico R$ {r['dano_fisico_total_brl']:,.0f}"
                f" ({r['dano_fisico_pct_exposicao']:.1f}% da exposicao)"
            )
        print(f"    {'TOTAL':10s}: R$ {total_rp:,.0f}")

    eai = calcular_eai(resultados, list(setores_gj.keys()))
    if eai:
        print(f"\n  Risco anual esperado (EAI, aproximado por {len(eai['rps_usados'])} RPs):")
        for setor in setores_gj:
            print(f"    {setor:10s}: R$ {eai[setor]:,.0f} / ano")
        print(f"    {'TOTAL':10s}: R$ {eai['total']:,.0f} / ano")

    projecao_2050 = calcular_projecao_2050(resultados, list(setores_gj.keys()))
    if projecao_2050:
        t = projecao_2050["total"]
        print(f"\n  Projecao 2025->2050 (crescimento {CRESCIMENTO_ANUAL:.0%}/ano + clima, {len(projecao_2050['premissas']['rps_usados'])} RPs):")
        print(f"    Risco 2025: R$ {t['risco_2025_brl']:,.0f}/ano -> Risco 2050: R$ {t['risco_2050_brl']:,.0f}/ano")
        print(f"    Aumento: R$ {t['aumento_total_brl']:,.0f}/ano "
              f"(crescimento R$ {t['parcela_crescimento_brl']:,.0f} + clima R$ {t['parcela_clima_brl']:,.0f}, "
              f"{t['pct_climatico']:.0f}% climatico)")

    # GeoJSON por ponto (mapa) -- so escreve setores/RPs efetivamente calculados nesta rodada.
    MAPA_DIR = DASH_DATA / "porto_alegre"
    for setor, por_rp in pontos_por_rp.items():
        if not por_rp:
            continue
        gj_pontos = gerar_geojson_pontos(setor, setores_gj[setor], valores_por_ponto[setor], por_rp)
        out_geojson = MAPA_DIR / f"{setor}_dano_fisico_climada.geojson"
        with open(out_geojson, "w", encoding="utf-8") as f:
            json.dump(gj_pontos, f, ensure_ascii=False)
        print(f"  Salvo: {out_geojson} ({len(gj_pontos['features'])} pontos, {len(por_rp)} RPs)")

    out_path = OUT_DIR / "climada_dano_fisico_prototipo.json"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "premissas": {
                "poa_calibration_factor": POA_CALIBRATION_FACTOR,
                "cub_comercial_rs": CUB_COMERCIAL_RS,
                "cub_institucional_rs": CUB_INSTITUCIONAL_RS,
                "cub_industrial_rs": CUB_INDUSTRIAL_RS,
                "cub_fonte": CUB_FONTE,
                "cnae_industria_fonte": CNAE_INDUSTRIA_FONTE,
                "n_empresas_industria": int(is_industria_empresas.sum()),
                "n_empresas_total": int(len(is_industria_empresas)),
                "area_m2_por_pessoa": AREA_M2_POR_PESSOA,
                "area_m2_por_pessoa_fonte": AREA_M2_POR_PESSOA_FONTE,
                "area_escola_padrao_m2": AREA_ESCOLA_PADRAO_M2,
                "area_escola_padrao_fonte": AREA_ESCOLA_PADRAO_FONTE,
                "area_por_sala_m2": round(AREA_POR_SALA_M2, 4),
                "area_por_sala_fonte": AREA_POR_SALA_FONTE,
                "turnos_padrao": TURNOS_PADRAO,
                "lotacao_infantil": LOTACAO_INFANTIL,
                "lotacao_fundamental": LOTACAO_FUNDAMENTAL,
                "lotacao_medio": LOTACAO_MEDIO,
                "lotacao_fonte": LOTACAO_FONTE,
                "valor_escola_padrao_brl": VALOR_ESCOLA_PADRAO_BRL,
                "conteudo_fonte": CONTEUDO_FONTE,
                "multiplicador_empresas": MULTIPLICADOR_EMPRESAS,
                "multiplicador_empresas_industria": MULTIPLICADOR_EMPRESAS_INDUSTRIA,
                "multiplicador_saude": MULTIPLICADOR_SAUDE,
                "multiplicador_educacao": MULTIPLICADOR_EDUCACAO,
                "curvas": CURVAS_MDD,
            },
            "resultados_por_rp": resultados,
            "eai_anual_esperado": eai,
            "projecao_2050": projecao_2050,
        }, f, ensure_ascii=False, indent=2)
    print(f"\n  Salvo: {out_path}")


if __name__ == "__main__":
    main()
