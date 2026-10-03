// Choco en modo plataformas: física, báculo, vida, animación y efectos secundarios.
import { PLATFORMER, STAFF, HEALTH, EFFECTS, SQUASH, CHOCO_FX, SHIELD } from '../config/balance.js';
import { createShield, shieldPress, shieldUpdate, shieldOn, shieldBlock } from '../systems/shield.js';
import { drawShieldBubble } from '../art/shield.js';
import { createBody, createJumpState, stepPlatformer, stompBounce, moveY } from '../systems/physics.js';
import { ANIMS, FRAME_W, FRAME_H, LED_POS, SCARF_ANCHOR, chocoFrame, chocoMelt, withShootArms } from '../art/choco.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';
import { CHOCO } from '../art/palettes.js';

const R = fxRng;
const DUST = ['#8A8AA0', '#5A5F78', '#3A3F55'];
const CRUMBS = [CHOCO.b, CHOCO.l, CHOCO.s];
const COAT_COLOR = '#FFD27A';

export class Choco {
  constructor(scene, footX, footY) {
    this.scene = scene;
    this.body = createBody(footX - PLATFORMER.HITBOX_W / 2, footY - PLATFORMER.HITBOX_H, PLATFORMER.HITBOX_W, PLATFORMER.HITBOX_H);
    this.js = createJumpState();
    this.facing = 1;
    this.items = { staff: true, boots: false, laptop: false, shield: false, lasso: false };
    this.maxHp = HEALTH.START_MAX;
    this.hp = this.maxHp;
    this.coating = false;
    this.invuln = 0;
    this.hurtT = 0;
    this.flashT = 0;
    this.state = 'play'; // 'play' | 'dead' | 'victory' | 'frozen'
    this.forceAnim = null; // cinemáticas: animación forzada
    this.faceOverride = null; // cinemáticas: cara forzada
    this.deathCause = null;
    this.deadT = 0;

    this.anim = { name: 'idle', t: 0 };
    this.squash = { x: 1, y: 1, vx: 0, vy: 0 };
    this.landT = 0;
    this.spinT = 0;
    this.skidding = false;

    // Báculo
    this.cooldown = 0;
    this.poseT = 0;
    this.charging = false;
    this.chargeT = 0;
    this.chargeReady = false;
    this.chargeSound = null;

    // Escudo Firewall
    this.shield = createShield();
    this.parryFlash = 0;

    // Cara y detalles
    this.blinkIn = R.range(CHOCO_FX.BLINK_MIN, CHOCO_FX.BLINK_MAX);
    this.blinkT = 0;
    this.glareIn = CHOCO_FX.GLARE_EVERY;
    this.glareT = -1;
    this.t = 0;
    this.crumbT = 0;
    this.stepT = 0;
    this.moveInput = 0;

    // Bufanda de envoltura (movimiento secundario)
    this.scarf = [];
    for (let i = 0; i < CHOCO_FX.SCARF_SEGMENTS; i++) this.scarf.push({ x: footX - 5, y: footY - 12 + i * 2 });
  }

  // Mueve a Choco solo (cinemáticas): walk(dir) camina, jump() salta una vez.
  autoplay() {
    this.stopCharge();
    this.state = 'auto';
    const a = { dir: 0, jump: false, hold: false };
    this.auto = a;
    this.autoInput = {
      moveX: () => a.dir,
      buffered: (k) => k === 'jump' && a.jump,
      pressed: () => false,
      down: (k) => k === 'jump' && a.hold,
      consume: (k) => {
        if (k === 'jump') a.jump = false;
      },
    };
    return a;
  }

  get footX() {
    return this.body.x + this.body.w / 2;
  }
  get footY() {
    return this.body.y + this.body.h;
  }
  get cx() {
    return this.body.x + this.body.w / 2;
  }
  get cy() {
    return this.body.y + this.body.h / 2;
  }
  get alive() {
    return this.state !== 'dead';
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

  setMaxHp(n) {
    this.maxHp = Math.max(1, Math.min(HEALTH.MAX_POSSIBLE, n));
    this.hp = Math.min(this.hp, this.maxHp);
  }

  // ---------- Actualización ----------
  update(dt, inp) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.parryFlash > 0) this.parryFlash -= dt * 3;
    shieldUpdate(this.shield, dt);

