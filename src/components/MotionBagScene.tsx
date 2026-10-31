'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useScroll, useMotionValueEvent } from 'framer-motion'
import { BeatOverlay } from './ScrubBagScene'
import type { StageAct } from '@/lib/products'

/**
 * Portada en motion graphics para los bolsos sin clip (01–04).
 *
 * Mismo contrato que ScrubBagScene —fondo sticky, panel de compra que pasa por
 * encima, los beats del tagline cruzándose— pero el «clip» se compone en vivo
 * con el recorte con alfa: un plató (luz cenital, suelo, sombra de contacto o
 * reflejo), una entrada al cargar y, al hacer scroll, una cámara que se acerca
 * mientras el bolso hace su gesto propio:
 *
 *   hilo      01 · un hilo cruza la escena y se enhebra por el bolso
 *   apertura  02 · el bolso se abre en dos y el naranja del forro lo inunda todo
 *   noche     03 · glitch de club: franjas que se desplazan, fleco RGB, destello
 *   dorada    04 · la luz recorre las cuentas y cae la hora dorada
 *
 * Por qué en vivo y no un vídeo renderizado: nítido a cualquier densidad,
 * compuesto aparte para móvil y escritorio (un clip 4:3 recortado en vertical
 * pierde el bolso) y pesa lo que pesa el recorte, no 8 MB de fotogramas.
 *
 * Todo lo que va con el scroll lo escribe `render(p)` directamente en los
 * estilos: el estado es una función pura del progreso, así que al volver hacia
 * arriba se deshace exactamente lo andado, y no hay keyframes que framer pase a
 * WAAPI (ver las trampas en scenes.tsx). Solo transform, opacity y clip-path.
 */

type Props = {
  act: StageAct
  /** Recorte con alfa (public/cutouts) y su tamaño en píxeles. */
  cutout: string
  size: [number, number]
  alt: string
  number: string
  bg: string
  accent: string
  dark: boolean
  sold?: boolean
  height?: string
  beats?: string[]
  meta?: string
  /** Color de los beats. */
  textColor: string
  /** Panel de compra: ocupa la primera pantalla y pasa por encima del plató. */
  children?: ReactNode
}

const INK = '#0A0A0A'
/** El naranja del forro del 02, muestreado de su foto por dentro. */
const FLOOD = '#E2611E'
const THREAD = '#6B5235'
/** Cuentas del POP en coordenadas del recorte (0–1), en el orden en que las
    recorre la luz: sube por el asa izquierda, cruza y baja por la derecha. */
const BEADS: Array<[number, number]> = [
  [0.059, 0.848], [0.051, 0.76], [0.056, 0.677], [0.155, 0.568], [0.234, 0.45], [0.28, 0.378], [0.353, 0.26],
  [0.633, 0.233], [0.667, 0.289], [0.771, 0.47], [0.838, 0.578], [0.941, 0.682], [0.947, 0.79], [0.932, 0.881],
]
const PLATE: [number, number] = [0.49, 0.77]
const STRIPS = 8
/** Puntos del scroll que disparan el destello: entra la primera frase, entra la última. */
const GLINTS = [0.32, 0.8]

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
/** Avance local (0–1) de `p` dentro del tramo [a, b]. */
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
/** «Easy ease» de After Effects: cada tramo arranca y llega sin tirón. */
const ease = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
/** Sube en [a, b], se sostiene y baja en [c, d]. */
const bump = (p: number, a: number, b: number, c: number, d: number) => ease(seg(p, a, b)) * (1 - ease(seg(p, c, d)))
/** Ruido determinista: el mismo punto del scroll da siempre el mismo glitch. */
const rnd = (a: number, b: number) => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return v - Math.floor(v)
}
const rgba = (hex: string, a: number) => {
  const m = hex.replace('#', '')
  return `rgba(${parseInt(m.slice(0, 2), 16)}, ${parseInt(m.slice(2, 4), 16)}, ${parseInt(m.slice(4, 6), 16)}, ${a})`
}

