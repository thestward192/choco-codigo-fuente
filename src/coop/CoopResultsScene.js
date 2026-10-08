// Resultados cooperativos — docs/coop/05_menus_coop.md y 03_mecanicas_coop.md
// Pantalla compartida con los dos personajes en su animación de victoria: tiempo, nota, caídas de
// cada uno, bits, cristales, recuerdos y sincronía. Continuar exige que confirmen los dos; el
// anfitrión manda a los dos al mapa de conexiones.
// Cada uno guarda el resultado en su propia computadora (la sala de elementos no se guarda).
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, COOP } from '../art/palettes.js';
import { Ease } from '../core/tween.js';
import { playSfx } from '../audio/sfx.js';
import { GAME } from '../net/protocol.js';
import { formatTime } from '../game/progress.js';
import { fxRng } from '../core/rng.js';
import { drawCoopChar, charColor } from './art.js';
import { ensureSession } from './common.js';
import { gradeFor } from './puzzle.js';
import { loadCoop, saveCoop, recordMapResult } from './coopSave.js';
import { Flow } from '../game/flow.js';

const T = TEXTS.coop.results;
const SAVED = ['prologue', 'c1', 'c2', 'c3', 'c4'];

export class CoopResultsScene extends Scene {
  // data: { map, time, falls: {choco, tapita}, counts: {bits, crystals}, memories, sync, mine }
  constructor(game, data) {
    super(game);
    this.online = true;
    this.data = data;
    this.t = 0;
    this.session = ensureSession(game);
    this.host = this.session.isHost;
    this.alive = true;
    this.okMine = false;
    this.okTheirs = false;
    this.grade = gradeFor(data.map, data.time);
    this.newBest = false;
    if (SAVED.includes(data.map) && game.save) {
      const r = recordMapResult(loadCoop(game.save), data.map, { time: data.time, falls: (data.falls.choco || 0) + (data.falls.tapita || 0), memories: data.memories });
      saveCoop(game.save, r.data);
      this.newBest = r.newBest && r.data.maps[data.map].plays > 1;
    }
    const s = this.session;
    this.offs = [s.on('game', (d) => this.onGame(d)), s.on('closed', (reason) => this.onClosed(reason)), s.on('peer', (p) => this.onPeer(p))];
    this.rows = [
      { label: T.time, value: formatTime(data.time) },
      { label: T.falls, value: `${data.falls.choco ?? 0} · ${data.falls.tapita ?? 0}`, split: true },
      { label: T.bits, value: `${data.counts.bits}`, color: UI.green },
      { label: T.crystals, value: `${data.counts.crystals}`, color: COOP.tapita },
      { label: T.memories, value: data.memories.length ? `${data.memories.filter(Boolean).length}/${data.memories.length}` : '—', color: COOP.both },
      { label: T.sync, value: `${data.sync}%`, note: T.syncNote },
    ];
  }

  enter() {
    playSfx(this.game.audio, 'victory');
  }

  exit() {
    this.alive = false;
    for (const off of this.offs) off();
  }

  onGame(d) {
    if (!this.alive) return;
    if (d.type === GAME.CUR && d.k === 'ok') {
      this.okTheirs = true;
      playSfx(this.game.audio, 'menuMove');
      this.maybeGo();
    } else if (!this.host && d.type === GAME.NAV && d.to === 'map') {
      this.alive = false;
      Flow.toCoopMap(this.game);
    }
  }

  onPeer(p) {
    if (!this.alive || p.present) return;
    this.alive = false;
    if (this.host) Flow.toCoopLobby(this.game);
  }

  onClosed(reason) {
    if (!this.alive) return;
    this.alive = false;
    Flow.toCoopMenu(this.game, { message: TEXTS.coop.closed[reason] || TEXTS.coop.closed.closed });
  }

  maybeGo() {
    if (!this.host || !this.okMine || !this.okTheirs || !this.alive) return;
    this.alive = false;
    this.session.sendGame({ type: GAME.NAV, to: 'map' });
    Flow.toCoopMap(this.game);
  }

