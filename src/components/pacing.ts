/* El ritmo de la fila (/coleccion) en móvil.

   En escritorio el scroll mueve la pista 1:1 y cada mundo se abre mientras su
   bolso cruza un tercio largo de pantalla: más de 500 px de rueda. En móvil
   ese tramo se quedaba en ~160 px, así que un solo gesto del dedo se comía
   la apertura entera, y encima con el bolso cruzando la pantalla.

   Por eso en móvil cada apertura tiene su propio tramo de scroll, medido en
   altos de pantalla (lo que recorre el pulgar) y no en anchos: el bolso llega
   frenando, se queda casi quieto en el centro mientras su mundo se abre
   detrás y vuelve a arrancar. La velocidad cambia siempre con suavidad, nunca
   de golpe, y todo sigue siendo scroll: se puede parar y rebobinar a medias. */

/** En altos de pantalla: lo que tarda en frenar (y en arrancar) y la pausa. */
const RAMP = 0.3
const REST = 0.9
/** Lo que se sigue moviendo en la pausa: quieto del todo se lee muerto. */
const DRIFT = 0.06

type Piece = { y: number; len: number; p: number; kind: 'run' | 'in' | 'rest' | 'out' }
export type Pacing = {
  /** Scroll total de la fila, en px. */
  runway: number
  pieces: Piece[]
  /** El tramo de scroll en el que se abre cada mundo. */
  opens: Array<[number, number]>
}

// Lo recorrido en una rampa cuya velocidad cambia en smoothstep (de 1 a
// DRIFT al frenar, al revés al arrancar), en fracción de su largo.
const smoothArea = (u: number) => u ** 3 - u ** 4 / 2
const brake = (u: number) => u - (1 - DRIFT) * smoothArea(u)
const launch = (u: number) => DRIFT * u + (1 - DRIFT) * smoothArea(u)

/** `stops`: el pan con el que cada ancla queda en el centro, en orden. */
export function makePacing(stops: number[], panMax: number, vh: number): Pacing {
  const ramp = RAMP * vh
  const rest = REST * vh
  const rampPan = (ramp * (1 + DRIFT)) / 2
  const half = rampPan + (rest * DRIFT) / 2
  const pieces: Piece[] = []
  const opens: Array<[number, number]> = []
  let y = 0
  let p = 0
  const push = (kind: Piece['kind'], len: number, pan: number) => {
    pieces.push({ y, len, p, kind })
    y += len
    p += pan
  }
  stops.forEach((stop) => {
    const from = Math.max(p, stop - half)
    if (from > p) push('run', from - p, from - p)
    // El mundo empieza a abrirse con el bolso ya frenando y está entero
    // un poco antes de que vuelva a arrancar.
    opens.push([y + ramp * 0.5, y + ramp + rest * 0.9])
    push('in', ramp, rampPan)
    push('rest', rest, rest * DRIFT)
    push('out', ramp, rampPan)
  })
  if (panMax > p) push('run', panMax - p, panMax - p)
  return { runway: y, pieces, opens }
}

/** El pan de la pista con `y` px de scroll dentro de la fila. */
export function panAt({ pieces }: Pacing, y: number) {
  let piece = pieces[0]
  for (const next of pieces) {
    if (next.y > y) break
    piece = next
  }
  if (!piece) return 0
  const u = Math.min(1, Math.max(0, (y - piece.y) / piece.len))
  const { p, len, kind } = piece
  if (kind === 'in') return p + len * brake(u)
  if (kind === 'rest') return p + len * DRIFT * u
  if (kind === 'out') return p + len * launch(u)
  return p + len * u
}
