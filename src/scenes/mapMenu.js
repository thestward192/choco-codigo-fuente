// Menú pequeño del mapa de mundos (ESC): volver, opciones o salir al título.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { OptionsScene } from './OptionsScene.js';
import { Flow } from '../game/flow.js';

export class PauseMenuFromMap extends Scene {
  constructor(game) {
    super(game);
    this.drawBelow = true;
    this.t = 0;
    this.menu = new Menu(
      [
        { id: 'resume', label: TEXTS.worldMap.resume },
        { id: 'options', label: TEXTS.worldMap.options },
        { id: 'title', label: TEXTS.worldMap.toTitle },
      ],
      { x: SCREEN.W / 2 - 40, y: 82, spacing: 13 },
    );
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    const r = this.menu.update(dt, g);
    if (r === 'resume' || r === 'cancel') g.pop();
    else if (r === 'options') g.push(new OptionsScene(g));
    else if (r === 'title') {
      g.session = null;
      Flow.toTitle(g);
    }
  }

  draw(ctx) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    const h = Math.round(58 * Math.min(1, this.t * 8));
    drawTerminalPanel(ctx, SCREEN.W / 2 - 58, Math.round(95 - h / 2), 116, Math.max(4, h), TEXTS.worldMap.menuTitle);
    if (this.t > 0.12) this.menu.draw(ctx);
  }
}
