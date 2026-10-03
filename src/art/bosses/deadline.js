// DEADLINE: reloj de pared gigante corrupto (jefe del nivel 3) — docs/niveles/nivel_3_novacomp.md
// Manecillas afiladas, marcas corruptas y una pantalla en el centro con la cuenta regresiva.
// Al congelarlo (terminal hackeada) la pantalla se abre y deja ver el núcleo.
// Se dibuja con primitivas pixeladas porque las manecillas giran.
import { fillCircle, thickLine, ring } from '../shapes.js';
import { drawText } from '../font.js';
import { fxRng } from '../../core/rng.js';

export const DEADLINE_R = 26; // radio de la esfera

const COL = {
  rim: '#3A3A4E',
  rimL: '#6A6A86',
  rimD: '#1A1A26',
  face: '#E6DFCF',
  faceD: '#BEB5A2',
  faceIce: '#BFE6F5',
  tick: '#2A2A38',
  glitch: '#FF2E88',
  hand: '#1A1A26',
  handL: '#8A8AA0',
  glow: '#FFD23F',
  screen: '#07070C',
  digits: '#FF5A5A',
  core: '#E0343F',
  coreL: '#FF9A9A',
};

// o: { t, minute, hour (ángulos), text (pantalla), open (0..1), frozen01, glowMinute (0..1),
//      hurt (flash), broken (0..1: manecillas caídas), shake }
export function drawDeadline(ctx, x, y, o) {
  const R = DEADLINE_R;
  const sx = Math.round(x + (o.shake ? fxRng.int(-1, 1) : 0));
  const sy = Math.round(y);
  // Sombra en el piso (flota)
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 18, sy + R + 18, 36, 3);
  ctx.fillRect(sx - 14, sy + R + 17, 28, 1);
  ctx.globalAlpha = 1;
  // Aro
  ctx.fillStyle = COL.rimD;
  fillCircle(ctx, sx, sy, R + 3);
  ctx.fillStyle = COL.rim;
  fillCircle(ctx, sx, sy, R + 2);
  ctx.fillStyle = COL.rimL;
  ring(ctx, sx, sy - 1, R + 1);
  // Esfera
  ctx.fillStyle = o.hurt ? '#FFFFFF' : o.frozen01 > 0 ? COL.faceIce : COL.face;
  fillCircle(ctx, sx, sy, R);
  ctx.fillStyle = o.frozen01 > 0 ? '#9ACCE0' : COL.faceD;
  ring(ctx, sx, sy, R - 1);
  // Marcas de las horas (algunas corruptas)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const corrupt = (i * 7 + Math.floor(o.t * 3)) % 11 === 0;
    ctx.fillStyle = corrupt ? COL.glitch : COL.tick;
    const r0 = i % 3 === 0 ? R - 6 : R - 4;
    thickLine(ctx, sx + Math.cos(a) * r0, sy + Math.sin(a) * r0, sx + Math.cos(a) * (R - 2), sy + Math.sin(a) * (R - 2), i % 3 === 0 ? 2 : 1);
    if (corrupt) ctx.fillRect(Math.round(sx + Math.cos(a) * (R - 3)) + fxRng.int(-2, 2), Math.round(sy + Math.sin(a) * (R - 3)), 2, 1);
  }
  // Pantalla central (cuenta regresiva) o núcleo expuesto
  const open = o.open || 0;
  const sw = 22;
  const sh = 9;
  const scrY = sy + 6;
  if (open > 0) {
    // Núcleo latiendo
    const pulse = 1 + Math.round(Math.sin(o.t * 10));
    ctx.fillStyle = COL.screen;
    ctx.fillRect(sx - sw / 2, scrY - 2, sw, sh + 4);
    ctx.fillStyle = COL.core;
    fillCircle(ctx, sx, scrY + 3, 4 + pulse);
    ctx.fillStyle = COL.coreL;
    fillCircle(ctx, sx - 1, scrY + 2, 2);
    // Tapas de la pantalla deslizándose
    const slide = Math.round(open * (sw / 2 + 2));
    ctx.fillStyle = '#2A2A38';
    ctx.fillRect(sx - sw / 2 - slide, scrY - 2, sw / 2, sh + 4);
    ctx.fillRect(sx + slide, scrY - 2, sw / 2, sh + 4);
  } else {
    ctx.fillStyle = '#2A2A38';
    ctx.fillRect(sx - sw / 2 - 1, scrY - 1, sw + 2, sh + 2);
    ctx.fillStyle = COL.screen;
    ctx.fillRect(sx - sw / 2, scrY, sw, sh);
    if (o.text) drawText(ctx, o.text, sx, scrY + 1, { align: 'center', color: COL.digits, shadow: false });
  }
  // Manecillas
  const broken = o.broken || 0;
  if (broken < 1) {
    const drop = broken * 40;
    // Horaria: corta y gruesa
    ctx.fillStyle = COL.hand;
    const hx = sx + Math.cos(o.hour) * 13;
    const hy = sy + Math.sin(o.hour) * 13 + drop;
    thickLine(ctx, sx, sy + drop * 0.5, hx, hy, 3);
    // Minutero: largo y afilado; brilla antes del barrido
    const mx = sx + Math.cos(o.minute) * (R - 3);
    const my = sy + Math.sin(o.minute) * (R - 3) + drop * 1.4;
    const g = o.glowMinute || 0;
    if (g > 0 && Math.floor(o.t * 16) % 2 === 0) {
      ctx.fillStyle = COL.glow;
      thickLine(ctx, sx, sy, mx, my, 4);
    }
    ctx.fillStyle = g > 0 ? '#FFF2B0' : COL.hand;
    thickLine(ctx, sx, sy + drop * 0.5, mx, my, 2);
    ctx.fillStyle = COL.handL;
    ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    // Eje
    ctx.fillStyle = COL.rimD;
    fillCircle(ctx, sx, sy, 3);
    ctx.fillStyle = COL.glitch;
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
  // Escarcha mientras está congelado
  if (o.frozen01 > 0) {
    ctx.fillStyle = '#DFFAFF';
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63 + o.t * 0.4;
      ctx.fillRect(Math.round(sx + Math.cos(a) * (R + 4)), Math.round(sy + Math.sin(a) * (R + 4)), 1, 1);
    }
  }
}
