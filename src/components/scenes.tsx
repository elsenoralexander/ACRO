'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

/* ════════════════════════════════════════════════════════════════
   EditorialScene — the lookbook as an editorial spread. One photo
   at a time, full-bleed; each one wipes in over the previous with a
   scrubbed curtain reveal (clip-path) and settles. A counter ticks,
   a caption changes. No flying, no rotation: magazine, not widget.
   Sustituye al ConvergeScene: las fotos volando desde los lados leían a
   recurso fácil y montaban un segundo momento heroico.
   ════════════════════════════════════════════════════════════════ */

/* Every scroll-linked keyframe list here MUST span the whole [0,1] progress
   range. Framer hands these straight to WAAPI, and WAAPI ramps the property
   back to the element's base value across whatever scroll the offsets leave
   uncovered — which silently re-closed each revealed photo and put three of
   them on screen at once. Padding with hold keyframes at 0 and 1 pins them. */
function fullRange<T extends string | number>(points: Array<[number, T]>): [number[], T[]] {
  const pts = points
    .map(([offset, value]) => [Math.min(1, Math.max(0, offset)), value] as [number, T])
    .filter((p, i, all) => i === 0 || p[0] > all[i - 1][0])
  if (pts[0][0] > 0) pts.unshift([0, pts[0][1]])
  if (pts[pts.length - 1][0] < 1) pts.push([1, pts[pts.length - 1][1]])
  return [pts.map((p) => p[0]), pts.map((p) => p[1])]
}

/* When photo `index` owns the caption and the counter. The hand-off happens
   *inside* the next curtain — the outgoing label leaves as it starts moving and
   the incoming one lands on its tail — so the swap reads as one gesture. Wider
   windows left the counter blank for the whole wipe, which read as a flicker. */
function captionPoints(index: number, total: number): Array<[number, number]> {
  const seg = 1 / total
  const start = index * seg
  const segEnd = (index + 1) * seg
  const fadeIn: Array<[number, number]> =
    index === 0 ? [[0, 1]] : [[start + seg * 0.16, 0], [start + seg * 0.3, 1]]
  if (index === total - 1) return fadeIn
  return [...fadeIn, [segEnd, 1], [segEnd + seg * 0.1, 0]]
}

const CURTAIN_SHUT = 'inset(100% 0 0 0)'
const CURTAIN_OPEN = 'inset(0% 0 0 0)'

function EditorialFrame({
  progress,
  index,
  total,
  src,
}: {
  progress: MotionValue<number>
  index: number
  total: number
  src: string
}) {
  const seg = 1 / total
  const start = index * seg
  const wipeEnd = start + seg * 0.45
  const segEnd = (index + 1) * seg

  // Curtain rises from the bottom edge; the incoming photo settles from a
  // slight oversize, then keeps a barely-there push while it holds.
  const [clipAt, clipTo] = fullRange<string>(
    index === 0 ? [[0, CURTAIN_OPEN]] : [[start, CURTAIN_SHUT], [wipeEnd, CURTAIN_OPEN]],
  )
  const [scaleAt, scaleTo] = fullRange<number>(
    index === 0
      ? [[0, 1], [wipeEnd, 1.01], [segEnd, 1.03]]
      : [[start, 1.06], [wipeEnd, 1], [segEnd, 1.02]],
  )
  const clipPath = useTransform(progress, clipAt, clipTo)
  const scale = useTransform(progress, scaleAt, scaleTo)

  return (
    <motion.div style={{ clipPath, zIndex: index }} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0 will-change-transform">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </motion.div>
    </motion.div>
  )
}

