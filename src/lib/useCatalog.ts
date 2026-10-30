'use client'

import { useEffect, useState } from 'react'
import { finalPrice } from './price'

type CatalogData = {
  stock: Record<string, number>
  prices: Record<string, number>
  discounts: Record<string, number>
  open?: boolean
}

/** Lo que la tienda puede decir de una pieza. «Vendida» solo con la tienda
    abierta: con ella cerrada, stock 0 significa que aún no ha salido. */
export type PieceState = 'available' | 'soon' | 'sold'

const cache: { data: CatalogData | null; ts: number } = { data: null, ts: 0 }
const TTL = 60_000 // 1 min

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogData | null>(cache.data)

  useEffect(() => {
    if (cache.data && Date.now() - cache.ts < TTL) {
      setCatalog(cache.data)
      return
    }
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d: CatalogData) => {
        cache.data = d
        cache.ts = Date.now()
        setCatalog(d)
      })
      .catch(() => {})
  }, [])

  function getPrice(productId: string, basePrice: number): number {
    if (!catalog) return basePrice
    const price = catalog.prices[productId] ?? basePrice
    const discount = catalog.discounts[productId] ?? 0
    return finalPrice(price, discount)
  }

  function getStock(productId: string): number | null {
    if (!catalog) return null
    return catalog.stock[productId] ?? 0
  }

  function getState(productId: string): PieceState | null {
    if (!catalog) return null
    if ((catalog.stock[productId] ?? 0) > 0) return 'available'
    return catalog.open ? 'sold' : 'soon'
  }

  /** Línea de inventario de la home y la colección; null hasta tener datos. */
  function summary(ids: string[]): string | null {
    if (!catalog) return null
    const n = (k: PieceState) => ids.filter((id) => getState(id) === k).length
    const available = n('available')
    const plural = (c: number, one: string, many: string) => `${c} ${c === 1 ? one : many}`
    if (!catalog.open) {
      return available > 0
        ? `${plural(available, 'disponible', 'disponibles')} · ${n('soon')} próximamente`
        : 'Próximamente · Coming soon'
    }
    const sold = n('sold')
    return `${plural(available, 'disponible', 'disponibles')}${sold > 0 ? ` · ${plural(sold, 'vendida', 'vendidas')}` : ''}`
  }

  return { catalog, getPrice, getStock, getState, summary }
}
