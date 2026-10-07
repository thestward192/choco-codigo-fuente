// Choco en vista cenital (niveles 2 y 3): camina en 8 direcciones con sprite de 4,
// empuja estantes (biblioteca), salta pilas de libros bajas con las Botas e interactúa con E.
// En el nivel 3 (scene.stealth): vida en cuadritos, caminar sigiloso (Shift), disparar el
// Báculo (normal y cargado), esconderse y el Escudo Firewall.
import { SCREEN, TOPDOWN, STAFF, HEALTH, SHIELD, STEALTH, TOPDOWN_SHOT } from '../config/balance.js';
import { createTopdownBody, stepTopdown, facingFrom, DIRS } from '../systems/topdown.js';
import { createShield, shieldPress, shieldUpdate, shieldOn } from '../systems/shield.js';
import { chocoTop } from '../art/topdown.js';
import { drawShieldBubble } from '../art/shield.js';
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
    // Nivel 3
    this.hp = 1;
    this.invuln = 0;
    this.hurtT = 0;
    this.sneaking = false;
    this.cooldown = 0;
    this.charging = false;
    this.chargeT = 0;
    this.chargeReady = false;
    this.shootPose = 0;
    this.shield = createShield();
    this.parryFlash = 0;
  }

  // Punto que miran los conos de visión (el centro del cuerpo)
  get eyeY() {
    return this.footY - 7;
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
    if (this.invuln > 0) this.invuln -= dt;
    if (this.parryFlash > 0) this.parryFlash -= dt * 3;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.shootPose > 0) this.shootPose -= dt;
    shieldUpdate(this.shield, dt);
    if (this.scene.game?.devMode) this.shield.cooldown = 0; // modo desarrolladora: sin recarga
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
      this.moving = false;
      this.stopCharge();
      return;
    }
    const s = this.scene;
    // Tras un golpe: retroceso sin control
    if (this.hurtT > 0) {
      this.hurtT -= dt;
      const sp = Math.max(Math.abs(this.body.vx), Math.abs(this.body.vy));
      stepTopdown(this.body, { x: Math.sign(this.body.vx), y: Math.sign(this.body.vy) }, dt, s.map, s.obstacles(), sp * 0.9);
      this.walkT = 0;
      this.moving = false;
      return;
    }
    const ix = inp.moveX();
    const iy = inp.moveY();
    this.dir = facingFrom(ix, iy, this.dir);
    // Salto corto sobre una pila de libros
    if (inp.pressed('jump') && this.tryHop()) return;

    let speed = TOPDOWN.WALK_SPEED;
    this.sneaking = !!s.stealth && inp.down('sneak');
    if (this.sneaking) speed = TOPDOWN.SNEAK_SPEED;
    if (this.charging && this.chargeT > STAFF.CHARGE_VISIBLE_AFTER) speed *= STAFF.CHARGE_MOVE_MULT;
    if (shieldOn(this.shield)) speed *= SHIELD.MOVE_MULT;
    stepTopdown(this.body, { x: ix, y: iy }, dt, s.map, s.obstacles(), speed);
    const moving = Math.abs(this.body.vx) + Math.abs(this.body.vy) > 8;
    if (moving) {
      this.walkT += dt * (this.sneaking ? 0.55 : 1);
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.sneaking ? 0.45 : 0.28;
        if (!this.sneaking) playSfx(s.game.audio, 'step');
        if (fxRng.chance(this.sneaking ? 0.15 : 0.5)) s.particles.spawn({ x: this.footX + fxRng.range(-3, 3), y: this.footY - 1, vx: fxRng.range(-10, 10), vy: -8, life: 0.25, color: s.stealth ? '#5A6E8C' : '#B07A4A', front: false });
      }
    } else this.walkT = 0;
    this.moving = moving;
    if (s.stealth) this.updateStaff(dt, inp);

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

  // ---------- Báculo (nivel 3): toque = disparo normal, mantener = cargado ----------
  updateStaff(dt, inp) {
    const s = this.scene;
    if (!this.items.staff || shieldOn(this.shield) || s.noShooting) {
      this.stopCharge();
      return;
    }
    if (inp.pressed('shoot')) {
      if (this.cooldown <= 0 && s.countShots(false) < STAFF.MAX_ON_SCREEN) this.fire(false);
      this.charging = true;
      this.chargeT = 0;
      this.chargeReady = false;
    }
    if (!this.charging) return;
    if (inp.down('shoot')) {
      this.chargeT += dt;
      const p = Math.min(1, this.chargeT / STAFF.CHARGE_TIME);
      if (this.chargeT > STAFF.CHARGE_VISIBLE_AFTER && fxRng.chance(0.4 + p * 0.4)) {
        const m = this.muzzle();
        const a = fxRng.range(0, Math.PI * 2);
        const d = fxRng.range(8, 14);
        s.particles.spawn({ x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d, life: 0.3, color: this.chargeReady ? '#FFFFFF' : '#43D9FF', attract: { x: m.x, y: m.y, strength: 400 } });
      }
      if (!this.chargeReady && this.chargeT >= STAFF.CHARGE_TIME) {
        this.chargeReady = true;
        playSfx(s.game.audio, 'chargeReady');
      }
    } else {
      if (this.chargeReady) this.fire(true);
      this.stopCharge();
    }
  }

  stopCharge() {
    this.charging = false;
    this.chargeT = 0;
    this.chargeReady = false;
  }

  // Salida del disparo: delante de Choco, a la altura del báculo
  muzzle() {
    const d = DIRS[this.dir];
    return { x: this.footX + d.x * TOPDOWN_SHOT.MUZZLE, y: this.footY - TOPDOWN_SHOT.HEIGHT + d.y * (TOPDOWN_SHOT.MUZZLE - 2) };
  }

  fire(charged) {
    const s = this.scene;
    const m = this.muzzle();
    const d = DIRS[this.dir];
    s.spawnShot(m.x, m.y, d.x, d.y, charged);
    this.cooldown = STAFF.COOLDOWN;
    this.shootPose = STAFF.SHOOT_POSE_TIME;
    playSfx(s.game.audio, charged ? 'shootCharged' : 'shoot');
    s.particles.burst(m.x, m.y, charged ? 10 : 4, { speedMin: 20, speedMax: charged ? 80 : 40, colors: ['#FFFFFF', '#43D9FF'], lifeMin: 0.1, lifeMax: 0.25 });
    if (charged) s.game.effects.shake(0.15);
    s.onChocoShot?.(charged);
  }

  // ---------- Escudo Firewall ----------
  activateShield() {
    if (!this.items.shield || this.state !== 'play') return false;
    if (!shieldPress(this.shield)) return false;
    this.stopCharge();
    playSfx(this.scene.game.audio, 'shieldOn');
    return true;
  }

  // ---------- Daño (nivel 3) ----------
  // Devuelve true si el golpe hizo efecto. (fromX, fromY): de dónde vino, para el retroceso.
  // harmless: solo empuja (disparos de práctica).
  hurt(fromX, fromY, { damage = 1, knock = STEALTH.HURT_KNOCKBACK, harmless = false } = {}) {
    const s = this.scene;
    if ((this.state !== 'play' && this.state !== 'hack') || this.invuln > 0 || this.grace > 0) return false;
    if (this.state === 'hack') {
      this.state = 'play';
      s.onHackInterrupted?.();
    }
    const dx = this.footX - fromX;
    const dy = this.eyeY - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.body.vx = (dx / d) * knock;
    this.body.vy = (dy / d) * knock;
    this.hurtT = HEALTH.HURT_POSE_TIME;
    this.stopCharge();
    s.game.effects.shake(0.35);
    if (harmless || s.game.debug?.invincible) {
      playSfx(s.game.audio, 'wallHit');
      this.invuln = 0.4;
      return true;
    }
    this.invuln = HEALTH.INVINCIBLE_TIME;
    s.game.effects.hitstop(HEALTH.HURT_HITSTOP_FRAMES);
    // Modo desarrolladora: el golpe se siente, pero nunca deja a Choco sin vida
    this.hp = s.game.devMode ? Math.max(1, this.hp - damage) : this.hp - damage;
    playSfx(s.game.audio, 'hurt');
    s.particles.burst(this.footX, this.eyeY, 10, { speedMin: 30, speedMax: 90, colors: ['#5C3521', '#83522F', '#B07A4A'], lifeMin: 0.3, lifeMax: 0.6, size: 2, endSize: 1 });
    s.onChocoDamaged?.(this.hp);
    return true;
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
    if (this.state === 'hidden') return;
    if (this.grace > 0 && Math.floor(this.grace * 14) % 2 === 0) return;
    if (this.invuln > 0 && this.hurtT <= 0 && Math.floor(this.invuln * 14) % 2 === 0) return;
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
    const staff = this.scene.stealth && this.items.staff;
    // Báculo detrás de Choco cuando mira hacia arriba
    if (staff && this.dir === 'up') this.drawStaff(ctx, fx, fy - z, frame);
    // Sigiloso: un poco agachado
    if (this.sneaking && this.walkT > 0) ctx.drawImage(spr.normal, 0, 0, 16, 15, fx - 8, fy - 15 - z, 16, 15);
    else ctx.drawImage(spr.normal, fx - 8, fy - 16 - z);
    if (this.hurtT > 0) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(spr.white, fx - 8, fy - 16 - z);
      ctx.globalAlpha = 1;
    }
    if (staff && this.dir !== 'up') this.drawStaff(ctx, fx, fy - z, frame);
    if (shieldOn(this.shield) || this.parryFlash > 0) {
      drawShieldBubble(ctx, fx, fy - 8 - z, { t: this.t, left: this.shield.active > 0 ? this.shield.active : undefined, parry: Math.max(0, this.parryFlash), r: SHIELD.RADIUS });
    }
    // LED de los audífonos
    if (this.dir !== 'up' && this.t % 1.2 < 0.25) {
      ctx.fillStyle = '#DFFAFF';
      const lx = this.dir === 'down' ? fx + 4 : this.dir === 'right' ? fx - 2 : fx + 1;
      ctx.fillRect(lx, fy - 16 - z + (this.dir === 'down' ? 9 : 7) + (frame % 2), 1, 1);
    }
    if (this.sneaking && this.walkT > 0 && Math.floor(this.t * 2) % 2 === 0) {
      ctx.fillStyle = '#8FB3D9';
      ctx.fillRect(fx + 7, fy - 19 - z, 1, 1);
      ctx.fillRect(fx + 9, fy - 21 - z, 1, 1);
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

  // Báculo en la mano (vertical) o apuntando al disparar
  drawStaff(ctx, fx, fy, frame) {
    const d = DIRS[this.dir];
    const shooting = this.shootPose > 0 || (this.charging && this.chargeT > STAFF.CHARGE_VISIBLE_AFTER);
    const glow = this.chargeReady ? (Math.floor(this.t * 20) % 2 ? '#FFFFFF' : '#43D9FF') : '#43D9FF';
    if (shooting) {
      const x0 = fx + d.x * 3;
      const y0 = fy - TOPDOWN_SHOT.HEIGHT + d.y * 2;
      ctx.fillStyle = '#6B4E3D';
      for (let i = 0; i < 6; i++) ctx.fillRect(x0 + d.x * i, y0 + d.y * i, 1, 1);
      ctx.fillStyle = glow;
      ctx.fillRect(x0 + d.x * 6 - (d.y ? 1 : 0), y0 + d.y * 6 - (d.x ? 1 : 0), d.y ? 3 : 1, d.x ? 3 : 1);
      return;
    }
    const sx = this.dir === 'left' ? fx + 4 : this.dir === 'right' ? fx - 5 : this.dir === 'up' ? fx - 6 : fx + 6;
    const sy = fy - 13 + (frame % 2);
    ctx.fillStyle = '#6B4E3D';
    ctx.fillRect(sx, sy + 2, 1, 9);
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(sx - 1, sy, 3, 3);
    ctx.fillStyle = glow;
    ctx.fillRect(sx, sy + 1, 1, 1);
  }
}
