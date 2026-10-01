// Mosquito de datos (12×12): vuela en onda senoidal de ida y vuelta. Solo muere con disparos
// (pisarlo duele). Los grupos de 3 vuelan en formación con la onda desfasada.
import { ENEMIES, EFFECTS } from '../../config/balance.js';
import { cartuchoEnemySprites, ENEMY_COLORS } from '../../art/enemies/cartucho.js';
import { playSfx } from '../../audio/sfx.js';

const CFG = ENEMIES.MOSQUITO;

export class Mosquito {
  // opts: { phase (0..1), range, dir }
  constructor(x, y, opts = {}) {
    this.ox = x;
    this.oy = y;
    this.range = opts.range ?? CFG.RANGE;
    this.phase = (opts.phase ?? 0) * Math.PI * 2;
    this.dir = opts.dir ?? -1;
    this.offset = 0;
    this.body = { x: x - CFG.W / 2, y: y - CFG.H / 2, w: CFG.W, h: CFG.H };
    this.hp = CFG.HP;
    this.t = Math.random() * 3;
    this.flashT = 0;
    this.dead = false;
    this.awake = false;
    this.stompable = false;
    this.shootable = true;
    this.colors = ENEMY_COLORS.mosquito;
    this.buzzIn = Math.random();
  }

  get active() {
    return !this.dead;
  }
  get cx() {
    return this.body.x + this.body.w / 2;
  }
  get cy() {
    return this.body.y + this.body.h / 2;
  }

  update(dt, scene) {
    if (!this.awake && scene.camera.isVisible(this.body.x, this.body.y, 12, 12, 40)) this.awake = true;
    this.t += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (!this.awake) return;
    this.offset += this.dir * CFG.SPEED * dt;
    if (Math.abs(this.offset) > this.range) {
      this.offset = Math.sign(this.offset) * this.range;
      this.dir *= -1;
    }
    const wave = Math.sin(this.phase + (this.t * Math.PI * 2) / CFG.WAVE_PERIOD) * CFG.WAVE_AMP;
    this.body.x = this.ox + this.offset - CFG.W / 2;
    this.body.y = this.oy + wave - CFG.H / 2;
    // Zumbido suave si está en pantalla
    this.buzzIn -= dt;
    if (this.buzzIn <= 0) {
      this.buzzIn = 1.6 + Math.random();
      if (scene.camera.isVisible(this.body.x, this.body.y, 12, 12, 0)) playSfx(scene.game.audio, 'buzz');
    }
  }

  damage(amount, scene, fromDir = 0) {
    this.hp -= amount;
    this.flashT = 0.08;
    playSfx(scene.game.audio, 'enemyHit');
    if (this.hp <= 0) this.explode(scene, fromDir);
    return this.hp <= 0;
  }

  explode(scene, fromDir = 0) {
    this.dead = true;
    playSfx(scene.game.audio, 'enemyDie');
    scene.game.effects.hitstop(EFFECTS.HITSTOP_ENEMY_DIE);
    scene.game.effects.shake(EFFECTS.SHAKE_ENEMY_DIE);
    scene.particles.burst(this.cx, this.cy, 16, { speedMin: 30, speedMax: 100, colors: this.colors, gravity: 200, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1, vx: fromDir * 40 });
    scene.addBits?.(2, this.cx, this.cy);
  }

  draw(ctx, camX, camY) {
    const s = cartuchoEnemySprites().mosquito;
    const spr = s[Math.floor(this.t * CFG.WING_FPS) % 2];
    const x = Math.round(this.cx - camX - 6);
    const y = Math.round(this.cy - camY - 7);
    ctx.drawImage(spr.get(this.dir > 0, this.flashT > 0), x, y);
  }
}
