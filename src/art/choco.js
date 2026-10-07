// Sprites de Choco (plataformas, 16×24) — docs/02_personajes.md
// Cada frame se compone de partes (cuerpo, cara, piernas, brazos, báculo) sobre un lienzo
// de 36×28 con margen para el báculo y los brazos. El cuerpo 16×24 va en (OX, OY).
// Los frames se hornean una sola vez, bajo demanda, con SpriteCache.

import { compose, blankGrid, stamp } from './bake.js';
import { SpriteCache } from './bake.js';
import { CHOCO } from './palettes.js';

export const FRAME_W = 36;
export const FRAME_H = 28;
export const OX = 10;
export const OY = 4;
// Punto de anclaje (centro de los pies) dentro del lienzo
export const ANCHOR_X = OX + 8;
export const ANCHOR_Y = FRAME_H;

export const PALETTE = {
  ...CHOCO,
  m: '#4E4868', // báculo: asta
  M: '#8A83A8', // báculo: collar
  C: '#DFFAFF', // báculo: núcleo brillante
  L: '#A8ECFF', // reflejo en los lentes
};

// ---------- Cuerpo (filas 2..19 del sprite de 16×24) ----------
const BODY = [
  '...oooooooooo...', // 2
  '..ohllllllllso..', // 3
  '..ohbbbbbbbbso..', // 4   (lentes 4..8, boca 9: ver FACES)
  '..ohbbbbbbbbso..', // 5
  '..ohbbbbbbbbso..', // 6
  '..ohbbbbbbbbso..', // 7
  '..ohbbbbbbbbso..', // 8
  '..ohbbbbbbbbso..', // 9
  '..osssssssssso..', // 10  ranura entre cuadritos
  '.gohllllslllsog.', // 11  segunda fila de cuadritos + audífonos
  '.Gohbbbbsbbbsog.', // 12
  '.gowbwwbywbwwog.', // 13  envoltura rota (borde irregular)
  '..oywwwwwwwwWo..', // 14
  '..owywwwwWwwWo..', // 15
  '..owwywwWwwwWo..', // 16
  '..owwwwwwwwyWo..', // 17
  '..oWwwwwwwwwWo..', // 18
  '...oooooooooo...', // 19
];

// Vista de espaldas (para el giro del doble salto): sin cara, banda de audífonos atrás.
const BODY_BACK = BODY.map((r, i) => {
  if (i === 9) return '.goggggggggggog.';
  if (i === 11) return '.gowwbwwwbwwwog.';
  return r;
});

// ---------- Caras (filas 4..10) ----------
const FACES = {
  normal: [
    '..kkkkk..kkkkk..',
    '..keeekkkkeeek..',
    '..keEok..keEok..',
    '..keook..keook..',
    '..kkkkk..kkkkk..',
    '.......oo.......',
    '................',
  ],
  blink: [
    '..kkkkk..kkkkk..',
    '..kbbbkkkkbbbk..',
    '..koook..koook..',
    '..kbbbk..kbbbk..',
    '..kkkkk..kkkkk..',
    '.......oo.......',
    '................',
  ],
  determined: [
    '..kkkkk..kkkkk..',
    '..kkkekkkkkkek..',
    '..keEok..keEok..',
    '..keook..keook..',
    '..kkkkk..kkkkk..',
    '......ooo.......',
    '................',
  ],
  hurt: [
    '..kkkkk..kkkkk..',
    '..koeokkkkoeok..',
    '..keoek..keoek..',
    '..koeok..koeok..',
    '..kkkkk..kkkkk..',
    '......oooo......',
    '......orro......',
  ],
  panic: [
    '..kkkkk..kkkkk..',
    '..keeekkkkeeek..',
    '..keoek..keoek..',
    '..keeek..keeek..',
    '..kkkkk..kkkkk..',
    '.......oo.......',
    '.......oo.......',
  ],
  happy: [
    '..kkkkk..kkkkk..',
    '..keoekkkkeoek..',
    '..koeok..koeok..',
    '..keeek..keeek..',
    '..kkkkk..kkkkk..',
    '......o..o......',
    '.......oo.......',
  ],
  // Reflejo que cruza los lentes (3 pasos)
  glare0: [
    '..kkkkk..kkkkk..',
    '..kLeekkkkLeek..',
    '..keEok..keEok..',
    '..keook..keook..',
    '..kkkkk..kkkkk..',
    '.......oo.......',
    '................',
  ],
  glare1: [
    '..kkkkk..kkkkk..',
    '..keLekkkkeLek..',
    '..kLEok..kLEok..',
    '..keook..keook..',
    '..kkkkk..kkkkk..',
    '.......oo.......',
    '................',
  ],
  glare2: [
    '..kkkkk..kkkkk..',
    '..keeLkkkkeeLk..',
    '..keLok..keLok..',
    '..kLook..kLook..',
    '..kkkkk..kkkkk..',
    '.......oo.......',
    '................',
  ],
  back: ['................', '................', '................', '................', '................', '................', '................'],
};

