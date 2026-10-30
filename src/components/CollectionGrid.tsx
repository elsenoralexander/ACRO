'use client'

import Image from 'next/image'
import Link from 'next/link'
import { products } from '@/lib/products'
import { useCatalog } from '@/lib/useCatalog'
import { Reveal, MaskReveal, Words } from '@/components/motion'

/* /coleccion — la lista ordenada, la salida tranquila del lienzo de la home.
   Aquí no hay clímax: cuadrícula, aire y la pieza grande. El color del mundo
   de cada bolso aparece al pasar el ratón; en táctil está siempre, porque si
   no la clienta del móvil no lo vería nunca. */
export function CollectionGrid() {
  const { getPrice, getState, summary } = useCatalog()
  const inventory = summary(products.map((p) => p.id))

  return (
    <div className="bg-white text-ink pt-32 md:pt-40 pb-24 px-6 md:px-10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Entrada: el manifiesto que antes abría la home. */}
        <div className="mb-16 md:mb-24">
          <Reveal>
            <p className="text-[9px] tracking-[0.6em] uppercase text-ink/60 font-sans mb-5">Colección / Collection</p>
          </Reveal>
          <h1 className="font-bebas text-[16vw] md:text-[9vw] leading-[0.82] text-ink">
            <Words text="PIEZAS" />
            <br />
            <span className="text-ink/15">
              <Words text="ÚNICAS" delay={0.12} />
            </span>
          </h1>
          <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-16 max-w-3xl">
            <Reveal as="div" delay={0.15}>
              <p className="font-sans text-sm text-ink/70 leading-relaxed">
                No hay fábrica. No hay serie. Existe una, y cuando se va, no vuelve. Cada pieza sale de las mismas
                manos, una a una, en Donostia.
              </p>
            </Reveal>
            <Reveal as="div" delay={0.25}>
              <p lang="en" className="font-sans text-sm text-ink/60 leading-relaxed italic">
                No factory. No series. There is one, and when it goes, it does not return. Each piece comes from the
                same hands, one by one, in Donostia.
              </p>
            </Reveal>
          </div>
          {inventory && (
            <Reveal delay={0.3}>
              <p className="mt-10 font-sans text-[10px] tracking-[0.3em] uppercase text-ink/60">{inventory}</p>
            </Reveal>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 md:gap-y-28">
          {products.map((p, i) => {
            const state = getState(p.id)
            const sold = state === 'sold'
            const price = getPrice(p.id, p.price)
            const name = p.copy.es.tagline.split('.')[0]
            return (
              <Link
                key={p.id}
                href={`/coleccion/${p.id}`}
                data-cursor="view"
                aria-label={`ACRO ${p.number}, ${name}, ${sold ? 'vendida' : state === 'soon' ? `próximamente, ${price} euros` : `${price} euros`}`}
                className={`press group block focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink/40 ${
                  i % 2 === 1 ? 'md:mt-24' : ''
                }`}
              >
                <MaskReveal from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.08} className="relative aspect-[4/5] overflow-hidden">
                  {/* El color del mundo de la pieza: hover/foco en escritorio, siempre en táctil. */}
                  {!sold && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 scale-[0.97] opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 [@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100 transition-[transform,opacity] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ backgroundColor: p.theme.bg }}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center font-bebas text-[34vw] md:text-[18vw] select-none pointer-events-none leading-none text-ink/[0.05]"
                  >
                    {p.number}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src={p.cutout ?? p.images.main}
                      alt=""
                      width={620}
                      height={760}
                      sizes="(max-width: 768px) 70vw, 30vw"
                      className={`relative z-10 h-[72%] w-auto max-w-[80%] object-contain drop-shadow-xl transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        sold ? 'grayscale opacity-50' : 'group-hover:scale-[1.06] group-focus-visible:scale-[1.06]'
                      }`}
                    />
                  </div>
                  {sold && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <span className="unique-stamp bg-white text-ink">Vendida · Sold</span>
                    </div>
                  )}
                </MaskReveal>

                <div className="mt-4 flex items-baseline gap-4 border-t border-ink/10 pt-4">
                  <span className="font-bebas text-3xl text-ink leading-none">{p.number}</span>
                  <span className="flex-1 truncate font-sans text-[10px] tracking-[0.3em] uppercase text-ink/60 transition-colors duration-300 group-hover:text-ink">
                    {name}
                  </span>
                  <span className={`font-bebas text-2xl leading-none ${sold ? 'text-ink/40' : 'text-ink'}`}>
                    {sold ? 'Vendida' : `${price}€`}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
