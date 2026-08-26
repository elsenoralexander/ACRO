'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { ProductScene } from '@/components/ProductScene'
import { ScrubBagScene } from '@/components/ScrubBagScene'
import { EditorialScene } from '@/components/scenes'
import { Reveal, Parallax, Words, MaskReveal } from '@/components/motion'
import { getProduct } from '@/lib/products'
import { useCart } from '@/lib/cart'
import { useCatalog } from '@/lib/useCatalog'

function isDarkColor(hex: string): boolean {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const product = getProduct(params.id as string)
  const { addItem, items } = useCart()
  const { getPrice, getStock } = useCatalog()
  const [added, setAdded] = useState(false)

  const inCart = items.some((i) => i.product.id === product?.id)
  const catalogStock = product ? getStock(product.id) : null
  const outOfStock = catalogStock === 0

  useEffect(() => {
    if (!product) router.push('/coleccion')
  }, [product, router])

  if (!product) return null

  const { copy, theme, images, shooting, lookbook, price: basePrice, number } = product
  const price = getPrice(product.id, basePrice)
  const isDark = isDarkColor(theme.bg)
  const sku = `#${/^\d+$/.test(number) ? 'P' + number : number}-001`
  const heroImage = product.cutout ?? (isDark && images.dark ? images.dark : images.main)
  // Los productos con clip scrubbeado (05, 06…) usan el hero showcase: los beats
  // del tagline aparecen ENCIMA del clip mientras se transforma, en vez de
  // repetir el bolso en una ProductScene.
  const scrub = product.scrub
  const isShowcase = Boolean(scrub)
  const showcaseBeats = isShowcase
    ? copy.es.tagline.split('.').map((s) => s.trim().toUpperCase()).filter(Boolean)
    : []
  const showcaseMeta = `${price}€ · Hecho en Donostia`

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const txtColor = theme.text
  const bgColor = theme.bg
  const detailBg = isDark ? '#0D121F' : '#E7DECB'

  const AddButton = ({ big = false }: { big?: boolean }) =>
    outOfStock ? (
      <div
        className={`${big ? 'text-2xl py-5 px-14' : 'text-xl py-4 px-8 w-full max-w-xs'} font-bebas tracking-[0.2em] border-2 text-center select-none`}
        style={{ borderColor: txtColor, color: txtColor, opacity: 0.3 }}
      >
        Fuera de stock
      </div>
    ) : (
      <button
        onClick={handleAdd}
        disabled={inCart || catalogStock === null}
        className={`press relative overflow-hidden ${big ? 'text-2xl py-5 px-14' : 'text-xl py-4 px-8 w-full max-w-xs'} font-bebas tracking-[0.2em] border-2 transition-colors duration-300 hover:opacity-80 disabled:opacity-40`}
        style={{ borderColor: txtColor, color: inCart ? bgColor : txtColor, backgroundColor: inCart ? txtColor : 'transparent' }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={inCart ? 'incart' : added ? 'added' : 'add'}
            initial={{ y: '120%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-120%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            {inCart ? '✓ En el carrito' : added ? '✓ Añadido' : 'Añadir al carrito'}
          </motion.span>
        </AnimatePresence>
      </button>
    )

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────
         El 05 usa un clip scrubbeado (bolso → margaritas → bolso) a sangre
         completa; el resto, el recorte flotando. */}
      {isShowcase && scrub ? (
        <ScrubBagScene
          framePath={(i) => `${scrub.path}/frame_${String(i).padStart(4, '0')}.webp`}
          frameCount={scrub.frames}
          bg={bgColor}
          height={`${(1 + showcaseBeats.length) * 100}vh`}
          beats={showcaseBeats}
          meta={showcaseMeta}
          textColor={scrub.beatColor}
        >
          {/* Panel de info/compra — ocupa el primer viewport y SCROLLEA sobre el
             clip fijo; el velo viaja con el texto para mantener la legibilidad. */}
          <div
            data-tone="light"
            className="relative min-h-[100svh] flex flex-col justify-end md:justify-center md:items-end px-7 md:px-16 pb-16 md:pb-0"
          >
            {/* Velo con el bg del tema — móvil desde abajo, desktop desde la derecha. */}
            <div
              className="pointer-events-none absolute inset-0 md:hidden"
              style={{ background: `linear-gradient(to top, ${bgColor}F2, ${bgColor}1A 55%, transparent)` }}
            />
            <div
              className="pointer-events-none absolute inset-0 hidden md:block"
              style={{ background: `linear-gradient(to left, ${bgColor}D9, ${bgColor}0D 55%, transparent)` }}
            />
            <div className="relative flex flex-col w-full max-w-sm md:items-end md:text-right">
              <div className="unique-stamp inline-block self-start md:self-end mb-6" style={{ color: txtColor, borderColor: txtColor, opacity: 0.5 }}>
                Pieza Única · One of a Kind
              </div>
              <h1 className="font-bebas text-7xl md:text-8xl leading-none" style={{ color: txtColor }}>{number}</h1>
              <p className="font-sans text-sm leading-relaxed mt-3 max-w-sm" style={{ color: txtColor, opacity: 0.75 }}>{copy.es.tagline}</p>
              <p className="font-sans text-xs leading-relaxed mt-1 max-w-sm italic" style={{ color: txtColor, opacity: 0.55 }}>{copy.en.tagline}</p>
              <div className="mt-6 flex items-baseline gap-3 md:flex-row-reverse">
                <span className="font-bebas text-5xl" style={{ color: txtColor }}>{price}€</span>
                <span className="font-sans text-xs" style={{ color: txtColor, opacity: 0.35 }}>IVA incluido · Envío España</span>
              </div>
              <div className="mt-6 w-full max-w-xs md:self-end">
                <AddButton />
              </div>
              {inCart && (
                <button onClick={() => router.push('/carrito')} className="mt-3 w-full max-w-xs font-sans text-xs tracking-[0.3em] uppercase py-2 opacity-50 hover:opacity-100 transition-opacity" style={{ color: txtColor }}>
                  Ver carrito →
                </button>
              )}
            </div>
            {/* Indicador de scroll */}
            <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 hidden md:flex">
              <span className="font-sans text-[9px] tracking-[0.5em] uppercase" style={{ color: txtColor, opacity: 0.3 }}>Scroll</span>
              <span className="block w-px h-10" style={{ backgroundColor: txtColor, opacity: 0.2 }} />
            </div>
          </div>
        </ScrubBagScene>
      ) : (
        <section
          data-tone={isDark ? 'dark' : 'light'}
          className="relative min-h-screen flex flex-col md:flex-row items-center overflow-hidden"
          style={{ backgroundColor: bgColor, color: txtColor }}
        >
          <span className="absolute right-0 bottom-0 font-bebas text-[40vw] leading-none select-none pointer-events-none" style={{ color: txtColor, opacity: 0.04 }}>
            {number}
          </span>

          <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center pt-28 md:pt-0 px-10 md:px-16 min-h-[55vh] md:min-h-screen">
            <Image
              src={heroImage}
              alt={`Bolso ACRO ${number} — ${copy.es.tagline.split('.')[0]}`}
              width={620}
              height={760}
              className="animate-float h-[44vh] md:h-[68vh] w-auto object-contain drop-shadow-2xl"
              priority
            />
          </div>

          <div className="relative z-10 w-full md:w-1/2 px-8 md:px-16 py-12 md:py-0 flex flex-col justify-center">
            <div className="unique-stamp inline-block self-start mb-8" style={{ color: txtColor, borderColor: txtColor, opacity: 0.5 }}>
              Pieza Única · One of a Kind
            </div>
            <h1 className="font-bebas text-[18vw] md:text-[12vw] leading-none" style={{ color: txtColor }}>{number}</h1>
            <p className="font-sans text-sm leading-relaxed mt-4 max-w-sm" style={{ color: txtColor, opacity: 0.7 }}>{copy.es.tagline}</p>
            <p className="font-sans text-xs leading-relaxed mt-2 max-w-sm italic" style={{ color: txtColor, opacity: 0.55 }}>{copy.en.tagline}</p>
            <div className="mt-8 flex items-baseline gap-3">
              <span className="font-bebas text-5xl" style={{ color: txtColor }}>{price}€</span>
              <span className="font-sans text-xs" style={{ color: txtColor, opacity: 0.35 }}>IVA incluido · Envío España</span>
            </div>
            <div className="mt-6">
              <AddButton />
            </div>
            {inCart && (
              <button onClick={() => router.push('/carrito')} className="mt-3 w-full max-w-xs font-sans text-xs tracking-[0.3em] uppercase py-2 opacity-50 hover:opacity-100 transition-opacity" style={{ color: txtColor }}>
                Ver carrito →
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── ESCENA DEL BOLSO — recorte + motion graphics ──
         El 05 ya muestra el bolso (y sus beats) en el scrub de arriba; no lo
         repetimos aquí. */}
      {product.cutout && !isShowcase && (
        <ProductScene
          image={product.cutout}
          alt={`ACRO ${number}`}
          height="320vh"
          number={number}
          eyebrow={copy.es.tagline.split('.')[0]}
          beats={copy.es.tagline.split('.').map((s) => s.trim().toUpperCase()).filter(Boolean)}
          meta={`${price}€ · Hecho en Donostia`}
          accent={theme.accent}
          bgFrom={isDark ? bgColor : '#EFE8DA'}
          bgTo={isDark ? bgColor : '#E6D8BE'}
          textColor={isDark ? txtColor : '#241B12'}
        />
      )}

      {/* ── EL MUNDO — cita sobre la foto a sangre (parallax) ── */}
      <section data-tone="dark" className="relative w-full h-[100svh] overflow-hidden bg-ink">
        <Parallax speed={0.22} className="absolute inset-0 -top-[12%] h-[124%]">
          <Image src={shooting[0]} alt={`ACRO ${number}`} fill className="object-cover" sizes="100vw" priority />
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
          <p className="font-sans text-[9px] tracking-[0.6em] uppercase text-white/60 mb-6">El mundo del {number} / The world of {number}</p>
          <blockquote className="font-bebas text-[8vw] md:text-[5vw] leading-[0.95] text-white max-w-5xl">
            <Words text={copy.es.world} stagger={0.02} />
          </blockquote>
          <p className="font-sans text-sm leading-relaxed mt-6 max-w-lg italic text-white/45">{copy.en.world}</p>
        </div>
      </section>

      {/* ── LOOKBOOK ── Pliego editorial: una foto a sangre cada vez, cortina
         scrubbeada por scroll, contador. Sustituye al ConvergeScene, cuyas fotos
         volando desde los lados leían a recurso fácil y además montaban un
         segundo momento heroico que competía con el héroe de la página. */}
      {lookbook && lookbook.length > 1 && (
        <EditorialScene
          bg="#15120E"
          eyebrow={`Lookbook · ${number}`}
          images={lookbook.map((l) => l.src)}
          captions={lookbook.map((l) => l.caption)}
        />
      )}

      {/* ── FOTOS FIJAS — galería estática para apreciar el shooting ── */}
      {shooting.length > 3 && (
        <section className="px-2 md:px-3 pt-2 md:pt-3" style={{ backgroundColor: isDark ? bgColor : '#EFE8DA' }}>
          <MaskReveal from="bottom" className="mb-2 md:mb-3">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-center py-6" style={{ color: txtColor, opacity: 0.4 }}>
              El shooting · {number}
            </p>
          </MaskReveal>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {shooting.slice(0, shooting.length >= 6 ? 6 : 4).map((src, i) => (
              <div key={i} className="relative aspect-[4/5] overflow-hidden group">
                <Image
                  src={src}
                  alt={`ACRO ${number} lookbook ${i + 1}`}
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-[1.05]"
                  sizes="50vw"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DETALLES — fondo lleno, sin huecos ── */}
      <section data-tone={isDark ? 'dark' : 'light'} className="py-24 md:py-32 px-6 md:px-10" style={{ backgroundColor: detailBg }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
          <Reveal as="div">
            <p className="text-[9px] tracking-[0.5em] uppercase font-sans mb-8" style={{ color: txtColor, opacity: 0.4 }}>Descripción / Description</p>
            <p className="font-sans text-base md:text-lg leading-relaxed" style={{ color: txtColor, opacity: 0.85 }}>{copy.es.description}</p>
            <p className="font-sans text-sm leading-relaxed mt-4 italic" style={{ color: txtColor, opacity: 0.6 }}>{copy.en.description}</p>
          </Reveal>
          <Reveal as="div" delay={0.12}>
            <p className="text-[9px] tracking-[0.5em] uppercase font-sans mb-8" style={{ color: txtColor, opacity: 0.4 }}>Materiales / Materials</p>
            <ul className="space-y-4">
              {copy.es.details.map((d, i) => (
                <li key={i} className="font-sans text-sm md:text-base flex items-center gap-3" style={{ color: txtColor }}>
                  <span className="w-5 h-px flex-shrink-0" style={{ backgroundColor: theme.accent }} />
                  {d}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ────────────────────────── */}
      <section data-tone={isDark ? 'dark' : 'light'} className="py-28 md:py-36 px-6 flex flex-col items-center text-center" style={{ backgroundColor: bgColor, color: txtColor }}>
        <Reveal>
          <div className="unique-stamp inline-block mb-10" style={{ color: txtColor, borderColor: txtColor, opacity: 0.4 }}>Pieza Única · {sku}</div>
        </Reveal>
        <p className="font-bebas text-6xl md:text-8xl mb-2" style={{ color: txtColor }}>{price}€</p>
        <p className="font-sans text-xs mb-12" style={{ color: txtColor, opacity: 0.35 }}>
          {outOfStock ? 'Pieza agotada · Sold out' : 'Una sola unidad disponible · Only one available'}
        </p>
        <AddButton big />
      </section>

      <Footer />
    </>
  )
}
