/* Las aperturas de la fila (/coleccion) que se pintan en canvas.

   Cada mundo de la fila se abre desde detrás de su bolso con un efecto sacado
   de su pieza (ver CollectionLine). Las que son partículas o líquido se
   pintan aquí: la ola del 01, las chispas del 02, el bokeh del 03, las
   cuentas del POP y los flecos del 06.

   Todas son funciones puras de `t` (0–1, el avance de su ventana) y de `s`
   (la x del bolso en pantalla): el scroll las puede rebobinar y no guardan
   estado entre fotogramas. Tamaños en px CSS; el canvas ya viene escalado. */

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
export const ease = (t: number) => t * t * (3 - 2 * t)
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
/** Sale rápido y frena: para lo que se lanza o revienta. */
const out = (t: number) => 1 - Math.pow(1 - t, 3)
/** Ruido determinista: el mismo reparto en cada render. */
export const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const rgbOf = (hex: string) => [0, 2, 4].map((o) => parseInt(hex.replace('#', '').slice(o, o + 2), 16)).join(', ')

type Ctx = CanvasRenderingContext2D

export type Assets = {
  /** Cuenta de cerámica de los flecos del 06. */
  bead: HTMLCanvasElement
  /** Destello de cuatro puntas: el sol en el agua, el borde de una copa. */
  glint: HTMLCanvasElement
  /** Un círculo de bokeh por color. */
  bokeh: HTMLCanvasElement[]
  /** Las piedras del 01 y las cuentas de oro del POP, las mismas de sus portadas. */
  stones: HTMLImageElement[]
  golds: HTMLImageElement[]
}

const BOKEH_COLORS = ['#8B9EB7', '#D4DCE8', '#7FB2D6', '#E8B36A']

function sprite(size: number, paint: (g: Ctx, n: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (g) paint(g, size)
  return c
}
function image(src: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img
}
const ready = (img: HTMLImageElement | undefined): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0

export function makeAssets(): Assets {
  return {
    bead: sprite(32, (g) => {
      const grad = g.createRadialGradient(12, 11, 1, 16, 16, 15)
      grad.addColorStop(0, '#FFFFFF')
      grad.addColorStop(0.35, '#EFE8DA')
      grad.addColorStop(0.8, '#C4B79E')
      grad.addColorStop(1, '#7F735E')
      g.fillStyle = grad
      g.beginPath()
      g.arc(16, 16, 15, 0, Math.PI * 2)
      g.fill()
    }),
    glint: sprite(64, (g, n) => {
      const c = n / 2
      const core = g.createRadialGradient(c, c, 0, c, c, c * 0.32)
      core.addColorStop(0, 'rgba(255, 255, 255, 1)')
      core.addColorStop(1, 'rgba(255, 255, 255, 0)')
      g.fillStyle = core
      g.fillRect(0, 0, n, n)
      ;[true, false].forEach((across) => {
        const lg = across ? g.createLinearGradient(0, 0, n, 0) : g.createLinearGradient(0, 0, 0, n)
        lg.addColorStop(0, 'rgba(255, 255, 255, 0)')
        lg.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)')
        lg.addColorStop(1, 'rgba(255, 255, 255, 0)')
        g.fillStyle = lg
        if (across) g.fillRect(0, c - 0.8, n, 1.6)
        else g.fillRect(c - 0.8, 0, 1.6, n)
      })
    }),
    // Bokeh de objetivo: el disco es tenue y el borde, más vivo.
    bokeh: BOKEH_COLORS.map((hex) =>
      sprite(128, (g, n) => {
        const c = n / 2
        const rgb = rgbOf(hex)
        const grad = g.createRadialGradient(c, c, 0, c, c, c)
        grad.addColorStop(0, `rgba(${rgb}, 0.18)`)
        grad.addColorStop(0.78, `rgba(${rgb}, 0.28)`)
        grad.addColorStop(0.9, `rgba(${rgb}, 0.6)`)
        grad.addColorStop(0.97, `rgba(${rgb}, 0.22)`)
        grad.addColorStop(1, `rgba(${rgb}, 0)`)
        g.fillStyle = grad
        g.beginPath()
        g.arc(c, c, c, 0, Math.PI * 2)
        g.fill()
      }),
    ),
    stones: Array.from({ length: 10 }, (_, i) => image(`/motion/01-piedra-${i + 1}.png`)),
    golds: [1, 2, 3].map((n) => image(`/motion/04-cuenta-${n}.png`)),
  }
}

