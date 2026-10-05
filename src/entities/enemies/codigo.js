// Enemigos y peligros del Código Puro (nivel 5) — docs/02_personajes.md y nivel_5_codigo_puro.md
//   Bullet          bala de Excepción: roja (se bloquea) o magenta con borde blanco (reflejable);
//                   devuelta con parry vuela hacia quien la disparó
//   WallTurret      torreta de Excepciones en una pared: dispara balas reflejables; rota con su
//                   propia bala devuelta, abre su candado
//   Fragment        mini copia de N.U.L.L.: avisa 0.5 s y se lanza en línea recta hacia Choco
//   PushFrame       plataforma del Push: se desliza desde la pared cuando el nivel la arma
//   Segment         Segmento corrupto: desaparece 0.5 s después de pisarlo y vuelve
//   Firewall        capa de fuego de código: solo se cruza con el escudo activo
//   ExceptionWarn   aviso en el borde de la pantalla; después cruza una Excepción
import { STACK, SCREEN } from '../../config/balance.js';
import { aabbOverlap } from '../../systems/physics.js';
import { shieldOn } from '../../systems/shield.js';
import { playSfx } from '../../audio/sfx.js';
import { fxRng } from '../../core/rng.js';
import { disc } from '../../core/lighting.js';
import { drawText } from '../../art/font.js';
import { drawFirewall, drawTurret, drawFragment, drawPushFrame, drawSegment } from '../../art/codigo.js';

const R = fxRng;
const TS = SCREEN.TILE;
const SHARDS = ['#FF2E88', '#8C1D52', '#FFFFFF', '#43D9FF'];

// ---------- Bala de Excepción ----------
export class Bullet {
  // opts: { reflectable, owner (con returnPoint/onReflectHit), solid (choca con tiles), life, size }
  constructor(x, y, vx, vy, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.reflectable = !!opts.reflectable;
    this.owner = opts.owner || null;
    this.solid = opts.solid ?? true;
    this.life = opts.life ?? STACK.BULLET_LIFE;
    this.r = opts.size ?? 3;
    this.kind = opts.kind || 'exception';
    this.t = 0;
    this.dead = false;
    this.reflected = false;
  }

  rect() {
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }

  // Parry: solo las reflejables vuelven; las demás se deshacen contra el escudo
  reflect(scene) {
    if (this.reflected) return;
    if (!this.reflectable) {
      this.pop(scene);
      return;
    }
    this.reflected = true;
    this.t = 0;
    playSfx(scene.game.audio, 'reflect');
    scene.particles.burst(this.x, this.y, 8, { speedMin: 30, speedMax: 90, colors: ['#FFFFFF', '#43D9FF'], lifeMin: 0.1, lifeMax: 0.3 });
  }

  pop(scene) {
    if (this.dead) return;
    this.dead = true;
    scene.particles.burst(this.x, this.y, 5, { speedMin: 20, speedMax: 60, colors: this.reflected ? ['#43D9FF', '#FFFFFF'] : ['#FF2E88', '#FFFFFF'], lifeMin: 0.1, lifeMax: 0.25 });
  }

  update(dt, scene) {
    this.t += dt;
    const o = this.owner;
    if (this.reflected) {
      // Vuelve a quien la disparó, persiguiéndolo
      if (!o || o.dead || !o.returnPoint) {
        this.pop(scene);
        return;
      }
      const p = o.returnPoint();
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vx = (dx / d) * STACK.RETURN_SPEED;
      this.vy = (dy / d) * STACK.RETURN_SPEED;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (R.chance(0.7)) scene.particles.spawn({ x: this.x, y: this.y, life: 0.2, colors: ['#43D9FF', '#FFFFFF'] });
      const hb = o.reflectBox ? o.reflectBox() : o.body;
      if (d < 8 || (hb && aabbOverlap(this.rect(), hb))) {
        this.dead = true;
        o.onReflectHit?.(scene, this);
      }
      if (this.t > 3) this.pop(scene);
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.t > this.life) this.dead = true;
    const m = scene.map;
    if (this.x < -20 || this.x > m.pxW + 20 || this.y < -40 || this.y > m.pxH + 20) {
      this.dead = true;
      return;
    }
    if (this.solid && m.isSolid(Math.floor(this.x / TS), Math.floor(this.y / TS))) {
      this.pop(scene);
      return;
    }
    const c = scene.choco;
    if (c.alive && c.state === 'play' && aabbOverlap(this.rect(), c.body)) {
      const res = c.hurt(this.x - this.vx * 0.05, { projectile: this });
      if (res === 'parry' && this.reflected) return;
      if (res) this.pop(scene);
    }
  }

