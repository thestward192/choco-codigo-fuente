// Jefe final: N.U.L.L. — docs/niveles/nivel_5_codigo_puro.md
// Una máquina de fases (1 Ondas · 2 Ráfagas · 3 Invisible · 4 Núcleo) con una máquina de estados
// en cada una. La escena maneja las pausas entre fases (diálogo, consejo y +1 cuadrito), el
// derrumbe del suelo y el parche final; el jefe solo avisa con scene.onNullPhaseCleared(fase) y
// scene.onNullDefeated().
//
// Fase 1 · Ondas (Botas): golpea el suelo con las alas y manda ondas (sencillas, dobles, triples y
//   de dos alturas, que piden doble salto); también pilares de código con aviso. Después de cada
//   patrón baja a la altura de las plataformas 3 s: hay que dispararle a la pantalla. 6 de daño.
// Fase 2 · Ráfagas (Escudo): espirales, abanicos y lluvias de Excepciones. Las magenta con borde
//   blanco son las únicas reflejables y solo esas, devueltas con parry, le hacen daño. 4 reflejos.
// Fase 3 · Invisible (Laptop): se esconde entre 3 copias iguales; solo la real tiene punto débil y
//   solo recibe daño con la Vista Debug activa. Las falsas disparan y, si se les dispara, explotan
//   en Fragmentos. Cada golpe a la real las baraja. 8 golpes.
// Fase 4 · Núcleo (Lazo): sin suelo, orbita la arena y barre con láseres (aviso de 0.8 s). Cuando
//   el núcleo pasa cerca de un nodo brilla en blanco: con el lazo se jala y queda expuesto 3 s para
//   un disparo cargado. 3 jalones + 3 disparos.
import { NULL_BOSS, SCREEN } from '../../config/balance.js';
import { aabbOverlap } from '../../systems/physics.js';
import { drawNullBoss } from '../../art/bosses/null.js';
import { Bullet, Fragment } from '../enemies/codigo.js';
import { playSfx } from '../../audio/sfx.js';
import { fxRng } from '../../core/rng.js';
import { TEXTS } from '../../data/dialogues.js';
import { drawText } from '../../art/font.js';
import { Ease } from '../../core/tween.js';

const B = NULL_BOSS;
const R = fxRng;
const TS = SCREEN.TILE;
const SHARDS = ['#FF2E88', '#8C1D52', '#FFFFFF', '#43D9FF'];

// ---------- Reglas puras (las usan las pruebas) ----------

// Vida de cada fase (golpes, reflejos o jalones que hacen falta)
export function phaseHp(phase) {
  return [B.P1.HP, B.P2.HITS, B.P3.HITS, B.P4.PULLS][phase - 1] ?? 1;
}

// Barra del jefe: 4 segmentos, uno por fase
export function nullBar(phase, hp) {
  return Math.max(0, (4 - phase + hp / phaseHp(phase)) / 4);
}

// Orden de los patrones de la fase 1: va subiendo la dificultad y después repite la parte dura
const P1_ORDER = ['single', 'double', 'pillars', 'triple', 'high', 'double', 'high', 'pillars', 'triple', 'high'];
export function phase1Pattern(i) {
  return i < P1_ORDER.length ? P1_ORDER[i] : P1_ORDER[3 + ((i - 3) % (P1_ORDER.length - 3))];
}

// Ondas de cada patrón: [{ at (s), kind: 'low' | 'high' }]
export function phase1Waves(pattern) {
  const P = B.P1;
  if (pattern === 'single') return [{ at: 0, kind: 'low' }];
  if (pattern === 'double') return [0, P.GAP].map((at) => ({ at, kind: 'low' }));
  if (pattern === 'triple') return [0, P.GAP, P.GAP * 2].map((at) => ({ at, kind: 'low' }));
  if (pattern === 'high') return [{ at: 0, kind: 'low' }, { at: P.HIGH_DELAY, kind: 'high' }];
  return [];
}

// ¿Este disparo le hace daño?
//   fase 1: solo en la ventana · fase 2: nunca (solo balas devueltas) · fase 3: la real, con la
//   Vista Debug · fase 4: el núcleo expuesto, solo con disparo cargado
export function nullCanDamage({ phase, state, charged = false, debugView = false, real = false }) {
  if (phase === 1) return state === 'window';
  if (phase === 3) return real && debugView;
  if (phase === 4) return state === 'exposed' && charged;
  return false;
}

// Distancia de un punto a un rayo (origen, ángulo, largo): para el barrido del láser
export function laserDistance(ox, oy, angle, len, px, py) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const k = Math.max(0, Math.min(len, (px - ox) * dx + (py - oy) * dy));
  return Math.hypot(px - (ox + dx * k), py - (oy + dy * k));
}

