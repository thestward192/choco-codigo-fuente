// Sprites de Tapita (plataformas) — docs/coop/02_tapita.md
// Cuerpo de 16×16 (bloque de tapa de dulce en trapecio con capucha de hoja de caña + patitas) en un
// lienzo de 36×32 con margen para el mazo, la hoja sombrilla y los brazos. Los pies quedan en la
// fila 27 (ANCHOR_Y = 28); las 4 filas de abajo dejan que el mazo baje del piso en el martillazo.
// Cada frame se compone de partes (cuerpo, cara, patitas, brazos, mazo) con el pintor de grillas
// y se hornea una sola vez, bajo demanda.
import { Grid } from './painter.js';
import { SpriteCache } from './bake.js';

export const FRAME_W = 36;
export const FRAME_H = 32;
export const OX = 10; // columna del cuerpo dentro del lienzo
export const OY = 12; // fila del cuerpo (capucha) dentro del lienzo
export const ANCHOR_X = OX + 8;
export const ANCHOR_Y = 28;

export const PALETTE = {
  o: '#2A1608', // contorno
  s: '#6B3410', // dulce sombra
  b: '#9C5420', // dulce base
  l: '#C8782E', // dulce luz
  c: '#F2C46B', // cristales de azúcar
  C: '#FFF1C2', // brillo de cristal
  H: '#5E6B2A', // hoja oscura
  h: '#8E9A3F', // hoja base
  L: '#C4C77A', // hoja luz
  m: '#7A4E2D', // madera del mazo
  M: '#A8743F', // madera clara
  r: '#E88A6A', // mejillas
  e: '#F4F1EA', // ojos
  E: '#FFFFFF', // brillo del ojo
  k: '#1A0E06', // pupila
  d: '#4A2410', // patitas y bracitos (dulce oscuro)
  y: '#E8A040', // melcocha (bola en la mano)
};

// Caramelizada (calor extremo, cosmético): el dulce brilla en ámbar
export const CARAMEL_PALETTE = { ...PALETTE, o: '#3A1E08', s: '#9A4A12', b: '#D9822B', l: '#F2A84A', c: '#FFF1C2' };

// ---------- Cuerpo (16×13): capucha de hoja + bloque en trapecio ----------
const HOOD = [
  '.....oooooo.....',
  '...ooLLhhhhoo...',
  '..oLLhhhhhhhHo..',
  '..oLhhhhhhhhHo..',
  '..oHHHHHHHHHHo..',
];
// Sin capucha (la hoja está en la mano como sombrilla)
const BARE_TOP = [
  '................',
  '................',
  '...oooooooooo...',
  '..olllllllllso..',
  '..oslbbbbbbbso..',
];
const BLOCK = [
  '..osbbbbbbbbso..',
  '.oslbbbbbbbbbso.',
  '.oslbbbbbbbbbso.',
  '.oslbbbbbbbbbso.',
  'oslbbbbbbbbbbbso',
  'oslbbbbbbbbbbbso',
  'osssssssssssssso',
  '.oooooooooooooo.',
];
// Cristales de azúcar (coordenadas del cuerpo): titilan de a uno en el juego
export const CRYSTALS = [
  [11, 5],
  [2, 10],
  [7, 11],
  [13, 10],
];

// ---------- Caras (ojos en filas 6..8, mejillas en 9, boca en 10) ----------
const EYE_L = 5;
const EYE_R = 10;
const EYE_Y = 6;

