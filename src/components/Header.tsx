'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useCart } from '@/lib/cart'
import { usePathname } from 'next/navigation'
import { getProduct } from '@/lib/products'

const BADGE_POP = { type: 'spring', stiffness: 600, damping: 18 } as const

// Perceived-luminance test (same heuristic the product page uses) so the header
// adapts to each piece's own background instead of hard-coding one route.
function isDarkBg(hex: string): boolean {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

export function Header() {
  const { count } = useCart()
  const pathname = usePathname()
  // Route-level default: product pages paint their own theme bg; everything
  // else is a light surface.
  const productId = pathname.match(/^\/coleccion\/([^/]+)$/)?.[1]
  const product = productId ? getProduct(productId) : undefined
  const routeDark = product ? isDarkBg(product.theme.bg) : false

  // Scroll-aware tone: a single page alternates light/dark sections, so the
  // fixed header reads `data-tone` of whatever section sits under its band and
  // inverts to stay legible. Falls back to the route default between sections.
  const [scrollDark, setScrollDark] = useState<boolean | null>(null)
  const lastTone = useRef<boolean | null>(null)
  useEffect(() => {
    const probeY = 28
    const update = () => {
      const els = document.querySelectorAll<HTMLElement>('[data-tone]')
      let tone: boolean | null = null
      els.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= probeY && r.bottom >= probeY) tone = el.dataset.tone === 'dark'
      })
      if (tone !== null) lastTone.current = tone
      setScrollDark(tone !== null ? tone : lastTone.current)
    }
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    lastTone.current = null
    setScrollDark(null)
    update()
    // Re-probe after the new route's content has laid out.
    const t1 = setTimeout(update, 80)
    const t2 = setTimeout(update, 350)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [pathname])

  const isDark = scrollDark !== null ? scrollDark : routeDark

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5"
      style={{ mixBlendMode: 'normal' }}
    >
      <Link href="/" className="press flex items-center" aria-label="ACRO, inicio">
        <span className="relative block h-6 w-auto">
          <Image
            src="/images/logo-black.png"
            alt="ACRO"
            width={42}
            height={32}
            className={`h-6 w-auto object-contain transition-opacity duration-500 ${isDark ? 'opacity-0' : 'opacity-100'}`}
            priority
          />
          <Image
            src="/images/logo-white.png"
            alt=""
            aria-hidden="true"
            width={42}
            height={32}
            className={`absolute inset-0 h-6 w-auto object-contain transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-0'}`}
            priority
          />
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        <Link
          href="/coleccion"
          className={`text-xs tracking-[0.3em] uppercase font-sans transition-colors duration-300 hover:opacity-60 ${
            isDark ? 'text-chalk' : 'text-ink'
          }`}
        >
          Colección
        </Link>
        <Link
          href="/carrito"
          aria-label={count > 0 ? `Carrito, ${count} pieza${count > 1 ? 's' : ''}` : 'Carrito, vacío'}
          className={`text-xs tracking-[0.3em] uppercase font-sans transition-colors duration-300 hover:opacity-60 relative ${
            isDark ? 'text-chalk' : 'text-ink'
          }`}
        >
          Carrito
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={BADGE_POP}
              className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-current text-[10px] flex items-center justify-center"
            >
              <span className={isDark ? 'text-ink' : 'text-chalk'}>{count}</span>
            </motion.span>
          )}
        </Link>
      </nav>

      {/* Mobile cart */}
      <Link
        href="/carrito"
        aria-label={count > 0 ? `Carrito, ${count} pieza${count > 1 ? 's' : ''}` : 'Carrito, vacío'}
        className="md:hidden relative -m-3 p-3"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDark ? '#F5F5F0' : '#0A0A0A'}
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={BADGE_POP}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-current text-[9px] flex items-center justify-center"
          >
            <span className={isDark ? 'text-ink' : 'text-chalk'}>{count}</span>
          </motion.span>
        )}
      </Link>
    </header>
  )
}