// ¿El núcleo pasa lo bastante cerca de algún nodo para engancharlo?
export function coreHookable(core, nodes, dist = B.P4.HOOK_DIST) {
  return nodes.some((n) => Math.hypot(n.x - core.x, n.y - core.y) < dist);
}

// Permutación de las posiciones de las copias (la real cambia de lugar)
export function shuffleSlots(n, rng = R) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Peligros ----------

// Onda por el suelo: baja (se salta) o alta (banda a la altura del cuerpo; con la baja antes,
// pide doble salto)
export class FloorWave {
  constructor(x, floorY, dir, kind) {
    this.x = x;
    this.floorY = floorY;
    this.dir = dir;
    this.kind = kind;
    this.t = 0;
    this.dead = false;
  }
  update(dt, scene) {
    this.t += dt;
    this.x += this.dir * B.P1.WAVE_SPEED * dt;
    if (this.x < TS || this.x > scene.map.pxW - TS) this.dead = true;
    if (R.chance(0.5)) {
      const y = this.kind === 'low' ? this.floorY - 2 : this.floorY - (B.P1.WAVE_HIGH[0] + B.P1.WAVE_HIGH[1]) / 2;
      scene.particles.spawn({ x: this.x, y, vx: -this.dir * R.range(10, 40), vy: R.range(-30, 0), life: 0.3, colors: ['#FF2E88', '#FFFFFF'] });
    }
  }
  hurtboxes() {
    if (this.kind === 'low') return [{ x: this.x - 4, y: this.floorY - B.P1.WAVE_LOW_H, w: 8, h: B.P1.WAVE_LOW_H }];
    const [a, b] = B.P1.WAVE_HIGH;
    return [{ x: this.x - 4, y: this.floorY - b, w: 8, h: b - a }];
  }
  touches(body) {
    return aabbOverlap(body, this.hurtboxes()[0]);
  }
  sourceX() {
    return this.x - this.dir * 10;
  }
  draw(ctx, camX, camY) {
    const x = Math.round(this.x - camX);
    const fy = Math.round(this.floorY - camY);
    if (this.kind === 'low') {
      for (let i = 0; i < 4; i++) {
        const hh = Math.round(B.P1.WAVE_LOW_H * (1 - i * 0.22) * (0.8 + 0.2 * Math.sin(this.t * 30 + i)));
        ctx.fillStyle = i === 0 ? '#FFFFFF' : i % 2 ? '#FF2E88' : '#8C1D52';
        ctx.fillRect(x - this.dir * i * 3 - 1, fy - hh, 3, hh);
      }
      return;
    }
    const [a, b] = B.P1.WAVE_HIGH;
    const glyphs = ['{', '∅', '}'];
    for (let i = 0; i < 3; i++) {
      const y = fy - b + 2 + i * 7;
      drawText(ctx, glyphs[(i + Math.floor(this.t * 10)) % 3], x - 2, y, { color: i === 1 ? '#FFFFFF' : '#FF2E88', shadow: '#3A0A2A' });
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x - this.dir * 6 - 1, fy - b, 2, b - a);
    ctx.fillRect(x - this.dir * 11 - 1, fy - b + 3, 1, b - a - 6);
    ctx.globalAlpha = 1;
  }
}

// Pilar de código que sale del suelo (marca 0.5 s antes)
export class CodePillar {
  constructor(x, floorY, delay = 0) {
    this.x = x;
    this.floorY = floorY;
    this.t = -delay;
    this.dead = false;
    this.warned = false;
  }
  get up() {
    const P = B.P1;
    return this.t >= P.PILLAR_WARN && this.t < P.PILLAR_WARN + P.PILLAR_UP;
  }
  update(dt, scene) {
    const P = B.P1;
    this.t += dt;
    if (this.t >= 0 && !this.warned) {
      this.warned = true;
      playSfx(scene.game.audio, 'pillarWarn');
    }
    if (this.t >= P.PILLAR_WARN && this.t - dt < P.PILLAR_WARN) {
      playSfx(scene.game.audio, 'pillarUp');
      scene.game.effects.shake(0.2);
      scene.particles.burst(this.x, this.floorY - 2, 10, { angle: -Math.PI / 2, spread: 1.4, speedMin: 30, speedMax: 90, colors: SHARDS, lifeMin: 0.2, lifeMax: 0.5 });
    }
    if (this.t >= P.PILLAR_WARN + P.PILLAR_UP + 0.2) this.dead = true;
  }
  height() {
    const P = B.P1;
    const k = this.t - P.PILLAR_WARN;
    if (k < 0) return 0;
    if (k < 0.08) return P.PILLAR_H * (k / 0.08);
    if (k > P.PILLAR_UP) return Math.max(0, P.PILLAR_H * (1 - (k - P.PILLAR_UP) / 0.2));
    return P.PILLAR_H;
  }
  touches(body) {
    if (!this.up) return false;
    const h = this.height();
    return aabbOverlap(body, { x: this.x - 6, y: this.floorY - h, w: 12, h });
  }
  sourceX() {
    return this.x;
  }
  draw(ctx, camX, camY) {
    if (this.t < 0) return;
    const x = Math.round(this.x - camX);
    const fy = Math.round(this.floorY - camY);
    if (this.t < B.P1.PILLAR_WARN) {
      // Marca en el suelo
      if (Math.floor(this.t * 14) % 2) return;
      ctx.fillStyle = '#FF2E88';
      ctx.fillRect(x - 7, fy - 2, 14, 2);
      ctx.fillRect(x - 1, fy - 6, 2, 3);
      return;
    }
    const h = Math.round(this.height());
    ctx.fillStyle = '#3A0A2A';
    ctx.fillRect(x - 6, fy - h, 12, h);
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x - 6, fy - h, 1, h);
    ctx.fillRect(x + 5, fy - h, 1, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 6, fy - h, 12, 1);
    for (let y = fy - h + 3; y < fy - 6; y += 9) drawText(ctx, (Math.floor(y + this.t * 20) % 2) ? '0' : '1', x - 2, y, { color: '#FF5AA8', shadow: false });
  }
}