  draw(ctx, camX, camY) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - camY);
    if (this.reflected) {
      ctx.fillStyle = '#FFFFFF';
      disc(ctx, x, y, this.r + 1);
      ctx.fillStyle = '#43D9FF';
      disc(ctx, x, y, this.r);
      return;
    }
    if (this.reflectable) {
      ctx.fillStyle = Math.floor(this.t * 12) % 2 ? '#FFFFFF' : '#F4F1EA';
      disc(ctx, x, y, this.r + 1);
      ctx.fillStyle = '#FF2E88';
      disc(ctx, x, y, this.r);
      return;
    }
    ctx.fillStyle = '#5A0A1E';
    disc(ctx, x, y, this.r + 1);
    ctx.fillStyle = Math.floor(this.t * 10) % 2 ? '#FF5A5A' : '#E0343F';
    disc(ctx, x, y, this.r);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y - 1, 1, 1);
  }
}

// ---------- Torreta de Excepciones (pared) con su candado ----------
export class WallTurret {
  // x, y: centro del tile donde va montada. dir: hacia dónde apunta. lock: { x0, x1, y0, y1 } en tiles
  constructor(x, y, dir, lock = null) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.lock = lock;
    this.body = { x: x - 8, y: y - 8, w: 16, h: 16 };
    this.cool = STACK.TURRET_INTERVAL * 0.6;
    this.t = 0;
    this.dead = false;
    this.broken = false;
    this.reflects = true; // los disparos del báculo rebotan: solo su propia bala la rompe
    this.harmful = false;
    this.shootable = false;
    this.stompable = false;
  }

  get active() {
    return !this.broken;
  }

  get warn() {
    return this.cool <= STACK.TURRET_TELEGRAPH ? 1 - this.cool / STACK.TURRET_TELEGRAPH : 0;
  }

  returnPoint() {
    return { x: this.x, y: this.y };
  }

  update(dt, scene) {
    this.t += dt;
    if (this.broken) return;
    const c = scene.choco;
    const dist = Math.hypot(c.cx - this.x, c.cy - this.y);
    const inFront = (c.cx - this.x) * this.dir > 0;
    if (dist > STACK.TURRET_RANGE || !inFront || !c.alive) {
      this.cool = Math.max(this.cool, STACK.TURRET_TELEGRAPH + 0.2);
      return;
    }
    const before = this.cool;
    this.cool -= dt;
    if (before > STACK.TURRET_TELEGRAPH && this.cool <= STACK.TURRET_TELEGRAPH) playSfx(scene.game.audio, 'turretCharge');
    if (this.cool <= 0) {
      this.cool = STACK.TURRET_INTERVAL;
      const mx = this.x + this.dir * 11;
      const dx = c.cx - mx;
      const dy = c.cy - this.y;
      const d = Math.hypot(dx, dy) || 1;
      scene.hazards.push(new Bullet(mx, this.y, (dx / d) * STACK.TURRET_SPEED, (dy / d) * STACK.TURRET_SPEED, { reflectable: true, owner: this }));
      playSfx(scene.game.audio, 'exception');
    }
  }

  // Su propia bala devuelta la rompe y abre el candado
  onReflectHit(scene) {
    if (this.broken) return;
    this.broken = true;
    playSfx(scene.game.audio, 'enemyDie');
    scene.game.effects.shake(0.4);
    scene.game.effects.hitstop(5);
    scene.particles.burst(this.x, this.y, 22, { speedMin: 40, speedMax: 130, colors: SHARDS, gravity: 260, lifeMin: 0.3, lifeMax: 0.8, size: 2, endSize: 1 });
    scene.onTurretBroken?.(this);
  }

  // Un disparo del báculo rebota con "tink"
  onReflect() {}

  draw(ctx, camX, camY) {
    drawTurret(ctx, this.x - camX, this.y - camY, this.dir, this.t, this.warn, this.broken);
  }
}

