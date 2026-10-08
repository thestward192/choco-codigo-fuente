// Pantalla de título: el cuarto de Choco de noche por la ventana, "CHOCO" de chocolate que
// gotea, "CÓDIGO FUENTE" que se escribe con cursor, glitch magenta ocasional y Choco en idle.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, measureText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { Ease } from '../core/tween.js';
import { SONG_TITULO } from '../audio/songs/titulo.js';
import { playSfx } from '../audio/sfx.js';
import { updateBackdrop, drawBackdrop, drawTitleLogo, drawVersion } from './menuCommon.js';
import { Flow } from '../game/flow.js';

const LOGO_Y = 16;
const TYPE_DELAY = 1.0;
const TYPE_CPS = 14;

export class TitleScene extends Scene {
  constructor(game, { skipIntro = false } = {}) {
    super(game);
    this.t = skipIntro ? 4 : 0;
    this.leaving = false;
  }

  enter() {
    this.game.audio.playSong(SONG_TITULO);
  }

  update(dt) {
    this.t += dt;
    updateBackdrop(this.game, dt);
    if (this.leaving || this.game.transitioning) return;
    if (this.game.input.pressed('confirm') || this.game.input.pressed('pause')) {
      if (this.t < 2.2) {
        this.t = 4; // saltar la animación de entrada
        return;
      }
      this.leaving = true;
      playSfx(this.game.audio, 'menuConfirm');
      Flow.toModeSelect(this.game);
    }
  }

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: null });
    // El logo cae desde arriba y rebota
    const p = Math.min(1, this.t / 0.9);
    const y = LOGO_Y - (1 - Ease.outBounce(p)) * 70;
    drawTitleLogo(ctx, this.game, y);

    // "CÓDIGO FUENTE" que se escribe con cursor
    const sub = TEXTS.title.subtitle;
    const n = Math.max(0, Math.min([...sub].length, Math.floor((this.t - TYPE_DELAY) * TYPE_CPS)));
    const sy = LOGO_Y + 52;
    if (this.t > TYPE_DELAY - 0.2) {
      const w = drawText(ctx, sub, SCREEN.W / 2, sy, { align: 'center', bold: true, scale: 2, color: UI.cyan, maxChars: n, shadow: '#0A2A3A' });
      const typed = measureText([...sub].slice(0, n).join(''), true) * 2;
      if (Math.floor(this.t * 3) % 2 === 0) {
        ctx.fillStyle = UI.cyan;
        ctx.fillRect(Math.round(SCREEN.W / 2 - w / 2 + typed + (n > 0 ? 3 : 0)), sy + 12, 10, 2);
      }
    }

    if (this.t > 2.2 && Math.floor(this.t * 1.6) % 2 === 0) {
      drawText(ctx, TEXTS.title.pressEnter, SCREEN.W / 2, 91, { align: 'center', color: UI.text });
    }
    drawVersion(ctx, TEXTS.title.version);
  }
}
