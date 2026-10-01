// Fondos con parallax del Mundo Cartucho (docs/04_arte.md: capas a 0.1, 0.3 y 0.6, las lejanas
// con menos contraste). Las capas se hornean una vez en tiras de 640 px que se repiten.
import { createCanvas } from '../../core/renderer.js';
import { SCREEN } from '../../config/balance.js';
import { drawText } from '../font.js';
import { disc } from '../../core/lighting.js';

const W = SCREEN.W;
const H = SCREEN.H;
const STRIP = 640;

const hash = (x, s = 0) => {
  let h = (x * 374761393 + s * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

let layers = null;
function bake() {
  if (layers) return layers;
  layers = {};
  // --- Pradera: colinas lejanas (0.3) y cercanas (0.6) con patrón de píxeles ---
  layers.farHills = strip(70, (c) => {
    for (let x = 0; x < STRIP; x++) {
      const h = 30 + Math.round(18 * Math.sin((x / STRIP) * Math.PI * 4) + 10 * Math.sin((x / STRIP) * Math.PI * 10 + 1));
      c.fillStyle = '#8FD6A0';
      c.fillRect(x, 70 - h, 1, h);
      c.fillStyle = '#A8E2B4';
      c.fillRect(x, 70 - h, 1, 2);
    }
    c.fillStyle = '#7CC890';
    for (let y = 20; y < 70; y += 6) for (let x = (y / 6) % 2 ? 0 : 3; x < STRIP; x += 6) c.fillRect(x, y, 1, 1);
  });
  layers.nearHills = strip(60, (c) => {
    for (let x = 0; x < STRIP; x++) {
      const h = 24 + Math.round(14 * Math.sin((x / STRIP) * Math.PI * 6 + 2) + 6 * Math.sin((x / STRIP) * Math.PI * 16));
      c.fillStyle = '#3FA34A';
      c.fillRect(x, 60 - h, 1, h);
      c.fillStyle = '#5BC266';
      c.fillRect(x, 60 - h, 1, 2);
    }
    // Arbustos redondos
    for (let i = 0; i < 9; i++) {
      const bx = Math.round(hash(i, 3) * STRIP);
      c.fillStyle = '#2E8A3A';
      disc(c, bx, 46, 7);
      disc(c, bx + 8, 48, 5);
      c.fillStyle = '#4CBB4C';
      disc(c, bx - 2, 44, 3);
    }
    c.fillStyle = '#35963F';
    for (let y = 30; y < 60; y += 4) for (let x = (y / 4) % 2 ? 1 : 3; x < STRIP; x += 4) c.fillRect(x, y, 1, 1);
  });
  // --- Cuevas: pistas de circuito lejanas (0.3) y chips cercanos (0.6) ---
  layers.circuit = strip(H, (c) => {
    c.fillStyle = '#0B2A20';
    c.fillRect(0, 0, STRIP, H);
    c.fillStyle = '#123A2C';
    for (let i = 0; i < 40; i++) {
      const x = Math.round(hash(i, 5) * STRIP);
      const y = Math.round(hash(i, 6) * H);
      const len = 20 + Math.round(hash(i, 7) * 60);
      c.fillRect(x, y, len, 1);
      c.fillRect(x + len, y, 1, 18);
      c.fillRect(x + len - 1, y + 17, 3, 3);
    }
    c.fillStyle = '#3A3A1E';
    for (let i = 0; i < 30; i++) c.fillRect(Math.round(hash(i, 8) * STRIP), Math.round(hash(i, 9) * H), 2, 2);
  });
  layers.chips = strip(H, (c) => {
    for (let i = 0; i < 7; i++) {
      const x = Math.round((i / 7) * STRIP + hash(i, 10) * 40);
      const y = 30 + Math.round(hash(i, 11) * 90);
      const w = 30 + Math.round(hash(i, 12) * 30);
      const h = 20 + Math.round(hash(i, 13) * 20);
      c.fillStyle = '#5A4A1A';
      for (let k = 3; k < w - 2; k += 5) {
        c.fillRect(x + k, y - 3, 2, 3);
        c.fillRect(x + k, y + h, 2, 3);
      }
      c.fillStyle = '#07160F';
      c.fillRect(x, y, w, h);
      c.fillStyle = '#14281E';
      c.fillRect(x + 2, y + 2, w - 4, 1);
      c.fillStyle = '#20402E';
      c.fillRect(x + 4, y + 4, 2, 2);
    }
  });
  // --- Castillo: muro lejano con ventanas (0.3) ---
  layers.castle = strip(H, (c) => {
    c.fillStyle = '#24242E';
    c.fillRect(0, 0, STRIP, H);
    c.fillStyle = '#2C2C38';
    for (let y = 0; y < H; y += 10) {
      c.fillRect(0, y, STRIP, 1);
      for (let x = (y / 10) % 2 ? 0 : 10; x < STRIP; x += 20) c.fillRect(x, y, 1, 10);
    }
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 105;
      c.fillStyle = '#14141C';
      c.fillRect(x, 40, 16, 34);
      c.fillRect(x + 2, 36, 12, 4);
      c.fillRect(x + 5, 33, 6, 3);
      c.fillStyle = '#3A1020';
      c.fillRect(x + 3, 60, 10, 14);
    }
  });
  return layers;
}

function strip(h, paint) {
  const cv = createCanvas(STRIP, h);
  paint(cv.getContext('2d'));
  return cv;
}

function tile(ctx, img, ox, y) {
  let x = -(((ox % STRIP) + STRIP) % STRIP);
  for (; x < W; x += STRIP) ctx.drawImage(img, Math.round(x), Math.round(y));
}

// Nubes con cara de "cargando" (tres puntitos que giran). Con corrupción, algunas muestran
// texto de N.U.L.L. en magenta.
function drawCloud(ctx, x, y, t, i, corrupt) {
  ctx.fillStyle = '#FFFFFF';
  disc(ctx, x, y, 8);
  disc(ctx, x + 10, y - 3, 10);
  disc(ctx, x + 22, y, 8);
  ctx.fillRect(x - 6, y, 36, 7);
  ctx.fillStyle = '#D8EEFF';
  ctx.fillRect(x - 4, y + 6, 32, 2);
  if (corrupt) {
    const msg = ['hola, choco', '∅', 'te veo', 'NULL'][i % 4];
    drawText(ctx, msg, x + 10, y - 4, { align: 'center', color: '#FF2E88', shadow: false });
    return;
  }
  // Cara de carga: dos ojos y tres puntos
  ctx.fillStyle = '#5E7A9A';
  ctx.fillRect(x + 6, y - 2, 1, 2);
  ctx.fillRect(x + 14, y - 2, 1, 2);
  const k = Math.floor(t * 3 + i) % 3;
  for (let d = 0; d < 3; d++) {
    ctx.fillStyle = d === k ? '#5E7A9A' : '#B8D0E8';
    ctx.fillRect(x + 7 + d * 3, y + 3, 2, 1);
  }
}

// corruption: 0..1 según el avance (más nubes con texto de N.U.L.L.)
export function drawPraderaBg(ctx, camX, camY, mapH, t, corruption = 0) {
  const sky = ['#5EC8FF', '#6CCEFF', '#7AD4FF', '#8ADAFF', '#9ADFFF'];
  const bandH = Math.ceil(H / sky.length);
  sky.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bandH, W, bandH);
  });
  const L = bake();
  const bottom = mapH - camY; // borde inferior del mapa en pantalla
  // Nubes (0.1)
  for (let i = 0; i < 8; i++) {
    const wx = i * 170 + hash(i, 1) * 60;
    const sx = ((wx - camX * 0.1) % 1360 + 1360) % 1360 - 60;
    const sy = Math.round(18 + hash(i, 2) * 50 - camY * 0.1);
    const corrupt = hash(i, 4) < corruption * 0.8 && wx - camX * 0.1 > 300;
    drawCloud(ctx, Math.round(sx), sy, t, i, corrupt);
  }
  tile(ctx, L.farHills, camX * 0.3, Math.round(bottom * 0.3 + (H - 96) * 0.7) - 30);
  tile(ctx, L.nearHills, camX * 0.6, Math.round(bottom * 0.6 + (H - 80) * 0.4) - 30);
}