// ---------- Fragmento de N.U.L.L. ----------
export class Fragment {
  // opts: { awake (empieza apuntando), life }
  constructor(x, y, opts = {}) {
    const F = STACK.FRAGMENT;
    this.ox = x;
    this.oy = y;
    this.body = { x: x - F.W / 2, y: y - F.H / 2, w: F.W, h: F.H };
    this.state = opts.awake ? 'aim' : 'idle';
    this.stateT = 0;
    this.t = R.range(0, 3);
    this.hp = F.HP;
    this.dead = false;
    this.stompable = true;
    this.shootable = true;
    this.vx = 0;
    this.vy = 0;
    this.look = 0;
    this.life = opts.life ?? Infinity;
    this.flashT = 0;
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

  set(s) {
    this.state = s;
    this.stateT = 0;
  }

  update(dt, scene) {
    const F = STACK.FRAGMENT;
    this.t += dt;
    this.stateT += dt;
    this.life -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.life <= 0) {
      this.explode(scene, false);
      return;
    }
    const c = scene.choco;
    const b = this.body;
    const dx = c.cx - this.cx;
    const dy = c.cy - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    this.look = Math.max(-1, Math.min(1, dx / 40));
    if (this.state === 'idle') {
      b.y = this.oy - F.H / 2 + Math.sin(this.t * 3) * 2;
      if (d < F.RANGE && c.alive) {
        this.set('aim');
        playSfx(scene.game.audio, 'fragmentAim');
      }
    } else if (this.state === 'aim') {
      // Telegrafiado: parpadea y fija el objetivo al terminar
      if (this.stateT >= F.TELEGRAPH) {
        this.vx = (dx / d) * F.SPEED;
        this.vy = (dy / d) * F.SPEED;
        this.set('dash');
        playSfx(scene.game.audio, 'dive');
      }
    } else if (this.state === 'dash') {
      b.x += this.vx * dt;
      b.y += this.vy * dt;
      if (R.chance(0.6)) scene.particles.spawn({ x: this.cx, y: this.cy, life: 0.25, colors: ['#FF2E88', '#8C1D52'] });
      if (this.stateT >= F.DASH) this.set('rest');
    } else if (this.state === 'rest') {
      if (this.stateT >= F.REST) this.set(d < F.RANGE * 1.4 ? 'aim' : 'idle');
      if (this.state === 'idle') this.oy = this.cy;
    }
    // No se va del mapa
    b.x = Math.max(TS * 2, Math.min(scene.map.pxW - TS * 2 - b.w, b.x));
  }

  damage(amount, scene) {
    this.hp -= amount;
    this.flashT = 0.08;
    if (this.hp <= 0) this.explode(scene, true);
    return true;
  }

  stomp(scene) {
    this.explode(scene, true);
  }

  explode(scene, byChoco) {
    if (this.dead) return;
    this.dead = true;
    playSfx(scene.game.audio, byChoco ? 'enemyDie' : 'glitch');
    scene.particles.burst(this.cx, this.cy, 12, { speedMin: 30, speedMax: 100, colors: SHARDS, lifeMin: 0.2, lifeMax: 0.5 });
    if (byChoco) scene.addBits?.(1, this.cx, this.cy);
  }