  update(dt) {
    this.t += dt;
    if (!this.alive || this.game.transitioning) return;
    if (this.t > 1.2 && !this.okMine && this.game.input.pressed('confirm')) {
      this.okMine = true;
      playSfx(this.game.audio, 'menuConfirm');
      this.session.sendGame({ type: GAME.CUR, k: 'ok' });
      this.maybeGo();
    }
    // Lluvia de confeti de los dos colores
    if (fxRng.chance(0.3)) this.confetti = (this.confetti || []).concat([{ x: fxRng.range(0, SCREEN.W), y: -4, vy: fxRng.range(30, 60), c: fxRng.pick([COOP.choco, COOP.tapita, COOP.both, '#FFFFFF']) }]);
    if (this.confetti) {
      for (const c of this.confetti) c.y += c.vy * dt;
      this.confetti = this.confetti.filter((c) => c.y < SCREEN.H);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#0A0C18';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    for (const c of this.confetti || []) {
      ctx.fillStyle = c.c;
      ctx.fillRect(Math.round(c.x), Math.round(c.y), 2, 2);
    }
    const title = this.data.map === 'lab' || this.data.map === 'test' ? T.titleLab : T.title;
    const k = Ease.outBack(Math.min(1, this.t / 0.5));
    drawText(ctx, title, SCREEN.W / 2, Math.round(10 - (1 - k) * 20), { align: 'center', bold: true, color: UI.yellow });
    drawText(ctx, TEXTS.coop.map.names[this.data.map] || '', SCREEN.W / 2, 22, { align: 'center', color: UI.textDim });

    // Los dos personajes con su animación de victoria, a los costados
    drawCoopChar(ctx, 'choco', 50, 128, { anim: 'victory', t: this.t, scale: 2 });
    drawCoopChar(ctx, 'tapita', SCREEN.W - 50, 128, { anim: 'victory', t: this.t + 0.3, scale: 2, flip: true });

    // Tabla
    const x0 = 96;
    const x1 = SCREEN.W - 96;
    this.rows.forEach((r, i) => {
      const show = this.t > 0.4 + i * 0.15;
      if (!show) return;
      const y = 34 + i * 12;
      drawText(ctx, r.label, x0, y, { color: UI.textDim });
      if (r.split) {
        const [a, b] = r.value.split(' · ');
        drawText(ctx, a, x1 - 22, y, { align: 'right', color: charColor('choco') });
        drawText(ctx, '·', x1 - 14, y, { align: 'center', color: UI.textDim });
        drawText(ctx, b, x1, y, { align: 'right', color: charColor('tapita') });
      } else drawText(ctx, r.value, x1, y, { align: 'right', color: r.color || UI.text });
      if (r.note) drawText(ctx, `(${r.note})`, x1, y + 9, { align: 'right', color: '#4A4E66', shadow: false });
    });

    // Nota grande
    const gy = 122;
    if (this.t > 1.3) {
      const gk = Ease.outBack(Math.min(1, (this.t - 1.3) / 0.4));
      drawText(ctx, T.grade, SCREEN.W / 2 - 18, gy + 2, { align: 'right', color: UI.textDim });
      const color = this.grade === 'S' ? UI.yellow : this.grade === 'A' ? UI.green : UI.text;
      ctx.save();
      ctx.translate(SCREEN.W / 2, gy);
      ctx.scale(2 * gk, 2 * gk);
      drawText(ctx, this.grade, 0, -4, { align: 'center', bold: true, color });
      ctx.restore();
      if (this.newBest) drawText(ctx, T.newBest, SCREEN.W / 2 + 18, gy + 2, { color: UI.yellow });
    }

    // Confirmar: los dos
    const y = SCREEN.H - 22;
    const msg = this.okMine ? T.waiting : T.continue;
    if (this.t > 1.2) drawText(ctx, msg, SCREEN.W / 2, y, { align: 'center', color: this.okMine ? UI.textDim : Math.floor(this.t * 3) % 2 ? UI.yellow : UI.text });
    drawText(ctx, T.both, SCREEN.W / 2, y + 10, { align: 'center', color: '#4A4E66', shadow: false });
    const mine = this.data.mine;
    const theirs = mine === 'choco' ? 'tapita' : 'choco';
    this.drawOk(ctx, SCREEN.W / 2 - 74, y + 1, charColor(mine), this.okMine);
    this.drawOk(ctx, SCREEN.W / 2 + 68, y + 1, charColor(theirs), this.okTheirs);
  }

  drawOk(ctx, x, y, color, on) {
    ctx.fillStyle = on ? color : '#2A2A3A';
    ctx.fillRect(x, y, 6, 6);
    if (on) {
      ctx.fillStyle = '#0A0C18';
      ctx.fillRect(x + 1, y + 3, 1, 1);
      ctx.fillRect(x + 2, y + 4, 1, 1);
      ctx.fillRect(x + 3, y + 3, 1, 1);
      ctx.fillRect(x + 4, y + 2, 1, 1);
    }
  }
}