export function drawCuevasBg(ctx, camX, camY, t) {
  const L = bake();
  tile(ctx, L.circuit, camX * 0.3, -Math.round((camY * 0.3) % 1));
  // Pulsos de datos que corren por las pistas
  ctx.fillStyle = '#D9AE4B';
  for (let i = 0; i < 6; i++) {
    const y = Math.round(20 + hash(i, 20) * 140);
    const x = Math.round(((t * 60 + hash(i, 21) * 400) % (W + 40)) - 20);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y, 4, 1);
    ctx.globalAlpha = 1;
  }
  tile(ctx, L.chips, camX * 0.6, 0);
}

export function drawCastilloBg(ctx, camX, camY, t) {
  const L = bake();
  tile(ctx, L.castle, camX * 0.3, 0);
  // Estática roja como "lava" al fondo (0.6), animada
  const base = H - 26;
  for (let x = 0; x < W; x += 2) {
    const wx = x + camX * 0.6;
    const yy = base + Math.round(Math.sin(wx * 0.08 + t * 3) * 2 + Math.sin(wx * 0.21 - t * 5));
    ctx.fillStyle = '#5A0F2A';
    ctx.fillRect(x, yy, 2, H - yy);
    ctx.fillStyle = (Math.floor(wx / 2) + Math.floor(t * 12)) % 5 === 0 ? '#FF2E88' : '#E0343F';
    ctx.fillRect(x, yy, 2, 1);
  }
}
