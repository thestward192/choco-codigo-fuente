// Dibujo de los elementos de puzzle — docs/coop/03_mecanicas_coop.md y 06_arte_audio_coop.md
// Código de colores fijo: cian = Choco · ámbar = Tapita · gris = cualquiera · magenta con rayas = los dos.
import { SCREEN, COOP } from '../config/balance.js';
import { COOP as C } from '../art/palettes.js';
import { drawText } from '../art/font.js';
import { MELCOCHA } from '../art/tapita.js';

const TS = SCREEN.TILE;
const P = COOP.PUZZLE;
const INK = '#2A2730';
const GREY = '#9A96A6';
const GREY_L = '#D8D4E0';
const GREY_D = '#5A5666';
const ON = '#6FE08A';

// Color de quién activa un elemento (para las compuertas y los cables)
export function elementColor(e) {
  if (!e) return GREY;
  if (e.type === 'button') return e.kind === 'light' ? GREY_L : C.tapita;
  if (e.type === 'target') return C.choco;
  if (e.type === 'terminal') return C.both;
  if (e.type === 'exit') return C.both;
  return GREY_L;
}

function stripes(ctx, x, y, w, h, color, t = 0) {
  ctx.fillStyle = color;
  const off = Math.floor(t * 8) % 4;
  for (let i = -h; i < w; i += 4) {
    for (let k = 0; k < h; k++) {
      const xx = i + k + off;
      if (xx >= 0 && xx < w) ctx.fillRect(x + xx, y + k, 1, 1);
    }
  }
}

// ---------- Botones ----------
export function drawButton(ctx, e, cx, cy, t) {
  const r = e.rect;
  const x = Math.round(r.x - cx);
  const yFloor = Math.round(r.y - cy);
  const press = Math.round(e.press * 2);
  const w = r.w;
  // Base
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1, yFloor - 2, w + 2, 2);
  let top;
  let side;
  if (e.kind === 'light') {
    top = GREY_L;
    side = GREY;
  } else {
    top = C.tapita;
    side = C.tapitaDark;
  }
  const h = 4 - press;
  const y = yFloor - 2 - h;
  ctx.fillStyle = INK;
  ctx.fillRect(x + 1, y - 1, w - 2, h + 1);
  ctx.fillStyle = side;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillStyle = e.on ? '#FFFFFF' : top;
  ctx.fillRect(x + 2, y, w - 4, 1);
  if (e.kind === 'xheavy') stripes(ctx, x + 2, y + 1, w - 4, Math.max(1, h - 1), INK);
  if (e.kind === 'pound') {
    // Grieta
    ctx.fillStyle = INK;
    const mx = x + Math.round(w / 2);
    ctx.fillRect(mx - 1, y + 1, 1, 1);
    ctx.fillRect(mx, y + 2, 1, 1);
    ctx.fillRect(mx + 1, y + 1, 1, 1);
    // Temporizador visible
    if (e.on && e.timer > 0 && e.time) {
      const k = e.timer / e.time;
      ctx.fillStyle = INK;
      ctx.fillRect(x - 2, yFloor - 12, w + 4, 3);
      ctx.fillStyle = k < 0.3 && Math.floor(t * 8) % 2 ? '#FFFFFF' : C.tapita;
      ctx.fillRect(x - 1, yFloor - 11, Math.round((w + 2) * k), 1);
    }
  }
  // Luz de encendido
  ctx.fillStyle = e.on ? ON : '#3A3640';
  ctx.fillRect(x + Math.round(w / 2) - 1, yFloor - 1, 2, 1);
}