// Barrido del láser (fase 4): línea fina de aviso y después el rayo gira `arc` radianes
export class SweepLaser {
  constructor(ox, oy, a0, dir) {
    this.ox = ox;
    this.oy = oy;
    this.a0 = a0;
    this.dir = dir;
    this.t = 0;
    this.dead = false;
    this.front = true;
    this.hurtOpts = {};
  }
  get sweeping() {
    return this.t >= B.P4.LASER_WARN;
  }
  get angle() {
    const k = Math.min(1, Math.max(0, (this.t - B.P4.LASER_WARN) / B.P4.LASER_SWEEP));
    return this.a0 + this.dir * B.P4.LASER_ARC * Ease.inOutQuad(k);
  }
  update(dt, scene) {
    const before = this.t;
    this.t += dt;
    if (before < B.P4.LASER_WARN && this.t >= B.P4.LASER_WARN) playSfx(scene.game.audio, 'laserSweep');
    if (this.t >= B.P4.LASER_WARN + B.P4.LASER_SWEEP) this.dead = true;
  }
  touches(body) {
    if (!this.sweeping) return false;
    const d = laserDistance(this.ox, this.oy, this.angle, B.P4.LASER_LEN, body.x + body.w / 2, body.y + body.h / 2);
    return d < B.P4.LASER_HIT + body.w / 2;
  }
  sourceX() {
    return this.ox;
  }
  draw(ctx, camX, camY) {
    const ox = this.ox - camX;
    const oy = this.oy - camY;
    const ray = (a, color, w, dotted) => {
      const n = B.P4.LASER_LEN;
      ctx.fillStyle = color;
      for (let i = 10; i < n; i += dotted ? 4 : 1) ctx.fillRect(Math.round(ox + Math.cos(a) * i - w / 2), Math.round(oy + Math.sin(a) * i - w / 2), w, w);
    };
    if (!this.sweeping) {
      // Aviso: dónde empieza y hasta dónde barre
      if (Math.floor(this.t * 12) % 2) ray(this.a0, '#FFFFFF', 1, false);
      ctx.globalAlpha = 0.45;
      ray(this.a0 + this.dir * B.P4.LASER_ARC, '#FF2E88', 1, true);
      for (let k = 0.2; k < 1; k += 0.2) ray(this.a0 + this.dir * B.P4.LASER_ARC * k, '#8C1D52', 1, true);
      ctx.globalAlpha = 1;
      return;
    }
    const a = this.angle;
    ray(a, '#8C1D52', 5, false);
    ray(a, '#FF2E88', 3, false);
    ray(a, '#FFFFFF', 1, false);
  }
}

