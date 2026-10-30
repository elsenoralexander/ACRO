'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

/* Barra de compra del móvil. La ficha es larga (portada, mundo, lookbook,
   detalles) y la compradora llega desde Instagram con el pulgar: si se decide
   a mitad de página, el botón tiene que estar ahí. Aparece cuando el botón de
   la portada sale por arriba y se va al llegar al bloque final, que ya tiene el
   suyo. Solo si la pieza se puede comprar (o ya está en el carrito).

   Mientras está a la vista publica su alto en `--buybar-h`, para que el pliego
   del lookbook suba sus textos de pie y no queden debajo.

   Va en un portal: el `template.tsx` envuelve la página en un div con
   transform, y eso convierte `position: fixed` en relativo a ese div. */
export function BuyBar({
  number,
  price,
  bg,
  color,
  enabled,
  inCart,
  onAdd,
  startRef,
  endRef,
}: {
  number: string
  price: number
  bg: string
  color: string
  /** La pieza está a la venta o ya está en el carrito. */
  enabled: boolean
  inCart: boolean
  onAdd: () => void
  /** El botón de la portada: la barra sale cuando este sale por arriba. */
  startRef: RefObject<HTMLElement>
  /** El bloque final de compra: la barra se va cuando este entra. */
  endRef: RefObject<HTMLElement>
}) {
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Scroll listener, no IntersectionObserver: con Lenis el IO no disparaba
  // (ver useReveal en motion.tsx).
  useEffect(() => {
    if (!enabled) {
      setShown(false)
      return
    }
    const mobile = window.matchMedia('(max-width: 767px)')
    let raf = 0
    const check = () => {
      const start = startRef.current?.getBoundingClientRect()
      const end = endRef.current?.getBoundingClientRect()
      setShown(mobile.matches && !!start && !!end && start.bottom < 0 && end.top > window.innerHeight)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    mobile.addEventListener('change', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      mobile.removeEventListener('change', onScroll)
    }
  }, [enabled, startRef, endRef])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--buybar-h', shown ? `${barRef.current?.offsetHeight ?? 0}px` : '0px')
  }, [shown])
  useEffect(() => () => {
    document.documentElement.style.removeProperty('--buybar-h')
  }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {shown && (
        <motion.div
          ref={barRef}
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: { duration: 0.45, ease: EASE } }}
          exit={{ y: '100%', transition: { duration: 0.28, ease: EASE } }}
          className="fixed inset-x-0 bottom-0 z-40 md:hidden"
          style={{ backgroundColor: bg, color, boxShadow: `0 -1px 0 ${color}1F` }}
        >
          <div className="flex items-center gap-4 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="min-w-0 flex-1">
              <p className="font-bebas text-[28px] leading-none">{price}€</p>
              <p className="mt-1 truncate font-sans text-[10px] tracking-[0.3em] uppercase" style={{ opacity: 0.6 }}>
                ACRO {number}
              </p>
            </div>
            {inCart ? (
              <Link
                href="/carrito"
                className="press flex h-12 items-center gap-2 border-2 px-5 font-bebas text-lg tracking-[0.2em]"
                style={{ borderColor: color }}
              >
                Ver carrito
                <svg aria-hidden="true" width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="press h-12 px-6 font-bebas text-lg tracking-[0.2em]"
                style={{ backgroundColor: color, color: bg }}
              >
                Añadir al carrito
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