    if (this.state === 'dead') {
      this.updateDead(dt);
      return;
    }
    if (this.state === 'victory' || this.state === 'frozen') {
      this.updateSquash(dt);
      this.updateAnim(dt, 0);
      this.updateScarf(dt);
      return;
    }

    // Movimiento guionado en cinemáticas: un "control" falso en lugar del teclado
    if (this.state === 'auto') inp = this.autoInput;
    if (this.hurtT > 0) this.hurtT -= dt;
    const control = this.hurtT <= 0;
    const moveX = control ? inp.moveX() : 0;
    this.moveInput = moveX;
    this.js.hasBoots = this.items.boots;

    const b = this.body;
    const ev = stepPlatformer(
      b,
      this.js,
      {
        moveX,
        jumpBuffered: control && inp.buffered('jump'),
        jumpHeld: inp.down('jump'),
        down: inp.down('down'),
        speedMult: (this.charging && this.chargeT > STAFF.CHARGE_VISIBLE_AFTER ? STAFF.CHARGE_MOVE_MULT : 1) * (shieldOn(this.shield) ? SHIELD.MOVE_MULT : 1),
      },
      dt,
      this.scene.map,
    );
    if (ev.consumedJump) inp.consume('jump');

    // Dirección
    if (moveX !== 0) this.facing = moveX;
    this.skidding = b.onGround && moveX !== 0 && b.vx !== 0 && Math.sign(moveX) !== Math.sign(b.vx) && Math.abs(b.vx) > PLATFORMER.SKID_MIN_SPEED;

    this.handleMoveEvents(ev);
    // Último punto seguro en tierra firme (para reaparecer tras caer al vacío)
    if (b.onGround && !this.scene.map.touchesSpikes(b.x - 4, b.y, b.w + 8, b.h + 1)) {
      this.safe = { x: this.footX, y: this.footY };
    }
    // Escudo Firewall (C): mientras está activo no se dispara
    if (control && this.items.shield && inp.pressed('shield') && shieldPress(this.shield)) {
      this.stopCharge();
      playSfx(this.audio, 'shieldOn');
    }
    if (!shieldOn(this.shield)) this.updateStaff(dt, inp);
    this.updateHazards();
    if (this.state === 'dead') return;

