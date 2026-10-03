// Enemigos de sigilo del nivel 3 · Novacomp — docs/niveles/nivel_3_novacomp.md
//   BotSeg: patrulla una ruta fija con cono de visión; sospecha ("?"), investiga, persigue ("!").
//   Cámara: fija, barre un arco con pausas.
//   Dron: vuela en círculos con visión circular.
//   Láser: barrera que se prende y apaga con ritmo (parpadea antes de prenderse).
//   Aspiradora robot: anda al azar; si choca con Choco hace ruido.
//   Torreta de práctica: dispara despacio contra Choco (sala del escudo).
// Reciben un "mundo" con: isOpaque, passable, clouds, target { x, y, footX, footY, visible },
// alarm, path(x0, y0, x1, y1), noticed(e), raiseAlarm(e), spotted(e).
import { SCREEN, STEALTH, TURRET } from '../../config/balance.js';
import { canSee, stepSuspicion, angleDiff } from '../../systems/vision.js';
import { botSprite, botVisor, droneSprite, vacuumSprite, turretSprite, drawSecurityCamera } from '../../art/enemies/novacomp.js';
import { drawText } from '../../art/font.js';
import { fxRng } from '../../core/rng.js';

const TS = SCREEN.TILE;
const R = fxRng;
const D2R = Math.PI / 180;
export const tileCenter = ([tx, ty]) => ({ x: tx * TS + 8, y: ty * TS + 12 });

function turnTo(a, target, maxStep) {
  const d = angleDiff(target, a);
  if (Math.abs(d) <= maxStep) return target;
  return a + Math.sign(d) * maxStep;
}

// Marca sobre la cabeza: medidor de sospecha, "?" o "!"
function drawMark(ctx, x, y, e, t) {
  if (e.state === 'chase' || e.alarmMark > 0 || e.chasing) {
    const pop = e.markT < 0.2 ? Math.round((0.2 - e.markT) * 20) : 0;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 3, y - 11 - pop, 7, 11);
    ctx.fillStyle = Math.floor(t * 8) % 2 ? '#FF5A5A' : '#E0343F';
    ctx.fillRect(x - 1, y - 10 - pop, 3, 6);
    ctx.fillRect(x - 1, y - 3 - pop, 3, 2);
    return;
  }
  if (e.sus > 0) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 7, y - 4, 14, 4);
    ctx.fillStyle = '#3A3A4A';
    ctx.fillRect(x - 6, y - 3, 12, 2);
    ctx.fillStyle = e.sus > 0.66 ? '#FF8A3D' : '#FFD23F';
    ctx.fillRect(x - 6, y - 3, Math.max(1, Math.round(12 * e.sus)), 2);
  }
  if (e.state === 'investigate' || e.state === 'look' || (e.sus > 0 && !e.seen)) {
    drawText(ctx, '?', x, y - 13, { align: 'center', color: '#FFD23F' });
  }
}

// ============================================================================
// BotSeg
// ============================================================================
export class BotSeg {
  constructor(def) {
    this.id = def.id;
    this.kind = 'bot';
    this.path = def.path.map(tileCenter);
    this.loop = !!def.loop;
    this.alt = def.alt ? def.alt.map(tileCenter) : null;
    this.range = def.range || STEALTH.BOT_RANGE;
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.i = 0;
    this.dirStep = 1;
    const n = this.path[1] || this.path[0];
    this.facing = Math.atan2(n.y - this.y, n.x - this.x) || Math.PI / 2;
    this.state = 'patrol';
    this.wait = R.range(0, 0.5);
    this.sus = 0;
    this.seen = false;
    this.route = null;
    this.stun = 0;
    this.lookT = 0;
    this.repath = 0;
    this.lastSeen = null;
    this.markT = 1;
    this.alarmMark = 0;
    this.t = R.range(0, 2);
    this.walk = 0;
    this.moving = false;
    this.diverted = false;
  }

