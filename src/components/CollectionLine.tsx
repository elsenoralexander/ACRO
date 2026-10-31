'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useScroll, useMotionValueEvent } from 'framer-motion'
import { products, type Product } from '@/lib/products'
import { useCatalog, type PieceState } from '@/lib/useCatalog'
import { Words } from '@/components/motion'
import {
  clamp01,
  drawBokeh,
  drawFringe,
  drawPop,
  drawSparks,
  drawTide,
  ease,
  makeAssets,
  makeStrands,
  POP_SWAP,
  popCovers,
  rnd,
  seg,
  type Assets,
  type Strand,
} from './openings'
import { makePacing, panAt, type Pacing } from './pacing'

/* /coleccion — la fila.
   Antes era una rejilla de tarjetas sueltas: cada pieza en su caja, sin nada
   que las uniera. Ahora es un solo plató continuo que se recorre de lado con
   el scroll: el manifiesto, los seis bolsos y un cierre. Un único hilo —el
   del 01— sale del titular, enhebra los seis (por delante de uno, por detrás
   del siguiente) y acaba en un nudo: las mismas manos, una pieza tras otra.

   El fondo no son salas pegadas: es un solo mundo que cambia. Cuando un bolso
   llega al centro, su mundo se abre DESDE DETRÁS DE ÉL con un efecto sacado
   de su pieza, en la línea del 02 al partirse en su portada: el 01 sube como
   una ola del Cantábrico que arrastra sus piedras; el 02 abre su cámara
   acorazada, con cantos de acero, chispas y el naranja del forro; el 03
   enciende las luces de la ciudad desenfocadas y enfoca; el POP dispara sus
   cuentas de oro, que revientan en círculos de su mundo; el 05 sale como el
   sol bajo entre los tallos; el 06 baja un telón de flecos que se aparta al
   pasar, y el cierre se abre en círculo desde el nudo donde acaba el hilo.
   Cada una trae su propio contraste, porque el POP, el 05 y el 06 son tres
   cremas casi iguales. El hilo, los números y los pies cambian de color con
   el mundo.

   Mismo lenguaje que las portadas de las fichas (plató, sombra, número
   fantasma, recorte servido por la misma URL), así que al entrar en una pieza
   la escena continúa en vez de cambiar.

   Sticky + pista con transform, como el resto de escenas de la web: con el
   `template.tsx` transformado, `position: fixed` no sirve. Lo que va con el
   scroll lo escribe `render(p)` a mano; con movimiento reducido, la fila se
   apila en vertical y no hay paneo. En móvil cada bolso frena en el centro
   mientras se abre su mundo (pacing.ts): a 1:1 un gesto se comía la apertura. */

const INK = '#0A0A0A'
const CHALK = '#F5F5F0'
const N = products.length

/** Cómo se abre cada mundo, sacado de su pieza: la ola (01), la cámara
    acorazada (02), el bokeh (03), las cuentas (POP), la hora dorada (05),
    los flecos (06) y el nudo (cierre). */
type Opening = 'tide' | 'vault' | 'bokeh' | 'pop' | 'stems' | 'fringe' | 'iris'
/** En escritorio, cada apertura empieza con su ancla al `from` del ancho y
    dura `span` anchos (en móvil manda pacing.ts). Las ventanas no se pisan (cada una empieza cuando acaba la anterior, con
    las salas a 40 anchos), y el cierre, que está solo media sala después del
    06, tiene que acabar antes del final del recorrido. */
const WINDOW: Record<Opening, [number, number]> = {
  tide: [0.82, 0.36],
  vault: [0.8, 0.32],
  bokeh: [0.84, 0.36],
  pop: [0.84, 0.36],
  stems: [0.82, 0.36],
  fringe: [0.86, 0.36],
  iris: [0.7, 0.24],
}
const OPENING: Record<string, Opening> = { '01': 'tide', '02': 'vault', '03': 'bokeh', '04': 'pop', '05': 'stems', '06': 'fringe' }
/** Las aperturas que se pintan en canvas (openings.ts). */
const PAINTED = new Set<Opening>(['tide', 'vault', 'bokeh', 'pop', 'fringe'])
/** Luz propia de cada mundo, para que el 05 y el 06 no sean solo otro crema. */
const WASH: Partial<Record<string, string>> = {
  // El 05 se queda con el sol bajo detrás, a ras de suelo.
  '05': 'radial-gradient(ellipse 75% 55% at 50% 100%, rgba(240, 162, 64, 0.32), transparent 72%)',
  // El 06 cae hacia la noche: el cielo baja de tono.
  '06': 'linear-gradient(to bottom, rgba(46, 52, 32, 0.24), rgba(46, 52, 32, 0.06) 45%, transparent 70%)',
}

/** Los mundos de la fila, en orden: manifiesto, los seis bolsos y el cierre.
    `light` es la luz que sale al abrirse cada uno. */
type World = { bg: string; text: string; light: string; opening: Opening; wash?: string }
const WORLDS: World[] = [
  { bg: CHALK, text: INK, light: '#FFFFFF', opening: 'vault' },
  // El 02 se abre en naranja, como su forro (y como su portada).
  ...products.map((p) => ({
    bg: p.theme.bg,
    text: p.theme.text,
    light: p.id === '02' ? '#E2611E' : p.theme.accent,
    opening: OPENING[p.id] ?? 'vault',
    wash: WASH[p.id],
  })),
  { bg: CHALK, text: INK, light: '#C8A96E', opening: 'iris' },
]

