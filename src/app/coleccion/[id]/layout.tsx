import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduct, products } from '@/lib/products'

/* La ficha es un componente de cliente (stock, carrito, escenas), así que su
   metadata vive aquí. Es lo que se ve al pegar el enlace en Instagram o en un
   WhatsApp: el número de la pieza, su frase y su foto de campaña. */

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }))
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const product = getProduct(params.id)
  if (!product) return {}
  const { number, copy, shooting } = product
  const title = `ACRO ${number} — ${copy.es.tagline.split('.')[0]}`
  const description = `${copy.es.tagline} Pieza única tejida a mano en Donostia.`
  // Pasada por el optimizador a 1200 px: el original pesa ~1 MB y WhatsApp
  // descarta la vista previa con imágenes tan grandes.
  const image = `/_next/image?url=${encodeURIComponent(shooting[0])}&w=1200&q=75`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: [{ url: image }] },
  }
}

export default function ProductLayout({ params, children }: { params: { id: string }; children: React.ReactNode }) {
  // Un id que no existe es un 404 de verdad, no una página en blanco que redirige.
  if (!getProduct(params.id)) notFound()
  return children
}
