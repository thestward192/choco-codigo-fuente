// Pantalla negra "Presioná cualquier tecla": desbloquea el audio (requisito del navegador).
import { Scene } from '../core/game.js';
import { drawText } from '../art/font.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';

export class BootScene extends Scene {
  constructor(game, next) {
    super(game);
    this.next = next; // () => Scene
    this.t = 0;
    this.leaving = false;
  }

  update(dt) {
    this.t += dt;
    if (!this.leaving && this.game.input.anyPressed) {
      this.leaving = true;
      this.game.audio.unlock();
      this.game.changeScene(this.next, { type: 'fade' });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    // Parpadeo suave
    if (Math.floor(this.t * 2) % 2 === 0 || this.leaving) {
      drawText(ctx, TEXTS.system.pressAnyKey, SCREEN.W / 2, SCREEN.H / 2 - 4, { align: 'center', color: UI.text });
    }
  }
}
