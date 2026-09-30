// Game Over: Choco derretido en el suelo con la envoltura encima. "SEGMENTATION FAULT" se
// transforma en "GAME OVER". Reintentar nivel / Salir al mapa. Ánimo de un fundador rescatado.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, drawTextBox } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, ACCENTS } from '../art/palettes.js';
import { chocoMelt, FRAME_W, FRAME_H } from '../art/choco.js';
import { portrait } from '../art/portraits.js';
import { Menu } from '../ui/menu.js';
import { fxRng } from '../core/rng.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.gameOver;
const GLYPHS = '#%&@$*?!{}[]<>01∅';

export class GameOverScene extends Scene {
  constructor(game, levelId) {
    super(game);
    this.id = levelId;
    this.t = 0;
    const founders = game.session?.data.founders || [];
    this.cheerWho = founders.length ? fxRng.pick(founders) : null;
    this.cheer = this.cheerWho ? T.cheers[this.cheerWho] : T.noCheer;
    this.menu = new Menu(
      [
        { id: 'retry', label: T.retry },
        { id: 'map', label: T.toMap },
      ],
      { x: SCREEN.W / 2 - 40, y: 118, spacing: 13 },
    );
    this.leaving = false;
  }

  enter() {
    this.game.audio.stopMusic(0.3);
    const a = this.game.audio;
    [64, 60, 57, 52].forEach((m, i) => a.tone({ wave: 'triangle', f0: 440 * Math.pow(2, (m - 69) / 12), dur: 0.5, vol: 0.2, at: 0.3 + i * 0.35 }));
  }

  // Texto que se transforma letra por letra de FAULT a GAME OVER
  titleText() {
    const from = T.fault;
    const to = T.title;
    const morphStart = 1.4;
    const morphDur = 0.9;
    if (this.t < morphStart) {
      const n = Math.floor(this.t * 22);
      return [...from].slice(0, n).join('');
    }
    const p = Math.min(1, (this.t - morphStart) / morphDur);
    const len = Math.round(from.length + (to.length - from.length) * p);
    let s = '';
    for (let i = 0; i < len; i++) {
      const settled = i / len < p * 1.2 - 0.1;
      if (settled) s += to[i] ?? '';
      else s += fxRng.chance(0.5) ? GLYPHS[fxRng.int(0, GLYPHS.length - 1)] : (from[i] ?? ' ');
    }
    return s;
  }

  update(dt) {
    this.t += dt;
    if (this.t < 2.4 || this.leaving || this.game.transitioning) return;
    const r = this.menu.update(dt, this.game);
    if (r === 'retry') {
      this.leaving = true;
      if (this.id === null) this.game.changeScene(() => Flow.makeLevel(this.game, null), { type: 'iris' });
      else Flow.startLevel(this.game, this.id);
    } else if (r === 'map') {
      this.leaving = true;
      if (this.game.session) Flow.toWorldMap(this.game, { focus: this.id });
      else Flow.toTitle(this.game);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    // Choco derretido (×2), con gotitas
    const spr = chocoMelt(7);
    ctx.drawImage(spr.normal, SCREEN.W / 2 - FRAME_W, 20, FRAME_W * 2, FRAME_H * 2);
    const txt = this.titleText();
    const done = this.t > 2.3;
    const jitter = !done && fxRng.chance(0.3) ? fxRng.int(-2, 2) : 0;
    drawText(ctx, txt, SCREEN.W / 2 + jitter, 84, { align: 'center', bold: true, scale: 2, color: done ? UI.text : UI.red });
    if (this.t < 2.4) return;
    this.menu.draw(ctx);
    // Ánimo
    const y = 150;
    if (this.cheerWho) {
      ctx.drawImage(portrait(this.cheerWho, 'worried').normal, 40, y - 6, 24, 24);
      drawTextBox(ctx, `"${this.cheer}" — ${TEXTS.characters[this.cheerWho]}`, 70, y, 220, { color: ACCENTS[this.cheerWho], lineHeight: 10 });
    } else {
      drawText(ctx, this.cheer, SCREEN.W / 2, y + 4, { align: 'center', color: UI.textDim });
    }
  }
}
