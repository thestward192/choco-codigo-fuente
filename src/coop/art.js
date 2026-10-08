// Dibujos compartidos de las pantallas del Modo Sincronizado: personajes en los menús,
// cajitas del código de sala e indicador de ping.
import { SpriteCache } from '../art/bake.js';
import { buildFrameRows, frameKey, chocoFrame, PALETTE, FRAME_W, FRAME_H } from '../art/choco.js';
import { TAPITA_SKETCH, COOP, UI } from '../art/palettes.js';
import { drawText } from '../art/font.js';
import { pingQuality } from '../net/session.js';

export { CHARS } from './lobbyState.js';
export const charColor = (who) => (who === 'tapita' ? COOP.tapita : COOP.choco);
export const otherChar = (who) => (who === 'tapita' ? 'choco' : 'tapita');

let tapitaCache = null;

// Sprite de un personaje del cooperativo. Tapita es un boceto (Choco con su paleta) hasta el Hito 10.
export function coopSprite(who, frame, face = 'normal', hasStaff = true) {
  if (who !== 'tapita') return chocoFrame(frame, face, hasStaff);
  if (!tapitaCache) tapitaCache = new SpriteCache(buildFrameRows, { ...PALETTE, ...TAPITA_SKETCH });
  return tapitaCache.get(frameKey(frame, face, false));
}

// Dibuja un personaje con los pies en (footX, footY).
// opts: anim ({fps, frames, loop}), t (segundos), scale, flip, face, staff, sx/sy (squash), alpha
export function drawCoopChar(ctx, who, footX, footY, { anim, t = 0, scale = 2, flip = false, face = 'normal', staff = true, sx = 1, sy = 1, alpha = 1, frame = null } = {}) {
  let f = frame;
  if (!f) {
    const n = anim.frames.length;
    let i = Math.floor(t * anim.fps);
    i = anim.loop === false ? Math.min(n - 1, i) : i % n;
    f = anim.frames[i];
  }
  const spr = coopSprite(who, f, face, staff);
  const dw = Math.max(1, Math.round(FRAME_W * scale * sx));
  const dh = Math.max(1, Math.round(FRAME_H * scale * sy));
  ctx.globalAlpha = alpha;
  ctx.drawImage(spr.get(flip), Math.round(footX - dw / 2), Math.round(footY - dh), dw, dh);
  ctx.globalAlpha = 1;
}

// Cajitas del código de sala, centradas en cx. Devuelve el ancho total.
// opts: scale (del texto), box (lado de la cajita), gap, color, cursor (índice de la cajita activa), t
export function drawCodeBoxes(ctx, code, cx, y, { length = 5, scale = 2, box = 16, gap = 4, color = UI.cyan, cursor = -1, t = 0, shake = 0 } = {}) {
  const chars = [...(code || '')];
  const total = length * box + (length - 1) * gap;
  let x = Math.round(cx - total / 2 + (shake > 0 ? Math.sin(shake * 70) * 3 : 0));
  for (let i = 0; i < length; i++) {
    const filled = i < chars.length;
    const active = i === cursor;
    ctx.fillStyle = '#0B0D18';
    ctx.fillRect(x, y, box, box);
    ctx.fillStyle = active ? (Math.floor(t * 4) % 2 ? UI.yellow : color) : filled ? color : UI.panelBorder;
    ctx.fillRect(x, y, box, 1);
    ctx.fillRect(x, y + box - 1, box, 1);
    ctx.fillRect(x, y, 1, box);
    ctx.fillRect(x + box - 1, y, 1, box);
    if (filled) {
      const textH = 7 * scale;
      drawText(ctx, chars[i], x + box / 2 + (scale > 1 ? 1 : 0), y + Math.round((box - textH) / 2), { align: 'center', bold: true, scale, color: UI.text, shadow: UI.shadow });
    } else if (active) {
      ctx.fillStyle = UI.yellow;
      ctx.fillRect(x + 3, y + box - 4, box - 6, 1);
    }
    x += box + gap;
  }
  return total;
}

// Barras de señal (4) con el color de la calidad del ping. Sin datos: barras apagadas.
export function drawPingBars(ctx, x, y, ms, { showMs = false } = {}) {
  const q = pingQuality(ms);
  const color = q === 'good' ? UI.green : q === 'ok' ? UI.yellow : q === 'bad' ? UI.red : UI.panelBorder;
  const lit = q === 'good' ? 4 : q === 'ok' ? 3 : q === 'bad' ? 1 : 0;
  for (let i = 0; i < 4; i++) {
    const h = 2 + i * 2;
    ctx.fillStyle = i < lit ? color : '#262A3C';
    ctx.fillRect(x + i * 3, y + 8 - h, 2, h);
  }
  if (showMs && ms !== null && ms !== undefined) drawText(ctx, `${Math.round(ms)} ms`, x + 14, y, { color, shadow: false });
}
