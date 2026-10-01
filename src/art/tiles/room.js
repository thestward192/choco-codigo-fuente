// Cuarto de Choco (prólogo, parte A). Se hornea una sola vez en un canvas del tamaño del cuarto;
// lo animado (televisor, estrellas, luz de la lámpara) se dibuja encima en cada frame.
// Paleta: noche #1A1426, lámpara #F2B25C, tele #3C6EF0, glitch #FF2E88 (docs/04_arte.md).
import { createCanvas } from '../../core/renderer.js';
import { ROOM, ROOM_W, ROOM_H } from '../../levels/level0_prologo/roomMap.js';
import { ACCENTS } from '../palettes.js';

const TS = 16;
export const ROOM_COLORS = {
  night: '#1A1426',
  wall: '#241C33',
  wallDark: '#1A1426',
  wallLine: '#2C2340',
  ceiling: '#120E1B',
  floor: '#3B2A2A',
  floorLight: '#4E3833',
  floorDark: '#2A1D1E',
  wood: '#7A4E2E',
  woodLight: '#A06A3E',
  woodDark: '#4E301C',
  lamp: '#F2B25C',
  lampLight: '#FFE2A8',
  tv: '#3C6EF0',
  outline: '#0C0812',
  glitch: '#FF2E88',
};
const C = ROOM_COLORS;

let baked = null;

export function roomCanvas() {
  if (baked) return baked;
  const W = ROOM_W * TS;
  const H = ROOM_H * TS;
  baked = createCanvas(W, H);
  const ctx = baked.getContext('2d');
  const r = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const R = ROOM;
  const floorY = R.floor * TS;

  // Pared con papel tapiz de rayas tenues y rombos
  r(0, 0, W, H, C.wall);
  for (let x = 0; x < W; x += 12) r(x, 16, 1, floorY - 16, C.wallLine);
  for (let x = 6; x < W; x += 12) for (let y = 24; y < floorY - 8; y += 16) r(x, y, 1, 1, '#33294A');
  // Techo y moldura
  r(0, 0, W, 16, C.ceiling);
  r(0, 15, W, 1, '#2E2440');
  // Zócalo
  r(0, floorY - 4, W, 4, '#2E2238');
  r(0, floorY - 4, W, 1, '#3E3050');
  // Piso de madera
  r(0, floorY, W, H - floorY, C.floor);
  r(0, floorY, W, 1, C.floorLight);
  for (let x = 0; x < W; x += 24) r(x + ((x / 24) % 2) * 12, floorY + 2, 1, 5, C.floorDark);
  r(0, floorY + 7, W, 1, C.floorDark);
  for (let x = 6; x < W; x += 24) r(x, floorY + 8, 1, 8, C.floorDark);
  // Paredes laterales
  r(0, 0, TS, H, '#140F1E');
  r(W - TS, 0, TS, H, '#140F1E');
  r(TS - 1, 16, 1, floorY - 16, '#2E2440');
  r(W - TS, 16, 1, floorY - 16, '#2E2440');

  drawWindow(ctx, r, R.window);
  drawGuitar(ctx, r, R.guitar.x * TS, floorY);
  drawPhoto(ctx, r, R.photo.x * TS, R.photo.y * TS);
  drawFridge(ctx, r, R.fridge.x * TS, R.fridge.top * TS, R.fridge.w * TS, floorY);
  drawDesk(ctx, r, R.desk.x * TS, R.desk.top * TS, R.desk.w * TS, floorY);
  drawShelf(ctx, r, R.shelf.x * TS, R.shelf.y * TS, R.shelf.w * TS);
  drawFloorLamp(ctx, r, R.lamp.x * TS, floorY);
  drawStool(ctx, r, R.stool.x * TS, R.stool.top * TS, floorY);
  drawBed(ctx, r, R.bed.x * TS, R.bed.top * TS, R.bed.w * TS, floorY, R.headboard);
  drawCabinet(ctx, r, R.cabinet.x * TS, R.cabinet.top * TS, R.cabinet.w * TS, floorY);
  drawTvBody(ctx, r);
  drawDoor(ctx, r, R.door.x * TS, floorY);
  return baked;
}

// ---------- Muebles ----------