// ---------- Diana de código { } ----------
export function drawTarget(ctx, e, cx, cy, t) {
  const x = Math.round(e.tx * TS - cx);
  const y = Math.round(e.ty * TS - cy);
  const lit = e.on;
  ctx.fillStyle = INK;
  ctx.fillRect(x + 2, y + 1, 12, 14);
  ctx.fillRect(x + 1, y + 2, 14, 12);
  ctx.fillStyle = lit ? C.choco : '#123A52';
  ctx.fillRect(x + 3, y + 2, 10, 12);
  ctx.fillRect(x + 2, y + 3, 12, 10);
  if (e.flash > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 2, y + 2, 12, 12);
  }
  drawText(ctx, '{ }', x + 8, y + 4, { align: 'center', color: lit ? '#FFFFFF' : C.choco, shadow: false });
  if (lit && e.timer > 0 && e.time) {
    const k = e.timer / e.time;
    ctx.fillStyle = INK;
    ctx.fillRect(x, y + 16, 16, 2);
    ctx.fillStyle = C.choco;
    ctx.fillRect(x, y + 16, Math.round(16 * k), 1);
  }
  if (!lit && Math.floor(t * 2 + e.tx) % 4 === 0) {
    ctx.fillStyle = '#8AE8FF';
    ctx.fillRect(x + 4, y + 3, 1, 1);
  }
}

// ---------- Terminal de doble firma (magenta con rayas) ----------
// left: segundos que quedan de la ventana (lo que falta para firmar la otra)
export function drawTerminal(ctx, e, cx, cy, t, { left = 0, near = false } = {}) {
  const x = Math.round(e.tx * TS - cx);
  const y = Math.round(e.ty * TS - cy); // fila del pie
  // Pedestal
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, y + 6, 8, 10);
  stripes(ctx, x + 5, y + 7, 6, 8, C.both, 0);
  // Pantalla
  ctx.fillStyle = INK;
  ctx.fillRect(x + 1, y - 8, 14, 14);
  ctx.fillStyle = e.done ? '#0E3A1E' : '#2A0E22';
  ctx.fillRect(x + 2, y - 7, 12, 12);
  ctx.fillStyle = e.done ? ON : C.both;
  if (e.done) {
    ctx.fillRect(x + 4, y - 1, 1, 1);
    ctx.fillRect(x + 5, y, 1, 1);
    ctx.fillRect(x + 6, y - 1, 1, 1);
    ctx.fillRect(x + 7, y - 2, 1, 1);
    ctx.fillRect(x + 8, y - 3, 1, 1);
    ctx.fillRect(x + 9, y - 4, 1, 1);
  } else {
    // ">_" que parpadea
    ctx.fillRect(x + 4, y - 4, 1, 1);
    ctx.fillRect(x + 5, y - 3, 1, 1);
    ctx.fillRect(x + 4, y - 2, 1, 1);
    if (Math.floor(t * 3) % 2) ctx.fillRect(x + 7, y - 2, 3, 1);
  }
  // Firmó primero: la otra cuenta hacia atrás (barra de 0.5 s)
  if (left > 0) {
    const k = left / P.TERMINAL_WINDOW;
    ctx.fillStyle = INK;
    ctx.fillRect(x - 2, y - 14, 20, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 1, y - 13, Math.round(18 * k), 2);
  }
  if (near && !e.done) drawText(ctx, 'E', x + 8, y - 20 + Math.round(Math.sin(t * 6)), { align: 'center', color: C.both });
}

// ---------- Palanca ----------
export function drawLever(ctx, e, cx, cy, t, near = false) {
  const x = Math.round(e.tx * TS - cx);
  const y = Math.round(e.ty * TS - cy);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 3, y + 11, 10, 5);
  ctx.fillStyle = GREY;
  ctx.fillRect(x + 4, y + 12, 8, 3);
  // Mango inclinado (con un rebote al cambiar)
  const dir = e.on ? 1 : -1;
  const ang = dir * (0.7 - e.flip * 0.4);
  for (let i = 0; i < 9; i++) {
    const px = Math.round(x + 8 + Math.sin(ang) * i);
    const py = Math.round(y + 12 - Math.cos(ang) * i);
    ctx.fillStyle = INK;
    ctx.fillRect(px - 1, py, 2, 1);
  }
  const hx = Math.round(x + 8 + Math.sin(ang) * 9);
  const hy = Math.round(y + 12 - Math.cos(ang) * 9);
  ctx.fillStyle = e.on ? ON : '#E0343F';
  ctx.fillRect(hx - 2, hy - 2, 4, 3);
  if (near) drawText(ctx, 'E', x + 8, y - 8 + Math.round(Math.sin(t * 6)), { align: 'center', color: GREY_D });
}

