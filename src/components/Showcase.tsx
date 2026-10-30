'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getProduct } from '@/lib/products'
import { useCatalog } from '@/lib/useCatalog'
import { BOARD, CELL_GAP, ITEMS, LABEL_H, START_CELL, type ShowcaseItem } from '@/lib/showcase'

/* ════════════════════════════════════════════════════════════════
   Showcase — la home como lienzo infinito. Se arrastra en cualquier
   dirección (dedo, ratón, rueda, trackpad o flechas) y el tablero de
   showcase.ts se repite sin fin. Cada pieza abre su ficha.

   Movimiento, de más a menos importante:
   · la cámara persigue a su objetivo con el mismo lerp que el scroll inercial (0.1),
     así el arrastre, la rueda y el lanzamiento comparten la misma inercia;
   · al ir deprisa el plano se aleja un 5 % y las piezas se separan por
     profundidad (los bolsos delante, la tipografía al fondo) — todo es
     transitorio y se recoloca al parar: en reposo la composición es exacta;
   · en reposo el lienzo deriva muy despacio, para que se note que sigue.
   Con «reducir movimiento» solo queda el arrastre, sin deriva ni efectos.
   ════════════════════════════════════════════════════════════════ */

type Placed = { item: ShowcaseItem; wx: number; wy: number; w: number; h: number }

/** Lado de la celda en px. La garantía que sostiene todo: el tablero mide
 *  siempre más que la pantalla más una pieza (contando el alejamiento al ir
 *  deprisa), así que cada pieza da la vuelta fuera de la vista y basta UNA
 *  copia en el DOM — sin duplicados ni saltos visibles. */
function cellFor(vw: number, vh: number) {
  const base = vw < 640 ? Math.max(260, vw * 0.7) : Math.min(640, Math.max(380, vw * 0.27))
  return Math.round(Math.max(base, Math.max(vw, vh) / 3.6))
}

function place(cell: number): Placed[] {
  return ITEMS.map((item) => {
    const [r, c] = item.cell
    const aspect = item.kind === 'type' ? 1.3 : item.w / item.h
    const w = aspect >= 1 ? item.size : item.size * aspect
    const h = aspect >= 1 ? item.size / aspect : item.size
    const label = item.kind === 'type' ? 0 : LABEL_H
    const slackX = Math.max(0, (1 - w) / 2 - CELL_GAP)
    const slackY = Math.max(0, (1 - h - label) / 2 - CELL_GAP)
    const cx = c + 0.5 + (r % 2 ? 0.5 : 0) + item.jitter[0] * slackX
    const cy = r + 0.5 - label / 2 + item.jitter[1] * slackY
    return { item, wx: cx * cell, wy: cy * cell, w: w * cell, h: h * cell }
  })
}

// Layout effect en el cliente (sin aviso de SSR): la primera colocación se
// escribe antes de pintar, así nunca se ve un fotograma con todo apilado.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/** Lleva v a [-p/2, p/2): la posición de la copia más cercana al centro. */
const wrap = (v: number, p: number) => v - p * Math.floor(v / p + 0.5)
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

const LERP = 0.1
const DRIFT_AFTER = 3800 // ms sin tocar antes de empezar a derivar
const DRIFT_FOR = 45000 // y cuánto dura la deriva antes de dormirse (batería)

type Camera = {
  tx: number
  ty: number
  cx: number
  cy: number
  svx: number
  svy: number
  zoom: number
  lastInput: number
  running: boolean
  dragging: boolean
  suppressClick: boolean
  down: null | {
    id: number
    x: number
    y: number
    lx: number
    ly: number
    moved: boolean
    samples: Array<{ t: number; x: number; y: number }>
  }
}

