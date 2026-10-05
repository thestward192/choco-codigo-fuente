// Estadísticas finales (después del epílogo): tiempo total, muertes, Y doradas (x/15) y el mejor
// tiempo de cada nivel. Anuncia el Modo Hotfix y, si faltan Y, que hay una escena extra.
// Enter → créditos (y la escena extra después, si se recolectaron las 15 Y doradas).
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, drawTextBox } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { formatTime, totalGolden } from '../game/progress.js';
import { MAP_LEVELS, levelById } from '../data/levels.js';
import { trophySprite } from '../art/codigo.js';
import { drawMiniBar } from '../ui/hud.js';
import { playSfx } from '../audio/sfx.js';
import { Ease } from '../core/tween.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.finalStats;
const ROW = 0.45;

export class FinalStatsScene extends Scene {
  constructor(game, { stats = null, result = null } = {}) {
    super(game);
    this.t = 0;
    this.result = result;
    const d = game.session?.data;
    this.data = d;
    this.golden = d ? totalGolden(d) : 0;
    this.rows = [
      { label: T.totalTime, value: formatTime(d ? d.totalTime : stats?.time ?? 0) },
      { label: T.deaths, value: String(d ? d.deaths : stats?.deaths ?? 0) },
      { label: T.goldenY, value: `${this.golden}/15` },
    ];
    this.best = MAP_LEVELS.map((id) => ({ id, name: TEXTS.levels[id].name, time: d ? d.bestTime[id] : undefined, color: levelById(id).accent }));
    this.leaving = false;
  }

  update(dt) {
    const before = this.t;
    this.t += dt;
    const k = Math.floor((this.t - 0.6) / ROW);
    if (k >= 0 && k < this.rows.length + 1 && Math.floor((before - 0.6) / ROW) !== k) playSfx(this.game.audio, 'bit');
    if (this.leaving || this.game.transitioning) return;
    if (this.game.input.pressed('confirm') && this.t > 1.2) {
      this.leaving = true;
      playSfx(this.game.audio, 'menuConfirm');
      Flow.toCredits(this.game, { extra: this.golden >= 15 });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#07050D';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.fillStyle = '#2A1446';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, SCREEN.W, 34);
    ctx.globalAlpha = 1;
    const p = Ease.outBounce(Math.min(1, this.t / 0.7));
    drawText(ctx, T.title, SCREEN.W / 2, Math.round(-20 + 30 * p), { align: 'center', bold: true, scale: 2, color: UI.yellow, shadow: '#000' });
    // Trofeo y la barra completa
    const spr = trophySprite();
    ctx.drawImage(spr.normal, 24, 44, spr.w * 2, spr.h * 2);
    drawMiniBar(ctx, 14, 92, 5, 8);
    drawText(ctx, T.complete, 14, 104, { color: UI.textDim });
    // Totales
    this.rows.forEach((r, i) => {
      if (this.t < 0.6 + i * ROW) return;
      const y = 46 + i * 14;
      drawText(ctx, r.label, 112, y, { color: UI.textDim });
      drawText(ctx, r.value, 220, y, { align: 'right', bold: true, color: i === 2 && this.golden >= 15 ? UI.yellow : UI.text });
    });
    // Mejores tiempos
    if (this.t > 0.6 + this.rows.length * ROW) {
      drawText(ctx, T.bestTimes, 232, 40, { color: UI.cyan });
      this.best.forEach((b, i) => {
        const y = 52 + i * 10;
        drawText(ctx, String(b.id), 232, y, { color: b.color });
        drawText(ctx, formatTime(b.time), SCREEN.W - 8, y, { align: 'right', color: UI.text });
      });
    }
    const late = this.t > 1.2 + this.rows.length * ROW;
    if (late) {
      if (this.data?.hotfixUnlocked) {
        drawText(ctx, T.hotfix, SCREEN.W / 2, 118, { align: 'center', bold: true, color: Math.floor(this.t * 3) % 2 ? UI.magenta : '#FF7DB0' });
        drawTextBox(ctx, T.hotfixDesc, 24, 132, SCREEN.W - 48, { color: UI.text, lineHeight: 9 });
      }
      if (this.golden < 15) drawTextBox(ctx, T.extraHint, SCREEN.W / 2, this.data?.hotfixUnlocked ? 152 : 122, SCREEN.W - 40, { align: 'center', color: UI.textDim, lineHeight: 9 });
      if (Math.floor(this.t * 2) % 2 === 0) drawText(ctx, T.next, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
    }
  }
}