  viewer() {
    return { x: this.x, y: this.y - 6, facing: this.facing, half: STEALTH.CONE_HALF, range: this.range };
  }
  get active() {
    return this.stun <= 0;
  }
  get hitbox() {
    return { x: this.x - 6, y: this.y - 8, w: 12, h: 8 };
  }
  get shotBox() {
    return { x: this.x - 6, y: this.y - 15, w: 12, h: 15 };
  }

  nextIndex() {
    const n = this.path.length;
    if (n < 2) return 0;
    if (this.loop) return (this.i + 1) % n;
    let j = this.i + this.dirStep;
    if (j < 0 || j >= n) {
      this.dirStep *= -1;
      j = this.i + this.dirStep;
    }
    return j;
  }

  // Avanza hacia (tx, ty). Devuelve true al llegar.
  moveTo(tx, ty, speed, dt, turn = 8) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = speed * dt;
    if (d > 0.5) this.facing = turnTo(this.facing, Math.atan2(dy, dx), turn * dt);
    if (d <= step) {
      this.x = tx;
      this.y = ty;
      return true;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.moving = true;
    return false;
  }

  // Sigue this.route (lista de puntos). Devuelve true al terminar.
  followRoute(speed, dt) {
    if (!this.route || this.route.length === 0) return true;
    const p = this.route[0];
    if (this.moveTo(p.x, p.y, speed, dt, 10)) this.route.shift();
    return this.route.length === 0;
  }

  investigate(pt, w, { mark = true } = {}) {
    if (!pt) return;
    this.state = 'investigate';
    this.route = w.path(this.x, this.y, pt.x, pt.y);
    if (!this.route) this.startLook();
    if (mark) this.markT = 0;
  }

  startLook() {
    this.state = 'look';
    this.lookT = 0;
    this.lookBase = this.facing;
    this.route = null;
  }

  // Ruido: va a revisar el punto (si no está persiguiendo)
  hear(x, y, w) {
    if (!this.active || this.state === 'chase') return;
    this.investigate({ x, y }, w);
  }

  // Alarma: todos persiguen
  alert() {
    if (!this.active) return;
    this.state = 'chase';
    this.markT = 0;
    this.repath = 0;
    this.route = null;
  }

  calm() {
    if (this.state === 'chase' || this.state === 'investigate' || this.state === 'look') this.state = 'return';
    this.sus = 0;
    this.route = null;
  }

  divert() {
    if (!this.alt || this.diverted) return;
    this.diverted = true;
    this.path = this.alt;
    this.loop = false;
    this.i = 0;
    this.dirStep = 1;
    this.state = 'return';
    this.route = null;
  }

  stunFor(t) {
    this.stun = Math.max(this.stun, t);
    this.route = null;
    this.moving = false;
  }