  draw(ctx, camX, camY) {
    drawFragment(ctx, this.cx - camX, this.cy - camY, this.t, this.state, this.look);
    if (this.flashT > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(this.body.x - camX), Math.round(this.body.y - camY), this.body.w, this.body.h);
    }
  }
}

// ---------- Plataforma del Push ----------
// Se desliza desde la pared y, al llegar, se escribe en el mapa como marco de un sentido.
export class PushFrame {
  constructor(def, index) {
    this.def = def;
    this.index = index;
    this.state = 'hidden'; // hidden | wait | slide | set
    this.t = 0;
    this.k = 0;
    this.front = false;
  }

  arm(delay = STACK.PUSH_DELAY) {
    if (this.state !== 'hidden') return;
    this.state = 'wait';
    this.t = -delay;
  }

  update(dt, scene) {
    this.t += dt;
    if (this.state === 'wait' && this.t >= 0) {
      this.state = 'slide';
      this.t = 0;
      playSfx(scene.game.audio, 'push');
    }
    if (this.state === 'slide') {
      this.k = Math.min(1, this.t / STACK.PUSH_SLIDE);
      if (this.k >= 1) {
        this.state = 'set';
        const d = this.def;
        for (let x = d.x0; x <= d.x1; x++) scene.map.setChar(x, d.row, '=');
        playSfx(scene.game.audio, 'land');
        scene.particles.burst(((d.x0 + d.x1 + 1) / 2) * TS, d.row * TS, 10, { speedMin: 20, speedMax: 60, colors: ['#43D9FF', '#FFFFFF', '#2A1446'], lifeMin: 0.2, lifeMax: 0.4 });
      }
    }
  }

  // Ya escrita en el mapa: se dibuja con los tiles
  draw(ctx, camX, camY) {
    if (this.state !== 'slide') return;
    const d = this.def;
    const w = (d.x1 - d.x0 + 1) * TS;
    const ease = 1 - Math.pow(1 - this.k, 3);
    const tx = d.x0 * TS;
    const sx = d.from < 0 ? 2 * TS - w : (SCREEN.W / TS - 2) * TS;
    const x = sx + (tx - sx) * ease;
    drawPushFrame(ctx, x - camX, d.row * TS - camY, w, this.k, this.t, `push(${this.index})`);
  }
}

// ---------- Segmento corrupto ----------
export class Segment {
  constructor(x, y, wTiles) {
    this.plat = { x, y, w: wTiles * TS, h: 8, dx: 0, dy: 0, active: true };
    this.state = 'idle';
    this.stateT = 0;
    this.t = 0;
    this.registered = false;
    this.fade = 1;
  }

  update(dt, scene) {
    if (!this.registered) {
      scene.map.platforms.push(this.plat);
      this.registered = true;
    }
    this.t += dt;
    this.stateT += dt;
    const c = scene.choco;
    if (this.state === 'idle') {
      this.fade = Math.min(1, this.fade + dt * 3);
      if (c.body.platform === this.plat) {
        this.state = 'shake';
        this.stateT = 0;
        playSfx(scene.game.audio, 'segment');
      }
    } else if (this.state === 'shake' && this.stateT >= STACK.SEGMENT_DELAY) {
      this.state = 'gone';
      this.stateT = 0;
      this.plat.active = false;
      scene.particles.burst(this.plat.x + this.plat.w / 2, this.plat.y + 3, 14, { speedMin: 20, speedMax: 70, colors: SHARDS, lifeMin: 0.2, lifeMax: 0.5, gravity: 120 });
    } else if (this.state === 'gone' && this.stateT >= STACK.SEGMENT_RESPAWN) {
      this.state = 'idle';
      this.stateT = 0;
      this.plat.active = true;
      this.fade = 0;
    }
  }

  draw(ctx, camX, camY) {
    drawSegment(ctx, this.plat.x - camX, this.plat.y - camY, this.plat.w, this.state, this.t, this.fade);
  }
}

