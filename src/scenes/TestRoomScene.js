// Sala de pruebas: física de Choco, báculo, vida, enemigos, pickups y cámara (Hito 1).
// Con ?scene=room se juega suelta; desde el Hito 2 también sirve como nivel de reemplazo
// para los niveles que todavía no existen (checkpoints, Y doradas, salida, terminal).
import { SCREEN } from '../config/balance.js';
import { Tilemap } from '../systems/tilemap.js';
import { aabbOverlap } from '../systems/physics.js';
import { Byteling } from '../entities/enemies/byteling.js';
import { Pickup } from '../entities/pickups.js';
import { buildTestRoom, SIGNS } from '../levels/testroom/map.js';
import { drawLoadingTiles, drawLoadingBackground } from '../art/tiles/loading.js';
import { drawText } from '../art/font.js';
import { UI, LOADING } from '../art/palettes.js';
import { TEXTS, DIALOGUES } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_PRUEBA } from '../audio/songs/prueba.js';
import { fxRng } from '../core/rng.js';
import { PlatformLevel } from '../levels/PlatformLevel.js';

const TS = SCREEN.TILE;

export class TestRoomScene extends PlatformLevel {
  // levelId: nivel que representa (null = sala de pruebas suelta, sin partida)
  constructor(game, { levelId = null } = {}) {
    super(game, { levelId });
    this._onKey = (e) => {
      if (e.code === 'KeyR' && !this.game.session) this.restartKey = true;
    };
    this.build();
  }

