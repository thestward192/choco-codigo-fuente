// Objetos recogibles: bits, Grano de Cacao, Trozo de Cacao y objetos de progreso.
import { PICKUPS } from '../config/balance.js';
import { itemSprites } from '../art/items.js';
import { aabbOverlap } from '../systems/physics.js';
import { fxRng } from '../core/rng.js';
import { icons } from '../art/icons.js';

const R = fxRng;

export class Pickup {
  // type: 'bit' | 'cacao' | 'chunk' | 'boots' | 'goldenY'
  // opts: { index (Y dorada 0..2), ghost (ya se había recogido en otra partida) }
  constructor(type, x, y, opts = {}) {
    this.index = opts.index ?? 0;
    this.ghost = !!opts.ghost;
    this.type = type;
    this.x = x; // centro
    this.y = y;
    this.t = R.range(0, 6);
    this.dead = false;
    this.size = type === 'bit' ? 8 : 12;
  }

  get hitbox() {
    const s = this.size;
    return { x: this.x - s / 2, y: this.y - s / 2, w: s, h: s };
  }

  sprite() {
    const s = itemSprites();
    return { bit: s.bit, cacao: s.cacao, chunk: s.chunk, boots: s.boots, goldenY: icons().goldenY }[this.type];
  }

  update(dt, scene) {
    this.t += dt;
    if (this.type !== 'bit' && R.chance(0.08)) {
      scene.particles.spawn({ x: this.x + R.range(-7, 7), y: this.y + R.range(-7, 7), vy: -10, life: 0.5, colors: ['#FFFFFF', '#FFD23F'], front: false });
    }
    const c = scene.choco;
    if (c.alive && aabbOverlap(c.body, this.hitbox)) {
      this.dead = true;
      scene.collect(this);
    }
  }

  draw(ctx, camX, camY) {
    const spr = this.sprite();
    const bob = Math.round(Math.sin(this.t * PICKUPS.BOB_SPEED) * PICKUPS.BOB_AMPLITUDE);
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - camY) + bob;
    if (this.type === 'goldenY') {
      // Y dorada ×2 que late, con brillo; translúcida si ya se tenía
      ctx.globalAlpha = this.ghost ? 0.45 : 1;
      const pulse = Math.floor(this.t * 4) % 6 === 0;
      const img = pulse ? spr.white : spr.normal;
      ctx.drawImage(img, x - 5, y - 7, 10, 14);
      if (!this.ghost && Math.floor(this.t * 3) % 2) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 5, y - 8, 1, 1);
        ctx.fillRect(x - 7, y + 4, 1, 1);
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (this.type === 'bit') {
      // Giro tipo moneda: ancho 6, 4, 2, 4
      const widths = [6, 4, 2, 4];
      const w = widths[Math.floor(this.t * 8) % 4];
      ctx.drawImage(spr.normal, x - w / 2, y - spr.h / 2, w, spr.h);
      return;
    }
    // Halo circular pixelado que late
    const r = Math.round(Math.max(spr.w, spr.h) / 2 + 2 + Math.sin(this.t * 5));
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#FFD23F';
    for (let yy = -r; yy <= r; yy++) {
      const hw = Math.round(Math.sqrt(r * r - yy * yy));
      ctx.fillRect(x - hw, y + yy, hw * 2, 1);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(spr.normal, Math.round(x - spr.w / 2), Math.round(y - spr.h / 2));
  }
}