/** Cámara: [progreso, x (vw), y (svh), escala]. La primera pose deja sitio al
    panel de compra; después se acerca con una deriva mínima hacia el lado
    contrario de cada beat y se abre un poco al final, para el bodegón. Entre
    poses, ease: el bolso se posa mientras su frase está entera. */
type Pose = [number, number, number, number]
const DESKTOP: Pose[] = [
  [0.05, -21, 2, 1],
  [0.36, 3, 3, 1.08],
  [0.64, -2, 3, 1.1],
  [0.9, 2, 4, 0.98],
]
const MOBILE: Pose[] = [
  [0.05, 0, -20, 0.82],
  [0.36, 5, 5, 1],
  [0.64, -4, 5, 0.94],
  [0.9, 3, 7, 0.92],
]

function camera(poses: Pose[], p: number): Pose {
  if (p <= poses[0][0]) return poses[0]
  for (let i = 1; i < poses.length; i++) {
    const [a, b] = [poses[i - 1], poses[i]]
    if (p <= b[0]) {
      const t = ease(seg(p, a[0], b[0]))
      return [p, mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)]
    }
  }
  return poses[poses.length - 1]
}

type Node = HTMLElement | SVGElement | null
const put = (node: Node | undefined, css: Partial<CSSStyleDeclaration>) => {
  if (node) Object.assign(node.style, css)
}

