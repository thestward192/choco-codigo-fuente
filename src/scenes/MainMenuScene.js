// Menú principal: ventana de terminal `choco@chc:~$` sobre el fondo del título.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { updateBackdrop, drawBackdrop, drawVersion } from './menuCommon.js';
import { SlotSelectScene } from './SlotSelectScene.js';
import { OptionsScene } from './OptionsScene.js';
import { Flow } from '../game/flow.js';
import { SONG_TITULO } from '../audio/songs/titulo.js';

const PANEL = { x: 100, y: 78, w: 120, h: 72 };

export class MainMenuScene extends Scene {
  constructor(game) {
    super(game);
    this.t = 0;
    const slots = game.save.listSlots();
    this.saved = slots.map((d, i) => ({ d, i })).filter((s) => s.d);
    this.menu = new Menu(
      [
        { id: 'new', label: TEXTS.mainMenu.newGame },
        { id: 'continue', label: TEXTS.mainMenu.continue, disabled: this.saved.length === 0 },
        { id: 'options', label: TEXTS.mainMenu.options },
        { id: 'credits', label: TEXTS.mainMenu.credits },
      ],
      { x: PANEL.x + 20, y: PANEL.y + 20, spacing: 12 },
    );
    if (this.saved.length) this.menu.select('continue');
  }

  enter() {
    this.game.audio.playSong(SONG_TITULO);
  }

  resume() {
    // Al volver de Opciones o de Ranuras, refrescar "Continuar"
    const slots = this.game.save.listSlots();
    this.saved = slots.map((d, i) => ({ d, i })).filter((s) => s.d);
    this.menu.items[1].disabled = this.saved.length === 0;
    if (this.menu.current.disabled) this.menu.sel = 0;
  }

  update(dt) {
    this.t += dt;
    updateBackdrop(this.game, dt);
    if (this.game.transitioning) return;
    const g = this.game;
    const r = this.menu.update(dt, g);
    if (r === 'new') g.push(new SlotSelectScene(g, 'new'));
    else if (r === 'continue') {
      // Una sola partida guardada: directo al mapa. Varias: elegir ranura.
      if (this.saved.length === 1) Flow.continueGame(g, this.saved[0].i, this.saved[0].d);
      else g.push(new SlotSelectScene(g, 'load'));
    } else if (r === 'options') g.push(new OptionsScene(g));
    else if (r === 'credits') Flow.toCredits(g);
    else if (r === 'cancel') Flow.toModeSelect(g);
  }

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: 16 });
    const open = Math.min(1, this.t * 6);
    const h = Math.max(4, Math.round(PANEL.h * open));
    drawTerminalPanel(ctx, PANEL.x, PANEL.y + Math.round((PANEL.h - h) / 2), PANEL.w, h, open >= 1 ? TEXTS.mainMenu.title : '');
    if (open >= 1) this.menu.draw(ctx);
    drawText(ctx, TEXTS.mainMenu.hint, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
    drawVersion(ctx, '');
  }
}