export function EditorialScene({
  images,
  captions = [],
  eyebrow,
  title,
  sub,
  screensPerPhoto = 1,
  bg = '#0A0A0A',
}: {
  images: string[]
  /** One micro-label per photo, shown bottom-left. */
  captions?: string[]
  eyebrow?: string
  /** Manifesto held over the whole spread (home). `\n` breaks the lines. */
  title?: string
  sub?: string
  /** Pantallas de scroll por foto. 1 = una foto por pantalla, el ritmo de una
      ficha de producto. La home baja de aquí: ahí el pliego es un paseo por la
      colección, no una lectura pieza a pieza, y a 1 se comía seis pantallas. */
  screensPerPhoto?: number
  bg?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const total = images.length
  const barScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section
      ref={ref}
      data-tone="dark"
      style={{ height: `${Math.round(total * screensPerPhoto * 100)}vh`, background: bg }}
      className="relative"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {images.map((src, i) => (
          <EditorialFrame key={i} progress={scrollYProgress} index={i} total={total} src={src} />
        ))}

        {/* Quiet editorial chrome over the photos */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Manifiesto sostenido: la copy no se mueve mientras las piezas pasan
             por debajo. Sin animarlo — la página ya tiene su clímax, y aquí la
             fuerza está en que el texto AGUANTE. `difference` lo mantiene legible
             sobre cualquier foto. */}
          {(title || sub) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className="mix-blend-difference text-white">
                {title && (
                  <h2 className="font-bebas leading-[0.8] text-[22vw] md:text-[14vw]">
                    {title.split('\n').map((l, i) => (
                      <span key={i} className="block">
                        {l}
                      </span>
                    ))}
                  </h2>
                )}
                {sub && <p className="font-bebas text-3xl md:text-5xl leading-[0.95] mt-3 max-w-3xl mx-auto">{sub}</p>}
              </div>
            </div>
          )}

          {eyebrow && (
            <span className="absolute top-[9vh] left-6 md:left-10 font-sans text-[9px] md:text-[10px] tracking-[0.55em] uppercase text-white/70 mix-blend-difference">
              {eyebrow}
            </span>
          )}

          {/* Captions — one per photo, cross-faded on the photo's segment */}
          <div className="absolute bottom-8 md:bottom-10 left-6 md:left-10 h-4 w-[62vw] max-w-sm">
            {captions.slice(0, total).map((c, i) => (
              <Caption key={i} progress={scrollYProgress} points={captionPoints(i, total)}>
                {c}
              </Caption>
            ))}
          </div>

          {/* Counter + progress hairline */}
          <div className="absolute bottom-8 md:bottom-10 right-6 md:right-10 flex flex-col items-end gap-3">
            <div className="relative h-10 md:h-12 w-24 md:w-28">
              {images.map((_, i) => (
                <Caption key={i} progress={scrollYProgress} points={captionPoints(i, total)}>
                  <span className="absolute inset-0 flex items-end justify-end font-bebas text-4xl md:text-5xl leading-none text-white">
                    {String(i + 1).padStart(2, '0')}
                    <span className="text-white/40 text-2xl md:text-3xl ml-1">/ {String(total).padStart(2, '0')}</span>
                  </span>
                </Caption>
              ))}
            </div>
            <motion.span style={{ scaleX: barScale }} className="block h-px w-24 md:w-28 origin-left bg-white/60" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* Opacity window for captions/counter, padded to the full scroll range. */
function Caption({
  progress,
  points,
  children,
}: {
  progress: MotionValue<number>
  points: Array<[number, number]>
  children: ReactNode
}) {
  const [at, to] = fullRange<number>(points)
  const opacity = useTransform(progress, at, to)
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 font-sans text-[10px] tracking-[0.35em] uppercase text-white/85">
      {children}
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════
   HorizontalGallery — pins and scrolls a row of images sideways as
   you scroll vertically. Classic Awwwards horizontal-scroll beat.
   ════════════════════════════════════════════════════════════════ */

export function HorizontalGallery({
  images,
  height = '320vh',
  bg = '#0A0A0A',
  textColor = '#F5F5F0',
  label,
}: {
  images: string[]
  height?: string
  bg?: string
  textColor?: string
  label?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track) return
      setShift(Math.max(0, track.scrollWidth - window.innerWidth))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [images.length])

  const x = useTransform(scrollYProgress, [0, 1], [0, -shift])

  return (
    <section ref={ref} style={{ height, background: bg }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        {label && (
          <div className="absolute top-[10vh] left-6 md:left-10 z-20">
            <span className="font-sans text-[10px] tracking-[0.55em] uppercase" style={{ color: textColor, opacity: 0.5 }}>
              {label}
            </span>
          </div>
        )}
        <motion.div ref={trackRef} style={{ x }} className="flex gap-4 md:gap-6 px-6 md:px-10 will-change-transform">
          {images.map((src, i) => (
            <div
              key={i}
              className="relative shrink-0 h-[58vh] md:h-[66vh] overflow-hidden"
              style={{ width: 'clamp(260px, 46vh, 520px)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute bottom-4 left-4 font-bebas text-3xl" style={{ color: textColor, opacity: 0.85, mixBlendMode: 'difference' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