function drawWindow(ctx, r, w) {
  const x = w.x * TS;
  const y = w.y * TS;
  const ww = w.w * TS;
  const hh = w.h * TS;
  r(x - 3, y - 3, ww + 6, hh + 6, '#2E2238');
  r(x - 2, y - 2, ww + 4, hh + 4, '#5A4A6A');
  r(x, y, ww, hh, '#0E1430');
  // Cielo un poco más claro abajo
  r(x, y + hh - 18, ww, 18, '#141C40');
  r(x, y + hh - 8, ww, 8, '#1A2450');
  // Luna creciente
  r(x + 10, y + 8, 5, 6, '#F4F1EA');
  r(x + 9, y + 9, 1, 4, '#F4F1EA');
  r(x + 12, y + 8, 4, 5, '#0E1430');
  // Guanacaste: copa ancha en forma de sombrilla y tronco
  const gx = x + ww - 30;
  const gy = y + hh - 22;
  r(gx - 4, gy, 38, 4, '#06060E');
  r(gx, gy - 3, 30, 3, '#06060E');
  r(gx + 6, gy - 5, 18, 2, '#06060E');
  r(gx - 6, gy + 3, 6, 2, '#06060E');
  r(gx + 28, gy + 3, 8, 2, '#06060E');
  r(gx + 13, gy + 4, 3, 18, '#06060E');
  r(gx + 10, gy + 6, 3, 1, '#06060E');
  r(gx + 16, gy + 8, 3, 1, '#06060E');
  // Cerros lejanos
  for (let i = 0; i < ww; i++) {
    const hgt = 3 + Math.round(2 * Math.sin(i * 0.15) + Math.sin(i * 0.41));
    r(x + i, y + hh - hgt, 1, hgt, '#090C1E');
  }
  // Marco en cruz
  r(x + ww / 2 - 1, y, 2, hh, '#5A4A6A');
  r(x, y + hh / 2 - 1, ww, 2, '#5A4A6A');
  // Cortinas
  for (const [cx, dir] of [
    [x - 8, 1],
    [x + ww + 2, -1],
  ]) {
    r(cx, y - 6, 6, hh + 14, '#5A2E3A');
    for (let i = 0; i < hh + 14; i += 4) r(cx + (dir > 0 ? 4 : 1), y - 6 + i, 1, 2, '#3E1E28');
    r(cx + (dir > 0 ? 0 : 5), y - 6, 1, hh + 14, '#7A3E4E');
  }
  r(x - 10, y - 7, ww + 20, 2, '#8A6A40');
}

function drawGuitar(ctx, r, x, floorY) {
  // Guitarra apoyada en la esquina (un poco inclinada)
  const bx = x + 2;
  const by = floorY - 18;
  r(bx + 1, by, 10, 6, '#A0522D');
  r(bx, by + 6, 12, 10, '#A0522D');
  r(bx + 1, by + 16, 10, 2, '#7A3E22');
  r(bx + 2, by + 1, 8, 4, '#C06A3A');
  r(bx + 1, by + 7, 10, 8, '#C06A3A');
  r(bx + 4, by + 8, 4, 4, '#2A1410');
  r(bx + 3, by + 14, 6, 1, '#2A1410');
  // Mástil y clavijero
  for (let i = 0; i < 26; i++) r(bx + 5 + Math.floor(i / 9), by - 1 - i, 2, 1, '#4E301C');
  r(bx + 7, by - 30, 4, 4, '#2A1410');
  r(bx + 6, by - 29, 1, 1, '#D9AE4B');
  r(bx + 11, by - 28, 1, 1, '#D9AE4B');
  // Cuerdas
  r(bx + 6, by - 4, 1, 18, '#D8D8E0');
}

function drawPhoto(ctx, r, x, y) {
  // Foto de los fundadores: cuatro cuadritos posando juntos
  r(x - 2, y - 2, 30, 24, '#8A6A30');
  r(x - 1, y - 1, 28, 22, '#C9A15A');
  r(x, y, 26, 20, '#2E3A5A');
  r(x, y + 14, 26, 6, '#3A4A3A');
  const acc = [ACCENTS.oscar, ACCENTS.stward, ACCENTS.hezron, ACCENTS.fabiola];
  acc.forEach((a, i) => {
    const sx = x + 2 + i * 6;
    const sy = y + 7 + (i % 2);
    r(sx - 1, sy - 1, 7, 7, a);
    r(sx, sy, 5, 5, '#5C3521');
    r(sx, sy, 5, 1, '#83522F');
    r(sx + 1, sy + 2, 1, 1, '#F4F1EA');
    r(sx + 3, sy + 2, 1, 1, '#F4F1EA');
  });
  // Brazos arriba de dos de ellos (pose)
  r(x + 1, y + 4, 1, 2, '#1E120C');
  r(x + 24, y + 4, 1, 3, '#1E120C');
  // Clavo
  r(x + 12, y - 5, 2, 2, '#8A8AA0');
}

function drawFridge(ctx, r, x, top, w, floorY) {
  const h = floorY - top;
  r(x, top, w, h, '#B8B8C8');
  r(x + 1, top + 1, w - 2, h - 2, '#D8D8E0');
  r(x + 1, top + 1, w - 2, 1, '#F4F1EA');
  r(x + 1, top + 10, w - 2, 1, '#9A9AAE');
  r(x + w - 5, top + 4, 2, 4, '#8A8AA0');
  r(x + w - 5, top + 14, 2, 8, '#8A8AA0');
  // Imán (chocolatito) y nota
  r(x + 5, top + 14, 4, 4, '#5C3521');
  r(x + 11, top + 13, 6, 7, '#FFE9A8');
  r(x + 12, top + 15, 4, 1, '#8A8AA0');
  r(x + 12, top + 17, 3, 1, '#8A8AA0');
  r(x, floorY - 1, w, 1, '#6A6A80');
}

