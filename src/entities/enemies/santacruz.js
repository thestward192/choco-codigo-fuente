// Enemigos de Santa Cruz — docs/02_personajes.md y docs/niveles/nivel_4_santa_cruz.md
// Todos avisan antes de atacar:
// - Toro glitch: raspa el piso 0.8 s y embiste en línea recta. Se salta por encima (su lomo
//   sirve de rebote, los cuernos duelen). 4 disparos.
// - Bombetero corrupto: enciende la mecha 0.6 s y lanza una bombeta en parábola; donde va a caer
//   aparece una marca. El escudo la bloquea; el parry se la devuelve y lo destruye. 2 disparos.
// - Sabanero glitch: gira el lazo sobre la cabeza y lo lanza; si atrapa a Choco lo jala hacia él
//   (hacia el pozo). Disparar a la cuerda la corta. 3 disparos.
// - Zanate: bandadas de 3–5; cada uno grazna y levanta las alas antes de lanzarse en picada.
// - Tamal explosivo: una olla tiembla y suelta un tamal que rueda cuesta abajo; hay que saltarlo.
import { ENEMIES, SCREEN, PLATFORMER, EFFECTS } from '../../config/balance.js';
import { createBody, moveX, moveY, aabbOverlap, isStomp } from '../../systems/physics.js';
import { Walker } from './walker.js';
import { scEnemySprite, TORO_COLORS, PERSON_COLORS, ZANATE_COLORS } from '../../art/enemies/santacruz.js';
import { playSfx } from '../../audio/sfx.js';
import { shieldBlock } from '../../systems/shield.js';
import { disc } from '../../core/lighting.js';
import { fxRng } from '../../core/rng.js';

const R = fxRng;
const TS = SCREEN.TILE;

// Explosión en área (bombetas, tamales): partículas, sonido y daño a Choco si lo alcanza
export function blast(scene, x, y, radius, { harmChoco = true, source = null } = {}) {
  const g = scene.game;
  playSfx(g.audio, 'bombetaBoom');
  g.effects.shake(0.3);
  scene.particles.burst(x, y, 20, { speedMin: 40, speedMax: 140, colors: ['#FFFFFF', '#FFD23F', '#FF8A3D', '#E0343F'], lifeMin: 0.2, lifeMax: 0.5, size: 2, endSize: 1 });
  // Las bombetas explotan "en código": llaves y píxeles cian y magenta
  scene.particles.burst(x, y, 10, { speedMin: 20, speedMax: 80, colors: ['#43D9FF', '#FF2E88'], lifeMin: 0.3, lifeMax: 0.7, gravity: 120 });
  scene.blasts?.push({ x, y, r: radius, t: 0 });
  if (!harmChoco) return null;
  const c = scene.choco;
  if (!c.alive) return null;
  if (Math.hypot(c.cx - x, c.cy - y) < radius + 6) return c.hurt(source ?? x, {});
  return null;
}

// ---------- Bombeta: proyectil en parábola ----------
export class Bombeta {
  // De (x, y) a (tx, ty) en `flight` segundos. owner: quien la lanzó (para devolvérsela)
  constructor(x, y, tx, ty, flight, owner = null, { sky = false } = {}) {
    const B = ENEMIES.BOMBETA;
    this.x = x;
    this.y = y;
    this.g = B.GRAVITY;
    this.launch(tx, ty, flight);
    this.owner = owner;
    this.target = { x: tx, y: ty };
    this.t = 0;
    this.dead = false;
    this.reflected = false;
    this.sky = sky; // cae del cielo (redondel): al devolverla sube y explota arriba
    this.spin = 0;
  }

  launch(tx, ty, T) {
    this.vx = (tx - this.x) / T;
    this.vy = (ty - this.y - 0.5 * this.g * T * T) / T;
    this.flight = T;
  }

  get w() {
    return 8;
  }
  get h() {
    return 8;
  }
  get cx() {
    return this.x;
  }
  get cy() {
    return this.y;
  }

  // Parry: vuelve hacia quien la lanzó
  reflect(scene) {
    if (this.reflected) return;
    this.reflected = true;
    this.t = 0;
    playSfx(scene.game.audio, 'reflect');
    const o = this.owner;
    if (o && !o.dead && o.returnPoint) {
      const p = o.returnPoint();
      this.launch(p.x, p.y, 0.7);
      this.target = p;
    } else {
      this.vx = -this.vx * 0.5;
      this.vy = -260;
      this.target = null;
    }
  }

