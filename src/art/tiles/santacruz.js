// Tiles de Santa Cruz (docs/04_arte.md · nivel 4): tierra rojiza, adobe blanco, tejas, madera,
// ladrillo de las ruinas del campanario y piedra clara de las columnas. Todo pintado con el pintor
// de grillas y horneado una vez.
//   #  tierra (con zacate seco arriba)   A  adobe   R  tejas   W  madera (redondel)
//   B  ladrillo (ruinas)   c  columna de piedra   =  tablón (un sentido)
//   f  banderines (un sentido)   g  plataforma fantasma (Vista Debug)
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

export const SC_PAL = {
  o: '#2A140C',
  // Tierra y zacate seco
  D: '#9C4A2A', d: '#7A3420', l: '#B85E36', G: '#C9B458', g: '#E6D488', v: '#8A7A30',
  // Adobe
  A: '#F5E6C8', a: '#DCC9A4', q: '#B8A37E',
  // Tejas
  R: '#B5532E', r: '#83361C', p: '#DB7A4C',
  // Madera
  M: '#8B5A2B', m: '#5E3A1A', k: '#B07A45',
  // Ladrillo y mortero
  B: '#A0503A', b: '#7A3A2A', x: '#C9A27E', X: '#5A2A20',
  // Piedra de columna
  S: '#E2D3B2', s: '#B2A07C', L: '#F6ECD4',
  // Banderines
  '1': '#FF6B8A', '2': '#FFD23F', '3': '#4FD1C5', '4': '#6E8B3D', '5': '#43D9FF', w: '#F4F1EA',
};

function dirtTop() {
  const g = new Grid(TS, TS, 'D');
  for (let y = 4; y < TS; y++) for (let x = 0; x < TS; x++) if (hash(x, y, 1) < 0.14) g.set(x, y, hash(x, y, 2) < 0.5 ? 'd' : 'l');
  g.hline(0, 15, 0, 'g').hline(0, 15, 1, 'G').hline(0, 15, 2, 'G');
  for (let x = 0; x < TS; x++) {
    const h = 3 + Math.round(hash(x, 0, 3) * 2);
    g.vline(x, 3, h, 'v');
    if (hash(x, 1, 4) < 0.3) g.set(x, 0, 'v');
  }
  g.hline(0, 15, 6, 'l');
  return g;
}

function dirtFill() {
  const g = new Grid(TS, TS, 'D');
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (hash(x, y, 5) < 0.16) g.set(x, y, hash(x, y, 6) < 0.6 ? 'd' : 'l');
  return g;
}

function adobe(top) {
  const g = new Grid(TS, TS, 'A');
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (hash(x, y, 7) < 0.1) g.set(x, y, 'a');
  // Grietitas del repello
  g.line(3, 5, 5, 8, 'q').line(5, 8, 4, 10, 'q');
  if (top) g.hline(0, 15, 0, 'a');
  g.hline(0, 15, 15, 'a');
  return g;
}

function roof() {
  const g = new Grid(TS, TS, 'R');
  // Tejas curvas: arcos de 4 px
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    for (let i = 0; i < 4; i++) {
      const x = i * 4 + (row % 2 ? 2 : 0);
      g.hline(x, x + 3, y, 'p').set(x, y + 3, 'r').set(x + 3, y + 3, 'r').hline(x + 1, x + 2, y + 3, 'r');
    }
  }
  g.hline(0, 15, 0, 'p');
  return g;
}

function wood() {
  const g = new Grid(TS, TS, 'M');
  for (let x = 0; x < TS; x += 4) g.vline(x, 0, 15, 'm');
  for (let i = 0; i < 4; i++) g.set(i * 4 + 2, 3 + (i % 3) * 4, 'k');
  g.hline(0, 15, 0, 'k');
  return g;
}

function brick(top) {
  const g = new Grid(TS, TS, 'B');
  for (let y = 0; y < TS; y += 4) {
    g.hline(0, 15, y + 3, 'X');
    const off = (y / 4) % 2 ? 4 : 0;
    for (let x = off; x < TS; x += 8) g.vline(x, y, y + 2, 'X');
    for (let x = 0; x < TS; x++) if (hash(x, y, 8) < 0.2) g.set(x, y, 'b');
  }
  if (top) g.hline(0, 15, 0, 'x');
  return g;
}

