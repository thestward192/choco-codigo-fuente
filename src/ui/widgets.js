// Widgets de interfaz reutilizables: paneles tipo terminal y cursor de llave.
import { drawText } from '../art/font.js';
import { UI } from '../art/palettes.js';

// Ventana de terminal con borde y barra de título.
export function drawTerminalPanel(ctx, x, y, w, h, title = '') {
  ctx.fillStyle = UI.panel;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = UI.panelBorder;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  // Barra de título
  ctx.fillStyle = '#161A2A';
  ctx.fillRect(x + 1, y + 1, w - 2, 11);
  ctx.fillStyle = UI.panelBorder;
  ctx.fillRect(x + 1, y + 12, w - 2, 1);
  // Botoncitos de ventana
  const dots = ['#E0343F', '#FFD23F', '#6FE08A'];
  dots.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + w - 8 - i * 6, y + 4, 3, 3);
  });
  if (title) drawText(ctx, title, x + 5, y + 3, { color: UI.cyan, shadow: false });
}

// Cursor animado: una llave `{` que rebota.
export function drawBraceCursor(ctx, x, y, t) {
  const bounce = Math.round(Math.abs(Math.sin(t * 8)) * 2);
  drawText(ctx, '{', x - bounce, y, { color: UI.yellow });
}