// ---------- Báculo ----------
const STAFF_V = [
  '.c.c.',
  'c.C.c',
  '.c.c.',
  '..M..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
  '..m..',
];
const STAFF_V_GRIP = { x: 2, y: 9 };

const STAFF_H = [
  '.........c.',
  '........c.c',
  'mmmmmmmM.C.',
  '........c.c',
  '.........c.',
];
const STAFF_H_GRIP = { x: 2, y: 2 };
// Posición del núcleo del báculo horizontal relativa a la mano
export const STAFF_H_TIP = { x: 9 - STAFF_H_GRIP.x, y: 0 };

// Báculo en diagonal (apuntando arriba-adelante); el de abajo-adelante es el mismo volteado
const STAFF_D = [
  '......c.',
  '.....cCc',
  '......c.',
  '....M...',
  '...m....',
  '..m.....',
  '.m......',
  'm.......',
];
const STAFF_D_GRIP = { x: 2, y: 5 };
const flipV = (rows) => [...rows].reverse();
// Báculo de cada pose: filas y punto de agarre (la mano)
const STAFFS = {
  h: { rows: STAFF_H, grip: STAFF_H_GRIP },
  v: { rows: STAFF_V, grip: STAFF_V_GRIP },
  vDown: { rows: flipV(STAFF_V), grip: { x: STAFF_V_GRIP.x, y: STAFF_V.length - 1 - STAFF_V_GRIP.y } },
  dUp: { rows: STAFF_D, grip: STAFF_D_GRIP },
  dDown: { rows: flipV(STAFF_D), grip: { x: STAFF_D_GRIP.x, y: STAFF_D.length - 1 - STAFF_D_GRIP.y } },
};

// ---------- Utilidades de trazos ----------
function line(x0, y0, x1, y1) {
  const pts = [];
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return pts;
}

function pixelsToLayer(pixels) {
  // pixels: [[x, y, ch], ...] en coordenadas del cuerpo → capa en el lienzo
  let g = blankGrid(FRAME_W, FRAME_H);
  const rows = g.map((r) => r.split(''));
  for (const [x, y, ch] of pixels) {
    const cx = x + OX;
    const cy = y + OY;
    if (cx >= 0 && cy >= 0 && cx < FRAME_W && cy < FRAME_H) rows[cy][cx] = ch;
  }
  return { rows: rows.map((r) => r.join('')), x: 0, y: 0 };
}

// Pierna: línea de la cadera al pie + punta del pie hacia adelante (si está en el piso).
function leg(hx, hy, fx, fy, ch = 'o') {
  const pts = line(hx, hy, fx, fy).map(([x, y]) => [x, y, ch]);
  if (fy >= 23) pts.push([fx + 1, fy, ch]);
  return pts;
}

// ---------- Poses ----------
// Cada pose: dy (desplazamiento vertical del cuerpo), lean (inclinación de la parte superior),
// legs [[hipX, footX, footY, color]...], arms [[x,y]...], staff: {type:'v'|'h', hand:[x,y]}
const HIP_Y = 20;

