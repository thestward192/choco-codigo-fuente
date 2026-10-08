// Pausa en línea — docs/coop/05_menus_coop.md
// No congela el juego: la sala de abajo sigue corriendo (el personaje se queda quieto) y el
// compañero ve el ícono "en el menú". Continuar, Controles, Opciones y Salir de la sala.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { ControlsScene } from '../scenes/ControlsScene.js';
import { OptionsScene } from '../scenes/OptionsScene.js';
import { ConfirmScene } from '../scenes/ConfirmScene.js';
import { drawPingBars } from './art.js';

const T = TEXTS.coop.pause;
const PANEL = { x: 82, y: 50, w: 156, h: 70 };

export class CoopPauseScene extends Scene {
  constructor(game, level) {
    super(game);
    this.level = level;
    this.online = true;
    this.drawBelow = true;
    this.updateBelow = true; // no hay pausa real en línea
    this.t = 0;
    this.menu = new Menu(
      [
        { id: 'resume', label: T.resume },
        { id: 'controls', label: T.controls },
        { id: 'options', label: T.options },
        { id: 'leave', label: T.leave },
      ],
      { x: PANEL.x + 20, y: PANEL.y + 20, spacing: 12 },
    );
  }

  enter() {
    this.level.setMenu(true);
  }

  exit() {
    this.level.setMenu(false);
  }

  // Si la sala terminó o se cerró mientras el menú estaba abierto, el menú se va solo
  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.level.ended) return;
    const r = this.menu.update(dt, g);
    if (r === 'resume' || r === 'cancel' || (r === null && g.input.pressed('pause') && this.t > 0.1)) {
      if (r === null) playSfx(g.audio, 'menuCancel');
      g.pop();
    } else if (r === 'controls') g.push(new ControlsScene(g, { coop: true }));
    else if (r === 'options') g.push(new OptionsScene(g));
    else if (r === 'leave') {
      g.push(
        new ConfirmScene(
          g,
          T.leaveConfirm,
          () => {
            g.pop();
            this.level.leave(null, { bySelf: true });
          },
          null,
          { danger: true },
        ),
      );
    }
  }

  draw(ctx) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    drawTerminalPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, T.title);
    this.menu.draw(ctx);
    // Aviso: el juego no se detuvo
    if (Math.floor(this.t * 2) % 2 === 0) drawText(ctx, T.running, SCREEN.W / 2, PANEL.y + PANEL.h + 6, { align: 'center', color: UI.yellow });
    drawPingBars(ctx, PANEL.x + PANEL.w - 16, PANEL.y + PANEL.h - 12, this.level.session.ping);
  }
}
