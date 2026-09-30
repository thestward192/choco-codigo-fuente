// Tiles estilo "Pantalla de Carga" (wireframe a medio renderizar). Se usan en el prólogo
// y en la sala de pruebas. Los bordes se dibujan según los vecinos (autotile simple).
import { Sprite } from '../bake.js';
import { createCanvas } from '../../core/renderer.js';
import { LOADING } from '../palettes.js';
import { T } from '../../systems/tilemap.js';
import { SCREEN } from '../../config/balance.js';

const TS = SCREEN.TILE;
const PAL = { f: LOADING.fill, F: LOADING.fillLight, d: LOADING.dim, w: LOADING.wire, c: LOADING.cyan, C: '#2A6F8A', m: '#FF2E88', M: '#8C1D52', e: '#F4F1EA' };

const SOLID = [
  'ffffffffffffffff',
  'fFfffffffffffffF',
  'ffffffffffffffff',
  'fffffdffffffffff',
  'ffffffffffffffff',
  'ffffffffffffdfff',
  'ffffffffffffffff',
  'fffffffffffffffF',
  'ffffffffffffffff',
  'ffdfffffffffffff',
  'ffffffffffffffff',
  'fffffffffdffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'fFffffffffffffff',
  'ffffffffffffffff',
];

const ONEWAY = ['cccccccccccccccc', 'CCCCCCCCCCCCCCCC', 'w.w.w.w.w.w.w.w.', '.d.d.d.d.d.d.d.d', 'w...w...w...w...'];

const SPIKES = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...e.......e....',
  '...m.......m....',
  '..mMm.....mMm...',
  '..mMm..e..mMm..e',
  '.mMMMm.m.mMMMm.m',
  '.mMMMmmMmmMMMmmM',
  'mMMMMMMMMMMMMMMM',
  'wwwwwwwwwwwwwwww',
  'dddddddddddddddd',
];

const GHOST = [
  'c.c.c.c.c.c.c.c.',
  '...............c',
  'c...............',
  '...............c',
  'c...............',
  '...............c',
  'c...............',
  '...............c',
  'c...............',
  '...............c',
  'c...............',
  '...............c',
  'c...............',
  '...............c',
  'c...............',
  '.c.c.c.c.c.c.c.c',
];

let tiles = null;
export function loadingTiles() {
  if (tiles) return tiles;
  tiles = {
    solid: new Sprite(SOLID, PAL),
    oneway: new Sprite(ONEWAY, PAL),
    spikes: new Sprite(SPIKES, PAL),
    ghost: new Sprite(GHOST, PAL),
  };
  return tiles;
}

// Dibuja los tiles visibles del mapa.
export function drawLoadingTiles(ctx, map, camX, camY, time, ghostActive) {
  const t = loadingTiles();
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(map.w - 1, Math.floor((camX + SCREEN.W) / TS));
  const y1 = Math.min(map.h - 1, Math.floor((camY + SCREEN.H) / TS));
  const solidAt = (x, y) => map.typeAt(x, y) === T.SOLID;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const type = map.typeAt(tx, ty);
      const px = tx * TS - camX;
      const py = ty * TS - camY;
      if (type === T.SOLID) {
        ctx.drawImage(t.solid.normal, px, py);
        // Bordes expuestos
        if (!solidAt(tx, ty - 1)) {
          ctx.fillStyle = LOADING.cyan;
          ctx.fillRect(px, py, TS, 1);
          ctx.fillStyle = '#2A6F8A';
          ctx.fillRect(px, py + 1, TS, 1);
        }
        ctx.fillStyle = LOADING.wire;
        if (!solidAt(tx - 1, ty)) ctx.fillRect(px, py, 1, TS);
        if (!solidAt(tx + 1, ty)) ctx.fillRect(px + TS - 1, py, 1, TS);
        if (!solidAt(tx, ty + 1)) ctx.fillRect(px, py + TS - 1, TS, 1);
      } else if (type === T.ONEWAY) {
        ctx.drawImage(t.oneway.normal, px, py);
      } else if (type === T.SPIKES) {
        ctx.drawImage(t.spikes.normal, px, py);
      } else if (type === T.GHOST) {
        if (ghostActive) {
          ctx.fillStyle = '#123A52';
          ctx.fillRect(px, py, TS, TS);
          ctx.fillStyle = LOADING.cyan;
          ctx.fillRect(px, py, TS, 1);
          ctx.fillRect(px, py + TS - 1, TS, 1);
          ctx.fillRect(px, py, 1, TS);
          ctx.fillRect(px + TS - 1, py, 1, TS);
        } else {
          ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 3 + tx);
          ctx.drawImage(t.ghost.normal, px, py);
          ctx.globalAlpha = 1;
        }
      } else if (type === T.VOID) {
        // Estática magenta animada
        const phase = Math.floor(time * 12);
        for (let i = 0; i < 6; i++) {
          const h = (tx * 31 + ty * 17 + i * 13 + phase * 7) % 16;
          ctx.fillStyle = i % 2 ? '#FF2E88' : '#3A0F2A';
          ctx.fillRect(px + ((h * 5) % 16), py + h, 3, 1);
        }
      }
    }
  }
}

// Fondo en capas con parallax: barra de carga gigante al 99 % (0.1) y cuadrícula wireframe (0.3).
let farLayer = null;
export function drawLoadingBackground(ctx, camX, camY, time, label) {
  ctx.fillStyle = LOADING.bg;
  ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
  // Cuadrícula lejana (0.3)
  const gx = -Math.round(camX * 0.3) % 32;
  const gy = -Math.round(camY * 0.3) % 32;
  ctx.fillStyle = '#0D0F19';
  for (let x = gx - 32; x < SCREEN.W + 32; x += 32) ctx.fillRect(x, 0, 1, SCREEN.H);
  for (let y = gy - 32; y < SCREEN.H + 32; y += 32) ctx.fillRect(0, y, SCREEN.W, 1);
  // Barra de carga (0.1)
  if (!farLayer) {
    farLayer = createCanvas(220, 14);
    const c = farLayer.getContext('2d');
    c.fillStyle = '#141828';
    c.fillRect(0, 0, 220, 14);
    c.fillStyle = '#0B0D16';
    c.fillRect(2, 2, 216, 10);
    c.fillStyle = '#1C3A4A';
    c.fillRect(2, 2, Math.round(216 * 0.99), 10);
    c.fillStyle = '#23495C';
    for (let x = 4; x < 214; x += 8) c.fillRect(x, 2, 3, 10);
  }
  const bx = Math.round(50 - camX * 0.1);
  const by = Math.round(58 - camY * 0.1);
  ctx.drawImage(farLayer, bx, by);
  // Brillo que recorre la barra
  const shine = (time * 60) % 260;
  if (shine > 20 && shine < 234) {
    ctx.fillStyle = '#2E6F88';
    ctx.fillRect(bx + 2 + Math.round(shine) - 20, by + 2, 2, 10);
  }
  if (label) label(bx, by);
}
