// Diálogos del Modo Sincronizado — docs/coop/03_mecanicas_coop.md ("Pausa, diálogos y cinemáticas")
// No es una escena encima: se dibuja dentro de la sala, que sigue corriendo (no hay pausa en línea).
// - Cada caja avanza cuando LOS DOS confirman, o sola 4 s después de terminar de escribirse.
// - Para saltar todo, los dos mantienen Esc 1 s (un anillo por jugador).
// - L.A.G. habla con eco: el texto aparece dos veces, la copia atrasada, y cada bip se repite tarde.
import { COOP, SCREEN } from '../config/balance.js';
import { Typewriter } from '../systems/typewriter.js';
import { SPEAKERS, drawHoldRing } from '../systems/dialogue.js';
import { drawText, wrapText } from '../art/font.js';
import { portrait } from '../art/portraits.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { fxRng } from '../core/rng.js';
import { charColor } from './art.js';

// Arriba, debajo del HUD: abajo taparía a los personajes (el juego sigue corriendo)
const BOX = { x: 4, y: 26, w: SCREEN.W - 8, h: 46 };
const TEXT_X = BOX.x + 46;
const TEXT_W = BOX.w - 54;
const ECHO_CHARS = 4; // la copia de L.A.G. va 4 letras atrás
const ECHO_DELAY = 0.22; // s de atraso del bip repetido

export class CoopDialogue {
  // lines: [{ who, text, face }] · solo: no espera al compañero (sala sin compañero)
  constructor(game, lines, { onDone = null, onSkip = null, solo = false } = {}) {
    this.game = game;
    this.lines = lines;
    this.onDone = onDone;
    this.onSkip = onSkip;
    this.solo = solo;
    this.index = 0;
    this.t = 0;
    this.open = 0;
    this.closing = false;
    this.done = false;
    this.mineOk = new Set();
    this.theirOk = new Set();
    this.holdT = 0;
    this.holding = false;
    this.partnerHold = false;
    this.partnerHoldT = 0;
    this.start();
  }

  get line() {
    return this.lines[this.index];
  }

  start() {
    const l = this.line;
    this.wrapped = wrapText(l.text, TEXT_W);
    this.tw = new Typewriter(this.wrapped.join('\n'), this.game.options?.textSpeed || 'normal');
    this.blips = 0;
    this.lineT = 0;
    this.autoT = 0;
  }

  partnerOk(i) {
    if (Number.isInteger(i)) this.theirOk.add(i);
  }

  // level: la sala (para mandar act y saber si hay compañero)
  update(dt, inp, level) {
    this.t += dt;
    this.lineT += dt;
    if (this.closing) {
      this.open = Math.max(0, this.open - dt * 8);
      if (this.open <= 0) this.done = true;
      return;
    }
    this.open = Math.min(1, this.open + dt * 8);
    if (this.open < 1) return;
    const alone = this.solo || !level.partner.present;

    // Saltar: los dos mantienen Esc
    const hold = inp.down('pause') || inp.down('skip');
    if (hold !== this.holding) {
      this.holding = hold;
      level.act('skip', { on: hold });
    }
    this.holdT = hold ? this.holdT + dt : 0;
    this.partnerHoldT = this.partnerHold ? this.partnerHoldT + dt : 0;
    if (this.holdT >= COOP.SKIP_HOLD && (alone || this.partnerHoldT >= COOP.SKIP_HOLD * 0.5)) {
      this.closing = true;
      this.skipped = true;
      this.onSkip?.();
      return;
    }

    // Letra por letra, con bip por personaje (L.A.G. con eco)
    const sp = SPEAKERS[this.line.who] || SPEAKERS.system;
    const a = this.game.audio;
    for (const ch of this.tw.update(dt)) {
      if (ch === ' ' || ch === '\n' || this.blips++ % 2) continue;
      a.blip(sp.pitch, !!sp.glitch);
      if (this.line.who === 'lag' && a.ctx) a.tone({ wave: 'triangle', f0: sp.pitch * 0.98, dur: 0.05, vol: 0.04, at: ECHO_DELAY, bus: 'voice' });
    }
    if (inp.pressed('confirm') && this.lineT > 0.1) {
      if (!this.tw.done) this.tw.complete();
      else if (!this.mineOk.has(this.index)) {
        this.mineOk.add(this.index);
        level.act('dlg', { i: this.index });
        a.blip(900, false);
      }
    }
    if (!this.tw.done) return;
    this.autoT += dt;
    const both = this.mineOk.has(this.index) && (alone || this.theirOk.has(this.index));
    if (both || this.autoT >= COOP.DIALOGUE_AUTO) this.next();
  }

