// Pausa: el juego detrás se ve oscurecido y "desenfocado" (reducido y vuelto a escalar).
// Continuar · Reiniciar desde checkpoint · Opciones · Controles · Salir al mapa (con confirmación).
// A la derecha, los objetos obtenidos con su descripción y los fundadores rescatados.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, drawTextBox } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, ACCENTS } from '../art/palettes.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { createCanvas } from '../core/renderer.js';
import { itemIcon } from '../art/icons.js';
import { portrait } from '../art/portraits.js';
import { ITEM_ORDER, FOUNDERS } from '../data/levels.js';
import { OptionsScene } from './OptionsScene.js';
import { ControlsScene } from './ControlsScene.js';
import { ConfirmScene } from './ConfirmScene.js';
import { playSfx } from '../audio/sfx.js';

const T = TEXTS.pause;

export class PauseScene extends Scene {
  // level: la escena del nivel (debe tener restartFromCheckpoint() y quitToMap())
  constructor(game, level) {
    super(game);
    this.level = level;
    this.t = 0;
    this.blur = null;
    this.menu = new Menu(
      [
        { id: 'resume', label: T.resume },
        { id: 'restart', label: T.restart },
        { id: 'options', label: T.options },
        { id: 'controls', label: T.controls },
        { id: 'map', label: level.quitLabel || T.toMap },
      ],
      { x: 16, y: 44, spacing: 14 },
    );
    this.sel = 0;
  }

  enter() {
    // Captura del juego reducida (desenfoque barato) — se toma una sola vez
    const snap = this.game.renderer.snapshot();
    const small = createCanvas(SCREEN.W / 4, SCREEN.H / 4);
    const sx = small.getContext('2d');
    sx.imageSmoothingEnabled = true;
    sx.drawImage(snap, 0, 0, small.width, small.height);
    this.blur = small;
    this.game.audio.duck(true);
    playSfx(this.game.audio, 'menuConfirm');
  }

  exit() {
    this.game.audio.duck(false);
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    const r = this.menu.update(dt, g);
    if (r === 'resume' || r === 'cancel' || (g.input.pressed('pause') && r === null && this.t > 0.1)) {
      g.pop();
    } else if (r === 'restart') {
      g.pop();
      this.level.restartFromCheckpoint();
    } else if (r === 'options') g.push(new OptionsScene(g));
    else if (r === 'controls') g.push(new ControlsScene(g, { readOnly: false }));
    else if (r === 'map') {
      g.push(
        new ConfirmScene(g, this.level.quitAsk || T.toMapAsk, () => {
          g.pop();
          this.level.quitToMap();
        }),
      );
    }
  }

  draw(ctx) {
    if (this.blur) ctx.drawImage(this.blur, 0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#05050A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    const slide = Math.round(Math.max(0, 1 - this.t * 6) * 40);
    drawText(ctx, T.title, 12 - slide, 16, { bold: true, scale: 2, color: UI.cyan });
    ctx.save();
    ctx.translate(-slide, 0);
    this.menu.draw(ctx);
    ctx.restore();
    this.drawInventory(ctx, slide);
  }

  drawInventory(ctx, slide) {
    const x = 162 + slide;
    const y = 10;
    const w = 154;
    drawTerminalPanel(ctx, x, y, w, 160, 'inventario');
    const s = this.level.hudState ? this.level.hudState() : null;
    const items = this.level.choco?.items || {};
    let iy = y + 17;
    drawText(ctx, T.items, x + 6, iy, { color: UI.textDim });
    iy += 11;
    const owned = ITEM_ORDER.filter((it) => items[it]);
    if (owned.length === 0) drawText(ctx, T.noItems, x + 6, iy, { color: '#3E3E52' });
    for (const it of owned) {
      const ic = itemIcon(it);
      if (ic) ctx.drawImage(ic.normal, x + 6, iy - 2);
      drawText(ctx, TEXTS.items[it].name, x + 22, iy - 1, { color: UI.text });
      drawTextBox(ctx, TEXTS.items[it].short, x + 22, iy + 8, w - 28, { color: UI.textDim, lineHeight: 9 });
      iy += 19;
    }
    // Fundadores rescatados
    const founders = this.level.founders || [];
    const fy = y + 160 - 44;
    drawText(ctx, T.founders, x + 6, fy, { color: UI.textDim });
    FOUNDERS.forEach((f, i) => {
      const px = x + 6 + i * 36;
      const got = founders.includes(f);
      ctx.globalAlpha = got ? 1 : 0.2;
      ctx.drawImage(portrait(f, got ? 'happy' : 'worried').normal, px, fy + 10);
      ctx.globalAlpha = 1;
      if (got) {
        ctx.fillStyle = ACCENTS[f];
        ctx.fillRect(px, fy + 42, 32, 1);
      }
    });
    void s;
  }
}
