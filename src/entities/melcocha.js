// Melcocha de Tapita — docs/coop/02_tapita.md
// Bola de caramelo que vuela en parábola. Al pegar en un piso, una pared o un techo, en 0.5 s se
// endurece como una plataforma de 2×1 tiles (sólida por arriba, para los dos) durante 6 s y
// parpadea el último segundo. Si pega en un enemigo, lo deja pegado 2.5 s.
// La simula quien la lanzó; al compañero le llega el lanzamiento (act) y dónde se pegó (ev).
import { COOP, SCREEN } from '../config/balance.js';
import { MELCOCHA } from '../art/tapita.js';
import { aabbOverlap } from '../systems/physics.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';

const C = COOP.TAPITA;
const TS = SCREEN.TILE;
const BALL = 4;
const R = fxRng;

export class Melcocha {
  // owner: true si la lanzó el jugador de esta computadora (decide dónde se pega)
  constructor(id, x, y, vx, vy, owner) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
    this.state = 'fly'; // 'fly' | 'soft' | 'hard' | 'gone'
    this.t = 0;
    this.dist = 0;
    this.plat = null; // { x, y, w, h, dx, dy, active, melcocha: true }
    this.dead = false;
  }

  get flying() {
    return this.state === 'fly';
  }

  update(dt, scene) {
    this.t += dt;
    if (this.state === 'fly') {
      this.vy += C.MELCOCHA_GRAVITY * dt;
      const nx = this.x + this.vx * dt;
      const ny = this.y + this.vy * dt;
      this.dist += Math.hypot(nx - this.x, ny - this.y);
      const map = scene.map;
      if (R.chance(0.5)) scene.particles.spawn({ x: this.x, y: this.y, life: 0.25, color: MELCOCHA.light, gravity: 60 });
      if (!this.owner) {
        // La copia del compañero solo vuela; el ev 'melStick' dice dónde quedó
        this.x = nx;
        this.y = ny;
        if (this.dist > C.MELCOCHA_RANGE * 1.5 || this.y > map.pxH + 32) this.pop(scene, false);
        return;
      }
      const box = { x: nx - BALL / 2, y: ny - BALL / 2, w: BALL, h: BALL };
      // ¿Un chorro, una cortina o un ventilador? Lo tapa (cooperativo)
      const stream = scene.streamAt?.(box);
      if (stream) {
        this.x = nx;
        this.y = ny;
        scene.plugStream(stream);
        this.pop(scene, true);
        return;
      }
      // ¿Enemigo?
      const e = scene.enemyAt?.(box);
      if (e) {
        this.x = nx;
        this.y = ny;
        scene.stickEnemy(e, this);
        this.pop(scene, true);
        return;
      }
      // ¿Tile? Primero el eje horizontal (pared), después el vertical (piso o techo)
      const txN = Math.floor(nx / TS);
      const tyO = Math.floor(this.y / TS);
      if (map.isSolid(txN, tyO)) {
        // Pared: la plataforma sale de la pared hacia quien la lanzó
        const wallX = this.vx > 0 ? txN * TS : (txN + 1) * TS;
        const px = this.vx > 0 ? wallX - C.MELCOCHA_W : wallX;
        this.stick(scene, px, Math.round(this.y - C.MELCOCHA_H / 2));
        return;
      }
      const tyN = Math.floor(ny / TS);
      if (map.isSolid(txN, tyN) || (this.vy > 0 && map.isOneWay(txN, tyN) && Math.floor(this.y / TS) < tyN)) {
        if (this.vy > 0) this.stick(scene, Math.round(nx - C.MELCOCHA_W / 2), tyN * TS - C.MELCOCHA_H);
        else this.stick(scene, Math.round(nx - C.MELCOCHA_W / 2), (tyN + 1) * TS);
        return;
      }
      this.x = nx;
      this.y = ny;
      if (this.dist > C.MELCOCHA_RANGE || this.y > map.pxH + 32) this.pop(scene, false);
      return;
    }
    if (this.state === 'soft' && this.t >= C.MELCOCHA_HARDEN) {
      this.state = 'hard';
      this.t = 0;
      this.plat.active = true;
      playSfx(scene.game.audio, 'melcochaHard');
      // Si alguien quedó adentro, la plataforma no lo atrapa: solo es sólida por arriba
    }
    if (this.state === 'hard' && this.t >= C.MELCOCHA_LIFE) this.pop(scene, true);
  }

  // Se pega en (x, y) = esquina de la plataforma. owner: avisa al compañero.
  stick(scene, x, y) {
    const map = scene.map;
    x = Math.max(0, Math.min(map.pxW - C.MELCOCHA_W, x));
    this.state = 'soft';
    this.t = 0;
    this.plat = { x, y, w: C.MELCOCHA_W, h: C.MELCOCHA_H, dx: 0, dy: 0, active: false, melcocha: true };
    this.x = x + C.MELCOCHA_W / 2;
    this.y = y + C.MELCOCHA_H / 2;
    map.platforms.push(this.plat);
    playSfx(scene.game.audio, 'melcochaStick');
    scene.particles.burst(this.x, this.y, 8, { speedMin: 20, speedMax: 60, colors: [MELCOCHA.ball, MELCOCHA.light, MELCOCHA.shine], gravity: 200, lifeMin: 0.2, lifeMax: 0.4 });
    if (this.owner) scene.onMelcochaStuck?.(this);
  }

  // Desaparece (se deshace o se termina)
  pop(scene, effect) {
    if (this.dead) return;
    this.dead = true;
    this.state = 'gone';
    if (this.plat) {
      const i = scene.map.platforms.indexOf(this.plat);
      if (i >= 0) scene.map.platforms.splice(i, 1);
    }
    if (effect) {
      playSfx(scene.game.audio, 'melcochaPop');
      scene.particles.burst(this.x, this.y, 10, { speedMin: 15, speedMax: 50, colors: [MELCOCHA.ball, MELCOCHA.light, MELCOCHA.dark], gravity: 220, lifeMin: 0.2, lifeMax: 0.5 });
    }
  }

  overlaps(box) {
    return this.plat && aabbOverlap(this.plat, box);
  }

  draw(ctx, camX, camY) {
    if (this.dead) return;
    if (this.state === 'fly') {
      const x = Math.round(this.x - camX);
      const y = Math.round(this.y - camY);
      ctx.fillStyle = MELCOCHA.outline;
      ctx.fillRect(x - 2, y - 1, 4, 2);
      ctx.fillRect(x - 1, y - 2, 2, 4);
      ctx.fillStyle = MELCOCHA.ball;
      ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.fillStyle = MELCOCHA.shine;
      ctx.fillRect(x - 1, y - 1, 1, 1);
      return;
    }
    const p = this.plat;
    // Parpadea el último segundo
    if (this.state === 'hard' && C.MELCOCHA_LIFE - this.t < C.MELCOCHA_BLINK && Math.floor(this.t * 12) % 2) return;
    const x = Math.round(p.x - camX);
    const y = Math.round(p.y - camY);
    const soft = this.state === 'soft';
    // Mientras se endurece "crece" desde el centro
    const k = soft ? Math.min(1, this.t / C.MELCOCHA_HARDEN) : 1;
    const w = Math.max(4, Math.round(p.w * (0.35 + 0.65 * k)));
    const x0 = x + Math.round((p.w - w) / 2);
    ctx.fillStyle = MELCOCHA.outline;
    ctx.fillRect(x0 + 1, y, w - 2, p.h);
    ctx.fillRect(x0, y + 1, w, p.h - 2);
    ctx.fillStyle = soft ? MELCOCHA.light : MELCOCHA.ball;
    ctx.fillRect(x0 + 1, y + 1, w - 2, p.h - 2);
    ctx.fillStyle = MELCOCHA.dark;
    ctx.fillRect(x0 + 1, y + p.h - 2, w - 2, 1);
    // Brillo y gotitas colgando
    ctx.fillStyle = MELCOCHA.shine;
    ctx.fillRect(x0 + 2, y + 1, Math.max(1, Math.round(w / 3)), 1);
    ctx.fillStyle = MELCOCHA.ball;
    for (let i = 0; i < 3; i++) {
      const dx = x0 + 4 + Math.round((i * (w - 8)) / 2);
      const len = 1 + ((i + Math.floor(this.t * 2)) % 3 === 0 ? 2 : 1);
      ctx.fillRect(dx, y + p.h, 1, len);
    }
  }
}