// ---------- Copias de la fase 3 ----------
export class NullCopy {
  constructor(boss, slot, real) {
    this.boss = boss;
    this.slot = slot;
    this.real = real;
    const p = boss.slotPos(slot);
    this.x = p.x;
    this.y = p.y;
    this.from = { ...p };
    this.state = 'normal'; // normal | aim | shuffle | gone
    this.stateT = 0;
    this.t = R.range(0, 4);
    this.shotT = R.range(...B.P3.SHOT_EVERY);
    this.flashT = 0;
    this.body = { x: 0, y: 0, w: 56, h: 44 };
    this.shootable = true;
    this.harmful = false;
    this.stompable = false;
    this.alwaysUpdate = true;
    this.dead = false;
    this.place();
  }
  get active() {
    return this.state !== 'gone' && !this.dead;
  }
  get cx() {
    return this.x;
  }
  get cy() {
    return this.y;
  }
  place() {
    this.body.x = this.x - 28;
    this.body.y = this.y - 24;
  }
  set(s) {
    this.state = s;
    this.stateT = 0;
  }
  weakPoint() {
    return this.real && this.state !== 'shuffle' ? { x: this.x, y: this.y - 2 } : null;
  }
  // Se baraja: va a su nueva posición con un salto glitcheado
  moveTo(slot, real) {
    this.slot = slot;
    this.real = real;
    this.from = { x: this.x, y: this.y };
    if (this.state !== 'gone') this.set('shuffle');
  }
  update(dt, scene) {
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    const target = this.boss.slotPos(this.slot);
    if (this.state === 'shuffle') {
      const k = Math.min(1, this.stateT / B.P3.SHUFFLE);
      this.x = this.from.x + (target.x - this.from.x) * Ease.inOutCubic(k);
      this.y = this.from.y + (target.y - this.from.y) * Ease.inOutCubic(k);
      if (k >= 1) this.set('normal');
    } else if (this.state === 'gone') {
      if (this.stateT >= B.P3.FAKE_RESPAWN) {
        this.set('normal');
        this.flashT = 0.2;
        playSfx(scene.game.audio, 'glitch');
      }
    } else {
      this.x = target.x + Math.sin(this.t * 1.3 + this.slot) * B.P3.DRIFT;
      this.y = target.y + Math.cos(this.t * 1.7 + this.slot) * B.P3.DRIFT * 0.5;
    }
    this.place();
    if (!this.boss.fighting || this.state === 'shuffle' || this.state === 'gone') return;
    // Todas disparan: aviso con el ojo brillando y una bala recta hacia Choco
    this.shotT -= dt;
    if (this.state === 'normal' && this.shotT <= B.P3.SHOT_TELEGRAPH) {
      this.set('aim');
      playSfx(scene.game.audio, 'turretCharge');
    }
    if (this.state === 'aim' && this.stateT >= B.P3.SHOT_TELEGRAPH) {
      const c = scene.choco;
      const dx = c.cx - this.x;
      const dy = c.cy - (this.y + 6);
      const d = Math.hypot(dx, dy) || 1;
      scene.hazards.push(new Bullet(this.x, this.y + 6, (dx / d) * B.P3.SHOT_SPEED, (dy / d) * B.P3.SHOT_SPEED, { solid: false, life: 5 }));
      playSfx(scene.game.audio, 'exception');
      this.shotT = R.range(...B.P3.SHOT_EVERY);
      this.set('normal');
    }
  }
  damage(amount, scene, dir, shot) {
    if (this.state === 'shuffle' || this.state === 'gone' || !this.boss.fighting) {
      tink(scene, shot);
      return false;
    }
    if (this.real) {
      if (!nullCanDamage({ phase: 3, real: true, debugView: scene.map.ghostSolid })) {
        tink(scene, shot);
        return false;
      }
      this.boss.realHit(scene);
      return true;
    }
    // Falsa: explota en Fragmentos que persiguen a Choco
    playSfx(scene.game.audio, 'fakeBurst');
    scene.game.effects.shake(0.3);
    scene.particles.burst(this.x, this.y, 24, { speedMin: 30, speedMax: 120, colors: SHARDS, lifeMin: 0.3, lifeMax: 0.7 });
    for (let i = 0; i < B.P3.FRAGMENTS; i++) {
      const a = (i / B.P3.FRAGMENTS) * Math.PI * 2;
      const f = new Fragment(this.x + Math.cos(a) * 14, this.y + Math.sin(a) * 10, { awake: true, life: 7 });
      f.stateT = -i * 0.25;
      scene.enemies.push(f);
    }
    this.set('gone');
    return false;
  }
  draw(ctx, camX, camY, scene) {
    if (this.state === 'gone') return;
    const flick = this.state === 'shuffle' && Math.floor(this.t * 30) % 2;
    drawNullBoss(ctx, this.x - camX, this.y - camY, {
      t: this.t,
      look: Math.sin(this.t + this.slot) * 0.6,
      glitch: 0.8,
      small: true,
      alpha: flick ? 0.35 : 0.92,
      flash: this.flashT > 0 || (this.state === 'aim' && Math.floor(this.stateT * 14) % 2 === 1),
      crack: 0.5,
    });
    // Con la Vista Debug, la real muestra su punto débil: una mira cian sobre el ∅
    if (this.real && scene?.map.ghostSolid && this.state !== 'shuffle') {
      const x = Math.round(this.x - camX);
      const y = Math.round(this.y - 2 - camY);
      const r = 10 + (Math.floor(this.t * 6) % 2);
      ctx.strokeStyle = Math.floor(this.t * 8) % 2 ? '#FFFFFF' : '#43D9FF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#43D9FF';
      ctx.fillRect(x - r - 4, y, 4, 1);
      ctx.fillRect(x + r + 1, y, 4, 1);
      ctx.fillRect(x, y - r - 4, 1, 4);
      ctx.fillRect(x, y + r + 1, 1, 4);
    }
  }
}

