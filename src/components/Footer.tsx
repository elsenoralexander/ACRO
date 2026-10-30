import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer data-tone="dark" className="bg-ink text-chalk border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col gap-4">
          <Image
            src="/images/logo-white.png"
            alt="ACRO"
            width={56}
            height={42}
            className="h-7 w-auto object-contain"
          />
          <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs">
            Hecho a mano, uno a uno, en Donostia.
            <br />
            Una pieza. Una vez.
          </p>
        </div>

        <nav className="flex flex-col gap-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-white/55 mb-1">Navegar</span>
          {[
            { href: '/', label: 'Inicio' },
            { href: '/coleccion', label: 'Colección' },
            { href: '/carrito', label: 'Carrito' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-white/60 hover:text-white transition-colors tracking-wider uppercase font-sans py-1.5"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-white/55 mb-1">Contacto</span>
          <a
            href="mailto:hola@acro.es"
            className="text-xs text-white/60 hover:text-white transition-colors font-sans py-1.5"
          >
            hola@acro.es
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ACRO en Instagram, @acro_donostia"
            className="text-xs text-white/60 hover:text-white transition-colors font-sans py-1.5"
          >
            @acro_donostia
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 md:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-[10px] text-white/55 tracking-widest font-sans">
          © {new Date().getFullYear()} ACRO · DONOSTIA
        </p>
        <p className="text-[10px] text-white/55 tracking-widest font-sans uppercase">
          Cada pieza, única
        </p>
      </div>
    </footer>
  )
}
