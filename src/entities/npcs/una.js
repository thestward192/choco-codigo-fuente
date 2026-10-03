// Entidades del mapa de la UNA: bugs que patrullan, NPCs glitcheados, estantes con ruedas
// y objetos que se recogen (bits, carnés, Y doradas).
import { SCREEN, TOPDOWN, PICKUPS } from '../../config/balance.js';
import { overworldBug, npcSprite, smallItem } from '../../art/topdown.js';
import { itemSprites } from '../../art/items.js';
import { drawText } from '../../art/font.js';
import { fxRng } from '../../core/rng.js';
import { Ease } from '../../core/tween.js';

const TS = SCREEN.TILE;
const R = fxRng;
const center = ([tx, ty]) => ({ x: tx * TS + 8, y: ty * TS + 12 });

// ---------- Bug que patrulla una ruta visible ----------
export class MapBug {
  constructor(def) {
    this.id = def.id;
    this.kind = def.kind;
    this.path = def.path.map(center);
    this.loop = !!def.loop;
    this.i = 0;
    this.dirStep = 1;
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.wait = R.range(0, TOPDOWN.BUG_PAUSE);
    this.t = R.range(0, 2);
    this.facing = 1;
    this.frozen = 0; // tras huir, se queda quieto
    this.dead = false;
  }

  get hitbox() {
    return { x: this.x - 6, y: this.y - 8, w: 12, h: 8 };
  }

  next() {
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

  update(dt) {
    this.t += dt;
    if (this.frozen > 0) {
      this.frozen -= dt;
      return;
    }
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const j = this.next();
    const target = this.path[j];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = TOPDOWN.BUG_SPEED * dt;
    if (d <= step) {
      this.x = target.x;
      this.y = target.y;
      this.i = j;
      this.wait = TOPDOWN.BUG_PAUSE;
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      if (Math.abs(dx) > 0.5) this.facing = Math.sign(dx);
    }
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 5, y - 1, 10, 2);
    ctx.globalAlpha = 1;
    const bob = Math.round(Math.abs(Math.sin(this.t * 6)) * 2);
    const spr = overworldBug(this.kind, Math.floor(this.t * 5) % 2);
    // Pequeño glitch ocasional
    if (R.chance(0.02)) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(spr.tint('#FF2E88', this.facing < 0), x - 8 + R.int(-2, 2), y - 16 - bob);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(spr.get(this.facing < 0), x - 8, y - 16 - bob);
    if (this.frozen > 0) drawText(ctx, '?', x, y - 26, { align: 'center', color: '#8A8AA0' });
  }

  // Ruta punteada (se ve con la Vista Debug)
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
  }
}

// ---------- NPC ----------
export class MapNpc {
  constructor(def) {
    Object.assign(this, def);
    this.x = def.x * TS + 8;
    this.y = def.y * TS + 14;
    this.t = R.range(0, 3);
    this.glitchT = R.range(1, 3);
    this.talking = 0;
  }

  // Obstáculo (los pies)
  get rect() {
    return { x: this.x - 6, y: this.y - 7, w: 12, h: 7 };
  }

  update(dt) {
    this.t += dt;
    this.glitchT -= dt;
    if (this.glitchT < -0.15) this.glitchT = R.range(1.2, 3.5);
    if (this.talking > 0) this.talking -= dt;
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 5, y - 1, 10, 2);
    ctx.globalAlpha = 1;
    const frame = Math.floor(this.t * 2) % 2;
    const spr = npcSprite(this.kind, this.variant || 0, frame);
    const glitching = this.glitch && this.glitchT < 0;
    if (glitching) {
      // Aberración cromática y franja desplazada: está atrapado en un loop
      ctx.globalAlpha = 0.6;
      ctx.drawImage(spr.tint('#FF0044'), x - 9, y - 16);
      ctx.drawImage(spr.tint('#00E5FF'), x - 7, y - 16);
      ctx.globalAlpha = 1;
      ctx.drawImage(spr.normal, 0, 0, 16, 8, x - 8 + R.int(-2, 2), y - 16, 16, 8);
      ctx.drawImage(spr.normal, 0, 8, 16, 8, x - 8, y - 8, 16, 8);
    } else ctx.drawImage(spr.normal, x - 8, y - 16);
    if (this.glitch && Math.floor(this.t * 1.5) % 4 === 0) {
      // "..." de que repite lo mismo
      ctx.fillStyle = '#FF2E88';
      for (let i = 0; i < 3; i++) if ((Math.floor(this.t * 6) + i) % 3 !== 0) ctx.fillRect(x - 3 + i * 3, y - 21, 1, 1);
    }
  }
}

