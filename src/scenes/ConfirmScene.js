// Ventana de confirmación Sí / No superpuesta (con "No" seleccionado por defecto).
import { Scene } from '../core/game.js';
import { drawTextBox } from '../art/font.js';
import { wrapText } from '../art/fontData.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';

export class ConfirmScene extends Scene {
  constructor(game, message, onYes, onNo = null, { danger = false } = {}) {
    super(game);
    this.drawBelow = true;
    this.message = message;
    this.onYes = onYes;
    this.onNo = onNo;
    this.danger = danger;
    this.t = 0;
    this.lines = wrapText(message, 196);
    this.h = 40 + this.lines.length * 11;
    this.menu = new Menu(
      [
        { id: 'no', label: TEXTS.confirm.no },
        { id: 'yes', label: TEXTS.confirm.yes },
      ],
      { x: SCREEN.W / 2 - 10, y: 0, spacing: 12 },
    );
  }

  update(dt) {
    this.t += dt;
    const r = this.menu.update(dt, this.game);
    if (r === 'yes') {
      this.game.pop();
      this.onYes?.();
    } else if (r === 'no' || r === 'cancel') {
      this.game.pop();
      this.onNo?.();
    }
  }

  draw(ctx) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    const w = 212;
    const pop = Math.min(1, this.t * 8);
    const h = Math.round(this.h * pop);
    const x = (SCREEN.W - w) / 2;
    const y = Math.round((SCREEN.H - h) / 2);
    drawTerminalPanel(ctx, x, y, w, h, this.danger ? 'rm -rf ?' : 'confirmar');
    if (pop < 1) return;
    drawTextBox(ctx, this.message, x + 8, y + 17, w - 16, { color: this.danger ? UI.yellow : UI.text });
    this.menu.y = y + 20 + this.lines.length * 11;
    this.menu.draw(ctx);
  }
}
