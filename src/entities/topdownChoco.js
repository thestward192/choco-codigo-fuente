// Choco en vista cenital (niveles 2 y 3): camina en 8 direcciones con sprite de 4,
// empuja estantes (biblioteca), salta pilas de libros bajas con las Botas e interactúa con E.
import { SCREEN, TOPDOWN } from '../config/balance.js';
import { createTopdownBody, stepTopdown, facingFrom, DIRS } from '../systems/topdown.js';
import { chocoTop } from '../art/topdown.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';

const TS = SCREEN.TILE;

export class TopdownChoco {
  constructor(scene, footX, footY, dir = 'down') {
    this.scene = scene;
    this.body = createTopdownBody(footX, footY);
    this.dir = dir;
    this.state = 'play'; // 'play' | 'frozen' | 'hop'
    this.t = 0;
    this.walkT = 0;
    this.grace = 0; // tras huir de una batalla: parpadea y los bugs no lo tocan
    this.pushT = 0;
    this.pushTarget = null;
    this.hop = null;
    this.interactT = 0;
    this.surprise = 0;
    this.blinkT = 2;
    this.stepT = 0;
    this.items = { staff: true, boots: false, laptop: false, shield: false, lasso: false };
  }

  get footX() {
    return this.body.x + this.body.w / 2;
  }
  get footY() {
    return this.body.y + this.body.h;
  }
  get alive() {
    return true;
  }
  // Punto delante de Choco (para elegir con qué interactuar)
  get lookX() {
    return this.footX + DIRS[this.dir].x * 10;
  }
  get lookY() {
    return this.footY - 4 + DIRS[this.dir].y * 10;
  }

  placeAt(footX, footY, dir = this.dir) {
    this.body.x = footX - this.body.w / 2;
    this.body.y = footY - this.body.h;
    this.body.vx = 0;
    this.body.vy = 0;
    this.dir = dir;
    this.hop = null;
    this.state = 'play';
  }

  update(dt, inp) {
    this.t += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.interactT > 0) this.interactT -= dt;
    if (this.surprise > 0) this.surprise -= dt;
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = fxRng.range(2, 4.5);

    if (this.state === 'hop') {
      this.updateHop(dt);
      return;
    }
    if (this.state !== 'play') {
      this.body.vx = 0;
      this.body.vy = 0;
      this.walkT = 0;
      return;
    }
    const s = this.scene;
    const ix = inp.moveX();
    const iy = inp.moveY();
    this.dir = facingFrom(ix, iy, this.dir);
    // Salto corto sobre una pila de libros
    if (inp.pressed('jump') && this.tryHop()) return;

