import Image from "next/image"
import { Popup } from "react-map-gl/maplibre"
import { COLORS } from "@/lib/constants"
import { MapPopup } from "@/components/MapPopup"
import type { DashboardState } from "@/hooks/useDashboard"

const PASSO_ROTACAO = 15
const PASSO_INCLINACAO = 10
const PITCH_MAXIMO = 85

const CONTROLES_CAMERA = [
  { rotulo: "↺", titulo: "Girar à esquerda", db: -PASSO_ROTACAO, dp: 0 },
  { rotulo: "↻", titulo: "Girar à direita", db: PASSO_ROTACAO, dp: 0 },
  { rotulo: "▲", titulo: "Aumentar inclinação", db: 0, dp: PASSO_INCLINACAO },
  { rotulo: "▼", titulo: "Reduzir inclinação", db: 0, dp: -PASSO_INCLINACAO },
]

/** Logo GPEa, botões 3D/rotação/inclinação e popup de feição (sobrepostos ao mapa). */
export function MapControls({ dash }: { dash: DashboardState }) {
  const { mapRef, is3D, setIs3D, popupInfo, setPopupInfo, rpDanoFisico } = dash

  // O NavigationControl já gira o mapa quando se arrasta a bússola, mas isso
  // não é descobrível e não dá controle nenhum de inclinação — daí os botões.
  const ajustarCamera = (deltaBearing: number, deltaPitch: number) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    map.easeTo({
      bearing: map.getBearing() + deltaBearing,
      pitch: Math.min(PITCH_MAXIMO, Math.max(0, map.getPitch() + deltaPitch)),
      duration: 300,
    })
  }

  return (
    <>
      {/* Logo GPEa no vão acima da linha "3D ↺ ↻ ▲ ▼" (rotação/inclinação)
          e ao lado do NavigationControl (zoom +/-/bússola) -- não empilhada
          por cima de tudo. A linha abaixo nasce no mesmo bottom-10px padrão
          do NavigationControl. O topo desta caixa (bottom-45+h-13(52)=97px)
          é calçado para bater com o topo do NavigationControl (10px de
          margem padrão + 3 botões de 29px = 97px).
          De propósito SEM `fill`/`object-contain`: com `fill`, o <img>
          precisa herdar corretamente position:relative+padding do pai pra
          se encaixar, e qualquer contexto de stacking/transform intermediário
          (o mapa tem varios) pode quebrar isso silenciosamente. Aqui a
          largura/altura do PNG (1024x339, razão ~3.02) são fixas e a caixa
          centraliza via flex -- não tem como "cortar": o navegador so'
          desenha a imagem inteira, do tamanho exato pedido. */}
      <div className="pointer-events-none absolute right-[48px] bottom-[45px] z-10 print:hidden movel:hidden">
        <div
          className="flex h-[52px] w-[156px] items-center justify-center rounded-md bg-white/90 shadow-sm"
          style={{ border: "2px solid rgba(0,0,0,0.1)" }}
        >
          <Image
            src="/GPEA.webp"
            alt="GPEa"
            width={124}
            height={41}
            style={{
              width: "auto",
              height: "auto",
              maxWidth: "132px",
              maxHeight: "40px",
            }}
          />
        </div>
      </div>

      {/* Controles de câmera em linha, à ESQUERDA do NavigationControl: ficam
          todos no mesmo canto sem depender da altura dele (empilhar por cima
          colidia com os botões de zoom).
          Todos aparecem sempre, inclusive em 2D: o toggle 3D precisa estar lá
          para dar como voltar, e girar/inclinar funciona igual sem o terreno
          ligado — esconder os botões só tirava controle sem motivo. */}
      <div className="absolute right-2 desk:right-[48px] bottom-[10px] z-10 flex flex-row gap-1 print:hidden">
        <button
          onClick={() => setIs3D((v) => !v)}
          className="flex h-11 w-11 desk:h-7 desk:w-7 items-center justify-center rounded-md text-xs desk:text-[10px] font-black transition-colors duration-150"
          style={{
            backgroundColor: is3D ? COLORS.cenario : "#ffffff",
            color: is3D ? "#ffffff" : "#333333",
            border: "2px solid rgba(0,0,0,0.1)",
          }}
          title={
            is3D
              ? "Voltar para mapa 2D"
              : "Ver mancha em 3D (terreno + elevação)"
          }
        >
          3D
        </button>

        {CONTROLES_CAMERA.map((c) => (
          <button
            key={c.rotulo}
            onClick={() => ajustarCamera(c.db, c.dp)}
            title={c.titulo}
            className="flex h-11 w-11 desk:h-7 desk:w-7 items-center justify-center rounded-md text-sm desk:text-[11px] font-black text-[#333333] transition-colors duration-150 hover:bg-slate-100"
            style={{
              backgroundColor: "#ffffff",
              border: "2px solid rgba(0,0,0,0.1)",
            }}
          >
            {c.rotulo}
          </button>
        ))}
      </div>

      {popupInfo && (
        <Popup
          longitude={popupInfo.lngLat[0]}
          latitude={popupInfo.lngLat[1]}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeButton={true}
          closeOnClick={false}
          className="z-50 !p-0"
          maxWidth="250px"
        >
          <MapPopup
            source={popupInfo.source}
            properties={popupInfo.properties}
            rp={rpDanoFisico}
          />
        </Popup>
      )}
    </>
  )
}
