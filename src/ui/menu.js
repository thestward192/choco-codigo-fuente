// Menú vertical reutilizable: cursor de llave `{` que rebota, tick al moverse,
// opciones deshabilitadas y valores que se cambian con ← →.
import { drawText } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { playSfx } from '../audio/sfx.js';
import { drawBraceCursor } from './widgets.js';

export class Menu {
  // items: [{ id, label, disabled?, value?: () => string, left?: () => void, right?: () => void }]
  constructor(items, { x = 0, y = 0, spacing = 13, align = 'left', valueX = null, width = 200 } = {}) {
    this.items = items;
    this.x = x;
    this.y = y;
    this.spacing = spacing;
    this.align = align;
    this.valueX = valueX;
    this.width = width;
    this.sel = this.firstEnabled(0, 1);
    this.t = 0;
    this.flash = 0;
    this.shake = 0;
  }

  firstEnabled(from, dir) {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      if (!this.items[i].disabled) return i;
    }
    return 0;
  }

  get current() {
    return this.items[this.sel];
  }

  select(id) {
    const i = this.items.findIndex((it) => it.id === id);
    if (i >= 0) this.sel = i;
  }

  // Devuelve el id confirmado, 'cancel', o null.
  update(dt, game) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
    const inp = game.input;
    const a = game.audio;
    if (inp.pressed('down')) {
      this.sel = this.firstEnabled(this.sel + 1, 1);
      playSfx(a, 'menuMove');
    } else if (inp.pressed('up')) {
      this.sel = this.firstEnabled(this.sel - 1, -1);
      playSfx(a, 'menuMove');
    }
    const it = this.current;
    if (inp.pressed('left') && it.left) {
      it.left();
      playSfx(a, 'menuMove');
    } else if (inp.pressed('right') && it.right) {
      it.right();
      playSfx(a, 'menuMove');
    }
    if (inp.pressed('confirm')) {
      if (it.disabled) {
        this.shake = 0.25;
        playSfx(a, 'menuCancel');
        return null;
      }
      this.flash = 0.2;
      if (it.onConfirm) it.onConfirm();
      else if (it.right && !it.noConfirm) {
        it.right();
        playSfx(a, 'menuMove');
        return null;
      }
      playSfx(a, 'menuConfirm');
      return it.id;
    }
    if (inp.pressed('cancel')) {
      playSfx(a, 'menuCancel');
      return 'cancel';
    }
    return null;
  }

  draw(ctx) {
    this.items.forEach((it, i) => {
      const y = this.y + i * this.spacing;
      const active = i === this.sel;
      let x = this.x;
      if (active && this.shake > 0) x += Math.round(Math.sin(this.shake * 60) * 2);
      if (active) drawBraceCursor(ctx, x - 10, y, this.t);
      const color = it.disabled ? '#3E3E52' : active ? (this.flash > 0 && Math.floor(this.flash * 30) % 2 ? UI.yellow : UI.text) : UI.textDim;
      drawText(ctx, it.label, x + (active ? 1 : 0), y, { color });
      if (it.value) {
        const v = it.value();
        const vx = this.valueX ?? this.x + this.width;
        const arrows = active && (it.left || it.right);
        drawText(ctx, arrows ? `< ${v} >` : v, vx, y, { color: active ? UI.cyan : UI.textDim, align: 'right' });
      }
    });
  }
}

// Barra de volumen 0..10 como texto de bloques
export function volumeBar(v) {
  return '█'.repeat(v) + '·'.repeat(10 - v);
}