const ARMS = {
  idle: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 14],
      [15, 15],
      [16, 16],
    ],
    hand: [16, 16],
  },
  runA: {
    l: [
      [1, 14],
      [0, 14],
      [-1, 13],
    ],
    r: [
      [14, 14],
      [15, 15],
      [16, 15],
    ],
    hand: [16, 15],
  },
  runB: {
    l: [
      [1, 14],
      [1, 15],
      [1, 16],
    ],
    r: [
      [14, 14],
      [15, 15],
      [16, 16],
    ],
    hand: [16, 16],
  },
  runC: {
    l: [
      [1, 14],
      [0, 15],
      [0, 16],
    ],
    r: [
      [14, 14],
      [15, 14],
      [16, 13],
    ],
    hand: [16, 13],
  },
  up: {
    l: [
      [1, 13],
      [0, 12],
      [0, 11],
    ],
    r: [
      [14, 13],
      [15, 12],
      [16, 11],
    ],
    hand: [16, 11],
  },
  flail: {
    l: [
      [1, 13],
      [0, 12],
      [-1, 12],
    ],
    r: [
      [14, 13],
      [15, 12],
      [16, 12],
    ],
    hand: [16, 12],
  },
  back: {
    l: [
      [1, 14],
      [0, 14],
      [-1, 15],
    ],
    r: [
      [14, 14],
      [15, 14],
      [16, 15],
    ],
    hand: [16, 15],
  },
  shoot: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 14],
      [15, 14],
      [16, 14],
    ],
    hand: [16, 14],
    staff: 'h',
  },
  // Disparo apuntado (↑, diagonales y ↓ en el aire): el brazo del frente sigue al báculo
  shootUp: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 13],
      [15, 12],
      [16, 11],
    ],
    hand: [16, 10],
    staff: 'v',
  },
  shootDiagUp: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 14],
      [15, 13],
      [16, 12],
    ],
    hand: [16, 12],
    staff: 'dUp',
  },
  shootDiagDown: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 14],
      [15, 15],
      [16, 15],
    ],
    hand: [16, 15],
    staff: 'dDown',
  },
  shootDown: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 14],
      [15, 14],
      [16, 14],
    ],
    hand: [16, 14],
    staff: 'vDown',
  },
  raise1: {
    l: [
      [1, 14],
      [1, 15],
      [0, 16],
    ],
    r: [
      [14, 13],
      [15, 12],
      [15, 11],
    ],
    hand: [15, 11],
  },
  raise2: {
    l: [
      [1, 13],
      [0, 12],
      [0, 11],
    ],
    r: [
      [14, 12],
      [15, 11],
      [15, 10],
      [15, 9],
    ],
    hand: [15, 8],
  },
};

const STAND_LEGS = (dy = 0) => [
  [5, 5, 23, 'o'],
  [10, 10, 23, 'o'],
].map(([hx, fx, fy, c]) => [hx, HIP_Y + dy, fx, fy, c]);

const RUN_LEGS = [
  // [frente], [atrás] — pierna de atrás en sombra para que el ciclo se lea
  { dy: 0, legs: [[9, 12, 23, 'o'], [6, 3, 21, 's']], arms: 'runA' },
  { dy: 1, legs: [[9, 10, 23, 'o'], [6, 5, 20, 's']], arms: 'runB' },
  { dy: -1, legs: [[9, 8, 22, 'o'], [6, 7, 23, 's']], arms: 'runC' },
  { dy: 0, legs: [[9, 4, 21, 'o'], [6, 11, 23, 's']], arms: 'runC' },
  { dy: 1, legs: [[9, 6, 20, 'o'], [6, 9, 23, 's']], arms: 'runB' },
  { dy: -1, legs: [[9, 8, 23, 'o'], [6, 7, 22, 's']], arms: 'runA' },
];

// Definición de cada animación: lista de frames {dy, lean, legs, arms, face?, back?, dx?}
function standFrame(dy, arms = 'idle', extra = {}) {
  return { dy, lean: 0, legs: STAND_LEGS(dy), arms, ...extra };
}
function legsFrom(list, dy) {
  return list.map(([hx, fx, fy, c]) => [hx, HIP_Y + dy, fx, fy, c]);
}

