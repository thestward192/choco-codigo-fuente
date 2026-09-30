// Presentación: fondo blanco, el logo de CHC Studio aparece con fundido y "presenta" debajo.
// 2.5 s y fundido de salida. Se salta con cualquier botón.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { loadLogo, drawLogo } from '../art/logo.js';
import { Flow } from '../game/flow.js';

const FADE_IN = 0.6;
const HOLD = 1.4;
const FADE_OUT = 0.5;

export class SplashScene extends Scene {
  constructor(game) {
    super(game);
    this.t = 0;
    this.left = false;
    loadLogo();
  }

  enter() {
    // Sonido suave de entrada
    const a = this.game.audio;
    [72, 79, 84].forEach((m, i) =>
      a.tone({ wave: 'triangle', f0: 440 * Math.pow(2, (m - 69) / 12), dur: 0.9, vol: 0.12, at: 0.15 + i * 0.12 }),
    );
  }

  update(dt) {
    this.t += dt;
    if (this.left) return;
    const total = FADE_IN + HOLD + FADE_OUT;
    if (this.t >= total || (this.t > 0.3 && this.game.input.anyPressed)) {
      this.left = true;
      Flow.toTitle(this.game, { type: 'fade' });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    let a = 1;
    if (this.t < FADE_IN) a = this.t / FADE_IN;
    else if (this.t > FADE_IN + HOLD) a = Math.max(0, 1 - (this.t - FADE_IN - HOLD) / FADE_OUT);
    ctx.globalAlpha = a;
    drawLogo(ctx, SCREEN.W / 2, SCREEN.H / 2 - 10, 110);
    drawText(ctx, TEXTS.splash.presents, SCREEN.W / 2, SCREEN.H / 2 + 50, { align: 'center', color: '#191D28', shadow: false });
    ctx.globalAlpha = 1;
  }
}
