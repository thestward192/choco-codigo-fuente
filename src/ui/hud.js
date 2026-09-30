// HUD — docs/06_menus_ui.md
// Arriba izq.: barra de chocolate; debajo vidas y bits. Arriba der.: Y doradas del nivel.
// Abajo izq.: objetos con estado (laptop, escudo, lazo). Específicos de nivel: termómetro,
// cargas de vapor, cuenta regresiva y barra de jefe. Se oculta en cinemáticas.
import { drawText } from '../art/font.js';
import { CHOCO, ACCENTS, UI } from '../art/palettes.js';
import { HEALTH, SCREEN } from '../config/balance.js';
import { itemSprites } from '../art/items.js';
import { icons } from '../art/icons.js';
import { TEXTS } from '../data/dialogues.js';

const SLOT = 10;
const GAP = 1;
const SLOT_ACCENTS = [ACCENTS.core, ACCENTS.oscar, ACCENTS.stward, ACCENTS.hezron, ACCENTS.fabiola];

// Estado que recibe el HUD (todo opcional salvo hp/maxHp):
// { hp, maxHp, coating, lives, bits, goldenY: [bool×3] | null, items: {boots, laptop, shield, lasso},
//   laptop: {battery, locked, active}, shield: {cooldown01, active}, lassoInRange,
//   heat: 0..100 | null, vapor: {charges, max} | null, deadline: segundos | null,
//   boss: {name, hp01, segments} | null }
export class Hud {
  constructor() {
    this.breaking = [];
    this.gaining = [];
    this.lastHp = null;
    this.t = 0;
    this.bitsShown = 0;
    this.bitsPulse = 0;
    this.yPulse = [0, 0, 0];
    this.lastY = null;
    this.alpha = 1;
    this.visible = true;
    this.bossShown = 1;
  }

  update(dt, s) {
    this.t += dt;
    this.alpha = this.visible ? Math.min(1, this.alpha + dt * 4) : Math.max(0, this.alpha - dt * 4);
    if (this.lastHp !== null && s.hp < this.lastHp) {
      for (let i = s.hp; i < this.lastHp; i++) this.breaking.push({ slot: i, t: 0 });
    } else if (this.lastHp !== null && s.hp > this.lastHp) {
      for (let i = this.lastHp; i < s.hp; i++) this.gaining.push({ slot: i, t: 0 });
    }
    this.lastHp = s.hp;
    for (const b of this.breaking) b.t += dt;
    for (const g of this.gaining) g.t += dt;
    this.breaking = this.breaking.filter((b) => b.t < 0.8);
    this.gaining = this.gaining.filter((g) => g.t < 0.35);
    if (this.bitsShown < s.bits) {
      this.bitsShown = Math.min(s.bits, this.bitsShown + Math.max(1, Math.ceil((s.bits - this.bitsShown) * dt * 10)));
      this.bitsPulse = 0.15;
    } else if (this.bitsShown > s.bits) this.bitsShown = s.bits;
    if (this.bitsPulse > 0) this.bitsPulse -= dt;
    if (s.goldenY) {
      if (this.lastY) s.goldenY.forEach((g, i) => g && !this.lastY[i] && (this.yPulse[i] = 0.6));
      this.lastY = [...s.goldenY];
    }
    this.yPulse = this.yPulse.map((p) => Math.max(0, p - dt));
    if (s.boss) this.bossShown += (s.boss.hp01 - this.bossShown) * Math.min(1, dt * 3);
  }

