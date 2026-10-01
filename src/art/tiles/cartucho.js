// Tiles del Mundo Cartucho (docs/04_arte.md): tres ambientes con la misma lógica de colisión.
//   pradera: cielo #5EC8FF, pasto #4CBB4C, tierra #8B5A2B, bloques Y #FFD23F
//   cuevas:  interior del cartucho #0F3B2E con pistas de circuito doradas #D9AE4B
//   castillo: gris metálico #5A5A6E, estática roja #E0343F, antorchas magenta
// Cada tile se pinta con el pintor de grillas y se hornea una vez por ambiente.
import { Grid } from '../painter.js';
import { Sprite } from '../bake.js';
import { T } from '../../systems/tilemap.js';
import { SCREEN } from '../../config/balance.js';
import { fxRng } from '../../core/rng.js';

const TS = SCREEN.TILE;

// Ruido determinista por posición (texturas sin aleatorio en cada frame)
const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export const THEMES = {
  pradera: {
    pal: {
      o: '#2A1A10', G: '#4CBB4C', g: '#7FE07F', v: '#2E8A3A', D: '#8B5A2B', d: '#5E3A1A', l: '#A87040',
      S: '#A0A0B0', s: '#6E6E80', L: '#D0D0DC', W: '#F4F1EA', w: '#C8D8E8',
    },
    sky: ['#5EC8FF', '#7AD4FF', '#9ADFFF', '#BDEBFF'],
  },
  cuevas: {
    pal: {
      o: '#041A12', G: '#D9AE4B', g: '#F6DE8A', v: '#8A6A20', D: '#0F3B2E', d: '#082A20', l: '#1A5A44',
      S: '#101018', s: '#2B2B38', L: '#3A3A4E', W: '#D9AE4B', w: '#8A6A20',
    },
  },
  castillo: {
    pal: {
      o: '#1A1A24', G: '#8A8AA0', g: '#B0B0C4', v: '#5A5A6E', D: '#5A5A6E', d: '#3A3A4E', l: '#7A7A90',
      S: '#4A4A5E', s: '#2B2B38', L: '#6E6E84', W: '#8A93A6', w: '#4A5266',
    },
  },
};

// Colores comunes (bloques Y, tuberías, grietas)
const COMMON = {
  Y: '#FFD23F', y: '#FFF0A0', b: '#B8902A', k: '#6A4A10', u: '#8B6A40', U: '#5E4A30',
  p: '#4A6A8A', P: '#7A9ABA', q: '#2A3A5A', c: '#43D9FF', r: '#E0343F', m: '#FF2E88', K: '#2B2B38',
};

// ---------- Pintado de cada tile ----------
function groundTop(theme) {
  const g = new Grid(TS, TS, 'D');
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (hash(x, y, 1) < 0.12) g.set(x, y, hash(x, y, 2) < 0.5 ? 'd' : 'l');
  if (theme === 'pradera') {
    // Pasto con borde irregular y briznas
    g.rect(0, 0, 15, 3, 'G');
    for (let x = 0; x < TS; x++) {
      const h = 4 + Math.round(hash(x, 0, 3) * 2);
      g.vline(x, 4, h, 'G');
      g.set(x, h + 1, 'v');
      if (x % 3 === 0) g.set(x, 0, 'g');
    }
    g.hline(0, 15, 1, 'g');
    g.set(3, 2, 'v').set(9, 3, 'v').set(13, 2, 'v');
  } else if (theme === 'cuevas') {
    // Borde dorado de pista de circuito
    g.hline(0, 15, 0, 'g').hline(0, 15, 1, 'G').hline(0, 15, 2, 'v');
    traces(g);
  } else {
    // Piedra con remate claro
    stoneBricks(g);
    g.hline(0, 15, 0, 'g').hline(0, 15, 1, 'G');
  }
  return g;
}

function groundFill(theme) {
  const g = new Grid(TS, TS, 'D');
  if (theme === 'castillo') {
    stoneBricks(g);
    return g;
  }
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (hash(x, y, 4) < 0.12) g.set(x, y, hash(x, y, 5) < 0.5 ? 'd' : 'l');
  if (theme === 'pradera') {
    // Piedritas
    g.rect(4, 6, 6, 7, 'l').set(4, 7, 'd');
    g.rect(11, 12, 12, 13, 'l');
  } else traces(g);
  return g;
}

function traces(g) {
  // Pistas doradas con vías (puntos)
  g.hline(2, 9, 6, 'v').vline(9, 6, 12, 'v').set(9, 12, 'G');
  g.hline(12, 15, 10, 'v').set(12, 10, 'G');
  g.set(2, 6, 'G');
}

function stoneBricks(g) {
  g.rect(0, 0, 15, 15, 'D');
  for (const y of [0, 8]) g.hline(0, 15, y + 7, 'd');
  g.vline(7, 0, 6, 'd');
  g.vline(3, 8, 14, 'd');
  g.vline(12, 8, 14, 'd');
  g.hline(0, 6, 0, 'l').hline(8, 15, 0, 'l').hline(0, 2, 8, 'l').hline(4, 11, 8, 'l').hline(13, 15, 8, 'l');
  g.set(10, 3, 'l').set(5, 11, 'd');
}