function face(g, ox, oy, name) {
  const P = (x, y, c) => g.set(ox + x, oy + y, c);
  const eye = (x, kind) => {
    if (kind === 'line') {
      for (let i = 0; i < 3; i++) P(x + i, EYE_Y + 1, 'o');
      return;
    }
    if (kind === 'happy') {
      P(x, EYE_Y + 2, 'o');
      P(x + 1, EYE_Y + 1, 'o');
      P(x + 2, EYE_Y + 2, 'o');
      return;
    }
    if (kind === 'squeeze') {
      P(x, EYE_Y, 'o');
      P(x + 1, EYE_Y + 1, 'o');
      P(x + 2, EYE_Y + 1, 'o');
      P(x, EYE_Y + 2, 'o');
      return;
    }
    if (kind === 'xl' || kind === 'xr') {
      const f = kind === 'xr';
      P(f ? x + 2 : x, EYE_Y, 'o');
      P(x + 1, EYE_Y + 1, 'o');
      P(f ? x + 2 : x, EYE_Y + 2, 'o');
      return;
    }
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) P(x + xx, EYE_Y + yy, 'e');
    if (kind === 'panic') {
      P(x + 1, EYE_Y + 1, 'k');
      return;
    }
    if (kind === 'up') {
      P(x + 1, EYE_Y, 'k');
      P(x + 2, EYE_Y, 'k');
      P(x + 2, EYE_Y + 1, 'k');
      return;
    }
    if (kind === 'lid') {
      for (let i = 0; i < 3; i++) P(x + i, EYE_Y, 'o');
      P(x + 1, EYE_Y + 1, 'k');
      P(x + 2, EYE_Y + 1, 'k');
      P(x + 2, EYE_Y + 2, 'k');
      return;
    }
    // normal: pupila 2×2 abajo a la derecha (mira hacia donde camina) con brillo
    P(x + 1, EYE_Y + 1, 'E');
    P(x + 2, EYE_Y + 1, 'k');
    P(x + 1, EYE_Y + 2, 'k');
    P(x + 2, EYE_Y + 2, 'k');
  };
  const eyes = { normal: 'n', blink: 'line', happy: 'happy', worried: 'up', determined: 'lid', hurt: 'x', panic: 'panic', effort: 'squeeze' }[name] || 'n';
  if (eyes === 'x') {
    eye(EYE_L, 'xl');
    eye(EYE_R, 'xr');
  } else {
    eye(EYE_L, eyes);
    eye(EYE_R, eyes);
  }
  // Mejillas sonrojadas (2 px)
  P(4, 9, 'r');
  P(5, 9, 'r');
  P(12, 9, 'r');
  P(13, 9, 'r');
  // Boca
  if (name === 'happy') {
    P(7, 9, 'o');
    P(8, 10, 'r');
    P(9, 10, 'r');
    P(10, 9, 'o');
    P(8, 9, 'o');
    P(9, 9, 'o');
  } else if (name === 'hurt' || name === 'panic' || name === 'worried') {
    P(8, 10, 'o');
    P(9, 10, 'o');
    if (name !== 'worried') {
      P(8, 9, 'o');
      P(9, 9, 'o');
    }
  } else if (name === 'determined') {
    P(7, 10, 'o');
    P(8, 10, 'o');
    P(9, 10, 'o');
  } else if (name === 'effort') {
    P(7, 10, 'o');
    P(8, 10, 'e');
    P(9, 10, 'e');
    P(10, 10, 'o');
  } else {
    P(8, 10, 'o');
    P(9, 10, 'o');
  }
}

// ---------- Patitas: [cadera x, pie x, pie y] (coordenadas del cuerpo; la cadera está en la fila 13) ----------
const STAND = [
  [4, 4, 15],
  [11, 11, 15],
];
function legs(g, ox, oy, list, dy) {
  for (const [hx, fx, fy] of list) {
    const hipY = 13 + dy;
    if (hipY <= fy) g.line(ox + hx, oy + hipY, ox + fx, oy + fy, 'd');
    g.set(ox + fx + 1, oy + fy, 'd'); // piecito hacia adelante
  }
}

