"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// Raster de "cota de alagamento" (pipeline/climada_cota_mapa.py) recolorido no navegador a
// cada cota. Cada pixel guarda o índice da primeira cota em que alaga; para uma cota c o pixel
// aparece com fade ao longo de um passo (transição gradual entre as manchas). Cor única: área
// alagada em azul-escuro e frente de avanço (pixel ainda em fade) em azul-claro.
// O estado (cota, play/pause, url da imagem) é compartilhado entre o mapa, o slider e o painel.

export interface CotaMeta {
  cotas: number[]
  bounds: [number, number, number, number]
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
  width: number
  height: number
  /** Habitantes (WorldPop) sob água, acumulados por cota (pipeline/climada_cota_mapa.py). */
  pop_por_cota?: number[]
  pop_grade?: number
}

export const COR_FRENTE: [number, number, number] = [96, 200, 240]
export const COR_ALAGADO: [number, number, number] = [16, 84, 168]
const DURACAO_MS = 14000
const PAUSA_FIM_MS = 1800

/** População atingida na cota atual (acumulada até a última cota-raster já atingida). */
export function popAtingidaNaCota(meta: CotaMeta | null, cota: number | null): number | null {
  if (!meta?.pop_por_cota || cota === null) return null
  const k = meta.cotas.filter((c) => c <= cota + 1e-6).length
  return k === 0 ? 0 : meta.pop_por_cota[k - 1] ?? 0
}

const passoDe = (m: CotaMeta) => (m.cotas.length > 1 ? m.cotas[1] - m.cotas[0] : 1)

export interface CotaRaster {
  meta: CotaMeta | null
  erro: boolean
  cota: number | null
  setCota: (c: number) => void
  tocando: boolean
  setTocando: (t: boolean | ((t: boolean) => boolean)) => void
  url: string | null
  /** Índice (1..N) da primeira cota em que o ponto alaga; 0 = nunca alaga / fora da grade. */
  amostrar: (lon: number, lat: number) => number
  minimo: number
  maximo: number
  passo: number
}