function drawDesk(ctx, r, x, top, w, floorY) {
  r(x, top, w, 3, C.woodLight);
  r(x, top + 3, w, 2, C.wood);
  r(x, top + 5, w, 1, C.woodDark);
  r(x + 2, top + 6, 3, floorY - top - 6, C.woodDark);
  r(x + w - 5, top + 6, 3, floorY - top - 6, C.woodDark);
  // Cajón
  r(x + w - 22, top + 6, 16, 8, C.wood);
  r(x + w - 16, top + 9, 4, 1, C.lampLight);
  // Laptop abierta (la pantalla se dibuja aparte)
  const lx = x + 16;
  r(lx - 2, top - 1, 26, 1, '#5A5A6E');
  r(lx, top - 2, 22, 1, '#8A8AA0');
  r(lx + 1, top - 18, 20, 16, '#2B2B38');
  r(lx + 2, top - 17, 18, 14, '#0E1A12');
  // Reloj digital: 11:58
  const cx = x + 4;
  r(cx, top - 7, 13, 7, '#101018');
  digits(r, cx + 1, top - 6, '1158', '#E0343F');
  // Lámpara de escritorio
  const ax = x + w - 9;
  r(ax, top - 1, 7, 1, '#3A3A4E');
  r(ax + 3, top - 10, 1, 9, '#3A3A4E');
  r(ax + 1, top - 15, 7, 5, '#2E5E4E');
  r(ax + 2, top - 10, 5, 1, C.lampLight);
}

// Dígitos mínimos de 2×5 para el reloj
function digits(r, x, y, str, color) {
  const shapes = {
    1: ['.#', '.#', '.#', '.#', '.#'],
    5: ['##', '#.', '##', '.#', '##'],
    8: ['##', '##', '..', '##', '##'],
  };
  let cx = x;
  [...str].forEach((d, i) => {
    if (i === 2) {
      r(cx, y + 1, 1, 1, color);
      r(cx, y + 3, 1, 1, color);
      cx += 2;
    }
    const s = shapes[d];
    s.forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && r(cx + xx, y + yy, 1, 1, color)));
    cx += 3;
  });
}

function drawShelf(ctx, r, x, y, w) {
  // Estante vacío: tabla con soportes, polvo y la marca de donde irá un trofeo
  r(x, y + 10, w, 3, C.woodLight);
  r(x, y + 13, w, 1, C.woodDark);
  r(x + 3, y + 14, 2, 4, C.woodDark);
  r(x + w - 5, y + 14, 2, 4, C.woodDark);
  r(x + 2, y + 9, w - 4, 1, '#3A3050');
  // Silueta punteada del trofeo que falta
  const tx = x + w / 2 - 4;
  for (let i = 0; i < 8; i += 2) r(tx + i, y - 1, 1, 1, '#4A3E60');
  for (let j = 0; j < 8; j += 2) {
    r(tx, y - 1 + j, 1, 1, '#4A3E60');
    r(tx + 7, y - 1 + j, 1, 1, '#4A3E60');
  }
  r(tx + 3, y + 7, 2, 1, '#4A3E60');
}

function drawFloorLamp(ctx, r, x, floorY) {
  r(x + 4, floorY - 2, 8, 2, '#3A3A4E');
  r(x + 7, floorY - 52, 2, 50, '#3A3A4E');
  // Pantalla de la lámpara
  r(x + 2, floorY - 64, 12, 2, '#C98A3E');
  r(x + 1, floorY - 62, 14, 8, '#E8A85A');
  r(x, floorY - 54, 16, 2, '#C98A3E');
  r(x + 3, floorY - 52, 10, 1, C.lampLight);
}

function drawStool(ctx, r, x, top, floorY) {
  r(x + 1, top, 14, 3, C.woodLight);
  r(x + 1, top + 3, 14, 1, C.woodDark);
  r(x + 3, top + 4, 2, floorY - top - 4, C.woodDark);
  r(x + 11, top + 4, 2, floorY - top - 4, C.woodDark);
  r(x + 4, top + 9, 8, 1, C.woodDark);
}