function column() {
  const g = new Grid(TS, TS, 'S');
  g.vline(0, 0, 15, 's').vline(1, 0, 15, 'L').vline(14, 0, 15, 's').vline(15, 0, 15, 'o');
  for (let x = 4; x < 12; x += 3) g.vline(x, 0, 15, 's');
  return g;
}

function columnCracked() {
  const g = column();
  g.line(3, 0, 8, 7, 'o').line(8, 7, 6, 15, 'o').line(8, 7, 13, 10, 'o');
  return g;
}

function plank() {
  const g = new Grid(TS, TS, '.');
  g.rect(0, 0, 15, 4, 'M').hline(0, 15, 0, 'k').hline(0, 15, 4, 'm');
  g.set(2, 2, 'm').set(13, 2, 'm');
  g.rect(1, 5, 2, 7, 'm').rect(13, 5, 14, 7, 'm');
  return g;
}

function flags() {
  const g = new Grid(TS, TS, '.');
  g.hline(0, 15, 0, 'w').hline(0, 15, 1, 'q');
  for (let i = 0; i < 2; i++) {
    const x = i * 8 + 1;
    const c = i ? '2' : '1';
    for (let k = 0; k < 5; k++) g.hline(x + k, x + 6 - k, 2 + k, c);
  }
  return g;
}

function ghostTile() {
  const g = new Grid(TS, TS, '.');
  for (let x = 0; x < TS; x += 2) g.set(x, 0, '5').set(x + 1, 15, '5');
  for (let y = 0; y < TS; y += 2) g.set(0, y + 1, '5').set(15, y, '5');
  return g;
}

let cache = null;
export function santaCruzTiles() {
  if (cache) return cache;
  const mk = (g) => new Sprite(g.toRows(), SC_PAL);
  // Banderines con dos juegos de colores para que no se vean todos iguales
  const flagsB = flags().replace('1', '3').replace('2', '5');
  cache = {
    top: mk(dirtTop()),
    fill: mk(dirtFill()),
    adobeTop: mk(adobe(true)),
    adobe: mk(adobe(false)),
    roof: mk(roof()),
    wood: mk(wood()),
    brickTop: mk(brick(true)),
    brick: mk(brick(false)),
    column: mk(column()),
    columnCracked: mk(columnCracked()),
    plank: mk(plank()),
    flags: [mk(flags()), mk(flagsB)],
    ghost: mk(ghostTile()),
  };
  return cache;
}

// Dibuja los tiles visibles. opts: { t, ghostActive, cracked: Set("x,y") columnas dañadas }
export function drawSantaCruzTiles(ctx, map, camX, camY, opts = {}) {
  const tiles = santaCruzTiles();
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
      const px = tx * TS - camX;
      const py = ty * TS - camY;
      const above = map.charAt(tx, ty - 1);
      let spr = null;
      if (ch === '#') spr = map.typeAt(tx, ty - 1) === T.SOLID ? tiles.fill : tiles.top;
      else if (ch === 'A') spr = above === 'A' ? tiles.adobe : tiles.adobeTop;
      else if (ch === 'R') spr = tiles.roof;
      else if (ch === 'W') spr = tiles.wood;
      else if (ch === 'B') spr = above === 'B' ? tiles.brick : tiles.brickTop;
      else if (ch === 'c') spr = opts.cracked?.has(`${tx},${ty}`) ? tiles.columnCracked : tiles.column;
      else if (ch === '=') spr = tiles.plank;
      else if (ch === 'f') spr = tiles.flags[(tx + ty) % 2];
      else if (type === T.GHOST) {
        if (opts.ghostActive) {
          ctx.fillStyle = '#123A52';
          ctx.fillRect(px, py, TS, 6);
          ctx.fillStyle = '#43D9FF';
          ctx.fillRect(px, py, TS, 1);
          ctx.fillRect(px, py + 5, TS, 1);
        } else {
          ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 3 + tx);
          ctx.drawImage(tiles.ghost.normal, px, py);
          ctx.globalAlpha = 1;
        }
        continue;
      } else if (type === T.SOLID) spr = tiles.fill;
      if (spr) ctx.drawImage(spr.normal, px, py);
    }
  }
}
