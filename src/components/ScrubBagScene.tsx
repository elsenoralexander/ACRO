'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion'

/**
 * Scroll-scrubbed image sequence — the "Apple AirPods" effect.
 *
 * A pre-rendered clip (bag → daisy burst → bag reforms) is extracted to frames
 * and drawn to a <canvas> as you scroll, on a full-bleed background. The clip IS
 * the background (object-fit: cover) so there are no edges to mismatch — no
 * "pegotes".
 *
 * KEY: the background is `sticky` (stays put in the viewport for the section's
 * scroll range) while the foreground content is pulled up over it with a negative
 * margin and scrolls NORMALLY. So the texts travel in their natural place and you
 * see the parallax move *through* the page — instead of everything being pinned
 * together (which read as static). We use sticky, not `position: fixed`, because
 * the app's template wraps the page in a transformed motion.div, which would make
 * `fixed` scroll away.
 *
 * Optional `beats` cross-fade in over the held clip (driven by scroll progress,
 * not IntersectionObserver — so a fast flick never skips one). This reuses the
 * scrubbed bag as the canvas for the narrative copy instead of repeating the bag
 * in a second section.
 *
 * Why canvas and not a <video> tag: scrubbing video.currentTime stutters; drawing
 * preloaded frames is smooth. Why framer-motion and not GSAP: the project already
 * runs framer-motion + Lenis, and useScroll(scrub) is enough here.
 */
type Props = {
  /** Builds the frame URL for index i (1-based). */
  framePath: (i: number) => string
  frameCount: number
  /** Background shown only before the first frame paints. */
  bg?: string
  /** Track height; taller = slower, more cinematic scrub. */
  height?: string
  /** Oversize narrative beats that cross-fade over the clip, in sequence. */
  beats?: string[]
  /** Small caption shown under the last beat. */
  meta?: string
  /** Colour for the beats/meta typography. */
  textColor?: string
  /** Foreground content (eyebrow, number, price, buy…). Scrolls over the clip. */
  children?: ReactNode
}

/* One cross-fading beat, slid in from its side, timed by scroll progress. */
function BeatOverlay({
  progress,
  center,
  span,
  side,
  color,
  shadow,
  children,
}: {
  progress: MotionValue<number>
  center: number
  span: number
  side: 'left' | 'right'
  color: string
  shadow: string
  children: ReactNode
}) {
  // Clamp every input offset to [0,1] — framer's accelerated scroll path feeds
  // these as WAAPI keyframe offsets, which throw if they fall outside [0,1].
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  const a = clamp(center - span * 0.6)
  const b = clamp(center - span * 0.22)
  const c = clamp(center + span * 0.22)
  const d = clamp(center + span * 0.6)
  const opacity = useTransform(progress, [a, b, c, d], [0, 1, 1, 0])
  const x = useTransform(progress, [a, d], side === 'right' ? ['7vw', '-1vw'] : ['-7vw', '1vw'])
  return (
    <motion.h2
      // The vertical centring lives in `y`, not in a `-translate-y-1/2` class:
      // framer writes the whole `transform` for `x`, so a Tailwind translate
      // utility is silently dropped and the beat hangs half a screen too low
      // (clipping off the bottom on short viewports).
      style={{ opacity, x, y: '-50%', color }}
      className={`absolute top-1/2 z-10 font-bebas leading-[0.82] text-[17vw] md:text-[11vw] pointer-events-none select-none ${
        side === 'right' ? 'right-[5vw] text-right' : 'left-[5vw] text-left'
      }`}
    >
      {/* textShadow on a plain span — keeping a comma-separated shadow list off
          the motion element avoids framer's WAAPI offset crash. */}
      <span style={{ textShadow: shadow }}>{children}</span>
    </motion.h2>
  )
}

export function ScrubBagScene({
  framePath,
  frameCount,
  bg = '#EFEADD',
  height = '240vh',
  beats = [],
  meta,
  textColor = '#241B12',
  children,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const frameRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Draw the current frame with a "cover" fit (fills the stage, crops overflow).
  const draw = () => {
    const canvas = canvasRef.current
    const img = imagesRef.current[frameRef.current]
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr
      canvas.height = ch * dpr
    }
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    // "cover": fill the stage full-bleed (crops overflow) — the big hero look.
    const scale = Math.max((cw * dpr) / iw, (ch * dpr) / ih)
    const dw = iw * scale
    const dh = ih * scale
    const dx = (cw * dpr - dw) / 2
    const dy = (ch * dpr - dh) / 2
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, dx, dy, dw, dh)
  }

  const scheduleDraw = () => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      draw()
    })
  }

  // Preload every frame; paint the first as soon as it lands so there's no flash.
  useEffect(() => {
    let mounted = true
    let loaded = 0
    const imgs: HTMLImageElement[] = new Array(frameCount)
    for (let i = 0; i < frameCount; i++) {
      const img = new Image()
      img.decoding = 'async'
      img.src = framePath(i + 1)
      img.onload = () => {
        if (!mounted) return
        loaded++
        if (i === 0) scheduleDraw()
        if (loaded === frameCount) setReady(true)
      }
      imgs[i] = img
    }
    imagesRef.current = imgs
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount])

  // Redraw on resize (canvas backing store + cover fit both depend on size).
  useEffect(() => {
    const onResize = () => scheduleDraw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Map scroll progress → frame index → draw.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(frameCount - 1, Math.max(0, Math.round(v * (frameCount - 1))))
    if (idx !== frameRef.current) {
      frameRef.current = idx
      scheduleDraw()
    }
  })

  // Beats occupy the latter part of the scroll (after the foreground buy panel
  // has travelled away), cross-fading one after another over the held clip.
  const beatsStart = 0.28
  const beatSpan = beats.length ? (0.98 - beatsStart) / beats.length : 0
  const shadow = `0 2px 36px ${bg}, 0 0 14px ${bg}`

  return (
    <section ref={sectionRef} style={{ height, backgroundColor: bg }} className="relative">
      {/* Sticky scrub background — stays in the viewport while the page scrolls
          over it, so the parallax visibly travels through the page. */}
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden" style={{ backgroundColor: bg }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        {/* Narrative beats, pinned and cross-faded over the transforming bag. */}
        {beats.map((b, i) => {
          const center = beatsStart + beatSpan * (i + 0.5)
          const isLast = i === beats.length - 1
          return (
            <BeatOverlay
              key={i}
              progress={scrollYProgress}
              center={center}
              span={beatSpan}
              side={i % 2 === 1 ? 'right' : 'left'}
              color={textColor}
              shadow={shadow}
            >
              {b.split(' ').map((w, j) => (
                <span key={j} className="block">
                  {w}
                </span>
              ))}
              {isLast && meta && (
                <span
                  className="block mt-7 font-sans text-[11px] md:text-xs tracking-[0.3em] uppercase"
                  style={{ color: textColor, opacity: 0.55 }}
                >
                  {meta}
                </span>
              )}
            </BeatOverlay>
          )
        })}

        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10" aria-hidden="true">
            <span className="font-sans text-[9px] tracking-[0.5em] uppercase opacity-30">Cargando</span>
          </div>
        )}
      </div>

      {/* Foreground — pulled up over the sticky background; scrolls normally so
          the copy stays "en su sitio" and travels with the page. */}
      <div className="relative z-20 -mt-[100svh]">{children}</div>
    </section>
  )
}