// ---------- Brazos ----------
// Cada pose: back/front (puntos del bracito), mazo ({ grip, dir, len, behind }) y ball (melcocha en la mano)
const ARMS = {
  idle: { back: [[0, 8], [-1, 8]], front: [[15, 9], [16, 10]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  runA: { back: [[0, 8], [-1, 8]], front: [[15, 8], [16, 8]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  runB: { back: [[0, 8], [-1, 8]], front: [[15, 10], [16, 11]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  up: { back: [[0, 8], [-1, 8]], front: [[15, 7], [16, 6]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  flail: { back: [[0, 6], [-1, 5]], front: [[15, 6], [16, 5]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  // Mazo (golpe hacia adelante)
  swing0: { back: [[0, 9], [-1, 9]], front: [[14, 6], [13, 5]], mazo: { grip: [13, 5], dir: 'ul', len: 4 } },
  swing1: { back: [[0, 9], [-1, 9]], front: [[14, 6], [14, 5]], mazo: { grip: [14, 5], dir: 'up', len: 4 } },
  swing2: { back: [[0, 9], [-1, 9]], front: [[15, 9], [16, 9]], mazo: { grip: [16, 9], dir: 'right', len: 4 } },
  swing3: { back: [[0, 9], [-1, 9]], front: [[15, 8], [16, 8]], mazo: { grip: [16, 8], dir: 'ur', len: 3 } },
  // Martillazo
  pound: { back: [[1, 6], [1, 5]], front: [[14, 6], [14, 5]], mazo: { grip: [8, 4], dir: 'up', len: 4 } },
  dive: { back: [[1, 10], [2, 11]], front: [[15, 10], [15, 11]], mazo: { grip: [15, 11], dir: 'dr', len: 3 } },
  impact: { back: [[0, 9], [-1, 10]], front: [[15, 10], [16, 11]], mazo: { grip: [16, 11], dir: 'right', len: 3 } },
  // Melcocha
  throw0: { back: [[0, 8], [-1, 8]], front: [[15, 7], [16, 6]], ball: [17, 5], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  throw1: { back: [[0, 8], [-1, 8]], front: [[15, 8], [16, 8], [17, 8]], ball: [18, 8], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  throw2: { back: [[0, 8], [-1, 8]], front: [[15, 9], [16, 9], [17, 10]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  // Plantarse: el mazo clavado adelante, las dos manos en el mango
  plant: { back: [[1, 9], [2, 9]], front: [[15, 8], [15, 7]], mazo: { grip: [15, 7], dir: 'down', len: 3 } },
  // Hoja sombrilla (sin mazo: lo lleva colgado atrás)
  grab: { back: [[1, 5], [1, 4]], front: [[14, 5], [14, 4]], mazo: { grip: [-1, 9], dir: 'up', len: 3, behind: true } },
  hold: { back: [[1, 4], [1, 3], [1, 2]], front: [[14, 4], [14, 3], [14, 2]], mazo: { grip: [-1, 9], dir: 'up', len: 3, behind: true } },
  // Montada sobre Choco: se sostiene con las dos manos
  ride: { back: [[0, 10], [0, 11]], front: [[15, 10], [15, 11]], mazo: { grip: [-1, 8], dir: 'up', len: 3, behind: true } },
  // Pegada a la pared (la pared queda atrás)
  cling: { back: [[0, 7], [-1, 6], [-2, 6]], front: [[15, 9], [16, 9]], mazo: { grip: [3, 10], dir: 'ur', len: 3, behind: true } },
  spread: { back: [[0, 6], [-1, 5], [-2, 4]], front: [[15, 6], [16, 5], [17, 4]], mazo: { grip: [3, 10], dir: 'ur', len: 3, behind: true } },
  // Victoria: el mazo en alto
  victory: { back: [[0, 9], [-1, 9]], front: [[14, 5], [14, 4]], mazo: { grip: [14, 4], dir: 'up', len: 4 } },
};

const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], ul: [-1, -1], ur: [1, -1], dl: [-1, 1], dr: [1, 1] };

// Mazo de trapiche: mango de madera y cabeza en bloque, perpendicular al mango.
function mazo(g, ox, oy, { grip, dir, len }, dy) {
  const [dx, ddy] = DIRV[dir];
  const gx = ox + grip[0];
  const gy = oy + grip[1] + dy;
  for (let i = 0; i <= len; i++) g.set(gx + dx * i, gy + ddy * i, i % 2 ? 'm' : 'M');
  const ex = gx + dx * len;
  const ey = gy + ddy * len;
  let x0;
  let y0;
  let w;
  let h;
  if (dx === 0) {
    // Mango vertical: cabeza horizontal 6×4
    w = 6;
    h = 4;
    x0 = ex - 3;
    y0 = ddy < 0 ? ey - 4 : ey + 1;
  } else if (ddy === 0) {
    // Mango horizontal: cabeza vertical 4×6
    w = 4;
    h = 6;
    x0 = dx > 0 ? ex + 1 : ex - 4;
    y0 = ey - 3;
  } else {
    // Diagonal: bloque de 5×5 con esquinas recortadas
    w = 5;
    h = 5;
    x0 = ex + dx * 3 - 2;
    y0 = ey + ddy * 3 - 2;
  }
  g.rect(x0, y0, x0 + w - 1, y0 + h - 1, 'M');
  g.hline(x0, x0 + w - 1, y0 + h - 1, 'm');
  g.vline(x0 + w - 1, y0, y0 + h - 1, 'm');
  g.frame(x0, y0, x0 + w - 1, y0 + h - 1, 'o');
  g.set(x0 + 1, y0 + 1, 'L');
  if (dx !== 0 && ddy !== 0) {
    g.set(x0, y0, '.').set(x0 + w - 1, y0, '.').set(x0, y0 + h - 1, '.').set(x0 + w - 1, y0 + h - 1, '.');
  }
}

// Hoja de caña como sombrilla (20×6), centrada sobre la cabeza. half: recién quitada (más chica)
function umbrella(g, ox, oy, dy, half) {
  const rows = half
    ? ['....ooooooo.....', '..ooLLhhhhHoo...', '.oLhhhhhhhhhHo..', '..ooooooooooo...']
    : ['.....oooooooooo.....', '...ooLLLhhhhhhHoo...', '.ooLLhhhhhhhhhhhHoo.', 'oLhhhhhhhhhhhhhhhHHo', 'oHHHHoHHHHHHoHHHHHHo', '.oo..o......o....oo.'];
  const w = rows[0].length;
  const x0 = ox + 8 - Math.floor(w / 2);
  const y0 = oy + dy - rows.length - (half ? -1 : 1);
  rows.forEach((r, yy) => {
    for (let xx = 0; xx < r.length; xx++) if (r[xx] !== '.') g.set(x0 + xx, y0 + yy, r[xx]);
  });
}

function leanRows(rows, lean, split) {
  if (!lean) return rows;
  return rows.map((r, i) => (i >= split ? r : lean > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.'));
}

function stampRows(g, rows, x0, y0) {
  rows.forEach((r, yy) => {
    for (let xx = 0; xx < r.length; xx++) if (r[xx] !== '.') g.set(x0 + xx, y0 + yy, r[xx]);
  });
}

// ---------- Frames ----------
// Definición: { dy, lean, legs, arms, face?, bare?, umbrella?: 'half' | 'full' }
function fr(dy, arms, legsList = STAND, extra = {}) {
  return { dy, lean: 0, legs: legsList, arms, ...extra };
}

const RUN_LEGS = [
  { l: [[4, 2, 15], [11, 13, 15]], dy: 0, arms: 'runA' },
  { l: [[4, 3, 14], [11, 12, 15]], dy: -1, arms: 'runA' },
  { l: [[4, 5, 14], [11, 10, 15]], dy: -1, arms: 'idle' },
  { l: [[4, 6, 15], [11, 9, 15]], dy: 0, arms: 'runB' },
  { l: [[4, 5, 15], [11, 10, 14]], dy: -1, arms: 'runB' },
  { l: [[4, 3, 15], [11, 12, 14]], dy: -1, arms: 'idle' },
];
const TUCK = [
  [4, 3, 14],
  [11, 12, 14],
];
const DANGLE = [
  [4, 3, 15],
  [11, 12, 15],
];
const SQUAT = [
  [4, 3, 15],
  [11, 12, 15],
];
const BRACE = [
  [4, 6, 15],
  [11, 14, 15],
];
const CLING_LEGS = [
  [4, 1, 14],
  [11, 10, 15],
];
const SPREAD_LEGS = [
  [4, 1, 15],
  [11, 14, 15],
];
const RIDE_LEGS = [
  [4, 2, 14],
  [11, 13, 14],
];

export const ANIMS = {
  idle: { fps: 6, loop: true, frames: [fr(0, 'idle'), fr(0, 'idle'), fr(1, 'idle', SQUAT), fr(1, 'idle', SQUAT)] },
  run: { fps: 12, loop: true, frames: RUN_LEGS.map((f) => fr(f.dy, f.arms, f.l, { lean: 1 })) },
  skid: { fps: 12, loop: true, frames: [fr(1, 'flail', BRACE, { lean: -1 }), fr(1, 'flail', BRACE, { lean: -1, legsJitter: 1 })] },
  jump: { fps: 10, loop: false, frames: [fr(-1, 'up', TUCK), fr(-1, 'up', TUCK, { lean: 1 })] },
  fall: { fps: 8, loop: true, frames: [fr(0, 'flail', DANGLE), fr(0, 'flail', DANGLE, { lean: -1 })] },
  land: { fps: 16, loop: false, frames: [fr(2, 'idle', SQUAT), fr(1, 'idle', SQUAT)] },
  cling: { fps: 8, loop: true, frames: [fr(0, 'cling', CLING_LEGS), fr(1, 'cling', CLING_LEGS)] },
  walljump: { fps: 16, loop: false, frames: [fr(1, 'cling', CLING_LEGS), fr(-1, 'spread', SPREAD_LEGS), fr(-1, 'up', TUCK, { lean: 1 })] },
  mazo: { fps: 18, loop: false, frames: [fr(1, 'swing0', SQUAT, { lean: -1 }), fr(0, 'swing1'), fr(1, 'swing2', BRACE, { lean: 1 }), fr(0, 'swing3')] },
  pound: {
    fps: 16,
    loop: false,
    frames: [fr(-1, 'pound', TUCK, { face: 'determined' }), fr(-1, 'pound', TUCK, { face: 'determined', lean: -1 }), fr(0, 'dive', DANGLE, { face: 'effort', lean: 1 }), fr(2, 'impact', SQUAT, { face: 'effort' }), fr(1, 'impact', SQUAT, { face: 'determined' })],
  },
  throw: { fps: 14, loop: false, frames: [fr(0, 'throw0', STAND, { lean: -1 }), fr(0, 'throw1', BRACE, { lean: 1 }), fr(0, 'throw2')] },
  plant: { fps: 12, loop: false, frames: [fr(1, 'plant', SQUAT), fr(2, 'plant', SQUAT, { face: 'determined' }), fr(2, 'plant', SQUAT, { face: 'determined' })] },
  umbrella: { fps: 12, loop: false, frames: [fr(0, 'grab'), fr(0, 'hold', STAND, { bare: true, umbrella: 'half' }), fr(0, 'hold', STAND, { bare: true, umbrella: 'full' })] },
  umbrellaWalk: { fps: 10, loop: true, frames: [fr(0, 'hold', RUN_LEGS[0].l, { bare: true, umbrella: 'full' }), fr(-1, 'hold', RUN_LEGS[2].l, { bare: true, umbrella: 'full' }), fr(0, 'hold', RUN_LEGS[3].l, { bare: true, umbrella: 'full' }), fr(-1, 'hold', RUN_LEGS[5].l, { bare: true, umbrella: 'full' })] },
  ride: { fps: 6, loop: true, frames: [fr(0, 'ride', RIDE_LEGS, { face: 'happy' }), fr(1, 'ride', RIDE_LEGS, { face: 'happy' })] },
  hurt: { fps: 12, loop: false, frames: [fr(0, 'flail', DANGLE, { lean: -1, face: 'hurt' }), fr(0, 'flail', DANGLE, { face: 'hurt' })] },
  victory: { fps: 8, loop: true, frames: [fr(0, 'victory', STAND, { face: 'happy' }), fr(-1, 'victory', TUCK, { face: 'happy' }), fr(-2, 'victory', TUCK, { face: 'happy' }), fr(-1, 'victory', TUCK, { face: 'happy' }), fr(0, 'victory', STAND, { face: 'happy' }), fr(1, 'victory', SQUAT, { face: 'happy' })] },
};

// Brazos de mazo sobre cualquier frame (por ejemplo, golpear corriendo)
export function withArms(frame, arms) {
  return { ...frame, arms };
}

export function frameKey(frame, face = 'normal') {
  return JSON.stringify([frame.dy, frame.lean || 0, frame.legs, frame.arms, frame.face || face, !!frame.bare, frame.umbrella || null]);
}

export function buildFrameRows(key) {
  const [dy, lean, legList, armsName, faceName, bare, umb] = JSON.parse(key);
  const arms = ARMS[armsName] || ARMS.idle;
  const g = new Grid(FRAME_W, FRAME_H);
  // Patitas (no se mueven con dy: los pies quedan en el piso)
  legs(g, OX, OY, legList, dy);
  // Mazo cargado atrás y bracito de atrás
  if (arms.mazo?.behind) mazo(g, OX, OY, arms.mazo, dy);
  for (const [x, y] of arms.back) g.set(OX + x, OY + y + dy, 'd');
  // Cuerpo + cara
  const grid = new Grid(16, 13);
  stampRows(grid, [...(bare ? BARE_TOP : HOOD), ...BLOCK], 0, 0);
  for (const [x, y] of CRYSTALS) if (grid.get(x, y) !== '.') grid.set(x, y, 'c');
  face(grid, 0, 0, faceName);
  const rows = leanRows(grid.toRows(), lean, 6);
  stampRows(g, rows, OX, OY + dy);
  // Mazo en la mano de adelante y bracito de adelante
  if (arms.mazo && !arms.mazo.behind) mazo(g, OX, OY, arms.mazo, dy);
  for (const [x, y] of arms.front) g.set(OX + x, OY + y + dy, 'd');
  if (arms.ball) {
    const [bx, by] = arms.ball;
    g.rect(OX + bx - 1, OY + by + dy - 1, OX + bx, OY + by + dy, 'y');
    g.set(OX + bx - 1, OY + by + dy - 1, 'C');
  }
  if (umb) umbrella(g, OX, OY, dy, umb === 'half');
  return g.toRows();
}

// ---------- Disolverse en el agua: 8 frames generados a partir del cuerpo ----------
export function buildDissolveRows(k, total = 8) {
  const src = buildFrameRows(frameKey(fr(0, 'flail', DANGLE), 'panic'));
  const t = (k + 1) / total;
  const out = new Grid(FRAME_W, FRAME_H);
  const top = OY;
  const srcRows = ANCHOR_Y - OY;
  const newH = Math.max(1, Math.round(srcRows * (1 - 0.9 * t)));
  const cx = ANCHOR_X;
  for (let i = 0; i < newH; i++) {
    const oy = ANCHOR_Y - newH + i;
    const sy = top + Math.floor((i * srcRows) / newH);
    const depth = i / Math.max(1, newH - 1);
    const f = 1 + t * 1.4 * depth * depth;
    for (let x = 0; x < FRAME_W; x++) {
      const sx = Math.round(cx + (x + 0.5 - cx) / f - 0.5);
      if (sx < 0 || sx >= FRAME_W) continue;
      let ch = src[sy][sx];
      if (ch === '.') continue;
      // La hoja y el mazo se sueltan: no se derriten con el dulce
      if ('HhLmM'.includes(ch) && t > 0.3) continue;
      if (t > 0.5 && 'ekE'.includes(ch)) ch = 'b';
      out.set(x, oy, ch);
    }
  }
  // Charco dorado
  const pw = Math.round(10 + 16 * t);
  for (let x = cx - (pw >> 1); x < cx + (pw >> 1); x++) {
    const edge = x === cx - (pw >> 1) || x === cx + (pw >> 1) - 1;
    out.set(x, ANCHOR_Y - 1, edge ? 'o' : (x + k) % 4 === 0 ? 'c' : 'l');
  }
  // La hoja queda flotando encima
  if (t > 0.3) {
    const ly = ANCHOR_Y - 2 - Math.round((1 - t) * 10);
    const lx = cx - 6 + Math.round(Math.sin(k) * 2);
    stampRows(out, ['..oooooo...', '.oLhhhhhHo.', 'oHHHHHHHHHo'], lx, ly);
  }
  return out.toRows();
}

// ---------- Cachés ----------
let cache = null;
let caramelCache = null;
let dissolveCache = null;

export function tapitaFrame(frame, face = 'normal', { caramel = false } = {}) {
  if (caramel) {
    if (!caramelCache) caramelCache = new SpriteCache(buildFrameRows, CARAMEL_PALETTE);
    return caramelCache.get(frameKey(frame, face));
  }
  if (!cache) cache = new SpriteCache(buildFrameRows, PALETTE);
  return cache.get(frameKey(frame, face));
}

export function tapitaDissolve(k) {
  if (!dissolveCache) dissolveCache = new SpriteCache((key) => buildDissolveRows(Number(key)), PALETTE);
  return dissolveCache.get(String(k));
}

// Anclaje de la capa de hoja (atrás de la capucha, mirando a la derecha) y de los cristales
export const CAPE_ANCHOR = { x: OX + 2, y: OY + 3 };
export const CAPE_COLORS = [PALETTE.h, PALETTE.L, PALETTE.h, PALETTE.H];

// Melcocha (bola en vuelo 4×4 y plataforma endurecida de 32×8)
export const MELCOCHA = { ball: '#E8A040', light: '#FFD27A', dark: '#9A4A12', outline: '#3A1E08', shine: '#FFF1C2' };
