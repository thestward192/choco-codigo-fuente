// Capa de oscuridad con "agujeros" de luz — docs/04_arte.md
// La oscuridad se pinta en un canvas aparte y las luces la recortan con círculos escalonados
// (bandas duras, sin degradados suaves, para que se vea pixel art). Luego se dibuja encima
// de la escena, y cada luz puede sumar un leve tinte de color.
import { createCanvas } from './renderer.js';
import { SCREEN } from '../config/balance.js';

const BANDS = [1, 0.78, 0.55, 0.32]; // radio relativo de cada banda
const CUT = [0.3, 0.55, 0.8, 1]; // cuánto recorta cada banda (de afuera hacia adentro)

export class Lighting {
  constructor(w = SCREEN.W, h = SCREEN.H) {
    this.canvas = createCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.w = w;
    this.h = h;
    this.tints = [];
  }

  begin(color = '#000', alpha = 0.7) {
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, this.w, this.h);
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(0, 0, this.w, this.h);
    c.globalAlpha = 1;
    this.tints.length = 0;
  }

  // Luz circular en (x, y) de pantalla con radio r. tint: color que se suma suavemente.
  light(x, y, r, { strength = 1, tint = null, tintAlpha = 0.12 } = {}) {
    const c = this.ctx;
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < BANDS.length; i++) {
      c.globalAlpha = CUT[i] * strength * 0.5;
      disc(c, Math.round(x), Math.round(y), Math.round(r * BANDS[i]));
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    if (tint) this.tints.push({ x, y, r, tint, tintAlpha });
  }

  // Luz rectangular (pantallas, ventanas)
  rect(x, y, w, h, strength = 1) {
    const c = this.ctx;
    c.globalCompositeOperation = 'destination-out';
    c.globalAlpha = strength;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
    // Tintes de color de las luces (suma suave)
    for (const t of this.tints) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = t.tintAlpha;
      ctx.fillStyle = t.tint;
      disc(ctx, Math.round(t.x), Math.round(t.y), Math.round(t.r * 0.7));
      ctx.globalAlpha = t.tintAlpha * 0.6;
      disc(ctx, Math.round(t.x), Math.round(t.y), Math.round(t.r * 0.4));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

// Círculo relleno pixelado (filas horizontales)
export function disc(ctx, cx, cy, r) {
  if (r <= 0) return;
  for (let y = -r; y <= r; y++) {
    const hw = Math.round(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
}
