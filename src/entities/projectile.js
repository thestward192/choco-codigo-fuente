// Disparos del Báculo Compilador: normal `{ }` y cargado (atraviesa enemigos).
import { STAFF } from '../config/balance.js';
import { itemSprites } from '../art/items.js';
import { fxRng } from '../core/rng.js';
import { playSfx } from '../audio/sfx.js';

const R = fxRng;

export class Shot {
  // aim: dirección {x, y} (unitaria). Sin aim, horizontal hacia dir. `dir` queda como el signo
  // horizontal (0 si va recto arriba o abajo): los enemigos lo usan para el empujón.
  constructor(x, y, dir, charged, aim = null) {
    const cfg = charged ? STAFF.CHARGED : STAFF.NORMAL;
    this.charged = charged;
    this.ux = aim ? aim.x : dir;
    this.uy = aim ? aim.y : 0;
    this.dir = Math.abs(this.ux) < 0.01 ? 0 : Math.sign(this.ux);
    this.face = dir; // hacia dónde mira el sprite
    this.w = cfg.SIZE;
    this.h = cfg.SIZE;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.vx = this.ux * cfg.SPEED;
    this.vy = this.uy * cfg.SPEED;
    this.damage = cfg.DAMAGE;
    this.range = cfg.RANGE;
    this.dist = 0;
    this.dead = false;
    this.hit = new Set(); // enemigos ya golpeados (para el que atraviesa)
    this.t = 0;
    this.reflected = false;
  }

  get cx() {
    return this.x + this.w / 2;
  }
  get cy() {
    return this.y + this.h / 2;
  }

  update(dt, scene) {
    this.t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.dist += Math.hypot(this.vx, this.vy) * dt;
    // Estela (detrás, según la dirección de vuelo)
    const { ux, uy } = this;
    if (this.charged) {
      const px = -uy;
      const py = ux;
      const o = R.range(-5, 5);
      scene.particles.spawn({ x: this.cx - ux * 6 + px * o, y: this.cy - uy * 6 + py * o, vx: -ux * 20, vy: -uy * 20, life: 0.25, colors: ['#FFFFFF', '#43D9FF', '#2A6F8A'], front: false });
    } else if (R.chance(0.4)) {
      scene.particles.spawn({ x: this.cx - ux * 3, y: this.cy - uy * 3 + R.range(-1, 1), life: 0.12, color: '#43D9FF', front: false });
    }
    // Choca con paredes: se mira el punto delantero del proyectil
    const map = scene.map;
    const TS = 16;
    const tx = Math.floor((this.cx + ux * (this.w / 2 - 0.5)) / TS);
    const ty = Math.floor((this.cy + uy * (this.h / 2 - 0.5)) / TS);
    if (!this.reflected && map.isSolid(tx, ty)) {
      // Disparo horizontal: queda pegado a la pared (como siempre)
      if (uy === 0) this.x = this.dir > 0 ? tx * TS - this.w : (tx + 1) * TS;
      // El nivel puede reaccionar (bloques que se rompen con disparo cargado)
      scene.onShotHitTile?.(tx, ty, this);
      this.kill(scene, true);
      return;
    }
    if (this.reflected) {
      this.vy += 400 * dt;
      if (this.t - this.reflectedAt > 0.5) this.kill(scene, false);
    }
    if (this.dist >= this.range) this.kill(scene, false);
  }

  // Rebota en un casco (Blindados, jefes): vuelve hacia atrás girando y se desvanece, sin daño.
  reflect(scene) {
    if (this.reflected) return;
    this.reflected = true;
    this.reflectedAt = this.t;
    // Rebota hacia atrás (si iba recto arriba/abajo, hacia donde miraba el sprite)
    this.dir = this.dir ? -this.dir : -this.face;
    this.ux = this.dir;
    this.uy = 0;
    this.vx = this.dir * 120;
    this.vy = -110;
    scene.particles.burst(this.cx, this.cy, 6, { speedMin: 30, speedMax: 80, colors: ['#FFFFFF', '#FFD23F'], lifeMin: 0.1, lifeMax: 0.2 });
    playSfx(scene.game.audio, 'tink');
  }

  kill(scene, wall) {
    if (this.dead) return;
    this.dead = true;
    const n = this.charged ? 12 : wall ? 5 : 3;
    scene.particles.burst(this.cx + this.ux * (this.w / 2), this.cy + this.uy * (this.h / 2), n, {
      angle: Math.atan2(-this.uy, -this.ux),
      spread: wall ? 2.2 : Math.PI * 2,
      speedMin: 20,
      speedMax: this.charged ? 90 : 50,
      colors: ['#FFFFFF', '#43D9FF', '#2A6F8A'],
      lifeMin: 0.1,
      lifeMax: 0.3,
    });
  }

  draw(ctx, camX, camY) {
    const s = this.charged ? itemSprites().shotCharged : itemSprites().shot;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - camY);
    // Parpadeo del cargado
    const white = this.charged && Math.floor(this.t * 20) % 3 === 0;
    ctx.drawImage(s.get((this.dir || this.face) < 0, white), x, y);
    // Desvanecer al final del alcance
    if (this.range - this.dist < 20) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#07070C';
      ctx.fillRect(x, y, this.w, this.h);
      ctx.globalAlpha = 1;
    }
  }
}