// ---------- Balanza de poleas ----------
export function drawScale(ctx, e, cx, cy) {
  const top = Math.round((e.top ?? e.a.ty - 5) * TS + 8 - cy);
  for (const p of [e.pa, e.pb]) {
    const x = Math.round(p.x - cx);
    const y = Math.round(p.y - cy);
    // Cuerdas a la polea
    ctx.fillStyle = GREY_D;
    ctx.fillRect(x + 2, top, 1, y - top);
    ctx.fillRect(x + p.w - 3, top, 1, y - top);
    // Plato
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, p.w, 6);
    ctx.fillStyle = GREY_L;
    ctx.fillRect(x + 1, y + 1, p.w - 2, 2);
    ctx.fillStyle = GREY;
    ctx.fillRect(x + 1, y + 3, p.w - 2, 2);
  }
  // Viga y poleas
  const xa = Math.round(e.pa.x + e.pa.w / 2 - cx);
  const xb = Math.round(e.pb.x + e.pb.w / 2 - cx);
  ctx.fillStyle = INK;
  ctx.fillRect(Math.min(xa, xb) - 8, top - 3, Math.abs(xb - xa) + 16, 3);
  for (const px of [xa, xb]) {
    ctx.fillStyle = INK;
    ctx.fillRect(px - 4, top - 2, 9, 5);
    ctx.fillStyle = GREY;
    ctx.fillRect(px - 3, top - 1, 7, 3);
    ctx.fillStyle = INK;
    ctx.fillRect(px, top, 1, 1);
  }
  // Cuánto pesa cada lado (puntitos)
  for (const [p, w] of [
    [e.pa, e.wa],
    [e.pb, e.wb],
  ]) {
    for (let i = 0; i < (w || 0); i++) {
      ctx.fillStyle = C.tapita;
      ctx.fillRect(Math.round(p.x - cx) + 3 + i * 3, Math.round(p.y - cy) + 7, 2, 2);
    }
  }
}

// ---------- Compuerta ----------
export function drawGate(ctx, e, cx, cy, t, color) {
  const x = Math.round(e.tx * TS - cx);
  const y = Math.round(e.ty * TS - cy);
  const full = e.h * TS;
  const h = Math.max(0, Math.round(full * (1 - e.open)));
  // Riel
  ctx.fillStyle = GREY_D;
  ctx.fillRect(x, y - 2, TS, 2);
  if (h <= 0) return;
  // La hoja sube hacia el riel
  ctx.fillStyle = INK;
  ctx.fillRect(x + 2, y, TS - 4, h);
  ctx.fillStyle = '#4A4656';
  ctx.fillRect(x + 3, y, TS - 6, h - 1);
  for (let k = 6; k < h - 2; k += 8) {
    ctx.fillStyle = '#3A3644';
    ctx.fillRect(x + 3, y + k, TS - 6, 1);
  }
  // Franja de color de quién la abre
  ctx.fillStyle = color;
  ctx.fillRect(x + 7, y, 2, h - 1);
  if (color === C.both) stripes(ctx, x + 7, y, 2, h - 1, INK, t);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 2, y + h - 2, TS - 4, 2);
}

