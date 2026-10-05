// Decorado y objetos del Código Puro (nivel 5) y del final: capas de fuego del Firewall,
// torretas de Excepciones, Fragmentos de N.U.L.L., plataformas del Push, Segmentos corruptos,
// la masa del Overflow, terminales de checkpoint, ecos de los fundadores, el Trofeo del Código
// Fuente y la Y dorada gigante. Diseño original; todo en código.
import { Grid } from './painter.js';
import { Sprite } from './bake.js';
import { drawText } from './font.js';
import { disc } from '../core/lighting.js';
import { founderSprite } from './portraits.js';
import { ACCENTS } from './palettes.js';

const hash = (x, s = 0) => {
  let h = (x * 374761393 + s * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const FIRE = ['#FF2E88', '#FF5A5A', '#FF8A3D', '#FFD23F'];

// Capa de fuego de código: llamas de píxeles con caracteres que suben. x, y, w, h en pantalla.
export function drawFirewall(ctx, x, y, w, h, t, { passing = false } = {}) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.globalAlpha = passing ? 0.45 : 0.9;
  ctx.fillStyle = '#3A0A1E';
  ctx.fillRect(x, y + 3, w, h - 6);
  for (let i = 0; i < w; i += 2) {
    const k = Math.sin(t * 9 + i * 0.7) * 0.5 + 0.5;
    const fh = Math.round(h * (0.55 + 0.45 * k));
    for (let j = 0; j < FIRE.length; j++) {
      const hh = Math.round(fh * (1 - j * 0.22));
      ctx.fillStyle = FIRE[j];
      ctx.fillRect(x + i, y + h - hh - Math.round((h - fh) / 2), 2, Math.max(1, hh - Math.round(fh * 0.12 * j)));
    }
  }
  // Caracteres que suben
  for (let i = 0; i < Math.max(1, Math.floor(w / 18)); i++) {
    const cx = x + ((i * 18 + hash(i, 1) * 10) % w);
    const cy = y + h - ((t * 20 + hash(i, 2) * h) % h);
    drawText(ctx, i % 2 ? '{' : '}', Math.round(cx), Math.round(cy) - 4, { color: '#FFFFFF', shadow: false });
  }
  ctx.globalAlpha = 1;
}

// Torreta de Excepciones montada en la pared. dir: hacia dónde apunta. warn: 0..1 (telegrafiado)
export function drawTurret(ctx, x, y, dir, t, warn = 0, broken = false) {
  x = Math.round(x);
  y = Math.round(y);
  const back = x - dir * 8;
  ctx.fillStyle = '#1C0E32';
  ctx.fillRect(back - 4, y - 7, 8, 14);
  ctx.fillStyle = broken ? '#3A1E60' : '#5A2E8A';
  ctx.fillRect(Math.min(back, x) - 1, y - 5, 10, 10);
  ctx.fillStyle = '#07050D';
  ctx.fillRect(Math.min(back, x) + 1, y - 3, 6, 6);
  if (broken) {
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x - 2, y - 1, 3, 1);
    return;
  }
  // Cañón
  ctx.fillStyle = '#8A5ABA';
  ctx.fillRect(dir > 0 ? x + 4 : x - 10, y - 2, 6, 4);
  // Ojo: se enciende al apuntar
  const on = warn > 0 && Math.floor(t * 16) % 2;
  ctx.fillStyle = on ? '#FFFFFF' : warn > 0 ? '#FF2E88' : '#8C1D52';
  ctx.fillRect(Math.min(back, x) + 2, y - 2, 4, 4);
  if (warn > 0) {
    ctx.globalAlpha = warn * 0.6;
    ctx.fillStyle = '#FF2E88';
    disc(ctx, dir > 0 ? x + 11 : x - 11, y, 2 + Math.round(warn * 3));
    ctx.globalAlpha = 1;
  }
}

