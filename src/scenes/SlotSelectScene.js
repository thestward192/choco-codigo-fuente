// Selección de ranura: 3 ranuras con la barra de Choco, objetos, Y doradas, tiempo y último nivel.
// Borrar pide confirmación doble ("¿Seguro? Esto no tiene `git revert`.").
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { SLOT_COUNT } from '../core/save.js';
import { drawTerminalPanel, drawBraceCursor } from '../ui/widgets.js';
import { drawMiniBar } from '../ui/hud.js';
import { itemIcon } from '../art/icons.js';
import { ITEM_ORDER } from '../data/levels.js';
import { totalGolden, formatTime } from '../game/progress.js';
import { playSfx } from '../audio/sfx.js';
import { updateBackdrop, drawBackdrop } from './menuCommon.js';
import { ConfirmScene } from './ConfirmScene.js';
import { Flow } from '../game/flow.js';

const CARD = { x: 30, y: 30, w: 260, h: 40, gap: 6 };

export class SlotSelectScene extends Scene {
  // mode: 'new' | 'load'
  constructor(game, mode) {
    super(game);
    this.mode = mode;
    this.t = 0;
    this.refresh();
    this.sel = mode === 'load' ? Math.max(0, this.slots.findIndex(Boolean)) : Math.max(0, this.slots.findIndex((s) => !s));
    this.shake = 0;
    this.flash = 0;
  }

  refresh() {
    this.slots = this.game.save.listSlots();
  }

  resume() {
    this.refresh();
  }

  selectable(i) {
    return this.mode === 'new' || !!this.slots[i];
  }

  update(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.flash > 0) this.flash -= dt;
    updateBackdrop(this.game, dt);
    const g = this.game;
    if (g.transitioning) return;
    const inp = g.input;
    if (inp.pressed('down') || inp.pressed('up')) {
      const d = inp.pressed('down') ? 1 : -1;
      for (let k = 1; k <= SLOT_COUNT; k++) {
        const i = (this.sel + d * k + SLOT_COUNT * 2) % SLOT_COUNT;
        if (this.selectable(i)) {
          this.sel = i;
          break;
        }
      }
      playSfx(g.audio, 'menuMove');
    }
    const data = this.slots[this.sel];
    if (inp.pressed('confirm')) {
      if (!this.selectable(this.sel)) {
        this.shake = 0.25;
        playSfx(g.audio, 'menuCancel');
        return;
      }
      playSfx(g.audio, 'menuConfirm');
      this.flash = 0.3;
      if (this.mode === 'load') Flow.continueGame(g, this.sel, data);
      else if (!data) Flow.newGame(g, this.sel);
      else g.push(new ConfirmScene(g, TEXTS.slots.overwrite, () => Flow.newGame(g, this.sel), null, { danger: true }));
    } else if (inp.pressed('erase') && data) {
      const n = this.sel + 1;
      g.push(
        new ConfirmScene(g, TEXTS.slots.deleteAsk(n), () =>
          g.push(
            new ConfirmScene(
              g,
              TEXTS.slots.deleteSure,
              () => {
                g.save.deleteSlot(this.sel);
                this.refresh();
                // En "Continuar", mover el cursor a una ranura que todavía tenga partida
                if (!this.selectable(this.sel)) this.sel = Math.max(0, this.slots.findIndex(Boolean));
                g.notify(TEXTS.slots.deleted, 2);
                playSfx(g.audio, 'enemyDie');
                g.effects.shake(0.3);
                if (this.mode === 'load' && !this.slots.some(Boolean)) g.pop();
              },
              null,
              { danger: true },
            ),
          ),
        ),
      );
    } else if (inp.pressed('cancel')) {
      playSfx(g.audio, 'menuCancel');
      g.pop();
    }
  }

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: null, dim: 0.55 });
    const title = this.mode === 'new' ? TEXTS.slots.titleNew : TEXTS.slots.titleLoad;
    drawText(ctx, title, SCREEN.W / 2, 12, { align: 'center', bold: true, color: UI.cyan });
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slide = Math.round(Math.max(0, 1 - (this.t * 5 - i * 0.4)) * 40);
      let x = CARD.x + slide;
      const y = CARD.y + i * (CARD.h + CARD.gap);
      const active = i === this.sel;
      if (active && this.shake > 0) x += Math.round(Math.sin(this.shake * 60) * 2);
      this.drawCard(ctx, x, y, i, this.slots[i], active);
    }
    drawText(ctx, TEXTS.slots.hint, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
  }

  drawCard(ctx, x, y, i, d, active) {
    const dim = !this.selectable(i);
    drawTerminalPanel(ctx, x, y, CARD.w, CARD.h, `~/partidas/${TEXTS.slots.slot(i + 1).toLowerCase().replace(' ', '_')}`);
    if (active) {
      ctx.fillStyle = this.flash > 0 && Math.floor(this.flash * 30) % 2 ? UI.yellow : UI.cyan;
      ctx.fillRect(x - 1, y - 1, CARD.w + 2, 1);
      ctx.fillRect(x - 1, y + CARD.h, CARD.w + 2, 1);
      ctx.fillRect(x - 1, y - 1, 1, CARD.h + 2);
      ctx.fillRect(x + CARD.w, y - 1, 1, CARD.h + 2);
      drawBraceCursor(ctx, x - 9, y + 20, this.t);
    }
    const cy = y + 16;
    drawText(ctx, TEXTS.slots.slot(i + 1), x + 6, cy, { bold: true, color: dim ? '#3E3E52' : active ? UI.text : UI.textDim });
    if (!d) {
      drawText(ctx, TEXTS.slots.empty, x + 6, cy + 11, { color: '#5A5F78' });
      return;
    }
    // Barra de Choco con los cuadritos recuperados
    drawMiniBar(ctx, x + 64, cy - 1, 1 + d.founders.length, 8);
    // Último nivel, objetos, Y doradas y tiempo total
    const last = d.lastLevel !== null && d.lastLevel !== undefined ? TEXTS.levels[d.lastLevel].name : TEXTS.slots.none;
    drawText(ctx, last, x + 6, cy + 12, { color: UI.textDim });
    let ix = x + 118;
    for (const it of ITEM_ORDER) {
      if (!d.items.includes(it)) continue;
      const ic = itemIcon(it);
      if (ic) ctx.drawImage(ic.normal, ix, cy + 9);
      ix += 14;
    }
    const rx = x + CARD.w - 6;
    drawText(ctx, `${TEXTS.slots.goldenY} ${totalGolden(d)}/15`, rx, cy, { align: 'right', color: UI.yellow });
    drawText(ctx, formatTime(d.totalTime).replace(/\.\d+$/, ''), rx, cy + 12, { align: 'right', color: UI.textDim });
  }
}