  update(dt, w) {
    this.t += dt;
    this.markT += dt;
    this.moving = false;
    if (this.stun > 0) {
      this.stun -= dt;
      this.sus = Math.max(0, this.sus - dt);
      if (this.stun <= 0) {
        this.state = w.alarm ? 'chase' : 'return';
        this.route = null;
      }
      return;
    }
    // ---- Percepción ----
    const tg = w.target;
    let seen = false;
    let dist = 0;
    if (tg.visible) {
      seen = canSee(this.viewer(), tg.x, tg.y, w.isOpaque, w.clouds);
      dist = Math.hypot(tg.x - this.x, tg.y - (this.y - 6));
    }
    this.seen = seen;
    if (seen) this.lastSeen = { x: tg.footX, y: tg.footY };
    if (this.state === 'chase') {
      if (seen) w.spotted(this);
    } else {
      const before = this.sus;
      this.sus = stepSuspicion(this.sus, seen, dist, dt);
      if (seen) {
        if (before === 0) w.noticed(this);
        if (this.state !== 'suspicious') this.route = null;
        this.state = 'suspicious';
        this.facing = turnTo(this.facing, Math.atan2(tg.y - (this.y - 6), tg.x - this.x), 7 * dt);
        if (this.sus >= 1) w.raiseAlarm(this);
      } else if (this.state === 'suspicious') this.investigate(this.lastSeen, w);
    }
    // ---- Movimiento ----
    if (this.state === 'patrol') {
      if (this.wait > 0) {
        this.wait -= dt;
        // Mira hacia el siguiente tramo mientras espera
        const n = this.path[this.nextIndex()];
        if (n) this.facing = turnTo(this.facing, Math.atan2(n.y - this.y, n.x - this.x), 4 * dt);
      } else {
        const j = this.nextIndex();
        const p = this.path[j];
        if (this.moveTo(p.x, p.y, STEALTH.BOT_SPEED, dt)) {
          this.i = j;
          this.wait = STEALTH.BOT_PAUSE;
        }
      }
    } else if (this.state === 'investigate') {
      if (this.followRoute(STEALTH.BOT_INVESTIGATE_SPEED, dt)) this.startLook();
    } else if (this.state === 'look') {
      this.lookT += dt;
      this.facing = this.lookBase + Math.sin(this.lookT * 3.2) * 1.1;
      if (this.lookT >= STEALTH.LOOK_AROUND) this.state = 'return';
    } else if (this.state === 'return') {
      if (!this.route) {
        // Vuelve al punto más cercano de su ruta
        let best = 0;
        let bd = Infinity;
        this.path.forEach((p, k) => {
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d < bd) {
            bd = d;
            best = k;
          }
        });
        this.i = best;
        this.route = w.path(this.x, this.y, this.path[best].x, this.path[best].y) || [this.path[best]];
      }
      if (this.followRoute(STEALTH.BOT_SPEED, dt)) {
        this.state = 'patrol';
        this.route = null;
        this.wait = 0.3;
      }
    } else if (this.state === 'chase') {
      this.repath -= dt;
      const goal = w.alarmPos || this.lastSeen;
      if (goal && (this.repath <= 0 || !this.route)) {
        this.repath = STEALTH.REPATH_EVERY;
        this.route = w.path(this.x, this.y, goal.x, goal.y);
      }
      if (this.followRoute(STEALTH.BOT_CHASE_SPEED, dt) && !seen) {
        // Llegó al último punto conocido: mira alrededor
        this.facing += dt * 4;
      }
    }
    if (this.moving) this.walk += dt;
  }

  spriteDir() {
    const a = this.facing;
    const c = Math.cos(a);
    const s = Math.sin(a);
    if (Math.abs(c) > Math.abs(s)) return { dir: 'side', flip: c < 0 };
    return { dir: s > 0 ? 'down' : 'up', flip: false };
  }

  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.globalAlpha = 1;
    const { dir, flip } = this.spriteDir();
    const frame = this.moving ? Math.floor(this.walk * 6) % 2 : 0;
    const spr = botSprite(dir, frame);
    const sx = x - 8 + (this.stun > 0 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0);
    ctx.drawImage(spr.get(flip), sx, y - 16);
    // Visor de color según el estado
    const v = botVisor(dir, frame);
    if (v) {
      let col = '#43D9FF';
      if (this.stun > 0) col = Math.floor(t * 6) % 2 ? '#3A3A4A' : '#5A5A6E';
      else if (this.state === 'chase') col = Math.floor(t * 10) % 2 ? '#FF5A5A' : '#E0343F';
      else if (this.sus > 0 || this.state === 'investigate' || this.state === 'look') col = '#FFD23F';
      ctx.fillStyle = col;
      const vx = flip ? 16 - v.x - v.w : v.x;
      ctx.fillRect(sx + vx, y - 16 + v.y, v.w, v.h);
      // Brillo que recorre el visor
      if (this.stun <= 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + vx + (Math.floor(t * 8) % v.w), y - 16 + v.y, 1, 1);
      }
    }
    if (this.stun > 0) {
      // Estrellitas de aturdido
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + (k * Math.PI * 2) / 3;
        ctx.fillStyle = k % 2 ? '#FFD23F' : '#FFFFFF';
        ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y - 19 + Math.sin(a) * 2), 1, 1);
      }
    } else drawMark(ctx, x, y - 19, this, t);
  }

  // Rutas futuras (Vista Debug): línea punteada de la patrulla
  drawPath(ctx, cx, cy, t) {
    ctx.fillStyle = '#43D9FF';
    const pts = this.loop ? [...this.path, this.path[0]] : this.path;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = (t * 20) % 6; s < d; s += 6) {
        const p = s / d;
        ctx.fillRect(Math.round(a.x + (b.x - a.x) * p - cx), Math.round(a.y + (b.y - a.y) * p - cy - 2), 1, 1);
      }
    }
    if (this.route) {
      ctx.fillStyle = '#FF5A5A';
      for (const p of this.route) ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy - 2), 1, 1);
    }
  }
}

