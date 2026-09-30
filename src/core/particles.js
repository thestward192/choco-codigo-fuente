// Pool de partículas: sin crear objetos en cada frame.
import { fxRng } from './rng.js';

const R = fxRng;

export class Particles {
  constructor(max = 700) {
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push({ active: false });
    this.cursor = 0;
    this.activeCount = 0;
  }

  // Opciones: x, y, vx, vy, life, color | colors[], size, endSize, gravity, drag,
  // shape ('rect' | 'pixel'), front (dibujar delante de las entidades)
  spawn(o) {
    const pool = this.pool;
    let p = null;
    for (let i = 0; i < pool.length; i++) {
      const idx = (this.cursor + i) % pool.length;
      if (!pool[idx].active) {
        p = pool[idx];
        this.cursor = (idx + 1) % pool.length;
        break;
      }
    }
    if (!p) {
      // Pool lleno: reutilizar la siguiente (la más vieja aproximadamente)
      p = pool[this.cursor];
      this.cursor = (this.cursor + 1) % pool.length;
    }
    p.active = true;
    p.x = o.x;
    p.y = o.y;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.life = o.life ?? 0.5;
    p.maxLife = p.life;
    p.color = o.color ?? '#ffffff';
    p.colors = o.colors ?? null;
    p.size = o.size ?? 1;
    p.endSize = o.endSize ?? p.size;
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 0;
    p.front = o.front ?? true;
    p.attract = o.attract ?? null; // {x, y, strength} partículas absorbidas
    return p;
  }

  // Ráfaga con valores aleatorios en rangos.
  burst(x, y, count, o = {}) {
    const speedMin = o.speedMin ?? 20;
    const speedMax = o.speedMax ?? 80;
    const angle = o.angle ?? 0;
    const spread = o.spread ?? Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = angle + (R.next() - 0.5) * spread;
      const s = R.range(speedMin, speedMax);
      this.spawn({
        x: x + (o.jitter ? R.range(-o.jitter, o.jitter) : 0),
        y: y + (o.jitterY ? R.range(-o.jitterY, o.jitterY) : o.jitter ? R.range(-o.jitter, o.jitter) : 0),
        vx: Math.cos(a) * s + (o.vx ?? 0),
        vy: Math.sin(a) * s + (o.vy ?? 0),
        life: R.range(o.lifeMin ?? 0.25, o.lifeMax ?? 0.6),
        color: o.colors ? R.pick(o.colors) : o.color,
        colors: o.fadeColors ?? null,
        size: o.size ?? 1,
        endSize: o.endSize,
        gravity: o.gravity ?? 0,
        drag: o.drag ?? 0,
        front: o.front,
      });
    }
  }

  update(dt) {
    let count = 0;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      count++;
      if (p.attract) {
        const dx = p.attract.x - p.x;
        const dy = p.attract.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * p.attract.strength * dt;
        p.vy += (dy / d) * p.attract.strength * dt;
        if (d < 2) p.active = false;
      }
      p.vy += p.gravity * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.activeCount = count;
  }

  draw(ctx, camX, camY, front = true) {
    for (const p of this.pool) {
      if (!p.active || p.front !== front) continue;
      const t = 1 - p.life / p.maxLife; // 0 → 1
      const size = Math.max(1, Math.round(p.size + (p.endSize - p.size) * t));
      let color = p.color;
      if (p.colors) color = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))];
      ctx.fillStyle = color;
      const half = size >> 1;
      ctx.fillRect(Math.round(p.x - camX) - half, Math.round(p.y - camY) - half, size, size);
    }
  }

  clear() {
    for (const p of this.pool) p.active = false;
  }
}
