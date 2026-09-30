// Resultados del nivel: "NIVEL COMPLETADO", conteo animado de tiempo, muertes, bits y
// Y doradas, récord nuevo resaltado y el fundador rescatado con una frase de despedida.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, drawTextBox } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, ACCENTS } from '../art/palettes.js';
import { levelById } from '../data/levels.js';
import { formatTime, nextLevel } from '../game/progress.js';
import { portrait } from '../art/portraits.js';
import { Ease } from '../core/tween.js';
import { playSfx } from '../audio/sfx.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.results;
const ROW_TIME = 0.55; // tiempo de conteo de cada fila

export class ResultsScene extends Scene {
  constructor(game, levelId, stats, result) {
    super(game);
    this.id = levelId;
    // Sala de pruebas suelta (sin nivel): colores neutros
    this.level = levelById(levelId) || { color: '#10131F', accent: '#43D9FF' };
    this.levelName = levelId === null ? TEXTS.testRoom.title : TEXTS.levels[levelId].name;
    this.stats = stats;
    this.result = result;
    this.t = 0;
    this.done = false;
    this.lastTick = -1;
    const golden = (stats.goldenY || []).filter(Boolean).length;
    this.rows = [
      { label: T.time, value: stats.time, fmt: (v) => formatTime(v) },
      { label: T.deaths, value: stats.deaths, fmt: (v) => String(Math.round(v)) },
      { label: T.bits, value: stats.bits, fmt: (v) => String(Math.round(v)) },
      { label: T.goldenY, value: golden, fmt: (v) => `${Math.round(v)}/3` },
    ];
    // La despedida del fundador solo la primera vez que se completa
    this.farewell = result.firstTime ? TEXTS.farewells[levelId] || null : null;
  }

  enter() {
    playSfx(this.game.audio, 'goldenY');
  }

  get countStart() {
    return 0.8;
  }

  update(dt) {
    this.t += dt;
    // Tick de conteo
    const k = Math.floor((this.t - this.countStart) / 0.06);
    const counting = this.t > this.countStart && this.t < this.countStart + this.rows.length * ROW_TIME;
    if (counting && k !== this.lastTick) {
      this.lastTick = k;
      this.game.audio.tone({ wave: 'pulse12', f0: 1200 + (k % 4) * 80, dur: 0.02, vol: 0.05 });
    }
    const endCount = this.countStart + this.rows.length * ROW_TIME;
    if (!this.recordPlayed && this.result.newRecord && this.t > endCount) {
      this.recordPlayed = true;
      playSfx(this.game.audio, 'checkpoint');
    }
    if (this.done || this.game.transitioning) return;
    if (this.game.input.pressed('confirm')) {
      if (this.t < endCount) {
        this.t = endCount; // completar el conteo
        return;
      }
      this.done = true;
      playSfx(this.game.audio, 'menuConfirm');
      const data = this.game.session?.data;
      if (data) Flow.toWorldMap(this.game, { focus: nextLevel(data) });
      else Flow.toTitle(this.game);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.fillStyle = this.level.color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, SCREEN.W, 40);
    ctx.globalAlpha = 1;
    // Título que rebota
    const p = Ease.outBounce(Math.min(1, this.t / 0.7));
    drawText(ctx, T.title, SCREEN.W / 2, Math.round(-30 + 44 * p), { align: 'center', bold: true, scale: 2, color: UI.yellow, shadow: '#000' });
    drawText(ctx, this.levelName, SCREEN.W / 2, 34, { align: 'center', color: this.level.accent });

    const x0 = this.farewell ? 20 : 80;
    this.rows.forEach((r, i) => {
      const start = this.countStart + i * ROW_TIME;
      if (this.t < start) return;
      const p = Math.min(1, (this.t - start) / (ROW_TIME * 0.9));
      const y = 56 + i * 16;
      drawText(ctx, r.label, x0, y, { color: UI.textDim });
      drawText(ctx, r.fmt(r.value * p), x0 + 150, y, { align: 'right', bold: true });
    });
    const endCount = this.countStart + this.rows.length * ROW_TIME;
    if (this.result.newRecord && this.t > endCount && Math.floor(this.t * 3) % 2 === 0) {
      drawText(ctx, T.record, x0 + 75, 124, { align: 'center', bold: true, color: UI.magenta });
    }
    if (this.farewell && this.t > endCount + 0.2) this.drawFarewell(ctx);
    if (this.t > endCount + 0.5 && Math.floor(this.t * 2) % 2 === 0) {
      drawText(ctx, T.next, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
    }
  }

  drawFarewell(ctx) {
    const f = this.farewell;
    const x = 190;
    const y = 52;
    const slide = Math.round(Math.max(0, 1 - (this.t - (this.countStart + this.rows.length * ROW_TIME + 0.2)) * 5) * 40);
    ctx.fillStyle = '#0E0E18';
    ctx.fillRect(x - 4 + slide, y - 4, 124, 104);
    ctx.fillStyle = ACCENTS[f.who];
    ctx.fillRect(x - 4 + slide, y - 4, 124, 1);
    const bob = Math.round(Math.sin(this.t * 4));
    ctx.drawImage(portrait(f.who, 'happy').normal, x + 42 + slide, y + bob);
    drawText(ctx, TEXTS.characters[f.who], x + 58 + slide, y + 36, { align: 'center', bold: true, color: ACCENTS[f.who] });
    drawTextBox(ctx, `"${f.text}"`, x + slide, y + 49, 116, { color: UI.text, lineHeight: 10 });
  }
}