// ============================================================================
// Cámara de seguridad
// ============================================================================
export class SecCamera {
  constructor(def) {
    this.id = def.id;
    this.kind = 'camera';
    const side = def.side || 'N';
    if (side === 'N') {
      this.mx = def.x * TS + 8;
      this.my = (def.y + 1) * TS - 3;
      this.ex = this.mx;
      this.ey = (def.y + 1) * TS + 1;
    } else if (side === 'E') {
      this.mx = def.x * TS + 1;
      this.my = def.y * TS + 8;
      this.ex = def.x * TS - 2;
      this.ey = this.my;
    } else {
      this.mx = (def.x + 1) * TS - 1;
      this.my = def.y * TS + 8;
      this.ex = (def.x + 1) * TS + 1;
      this.ey = this.my;
    }
    this.a0 = def.a0 * D2R;
    this.a1 = def.a1 * D2R;
    this.facing = (this.a0 + this.a1) / 2;
    this.sweep = 1;
    this.pause = 0;
    this.off = 0; // hackeada
    this.stun = 0;
    this.sus = 0;
    this.seen = false;
    this.state = 'normal';
    this.markT = 1;
    this.alarmMark = 0;
    this.range = def.range || STEALTH.CAMERA_RANGE;
    this.x = this.ex;
    this.y = this.ey;
  }

  viewer() {
    return { x: this.ex, y: this.ey, facing: this.facing, half: STEALTH.CONE_HALF, range: this.range };
  }
  get active() {
    return this.off <= 0 && this.stun <= 0;
  }
  get shotBox() {
    return { x: this.mx - 5, y: this.my - 5, w: 10, h: 10 };
  }

  turnOff(t) {
    this.off = Math.max(this.off, t);
    this.sus = 0;
  }
  stunFor(t) {
    this.stun = Math.max(this.stun, t);
    this.sus = 0;
  }

  update(dt, w) {
    this.markT += dt;
    if (this.alarmMark > 0) this.alarmMark -= dt;
    if (this.off > 0 || this.stun > 0) {
      if (this.off > 0) this.off -= dt;
      if (this.stun > 0) this.stun -= dt;
      this.seen = false;
      return;
    }
    const tg = w.target;
    let seen = false;
    let dist = 0;
    if (tg.visible) {
      seen = canSee(this.viewer(), tg.x, tg.y, w.isOpaque, w.clouds);
      dist = Math.hypot(tg.x - this.ex, tg.y - this.ey);
    }
    this.seen = seen;
    if (w.alarm) {
      if (seen) w.spotted(this);
    } else {
      const before = this.sus;
      this.sus = stepSuspicion(this.sus, seen, dist, dt);
      if (seen && before === 0) w.noticed(this);
      if (this.sus >= 1) {
        w.raiseAlarm(this);
        this.alarmMark = 1.2;
        this.markT = 0;
      }
    }
    // Barrido con pausas (se queda mirando mientras sospecha)
    if (seen || this.sus > 0.05) return;
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    this.facing += this.sweep * STEALTH.CAMERA_SPEED * dt;
    if (this.facing >= this.a1) {
      this.facing = this.a1;
      this.sweep = -1;
      this.pause = STEALTH.CAMERA_PAUSE;
    } else if (this.facing <= this.a0) {
      this.facing = this.a0;
      this.sweep = 1;
      this.pause = STEALTH.CAMERA_PAUSE;
    }
  }