  update(dt, scene) {
    this.t += dt;
    this.spin += dt * 12;
    this.vy += this.g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Chispas de la mecha y silbido
    if (R.chance(0.7)) scene.particles.spawn({ x: this.x + R.range(-1, 1), y: this.y - 4, vx: R.range(-15, 15), vy: R.range(-30, 0), life: 0.2, colors: ['#FFD23F', '#FF8A3D', '#FFFFFF'] });
    const c = scene.choco;
    if (this.reflected) {
      const o = this.owner;
      if (o && !o.dead && o.body && aabbOverlap(this.rect(), o.hurtbox || o.body)) {
        this.dead = true;
        blast(scene, this.x, this.y, ENEMIES.BOMBETA.BLAST_R, { harmChoco: false });
        o.onBombetaReturn?.(scene, this);
        return;
      }
      if (!this.target && this.t > 0.6) {
        this.dead = true;
        blast(scene, this.x, this.y, 10, { harmChoco: false });
        return;
      }
    } else if (c.alive && c.state === 'play' && aabbOverlap(this.rect(), c.body)) {
      // Golpe directo: el escudo bloquea (y la explosión no daña); el parry la devuelve
      const res = c.hurt(this.x, { projectile: this });
      if (res === 'parry') return;
      this.dead = true;
      blast(scene, this.x, this.y, ENEMIES.BOMBETA.BLAST_R, { harmChoco: false });
      return;
    }
    // Choca con el suelo o una pared (los banderines son tela: los atraviesa). Mientras sigue más
    // arriba del techo de quien la lanzó no choca, para no reventar en su propio alero.
    const tx = Math.floor(this.x / TS);
    const ty = Math.floor((this.y + 3) / TS);
    const m = scene.map;
    const armed = this.clearY === undefined || this.y > this.clearY;
    const hitOneWay = armed && this.vy > 0 && m.isOneWay(tx, ty) && m.charAt(tx, ty) !== 'f' && (this.y + 3) % TS < 6;
    if ((armed && m.isSolid(tx, ty)) || hitOneWay || this.y > m.pxH + 16) {
      this.dead = true;
      blast(scene, this.x, this.y, ENEMIES.BOMBETA.BLAST_R, { harmChoco: !this.reflected });
    }
  }

  rect() {
    return { x: this.x - 4, y: this.y - 4, w: 8, h: 8 };
  }

  draw(ctx, camX, camY, scene) {
    // Marca en el suelo donde va a caer (telegrafiado)
    if (!this.reflected && this.target && this.flight - this.t < ENEMIES.BOMBETA.MARK_TIME + 0.4) {
      const mx = Math.round(this.target.x - camX);
      const my = Math.round(this.target.y - camY);
      const blink = Math.floor(this.t * 12) % 2;
      ctx.fillStyle = blink ? '#E0343F' : '#FFD23F';
      const rr = ENEMIES.BOMBETA.BLAST_R;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(mx - rr, my - 1, rr * 2, 1);
      ctx.fillRect(mx - 1, my - 4, 3, 3);
      ctx.fillRect(mx - rr, my - 3, 1, 2);
      ctx.fillRect(mx + rr - 1, my - 3, 1, 2);
      ctx.globalAlpha = 1;
    }
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - camY);
    ctx.fillStyle = '#1A0E0A';
    disc(ctx, x, y, 4);
    ctx.fillStyle = this.reflected ? '#43D9FF' : '#3A3A4E';
    disc(ctx, x, y, 3);
    ctx.fillStyle = '#8A8AA0';
    ctx.fillRect(x - 2, y - 2, 1, 1);
    // Mecha que gira
    const a = this.spin;
    ctx.fillStyle = '#C8A06A';
    ctx.fillRect(Math.round(x + Math.cos(a) * 4), Math.round(y + Math.sin(a) * 4), 1, 1);
    ctx.fillStyle = Math.floor(this.t * 20) % 2 ? '#FFFFFF' : '#FFD23F';
    ctx.fillRect(Math.round(x + Math.cos(a) * 5), Math.round(y + Math.sin(a) * 5), 1, 1);
  }
}

