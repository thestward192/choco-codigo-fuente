// Base para enemigos que caminan por el suelo (Disquete, Blindado): gravedad, giro en paredes
// y bordes, flash de daño y explosión de píxeles.
import { createBody, moveX, moveY } from '../../systems/physics.js';
import { PLATFORMER, SCREEN, EFFECTS } from '../../config/balance.js';
import { playSfx } from '../../audio/sfx.js';

const TS = SCREEN.TILE;

export class Walker {
  constructor(x, footY, w, h, { dir = -1, speed = 20, turnAtEdges = true } = {}) {
    this.body = createBody(x - w / 2, footY - h, w, h);
    this.dir = dir;
    this.speed = speed;
    this.turnAtEdges = turnAtEdges;
    this.t = Math.random() * 2;
    this.stateT = 0;
    this.flashT = 0;
    this.dead = false;
    this.sx = 1;
    this.sy = 1;
    this.colors = ['#FFFFFF'];
    this.awake = false;
  }

  get cx() {
    return this.body.x + this.body.w / 2;
  }
  get cy() {
    return this.body.y + this.body.h / 2;
  }

  // Se activan al acercarse a la cámara (para que no se adelanten antes de verlos)
  checkAwake(scene) {
    if (!this.awake && scene.camera.isVisible(this.body.x, this.body.y, this.body.w, this.body.h, 48)) this.awake = true;
    return this.awake;
  }

  // Un paso de caminata. Devuelve true si chocó con una pared.
  walk(dt, scene, speed = this.speed, turnAtEdges = this.turnAtEdges) {
    const b = this.body;
    const map = scene.map;
    b.vy = Math.min(b.vy + PLATFORMER.GRAVITY_DOWN * dt, PLATFORMER.MAX_FALL);
    if (turnAtEdges && b.onGround) {
      const aheadX = this.dir > 0 ? b.x + b.w + 1 : b.x - 1;
      const tx = Math.floor(aheadX / TS);
      const ty = Math.floor((b.y + b.h + 1) / TS);
      if (!map.isSolid(tx, ty) && !map.isOneWay(tx, ty)) this.dir *= -1;
    }
    moveX(b, this.dir * speed * dt, map);
    const hit = !!b.hitWall;
    if (hit) this.dir *= -1;
    b.onGround = false;
    moveY(b, b.vy * dt, map);
    if (b.y > map.pxH + 32) this.dead = true;
    return hit;
  }

  relax(dt) {
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    this.sx += (1 - this.sx) * Math.min(1, dt * 12);
    this.sy += (1 - this.sy) * Math.min(1, dt * 12);
  }

  explode(scene, fromDir = 0, bits = 2) {
    this.dead = true;
    const cx = this.cx;
    const cy = this.cy;
    playSfx(scene.game.audio, 'enemyDie');
    scene.game.effects.hitstop(EFFECTS.HITSTOP_ENEMY_DIE);
    scene.game.effects.shake(EFFECTS.SHAKE_ENEMY_DIE);
    scene.particles.burst(cx, cy, 22, { speedMin: 30, speedMax: 120, colors: this.colors, gravity: 260, lifeMin: 0.3, lifeMax: 0.8, size: 2, endSize: 1, vx: fromDir * 40 });
    scene.particles.burst(cx, cy, 6, { speedMin: 10, speedMax: 40, colors: ['#FFFFFF'], lifeMin: 0.1, lifeMax: 0.2, size: 3, endSize: 1 });
    if (bits) scene.addBits?.(bits, cx, cy);
  }

  // Dibuja un sprite de 16×16 con los pies abajo, con squash
  drawSprite(ctx, spr, camX, camY, flip, size = 16) {
    const b = this.body;
    const footX = Math.round(b.x + b.w / 2 - camX);
    const footY = Math.round(b.y + b.h - camY);
    const dw = Math.round(size * this.sx);
    const dh = Math.round(size * this.sy);
    ctx.drawImage(spr.get(flip, this.flashT > 0), footX - Math.round(dw / 2), footY - dh, dw, dh);
  }
}