  draw(ctx, cx, cy, t, alarm) {
    const x = Math.round(this.mx - cx);
    const y = Math.round(this.my - cy);
    const state = this.off > 0 || this.stun > 0 ? 'off' : alarm || this.alarmMark > 0 ? 'alert' : this.sus > 0 ? 'sus' : 'normal';
    drawSecurityCamera(ctx, x, y, this.facing, state, t);
    if (this.off > 0) {
      // Cuenta regresiva del hackeo
      drawText(ctx, String(Math.ceil(this.off)), x, y + 6, { align: 'center', color: '#43D9FF' });
    } else if (this.stun <= 0) drawMark(ctx, x, y - 6, this, t);
  }
}

// ============================================================================
// Dron (visión circular)
// ============================================================================
export class Drone {
  constructor(def) {
    this.id = def.id;
    this.kind = 'drone';
    this.cx = def.cx * TS + 8;
    this.cy = def.cy * TS + 8;
    this.r = def.r;
    this.dirSign = def.speed || 1;
    this.ang = def.phase || 0;
    this.stun = 0;
    this.sus = 0;
    this.seen = false;
    this.state = 'normal';
    this.markT = 1;
    this.alarmMark = 0;
    this.t = R.range(0, 2);
    this.chasing = false;
    this.returning = false;
    this.place();
  }

  // Alarma: baja a perseguir a Choco; al volver la calma regresa a su órbita
  alert() {
    if (!this.active) return;
    this.chasing = true;
    this.returning = false;
    this.markT = 0;
  }
  calm() {
    if (this.chasing) this.returning = true;
    this.chasing = false;
    this.sus = 0;
  }
  get hitbox() {
    return { x: this.x - 5, y: this.y - 6, w: 10, h: 6 };
  }

  place() {
    this.x = this.cx + Math.cos(this.ang) * this.r;
    this.y = this.cy + Math.sin(this.ang) * this.r;
  }

  viewer() {
    return { x: this.x, y: this.y, facing: 0, half: Math.PI, range: STEALTH.DRONE_RADIUS };
  }
  get active() {
    return this.stun <= 0;
  }
  get shotBox() {
    return { x: this.x - 7, y: this.y - 20, w: 14, h: 16 };
  }
  stunFor(t) {
    this.stun = Math.max(this.stun, t);
    this.sus = 0;
  }

