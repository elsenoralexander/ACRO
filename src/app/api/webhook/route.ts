import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCatalogForWrite, saveCatalog } from '@/lib/catalog'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    console.error('Webhook signature failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    console.log('✅ Venta completada:', session.id, session.customer_details?.email)

    if (session.payment_status === 'paid') {
      // Pieza pagada = pieza vendida: su stock pasa a 0 y la tienda la enseña
      // como «Vendida». Si falla, respondemos 500 para que Stripe lo reintente
      // (poner a 0 dos veces no hace daño).
      try {
        const ids = JSON.parse(session.metadata?.items ?? '[]') as string[]
        const catalog = await getCatalogForWrite()
        const alreadyGone = ids.filter((id) => (catalog.stock[id] ?? 0) <= 0)
        if (alreadyGone.length > 0) {
          console.error('⚠️ Pieza cobrada que ya estaba a 0 — revisar y devolver:', session.id, alreadyGone)
        }
        for (const id of ids) catalog.stock[id] = 0
        await saveCatalog(catalog)
      } catch (err) {
        console.error('No se pudo marcar como vendida:', session.id, err)
        return NextResponse.json({ error: 'No se pudo actualizar el stock' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