  build() {
    this.setMap(new Tilemap(buildTestRoom()));
    const m = this.map;
    const start = m.find('P')[0];
    this.spawn = { x: start.tx * TS + TS / 2, y: (start.ty + 1) * TS, id: -1 };
    const found = [];
    for (const [ch, id] of Object.entries(SIGNS)) for (const { tx, ty } of m.find(ch)) found.push({ x: tx * TS + 8, y: (ty + 1) * TS, text: TEXTS.testRoom.signs[id] });
    found.sort((a, b) => a.x - b.x);
    found.forEach((s, i) => this.addSign(s.x, s.y, s.text, { checkpoint: true, id: i, draw: this.drawWireSign }));
    // Checkpoint guardado de este nivel
    this.checkpoint = { ...this.spawn };
    const cp = this.session?.data.checkpoint;
    if (cp && cp.level === this.levelId && this.signs[cp.id]) {
      const s = this.signs[cp.id];
      this.checkpoint = { x: s.x, y: s.y, id: s.id };
    }
    this.placeChoco(this.checkpoint.x, this.checkpoint.y);

    for (const { tx, ty } of m.find('b')) this.enemies.push(new Byteling(tx * TS + 8, (ty + 1) * TS, { dir: -1, turnAtEdges: true }));
    for (const { tx, ty } of m.find('B')) this.enemies.push(new Byteling(tx * TS + 8, (ty + 1) * TS, { dir: -1, turnAtEdges: false }));
    for (const { tx, ty } of m.find('$')) this.pickups.push(new Pickup('bit', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('c')) this.pickups.push(new Pickup('cacao', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('h')) this.pickups.push(new Pickup('chunk', tx * TS + 8, ty * TS + 10));
    if (!this.choco.items.boots) for (const { tx, ty } of m.find('O')) this.pickups.push(new Pickup('boots', tx * TS + 8, ty * TS + 8));
    m.find('Y')
      .sort((a, b) => a.tx - b.tx)
      .forEach(({ tx, ty }, i) => this.pickups.push(new Pickup('goldenY', tx * TS + 8, ty * TS + 8, { index: i, ghost: this.goldenGhost(i) })));
    const ex = m.find('X')[0];
    this.exitZone = ex ? { x: ex.tx * TS, y: ex.ty * TS - 16, w: 16, h: 32 } : null;
    const term = m.find('N')[0];
    if (term) {
      this.addInteractable({
        x: term.tx * TS + 8,
        y: (term.ty + 1) * TS,
        hintH: 32,
        onUse: () => this.talkToTerminal(),
        draw: (ctx, o, cx, cy) => this.drawTerminal(ctx, o, cx, cy),
      });
    }
  }

  enter() {
    this.game.audio.playSong(SONG_PRUEBA);
    window.addEventListener('keydown', this._onKey);
  }

  exit() {
    super.exit();
    window.removeEventListener('keydown', this._onKey);
  }

  // Terminal: prueba de diálogos y cinemática
  talkToTerminal() {
    const g = this.game;
    this.playCutscene(function* (cs) {
      g.effects.glitch(0.4, 0.8);
      g.effects.shake(0.3);
      playSfx(g.audio, 'glitch');
      yield 0.6;
      yield cs.say(DIALOGUES.testTerminal);
      yield 0.3;
    });
  }

  levelUpdate() {
    if (this.restartKey) {
      this.restartKey = false;
      const g = this.game;
      g.changeScene(() => new TestRoomScene(g, { levelId: this.levelId }), { type: 'glitch' });
    }
  }

  afterChocoMove() {
    const c = this.choco;
    if (this.exitZone && !this.ending && c.state === 'play' && aabbOverlap(c.body, this.exitZone)) {
      this.finishLevel();
      playSfx(this.game.audio, 'item');
      this.particles.burst(c.cx, c.cy, 30, { speedMin: 30, speedMax: 100, colors: ['#FF2E88', '#43D9FF', '#FFFFFF'], lifeMin: 0.3, lifeMax: 0.8 });
    }
  }

  // ---------- Dibujo ----------
  drawBackground(ctx, cx, cy) {
    drawLoadingBackground(ctx, cx, cy, this.t, (bx, by) => {
      drawText(ctx, TEXTS.testRoom.loading, bx + 110, by + 18, { align: 'center', color: '#1E2A40', shadow: false });
    });
  }

  drawTiles(ctx, cx, cy) {
    drawLoadingTiles(ctx, this.map, cx, cy, this.t, this.map.ghostSolid);
  }

  drawWorld(ctx, cx, cy) {
    if (this.exitZone) this.drawExit(ctx, cx, cy);
  }

  drawWireSign(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    const isCp = this.checkpoint.id === s.id;
    ctx.fillStyle = LOADING.wire;
    ctx.fillRect(x - 1, y - 8, 2, 8);
    ctx.fillStyle = s.flash > 0 && Math.floor(s.flash * 20) % 2 ? '#1E4A2A' : '#0B0D16';
    ctx.fillRect(x - 7, y - 19, 14, 11);
    ctx.fillStyle = isCp ? UI.green : s.t > 0 ? LOADING.cyan : LOADING.wire;
    ctx.fillRect(x - 7, y - 19, 14, 1);
    ctx.fillRect(x - 7, y - 9, 14, 1);
    ctx.fillRect(x - 7, y - 19, 1, 11);
    ctx.fillRect(x + 6, y - 19, 1, 11);
    ctx.fillStyle = isCp ? UI.green : s.t > 0 ? '#E8FFF0' : '#2A6F8A';
    ctx.fillRect(x - 5, y - 16, 6, 1);
    ctx.fillRect(x - 5, y - 13, 9, 1);
    if (Math.floor(this.t * 3) % 2) ctx.fillRect(x + 2, y - 16, 2, 1);
  }

  // Terminal con la cara de N.U.L.L. parpadeando
  drawTerminal(ctx, o, cx, cy) {
    const x = Math.round(o.x - cx);
    const y = Math.round(o.y - cy);
    ctx.fillStyle = '#2A2A38';
    ctx.fillRect(x - 7, y - 22, 14, 16);
    ctx.fillRect(x - 2, y - 6, 4, 6);
    ctx.fillStyle = '#0B0610';
    ctx.fillRect(x - 5, y - 20, 10, 11);
    if (Math.floor(this.t * 2) % 3 !== 0) {
      ctx.fillStyle = '#FF2E88';
      ctx.fillRect(x - 2, y - 17, 4, 4);
      ctx.fillStyle = '#0B0610';
      ctx.fillRect(x - 1, y - 16, 2, 2);
    }
  }

  // Portal glitcheado de salida
  drawExit(ctx, cx, cy) {
    const e = this.exitZone;
    const x = Math.round(e.x - cx);
    const y = Math.round(e.y - cy);
    for (let i = 0; i < 16; i++) {
      const w = 6 + Math.round(Math.sin(this.t * 6 + i) * 3);
      ctx.fillStyle = i % 3 === 0 ? '#FF2E88' : i % 3 === 1 ? '#43D9FF' : '#2A1446';
      ctx.fillRect(x + 8 - w, y + i * 2, w * 2, 2);
    }
    if (fxRng.chance(0.3)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + fxRng.int(0, 15), y + fxRng.int(0, 31), 2, 1);
    }
  }
}
