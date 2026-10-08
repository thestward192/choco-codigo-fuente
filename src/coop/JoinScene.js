// Unirse a una sala — docs/coop/05_menus_coop.md
// 5 cajitas para el código. Teclado: letras y números (se aceptan minúsculas y se descarta lo que no
// es del alfabeto), Borrar corrige, Ctrl+V pega. Gamepad: grilla del alfabeto con el stick.
// Al llenar las 5 cajitas se intenta entrar solo; los errores salen en ámbar sin borrar el código.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { NET } from '../config/net.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { drawTerminalPanel, drawBraceCursor } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { cleanCode } from '../net/protocol.js';
import { updateBackdrop, drawBackdrop } from '../scenes/menuCommon.js';
import { drawCodeBoxes } from './art.js';
import { readText } from './clipboard.js';
import { ensureSession, NetMeter } from './common.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.coop;
const PANEL = { x: 8, y: 6, w: 304, h: 152 };
const DELETE = '←';
// Grilla para el gamepad: el alfabeto (31) más "borrar"
const GRID_COLS = 8;
const GRID = [...NET.CODE_ALPHABET, DELETE];
const CELL = { w: 14, h: 12 };
const SHAKE = 0.3;

export class JoinScene extends Scene {
  constructor(game) {
    super(game);
    this.online = true;
    this.t = 0;
    this.code = '';
    this.tried = null; // último código intentado (no se reintenta solo el mismo)
    this.joining = false;
    this.error = null;
    this.note = null;
    this.shake = 0;
    this.cell = 0;
    this.alive = true;
    this.meter = new NetMeter();
    this.session = ensureSession(game);
    this._onKey = (e) => this.onKey(e);
    this._onPaste = (e) => {
      let text = '';
      try {
        text = e.clipboardData?.getData('text') || '';
      } catch (err) {
        text = '';
      }
      if (text) {
        e.preventDefault?.();
        this.paste(text);
      }
    };
  }

  enter() {
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('paste', this._onPaste);
    this.session.connect();
  }

  exit() {
    this.alive = false;
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('paste', this._onPaste);
  }

  // ---------- Teclado (directo, para poder escribir letras que también son acciones) ----------
  onKey(e) {
    if (this.game.top !== this || this.game.transitioning || this.joining) return;
    if (e.code === 'Escape') return this.back();
    if (e.code === 'Backspace' || e.code === 'Delete') return this.erase();
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (this.code.length === NET.CODE_LENGTH) this.submit(true);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
      // Si el navegador no dispara "paste", se intenta leer el portapapeles
      setTimeout(() => {
        if (!this.pastedRecently) readText().then((t) => t && this.paste(t));
      }, 50);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const ch = typeof e.key === 'string' && e.key.length === 1 ? e.key : null;
    if (!ch) return;
    const ok = cleanCode(ch);
    if (ok) this.type(ok);
    else if (/[a-z0-9]/i.test(ch)) this.reject(); // I, L, O, 0, 1: no existen en los códigos
  }

  type(ch) {
    if (this.code.length >= NET.CODE_LENGTH) return this.reject();
    this.code += ch;
    this.error = null;
    playSfx(this.game.audio, 'key');
    if (this.code.length === NET.CODE_LENGTH) this.submit(false);
  }

  erase() {
    if (!this.code) return;
    this.code = this.code.slice(0, -1);
    this.error = null;
    playSfx(this.game.audio, 'menuMove');
  }

  reject() {
    this.shake = SHAKE;
    playSfx(this.game.audio, 'menuCancel');
  }

  paste(text) {
    this.pastedRecently = true;
    setTimeout(() => (this.pastedRecently = false), 300);
    const c = cleanCode(text).slice(0, NET.CODE_LENGTH);
    if (!c) return this.reject();
    this.code = c;
    this.error = null;
    this.note = { text: T.pasted, t: 1.5 };
    playSfx(this.game.audio, 'menuConfirm');
    if (c.length === NET.CODE_LENGTH) this.submit(false);
  }

  back() {
    playSfx(this.game.audio, 'menuCancel');
    Flow.toCoopMenu(this.game);
  }

  // force: Enter (reintenta aunque sea el mismo código que ya falló)
  async submit(force) {
    if (this.joining || (!force && this.tried === this.code)) return;
    this.tried = this.code;
    this.joining = true;
    this.error = null;
    const res = await this.session.join(this.code);
    if (!this.alive) return;
    this.joining = false;
    if (res.ok) {
      playSfx(this.game.audio, 'portalOpen');
      Flow.toCoopLobby(this.game);
    } else {
      this.error = T.errors[res.error] || T.errors.TIMEOUT;
      this.shake = SHAKE;
      playSfx(this.game.audio, 'menuCancel');
    }
  }

