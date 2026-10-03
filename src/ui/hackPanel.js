// Panel del minijuego de hackeo (laptop abierta abajo al centro): las flechas en orden, la
// barra de tiempo y los errores. Se dibuja sobre el nivel, que sigue corriendo.
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';

const GLYPH = { up: '↑', down: '↓', left: '←', right: '→' };

// h: estado de systems/hack.js; o: { t, appear (0..1), title, cancelKey }
export function drawHackPanel(ctx, h, o) {
  const T = TEXTS.level3.hack;
  const n = h.seq.length;
  const cell = 16;
  const w = Math.max(150, n * (cell + 3) + 24);
  const hgt = 56;
  const x = Math.round((SCREEN.W - w) / 2);
  const slide = Math.round((1 - (o.appear ?? 1)) * 40);
  const y = SCREEN.H - hgt - 10 + slide;
  const shake = h.errorT > 0 ? (Math.floor(o.t * 40) % 2 ? 2 : -2) : 0;
  // Laptop
  ctx.fillStyle = '#0B0E16';
  ctx.fillRect(x - 3 + shake, y - 3, w + 6, hgt + 6);
  ctx.fillStyle = '#5A5A6E';
  ctx.fillRect(x - 2 + shake, y - 2, w + 4, hgt + 4);
  ctx.fillStyle = h.errorT > 0 ? '#2A0A10' : '#06120C';
  ctx.fillRect(x + shake, y, w, hgt);
  // Líneas de escaneo
  ctx.fillStyle = 'rgba(111,224,138,0.06)';
  for (let yy = y; yy < y + hgt; yy += 2) ctx.fillRect(x + shake, yy, w, 1);
  drawText(ctx, o.title || T.title, x + 6 + shake, y + 3, { color: UI.green, shadow: false });
  // Errores (tres X)
  for (let i = 0; i < 3; i++) {
    const ex = x + w - 30 + i * 9 + shake;
    drawText(ctx, '×', ex, y + 3, { color: i < h.errors ? UI.red : '#2A4A34', shadow: false });
  }
  // Flechas
  const total = n * (cell + 3) - 3;
  const ax = x + Math.round((w - total) / 2) + shake;
  const ay = y + 15;
  h.seq.forEach((d, i) => {
    const cx = ax + i * (cell + 3);
    const done = i < h.idx;
    const cur = i === h.idx && h.status === 'active';
    const bump = cur ? -Math.round(Math.abs(Math.sin(o.t * 8))) : 0;
    ctx.fillStyle = done ? UI.green : cur ? '#F4F1EA' : '#1E3A28';
    ctx.fillRect(cx, ay + bump, cell, cell);
    ctx.fillStyle = done ? '#0A2A14' : '#06120C';
    ctx.fillRect(cx + 1, ay + 1 + bump, cell - 2, cell - 2);
    drawText(ctx, GLYPH[d], cx + cell / 2, ay + 4 + bump, { align: 'center', color: done ? UI.green : cur ? '#FFFFFF' : '#6FA87F', shadow: false });
  });
  // Tiempo
  const p = Math.max(0, h.t / h.time);
  const bx = x + 8 + shake;
  const by = y + hgt - 12;
  const bw = w - 16;
  ctx.fillStyle = '#1E3A28';
  ctx.fillRect(bx, by, bw, 4);
  ctx.fillStyle = p < 0.3 ? (Math.floor(o.t * 10) % 2 ? UI.red : '#FF8A8A') : UI.green;
  ctx.fillRect(bx, by, Math.round(bw * p), 4);
  if (o.cancelKey) drawText(ctx, T.cancel(o.cancelKey), x + w - 4 + shake, y + hgt - 7, { align: 'right', color: '#4A7A5A', shadow: false });
}
