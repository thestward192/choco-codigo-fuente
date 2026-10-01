// Guardián del Slot (48×48): un cartucho gigante con patas, la etiqueta despegada y ojos rojos
// en la ranura. Diseño original. Se compone de cuerpo + ojos + patas con el pintor de grillas.
import { Grid } from '../painter.js';
import { SpriteCache } from '../bake.js';

export const GUARDIAN_PAL = {
  o: '#14141C',
  G: '#8A8AA0',
  g: '#B8B8CC',
  d: '#5A5A6E',
  D: '#3A3A4E',
  k: '#07070C',
  E: '#E0343F',
  e: '#FF9A9A',
  L: '#F4E9D0',
  l: '#C8B898',
  R: '#E0343F',
  B: '#3C6EF0',
  n: '#4CBB4C',
  y: '#FFD23F',
  m: '#FF2E88',
  p: '#2B2B38',
  P: '#5A5A6E',
  w: '#FFFFFF',
};

const S = 48;

function body(g, dy) {
  const x0 = 7;
  const x1 = 40;
  const y0 = 7 + dy;
  const y1 = 41 + dy;
  // Carcasa con esquinas recortadas y muesca de agarre
  g.rect(x0, y0, x1, y1, 'G');
  g.frame(x0, y0, x1, y1, 'o');
  g.set(x0, y0, '.').set(x1, y0, '.').set(x0, y1, '.').set(x1, y1, '.');
  g.set(x0 + 1, y0 + 1, 'o').set(x1 - 1, y0 + 1, 'o').set(x0 + 1, y1 - 1, 'o').set(x1 - 1, y1 - 1, 'o');
  g.hline(x0 + 2, x1 - 2, y0 + 1, 'g').vline(x0 + 1, y0 + 2, y1 - 2, 'g');
  g.vline(x1 - 1, y0 + 2, y1 - 2, 'd').hline(x0 + 2, x1 - 2, y1 - 1, 'd');
  // Estrías laterales de agarre
  for (let y = y0 + 22; y < y1 - 3; y += 3) {
    g.hline(x0 + 2, x0 + 4, y, 'd');
    g.hline(x1 - 4, x1 - 2, y, 'd');
  }
  // Ranura superior (donde están los ojos)
  g.rect(x0 + 5, y0 + 4, x1 - 5, y0 + 10, 'k');
  g.hline(x0 + 5, x1 - 5, y0 + 3, 'D').hline(x0 + 5, x1 - 5, y0 + 11, 'g');
  // Contactos dorados asomando dentro de la ranura
  for (let x = x0 + 7; x < x1 - 6; x += 3) g.set(x, y0 + 10, 'y');
  // Etiqueta despegada: dibujo de cerro y sol, esquina superior izquierda doblada
  const lx0 = x0 + 5;
  const lx1 = x1 - 5;
  const ly0 = y0 + 14;
  const ly1 = y1 - 5;
  g.rect(lx0, ly0, lx1, ly1, 'L');
  g.frame(lx0, ly0, lx1, ly1, 'l');
  // Dibujo de la etiqueta: cielo, sol y un cerro
  g.rect(lx0 + 2, ly0 + 3, lx1 - 2, ly1 - 6, 'B');
  g.ellipse(lx1 - 6, ly0 + 6, 2, 2, 'y');
  const peakY = ly0 + 4;
  const baseY = ly1 - 6;
  for (let y = peakY; y <= baseY; y++) {
    const half = Math.round(((y - peakY) * 8) / (baseY - peakY));
    g.hline(lx0 + 9 - half, lx0 + 9 + half, y, 'n');
  }
  g.hline(lx0 + 2, lx1 - 2, ly1 - 4, 'R').hline(lx0 + 2, lx1 - 2, ly1 - 3, 'R');
  // Esquina despegada (doblada hacia afuera)
  g.rect(lx0, ly0, lx0 + 4, ly0 + 3, 'G');
  g.line(lx0, ly0 + 4, lx0 + 5, ly0 - 1, 'l');
  g.set(lx0 + 1, ly0 + 3, 'L').set(lx0 + 2, ly0 + 2, 'L').set(lx0 + 3, ly0 + 1, 'L');
  // Glitch magenta en la etiqueta
  g.hline(lx1 - 6, lx1 - 2, ly0 + 11, 'm').set(lx1 - 9, ly0 + 13, 'm');
}

