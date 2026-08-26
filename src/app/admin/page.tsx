'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { products } from '@/lib/products'
import { finalPrice } from '@/lib/price'

type CatalogData = {
  stock: Record<string, number>
  prices: Record<string, number>
  discounts: Record<string, number>
}

type Saving = Record<string, boolean>
type Message = Record<string, { text: string; ok: boolean }>

export default function AdminPage() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [edits, setEdits] = useState<Record<string, { price: string; discount: string }>>({})
  const [saving, setSaving] = useState<Saving>({})
  const [messages, setMessages] = useState<Message>({})
  const router = useRouter()

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: CatalogData) => {
        setCatalog(data)
        const initial: typeof edits = {}
        for (const p of products) {
          initial[p.id] = {
            price: String(data.prices[p.id] ?? p.price),
            discount: String(data.discounts[p.id] ?? 0),
          }
        }
        setEdits(initial)
      })
      .catch(() => setCatalog({ stock: {}, prices: {}, discounts: {} }))
  }, [])

  function setMsg(id: string, text: string, ok = false) {
    setMessages((m) => ({ ...m, [id]: { text, ok } }))
    setTimeout(() => setMessages((m) => { const n = { ...m }; delete n[id]; return n }), 2500)
  }

  async function updateField(productId: string, body: object) {
    setSaving((s) => ({ ...s, [productId]: true }))
    const res = await fetch('/api/catalog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, ...body }),
    })
    if (res.ok) {
      const data = await res.json()
      setCatalog(data.catalog)
      setMsg(productId, 'Guardado', true)
    } else if (res.status === 401) {
      router.push('/admin/login')
    } else {
      const data = await res.json().catch(() => ({}))
      setMsg(productId, data.error || 'Error', false)
    }
    setSaving((s) => ({ ...s, [productId]: false }))
  }

  /* Todo agotado en UNA petición. Hacerlo producto a producto lanzaba varias
     escrituras a la vez sobre el mismo documento y unas pisaban a otras. */
  async function setAllStock(quantity: number) {
    setSaving((s) => ({ ...s, __all: true }))
    const res = await fetch('/api/catalog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantityForAll: quantity }),
    })
    if (res.ok) {
      const data = await res.json()
      setCatalog(data.catalog)
      setMsg('__all', quantity === 0 ? 'Todo agotado' : 'Actualizado', true)
    } else if (res.status === 401) {
      router.push('/admin/login')
    } else {
      const data = await res.json().catch(() => ({}))
      setMsg('__all', data.error || 'Error', false)
    }
    setSaving((s) => ({ ...s, __all: false }))
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-bebas text-[9px] tracking-[0.6em] uppercase text-white/25 mb-1">
              ACRO · Panel interno
            </p>
            <h1 className="font-bebas text-6xl text-white leading-none">GESTIÓN</h1>
          </div>
          <button
            onClick={handleLogout}
            className="font-sans text-xs text-white/30 hover:text-white/70 tracking-[0.2em] uppercase transition-colors"
          >
            Salir
          </button>
        </div>

        {!catalog ? (
          <p className="font-sans text-sm text-white/30 tracking-widest">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {/* Acciones sobre toda la colección */}
            <div className="flex items-center gap-3 pb-2">
              <button
                onClick={() => setAllStock(0)}
                disabled={saving.__all}
                className="font-sans text-[10px] tracking-[0.25em] uppercase text-white/50 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2 transition-all disabled:opacity-20"
              >
                {saving.__all ? 'Guardando...' : 'Marcar todo agotado'}
              </button>
              <button
                onClick={() => setAllStock(1)}
                disabled={saving.__all}
                className="font-sans text-[10px] tracking-[0.25em] uppercase text-white/50 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2 transition-all disabled:opacity-20"
              >
                Todo a 1
              </button>
              {messages.__all && (
                <span className={`font-sans text-[9px] tracking-widest ${messages.__all.ok ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                  {messages.__all.text}
                </span>
              )}
            </div>

            {products.map((p) => {
              const qty = catalog.stock[p.id] ?? 0
              const isOut = qty === 0
              const isSaving = saving[p.id]
              const msg = messages[p.id]
              const editPrice = parseFloat(edits[p.id]?.price ?? String(p.price))
              const editDiscount = parseFloat(edits[p.id]?.discount ?? '0')
              const computed = finalPrice(
                isNaN(editPrice) ? p.price : editPrice,
                isNaN(editDiscount) ? 0 : editDiscount
              )
              const hasDiscount = !isNaN(editDiscount) && editDiscount > 0

              return (
                <div key={p.id} className="border border-white/10 bg-white/[0.02] p-5 md:p-6">

                  {/* Top row: product info + status */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="font-bebas text-3xl text-white leading-none">{p.number}</span>
                        <span className="font-sans text-[10px] text-white/30 tracking-wide">
                          {p.copy.es.tagline.split('.')[0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {msg && (
                        <span className={`font-sans text-[9px] tracking-widest ${msg.ok ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                          {msg.text}
                        </span>
                      )}
                      {isSaving && (
                        <span className="font-sans text-[9px] text-white/25 tracking-widest">guardando...</span>
                      )}
                      <span className={`font-sans text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 border ${
                        isOut
                          ? 'text-red-400/80 border-red-400/30'
                          : 'text-emerald-400/80 border-emerald-400/30'
                      }`}>
                        {isOut ? 'Agotado' : 'Disponible'}
                      </span>
                    </div>
                  </div>

                  {/* Controls grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Stock */}
                    <div>
                      <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-white/25 mb-2">Stock</p>
                      <div className="flex items-center gap-0">
                        <button
                          onClick={() => updateField(p.id, { quantity: Math.max(0, qty - 1) })}
                          disabled={isSaving || qty === 0}
                          className="w-9 h-9 border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition-all font-sans text-lg flex items-center justify-center disabled:opacity-20"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-bebas text-2xl text-white select-none">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateField(p.id, { quantity: qty + 1 })}
                          disabled={isSaving}
                          className="w-9 h-9 border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition-all font-sans text-lg flex items-center justify-center disabled:opacity-20"
                        >
                          +
                        </button>
                        <button
                          onClick={() => updateField(p.id, { quantity: 0 })}
                          disabled={isSaving || qty === 0}
                          title="Agotar esta pieza"
                          className="ml-2 font-sans text-[10px] tracking-[0.25em] uppercase text-white/40 hover:text-white border border-white/15 hover:border-white/40 px-3 h-9 transition-all disabled:opacity-20"
                        >
                          Agotar
                        </button>
                      </div>
                    </div>

                    {/* Precio base */}
                    <div>
                      <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-white/25 mb-2">Precio base</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={edits[p.id]?.price ?? ''}
                          onChange={(e) =>
                            setEdits((ed) => ({ ...ed, [p.id]: { ...ed[p.id], price: e.target.value } }))
                          }
                          className="w-24 bg-transparent border border-white/15 text-white font-sans text-sm px-3 py-2 outline-none focus:border-white/50 transition-colors"
                        />
                        <span className="font-sans text-sm text-white/40">€</span>
                        <button
                          onClick={() => updateField(p.id, { price: parseFloat(edits[p.id]?.price) })}
                          disabled={isSaving || !edits[p.id]?.price}
                          className="font-sans text-[10px] tracking-widest uppercase text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 transition-all disabled:opacity-20"
                        >
                          OK
                        </button>
                      </div>
                    </div>

                    {/* Descuento */}
                    <div>
                      <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-white/25 mb-2">Descuento</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={edits[p.id]?.discount ?? ''}
                          onChange={(e) =>
                            setEdits((ed) => ({ ...ed, [p.id]: { ...ed[p.id], discount: e.target.value } }))
                          }
                          className="w-16 bg-transparent border border-white/15 text-white font-sans text-sm px-3 py-2 outline-none focus:border-white/50 transition-colors"
                        />
                        <span className="font-sans text-sm text-white/40">%</span>
                        <button
                          onClick={() => updateField(p.id, { discount: parseFloat(edits[p.id]?.discount ?? '0') })}
                          disabled={isSaving}
                          className="font-sans text-[10px] tracking-widest uppercase text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 transition-all disabled:opacity-20"
                        >
                          OK
                        </button>
                      </div>

                      {/* Precio final */}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-bebas text-xl text-white">{computed}€</span>
                        {hasDiscount && (
                          <span className="font-sans text-[9px] text-white/30 line-through">
                            {isNaN(editPrice) ? p.price : editPrice}€
                          </span>
                        )}
                        {hasDiscount && (
                          <span className="font-sans text-[9px] text-emerald-400/70 tracking-wide">
                            −{editDiscount}%
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-8 font-sans text-[9px] text-white/10 tracking-wide leading-relaxed">
          Stock 0 → fuera de stock en tienda. Los precios se aplican en el checkout.
        </p>
      </div>
    </div>
  )
}