// Fragmento de N.U.L.L.: un monitorcito con su ojo. state: 'idle' | 'aim' | 'dash'
export function drawFragment(ctx, x, y, t, state, look = 0) {
  x = Math.round(x);
  y = Math.round(y);
  const aim = state === 'aim';
  if (state === 'dash') {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x - 5 - Math.round(look * 6), y - 4, 10, 8);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = aim && Math.floor(t * 18) % 2 ? '#FFFFFF' : '#5A5A6E';
  ctx.fillRect(x - 6, y - 5, 12, 10);
  ctx.fillStyle = '#0B0610';
  ctx.fillRect(x - 5, y - 4, 10, 8);
  // Ojo con ∅
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(x - 3, y - 2, 6, 4);
  ctx.fillStyle = '#FF2E88';
  ctx.fillRect(x - 1 + Math.round(look), y - 2, 3, 4);
  ctx.fillStyle = '#0B0610';
  ctx.fillRect(x + Math.round(look), y - 1, 1, 2);
  // Alitas de código
  if (Math.floor(t * 8) % 2) {
    ctx.fillStyle = '#8C1D52';
    ctx.fillRect(x - 9, y - 3, 2, 1);
    ctx.fillRect(x + 7, y - 3, 2, 1);
    ctx.fillRect(x - 8, y, 2, 1);
    ctx.fillRect(x + 6, y, 2, 1);
  }
}

// Plataforma del Push: un marco del stack que se desliza desde la pared. k: 0..1 (llegada)
export function drawPushFrame(ctx, x, y, w, k, t, label) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.globalAlpha = Math.min(1, 0.4 + k);
  ctx.fillStyle = '#2A1446';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = k < 1 && Math.floor(t * 20) % 2 ? '#FFFFFF' : '#43D9FF';
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = '#1C0E32';
  ctx.fillRect(x, y + 4, w, 1);
  ctx.fillStyle = '#2AA8D8';
  ctx.fillRect(x, y + 1, 1, 6);
  ctx.fillRect(x + w - 1, y + 1, 1, 6);
  ctx.globalAlpha = 1;
  if (label && k < 1) drawText(ctx, label, x + w / 2, y - 10, { align: 'center', color: '#43D9FF' });
}

// Segmento corrupto: plataforma morada con grietas magenta. state: idle | shake | gone
export function drawSegment(ctx, x, y, w, state, t, fade = 1) {
  if (state === 'gone') return;
  x = Math.round(x);
  y = Math.round(y);
  const ox = state === 'shake' ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
  ctx.globalAlpha = state === 'shake' ? (Math.floor(t * 24) % 2 ? 0.5 : 1) : fade;
  ctx.fillStyle = '#3A1E60';
  ctx.fillRect(x + ox, y, w, 6);
  ctx.fillStyle = '#8C1D52';
  ctx.fillRect(x + ox, y, w, 1);
  ctx.fillStyle = '#FF2E88';
  for (let i = 3; i < w - 2; i += 7) ctx.fillRect(x + ox + i, y + 2, 2, 1);
  ctx.fillRect(x + ox + 2, y + 4, 1, 1);
  ctx.fillRect(x + ox + w - 4, y + 3, 1, 2);
  ctx.globalAlpha = 1;
}

// La masa del Overflow: datos corruptos que suben. topY: borde superior en pantalla.
export function drawOverflow(ctx, topY, w, h, t) {
  const top = Math.round(topY);
  if (top >= h) return;
  ctx.fillStyle = '#3A0A2A';
  ctx.fillRect(0, Math.max(0, top + 4), w, h - top);
  // Borde que burbujea
  for (let x = 0; x < w; x += 2) {
    const k = Math.sin(t * 5 + x * 0.21) * 2 + Math.sin(t * 2.3 + x * 0.07) * 3;
    const y = top + Math.round(k);
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#8C1D52';
    ctx.fillRect(x, y + 2, 2, 4);
  }
  // Caracteres que flotan dentro
  const glyphs = ['0', '1', '∅', '#', '%', '!'];
  for (let i = 0; i < 18; i++) {
    const gx = (hash(i, 3) * w + t * 6 * (i % 2 ? 1 : -1) + w) % w;
    const gy = top + 10 + ((hash(i, 4) * 80 + t * 9) % 80);
    if (gy > h) continue;
    drawText(ctx, glyphs[i % glyphs.length], Math.round(gx), Math.round(gy), { color: i % 3 ? '#8C1D52' : '#FF5AA8', shadow: false });
  }
}

