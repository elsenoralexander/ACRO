import type { Metadata } from 'next'
import { Showcase } from '@/components/Showcase'

export const metadata: Metadata = {
  title: 'ACRO — Bolsos tejidos a mano en Donostia',
  description:
    'Bolsos de crochet tejidos a mano en Donostia. Existe uno de cada: cuando se vende, no vuelve.',
  openGraph: {
    title: 'ACRO — Bolsos tejidos a mano en Donostia',
    description: 'Existe uno de cada: cuando se vende, no vuelve.',
    type: 'website',
  },
}

/* La home es el lienzo: las piezas sueltas sobre la mesa, sin escaparate.
   El manifiesto, el pliego editorial y la escena del POP que vivían aquí
   salen de la home y se recolocan al auditar /coleccion. */
export default function Home() {
  return <Showcase />
}
