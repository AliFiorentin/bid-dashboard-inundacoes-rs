import { Source, Layer } from "react-map-gl/maplibre"
import { COLORS, MANCHA_DURACAO_CENARIO } from "@/lib/constants"
import type { DashboardState } from "@/hooks/useDashboard"

/** Manchas de inundação (Visão Geral / cenário), textura de duração, água por cota e limite municipal. */
export function ManchaCotaLayers({ dash }: { dash: DashboardState }) {
  const {
    renderMunicipio,
    cenario,
    showMancha,
    manchaCenario,
    manchaRS,
    limitePA,
    isTransitioning,
    isVisaoGeral,
    is3D,
    manchaDuracaoClimada,
    cotasAtivo,
    cotaRaster,
  } = dash

  // Cenário "Climada Evento 2024" (evento real de maio/2024): a mancha ganha
  // uma textura de duração de alagamento (dias) por cima do polígono de
  // extensão -- único dado por pixel que existe para esse evento (ver
  // lib/constants.ts, MANCHA_DURACAO_CENARIO e pipeline/gerar_mancha_duracao_climada.py).
  const mostraDuracaoClimada =
    renderMunicipio === "Porto Alegre" &&
    cenario === MANCHA_DURACAO_CENARIO &&
    !isTransitioning
  const duracaoImgUrl = manchaDuracaoClimada
    ? "/dados_convertidos/porto_alegre/mancha_duracao_climada_evento_2024.webp"
    : null

  return (
    <>
      {/* 1. Manchas — primeiro (base da pilha) */}
      {isVisaoGeral && manchaRS && showMancha && (
        <Source id="mancha-rs" type="geojson" data={manchaRS}>
          {/* "fill" (2D) acompanha o relevo do terreno 3D automaticamente;
              "fill-extrusion" sempre teria um topo plano numa altura fixa,
              ignorando as variações do terreno por baixo — por isso não
              extrudimos a mancha, só a deixamos mais opaca em 3D. */}
          <Layer
            id="mancha-rs-fill"
            beforeId="anchor-mancha"
            type="fill"
            paint={{
              "fill-color": COLORS.cenario,
              "fill-opacity": is3D ? 0.32 : 0.22,
            }}
          />
          <Layer
            id="mancha-rs-line"
            beforeId="anchor-mancha"
            type="line"
            paint={{
              "line-color": COLORS.cenario,
              "line-width": 1.5,
              "line-opacity": 0.7,
            }}
          />
        </Source>
      )}

      {manchaCenario && !isVisaoGeral && showMancha && (
        <Source id="cenario" type="geojson" data={manchaCenario}>
          {/* Em 3D a extrusão já cobre todo o footprint da mancha, então este
              fill desenharia a mesma área uma segunda vez, escurecendo em
              dobro. Fica bem fraco só para segurar o contorno. */}
          <Layer
            id="cenario-fill"
            beforeId="anchor-mancha"
            type="fill"
            paint={{
              // Com a textura de duração por cima (mostraDuracaoClimada), o
              // preenchimento fica quase invisível -- só a linha de contorno
              // abaixo segue marcando a extensão da mancha com nitidez.
              "fill-color": COLORS.cenario,
              "fill-opacity": mostraDuracaoClimada ? 0.05 : is3D ? 0.45 : 0.25,
            }}
          />
          <Layer
            id="cenario-line"
            beforeId="anchor-mancha"
            type="line"
            paint={{
              "line-color": COLORS.cenario,
              "line-width": 2,
              "line-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {/* Textura de duração de alagamento (dias) -- só "Climada Evento
          2024" em Porto Alegre, por cima do contorno acima. */}
      {mostraDuracaoClimada &&
        showMancha &&
        duracaoImgUrl &&
        manchaDuracaoClimada && (
          <Source
            id="duracao-climada-img"
            type="image"
            url={duracaoImgUrl}
            coordinates={manchaDuracaoClimada.coordinates}
          >
            <Layer
              id="duracao-climada-raster"
              beforeId="anchor-mancha"
              type="raster"
              paint={{ "raster-opacity": 0.85, "raster-resampling": "linear" }}
            />
          </Source>
        )}

      {/* Cenário "Todas as cotas": água avançando conforme o slider (hooks/useCotaRaster). */}
      {cotasAtivo &&
        !isTransitioning &&
        showMancha &&
        cotaRaster.url &&
        cotaRaster.meta && (
          <Source
            id="cota-img"
            type="image"
            url={cotaRaster.url}
            coordinates={cotaRaster.meta.coordinates}
          >
            <Layer
              id="cota-raster"
              beforeId="anchor-infra"
              type="raster"
              paint={{ "raster-opacity": 0.82, "raster-fade-duration": 0 }}
            />
          </Source>
        )}

      {/* 2. Limite, Agricultura, Infraestrutura */}
      {limitePA && (
        <Source id="limite-poa" type="geojson" data={limitePA}>
          <Layer
            id="limite-poa-line"
            type="line"
            paint={{
              "line-color": "#055071",
              "line-width": 2,
              "line-opacity": 0.7,
              "line-dasharray": [4, 3],
            }}
          />
        </Source>
      )}
    </>
  )
}