  // ---------- Gamepad (y flechas): grilla del alfabeto ----------
  update(dt) {
    this.t += dt;
    updateBackdrop(this.game, dt);
    this.meter.update(dt, this.session);
    if (this.shake > 0) this.shake -= dt;
    if (this.note) {
      this.note.t -= dt;
      if (this.note.t <= 0) this.note = null;
    }
    if (this.game.transitioning || this.joining) return;
    const inp = this.game.input;
    // La grilla y los botones A/B son solo del gamepad: en el teclado, WASD, Z y X son letras
    if (inp.lastDevice !== 'gamepad') return;
    const rows = Math.ceil(GRID.length / GRID_COLS);
    const col = this.cell % GRID_COLS;
    const row = Math.floor(this.cell / GRID_COLS);
    let moved = true;
    if (inp.pressed('left')) this.cell = row * GRID_COLS + ((col + GRID_COLS - 1) % GRID_COLS);
    else if (inp.pressed('right')) this.cell = row * GRID_COLS + ((col + 1) % GRID_COLS);
    else if (inp.pressed('up')) this.cell = ((row + rows - 1) % rows) * GRID_COLS + col;
    else if (inp.pressed('down')) this.cell = ((row + 1) % rows) * GRID_COLS + col;
    else moved = false;
    this.cell = Math.min(this.cell, GRID.length - 1);
    if (moved) playSfx(this.game.audio, 'menuMove');
    if (inp.pressed('confirm')) {
      const ch = GRID[this.cell];
      if (ch === DELETE) this.erase();
      else this.type(ch);
    } else if (inp.pressed('cancel')) {
      if (this.code) this.erase();
      else this.back();
    }
  }

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: null, choco: false, dim: 0.45 });
    drawTerminalPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, T.menuTitle + ' --unirse');
    const cx = SCREEN.W / 2;
    drawText(ctx, T.joinTitle, cx, PANEL.y + 18, { align: 'center', bold: true, color: UI.text });
    drawText(ctx, T.joinPrompt, cx, PANEL.y + 30, { align: 'center', color: UI.textDim });

    const cursor = this.joining ? -1 : Math.min(this.code.length, NET.CODE_LENGTH - 1);
    drawCodeBoxes(ctx, this.code, cx, PANEL.y + 44, { scale: 3, box: 26, gap: 6, color: COOP.tapita, cursor: this.code.length < NET.CODE_LENGTH ? cursor : -1, t: this.t, shake: this.shake });

    // Estado / error
    const y = PANEL.y + 78;
    const dots = '.'.repeat(1 + (Math.floor(this.t * 3) % 3));
    if (this.joining) drawText(ctx, T.joining.replace('…', '') + dots, cx, y, { align: 'center', color: COOP.choco });
    else if (this.error) drawText(ctx, this.error, cx, y, { align: 'center', color: UI.yellow });
    else if (this.note) drawText(ctx, this.note.text, cx, y, { align: 'center', color: UI.green });
    else if (!this.session.online && this.session.status !== 'connecting') drawText(ctx, T.offline, cx, y, { align: 'center', color: UI.yellow });

    this.drawGrid(ctx, PANEL.y + 92);

    const pad = this.game.input.lastDevice === 'gamepad';
    const hint = pad ? T.joinHintPad : T.joinHintKeys;
    drawText(ctx, hint, cx, SCREEN.H - 14, { align: 'center', color: UI.textDim });
  }

  drawGrid(ctx, y0) {
    const w = GRID_COLS * CELL.w;
    const x0 = Math.round((SCREEN.W - w) / 2);
    GRID.forEach((ch, i) => {
      const x = x0 + (i % GRID_COLS) * CELL.w;
      const y = y0 + Math.floor(i / GRID_COLS) * CELL.h;
      const active = i === this.cell && this.game.input.lastDevice === 'gamepad';
      if (active) {
        ctx.fillStyle = '#1E2236';
        ctx.fillRect(x, y - 2, CELL.w - 1, CELL.h - 1);
      }
      drawText(ctx, ch, x + CELL.w / 2, y, { align: 'center', color: active ? UI.yellow : ch === DELETE ? UI.red : '#5A5E78', shadow: false });
    });
    if (this.game.input.lastDevice !== 'gamepad') return;
    const ac = this.cell;
    drawBraceCursor(ctx, x0 + (ac % GRID_COLS) * CELL.w - 3, y0 + Math.floor(ac / GRID_COLS) * CELL.h, this.t);
  }

  debugInfo() {
    return this.meter.lines(this.session);
  }
}