/** slug null = inativo (nada é baixado). autoplay = começa a tocar assim que carrega. */
export function useCotaRaster(slug: string | null, opts: { cotaInicial?: string; autoplay?: boolean } = {}): CotaRaster {
  const { cotaInicial, autoplay = false } = opts
  const [meta, setMeta] = useState<CotaMeta | null>(null)
  const [erro, setErro] = useState(false)
  const [cota, setCotaState] = useState<number | null>(null)
  const [tocando, setTocando] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const idx = useRef<Uint8Array | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const ultima = useRef<number | null>(null)
  const pendente = useRef(false)
  const urlAtual = useRef<string | null>(null)

  const passo = meta ? passoDe(meta) : 1
  const minimo = meta ? meta.cotas[0] - passo : 0
  const maximo = meta ? meta.cotas[meta.cotas.length - 1] : 0

  useEffect(() => {
    // Reiniciar o estado quando o slug muda é intencional (o raster é outro).
    /* eslint-disable react-hooks/set-state-in-effect */
    setMeta(null); setErro(false); setUrl(null); setCotaState(null); setTocando(false)
    idx.current = null; canvas.current = null; ultima.current = null
    /* eslint-enable react-hooks/set-state-in-effect */
    if (urlAtual.current) { URL.revokeObjectURL(urlAtual.current); urlAtual.current = null }
    if (!slug) return
    let vivo = true
    ;(async () => {
      try {
        const base = `/dados_convertidos/${slug}`
        const m: CotaMeta = await (await fetch(`${base}/cota_mapa.json`)).json()
        const blob = await (await fetch(`${base}/cota_mapa.webp`)).blob()
        const bmp = await createImageBitmap(blob, { premultiplyAlpha: "none" })
        const c = document.createElement("canvas")
        c.width = m.width; c.height = m.height
        const ctx = c.getContext("2d", { willReadFrequently: true })!
        ctx.drawImage(bmp, 0, 0)
        const px = ctx.getImageData(0, 0, m.width, m.height).data
        const ix = new Uint8Array(m.width * m.height)
        for (let i = 0; i < ix.length; i++) ix[i] = px[i * 4 + 3] ? px[i * 4] : 0
        if (!vivo) return
        idx.current = ix
        canvas.current = c
        const ini = parseFloat(cotaInicial ?? "")
        const min = m.cotas[0] - passoDe(m)
        const alvo = autoplay ? min : Number.isFinite(ini) ? ini : m.cotas[Math.floor(m.cotas.length / 2)]
        setMeta(m)
        setCotaState(Math.min(m.cotas[m.cotas.length - 1], Math.max(min, alvo)))
        if (autoplay) setTocando(true)
      } catch {
        if (vivo) setErro(true)
      }
    })()
    return () => {
      vivo = false
      if (urlAtual.current) { URL.revokeObjectURL(urlAtual.current); urlAtual.current = null }
    }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const amostrar = useCallback((lon: number, lat: number) => {
    const ix = idx.current
    if (!ix || !meta) return 0
    const [w, s, e, n] = meta.bounds
    if (lon < w || lon >= e || lat <= s || lat > n) return 0
    const col = Math.floor(((lon - w) / (e - w)) * meta.width)
    const row = Math.floor(((n - lat) / (n - s)) * meta.height)
    return ix[row * meta.width + col] ?? 0
  }, [meta])

  // Slider manual para o play; o hook expõe setCota que já desliga o avanço automático.
  const setCota = (c: number) => { setTocando(false); setCotaState(c) }

  // Avanço automático em loop: minimo -> maximo em DURACAO_MS, segura PAUSA_FIM_MS e recomeça.
  useEffect(() => {
    if (!tocando || !meta) return
    let anterior = performance.now()
    let segura = 0
    let raf = 0
    const tick = (agora: number) => {
      const dt = Math.min(agora - anterior, 500)
      anterior = agora
      if (segura > 0) {
        segura -= dt
        if (segura <= 0) setCotaState(minimo)
      } else {
        setCotaState((c) => {
          const prox = (c ?? minimo) + ((maximo - minimo) * dt) / DURACAO_MS
          if (prox >= maximo) { segura = PAUSA_FIM_MS; return maximo }
          return prox
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tocando, meta, minimo, maximo])

  const tabela = useMemo(() => {
    if (!meta) return null
    const t = new Float32Array(meta.cotas.length + 1)
    meta.cotas.forEach((c, i) => { t[i + 1] = c })
    return t
  }, [meta])

  // Recolore (um quadro por vez, coalescendo movimentos) e publica a url da imagem.
  useEffect(() => {
    if (!meta || cota === null || !tabela || !idx.current || !canvas.current) return
    ultima.current = cota
    if (pendente.current) return
    pendente.current = true
    requestAnimationFrame(() => {
      pendente.current = false
      const cv = canvas.current
      const ix = idx.current
      if (!cv || !ix || ultima.current === null) return // slug mudou/desativou antes do quadro
      const c = ultima.current
      const ctx = cv.getContext("2d")!
      const img = ctx.createImageData(meta.width, meta.height)
      const d = img.data
      for (let i = 0; i < ix.length; i++) {
        const k = ix[i]
        if (!k) continue
        const a = Math.min(1, Math.max(0, (c - (tabela[k] - passo)) / passo))
        if (a <= 0) continue
        const cor = a < 1 ? COR_FRENTE : COR_ALAGADO
        const o = i * 4
        d[o] = cor[0]; d[o + 1] = cor[1]; d[o + 2] = cor[2]
        d[o + 3] = 255 * (a < 1 ? 0.4 + 0.6 * a : 1)
      }
      ctx.putImageData(img, 0, 0)
      cv.toBlob((b) => {
        if (!b) return
        const novo = URL.createObjectURL(b)
        const antigo = urlAtual.current
        urlAtual.current = novo
        setUrl(novo)
        if (antigo) setTimeout(() => URL.revokeObjectURL(antigo), 3000)
      })
    })
  }, [cota, meta, tabela, passo])

  return { meta, erro, cota, setCota, tocando, setTocando, url, amostrar, minimo, maximo, passo }
}
