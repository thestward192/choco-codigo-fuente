// N.U.L.L. en la pelea final (docs/02_personajes.md): un monitor CRT flotante de 64×64 con la
// pantalla rota, un solo ojo con el ∅ como pupila, alas de código a los costados y aberración
// cromática (copias en rojo y cian). Se dibuja con primitivas porque se anima cada frame.
import { drawNullScreen } from '../null.js';
import { drawText } from '../font.js';
import { disc } from '../../core/lighting.js';
import { fxRng } from '../../core/rng.js';
import { createCanvas } from '../../core/renderer.js';

const CODE = '{}[]<>/\\=;:01∅#*+!';
const codeChar = (k) => CODE[((k % CODE.length) + CODE.length) % CODE.length];

// opts: { t, open, look, angry, flash, crack (0..1), glitch (0..1), warm (0..1: magenta → blanco
//   cálido del final), wing (0 = abiertas, 1 = golpe hacia abajo), core: 'hook' | 'exposed' | null,
//   alpha, small (copias de la fase 3 sin alas largas) }
let fadeBuf = null;
export function drawNullBoss(ctx, cx, cy, opts = {}) {
  // Con transparencia se dibuja aparte y se pega con alpha (la pantalla usa su propio alpha)
  if ((opts.alpha ?? 1) < 1) {
    if (!fadeBuf) fadeBuf = createCanvas(160, 100);
    const b = fadeBuf.getContext('2d');
    b.clearRect(0, 0, 160, 100);
    drawNullBoss(b, 80, 50, { ...opts, alpha: 1 });
    ctx.globalAlpha = Math.max(0, opts.alpha);
    ctx.drawImage(fadeBuf, Math.round(cx) - 80, Math.round(cy) - 50);
    ctx.globalAlpha = 1;
    return;
  }
  const t = opts.t ?? 0;
  const alpha = 1;
  const glitch = opts.glitch ?? 0.4;
  const warm = opts.warm ?? 0;
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.globalAlpha = alpha;
  // Alas de código
  drawWing(ctx, cx, cy, -1, t, opts.wing ?? 0, warm, opts.small);
  drawWing(ctx, cx, cy, 1, t, opts.wing ?? 0, warm, opts.small);
  // Aberración cromática: el marco en rojo y cian, desplazado
  const off = glitch > 0 && fxRng.chance(0.3 + glitch * 0.4) ? fxRng.int(1, 3) : 1;
  if (warm < 1) {
    ctx.globalAlpha = alpha * 0.4 * (1 - warm);
    ctx.fillStyle = '#FF0044';
    ctx.fillRect(cx - 32 - off, cy - 26, 64, 50);
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(cx - 32 + off, cy - 26, 64, 50);
    ctx.globalAlpha = alpha;
  }
  // Carcasa
  ctx.fillStyle = '#0B0610';
  ctx.fillRect(cx - 32, cy - 26, 64, 50);
  ctx.fillStyle = mix('#3A3A4E', '#E8DCC8', warm);
  ctx.fillRect(cx - 31, cy - 25, 62, 48);
  ctx.fillStyle = mix('#5A5A6E', '#FFF4E0', warm);
  ctx.fillRect(cx - 31, cy - 25, 62, 2);
  ctx.fillStyle = mix('#2A2A3A', '#C8B8A0', warm);
  ctx.fillRect(cx - 31, cy + 19, 62, 4);
  // Botoncitos y LED magenta
  ctx.fillStyle = mix('#FF2E88', '#FFE2A8', warm);
  if (Math.floor(t * 2) % 2) ctx.fillRect(cx + 24, cy + 20, 2, 2);
  ctx.fillStyle = '#1A1A26';
  ctx.fillRect(cx + 16, cy + 20, 5, 2);
  // Pie del monitor (flota: un pedazo de base que se deshace en píxeles)
  ctx.fillStyle = mix('#3A3A4E', '#E8DCC8', warm);
  ctx.fillRect(cx - 8, cy + 24, 16, 3);
  ctx.fillStyle = mix('#FF2E88', '#FFE2A8', warm);
  for (let i = 0; i < 4; i++) if (Math.floor(t * 6 + i) % 3) ctx.fillRect(cx - 6 + i * 4, cy + 28 + ((t * 10 + i * 3) % 6), 1, 1);
  // Pantalla con el ojo
  const sx = cx - 26;
  const sy = cy - 20;
  drawNullScreen(ctx, sx, sy, 52, 36, { t, open: opts.open ?? 1, look: opts.look ?? 0, angry: !!opts.angry, glitch: glitch * (1 - warm), static: 0.15 * (1 - warm) });
  if (warm > 0) {
    ctx.globalAlpha = alpha * warm * 0.75;
    ctx.fillStyle = '#FFE8C8';
    ctx.fillRect(sx, sy, 52, 36);
    ctx.globalAlpha = alpha;
  }
  // Grietas de la pantalla
  const crack = opts.crack ?? 0.3;
  if (crack > 0) {
    ctx.fillStyle = '#F4F1EA';
    ctx.globalAlpha = alpha * Math.min(1, 0.4 + crack);
    line(ctx, sx + 6, sy + 2, sx + 18, sy + 14);
    line(ctx, sx + 18, sy + 14, sx + 14, sy + 24);
    if (crack > 0.5) line(ctx, sx + 46, sy + 4, sx + 36, sy + 20);
    if (crack > 0.8) line(ctx, sx + 36, sy + 20, sx + 44, sy + 33);
    ctx.globalAlpha = alpha;
  }
  // Núcleo: el ∅ del ojo. Enganchable (blanco) o expuesto (late)
  if (opts.core) {
    const r = opts.core === 'exposed' ? 9 + Math.round(Math.sin(t * 18) * 2) : 8 + Math.round(Math.sin(t * 8));
    ctx.strokeStyle = opts.core === 'exposed' ? (Math.floor(t * 12) % 2 ? '#FFFFFF' : '#43D9FF') : '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + 0.5, cy - 2 + 0.5, r, 0, Math.PI * 2);
    ctx.stroke();
    if (opts.core === 'hook') {
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#FFFFFF';
      disc(ctx, cx, cy - 2, r + 3);
      ctx.globalAlpha = alpha;
    }
  }
  // Destello de daño
  if (opts.flash) {
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 32, cy - 26, 64, 50);
  }
  ctx.globalAlpha = 1;
}