function drawBed(ctx, r, x, top, w, floorY, head) {
  // Base
  r(x, top + 6, w, floorY - top - 6, C.woodDark);
  r(x, top + 6, w, 1, C.wood);
  r(x + 1, floorY - 3, 3, 3, C.outline);
  r(x + w - 4, floorY - 3, 3, 3, C.outline);
  // Colchón y cobija
  r(x, top, w, 6, '#D8D0E0');
  r(x, top + 2, w - 16, 7, '#3C5A9A');
  r(x, top + 2, w - 16, 1, '#5A7AC0');
  for (let i = 4; i < w - 18; i += 8) r(x + i, top + 5, 3, 2, '#2E4680');
  // Almohada
  r(x + w - 15, top - 3, 13, 6, '#F4F1EA');
  r(x + w - 15, top + 2, 13, 1, '#B8B0C8');
  // Respaldo
  const hx = head.x * TS;
  const hy = head.top * TS;
  r(hx, hy, 14, floorY - hy, C.wood);
  r(hx, hy, 14, 3, C.woodLight);
  r(hx + 2, hy + 6, 10, 18, C.woodDark);
  r(hx + 3, hy + 7, 8, 16, C.wood);
}

function drawCabinet(ctx, r, x, top, w, floorY) {
  const h = floorY - top;
  r(x, top, w, h, C.woodDark);
  r(x + 1, top, w - 2, 4, C.woodLight);
  r(x + 1, top + 4, w - 2, 1, C.outline);
  // Puertas y gavetas
  r(x + 4, top + 8, w / 2 - 6, h - 30, C.wood);
  r(x + w / 2 + 2, top + 8, w / 2 - 6, h - 30, C.wood);
  r(x + w / 2 - 4, top + h / 2 - 8, 2, 4, C.lampLight);
  r(x + w / 2 + 2, top + h / 2 - 8, 2, 4, C.lampLight);
  r(x + 4, top + h - 18, w - 8, 12, C.wood);
  r(x + w / 2 - 4, top + h - 13, 8, 2, C.lampLight);
  // Calcomanía de un control en una puerta
  r(x + 10, top + 20, 8, 4, '#3A3A4E');
  r(x + 11, top + 21, 1, 1, '#E0343F');
  r(x + 16, top + 21, 1, 1, '#43D9FF');
}

function drawTvBody(ctx, r) {
  const R = ROOM;
  const x = R.tv.x * TS;
  const top = R.cabinet.top * TS;
  const w = R.tv.w * TS;
  // Televisor de tubo
  r(x + 1, top - 30, w - 2, 30, '#2B2B38');
  r(x + 2, top - 29, w - 4, 1, '#4A4A5E');
  r(x + 3, top - 27, w - 14, 22, '#101018');
  r(x + w - 9, top - 24, 5, 5, '#3A3A4E');
  r(x + w - 8, top - 16, 3, 3, '#3A3A4E');
  r(x + w - 8, top - 10, 3, 1, '#E0343F');
  r(x + 4, top - 2, w - 8, 2, '#1A1A24');
  // Antena
  r(x + 18, top - 33, 1, 3, '#5A5A6E');
  for (let i = 0; i < 7; i++) {
    r(x + 18 - i, top - 34 - i, 1, 1, '#5A5A6E');
    r(x + 19 + i, top - 34 - i, 1, 1, '#5A5A6E');
  }
  // Consola al lado, con control y cable
  const cx = (R.tv.x + R.tv.w) * TS + 2;
  r(cx, top - 7, 22, 7, '#3A3A4E');
  r(cx, top - 7, 22, 1, '#5A5A6E');
  r(cx + 3, top - 4, 6, 1, '#101018');
  r(cx + 16, top - 5, 2, 2, '#6FE08A');
  r(cx + 6, top - 12, 10, 4, '#2B2B38');
  r(cx + 7, top - 11, 2, 1, '#8A8AA0');
  r(cx + 12, top - 11, 1, 1, '#E0343F');
  r(cx + 14, top - 11, 1, 1, '#43D9FF');
}

function drawDoor(ctx, r, x, floorY) {
  const top = floorY - 66;
  r(x - 2, top - 2, 36, 68, '#2E2238');
  r(x, top, 32, 66, '#5A3A2A');
  r(x + 3, top + 4, 26, 24, '#6A4632');
  r(x + 3, top + 34, 26, 28, '#6A4632');
  r(x + 25, top + 34, 3, 3, '#D9AE4B');
  r(x, top, 32, 1, '#7A5240');
  // Luz del pasillo bajo la puerta
  r(x + 1, floorY - 1, 30, 1, '#3A2E20');
}

// Pantalla del televisor (en coordenadas del cuarto)
export function tvScreenRect() {
  const x = ROOM.tv.x * TS + 3;
  const top = ROOM.cabinet.top * TS;
  return { x, y: top - 27, w: ROOM.tv.w * TS - 14, h: 22 };
}

// Pantalla de la laptop del escritorio
export function laptopScreenRect() {
  const x = ROOM.desk.x * TS + 18;
  return { x, y: ROOM.desk.top * TS - 17, w: 18, h: 14 };
}
