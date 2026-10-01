// Peligros y plataformas del Mundo Cartucho. Todos los ataques avisan antes (docs/03_mecanicas.md):
// - Cable pelado: chispas 0.6 s antes de salir del conector. Invencible.
// - Barra de estática: cadena de bolas eléctricas que gira alrededor de un eje (siempre visible).
// - Géiser de estática: burbujea en el pozo antes de subir.
// - Plataforma que cae: tiembla antes de caer y reaparece.
// - Plataforma móvil (chip sobre rieles): ida y vuelta con pausa en los extremos.
import { ENEMIES, HAZARDS } from '../config/balance.js';
import { aabbOverlap } from '../systems/physics.js';
import { playSfx } from '../audio/sfx.js';
import { disc } from '../core/lighting.js';
import { fxRng } from '../core/rng.js';

const R = fxRng;

// ---------- Cable pelado (16×32) ----------
export class CablePelado {
  // x: centro; floorY: superficie del suelo; phase: 0..1 desfase del ciclo (ritmo en secuencia)
  constructor(x, floorY, phase = 0) {
    const C = ENEMIES.CABLE;
    this.x = x;
    this.floorY = floorY;
    this.h = 0;
    this.cycle = C.DOWN_TIME + C.TELEGRAPH + C.UP_TIME + (2 * C.HEIGHT) / C.RISE_SPEED;
    this.t = phase * this.cycle;
    this.state = 'down';
    this.prev = 'down';
  }

  phaseAt(t) {
    const C = ENEMIES.CABLE;
    const rise = C.HEIGHT / C.RISE_SPEED;
    let k = t % this.cycle;
    if (k < C.DOWN_TIME) return { s: 'down', h: 0 };
    k -= C.DOWN_TIME;
    if (k < C.TELEGRAPH) return { s: 'warn', h: 0 };
    k -= C.TELEGRAPH;
    if (k < rise) return { s: 'up', h: (k / rise) * C.HEIGHT };
    k -= rise;
    if (k < C.UP_TIME) return { s: 'up', h: C.HEIGHT };
    k -= C.UP_TIME;
    return { s: 'up', h: Math.max(0, C.HEIGHT - (k / rise) * C.HEIGHT) };
  }

  update(dt, scene) {
    this.t += dt;
    const p = this.phaseAt(this.t);
    this.state = p.s;
    this.h = p.h;
    const visible = scene.camera.isVisible(this.x - 8, this.floorY - 32, 16, 32, 8);
    if (this.state !== this.prev && visible) {
      if (this.state === 'warn') playSfx(scene.game.audio, 'spark');
      if (this.state === 'up') playSfx(scene.game.audio, 'zap');
    }
    this.prev = this.state;
    if (visible && this.state === 'warn' && R.chance(0.6)) {
      scene.particles.spawn({ x: this.x + R.range(-3, 3), y: this.floorY - 3, vx: R.range(-30, 30), vy: R.range(-60, -20), gravity: 200, life: 0.25, colors: ['#FFFFFF', '#FFD23F', '#43D9FF'] });
    }
    if (visible && this.h > 4 && R.chance(0.35)) {
      scene.particles.spawn({ x: this.x + R.range(-4, 4), y: this.floorY - this.h + R.range(-2, 3), vx: R.range(-40, 40), vy: R.range(-40, 10), life: 0.15, colors: ['#FFFFFF', '#43D9FF'] });
    }
  }

  hurtboxes() {
    if (this.h < 4) return [];
    return [{ x: this.x - 3, y: this.floorY - this.h, w: 6, h: this.h }];
  }

  touches(body) {
    return this.hurtboxes().some((r) => aabbOverlap(body, r));
  }

  sourceX(c) {
    return c.cx < this.x ? this.x + 4 : this.x - 4;
  }

  get hurtOpts() {
    return { fromBelow: true };
  }

