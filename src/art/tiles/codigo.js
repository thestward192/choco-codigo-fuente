// Tiles del Código Puro (docs/04_arte.md · nivel 5): fondo #07050D, morado #2A1446, cian del código
// de Choco #43D9FF y magenta de N.U.L.L. #FF2E88. No hay paisaje: bloques de datos, marcos del
// stack y candados. Pintados con el pintor de grillas y horneados una vez.
//   #  bloque de datos (con borde cian arriba si se puede pisar)   =  marco del stack (un sentido)
//   g  memoria fantasma (Vista Debug)   L  candado (lo abre una torreta rota con parry)
import { Grid } from '../painter.js';
import { Sprite } from '../bake.js';
import { T } from '../../systems/tilemap.js';
import { SCREEN } from '../../config/balance.js';

const TS = SCREEN.TILE;

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export const CODE_PAL = {
  o: '#07050D',
  P: '#2A1446', // morado
  p: '#1C0E32',
  q: '#3A1E60',
  c: '#43D9FF', // cian de Choco
  C: '#2AA8D8',
  d: '#16506A',
  m: '#FF2E88', // magenta de N.U.L.L.
  M: '#8C1D52',
  w: '#F4F1EA',
  y: '#FFD23F',
};

// Bloque de datos: morado con "bits" sueltos y una línea de código tenue
function block(top, seed) {
  const g = new Grid(TS, TS, 'p');
  g.frame(0, 0, 15, 15, 'P');
  for (let y = 2; y < 14; y += 3) {
    let x = 2;
    while (x < 13) {
      const len = 1 + Math.floor(hash(x, y, seed) * 4);
      if (hash(x, y, seed + 1) < 0.6) g.hline(x, Math.min(13, x + len - 1), y, hash(x, y, seed + 2) < 0.15 ? 'd' : 'q');
      x += len + 1;
    }
  }
  if (top) g.hline(0, 15, 0, 'c').hline(0, 15, 1, 'd');
  return g;
}

// Marco del stack: una barra fina con corchetes en los extremos
function frameTile() {
  const g = new Grid(TS, TS, '.');
  g.rect(0, 0, 15, 4, 'P').hline(0, 15, 0, 'c').hline(0, 15, 4, 'p');
  for (let x = 2; x < 14; x += 3) g.set(x, 2, 'd');
  g.vline(0, 1, 6, 'C').set(1, 6, 'C');
  g.vline(15, 1, 6, 'C').set(14, 6, 'C');
  return g;
}

function ghostTile() {
  const g = new Grid(TS, TS, '.');
  for (let x = 0; x < TS; x += 2) g.set(x, 0, 'c').set(x + 1, 15, 'c');
  for (let y = 0; y < TS; y += 2) g.set(0, y + 1, 'c').set(15, y, 'c');
  return g;
}

// Candado: bloque magenta con un candadito blanco
function lockTile() {
  const g = new Grid(TS, TS, 'M');
  g.frame(0, 0, 15, 15, 'm');
  g.frame(5, 3, 10, 7, 'w');
  g.rect(4, 7, 11, 12, 'w');
  g.rect(7, 9, 8, 10, 'M');
  return g;
}

let cache = null;
export function codeTiles() {
  if (cache) return cache;
  const mk = (g) => new Sprite(g.toRows(), CODE_PAL);
  cache = {
    top: [mk(block(true, 1)), mk(block(true, 5))],
    fill: [mk(block(false, 2)), mk(block(false, 9))],
    frame: mk(frameTile()),
    ghost: mk(ghostTile()),
    lock: mk(lockTile()),
  };
  return cache;
}

// Dibuja los tiles visibles. opts: { t, ghostActive }
export function drawCodeTiles(ctx, map, camX, camY, opts = {}) {
  const tiles = codeTiles();
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(map.w - 1, Math.floor((camX + SCREEN.W) / TS));
  const y1 = Math.min(map.h - 1, Math.floor((camY + SCREEN.H) / TS));
  const t = opts.t || 0;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = map.charAt(tx, ty);
      const type = map.typeAt(tx, ty);
      if (type === T.EMPTY) continue;
      const px = Math.round(tx * TS - camX);
      const py = Math.round(ty * TS - camY);
      const v = (tx * 7 + ty * 3) % 2;
      if (ch === '#') ctx.drawImage((map.typeAt(tx, ty - 1) === T.SOLID ? tiles.fill[v] : tiles.top[v]).normal, px, py);
      else if (ch === '=') ctx.drawImage(tiles.frame.normal, px, py);
      else if (ch === 'L') {
        ctx.drawImage(tiles.lock.normal, px, py);
        if (Math.floor(t * 3 + tx) % 4 === 0) {
          ctx.fillStyle = '#FF2E88';
          ctx.fillRect(px + 1, py + 1, 14, 1);
        }
      } else if (type === T.GHOST) {
        if (opts.ghostActive) {
          ctx.fillStyle = '#123A52';
          ctx.fillRect(px, py, TS, 6);
          ctx.fillStyle = '#43D9FF';
          ctx.fillRect(px, py, TS, 1);
          ctx.fillRect(px, py + 5, TS, 1);
        } else {
          ctx.globalAlpha = 0.14 + 0.06 * Math.sin(t * 3 + tx);
          ctx.drawImage(tiles.ghost.normal, px, py);
          ctx.globalAlpha = 1;
        }
      } else if (type === T.SOLID) ctx.drawImage(tiles.fill[v].normal, px, py);
    }
  }
}
