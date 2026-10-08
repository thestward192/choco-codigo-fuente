// Sala de espera — docs/coop/05_menus_coop.md
// Dos columnas (anfitrión a la izquierda, invitado a la derecha) con su personaje, "LISTO" y ping.
// El anfitrión manda en el estado de la sala: el invitado pide (pick) y el anfitrión responde con el
// estado completo (lobby). No pueden elegir el mismo personaje: si uno toma el del otro, se
// intercambian con un saltito de una columna a la otra.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, measureText } from '../art/font.js';
import { wrapText } from '../art/fontData.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { ANIMS } from '../art/choco.js';
import { Ease } from '../core/tween.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { GAME, PROTOCOL_VERSION } from '../net/protocol.js';
import { updateBackdrop, drawBackdrop } from '../scenes/menuCommon.js';
import { ConfirmScene } from '../scenes/ConfirmScene.js';
import { charColor, otherChar, drawCoopChar, drawCodeBoxes, drawPingBars } from './art.js';
import { defaultLobby, applyPick, parseLobby } from './lobbyState.js';
import { copyText } from './clipboard.js';
import { ensureSession, NetMeter } from './common.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.coop;
const PANEL = { x: 8, y: 6, w: 304, h: 152 };
const COL_X = { host: 84, guest: 236 };
const FEET_Y = 108;
const HOP_SPEED = 300; // px/s del intercambio de columnas
const HOP_HEIGHT = 16;
const BANNER_TIME = 3.5;
const STAMP_POP = 0.25;

const other = (slot) => (slot === 'host' ? 'guest' : 'host');

export class LobbyScene extends Scene {
  constructor(game) {
    super(game);
    this.online = true; // no se pausa al perder el foco
    this.t = 0;
    this.session = ensureSession(game);
    this.mine = this.session.isHost ? 'host' : 'guest';
    this.lobby = defaultLobby();
    this.hop = {}; // char → { x, from, to }
    for (const slot of ['host', 'guest']) this.hop[this.lobby[slot].char] = { x: COL_X[slot], from: COL_X[slot], to: COL_X[slot] };
    this.stamp = { host: 0, guest: 0 };
    this.banner = null;
    this.copyMsg = null;
    this.alive = true;
    this.meter = new NetMeter();
    const s = this.session;
    this.offs = [
      s.on('game', (d) => this.onGame(d)),
      s.on('peer', (p) => this.onPeer(p)),
      s.on('closed', (reason) => this.onClosed(reason)),
      s.on('status', (st) => this.onStatus(st)),
      s.on('error', (code) => this.showBanner(T.errors[code] || T.errors.TIMEOUT, UI.yellow)),
    ];
  }

  enter() {
    this.hello();
  }

  exit() {
    this.alive = false;
    for (const off of this.offs) off();
  }

  get host() {
    return this.session.isHost;
  }
  get peerHere() {
    return this.session.peer.present && !this.session.peer.lost;
  }
  get bothReady() {
    return this.lobby.host.ready && this.lobby.guest.ready && this.peerHere;
  }

  // El invitado se presenta (y pide el estado); el anfitrión manda el estado si hay alguien.
  hello() {
    if (this.host) this.broadcast();
    else this.session.sendGame({ type: GAME.HELLO, v: PROTOCOL_VERSION, char: this.lobby.guest.char });
  }

  broadcast() {
    if (!this.host || !this.session.peer.present) return;
    this.session.sendGame({ type: GAME.LOBBY, host: this.lobby.host, guest: this.lobby.guest });
  }

  setLobby(next) {
    const prev = this.lobby;
    this.lobby = next;
    // Saltito de los personajes que cambiaron de columna
    for (const slot of ['host', 'guest']) {
      const c = next[slot].char;
      if (prev[slot].char !== c) {
        const h = this.hop[c] || { x: COL_X[other(slot)] };
        this.hop[c] = { x: h.x, from: h.x, to: COL_X[slot] };
      }
      if (next[slot].ready && !prev[slot].ready) this.stamp[slot] = STAMP_POP;
    }
    if (prev.host.char !== next.host.char) playSfx(this.game.audio, 'doubleJump');
  }