function tink(scene, shot) {
  playSfx(scene.game.audio, 'tink');
  if (shot && !shot.charged) shot.reflect(scene);
}

// ---------- N.U.L.L. ----------
export class NullBoss {
  // arena: { cx, floorY, left, right } en píxeles del mapa
  constructor(arena, phase = 1) {
    this.arena = arena;
    this.x = arena.cx;
    this.y = B.HOVER_Y;
    this.body = { x: 0, y: 0, w: B.W - 4, h: 48 };
    this.t = 0;
    this.state = 'intro';
    this.stateT = 0;
    this.phase = phase;
    this.hp = phaseHp(phase);
    this.flashT = 0;
    this.alpha = 0;
    this.wing = 0;
    this.look = 0;
    this.showBar = false;
    this.alwaysUpdate = true;
    this.stompable = false;
    this.dead = false;
    this.copies = [];
    this.patternI = 0;
    this.emitT = 0;
    this.spawns = [];
    this.orbitA = Math.PI / 2;
    this.core = { x: this.x, y: this.y, pull: true, priority: true, disabled: true, hooked: 0, onPull: null };
    this.place();
  }

  get active() {
    return !this.dead && this.state !== 'gone';
  }
  // Durante las pausas entre fases no ataca
  get fighting() {
    return !['intro', 'pause', 'cleared', 'weak', 'gone'].includes(this.state);
  }
  get shootable() {
    return this.phase !== 3 && this.state !== 'intro';
  }
  // El monitor no hace daño por contacto: lo peligroso son sus ataques
  get harmful() {
    return false;
  }
  get cx() {
    return this.x;
  }
  get cy() {
    return this.y;
  }

  place() {
    this.body.x = this.x - this.body.w / 2;
    this.body.y = this.y - 25;
    this.core.x = this.x;
    this.core.y = this.y - 2;
  }

  set(s) {
    this.state = s;
    this.stateT = 0;
  }

  hudInfo() {
    return { name: TEXTS.level5.boss.name, hp01: nullBar(this.phase, this.hp), segments: 4 };
  }

  returnPoint() {
    return { x: this.x, y: this.y };
  }
  reflectBox() {
    return this.body;
  }
  weakPoint() {
    if (this.phase === 1 && this.state === 'window') return { x: this.x, y: this.y - 2 };
    if (this.phase === 4 && this.state === 'exposed') return { x: this.x, y: this.y - 2 };
    return null;
  }

  // Posición de las copias de la fase 3
  slotPos(i) {
    const xs = [this.arena.cx - 104, this.arena.cx, this.arena.cx + 104];
    return { x: xs[i], y: i === 1 ? B.HOVER_Y + 2 : B.HOVER_Y + 12 };
  }

  // Arranca una fase (la escena llama esto después de la pausa)
  startPhase(n, scene) {
    this.phase = n;
    this.hp = phaseHp(n);
    this.showBar = true;
    this.patternI = 0;
    this.spawns = [];
    this.alpha = 1;
    this.wing = 0;
    this.copies = [];
    if (n === 3) {
      this.x = this.arena.cx;
      this.y = B.HOVER_Y;
      const real = R.int(0, B.P3.COPIES - 1);
      for (let i = 0; i < B.P3.COPIES; i++) {
        const c = new NullCopy(this, i, i === real);
        this.copies.push(c);
        scene.enemies.push(c);
      }
      this.set('hidden');
    } else if (n === 4) {
      this.orbitA = -Math.PI / 2;
      this.laserT = B.P4.LASER_EVERY * 0.6;
      this.set('orbit');
    } else this.set('hover');
    this.place();
  }

