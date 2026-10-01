// Tarjeta de título del nivel: fondo del color del nivel, número y nombre que entran animados,
// subtítulo, y desde el nivel 3 Stward rapea 2 líneas. 3 s, saltable.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, measureText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, ACCENTS } from '../art/palettes.js';
import { levelById } from '../data/levels.js';
import { Ease } from '../core/tween.js';
import { portrait } from '../art/portraits.js';
import { Typewriter } from '../systems/typewriter.js';
import { playSfx } from '../audio/sfx.js';

const BASE_TIME = 3;
const RAP_TIME = 2.2;

export class LevelTitleScene extends Scene {
  constructor(game, id, onDone) {
    super(game);
    this.id = id;
    this.level = levelById(id);
    this.onDone = onDone;
    this.t = 0;
    this.done = false;
    const rescuedStward = !game.session || game.session.data.founders.includes('stward');
    this.rap = id >= 3 && rescuedStward ? TEXTS.stwardRaps[id] : null;
    this.duration = BASE_TIME + (this.rap ? RAP_TIME : 0);
    if (this.rap) this.rapTw = this.rap.map((l) => new Typewriter(l, 'normal'));
    this.rapLine = 0;
  }

  enter() {
    this.game.audio.stopMusic(0.4);
    playSfx(this.game.audio, 'checkpoint');
  }

  update(dt) {
    this.t += dt;
    if (this.done) return;
    // Rima de Stward, línea por línea al ritmo
    if (this.rap && this.t > 1.2) {
      const tw = this.rapTw[this.rapLine];
      for (const ch of tw.update(dt)) if (ch !== ' ') this.game.audio.blip(440, false);
      if (tw.done && this.rapLine < this.rapTw.length - 1 && this.t > 1.2 + (this.rapLine + 1) * 1.6) this.rapLine++;
    }
    if (this.t >= this.duration || (this.t > 0.4 && this.game.input.pressed('confirm'))) {
      this.done = true;
      this.onDone();
    }
  }

  draw(ctx) {
    const L = this.level;
    ctx.fillStyle = L.color;
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    // Franjas diagonales que se desplazan
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    for (let i = -10; i < 30; i++) {
      const x = Math.round(i * 24 + ((this.t * 20) % 24));
      for (let y = 0; y < SCREEN.H; y += 2) ctx.fillRect(x + y / 2, y, 10, 2);
    }
    ctx.globalAlpha = 1;
    // Número: entra desde la izquierda
    const p1 = Ease.outBack(Math.min(1, this.t / 0.5));
    const numX = Math.round(-120 + (SCREEN.W / 2 + 120) * p1);
    drawText(ctx, TEXTS.levelCard.number(this.id), numX, 34, { align: 'center', bold: true, scale: 2, color: L.accent, shadow: '#000' });
    // Nombre: entra desde la derecha
    const p2 = Ease.outBack(Math.min(1, Math.max(0, (this.t - 0.2) / 0.5)));
    const nameX = Math.round(SCREEN.W + 160 - (SCREEN.W / 2 + 160) * p2);
    // Nombres largos ("Deploy de medianoche") bajan a escala 2 para caber
    const name = TEXTS.levels[this.id].name.toUpperCase();
    const scale = measureText(name, true) * 3 <= SCREEN.W - 10 ? 3 : 2;
    drawText(ctx, name, nameX, scale === 3 ? 60 : 66, { align: 'center', bold: true, scale, color: UI.text, shadow: '#000' });
    // Subtítulo
    const a = Math.min(1, Math.max(0, (this.t - 0.8) / 0.4));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000';
    ctx.fillRect(40, 94, SCREEN.W - 80, 1);
    drawText(ctx, TEXTS.levels[this.id].subtitle, SCREEN.W / 2, 100, { align: 'center', color: UI.text });
    ctx.globalAlpha = 1;
    if (this.rap && this.t > 1.0) this.drawRap(ctx);
    // Salida: fundido a negro al final
    const out = Math.max(0, (this.t - (this.duration - 0.3)) / 0.3);
    if (out > 0) {
      ctx.globalAlpha = Math.min(1, out);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
  }

  drawRap(ctx) {
    const y = 124;
    const slide = Math.round(Math.max(0, 1 - (this.t - 1.0) * 5) * 60);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(20 - slide, y - 4, SCREEN.W - 40, 42);
    ctx.globalAlpha = 1;
    // Stward rebota al ritmo (90 BPM)
    const beat = Math.abs(Math.sin(this.t * Math.PI * 1.5));
    ctx.drawImage(portrait('stward', 'happy').normal, 26 - slide, y + 1 - Math.round(beat * 2));
    drawText(ctx, TEXTS.characters.stward, 64 - slide, y, { color: ACCENTS.stward, bold: true });
    this.rapTw.forEach((tw, i) => {
      if (i > this.rapLine) return;
      drawText(ctx, this.rap[i], 64 - slide, y + 12 + i * 11, { maxChars: tw.shown, color: UI.text });
    });
  }
}
