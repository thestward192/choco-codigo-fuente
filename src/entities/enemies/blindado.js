// Blindado: casco metálico. Los disparos le rebotan; solo se vence con un pisotón.
import { ENEMIES } from '../../config/balance.js';
import { Walker } from './walker.js';
import { cartuchoEnemySprites, ENEMY_COLORS } from '../../art/enemies/cartucho.js';
import { playSfx } from '../../audio/sfx.js';

const CFG = ENEMIES.ARMOR;

export class Blindado extends Walker {
  constructor(x, footY, opts = {}) {
    super(x, footY, CFG.W, CFG.H, { dir: opts.dir ?? -1, speed: CFG.SPEED, turnAtEdges: opts.turnAtEdges ?? true });
    this.colors = ENEMY_COLORS.armor;
    this.stompable = true;
    this.reflects = true;
    this.shootable = false;
    this.squashed = false;
    this.clang = 0;
  }

  get active() {
    return !this.dead && !this.squashed;
  }

  update(dt, scene) {
    this.relax(dt);
    if (this.clang > 0) this.clang -= dt;
    if (this.squashed) {
      if (this.stateT > 0.45) this.vanish(scene);
      return;
    }
    if (!this.checkAwake(scene)) return;
    this.walk(dt, scene);
  }

  // Un disparo le pega en el casco: chispas y se encoge un poco
  onReflect(scene) {
    this.clang = 0.15;
    this.sy = 0.85;
    this.sx = 1.12;
  }

  stomp(scene) {
    this.squashed = true;
    this.stateT = 0;
    this.sx = 1.4;
    this.sy = 0.55;
    playSfx(scene.game.audio, 'stompMetal');
    scene.particles.burst(this.cx, this.body.y, 8, { angle: -Math.PI / 2, spread: 2, speedMin: 30, speedMax: 80, colors: this.colors, gravity: 300, lifeMin: 0.3, lifeMax: 0.5 });
    scene.addBits?.(2, this.cx, this.body.y);
  }

  vanish(scene) {
    this.dead = true;
    scene.particles.burst(this.cx, this.body.y + this.body.h - 2, 8, { speedMin: 10, speedMax: 40, colors: ['#8A8AA0', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.4 });
  }

  draw(ctx, camX, camY) {
    const s = cartuchoEnemySprites().armor;
    const spr = s[Math.floor(this.t * CFG.WALK_FPS) % 2];
    this.drawSprite(ctx, spr, camX, camY, this.dir > 0);
    if (this.clang > 0) {
      ctx.fillStyle = '#FFFFFF';
      const x = Math.round(this.cx - camX);
      const y = Math.round(this.body.y - camY);
      ctx.fillRect(x - 4, y - 3, 2, 1);
      ctx.fillRect(x + 3, y - 4, 1, 2);
    }
  }
}
