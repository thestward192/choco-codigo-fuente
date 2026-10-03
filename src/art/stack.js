// MC Stack Overflow (jefe del nivel 2): una pila de ventanas de error con gorra y micrófono.
// Se dibuja con rectángulos (es grande y cambia mucho: rebota al beat, se tambalea y colapsa
// cerrando sus ventanas una por una). Diseño original.
import { drawText } from './font.js';

const WIN = [
  // ancho, alto, desplazamiento x (de abajo hacia arriba)
  [30, 14, 0],
  [28, 13, 3],
  [26, 13, -3],
  [24, 14, 1],
];

// fx, fy: pies (centro abajo). opts: { collapse: s (-1 = no), beat: bpm, u: escala entera,
// mood: 'normal' | 'angry' | 'hurt' | 'laugh', flash: bool }
export function drawStackOverflow(ctx, fx, fy, t, { collapse = -1, beat = 90, u = 1, mood = 'normal', flash = false, sway = 1 } = {}) {
  fx = Math.round(fx);
  fy = Math.round(fy);
  const beatLen = 60 / beat;
  const ph = (t % beatLen) / beatLen;
  const bob = ph < 0.15 ? 1 : 0; // cabeceo en cada tiempo
  let y = fy;
  // Sombra
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.fillRect(fx - 16 * u, fy - u, 32 * u, 2 * u);
  ctx.globalAlpha = 1;
  WIN.forEach(([w, h, ox], i) => {
    // Colapso: las ventanas se cierran de arriba hacia abajo
    let k = 1;
    if (collapse >= 0) {
      const start = (WIN.length - 1 - i) * 0.6;
      k = Math.max(0, 1 - Math.max(0, collapse - start) / 0.35);
    }
    const wobble = Math.round(Math.sin(t * 2.2 + i * 1.3) * (i * 0.6) * sway);
    const ww = w * u;
    const hh = Math.max(0, Math.round(h * u * k));
    const x = fx + (ox + wobble) * u - ww / 2;
    const top = y - h * u - (i === WIN.length - 1 ? bob * u : 0);
    if (hh > 0) {
      const yy = top + Math.round((h * u - hh) / 2);
      ctx.fillStyle = '#140A16';
      ctx.fillRect(x - u, yy - u, ww + 2 * u, hh + 2 * u);
      ctx.fillStyle = flash ? '#FFFFFF' : '#E8E8F0';
      ctx.fillRect(x, yy, ww, hh);
      if (k > 0.6) {
        // Barra de título roja o azul, con la X de cerrar
        ctx.fillStyle = flash ? '#FFFFFF' : i % 2 ? '#3A6EA8' : '#E0343F';
        ctx.fillRect(x, yy, ww, 3 * u);
        ctx.fillStyle = '#F4F1EA';
        ctx.fillRect(x + ww - 3 * u, yy + u, u, u);
        // Ícono de error y "líneas" de texto
        if (i < WIN.length - 1) {
          ctx.fillStyle = '#FFD23F';
          ctx.fillRect(x + 2 * u, yy + 5 * u, 4 * u, 4 * u);
          ctx.fillStyle = '#140A16';
          ctx.fillRect(x + 4 * u - Math.floor(u / 2), yy + 6 * u, u, 2 * u);
          ctx.fillStyle = '#8A8AA0';
          ctx.fillRect(x + 8 * u, yy + 5 * u, ww - 11 * u, u);
          ctx.fillRect(x + 8 * u, yy + 8 * u, ww - 15 * u, u);
        }
      }
    }
    y = top + 2 * u;
  });
  // Cara en la ventana de arriba
  const topWin = WIN[WIN.length - 1];
  const headK = collapse >= 0 ? Math.max(0, 1 - collapse / 0.35) : 1;
  if (headK > 0.6) {
    const hx = fx + topWin[2] * u;
    const hy = y - 2 * u + 4 * u - bob * u;
    ctx.fillStyle = '#140A16';
    if (mood === 'hurt') {
      ctx.fillRect(hx - 6 * u, hy + 2 * u, 3 * u, u);
      ctx.fillRect(hx + 3 * u, hy + 2 * u, 3 * u, u);
    } else {
      ctx.fillRect(hx - 5 * u, hy + u, 2 * u, 3 * u);
      ctx.fillRect(hx + 3 * u, hy + u, 2 * u, 3 * u);
      if (mood === 'angry') {
        ctx.fillRect(hx - 7 * u, hy - u, 4 * u, u);
        ctx.fillRect(hx + 3 * u, hy - u, 4 * u, u);
      }
    }
    if (mood === 'laugh') ctx.fillRect(hx - 3 * u, hy + 6 * u, 6 * u, 2 * u);
    else ctx.fillRect(hx - 2 * u, hy + 6 * u, 4 * u, u);
    // Gorra hacia atrás
    const cy = hy - 6 * u;
    ctx.fillStyle = '#101018';
    ctx.fillRect(hx - 10 * u, cy, 20 * u, 4 * u);
    ctx.fillRect(hx + 8 * u, cy + 2 * u, 6 * u, 2 * u);
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(hx - u, cy + u, 2 * u, u);
    // Micrófono en un bracito de cable
    const mx = fx - 18 * u;
    const my = fy - 26 * u - bob * u;
    ctx.fillStyle = '#140A16';
    ctx.fillRect(mx + 3 * u, my + 3 * u, u, 8 * u);
    ctx.fillRect(mx + 3 * u, my + 10 * u, 6 * u, u);
    ctx.fillStyle = '#8A8AA0';
    ctx.fillRect(mx + u, my, 5 * u, 4 * u);
    ctx.fillStyle = '#C8C8D8';
    ctx.fillRect(mx + 2 * u, my + u, u, u);
  }
  // "Error" que flota al colapsar
  if (collapse >= 0 && collapse < 3) {
    for (let i = 0; i < WIN.length; i++) {
      const start = (WIN.length - 1 - i) * 0.6;
      const p = (collapse - start) / 0.9;
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = 1 - p;
      drawText(ctx, '×', fx + (i % 2 ? 10 : -12) * u, fy - (12 + i * 12) * u - p * 14, { color: '#E0343F' });
      ctx.globalAlpha = 1;
    }
  }
}
