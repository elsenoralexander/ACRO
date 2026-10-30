import { Footer } from '@/components/Footer'
import { CollectionGrid } from '@/components/CollectionGrid'

export const metadata = {
  title: 'Colección — ACRO',
  description:
    'Bolsos de crochet tejidos a mano en Donostia, uno de cada. Cuando una pieza se vende, no vuelve.',
}

export default function ColeccionPage() {
  return (
    <>
      <CollectionGrid />
      <Footer />
    </>
  )
}