  // ---------- Red ----------

  onGame(d) {
    if (!this.alive) return;
    if (this.host) {
      if (d.type === GAME.HELLO) this.broadcast();
      else if (d.type === GAME.PICK) {
        const before = this.lobby.guest.ready;
        this.setLobby(applyPick(this.lobby, 'guest', d));
        if (this.lobby.guest.ready !== before) playSfx(this.game.audio, this.lobby.guest.ready ? 'checkpoint' : 'menuCancel');
        this.broadcast();
      }
    } else if (d.type === GAME.LOBBY) {
      const next = parseLobby(d);
      if (!next) return;
      if (next.host.ready !== this.lobby.host.ready) playSfx(this.game.audio, next.host.ready ? 'checkpoint' : 'menuCancel');
      this.setLobby(next);
    } else if (d.type === GAME.START) this.started();
  }

  onPeer(p) {
    if (!this.alive) return;
    if (!p.present) {
      // El compañero se fue: su lugar queda libre y sin "listo"
      this.setLobby({ host: { ...this.lobby.host, ready: false }, guest: { ...this.lobby.guest, ready: false } });
    } else if (!p.lost) {
      if (this.host) {
        playSfx(this.game.audio, 'oneUp');
        this.broadcast();
      }
    }
  }

  onStatus(st) {
    if (!this.alive) return;
    if (st === 'room') this.hello(); // volvimos de una reconexión: sincronizar de nuevo
  }

  onClosed(reason) {
    if (!this.alive) return;
    this.alive = false;
    playSfx(this.game.audio, 'menuCancel');
    Flow.toCoopMenu(this.game, { message: T.closed[reason] || T.closed.closed });
  }

  // ---------- Acciones propias ----------

  pick(change) {
    const next = applyPick(this.lobby, this.mine, change);
    const before = this.lobby[this.mine].ready;
    this.setLobby(next);
    if (next[this.mine].ready !== before) playSfx(this.game.audio, next[this.mine].ready ? 'checkpoint' : 'menuCancel');
    if (this.host) this.broadcast();
    else this.session.sendGame({ type: GAME.PICK, char: next.guest.char, ready: next.guest.ready });
  }

  start() {
    // Hito 9: todavía no hay mapas. Se avisa a los dos y se vuelve a la sala.
    this.session.sendGame({ type: GAME.START, seed: Math.floor(Math.random() * 2 ** 31) });
    this.started();
    this.setLobby({ host: { ...this.lobby.host, ready: false }, guest: { ...this.lobby.guest, ready: false } });
    this.broadcast();
  }

  started() {
    playSfx(this.game.audio, 'portalEnter');
    this.showBanner(T.started, COOP.both);
  }

  showBanner(text, color) {
    this.banner = { text, color, t: BANNER_TIME };
  }

  async copy() {
    const ok = await copyText(this.session.code || '');
    if (!this.alive) return;
    this.copyMsg = { ok, t: 1.5 };
    playSfx(this.game.audio, ok ? 'menuConfirm' : 'menuCancel');
  }

  leave() {
    const g = this.game;
    g.push(
      new ConfirmScene(g, this.host ? T.leaveHost : T.leaveGuest, () => {
        this.alive = false;
        this.session.leave();
        Flow.toCoopMenu(g);
      }),
    );
  }

  update(dt) {
    this.t += dt;
    updateBackdrop(this.game, dt);
    this.meter.update(dt, this.session);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    if (this.copyMsg && (this.copyMsg.t -= dt) <= 0) this.copyMsg = null;
    for (const k of ['host', 'guest']) if (this.stamp[k] > 0) this.stamp[k] -= dt;
    for (const h of Object.values(this.hop)) {
      const d = h.to - h.x;
      h.x = Math.abs(d) <= HOP_SPEED * dt ? h.to : h.x + Math.sign(d) * HOP_SPEED * dt;
    }
    if (this.game.transitioning || !this.alive) return;
    if (this.session.status !== 'room') return; // reconectando: no se cambia nada

    const inp = this.game.input;
    const me = this.lobby[this.mine];
    if (inp.pressed('erase')) this.copy();
    if (inp.pressed('cancel')) {
      if (me.ready) this.pick({ ready: false });
      else {
        playSfx(this.game.audio, 'menuCancel');
        this.leave();
      }
      return;
    }
    if (inp.pressed('confirm')) {
      if (this.host && this.bothReady) this.start();
      else this.pick({ ready: !me.ready });
      return;
    }
    if (!me.ready && (inp.pressed('left') || inp.pressed('right'))) this.pick({ char: otherChar(me.char) });
  }