  next() {
    if (this.index < this.lines.length - 1) {
      this.index++;
      this.start();
    } else this.closing = true;
  }

  draw(ctx, level) {
    const l = this.line;
    const isLag = l.who === 'lag';
    const sp = SPEAKERS[l.who] || SPEAKERS.system;
    const h = Math.max(2, Math.round(BOX.h * this.open));
    const y = BOX.y + Math.round((BOX.h - h) / 2);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = isLag ? '#101016' : '#0E0E18';
    ctx.fillRect(BOX.x, y, BOX.w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = sp.color;
    ctx.fillRect(BOX.x, y, BOX.w, 1);
    ctx.fillRect(BOX.x, y + h - 1, BOX.w, 1);
    ctx.fillRect(BOX.x, y, 1, h);
    ctx.fillRect(BOX.x + BOX.w - 1, y, 1, h);
    if (isLag) {
      // Borde atrasado: una copia del marco 2 px corrida
      ctx.globalAlpha = 0.35;
      ctx.fillRect(BOX.x + 2, y + 2, BOX.w, 1);
      ctx.fillRect(BOX.x + BOX.w + 1, y + 2, 1, h);
      ctx.globalAlpha = 1;
    }
    if (this.open < 1) return;

    // Retrato
    const px = BOX.x + 6;
    const py = BOX.y + 7;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(px - 1, py - 1, 34, 34);
    const pr = portrait(l.who, l.face || 'normal');
    if (isLag) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(pr.normal, px + 2, py + 1);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(pr.normal, px, py + (this.lineT < 0.15 ? -1 : 0));
    drawText(ctx, TEXTS.characters[l.who] || l.who, TEXT_X, BOX.y + 5, { color: sp.color, bold: true });

    // Texto (L.A.G.: con una copia atrasada)
    const drawLines = (shown, dx, dy, color, alpha) => {
      let remaining = shown;
      ctx.globalAlpha = alpha;
      this.wrapped.forEach((line, i) => {
        if (remaining <= 0) return;
        const n = Math.min(remaining, [...line].length);
        drawText(ctx, line, TEXT_X + dx, BOX.y + 18 + i * 11 + dy, { color, maxChars: n, shadow: alpha === 1 });
        remaining -= [...line].length + 1;
      });
      ctx.globalAlpha = 1;
    };
    if (isLag) drawLines(Math.max(0, this.tw.shown - ECHO_CHARS), 1 + (fxRng.chance(0.1) ? 1 : 0), 1, '#7A7A9A', 0.6);
    drawLines(this.tw.shown, 0, 0, UI.text, 1);

    // Quién ya confirmó: una marquita de cada color, y la barra del avance solo
    if (this.tw.done) {
      const bx = BOX.x + BOX.w - 24;
      const by = BOX.y + BOX.h - 9;
      const mine = this.mineOk.has(this.index);
      const theirs = this.theirOk.has(this.index);
      this.drawCheck(ctx, bx, by, charColor(level.mine), mine);
      this.drawCheck(ctx, bx + 10, by, charColor(level.theirs), theirs);
      const k = Math.min(1, this.autoT / COOP.DIALOGUE_AUTO);
      ctx.fillStyle = '#2A2A3A';
      ctx.fillRect(TEXT_X, BOX.y + BOX.h - 4, TEXT_W - 30, 1);
      ctx.fillStyle = sp.color;
      ctx.fillRect(TEXT_X, BOX.y + BOX.h - 4, Math.round((TEXT_W - 30) * k), 1);
    }
    // Anillos de "mantené para saltar", uno por jugador
    if (this.holdT > 0.05 || this.partnerHold) {
      drawHoldRing(ctx, BOX.x + BOX.w - 24, BOX.y + 9, this.holdT / COOP.SKIP_HOLD, charColor(level.mine));
      drawHoldRing(ctx, BOX.x + BOX.w - 10, BOX.y + 9, this.partnerHoldT / COOP.SKIP_HOLD, charColor(level.theirs));
    }
  }

  drawCheck(ctx, x, y, color, on) {
    ctx.fillStyle = on ? color : '#2A2A3A';
    if (on) {
      ctx.fillRect(x, y + 3, 1, 1);
      ctx.fillRect(x + 1, y + 4, 1, 1);
      ctx.fillRect(x + 2, y + 3, 1, 1);
      ctx.fillRect(x + 3, y + 2, 1, 1);
      ctx.fillRect(x + 4, y + 1, 1, 1);
      ctx.fillRect(x + 5, y, 1, 1);
    } else ctx.fillRect(x, y + 2, 6, 1);
  }
}