// ---------- Toro glitch ----------
export class Toro extends Walker {
  // opts: { dir, arena: true (redondel: siempre ve a Choco y entra corriendo) }
  constructor(x, footY, opts = {}) {
    const C = ENEMIES.TORO;
    super(x, footY, C.W, C.H, { dir: opts.dir ?? -1, speed: C.WALK_SPEED, turnAtEdges: true });
    this.hp = C.HP;
    this.state = opts.arena ? 'enter' : 'walk';
    this.arena = !!opts.arena;
    this.colors = TORO_COLORS;
    this.stompable = false;
    this.shootable = true;
    this.charged = 0;
    this.awake = !!opts.arena;
  }

  get active() {
    return !this.dead;
  }

  set(state) {
    this.state = state;
    this.stateT = 0;
  }

  sees(c) {
    const C = ENEMIES.TORO;
    if (!c.alive) return false;
    const dx = c.cx - this.cx;
    if (Math.abs(c.footY - (this.body.y + this.body.h)) > C.SIGHT_Y) return false;
    if (this.arena) return true;
    return Math.abs(dx) < C.SIGHT_X && Math.sign(dx) === this.dir;
  }

  update(dt, scene) {
    this.relax(dt);
    if (!this.checkAwake(scene)) return;
    const C = ENEMIES.TORO;
    const c = scene.choco;
    const b = this.body;
    switch (this.state) {
      case 'enter':
        // Entra al redondel trotando y luego busca a Choco
        this.walk(dt, scene, C.WALK_SPEED * 2.5, false);
        if (this.stateT > 0.7) this.set('walk');
        break;
      case 'walk':
        this.walk(dt, scene);
        if (this.sees(c) || (this.arena && this.stateT > 0.6)) {
          this.dir = Math.sign(c.cx - this.cx) || this.dir;
          this.set('scrape');
          playSfx(scene.game.audio, 'scrape');
        }
        break;
      case 'scrape':
        this.walk(dt, scene, 0);
        if (R.chance(0.5)) scene.particles.spawn({ x: this.cx - this.dir * 10, y: b.y + b.h - 1, vx: -this.dir * R.range(30, 70), vy: R.range(-50, -10), gravity: 200, life: 0.4, colors: ['#B85E36', '#9C4A2A', '#E6D488'] });
        if (this.stateT > C.SCRAPE) {
          this.set('charge');
          this.charged = 0;
          playSfx(scene.game.audio, 'toroCharge');
        }
        break;
      case 'charge': {
        // No se tira por los bordes: frena al llegar
        const aheadX = this.dir > 0 ? b.x + b.w + 2 : b.x - 2;
        const edge = b.onGround && !scene.map.isSolid(Math.floor(aheadX / TS), Math.floor((b.y + b.h + 1) / TS)) && !scene.map.isOneWay(Math.floor(aheadX / TS), Math.floor((b.y + b.h + 1) / TS));
        const hit = edge || this.walk(dt, scene, C.CHARGE_SPEED, false);
        this.charged += C.CHARGE_SPEED * dt;
        if (R.chance(0.5)) scene.particles.spawn({ x: this.cx - this.dir * 12, y: b.y + b.h - 1, vx: -this.dir * 30, vy: -15, life: 0.3, colors: ['#B85E36', '#E6D488'] });
        if (hit || this.charged > C.CHARGE_MAX) {
          if (hit && !edge) {
            scene.game.effects.shake(0.15);
            playSfx(scene.game.audio, 'wallHit');
          }
          this.set('recover');
        }
        break;
      }
      case 'recover':
        this.walk(dt, scene, 0);
        if (this.stateT > C.RECOVER) {
          this.dir = Math.sign(c.cx - this.cx) || this.dir;
          this.set('walk');
        }
        break;
    }
  }

  // Lomo: rebota sin daño. Cuernos y costados: duele.
  contact(scene, c, inp) {
    if (isStomp(c.body, this.body, c.body.vy)) {
      c.stomp(inp);
      this.sy = 0.8;
      this.sx = 1.15;
      playSfx(scene.game.audio, 'stomp');
      return;
    }
    const res = c.hurt(this.cx);
    if (res === 'block' || res === 'parry') {
      if (this.state === 'charge') this.set('recover');
    }
  }

  damage(amount, scene, fromDir = 0) {
    this.hp -= amount;
    this.flashT = 0.08;
    this.sx = 1.15;
    this.sy = 0.9;
    playSfx(scene.game.audio, 'enemyHit');
    if (this.hp <= 0) {
      this.explode(scene, fromDir, 3);
      scene.onEnemyKilled?.(this);
      return true;
    }
    return false;
  }

