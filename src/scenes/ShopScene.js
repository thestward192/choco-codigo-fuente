// Soda de la UNA: la señora vende consumibles con bits (docs/niveles/nivel_2_una.md).
// Café (+8 energía), Empanada (+4 energía y +3 RAM en batalla), Gallo pinto (+15 energía).
import { Scene } from '../core/game.js';
import { SCREEN, BATTLE } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { smallItem } from '../art/topdown.js';
import { portrait } from '../art/portraits.js';
import { ITEM_IDS } from '../systems/battle.js';
import { playSfx } from '../audio/sfx.js';

const T = TEXTS.shop;

export class ShopScene extends Scene {
  // level: Level2Scene (bits, state.bag, onBought)
  constructor(game, level) {
    super(game);
    this.drawBelow = true;
    this.level = level;
    this.sel = 0;
    this.t = 0;
    this.say = null;
    this.face = 'happy';
    this.shake = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    const inp = this.game.input;
    const a = this.game.audio;
    if (inp.pressed('down')) {
      this.sel = (this.sel + 1) % ITEM_IDS.length;
      playSfx(a, 'menuMove');
    } else if (inp.pressed('up')) {
      this.sel = (this.sel + ITEM_IDS.length - 1) % ITEM_IDS.length;
      playSfx(a, 'menuMove');
    }
    if (inp.pressed('cancel')) {
      playSfx(a, 'menuCancel');
      this.game.pop();
      return;
    }
    if (inp.pressed('confirm') && this.t > 0.15) {
      const id = ITEM_IDS[this.sel];
      const price = BATTLE.ITEMS[id].price;
      const L = this.level;
      if (L.bits < price) {
        playSfx(a, 'denied');
        this.say = T.noMoney;
        this.face = 'worried';
        this.shake = 0.25;
      } else if ((L.state.bag[id] || 0) >= BATTLE.MAX_ITEMS) {
        playSfx(a, 'denied');
        this.say = T.full;
        this.face = 'surprised';
      } else {
        L.bits -= price;
        L.state.bag[id] = (L.state.bag[id] || 0) + 1;
        playSfx(a, 'buy');
        this.say = T.thanks;
        this.face = 'happy';
        this.bought = { t: 0, id };
        L.onBought?.(id);
      }
    }
    if (this.bought) this.bought.t += dt;
  }

  draw(ctx) {
    const W = SCREEN.W;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#05050A';
    ctx.fillRect(0, 0, W, SCREEN.H);
    ctx.globalAlpha = 1;
    const x = 40;
    const y = 30;
    const w = 240;
    const h = 118;
    drawTerminalPanel(ctx, x, y, w, h, T.title);
    // La señora
    ctx.drawImage(portrait('senora', this.face).normal, x + 8, y + 18);
    drawText(ctx, TEXTS.characters.senora, x + 46, y + 18, { color: '#FF9AC0' });
    drawText(ctx, this.say || T.greet, x + 46, y + 30, { color: UI.text });
    // Productos
    ITEM_IDS.forEach((id, i) => {
      const iy = y + 56 + i * 16;
      const sel = i === this.sel;
      let ix = x + 12;
      if (sel && this.shake > 0) ix += Math.round(Math.sin(this.shake * 60) * 2);
      if (sel) drawText(ctx, '{', ix - 4 - Math.round(Math.abs(Math.sin(this.t * 8)) * 2), iy + 2, { color: UI.yellow });
      const pop = this.bought && this.bought.id === id && this.bought.t < 0.2 ? -2 : 0;
      ctx.drawImage(smallItem(id).normal, ix + 6, iy + pop);
      const info = TEXTS.items2[id];
      drawText(ctx, info.name, ix + 22, iy + 2, { color: sel ? UI.text : UI.textDim });
      drawText(ctx, `${BATTLE.ITEMS[id].price}`, x + w - 50, iy + 2, { align: 'right', color: this.level.bits >= BATTLE.ITEMS[id].price ? UI.green : UI.red });
      drawText(ctx, `×${this.level.state.bag[id] || 0}`, x + w - 10, iy + 2, { align: 'right', color: UI.cyan });
    });
    drawText(ctx, TEXTS.items2[ITEM_IDS[this.sel]].desc, x + 12, y + h - 13, { color: UI.cyan });
    drawText(ctx, `${T.bits} ${this.level.bits}`, x + w - 8, y + 18, { align: 'right', color: UI.yellow });
    drawText(ctx, T.hint, W / 2, y + h + 6, { align: 'center', color: UI.textDim });
  }
}
