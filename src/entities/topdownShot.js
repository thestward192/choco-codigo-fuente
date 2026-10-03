// Proyectiles en vista cenital (nivel 3):
//   TopdownShot: el Báculo de Choco en 4 direcciones (normal { } y cargado que atraviesa).
//   EnemyShot: invitaciones a reunión (sobres), notificaciones que persiguen y las balas de
//   la torreta de práctica. Se pueden bloquear o reflejar con el Escudo Firewall.
import { SCREEN, STAFF, DEADLINE } from '../config/balance.js';
import { itemSprites } from '../art/items.js';
import { fillCircle } from '../art/shapes.js';
import { fxRng } from '../core/rng.js';

const TS = SCREEN.TILE;
const R = fxRng;

export class TopdownShot {
  constructor(x, y, dx, dy, charged) {
    const cfg = charged ? STAFF.CHARGED : STAFF.NORMAL;
    this.charged = charged;
    this.dx = dx;
    this.dy = dy;
    this.size = cfg.SIZE;
    this.x = x;
    this.y = y;
    this.speed = cfg.SPEED;
    this.damage = cfg.DAMAGE;
    this.range = cfg.RANGE;
    this.dist = 0;
    this.dead = false;
    this.hit = new Set();
    this.t = 0;
  }

  get box() {
    const h = this.size / 2;
    return { x: this.x - h, y: this.y - h, w: this.size, h: this.size };
  }

  // blocked(tx, ty): ¿el disparo choca con ese tile?
  update(dt, scene, blocked) {
    this.t += dt;
    const step = this.speed * dt;
    this.x += this.dx * step;
    this.y += this.dy * step;
    this.dist += step;
    if (this.charged) {
      scene.particles.spawn({ x: this.x - this.dx * 5 + R.range(-2, 2), y: this.y - this.dy * 5 + R.range(-2, 2), vx: -this.dx * 20, vy: -this.dy * 20, life: 0.22, colors: ['#FFFFFF', '#43D9FF', '#2A6F8A'], front: false });
    } else if (R.chance(0.4)) scene.particles.spawn({ x: this.x - this.dx * 3, y: this.y - this.dy * 3, life: 0.12, color: '#43D9FF', front: false });
    // La altura del disparo está sobre el piso: el tile que importa es el de su sombra
    const tx = Math.floor((this.x + this.dx * 2) / TS);
    const ty = Math.floor((this.y + 7 + this.dy * 2) / TS);
    if (blocked(tx, ty)) {
      this.kill(scene, true);
      return;
    }
    if (this.dist >= this.range) this.kill(scene, false);
  }

  kill(scene, wall) {
    if (this.dead) return;
    this.dead = true;
    scene.particles.burst(this.x, this.y, this.charged ? 12 : wall ? 5 : 3, {
      speedMin: 20,
      speedMax: this.charged ? 90 : 50,
      colors: ['#FFFFFF', '#43D9FF', '#2A6F8A'],
      lifeMin: 0.1,
      lifeMax: 0.3,
    });
  }

  draw(ctx, cx, cy) {
    const s = this.charged ? itemSprites().shotCharged : itemSprites().shot;
    const white = this.charged && Math.floor(this.t * 20) % 3 === 0;
    const h = this.size / 2;
    // Sombra
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(this.x - cx - 2), Math.round(this.y - cy + 7), 4, 1);
    ctx.globalAlpha = 1;
    ctx.drawImage(s.get(this.dx < 0, white), Math.round(this.x - h - cx), Math.round(this.y - h - cy));
    if (this.range - this.dist < 20) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#07070C';
      ctx.fillRect(Math.round(this.x - h - cx), Math.round(this.y - h - cy), this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }
}

