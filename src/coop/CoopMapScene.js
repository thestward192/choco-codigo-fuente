// Mapa de conexiones — docs/coop/05_menus_coop.md
// Una red de nodos unidos por cables de datos animados: Puntarenas, la casa de Juan Carlos y la
// Chicharronera alrededor de La Sala (con candado hasta completar los tres). Abajo, el prólogo
// para repetirlo y la sala de elementos.
// - El anfitrión elige el mapa y manda su progreso: se muestra el del anfitrión.
// - El invitado ve el cursor del anfitrión en tiempo real y tiene su propio cursor chico; con la
//   señal (o Enter) sugiere un nodo, que parpadea con su color.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { wrapText } from '../art/fontData.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { GAME } from '../net/protocol.js';
import { ConfirmScene } from '../scenes/ConfirmScene.js';
import { SONG_TITULO } from '../audio/songs/titulo.js';
import { charColor } from './art.js';
import { ensureSession } from './common.js';
import { loadCoop, progressSummary, parseSummary, salaOpen } from './coopSave.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.coop.map;
const PANEL = { x: 6, y: 4, w: 308, h: 172 };

// Nodos: posición en pantalla, tamaño y a qué se conectan
export const MAP_NODES = [
  { id: 'prologue', x: 46, y: 118, r: 8, small: true },
  { id: 'c1', x: 70, y: 52, r: 12, icon: 'anchor', n: 1 },
  { id: 'c2', x: 160, y: 36, r: 12, icon: 'pool', n: 2 },
  { id: 'c3', x: 250, y: 52, r: 12, icon: 'paila', n: 3 },
  { id: 'c4', x: 160, y: 92, r: 14, icon: 'sala', final: true },
  { id: 'lab', x: 274, y: 118, r: 8, small: true },
];
const CABLES = [
  ['prologue', 'c1'],
  ['c1', 'c2'],
  ['c2', 'c3'],
  ['c1', 'c4'],
  ['c2', 'c4'],
  ['c3', 'c4'],
  ['c3', 'lab'],
];
const SUGGEST_TIME = 2.5;

// Nodo más cercano en la dirección (dx, dy) desde el nodo i (para ← → ↑ ↓)
export function nextNode(i, dx, dy) {
  const a = MAP_NODES[i];
  let best = i;
  let bestScore = Infinity;
  MAP_NODES.forEach((b, j) => {
    if (j === i) return;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const along = vx * dx + vy * dy;
    if (along <= 0) return;
    const across = Math.abs(vx * dy - vy * dx);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = j;
    }
  });
  return best;
}

export class CoopMapScene extends Scene {
  constructor(game, { fromPrologue = false } = {}) {
    super(game);
    this.online = true;
    this.t = 0;
    this.session = ensureSession(game);
    this.host = this.session.isHost;
    this.alive = true;
    this.sel = this.host ? 1 : 1;
    this.mineSel = 1; // cursor chico del invitado
    this.guestSel = null; // lo que ve el anfitrión del cursor del invitado
    this.suggest = null; // { i, t }
    this.prog = this.host ? progressSummary(loadCoop(game.save)) : null;
    this.reveal = fromPrologue ? 0 : 1; // al llegar del prólogo, la red se dibuja de a poco
    const s = this.session;
    this.offs = [
      s.on('game', (d) => this.onGame(d)),
      s.on('peer', (p) => this.onPeer(p)),
      s.on('closed', (reason) => this.onClosed(reason)),
    ];
  }

  enter() {
    this.game.audio.playSong(SONG_TITULO);
    if (this.host) this.broadcast();
    else this.session.sendGame({ type: GAME.CUR, k: 'hi' });
  }

  exit() {
    this.alive = false;
    for (const off of this.offs) off();
  }

  broadcast() {
    if (!this.host) return;
    this.session.sendGame({ type: GAME.CUR, k: 'prog', p: this.prog, i: this.sel });
  }

  // ---------- Red ----------
  onGame(d) {
    if (!this.alive) return;
    if (d.type === GAME.CUR) {
      if (this.host) {
        if (d.k === 'hi') this.broadcast();
        else if (d.k === 'gc' && Number.isInteger(d.i) && MAP_NODES[d.i]) this.guestSel = d.i;
        else if (d.k === 'sug' && Number.isInteger(d.i) && MAP_NODES[d.i]) {
          this.suggest = { i: d.i, t: SUGGEST_TIME };
          playSfx(this.game.audio, 'signal');
        }
      } else if (d.k === 'prog') {
        const p = parseSummary(d.p);
        if (p) this.prog = p;
        if (Number.isInteger(d.i) && MAP_NODES[d.i]) this.sel = d.i;
      } else if (d.k === 'sel' && Number.isInteger(d.i) && MAP_NODES[d.i]) {
        if (this.sel !== d.i) playSfx(this.game.audio, 'menuMove');
        this.sel = d.i;
      }
    } else if (!this.host && d.type === GAME.START) {
      this.alive = false;
      Flow.startCoopStage(this.game, { map: d.map, seed: d.seed, cp: d.cp ?? null, roles: { host: d.host, guest: d.guest } });
    } else if (!this.host && d.type === GAME.NAV && d.to === 'lobby') {
      this.alive = false;
      Flow.toCoopLobby(this.game);
    }
  }

