// Mochila del nivel 2: usar lo que se compró en la soda fuera de las batallas.
import { Scene } from '../core/game.js';
import { SCREEN, BATTLE } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { smallItem } from '../art/topdown.js';
import { ITEM_IDS } from '../systems/battle.js';
import { playSfx } from '../audio/sfx.js';

const T = TEXTS.bagScene;

export class BagScene extends Scene {
  constructor(game, level) {
    super(game);
    this.drawBelow = true;
    this.level = level;
    this.sel = 0;
    this.t = 0;
    this.note = null;
  }

  update(dt) {
    this.t += dt;
    const inp = this.game.input;
    const a = this.game.audio;
    if (inp.pressed('down')) {
      this.sel = (this.sel + 1) % ITEM_IDS.length;
      playSfx(a, 'menuMove');
    } else if (inp.pressed('up')) {
      this.sel = (this.sel + ITEM_IDS.length - 1) % ITEM_IDS.length;
      playSfx(a, 'menuMove');
    }
    if ((inp.pressed('cancel') || inp.pressed('shoot')) && this.t > 0.1) {
      playSfx(a, 'menuCancel');
      this.game.pop();
      return;
    }
    if (inp.pressed('confirm') && this.t > 0.1) {
      const id = ITEM_IDS[this.sel];
      const L = this.level;
      if (!L.state.bag[id]) {
        playSfx(a, 'denied');
      } else if (L.energy >= L.maxEnergy) {
        playSfx(a, 'denied');
        this.note = T.full;
      } else {
        L.useItemOutside(id);
        this.note = `+${BATTLE.ITEMS[id].energy} ${TEXTS.level2.energy}`;
      }
    }
  }

  draw(ctx) {
    const L = this.level;
    const x = 70;
    const y = 44;
    const w = 180;
    const h = 92;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#05050A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    drawTerminalPanel(ctx, x, y, w, h, T.title);
    drawText(ctx, `${TEXTS.level2.energy} ${L.energy}/${L.maxEnergy}`, x + 8, y + 17, { color: UI.green });
    const total = ITEM_IDS.reduce((n, k) => n + (L.state.bag[k] || 0), 0);
    if (!total) drawText(ctx, T.empty.split('. ')[0] + '.', x + 8, y + 36, { color: UI.textDim });
    ITEM_IDS.forEach((id, i) => {
      const iy = y + 30 + i * 15;
      const n = L.state.bag[id] || 0;
      if (!total) return;
      const sel = i === this.sel;
      if (sel) drawText(ctx, '{', x + 6 - Math.round(Math.abs(Math.sin(this.t * 8)) * 2), iy + 2, { color: UI.yellow });
      ctx.globalAlpha = n ? 1 : 0.35;
      ctx.drawImage(smallItem(id).normal, x + 14, iy);
      ctx.globalAlpha = 1;
      drawText(ctx, TEXTS.items2[id].name, x + 30, iy + 2, { color: n ? (sel ? UI.text : UI.textDim) : '#4E4E62' });
      drawText(ctx, `×${n}`, x + w - 8, iy + 2, { align: 'right', color: UI.cyan });
    });
    drawText(ctx, this.note || TEXTS.items2[ITEM_IDS[this.sel]].desc, x + 8, y + h - 12, { color: this.note ? UI.yellow : UI.cyan });
    drawText(ctx, T.hint, SCREEN.W / 2, y + h + 5, { align: 'center', color: UI.textDim });
  }
}
