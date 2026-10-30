/* El tablero de la home: un plano de 5×5 celdas que se repite en las dos
   direcciones. Cada bolso forma un barrio con sus fotos de campaña (mar, metal,
   club, Toscana, campo, festival), así que arrastrar es viajar de un mundo a
   otro. Las celdas de los recortes están elegidas para quedar lo más lejos
   posible entre sí sobre el toro (mínimo 1,8 celdas): ninguna pantalla junta
   dos bolsos y ninguna se queda sin ninguno.

   Las filas impares van desplazadas media celda: rompe la cuadrícula sin
   perder la garantía de que nada se solapa (cada pieza vive dentro de su celda).

   Unidades: todo en celdas. El componente decide cuántos píxeles mide una. */

export const BOARD = { cols: 5, rows: 5 } as const

/** Hueco mínimo entre una pieza y el borde de su celda, y alto de su etiqueta. */
export const CELL_GAP = 0.07
export const LABEL_H = 0.1

type Base = {
  /** [fila, columna] */
  cell: [number, number]
  /** Lado mayor de la pieza, en celdas. */
  size: number
  /** Desplazamiento dentro del hueco libre de la celda, de -1 a 1 en cada eje. */
  jitter: [number, number]
  /** Profundidad para el parallax del arrastre: 1 delante, -1 al fondo. */
  depth: number
}

export type ShowcaseItem =
  | (Base & { kind: 'bag'; productId: string; src: string; w: number; h: number })
  | (Base & { kind: 'photo'; productId: string; src: string; w: number; h: number; caption: string })
  | (Base & { kind: 'type'; lines: [string, string]; en: string })

const bag = (productId: string, w: number, h: number, cell: [number, number], size: number, jitter: [number, number]): ShowcaseItem => ({
  kind: 'bag', productId, src: `/cutouts/${productId}.png`, w, h, cell, size, jitter, depth: 1,
})

const photo = (
  productId: string,
  file: string,
  w: number,
  h: number,
  caption: string,
  cell: [number, number],
  size: number,
  jitter: [number, number],
  depth = 0.35,
): ShowcaseItem => ({
  kind: 'photo', productId, src: `/images/${file}`, w, h, caption, cell, size, jitter, depth,
})

export const ITEMS: ShowcaseItem[] = [
  // ── fila 0
  photo('01', 'shoot-01-1.jpg', 2048, 2048, 'El callejón', [0, 0], 0.6, [-0.5, 0.7]),
  photo('01', 'shoot-01-4.jpg', 2048, 2048, 'Frente al mar', [0, 1], 0.74, [0.4, -0.6], 0.55),
  photo('02', 'shoot-02-1.jpg', 2048, 2048, 'El pasillo', [0, 2], 0.5, [-0.3, 0.9]),
  photo('02', 'shoot-02-6.jpg', 2048, 2048, 'Naranja quemado', [0, 3], 0.72, [0.6, 0.2], 0.55),
  bag('03', 986, 1600, [0, 4], 0.84, [0, 0]),
  // ── fila 1 (desplazada)
  bag('01', 798, 1370, [1, 0], 0.84, [0.2, 0]),
  { kind: 'type', lines: ['NO HAY', 'FÁBRICA.'], en: 'No factory.', cell: [1, 1], size: 0.84, jitter: [0, -0.4], depth: -0.8 },
  bag('02', 1045, 1364, [1, 2], 0.84, [-0.2, 0]),
  photo('02', 'shoot-02-4.jpg', 2048, 2048, 'La espera', [1, 3], 0.6, [0.5, -0.7]),
  photo('03', 'shoot-03-3.jpg', 2000, 2000, 'La pista', [1, 4], 0.62, [-0.6, 0.5]),
  // ── fila 2
  photo('04', 'shoot-04-1.jpg', 1800, 1344, 'La bajada', [2, 0], 0.78, [0.3, -0.5], 0.55),
  photo('04', 'shoot-04-4.jpg', 1800, 1344, 'Los tejados', [2, 1], 0.56, [-0.4, 0.8]),
  photo('05', 'shoot-05-1.jpg', 1611, 2000, 'El campo', [2, 2], 0.66, [0.7, 0.3]),
  photo('05', 'shoot-05-6.jpg', 2000, 1611, 'Sobre la piedra', [2, 3], 0.52, [-0.2, -0.8]),
  photo('03', 'shoot-03-5.jpg', 2000, 2000, 'Cara a cara', [2, 4], 0.74, [0.2, 0.4], 0.55),
  // ── fila 3 (desplazada)
  bag('04', 913, 1600, [3, 0], 0.82, [-0.3, 0]),
  photo('04', 'shoot-04-6.jpg', 1800, 1344, 'El café', [3, 1], 0.64, [0.5, -0.4]),
  photo('05', 'shoot-05-7.jpg', 1493, 2000, 'Campo abierto', [3, 2], 0.74, [-0.5, 0.2], 0.55),
  bag('05', 781, 1600, [3, 3], 0.84, [0.3, 0]),
  photo('03', 'shoot-03-6.jpg', 2000, 2000, 'Última copa', [3, 4], 0.52, [0.6, 0.8]),
  // ── fila 4
  photo('06', 'shoot-06-1.jpg', 1611, 2000, 'La noche', [4, 0], 0.76, [0.4, -0.3], 0.55),
  photo('06', 'shoot-06-6.jpg', 1611, 2000, 'Cara a cara', [4, 1], 0.6, [-0.6, 0.6]),
  bag('06', 1640, 1271, [4, 2], 0.9, [0, 0.4]),
  photo('06', 'shoot-06-7.jpg', 1611, 2000, 'El campamento', [4, 3], 0.56, [0.5, -0.6]),
  { kind: 'type', lines: ['NO HAY', 'SERIE.'], en: 'No series.', cell: [4, 4], size: 0.84, jitter: [0, 0.3], depth: -0.8 },
]

/** Celda en la que se abre la home: el 06, la última pieza en llegar. */
export const START_CELL: [number, number] = [4, 2]
