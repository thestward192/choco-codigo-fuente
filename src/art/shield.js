// Burbuja hexagonal del Escudo Firewall — docs/02_personajes.md ("escudo: burbuja hexagonal")
// Se usa en plataformas y en vista cenital. Parpadea al final y destella en un parry.
import { hexagon } from './shapes.js';

// (x, y): centro en pantalla. o: { t, left (s que le quedan), parry (0..1 destello), r }
export function drawShieldBubble(ctx, x, y, o) {
  const r = o.r || 13;
  const ending = o.left !== undefined && o.left < 0.35;
  if (ending && Math.floor(o.t * 20) % 2 === 0) return;
  const rot = o.t * 0.6;
  const a = ctx.globalAlpha;
  // Relleno tenue
  ctx.globalAlpha = a * 0.16;
  ctx.fillStyle = o.parry > 0 ? '#FFFFFF' : '#43D9FF';
  for (let yy = -r + 2; yy <= r - 2; yy++) {
    const hw = Math.round(Math.sqrt(Math.max(0, (r - 2) * (r - 2) - yy * yy)));
    ctx.fillRect(Math.round(x) - hw, Math.round(y) + yy, hw * 2 + 1, 1);
  }
  // Hexágono exterior e interior
  ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = o.parry > 0 ? '#FFFFFF' : '#8AE8FF';
  hexagon(ctx, x, y, r, rot);
  ctx.globalAlpha = a * 0.45;
  ctx.fillStyle = '#43D9FF';
  hexagon(ctx, x, y, r - 3, -rot * 1.3);
  // Chispa que recorre el borde
  ctx.globalAlpha = a;
  ctx.fillStyle = '#FFFFFF';
  const s = o.t * 5;
  ctx.fillRect(Math.round(x + Math.cos(s) * r), Math.round(y + Math.sin(s) * r), 1, 1);
  if (o.parry > 0) {
    ctx.globalAlpha = a * o.parry;
    hexagon(ctx, x, y, r + 4 * (1 - o.parry) + 2, rot);
  }
  ctx.globalAlpha = a;
}