// ---------- Ventilador / extractor ----------
export function drawFan(ctx, e, cx, cy, t) {
  const r = e.rect;
  const x = Math.round(r.x - cx);
  const by = Math.round(r.y + r.h - cy); // base (piso)
  const w = r.w;
  // Corriente
  if (e.on) {
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) {
      const lx = x + 3 + ((i * 7) % (w - 4));
      const len = 6 + ((i * 5) % 6);
      const ly = Math.round(by - 6 - ((t * 140 + i * 23) % (r.h - 8)));
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#A8D8E8';
      ctx.fillRect(lx, ly, 1, len);
    }
    ctx.globalAlpha = 1;
  }
  // Rejilla
  ctx.fillStyle = INK;
  ctx.fillRect(x, by - 6, w, 6);
  ctx.fillStyle = GREY;
  ctx.fillRect(x + 1, by - 5, w - 2, 4);
  // Aspas
  const k = e.on ? Math.floor(t * 20) % 3 : 0;
  ctx.fillStyle = INK;
  for (let i = 2 + k; i < w - 2; i += 3) ctx.fillRect(x + i, by - 5, 1, 4);
  if (e.plug > 0) drawPlug(ctx, x + w / 2, by - 7, e.plug);
}

// Tapón de melcocha (parpadea el último segundo)
export function drawPlug(ctx, x, y, left) {
  if (left < 1 && Math.floor(left * 12) % 2) return;
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = MELCOCHA.outline;
  ctx.fillRect(x - 7, y - 3, 14, 6);
  ctx.fillStyle = MELCOCHA.ball;
  ctx.fillRect(x - 6, y - 2, 12, 4);
  ctx.fillStyle = MELCOCHA.shine;
  ctx.fillRect(x - 5, y - 2, 4, 1);
}