  update(dt, w) {
    this.t += dt;
    this.markT += dt;
    if (this.alarmMark > 0) this.alarmMark -= dt;
    if (this.stun > 0) {
      this.stun -= dt;
      this.seen = false;
      return;
    }
    if (this.chasing && w.alarmPos) {
      const dx = w.alarmPos.x - this.x;
      const dy = w.alarmPos.y - this.y;
      const d = Math.hypot(dx, dy);
      const sp = Math.min(d, STEALTH.DRONE_CHASE_SPEED * dt);
      if (d > 0.5) {
        this.x += (dx / d) * sp;
        this.y += (dy / d) * sp;
      }
    } else if (this.returning) {
      const ox = this.cx + Math.cos(this.ang) * this.r;
      const oy = this.cy + Math.sin(this.ang) * this.r;
      const dx = ox - this.x;
      const dy = oy - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) this.returning = false;
      else {
        this.x += (dx / d) * Math.min(d, STEALTH.DRONE_CHASE_SPEED * dt);
        this.y += (dy / d) * Math.min(d, STEALTH.DRONE_CHASE_SPEED * dt);
      }
    } else {
      this.ang += this.dirSign * STEALTH.DRONE_SPEED * dt;
      this.place();
    }
    const tg = w.target;
    let seen = false;
    let dist = 0;
    if (tg.visible) {
      seen = canSee(this.viewer(), tg.x, tg.y + 6, w.isOpaque, w.clouds);
      dist = Math.hypot(tg.x - this.x, tg.y + 6 - this.y);
    }
    this.seen = seen;
    if (w.alarm) {
      if (seen) w.spotted(this);
      return;
    }
    const before = this.sus;
    this.sus = stepSuspicion(this.sus, seen, dist, dt);
    if (seen && before === 0) w.noticed(this);
    if (this.sus >= 1) {
      w.raiseAlarm(this);
      this.alarmMark = 1.2;
      this.markT = 0;
    }
  }

  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    // Sombra en el piso
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 5, y - 1, 10, 2);
    ctx.globalAlpha = 1;
    const bob = this.stun > 0 ? 4 : Math.round(Math.sin(this.t * 4) * 1.5);
    const spr = droneSprite(this.stun > 0 ? 0 : Math.floor(t * 20));
    ctx.drawImage(spr.normal, x - 8, y - 22 + bob);
    // Ojo del dron
    const col = this.stun > 0 ? '#3A3A4A' : this.alarmMark > 0 || this.chasing ? '#E0343F' : this.sus > 0 ? '#FFD23F' : '#43D9FF';
    ctx.fillStyle = col;
    ctx.fillRect(x - 1, y - 22 + bob + 7, 2, 1);
    if (this.stun <= 0) drawMark(ctx, x, y - 24 + bob, this, t);
  }

  // Vista Debug: su órbita
  drawPath(ctx, cx, cy, t) {
    ctx.fillStyle = '#43D9FF';
    const n = Math.max(12, Math.round(this.r * 0.8));
    for (let i = 0; i < n; i++) {
      if ((i + Math.floor(t * 6)) % 3) continue;
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(this.cx + Math.cos(a) * this.r - cx), Math.round(this.cy + Math.sin(a) * this.r - cy), 1, 1);
    }
  }
}

// ============================================================================
// Láser rítmico
// ============================================================================
export class Laser {
  constructor(def) {
    this.id = def.id;
    this.x = def.x * TS + 8;
    this.y0 = def.y0 * TS;
    this.y1 = (def.y1 + 1) * TS;
    this.t = def.phase || 0;
    this.off = 0;
  }

  get phase() {
    if (this.off > 0) return 'off';
    const cycle = STEALTH.LASER_ON + STEALTH.LASER_OFF;
    const m = ((this.t % cycle) + cycle) % cycle;
    if (m < STEALTH.LASER_OFF - STEALTH.LASER_WARN) return 'off';
    if (m < STEALTH.LASER_OFF) return 'warn';
    return 'on';
  }
  get on() {
    return this.phase === 'on';
  }
  get hitbox() {
    return { x: this.x - 2, y: this.y0, w: 4, h: this.y1 - this.y0 };
  }

  turnOff(t) {
    this.off = Math.max(this.off, t);
  }

