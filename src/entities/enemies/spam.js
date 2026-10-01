// Bloque spam: cuelga del techo y cae cuando Choco pasa debajo (tiembla 0.4 s antes).
// Al caer duele; al aterrizar queda como plataforma. Variante "lluvia" (jefe): aparece con una
// sombra en el suelo, cae y se rompe al tocar el piso.
import { ENEMIES } from '../../config/balance.js';
import { createBody, moveY, aabbOverlap } from '../../systems/physics.js';
import { cartuchoEnemySprites, ENEMY_COLORS } from '../../art/enemies/cartucho.js';
import { playSfx } from '../../audio/sfx.js';

const CFG = ENEMIES.SPAM;

export class SpamBlock {
  // x: centro, y: borde superior. opts: { rain: bool, floorY (para la sombra) }
  constructor(x, y, opts = {}) {
    this.body = createBody(x - 7, y + 1, 14, 15);
    this.rain = !!opts.rain;
    this.floorY = opts.floorY ?? null;
    this.state = this.rain ? 'warn' : 'hang';
    this.stateT = 0;
    this.t = 0;
    this.dead = false;
    this.stompable = false;
    this.shootable = false;
    this.diskImmune = true;
    this.colors = ENEMY_COLORS.spam;
    this.platform = null;
  }

  get active() {
    return this.state === 'fall';
  }
  get cx() {
    return this.body.x + this.body.w / 2;
  }

  update(dt, scene) {
    this.t += dt;
    this.stateT += dt;
    const c = scene.choco;
    const b = this.body;
    if (this.state === 'hang') {
      if (c.alive && Math.abs(c.cx - this.cx) < CFG.TRIGGER_DX && c.body.y > b.y && c.body.y - b.y < 150) {
        this.state = 'shake';
        this.stateT = 0;
        playSfx(scene.game.audio, 'spamShake');
      }
    } else if (this.state === 'shake' || this.state === 'warn') {
      const wait = this.state === 'shake' ? CFG.SHAKE_TIME : CFG.SHADOW_TIME;
      if (this.stateT >= wait) {
        this.state = 'fall';
        this.stateT = 0;
        b.vy = 40;
      }
    } else if (this.state === 'fall') {
      b.vy = Math.min(b.vy + CFG.GRAVITY * dt, CFG.MAX_FALL);
      b.onGround = false;
      moveY(b, b.vy * dt, scene.map);
      // Aplasta enemigos que estén debajo
      for (const e of scene.enemies) {
        if (e === this || e.dead || !e.active || e instanceof SpamBlock) continue;
        if (aabbOverlap(b, e.hurtbox || e.body) && e.explode) e.explode(scene, 0);
      }
      if (b.onGround) this.land(scene);
      if (b.y > scene.map.pxH + 32) this.dead = true;
    }
  }

  land(scene) {
    const b = this.body;
    scene.game.effects.shake(this.rain ? 0.22 : 0.15);
    playSfx(scene.game.audio, this.rain ? 'blockBreak' : 'thud');
    scene.particles.burst(this.cx, b.y + b.h, 8, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 20, speedMax: 60, colors: ['#8A8AA0', '#C8B898'], lifeMin: 0.2, lifeMax: 0.4, drag: 3 });
    if (this.rain) {
      this.dead = true;
      scene.particles.burst(this.cx, b.y + 8, 18, { speedMin: 40, speedMax: 120, colors: this.colors, gravity: 300, lifeMin: 0.3, lifeMax: 0.6, size: 2, endSize: 1 });
      return;
    }
    this.state = 'landed';
    // Queda como plataforma (sólida solo por arriba)
    this.platform = { x: b.x - 1, y: b.y, w: 16, h: 16, dx: 0, dy: 0, active: true };
    scene.map.platforms.push(this.platform);
  }

  // Solo duele mientras cae
  contact(scene, c) {
    if (this.state === 'fall' && c.body.y + 4 > this.body.y) c.hurt(this.cx, { fromBelow: false });
  }

  draw(ctx, camX, camY) {
    const spr = cartuchoEnemySprites().spam;
    const b = this.body;
    // Sombra previa en el suelo (lluvia del jefe)
    if (this.rain && this.floorY !== null && this.state !== 'landed') {
      const k = this.state === 'warn' ? Math.min(1, this.stateT / CFG.SHADOW_TIME) : 1;
      const w = Math.round(6 + 10 * k);
      ctx.globalAlpha = 0.35 + 0.35 * k;
      ctx.fillStyle = '#000000';
      ctx.fillRect(Math.round(this.cx - camX - w / 2), Math.round(this.floorY - camY - 2), w, 2);
      if (Math.floor(this.t * 12) % 2) {
        ctx.fillStyle = '#E0343F';
        ctx.fillRect(Math.round(this.cx - camX - w / 2), Math.round(this.floorY - camY - 3), w, 1);
      }
      ctx.globalAlpha = 1;
      if (this.state === 'warn') return;
    }
    let ox = 0;
    if (this.state === 'shake') ox = Math.floor(this.t * 40) % 2 ? 1 : -1;
    ctx.drawImage(spr.normal, Math.round(b.x - 1 - camX) + ox, Math.round(b.y - 1 - camY));
    if (this.state === 'hang') {
      // Pegado al techo con dos tiras de cinta
      ctx.fillStyle = '#C8B898';
      ctx.fillRect(Math.round(b.x + 2 - camX), Math.round(b.y - 2 - camY), 2, 2);
      ctx.fillRect(Math.round(b.x + 10 - camX), Math.round(b.y - 2 - camY), 2, 2);
    }
  }
}