  draw(ctx, s) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const slide = Math.round((1 - this.alpha) * 12);
    ctx.translate(0, -slide);
    this.drawBar(ctx, s);
    this.drawLivesBits(ctx, s);
    if (s.goldenY) this.drawGoldenY(ctx, s.goldenY);
    ctx.translate(0, slide * 2);
    this.drawItems(ctx, s);
    if (s.heat !== null && s.heat !== undefined) this.drawHeat(ctx, s.heat);
    ctx.translate(0, -slide * 2);
    if (s.vapor) this.drawVapor(ctx, s.vapor);
    if (s.deadline !== null && s.deadline !== undefined) this.drawDeadline(ctx, s.deadline);
    if (s.boss) this.drawBoss(ctx, s.boss);
    ctx.restore();
  }

  // ---------- Barra de chocolate ----------
  drawBar(ctx, s) {
    const x0 = 4;
    const y0 = 4;
    const n = HEALTH.MAX_POSSIBLE;
    const w = n * (SLOT + GAP) + GAP + 2;
    ctx.fillStyle = 'rgba(7,7,12,0.55)';
    ctx.fillRect(x0 - 2, y0 - 2, w + 4, SLOT + 8);
    ctx.fillStyle = CHOCO.o;
    ctx.fillRect(x0, y0, w, SLOT + 4);
    for (let i = 0; i < n; i++) {
      const sx = x0 + 1 + GAP + i * (SLOT + GAP);
      const sy = y0 + 2;
      if (i < s.hp) this.drawFilled(ctx, sx, sy, i, s.coating);
      else if (i < s.maxHp) this.drawEmpty(ctx, sx, sy);
      else this.drawLocked(ctx, sx, sy);
      const g = this.gaining.find((q) => q.slot === i);
      if (g) {
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * (1 - g.t / 0.35);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx, sy, SLOT, SLOT);
        ctx.globalAlpha = a;
      }
    }
    for (const b of this.breaking) this.drawBreaking(ctx, x0 + 1 + GAP + b.slot * (SLOT + GAP), y0 + 2, b);
  }

  drawBreaking(ctx, sx, sy, b) {
    const t = b.t;
    if (t < 0.12) {
      this.drawFilled(ctx, sx, sy, b.slot, false);
      ctx.fillStyle = CHOCO.o;
      ctx.fillRect(sx + 4, sy, 1, 3);
      ctx.fillRect(sx + 5, sy + 3, 1, 3);
      ctx.fillRect(sx + 4, sy + 6, 1, 4);
      ctx.fillRect(sx + 1, sy + 5, 4, 1);
      return;
    }
    const tt = t - 0.12;
    const pieces = [
      [0, 0, -30, -40],
      [5, 0, 25, -50],
      [0, 5, -20, -10],
      [5, 5, 30, -20],
    ];
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * Math.max(0, 1 - tt / 0.68);
    for (const [px, py, vx, vy] of pieces) {
      const x = Math.round(sx + px + vx * tt);
      const y = Math.round(sy + py + vy * tt + 300 * tt * tt);
      ctx.fillStyle = CHOCO.b;
      ctx.fillRect(x, y, 5, 5);
      ctx.fillStyle = CHOCO.l;
      ctx.fillRect(x, y, 5, 1);
    }
    ctx.globalAlpha = a;
  }

  drawFilled(ctx, x, y, i, coating) {
    drawSquare(ctx, x, y, i);
    if (coating) {
      const on = Math.floor(this.t * 8) % 2 === 0;
      ctx.fillStyle = on ? '#FFE9A8' : '#FFD27A';
      ctx.fillRect(x - 1, y - 1, SLOT + 2, 1);
      ctx.fillRect(x - 1, y + SLOT, SLOT + 2, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + ((Math.floor(this.t * 12) + i * 3) % SLOT), y - 1, 1, 1);
    }
  }

  drawEmpty(ctx, x, y) {
    ctx.fillStyle = '#140B07';
    ctx.fillRect(x, y, SLOT, SLOT);
    ctx.fillStyle = CHOCO.s;
    ctx.fillRect(x, y, SLOT, 1);
    ctx.fillRect(x, y, 1, SLOT);
  }

  drawLocked(ctx, x, y) {
    ctx.fillStyle = '#3A2A20';
    for (let i = 0; i < SLOT; i += 2) {
      ctx.fillRect(x + i, y, 1, 1);
      ctx.fillRect(x + i, y + SLOT - 1, 1, 1);
      ctx.fillRect(x, y + i, 1, 1);
      ctx.fillRect(x + SLOT - 1, y + i, 1, 1);
    }
  }

  // ---------- Vidas y bits ----------
  drawLivesBits(ctx, s) {
    const x0 = 4;
    const ly = 4 + SLOT + 9;
    if (s.lives !== undefined) {
      drawLifeIcon(ctx, x0, ly);
      drawText(ctx, `×${s.lives}`, x0 + 9, ly + 1);
    }
    if (s.bits !== undefined) {
      const bit = itemSprites().bit;
      const bx = x0 + 34;
      ctx.drawImage(bit.normal, bx, ly);
      drawText(ctx, String(this.bitsShown).padStart(2, '0'), bx + 9, ly + 1 - (this.bitsPulse > 0 ? 1 : 0), {
        color: this.bitsPulse > 0 ? UI.green : UI.text,
      });
    }
  }

  // ---------- Y doradas ----------
  drawGoldenY(ctx, ys) {
    ys.forEach((got, i) => {
      const x = SCREEN.W - 42 + i * 13;
      const p = this.yPulse[i];
      const bump = p > 0 ? -Math.round(Math.sin((0.6 - p) * 12) * 2 * (p / 0.6)) : 0;
      drawText(ctx, 'Y', x, 5 + bump, { color: got ? UI.yellow : '#3A3A4E', bold: true, shadow: got ? UI.shadow : false });
      if (p > 0 && Math.floor(p * 20) % 2) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 1, 4 + bump, 1, 1);
        ctx.fillRect(x + 6, 12 + bump, 1, 1);
      }
    });
  }

  // ---------- Objetos ----------
  drawItems(ctx, s) {
    const it = s.items || {};
    let x = 4;
    const y = SCREEN.H - 16;
    const ic = icons();
    const panel = (w) => {
      ctx.fillStyle = 'rgba(7,7,12,0.55)';
      ctx.fillRect(x - 2, y - 2, w + 4, 16);
    };
    if (it.boots) {
      panel(12);
      ctx.drawImage(ic.boots.normal, x, y + 1);
      x += 18;
    }
    if (it.laptop && s.laptop) {
      panel(40);
      ctx.drawImage(ic.laptop.normal, x, y);
      const bx = x + 14;
      ctx.fillStyle = CHOCO.o;
      ctx.fillRect(bx, y + 4, 24, 6);
      const p = Math.max(0, Math.min(1, s.laptop.battery / 100));
      const low = s.laptop.locked;
      ctx.fillStyle = low ? (Math.floor(this.t * 6) % 2 ? UI.red : '#6A1A20') : s.laptop.active ? '#DFFAFF' : UI.cyan;
      ctx.fillRect(bx + 1, y + 5, Math.round(22 * p), 4);
      // Marca del mínimo para reactivar (30)
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(bx + 1 + Math.round(22 * 0.3), y + 3, 1, 1);
      x += 46;
    }
    if (it.shield && s.shield) {
      panel(12);
      const p = s.shield.cooldown01 ?? 1;
      // El ícono se llena de abajo hacia arriba mientras recarga
      ctx.globalAlpha *= 0.35;
      ctx.drawImage(ic.shield.normal, x, y);
      ctx.globalAlpha /= 0.35;
      const h = Math.round(12 * p);
      if (h > 0) ctx.drawImage(ic.shield.normal, 0, 12 - h, 12, h, x, y + 12 - h, 12, h);
      if (p >= 1 && Math.floor(this.t * 2) % 4 === 0) ctx.drawImage(ic.shield.white, x, y);
      x += 18;
    }
    if (it.lasso) {
      panel(12);
      if (s.lassoInRange) {
        ctx.fillStyle = 'rgba(67,217,255,0.35)';
        ctx.fillRect(x - 1, y - 1, 14, 14);
      }
      ctx.globalAlpha *= s.lassoInRange ? 1 : 0.5;
      ctx.drawImage(ic.lasso.normal, x, y);
      ctx.globalAlpha /= s.lassoInRange ? 1 : 0.5;
      x += 18;
    }
  }

  // ---------- Específicos de nivel ----------
  // Termómetro de calor (nivel 4): abajo a la derecha
  drawHeat(ctx, heat) {
    const x = SCREEN.W - 16;
    const y = SCREEN.H - 60;
    ctx.fillStyle = 'rgba(7,7,12,0.55)';
    ctx.fillRect(x - 3, y - 3, 14, 60);
    ctx.fillStyle = CHOCO.o;
    ctx.fillRect(x + 1, y, 6, 46);
    ctx.fillRect(x - 1, y + 44, 10, 10);
    const p = Math.max(0, Math.min(1, heat / 100));
    const color = heat >= 60 ? (Math.floor(this.t * 8) % 2 ? '#FF6B3A' : '#E0343F') : heat >= 30 ? '#FFB347' : '#FFD23F';
    ctx.fillStyle = color;
    const h = Math.round(42 * p);
    ctx.fillRect(x + 2, y + 44 - h, 4, h + 2);
    ctx.fillRect(x, y + 45, 8, 8);
    // Marca de 60 (empieza a gotear)
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(x + 7, y + 44 - Math.round(42 * 0.6), 2, 1);
  }

  // Cargas de vapor de Hezron (nivel 3)
  drawVapor(ctx, v) {
    const x0 = SCREEN.W - 44;
    const y = 18;
    for (let i = 0; i < v.max; i++) {
      const x = x0 + i * 13;
      const on = i < v.charges;
      ctx.fillStyle = on ? '#E8E8F0' : '#3A3A4E';
      ctx.fillRect(x + 1, y + 2, 9, 4);
      ctx.fillRect(x + 3, y, 5, 8);
      ctx.fillStyle = on ? ACCENTS.hezron : '#2A2A38';
      ctx.fillRect(x + 2, y + 5, 7, 2);
    }
  }

  // Cuenta regresiva de DEADLINE (nivel 3, jefe)
  drawDeadline(ctx, sec) {
    const s = Math.max(0, Math.ceil(sec));
    const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const urgent = sec <= 30;
    const color = urgent ? (Math.floor(this.t * 4) % 2 ? UI.red : UI.text) : UI.text;
    drawText(ctx, TEXTS.hud.deadline, SCREEN.W / 2, 24, { align: 'center', color: UI.textDim });
    drawText(ctx, txt, SCREEN.W / 2, 33, { align: 'center', bold: true, scale: 2, color });
  }

  // Barra de vida del jefe: arriba al centro, con nombre y segmentos
  drawBoss(ctx, b) {
    const w = 140;
    const x = Math.round((SCREEN.W - w) / 2);
    const y = 6;
    ctx.fillStyle = 'rgba(7,7,12,0.7)';
    ctx.fillRect(x - 3, y - 2, w + 6, 18);
    drawText(ctx, b.name, SCREEN.W / 2, y, { align: 'center', color: UI.magenta });
    ctx.fillStyle = CHOCO.o;
    ctx.fillRect(x, y + 10, w, 5);
    const shown = Math.max(0, Math.min(1, this.bossShown));
    const real = Math.max(0, Math.min(1, b.hp01));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 1, y + 11, Math.round((w - 2) * shown), 3);
    ctx.fillStyle = UI.magenta;
    ctx.fillRect(x + 1, y + 11, Math.round((w - 2) * real), 3);
    const seg = b.segments || 1;
    ctx.fillStyle = CHOCO.o;
    for (let i = 1; i < seg; i++) ctx.fillRect(x + Math.round((w * i) / seg), y + 10, 1, 5);
  }
}