  // ---------- Dibujo ----------

  draw(ctx) {
    drawBackdrop(ctx, this.game, { logoY: null, choco: false, dim: 0.55 });
    const s = this.session;
    drawTerminalPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, T.lobbyTitle(s.code || '?????'));
    const cx = SCREEN.W / 2;

    // Código de la sala, siempre visible
    const codeW = drawCodeBoxes(ctx, s.code || '', cx, PANEL.y + 17, { scale: 1, box: 11, gap: 2, color: COOP.both });
    drawText(ctx, T.code, cx - codeW / 2 - 6, PANEL.y + 19, { align: 'right', color: UI.textDim, shadow: false });
    const copyLabel = this.copyMsg ? (this.copyMsg.ok ? T.copied : T.copyManual) : T.copyKey;
    drawText(ctx, copyLabel, cx + codeW / 2 + 6, PANEL.y + 19, { color: this.copyMsg ? (this.copyMsg.ok ? UI.green : UI.yellow) : UI.textDim, shadow: false });

    ctx.fillStyle = UI.panelBorder;
    ctx.fillRect(PANEL.x + 1, PANEL.y + 32, PANEL.w - 2, 1);
    ctx.fillRect(cx, PANEL.y + 33, 1, 100);

    for (const slot of ['host', 'guest']) this.drawColumn(ctx, slot);
    // Personajes (encima de las columnas, para que el saltito cruce la línea)
    for (const slot of ['host', 'guest']) this.drawChar(ctx, slot);

    // Estado de abajo
    const y = PANEL.y + PANEL.h - 13;
    let status;
    let color = UI.textDim;
    if (s.status === 'reconnecting') {
      status = T.reconnecting;
      color = UI.yellow;
    } else if (this.bothReady) {
      status = this.host ? T.start : T.waitHost;
      color = this.host ? (Math.floor(this.t * 3) % 2 ? UI.yellow : UI.text) : UI.textDim;
    } else status = T.waitBoth;
    drawText(ctx, status, cx, y, { align: 'center', color, bold: this.host && this.bothReady });

    const hint = this.lobby[this.mine].ready ? T.unreadyHint : T.pickHint;
    drawText(ctx, hint, cx, SCREEN.H - 14, { align: 'center', color: UI.textDim });