  draw(ctx, camX, camY) {
    let pose = Math.floor(this.t * 6) % 2 ? 'walk1' : 'walk2';
    if (this.state === 'scrape') pose = Math.floor(this.t * 10) % 2 ? 'scrape' : 'walk1';
    else if (this.state === 'charge') pose = Math.floor(this.t * 14) % 2 ? 'charge1' : 'charge2';
    else if (this.state === 'recover') pose = 'walk1';
    const spr = scEnemySprite('toro', pose);
    const b = this.body;
    const footX = Math.round(b.x + b.w / 2 - camX);
    const footY = Math.round(b.y + b.h - camY);
    const dw = Math.round(32 * this.sx);
    const dh = Math.round(24 * this.sy);
    let ox = 0;
    if (this.state === 'scrape') ox = Math.floor(this.t * 30) % 2 ? 1 : -1;
    ctx.drawImage(spr.get(this.dir < 0, this.flashT > 0), footX - Math.round(dw / 2) + ox, footY - dh, dw, dh);
    // Ojos que brillan rojos al raspar (telegrafiado)
    if (this.state === 'scrape' && Math.floor(this.t * 12) % 2) {
      const ex = footX + this.dir * 11;
      ctx.fillStyle = '#FF2E88';
      ctx.fillRect(ex - 2, footY - 17, 5, 1);
      ctx.fillRect(ex, footY - 19, 1, 5);
    }
  }
}

// ---------- Bombetero corrupto ----------
export class Bombetero extends Walker {
  constructor(x, footY, opts = {}) {
    const C = ENEMIES.BOMBETERO;
    super(x, footY, C.W, C.H, { dir: opts.dir ?? -1, speed: 0, turnAtEdges: true });
    this.hp = C.HP;
    this.state = 'idle';
    this.colors = PERSON_COLORS;
    this.stompable = true;
    this.shootable = true;
    this.cool = R.range(0.5, 1.5);
  }

  get active() {
    return !this.dead;
  }

  returnPoint() {
    return { x: this.cx, y: this.body.y + 6 };
  }

  update(dt, scene) {
    this.relax(dt);
    this.walk(dt, scene, 0);
    const C = ENEMIES.BOMBETERO;
    const c = scene.choco;
    const b = this.body;
    this.dir = Math.sign(c.cx - this.cx) || this.dir;
    const inRange = c.alive && Math.abs(c.cx - this.cx) < C.RANGE && scene.camera.isVisible(b.x, b.y, b.w, b.h, 0);
    if (this.state === 'idle') {
      this.cool -= dt;
      if (this.cool <= 0 && inRange && c.state === 'play') {
        this.state = 'aim';
        this.stateT = 0;
        playSfx(scene.game.audio, 'fuse');
      }
    } else if (this.state === 'aim') {
      if (R.chance(0.6)) scene.particles.spawn({ x: this.cx + this.dir * 7, y: b.y + 2, vx: R.range(-20, 20), vy: R.range(-40, -10), life: 0.25, colors: ['#FFD23F', '#FF8A3D', '#FFFFFF'] });
      if (this.stateT > C.TELEGRAPH) {
        const sx = this.cx + this.dir * 6;
        const sy = b.y;
        const ty = scene.groundBelow ? scene.groundBelow(c.footX, c.footY - 4) : c.footY;
        const bomb = new Bombeta(sx, sy, c.footX, ty - 4, C.FLIGHT, this);
        bomb.clearY = b.y + b.h + TS + 2; // debajo del grosor del techo
        scene.hazards.push(bomb);
        playSfx(scene.game.audio, 'bombetaThrow');
        this.state = 'throw';
        this.stateT = 0;
      }
    } else if (this.state === 'throw' && this.stateT > 0.35) {
      this.state = 'idle';
      this.cool = C.INTERVAL;
    }
  }

  onBombetaReturn(scene) {
    this.damage(99, scene, 0);
  }

  stomp(scene) {
    this.damage(99, scene, 0);
  }

  damage(amount, scene, fromDir = 0) {
    this.hp -= amount;
    this.flashT = 0.08;
    playSfx(scene.game.audio, 'enemyHit');
    if (this.hp <= 0) {
      this.explode(scene, fromDir, 3);
      return true;
    }
    return false;
  }

  draw(ctx, camX, camY) {
    const pose = this.state === 'aim' ? 'aim' : this.state === 'throw' ? 'throw' : 'idle';
    this.drawSprite(ctx, scEnemySprite('bombetero', pose), camX, camY, this.dir < 0, 0);
  }