export const ANIMS = {
  idle: { fps: 6, loop: true, frames: [standFrame(0), standFrame(0), standFrame(-1), standFrame(-1)] },
  run: {
    fps: 12,
    loop: true,
    frames: RUN_LEGS.map((f) => ({ dy: f.dy, lean: 1, legs: legsFrom(f.legs, f.dy), arms: f.arms })),
  },
  skid: {
    fps: 12,
    loop: true,
    frames: [
      { dy: 1, lean: -1, legs: legsFrom([[9, 13, 23, 'o'], [6, 6, 23, 's']], 1), arms: 'back' },
      { dy: 1, lean: -1, legs: legsFrom([[9, 12, 23, 'o'], [6, 6, 23, 's']], 1), arms: 'back' },
    ],
  },
  jump: {
    fps: 10,
    loop: false,
    frames: [
      { dy: -1, lean: 0, legs: legsFrom([[6, 6, 23, 'o'], [9, 9, 23, 'o']], -1), arms: 'up' },
      { dy: -1, lean: 0, legs: legsFrom([[6, 5, 21, 'o'], [9, 10, 22, 'o']], -1), arms: 'up' },
    ],
  },
  fall: {
    fps: 8,
    loop: true,
    frames: [
      { dy: 0, lean: 0, legs: legsFrom([[6, 4, 23, 'o'], [9, 11, 22, 'o']], 0), arms: 'flail' },
      { dy: 0, lean: 0, legs: legsFrom([[6, 4, 22, 'o'], [9, 11, 23, 'o']], 0), arms: 'up' },
    ],
  },
  land: {
    fps: 16,
    loop: false,
    frames: [
      { dy: 2, lean: 0, legs: legsFrom([[5, 3, 23, 'o'], [10, 12, 23, 'o']], 2), arms: 'back' },
      { dy: 1, lean: 0, legs: legsFrom([[5, 4, 23, 'o'], [10, 11, 23, 'o']], 1), arms: 'idle' },
    ],
  },
  shoot: {
    fps: 16,
    loop: false,
    frames: [
      standFrame(0, 'shoot', { face: 'determined' }),
      standFrame(0, 'shoot', { face: 'determined', dx: -1 }), // retroceso de 1 px
      standFrame(0, 'shoot', { face: 'determined' }),
    ],
  },
  // Disparo corriendo / en el aire: se combinan piernas de la animación base con brazos de disparo
  charge: {
    fps: 10,
    loop: true,
    frames: [standFrame(0, 'shoot', { face: 'determined' }), standFrame(0, 'shoot', { face: 'determined' }), standFrame(1, 'shoot', { face: 'determined' }), standFrame(1, 'shoot', { face: 'determined' })],
  },
  hurt: {
    fps: 12,
    loop: true,
    frames: [
      { dy: 0, lean: -1, legs: legsFrom([[6, 3, 22, 'o'], [9, 12, 22, 'o']], 0), arms: 'flail', face: 'hurt' },
      { dy: 0, lean: -1, legs: legsFrom([[6, 4, 22, 'o'], [9, 11, 23, 'o']], 0), arms: 'up', face: 'hurt' },
    ],
  },
  victory: {
    fps: 8,
    loop: false,
    frames: [
      standFrame(1, 'idle', { face: 'determined' }),
      standFrame(0, 'raise1', { face: 'happy' }),
      standFrame(-1, 'raise2', { face: 'happy' }),
      standFrame(-1, 'raise2', { face: 'happy' }),
      standFrame(0, 'raise2', { face: 'happy' }),
      standFrame(-1, 'raise2', { face: 'happy' }),
    ],
  },
  // Doble salto: el giro se hace al dibujar (escala X), con la vista de espaldas a la mitad
  spin: {
    fps: 16,
    loop: false,
    frames: [
      { dy: -1, lean: 0, legs: legsFrom([[6, 5, 21, 'o'], [9, 10, 21, 'o']], -1), arms: 'up', spinX: 1 },
      { dy: -1, lean: 0, legs: legsFrom([[6, 6, 21, 'o'], [9, 9, 21, 'o']], -1), arms: 'up', spinX: 0.35 },
      { dy: -1, lean: 0, legs: legsFrom([[6, 5, 21, 'o'], [9, 10, 21, 'o']], -1), arms: 'up', back: true, spinX: 1 },
      { dy: -1, lean: 0, legs: legsFrom([[6, 6, 21, 'o'], [9, 9, 21, 'o']], -1), arms: 'up', spinX: 0.35 },
    ],
  },
};

// Brazos de disparo sobre cualquier frame (correr disparando, saltar disparando)
// aim: 'h' | 'up' | 'diagUp' | 'diagDown' | 'down' (hacia dónde apunta el báculo)
const SHOOT_ARMS = { h: 'shoot', up: 'shootUp', diagUp: 'shootDiagUp', diagDown: 'shootDiagDown', down: 'shootDown' };
export function withShootArms(frame, aim = 'h') {
  return { ...frame, arms: SHOOT_ARMS[aim] || 'shoot', face: 'determined' };
}

// ---------- Composición ----------

// Clave única de un frame compuesto
export function frameKey(frame, face, hasStaff) {
  const f = frame.face || face;
  return JSON.stringify([frame.dy, frame.lean, frame.legs, frame.arms, f, !!frame.back, frame.dx || 0, hasStaff]);
}

function leanRows(rows, lean, splitRow) {
  if (!lean) return rows;
  return rows.map((r, i) => {
    if (i >= splitRow) return r;
    return lean > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.';
  });
}