  draw(ctx, camX, camY) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.floorY - camY);
    // Cable (aislante negro con brillo) y punta de cobre pelada
    if (this.h > 0) {
      const top = y - Math.round(this.h);
      ctx.fillStyle = '#14141E';
      ctx.fillRect(x - 2, top + 3, 5, Math.round(this.h) - 3);
      ctx.fillStyle = '#3A3A4E';
      ctx.fillRect(x - 1, top + 3, 1, Math.round(this.h) - 3);
      ctx.fillStyle = '#E08A3A';
      ctx.fillRect(x - 2, top, 5, 3);
      ctx.fillStyle = '#FFC07A';
      ctx.fillRect(x - 3, top - 1, 1, 2);
      ctx.fillRect(x + 1, top - 2, 1, 2);
      ctx.fillRect(x + 3, top - 1, 1, 2);
      // Arco eléctrico
      if (this.h > 20) {
        ctx.fillStyle = Math.floor(this.t * 30) % 2 ? '#FFFFFF' : '#43D9FF';
        let ax = x;
        for (let i = 0; i < 5; i++) {
          ax += R.int(-2, 2);
          ctx.fillRect(ax, top - 2 - i, 1, 1);
        }
      }
    }
    // Conector en el piso (siempre visible: es el aviso de que ahí sale algo)
    const warn = this.state === 'warn';
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(x - 6, y - 4, 13, 4);
    ctx.fillStyle = warn && Math.floor(this.t * 20) % 2 ? '#FFD23F' : '#5A5A6E';
    ctx.fillRect(x - 6, y - 4, 13, 1);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 2, y - 3, 5, 2);
    ctx.fillStyle = warn ? '#FFD23F' : '#E0343F';
    ctx.fillRect(x - 5, y - 2, 1, 1);
    ctx.fillRect(x + 5, y - 2, 1, 1);
  }
}

// ---------- Barra de estática ----------
export class StaticBar {
  // (px, py): eje en píxeles; n: bolas; dir: 1 horario, -1 antihorario; angle: inicial (rad)
  constructor(px, py, n = 5, { dir = 1, speed = HAZARDS.STATIC_BAR.SPEED, angle = 0 } = {}) {
    this.px = px;
    this.py = py;
    this.n = n;
    this.dir = dir;
    this.speed = speed;
    this.angle = angle;
    this.t = 0;
    this.crackleIn = 1;
  }

  balls() {
    const S = HAZARDS.STATIC_BAR.BALL_SPACING;
    const out = [];
    for (let i = 1; i <= this.n; i++) out.push({ x: this.px + Math.cos(this.angle) * i * S, y: this.py + Math.sin(this.angle) * i * S });
    return out;
  }

  update(dt, scene) {
    this.t += dt;
    this.angle += this.dir * this.speed * dt;
    this.crackleIn -= dt;
    if (this.crackleIn <= 0) {
      this.crackleIn = R.range(0.5, 1.2);
      if (scene.camera.isVisible(this.px - 40, this.py - 40, 80, 80, 0)) playSfx(scene.game.audio, 'crackle');
    }
  }

  hurtboxes() {
    const r = HAZARDS.STATIC_BAR.HIT_R;
    return this.balls().map((b) => ({ x: b.x - r, y: b.y - r, w: r * 2, h: r * 2 }));
  }

  touches(body) {
    return this.hurtboxes().some((r) => aabbOverlap(body, r));
  }

  sourceX(c) {
    return this.px;
  }

  draw(ctx, camX, camY) {
    const px = Math.round(this.px - camX);
    const py = Math.round(this.py - camY);
    // Eje: bloque metálico con remaches
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(px - 4, py - 4, 9, 9);
    ctx.fillStyle = '#8A93A6';
    ctx.fillRect(px - 3, py - 3, 7, 7);
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(px - 1, py - 1, 3, 3);
    const flick = Math.floor(this.t * 20);
    this.balls().forEach((b, i) => {
      const x = Math.round(b.x - camX);
      const y = Math.round(b.y - camY);
      ctx.fillStyle = (flick + i) % 3 === 0 ? '#FF2E88' : '#8C1D52';
      disc(ctx, x, y, 3);
      ctx.fillStyle = (flick + i) % 2 ? '#FFFFFF' : '#43D9FF';
      disc(ctx, x, y, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, 1, 1);
    });
  }
}

// ---------- Géiser de estática en un pozo ----------
export class Geyser {
  // x0..x1: borde del pozo en píxeles; surfaceY: altura del suelo alrededor; phase: 0..1
  constructor(x0, x1, surfaceY, phase = 0) {
    const G = HAZARDS.GEYSER;
    this.x0 = x0;
    this.x1 = x1;
    this.surfaceY = surfaceY;
    this.cycle = G.DOWN + G.WARN + G.UP + (2 * G.HEIGHT) / G.SPEED;
    this.t = phase * this.cycle;
    this.h = 0;
    this.state = 'down';
    this.prev = 'down';
  }