function drawRotated(ctx: Ctx, img: CanvasImageSource, x: number, y: number, size: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(img, -size / 2, -size / 2, size, size)
  ctx.restore()
}

// ── 01 · La ola ─────────────────────────────────────────────────────────────
// «El 01 nace del mar… de los guijarros pulidos por siglos de ola.» Sube la
// marea del Cantábrico —primero se hincha detrás del bolso—, con su espuma y
// el sol rebotando en la cresta, arrastrando piedras del propio bolso; cubre
// el plató y al bajar deja el mundo del 01, con la arena aún mojada.

const SURF = Array.from({ length: 9 }, (_, k) => ({
  off: (rnd(k, 11) - 0.5) * 0.9,
  dy: 22 + 60 * rnd(k, 12),
  size: 24 + 18 * rnd(k, 13),
  spin: (rnd(k, 14) - 0.5) * 12,
  img: k,
}))

export function drawTide(ctx: Ctx, t: number, s: number, vw: number, vh: number, a: Assets) {
  const up = ease(seg(t, 0, 0.5))
  const down = ease(seg(t, 0.5, 1))
  const level = vh * (1.1 - 1.36 * up + 1.36 * down)
  const swell = vh * 0.2 * Math.sin(Math.PI * seg(t, 0, 0.5))
  const amp = vh * 0.018
  const line = (x: number) =>
    level -
    swell * Math.exp(-(((x - s) / (vw * 0.22)) ** 2)) +
    Math.sin(x * 0.0062 + t * 16) * amp +
    Math.sin(x * 0.0147 - t * 11) * amp * 0.45
  const step = 14
  const water = (dx: number, dy: number) => {
    ctx.beginPath()
    ctx.moveTo(-step, line(-step + dx) + dy)
    for (let x = 0; x <= vw + step; x += step) ctx.lineTo(x, line(x + dx) + dy)
    ctx.lineTo(vw + step, vh + 40)
    ctx.lineTo(-step, vh + 40)
    ctx.closePath()
  }
  const crest = (dy: number) => {
    ctx.beginPath()
    ctx.moveTo(-step, line(-step) + dy)
    for (let x = 0; x <= vw + step; x += step) ctx.lineTo(x, line(x) + dy)
  }

  // La arena mojada que deja al bajar.
  if (down > 0) {
    const wet = ctx.createLinearGradient(0, level - vh * 0.2, 0, level)
    wet.addColorStop(0, 'rgba(120, 96, 60, 0)')
    wet.addColorStop(1, `rgba(120, 96, 60, ${0.16 * (1 - down)})`)
    ctx.fillStyle = wet
    ctx.fillRect(0, level - vh * 0.2, vw, vh * 0.2 + amp * 2)
  }
  // La ola de detrás, más clara y desfasada.
  water(70, -vh * 0.03)
  ctx.fillStyle = 'rgba(150, 214, 208, 0.26)'
  ctx.fill()
  // Las piedras van dentro del agua: se dibujan antes que la ola de delante.
  SURF.forEach((p) => {
    const img = a.stones[p.img]
    if (!ready(img)) return
    const x = s + p.off * vw + Math.sin(t * 9 + p.img) * 18
    const y = line(x) + p.dy
    if (y > vh + 40 || y < -40) return
    drawRotated(ctx, img, x, y, p.size, p.spin * t)
  })
  water(0, 0)
  // Agua clara de agosto: se lee el manifiesto a través de ella.
  const body = ctx.createLinearGradient(0, level - vh * 0.05, 0, level + vh * 0.9)
  body.addColorStop(0, 'rgba(160, 222, 214, 0.58)')
  body.addColorStop(0.4, 'rgba(84, 170, 172, 0.48)')
  body.addColorStop(1, 'rgba(40, 118, 132, 0.54)')
  ctx.fillStyle = body
  ctx.fill()
  // La espuma de la cresta: su sombra, el encaje que arrastra y la línea blanca.
  crest(5)
  ctx.strokeStyle = 'rgba(30, 86, 98, 0.34)'
  ctx.lineWidth = 1
  ctx.stroke()
  crest(11)
  ctx.setLineDash([3, 7, 12, 5, 2, 9])
  ctx.lineDashOffset = -t * 400
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
  ctx.save()
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
  ctx.shadowBlur = 14
  crest(0)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
  // El sol rebotando en la cresta.
  for (let k = 0; k < 28; k++) {
    const tw = Math.sin(t * 46 + k * 2.4)
    if (tw < 0.15) continue
    const x = ((k + 0.5) / 28) * vw + Math.sin(k * 3.1) * 20
    const size = (10 + 22 * rnd(k, 15)) * tw
    ctx.globalAlpha = tw
    ctx.drawImage(a.glint, x - size / 2, line(x) - size / 2 + 2, size, size)
  }
  ctx.globalAlpha = 1
}

