// Solo desarrollo — docs/coop/04_red.md
//   ?coop=local → las dos vistas del cooperativo en la misma página, conectadas en memoria (loopback),
//                 con el mismo teclado: Choco a la izquierda (WASD) y Tapita a la derecha (flechas).
//   ?scene=sala → la sala de pruebas cooperativa con un solo personaje (?pj=tapita para Tapita).
// ?lag=150 también funciona aquí. No es un modo de juego: el cooperativo local está fuera de alcance.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { ACTIONS } from '../config/controls.js';
import { Input } from '../core/input.js';
import { createCanvas } from '../core/renderer.js';
import { drawText } from '../art/font.js';
import { UI, COOP as COOP_COLORS } from '../art/palettes.js';
import { LoopHub } from '../net/loopTransport.js';
import { LagTransport } from '../net/transport.js';
import { CoopSession } from '../net/session.js';
import { CoopTestRoom } from './CoopTestRoom.js';

// Teclas de cada jugador (asignación completa: lo que no está queda sin tecla)
function keymap(map) {
  const out = {};
  for (const a of ACTIONS) out[a] = map[a] || [];
  return out;
}
const P1_KEYS = keymap({
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  jump: ['Space'],
  shoot: ['KeyF'],
  shield: ['KeyG'],
  lasso: ['KeyR'],
  debug: ['KeyQ'],
  interact: ['KeyE'],
  signal: ['KeyT'],
});
const P2_KEYS = keymap({
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  jump: ['KeyK', 'Numpad0'],
  shoot: ['KeyJ', 'Numpad1'],
  shield: ['KeyL', 'Numpad2'],
  lasso: ['KeyI', 'Numpad3'],
  debug: ['KeyU', 'Numpad4'],
  interact: ['KeyO', 'Numpad5'],
  signal: ['KeyP', 'Numpad6'],
});

export class LocalCoopScene extends Scene {
  constructor(game, { solo = false, pj = null } = {}) {
    super(game);
    this.online = true;
    this.solo = solo;
    this.rooms = [];
    this.inputs = [];
    this.t = 0;
    const params = new URLSearchParams(globalThis.location?.search || '');
    this.lag = Math.max(0, Number(params.get('lag')) || 0);
    this.soloChar = (pj || params.get('pj')) === 'tapita' ? 'tapita' : 'choco';
    this.start();
  }

  connect(hub) {
    return () => (this.lag > 0 ? new LagTransport(hub.connect(), this.lag) : hub.connect());
  }

  async start() {
    const hub = new LoopHub();
    this.hub = hub;
    this.tick = setInterval(() => hub.tick(), 1000);
    const host = new CoopSession({ connect: this.connect(hub) });
    this.sessions = [host];
    await host.create();
    if (this.solo) {
      this.rooms = [new CoopTestRoom(this.game, { session: host, mine: this.soloChar, local: true, onLeave: () => this.restart() })];
      this.rooms[0].enter();
      return;
    }
    const guest = new CoopSession({ connect: this.connect(hub) });
    this.sessions.push(guest);
    await guest.join(host.code);
    this.inputs = [new Input(window, { keys: P1_KEYS, usePad: false }), new Input(window, { keys: P2_KEYS, usePad: false })];
    this.rooms = [
      new CoopTestRoom(this.game, { session: host, mine: 'choco', input: this.inputs[0], local: true, onLeave: () => this.restart() }),
      new CoopTestRoom(this.game, { session: guest, mine: 'tapita', input: this.inputs[1], local: true, onLeave: () => this.restart() }),
    ];
    this.views = this.rooms.map(() => createCanvas(SCREEN.W, SCREEN.H));
    this.game.renderer.setSize(SCREEN.W * 2, SCREEN.H);
    this.rooms[0].enter();
  }

  // Al terminar la sala, otra vez desde el principio
  restart() {
    const g = this.game;
    g.changeScene(() => new LocalCoopScene(g, { solo: this.solo, pj: this.soloChar }), { type: 'fade' });
  }

  exit() {
    clearInterval(this.tick);
    for (const r of this.rooms) r.exit();
    for (const i of this.inputs) i.dispose();
    for (const s of this.sessions || []) s.dispose();
    this.game.renderer.setSize(SCREEN.W, SCREEN.H);
  }

  update(dt) {
    this.t += dt;
    for (const i of this.inputs) i.update(dt);
    for (const r of this.rooms) r.update(dt);
  }

  draw(ctx) {
    if (!this.rooms.length) {
      drawText(ctx, '…', SCREEN.W / 2, SCREEN.H / 2, { align: 'center', color: UI.textDim });
      return;
    }
    if (this.solo) {
      this.rooms[0].draw(ctx);
      return;
    }
    this.rooms.forEach((r, i) => {
      const v = this.views[i];
      const vctx = v.getContext('2d');
      vctx.imageSmoothingEnabled = false;
      vctx.setTransform(1, 0, 0, 1, 0, 0);
      vctx.globalAlpha = 1;
      r.draw(vctx);
      ctx.drawImage(v, i * SCREEN.W, 0);
    });
    // Línea divisoria con los colores de cada uno
    ctx.fillStyle = COOP_COLORS.choco;
    ctx.fillRect(SCREEN.W - 1, 0, 1, SCREEN.H);
    ctx.fillStyle = COOP_COLORS.tapita;
    ctx.fillRect(SCREEN.W, 0, 1, SCREEN.H);
  }

  // Vuelo libre (J) del modo desarrolladora en la sala sola
  get choco() {
    return this.solo ? this.rooms[0]?.player : null;
  }

  debugInfo() {
    return this.rooms[0]?.debugInfo() || [];
  }
}