    if (this.landT > 0) this.landT -= dt;
    if (this.spinT > 0) this.spinT -= dt;
    this.updateSquash(dt);
    this.updateAnim(dt, moveX);
    this.updateFace(dt);
    this.updateScarf(dt);
    this.updateGroundFx(dt);
  }

  handleMoveEvents(ev) {
    const b = this.body;
    if (ev.jumped) {
      this.setSquash(SQUASH.JUMP);
      playSfx(this.audio, 'jump');
      this.particles.burst(this.footX, this.footY, 5, { angle: -Math.PI / 2, spread: Math.PI * 0.9, speedMin: 15, speedMax: 45, colors: DUST, lifeMin: 0.15, lifeMax: 0.35, drag: 4 });
    }
    if (ev.doubleJumped) {
      this.setSquash(SQUASH.DOUBLE_JUMP);
      this.spinT = CHOCO_FX.SPIN_TIME;
      playSfx(this.audio, 'doubleJump');
      // Anillo de partículas bajo los pies
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.particles.spawn({ x: this.footX, y: this.footY, vx: Math.cos(a) * 60, vy: Math.sin(a) * 14 + 10, life: 0.3, colors: ['#FFFFFF', '#43D9FF', '#2A6F8A'], drag: 5 });
      }
    }
    if (ev.dropped) this.setSquash({ X: 0.9, Y: 1.1 });
    if (ev.landed) {
      const hard = ev.landVy >= EFFECTS.HARD_LANDING_VY;
      this.setSquash(ev.landVy > 150 ? SQUASH.LAND : SQUASH.LAND_SOFT);
      this.landT = ev.landVy > 150 ? CHOCO_FX.LAND_POSE_TIME : CHOCO_FX.LAND_POSE_TIME * 0.5;
      playSfx(this.audio, ev.landVy > 150 ? 'land' : 'landSoft');
      const n = hard ? 12 : ev.landVy > 150 ? 8 : 3;
      for (const dir of [-1, 1]) {
        this.particles.burst(this.footX + dir * 4, this.footY - 1, n / 2, { angle: dir > 0 ? 0 : Math.PI, spread: 0.6, speedMin: 20, speedMax: 60, colors: DUST, lifeMin: 0.2, lifeMax: 0.45, drag: 5, gravity: -20 });
      }
      if (hard) this.fx.shake(EFFECTS.SHAKE_LAND_HARD);
    }
    if (b.hitCeiling) this.setSquash({ X: 1.15, Y: 0.85 });
  }

  // ---------- Báculo ----------
  updateStaff(dt, inp) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.poseT > 0) this.poseT -= dt;
    if (!this.items.staff) return;
    const canAct = this.hurtT <= 0;
    const pressedNow = inp.pressed('shoot');

    if (canAct && inp.buffered('shoot') && this.cooldown <= 0 && this.scene.countShots(false) < STAFF.MAX_ON_SCREEN) {
      inp.consume('shoot');
      this.fire(false);
    }
    // La carga empieza al presionar y sigue mientras se mantenga
    if (pressedNow && canAct) {
      this.charging = true;
      this.chargeT = 0;
      this.chargeReady = false;
    }
    if (!this.charging) return;
    if (inp.down('shoot')) {
      this.chargeT += dt;
      const p = Math.min(1, this.chargeT / STAFF.CHARGE_TIME);
      if (this.chargeT > STAFF.CHARGE_VISIBLE_AFTER) {
        if (!this.chargeSound) this.chargeSound = this.audio.sustained({ wave: 'pulse25', f0: 180, vol: 0.06 });
        this.chargeSound.update(180 + 520 * p, this.chargeReady ? 18 : 0);
        // Partículas absorbidas hacia el báculo
        if (R.chance(0.5 + p * 0.4)) {
          const m = this.muzzle();
          const a = R.range(0, Math.PI * 2);
          const d = R.range(10, 18);
          this.particles.spawn({ x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d, life: 0.35, color: this.chargeReady ? '#FFFFFF' : '#43D9FF', attract: { x: m.x, y: m.y, strength: 500 } });
        }
      }
      if (!this.chargeReady && this.chargeT >= STAFF.CHARGE_TIME) {
        this.chargeReady = true;
        playSfx(this.audio, 'chargeReady');
        const m = this.muzzle();
        this.particles.burst(m.x, m.y, 8, { speedMin: 30, speedMax: 60, colors: ['#FFFFFF', '#43D9FF'], lifeMin: 0.15, lifeMax: 0.3 });
      }
    } else {
      if (this.chargeReady && canAct) this.fire(true);
      this.stopCharge();
    }
  }

  stopCharge() {
    this.charging = false;
    this.chargeT = 0;
    this.chargeReady = false;
    if (this.chargeSound) {
      this.chargeSound.stop();
      this.chargeSound = null;
    }
  }

  muzzle() {
    const f = this.currentFrameDef();
    return { x: this.footX + this.facing * STAFF.MUZZLE_X, y: this.footY + STAFF.MUZZLE_Y + (f?.dy || 0) };
  }

  fire(charged) {
    const m = this.muzzle();
    this.scene.spawnShot(m.x, m.y, this.facing, charged);
    this.poseT = STAFF.SHOOT_POSE_TIME;
    this.anim.t = this.anim.name === 'shoot' ? 0 : this.anim.t;
    if (charged) {
      this.cooldown = STAFF.COOLDOWN;
      this.setSquash({ X: 1.18, Y: 0.86 });
      this.body.vx -= this.facing * 40; // retroceso
      this.fx.shake(EFFECTS.SHAKE_CHARGED);
      playSfx(this.audio, 'shootCharged');
      this.particles.burst(m.x, m.y, 14, { angle: this.facing > 0 ? 0 : Math.PI, spread: 1.4, speedMin: 40, speedMax: 120, colors: ['#FFFFFF', '#43D9FF', '#2AA8D8'], lifeMin: 0.15, lifeMax: 0.35, drag: 4 });
    } else {
      this.cooldown = STAFF.COOLDOWN;
      playSfx(this.audio, 'shoot');
      this.particles.burst(m.x, m.y, 4, { angle: this.facing > 0 ? 0 : Math.PI, spread: 1.2, speedMin: 30, speedMax: 70, colors: ['#FFFFFF', '#43D9FF'], lifeMin: 0.08, lifeMax: 0.18 });
    }
  }

  // ---------- Peligros y daño ----------
  updateHazards() {
    const b = this.body;
    const map = this.scene.map;
    if (map.touchesSpikes(b.x, b.y, b.w, b.h)) this.hurt(this.cx - this.facing, { fromBelow: true });
    if (map.overlapsType(b.x, b.y, b.w, b.h, 4 /* T.VOID */, 3)) this.die('void');
    if (b.y > map.pxH + HEALTH.FALL_DEATH_MARGIN) this.die('fall');
  }

  // Recibe un golpe desde la posición x de la fuente. Devuelve true si hizo efecto.
  hurt(sourceX, { fromBelow = false, damage = 1, projectile = null } = {}) {
    if (this.state !== 'play' || this.invuln > 0) return false;
    if (this.scene.game.debug?.invincible) return false;
    // El escudo bloquea golpes y proyectiles; activado justo antes, refleja (parry)
    const blocked = shieldBlock(this.shield);
    if (blocked) {
      if (blocked === 'parry') {
        this.parryFlash = 1;
        this.fx.hitstop(SHIELD.PARRY_HITSTOP);
        this.fx.flash('#FFFFFF', 2);
        playSfx(this.audio, 'parry');
        projectile?.reflect?.(this.scene);
      } else playSfx(this.audio, 'shieldBlock');
      this.particles.burst(this.cx, this.cy, blocked === 'parry' ? 16 : 8, { speedMin: 30, speedMax: 110, colors: ['#FFFFFF', '#8AE8FF', '#43D9FF'], lifeMin: 0.15, lifeMax: 0.4 });
      this.body.vx = Math.sign(this.cx - sourceX || -this.facing) * 60;
      return false;
    }
    const dir = Math.sign(this.cx - sourceX) || -this.facing;
    this.invuln = HEALTH.INVINCIBLE_TIME;
    this.hurtT = HEALTH.HURT_POSE_TIME;
    this.flashT = CHOCO_FX.HIT_FLASH_TIME;
    this.stopCharge();
    this.body.vx = dir * HEALTH.KNOCKBACK_X;
    this.body.vy = fromBelow ? HEALTH.KNOCKBACK_Y * 1.3 : HEALTH.KNOCKBACK_Y;
    this.body.onGround = false;
    this.js.jumping = false;
    this.setSquash(SQUASH.HURT);
    this.fx.hitstop(HEALTH.HURT_HITSTOP_FRAMES);
    this.fx.shake(EFFECTS.SHAKE_HURT);

    if (this.coating) {
      this.coating = false;
      playSfx(this.audio, 'coatingBreak');
      this.particles.burst(this.cx, this.cy, 16, { speedMin: 40, speedMax: 110, colors: ['#FFD27A', '#F6DE8A', '#FFFFFF'], gravity: 200, lifeMin: 0.3, lifeMax: 0.6 });
      return true;
    }
    // Prólogo: sin muerte posible (el golpe empuja y parpadea, pero no quita vida)
    if (this.scene.noDeath) {
      playSfx(this.audio, 'hurt');
      return true;
    }
    this.hp -= damage;
    this.scene.onChocoDamaged?.(this.hp);
    playSfx(this.audio, 'hurt');
    this.particles.burst(this.cx, this.cy, 10, { speedMin: 40, speedMax: 100, colors: CRUMBS, gravity: 260, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
    if (this.hp <= 0) this.die('hurt');
    return true;
  }

  die(cause) {
    if (this.state === 'dead') return;
    if (this.scene.game.debug?.invincible && cause !== 'fall' && cause !== 'void') return;
    if (cause === 'fall' || cause === 'void') {
      // Caer al vacío también cuesta un cuadrito; si queda vida, reaparece en tierra firme.
      this.scene.onChocoFell?.(this);
      return;
    }
    this.state = 'dead';
    this.deathCause = cause;
    this.hp = 0;
    this.deadT = 0;
    this.stopCharge();
    this.body.vx = 0;
    this.body.vy = 0;
    this.fx.hitstop(HEALTH.DEATH_HITSTOP_FRAMES);
    this.fx.shake(EFFECTS.SHAKE_HURT);
    playSfx(this.audio, 'melt');
    this.scene.onChocoDied?.(this);
  }

  // Muerte definitiva por caída (sin cuadritos): sin animación visible, solo sonido.
  dieByFall() {
    this.state = 'dead';
    this.deathCause = 'fall';
    this.hp = 0;
    this.deadT = 0;
    this.stopCharge();
    playSfx(this.audio, 'fall');
    this.scene.onChocoDied?.(this);
  }

  updateDead(dt) {
    this.deadT += dt;
    const b = this.body;
    // Sigue cayendo hasta tocar suelo (para derretirse en el piso)
    if (this.deathCause !== 'fall' && !b.onGround) {
      b.vy = Math.min(b.vy + PLATFORMER.GRAVITY_DOWN * dt, PLATFORMER.MAX_FALL);
      moveY(b, b.vy * dt, this.scene.map);
    }
    // Gotitas de chocolate mientras se derrite
    const frame = Math.floor(this.deadT * HEALTH.MELT_FPS);
    if (this.deathCause !== 'fall' && frame < 8 && R.chance(0.3)) {
      this.particles.spawn({ x: this.footX + R.range(-6, 6), y: this.footY - R.range(0, 10), vx: R.range(-10, 10), vy: R.range(-20, 0), gravity: 300, life: 0.4, color: R.pick(CRUMBS) });
    }
    this.updateSquash(dt);
  }

  get meltDone() {
    return this.deadT >= 8 / HEALTH.MELT_FPS + HEALTH.RESPAWN_DELAY;
  }

  // Pisotón exitoso sobre un enemigo
  stomp(inp) {
    stompBounce(this.body, this.js, inp.down('jump'));
    this.setSquash(SQUASH.STOMP);
    this.fx.hitstop(EFFECTS.HITSTOP_STOMP);
    this.fx.shake(EFFECTS.SHAKE_STOMP);
  }

  // ---------- Animación ----------
  setSquash(s) {
    this.squash.x = s.X;
    this.squash.y = s.Y;
    this.squash.vx = 0;
    this.squash.vy = 0;
  }

  updateSquash(dt) {
    // Resorte amortiguado hacia 1 (rebota un poco: se siente elástico)
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
    if (this.forceAnim) return this.forceAnim;
    if (this.state === 'victory') return 'victory';
    if (this.hurtT > 0) return 'hurt';
    if (!b.onGround) {
      if (this.spinT > 0) return 'spin';
      return b.vy < 0 ? 'jump' : 'fall';
    }
    if (this.landT > 0) return 'land';
    if (this.skidding) return 'skid';
    if (Math.abs(b.vx) > CHOCO_FX.RUN_ANIM_MIN_SPEED || moveX !== 0) return 'run';
    return 'idle';
  }

  updateAnim(dt, moveX) {
    const name = this.selectAnim(moveX);
    if (name !== this.anim.name) {
      this.anim.name = name;
      this.anim.t = 0;
      if (name === 'skid') playSfx(this.audio, 'skid');
    }
    let speed = 1;
    if (name === 'run') speed = Math.max(0.55, Math.abs(this.body.vx) / PLATFORMER.MAX_SPEED);
    this.anim.t += dt * speed;
  }

  frameIndex(anim, t) {
    const n = anim.frames.length;
    const i = Math.floor(t * anim.fps);
    return anim.loop ? i % n : Math.min(n - 1, i);
  }

  // Frame lógico actual (con brazos de disparo si corresponde)
  currentFrameDef() {
    const name = this.anim.name;
    const shooting = this.poseT > 0 || (this.charging && this.chargeT > STAFF.CHARGE_VISIBLE_AFTER);
    if (shooting && name === 'idle') {
      const a = this.poseT > 0 ? ANIMS.shoot : ANIMS.charge;
      const t = this.poseT > 0 ? STAFF.SHOOT_POSE_TIME - this.poseT : this.chargeT;
      return a.frames[this.frameIndex(a, t)];
    }
    const anim = ANIMS[name];
    let f = anim.frames[this.frameIndex(anim, name === 'jump' ? (this.anim.t > CHOCO_FX.JUMP_POSE_SWITCH ? 1 : 0) / anim.fps : this.anim.t)];
    if (shooting && name !== 'spin' && name !== 'hurt') f = withShootArms(f);
    return f;
  }

  updateFace(dt) {
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = CHOCO_FX.BLINK_TIME;
      this.blinkIn = R.range(CHOCO_FX.BLINK_MIN, CHOCO_FX.BLINK_MAX);
    }
    if (this.blinkT > 0) this.blinkT -= dt;
    if (this.anim.name === 'idle') {
      this.glareIn -= dt;
      if (this.glareIn <= 0) {
        this.glareT = 0;
        this.glareIn = CHOCO_FX.GLARE_EVERY + R.range(0, 2);
      }
    }
    if (this.glareT >= 0) {
      this.glareT += dt;
      if (this.glareT > CHOCO_FX.GLARE_STEP * 3) this.glareT = -1;
    }
  }

  currentFace() {
    if (this.faceOverride) return this.faceOverride;
    if (this.hurtT > 0) return 'hurt';
    if (!this.body.onGround && this.body.vy > 250) return 'panic';
    if (this.blinkT > 0) return 'blink';
    if (this.glareT >= 0) return `glare${Math.min(2, Math.floor(this.glareT / CHOCO_FX.GLARE_STEP))}`;
    return 'normal';
  }

  updateScarf(dt) {
    const b = this.body;
    const anchorX = this.footX + (SCARF_ANCHOR.x - FRAME_W / 2) * this.facing;
    const f = this.currentFrameDef();
    const anchorY = this.footY + (SCARF_ANCHOR.y - FRAME_H) + (f?.dy || 0);
    const speed = Math.abs(b.vx);
    // Viento relativo: al correr se estira hacia atrás; al caer sube; quieto cuelga
    let wx = -b.vx * 0.012 - this.facing * 0.35;
    let wy = 1 - Math.min(1.6, Math.max(-0.6, b.vy / 180));
    if (this.state === 'victory') {
      wx = -this.facing * 1.2;
      wy = -0.1;
    }
    const segLen = CHOCO_FX.SCARF_SEG_LEN;
    let px = anchorX;
    let py = anchorY;
    for (let i = 0; i < this.scarf.length; i++) {
      const p = this.scarf[i];
      const flutter = Math.sin(this.t * (8 + speed * 0.05) + i * 0.9) * (0.15 + speed * 0.004 + (this.state === 'victory' ? 0.3 : 0));
      let dx = wx;
      let dy = wy + flutter;
      const d = Math.hypot(dx, dy) || 1;
      dx = (dx / d) * segLen;
      dy = (dy / d) * segLen;
      const tx = px + dx;
      const ty = py + dy;
      const k = Math.min(1, dt * (22 - i * 2));
      p.x += (tx - p.x) * k;
      p.y += (ty - p.y) * k;
      // Mantener la longitud
      const ddx = p.x - px;
      const ddy = p.y - py;
      const dd = Math.hypot(ddx, ddy) || 1;
      p.x = px + (ddx / dd) * segLen;
      p.y = py + (ddy / dd) * segLen;
      px = p.x;
      py = p.y;
    }
  }

  updateGroundFx(dt) {
    const b = this.body;
    if (b.onGround && Math.abs(b.vx) > 60) {
      this.crumbT -= dt;
      if (this.crumbT <= 0) {
        this.crumbT = CHOCO_FX.CRUMB_EVERY;
        this.particles.spawn({ x: this.footX - this.facing * 4, y: this.footY - 2, vx: -this.facing * R.range(10, 30), vy: R.range(-50, -20), gravity: 300, life: 0.35, color: R.pick(CRUMBS) });
      }
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = CHOCO_FX.STEP_SOUND_EVERY;
        playSfx(this.audio, 'step');
      }
    }
    if (this.skidding) {
      this.particles.spawn({ x: this.footX + this.facing * 5, y: this.footY - 1, vx: this.facing * R.range(10, 40), vy: R.range(-25, -5), life: 0.3, color: R.pick(DUST), drag: 3 });
    }
    // Chispas del giro del doble salto
    if (this.spinT > 0) {
      this.particles.spawn({ x: this.cx + R.range(-5, 5), y: this.cy + R.range(-6, 8), vx: R.range(-10, 10), vy: R.range(0, 20), life: 0.3, colors: ['#FFFFFF', '#FFD23F', '#43D9FF'] });
    }
    // Destellos de la cobertura de cacao
    if (this.coating && R.chance(0.12)) {
      this.particles.spawn({ x: this.cx + R.range(-7, 7), y: this.cy + R.range(-10, 10), vy: -12, life: 0.4, colors: ['#FFFFFF', '#FFD27A'] });
    }
  }

  // ---------- Dibujo ----------
  draw(ctx, camX, camY) {
    const footX = Math.round(this.footX - camX);
    const footY = Math.round(this.footY - camY);
    const flip = this.facing < 0;

    if (this.state === 'dead') {
      if (this.deathCause === 'fall') return;
      const k = Math.min(7, Math.floor(this.deadT * HEALTH.MELT_FPS));
      const spr = chocoMelt(k);
      ctx.drawImage(spr.get(flip), footX - FRAME_W / 2, footY - FRAME_H);
      return;
    }

    // Parpadeo de invencibilidad
    if (this.invuln > 0 && this.flashT <= 0 && Math.floor(this.invuln / CHOCO_FX.INVULN_BLINK) % 2 === 0) return;

    const f = this.currentFrameDef();
    const spr = chocoFrame(f, this.currentFace(), this.items.staff);
    const spin = f.spinX ?? 1;
    const sx = this.squash.x * spin;
    const sy = this.squash.y;
    const dw = Math.max(1, Math.round(FRAME_W * sx));
    const dh = Math.max(1, Math.round(FRAME_H * sy));
    const dx = footX - Math.round(dw / 2);
    const dy = footY - dh;

    this.drawScarf(ctx, camX, camY);

    if (this.coating) {
      const glow = spr.tint(COAT_COLOR, flip);
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(this.t * 10);
      ctx.drawImage(glow, dx - 1, dy, dw, dh);
      ctx.drawImage(glow, dx + 1, dy, dw, dh);
      ctx.drawImage(glow, dx, dy - 1, dw, dh);
      ctx.drawImage(glow, dx, dy + 1, dw, dh);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(spr.get(flip, this.flashT > 0), dx, dy, dw, dh);

    // LED de los audífonos
    if (!f.back && this.t % CHOCO_FX.LED_PERIOD < CHOCO_FX.LED_ON) {
      const lx = flip ? FRAME_W - 1 - LED_POS.x : LED_POS.x;
      ctx.fillStyle = CHOCO.c;
      ctx.fillRect(dx + Math.floor((lx * dw) / FRAME_W), dy + Math.floor(((LED_POS.y + f.dy) * dh) / FRAME_H), 1, 1);
    }

    // Burbuja del Escudo Firewall
    if (shieldOn(this.shield) || this.parryFlash > 0) {
      drawShieldBubble(ctx, footX, footY - 11, { t: this.t, left: this.shield.active > 0 ? this.shield.active : undefined, parry: Math.max(0, this.parryFlash), r: SHIELD.RADIUS + 2 });
    }

    // Brillo del báculo al cargar
    if (this.charging && this.chargeT > STAFF.CHARGE_VISIBLE_AFTER) {
      const m = this.muzzle();
      const mx = Math.round(m.x - camX);
      const my = Math.round(m.y - camY);
      const p = Math.min(1, this.chargeT / STAFF.CHARGE_TIME);
      const r = Math.round(1 + p * 4 + (this.chargeReady ? Math.sin(this.t * 30) : 0));
      ctx.globalAlpha = 0.35 + p * 0.35;
      ctx.fillStyle = this.chargeReady && Math.floor(this.t * 20) % 2 ? '#FFFFFF' : '#43D9FF';
      for (let yy = -r; yy <= r; yy++) {
        const hw = Math.round(Math.sqrt(r * r - yy * yy));
        ctx.fillRect(mx - hw, my + yy, hw * 2 + 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(mx - 1, my - 1, 2, 2);
    }
  }

  drawScarf(ctx, camX, camY) {
    const cols = [CHOCO.w, CHOCO.y, CHOCO.w, CHOCO.W, CHOCO.w, CHOCO.W];
    for (let i = this.scarf.length - 1; i >= 0; i--) {
      const p = this.scarf[i];
      const x = Math.round(p.x - camX);
      const y = Math.round(p.y - camY);
      const size = i < 3 ? 2 : 1;
      ctx.fillStyle = CHOCO.o;
      ctx.fillRect(x - 1, y - 1 + (size === 1 ? 1 : 0), size + 1, size + 1);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x, y, size, size);
    }
  }
}