// ── 02 · Las chispas ───────────────────────────────────────────────────────
// La cámara acorazada (costura, puertas y resplandor naranja) es DOM; aquí
// solo van las chispas que saltan de los bordes de acero al abrirse.

const SPARKS = Array.from({ length: 110 }, (_, i) => ({
  b: 0.18 + 0.42 * rnd(i, 21),
  side: rnd(i, 22) > 0.5 ? 1 : -1,
  y: 0.12 + 0.76 * rnd(i, 23),
  vx: 260 + 1100 * rnd(i, 24),
  vy: -(150 + 650 * rnd(i, 25)),
  life: 0.1 + 0.16 * rnd(i, 26),
  w: 1 + 1.4 * rnd(i, 27),
}))

/** `reachAt(u)`: lo abiertas que estaban las puertas en `u` (px desde la costura). */
export function drawSparks(ctx: Ctx, t: number, s: number, vh: number, reachAt: (u: number) => number) {
  ctx.lineCap = 'round'
  SPARKS.forEach((sp) => {
    const age = t - sp.b
    if (age < 0 || age > sp.life) return
    const x0 = s + sp.side * reachAt(sp.b)
    const y0 = sp.y * vh
    const at = (u: number) => [x0 + sp.side * sp.vx * u, y0 + sp.vy * u + 2600 * u * u]
    const [x1, y1] = at(age)
    const [x2, y2] = at(Math.max(0, age - 0.026))
    const k = age / sp.life
    ctx.strokeStyle = k < 0.4 ? `rgba(255, 216, 160, ${1 - k})` : `rgba(255, 112, 36, ${1 - k})`
    ctx.lineWidth = sp.w * (1 - k * 0.5)
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  })
}

// ── 03 · El bokeh ──────────────────────────────────────────────────────────
// «El 03 nació de noche. De la luz que rebota en una copa, de un rooftop.»
// Sobre el negro del 02 se encienden las luces de la ciudad desenfocadas,
// del bolso hacia fuera; entra la noche azul y la cámara enfoca: los discos
// se cierran en puntos de luz, algunos destellan como el borde de una copa,
// y se apagan.

const BOKEH = Array.from({ length: 54 }, (_, i) => {
  const c = rnd(i, 34)
  return {
    x: -0.05 + 1.1 * rnd(i, 31),
    y: 0.06 + 0.88 * rnd(i, 32),
    r: 14 + 82 * Math.pow(rnd(i, 33), 2.2),
    c: c < 0.4 ? 0 : c < 0.68 ? 1 : c < 0.86 ? 2 : 3,
    rise: 0.5 + rnd(i, 35),
    ph: rnd(i, 36) * Math.PI * 2,
  }
})

