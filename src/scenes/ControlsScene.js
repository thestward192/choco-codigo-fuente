// Controles: lista de acciones con tecla principal y alterna. Desde Opciones se pueden
// reasignar (con detección de conflictos: si la tecla ya se usa, se intercambian).
// Desde la pausa se muestra solo para consultar.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { REMAPPABLE, DEFAULT_KEYS, assignKey } from '../config/controls.js';
import { prettyKey } from '../core/input.js';
import { drawTerminalPanel, drawBraceCursor } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';

const T = TEXTS.controls;
const PANEL = { x: 12, y: 6, w: 296, h: 150 };

export class ControlsScene extends Scene {
  constructor(game, { readOnly = false } = {}) {
    super(game);
    this.drawBelow = true;
    this.readOnly = readOnly;
    this.sel = 0;
    this.col = 0;
    this.t = 0;
    this.capturing = false;
    this.msg = null;
    this.rows = readOnly ? REMAPPABLE : [...REMAPPABLE, 'reset'];
  }

  update(dt) {
    this.t += dt;
    if (this.msg) {
      this.msg.t -= dt;
      if (this.msg.t <= 0) this.msg = null;
    }
    const g = this.game;
    const inp = g.input;
    if (this.capturing) return;
    if (inp.pressed('cancel')) {
      playSfx(g.audio, 'menuCancel');
      g.pop();
      return;
    }
    if (this.readOnly) return;
    if (inp.pressed('down') || inp.pressed('up')) {
      this.sel = (this.sel + (inp.pressed('down') ? 1 : -1) + this.rows.length) % this.rows.length;
      playSfx(g.audio, 'menuMove');
    }
    if (inp.pressed('left') || inp.pressed('right')) {
      this.col = 1 - this.col;
      playSfx(g.audio, 'menuMove');
    }
    if (inp.pressed('confirm')) {
      const action = this.rows[this.sel];
      if (action === 'reset') {
        g.options.keys = null;
        inp.setBindings(DEFAULT_KEYS);
        g.saveOptions();
        this.msg = { text: T.resetDone, t: 2 };
        playSfx(g.audio, 'menuConfirm');
        return;
      }
      playSfx(g.audio, 'menuConfirm');
      this.capturing = true;
      // La siguiente tecla (la que sea) se asigna. ESC cancela, salvo para la pausa.
      inp.captureNextKey((code) => {
        this.capturing = false;
        if (code === 'Escape' && action !== 'pause') {
          playSfx(g.audio, 'menuCancel');
          return;
        }
        const { keys, swappedWith } = assignKey(inp.keys, action, this.col, code);
        inp.keys = keys;
        g.options.keys = keys;
        g.saveOptions();
        playSfx(g.audio, 'menuConfirm');
        if (swappedWith) this.msg = { text: T.swapped(T.actions[swappedWith]), t: 2.5 };
      });
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#05050A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    drawTerminalPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, `keymap · ${T.title}${this.readOnly ? ' · ESC' : ''}`);
    const keys = this.game.input.keys;
    const x = PANEL.x + 16;
    const c1 = PANEL.x + 186;
    const c2 = PANEL.x + 248;
    this.rows.forEach((action, i) => {
      const y = PANEL.y + 17 + i * 10;
      const active = !this.readOnly && i === this.sel;
      if (active) drawBraceCursor(ctx, x - 10, y, this.t);
      if (action === 'reset') {
        drawText(ctx, T.reset, x, y + 2, { color: active ? UI.yellow : UI.textDim });
        return;
      }
      drawText(ctx, T.actions[action], x, y, { color: active ? UI.text : UI.textDim });
      [c1, c2].forEach((cx, col) => {
        const code = keys[action]?.[col];
        const sel = active && this.col === col;
        let label = prettyKey(code);
        if (sel && this.capturing) label = Math.floor(this.t * 4) % 2 ? '_' : ' ';
        if (sel) {
          ctx.fillStyle = '#16203A';
          ctx.fillRect(cx - 28, y - 2, 56, 10);
        }
        drawText(ctx, label, cx, y, { align: 'center', color: sel ? UI.cyan : col === 0 ? UI.text : UI.textDim });
      });
    });
    if (this.readOnly) {
      // Solo consulta: mostrar también el gamepad (no se reasigna)
      T.gamepad.forEach((l, i) => drawText(ctx, l, SCREEN.W / 2, PANEL.y + PANEL.h + 3 + i * 10, { align: 'center', color: UI.textDim }));
      return;
    }
    let footer = T.hint;
    if (this.capturing) footer = T.press(T.actions[this.rows[this.sel]]);
    if (this.msg) footer = this.msg.text;
    drawText(ctx, footer, SCREEN.W / 2, PANEL.y + PANEL.h + 2, { align: 'center', color: this.msg ? UI.yellow : UI.textDim });
  }
}
