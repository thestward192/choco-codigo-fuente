// Menú pequeño del mapa de mundos (ESC): volver, opciones o salir al título.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { OptionsScene } from './OptionsScene.js';
import { Flow } from '../game/flow.js';
import { setHotfix } from '../game/progress.js';
import { playSfx } from '../audio/sfx.js';

export class PauseMenuFromMap extends Scene {
  constructor(game) {
    super(game);
    this.drawBelow = true;
    this.t = 0;
    const W = TEXTS.worldMap;
    const items = [
      { id: 'resume', label: W.resume },
      { id: 'options', label: W.options },
    ];
    // Modo Hotfix: aparece después de terminar el juego
    const s = game.session;
    if (s?.data.hotfixUnlocked) {
      const toggle = () => {
        s.update(setHotfix(s.data, !s.data.hotfix));
        playSfx(game.audio, s.data.hotfix ? 'glitch' : 'menuMove');
      };
      items.push({ id: 'hotfix', label: W.hotfix, value: () => (s.data.hotfix ? W.hotfixOn : W.hotfixOff), left: toggle, right: toggle });
    }
    items.push({ id: 'title', label: W.toTitle });
    this.rows = items.length;
    this.menu = new Menu(items, { x: SCREEN.W / 2 - 52, y: 82, spacing: 13, width: 104 });
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
    const full = 24 + this.rows * 13;
    const h = Math.round(full * Math.min(1, this.t * 8));
    drawTerminalPanel(ctx, SCREEN.W / 2 - 62, Math.round(64 + full / 2 - h / 2), 124, Math.max(4, h), TEXTS.worldMap.menuTitle);
    if (this.t > 0.12) this.menu.draw(ctx);
  }
}