// Un cuadrito de chocolate de la barra (reutilizado en ranuras y mapa)
export function drawSquare(ctx, x, y, i, size = SLOT) {
  ctx.fillStyle = i === 0 ? CHOCO.W : CHOCO.s;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = CHOCO.b;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = CHOCO.l;
  ctx.fillRect(x + 1, y + 1, size - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, size - 2);
  ctx.fillStyle = CHOCO.h;
  ctx.fillRect(x + 2, y + 2, 2, 1);
  ctx.fillStyle = CHOCO.s;
  ctx.fillRect(x + 2, y + size - 2, size - 3, 1);
  ctx.fillRect(x + size - 2, y + 2, 1, size - 3);
  if (i === 0) {
    ctx.fillStyle = CHOCO.w;
    ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
    ctx.fillStyle = CHOCO.y;
    ctx.fillRect(x + 1, y + size - 4, 3, 1);
  } else {
    ctx.fillStyle = SLOT_ACCENTS[i];
    ctx.fillRect(x + size - 4, y + size - 4, 2, 2);
  }
}

// Barra de chocolate compacta: n cuadritos llenos de 5 (ranuras, mapa, pausa)
export function drawMiniBar(ctx, x, y, filled, size = 8) {
  ctx.fillStyle = CHOCO.o;
  ctx.fillRect(x, y, 5 * (size + 1) + 1, size + 2);
  for (let i = 0; i < 5; i++) {
    const sx = x + 1 + i * (size + 1);
    if (i < filled) drawSquare(ctx, sx, y + 1, i, size);
    else {
      ctx.fillStyle = '#2A1A12';
      for (let k = 0; k < size; k += 2) {
        ctx.fillRect(sx + k, y + 1, 1, 1);
        ctx.fillRect(sx + k, y + size, 1, 1);
      }
    }
  }
}

export function drawLifeIcon(ctx, x, y) {
  ctx.fillStyle = CHOCO.o;
  ctx.fillRect(x, y, 7, 9);
  ctx.fillStyle = CHOCO.b;
  ctx.fillRect(x + 1, y + 1, 5, 4);
  ctx.fillStyle = CHOCO.e;
  ctx.fillRect(x + 1, y + 2, 2, 1);
  ctx.fillRect(x + 4, y + 2, 2, 1);
  ctx.fillStyle = CHOCO.w;
  ctx.fillRect(x + 1, y + 5, 5, 3);
}