    stepTopdown(this.body, { x: ix, y: iy }, dt, s.map, s.obstacles());
    const moving = Math.abs(this.body.vx) + Math.abs(this.body.vy) > 8;
    if (moving) {
      this.walkT += dt;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.28;
        playSfx(s.game.audio, 'step');
        if (fxRng.chance(0.5)) s.particles.spawn({ x: this.footX + fxRng.range(-3, 3), y: this.footY - 1, vx: fxRng.range(-10, 10), vy: -8, life: 0.25, color: '#B07A4A', front: false });
      }
    } else this.walkT = 0;

    // Empujar estantes: mantener la dirección contra uno, alineado
    const pushing = this.pushCandidate(ix, iy);
    if (pushing) {
      if (this.pushTarget !== pushing.shelf) {
        this.pushTarget = pushing.shelf;
        this.pushT = 0;
      }
      this.pushT += dt;
      if (this.pushT >= TOPDOWN.PUSH_DELAY) {
        this.pushT = -0.1;
        s.tryPushShelf?.(pushing.shelf, pushing.dx, pushing.dy);
      }
    } else {
      this.pushTarget = null;
      this.pushT = 0;
    }
  }

  // ¿Está empujando un estante? Solo en una dirección cardinal y alineado con él
  pushCandidate(ix, iy) {
    if ((ix && iy) || (!ix && !iy)) return null;
    const shelves = this.scene.shelves || [];
    const b = this.body;
    for (const sh of shelves) {
      if (sh.anim) continue;
      const r = sh.rect;
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      if (ix) {
        const touching = ix > 0 ? Math.abs(b.x + b.w - r.x) < 1.5 : Math.abs(b.x - (r.x + r.w)) < 1.5;
        const fy = b.y + b.h / 2;
        if (touching && Math.abs(fy - cy) <= TOPDOWN.PUSH_ALIGN) return { shelf: sh, dx: ix, dy: 0 };
      } else {
        const touching = iy > 0 ? Math.abs(b.y + b.h - r.y) < 1.5 : Math.abs(b.y - (r.y + r.h)) < 1.5;
        if (touching && Math.abs(this.footX - cx) <= TOPDOWN.PUSH_ALIGN) return { shelf: sh, dx: 0, dy: iy };
      }
    }
    return null;
  }

  // Salta una pila baja ('&') si está justo delante y del otro lado hay espacio
  tryHop() {
    const s = this.scene;
    if (!this.items.boots) return false;
    const d = DIRS[this.dir];
    const tx = Math.floor((this.footX + d.x * 9) / TS);
    const ty = Math.floor((this.footY - 4 + d.y * 9) / TS);
    if (s.map.charAt(tx, ty) !== '&') return false;
    const lx = tx + d.x;
    const ly = ty + d.y;
    if (s.map.isSolid(lx, ly) || s.cellBlocked?.(lx, ly)) return false;
    // Llega al centro del tile del otro lado (en el eje del salto)
    const to = d.x ? { x: lx * TS + 8, y: this.footY } : { x: this.footX, y: ly * TS + 12 };
    this.hop = { t: 0, fromX: this.footX, fromY: this.footY, toX: to.x, toY: to.y };
    this.state = 'hop';
    playSfx(s.game.audio, 'hop');
    return true;
  }

  updateHop(dt) {
    const h = this.hop;
    h.t += dt / TOPDOWN.HOP_TIME;
    const p = Math.min(1, h.t);
    const x = h.fromX + (h.toX - h.fromX) * p;
    const y = h.fromY + (h.toY - h.fromY) * p;
    this.body.x = x - this.body.w / 2;
    this.body.y = y - this.body.h;
    this.z = Math.sin(p * Math.PI) * TOPDOWN.HOP_HEIGHT;
    if (p >= 1) {
      this.z = 0;
      this.hop = null;
      this.state = 'play';
      playSfx(this.scene.game.audio, 'landSoft');
      this.scene.particles.burst(this.footX, this.footY - 1, 6, { speedMin: 10, speedMax: 30, angle: -Math.PI / 2, spread: Math.PI, colors: ['#C8B898', '#E9DCC3'], lifeMin: 0.2, lifeMax: 0.35, front: false });
    }
  }

  draw(ctx, camX, camY) {
    if (this.grace > 0 && Math.floor(this.grace * 14) % 2 === 0) return;
    const fx = Math.round(this.footX - camX);
    const fy = Math.round(this.footY - camY);
    const z = Math.round(this.z || 0);
    // Sombra
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    const sw = z > 2 ? 8 : 10;
    ctx.fillRect(fx - sw / 2, fy - 1, sw, 2);
    ctx.fillRect(fx - sw / 2 + 1, fy - 2, sw - 2, 1);
    ctx.globalAlpha = 1;
    const moving = this.walkT > 0;
    const frame = this.state === 'hop' ? 1 : moving ? Math.floor(this.walkT * TOPDOWN.WALK_FPS) % 4 : 0;
    let pose = 'walk';
    if (this.interactT > 0) pose = 'interact';
    else if (this.blinkT < 0 && !moving && this.dir !== 'up') pose = 'blink';
    const spr = chocoTop(this.dir, frame, pose);
    ctx.drawImage(spr.normal, fx - 8, fy - 16 - z);
    // LED de los audífonos
    if (this.dir !== 'up' && this.t % 1.2 < 0.25) {
      ctx.fillStyle = '#DFFAFF';
      const lx = this.dir === 'down' ? fx + 4 : this.dir === 'right' ? fx - 2 : fx + 1;
      ctx.fillRect(lx, fy - 16 - z + (this.dir === 'down' ? 9 : 7) + (frame % 2), 1, 1);
    }
    if (this.surprise > 0) {
      const by = fy - 26 - z - Math.round(Math.max(0, this.surprise - 0.5) * 8);
      ctx.fillStyle = '#07070C';
      ctx.fillRect(fx - 3, by - 1, 7, 10);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(fx - 1, by, 2, 5);
      ctx.fillRect(fx - 1, by + 6, 2, 2);
    }
  }
}
