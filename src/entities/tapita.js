// Tapita en modo plataformas — docs/coop/02_tapita.md
// Salto simple (más bajo que Choco) + salto de pared, pegajosa en las paredes, cabe por túneles de
// 1 tile. Usa las mismas acciones que Choco con otro efecto:
//   Disparar → Mazo (en el aire con ↓: Martillazo) · Lazo → Melcocha · Escudo (mantener) → Plantarse
//   Vista Debug (mantener) → Hoja sombrilla
// La escena le da: map, particles, game, melee(rect, daño, dir), pound(x, y), throwMelcocha(...),
// onPlayerFell(p), onPlayerDied(p).
import { PLATFORMER, COOP, HEALTH, EFFECTS, SQUASH, CHOCO_FX, DEV } from '../config/balance.js';
import { createBody, createJumpState, stepPlatformer, moveY } from '../systems/physics.js';
import { ANIMS, FRAME_W, ANCHOR_Y, CAPE_ANCHOR, CAPE_COLORS, CRYSTALS, OX, OY, PALETTE, tapitaFrame } from '../art/tapita.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';

const R = fxRng;
const C = COOP.TAPITA;
// Física propia: lo que no define COOP.TAPITA es igual a Choco
export const TAPITA_PHYSICS = { ...PLATFORMER, ...C, DOUBLE_JUMP_SPEED: 0 };
const SUGAR = [PALETTE.c, PALETTE.C, PALETTE.l];
const DUST = ['#C8A070', '#A8743F', '#7A5A3A'];
const CAPE_SEGMENTS = 4;
const CAPE_LEN = 2;
const TS = 16;

export class Tapita {
  constructor(scene, footX, footY) {
    this.scene = scene;
    this.kind = 'tapita';
    this.body = createBody(footX - C.HITBOX_W / 2, footY - C.HITBOX_H, C.HITBOX_W, C.HITBOX_H);
    this.js = createJumpState();
    this.facing = 1;
    this.maxHp = C.HP;
    this.hp = C.HP;
    this.invuln = 0;
    this.hurtT = 0;
    this.flashT = 0;
    this.state = 'play'; // 'play' | 'dead' | 'victory' | 'frozen'
    this.deadT = 0;
    this.deathCause = null;
    this.t = 0;

    // Acción en curso: null | 'mazo' | 'pound' | 'throw' | 'plant'
    this.action = null;
    this.actionT = 0;
    this.poundPhase = null; // 'hover' | 'dive' | 'land'
    this.hitDone = false;
    this.cooldown = 0;
    this.melCooldown = 0;
    this.umbrella = false;
    this.umbrellaT = 0;
    this.caramel = false; // calor extremo (cosmético, Hito 14)

    // Pared: { dir, t }
    this.cling = null;
    this.clingLeft = C.CLING_TIME;
    this.wallLock = 0;
    this.riding = false; // parada sobre el compañero (lo decide la escena)

    this.anim = { name: 'idle', t: 0 };
    this.squash = { x: 1, y: 1, vx: 0, vy: 0 };
    this.landT = 0;
    this.blinkIn = R.range(CHOCO_FX.BLINK_MIN, CHOCO_FX.BLINK_MAX);
    this.blinkT = 0;
    this.twinkle = { i: 0, t: 0 };
    this.sugarT = 0;
    this.stepT = 0;
    this.cape = [];
    for (let i = 0; i < CAPE_SEGMENTS; i++) this.cape.push({ x: footX - 6, y: footY - 12 + i * 2 });
  }

  get footX() {
    return this.body.x + this.body.w / 2;
  }
  get footY() {
    return this.body.y + this.body.h;
  }
  get cx() {
    return this.footX;
  }
  get cy() {
    return this.body.y + this.body.h / 2;
  }
  get alive() {
    return this.state !== 'dead';
  }
  get planted() {
    return this.action === 'plant';
  }
  get weight() {
    return this.planted ? C.WEIGHT_PLANTED : C.WEIGHT;
  }
  get canNoclip() {
    return this.state === 'play';
  }
  get noclip() {
    const g = this.scene.game;
    return !!(g?.devMode && g.noclip);
  }
  get fx() {
    return this.scene.game.effects;
  }
  get audio() {
    return this.scene.game.audio;
  }
  get particles() {
    return this.scene.particles;
  }