    if (this.banner) this.drawBanner(ctx);
  }

  drawColumn(ctx, slot) {
    const s = this.session;
    const x = COL_X[slot];
    const mine = slot === this.mine;
    const n = slot === 'host' ? 1 : 2;
    const present = mine || s.peer.present;
    const hy = PANEL.y + 37;
    const label = T.player(n);
    drawText(ctx, label, x, hy, { align: 'center', color: present ? UI.text : UI.textDim, bold: mine });
    if (mine) {
      const lx = x + measureText(label, true) / 2 + 4;
      ctx.fillStyle = charColor(this.lobby[slot].char);
      ctx.fillRect(lx, hy - 1, measureText(T.you) + 4, 9);
      drawText(ctx, T.you, lx + 2, hy, { color: UI.panel, shadow: false });
    }
    if (present) drawPingBars(ctx, x - 70, hy - 1, mine ? s.ping : s.peer.ping);

    // Lugar vacío del invitado: el código en grande para pasárselo al compañero
    if (!present) {
      drawCodeBoxes(ctx, s.code || '', x, PANEL.y + 56, { scale: 2, box: 20, gap: 4, color: COOP.both });
      wrapText(T.shareCode, 140).forEach((l, i) => drawText(ctx, l, x, PANEL.y + 84 + i * 10, { align: 'center', color: UI.text }));
      const dots = '.'.repeat(1 + (Math.floor(this.t * 3) % 3));
      drawText(ctx, T.waitingPeer + dots, x - measureText(T.waitingPeer) / 2, PANEL.y + 112, { color: UI.textDim });
      return;
    }

    const p = this.lobby[slot];
    // Piso
    ctx.fillStyle = '#1B2033';
    ctx.fillRect(x - 40, FEET_Y, 80, 1);
    const name = T.chars[p.char];
    drawText(ctx, name, x, FEET_Y + 5, { align: 'center', bold: true, color: charColor(p.char) });
    // Tapita todavía es un boceto (diseño final en el Hito 10)
    if (p.char === 'tapita') drawText(ctx, T.sketch, x + measureText(name, true) / 2 + 5, FEET_Y + 6, { color: '#4A4E66', shadow: false });

    if (p.ready) {
      const pop = this.stamp[slot] > 0 ? Ease.outBack(1 - this.stamp[slot] / STAMP_POP) : 1;
      const w = Math.round(44 * pop);
      const h = Math.max(1, Math.round(12 * pop));
      const sy = FEET_Y + 16;
      ctx.fillStyle = '#0F2A1A';
      ctx.fillRect(x - w / 2, sy, w, h);
      ctx.fillStyle = UI.green;
      ctx.fillRect(x - w / 2, sy, w, 1);
      ctx.fillRect(x - w / 2, sy + h - 1, w, 1);
      ctx.fillRect(x - w / 2, sy, 1, h);
      ctx.fillRect(x + w / 2 - 1, sy, 1, h);
      if (pop >= 0.9) drawText(ctx, T.ready, x, sy + 2, { align: 'center', bold: true, color: UI.green });
    } else if (mine && Math.floor(this.t * 2) % 2 === 0) {
      drawText(ctx, '<', x - 34, FEET_Y - 24, { color: charColor(p.char) });
      drawText(ctx, '>', x + 30, FEET_Y - 24, { color: charColor(p.char) });
    }

    // Compañero caído: cuenta regresiva
    if (!mine && s.peer.lost) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = UI.panel;
      ctx.fillRect(x - 70, PANEL.y + 46, 140, 84);
      ctx.globalAlpha = 1;
      drawText(ctx, T.peerLost(Math.ceil(s.peerGraceLeft())), x, PANEL.y + 80, { align: 'center', color: UI.yellow });
    }
  }

  drawChar(ctx, slot) {
    if (slot !== this.mine && !this.session.peer.present) return;
    const p = this.lobby[slot];
    const h = this.hop[p.char] || { x: COL_X[slot], from: COL_X[slot], to: COL_X[slot] };
    const span = Math.abs(h.to - h.from) || 1;
    const k = 1 - Math.abs(h.to - h.x) / span; // 0..1 del salto
    const hopY = h.x !== h.to ? Math.round(Math.sin(k * Math.PI) * HOP_HEIGHT) : 0;
    const anim = p.ready ? ANIMS.victory : ANIMS.idle;
    const t = this.t + (p.char === 'tapita' ? 0.37 : 0);
    // Cada uno mira hacia el centro
    const flip = h.x !== h.to ? h.to < h.from : slot === 'guest';
    const lost = slot !== this.mine && this.session.peer.lost;
    drawCoopChar(ctx, p.char, Math.round(h.x), FEET_Y - hopY, { anim, t, flip, staff: p.char === 'choco', alpha: lost ? 0.35 : 1 });
  }

  drawBanner(ctx) {
    const b = this.banner;
    const a = Math.min(1, b.t * 3, (BANNER_TIME - b.t) * 6);
    const lines = wrapText(b.text, 220);
    const h = lines.length * 10 + 8;
    const y = 60;
    ctx.globalAlpha = 0.92 * a;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(40, y, 240, h);
    ctx.fillStyle = b.color;
    ctx.fillRect(40, y, 240, 1);
    ctx.fillRect(40, y + h - 1, 240, 1);
    ctx.globalAlpha = a;
    lines.forEach((l, i) => drawText(ctx, l, SCREEN.W / 2, y + 5 + i * 10, { align: 'center', color: b.color }));
    ctx.globalAlpha = 1;
  }

  debugInfo() {
    return this.meter.lines(this.session);
  }
}