  drawSprite(ctx, spr, camX, camY, flip) {
    const b = this.body;
    const footX = Math.round(b.x + b.w / 2 - camX);
    const footY = Math.round(b.y + b.h - camY);
    const dw = Math.round(16 * this.sx);
    const dh = Math.round(24 * this.sy);
    ctx.drawImage(spr.get(flip, this.flashT > 0), footX - Math.round(dw / 2), footY - dh, dw, dh);
  }
}

// ---------- Sabanero glitch ----------
export class Sabanero extends Bombetero {
  constructor(x, footY, opts = {}) {
    super(x, footY, opts);
    const C = ENEMIES.SABANERO;
    this.body.w = C.W;
    this.body.h = C.H;
    this.body.y = footY - C.H;
    this.hp = C.HP;
    this.rope = null; // { x, y, len, caught }
    this.cool = 0.4;
  }

  hand() {
    return { x: this.cx + this.dir * 6, y: this.body.y + 8 };
  }

  update(dt, scene) {
    this.relax(dt);
    this.walk(dt, scene, 0);
    const C = ENEMIES.SABANERO;
    const c = scene.choco;
    const audio = scene.game.audio;
    if (this.state === 'idle') {
      this.dir = Math.sign(c.cx - this.cx) || this.dir;
      this.cool -= dt;
      const near = c.alive && c.state === 'play' && Math.abs(c.cx - this.cx) < C.RANGE && Math.abs(c.footY - (this.body.y + this.body.h)) < 40;
      if (this.cool <= 0 && near) {
        this.state = 'swing';
        this.stateT = 0;
        playSfx(audio, 'lassoSwing');
      }
    } else if (this.state === 'swing') {
      if (this.stateT > C.TELEGRAPH) {
        const h = this.hand();
        this.rope = { x: h.x, y: h.y, len: 0, caught: false };
        this.state = 'throw';
        this.stateT = 0;
        playSfx(audio, 'lassoThrow');
      }
    } else if (this.state === 'throw') {
      const r = this.rope;
      r.len += C.ROPE_SPEED * dt;
      const h = this.hand();
      r.x = h.x + this.dir * r.len;
      r.y = h.y + 2;
      if (c.alive && c.state === 'play' && aabbOverlap({ x: r.x - 3, y: r.y - 3, w: 6, h: 6 }, c.body)) {
        // Con el escudo, el lazo rebota; si no, lo atrapa (sin quitarle vida: el peligro es el pozo)
        if (shieldBlock(c.shield)) this.cut(scene, false);
        else {
          r.caught = true;
          c.tether = { x: this.cx, speed: C.PULL_SPEED };
          this.state = 'pull';
          this.stateT = 0;
          playSfx(audio, 'lassoHook');
        }
      } else if (r.len > C.ROPE_RANGE) this.retract();
      this.checkCut(scene);
    } else if (this.state === 'pull') {
      const r = this.rope;
      r.x = c.footX;
      r.y = c.footY - 12;
      if (!c.tether || !c.alive) this.retract();
      else {
        c.tether.x = this.cx;
        if (Math.abs(c.cx - this.cx) < 12 || this.stateT > C.PULL_MAX) {
          c.tether = null;
          if (Math.abs(c.cx - this.cx) < 12) c.hurt(this.cx);
          this.retract();
        }
      }
      this.checkCut(scene);
    } else if (this.state === 'cooldown') {
      if (this.stateT > C.COOLDOWN) {
        this.state = 'idle';
        this.cool = 0.3;
      }
    }
  }

  retract() {
    this.rope = null;
    this.state = 'cooldown';
    this.stateT = 0;
  }

