import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { CartItem } from '@/lib/cart'
import { getCatalog, finalPrice } from '@/lib/catalog'
import { getProduct, type Product } from '@/lib/products'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: CartItem[] } = await req.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 })
    }

    // Del carrito solo nos fiamos del id: el producto, el precio y la cantidad
    // salen del servidor. Cada pieza existe una vez, así que va una de cada.
    const ids = Array.from(new Set(items.map((i) => i.product?.id).filter((id): id is string => typeof id === 'string')))
    const pieces = ids.map((id) => getProduct(id)).filter((p): p is Product => p !== undefined)
    if (pieces.length !== ids.length) {
      return NextResponse.json({ error: 'Hay una pieza que no existe en la colección' }, { status: 400 })
    }

    // Always use server-side prices — never trust client
    const catalog = await getCatalog()

    // Sin esta comprobación, una pieza ya vendida (o que aún no ha salido) se
    // podía pagar con un carrito guardado de antes. La segunda venta de una
    // pieza única no tiene arreglo: solo devolución.
    const unavailable = pieces.filter((p) => (catalog.stock[p.id] ?? 0) <= 0)
    if (unavailable.length > 0) {
      const names = unavailable.map((p) => `ACRO ${p.number}`).join(', ')
      return NextResponse.json(
        {
          error: `${names} ya no está disponible. Quítala del carrito para seguir.`,
          unavailable: unavailable.map((p) => p.id),
        },
        { status: 409 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const lineItems = pieces.map((product) => {
      const basePrice = catalog.prices[product.id] ?? product.price
      const discount = catalog.discounts[product.id] ?? 0
      const unitPrice = finalPrice(basePrice, discount)
      const serial = /^\d+$/.test(product.number) ? `P${product.number}` : product.number

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `ACRO ${product.number} — Pieza Única`,
            description: product.copy.es.tagline,
            images: [`${baseUrl}${product.images.main}`],
            metadata: {
              productId: product.id,
              serial: `#${serial}-001`,
            },
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: 1,
      }
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/carrito`,
      locale: 'es',
      // La ficha promete «Envío gratis a España»: el pago no puede aceptar más.
      shipping_address_collection: {
        allowed_countries: ['ES'],
      },
      metadata: {
        items: JSON.stringify(pieces.map((p) => p.id)),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Stripe error:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
