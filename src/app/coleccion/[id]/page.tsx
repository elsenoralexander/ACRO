'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { BuyBar } from '@/components/BuyBar'
import { ScrubBagScene } from '@/components/ScrubBagScene'
import { MotionBagScene } from '@/components/MotionBagScene'
import { EditorialScene } from '@/components/scenes'
import { Reveal, Parallax, Words } from '@/components/motion'
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
  // El layout ya da 404 a un id que no existe; esto solo estrecha el tipo.
  const product = getProduct(params.id as string)
  const { addItem, items } = useCart()
  const { getPrice, getStock, getState } = useCatalog()
  const [added, setAdded] = useState(false)
  const heroCtaRef = useRef<HTMLDivElement>(null)
  const endCtaRef = useRef<HTMLElement>(null)

  if (!product) return null

  const inCart = items.some((i) => i.product.id === product.id)
  const catalogStock = getStock(product.id)
  const outOfStock = catalogStock === 0
  const state = getState(product.id)
  // Sin stock: «Próximamente» con la tienda cerrada, «Vendida» con ella abierta.
  const sold = state === 'sold'
  const unavailableLabel = sold ? 'Vendida' : 'Próximamente'

  const { copy, theme, shooting, lookbook, closeups, price: basePrice, number } = product
  const price = getPrice(product.id, basePrice)
  const isDark = isDarkColor(theme.bg)
  const sku = `#${/^\d+$/.test(number) ? 'P' + number : number}-001`
  const heroImage = product.cutout ?? (isDark && product.images.dark ? product.images.dark : product.images.main)
  const name = copy.es.tagline.split('.')[0]
  // Portada con escena: clip scrubbeado (05, 06) o motion graphics sobre el
  // recorte (01–04). En las dos, los beats del tagline cruzan por encima.
  const scrub = product.scrub
  const stage = product.cutout ? product.stage : undefined
  const showcaseBeats = scrub || stage ? copy.es.tagline.split('.').map((s) => s.trim().toUpperCase()).filter(Boolean) : []

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const txtColor = theme.text
  const bgColor = theme.bg
  const detailBg = isDark ? '#0D121F' : '#E7DECB'
  const stampLabel = sold ? 'Vendida · Sold' : 'Pieza Única · One of a Kind'
  const shippingNote = 'IVA incluido · Envío gratis a España'

  // Una función y no un componente: declarado como <AddButton /> dentro del
  // render, React lo veía como un tipo nuevo en cada render, lo desmontaba y
  // la transición de «Añadir» a «✓ Añadido» no llegaba a verse nunca.
  const addButton = (big = false) =>
    outOfStock ? (
      <div
        className={`${big ? 'text-2xl py-5 px-14' : 'text-xl py-4 px-8 w-full max-w-xs'} font-bebas tracking-[0.2em] border-2 text-center select-none`}
        style={{ borderColor: txtColor, color: txtColor, opacity: 0.6 }}
      >
        {unavailableLabel}
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

  const cartLink = inCart && (
    <Link
      href="/carrito"
      className="mt-3 flex w-full max-w-xs items-center justify-center gap-2 font-sans text-xs tracking-[0.3em] uppercase py-2 opacity-60 hover:opacity-100 transition-opacity"
      style={{ color: txtColor }}
    >
      Ver carrito
      <svg aria-hidden="true" width="14" height="9" viewBox="0 0 16 10" fill="none">
        <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </Link>
  )

  // Panel de info/compra de las portadas con escena: ocupa la primera pantalla
  // y SCROLLEA sobre el fondo fijo; el velo viaja con el texto para mantener la
  // legibilidad. En las de motion graphics (`staged`) entra en cascada con el
  // bolso, y el velo móvil es más bajo: allí el bolso no va detrás del texto,
  // va encima, y el velo de los clips le tapaba el cuerpo.
  const heroPanel = (staged: boolean) => (
    <div
      data-tone={isDark ? 'dark' : 'light'}
      className="relative min-h-[100svh] flex flex-col justify-end md:justify-center md:items-end px-7 md:px-16 pb-12 md:pb-0"
    >
      {/* Velo con el bg del tema — móvil desde abajo, desktop desde la derecha.
         En móvil el bolso queda centrado detrás del texto (ver focusX), así
         que el velo tapa hasta la altura del sello; viaja con el panel y el
         bolso se descubre entero al bajar. */}
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background: staged
            ? `linear-gradient(to top, ${bgColor}F2, ${bgColor}CC 32%, transparent 54%)`
            : `linear-gradient(to top, ${bgColor}F7, ${bgColor}E0 38%, ${bgColor}8C 56%, transparent 74%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{ background: `linear-gradient(to left, ${bgColor}D9, ${bgColor}0D 55%, transparent)` }}
      />
      <div className={`relative flex flex-col w-full max-w-sm md:items-end md:text-right ${staged ? 'mg-cascade' : ''}`}>
        <div className="unique-stamp inline-block self-start md:self-end mb-6" style={{ color: txtColor, borderColor: txtColor, opacity: sold ? 0.85 : 0.65 }}>
          {stampLabel}
        </div>
        <h1 className="font-bebas text-7xl md:text-8xl leading-none" style={{ color: txtColor }}>
          <span className="sr-only">ACRO </span>
          {number}
        </h1>
        <p className="font-sans text-sm leading-relaxed mt-3 max-w-sm" style={{ color: txtColor, opacity: 0.75 }}>{copy.es.tagline}</p>
        <p lang="en" className="font-sans text-xs leading-relaxed mt-1 max-w-sm italic" style={{ color: txtColor, opacity: 0.6 }}>{copy.en.tagline}</p>
        <div className="mt-5 md:mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 md:flex-row-reverse">
          <span className="font-bebas text-5xl" style={{ color: txtColor }}>{price}€</span>
          <span className="font-sans text-xs" style={{ color: txtColor, opacity: 0.6 }}>{shippingNote}</span>
        </div>
        <div ref={heroCtaRef} className="mt-5 md:mt-6 w-full max-w-xs md:self-end">
          {addButton()}
        </div>
        {cartLink}
      </div>
      {/* Indicador de scroll */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 hidden md:flex">
        <span className="font-sans text-[9px] tracking-[0.5em] uppercase" style={{ color: txtColor, opacity: 0.55 }}>Scroll</span>
        <span className="block w-px h-10" style={{ backgroundColor: txtColor, opacity: 0.2 }} />
      </div>
    </div>
  )

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────
         05 y 06: clip scrubbeado a sangre completa con el panel de compra
         encima. 01–04: lo mismo, pero el «clip» es motion graphics en vivo
         sobre el recorte (MotionBagScene). Sin ninguno de los dos, el recorte
         sobre el color de su mundo. Esa es la
         única aparición del bolso entero en la portada: la vieja escena que lo
         repetía justo debajo durante tres pantallas se retiró (un solo
         clímax por página; el «de cerca» lo hacen los detalles reales). */}
      {scrub ? (
        <ScrubBagScene
          framePath={(i) => `${scrub.path}/frame_${String(i).padStart(4, '0')}.webp`}
          frameCount={scrub.frames}
          bg={bgColor}
          height={`${(1 + showcaseBeats.length) * 100}vh`}
          beats={showcaseBeats}
          meta={`${price}€ · Hecho en Donostia`}
          textColor={scrub.beatColor}
          focusX={scrub.focusX}
        >
          {heroPanel(false)}
        </ScrubBagScene>
      ) : stage && product.cutout ? (
        <MotionBagScene
          act={stage.act}
          cutout={product.cutout}
          size={stage.size}
          alt={`Bolso ACRO ${number} — ${name}`}
          number={number}
          bg={bgColor}
          accent={theme.accent}
          dark={isDark}
          sold={sold}
          height={`${(1 + showcaseBeats.length) * 100}vh`}
          beats={showcaseBeats}
          meta={`${price}€ · Hecho en Donostia`}
          textColor={stage.beatColor}
        >
          {heroPanel(true)}
        </MotionBagScene>
      ) : (
        <section
          data-tone={isDark ? 'dark' : 'light'}
          className="relative min-h-[100svh] md:min-h-screen flex flex-col md:flex-row items-center overflow-hidden"
          style={{ backgroundColor: bgColor, color: txtColor }}
        >
          <span aria-hidden="true" className="absolute right-0 bottom-0 font-bebas text-[40vw] leading-none select-none pointer-events-none" style={{ color: txtColor, opacity: 0.04 }}>
            {number}
          </span>

          {/* Móvil: el bolso, el precio y el botón caben en la primera pantalla —
             quien llega desde una story decide ahí. */}
          <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center pt-20 md:pt-0 px-10 md:px-16 md:min-h-screen">
            <Image
              src={heroImage}
              alt={`Bolso ACRO ${number} — ${name}`}
              width={620}
              height={760}
              sizes="(max-width: 768px) 80vw, 40vw"
              className={`animate-float h-[38svh] md:h-[68vh] w-auto object-contain drop-shadow-2xl ${sold ? 'grayscale opacity-60' : ''}`}
              priority
            />
          </div>

          <div className="relative z-10 w-full md:w-1/2 px-7 md:px-16 pt-6 pb-12 md:py-0 flex flex-col justify-center">
            <div className="unique-stamp inline-block self-start mb-5 md:mb-8" style={{ color: txtColor, borderColor: txtColor, opacity: sold ? 0.85 : 0.65 }}>
              {stampLabel}
            </div>
            <div className="flex items-end justify-between gap-4 md:block">
              <h1 className="font-bebas text-[22vw] md:text-[12vw] leading-[0.8]" style={{ color: txtColor }}>
                <span className="sr-only">ACRO </span>
                {number}
              </h1>
              {/* En móvil el precio sube a la línea del número; en escritorio va debajo. */}
              <span className="font-bebas text-5xl leading-none md:hidden" style={{ color: txtColor }}>{price}€</span>
            </div>
            <p className="font-sans text-sm leading-relaxed mt-4 max-w-sm" style={{ color: txtColor, opacity: 0.75 }}>{copy.es.tagline}</p>
            <p lang="en" className="font-sans text-xs leading-relaxed mt-1.5 max-w-sm italic" style={{ color: txtColor, opacity: 0.6 }}>{copy.en.tagline}</p>
            <div className="mt-8 hidden md:flex items-baseline gap-3">
              <span className="font-bebas text-5xl" style={{ color: txtColor }}>{price}€</span>
              <span className="font-sans text-xs" style={{ color: txtColor, opacity: 0.6 }}>{shippingNote}</span>
            </div>
            <div ref={heroCtaRef} className="mt-6 w-full max-w-xs">
              {addButton()}
            </div>
            <p className="mt-3 font-sans text-[11px] md:hidden" style={{ color: txtColor, opacity: 0.6 }}>{shippingNote}</p>
            {cartLink}
          </div>
        </section>
      )}

      {/* ── EL MUNDO — cita sobre la foto a sangre (parallax) ── */}
      <section data-tone="dark" className="relative w-full h-[100svh] overflow-hidden bg-ink">
        <Parallax speed={0.22} className="absolute inset-0 -top-[12%] h-[124%]">
          <Image src={shooting[0]} alt={`ACRO ${number}`} fill className="object-cover" sizes="(orientation: portrait) 140vh, 100vw" />
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
          <p className="font-sans text-[9px] tracking-[0.6em] uppercase text-white/60 mb-6">El mundo del {number} / The world of {number}</p>
          <blockquote className="font-bebas text-[8vw] md:text-[5vw] leading-[0.95] text-white max-w-5xl">
            <Words text={copy.es.world} stagger={0.02} />
          </blockquote>
          <p lang="en" className="font-sans text-sm leading-relaxed mt-6 max-w-lg italic text-white/60">{copy.en.world}</p>
        </div>
      </section>

      {/* ── LOOKBOOK ── Pliego editorial: una foto a sangre cada vez, cortina
         scrubbeada por scroll, contador. Es el clímax de la ficha. */}
      {lookbook && lookbook.length > 1 && (
        <EditorialScene
          bg="#15120E"
          eyebrow={`Lookbook · ${number}`}
          images={lookbook.map((l) => l.src)}
          captions={lookbook.map((l) => l.caption)}
        />
      )}

      {/* ── DE CERCA — el punto, el forro, los herrajes. Sustituye a la rejilla
         «El shooting», que repetía las fotos del lookbook y en táctil se quedaba
         en gris para siempre (el color solo volvía con hover). ── */}
      {closeups && closeups.length > 0 && (
        <section data-tone={isDark ? 'dark' : 'light'} className="px-6 md:px-10 pt-20 pb-16 md:pt-28 md:pb-24" style={{ backgroundColor: bgColor }}>
          <div className="max-w-6xl mx-auto">
            <p className="text-[9px] tracking-[0.5em] uppercase font-sans mb-8 md:mb-10" style={{ color: txtColor, opacity: 0.6 }}>
              De cerca / Up close
            </p>
            <div className={`grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-5 ${closeups.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {closeups.map((c, i) => {
                // Móvil: la primera a todo el ancho; con dos, las dos.
                const full = i === 0 || closeups.length === 2
                return (
                  <Reveal as="div" key={c.src} delay={i * 0.08} className={full ? 'col-span-2 md:col-span-1' : ''}>
                    <figure>
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={c.src}
                          alt={`ACRO ${number}, ${c.caption.toLowerCase()}`}
                          fill
                          className="object-cover"
                          sizes={`(max-width: 767px) ${full ? '100vw' : '50vw'}, ${closeups.length === 3 ? '33vw' : '50vw'}`}
                        />
                      </div>
                      <figcaption className="mt-3 font-sans text-[10px] tracking-[0.35em] uppercase" style={{ color: txtColor, opacity: 0.6 }}>
                        {c.caption}
                      </figcaption>
                    </figure>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── DETALLES — fondo lleno, sin huecos ── */}
      <section data-tone={isDark ? 'dark' : 'light'} className="py-24 md:py-32 px-6 md:px-10" style={{ backgroundColor: detailBg }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
          <Reveal as="div">
            <p className="text-[9px] tracking-[0.5em] uppercase font-sans mb-8" style={{ color: txtColor, opacity: 0.6 }}>Descripción / Description</p>
            <p className="font-sans text-base md:text-lg leading-relaxed" style={{ color: txtColor, opacity: 0.85 }}>{copy.es.description}</p>
            <p lang="en" className="font-sans text-sm leading-relaxed mt-4 italic" style={{ color: txtColor, opacity: 0.6 }}>{copy.en.description}</p>
          </Reveal>
          <Reveal as="div" delay={0.12}>
            <p className="text-[9px] tracking-[0.5em] uppercase font-sans mb-8" style={{ color: txtColor, opacity: 0.6 }}>Materiales / Materials</p>
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
      <section ref={endCtaRef} data-tone={isDark ? 'dark' : 'light'} className="py-28 md:py-36 px-6 flex flex-col items-center text-center" style={{ backgroundColor: bgColor, color: txtColor }}>
        <Reveal>
          <div className="unique-stamp inline-block mb-10" style={{ color: txtColor, borderColor: txtColor, opacity: 0.65 }}>
            {sold ? 'Vendida' : 'Pieza Única'} · {sku}
          </div>
        </Reveal>
        <p className="font-bebas text-6xl md:text-8xl mb-2" style={{ color: txtColor }}>{price}€</p>
        <p className="font-sans text-xs mb-12" style={{ color: txtColor, opacity: 0.6 }}>
          {outOfStock
            ? sold
              ? 'Pieza vendida · Sold'
              : 'Próximamente · Coming soon'
            : 'Una sola unidad disponible · Only one available'}
        </p>
        {addButton(true)}
      </section>

      <Footer />

      <BuyBar
        number={number}
        price={price}
        bg={bgColor}
        color={txtColor}
        enabled={state === 'available' || inCart}
        inCart={inCart}
        onAdd={handleAdd}
        startRef={heroCtaRef}
        endRef={endCtaRef}
      />
    </>
  )
}