// kind: 'envelope' | 'notif' | 'turret'
export class EnemyShot {
  constructor(x, y, vx, vy, kind, { life = 6, homing = false } = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.kind = kind;
    this.life = life;
    this.homing = homing;
    this.lost = false; // una nube de vapor la confundió
    this.reflected = false;
    this.dead = false;
    this.t = 0;
    this.r = kind === 'notif' ? 4 : 3;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  // target: { x, y } para las que persiguen; blocked(tx, ty) para las paredes
  update(dt, scene, target, blocked) {
    this.t += dt;
    this.life -= dt;
    if (this.homing && !this.lost && !this.reflected && target) {
      const want = Math.atan2(target.y - this.y, target.x - this.x);
      let ang = Math.atan2(this.vy, this.vx);
      let d = want - ang;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      ang += Math.max(-DEADLINE.NOTIF_TURN * dt, Math.min(DEADLINE.NOTIF_TURN * dt, d));
      const sp = this.speed;
      this.vx = Math.cos(ang) * sp;
      this.vy = Math.sin(ang) * sp;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.kind === 'notif' && R.chance(0.3)) scene.particles.spawn({ x: this.x, y: this.y, life: 0.25, color: this.lost ? '#8A8AA0' : '#FF5A5A', front: false });
    if (this.reflected && R.chance(0.5)) scene.particles.spawn({ x: this.x, y: this.y, life: 0.2, color: '#FFFFFF', front: false });
    if (blocked(Math.floor(this.x / TS), Math.floor((this.y + 6) / TS)) || this.life <= 0) this.pop(scene);
  }

  pop(scene) {
    if (this.dead) return;
    this.dead = true;
    scene.particles.burst(this.x, this.y, 6, { speedMin: 20, speedMax: 60, colors: this.kind === 'envelope' ? ['#F4F1EA', '#C8C4BA', '#E0343F'] : this.kind === 'notif' ? ['#FF5A5A', '#FFFFFF'] : ['#43D9FF', '#FFFFFF'], lifeMin: 0.15, lifeMax: 0.35 });
  }

  // Parry: vuelve hacia su origen más rápido
  reflect(toX, toY, mult) {
    this.reflected = true;
    this.homing = false;
    const sp = this.speed * mult;
    const a = Math.atan2(toY - this.y, toX - this.x);
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.life = 3;
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    // Sombra (vuelan un poco sobre el piso)
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 2, y + 6, 5, 1);
    ctx.globalAlpha = 1;
    if (this.kind === 'envelope') {
      // Sobre de invitación a reunión
      const wob = Math.floor(this.t * 10) % 2;
      ctx.fillStyle = this.reflected ? '#FFFFFF' : '#0B0E16';
      ctx.fillRect(x - 4, y - 3 + wob, 9, 7);
      ctx.fillStyle = this.reflected ? '#DFFAFF' : '#F4F1EA';
      ctx.fillRect(x - 3, y - 2 + wob, 7, 5);
      ctx.fillStyle = '#C8C4BA';
      ctx.fillRect(x - 3, y - 2 + wob, 1, 1);
      ctx.fillRect(x - 2, y - 1 + wob, 1, 1);
      ctx.fillRect(x + 3, y - 2 + wob, 1, 1);
      ctx.fillRect(x + 2, y - 1 + wob, 1, 1);
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x, y + wob, 1, 1);
    } else if (this.kind === 'notif') {
      // Globo de notificación con un "1"
      const pulse = Math.floor(this.t * 8) % 2;
      ctx.fillStyle = '#0B0E16';
      fillCircle(ctx, x, y, 5);
      ctx.fillStyle = this.lost ? '#8A8AA0' : this.reflected ? '#FFFFFF' : pulse ? '#FF5A5A' : '#E0343F';
      fillCircle(ctx, x, y, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y - 2, 1, 5);
      ctx.fillRect(x - 1, y - 1, 1, 1);
    } else {
      ctx.fillStyle = '#0B0E16';
      fillCircle(ctx, x, y, 4);
      ctx.fillStyle = this.reflected ? '#FFFFFF' : '#43D9FF';
      fillCircle(ctx, x, y, 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 1, y - 1, 1, 1);
    }
  }
}