  // Un disparo que cruza la cuerda la corta
  checkCut(scene) {
    const r = this.rope;
    if (!r) return;
    const h = this.hand();
    for (const s of scene.shots) {
      if (s.dead) continue;
      const box = { x: s.x - 2, y: s.y - 2, w: s.w + 4, h: s.h + 4 };
      const n = Math.max(2, Math.ceil(Math.hypot(r.x - h.x, r.y - h.y) / 3));
      for (let i = 0; i <= n; i++) {
        const px = h.x + ((r.x - h.x) * i) / n;
        const py = h.y + ((r.y - h.y) * i) / n;
        if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) {
          s.kill(scene, false);
          this.cut(scene, true);
          return;
        }
      }
    }
  }

  cut(scene, shot) {
    const r = this.rope;
    if (r) scene.particles.burst(r.x, r.y, 8, { speedMin: 20, speedMax: 60, colors: ['#F4F1EA', '#C8BCA8'], lifeMin: 0.2, lifeMax: 0.4, gravity: 200 });
    if (scene.choco.tether) scene.choco.tether = null;
    playSfx(scene.game.audio, shot ? 'ropeCut' : 'shieldBlock');
    this.retract();
  }

  damage(amount, scene, fromDir = 0) {
    if (this.rope) this.cut(scene, false);
    return super.damage(amount, scene, fromDir);
  }

  explode(scene, fromDir, bits) {
    if (scene.choco.tether) scene.choco.tether = null;
    super.explode(scene, fromDir, bits);
  }

  draw(ctx, camX, camY) {
    const pose = this.state === 'swing' ? 'swing' : this.state === 'throw' || this.state === 'pull' ? 'throw' : 'idle';
    this.drawSprite(ctx, scEnemySprite('sabanero', pose), camX, camY, this.dir < 0);
    const b = this.body;
    // Lazo girando sobre la cabeza (telegrafiado)
    if (this.state === 'swing') {
      const cx = Math.round(this.cx - camX + this.dir * 4);
      const cy = Math.round(b.y - camY - 4);
      const a0 = this.stateT * 16;
      ctx.fillStyle = '#F4F1EA';
      for (let i = 0; i < 16; i++) {
        const a = a0 + (i / 16) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 3), 1, 1);
      }
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(Math.round(cx + Math.cos(a0) * 9), Math.round(cy + Math.sin(a0) * 3), 2, 1);
    }
    const r = this.rope;
    if (r) {
      const h = this.hand();
      const x0 = h.x - camX;
      const y0 = h.y - camY;
      const x1 = r.x - camX;
      const y1 = r.y - camY;
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const sag = r.caught ? 0 : Math.sin(k * Math.PI) * 3;
        ctx.fillStyle = i % 3 ? '#F4F1EA' : '#C8BCA8';
        ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k + sag), 1, 1);
      }
      // Lazada
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(Math.round(x1) - 2, Math.round(y1) - 2, 5, 1);
      ctx.fillRect(Math.round(x1) - 2, Math.round(y1) + 2, 5, 1);
      ctx.fillRect(Math.round(x1) - 2, Math.round(y1) - 2, 1, 5);
      ctx.fillRect(Math.round(x1) + 2, Math.round(y1) - 2, 1, 5);
    }
  }
}

// ---------- Zanates: bandada que ataca en picada ----------
export class ZanateFlock {
  constructor() {
    this.awake = false;
    this.next = 0;
    this.members = [];
  }
}

export class Zanate {
  constructor(x, y, flock, i) {
    const C = ENEMIES.ZANATE;
    this.body = createBody(x - C.W / 2, y - C.H / 2, C.W, C.H);
    this.home = { x, y };
    this.flock = flock;
    flock.members.push(this);
    this.i = i;
    this.state = 'perch';
    this.stateT = 0;
    this.t = R.range(0, 2);
    this.hp = C.HP;
    this.dir = -1;
    this.flashT = 0;
    this.dead = false;
    this.shootable = true;
    this.stompable = true;
    this.vx = 0;
    this.vy = 0;
  }