  update(dt, scene) {
    const G = HAZARDS.GEYSER;
    this.t += dt;
    const rise = G.HEIGHT / G.SPEED;
    let k = this.t % this.cycle;
    if (k < G.DOWN) {
      this.state = 'down';
      this.h = 0;
    } else if ((k -= G.DOWN) < G.WARN) {
      this.state = 'warn';
      this.h = 0;
    } else if ((k -= G.WARN) < rise) {
      this.state = 'up';
      this.h = (k / rise) * G.HEIGHT;
    } else if ((k -= rise) < G.UP) {
      this.state = 'up';
      this.h = G.HEIGHT;
    } else {
      k -= G.UP;
      this.state = 'up';
      this.h = Math.max(0, G.HEIGHT - (k / rise) * G.HEIGHT);
    }
    const visible = scene.camera.isVisible(this.x0, this.surfaceY - G.HEIGHT, this.x1 - this.x0, G.HEIGHT + 20, 8);
    if (visible && this.state !== this.prev) {
      if (this.state === 'warn') playSfx(scene.game.audio, 'bubble');
      if (this.state === 'up') playSfx(scene.game.audio, 'geyser');
    }
    this.prev = this.state;
    if (visible && this.state === 'warn' && R.chance(0.7)) {
      scene.particles.spawn({ x: R.range(this.x0 + 2, this.x1 - 2), y: this.surfaceY + 10, vy: R.range(-50, -20), life: 0.4, colors: ['#FF2E88', '#E0343F', '#FFFFFF'], size: 2, endSize: 1 });
    }
  }

  hurtboxes() {
    if (this.h < 2) return [];
    return [{ x: this.x0 + 2, y: this.surfaceY + 8 - this.h, w: this.x1 - this.x0 - 4, h: this.h }];
  }

  touches(body) {
    return this.hurtboxes().some((r) => aabbOverlap(body, r));
  }

  sourceX(c) {
    return c.cx;
  }

  get hurtOpts() {
    return { fromBelow: true };
  }

  draw(ctx, camX, camY) {
    const x0 = Math.round(this.x0 - camX);
    const w = Math.round(this.x1 - this.x0);
    const sy = Math.round(this.surfaceY - camY);
    // Superficie de estática siempre visible dentro del pozo
    const bub = this.state === 'warn';
    for (let i = 0; i < w; i += 2) {
      const yy = sy + 10 + Math.round(Math.sin(this.t * (bub ? 14 : 5) + i * 0.7) * (bub ? 2 : 1));
      ctx.fillStyle = (i + Math.floor(this.t * 10)) % 6 < 3 ? '#E0343F' : '#FF2E88';
      ctx.fillRect(x0 + i, yy, 2, 2);
    }
    if (this.h <= 0) return;
    // Columna de estática
    const top = Math.round(sy + 8 - this.h);
    const hh = Math.round(this.h);
    ctx.fillStyle = '#5A0F2A';
    ctx.fillRect(x0 + 2, top, w - 4, hh);
    for (let i = 0; i < hh; i += 2) {
      ctx.fillStyle = R.chance(0.5) ? '#E0343F' : '#FF2E88';
      ctx.fillRect(x0 + 2 + R.int(0, Math.max(0, w - 10)), top + i, R.int(3, 8), 1);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x0 + 3, top, w - 6, 1);
    ctx.fillStyle = '#FFB0D0';
    ctx.fillRect(x0 + 2, top + 1, w - 4, 1);
  }
}

// ---------- Plataforma que cae ----------
export class FallingPlatform {
  constructor(x, y, wTiles = 2) {
    this.ox = x;
    this.oy = y;
    this.plat = { x, y, w: wTiles * 16, h: 8, dx: 0, dy: 0, active: true };
    this.state = 'idle'; // idle | shake | fall | gone
    this.stateT = 0;
    this.vy = 0;
    this.t = 0;
    this.registered = false;
  }

