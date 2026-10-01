// Disquete: camina; al pisarlo se vuelve un disco que se puede patear. El disco pateado
// rebota en las paredes y elimina a los enemigos que toca (y a Choco si lo golpea de vuelta).
// Los disparos le rebotan: se vence con un pisotón.
import { ENEMIES, EFFECTS } from '../../config/balance.js';
import { aabbOverlap, isStomp } from '../../systems/physics.js';
import { Walker } from './walker.js';
import { cartuchoEnemySprites, ENEMY_COLORS } from '../../art/enemies/cartucho.js';
import { playSfx } from '../../audio/sfx.js';

const CFG = ENEMIES.DISK;

export class Disquete extends Walker {
  constructor(x, footY, opts = {}) {
    super(x, footY, CFG.W, CFG.H, { dir: opts.dir ?? -1, speed: CFG.SPEED, turnAtEdges: true });
    this.state = 'walk'; // 'walk' | 'shell' | 'kicked'
    this.colors = ENEMY_COLORS.disk;
    this.kickGrace = 0;
    this.spin = 0;
    this.stompable = true;
  }

  get active() {
    return !this.dead;
  }
  // Rebota los disparos mientras camina o está quieto
  get reflects() {
    return true;
  }
  get shootable() {
    return false;
  }

  update(dt, scene) {
    this.relax(dt);
    if (this.kickGrace > 0) this.kickGrace -= dt;
    if (!this.checkAwake(scene)) return;
    if (this.state === 'walk') {
      this.walk(dt, scene);
    } else if (this.state === 'shell') {
      this.walk(dt, scene, 0, false);
      // Se despierta si nadie lo patea (tiembla antes)
      if (this.stateT > CFG.SHELL_WAKE) {
        this.state = 'walk';
        this.stateT = 0;
        this.sy = 1.3;
      }
    } else if (this.state === 'kicked') {
      this.spin += dt * 18;
      const hit = this.walk(dt, scene, CFG.SHELL_SPEED, false);
      if (hit && scene.camera.isVisible(this.body.x, this.body.y, 16, 16)) {
        playSfx(scene.game.audio, 'diskBounce');
        scene.game.effects.shake(0.08);
        scene.particles.burst(this.dir > 0 ? this.body.x : this.body.x + this.body.w, this.cy, 5, { speedMin: 20, speedMax: 60, colors: ['#FFFFFF', '#D8DCE6'], lifeMin: 0.1, lifeMax: 0.25 });
      }
      // Elimina a los enemigos que toca
      for (const e of scene.enemies) {
        if (e === this || e.dead || !e.active) continue;
        if (aabbOverlap(this.body, e.hurtbox || e.body)) {
          if (e.diskImmune) continue;
          if (e.explode) e.explode(scene, this.dir);
          else e.damage?.(99, scene, this.dir);
          scene.game.effects.hitstop(EFFECTS.HITSTOP_STOMP);
          this.combo = (this.combo || 0) + 1;
          if (this.combo > 1) scene.addBits?.(this.combo, e.body.x, e.body.y);
        }
      }
    }
  }

  // Contacto con Choco (lo llama el nivel)
  contact(scene, c, inp) {
    const stomp = isStomp(c.body, this.body, c.body.vy);
    if (this.state === 'walk') {
      if (stomp) {
        this.toShell(scene);
        c.stomp(inp);
      } else c.hurt(this.cx);
    } else if (this.state === 'shell') {
      // Patear: hacia el lado contrario a Choco
      const dir = Math.sign(this.cx - c.cx) || c.facing;
      this.kick(scene, dir);
      if (stomp) c.stomp(inp);
    } else if (this.state === 'kicked') {
      if (stomp) {
        this.toShell(scene);
        c.stomp(inp);
      } else if (this.kickGrace <= 0) c.hurt(this.cx);
    }
  }

  toShell(scene) {
    this.state = 'shell';
    this.stateT = 0;
    this.combo = 0;
    this.sx = 1.4;
    this.sy = 0.6;
    playSfx(scene.game.audio, 'stomp');
    scene.particles.burst(this.cx, this.body.y + this.body.h, 6, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 20, speedMax: 60, colors: this.colors, gravity: 200, lifeMin: 0.2, lifeMax: 0.4 });
    scene.addBits?.(1, this.cx, this.body.y);
  }

  kick(scene, dir) {
    this.state = 'kicked';
    this.dir = dir;
    this.stateT = 0;
    this.kickGrace = CFG.KICK_GRACE;
    this.combo = 0;
    this.sx = 0.7;
    this.sy = 1.2;
    playSfx(scene.game.audio, 'kick');
    scene.game.effects.hitstop(2);
    scene.particles.burst(this.cx - dir * 6, this.cy, 6, { angle: dir > 0 ? Math.PI : 0, spread: 1, speedMin: 30, speedMax: 70, colors: ['#FFFFFF', '#8A8AA0'], lifeMin: 0.1, lifeMax: 0.3 });
  }

  draw(ctx, camX, camY) {
    const s = cartuchoEnemySprites().disk;
    if (this.state === 'walk') {
      this.drawSprite(ctx, s.walk[Math.floor(this.t * CFG.WALK_FPS) % 2], camX, camY, this.dir > 0);
    } else {
      // Quieto: tiembla al despertar. Pateado: gira.
      const shaking = this.state === 'shell' && this.stateT > CFG.SHELL_WAKE - 1;
      const idx = this.state === 'kicked' ? Math.floor(this.spin) % 4 : 0;
      const ox = shaking && Math.floor(this.t * 30) % 2 ? 1 : 0;
      ctx.save();
      ctx.translate(ox, 2);
      this.drawSprite(ctx, s.shell[idx], camX, camY, false);
      ctx.restore();
    }
  }
}
