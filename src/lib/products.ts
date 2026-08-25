export type Product = {
  id: string
  number: string
  price: number
  stripeProductId?: string
  images: {
    main: string
    dark?: string
    views: string[]
  }
  cutout?: string // high-def transparent PNG for the motion-graphics scene
  /** Scroll-scrubbed hero clip (frames in public/scrub/<id>). Presence = showcase PDP. */
  scrub?: {
    path: string // e.g. '/scrub/06'
    frames: number
    /** Colour for the narrative beats over the clip. */
    beatColor: string
  }
  shooting: string[]
  copy: {
    es: {
      tagline: string
      description: string
      details: string[]
      world: string
    }
    en: {
      tagline: string
      description: string
      details: string[]
      world: string
    }
  }
  theme: {
    bg: string
    text: string
    accent: string
  }
}

export const products: Product[] = [
  {
    id: '01',
    number: '01',
    price: 120,
    images: {
      main: '/images/product-01.png',
      views: ['/images/product-01.png'],
    },
    cutout: '/spin/cutout-01.png',
    shooting: [
      '/images/shoot-01-1.jpg',
      '/images/shoot-01-2.jpg',
      '/images/shoot-01-3.jpg',
      '/images/shoot-01-4.jpg',
      '/images/shoot-01-5.jpg',
    ],
    copy: {
      es: {
        tagline: 'Piedras únicas. Hilo natural. Una sola vez.',
        description:
          'Tejida a mano, punto a punto, con piedras recogidas en la costa vasca. No hay catálogo. No hay serie. Esta pieza existe una vez.',
        details: [
          'Hilo de algodón natural',
          'Piedras únicas de la costa vasca',
          'Asa de cuerda trenzada',
          'Interior en tela forrada',
          'Hecho en Donostia',
        ],
        world:
          'El 01 nace del mar. De la luz que rebota en el Cantábrico en agosto, de los guijarros pulidos por siglos de ola. Cada piedra es irrepetible — como la pieza que la sostiene.',
      },
      en: {
        tagline: 'Unique stones. Natural yarn. Just once.',
        description:
          'Woven by hand, stitch by stitch, with stones gathered on the Basque coast. No catalogue. No series. This piece exists once.',
        details: [
          'Natural cotton yarn',
          'Unique stones from the Basque coast',
          'Braided rope handle',
          'Lined fabric interior',
          'Made in Donostia',
        ],
        world:
          'The 01 is born from the sea. From the light bouncing off the Cantabrian in August, from pebbles smoothed by centuries of waves. Each stone is unrepeatable — like the piece that holds it.',
      },
    },
    theme: {
      bg: '#F5EFE0',
      text: '#1A1208',
      accent: '#C8A96E',
    },
  },
  {
    id: '02',
    number: '02',
    price: 210,
    images: {
      main: '/images/product-02.png',
      views: ['/images/product-02.png'],
    },
    cutout: '/spin/cutout-02.png',
    shooting: [
      '/images/shoot-02-1.jpg',
      '/images/shoot-02-2.jpg',
      '/images/shoot-02-3.jpg',
      '/images/shoot-02-4.jpg',
      '/images/shoot-02-5.jpg',
      '/images/shoot-02-6.jpg',
    ],
    copy: {
      es: {
        tagline: 'Metal frío. Interior naranja. Una declaración.',
        description:
          'Exterior plateado. Hardware metálico. Interior naranja quemado. Esta pieza no necesita contexto. La llevas con Off-White, con LV, con Corteiz — o con lo que te dé la gana.',
        details: [
          'Hilo plateado tejido a mano',
          'Cadena metálica',
          'Interior en cuero sintético naranja',
          'Abalorios metálicos cosidos a mano',
          'Placa y llavero ACRO',
          'Cierre de cremallera',
          'Hecho en Donostia',
        ],
        world:
          'El 02 es la contradicción hecha objeto. Metal frío, hilo plateado, naranja quemado. Lo que las máquinas no pueden hacer — y el mercado no puede duplicar.',
      },
      en: {
        tagline: 'Cold metal. Orange interior. A statement.',
        description:
          'Silver exterior. Metal hardware. Burnt orange interior. This piece needs no context. Wear it with Off-White, LV, Corteiz — or whatever you want.',
        details: [
          'Silver yarn woven by hand',
          'Metal chain',
          'Orange synthetic leather interior',
          'Hand-sewn metallic beads',
          'ACRO plate and keyring',
          'Zip closure',
          'Made in Donostia',
        ],
        world:
          'The 02 is contradiction made object. Cold metal, silver yarn, burnt orange. What machines cannot make — and the market cannot duplicate.',
      },
    },
    theme: {
      bg: '#0A0A0A',
      text: '#F5F5F0',
      accent: '#C0C0C0',
    },
  },
  {
    id: '03',
    number: '03',
    price: 165,
    images: {
      main: '/images/product-03-white.png',
      dark: '/images/product-03-dark.png',
      views: ['/images/product-03-white.png'],
    },
    cutout: '/spin/cutout-03.png',
    shooting: [
      '/images/shoot-03-1.png',
      '/images/shoot-03-2.png',
      '/images/shoot-03-3.png',
      '/images/shoot-03-4.png',
      '/images/shoot-03-5.png',
      '/images/shoot-03-6.png',
    ],
    copy: {
      es: {
        tagline: 'Acero gris. Noche. Sin excusas.',
        description:
          'Tejida a mano en hilo metálico plateado. Formato shoulder — compacta, densa, presente. Esta bolsa no pide permiso. Va donde tú vas: la barra, la pista, la madrugada.',
        details: [
          'Hilo metálico plateado tejido a mano',
          'Asa shoulder con nudo trenzado',
          'Interior forrado',
          'Cierre de cremallera oculta',
          'Placa ACRO',
          'Hecho en Donostia',
        ],
        world:
          'El 03 nació de noche. De la luz que rebota en una copa, del ruido de fondo de un rooftop, de ese momento en que la música sube y tú ya sabes que va a ser una buena noche. Acero y hilo. Nada más.',
      },
      en: {
        tagline: 'Steel grey. Night. No excuses.',
        description:
          'Hand-woven in metallic silver yarn. Shoulder format — compact, dense, present. This bag asks for nothing. It goes where you go: the bar, the floor, the early hours.',
        details: [
          'Metallic silver yarn woven by hand',
          'Shoulder strap with braided knot',
          'Lined interior',
          'Hidden zip closure',
          'ACRO plate',
          'Made in Donostia',
        ],
        world:
          'The 03 was born at night. From light bouncing off a glass, the background noise of a rooftop, that moment when the music rises and you already know it\'s going to be a good night. Steel and yarn. Nothing more.',
      },
    },
    theme: {
      bg: '#0A0F1E',
      text: '#E4E8EF',
      accent: '#8B9EB7',
    },
  },
  {
    id: '04',
    number: 'POP',
    price: 175,
    images: {
      main: '/images/product-04.png',
      views: [
        '/images/product-04.png',
        '/images/product-04-detail-1.jpg',
        '/images/product-04-detail-2.jpg',
      ],
    },
    cutout: '/spin/pop-cutout.png',
    shooting: [
      '/images/shoot-04-1.jpg',
      '/images/shoot-04-2.jpg',
      '/images/shoot-04-3.jpg',
      '/images/shoot-04-4.jpg',
      '/images/shoot-04-5.jpg',
      '/images/shoot-04-6.jpg',
      '/images/shoot-04-7.jpg',
      '/images/shoot-04-8.jpg',
    ],
    copy: {
      es: {
        tagline: 'Cacao tejido. Cuentas de oro. Hora dorada.',
        description:
          'Tejida a mano en hilo color cacao, punto a punto. Asa de cuentas doradas que captan la luz a cada paso. Formato shoulder, compacto, contundente. El POP no grita — brilla. Llévalo donde la luz sea buena.',
        details: [
          'Hilo color cacao tejido a mano',
          'Asa de cuentas doradas sobre cordón',
          'Placa ACRO en dorado',
          'Cierre de cremallera oculta',
          'Interior forrado',
          'Hecho en Donostia',
        ],
        world:
          'El POP nació para la hora dorada. Para los callejones de piedra, el lino tostado, esa luz que cae lenta sobre la Toscana al atardecer. Cacao y oro — el contraste exacto entre tierra y brillo. Cada cuenta atrapa el sol una vez.',
      },
      en: {
        tagline: 'Woven cocoa. Gold beads. Golden hour.',
        description:
          'Hand-woven in cocoa yarn, stitch by stitch. A gold-beaded strap that catches the light with every step. Shoulder format — compact, present. The POP does not shout — it glows. Wear it where the light is good.',
        details: [
          'Hand-woven cocoa-coloured yarn',
          'Gold-beaded strap on cord',
          'Gold ACRO plate',
          'Hidden zip closure',
          'Lined interior',
          'Made in Donostia',
        ],
        world:
          'The POP was born for golden hour. For stone alleys, toasted linen, that slow light falling over Tuscany at dusk. Cocoa and gold — the exact contrast between earth and shine. Each bead catches the sun once.',
      },
    },
    theme: {
      bg: '#E9E0D1',
      text: '#2A2018',
      accent: '#C2A24E',
    },
  },
  {
    id: '05',
    number: '05',
    price: 145,
    images: {
      main: '/images/product-05.jpg',
      views: [
        '/images/product-05.jpg',
        '/images/product-05-detail-1.jpg',
        '/images/product-05-detail-2.jpg',
      ],
    },
    cutout: '/spin/cutout-05.png',
    shooting: [
      '/images/shoot-05-1.jpg',
      '/images/shoot-05-2.jpg',
      '/images/shoot-05-3.jpg',
      '/images/shoot-05-4.jpg',
      '/images/shoot-05-5.jpg',
      '/images/shoot-05-6.jpg',
      '/images/shoot-05-7.jpg',
    ],
    copy: {
      es: {
        tagline: 'Margaritas tejidas. Lino crudo. Campo abierto.',
        description:
          'Tejida a mano, flor a flor, en hilo de algodón color crudo. Margaritas de crochet en relieve sobre un cuerpo forrado de lino. Formato tote — amplio, ligero, de luz. El 05 no es para la ciudad. Es para el campo, la hora dorada, el camino largo entre flores.',
        details: [
          'Hilo de algodón natural color crudo',
          'Flores de crochet en relieve, hechas a mano',
          'Asas trenzadas a mano',
          'Interior forrado en lino',
          'Cierre de cremallera dorada',
          'Placa ACRO',
          'Hecho en Donostia',
        ],
        world:
          'El 05 nació en un campo de flores silvestres al atardecer. De la luz que se cuela entre los tallos, del encaje de la reina Ana, de ese verano lento que no tiene prisa. Cada margarita está tejida a mano — como las que crecen, una a una, sin molde.',
      },
      en: {
        tagline: 'Woven daisies. Raw linen. Open field.',
        description:
          'Hand-woven, flower by flower, in natural ecru cotton yarn. Raised crochet daisies over a linen-lined body. Tote format — roomy, light, full of air. The 05 is not for the city. It is for the field, the golden hour, the long walk through flowers.',
        details: [
          'Natural ecru cotton yarn',
          'Raised crochet flowers, handmade',
          'Hand-braided straps',
          'Linen-lined interior',
          'Gold zip closure',
          'ACRO plate',
          'Made in Donostia',
        ],
        world:
          "The 05 was born in a field of wildflowers at dusk. From the light slipping between the stems, from Queen Anne's lace, from that slow summer in no hurry. Each daisy is woven by hand — like the ones that grow, one by one, with no mould.",
      },
    },
    scrub: {
      path: '/scrub/05',
      frames: 90,
      beatColor: '#5A4632',
    },
    theme: {
      bg: '#EFEADD',
      text: '#2A2417',
      accent: '#8F9779',
    },
  },
  {
    id: '06',
    number: '06',
    price: 135,
    images: {
      main: '/images/product-06.jpg',
      views: ['/images/product-06.jpg', '/images/product-06-detail-1.jpg'],
    },
    shooting: [
      '/images/shoot-06-1.jpg',
      '/images/shoot-06-2.jpg',
      '/images/shoot-06-3.jpg',
      '/images/shoot-06-4.jpg',
      '/images/shoot-06-5.jpg',
      '/images/shoot-06-6.jpg',
      '/images/shoot-06-7.jpg',
    ],
    copy: {
      es: {
        tagline: 'Oliva tejida a mano. Flecos al aire. Guarda tu noche.',
        description:
          'El Bohemian está tejido a mano en trapillo de algodón verde oliva — punto grueso que se ve y se toca. Flecos anudados uno a uno, rematados con cuentas de cerámica, y herrajes en oro rosa. La correa trenzada se quita: bandolera de día, de mano por la noche. Nació para el festival — polvo, oro y la última luz de la tarde.',
        details: [
          'Trapillo de algodón verde oliva',
          'Flecos anudados a mano con cuentas de cerámica',
          'Asa integrada en el cuerpo del bolso',
          'Correa trenzada extraíble',
          'Anillas y placa en oro rosa',
          'Cierre magnético',
          'Hecho en Donostia',
        ],
        world:
          'El Bohemian nació en la explanada de un festival, a la hora en que el polvo se vuelve oro. Del punto grueso que aguanta el día entero y de los flecos que bailan solos con la música. Se abre y lo enseña todo: lo que guarda es tu noche.',
      },
      en: {
        tagline: 'Hand-woven olive. Fringe in the air. It keeps your night.',
        description:
          'The Bohemian is hand-woven in olive-green cotton t-shirt yarn — a chunky stitch you can see and touch. Fringe knotted strand by strand, finished with ceramic beads, and rose-gold hardware. The braided strap comes off: crossbody by day, handheld by night. Born for the festival — dust, gold and the last light of the day.',
        details: [
          'Olive-green cotton t-shirt yarn',
          'Hand-knotted fringe with ceramic beads',
          'Handle worked into the body of the bag',
          'Detachable braided strap',
          'Rose-gold rings and plate',
          'Magnetic closure',
          'Made in Donostia',
        ],
        world:
          'The Bohemian was born on a festival field, at the hour when dust turns to gold. From the chunky stitch that lasts the whole day and the fringe that dances to the music on its own. It opens up and shows everything: what it keeps is your night.',
      },
    },
    scrub: {
      path: '/scrub/06',
      frames: 90,
      beatColor: '#4F4733',
    },
    theme: {
      bg: '#E3DAC2',
      text: '#2B2A1E',
      accent: '#B98A68',
    },
  },
]

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}