  onPeer(p) {
    if (!this.alive) return;
    // Sin compañero no hay mapa: el anfitrión vuelve a la sala de espera a esperarlo
    if (!p.present && this.host) {
      this.alive = false;
      Flow.toCoopLobby(this.game);
    } else if (p.present && !p.lost && this.host) this.broadcast();
  }

  onClosed(reason) {
    if (!this.alive) return;
    this.alive = false;
    Flow.toCoopMenu(this.game, { message: TEXTS.coop.closed[reason] || TEXTS.coop.closed.closed });
  }

  // ---------- Estado ----------
  isLocked(id) {
    if (id === 'c4') return !this.prog || !salaOpenSummary(this.prog);
    return false;
  }

  // ---------- Actualización ----------
  update(dt) {
    this.t += dt;
    this.reveal = Math.min(1, this.reveal + dt * 0.8);
    if (this.suggest && (this.suggest.t -= dt) <= 0) this.suggest = null;
    if (this.game.transitioning || !this.alive) return;
    const inp = this.game.input;
    const dir = inp.pressed('left') ? [-1, 0] : inp.pressed('right') ? [1, 0] : inp.pressed('up') ? [0, -1] : inp.pressed('down') ? [0, 1] : null;
    if (this.host) {
      if (dir) {
        const n = nextNode(this.sel, dir[0], dir[1]);
        if (n !== this.sel) {
          this.sel = n;
          playSfx(this.game.audio, 'menuMove');
          this.session.sendGame({ type: GAME.CUR, k: 'sel', i: n });
        }
      }
      if (inp.pressed('confirm')) this.choose();
      else if (inp.pressed('cancel')) this.back();
      return;
    }
    // Invitado: su cursor chico y la sugerencia
    if (dir) {
      const n = nextNode(this.mineSel, dir[0], dir[1]);
      if (n !== this.mineSel) {
        this.mineSel = n;
        playSfx(this.game.audio, 'menuMove');
        this.session.sendGame({ type: GAME.CUR, k: 'gc', i: n });
      }
    }
    if (inp.pressed('signal') || inp.pressed('confirm')) {
      this.suggest = { i: this.mineSel, t: SUGGEST_TIME };
      playSfx(this.game.audio, 'signal');
      this.session.sendGame({ type: GAME.CUR, k: 'sug', i: this.mineSel });
    } else if (inp.pressed('cancel')) this.back();
  }

  choose() {
    const node = MAP_NODES[this.sel];
    if (this.isLocked(node.id)) {
      playSfx(this.game.audio, 'denied');
      return;
    }
    if (!this.session.peer.present || this.session.peer.lost) {
      playSfx(this.game.audio, 'denied');
      return;
    }
    playSfx(this.game.audio, 'menuConfirm');
    const roles = this.game.coopRoles || { host: 'choco', guest: 'tapita' };
    const data = loadCoop(this.game.save);
    const cp = data.checkpoint?.map === node.id ? data.checkpoint.id : null;
    const seed = Math.floor(Math.random() * 2 ** 31);
    this.session.sendGame({ type: GAME.START, map: node.id, seed, host: roles.host, guest: roles.guest, cp });
    this.alive = false;
    Flow.startCoopStage(this.game, { map: node.id, seed, cp, roles });
  }

  back() {
    const g = this.game;
    playSfx(g.audio, 'menuCancel');
    if (this.host) {
      g.push(
        new ConfirmScene(g, T.back, () => {
          if (!this.alive) return;
          this.alive = false;
          this.session.sendGame({ type: GAME.NAV, to: 'lobby' });
          Flow.toCoopLobby(g);
        }),
      );
    } else {
      g.push(
        new ConfirmScene(g, T.leaveGuest, () => {
          this.alive = false;
          this.session.leave();
          Flow.toCoopMenu(g);
        }),
      );
    }
  }