export function Showcase() {
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const [dims, setDims] = useState<{ vw: number; vh: number; cell: number } | null>(null)
  const [explored, setExplored] = useState(false)
  const exploredRef = useRef(false)
  const cellRef = useRef(0)
  const cam = useRef<Camera>({
    tx: 0, ty: 0, cx: 0, cy: 0, svx: 0, svy: 0, zoom: 1,
    lastInput: 0, running: false, dragging: false, suppressClick: false, down: null,
  })
  const { getPrice, getState, summary } = useCatalog()

  const placed = useMemo(() => (dims ? place(dims.cell) : []), [dims])

  // Medida del lienzo; al cambiar de tamaño la cámara se reescala con el
  // tablero para que la pieza que estabas mirando siga en su sitio.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const vw = root.clientWidth
      const vh = root.clientHeight
      const cell = cellFor(vw, vh)
      const prev = cellRef.current
      const s = cam.current
      if (!prev) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const start = place(cell).find((p) => p.item.cell[0] === START_CELL[0] && p.item.cell[1] === START_CELL[1])!
        s.tx = start.wx
        s.ty = start.wy
        // Llegada: la cámara entra con un deslizamiento corto en diagonal, que
        // ya enseña que esto se mueve antes de que nadie lo toque.
        s.cx = reduce ? s.tx : s.tx - cell * 0.42
        s.cy = reduce ? s.ty : s.ty - cell * 0.3
        s.lastInput = performance.now()
      } else if (prev !== cell) {
        const k = cell / prev
        s.tx *= k
        s.ty *= k
        s.cx *= k
        s.cy *= k
      }
      cellRef.current = cell
      setDims({ vw, vh, cell })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // Retraso de entrada de cada pieza: una ola que sale del centro (techo 420 ms).
  const delays = useMemo(() => {
    if (!dims) return []
    const { cell } = dims
    const s = cam.current
    const pw = BOARD.cols * cell
    const ph = BOARD.rows * cell
    const d = placed.map((p) => Math.hypot(wrap(p.wx - s.tx, pw), wrap(p.wy - s.ty, ph)))
    const max = Math.max(...d)
    return d.map((v) => Math.round((v / max) * 420))
    // Solo la primera colocación lleva ola; un resize no vuelve a animar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims === null])

  // El bucle: una sola rAF que escribe transforms; React no se entera.
  useIsoLayoutEffect(() => {
    if (!dims) return
    const root = rootRef.current
    const grid = gridRef.current
    if (!root || !grid) return
    const { vw, vh, cell } = dims
    const pw = BOARD.cols * cell
    const ph = BOARD.rows * cell
    const gridStep = Math.round(cell / 8)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lerp = reduce ? 0.35 : LERP
    const s = cam.current
    let raf = 0
    let last = performance.now()

    const markExplored = () => {
      if (exploredRef.current) return
      exploredRef.current = true
      setExplored(true)
    }

    const paint = () => {
      const z = s.zoom
      const lim = cell * 0.08
      for (let i = 0; i < placed.length; i++) {
        const el = itemRefs.current[i]
        if (!el) continue
        const p = placed[i]
        const depth = reduce ? 0 : p.item.depth
        const ox = clamp(-s.svx * depth * 2.2, lim)
        const oy = clamp(-s.svy * depth * 2.2, lim)
        const x = vw / 2 + (wrap(p.wx - s.cx, pw) + ox) * z
        const y = vh / 2 + (wrap(p.wy - s.cy, ph) + oy) * z
        el.style.transform = `translate3d(${(x - p.w / 2).toFixed(1)}px,${(y - p.h / 2).toFixed(1)}px,0) scale(${z.toFixed(4)})`
      }
      // La rejilla de la mesa de corte viaja con la cámara: es la referencia
      // que hace legible el desplazamiento cuando no hay ninguna pieza cerca.
      const g = gridStep * z
      const bx = (((vw / 2 - s.cx * z) % g) + g) % g
      const by = (((vh / 2 - s.cy * z) % g) + g) % g
      grid.style.backgroundSize = `${g.toFixed(2)}px ${g.toFixed(2)}px`
      grid.style.backgroundPosition = `${bx.toFixed(1)}px ${by.toFixed(1)}px`
    }

    const frame = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now
      const f = dt / 16.667
      const idle = now - s.lastInput
      const drifting = !reduce && !s.down && idle > DRIFT_AFTER && idle < DRIFT_AFTER + DRIFT_FOR
      if (drifting) {
        // ~16 px/s en diagonal: se nota que el lienzo sigue, no distrae.
        s.tx += cell * 0.00004 * dt
        s.ty += cell * 0.00002 * dt
      }

      const k = 1 - Math.pow(1 - lerp, f)
      const px = s.cx
      const py = s.cy
      s.cx += (s.tx - s.cx) * k
      s.cy += (s.ty - s.cy) * k
      s.svx += ((s.cx - px) / f - s.svx) * 0.25
      s.svy += ((s.cy - py) / f - s.svy) * 0.25
      const speed = Math.hypot(s.svx, s.svy)
      const zoomTo = reduce ? 1 : 1 - Math.min(speed / 50, 1) * 0.05
      s.zoom += (zoomTo - s.zoom) * (1 - Math.pow(0.85, f))

      paint()

      const settled =
        !s.down &&
        Math.abs(s.tx - s.cx) < 0.1 &&
        Math.abs(s.ty - s.cy) < 0.1 &&
        speed < 0.02 &&
        Math.abs(s.zoom - 1) < 0.001 &&
        (reduce || idle > DRIFT_AFTER + DRIFT_FOR)
      if (settled) {
        s.running = false
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (s.running || document.hidden) return
      s.running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const input = () => {
      s.lastInput = performance.now()
      wake()
    }

    // ── Arrastre. La captura del puntero se toma solo al superar el umbral:
    // capturar en el pointerdown mandaría el click al lienzo y no al enlace.
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      s.suppressClick = false
      s.down = {
        id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY,
        moved: false, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
      }
      input()
    }
    const onMove = (e: PointerEvent) => {
      const d = s.down
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.lx
      const dy = e.clientY - d.ly
      d.lx = e.clientX
      d.ly = e.clientY
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
        d.moved = true
        s.dragging = true
        root.setAttribute('data-dragging', '')
        try {
          root.setPointerCapture(e.pointerId)
        } catch {}
        markExplored()
      }
      if (!d.moved) return
      s.tx -= dx / s.zoom
      s.ty -= dy / s.zoom
      d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY })
      while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift()
      input()
    }
    const onUp = (e: PointerEvent) => {
      const d = s.down
      if (!d || d.id !== e.pointerId) return
      s.down = null
      if (d.moved) {
        s.suppressClick = true
        s.dragging = false
        root.removeAttribute('data-dragging')
        // Lanzamiento: la velocidad de los últimos 100 ms empuja el objetivo y
        // el mismo lerp lo frena. Si el dedo se paró antes de soltar, no hay tiro.
        const a = d.samples[0]
        const b = d.samples[d.samples.length - 1]
        if (!reduce && e.type === 'pointerup' && e.timeStamp - b.t < 70) {
          const span = Math.max(16, b.t - a.t)
          s.tx -= clamp(((b.x - a.x) / span) * 260, cell * 1.6) / s.zoom
          s.ty -= clamp(((b.y - a.y) / span) * 260, cell * 1.6) / s.zoom
        }
      }
      input()
    }
    const onClickCapture = (e: MouseEvent) => {
      if (!s.suppressClick) return
      e.preventDefault()
      e.stopPropagation()
      s.suppressClick = false
    }

    // ── Rueda y trackpad: desplazan el lienzo en vez de la página. El pellizco
    // del trackpad llega como ctrl+rueda y se deja al navegador (zoom de página).
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      e.preventDefault()
      const m = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1
      s.tx += e.deltaX * m
      s.ty += e.deltaY * m
      markExplored()
      input()
    }

    // ── Teclado: flechas para moverse; al tabular, la pieza enfocada viene al centro.
    const onKey = (e: KeyboardEvent) => {
      const step = cell * 0.5
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }
      const v = delta[e.key]
      if (!v) return
      e.preventDefault()
      s.tx += v[0]
      s.ty += v[1]
      markExplored()
      input()
    }
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      if (!el.matches(':focus-visible')) return
      const i = itemRefs.current.indexOf(el)
      if (i < 0) return
      s.tx += wrap(placed[i].wx - s.tx, pw)
      s.ty += wrap(placed[i].wy - s.ty, ph)
      input()
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        s.running = false
      } else wake()
    }

    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onUp)
    root.addEventListener('click', onClickCapture, true)
    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('keydown', onKey)
    root.addEventListener('focusin', onFocusIn)
    document.addEventListener('visibilitychange', onVisibility)
    s.running = false
    paint()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      s.running = false
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onUp)
      root.removeEventListener('click', onClickCapture, true)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('keydown', onKey)
      root.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [dims, placed])

  // Inventario real, del catálogo: solo se enseña cuando ha llegado.
  const ids = Array.from(new Set(ITEMS.flatMap((it) => (it.kind === 'bag' ? [it.productId] : []))))
  const inventory = summary(ids)

  return (
    <section data-tone="light" className="relative h-[100svh] w-full overflow-hidden bg-chalk">
      <h1 className="sr-only">ACRO — bolsos de crochet tejidos a mano en Donostia. Existe una de cada.</h1>

      <div
        ref={rootRef}
        data-lenis-prevent
        role="region"
        aria-label="Las piezas de ACRO. Arrastra, usa la rueda o las flechas para recorrerlas."
        className="sc absolute inset-0"
      >
        <div ref={gridRef} aria-hidden="true" className="sc-grid absolute inset-0" />

        {dims &&
          placed.map((p, i) => {
            const style: CSSProperties & Record<'--d', string> = {
              width: p.w,
              height: p.h,
              '--d': `${delays[i] ?? 0}ms`,
            }
            const setRef = (el: HTMLElement | null) => {
              itemRefs.current[i] = el
            }
            const it = p.item

            if (it.kind === 'type') {
              return (
                <div key={i} ref={setRef} style={style} className="sc-item sc-type">
                  <div className="sc-lift flex flex-col justify-center">
                    <p className="font-bebas text-ink leading-[0.84]" style={{ fontSize: p.w / 3.5 }}>
                      {it.lines[0]}
                      <br />
                      {it.lines[1]}
                    </p>
                    <p lang="en" className="mt-3 font-sans text-[11px] italic text-ink/60">
                      {it.en}
                    </p>
                  </div>
                </div>
              )
            }

            const product = getProduct(it.productId)
            if (!product) return null
            const state = getState(it.productId)
            const sold = state === 'sold'
            const name = product.copy.es.tagline.split('.')[0]

            if (it.kind === 'bag') {
              const price = getPrice(product.id, product.price)
              return (
                <Link
                  key={i}
                  ref={setRef}
                  href={`/coleccion/${product.id}`}
                  style={style}
                  draggable={false}
                  data-cursor="view"
                  aria-label={`ACRO ${product.number}, ${name}, ${sold ? 'vendida' : state === 'soon' ? `próximamente, ${price} euros` : `${price} euros`}`}
                  className={`sc-item sc-bag ${sold ? 'sc-sold' : ''}`}
                >
                  <span className="sc-lift">
                    <span aria-hidden="true" className="sc-shadow" />
                    <Image
                      src={it.src}
                      alt=""
                      fill
                      priority
                      draggable={false}
                      sizes="(max-width: 640px) 60vw, 26vw"
                      className="sc-media object-contain"
                    />
                    {sold && <span className="sc-stamp unique-stamp">Vendida · Sold</span>}
                  </span>
                  <span className="sc-label sc-label--bag">
                    <span className="font-bebas text-[clamp(20px,1.7vw,28px)] leading-none text-ink">{product.number}</span>
                    <span className="sc-micro flex-1 truncate">{name}</span>
                    <span className="font-bebas text-[clamp(18px,1.5vw,24px)] leading-none text-ink">
                      {sold ? 'Vendida' : `${price}€`}
                    </span>
                  </span>
                </Link>
              )
            }

            // Foto de campaña: abre el mismo bolso. Fuera del orden de tabulación
            // y del árbol accesible: el enlace del recorte ya lo representa.
            return (
              <Link
                key={i}
                ref={setRef}
                href={`/coleccion/${product.id}`}
                style={style}
                draggable={false}
                tabIndex={-1}
                aria-hidden="true"
                data-cursor="view"
                className={`sc-item ${sold ? 'sc-sold' : ''}`}
              >
                <span className="sc-lift sc-photo">
                  <Image
                    src={it.src}
                    alt=""
                    fill
                    draggable={false}
                    // Inmediata pero sin prioridad: la carga diferida nativa deja
                    // huecos en blanco cuando el lienzo se lanza de un tirón.
                    loading="eager"
                    fetchPriority="low"
                    sizes="(max-width: 640px) 50vw, 22vw"
                    className="sc-media object-cover"
                  />
                </span>
                <span className="sc-label sc-micro">
                  {product.number} · {it.caption}
                </span>
              </Link>
            )
          })}
      </div>

      {/* Fundido bajo la cabecera: el logo y el menú no compiten con las piezas. */}
      <div aria-hidden="true" className="sc-fade sc-fade--top pointer-events-none absolute inset-x-0 top-0 z-10" />

      {/* Pie fijo: la frase de la marca, el inventario real y la salida a la lista. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
        <div aria-hidden="true" className="sc-fade absolute inset-x-0 bottom-0" />
        <div className="relative flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-end md:justify-between md:px-10 md:pb-9">
          <div>
            <p className="font-bebas text-ink text-[clamp(30px,4vw,60px)] leading-[0.86]">
              Existe una.
              <br />
              Cuando se va, no vuelve.
            </p>
            <p lang="en" className="mt-2 font-sans text-[11px] italic text-ink/60">
              There is one. When it goes, it does not return.
            </p>
          </div>
          <div className="flex items-center justify-between gap-6 md:flex-col md:items-end md:gap-3">
            {inventory && <p className="sc-micro">{inventory}</p>}
            <Link
              href="/coleccion"
              className="press pointer-events-auto -m-2 inline-flex items-center gap-2 p-2 font-sans text-[11px] uppercase tracking-[0.3em] text-ink"
            >
              Ver la colección
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Pista de uso: se va en cuanto alguien arrastra, gira la rueda o pulsa una flecha. */}
      <div
        aria-hidden="true"
        className={`sc-hint pointer-events-none absolute left-1/2 top-[calc(50%+min(34vw,260px))] z-10 -translate-x-1/2 md:top-auto md:bottom-10 ${
          explored ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="inline-flex items-center gap-3 border border-ink/10 bg-chalk px-4 py-2 sc-micro">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1v14M1 8h14M8 1 6 3M8 1l2 2M8 15l-2-2M8 15l2-2M1 8l2-2M1 8l2 2M15 8l-2-2M15 8l-2 2" stroke="currentColor" strokeWidth="1.1" />
          </svg>
          Arrastra para explorar
        </span>
      </div>
    </section>
  )
}