// Ala de código: dos hileras de caracteres que cambian cada frame. side: -1 | 1
// wing: 0 = abiertas hacia los lados (aleteo), 1 = apuntando al suelo (golpe)
function drawWing(ctx, cx, cy, side, t, wing, warm, small) {
  const n = small ? 3 : 6;
  const flap = Math.sin(t * 5) * 0.18 * (1 - wing);
  const a = -0.35 + flap + wing * 1.5;
  const dx = Math.cos(a) * side;
  const dy = Math.sin(a);
  const f = Math.floor(t * 14);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < n - row; i++) {
      const d = 34 + i * 7;
      const x = cx + dx * d - 2;
      const y = cy - 12 + row * 9 + dy * d;
      const color = warm > 0.5 ? (i % 2 ? '#FFE2A8' : '#FFFFFF') : (i + row) % 2 ? '#8C1D52' : '#FF2E88';
      drawText(ctx, codeChar(f + i * 3 + row * 7 + (side > 0 ? 5 : 0)), Math.round(x), Math.round(y), { color, shadow: false });
    }
  }
}

function line(ctx, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
}

// Mezcla dos colores hex (k: 0..1)
export function mix(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// El cursor en que se convierte N.U.L.L. tras el parche: 4×8, blanco con un brillo cálido
export function drawNullCursor(ctx, x, y, t, scale = 1) {
  const on = Math.floor(t * 2) % 2 === 0;
  ctx.globalAlpha = scale > 1 ? 0.1 : 0.3;
  ctx.fillStyle = '#FFE2A8';
  disc(ctx, Math.round(x + 2 * scale), Math.round(y + 4 * scale), Math.round((scale > 1 ? 5 : 7) * scale));
  ctx.globalAlpha = 1;
  if (!on) return;
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(Math.round(x), Math.round(y), 4 * scale, 8 * scale);
}
