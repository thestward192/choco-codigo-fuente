// Cajas de diálogo — docs/06_menus_ui.md
// Retrato de 32×32 con expresión, nombre en el color del personaje, texto letra por letra
// con bip por personaje. Confirmar completa / avanza; mantener cancelar 1 s salta todo.
// N.U.L.L. usa una caja negra con borde magenta glitcheado.
import { Scene } from '../core/game.js';
import { Typewriter } from './typewriter.js';
import { drawText, wrapText } from '../art/font.js';
import { portrait } from '../art/portraits.js';
import { SCREEN, INPUT } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { ACCENTS, UI } from '../art/palettes.js';
import { fxRng } from '../core/rng.js';

export const SPEAKERS = {
  choco: { color: '#D9AE4B', pitch: 520 },
  null: { color: '#FF2E88', pitch: 300, glitch: true },
  oscar: { color: ACCENTS.oscar, pitch: 620 },
  stward: { color: ACCENTS.stward, pitch: 440 },
  hezron: { color: ACCENTS.hezron, pitch: 360 },
  fabiola: { color: ACCENTS.fabiola, pitch: 700 },
  system: { color: UI.cyan, pitch: 900 },
};

const BOX = { x: 4, y: SCREEN.H - 50, w: SCREEN.W - 8, h: 46 };
const TEXT_X = BOX.x + 46;
const TEXT_W = BOX.w - 54;

export class DialogueScene extends Scene {
  // lines: [{ who, text, face }], onDone: callback al cerrar
  constructor(game, lines, onDone = null, { onSkipAll = null } = {}) {
    super(game);
    this.drawBelow = true;
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone;
    this.onSkipAll = onSkipAll; // si viene de una cinemática, saltar la cinemática entera
    this.t = 0;
    this.open = 0; // animación de apertura 0..1
    this.closing = false;
    this.skipHold = 0;
    this.start();
  }

  get line() {
    return this.lines[this.index];
  }

  start() {
    const l = this.line;
    // Máximo 2 líneas de caja: el texto se corta si fuera más largo (se valida en pruebas)
    this.wrapped = wrapText(l.text, TEXT_W);
    this.tw = new Typewriter(this.wrapped.join('\n'), this.game.options.textSpeed);
    this.blipCount = 0;
    this.lineT = 0;
  }

  update(dt) {
    this.t += dt;
    this.lineT += dt;
    const inp = this.game.input;
    if (this.closing) {
      this.open = Math.max(0, this.open - dt * 8);
      if (this.open <= 0) this.finish();
      return;
    }
    this.open = Math.min(1, this.open + dt * 8);
    if (this.open < 1) return;

    // Mantener cancelar 1 s salta todo el diálogo
    if (inp.down('cancel') || inp.down('skip')) {
      this.skipHold += dt;
      if (this.skipHold >= INPUT.SKIP_HOLD) {
        if (this.onSkipAll && inp.down('skip')) this.onSkipAll();
        else this.closing = true;
        return;
      }
    } else this.skipHold = 0;

    const sp = SPEAKERS[this.line.who] || SPEAKERS.system;
    for (const ch of this.tw.update(dt)) {
      if (ch !== ' ' && ch !== '\n' && this.blipCount++ % 2 === 0) this.game.audio.blip(sp.pitch, !!sp.glitch);
    }
    if (inp.pressed('confirm') && this.lineT > 0.08) {
      if (!this.tw.done) this.tw.complete();
      else if (this.index < this.lines.length - 1) {
        this.index++;
        this.start();
      } else this.closing = true;
    }
  }

  finish() {
    if (this.game.top === this) this.game.pop();
    if (this.onDone) this.onDone();
  }

