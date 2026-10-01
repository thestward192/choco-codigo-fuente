// Portal glitcheado (salida del prólogo y de la sala de pruebas): franjas que ondulan en
// magenta, cian y morado, con píxeles sueltos. open: 0..1 (se abre desde una línea).
import { fxRng } from '../core/rng.js';

export function drawGlitchPortal(ctx, cx, bottom, h, t, open = 1) {
  if (open <= 0) return;
  const rows = Math.round((h / 2) * open);
  const top = Math.round(bottom - rows * 2);
  for (let i = 0; i < rows; i++) {
    const w = Math.max(1, Math.round((7 + Math.sin(t * 6 + i * 0.8) * 3) * Math.min(1, open * 1.5)));
    ctx.fillStyle = i % 3 === 0 ? '#FF2E88' : i % 3 === 1 ? '#43D9FF' : '#2A1446';
    ctx.fillRect(Math.round(cx - w), top + i * 2, w * 2, 2);
  }
  // Borde brillante y chispas
  ctx.fillStyle = '#FFFFFF';
  if (fxRng.chance(0.4)) ctx.fillRect(Math.round(cx + fxRng.int(-9, 9)), top + fxRng.int(0, Math.max(1, rows * 2 - 1)), 2, 1);
  if (open < 1) {
    ctx.globalAlpha = 1 - open;
    ctx.fillRect(Math.round(cx) - 1, top, 2, rows * 2);
    ctx.globalAlpha = 1;
  }
}