export function buildFrameRows(key) {
  const [dy, lean, legs, armsName, face, back, dx, hasStaff] = JSON.parse(key);
  const arms = ARMS[armsName] || ARMS.idle;
  // Cuerpo + cara combinados en una grilla de 16 de ancho (filas 2..19)
  let body = (back ? BODY_BACK : BODY).slice();
  const faceRows = FACES[back ? 'back' : face] || FACES.normal;
  body = stamp(body, faceRows, 0, 2); // la cara empieza en la fila 4 (= 2 dentro del cuerpo)
  body = leanRows(body, lean, 9);

  const layers = [];
  // Pierna de atrás primero (en sombra), luego cuerpo, luego pierna del frente
  const legPixels = legs.map(([hx, hy, fx, fy, c]) => leg(hx, hy, fx, fy, c));
  const backLegs = legPixels.filter((_, i) => legs[i][4] === 's').flat();
  const frontLegs = legPixels.filter((_, i) => legs[i][4] !== 's').flat();
  layers.push(pixelsToLayer(backLegs));
  // Brazo de atrás (izquierdo)
  layers.push(pixelsToLayer(arms.l.map(([x, y]) => [x, y + dy, 'o'])));
  layers.push({ rows: body, x: OX + (dx || 0), y: OY + 2 + dy });
  layers.push(pixelsToLayer(frontLegs));
  // Báculo y brazo del frente
  if (hasStaff) {
    const [hx, hy] = arms.hand;
    const st = STAFFS[arms.staff] || STAFFS.v;
    layers.push({ rows: st.rows, x: OX + hx - st.grip.x + (dx || 0), y: OY + hy + dy - st.grip.y });
  }
  layers.push(pixelsToLayer(arms.r.map(([x, y]) => [x + (dx || 0), y + dy, 'o'])));
  return compose(FRAME_W, FRAME_H, layers);
}

// ---------- Derretirse: 8 frames generados a partir de la cara de pánico ----------
export function buildMeltRows(k, total = 8) {
  const src = buildFrameRows(frameKey(standFrame(0, 'idle'), 'panic', false));
  const t = (k + 1) / total;
  const out = blankGrid(FRAME_W, FRAME_H).map((r) => r.split(''));
  const srcTop = OY + 2;
  const srcRows = 18; // filas del cuerpo (sin piernas)
  const newH = Math.max(2, Math.round(srcRows * (1 - 0.82 * t)));
  const cx = ANCHOR_X;
  for (let i = 0; i < newH; i++) {
    const oy = FRAME_H - newH + i;
    const sy = srcTop + Math.floor((i * srcRows) / newH);
    const depth = i / Math.max(1, newH - 1);
    const f = 1 + t * 1.1 * depth * depth; // más ancho abajo
    for (let x = 0; x < FRAME_W; x++) {
      const sx = Math.round(cx + (x + 0.5 - cx) / f - 0.5);
      if (sx < 0 || sx >= FRAME_W) continue;
      const ch = src[sy][sx];
      if (ch !== '.') out[oy][x] = ch;
    }
  }
  // Charco en la base
  const pw = Math.round(12 + 14 * t);
  for (let x = cx - (pw >> 1); x < cx + (pw >> 1); x++) {
    if (x < 0 || x >= FRAME_W) continue;
    out[FRAME_H - 1][x] = x === cx - (pw >> 1) || x === cx + (pw >> 1) - 1 ? 'o' : 'b';
    if (out[FRAME_H - 2][x] === '.' && (x * 7 + k) % 5 === 0) out[FRAME_H - 2][x] = 'l';
  }
  // La envoltura cae encima al final
  if (k >= total - 2) {
    const wy = k === total - 2 ? FRAME_H - 7 : FRAME_H - 3;
    const wrap = ['.WwwywwWwyw.', 'WwywwwwwwwwW'];
    wrap.forEach((row, ry) => {
      for (let i = 0; i < row.length; i++) {
        const x = cx - 6 + i;
        if (row[i] !== '.' && out[wy + ry]) out[wy + ry][x] = row[i];
      }
    });
  }
  return out.map((r) => r.join(''));
}

// ---------- Cachés horneadas ----------
let frameCache = null;
let meltCache = null;

export function chocoFrame(frame, face = 'normal', hasStaff = true) {
  if (!frameCache) frameCache = new SpriteCache(buildFrameRows, PALETTE);
  return frameCache.get(frameKey(frame, face, hasStaff));
}

export function chocoMelt(k) {
  if (!meltCache) meltCache = new SpriteCache((key) => buildMeltRows(Number(key)), PALETTE);
  return meltCache.get(String(k));
}

// Pixel del LED de los audífonos (en coordenadas del lienzo, mirando a la derecha)
export const LED_POS = { x: OX + 14, y: OY + 12 };
// Anclaje de la bufanda de envoltura (espalda, arriba de la envoltura)
export const SCARF_ANCHOR = { x: OX + 3, y: OY + 13 };
