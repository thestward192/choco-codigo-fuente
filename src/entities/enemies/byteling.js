// Byteling: camina en línea recta; gira al chocar con paredes y (según variante) al borde.
// Se vence con un pisotón o un disparo.
import { ENEMIES, EFFECTS } from '../../config/balance.js';
import { createBody, moveX, moveY } from '../../systems/physics.js';
import { PLATFORMER, SCREEN } from '../../config/balance.js';
import { bytelingSprites, BYTELING_COLORS } from '../../art/enemies/byteling.js';
import { playSfx } from '../../audio/sfx.js';

const CFG = ENEMIES.BYTELING;
const TS = SCREEN.TILE;

let spritesCache = {};

export class Byteling {
  // opts: { dir: -1|1, turnAtEdges: bool, test: bool }
  constructor(x, footY, opts = {}) {
    this.body = createBody(x - CFG.W / 2, footY - CFG.H, CFG.W, CFG.H);
    this.dir = opts.dir ?? -1;
    this.turnAtEdges = opts.turnAtEdges ?? true;
    this.test = !!opts.test;
    this.hp = CFG.HP;
    this.state = 'walk'; // 'walk' | 'squashed' | 'dead'
    this.t = Math.random();
    this.stateT = 0;
    this.flashT = 0;
    this.stompable = true;
    this.shootable = true;
    this.dead = false;
    this.sx = 1;
    this.sy = 1;
  }

  get sprites() {
    const key = this.test ? 'test' : 'normal';
    return (spritesCache[key] ||= bytelingSprites(this.test));
  }

  get hitbox() {
    return this.body;
  }
  get active() {
    return this.state === 'walk';
  }

  update(dt, scene) {
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    this.sx += (1 - this.sx) * Math.min(1, dt * 12);
    this.sy += (1 - this.sy) * Math.min(1, dt * 12);
    if (this.state === 'squashed') {
      if (this.stateT > CFG.SQUASH_TIME) this.vanish(scene);
      return;
    }
    if (this.state !== 'walk') return;
    const b = this.body;
    const map = scene.map;
    b.vx = this.dir * CFG.SPEED;
    b.vy = Math.min(b.vy + PLATFORMER.GRAVITY_DOWN * dt, PLATFORMER.MAX_FALL);
    // ¿Borde adelante?
    if (this.turnAtEdges && b.onGround) {
      const aheadX = this.dir > 0 ? b.x + b.w + 1 : b.x - 1;
      const belowY = b.y + b.h + 1;
      const tx = Math.floor(aheadX / TS);
      const ty = Math.floor(belowY / TS);
      if (!map.isSolid(tx, ty) && !map.isOneWay(tx, ty)) this.dir *= -1;
    }
    moveX(b, this.dir * CFG.SPEED * dt, map);
    if (b.hitWall) this.dir *= -1;
    b.onGround = false;
    moveY(b, b.vy * dt, map);
    if (b.y > map.pxH + 32) this.dead = true;
  }

  // Pisotón: queda aplastado un momento y desaparece
  stomp(scene) {
    this.state = 'squashed';
    this.stateT = 0;
    this.sx = 1.4;
    this.sy = 0.6;
    playSfx(scene.game.audio, 'stomp');
    scene.particles.burst(this.body.x + this.body.w / 2, this.body.y + this.body.h, 6, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 20, speedMax: 60, colors: BYTELING_COLORS, gravity: 200, lifeMin: 0.2, lifeMax: 0.4 });
    scene.addBits?.(1, this.body.x + this.body.w / 2, this.body.y);
  }

  // Golpe de disparo. Devuelve true si murió.
  damage(amount, scene, fromDir = 0) {
    if (this.state !== 'walk') return false;
    this.hp -= amount;
    this.flashT = CFG.HIT_FLASH;
    playSfx(scene.game.audio, 'enemyHit');
    if (this.hp <= 0) {
      this.explode(scene, fromDir);
      return true;
    }
    return false;
  }

  explode(scene, fromDir = 0) {
    this.state = 'dead';
    this.dead = true;
    const cx = this.body.x + this.body.w / 2;
    const cy = this.body.y + this.body.h / 2;
    playSfx(scene.game.audio, 'enemyDie');
    scene.game.effects.hitstop(EFFECTS.HITSTOP_ENEMY_DIE);
    scene.game.effects.shake(EFFECTS.SHAKE_ENEMY_DIE);
    // Explosión de píxeles
    scene.particles.burst(cx, cy, 22, { speedMin: 30, speedMax: 120, colors: BYTELING_COLORS, gravity: 260, lifeMin: 0.3, lifeMax: 0.8, size: 2, endSize: 1, vx: fromDir * 40 });
    scene.particles.burst(cx, cy, 6, { speedMin: 10, speedMax: 40, colors: ['#FFFFFF'], lifeMin: 0.1, lifeMax: 0.2, size: 3, endSize: 1 });
    scene.addBits?.(2, cx, cy);
  }

  vanish(scene) {
    this.dead = true;
    const cx = this.body.x + this.body.w / 2;
    scene.particles.burst(cx, this.body.y + this.body.h - 2, 8, { speedMin: 10, speedMax: 40, colors: ['#8A8AA0', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.4 });
  }

  draw(ctx, camX, camY) {
    const b = this.body;
    const flip = this.dir < 0;
    const footX = Math.round(b.x + b.w / 2 - camX);
    const footY = Math.round(b.y + b.h - camY);
    let spr;
    if (this.state === 'squashed') spr = this.sprites.squashed;
    else spr = this.sprites.walk[Math.floor(this.t * CFG.WALK_FPS) % 2];
    const dw = Math.round(16 * this.sx);
    const dh = Math.round(16 * this.sy);
    // El sprite de 16×16 tiene los pies en la última fila; la hitbox es de 12×12
    ctx.drawImage(spr.get(flip, this.flashT > 0), footX - Math.round(dw / 2), footY - dh, dw, dh);
  }
}