export function MotionBagScene({
  act,
  cutout,
  size,
  alt,
  number,
  bg,
  accent,
  dark,
  sold = false,
  height = '400vh',
  beats = [],
  meta,
  textColor,
  children,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const nodes = useRef<Record<string, Node>>({})
  const binders = useRef<Record<string, (n: Node) => void>>({})
  // Callback refs estables por clave: el render imperativo los busca por nombre.
  const bind = (key: string) => (binders.current[key] ??= (n: Node) => void (nodes.current[key] = n))
  const lastP = useRef<number | null>(null)
  const mobileRef = useRef(false)
  const stillRef = useRef(false)
  // Reparto del hilo entre sus tres tramos, proporcional a lo que mide cada uno.
  const threadShares = useRef([0.3, 0.2, 0.5])

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })

  // El optimizador sirve el recorte a su tamaño nativo en WebP/AVIF; la misma
  // URL hace de imagen y de máscara (brillo, siluetas), así que se baja una vez.
  const src = `/_next/image?url=${encodeURIComponent(cutout)}&w=1200&q=82`
  const mask: CSSProperties = {
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
  }
  const ratio = size[1] / size[0]
  const H = 100 * ratio // alto del recorte en unidades del hilo (ancho = 100)

  const glint = () => {
    const band = nodes.current.sheen
    if (!band || stillRef.current) return
    band.animate(
      [{ transform: 'translate3d(-110%, 0, 0) skewX(-14deg)' }, { transform: 'translate3d(210%, 0, 0) skewX(-14deg)' }],
      { duration: 1500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    )
  }

  const render = (p: number) => {
    const n = nodes.current
    const mobile = mobileRef.current
    const still = stillRef.current
    const poses = mobile ? MOBILE : DESKTOP
    const [, x, y, s] = still ? poses[0] : camera(poses, p)

    put(n.rig, { transform: `translate3d(${x}vw, ${y}svh, 0) scale(${s})` })
    put(n.ghost, { transform: `translate3d(${still ? 0 : mix(3, -3, p)}vw, 0, 0)` })

    // El destello no va con el scroll (parado a mitad, se quedaba como una
    // mancha de luz fija): se dispara entero al cruzar la entrada de la primera
    // y de la última frase, en los dos sentidos.
    const last = lastP.current
    lastP.current = p
    if (last !== null && GLINTS.some((g) => last < g !== p < g)) glint()

    let light = 1
    let contact = dark ? 0 : 1
    let reflection = dark ? 0.3 : 0

    if (act === 'hilo') {
      // El hilo se dibuja por delante y por detrás del bolso y luego se va:
      // la cabeza avanza en el segundo beat, la cola la sigue en el tercero.
      const head = still ? 0 : ease(seg(p, 0.44, 0.7))
      const tail = ease(seg(p, 0.76, 0.97))
      const [s1, s2] = threadShares.current
      const ranges: Array<[string, number, number]> = [
        ['th1', 0, s1],
        ['th2', s1, s1 + s2],
        ['th3', s1 + s2, 1],
      ]
      for (const [key, g0, g1] of ranges) {
        const lo = Math.max(tail, g0)
        const hi = Math.min(head, g1)
        if (hi <= lo) {
          put(n[key], { opacity: '0' })
        } else {
          const u0 = (lo - g0) / (g1 - g0)
          const u1 = (hi - g0) / (g1 - g0)
          put(n[key], { opacity: '1', strokeDasharray: `${u1 - u0} 2`, strokeDashoffset: `${-u0}` })
        }
      }
    }

    if (act === 'apertura') {
      // Anticipación: primero se enciende la costura, luego se abre.
      const seam = still ? 0 : bump(p, 0.43, 0.465, 0.48, 0.52)
      const open = still ? 0 : ease(seg(p, 0.47, 0.56)) * (1 - ease(seg(p, 0.66, 0.77)))
      const flood = ease(seg(p, 0.475, 0.565))
      const gap = mobile ? 9 : 8
      put(n.seam, { opacity: String(seam), transform: `scaleY(${mix(0.2, 1, seam)})` })
      put(n.whole, { opacity: open > 0.001 ? '0' : '1' })
      put(n.halves, { opacity: open > 0.001 ? '1' : '0' })
      put(n.halfL, { transform: `translate3d(${-open * gap}vw, 0, 0)` })
      put(n.halfR, { transform: `translate3d(${open * gap}vw, 0, 0)` })
      put(n.flood, still
        ? { opacity: String(flood), transform: 'none' }
        : { opacity: '1', transform: `scaleX(${flood})`, transformOrigin: `${50 + x}vw 50%` })
      light = 1 - 0.7 * flood
      reflection = 0.3 * (1 - seg(p, 0.42, 0.48))
      contact = 0.75 * seg(p, 0.56, 0.66)
    }

    if (act === 'noche') {
      // Escalonado a propósito: el desplazamiento cambia a saltos, como un
      // fotograma que se engancha, no como un deslizamiento.
      const amp = still ? 0 : bump(p, 0.49, 0.55, 0.62, 0.7)
      const step = Math.floor(p * 150)
      const on = amp > 0.02
      const reach = mobile ? 9 : 5
      for (let i = 0; i < STRIPS; i++) {
        const off = rnd(i, step) < 0.4 ? 0 : (rnd(i + 17, step) * 2 - 1) * amp * reach
        put(n[`strip${i}`], { transform: `translate3d(${off}vw, 0, 0)` })
      }
      const split = amp * (0.5 + rnd(3, step) * 0.5)
      put(n.whole, { opacity: on ? '0' : '1' })
      put(n.strips, { opacity: on ? '1' : '0' })
      n.strips?.style.setProperty('--split', `${split}vw`)
      // Dos destellos suaves y siempre en el mismo sitio: los marca el scroll,
      // así que nunca encadenan una ráfaga.
      const flash = !still && ((p > 0.556 && p < 0.562) || (p > 0.604 && p < 0.609))
      put(n.strobe, { opacity: flash ? '0.14' : '0' })
      light = 1 - 0.55 * amp
      reflection = 0.3 * (1 - amp)
    }

    if (act === 'dorada') {
      BEADS.forEach((_, k) => {
        const t = seg(p, 0.465 + k * 0.0125, 0.52 + k * 0.0125)
        const v = still ? 0 : Math.sin(Math.PI * t)
        put(n[`bead${k}`], { opacity: String(v), transform: `scale(${v}) rotate(${t * 90}deg)` })
      })
      const t = seg(p, 0.655, 0.725)
      const v = still ? 0 : Math.sin(Math.PI * t)
      put(n.plate, { opacity: String(v), transform: `scale(${v * 1.3}) rotate(${t * 90}deg)` })
      // La hora dorada: la luz baja hacia la derecha, se calienta y la sombra
      // del bolso se alarga por el suelo hacia la izquierda.
      const gold = ease(seg(p, 0.68, 0.92))
      put(n.grade, { opacity: String(gold) })
      put(n.light, { transform: still ? 'none' : `translate3d(${gold * 18}vw, ${gold * 10}svh, 0)` })
      put(n.cast, { opacity: String(0.5 * gold), transform: `skewX(${mix(24, 62, gold)}deg) scaleY(${mix(0.1, 0.3, gold)})` })
      contact = 1 - 0.45 * gold
    }

    put(n.light, { opacity: String(light) })
    put(n.contact, { opacity: String(contact) })
    put(n.reflection, { opacity: String(reflection) })
  }

  useMotionValueEvent(scrollYProgress, 'change', render)

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      mobileRef.current = mobile.matches
      stillRef.current = reduced.matches
      render(scrollYProgress.get())
    }
    if (act === 'hilo') {
      const lengths = ['th1', 'th2', 'th3'].map((k) => (nodes.current[k] as SVGPathElement | null)?.getTotalLength() ?? 0)
      const total = lengths.reduce((a, b) => a + b, 0)
      if (total > 0) threadShares.current = lengths.map((l) => l / total)
    }
    sync()
    // Y uno al posarse el bolso tras la entrada.
    const landed = window.setTimeout(glint, 1250)
    mobile.addEventListener('change', sync)
    reduced.addEventListener('change', sync)
    return () => {
      window.clearTimeout(landed)
      mobile.removeEventListener('change', sync)
      reduced.removeEventListener('change', sync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mismo reparto de beats que ScrubBagScene.
  const beatsStart = 0.28
  const beatSpan = beats.length ? (0.98 - beatsStart) / beats.length : 0
  const keyLight = dark ? rgba(accent, 0.2) : 'rgba(255, 255, 255, 0.62)'
  const shade = dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(60, 40, 20, 0.13)'

  const copy = (cls = '') => (
    <img src={src} alt="" aria-hidden="true" draggable={false} className={`absolute inset-0 h-full w-full select-none ${cls}`} />
  )

  // Geometría del hilo en unidades del recorte (ancho 100, alto H): entra por
  // la izquierda, pasa por delante del cuerpo, rodea por detrás, cruza tras las
  // asas y sale por arriba. El SVG desborda la caja para llegar a los bordes.
  const threadBox = { left: '-200%', width: '500%', top: `${(-100 / H) * 100}%`, height: `${((H + 200) / H) * 100}%` }
  const threadView = `-200 -100 500 ${H + 200}`
  const threadPath = (key: string, d: string) => (
    <path
      ref={bind(key)}
      d={d}
      pathLength={1}
      fill="none"
      stroke={THREAD}
      strokeWidth={0.75}
      strokeLinecap="round"
      style={{ opacity: 0, strokeDasharray: '0 2' }}
    />
  )

  return (
    <section ref={sectionRef} style={{ height, backgroundColor: bg }} className="relative">
      <div
        data-tone={dark ? 'dark' : 'light'}
        className="sticky top-0 h-[100svh] w-full overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        {/* ── Plató: luz cenital, suelo y viñeta. ── */}
        <div className="mg-enter-light absolute inset-0">
          <div
            ref={bind('light')}
            className="absolute -inset-[20%] will-change-transform"
            style={{ background: `radial-gradient(ellipse 34% 38% at 50% 30%, ${keyLight}, transparent 70%)` }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 55%, ${shade}), radial-gradient(ellipse 80% 75% at 50% 45%, transparent 55%, ${shade})`,
          }}
        />

        {act === 'apertura' && (
          <div ref={bind('flood')} className="absolute inset-0 will-change-transform" style={{ backgroundColor: FLOOD, transform: 'scaleX(0)' }} />
        )}

        {/* Número fantasma tras el bolso: la profundidad del plató. */}
        <div aria-hidden="true" className="mg-enter-ghost absolute inset-0 flex items-center justify-center">
          <span
            ref={bind('ghost')}
            className="font-bebas leading-none select-none text-[44svh] md:text-[70svh]"
            style={{ color: textColor, opacity: dark ? 0.06 : 0.045 }}
          >
            {number}
          </span>
        </div>

        {/* ── El bolso. La caja de la imagen manda; todo lo demás se le pega. ── */}
        <div ref={bind('rig')} className="absolute inset-0 flex items-center justify-center will-change-transform">
          <div className={`relative ${sold ? 'grayscale opacity-70' : ''}`}>
            <div className="mg-enter-ground pointer-events-none absolute inset-0">
              <div ref={bind('contact')} className="absolute left-[6%] right-[6%] -bottom-[3.5%] h-[7%]" style={{ opacity: dark ? 0 : 1 }}>
                <div
                  className="mg-breathe absolute inset-0"
                  style={{ background: `radial-gradient(closest-side, ${dark ? 'rgba(0,0,0,.55)' : 'rgba(40,25,10,.38)'}, transparent)` }}
                />
              </div>
              {act === 'dorada' && (
                <div
                  ref={bind('cast')}
                  className="absolute inset-0 origin-bottom"
                  style={{ ...mask, backgroundColor: 'rgba(70, 42, 20, 0.75)', filter: 'blur(5px)', opacity: 0 }}
                />
              )}
              {dark && (
                <div ref={bind('reflection')} className="absolute left-0 top-full h-full w-full" style={{ opacity: 0.3 }}>
                  <div className="mg-float-mirror absolute inset-0">
                    <img
                      src={src}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-full w-full -scale-y-100 select-none"
                      style={{
                        maskImage: 'linear-gradient(to top, rgba(0,0,0,.6), transparent 38%)',
                        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,.6), transparent 38%)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mg-enter-bag">
              <div className="mg-float relative">
                {act === 'hilo' && (
                  <svg className="pointer-events-none absolute overflow-visible" style={threadBox} viewBox={threadView}>
                    {threadPath('th1', 'M -170 26 C -96 14, -42 148, 2 132')}
                    {threadPath('th3', 'M 99 124 C 136 96, 124 50, 64 50 C 14 50, 0 20, 40 2 C 84 -18, 190 -6, 280 -80')}
                  </svg>
                )}
                {/* La imagen real (y la única que lee un lector de pantalla). */}
                <img
                  ref={bind('whole')}
                  src={src}
                  alt={alt}
                  width={size[0]}
                  height={size[1]}
                  draggable={false}
                  className="relative block h-auto w-auto max-h-[46svh] max-w-[74vw] md:max-h-[60svh] md:max-w-[34vw] select-none"
                />

                {act === 'apertura' && (
                  <>
                    <div ref={bind('halves')} className="absolute inset-0" style={{ opacity: 0 }}>
                      <div ref={bind('halfL')} className="absolute inset-0 will-change-transform" style={{ clipPath: 'inset(0 50% 0 0)' }}>
                        {copy()}
                      </div>
                      <div ref={bind('halfR')} className="absolute inset-0 will-change-transform" style={{ clipPath: 'inset(0 0 0 50%)' }}>
                        {copy()}
                      </div>
                    </div>
                    <div
                      ref={bind('seam')}
                      className="absolute inset-y-[4%] left-1/2 w-[3px] -ml-[1.5px]"
                      style={{
                        opacity: 0,
                        background: `linear-gradient(to bottom, transparent, ${FLOOD} 20%, #FFD2A8 50%, ${FLOOD} 80%, transparent)`,
                        boxShadow: `0 0 18px 4px ${rgba(FLOOD, 0.55)}`,
                      }}
                    />
                  </>
                )}

                {act === 'noche' && (
                  <div ref={bind('strips')} className="absolute inset-0" style={{ opacity: 0 }}>
                    {Array.from({ length: STRIPS }, (_, i) => (
                      <div
                        key={i}
                        ref={bind(`strip${i}`)}
                        className="absolute inset-0 will-change-transform"
                        // Medio punto de solape entre franjas (sin él asoma una raya
                        // de fondo) y margen a los lados para el fleco RGB.
                        style={{ clipPath: `inset(${Math.max(0, (i / STRIPS) * 100 - 0.5)}% -20% ${Math.max(0, (1 - (i + 1) / STRIPS) * 100 - 0.5)}% -20%)` }}
                      >
                        {/* El fleco RGB va dentro de cada franja: se desplaza con ella
                            y nunca deja manchas de color donde la franja ya no está. */}
                        <div className="absolute inset-0 mix-blend-screen" style={{ ...mask, backgroundColor: '#FF2A3D', opacity: 0.6, transform: 'translate3d(calc(var(--split) * -1), 0, 0)' }} />
                        <div className="absolute inset-0 mix-blend-screen" style={{ ...mask, backgroundColor: '#22D8FF', opacity: 0.6, transform: 'translate3d(var(--split), 0, 0)' }} />
                        {copy()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pasada de luz, recortada a la silueta. */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ ...mask, mixBlendMode: dark ? 'screen' : 'soft-light' }}>
                  <div
                    ref={bind('sheen')}
                    className="absolute inset-y-0 left-0 w-1/2 will-change-transform"
                    style={{
                      transform: 'translate3d(-110%, 0, 0) skewX(-14deg)',
                      // Degradado recto y la banda inclinada con skew: en ángulo, en una
                      // banda tan alta, los bordes no llegaban a transparente y cortaban.
                      background: `linear-gradient(90deg, transparent, rgba(255,255,255,${dark ? 0.55 : 0.9}) 50%, transparent)`,
                    }}
                  />
                </div>

                {act === 'hilo' && (
                  <svg className="pointer-events-none absolute overflow-visible" style={threadBox} viewBox={threadView}>
                    {threadPath('th2', 'M 2 132 C 32 116, 66 152, 99 124')}
                  </svg>
                )}

                {act === 'dorada' &&
                  [...BEADS, PLATE].map(([fx, fy], k) => (
                    <span
                      key={k}
                      className="pointer-events-none absolute w-[13%] aspect-square -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }}
                    >
                      <span ref={bind(k === BEADS.length ? 'plate' : `bead${k}`)} className="block h-full w-full" style={{ opacity: 0 }}>
                        <svg viewBox="-10 -10 20 20" className="h-full w-full overflow-visible">
                          <circle r="4.5" fill="rgba(255, 214, 140, 0.35)" />
                          <path d="M0-10 L1-1 L10 0 L1 1 L0 10 L-1 1 L-10 0 L-1-1Z" fill="#FFF4D6" />
                        </svg>
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {act === 'dorada' && (
          <div
            ref={bind('grade')}
            className="pointer-events-none absolute inset-0 mix-blend-soft-light"
            style={{
              opacity: 0,
              background: 'radial-gradient(90% 80% at 82% 60%, rgba(255, 176, 84, 1), rgba(240, 130, 50, 0.6) 48%, rgba(100, 45, 12, 0.7) 100%)',
            }}
          />
        )}
        {act === 'noche' && <div ref={bind('strobe')} className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 0 }} />}

        {/* Beats: los mismos que en los clips, delante del plató. */}
        {beats.map((b, i) => {
          const onFlood = act === 'apertura' && i > 0
          const color = onFlood ? INK : textColor
          const halo = onFlood ? FLOOD : bg
          const isLast = i === beats.length - 1
          return (
            <BeatOverlay
              key={i}
              progress={scrollYProgress}
              center={beatsStart + beatSpan * (i + 0.5)}
              span={beatSpan}
              side={i % 2 === 1 ? 'right' : 'left'}
              color={color}
              shadow={`0 0 2px ${halo}, 0 0 14px ${halo}, 0 2px 36px ${halo}`}
            >
              {b.split(' ').map((w, j) => (
                <span key={j} className="block">
                  {w}
                </span>
              ))}
              {isLast && meta && (
                <span className="block mt-7 font-sans text-[11px] md:text-xs tracking-[0.3em] uppercase" style={{ color, opacity: 0.85 }}>
                  {meta}
                </span>
              )}
            </BeatOverlay>
          )
        })}
      </div>

      <div className="relative z-20 -mt-[100svh]">{children}</div>
    </section>
  )
}