  update(dt, scene) {
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    const c = scene.choco;
    this.look = Math.max(-1, Math.min(1, (c.cx - this.x) / 90));
    this.wing += ((this.state === 'slam' ? 1 : this.state === 'raise' ? -0.4 : 0) - this.wing) * Math.min(1, dt * 14);
    // Ondas, pilares y balas programadas
    for (const s of this.spawns) {
      s.at -= dt;
      if (s.at <= 0 && !s.done) {
        s.done = true;
        s.fn();
      }
    }
    this.spawns = this.spawns.filter((s) => !s.done);
    switch (this.state) {
      case 'intro':
        this.alpha = Math.min(1, this.stateT / B.INTRO);
        break;
      case 'pause':
      case 'cleared':
        this.y += (B.HOVER_Y - this.y) * Math.min(1, dt * 3);
        this.x += (this.arena.cx - this.x) * Math.min(1, dt * 3);
        break;
      case 'weak':
        if (R.chance(0.3)) scene.particles.burst(this.x + R.range(-24, 24), this.y + R.range(-20, 20), 4, { speedMin: 20, speedMax: 60, colors: SHARDS, lifeMin: 0.2, lifeMax: 0.5 });
        break;
      default:
        if (this.phase === 1) this.updateP1(dt, scene);
        else if (this.phase === 2) this.updateP2(dt, scene);
        else if (this.phase === 4) this.updateP4(dt, scene);
    }
    if (this.phase !== 4 || this.state === 'pause') this.core.disabled = true;
    this.place();
  }

  // ---------- Fase 1 · Ondas ----------
  updateP1(dt, scene) {
    const P = B.P1;
    const audio = scene.game.audio;
    const floorY = this.arena.floorY;
    if (this.state === 'hover') {
      this.y = B.HOVER_Y + Math.sin(this.t * 2) * 3;
      this.x += (this.arena.cx - this.x) * Math.min(1, dt * 2);
      if (this.stateT > P.REST) {
        this.pattern = phase1Pattern(this.patternI++);
        if (this.pattern === 'pillars') {
          this.set('pillars');
          playSfx(audio, 'nullWindup');
          for (let i = 0; i < 3; i++) {
            this.spawns.push({ at: i * 0.55, fn: () => scene.hazards.push(new CodePillar(Math.max(TS * 2, Math.min(this.arena.right - TS, scene.choco.cx)), floorY)) });
          }
        } else {
          this.set('raise');
          playSfx(audio, 'nullWindup');
        }
      }
    } else if (this.state === 'raise') {
      if (this.stateT >= P.SLAM_TELEGRAPH) {
        this.set('slam');
        playSfx(audio, 'nullSlam');
        scene.game.effects.shake(0.5);
        scene.game.effects.hitstop(3);
        for (const w of phase1Waves(this.pattern)) {
          this.spawns.push({
            at: w.at,
            fn: () => {
              scene.hazards.push(new FloorWave(this.x - 34, floorY, -1, w.kind), new FloorWave(this.x + 34, floorY, 1, w.kind));
              playSfx(audio, w.kind === 'high' ? 'waveHigh' : 'wave');
            },
          });
        }
        this.waitWaves = Math.max(...phase1Waves(this.pattern).map((w) => w.at)) + 1.2;
      }
    } else if (this.state === 'slam') {
      if (this.stateT >= this.waitWaves) this.set('descend');
    } else if (this.state === 'pillars') {
      if (this.stateT >= 2.2) this.set('descend');
    } else if (this.state === 'descend') {
      const k = Math.min(1, this.stateT / 0.6);
      this.y = B.HOVER_Y + (P.WINDOW_Y - B.HOVER_Y) * Ease.inOutCubic(k);
      if (k >= 1) {
        this.set('window');
        playSfx(audio, 'nullOpen');
      }
    } else if (this.state === 'window') {
      this.y = P.WINDOW_Y + Math.sin(this.t * 3) * 1.5;
      if (this.stateT >= P.WINDOW) this.set('ascend');
    } else if (this.state === 'ascend') {
      const k = Math.min(1, this.stateT / 0.6);
      this.y = P.WINDOW_Y + (B.HOVER_Y - P.WINDOW_Y) * Ease.inOutCubic(k);
      if (k >= 1) this.set('hover');
    }
  }