// ---------- Cortinas: agua (daña a Tapita) o vapor caliente (daña a Choco) ----------
export function drawCurtain(ctx, e, cx, cy, t) {
  const r = e.rect;
  const x = Math.round(r.x - cx);
  const y = Math.round(r.y - cy);
  // Boquilla arriba
  ctx.fillStyle = INK;
  ctx.fillRect(x - 3, y - 4, r.w + 6, 4);
  ctx.fillStyle = e.kind === 'water' ? '#43A8E0' : '#FF6A2A';
  ctx.fillRect(x - 2, y - 2, r.w + 4, 1);
  if (e.plug > 0) {
    drawPlug(ctx, x + r.w / 2, y, e.plug);
    return;
  }
  if (!e.on) return;
  if (e.kind === 'water') {
    for (let i = 0; i < r.w; i++) {
      const ph = (t * 160 + i * 9) % 12;
      for (let yy = 0; yy < r.h; yy += 12) {
        const sy = y + yy + Math.round(ph);
        if (sy >= y + r.h) continue;
        ctx.fillStyle = (i + yy) % 3 === 0 ? '#FFFFFF' : '#5AB8F0';
        ctx.fillRect(x + i, sy, 1, 6);
      }
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#43A8E0';
    ctx.fillRect(x, y, r.w, r.h);
    ctx.globalAlpha = 1;
  } else {
    // Vapor: columnas onduladas rojo-naranja que suben
    for (let yy = 0; yy < r.h; yy += 2) {
      const wob = Math.round(Math.sin((yy + t * 60) * 0.25) * 2);
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(yy * 0.3 - t * 8);
      ctx.fillStyle = yy % 6 === 0 ? '#FFD27A' : '#FF8A3A';
      ctx.fillRect(x + wob, y + r.h - yy - 2, r.w, 2);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Caja de madera ----------
export function drawBox(ctx, e, cx, cy) {
  if (e.broken) return;
  let bx = e.cx;
  let by = e.cy;
  if (e.anim) {
    const k = Math.min(1, e.anim.t / e.anim.dur);
    bx = e.anim.fx + (e.cx - e.anim.fx) * k;
    by = e.anim.fy + (e.cy - e.anim.fy) * k;
  }
  const s = e.size * TS;
  const x = Math.round(bx * TS - cx);
  const y = Math.round(by * TS - cy);
  ctx.fillStyle = '#3A2414';
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = '#A8743F';
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = '#7A4E2D';
  for (let k = 5; k < s - 1; k += 5) ctx.fillRect(x + 1, y + k, s - 2, 1);
  // Refuerzos
  ctx.fillStyle = '#5A3820';
  ctx.fillRect(x + 1, y + 1, s - 2, 2);
  ctx.fillRect(x + 1, y + s - 3, s - 2, 2);
  for (let i = 0; i < s - 4; i++) ctx.fillRect(x + 2 + i, y + 2 + Math.round((i * (s - 4)) / (s - 4)), 1, 1);
  ctx.fillStyle = '#D8A060';
  ctx.fillRect(x + 1, y + 1, s - 2, 1);
  if (e.size > 1) {
    ctx.fillStyle = C.tapita;
    ctx.fillRect(x + s / 2 - 3, y + s / 2 - 1, 6, 2); // solo Tapita la empuja
  }
}

// ---------- Marco de la puerta de salida doble ----------
// k: 0..1 lo que llevan los dos adentro · inside: el dueño está adentro
export function drawExitFrame(ctx, e, cx, cy, t, { inside = false, k = 0, done = false } = {}) {
  const x = Math.round(e.tx * TS - cx);
  const y = Math.round((e.ty - 1) * TS - cy);
  const color = e.who === 'tapita' ? C.tapita : C.choco;
  const dark = e.who === 'tapita' ? C.tapitaDark : C.chocoDark;
  // Fondo del marco: brilla si el dueño está adentro
  ctx.globalAlpha = done ? 0.2 : inside ? 0.45 + 0.15 * Math.sin(t * 10) : 0.15;
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, TS - 4, TS * 2 - 2);
  ctx.globalAlpha = 1;
  // Llenado de abajo hacia arriba cuando los dos están en su marco
  if (k > 0 && !done) {
    const h = Math.round((TS * 2 - 2) * k);
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x + 2, y + TS * 2 - h, TS - 4, h);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = dark;
  ctx.fillRect(x, y, TS, 2);
  ctx.fillRect(x, y, 2, TS * 2);
  ctx.fillRect(x + TS - 2, y, 2, TS * 2);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, TS - 2, 1);
  ctx.fillRect(x, y + 1, 1, TS * 2 - 1);
  ctx.fillRect(x + TS - 1, y + 1, 1, TS * 2 - 1);
  // Ícono del dueño arriba
  ctx.fillStyle = done ? ON : color;
  if (e.who === 'tapita') {
    ctx.fillRect(x + 5, y - 5, 6, 3);
    ctx.fillRect(x + 4, y - 3, 8, 2);
  } else {
    ctx.fillRect(x + 5, y - 6, 6, 5);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 6, y - 5, 1, 1);
    ctx.fillRect(x + 9, y - 5, 1, 1);
  }
}

// ---------- Burbuja de aire (oxígeno) ----------
export function drawBubble(ctx, e, cx, cy, t) {
  if (e.respawn > 0) return;
  const x = Math.round(e.x - cx + Math.sin(t * 2 + e.x) * 1.5);
  const y = Math.round(e.y - cy + Math.sin(t * 3) * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - 3, y - 4, 6, 1);
  ctx.fillRect(x - 3, y + 3, 6, 1);
  ctx.fillRect(x - 4, y - 3, 1, 6);
  ctx.fillRect(x + 3, y - 3, 1, 6);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#BFEFFF';
  ctx.fillRect(x - 3, y - 3, 6, 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - 2, y - 2, 1, 1);
}

// ---------- Zonas de calor: aire que ondula ----------
export function drawHeatZone(ctx, z, cx, cy, t) {
  const x = Math.round(z.x - cx);
  const y = Math.round(z.y - cy);
  if (x > SCREEN.W || x + z.w < 0 || y > SCREEN.H || y + z.h < 0) return;
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FF6A2A';
  ctx.fillRect(x, y, z.w, z.h);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#FFB13B';
  for (let i = 0; i < z.w; i += 12) {
    const yy = y + z.h - 4 - ((t * 30 + i * 7) % Math.max(8, z.h - 8));
    ctx.fillRect(x + i + Math.round(Math.sin(t * 4 + i) * 2), Math.round(yy), 1, 3);
  }
  ctx.globalAlpha = 1;
}