  get active() {
    return !this.dead && this.state !== 'leave';
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
    const C = ENEMIES.ZANATE;
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    const c = scene.choco;
    const b = this.body;
    const f = this.flock;
    if (this.state === 'perch') {
      this.dir = Math.sign(c.cx - this.cx) || -1;
      if (!f.awake && c.alive && Math.abs(c.cx - this.home.x) < C.WAKE_X && scene.camera.isVisible(b.x, b.y, b.w, b.h, 0)) {
        f.awake = true;
        f.next = 0.3;
        playSfx(scene.game.audio, 'zanate');
      }
      if (f.awake) {
        // Revolotean sobre su sitio esperando turno
        b.x = this.home.x - b.w / 2 + Math.sin(this.t * 3 + this.i) * 8;
        b.y = this.home.y - b.h / 2 - 10 + Math.sin(this.t * 5 + this.i * 2) * 3;
        f.next -= dt / Math.max(1, f.members.filter((m) => m.state === 'perch' && !m.dead).length);
        if (f.next <= 0 && f.members.find((m) => m.state === 'perch' && !m.dead) === this && c.alive) {
          f.next = C.STAGGER * f.members.length;
          this.set('alert');
          playSfx(scene.game.audio, 'zanate');
        }
      }
    } else if (this.state === 'alert') {
      // Telegrafiado: grazna y abre las alas
      if (this.stateT > C.TELEGRAPH) {
        const dx = c.cx - this.cx;
        const dy = c.cy - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        this.vx = (dx / d) * C.DIVE_SPEED;
        this.vy = (dy / d) * C.DIVE_SPEED;
        this.dir = Math.sign(this.vx) || this.dir;
        this.set('dive');
        playSfx(scene.game.audio, 'dive');
      }
    } else if (this.state === 'dive') {
      b.x += this.vx * dt;
      b.y += this.vy * dt;
      const m = scene.map;
      if (m.isSolid(Math.floor(this.cx / TS), Math.floor((b.y + b.h) / TS)) || this.stateT > 2.2) this.leave();
    } else if (this.state === 'leave') {
      b.x += this.dir * 60 * dt;
      b.y -= 90 * dt;
      if (this.stateT > 2) this.dead = true;
    }
  }

  leave() {
    this.set('leave');
  }

  contact(scene, c, inp) {
    if (this.state === 'perch' && !this.flock.awake) return;
    if (isStomp(c.body, this.body, c.body.vy)) {
      c.stomp(inp);
      this.damage(1, scene, 0);
      return;
    }
    const res = c.hurt(this.cx, { projectile: this });
    if (res === 'block' || res === 'parry') this.damage(1, scene, -this.dir);
    else if (res) this.leave();
  }

  // Parry: el zanate sale rebotado y cae
  reflect() {}

  damage(amount, scene, fromDir = 0) {
    this.hp -= amount;
    if (this.hp > 0) return false;
    this.dead = true;
    playSfx(scene.game.audio, 'enemyDie');
    scene.game.effects.hitstop(EFFECTS.HITSTOP_ENEMY_DIE);
    scene.particles.burst(this.cx, this.cy, 14, { speedMin: 20, speedMax: 90, colors: ZANATE_COLORS, gravity: 200, lifeMin: 0.3, lifeMax: 0.7, vx: fromDir * 30 });
    // Plumitas que caen despacio
    for (let i = 0; i < 4; i++) scene.particles.spawn({ x: this.cx, y: this.cy, vx: R.range(-20, 20), vy: R.range(-30, 0), gravity: 40, drag: 2, life: 1.2, colors: ['#14141E', '#4A3A7A'] });
    scene.addBits?.(1, this.cx, this.cy);
    return true;
  }

  draw(ctx, camX, camY) {
    let pose = 'perch';
    if (this.state === 'perch' && this.flock.awake) pose = Math.floor(this.t * 12) % 2 ? 'flap1' : 'flap2';
    else if (this.state === 'alert') pose = Math.floor(this.t * 16) % 2 ? 'alert' : 'flap1';
    else if (this.state === 'dive') pose = 'dive';
    else if (this.state === 'leave') pose = Math.floor(this.t * 12) % 2 ? 'flap1' : 'flap2';
    const spr = scEnemySprite('zanate', pose);
    const b = this.body;
    const x = Math.round(this.cx - camX - 6);
    const y = Math.round(this.cy - camY - 5);
    // Picada: el sprite apunta hacia abajo a la derecha; se voltea según la dirección
    ctx.drawImage(spr.get(this.dir < 0, this.flashT > 0), x, y);
    if (this.state === 'alert' && Math.floor(this.t * 10) % 2) {
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x + 5, y - 6, 1, 3);
      ctx.fillRect(x + 5, y - 2, 1, 1);
    }
    void b;
  }
}

// ---------- Tamal explosivo ----------
export class Tamal {
  constructor(x, footY, dir) {
    const C = ENEMIES.TAMAL;
    this.body = createBody(x - C.R, footY - C.R * 2, C.R * 2, C.R * 2);
    this.dir = dir;
    this.t = 0;
    this.fuse = -1;
    this.dead = false;
    this.shootable = true;
    this.stompable = false;
    this.roll = 0;
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
    const C = ENEMIES.TAMAL;
    this.t += dt;
    const b = this.body;
    if (this.fuse >= 0) {
      this.fuse -= dt;
      if (this.fuse < 0) this.explode(scene);
      return;
    }
    if (this.t > C.LIFE) {
      this.dead = true;
      return;
    }
    b.vy = Math.min(b.vy + PLATFORMER.GRAVITY_DOWN * dt, PLATFORMER.MAX_FALL);
    moveX(b, this.dir * C.SPEED * dt, scene.map);
    this.roll += (this.dir * C.SPEED * dt) / C.R;
    if (b.hitWall) {
      this.fuse = C.FUSE;
      playSfx(scene.game.audio, 'fuse');
    }
    b.onGround = false;
    moveY(b, b.vy * dt, scene.map);
    if (b.y > scene.map.pxH + 32) this.dead = true;
  }

