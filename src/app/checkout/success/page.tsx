'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useCart } from '@/lib/cart'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
})

export default function SuccessPage() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-ink text-chalk flex flex-col items-center justify-center px-6 text-center"
    >
      <motion.div {...rise(0.1)}>
        <Image src="/images/logo-white.png" alt="ACRO" width={64} height={48} className="h-8 w-auto object-contain mb-16" />
      </motion.div>

      <motion.div {...rise(0.25)} className="unique-stamp border-chalk text-chalk mb-10">
        Pieza Única · Confirmada
      </motion.div>

      <motion.h1 {...rise(0.4)} className="font-bebas text-[12vw] md:text-7xl leading-none mb-6">
        GRACIAS
      </motion.h1>

      <motion.p {...rise(0.55)} className="font-sans text-sm text-chalk/50 max-w-sm leading-relaxed mb-3">
        Tu pieza ACRO está confirmada. Te enviaremos un correo con los detalles del envío.
      </motion.p>
      <motion.p {...rise(0.65)} className="font-sans text-xs text-chalk/30 max-w-sm leading-relaxed mb-16 italic">
        Your ACRO piece is confirmed. We will send you an email with shipping details.
      </motion.p>

      <motion.p {...rise(0.78)} className="font-sans text-xs text-chalk/20 max-w-xs leading-relaxed mb-12">
        Recuerda: esta era la única pieza. No habrá otra igual.
        <br />
        <em>Remember: this was the only piece. There will never be another like it.</em>
      </motion.p>

      <motion.div {...rise(0.9)}>
        <Link
          href="/coleccion"
          className="font-bebas text-xl tracking-[0.2em] border-2 border-chalk/30 text-chalk/60 px-10 py-4 hover:border-chalk hover:text-chalk transition-all duration-300"
        >
          Ver Colección
        </Link>
      </motion.div>
    </motion.div>
  )
}
