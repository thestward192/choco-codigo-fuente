// N.U.L.L. en pantallas (televisor del cuarto, pantalla gigante, puertas): un solo ojo con
// el símbolo ∅ como pupila, aberración cromática y alas de código. Diseño original.
// Se dibuja con primitivas porque cambia de tamaño y se anima cada frame (pocos rectángulos).
import { NULL_COLORS } from './palettes.js';
import { disc } from '../core/lighting.js';
import { drawText } from './font.js';
import { fxRng } from '../core/rng.js';

const M = NULL_COLORS.magenta;
const W = NULL_COLORS.white;
const K = NULL_COLORS.black;
const CODE = '{}[]<>/\\=;:01∅#*+';

// Ojo de N.U.L.L. centrado en (cx, cy). r = medio ancho del ojo.
// opts: { open: 0..1 (párpado), look: -1..1 (mirada horizontal), angry, color }
export function drawNullEye(ctx, cx, cy, r, { open = 1, look = 0, angry = false } = {}) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const h = Math.max(1, Math.round(r * 0.62 * open));
  // Blanco del ojo: almendra (filas con ancho decreciente)
  ctx.fillStyle = W;
  for (let y = -h; y <= h; y++) {
    const k = 1 - Math.pow(Math.abs(y) / (h + 0.5), 2);
    const hw = Math.round(r * Math.sqrt(Math.max(0, k)));
    ctx.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
  if (open < 0.25) return;
  // Iris magenta y pupila ∅
  const ir = Math.max(2, Math.round(r * 0.48));
  const ix = cx + Math.round(look * r * 0.35);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r, cy - h, r * 2 + 1, h * 2 + 1);
  ctx.clip();
  ctx.fillStyle = M;
  disc(ctx, ix, cy, ir);
  ctx.fillStyle = K;
  const pr = Math.max(1, Math.round(ir * 0.62));
  disc(ctx, ix, cy, pr);
  // Anillo y barra del ∅
  if (pr >= 2) {
    ctx.fillStyle = W;
    for (let i = -pr; i <= pr; i++) ctx.fillRect(ix + i, cy - i, 1, 1);
  }
  ctx.restore();
  // Ceño (enojada): dos líneas diagonales sobre el ojo
  if (angry) {
    ctx.fillStyle = M;
    for (let i = 0; i < r; i++) ctx.fillRect(cx - r + i, cy - h - 2 - Math.round((r - i) * 0.3), 1, 2);
    for (let i = 0; i < r; i++) ctx.fillRect(cx + i, cy - h - 2 - Math.round(i * 0.3), 1, 2);
  }
}

// Pantalla con N.U.L.L.: fondo negro, ojo, líneas de escaneo, alas de código y glitch.
// opts: { t, open, look, angry, wings, glitch (0..1), static (0..1) }
export function drawNullScreen(ctx, x, y, w, h, opts = {}) {
  const t = opts.t ?? 0;
  const glitch = opts.glitch ?? 0.3;
  ctx.fillStyle = K;
  ctx.fillRect(x, y, w, h);
  // Estática de fondo
  const st = opts.static ?? 0;
  if (st > 0) {
    const n = Math.round(w * h * 0.06 * st);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = fxRng.chance(0.5) ? '#3A3A4E' : '#8A8AA0';
      ctx.fillRect(x + fxRng.int(0, w - 1), y + fxRng.int(0, h - 1), 1, 1);
    }
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(3, Math.round(Math.min(w * 0.28, h * 0.55)));
  // Alas de código a los costados
  if (opts.wings && w >= 40) {
    const rows = Math.floor(h / 9);
    for (let i = 0; i < rows; i++) {
      const s1 = codeString(5, t * 12 + i * 3);
      const s2 = codeString(5, t * 12 + i * 7 + 2);
      drawText(ctx, s1, x + 2, y + 1 + i * 9, { color: i % 2 ? '#8C1D52' : M, shadow: false });
      drawText(ctx, s2, x + w - 2, y + 1 + i * 9, { color: i % 2 ? M : '#8C1D52', shadow: false, align: 'right' });
    }
  }
  // Copias rojo/cian desplazadas (aberración cromática)
  const off = glitch > 0 && fxRng.chance(0.3 + glitch * 0.4) ? fxRng.int(1, 2) : 1;
  ctx.globalAlpha = 0.45;
  ctx.globalCompositeOperation = 'lighter';
  tintedEye(ctx, cx - off, cy, r, '#FF0044', opts);
  tintedEye(ctx, cx + off, cy, r, '#00E5FF', opts);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  drawNullEye(ctx, cx, cy, r, opts);
  // Líneas de escaneo
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  for (let yy = y + ((Math.floor(t * 20) % 2) | 0); yy < y + h; yy += 2) ctx.fillRect(x, yy, w, 1);
  ctx.globalAlpha = 1;
  // Bandas glitcheadas
  if (glitch > 0 && fxRng.chance(glitch * 0.5)) {
    const by = y + fxRng.int(0, h - 2);
    ctx.fillStyle = fxRng.pick([M, '#43D9FF', W]);
    ctx.fillRect(x + fxRng.int(0, w >> 1), by, fxRng.int(3, w >> 1), 1);
  }
}

function tintedEye(ctx, cx, cy, r, color, opts) {
  ctx.fillStyle = color;
  const h = Math.max(1, Math.round(r * 0.62 * (opts.open ?? 1)));
  for (let y = -h; y <= h; y++) {
    const k = 1 - Math.pow(Math.abs(y) / (h + 0.5), 2);
    const hw = Math.round(r * Math.sqrt(Math.max(0, k)));
    ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + y, hw * 2 + 1, 1);
  }
}

function codeString(n, seed) {
  let s = '';
  const k = Math.floor(seed);
  for (let i = 0; i < n; i++) s += CODE[(k * 7 + i * 13 + ((k * i) % 5)) % CODE.length];
  return s;
}