// ---------- Estante con ruedas ----------
export class Shelf {
  constructor(tx, ty, { special = false } = {}) {
    this.tx = tx;
    this.ty = ty;
    this.special = special;
    this.anim = null; // { fromX, fromY, t }
  }

  get rect() {
    return { x: this.tx * TS, y: this.ty * TS, w: TS, h: TS, shelf: this };
  }

  moveTo(tx, ty, time) {
    this.anim = { fromX: this.tx, fromY: this.ty, t: 0, time };
    this.tx = tx;
    this.ty = ty;
  }

  update(dt) {
    if (!this.anim) return;
    this.anim.t += dt / this.anim.time;
    if (this.anim.t >= 1) this.anim = null;
  }

  // Posición dibujada (con el deslizamiento)
  drawPos() {
    if (!this.anim) return { x: this.tx * TS, y: this.ty * TS };
    const p = Ease.outQuad(Math.min(1, this.anim.t));
    return { x: (this.anim.fromX + (this.tx - this.anim.fromX) * p) * TS, y: (this.anim.fromY + (this.ty - this.anim.fromY) * p) * TS };
  }

  draw(ctx, cx, cy, onMark) {
    const p = this.drawPos();
    const x = Math.round(p.x - cx);
    const y = Math.round(p.y - cy);
    // Ruedas
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(x + 2, y + 14, 3, 2);
    ctx.fillRect(x + 11, y + 14, 3, 2);
    // Mueble
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(x + 1, y - 6, 14, 20);
    ctx.fillStyle = onMark ? '#8A6A50' : '#6B4E3D';
    ctx.fillRect(x + 2, y - 5, 12, 18);
    ctx.fillStyle = '#4A3428';
    ctx.fillRect(x + 2, y + 2, 12, 1);
    ctx.fillRect(x + 2, y + 9, 12, 1);
    const cols = this.special ? ['#FFD23F', '#B8902A', '#FFD23F'] : ['#8C2F39', '#3A6EA8', '#4CBB4C', '#E07A3A'];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = cols[(i + r) % cols.length];
        ctx.fillRect(x + 3 + i * 2, y - 4 + r * 7, 1, 5);
      }
    }
    if (onMark) {
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x + 1, y - 6, 14, 1);
    }
  }
}

// ---------- Objetos que se recogen ----------
// type: 'bit' | 'carne' | 'goldenY'
export class MapPickup {
  constructor(type, x, y, { key = null, index = 0, ghost = false, pop = false } = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.key = key;
    this.index = index;
    this.ghost = ghost;
    this.t = R.range(0, 3);
    this.pop = pop ? 0 : 1; // aparece saltando
    this.dead = false;
  }

  get hitbox() {
    return { x: this.x - 6, y: this.y - 10, w: 12, h: 12 };
  }

  update(dt) {
    this.t += dt;
    if (this.pop < 1) this.pop = Math.min(1, this.pop + dt * 2);
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx);
    const popY = this.pop < 1 ? Math.round(Math.sin(this.pop * Math.PI) * 14) : 0;
    const bob = Math.round(Math.sin(this.t * PICKUPS.BOB_SPEED) * PICKUPS.BOB_AMPLITUDE);
    const y = Math.round(this.y - cy) - 6 + bob - popY;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, Math.round(this.y - cy) - 1, 6, 1);
    ctx.globalAlpha = this.ghost ? 0.45 : 1;
    if (this.type === 'bit') {
      const spr = itemSprites().bit;
      ctx.drawImage(spr.normal, x - spr.w / 2, y - spr.h / 2);
    } else if (this.type === 'carne') {
      const spr = smallItem('carne');
      ctx.drawImage(spr.normal, x - 6, y - 8);
      if (Math.floor(this.t * 4) % 4 === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 4, y - 7, 1, 1);
      }
    } else if (this.type === 'goldenY') {
      drawText(ctx, 'Y', x - 3, y - 7, { bold: true, color: '#FFD23F', scale: 1 });
      if (Math.floor(this.t * 5) % 3 === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 5, y - 8, 1, 1);
        ctx.fillRect(x + 5, y - 1, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}