  // ---------- Dibujo ----------
  draw(ctx) {
    ctx.fillStyle = '#05060C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    drawTerminalPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, T.title);
    // Cuadrícula de fondo
    ctx.fillStyle = '#0E1222';
    for (let x = PANEL.x + 8; x < PANEL.x + PANEL.w; x += 12) ctx.fillRect(x, PANEL.y + 14, 1, PANEL.h - 15);
    for (let y = PANEL.y + 20; y < PANEL.y + PANEL.h; y += 12) ctx.fillRect(PANEL.x + 1, y, PANEL.w - 2, 1);

    for (const [a, b] of CABLES) this.drawCable(ctx, MAP_NODES.find((n) => n.id === a), MAP_NODES.find((n) => n.id === b));
    MAP_NODES.forEach((n, i) => this.drawNode(ctx, n, i));
    this.drawInfo(ctx);
    const hint = this.host ? T.hintHost : T.hintGuest;
    drawText(ctx, hint, SCREEN.W / 2, PANEL.y + PANEL.h - 10, { align: 'center', color: UI.textDim, shadow: false });
    if (!this.prog) drawText(ctx, T.waitingHost, SCREEN.W / 2, 100, { align: 'center', color: UI.yellow });
    if (this.session.peer.lost) drawText(ctx, TEXTS.coop.peerLost(Math.ceil(this.session.peerGraceLeft())), SCREEN.W / 2, 18, { align: 'center', color: UI.yellow });
  }