  draw(ctx) {
    const l = this.line;
    const isNull = l.who === 'null';
    const sp = SPEAKERS[l.who] || SPEAKERS.system;
    // Apertura: la caja crece desde el centro
    const h = Math.max(2, Math.round(BOX.h * this.open));
    const y = BOX.y + Math.round((BOX.h - h) / 2);
    ctx.fillStyle = isNull ? '#000000' : '#0E0E18';
    ctx.globalAlpha = isNull ? 1 : 0.94;
    ctx.fillRect(BOX.x, y, BOX.w, h);
    ctx.globalAlpha = 1;
    this.drawBorder(ctx, BOX.x, y, BOX.w, h, isNull ? '#FF2E88' : sp.color, isNull);
    if (this.open < 1) return;

    // Retrato con marco
    const px = BOX.x + 6;
    const py = BOX.y + 7;
    ctx.fillStyle = isNull ? '#12030C' : '#07070C';
    ctx.fillRect(px - 1, py - 1, 34, 34);
    const face = l.face || 'normal';
    const pr = portrait(l.who, face);
    if (isNull) {
      // Aberración cromática
      const j = fxRng.chance(0.15) ? fxRng.int(-2, 2) : 0;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(pr.tint('#FF0044'), px - 1 + j, py);
      ctx.drawImage(pr.tint('#00E5FF'), px + 1 - j, py);
      ctx.globalAlpha = 1;
    }
    // Pequeño rebote del retrato al empezar a hablar
    const bob = this.lineT < 0.15 ? -1 : 0;
    ctx.drawImage(pr.normal, px, py + bob);

    // Nombre
    const name = TEXTS.characters[l.who] || l.who;
    drawText(ctx, name, TEXT_X, BOX.y + 5, { color: sp.color, bold: true });

    // Texto (N.U.L.L. tiembla un poco cuando grita)
    let remaining = this.tw.shown;
    this.wrapped.forEach((line, i) => {
      if (remaining <= 0) return;
      const n = Math.min(remaining, [...line].length);
      const shout = isNull && line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line);
      const jx = shout && fxRng.chance(0.3) ? fxRng.int(-1, 1) : 0;
      drawText(ctx, line, TEXT_X + jx, BOX.y + 18 + i * 11, {
        color: isNull ? '#F4D6E6' : UI.text,
        maxChars: n,
      });
      remaining -= [...line].length + 1;
    });

    // Flecha de "hay más"
    if (this.tw.done) {
      const ay = BOX.y + BOX.h - 8 + (Math.floor(this.t * 4) % 2);
      ctx.fillStyle = sp.color;
      const ax = BOX.x + BOX.w - 12;
      ctx.fillRect(ax, ay, 5, 1);
      ctx.fillRect(ax + 1, ay + 1, 3, 1);
      ctx.fillRect(ax + 2, ay + 2, 1, 1);
    }
    // Indicador de "mantené para saltar"
    if (this.skipHold > 0.1) drawHoldRing(ctx, BOX.x + BOX.w - 10, BOX.y + 8, this.skipHold / INPUT.SKIP_HOLD, sp.color);
  }

  drawBorder(ctx, x, y, w, h, color, glitch) {
    ctx.fillStyle = color;
    if (!glitch) {
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + h - 1, w, 1);
      ctx.fillRect(x, y, 1, h);
      ctx.fillRect(x + w - 1, y, 1, h);
      return;
    }
    // Borde magenta en segmentos desplazados
    const seg = 16;
    for (let sx = 0; sx < w; sx += seg) {
      const o1 = fxRng.chance(0.12) ? fxRng.int(-2, 2) : 0;
      const o2 = fxRng.chance(0.12) ? fxRng.int(-2, 2) : 0;
      ctx.fillRect(x + sx + o1, y, Math.min(seg, w - sx), 1);
      ctx.fillRect(x + sx + o2, y + h - 1, Math.min(seg, w - sx), 1);
    }
    for (let sy = 0; sy < h; sy += 8) {
      const o = fxRng.chance(0.1) ? fxRng.int(-2, 2) : 0;
      ctx.fillRect(x + o, y + sy, 1, Math.min(8, h - sy));
      ctx.fillRect(x + w - 1 - o, y + sy, 1, Math.min(8, h - sy));
    }
    ctx.fillStyle = '#43D9FF';
    if (fxRng.chance(0.2)) ctx.fillRect(x + fxRng.int(0, w - 10), y + (fxRng.chance(0.5) ? 0 : h - 1), fxRng.int(3, 10), 1);
  }
}

// Anillo circular que se llena (mantener para saltar)
export function drawHoldRing(ctx, cx, cy, p, color = '#F4F1EA') {
  const r = 5;
  const steps = 24;
  ctx.fillStyle = '#3A3A4E';
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
  ctx.fillStyle = color;
  const n = Math.floor(steps * Math.min(1, p));
  for (let i = 0; i < n; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}
