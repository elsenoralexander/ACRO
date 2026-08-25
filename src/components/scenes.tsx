'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

/* ════════════════════════════════════════════════════════════════
   ConvergeScene — images fly in from the sides and converge into a
   fanned cluster as you scroll, while a headline assembles behind.
   (The alliahealth "phones from the sides" effect, ACRO-style.)
   ════════════════════════════════════════════════════════════════ */

function ConvergeItem({
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
  const side = index % 2 === 0 ? -1 : 1
  const mid = (total - 1) / 2
  // Already clearly peeking from the edges at progress 0 — never an empty wait.
  const startX = `${side * 50}vw`
  const targetX = `${(index - mid) * 11}vw`
  const startRot = `${side * -14}deg`
  const targetRot = `${(index - mid) * 4}deg`

  const x = useTransform(progress, [0, 0.42, 1], [startX, targetX, targetX])
  const rotate = useTransform(progress, [0, 0.42], [startRot, targetRot])
  const scale = useTransform(progress, [0, 0.42, 1], [0.78, 1, 1.12])
  const yOff = index % 2 === 0 ? '-3vh' : '4vh'

  return (
    <motion.div
      style={{ x, rotate, scale, y: yOff, zIndex: index }}
      className="absolute w-[62vw] sm:w-[42vw] md:w-[25vw] aspect-[3/4] overflow-hidden shadow-2xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
    </motion.div>
  )
}

export function ConvergeScene({
  images,
  height = '185vh',
  bg = '#0A0A0A',
  textColor = '#F5F5F0',
  eyebrow,
  title,
  sub,
}: {
  images: string[]
  height?: string
  bg?: string
  textColor?: string
  eyebrow?: string
  title?: string
  sub?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const titleOpacity = useTransform(scrollYProgress, [0.34, 0.5, 1], [0, 1, 1])
  const titleScale = useTransform(scrollYProgress, [0.34, 0.54, 1], [1.16, 1, 1.05])
  const eyebrowOpacity = useTransform(scrollYProgress, [0, 0.06, 0.34, 0.44], [0, 1, 1, 0])

  return (
    <section ref={ref} style={{ height, background: bg }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        {/* Converging images */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {images.slice(0, 6).map((src, i) => (
            <ConvergeItem key={i} progress={scrollYProgress} index={i} total={Math.min(images.length, 6)} src={src} />
          ))}
        </div>

        {/* Eyebrow — top */}
        {eyebrow && (
          <motion.div style={{ opacity: eyebrowOpacity }} className="absolute top-[11vh] left-1/2 -translate-x-1/2 text-center px-6 z-30">
            <span className="font-sans text-[10px] md:text-[11px] tracking-[0.55em] uppercase" style={{ color: textColor, opacity: 0.6 }}>
              {eyebrow}
            </span>
          </motion.div>
        )}

        {/* Headline OVER the cluster — mix-blend keeps it legible on any photo */}
        {(title || sub) && (
          <motion.div
            style={{ opacity: titleOpacity, scale: titleScale }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
          >
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
          </motion.div>
        )}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   EditorialScene — the lookbook as an editorial spread. One photo
   at a time, full-bleed; each one wipes in over the previous with a
   scrubbed curtain reveal (clip-path) and settles. A counter ticks,
   a caption changes. No flying, no rotation: magazine, not widget.
   Replaces ConvergeScene (photos-as-confetti read cheap and competed
   with the page's single hero moment).
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
  bg = '#0A0A0A',
}: {
  images: string[]
  /** One micro-label per photo, shown bottom-left. */
  captions?: string[]
  eyebrow?: string
  bg?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const total = images.length
  const barScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section ref={ref} data-tone="dark" style={{ height: `${total * 100}vh`, background: bg }} className="relative">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {images.map((src, i) => (
          <EditorialFrame key={i} progress={scrollYProgress} index={i} total={total} src={src} />
        ))}

        {/* Quiet editorial chrome over the photos */}
        <div className="absolute inset-0 z-20 pointer-events-none">
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
