// Hezron en el nivel 3: sigue a Choco (camina detrás, se esconde cuando Choco se esconde) y
// suelta nubes de vapor que bloquean los conos de visión — docs/niveles/nivel_3_novacomp.md
import { VAPOR } from '../../config/balance.js';
import { founderSprite } from '../../art/portraits.js';
import { drawText, measureText } from '../../art/font.js';
import { fillCircle } from '../../art/shapes.js';
import { fxRng } from '../../core/rng.js';

const R = fxRng;

export class HezronFollower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.trail = [{ x, y }];
    this.t = 0;
    this.walk = 0;
    this.moving = false;
    this.facing = 1;
    this.hidden = false;
    this.hideT = 0; // 0..1 (se desvanece en vapor)
    this.balloon = null;
    this.puffT = R.range(0.5, 1.5);
  }

  placeAt(x, y) {
    this.x = x;
    this.y = y;
    this.trail = [{ x, y }];
  }

  say(text) {
    this.balloon = { text, t: 0 };
  }

  // choco: { footX, footY }, hidden: si Choco está escondido
  update(dt, choco, hidden, scene) {
    this.t += dt;
    this.hidden = hidden;
    this.hideT = hidden ? Math.min(1, this.hideT + dt * 4) : Math.max(0, this.hideT - dt * 4);
    if (this.balloon) {
      this.balloon.t += dt;
      if (this.balloon.t > VAPOR.BALLOON_TIME) this.balloon = null;
    }
    // Rastro de Choco: Hezron camina hasta un punto del rastro a FOLLOW_DIST detrás
    const last = this.trail[this.trail.length - 1];
    if (!hidden && Math.hypot(choco.footX - last.x, choco.footY - last.y) > 2) this.trail.push({ x: choco.footX, y: choco.footY });
    if (this.trail.length > 80) this.trail.shift();
    let target = this.trail[0];
    let acc = 0;
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i];
      const b = this.trail[i - 1];
      acc += Math.hypot(a.x - b.x, a.y - b.y);
      if (acc >= VAPOR.FOLLOW_DIST) {
        target = b;
        break;
      }
    }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    this.moving = !hidden && d > 1.5 && Math.hypot(choco.footX - this.x, choco.footY - this.y) > VAPOR.FOLLOW_DIST - 4;
    if (this.moving) {
      const sp = Math.min(d, VAPOR.FOLLOW_SPEED * dt);
      this.x += (dx / d) * sp;
      this.y += (dy / d) * sp;
      this.walk += dt;
      if (Math.abs(dx) > 0.3) this.facing = Math.sign(dx);
    }
    // Nubecita del vape cada tanto
    this.puffT -= dt;
    if (this.puffT <= 0 && !hidden) {
      this.puffT = R.range(1.2, 2.4);
      for (let i = 0; i < 4; i++) {
        scene.particles.spawn({ x: this.x + this.facing * 7, y: this.y - 16, vx: this.facing * R.range(4, 12), vy: R.range(-14, -6), life: R.range(0.6, 1.1), colors: ['#E8E8F0', '#C8B8F0'], size: 2, endSize: 1, front: true });
      }
    }
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx);
    const y = Math.round(this.y - cy);
    if (this.hideT < 1) {
      ctx.globalAlpha = 1 - this.hideT;
      ctx.globalAlpha *= 0.25;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 5, y - 1, 10, 2);
      ctx.globalAlpha = 1 - this.hideT;
      const frame = this.moving ? 2 + (Math.floor(this.walk * 8) % 4) : Math.floor(this.t * 2.5) % 2;
      ctx.drawImage(founderSprite('hezron', frame).get(this.facing < 0), x - 8, y - 24);
      ctx.globalAlpha = 1;
    }
    if (this.hideT > 0) {
      // Se esconde en su propia nube
      ctx.globalAlpha = 0.8 * this.hideT;
      ctx.fillStyle = '#E8E8F0';
      fillCircle(ctx, x - 3, y - 6, 5);
      fillCircle(ctx, x + 3, y - 8, 5);
      ctx.fillStyle = '#C8B8F0';
      fillCircle(ctx, x, y - 4, 3);
      ctx.globalAlpha = 1;
    }
  }

  drawBalloon(ctx, cx, cy) {
    if (!this.balloon) return;
    const b = this.balloon;
    const a = Math.min(1, b.t * 8, (VAPOR.BALLOON_TIME - b.t) * 5);
    const w = measureText(b.text) + 8;
    const x = Math.round(this.x - cx - w / 2);
    const y = Math.round(this.y - cy - 40 - Math.min(4, b.t * 30));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 1, y - 1, w + 2, 12);
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(x, y, w, 10);
    ctx.fillRect(x + w / 2 - 1, y + 10, 3, 2);
    ctx.fillRect(x + w / 2, y + 12, 1, 1);
    drawText(ctx, b.text, x + 4, y + 2, { color: '#5A3AA0', shadow: false });
    ctx.globalAlpha = 1;
  }
}

// Nube de vapor: vuela desde Hezron hasta el punto, dura DURATION y bloquea la visión.
export class VaporCloud {
  constructor(fromX, fromY, x, y) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.tx = x;
    this.ty = y;
    this.x = fromX;
    this.y = fromY;
    this.t = 0;
    this.dead = false;
    this.seed = R.range(0, 100);
  }

  get radius() {
    const grow = Math.min(1, this.t / (VAPOR.THROW_TIME + 0.2));
    const left = VAPOR.DURATION - this.t;
    const shrink = left < 0.8 ? Math.max(0, left / 0.8) : 1;
    return VAPOR.RADIUS * (0.25 + 0.75 * grow) * shrink;
  }

  // Círculo que bloquea los rayos de visión
  get blocker() {
    return { x: this.x, y: this.y - 6, r: this.radius };
  }

  update(dt, scene) {
    this.t += dt;
    const p = Math.min(1, this.t / VAPOR.THROW_TIME);
    this.x = this.fromX + (this.tx - this.fromX) * p;
    this.y = this.fromY + (this.ty - this.fromY) * p;
    if (R.chance(0.15)) {
      const a = R.range(0, Math.PI * 2);
      const r = R.range(0, this.radius);
      scene.particles.spawn({ x: this.x + Math.cos(a) * r, y: this.y - 6 + Math.sin(a) * r * 0.7, vy: -6, life: 0.8, colors: ['#E8E8F0', '#D8C8FF'], front: true });
    }
    if (this.t >= VAPOR.DURATION) this.dead = true;
  }

  draw(ctx, cx, cy, t) {
    const r = this.radius;
    if (r <= 1) return;
    const x = this.x - cx;
    const y = this.y - 6 - cy;
    // Bolitas de vapor que respiran
    const puffs = 9;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#B8A8E0';
    fillCircle(ctx, x, y + 2, r * 0.85);
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < puffs; i++) {
      const a = (i / puffs) * Math.PI * 2 + this.seed + t * 0.3;
      const d = r * 0.55;
      const pr = r * 0.42 + Math.sin(t * 2 + i) * 1.5;
      ctx.fillStyle = i % 3 === 0 ? '#D8C8FF' : '#E8E8F0';
      fillCircle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75, pr);
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#F4F1FA';
    fillCircle(ctx, x - r * 0.15, y - r * 0.2, r * 0.35);
    ctx.globalAlpha = 1;
  }
}
