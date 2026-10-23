"use client"
import React, { useEffect, useRef } from "react"
import Map, { NavigationControl } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { useCotaRaster, COR_FRENTE, COR_ALAGADO } from "@/hooks/useCotaRaster"
import { CotaControle } from "@/components/CotaControle"
import { CotaCanvasLayer } from "@/components/CotaCanvasLayer"

// Mapa com slider de cota do rio na página de Danos por cota. A animação começa sozinha
// quando o mapa entra na tela (loop); pausar ou arrastar o slider assume o controle.

export function CotaMapa({ slug, cotaInicial }: { slug: string; cotaInicial?: string }) {
  const raster = useCotaRaster(slug, { cotaInicial })
  const { meta, erro, cota, setTocando } = raster
  const raiz = useRef<HTMLDivElement>(null)
  const iniciouAuto = useRef(false)

  useEffect(() => { iniciouAuto.current = false }, [slug])

  // Checagem periódica de visibilidade (em vez de IntersectionObserver, que alguns
  // ambientes embutidos não entregam).
  useEffect(() => {
    const el = raiz.current
    if (!meta || !el || iniciouAuto.current) return
    const id = setInterval(() => {
      const r = el.getBoundingClientRect()
      const visivel = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)
      if (visivel >= r.height * 0.5 && !iniciouAuto.current) {
        iniciouAuto.current = true
        setTocando(true)
        clearInterval(id)
      }
    }, 400)
    return () => clearInterval(id)
  }, [meta, setTocando])

  if (erro) return <p className="text-sm text-slate-500">Mapa por cota indisponível para este município.</p>
  if (!meta || cota === null) return <div className="h-[520px] rounded-xl bg-slate-100 animate-pulse" />

  const [w, s, e, n] = meta.bounds
  return (
    <div ref={raiz} className="rounded-xl border border-[#b3cdd8] overflow-hidden bg-white">
      <div className="relative h-[520px]">
        <Map
          key={slug}
          initialViewState={{ bounds: [w, s, e, n], fitBoundsOptions: { padding: 24 } }}
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          attributionControl={{ compact: true }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <CotaCanvasLayer raster={raster} />
        </Map>
        <div className="absolute left-3 bottom-3 bg-white/95 rounded-lg shadow px-3 py-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: `rgb(${COR_ALAGADO})` }} />Área alagada</div>
          <div className="flex items-center gap-2 mt-1"><span className="h-3 w-3 rounded-sm" style={{ background: `rgb(${COR_FRENTE})` }} />Frente de avanço</div>
        </div>
      </div>
      <CotaControle raster={raster} className="px-4 py-3 border-t border-[#b3cdd8]" />
    </div>
  )
}