/** Los rayos del 05: el sol bajo detrás del bolso, abiertos en abanico. */
const RAYS = Array.from({ length: 15 }, (_, k) => ({
  a: ((k + 0.5) / 15 - 0.5) * 156 + (rnd(k, 1) - 0.5) * 9,
  len: 0.75 + 0.45 * rnd(k, 2),
  w: 0.5 + 1.3 * rnd(k, 3),
  o: 0.5 + 0.5 * rnd(k, 4),
}))
const roomLeft = (i: number) => `calc((var(--intro) + ${i} * var(--room)) * 1vw)`
const ROOM_W = 'calc(var(--room) * 1vw)'

const cutoutSrc = (c: string) => `/_next/image?url=${encodeURIComponent(c)}&w=1200&q=82`
const isDark = (hex: string) => {
  const m = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((o) => parseInt(m.slice(o, o + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}
/** Sube en [a, b] y baja en [c, d]. */
const bump = (t: number, a: number, b: number, c: number, d: number) => ease(seg(t, a, b)) * (1 - ease(seg(t, c, d)))
const rgb = (hex: string) => [0, 2, 4].map((o) => parseInt(hex.replace('#', '').slice(o, o + 2), 16))
const mixHex = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(', ')})`
}
const alpha = (hex: string, a: number) => `rgba(${rgb(hex).join(', ')}, ${a})`

/** Posición de `el` dentro de `root` sin contar transforms (offsetLeft/Top). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

type Seg = { d: string; front: boolean }

export function CollectionLine() {
  const { getPrice, getState, summary } = useCatalog()
  const inventory = summary(products.map((p) => p.id))

  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const underlineRef = useRef<HTMLSpanElement>(null)
  const outroRef = useRef<HTMLDivElement>(null)
  const roomRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const capRefs = useRef<Array<HTMLDivElement | null>>([])
  const fx = useRef<
    Record<'a' | 'b' | 'dim' | 'seam' | 'bloom' | 'rimL' | 'rimR' | 'stems' | 'sun' | 'wash' | 'halo', HTMLDivElement | null>
  >({
    a: null,
    b: null,
    dim: null,
    seam: null,
    bloom: null,
    rimL: null,
    rimR: null,
    stems: null,
    sun: null,
    wash: null,
    halo: null,
  })
  const stemRefs = useRef<Array<HTMLDivElement | null>>([])
  // Dos lienzos: `under` pinta el mundo nuevo bajo la luz del plató; `over`,
  // lo que va por encima (agua, chispas, luces, cuentas, flecos).
  const underRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef<HTMLCanvasElement>(null)
  const painted = useRef({ under: false, over: false })
  const strands = useRef<Strand[]>([])
  const assets = useRef<Assets | null>(null)
  const irisRef = useRef<SVGSVGElement>(null)
  const ringRefs = useRef<Array<SVGCircleElement | null>>([])
  const knotAt = useRef({ x: 0, y: 0 })
  const rigRefs = useRef<Array<HTMLDivElement | null>>([])
  const bagRefs = useRef<Array<HTMLImageElement | null>>([])
  const ghostRefs = useRef<Array<HTMLSpanElement | null>>([])
  const pathRefs = useRef<Array<SVGPathElement | null>>([])
  const knotRef = useRef<SVGCircleElement>(null)

  const [segs, setSegs] = useState<Seg[]>([])
  const [dims, setDims] = useState({ w: 1, h: 1 })
  const [knot, setKnot] = useState<{ x: number; y: number } | null>(null)
  const [still, setStill] = useState(false)
  const shares = useRef<number[]>([])
  const centers = useRef<number[]>([])
  const layout = useRef({ introW: 0, roomW: 0 })
  // Dónde se abre cada mundo (en la pista): el centro de su bolso; el cierre,
  // en su borde izquierdo.
  const anchors = useRef<number[]>([])
  const lightFor = useRef(-1)
  const intro = useRef(0)
  // En móvil, el ritmo de la fila: cuánto scroll tiene y dónde se para.
  const pacing = useRef<Pacing | null>(null)
  const [runway, setRunway] = useState<number | null>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })

  const render = (p: number) => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!track || !stage) return
    const vw = window.innerWidth
    const trackW = track.offsetWidth
    const panMax = Math.max(0, trackW - vw)
    const pace = pacing.current
    const y = p * (pace?.runway ?? 0)
    const pan = pace ? Math.min(panMax, panAt(pace, y)) : p * panMax
    track.style.transform = `translate3d(${-pan}px, 0, 0)`

    // Cada sala, según lo lejos que esté del centro: el bolso que se va se
    // aleja un poco; el número fantasma va más lento (más fondo).
    const mid = pan + vw / 2
    centers.current.forEach((cx, i) => {
      const c = (cx - mid) / (vw / 2)
      const a = Math.min(1, Math.abs(c))
      const rig = rigRefs.current[i]
      if (rig) rig.style.transform = `translate3d(0, ${a * 1.5}svh, 0) scale(${1 - 0.06 * a})`
      const ghost = ghostRefs.current[i]
      if (ghost) ghost.style.transform = `translate3d(${c * 5}vw, 0, 0)`
    })
    // ── El paso de un mundo a otro ──────────────────────────────────
    // Cada mundo j se abre mientras su ancla viaja por su ventana (la cámara
    // acorazada, del 80 % al 48 % del ancho) y llega al centro con su mundo
    // ya entero. En móvil, mientras su bolso está parado en el centro.
    const vh = stage.offsetHeight
    const open = pace
      ? pace.opens.map(([a, b]) => clamp01((y - a) / (b - a)))
      : anchors.current.map((x, j) => {
          const [from, span] = WINDOW[WORLDS[j + 1]?.opening ?? 'vault']
          return clamp01((from * vw - (x - pan)) / (span * vw))
        })
    let cur = 0
    open.forEach((t, j) => {
      if (t >= 1) cur = j + 1
    })
    const next = Math.min(cur + 1, WORLDS.length - 1)
    const t = next > cur ? open[next - 1] ?? 0 : 0
    const s = next > cur ? (anchors.current[next - 1] ?? 0) - pan : vw / 2
    const A = WORLDS[cur]
    const B = WORLDS[next]
    const kind = B.opening
    const menu = 0.85 * vw
    const f = fx.current
    if (lightFor.current !== next) {
      // Al cambiar de mundo en camino se apaga lo de la apertura anterior.
      lightFor.current = next
      ;[f.seam, f.bloom, f.rimL, f.rimR, f.sun, f.wash, f.halo].forEach((el) => el && (el.style.opacity = '0'))
      if (f.stems) f.stems.style.opacity = kind === 'stems' ? '1' : '0'
      // Antes de la hora dorada la luz no se va a negro: baja a ocre.
      if (f.dim) f.dim.style.backgroundColor = kind === 'stems' ? '#2B1B0A' : '#000000'
      if (irisRef.current) irisRef.current.style.opacity = '0'
      paint('iris', 0, 0, vw, vh, B)
    }
    // Cuánto del mundo nuevo se ve (0–1), su recorte y lo que se apaga el viejo.
    let cover = 0
    let clip = 'inset(0 100% 0 0)'
    let fadeIn = 1
    let menuInB = false
    let dim = 0
    // Lo abiertas que están las puertas del 02 en `u` (px desde la costura).
    const reachAt = (u: number) => ease(seg(u, 0.2, 0.8)) * Math.max(s, vw - s) * 1.02
    if (kind === 'tide') {
      // 01 — la ola (openings.ts). El mundo nuevo entra bajo el agua.
      cover = ease(seg(t, 0.32, 0.55))
      if (cover > 0) clip = 'inset(0)'
      fadeIn = cover
      menuInB = cover >= 0.5
    } else if (kind === 'vault') {
      // 02 — la cámara acorazada, como su portada al partirse. Anticipación
      // (se encienden la costura y baja la luz), apertura (dos puertas con
      // canto de acero que se separan soltando chispas), resplandor naranja
      // que se derrama y se apaga.
      const seam = bump(t, 0, 0.16, 0.3, 0.55)
      const doors = ease(seg(t, 0.2, 0.8))
      const glow = bump(t, 0.15, 0.38, 0.45, 0.92)
      const reach = reachAt(t)
      const L = Math.max(0, s - reach)
      const R = Math.max(0, vw - s - reach)
      cover = doors
      if (doors > 0) clip = `inset(0 ${R}px 0 ${L}px)`
      menuInB = doors > 0 && menu >= L && menu <= vw - R
      // Se bajan las luces del mundo que se va y siguen bajas mientras se abre
      // el nuevo: entre dos mundos claros, ese contraste es lo que hace de luz.
      dim = (isDark(A.bg) ? 0.12 : 0.26) * bump(t, 0, 0.2, 0.7, 0.95)
      paintVault(A, B, t, s, seam, doors, glow, reach)
    } else if (kind === 'bokeh') {
      // 03 — el bokeh (openings.ts). La noche azul entra bajo las luces.
      cover = ease(seg(t, 0.3, 0.7))
      if (cover > 0) clip = 'inset(0)'
      fadeIn = cover
      menuInB = cover >= 0.5
    } else if (kind === 'pop') {
      // POP — las cuentas (openings.ts). Los círculos se pintan en `under`
      // hasta que cubren el plató; entonces entra el mundo entero.
      cover = ease(seg(t, 0.15, 0.6))
      if (t >= POP_SWAP) clip = 'inset(0)'
      menuInB = popCovers(t, s, vw, vh, menu, 28)
    } else if (kind === 'stems') {
      // 05 — la hora dorada. La luz del mundo que se va baja a ocre y detrás
      // del bolso, a ras de suelo, sale el sol: primero un rayo, luego el
      // abanico entero, que se ensancha hasta inundar el plató de oro; al
      // retirarse, deja el campo del 05 con el sol todavía detrás.
      const spread = ease(seg(t, 0.28, 0.62))
      const fade = 1 - ease(seg(t, 0.55, 0.9))
      RAYS.forEach((ray, k) => {
        const el = stemRefs.current[k]
        if (!el) return
        const lag = Math.abs(ray.a) / 78
        const grow = ease(seg(t, 0.02 + lag * 0.16, 0.3 + lag * 0.16))
        el.style.opacity = String(grow > 0 ? ray.o * fade : 0)
        el.style.transform = `translate3d(${s}px, 0, 0) rotate(${ray.a * (0.85 + 0.15 * spread)}deg) scale(${ray.w * (1 + spread * 4)}, ${ray.len * grow})`
      })
      if (f.sun) {
        f.sun.style.opacity = String(bump(t, 0.02, 0.3, 0.5, 0.85))
        f.sun.style.transform = `translate3d(${s}px, 0, 0) scale(${0.35 + 0.85 * ease(seg(t, 0, 0.5))})`
      }
      if (f.wash) f.wash.style.opacity = String(bump(t, 0.3, 0.52, 0.6, 0.95))
      // El campo aparece bajo la marea, sin bordes.
      cover = ease(seg(t, 0.4, 0.62))
      if (cover > 0) clip = 'inset(0)'
      fadeIn = cover
      menuInB = cover >= 0.5
      dim = 0.32 * bump(t, 0, 0.2, 0.45, 0.65)
    } else if (kind === 'fringe') {
      // 06 — los flecos. Detrás del bolso cae un telón de flecos de trapillo
      // oliva, rematados con cuentas; el mundo nuevo se monta detrás y, al
      // pasar, el telón se aparta hacia los lados y se recoge hacia arriba.
      cover = ease(seg(t, 0.22, 0.5))
      if (cover > 0) clip = `inset(0 0 ${(1 - cover) * 100}% 0)`
      menuInB = cover >= 0.5
      dim = 0.1 * bump(t, 0.05, 0.3, 0.5, 0.8)
    } else {
      // Cierre — el nudo. Donde acabará el hilo aparece un lazo; el mundo
      // que se va se apaga y el cierre se abre en círculo desde ese lazo,
      // con la luz derramándose por el borde.
      const cx = knotAt.current.x - pan
      const cy = knotAt.current.y
      const far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy))
      const loop = ease(seg(t, 0, 0.18))
      cover = ease(seg(t, 0.16, 0.86))
      const r = 5 + loop * 16 + cover * far
      clip = `circle(${t > 0 ? r : 0}px at ${cx}px ${cy}px)`
      menuInB = cover >= 0.5
      dim = 0.24 * bump(t, 0, 0.22, 0.75, 0.95)
      const rim = loop * (1 - ease(seg(t, 0.72, 0.96)))
      if (irisRef.current) irisRef.current.style.opacity = String(rim)
      const ring = ringRefs.current[0]
      if (ring) {
        ring.setAttribute('cx', String(cx))
        ring.setAttribute('cy', String(cy))
        ring.setAttribute('r', String(r))
      }
      // El halo mide 100 px de radio a escala 1: crece con el círculo.
      if (f.halo) {
        f.halo.style.opacity = String(rim * ease(seg(t, 0.14, 0.3)))
        f.halo.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${r / 100})`
      }
    }
    if (f.a) {
      f.a.style.backgroundColor = A.bg
      f.a.style.backgroundImage = A.wash ?? 'none'
    }
    if (f.b) {
      f.b.style.backgroundColor = B.bg
      f.b.style.backgroundImage = B.wash ?? 'none'
      f.b.style.clipPath = clip
      f.b.style.opacity = String(fadeIn)
    }
    if (f.dim) f.dim.style.opacity = String(dim)
    paint(kind, t, s, vw, vh, B, reachAt)

    // Números y pies: solo los del mundo que está abierto (sobre otro mundo,
    // su color no se lee). El bolso i vive en el mundo i + 1.
    const weight = (w: number) => (w === cur ? 1 - cover : 0) + (w === next && next > cur ? cover : 0)
    products.forEach((_, i) => {
      const v = weight(i + 1)
      const ghost = ghostRefs.current[i]
      if (ghost) ghost.style.opacity = String(0.06 * v)
      const cap = capRefs.current[i]
      if (cap) cap.style.opacity = String(v)
    })

    // El header lee `data-tone`: el del mundo que hay bajo el menú.
    stage.dataset.tone = isDark((menuInB ? B : A).bg) ? 'dark' : 'light'
    const ink = mixHex(A.text, B.text, cover)

    // El hilo va siempre por delante de la cámara, tirando hacia la siguiente,
    // y llega al nudo justo al final del recorrido.
    const head = clamp01((pan + vw * 0.82) / (panMax + vw * 0.82)) * ease(intro.current)
    let g0 = 0
    shares.current.forEach((share, i) => {
      const path = pathRefs.current[i]
      if (!path) return
      const u = clamp01((head - g0) / share)
      path.style.strokeDasharray = `${u} 2`
      path.style.opacity = u > 0 ? '1' : '0'
      path.style.stroke = ink
      g0 += share
    })
    if (knotRef.current) {
      knotRef.current.style.opacity = head > 0.995 ? '1' : '0'
      knotRef.current.style.fill = ink
    }
  }

  /** La cámara acorazada: costura, resplandor y los dos bordes de luz. */
  const vaultFor = useRef(-1)
  const paintVault = (A: World, B: World, t: number, s: number, seam: number, doors: number, glow: number, reach: number) => {
    const f = fx.current
    if (vaultFor.current !== lightFor.current) {
      // La luz es la del mundo que se abre; sobre un mundo oscuro suma luz
      // (screen), sobre uno claro la tiñe.
      vaultFor.current = lightFor.current
      const onDark = isDark(A.bg)
      if (f.seam) {
        f.seam.style.background = `linear-gradient(to bottom, transparent, ${B.light} 18%, #FFFFFF 50%, ${B.light} 82%, transparent)`
        f.seam.style.boxShadow = `0 0 22px 6px ${alpha(B.light, 0.6)}`
      }
      if (f.bloom) {
        f.bloom.style.background = `radial-gradient(ellipse 50% 46% at 50% 50%, ${alpha(B.light, onDark ? 0.75 : 0.55)}, ${alpha(B.light, onDark ? 0.28 : 0.18)} 38%, transparent 72%)`
        f.bloom.style.mixBlendMode = onDark ? 'screen' : 'normal'
      }
      // Los cantos de las puertas: acero cepillado, con el naranja detrás.
      ;[f.rimL, f.rimR].forEach((rim) => {
        if (!rim) return
        rim.style.background = 'linear-gradient(to right, #4E545A, #ECEFF2 42%, #9AA1A8 62%, #3F454B)'
        rim.style.boxShadow = `0 0 18px 4px ${alpha(B.light, 0.6)}`
      })
    }
    if (f.seam) {
      f.seam.style.opacity = String(seam)
      f.seam.style.transform = `translate3d(${s}px, 0, 0) scaleY(${0.25 + 0.75 * seam})`
    }
    if (f.bloom) {
      f.bloom.style.opacity = String(glow)
      f.bloom.style.transform = `translate3d(${s}px, 0, 0) scaleX(${0.35 + 1.4 * doors})`
    }
    const rims = doors > 0 && doors < 1 ? 1 - seg(t, 0.55, 0.85) : 0
    if (f.rimL) {
      f.rimL.style.opacity = String(rims)
      f.rimL.style.transform = `translate3d(${s - reach}px, 0, 0)`
    }
    if (f.rimR) {
      f.rimR.style.opacity = String(rims)
      f.rimR.style.transform = `translate3d(${s + reach}px, 0, 0)`
    }
  }

  /** Las aperturas en canvas (openings.ts). Solo se limpia lo que se pintó. */
  const paint = (kind: Opening, t: number, s: number, vw: number, vh: number, B: World, reachAt?: (u: number) => number) => {
    const under = underRef.current?.getContext('2d')
    const over = overRef.current?.getContext('2d')
    const a = assets.current
    if (!under || !over || !a) return
    const was = painted.current
    if (was.under) under.clearRect(0, 0, vw, vh)
    if (was.over) over.clearRect(0, 0, vw, vh)
    painted.current = { under: false, over: false }
    if (t <= 0 || t >= 1 || !PAINTED.has(kind)) return
    painted.current = { under: kind === 'pop' && t < POP_SWAP, over: true }
    if (kind === 'tide') drawTide(over, t, s, vw, vh, a)
    else if (kind === 'vault' && reachAt) drawSparks(over, t, s, vh, reachAt)
    else if (kind === 'bokeh') drawBokeh(over, t, s, vw, vh, a)
    else if (kind === 'pop') drawPop(under, over, t, s, vw, vh, B.bg, a)
    else if (kind === 'fringe') drawFringe(over, t, s, vw, vh, strands.current, a.bead)
  }

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (!still) render(p)
  })

  // Geometría del hilo, medida del layout real: se rehace al cambiar la
  // ventana y cuando carga cada recorte (hasta entonces no tiene alto).
  const measure = () => {
    const track = trackRef.current
    const under = underlineRef.current
    const outro = outroRef.current
    if (!track || !under || !outro) return
    const w = track.offsetWidth
    const h = track.offsetHeight
    const room0 = roomRefs.current[0]
    if (!room0) return
    const roomW = room0.offsetWidth
    const introW = room0.offsetLeft
    const u = offsetIn(under, track)
    const next: Seg[] = []
    const centersNext: number[] = []

    let yA = h * 0.34
    const x0 = u.x
    const y0 = u.y + u.h + 10
    next.push({
      d: `M ${x0} ${y0} L ${x0 + u.w} ${y0} C ${x0 + u.w + (introW - x0 - u.w) * 0.6} ${y0}, ${introW - roomW * 0.2} ${yA}, ${introW} ${yA}`,
      front: false,
    })
    products.forEach((_, i) => {
      const L = introW + i * roomW
      const R = L + roomW
      const bag = bagRefs.current[i]
      const b = bag && bag.offsetHeight ? offsetIn(bag, track) : { x: L + roomW * 0.35, y: h * 0.3, w: roomW * 0.3, h: h * 0.45 }
      const X = b.x + b.w / 2
      // Por delante del cuerpo en las pares, por detrás de las asas en las impares.
      const front = i % 2 === 0
      const yC = front ? b.y + b.h * 0.7 : b.y + b.h * 0.24
      const yB = i % 2 === 0 ? h * 0.26 : h * 0.4
      const bw = Math.min(b.w, roomW * 0.6)
      next.push({
        d: [
          `M ${L} ${yA}`,
          `C ${L + roomW * 0.3} ${yA}, ${X - bw * 0.95} ${yC}, ${X - bw * 0.45} ${yC}`,
          `C ${X - bw * 0.15} ${yC + b.h * 0.04}, ${X + bw * 0.15} ${yC - b.h * 0.04}, ${X + bw * 0.45} ${yC}`,
          `C ${X + bw * 0.95} ${yC}, ${R - roomW * 0.3} ${yB}, ${R} ${yB}`,
        ].join(' '),
        front,
      })
      centersNext.push(L + roomW / 2)
      yA = yB
    })
    const o = offsetIn(outro, track)
    const L = introW + N * roomW
    const kx = o.x
    const ky = o.y - 28
    next.push({
      d: `M ${L} ${yA} C ${L + (kx - L) * 0.5} ${yA}, ${kx - 40} ${ky}, ${kx} ${ky}`,
      front: false,
    })
    centers.current = centersNext
    anchors.current = [...centersNext, L]
    layout.current = { introW, roomW }
    knotAt.current = { x: kx, y: ky }

    // En móvil, cada ancla tiene su parada con el bolso en el centro.
    const vw = window.innerWidth
    pacing.current = vw < 768 ? makePacing(anchors.current.map((x) => x - vw / 2), Math.max(0, w - vw), h) : null
    setRunway(pacing.current?.runway ?? null)

    // El telón del 06 (sus flecos, en el oliva del bolso) y los lienzos, a la
    // medida de la ventana.
    strands.current = makeStrands(vw, (u) => mixHex('#363C26', '#5A6141', u))
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    ;[underRef.current, overRef.current].forEach((canvas) => {
      if (!canvas) return
      canvas.width = Math.round(vw * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    })
    painted.current = { under: false, over: false }
    setKnot({ x: kx, y: ky })
    setDims({ w, h })
    setSegs(next)
  }

  // Reparto del avance del hilo entre tramos, por longitud real.
  useEffect(() => {
    const lengths = segs.map((_, i) => pathRefs.current[i]?.getTotalLength() ?? 0)
    const total = lengths.reduce((a, b) => a + b, 0)
    shares.current = total > 0 ? lengths.map((l) => l / total) : []
    render(scrollYProgress.get())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(reduced.matches)
    sync()
    reduced.addEventListener('change', sync)
    return () => reduced.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (still) return
    // Los sprites y recortes de las aperturas, una vez.
    if (!assets.current) assets.current = makeAssets()
    measure()
    // El hilo se dibuja hasta la primera sala al entrar, sin esperar al scroll.
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      intro.current = clamp01((t - t0 - 500) / 1600)
      render(scrollYProgress.get())
      if (intro.current < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', measure)
    const imgs = bagRefs.current.filter(Boolean) as HTMLImageElement[]
    imgs.forEach((img) => img.addEventListener('load', measure))
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      imgs.forEach((img) => img.removeEventListener('load', measure))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still])

  // Con teclado, la pieza enfocada tiene que quedar a la vista: la pista se
  // mueve con transform, así que el navegador no la trae él solo.
  const focusRoom = (i: number) => {
    const section = sectionRef.current
    const track = trackRef.current
    if (still || !section || !track) return
    const vw = window.innerWidth
    const range = Math.max(1, track.offsetWidth - vw)
    // En móvil, al final de su parada: el bolso en el centro y su mundo abierto.
    const pace = pacing.current
    const p = pace ? pace.opens[i][1] / pace.runway : clamp01((centers.current[i] - vw / 2) / range)
    const top = section.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + p * (section.offsetHeight - window.innerHeight), behavior: 'instant' })
  }

  const manifesto = (
    <div className="max-w-xl">
      <p className="text-[9px] tracking-[0.6em] uppercase text-ink/60 font-sans mb-5">Colección / Collection</p>
      <h1 className="font-bebas text-[18vw] md:text-[7.5vw] leading-[0.82] text-ink">
        <Words text="PIEZAS" />
        <br />
        <span ref={underlineRef} className="inline-block text-ink/15">
          <Words text="ÚNICAS" delay={0.12} />
        </span>
      </h1>
      <p className="mt-10 font-sans text-sm text-ink/70 leading-relaxed max-w-sm">
        No hay fábrica. No hay serie. Existe una, y cuando se va, no vuelve. Cada pieza sale de las mismas manos,
        una a una, en Donostia.
      </p>
      <p lang="en" className="mt-3 font-sans text-xs text-ink/60 leading-relaxed italic max-w-sm">
        No factory. No series. There is one, and when it goes, it does not return. Each piece comes from the same
        hands, one by one, in Donostia.
      </p>
      {inventory && <p className="mt-8 font-sans text-[10px] tracking-[0.3em] uppercase text-ink/60">{inventory}</p>}
    </div>
  )

  if (still) {
    return (
      <div className="bg-chalk text-ink">
        <div className="px-7 md:px-16 pt-32 pb-20">{manifesto}</div>
        {products.map((product) => (
          <Room key={product.id} product={product} state={getState(product.id)} price={getPrice(product.id, product.price)} />
        ))}
      </div>
    )
  }

  const threadLayer = (front: boolean) => (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${dims.w} ${dims.h}`}
    >
      {segs.map((s, i) =>
        s.front === front ? (
          <path
            key={i}
            ref={(el) => void (pathRefs.current[i] = el)}
            d={s.d}
            pathLength={1}
            fill="none"
            stroke={INK}
            strokeOpacity={0.75}
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ opacity: 0, strokeDasharray: '0 2' }}
          />
        ) : null,
      )}
      {!front && knot && (
        <circle
          ref={knotRef}
          cx={knot.x}
          cy={knot.y}
          r={5}
          fill={INK}
          style={{ opacity: 0, transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      )}
    </svg>
  )

  return (
    <section
      ref={sectionRef}
      className="lineup relative bg-chalk"
      style={{
        height:
          runway === null
            ? `calc(100svh + (var(--intro) + ${N} * var(--room) + var(--outro) - 100) * 1vw)`
            : `calc(100svh + ${Math.round(runway)}px)`,
      }}
    >
      <div ref={stageRef} data-tone="light" className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Los mundos: el abierto y el que se está abriendo. */}
        <div ref={(el) => void (fx.current.a = el)} aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: CHALK }} />
        {/* Solo apaga el mundo que se va: el nuevo entra con toda su luz. */}
        <div ref={(el) => void (fx.current.dim = el)} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 0 }} />
        <div
          ref={(el) => void (fx.current.b = el)}
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: CHALK, clipPath: 'inset(0 100% 0 0)' }}
        />
        {/* Los círculos del mundo del POP mientras se abren. */}
        <canvas ref={underRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        {/* Plató común: luz cenital y suelo, sea cual sea el mundo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 58%, rgba(0, 0, 0, 0.14)), radial-gradient(ellipse 70% 45% at 50% 28%, rgba(255, 255, 255, 0.2), transparent 70%)',
          }}
        />
        {/* 05: la marea dorada, el sol bajo y sus rayos. */}
        <div
          ref={(el) => void (fx.current.wash = el)}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0,
            background:
              'linear-gradient(to top, rgba(232, 146, 48, 0.55), rgba(246, 186, 96, 0.34) 45%, rgba(255, 224, 166, 0.1) 85%)',
          }}
        />
        <div ref={(el) => void (fx.current.stems = el)} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: 0 }}>
          {RAYS.map((_, k) => (
            <div
              key={k}
              ref={(el) => void (stemRefs.current[k] = el)}
              className="absolute bottom-[25svh] left-0 h-[150svh] w-10 -ml-5 origin-bottom will-change-transform"
              style={{
                opacity: 0,
                clipPath: 'polygon(46% 100%, 54% 100%, 100% 0, 0 0)',
                background:
                  'linear-gradient(to right, transparent, rgba(238, 154, 56, 0.6) 26%, rgba(255, 224, 160, 0.96) 50%, rgba(238, 154, 56, 0.6) 74%, transparent)',
                WebkitMaskImage: 'linear-gradient(to top, #000, rgba(0, 0, 0, 0.55) 35%, transparent)',
                maskImage: 'linear-gradient(to top, #000, rgba(0, 0, 0, 0.55) 35%, transparent)',
              }}
            />
          ))}
        </div>
        <div
          ref={(el) => void (fx.current.sun = el)}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[25svh] left-0 h-[60vw] w-[60vw] -mb-[30vw] -ml-[30vw] will-change-transform"
          style={{
            opacity: 0,
            background:
              'radial-gradient(closest-side, rgba(255, 240, 206, 0.95), rgba(246, 180, 90, 0.6) 32%, rgba(238, 150, 60, 0.18) 62%, transparent)',
          }}
        />
        {/* Lo que va por encima: el agua del 01, las chispas del 02, las luces
            del 03, las cuentas del POP y los flecos del 06. */}
        <canvas ref={overRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        {/* Cierre: la luz que se derrama por el borde del círculo y el lazo del nudo. */}
        <div
          ref={(el) => void (fx.current.halo = el)}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[260px] w-[260px] -ml-[130px] -mt-[130px] will-change-transform"
          style={{
            opacity: 0,
            background:
              'radial-gradient(circle, transparent 90px, rgba(255, 255, 255, 0.75) 100px, rgba(255, 252, 240, 0.25) 112px, transparent 128px)',
          }}
        />
        <svg ref={irisRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0 }}>
          <circle ref={(el) => void (ringRefs.current[0] = el)} fill="none" stroke={INK} strokeOpacity={0.8} strokeWidth={1.5} />
        </svg>
        {/* La luz de la apertura: resplandor, los dos bordes y la costura. */}
        <div
          ref={(el) => void (fx.current.bloom = el)}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[90vw] -ml-[45vw] will-change-transform"
          style={{ opacity: 0 }}
        />
        <div ref={(el) => void (fx.current.rimL = el)} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1 -ml-0.5 will-change-transform" style={{ opacity: 0 }} />
        <div ref={(el) => void (fx.current.rimR = el)} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1 -ml-0.5 will-change-transform" style={{ opacity: 0 }} />
        <div
          ref={(el) => void (fx.current.seam = el)}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[4%] left-0 w-[3px] -ml-[1.5px] will-change-transform"
          style={{ opacity: 0 }}
        />

        <div
          ref={trackRef}
          className="absolute inset-y-0 left-0 will-change-transform"
          style={{ width: `calc((var(--intro) + ${N} * var(--room) + var(--outro)) * 1vw)` }}
        >
          {/* Números fantasma, un plano más al fondo. */}
          {products.map((product, i) => (
            <div key={product.id} aria-hidden="true" className="absolute top-[9svh] flex justify-center" style={{ left: roomLeft(i), width: ROOM_W }}>
              <span
                ref={(el) => void (ghostRefs.current[i] = el)}
                className="font-bebas leading-none select-none text-[30svh] md:text-[44svh]"
                style={{ color: product.theme.text, opacity: 0 }}
              >
                {product.number}
              </span>
            </div>
          ))}

          {threadLayer(false)}

          {/* Manifiesto: la primera pantalla de la fila. */}
          <div className="absolute inset-y-0 left-0 flex items-center px-7 md:px-16 pt-16" style={{ width: 'calc(var(--intro) * 1vw)' }}>
            {manifesto}
            <div className="pointer-events-none absolute bottom-8 left-7 md:left-16 flex items-center gap-3" aria-hidden="true">
              <span className="font-sans text-[9px] tracking-[0.5em] uppercase text-ink/55">Scroll</span>
              <span className="block h-px w-10 bg-ink/25" />
            </div>
          </div>

          {products.map((product, i) => (
            <RoomLink
              key={product.id}
              product={product}
              index={i}
              state={getState(product.id)}
              price={getPrice(product.id, product.price)}
              linkRef={(el) => void (roomRefs.current[i] = el)}
              capRef={(el) => void (capRefs.current[i] = el)}
              rigRef={(el) => void (rigRefs.current[i] = el)}
              bagRef={(el) => void (bagRefs.current[i] = el)}
              onFocus={() => focusRoom(i)}
            />
          ))}

          {threadLayer(true)}

          {/* Cierre: el hilo acaba en un nudo. */}
          <div
            className="absolute inset-y-0 flex items-center px-7 md:px-16"
            style={{ left: `calc((var(--intro) + ${N} * var(--room)) * 1vw)`, width: 'calc(var(--outro) * 1vw)' }}
          >
            <div ref={outroRef} className="max-w-sm">
              <p className="font-bebas text-5xl md:text-6xl leading-[0.9] text-ink">
                Las mismas manos.
                <br />
                Una a una.
              </p>
              <p lang="en" className="mt-4 font-sans text-xs italic text-ink/60">The same hands. One by one.</p>
              <p className="mt-8 font-sans text-[10px] tracking-[0.3em] uppercase text-ink/60">Hecho a mano en Donostia</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Lo que dice cada sala: número, nombre y precio (o su estado). */
function Caption({ product, state, price }: { product: Product; state: PieceState | null; price: number }) {
  const sold = state === 'sold'
  const name = product.copy.es.tagline.split('.')[0]
  return (
    <div className="flex items-baseline gap-4 border-t pt-4" style={{ borderColor: `${product.theme.text}26`, color: product.theme.text }}>
      <span className="font-bebas text-3xl md:text-4xl leading-none">{product.number}</span>
      <span className="flex-1 truncate font-sans text-[10px] tracking-[0.3em] uppercase opacity-60 transition-opacity duration-300 group-hover:opacity-100">
        {name}
      </span>
      <span className="text-right">
        <span className={`block font-bebas text-2xl md:text-3xl leading-none ${sold ? 'opacity-50' : ''}`}>{sold ? 'Vendida' : `${price}€`}</span>
        {state === 'soon' && (
          <span className="mt-1 block font-sans text-[9px] tracking-[0.3em] uppercase opacity-60">Próximamente</span>
        )}
      </span>
    </div>
  )
}

function bagImage(product: Product, sold: boolean, ref?: (el: HTMLImageElement | null) => void, cls = '') {
  const [w, h] = product.cutoutSize ?? [800, 1200]
  return (
    <img
      ref={ref}
      src={cutoutSrc(product.cutout ?? product.images.main)}
      alt=""
      width={w}
      height={h}
      draggable={false}
      className={`relative block h-auto w-auto select-none transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        sold ? 'grayscale opacity-60' : 'group-hover:scale-[1.04] group-focus-visible:scale-[1.04]'
      } ${cls}`}
    />
  )
}

function ariaLabel(product: Product, state: PieceState | null, price: number) {
  const name = product.copy.es.tagline.split('.')[0]
  return `ACRO ${product.number}, ${name}, ${state === 'sold' ? 'vendida' : state === 'soon' ? `próximamente, ${price} euros` : `${price} euros`}`
}

/** Una sala de la fila: el bolso sobre su sombra y su pie. Toda la sala es el enlace. */
function RoomLink({
  product,
  index,
  state,
  price,
  linkRef,
  capRef,
  rigRef,
  bagRef,
  onFocus,
}: {
  product: Product
  index: number
  state: PieceState | null
  price: number
  linkRef: (el: HTMLAnchorElement | null) => void
  capRef: (el: HTMLDivElement | null) => void
  rigRef: (el: HTMLDivElement | null) => void
  bagRef: (el: HTMLImageElement | null) => void
  onFocus: () => void
}) {
  const sold = state === 'sold'
  return (
    <Link
      ref={linkRef}
      href={`/coleccion/${product.id}`}
      data-cursor="view"
      aria-label={ariaLabel(product, state, price)}
      onFocus={onFocus}
      className="press group absolute inset-y-0 block focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-8"
      style={{ left: roomLeft(index), width: ROOM_W, outlineColor: product.theme.text }}
    >
      <div ref={rigRef} className="absolute inset-x-0 bottom-[25svh] flex justify-center will-change-transform">
        <div className="mg-enter-bag relative">
          <div
            aria-hidden="true"
            className="absolute left-[8%] right-[8%] -bottom-[3%] h-[6%]"
            style={{ background: 'radial-gradient(closest-side, rgba(20, 12, 4, 0.38), transparent)' }}
          />
          {bagImage(product, sold, bagRef, 'max-h-[42svh] max-w-[60vw] md:max-h-[50svh] md:max-w-[26vw]')}
          {sold && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="unique-stamp" style={{ color: product.theme.text, borderColor: product.theme.text, backgroundColor: product.theme.bg }}>
                Vendida · Sold
              </span>
            </span>
          )}
        </div>
      </div>
      <div ref={capRef} className="absolute inset-x-[6%] bottom-[7svh]" style={{ opacity: 0 }}>
        <Caption product={product} state={state} price={price} />
      </div>
    </Link>
  )
}

/** Con movimiento reducido: la misma sala, apilada en vertical. */
function Room({ product, state, price }: { product: Product; state: PieceState | null; price: number }) {
  const sold = state === 'sold'
  return (
    <Link
      href={`/coleccion/${product.id}`}
      aria-label={ariaLabel(product, state, price)}
      data-tone={isDark(product.theme.bg) ? 'dark' : 'light'}
      className="group relative flex min-h-[80svh] flex-col justify-end px-7 md:px-16 pb-10 pt-24"
      style={{ backgroundColor: product.theme.bg }}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-10 text-center font-bebas text-[30svh] leading-none" style={{ color: product.theme.text, opacity: 0.06 }}>
        {product.number}
      </span>
      <div className="relative mb-10 flex justify-center">
        {bagImage(product, sold, undefined, 'max-h-[50svh] max-w-[70vw] md:max-w-[40vw]')}
      </div>
      <div className="relative">
        <Caption product={product} state={state} price={price} />
      </div>
    </Link>
  )
}