  update(dt) {
    this.t += dt;
    if (this.off > 0) this.off -= dt;
  }

  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx);
    const y0 = Math.round(this.y0 - cy);
    const y1 = Math.round(this.y1 - cy);
    const ph = this.phase;
    if (ph === 'on') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x - 2, y0 + 3, 5, y1 - y0 - 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = Math.floor(t * 30) % 2 ? '#FF9A9A' : '#FFFFFF';
      ctx.fillRect(x, y0 + 3, 1, y1 - y0 - 6);
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x - 1, y0 + 3, 1, y1 - y0 - 6);
      ctx.fillRect(x + 1, y0 + 3, 1, y1 - y0 - 6);
    } else if (ph === 'warn') {
      ctx.fillStyle = '#E0343F';
      for (let y = y0 + 3; y < y1 - 3; y += 4) if ((y + Math.floor(t * 24)) % 8 < 4) ctx.fillRect(x, y, 1, 2);
    }
    // Emisores arriba y abajo
    for (const [ey, flip] of [
      [y0, false],
      [y1 - 4, true],
    ]) {
      ctx.fillStyle = '#0B0E16';
      ctx.fillRect(x - 3, ey, 7, 4);
      ctx.fillStyle = '#5A6E8C';
      ctx.fillRect(x - 2, ey + (flip ? 1 : 0), 5, 3);
      ctx.fillStyle = ph === 'on' ? '#FF5A5A' : ph === 'warn' ? (Math.floor(t * 12) % 2 ? '#FFD23F' : '#3A3A4A') : this.off > 0 ? '#43D9FF' : '#3A3A4A';
      ctx.fillRect(x, flip ? ey : ey + 3, 1, 1);
    }
  }
}

// ============================================================================
// Aspiradora robot
// ============================================================================
export class Vacuum {
  constructor(def) {
    this.id = def.id;
    this.x = def.x * TS + 8;
    this.y = def.y * TS + 12;
    const [x0, y0, x1, y1] = def.area;
    this.area = { x0: x0 * TS + 7, y0: y0 * TS + 8, x1: (x1 + 1) * TS - 7, y1: (y1 + 1) * TS - 2 };
    this.ang = R.range(0, Math.PI * 2);
    this.bumpT = 0;
    this.t = R.range(0, 2);
    this.turnT = R.range(2, 4);
  }

  get hitbox() {
    return { x: this.x - 7, y: this.y - 7, w: 14, h: 7 };
  }

  update(dt, map) {
    this.t += dt;
    if (this.bumpT > 0) this.bumpT -= dt;
    this.turnT -= dt;
    const sp = STEALTH.VACUUM_SPEED * dt;
    const nx = this.x + Math.cos(this.ang) * sp;
    const ny = this.y + Math.sin(this.ang) * sp;
    const a = this.area;
    const tileBlocked = (px, py) => map.isSolid(Math.floor(px / TS), Math.floor(py / TS));
    const blocked =
      nx < a.x0 || nx > a.x1 || ny < a.y0 || ny > a.y1 || tileBlocked(nx - 7, ny - 4) || tileBlocked(nx + 7, ny - 4) || tileBlocked(nx - 7, ny - 1) || tileBlocked(nx + 7, ny - 1);
    if (blocked || this.turnT <= 0) {
      this.ang += Math.PI * R.range(0.5, 1.5);
      this.turnT = R.range(2.5, 5);
    } else {
      this.x = nx;
      this.y = ny;
    }
  }

  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.globalAlpha = 1;
    const shake = this.bumpT > 0 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    ctx.drawImage(vacuumSprite(Math.floor(t * 8)).normal, x - 8 + shake, y - 11);
    if (this.bumpT > 0) drawText(ctx, '!', x, y - 22, { align: 'center', color: '#FFD23F' });
  }
}

// ============================================================================
// Torreta de práctica
// ============================================================================
export class Turret {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.cool = TURRET.INTERVAL;
    this.flash = 0;
    this.hitFlash = 0;
  }

  get charging() {
    return this.cool <= TURRET.TELEGRAPH;
  }

  // Devuelve true cuando dispara
  update(dt) {
    if (this.flash > 0) this.flash -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.cool -= dt;
    if (this.cool <= 0) {
      this.cool = TURRET.INTERVAL;
      this.flash = 0.1;
      return true;
    }
    return false;
  }

  draw(ctx, cx, cy, t) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 7, y - 1, 14, 2);
    ctx.globalAlpha = 1;
    const spr = turretSprite(this.charging && Math.floor(t * 12) % 2 === 0);
    ctx.drawImage(this.hitFlash > 0 ? spr.white : spr.normal, x - 8, y - 16);
    if (this.flash > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 11, y - 10, 3, 3);
    }
  }
}
