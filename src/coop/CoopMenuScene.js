// Menú cooperativo — docs/coop/05_menus_coop.md
// Terminal `choco@chc:~$ ./sincronizado`: Crear sala, Unirse, Controles, Volver.
// Sin servidor, Crear y Unirse se deshabilitan y se avisa en ámbar (reintenta solo cada tanto).
import { Scene, DEV_TOOLS } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { NET } from '../config/net.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { Menu } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_TITULO } from '../audio/songs/titulo.js';
import { updateBackdrop, drawBackdrop } from '../scenes/menuCommon.js';
import { ControlsScene } from '../scenes/ControlsScene.js';
import { ensureSession, closeSession, NetMeter } from './common.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.coop;
const PANEL = { x: 70, y: 62, w: 180, h: 76 };

export class CoopMenuScene extends Scene {
  // message: aviso al volver (por ejemplo, "El anfitrión cerró la sala")
  constructor(game, { message = null } = {}) {
    super(game);
    this.online = true; // no se pausa al perder el foco (se juega en dos ventanas)
    this.t = 0;
    this.message = message ? { text: message, color: UI.yellow } : null;
    this.busy = null; // 'creating'
    this.retry = 0;
    this.alive = true;
    this.meter = new NetMeter();
    this.menu = new Menu(
      [
        { id: 'create', label: T.create },
        { id: 'join', label: T.join },
        { id: 'controls', label: T.controls },
        { id: 'back', label: T.back },
      ],
      { x: PANEL.x + 22, y: PANEL.y + 20, spacing: 12 },
    );
    this.fellBack = false;
    this.session = ensureSession(game);
    this.off = this.session.on('status', () => this.refresh());
  }

  enter() {
    this.game.audio.playSong(SONG_TITULO);
    this.session.connect();
    this.refresh();
  }

  exit() {
    this.alive = false;
    this.off?.();
  }

  // Crear y Unirse se deshabilitan solo si ya se intentó conectar y no hay servidor (mientras
  // conecta quedan activas: el pedido espera la conexión).
  refresh() {
    const off = this.session.status === 'offline';
    this.menu.items[0].disabled = off;
    this.menu.items[1].disabled = off;
    if (this.menu.current.disabled) {
      this.menu.select('controls');
      this.fellBack = true;
    } else if (!off && this.fellBack) {
      if (this.menu.current.id === 'controls') this.menu.select('create');
      this.fellBack = false;
    }
  }

  update(dt) {
    this.t += dt;
    updateBackdrop(this.game, dt);
    this.meter.update(dt, this.session);
    const s = this.session;
    // Sin servidor: reintentar cada OFFLINE_RETRY segundos
    if (s.status === 'offline') {
      this.retry += dt;
      if (this.retry >= NET.OFFLINE_RETRY) {
        this.retry = 0;
        s.connect();
      }
    } else this.retry = 0;
    if (this.busy || this.game.transitioning) return;

    const g = this.game;
    const r = this.menu.update(dt, g);
    if (r === 'create') this.create();
    else if (r === 'join') Flow.toCoopJoin(g);
    else if (r === 'controls') g.push(new ControlsScene(g));
    else if (r === 'back' || r === 'cancel') {
      closeSession(g);
      Flow.toModeSelect(g);
    }
  }

  async create() {
    this.busy = 'creating';
    this.message = null;
    const res = await this.session.create();
    if (!this.alive) return;
    this.busy = null;
    if (res.ok) {
      playSfx(this.game.audio, 'portalOpen');
      Flow.toCoopLobby(this.game);
    } else {
      playSfx(this.game.audio, 'menuCancel');
      this.message = { text: T.errors[res.error] || T.errors.TIMEOUT, color: UI.yellow };
      this.refresh();
    }
  }

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: 8, choco: false, dim: 0.2 });
    const open = Math.min(1, this.t * 6);
    const h = Math.max(4, Math.round(PANEL.h * open));
    drawTerminalPanel(ctx, PANEL.x, PANEL.y + Math.round((PANEL.h - h) / 2), PANEL.w, h, open >= 1 ? T.menuTitle : '');
    if (open >= 1) this.menu.draw(ctx);

    // Estado del servidor
    const s = this.session;
    const y = PANEL.y + PANEL.h + 5;
    const dots = '.'.repeat(1 + (Math.floor(this.t * 3) % 3));
    if (this.busy === 'creating') {
      drawText(ctx, T.creating.replace('…', '') + dots, SCREEN.W / 2, y, { align: 'center', color: COOP.choco });
    } else if (this.message) {
      drawText(ctx, this.message.text, SCREEN.W / 2, y, { align: 'center', color: this.message.color });
    } else if (s.status === 'connecting' || s.status === 'reconnecting') {
      drawText(ctx, T.connecting.replace('…', '') + dots, SCREEN.W / 2, y, { align: 'center', color: UI.textDim });
    } else if (s.online) {
      ctx.fillStyle = UI.green;
      ctx.fillRect(SCREEN.W / 2 - 62, y + 2, 3, 3);
      drawText(ctx, T.online, SCREEN.W / 2 + 3, y, { align: 'center', color: UI.green });
    } else {
      drawText(ctx, T.offline, SCREEN.W / 2, y, { align: 'center', color: UI.yellow });
      if (DEV_TOOLS) drawText(ctx, T.offlineDev, SCREEN.W / 2, y + 10, { align: 'center', color: UI.textDim });
    }
    if (!this.busy) drawText(ctx, T.hint, SCREEN.W / 2, SCREEN.H - 10, { align: 'center', color: UI.textDim });
  }

  debugInfo() {
    return this.meter.lines(this.session);
  }
}
