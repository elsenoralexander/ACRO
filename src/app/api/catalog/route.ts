import { NextRequest, NextResponse } from 'next/server'
import { getCatalog, getCatalogForWrite, saveCatalog } from '@/lib/catalog'
import { verifyAdminToken, COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const catalog = await getCatalog()
  return NextResponse.json(catalog)
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json() as {
    productId?: string
    quantity?: number
    price?: number
    discount?: number
    /** Pone ESA cantidad en todos los productos, en una sola escritura. */
    quantityForAll?: number
  }

  const { productId, quantity, price, discount, quantityForAll } = body

  if (!productId && quantityForAll === undefined) {
    return NextResponse.json({ error: 'productId requerido' }, { status: 400 })
  }

  // Estricta a propósito: si el estado real no se puede leer, no se escribe.
  let catalog
  try {
    catalog = await getCatalogForWrite()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/catalog] lectura previa fallida, no se escribe:', msg)
    return NextResponse.json({ error: 'No se pudo leer el catálogo; no se ha guardado nada' }, { status: 503 })
  }

  // Masivo: una única lectura-escritura en vez de N peticiones compitiendo.
  if (quantityForAll !== undefined) {
    if (typeof quantityForAll !== 'number' || quantityForAll < 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }
    for (const id of Object.keys(catalog.stock)) {
      catalog.stock[id] = Math.floor(quantityForAll)
    }
  }

  if (productId && quantity !== undefined) {
    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }
    catalog.stock[productId] = Math.floor(quantity)
  }

  if (productId && price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }
    catalog.prices[productId] = price
  }

  if (productId && discount !== undefined) {
    if (typeof discount !== 'number' || discount < 0 || discount > 100) {
      return NextResponse.json({ error: 'Descuento inválido (0-100)' }, { status: 400 })
    }
    catalog.discounts[productId] = discount
  }

  try {
    await saveCatalog(catalog)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/catalog] PUT error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true, catalog })
}