  // Cable de datos con paquetes que viajan
  drawCable(ctx, a, b) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const shown = len * Math.min(1, this.reveal * 1.5);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const locked = this.isLocked(a.id) || this.isLocked(b.id);
    for (let d = 0; d < shown; d += 2) {
      ctx.fillStyle = locked ? '#1A1E30' : '#22304A';
      ctx.fillRect(Math.round(a.x + ux * d), Math.round(a.y + uy * d), 1, 1);
    }
    if (locked || this.reveal < 1) return;
    for (let k = 0; k < 2; k++) {
      const d = ((this.t * 40 + k * len * 0.5 + a.x) % len) | 0;
      ctx.fillStyle = k ? COOP.choco : COOP.tapita;
      ctx.fillRect(Math.round(a.x + ux * d) - 1, Math.round(a.y + uy * d) - 1, 2, 2);
    }
  }

  drawNode(ctx, n, i) {
    const p = this.prog?.maps[n.id];
    const locked = this.isLocked(n.id);
    const sel = i === this.sel;
    const pop = Math.min(1, Math.max(0, this.reveal * 2 - i * 0.12));
    if (pop <= 0) return;
    const r = Math.round(n.r * (sel ? 1.15 : 1) * pop);
    // Círculo de píxeles
    const ring = locked ? '#3A3F55' : p?.done ? UI.green : n.final ? COOP.both : UI.cyan;
    for (let y = -r; y <= r; y++) {
      const hw = Math.round(Math.sqrt(r * r - y * y));
      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(n.x - hw, n.y + y, hw * 2 + 1, 1);
      ctx.fillStyle = ring;
      ctx.fillRect(n.x - hw, n.y + y, 1, 1);
      ctx.fillRect(n.x + hw, n.y + y, 1, 1);
    }
    ctx.fillStyle = ring;
    ctx.fillRect(n.x - Math.round(r * 0.6), n.y - r, Math.round(r * 1.2) + 1, 1);
    ctx.fillRect(n.x - Math.round(r * 0.6), n.y + r, Math.round(r * 1.2) + 1, 1);
    this.drawIcon(ctx, n, locked);
    // Sugerencia del invitado: parpadea con su color
    if (this.suggest?.i === i && Math.floor(this.t * 8) % 2) {
      ctx.strokeStyle = charColor((this.game.coopRoles || { guest: 'tapita' }).guest);
      ctx.strokeRect(n.x - r - 3.5, n.y - r - 3.5, r * 2 + 7, r * 2 + 7);
    }
    // Cursor del anfitrión (llave con su color) y el del invitado (puntito con el suyo)
    const roles = this.game.coopRoles || { host: 'choco', guest: 'tapita' };
    if (sel) {
      const bx = Math.round(n.x - r - 9 - Math.abs(Math.sin(this.t * 8)) * 2);
      drawText(ctx, '{', bx, n.y - 4, { color: charColor(roles.host) });
      drawText(ctx, '}', n.x + r + 4 + Math.round(Math.abs(Math.sin(this.t * 8)) * 2), n.y - 4, { color: charColor(roles.host) });
    }
    const gi = this.host ? this.guestSel : this.mineSel;
    if (gi === i) {
      ctx.fillStyle = charColor(roles.guest);
      const by = n.y + r + 4 + Math.round(Math.sin(this.t * 6));
      ctx.fillRect(n.x - 2, by, 5, 2);
      ctx.fillRect(n.x - 1, by - 1, 3, 1);
    }
    // Nota y recuerdos
    if (p?.done && p.grade) drawText(ctx, p.grade, n.x + r - 2, n.y - r - 6, { color: p.grade === 'S' ? UI.yellow : UI.text, bold: true });
    if (!n.small) drawText(ctx, T.short[n.id], n.x, n.y + r + (gi === i ? 10 : 4), { align: 'center', color: locked ? UI.textDim : UI.text, shadow: false });
  }

  drawIcon(ctx, n, locked) {
    const x = n.x;
    const y = n.y;
    if (locked) {
      // Candado
      ctx.fillStyle = UI.textDim;
      ctx.fillRect(x - 4, y - 1, 9, 6);
      ctx.fillRect(x - 3, y - 5, 1, 4);
      ctx.fillRect(x + 3, y - 5, 1, 4);
      ctx.fillRect(x - 2, y - 6, 5, 1);
      ctx.fillStyle = '#0B0E1A';
      ctx.fillRect(x, y + 1, 1, 2);
      return;
    }
    switch (n.icon) {
      case 'anchor':
        ctx.fillStyle = '#8AD8FF';
        ctx.fillRect(x, y - 6, 1, 11);
        ctx.fillRect(x - 3, y - 4, 7, 1);
        ctx.fillRect(x - 5, y + 2, 1, 2);
        ctx.fillRect(x + 5, y + 2, 1, 2);
        ctx.fillRect(x - 4, y + 4, 9, 1);
        ctx.fillRect(x - 1, y - 7, 3, 1);
        break;
      case 'pool':
        ctx.fillStyle = '#43A8E0';
        ctx.fillRect(x - 6, y, 13, 5);
        ctx.fillStyle = '#FFFFFF';
        for (let i = -6; i < 7; i += 3) ctx.fillRect(x + i, y + (Math.floor(this.t * 4 + i) % 2), 2, 1);
        ctx.fillStyle = '#FF7DB0';
        ctx.fillRect(x - 2, y - 4, 5, 3);
        break;
      case 'paila':
        ctx.fillStyle = '#C8A070';
        ctx.fillRect(x - 6, y - 1, 13, 2);
        ctx.fillRect(x - 5, y + 1, 11, 2);
        ctx.fillRect(x - 3, y + 3, 7, 1);
        ctx.fillStyle = '#FFB13B';
        for (let i = 0; i < 3; i++) ctx.fillRect(x - 3 + i * 3, y - 3 - (Math.floor(this.t * 6 + i) % 3), 1, 2);
        break;
      case 'sala': {
        // Ícono de carga que gira (un paquete por cada mitad)
        for (let i = 0; i < 8; i++) {
          const a = this.t * 4 + (i * Math.PI) / 4;
          ctx.fillStyle = i < 4 ? COOP.choco : COOP.tapita;
          ctx.globalAlpha = 0.3 + (i / 8) * 0.7;
          ctx.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 6), 2, 2);
        }
        ctx.globalAlpha = 1;
        break;
      }
      default:
        // Prólogo y sala de elementos: una cuadrícula blanca
        ctx.fillStyle = n.id === 'lab' ? '#C4C77A' : '#F4F1EA';
        ctx.fillRect(x - 3, y - 3, 7, 7);
        ctx.fillStyle = '#0B0E1A';
        ctx.fillRect(x, y - 3, 1, 7);
        ctx.fillRect(x - 3, y, 7, 1);
    }
  }

  // Ficha del nodo elegido
  drawInfo(ctx) {
    const n = MAP_NODES[this.sel];
    const p = this.prog?.maps[n.id];
    const w = 160;
    const x = Math.round((SCREEN.W - w) / 2);
    const y = PANEL.y + 124;
    ctx.fillStyle = '#0B0E1A';
    ctx.fillRect(x, y, w, 34);
    ctx.fillStyle = UI.panelBorder;
    ctx.fillRect(x, y, w, 1);
    drawText(ctx, T.names[n.id], x + w / 2, y + 3, { align: 'center', bold: true, color: UI.text, shadow: false });
    let line;
    let color = UI.textDim;
    if (this.isLocked(n.id)) {
      line = T.locked;
      color = UI.yellow;
    } else if (['c1', 'c2', 'c3', 'c4'].includes(n.id)) {
      line = `${T.memories(p?.mem ?? 0)} · ${p?.done ? `${TEXTS.coop.results.grade} ${p.grade}` : T.notDone}`;
    } else line = T.subtitles[n.id];
    wrapText(line, w - 6).slice(0, 2).forEach((l, i) => drawText(ctx, l, x + w / 2, y + 14 + i * 9, { align: 'center', color, shadow: false }));
    if (!this.host) drawText(ctx, T.hostProgress, PANEL.x + PANEL.w - 6, PANEL.y + 16, { align: 'right', color: '#4A4E66', shadow: false });
  }
}

// La Sala con el resumen de progreso (el del anfitrión)
function salaOpenSummary(prog) {
  return salaOpen({ maps: prog.maps });
}