function block(theme) {
  const g = new Grid(TS, TS, 'S');
  if (theme === 'cuevas') {
    // Chip: cuerpo negro con patitas doradas
    g.rect(0, 0, 15, 15, 'S');
    for (let i = 2; i < 14; i += 3) g.set(i, 0, 'G').set(i, 15, 'G').set(0, i, 'G').set(15, i, 'G');
    g.rect(2, 2, 13, 13, 's').frame(2, 2, 13, 13, 'L');
    g.set(4, 4, 'G').hline(6, 11, 10, 'L');
    return g;
  }
  g.frame(0, 0, 15, 15, 's');
  g.hline(1, 14, 1, 'L').vline(1, 1, 14, 'L');
  g.hline(1, 14, 14, 's').vline(14, 1, 14, 's');
  g.set(3, 3, 'W').set(12, 3, 'W').set(3, 12, 'W').set(12, 12, 'W');
  if (theme === 'castillo') g.hline(2, 13, 8, 's');
  return g;
}

function oneway(theme) {
  const g = new Grid(TS, TS, '.');
  if (theme === 'pradera') {
    // Puente de tablas
    g.rect(0, 0, 15, 4, 'l').hline(0, 15, 0, 'g').hline(0, 15, 4, 'd');
    g.vline(5, 1, 3, 'd').vline(11, 1, 3, 'd');
    g.vline(2, 5, 7, 'd').vline(13, 5, 7, 'd');
  } else if (theme === 'cuevas') {
    g.rect(0, 0, 15, 2, 'G').hline(0, 15, 0, 'g').hline(0, 15, 3, 'v');
    for (let x = 1; x < TS; x += 4) g.set(x, 4, 'v');
  } else {
    // Rejilla metálica
    g.rect(0, 0, 15, 3, 'W').hline(0, 15, 0, 'L').hline(0, 15, 3, 'w');
    for (let x = 1; x < TS; x += 3) g.set(x, 2, 'w');
    g.vline(1, 4, 6, 'w').vline(14, 4, 6, 'w');
  }
  return g;
}

function cloud() {
  const g = new Grid(TS, TS, '.');
  g.ellipse(4, 5, 4, 3, 'W').ellipse(10, 4, 5, 4, 'W').ellipse(13, 6, 3, 2, 'W');
  g.rect(0, 6, 15, 8, 'W');
  g.hline(0, 15, 8, 'w').hline(2, 13, 9, 'w');
  return g;
}

// Bloque Y: dorado con una Y grabada (2 frames de brillo)
function yBlock(frame) {
  const g = new Grid(TS, TS, 'Y');
  g.frame(0, 0, 15, 15, 'k');
  g.hline(1, 14, 1, 'y').vline(1, 1, 14, 'y');
  g.hline(1, 14, 14, 'b').vline(14, 1, 14, 'b');
  g.set(2, 2, 'k').set(13, 2, 'k').set(2, 13, 'k').set(13, 13, 'k');
  // La Y
  const Yp = [[5, 4], [6, 5], [7, 6], [10, 4], [9, 5], [8, 6], [7, 7], [8, 7], [7, 8], [8, 8], [7, 9], [8, 9], [7, 10], [8, 10], [7, 11], [8, 11]];
  for (const [x, y] of Yp) g.set(x, y, 'k');
  for (const [x, y] of Yp) if (g.get(x + 1, y + 1) === 'Y') g.set(x + 1, y + 1, 'b');
  if (frame === 1) g.set(4, 3, 'y').set(11, 3, 'y').hline(3, 5, 12, 'y');
  return g;
}

function usedBlock() {
  const g = new Grid(TS, TS, 'u');
  g.frame(0, 0, 15, 15, 'k');
  g.hline(1, 14, 14, 'U').vline(14, 1, 14, 'U');
  g.set(2, 2, 'k').set(13, 2, 'k').set(2, 13, 'k').set(13, 13, 'k');
  return g;
}

// Grieta sutil sobre la piedra (pared falsa del castillo)
function cracked(theme) {
  const g = groundFill(theme);
  g.line(4, 1, 6, 5, 'o').line(6, 5, 5, 9, 'o').line(5, 9, 8, 13, 'o');
  g.set(7, 6, 'o').set(8, 7, 'o');
  return g;
}

// Tubería de datos: conducto con franjas cian (boca: '{' '}'; cuerpo: '[' ']')
function pipeTile(part) {
  const g = new Grid(TS, TS, '.');
  const left = part === '{' || part === '[';
  const mouth = part === '{' || part === '}';
  if (mouth) {
    g.rect(0, 0, 15, 6, 'p').hline(0, 15, 0, 'P').hline(0, 15, 6, 'q');
    if (left) g.vline(0, 0, 6, 'q').vline(1, 1, 5, 'P');
    else g.vline(15, 0, 6, 'q');
    g.hline(0, 15, 3, 'c');
    g.rect(left ? 2 : 0, 7, left ? 15 : 13, 15, 'p');
    if (left) g.vline(2, 7, 15, 'q').vline(3, 7, 15, 'P');
    else g.vline(13, 7, 15, 'q');
    g.hline(left ? 4 : 0, left ? 15 : 11, 11, 'c');
  } else {
    g.rect(left ? 2 : 0, 0, left ? 15 : 13, 15, 'p');
    if (left) g.vline(2, 0, 15, 'q').vline(3, 0, 15, 'P');
    else g.vline(13, 0, 15, 'q');
    g.hline(left ? 4 : 0, left ? 15 : 11, 7, 'c');
  }
  return g;
}