export function drawBokeh(ctx: Ctx, t: number, s: number, vw: number, vh: number, a: Assets) {
  const focus = ease(seg(t, 0.55, 0.85))
  const gone = 1 - ease(seg(t, 0.82, 0.99))
  ctx.globalCompositeOperation = 'lighter'
  BOKEH.forEach((b, i) => {
    // Un plano de fondo: se mueve un tercio de lo que se mueve el bolso.
    const x = b.x * vw + (s - vw / 2) * 0.3 + Math.sin(t * 5 + b.ph) * 10
    if (x < -120 || x > vw + 120) return
    const d = Math.min(1, Math.abs(x - s) / vw)
    const show = ease(seg(t, 0.02 + d * 0.3, 0.24 + d * 0.3))
    const al = show * gone
    if (al <= 0) return
    const y = b.y * vh - t * vh * 0.1 * b.rise
    const r = Math.max(2, b.r * (0.55 + 0.6 * show) * (1 - 0.94 * focus))
    ctx.globalAlpha = al * (0.7 + 0.3 * focus)
    ctx.drawImage(a.bokeh[b.c], x - r, y - r, r * 2, r * 2)
    if (focus > 0 && i % 4 === 0) {
      const g = (6 + 24 * Math.max(0, Math.sin(t * 30 + b.ph))) * focus
      ctx.globalAlpha = al * focus
      ctx.drawImage(a.glint, x - g, y - g, g * 2, g * 2)
    }
  })
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

// ── POP · Las cuentas ──────────────────────────────────────────────────────
// «Cada cuenta atrapa el sol una vez.» Desde detrás del bolso salen
// disparadas sus cuentas de oro, en arco, cada una hacia un punto del plató;
// al llegar, revientan: un círculo del mundo del POP que se abre con un aro
// de oro y un chisporroteo. Los círculos se funden en el mundo entero.

const POPS = [
  [0.12, 0.22],
  [0.34, 0.1],
  [0.58, 0.2],
  [0.84, 0.12],
  [0.95, 0.42],
  [0.7, 0.46],
  [0.42, 0.5],
  [0.16, 0.62],
  [0.3, 0.88],
  [0.6, 0.84],
  [0.88, 0.8],
  [0.05, 0.92],
].map(([x, y], k) => ({ x, y, img: k % 3, size: 24 + 14 * rnd(k, 41), spin: (rnd(k, 42) - 0.5) * 8 }))
const FLIGHT = 0.14
/** A partir de aquí los círculos ya cubren el plató y el mundo entra entero. */
export const POP_SWAP = 0.8

/** Cada cuenta con su salida, su estallido y el radio de su círculo en `t`.
    Salen primero las que caen más cerca del bolso. */
function pops(t: number, s: number, vw: number, vh: number) {
  const diag = Math.hypot(vw, vh)
  return POPS.map((p, k) => ({ p, k, d: Math.abs(p.x * vw - s) + Math.abs(p.y - 0.5) * vh * 0.5 }))
    .sort((m, n) => m.d - n.d)
    .map(({ p, k }, rank) => {
      const launch = 0.02 + rank * 0.02
      const pop = launch + FLIGHT
      return { p, k, launch, pop, r: t < pop ? 0 : 4 + out(seg(t, pop, pop + 0.42)) * diag * 0.62 }
    })
}

/** Si el punto (x, y) ya está dentro del mundo del POP (para el tono del header). */
export const popCovers = (t: number, s: number, vw: number, vh: number, x: number, y: number) =>
  t >= POP_SWAP || pops(t, s, vw, vh).some(({ p, r }) => Math.hypot(x - p.x * vw, y - p.y * vh) < r)

/** Los círculos del mundo nuevo van en `under` (bajo la luz del plató); las
    cuentas, aros y chispas, en `over`. */
export function drawPop(under: Ctx, over: Ctx, t: number, s: number, vw: number, vh: number, bg: string, a: Assets) {
  const oy = vh * 0.55
  under.fillStyle = bg
  pops(t, s, vw, vh).forEach(({ p, k, launch, pop, r }) => {
    if (t < launch) return
    const tx = p.x * vw
    const ty = p.y * vh
    if (t < pop) {
      // En vuelo: arco, giro, y crece porque viene hacia la cámara.
      const img = a.golds[p.img]
      if (!ready(img)) return
      const u = out((t - launch) / FLIGHT)
      const cx = (s + tx) / 2
      const cy = Math.min(oy, ty) - vh * 0.22
      const x = (1 - u) * (1 - u) * s + 2 * (1 - u) * u * cx + u * u * tx
      const y = (1 - u) * (1 - u) * oy + 2 * (1 - u) * u * cy + u * u * ty
      drawRotated(over, img, x, y, p.size * (0.55 + 0.7 * u), p.spin * u)
      if (u > 0.8) {
        const g = p.size * 1.6 * seg(u, 0.8, 1)
        over.globalAlpha = seg(u, 0.8, 1)
        over.drawImage(a.glint, x - g, y - g, g * 2, g * 2)
        over.globalAlpha = 1
      }
      return
    }
    if (t < POP_SWAP) {
      under.beginPath()
      under.arc(tx, ty, r, 0, Math.PI * 2)
      under.fill()
    }
    // El aro de oro y su halo: un destello en el estallido, no un dibujo.
    const ring = 1 - ease(seg(t, pop, pop + 0.07))
    if (ring > 0) {
      over.beginPath()
      over.arc(tx, ty, r, 0, Math.PI * 2)
      over.strokeStyle = `rgba(214, 178, 88, ${ring * 0.28})`
      over.lineWidth = 12
      over.stroke()
      over.strokeStyle = `rgba(232, 196, 104, ${ring})`
      over.lineWidth = 2.5
      over.stroke()
    }
    // El chisporroteo del estallido.
    const burst = seg(t, pop, pop + 0.12)
    if (burst > 0 && burst < 1) {
      over.globalAlpha = 1 - burst
      for (let j = 0; j < 8; j++) {
        const ang = (j / 8) * Math.PI * 2 + k
        const dist = out(burst) * (40 + 30 * rnd(k * 8 + j, 43))
        const g = 9 * (1 - burst) + 3
        over.drawImage(a.glint, tx + Math.cos(ang) * dist - g, ty + Math.sin(ang) * dist - g, g * 2, g * 2)
      }
      over.globalAlpha = 1
    }
  })
}

// ── 06 · Los flecos ────────────────────────────────────────────────────────
// Detrás del bolso cae un telón de flecos de trapillo oliva, rematados con
// cuentas: cada fleco cuelga de arriba, cae con retraso según lo lejos que
// esté del bolso, se mece y al final se aparta hacia su lado recogiéndose.

export type Strand = { x: number; len: number; w: number; tone: string; phase: number; bead: boolean }

/** Un fleco cada 13 px, con largo, grosor y tono propios. */
export function makeStrands(vw: number, tone: (u: number) => string): Strand[] {
  const count = Math.round(vw / 13)
  return Array.from({ length: count }, (_, i) => ({
    x: (i + 0.5 + (rnd(i, 4) - 0.5) * 0.7) / count,
    len: 0.74 + 0.3 * rnd(i, 5),
    w: 5 + 4 * rnd(i, 6),
    tone: tone(rnd(i, 7)),
    phase: rnd(i, 8) * Math.PI * 2,
    bead: rnd(i, 9) > 0.45,
  }))
}

export function drawFringe(ctx: Ctx, t: number, s: number, vw: number, vh: number, strands: Strand[], bead: HTMLCanvasElement) {
  ctx.lineCap = 'round'
  strands.forEach((st) => {
    const x0 = st.x * vw
    const d = Math.min(1, Math.abs(x0 - s) / vw)
    const drop = ease(seg(t, 0.02 + d * 0.3, 0.3 + d * 0.3))
    if (drop <= 0) return
    const part = ease(seg(t, 0.56 + d * 0.12, 0.9 + d * 0.08))
    const len = st.len * vh
    const y0 = -0.04 * vh - len * (1 - drop) - part * len * 1.08
    const sway = Math.sin(t * 22 + st.phase) * 0.025 * drop * (1 - part)
    const ang = (x0 >= s ? 1 : -1) * part * 0.42 + sway
    const x1 = x0 + Math.sin(ang) * len
    const y1 = y0 + Math.cos(ang) * len
    // El extremo va con retraso: el fleco se curva hacia donde venía. Y el
    // trapillo nunca cae del todo recto: cada uno se riza un poco.
    const cx = x0 + Math.sin(ang * 0.45) * len * 0.55 + Math.sin(st.phase) * st.w * 1.4
    const cy = y0 + len * 0.55
    const stroke = (dx: number, dy: number, color: string, width: number) => {
      ctx.beginPath()
      ctx.moveTo(x0 + dx, y0 + dy)
      ctx.quadraticCurveTo(cx + dx, cy + dy, x1 + dx, y1 + dy)
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.stroke()
    }
    stroke(3, 6, 'rgba(28, 24, 12, 0.14)', st.w)
    stroke(0, 0, st.tone, st.w)
    stroke(st.w * 0.2, 0, 'rgba(160, 168, 120, 0.32)', st.w * 0.3)
    if (st.bead) {
      const r = st.w * 0.85
      ctx.drawImage(bead, x1 - r, y1 - r * 0.5, r * 2, r * 2)
    }
  })
}