  // ---------- Fase 2 · Ráfagas ----------
  updateP2(dt, scene) {
    const P = B.P2;
    const audio = scene.game.audio;
    this.x = this.arena.cx + Math.sin(this.t * 0.6) * 60;
    this.y = B.HOVER_Y + Math.sin(this.t * 1.7) * 4;
    if (this.state === 'hover') {
      if (this.stateT > P.REST) {
        this.pattern = ['spiral', 'fan', 'rain'][this.patternI++ % 3];
        this.set('tele');
        playSfx(audio, 'nullWindup');
      }
    } else if (this.state === 'tele') {
      if (this.stateT >= P.TELEGRAPH) {
        this.set('emit');
        this.emitT = 0;
        this.count = 0;
        this.spinA = R.range(0, Math.PI * 2);
      }
    } else if (this.state === 'emit') {
      this.emitT -= dt;
      const shoot = (x, y, a, speed, reflectable) => {
        scene.hazards.push(new Bullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { reflectable, owner: this, life: 7, size: reflectable ? 3 : 3 }));
      };
      if (this.pattern === 'spiral') {
        if (this.emitT <= 0) {
          this.emitT = P.SPIRAL_RATE;
          this.count++;
          for (let k = 0; k < 2; k++) shoot(this.x, this.y, this.spinA + k * Math.PI, P.BULLET_SPEED, k === 0 && this.count % P.REFLECT_EVERY === 0);
          this.spinA += 0.42;
          if (this.count % 3 === 0) playSfx(audio, 'bulletEmit');
        }
        if (this.stateT >= P.SPIRAL_TIME) this.set('hover');
      } else if (this.pattern === 'fan') {
        if (this.emitT <= 0 && this.count < P.FAN_WAVES) {
          this.emitT = P.FAN_GAP;
          this.count++;
          const c = scene.choco;
          const a0 = Math.atan2(c.cy - this.y, c.cx - this.x);
          for (let i = 0; i < P.FAN_N; i++) {
            const a = a0 + (i / (P.FAN_N - 1) - 0.5) * P.FAN_SPREAD;
            shoot(this.x, this.y + 8, a, P.BULLET_SPEED * 1.1, i === Math.floor(P.FAN_N / 2));
          }
          playSfx(audio, 'bulletEmit');
        }
        if (this.count >= P.FAN_WAVES && this.emitT <= 0) this.set('hover');
      } else {
        if (this.emitT <= 0) {
          this.emitT = P.RAIN_RATE;
          this.count++;
          const x = R.range(this.arena.left + 12, this.arena.right - 12);
          scene.hazards.push(new Bullet(x, 8, 0, P.BULLET_SPEED * 1.15, { reflectable: this.count % 3 === 0, owner: this, life: 6 }));
          if (this.count % 3 === 0) playSfx(audio, 'bulletEmit');
        }
        if (this.stateT >= P.RAIN_TIME) this.set('hover');
      }
    }
  }

  // Una bala devuelta con parry (fase 2)
  onReflectHit(scene) {
    if (this.phase !== 2 || !this.fighting) return;
    this.hit(scene, 1);
  }

  // ---------- Fase 3 · Invisible ----------
  realHit(scene) {
    this.hit(scene, 1);
    for (const c of this.copies) c.flashT = 0.15;
    if (this.state === 'cleared') return;
    // Barajar: nuevas posiciones y la real cambia
    const slots = shuffleSlots(this.copies.length);
    const real = R.int(0, this.copies.length - 1);
    this.copies.forEach((c, i) => c.moveTo(slots[i], i === real));
    playSfx(scene.game.audio, 'shuffle');
  }

  // ---------- Fase 4 · Núcleo ----------
  updateP4(dt, scene) {
    const P = B.P4;
    const audio = scene.game.audio;
    const nodes = scene.arenaNodes || [];
    const orbitPos = (a) => ({ x: this.arena.cx + Math.cos(a) * P.ORBIT_RX, y: P.ORBIT_CY + Math.sin(a) * P.ORBIT_RY });
    if (this.state === 'orbit') {
      this.orbitA += P.ORBIT_SPEED * dt;
      const p = orbitPos(this.orbitA);
      this.x += (p.x - this.x) * Math.min(1, dt * 4);
      this.y += (p.y - this.y) * Math.min(1, dt * 4);
      this.core.disabled = !coreHookable(this.core, nodes);
      this.laserT -= dt;
      if (this.laserT <= 0) {
        const c = scene.choco;
        const a0 = Math.atan2(c.cy - this.y, c.cx - this.x);
        this.core.disabled = true;
        this.laser = new SweepLaser(this.x, this.y, a0, R.chance(0.5) ? 1 : -1);
        scene.hazards.push(this.laser);
        playSfx(audio, 'laserWarn');
        this.set('laser');
      }
    } else if (this.state === 'laser') {
      this.core.disabled = true;
      if (this.laser.dead) {
        this.laserT = P.LASER_EVERY;
        this.set('orbit');
      }
    } else if (this.state === 'yank') {
      const k = Math.min(1, this.stateT / 0.25);
      this.x = this.yankFrom.x + (this.yankTo.x - this.yankFrom.x) * Ease.outCubic(k);
      this.y = this.yankFrom.y + (this.yankTo.y - this.yankFrom.y) * Ease.outCubic(k);
      if (k >= 1) this.set('exposed');
    } else if (this.state === 'exposed') {
      this.x = this.yankTo.x + (R.chance(0.3) ? R.range(-1, 1) : 0);
      if (this.stateT >= P.EXPOSE) {
        playSfx(audio, 'nullRecover');
        this.set('recover');
      }
    } else if (this.state === 'recover') {
      const p = orbitPos(this.orbitA);
      this.x += (p.x - this.x) * Math.min(1, dt * 3);
      this.y += (p.y - this.y) * Math.min(1, dt * 3);
      if (this.stateT >= 0.8) {
        this.laserT = Math.max(this.laserT, 1.2);
        this.set('orbit');
      }
    }
    if (this.state !== 'orbit') this.core.disabled = true;
  }

  // El lazo jaló el núcleo: N.U.L.L. baja hacia Choco y queda expuesta
  pulled(scene) {
    if (this.phase !== 4 || this.state !== 'orbit') return;
    const c = scene.choco;
    const dx = this.x - c.cx;
    const dy = this.y - c.cy;
    const d = Math.hypot(dx, dy) || 1;
    const to = { x: c.cx + (dx / d) * 70, y: c.cy + (dy / d) * 40 };
    to.x = Math.max(this.arena.left + 40, Math.min(this.arena.right - 40, to.x));
    to.y = Math.max(34, Math.min(this.arena.floorY - 30, to.y));
    this.yankFrom = { x: this.x, y: this.y };
    this.yankTo = to;
    this.set('yank');
    this.flashT = 0.15;
    playSfx(scene.game.audio, 'nullYank');
    scene.game.effects.shake(0.4);
    scene.game.effects.hitstop(4);
  }

  coreRect() {
    return { x: this.x - 12, y: this.y - 14, w: 24, h: 24 };
  }

  // Disparos del báculo
  damage(amount, scene, dir, shot) {
    if (!this.fighting) {
      tink(scene, shot);
      return false;
    }
    if (this.phase === 4) {
      const onCore = !shot || aabbOverlap(shot, this.coreRect());
      if (onCore && nullCanDamage({ phase: 4, state: this.state, charged: !!shot?.charged })) {
        this.hit(scene, 1);
        if (this.state !== 'cleared') this.set('recover');
        return true;
      }
      tink(scene, shot);
      return false;
    }
    if (!nullCanDamage({ phase: this.phase, state: this.state })) {
      tink(scene, shot);
      return false;
    }
    this.hit(scene, amount);
    return true;
  }

  hit(scene, amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.flashT = 0.14;
    playSfx(scene.game.audio, 'bossHurt');
    scene.game.effects.hitstop(amount > 1 ? 6 : 3);
    scene.game.effects.glitch(0.12, 0.4);
    scene.particles.burst(this.x, this.y, 12, { speedMin: 30, speedMax: 100, colors: SHARDS, lifeMin: 0.2, lifeMax: 0.5 });
    if (this.hp <= 0) this.clearPhase(scene);
  }

  clearPhase(scene) {
    if (this.state === 'cleared') return;
    this.set('cleared');
    this.spawns = [];
    playSfx(scene.game.audio, 'bossDie');
    scene.game.effects.shake(0.8);
    scene.game.effects.flash('#FF2E88', 4);
    scene.game.effects.glitch(0.6, 1);
    for (const c of this.copies) c.dead = true;
    this.copies = [];
    if (this.phase >= 4) {
      this.set('weak');
      scene.onNullDefeated?.(this);
    } else scene.onNullPhaseCleared?.(this.phase, this);
  }

  draw(ctx, camX, camY) {
    if (this.state === 'gone') return;
    if (this.phase === 3 && this.state !== 'cleared' && this.state !== 'pause') return;
    const weak = this.state === 'weak';
    if (weak && Math.floor(this.t * 16) % 3 === 0) return;
    let core = null;
    if (this.phase === 4 && this.fighting) core = this.state === 'exposed' ? 'exposed' : !this.core.disabled ? 'hook' : null;
    const alpha = this.state === 'intro' ? (Math.floor(this.t * 20) % 2 ? this.alpha : this.alpha * 0.4) : 1;
    drawNullBoss(ctx, this.x - camX, this.y - camY, {
      t: this.t,
      look: this.look,
      angry: this.phase >= 2 && !weak,
      open: this.state === 'window' || this.state === 'exposed' ? 1 : this.state === 'raise' ? 0.6 : 0.85,
      glitch: weak ? 1 : 0.3 + this.phase * 0.12,
      crack: 0.15 + (this.phase - 1) * 0.28 + (weak ? 0.3 : 0),
      wing: this.wing,
      core,
      alpha,
      flash: this.flashT > 0 || (this.state === 'tele' && Math.floor(this.stateT * 14) % 2 === 1),
    });
    // Ventana de daño: la pantalla brilla
    if (this.state === 'window' && Math.floor(this.t * 6) % 2) {
      ctx.strokeStyle = '#43D9FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(this.x - camX) - 27.5, Math.round(this.y - camY) - 21.5, 54, 38);
    }
  }
}