function spikes(theme) {
  const g = new Grid(TS, TS, '.');
  const c1 = theme === 'castillo' ? 'g' : 'L';
  for (let i = 0; i < 4; i++) {
    const x = i * 4;
    for (let k = 0; k < 7; k++) g.hline(x + 2 - Math.floor(k / 3), x + 1 + Math.ceil(k / 3), 8 + k, k < 2 ? c1 : 'S');
  }
  g.hline(0, 15, 15, 's');
  return g;
}

const cache = {};
export function cartuchoTiles(theme) {
  if (cache[theme]) return cache[theme];
  const pal = { ...THEMES[theme].pal, ...COMMON };
  const mk = (g) => new Sprite(g.toRows(), pal);
  const t = {
    top: mk(groundTop(theme)),
    fill: mk(groundFill(theme)),
    block: mk(block(theme)),
    oneway: mk(oneway(theme)),
    cloud: mk(cloud()),
    y: [mk(yBlock(0)), mk(yBlock(1))],
    used: mk(usedBlock()),
    cracked: mk(cracked(theme)),
    spikes: mk(spikes(theme)),
    pipe: { '{': mk(pipeTile('{')), '}': mk(pipeTile('}')), '[': mk(pipeTile('[')), ']': mk(pipeTile(']')) },
  };
  // Versión "corrupta" de los tiles del suelo (paleta de glitch por luminosidad) para el avance de N.U.L.L.
  const inv = {};
  for (const [k, v] of Object.entries(pal)) inv[k] = glitchColor(v);
  t.topCorrupt = new Sprite(groundTop(theme).toRows(), inv);
  t.fillCorrupt = new Sprite(groundFill(theme).toRows(), inv);
  cache[theme] = t;
  return t;
}

const GLITCH = ['#0B0610', '#2A1446', '#8C1D52', '#FF2E88', '#43D9FF'];
function glitchColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
  return GLITCH[Math.min(GLITCH.length - 1, Math.floor(lum * GLITCH.length))];
}

const Y_CHARS = new Set(['Q', 'C', 'M', 'H']);

// Dibuja los tiles visibles. opts: { corruption(tx) → 0..1, bumps: Map("x,y" → offsetY), t }
export function drawCartuchoTiles(ctx, map, theme, camX, camY, opts = {}) {
  const tiles = cartuchoTiles(theme);
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(map.w - 1, Math.floor((camX + SCREEN.W) / TS));
  const y1 = Math.min(map.h - 1, Math.floor((camY + SCREEN.H) / TS));
  const t = opts.t || 0;
  const yFrame = Math.floor(t * 2) % 4 === 0 ? 1 : 0;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = map.charAt(tx, ty);
      const type = map.typeAt(tx, ty);
      if (type === T.EMPTY || type === T.HIDDEN) continue;
      const px = tx * TS - camX;
      let py = ty * TS - camY;
      const bump = opts.bumps?.get(`${tx},${ty}`);
      if (bump) py -= bump;
      let spr = null;
      if (ch === '#') {
        const exposed = map.typeAt(tx, ty - 1) !== T.SOLID;
        // Glitch progresivo: pocos tiles, y solo en destellos cortos
        const corrupt = opts.corruption && hash(tx, ty, 9) < opts.corruption(tx) * 0.07 && Math.floor(t * 4 + hash(tx, ty, 12) * 40) % 9 === 0;
        spr = exposed ? (corrupt ? tiles.topCorrupt : tiles.top) : corrupt ? tiles.fillCorrupt : tiles.fill;
      } else if (ch === 'B') spr = tiles.block;
      else if (Y_CHARS.has(ch)) spr = tiles.y[yFrame];
      else if (ch === 'U') spr = tiles.used;
      else if (ch === 'K') spr = tiles.cracked;
      else if (ch === '=') spr = tiles.oneway;
      else if (ch === 'c') spr = tiles.cloud;
      else if (ch === '^') spr = tiles.spikes;
      else if (tiles.pipe[ch]) spr = tiles.pipe[ch];
      else if (type === T.SOLID) spr = tiles.fill;
      if (spr) ctx.drawImage(spr.normal, px, py);
      // Glitch: un píxel suelto que parpadea en los tiles corruptos
      if (opts.corruption && ch === '#' && hash(tx, ty, 11) < opts.corruption(tx) * 0.1 && fxRng.chance(0.2)) {
        ctx.fillStyle = fxRng.pick(['#FF2E88', '#43D9FF']);
        ctx.fillRect(px + fxRng.int(0, 14), py + fxRng.int(0, 14), 2, 1);
      }
    }
  }
}