  // ---------- Actualización ----------
  update(dt, inp) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.melCooldown > 0) this.melCooldown -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.wallLock > 0) this.wallLock -= dt;
    const dev = this.scene.game?.devMode;
    if (dev) {
      this.cooldown = Math.min(this.cooldown, 0.05);
      this.melCooldown = 0;
    }

    if (this.state === 'dead') {
      this.deadT += dt;
      return;
    }
    if (this.state === 'victory' || this.state === 'frozen') {
      this.action = null;
      this.umbrella = false;
      this.updateLooks(dt, 0);
      return;
    }
    if (this.noclip) {
      this.updateNoclip(dt, inp);
      return;
    }
    if (this.hurtT > 0) this.hurtT -= dt;
    const control = this.hurtT <= 0;
    const b = this.body;
    const map = this.scene.map;

    // Hoja sombrilla (mantener Vista Debug): se mueve al 60 %
    const wantUmbrella = control && inp.down('debug') && !this.action;
    if (wantUmbrella !== this.umbrella) {
      this.umbrella = wantUmbrella;
      this.umbrellaT = 0;
      playSfx(this.audio, wantUmbrella ? 'leafOpen' : 'leafClose');
      if (wantUmbrella) this.particles.burst(this.footX, b.y - 2, 6, { speedMin: 10, speedMax: 40, colors: ['#8E9A3F', '#C4C77A', '#F2C46B'], lifeMin: 0.2, lifeMax: 0.4 });
    }
    if (this.umbrella) this.umbrellaT += dt;

    // Plantarse (mantener Escudo, en el suelo): no se mueve y pesa 3
    if (this.action === 'plant') {
      if (!inp.down('shield') || !b.onGround) this.unplant();
    } else if (control && !this.action && b.onGround && inp.down('shield') && inp.pressed('shield')) {
      this.plant();
    }

    if (this.action === 'pound') {
      this.updatePound(dt);
      this.finish(dt, 0);
      return;
    }

    // Movimiento
    let moveX = control && !this.planted && this.wallLock <= 0 ? inp.moveX() : 0;
    if (this.wallLock > 0) moveX = 0;
    let speedMult = this.umbrella ? C.UMBRELLA_SPEED_MULT : 1;
    if (this.action === 'mazo' && b.onGround) speedMult *= 0.5;

    // Salto de pared (pegada o recién soltada)
    if (control && this.cling && inp.buffered('jump')) {
      inp.consume('jump');
      this.wallJump();
      moveX = 0;
    }

    const ev = stepPlatformer(
      b,
      this.js,
      {
        moveX,
        jumpBuffered: control && !this.planted && !this.cling && inp.buffered('jump'),
        jumpHeld: inp.down('jump'),
        down: inp.down('down'),
        speedMult,
        keepMomentum: this.wallLock > 0,
      },
      dt,
      map,
      TAPITA_PHYSICS,
    );
    if (ev.consumedJump) inp.consume('jump');
    if (moveX !== 0 && !this.planted) this.facing = moveX;
    this.updateCling(dt, moveX);
    this.handleMoveEvents(ev);
    if (b.onGround && !map.touchesSpikes(b.x - 4, b.y, b.w + 8, b.h + 1)) this.safe = { x: this.footX, y: this.footY };

    // Habilidades
    if (control && !this.action && !this.cling) {
      if (inp.pressed('shoot')) {
        if (!b.onGround && inp.down('down')) this.startPound();
        else if (this.cooldown <= 0) this.startMazo();
      } else if (inp.pressed('lasso') && this.melCooldown <= 0 && !this.umbrella) {
        this.startThrow(inp.down('up'));
      }
    }
    this.updateAction(dt);
    this.finish(dt, moveX);
  }

  // Lo que corre siempre al final: peligros, animación y detalles
  finish(dt, moveX) {
    this.updateHazards();
    if (this.state === 'dead') return;
    this.updateLooks(dt, moveX);
  }

  updateLooks(dt, moveX) {
    this.updateSquash(dt);
    this.updateAnim(dt, moveX);
    this.updateFace(dt);
    this.updateCape(dt);
    this.updateGroundFx(dt);
  }

  updateNoclip(dt, inp) {
    const b = this.body;
    const map = this.scene.map;
    this.action = null;
    this.cling = null;
    this.umbrella = false;
    const mx = inp.moveX();
    const v = DEV.NOCLIP_SPEED * (inp.down('jump') ? DEV.NOCLIP_FAST : 1);
    b.vx = mx * v;
    b.vy = inp.moveY() * v;
    b.x = Math.max(0, Math.min(map.pxW - b.w, b.x + b.vx * dt));
    b.y = Math.max(0, Math.min(map.pxH - b.h, b.y + b.vy * dt));
    b.onGround = false;
    b.platform = null;
    if (mx) this.facing = mx;
    this.updateLooks(dt, mx);
  }

  // ---------- Pared ----------
  touchingWall(dir) {
    const b = this.body;
    const map = this.scene.map;
    const x = dir > 0 ? b.x + b.w + 0.5 : b.x - 0.5;
    const tx = Math.floor(x / TS);
    const y0 = Math.floor((b.y + 2) / TS);
    const y1 = Math.floor((b.y + b.h - 2) / TS);
    for (let ty = y0; ty <= y1; ty++) if (map.isSolid(tx, ty)) return true;
    return false;
  }

  updateCling(dt, moveX) {
    const b = this.body;
    if (b.onGround || this.planted || this.action === 'pound') {
      this.cling = null;
      this.clingLeft = C.CLING_TIME;
      return;
    }
    if (this.cling) {
      const d = this.cling.dir;
      // Se suelta: tiempo, alejarse de la pared o la pared se terminó
      if (!this.touchingWall(d) || moveX === -d || this.clingLeft <= 0) {
        this.cling = null;
        return;
      }
      this.clingLeft -= dt;
      b.vy = Math.min(b.vy, C.CLING_SLIDE);
      b.vx = 0;
      this.facing = -d;
      if (R.chance(0.25)) this.particles.spawn({ x: this.footX + d * (b.w / 2), y: this.footY - 2, vy: 10, life: 0.5, color: '#E8A040', gravity: 40 });
      return;
    }
    // Se pega al tocar una pared cayendo (si no está empujando hacia el otro lado)
    if (b.vy > 0 && this.clingLeft > 0) {
      for (const d of [-1, 1]) {
        if (moveX !== -d && this.touchingWall(d) && (moveX === d || Math.sign(b.vx) === d || b.hitWall === d)) {
          this.cling = { dir: d, t: 0 };
          b.vy = Math.min(b.vy, C.CLING_SLIDE);
          this.setSquash({ X: 0.82, Y: 1.12 });
          this.facing = -d;
          playSfx(this.audio, 'stick');
          break;
        }
      }
    }
  }

  wallJump() {
    const d = this.cling.dir;
    const b = this.body;
    this.cling = null;
    this.clingLeft = C.CLING_TIME; // puede volver a pegarse en la pared de enfrente
    b.vx = -d * C.WALL_JUMP_X;
    b.vy = C.WALL_JUMP_Y;
    this.js.jumping = true;
    this.js.coyote = 0;
    this.wallLock = C.WALL_JUMP_LOCK;
    this.facing = -d;
    this.anim.name = 'walljump';
    this.anim.t = 0;
    this.setSquash({ X: 0.75, Y: 1.28 });
    playSfx(this.audio, 'jump');
    this.particles.burst(this.footX + d * 7, this.cy, 6, { angle: d > 0 ? Math.PI : 0, spread: 1.2, speedMin: 20, speedMax: 60, colors: SUGAR, lifeMin: 0.15, lifeMax: 0.35 });
  }

  // ---------- Habilidades ----------
  startMazo() {
    this.action = 'mazo';
    this.actionT = 0;
    this.hitDone = false;
    this.cooldown = C.MAZO_COOLDOWN;
    playSfx(this.audio, 'swing');
  }

  // Zona del golpe del mazo (delante, a la altura del cuerpo)
  mazoBox() {
    const b = this.body;
    return { x: this.facing > 0 ? b.x + b.w : b.x - C.MAZO_RANGE, y: b.y - 2, w: C.MAZO_RANGE, h: b.h + 2 };
  }

  startPound() {
    this.action = 'pound';
    this.actionT = 0;
    this.poundPhase = 'hover';
    this.cling = null;
    this.body.vx = 0;
    this.body.vy = 0;
    this.setSquash({ X: 0.8, Y: 1.2 });
    playSfx(this.audio, 'spin');
  }

  updatePound(dt) {
    const b = this.body;
    const map = this.scene.map;
    this.actionT += dt;
    if (this.poundPhase === 'hover') {
      b.vx = 0;
      b.vy = 0;
      if (this.actionT >= C.POUND_HOVER) {
        this.poundPhase = 'dive';
        this.actionT = 0;
        playSfx(this.audio, 'dive');
      }
      return;
    }
    if (this.poundPhase === 'dive') {
      b.vx = 0;
      b.vy = C.POUND_SPEED;
      b.onGround = false;
      b.platform = null;
      moveY(b, b.vy * dt, map);
      // Estela
      this.particles.spawn({ x: this.footX + R.range(-5, 5), y: b.y + R.range(0, 6), vy: -30, life: 0.25, colors: ['#F2C46B', '#FFF1C2', '#C8782E'] });
      if (b.onGround) this.poundLand();
      return;
    }
    // Pose de impacto
    if (this.actionT >= C.POUND_RECOVER) this.action = null;
  }

  poundLand() {
    const b = this.body;
    this.poundPhase = 'land';
    this.actionT = 0;
    b.vy = 0;
    this.setSquash({ X: 1.45, Y: 0.62 });
    this.fx.hitstop(C.POUND_HITSTOP);
    this.fx.shake(C.POUND_SHAKE);
    playSfx(this.audio, 'pound');
    // Onda de choque a los dos lados
    for (const d of [-1, 1]) {
      this.particles.burst(this.footX + d * 6, this.footY - 1, 10, { angle: d > 0 ? 0 : Math.PI, spread: 0.35, speedMin: 60, speedMax: 150, colors: [...SUGAR, ...DUST], lifeMin: 0.2, lifeMax: 0.45, drag: 4, gravity: -30 });
    }
    this.particles.burst(this.footX, this.footY - 2, 8, { angle: -Math.PI / 2, spread: 1.5, speedMin: 30, speedMax: 90, colors: SUGAR, gravity: 300, lifeMin: 0.3, lifeMax: 0.6 });
    this.scene.pound?.(this.footX, this.footY, this);
  }

  startThrow(up) {
    this.action = 'throw';
    this.actionT = 0;
    this.hitDone = false;
    this.throwUp = up;
    this.melCooldown = C.MELCOCHA_COOLDOWN;
  }

  plant() {
    this.action = 'plant';
    this.actionT = 0;
    this.umbrella = false;
    this.body.vx = 0;
    this.setSquash({ X: 1.2, Y: 0.85 });
    this.fx.shake(0.12);
    playSfx(this.audio, 'plant');
    this.particles.burst(this.footX + this.facing * 8, this.footY - 1, 8, { angle: -Math.PI / 2, spread: 2, speedMin: 20, speedMax: 60, colors: DUST, lifeMin: 0.2, lifeMax: 0.4 });
  }

  unplant() {
    this.action = null;
    playSfx(this.audio, 'unplant');
  }

  updateAction(dt) {
    if (!this.action) return;
    this.actionT += dt;
    if (this.action === 'mazo') {
      const hitAt = C.MAZO_HIT_FRAME / ANIMS.mazo.fps;
      if (!this.hitDone && this.actionT >= hitAt) {
        this.hitDone = true;
        const box = this.mazoBox();
        const hit = this.scene.melee?.(box, C.MAZO_DAMAGE, this.facing, this);
        const fx = this.facing > 0 ? box.x + box.w - 2 : box.x + 2;
        if (hit) {
          this.fx.hitstop(3);
          playSfx(this.audio, 'mazoHit');
        }
        this.particles.burst(fx, this.body.y + 6, hit ? 10 : 4, { speedMin: 20, speedMax: hit ? 90 : 40, colors: hit ? ['#FFFFFF', '#FFD23F', '#F2C46B'] : DUST, lifeMin: 0.1, lifeMax: 0.25 });
      }
      if (this.actionT >= ANIMS.mazo.frames.length / ANIMS.mazo.fps) this.action = null;
    } else if (this.action === 'throw') {
      const at = 1 / ANIMS.throw.fps;
      if (!this.hitDone && this.actionT >= at) {
        this.hitDone = true;
        const vy = this.throwUp ? C.MELCOCHA_SPEED_Y_UP : C.MELCOCHA_SPEED_Y;
        this.scene.throwMelcocha?.(this.footX + this.facing * 9, this.footY - 12, this.facing * C.MELCOCHA_SPEED_X + this.body.vx * 0.3, vy, this);
        playSfx(this.audio, 'throw');
      }
      if (this.actionT >= ANIMS.throw.frames.length / ANIMS.throw.fps) this.action = null;
    }
  }

  // ---------- Daño ----------
  updateHazards() {
    const b = this.body;
    const map = this.scene.map;
    if (map.touchesSpikes(b.x, b.y, b.w, b.h)) this.hurt(this.cx - this.facing, { fromBelow: true });
    if (map.overlapsType(b.x, b.y, b.w, b.h, 4 /* T.VOID */, 3)) this.fall();
    if (b.y > map.pxH + HEALTH.FALL_DEATH_MARGIN) this.fall();
  }

  fall() {
    if (this.state !== 'play') return;
    this.scene.onPlayerFell?.(this);
  }

  // Plantada no la empujan: recibe el golpe pero no sale volando.
  hurt(sourceX, { fromBelow = false, damage = 1, knockback = true } = {}) {
    if (this.state !== 'play' || this.invuln > 0 || this.noclip) return false;
    if (this.scene.game.debug?.invincible) return false;
    const dir = Math.sign(this.cx - sourceX) || -this.facing;
    this.invuln = HEALTH.INVINCIBLE_TIME;
    this.flashT = CHOCO_FX.HIT_FLASH_TIME;
    if (knockback && !this.planted) {
      this.hurtT = HEALTH.HURT_POSE_TIME;
      this.action = this.action === 'pound' ? null : this.action;
      this.cling = null;
      this.body.vx = dir * HEALTH.KNOCKBACK_X * 0.8;
      this.body.vy = fromBelow ? HEALTH.KNOCKBACK_Y * 1.2 : HEALTH.KNOCKBACK_Y * 0.85;
      this.body.onGround = false;
      this.js.jumping = false;
    }
    this.setSquash(SQUASH.HURT);
    this.fx.hitstop(HEALTH.HURT_HITSTOP_FRAMES);
    this.fx.shake(EFFECTS.SHAKE_HURT);
    this.hp = this.scene.game.devMode ? Math.max(1, this.hp - damage) : this.hp - damage;
    playSfx(this.audio, 'hurt');
    // Se le caen granitos
    this.particles.burst(this.cx, this.cy, 10, { speedMin: 40, speedMax: 100, colors: SUGAR, gravity: 260, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
    this.scene.onPlayerDamaged?.(this);
    if (this.hp <= 0) this.die('hurt');
    return true;
  }

  die(cause) {
    if (this.state === 'dead') return;
    if (this.scene.game.devMode && cause !== 'fall') return;
    this.state = 'dead';
    this.deathCause = cause;
    this.hp = 0;
    this.deadT = 0;
    this.action = null;
    this.umbrella = false;
    this.cling = null;
    this.body.vx = 0;
    this.body.vy = 0;
    this.fx.hitstop(HEALTH.DEATH_HITSTOP_FRAMES);
    this.scene.onPlayerDied?.(this);
  }

  // ---------- Animación ----------
  handleMoveEvents(ev) {
    if (ev.jumped) {
      // Más marcado que Choco: es pesada
      this.setSquash({ X: 0.66, Y: 1.36 });
      playSfx(this.audio, 'jump');
      this.particles.burst(this.footX, this.footY, 6, { angle: -Math.PI / 2, spread: Math.PI * 0.9, speedMin: 15, speedMax: 45, colors: DUST, lifeMin: 0.15, lifeMax: 0.35, drag: 4 });
    }
    if (ev.landed) {
      const hard = ev.landVy >= EFFECTS.HARD_LANDING_VY;
      this.setSquash(ev.landVy > 150 ? { X: 1.42, Y: 0.62 } : SQUASH.LAND_SOFT);
      this.landT = ev.landVy > 150 ? 0.125 : 0.06;
      playSfx(this.audio, ev.landVy > 150 ? 'land' : 'landSoft');
      // Nubecita de azúcar
      const n = hard ? 14 : ev.landVy > 150 ? 8 : 3;
      for (const dir of [-1, 1]) {
        this.particles.burst(this.footX + dir * 5, this.footY - 1, n / 2, { angle: dir > 0 ? 0 : Math.PI, spread: 0.6, speedMin: 20, speedMax: 60, colors: [...DUST, PALETTE.c], lifeMin: 0.2, lifeMax: 0.45, drag: 5, gravity: -20 });
      }
      if (ev.landVy > 150) this.fx.shake(hard ? EFFECTS.SHAKE_LAND_HARD : 0.06); // leve shake (1 px)
    }
    if (this.body.hitCeiling) this.setSquash({ X: 1.15, Y: 0.85 });
  }

  setSquash(s) {
    this.squash.x = s.X;
    this.squash.y = s.Y;
    this.squash.vx = 0;
    this.squash.vy = 0;
  }

  updateSquash(dt) {
    const w = SQUASH.SPRING_FREQ;
    const z = SQUASH.SPRING_ZETA;
    const s = this.squash;
    for (const k of ['x', 'y']) {
      const v = k === 'x' ? 'vx' : 'vy';
      const a = -w * w * (s[k] - 1) - 2 * z * w * s[v];
      s[v] += a * dt;
      s[k] += s[v] * dt;
    }
  }

  selectAnim(moveX) {
    const b = this.body;
    if (this.state === 'victory') return 'victory';
    if (this.hurtT > 0) return 'hurt';
    if (this.action === 'pound') return 'pound';
    if (this.action === 'plant') return 'plant';
    if (this.action === 'mazo') return 'mazo';
    if (this.action === 'throw') return 'throw';
    if (this.cling) return 'cling';
    if (this.anim.name === 'walljump' && this.anim.t < ANIMS.walljump.frames.length / ANIMS.walljump.fps && !b.onGround) return 'walljump';
    if (this.umbrella) return Math.abs(b.vx) > 8 ? 'umbrellaWalk' : 'umbrella';
    if (this.riding && b.onGround && Math.abs(b.vx) < 8 && moveX === 0) return 'ride';
    if (!b.onGround) return b.vy < 0 ? 'jump' : 'fall';
    if (this.landT > 0) return 'land';
    if (b.onGround && moveX !== 0 && b.vx !== 0 && Math.sign(moveX) !== Math.sign(b.vx) && Math.abs(b.vx) > 45) return 'skid';
    if (Math.abs(b.vx) > 8 || moveX !== 0) return 'run';
    return 'idle';
  }

  updateAnim(dt, moveX) {
    const name = this.selectAnim(moveX);
    if (name !== this.anim.name) {
      // La sombrilla sigue su animación de abrir al pasar de quieta a caminar
      const keep = (name === 'umbrella' || name === 'umbrellaWalk') && (this.anim.name === 'umbrella' || this.anim.name === 'umbrellaWalk');
      this.anim.name = name;
      if (!keep) this.anim.t = 0;
      if (name === 'skid') playSfx(this.audio, 'skid');
    }
    let speed = 1;
    if (name === 'run') speed = Math.max(0.6, Math.abs(this.body.vx) / C.MAX_SPEED);
    this.anim.t += dt * speed;
  }

  // Frame a dibujar según la animación (el martillazo sigue sus fases, no el reloj)
  currentFrameDef() {
    const name = this.anim.name;
    const anim = ANIMS[name] || ANIMS.idle;
    if (name === 'pound') {
      const p = this.poundPhase;
      if (p === 'hover') return anim.frames[Math.floor(this.actionT * 30) % 2];
      if (p === 'dive') return anim.frames[2];
      return anim.frames[this.actionT < C.POUND_RECOVER / 2 ? 3 : 4];
    }
    if (name === 'umbrellaWalk') {
      // Sostiene la sombrilla ya abierta
      return anim.frames[Math.floor(this.anim.t * anim.fps) % anim.frames.length];
    }
    if (name === 'umbrella' && this.umbrellaT > 0.25 && this.anim.t > 0.25) return anim.frames[2];
    const n = anim.frames.length;
    const i = Math.floor(this.anim.t * anim.fps);
    return anim.frames[anim.loop ? i % n : Math.min(n - 1, i)];
  }

  updateFace(dt) {
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = CHOCO_FX.BLINK_TIME;
      this.blinkIn = R.range(CHOCO_FX.BLINK_MIN, CHOCO_FX.BLINK_MAX);
    }
    if (this.blinkT > 0) this.blinkT -= dt;
    // Un cristal de azúcar titila de vez en cuando
    this.twinkle.t -= dt;
    if (this.twinkle.t <= -0.6) this.twinkle = { i: R.int(0, CRYSTALS.length - 1), t: 0.15 };
  }

  currentFace() {
    if (this.hurtT > 0) return 'hurt';
    if (this.action === 'pound') return this.poundPhase === 'dive' ? 'effort' : 'determined';
    if (this.planted) return 'determined';
    if (!this.body.onGround && this.body.vy > 260) return 'panic';
    if (this.blinkT > 0) return 'blink';
    return 'normal';
  }

  // Capa de hoja: se estira al correr, sube al caer y cuelga quieta
  updateCape(dt) {
    const b = this.body;
    const anchorX = this.footX + (CAPE_ANCHOR.x - FRAME_W / 2) * this.facing;
    const f = this.currentFrameDef();
    const anchorY = this.footY + (CAPE_ANCHOR.y - ANCHOR_Y) + (f?.dy || 0);
    const speed = Math.abs(b.vx);
    let wx = -b.vx * 0.014 - this.facing * 0.45;
    const wy = 1 - Math.min(1.6, Math.max(-0.6, b.vy / 160));
    if (this.state === 'victory') wx = -this.facing * 1.2;
    let px = anchorX;
    let py = anchorY;
    for (let i = 0; i < this.cape.length; i++) {
      const p = this.cape[i];
      const flutter = Math.sin(this.t * (7 + speed * 0.05) + i * 1.1) * (0.12 + speed * 0.004);
      let dx = wx;
      let dy = wy + flutter;
      const d = Math.hypot(dx, dy) || 1;
      dx = (dx / d) * CAPE_LEN;
      dy = (dy / d) * CAPE_LEN;
      const k = Math.min(1, dt * (20 - i * 2));
      p.x += (px + dx - p.x) * k;
      p.y += (py + dy - p.y) * k;
      const ddx = p.x - px;
      const ddy = p.y - py;
      const dd = Math.hypot(ddx, ddy) || 1;
      p.x = px + (ddx / dd) * CAPE_LEN;
      p.y = py + (ddy / dd) * CAPE_LEN;
      px = p.x;
      py = p.y;
    }
  }

  updateGroundFx(dt) {
    const b = this.body;
    if (b.onGround && Math.abs(b.vx) > 40) {
      // Granitos de azúcar al correr
      this.sugarT -= dt;
      if (this.sugarT <= 0) {
        this.sugarT = 0.08;
        this.particles.spawn({ x: this.footX - this.facing * 5, y: this.footY - 3, vx: -this.facing * R.range(10, 30), vy: R.range(-50, -20), gravity: 300, life: 0.35, color: R.pick(SUGAR) });
      }
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.2;
        playSfx(this.audio, 'step');
      }
    }
    if (this.anim.name === 'skid') {
      this.particles.spawn({ x: this.footX + this.facing * 6, y: this.footY - 1, vx: this.facing * R.range(10, 40), vy: R.range(-25, -5), life: 0.3, color: R.pick(DUST), drag: 3 });
    }
    // Idle: cada tanto se sacude azúcar de la hoja
    if (this.anim.name === 'idle' && R.chance(0.004)) {
      this.particles.burst(this.footX, b.y + 1, 4, { angle: -Math.PI / 2, spread: 2, speedMin: 10, speedMax: 30, colors: SUGAR, gravity: 200, lifeMin: 0.3, lifeMax: 0.6 });
    }
    // Caramelizada: chispitas
    if (this.caramel && R.chance(0.2)) {
      this.particles.spawn({ x: this.footX + R.range(-7, 7), y: this.cy + R.range(-6, 6), vy: -20, life: 0.4, colors: ['#FFF1C2', '#FFB13B'] });
    }
  }

  // ---------- Red: estado para el compañero ----------
  netState() {
    const b = this.body;
    const r = (v) => Math.round(v * 10) / 10;
    const s = {
      x: r(this.footX),
      y: r(this.footY),
      vx: Math.round(b.vx),
      vy: Math.round(b.vy),
      f: this.facing,
      a: this.anim.name,
      at: Math.round(this.anim.t * 1000) / 1000,
      st: this.state,
      hp: this.hp,
      g: b.onGround ? 1 : 0,
      sq: [Math.round(this.squash.x * 100) / 100, Math.round(this.squash.y * 100) / 100],
    };
    if (this.invuln > 0) s.inv = 1;
    if (this.flashT > 0) s.fl = 1;
    if (this.hurtT > 0) s.hu = 1;
    if (this.action) s.ac = this.action;
    if (this.action === 'pound') s.pp = this.poundPhase;
    if (this.action) s.aT = Math.round(this.actionT * 1000) / 1000;
    if (this.umbrella) s.um = Math.round(this.umbrellaT * 100) / 100;
    if (this.cling) s.cl = this.cling.dir;
    if (this.caramel) s.car = 1;
    return s;
  }

  applyNet(s, dt) {
    const b = this.body;
    this.t += dt;
    b.x = s.x - b.w / 2;
    b.y = s.y - b.h;
    b.vx = s.vx || 0;
    b.vy = s.vy || 0;
    b.onGround = !!s.g;
    this.facing = s.f || 1;
    this.state = s.st || 'play';
    this.hp = s.hp ?? this.hp;
    this.anim.name = s.a || 'idle';
    this.anim.t = s.at || 0;
    if (s.sq) {
      this.squash.x = s.sq[0];
      this.squash.y = s.sq[1];
    }
    this.invuln = s.inv ? Math.max(this.invuln - dt, 0.5) : 0;
    this.flashT = s.fl ? 0.03 : 0;
    this.hurtT = s.hu ? 0.1 : 0;
    this.action = s.ac || null;
    this.poundPhase = s.pp || null;
    this.actionT = s.aT || 0;
    this.umbrella = s.um !== undefined;
    this.umbrellaT = s.um || 0;
    this.cling = s.cl ? { dir: s.cl, t: 0 } : null;
    this.caramel = !!s.car;
    this.updateFace(dt);
    this.updateCape(dt);
  }

  // ---------- Dibujo ----------
  draw(ctx, camX, camY) {
    if (this.state === 'dead') return;
    const footX = Math.round(this.footX - camX);
    const footY = Math.round(this.footY - camY);
    const flip = this.facing < 0;
    if (this.invuln > 0 && this.flashT <= 0 && Math.floor(this.invuln / CHOCO_FX.INVULN_BLINK) % 2 === 0) return;

    const f = this.currentFrameDef();
    const spr = tapitaFrame(f, this.currentFace(), { caramel: this.caramel });
    const sx = this.squash.x;
    const sy = this.squash.y;
    const dw = Math.max(1, Math.round(FRAME_W * sx));
    const dh = Math.max(1, Math.round(spr.h * sy));
    // Pegada a la pared: aplastada contra ella (el sprite es un poco más ancho que la hitbox)
    const dx = footX - Math.round(dw / 2) + (this.cling ? this.cling.dir * 2 : 0);
    // El ancla (pies) está en ANCHOR_Y, no en el borde de abajo del lienzo
    const dy = footY - Math.round(ANCHOR_Y * sy);

    if (!this.umbrella && !f.bare) this.drawCape(ctx, camX, camY);

    // Plantada: brillo en los bordes
    if (this.planted) {
      const glow = spr.tint('#FFD27A', flip);
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 12);
      for (const [ox, oy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ])
        ctx.drawImage(glow, dx + ox, dy + oy, dw, dh);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(spr.get(flip, this.flashT > 0), dx, dy, dw, dh);

    // Cristal de azúcar que titila
    if (this.twinkle.t > 0 && !f.bare) {
      const [cx0, cy0] = CRYSTALS[this.twinkle.i];
      const lx = flip ? FRAME_W - 1 - (OX + cx0) : OX + cx0;
      ctx.fillStyle = PALETTE.C;
      ctx.fillRect(dx + Math.floor((lx * dw) / FRAME_W), dy + Math.floor(((OY + cy0 + (f.dy || 0)) * dh) / spr.h), 1, 1);
    }
  }

  drawCape(ctx, camX, camY) {
    for (let i = this.cape.length - 1; i >= 0; i--) {
      const p = this.cape[i];
      const x = Math.round(p.x - camX);
      const y = Math.round(p.y - camY);
      const size = i < 2 ? 2 : 1;
      ctx.fillStyle = PALETTE.o;
      ctx.fillRect(x - 1, y - 1 + (size === 1 ? 1 : 0), size + 1, size + 1);
      ctx.fillStyle = CAPE_COLORS[i % CAPE_COLORS.length];
      ctx.fillRect(x, y, size, size);
    }
  }
}