  explode(scene) {
    if (this.dead) return;
    this.dead = true;
    blast(scene, this.cx, this.cy, 16);
  }

  contact(scene) {
    this.explode(scene);
  }

  damage(_amount, scene) {
    this.explode(scene);
    return true;
  }

  draw(ctx, camX, camY) {
    const x = Math.round(this.cx - camX);
    const y = Math.round(this.cy - camY);
    const blink = this.fuse >= 0 && Math.floor(this.t * 20) % 2;
    // Hoja de plátano verde con su mecate
    ctx.fillStyle = '#1A2A10';
    disc(ctx, x, y, 6);
    ctx.fillStyle = blink ? '#FFFFFF' : '#4A7A2A';
    disc(ctx, x, y, 5);
    ctx.fillStyle = blink ? '#FFD23F' : '#6E8B3D';
    for (let i = 0; i < 2; i++) {
      const a = this.roll + i * Math.PI;
      ctx.fillRect(Math.round(x + Math.cos(a) * 3) - 1, Math.round(y + Math.sin(a) * 3) - 1, 2, 2);
    }
    ctx.fillStyle = '#E6D488';
    const a = this.roll;
    for (let k = -4; k <= 4; k++) ctx.fillRect(Math.round(x + Math.cos(a + Math.PI / 2) * k), Math.round(y + Math.sin(a + Math.PI / 2) * k), 1, 1);
  }
}

// La olla de los tamales: tiembla (aviso) y suelta uno cada tanto
export class TamalPot {
  constructor(x, footY, dir) {
    this.x = x;
    this.y = footY;
    this.dir = dir;
    this.t = R.range(0, 1);
    this.state = 'wait';
    this.stateT = 0;
    this.front = false;
  }

  update(dt, scene) {
    const C = ENEMIES.TAMAL;
    this.t += dt;
    this.stateT += dt;
    const visible = scene.camera.isVisible(this.x - 10, this.y - 20, 20, 20, 40);
    if (this.state === 'wait' && this.stateT > C.INTERVAL && visible) {
      this.state = 'warn';
      this.stateT = 0;
      playSfx(scene.game.audio, 'potRattle');
    } else if (this.state === 'warn' && this.stateT > C.WARN) {
      this.state = 'wait';
      this.stateT = 0;
      scene.enemies.push(new Tamal(this.x + this.dir * 10, this.y, this.dir));
    }
  }

  draw(ctx, camX, camY) {
    const shake = this.state === 'warn' ? (Math.floor(this.t * 30) % 2 ? 1 : -1) : 0;
    const x = Math.round(this.x - camX) + shake;
    const y = Math.round(this.y - camY);
    ctx.fillStyle = '#2A140C';
    ctx.fillRect(x - 9, y - 12, 18, 12);
    ctx.fillStyle = '#5A5A6E';
    ctx.fillRect(x - 8, y - 11, 16, 10);
    ctx.fillStyle = '#8A8AA0';
    ctx.fillRect(x - 8, y - 11, 16, 2);
    ctx.fillStyle = '#2A140C';
    ctx.fillRect(x - 10, y - 9, 2, 2);
    ctx.fillRect(x + 8, y - 9, 2, 2);
    // Tapa que salta
    const lift = this.state === 'warn' ? 2 + (Math.floor(this.t * 20) % 2) : 0;
    ctx.fillStyle = '#3A3A4E';
    ctx.fillRect(x - 7, y - 14 - lift, 14, 2);
    ctx.fillRect(x - 1, y - 16 - lift, 3, 2);
    // Vapor
    if (Math.floor(this.t * 3) % 2) {
      ctx.fillStyle = '#E8E0D0';
      ctx.fillRect(x - 3, y - 20 - lift, 2, 2);
      ctx.fillRect(x + 2, y - 23 - lift, 2, 2);
    }
  }
}
