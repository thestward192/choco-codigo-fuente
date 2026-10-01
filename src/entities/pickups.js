// Objetos recogibles: bits, Grano de Cacao, Trozo de Cacao y objetos de progreso.
import { PICKUPS } from '../config/balance.js';
import { itemSprites } from '../art/items.js';
import { aabbOverlap, createBody, moveX, moveY } from '../systems/physics.js';
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
    this.rise = opts.rise ? 1 : 0; // sale de un bloque Y (sube 12 px antes de poder tomarse)
    this.clipY = opts.clipY ?? null; // borde superior del bloque: lo que está debajo no se dibuja
    // drop: -1 | 1 → al terminar de salir del bloque, salta hacia ese lado y cae al suelo
    this.drop = opts.drop ?? 0;
    this.phys = null;
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
    if (this.rise > 0) {
      this.rise = Math.max(0, this.rise - dt * 2.5);
      if (this.rise === 0 && this.drop) {
        this.phys = createBody(this.x - 5, this.y - 5, 10, 10);
        this.phys.vx = this.drop * PICKUPS.DROP_VX;
        this.phys.vy = PICKUPS.DROP_VY;
      }
      return;
    }
    // Cae con gravedad hasta quedar en el suelo (para que siempre se pueda tomar)
    const b = this.phys;
    if (b) {
      b.vy = Math.min(b.vy + PICKUPS.DROP_GRAVITY * dt, 300);
      moveX(b, b.vx * dt, scene.map);
      if (b.hitWall) b.vx = -b.vx * 0.5;
      b.onGround = false;
      moveY(b, b.vy * dt, scene.map);
      if (b.onGround) b.vx *= Math.max(0, 1 - dt * 8);
      this.x = b.x + 5;
      this.y = b.y + 5;
      if (b.onGround && Math.abs(b.vx) < 2) {
        this.y -= 3;
        this.phys = null;
      }
      if (this.y > scene.map.pxH + 32) this.dead = true;
    }
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
    if (this.rise > 0 && this.clipY !== null) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 2000, Math.round(this.clipY - camY));
      ctx.clip();
      this.drawSprite(ctx, camX, camY);
      ctx.restore();
      return;
    }
    this.drawSprite(ctx, camX, camY);
  }

  drawSprite(ctx, camX, camY) {
    const spr = this.sprite();
    const bob = Math.round(Math.sin(this.t * PICKUPS.BOB_SPEED) * PICKUPS.BOB_AMPLITUDE);
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - camY) + (this.rise > 0 ? Math.round(this.rise * 12) : this.phys ? 0 : bob);
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

