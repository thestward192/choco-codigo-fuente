// Globos de ayuda pequeños junto a Choco (controles del tutorial) y consola de texto del sistema.
import { drawText, measureText } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { SCREEN } from '../config/balance.js';

// Globo con colita hacia abajo, centrado en (x, y = punta de la colita)
export function drawHintBubble(ctx, x, y, text, alpha = 1, color = UI.text) {
  if (alpha <= 0) return;
  const w = measureText(text) + 8;
  const h = 12;
  const bx = Math.round(Math.max(2, Math.min(SCREEN.W - w - 2, x - w / 2)));
  const by = Math.round(y - h - 3);
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#07070C';
  ctx.fillRect(bx, by, w, h);
  ctx.fillRect(Math.round(x) - 1, by + h, 3, 1);
  ctx.fillRect(Math.round(x), by + h + 1, 1, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#3A3F55';
  ctx.fillRect(bx, by, w, 1);
  ctx.fillRect(bx, by + h - 1, w, 1);
  ctx.fillRect(bx, by, 1, h);
  ctx.fillRect(bx + w - 1, by, 1, h);
  drawText(ctx, text, bx + 4, by + 2, { color, shadow: false });
  ctx.globalAlpha = 1;
}

// Línea de consola del sistema arriba de la pantalla (no bloquea el juego)
export function drawSystemLine(ctx, text, shown, alpha = 1, y = 20) {
  if (alpha <= 0) return;
  const w = measureText(text) + 14;
  const x = Math.round(SCREEN.W / 2 - w / 2);
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = '#07070C';
  ctx.fillRect(x, y - 3, w, 13);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = UI.cyan;
  ctx.fillRect(x, y - 3, 2, 13);
  drawText(ctx, text, x + 7, y, { color: UI.cyan, maxChars: shown });
  ctx.globalAlpha = 1;
}