function eyes(g, dy, kind) {
  const y = 7 + dy + 7;
  const lx = 17;
  const rx = 29;
  if (kind === 'stun') {
    // Ojos en espiral (aturdido)
    for (const cx of [lx, rx]) {
      g.set(cx - 1, y - 1, 'e').set(cx, y - 1, 'E').set(cx + 1, y, 'E').set(cx, y + 1, 'E').set(cx - 1, y, 'E').set(cx, y, 'w');
    }
    return;
  }
  if (kind === 'closed') {
    g.hline(lx - 2, lx + 2, y, 'E').hline(rx - 2, rx + 2, y, 'E');
    return;
  }
  for (const cx of [lx, rx]) {
    g.rect(cx - 2, y - 1, cx + 2, y + 1, 'E');
    g.set(cx - 1, y - 1, 'e');
  }
  if (kind === 'angry') {
    g.line(lx - 3, y - 3, lx + 2, y - 1, 'k').line(rx + 3, y - 3, rx - 2, y - 1, 'k');
    g.line(lx - 3, y - 2, lx + 2, y, 'E');
    g.line(rx + 3, y - 2, rx - 2, y, 'E');
  }
}

// Patas: [x de la cadera, x del pie, altura del pie] por pata; las de atrás más oscuras
const LEGS = {
  stand: [
    [12, 11, 47, 'p'],
    [35, 36, 47, 'p'],
    [16, 16, 47, 'P'],
    [31, 31, 47, 'P'],
  ],
  walk1: [
    [12, 9, 47, 'p'],
    [35, 37, 46, 'p'],
    [16, 18, 46, 'P'],
    [31, 29, 47, 'P'],
  ],
  walk2: [
    [12, 13, 46, 'p'],
    [35, 33, 47, 'p'],
    [16, 14, 47, 'P'],
    [31, 33, 46, 'P'],
  ],
  air: [
    [12, 9, 45, 'p'],
    [35, 38, 45, 'p'],
    [16, 15, 44, 'P'],
    [31, 32, 44, 'P'],
  ],
};

function legs(g, dy, kind) {
  const set = LEGS[kind] || LEGS.stand;
  const top = 41 + dy;
  // Primero las de atrás (P), después las de adelante (p)
  for (const back of [true, false]) {
    for (const [hx, fx, fy, c] of set) {
      if ((c === 'P') !== back) continue;
      g.line(hx, top, fx, fy, c).line(hx + 1, top, fx + 1, fy, c);
      g.hline(fx - 1, fx + 2, fy, 'o');
    }
  }
}

export function buildGuardianRows(key) {
  const [pose, eye] = key.split(':');
  const g = new Grid(S, S);
  const dy = pose === 'crouch' ? 4 : pose === 'air' ? -1 : 0;
  const legKind = pose === 'crouch' ? 'stand' : pose;
  legs(g, dy, legKind);
  body(g, dy);
  eyes(g, dy, eye);
  return g.toRows();
}

let cache = null;
// pose: stand | walk1 | walk2 | crouch | air ; eye: normal | angry | stun | closed
export function guardianSprite(pose = 'stand', eye = 'normal') {
  if (!cache) cache = new SpriteCache(buildGuardianRows, GUARDIAN_PAL);
  return cache.get(`${pose}:${eye}`);
}

export const GUARDIAN_COLORS = [GUARDIAN_PAL.G, GUARDIAN_PAL.g, GUARDIAN_PAL.d, GUARDIAN_PAL.L, GUARDIAN_PAL.E, GUARDIAN_PAL.m];