// Terminal de checkpoint: un pedestal con pantalla; se enciende en verde al activarlo
export function drawTerminal(ctx, x, footY, on, t, flash = 0) {
  x = Math.round(x);
  footY = Math.round(footY);
  ctx.fillStyle = '#1C0E32';
  ctx.fillRect(x - 2, footY - 10, 4, 10);
  ctx.fillStyle = '#3A1E60';
  ctx.fillRect(x - 7, footY - 22, 14, 12);
  ctx.fillStyle = on ? '#0A2A14' : '#07050D';
  ctx.fillRect(x - 6, footY - 21, 12, 9);
  ctx.fillStyle = on ? '#6FE08A' : '#2A1446';
  ctx.fillRect(x - 4, footY - 19, 5, 1);
  ctx.fillRect(x - 4, footY - 17, 7, 1);
  if (on && Math.floor(t * 2) % 2) ctx.fillRect(x - 4, footY - 15, 2, 1);
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 7, footY - 22, 14, 12);
    ctx.globalAlpha = 1;
  }
}

// Eco de luz de un fundador en el borde de la pantalla (silueta brillante de su color)
export function drawEcho(ctx, x, y, who, t, alpha = 1) {
  const spr = founderSprite(who, Math.floor(t * 3) % 2);
  const color = ACCENTS[who];
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = color;
  disc(ctx, Math.round(x), Math.round(y - 12), 13 + Math.round(Math.sin(t * 4)));
  ctx.globalAlpha = alpha * 0.85;
  ctx.drawImage(spr.tint(color), Math.round(x) - 8, Math.round(y) - 24);
  ctx.globalAlpha = alpha * 0.5;
  ctx.drawImage(spr.normal, Math.round(x) - 8, Math.round(y) - 24);
  ctx.globalAlpha = 1;
}

// ---------- Trofeo del Código Fuente: copa dorada con { } grabado ----------
const TROPHY_PAL = { o: '#3A2A0A', y: '#FFD23F', Y: '#FFF0A0', d: '#B8902A', D: '#7A5A10', w: '#FFFFFF', b: '#5C3521' };
let trophyCache = null;
export function trophySprite() {
  if (trophyCache) return trophyCache;
  const g = new Grid(18, 20, '.');
  // Copa
  g.rect(3, 1, 14, 9, 'y');
  g.rect(4, 10, 13, 11, 'y').rect(5, 12, 12, 12, 'd');
  g.vline(3, 1, 7, 'Y').vline(4, 1, 9, 'Y');
  g.vline(14, 1, 9, 'd').vline(13, 2, 10, 'd');
  g.hline(3, 14, 1, 'Y');
  // Asas
  g.vline(1, 2, 6, 'y').set(2, 2, 'y').set(2, 6, 'y').set(2, 7, 'y');
  g.vline(16, 2, 6, 'd').set(15, 2, 'd').set(15, 6, 'd').set(15, 7, 'd');
  // { } grabado
  g.stamp(['.DD.....DD.', 'D.........D', '.D.......D.', 'D.........D', '.DD.....DD.'], 3, 3);
  g.set(8, 5, 'D').set(9, 5, 'D');
  // Tallo y base de chocolate
  g.rect(7, 13, 10, 15, 'd').vline(8, 13, 15, 'y');
  g.rect(4, 16, 13, 17, 'y').hline(4, 13, 16, 'Y');
  g.rect(3, 18, 14, 19, 'b');
  g.outline('o');
  trophyCache = new Sprite(g.toRows(), TROPHY_PAL);
  return trophyCache;
}

// Y dorada gigante con brillo
export function drawGiantY(ctx, cx, cy, scale, t, alpha = 1) {
  ctx.globalAlpha = alpha * (0.25 + 0.1 * Math.sin(t * 4));
  ctx.fillStyle = '#FFD23F';
  disc(ctx, Math.round(cx), Math.round(cy), Math.round(scale * 6));
  ctx.globalAlpha = alpha;
  drawText(ctx, 'Y', Math.round(cx), Math.round(cy - scale * 3.5), { align: 'center', bold: true, scale, color: '#FFD23F', shadow: '#7A5A10' });
  // Destellos
  for (let i = 0; i < 4; i++) {
    const a = t * 1.5 + (i * Math.PI) / 2;
    const r = scale * 7 + Math.sin(t * 3 + i) * 2;
    const sx = Math.round(cx + Math.cos(a) * r);
    const sy = Math.round(cy + Math.sin(a) * r);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sx - 1, sy, 3, 1);
    ctx.fillRect(sx, sy - 1, 1, 3);
  }
  ctx.globalAlpha = 1;
}