  update(dt, scene) {
    const F = HAZARDS.FALLING_PLATFORM;
    if (!this.registered) {
      scene.map.platforms.push(this.plat);
      this.registered = true;
    }
    this.t += dt;
    this.stateT += dt;
    const p = this.plat;
    p.dx = 0;
    p.dy = 0;
    const c = scene.choco;
    if (this.state === 'idle') {
      if (c.body.platform === p) {
        this.state = 'shake';
        this.stateT = 0;
        playSfx(scene.game.audio, 'crumble');
      }
    } else if (this.state === 'shake') {
      if (this.stateT >= F.DELAY) {
        this.state = 'fall';
        this.stateT = 0;
        this.vy = 0;
      }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + F.GRAVITY * dt, 300);
      p.dy = this.vy * dt;
      p.y += p.dy;
      if (p.y > scene.map.pxH + 16) {
        this.state = 'gone';
        this.stateT = 0;
        p.active = false;
      }
    } else if (this.state === 'gone' && this.stateT >= F.RESPAWN) {
      this.state = 'idle';
      this.stateT = 0;
      p.x = this.ox;
      p.y = this.oy;
      p.active = true;
      this.respawnT = 0.4;
    }
    if (this.respawnT > 0) this.respawnT -= dt;
  }

  draw(ctx, camX, camY) {
    if (this.state === 'gone') return;
    const p = this.plat;
    let ox = 0;
    if (this.state === 'shake') ox = Math.floor(this.t * 40) % 2 ? 1 : -1;
    const x = Math.round(p.x - camX) + ox;
    const y = Math.round(p.y - camY);
    if (this.respawnT > 0) ctx.globalAlpha = 1 - this.respawnT / 0.4;
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(x, y, p.w, 9);
    ctx.fillStyle = '#7A7A90';
    ctx.fillRect(x + 1, y + 1, p.w - 2, 6);
    ctx.fillStyle = '#A8A8BE';
    ctx.fillRect(x + 1, y + 1, p.w - 2, 1);
    ctx.fillStyle = '#4A4A5E';
    for (let i = 6; i < p.w - 2; i += 9) ctx.fillRect(x + i, y + 2, 1, 4);
    // Grietas que avisan que se cae
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(x + 5, y + 3, 3, 1);
    ctx.fillRect(x + p.w - 9, y + 4, 2, 1);
    ctx.globalAlpha = 1;
  }
}

// ---------- Plataforma móvil: chip sobre rieles ----------
export class MovingPlatform {
  // path: [[x, y], [x, y]] en píxeles (esquina superior izquierda); pausa en los extremos
  constructor(path, wTiles = 2, { speed = HAZARDS.MOVING_PLATFORM.SPEED, phase = 0 } = {}) {
    this.path = path;
    this.w = wTiles * 16;
    const [x, y] = path[0];
    this.plat = { x, y, w: this.w, h: 8, dx: 0, dy: 0, active: true };
    const [x1, y1] = path[1];
    this.len = Math.hypot(x1 - x, y1 - y);
    this.speed = speed;
    this.pause = 0.4;
    this.cycle = 2 * (this.len / speed + this.pause);
    this.t = phase * this.cycle;
    this.registered = false;
    this.place(this.t);
  }

  posAt(t) {
    const legT = this.len / this.speed;
    let k = t % this.cycle;
    let f;
    if (k < this.pause) f = 0;
    else if ((k -= this.pause) < legT) f = k / legT;
    else if ((k -= legT) < this.pause) f = 1;
    else f = 1 - (k - this.pause) / legT;
    // Suavizado en los extremos
    f = f * f * (3 - 2 * f);
    const [x0, y0] = this.path[0];
    const [x1, y1] = this.path[1];
    return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f };
  }

  place(t) {
    const p = this.posAt(t);
    this.plat.x = p.x;
    this.plat.y = p.y;
  }

  update(dt, scene) {
    if (!this.registered) {
      scene.map.platforms.push(this.plat);
      this.registered = true;
    }
    this.t += dt;
    const p = this.posAt(this.t);
    this.plat.dx = p.x - this.plat.x;
    this.plat.dy = p.y - this.plat.y;
    this.plat.x = p.x;
    this.plat.y = p.y;
  }

  draw(ctx, camX, camY) {
    // Riel dorado punteado
    const [x0, y0] = this.path[0];
    const [x1, y1] = this.path[1];
    const n = Math.max(1, Math.round(this.len / 4));
    ctx.fillStyle = '#8A6A20';
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      ctx.fillRect(Math.round(x0 + (x1 - x0) * k + this.w / 2 - camX), Math.round(y0 + (y1 - y0) * k + 4 - camY), 1, 1);
    }
    for (const [ex, ey] of this.path) {
      ctx.fillStyle = '#D9AE4B';
      ctx.fillRect(Math.round(ex + this.w / 2 - 1 - camX), Math.round(ey + 3 - camY), 3, 3);
    }
    // Chip: cuerpo negro con patitas doradas y una muesca
    const p = this.plat;
    const x = Math.round(p.x - camX);
    const y = Math.round(p.y - camY);
    ctx.fillStyle = '#D9AE4B';
    for (let i = 3; i < this.w - 2; i += 4) {
      ctx.fillRect(x + i, y - 1, 2, 1);
      ctx.fillRect(x + i, y + 8, 2, 2);
    }
    ctx.fillStyle = '#101018';
    ctx.fillRect(x, y, this.w, 8);
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(x + 1, y + 1, this.w - 2, 1);
    ctx.fillStyle = '#3A3A4E';
    ctx.fillRect(x + 3, y + 3, 2, 2);
    ctx.fillStyle = '#6FE08A';
    if (Math.floor(this.t * 3) % 2) ctx.fillRect(x + this.w - 5, y + 3, 1, 1);
  }
}