// ---------- Capa de fuego del Firewall ----------
// Sin el escudo, empuja a Choco de vuelta por donde vino (y duele si no está invencible): no se
// puede cruzar aprovechando la invencibilidad. Con el escudo activo se pasa a través.
export class Firewall {
  constructor(x0, x1, row) {
    this.rect = { x: x0 * TS, y: row * TS + 2, w: (x1 - x0 + 1) * TS, h: TS - 4 };
    this.t = 0;
    this.passing = 0;
    this.sparkT = 0;
  }

  update(dt, scene) {
    this.t += dt;
    if (this.passing > 0) this.passing -= dt;
    const c = scene.choco;
    if (!c.alive || c.state !== 'play' || !aabbOverlap(c.body, this.rect)) return;
    if (shieldOn(c.shield)) {
      this.passing = 0.2;
      this.sparkT -= dt;
      if (this.sparkT <= 0) {
        this.sparkT = 0.12;
        playSfx(scene.game.audio, 'firewallPass');
        scene.particles.burst(c.cx, c.cy, 4, { speedMin: 20, speedMax: 60, colors: ['#FF8A3D', '#FFD23F', '#43D9FF'], lifeMin: 0.1, lifeMax: 0.3 });
      }
      return;
    }
    // Empujón hacia el lado de donde venía
    const b = c.body;
    const fromBelow = b.y + b.h / 2 > this.rect.y + this.rect.h / 2;
    if (fromBelow) {
      b.y = this.rect.y + this.rect.h;
      b.vy = STACK.FIREWALL_KNOCKBACK * 0.6;
    } else {
      b.y = this.rect.y - b.h;
      b.vy = -STACK.FIREWALL_KNOCKBACK;
    }
    if (c.lasso) c.detachLasso(false);
    playSfx(scene.game.audio, 'firewallBurn');
    scene.particles.burst(c.cx, fromBelow ? b.y : b.y + b.h, 8, { speedMin: 30, speedMax: 80, colors: ['#FF2E88', '#FF8A3D', '#FFD23F'], lifeMin: 0.15, lifeMax: 0.35 });
    if (c.invuln <= 0) c.hurt(c.cx, { ignoreShield: true, knockback: false });
  }

  draw(ctx, camX, camY) {
    const r = this.rect;
    if (r.y + r.h < camY - 8 || r.y > camY + SCREEN.H + 8) return;
    drawFirewall(ctx, r.x - camX, r.y - camY - 2, r.w, r.h + 4, this.t, { passing: this.passing > 0 });
  }
}

// ---------- Excepción desde el borde de la pantalla ----------
// Aviso parpadeante en el borde durante EXCEPTION_WARN; después cruza una bala recta.
export class ExceptionWarn {
  constructor(side, y) {
    this.side = side; // -1 izquierda, 1 derecha (de donde sale)
    this.y = y;
    this.t = 0;
    this.dead = false;
    this.front = true;
  }

  update(dt, scene) {
    this.t += dt;
    if (this.t >= STACK.EXCEPTION_WARN) {
      this.dead = true;
      const cam = scene.camera;
      const x = this.side < 0 ? cam.x - 6 : cam.x + SCREEN.W + 6;
      scene.hazards.push(new Bullet(x, this.y, -this.side * STACK.EXCEPTION_SPEED, 0, { solid: false, life: 4, size: 4 }));
      playSfx(scene.game.audio, 'exception');
    }
  }

  draw(ctx, camX, camY) {
    if (Math.floor(this.t * 10) % 2) return;
    const x = this.side < 0 ? 2 : SCREEN.W - 12;
    const y = Math.round(this.y - camY) - 5;
    ctx.fillStyle = '#5A0A1E';
    ctx.fillRect(x, y, 10, 10);
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(x, y, 10, 1);
    ctx.fillRect(x, y + 9, 10, 1);
    drawText(ctx, '!', x + 5, y + 2, { align: 'center', color: '#FFFFFF', shadow: false });
    // Línea fina por donde va a cruzar
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(0, y + 5, SCREEN.W, 1);
    ctx.globalAlpha = 1;
  }
}

