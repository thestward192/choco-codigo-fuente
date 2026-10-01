// Prólogo · Parte A: el cuarto de Choco. Tutorial de moverse, saltar e interactuar sin carteles,
// y la cinemática "La barra rota" (docs/niveles/nivel_0_prologo.md y docs/01_historia.md).
import { SCREEN } from '../../config/balance.js';
import { PROLOGUE } from '../../config/balance.js';
import { Tilemap } from '../../systems/tilemap.js';
import { PlatformLevel } from '../PlatformLevel.js';
import { buildRoom, ROOM } from './roomMap.js';
import { roomCanvas, tvScreenRect, laptopScreenRect, ROOM_COLORS } from '../../art/tiles/room.js';
import { Lighting } from '../../core/lighting.js';
import { drawNullScreen } from '../../art/null.js';
import { chocoFrame, ANIMS, FRAME_W, FRAME_H } from '../../art/choco.js';
import { drawText, measureText } from '../../art/font.js';
import { drawHintBubble } from '../../ui/hints.js';
import { Typewriter } from '../../systems/typewriter.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { ACCENTS, CHOCO } from '../../art/palettes.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_CUARTO } from '../../audio/songs/cuarto.js';
import { SONG_NULL } from '../../audio/songs/null.js';
import { DialogueScene } from '../../systems/dialogue.js';
import { fxRng } from '../../core/rng.js';
import { Ease } from '../../core/tween.js';

const TS = SCREEN.TILE;
const R = fxRng;
const SQUARE_COLORS = [ACCENTS.oscar, ACCENTS.stward, ACCENTS.hezron, ACCENTS.fabiola];

export class RoomScene extends PlatformLevel {
  constructor(game, { stats = null } = {}) {
    super(game, { levelId: 0, noDeath: true, hudMode: 'none' });
    if (stats) this.stats = stats;
    this.setMap(new Tilemap(buildRoom()));
    this.checkpoint = { x: ROOM.spawn.x * TS + 8, y: ROOM.floor * TS, id: -1 };
    this.placeChoco(this.checkpoint.x, this.checkpoint.y, { items: { staff: false, boots: false, laptop: false, shield: false, lasso: false }, maxHp: 1 });
    this.choco.facing = -1;
    this.lighting = new Lighting();
    this.tv = { mode: 'menu', t: 0, angry: false };
    this.tint = 0;
    this.tintTarget = 0;
    this.lampFlicker = false;
    this.lamp = 1;
    this.squares = [];
    this.beam = null;
    this.suck = null;
    this.crt = null;
    this.tvText = null;
    this.crickets = true;
    this.cricketIn = 1.5;
    this.hint = { t: 0, moved: 0, jumped: false, alpha: 0 };
    this.usedSomething = false;
    this.leaving = false;
    this.addRoomInteractables();
  }

  enter() {
    this.game.audio.playSong(SONG_CUARTO);
  }

  // Al perder el foco no se abre la pausa durante la cinemática
  canPause() {
    return super.canPause() && !this.leaving;
  }

  // En el prólogo todavía no hay mapa: la pausa ofrece salir al título
  get quitLabel() {
    return TEXTS.prologue.toTitle;
  }
  get quitAsk() {
    return TEXTS.prologue.toTitleAsk;
  }

  quitToMap() {
    this.game.flow.quitPrologue(this.game, { ...this.stats });
  }

  addRoomInteractables() {
    const say = (lines, after = null) => () => {
      this.usedSomething = true;
      this.freezeChoco();
      this.game.push(
        new DialogueScene(this.game, lines, () => {
          if (this.choco.state === 'frozen') this.choco.state = 'play';
          after?.();
        }),
      );
    };
    const floor = ROOM.floor * TS;
    this.addInteractable({ x: ROOM.guitar.x * TS + 8, y: floor, range: 10, hintH: 40, onUse: () => this.playGuitar() });
    this.addInteractable({ x: ROOM.photo.x * TS + 18, y: floor, range: 12, hintH: 96, onUse: say(DIALOGUES.roomPhoto) });
    this.addInteractable({ x: (ROOM.fridge.x + ROOM.fridge.w) * TS + 8, y: floor, range: 12, hintH: 40, onUse: say(DIALOGUES.roomFridge) });
    this.addInteractable({ x: (ROOM.desk.x + 1) * TS + 12, y: ROOM.desk.top * TS, range: 18, hintH: 30, onUse: say(DIALOGUES.roomLaptop) });
    this.addInteractable({ x: (ROOM.shelf.x + 1) * TS, y: floor, range: 12, hintH: 88, onUse: say(DIALOGUES.roomShelf) });
    this.addInteractable({ x: (ROOM.tv.x + 1) * TS + 8, y: ROOM.cabinet.top * TS, range: 24, hintH: 46, onUse: () => this.startBrokenBar() });
  }

  playGuitar() {
    this.usedSomething = true;
    playSfx(this.game.audio, 'strum');
    this.choco.setSquash({ X: 1.1, Y: 0.92 });
    this.particles.burst(ROOM.guitar.x * TS + 10, ROOM.floor * TS - 16, 6, { angle: -Math.PI / 2, spread: 1.2, speedMin: 10, speedMax: 30, colors: ['#FFE2A8', '#F2B25C'], lifeMin: 0.4, lifeMax: 0.8 });
    this.freezeChoco();
    this.game.push(new DialogueScene(this.game, DIALOGUES.roomGuitar, () => this.choco.state === 'frozen' && (this.choco.state = 'play')));
  }

  // ---------- Cinemática "La barra rota" ----------
  startBrokenBar() {
    const s = this;
    const g = this.game;
    const c = this.choco;
    const tv = tvScreenRect();
    const tvCenter = { x: tv.x + tv.w / 2, y: tv.y + tv.h / 2 };
    this.leaving = true;
    this.timerRunning = false;
    const standX = ROOM.cabinet.x * TS + 8;
    this.playCutscene(
      function* (cs) {
        // Choco se acomoda al lado de la tele (para que se vea la pantalla)
        const a = c.autoplay();
        a.dir = Math.sign(standX - c.footX);
        yield cs.until(() => (a.dir > 0 ? c.footX >= standX : c.footX <= standX) || a.dir === 0);
        a.dir = 0;
        c.body.vx = 0;
        c.state = 'frozen';
        c.facing = 1;
        yield 0.2;
        yield cs.say(DIALOGUES.roomTv);
        // 1. El televisor parpadea, estática, el cuarto se tiñe de magenta
        s.crickets = false;
        s.tv.mode = 'flicker';
        playSfx(g.audio, 'tvOn');
        g.audio.stopMusic(1.2);
        yield 0.9;
        s.tv.mode = 'static';
        yield 0.9;
        s.lampFlicker = true;
        s.tintTarget = 0.3;
        s.tv.mode = 'null';
        s.tv.t = 0;
        playSfx(g.audio, 'nullAppear');
        g.effects.glitch(0.3, 0.8);
        c.faceOverride = 'normal';
        yield 0.7;
        // 2. Texto de N.U.L.L. letra por letra, con sonido de tecla
        s.tvText = new TvText(DIALOGUES.nullIntro.map((l) => l.text));
        yield cs.until(() => s.tvText.done);
        s.tvText = null;
        // 3. Sacudida creciente, aberración cromática y rayo de píxeles
        s.tv.angry = true;
        g.audio.playSong(SONG_NULL);
        s.tintTarget = 0.55;
        c.faceOverride = 'panic';
        for (let i = 0; i < 8; i++) {
          g.effects.shake(0.08 + i * 0.05);
          g.effects.glitch(0.2, 0.4 + i * 0.1);
          if (i % 2 === 0) playSfx(g.audio, 'glitch');
          yield 0.14;
        }
        s.beam = { t: 0, from: tvCenter };
        playSfx(g.audio, 'beam');
        c.forceAnim = 'hurt';
        g.effects.shake(0.5);
        yield 0.7;
        // 4. Los 4 cuadritos se desprenden en cámara lenta y entran al televisor
        g.effects.flash('#FFFFFF', 4);
        g.effects.hitstop(8);
        playSfx(g.audio, 'detach');
        s.detachSquares(tvCenter);
        yield cs.until(() => s.squares.every((q) => q.done));
        s.beam = null;
        // 5. Choco queda como núcleo, mira a la cámara con pánico y es succionado
        c.forceAnim = 'idle';
        c.faceOverride = 'panic';
        c.facing = -c.facing;
        playSfx(g.audio, 'gulp');
        yield 1.1;
        s.suck = { t: 0, x: c.footX, y: c.footY, to: tvCenter, facing: c.facing };
        s.hideChoco = true;
        playSfx(g.audio, 'suck');
        yield PROLOGUE.SUCK_TIME + 0.2;
        // Corte a negro con el sonido de la consola apagándose
        s.crt = { t: 0 };
        g.audio.stopMusic(0.15);
        playSfx(g.audio, 'crtOff');
        yield PROLOGUE.CRT_OFF_TIME + 0.4;
      },
      {
        onSkip: () => {
          s.crt = { t: PROLOGUE.CRT_OFF_TIME };
          s.hideChoco = true;
        },
        onEnd: () => this.goToLoading(),
      },
    );
  }

  goToLoading() {
    this.game.flow.toLoadingScreen(this.game, { ...this.stats });
  }

  detachSquares(tvCenter) {
    const c = this.choco;
    const offs = [
      [-4, -14],
      [4, -14],
      [-4, -6],
      [4, -6],
    ];
    this.squares = SQUARE_COLORS.map((color, i) => {
      const x = c.footX + offs[i][0];
      const y = c.footY + offs[i][1];
      const out = { x: x + (offs[i][0] < 0 ? -1 : 1) * R.range(30, 56), y: y - R.range(44, 70) };
      return { x, y, p0: { x, y }, p1: out, p2: { x: tvCenter.x + (i - 1.5) * 3, y: tvCenter.y }, color, t: -i * PROLOGUE.SQUARE_STAGGER, done: false, spin: 0 };
    });
  }

  // ---------- Actualización ----------
  levelUpdate(dt) {
    const g = this.game;
    this.tv.t += dt;
    this.tint += (this.tintTarget - this.tint) * Math.min(1, dt * 2);
    this.lamp = this.lampFlicker ? (R.chance(0.15) ? 0.2 : Math.max(0.35, this.lamp - dt * 0.4)) : 1;

    // Grillos a lo lejos
    if (this.crickets) {
      this.cricketIn -= dt;
      if (this.cricketIn <= 0) {
        this.cricketIn = R.range(0.6, 2.4);
        playSfx(g.audio, 'cricket');
      }
    }
    // Estática del televisor
    if (this.tv.mode === 'static' && R.chance(0.25)) playSfx(g.audio, 'staticBurst');

    if (this.tvText) this.tvText.update(dt, g);

    // Cuadritos en cámara lenta (curva de Bézier hacia la tele, con estela de su color)
    for (const q of this.squares) {
      if (q.done) continue;
      q.t += dt / PROLOGUE.SQUARE_FLIGHT;
      if (q.t < 0) continue;
      const k = Ease.inOutCubic(Math.min(1, q.t));
      const a = 1 - k;
      q.x = a * a * q.p0.x + 2 * a * k * q.p1.x + k * k * q.p2.x;
      q.y = a * a * q.p0.y + 2 * a * k * q.p1.y + k * k * q.p2.y;
      q.spin += dt * 6;
      this.particles.spawn({ x: q.x + R.range(-2, 2), y: q.y + R.range(-2, 2), vx: R.range(-6, 6), vy: R.range(-6, 6), life: 0.5, color: q.color, size: 2, endSize: 1 });
      if (q.t >= 1) {
        q.done = true;
        playSfx(g.audio, 'squareIn');
        this.particles.burst(q.x, q.y, 10, { speedMin: 20, speedMax: 60, colors: [q.color, '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.4 });
        g.effects.shake(0.15);
      }
    }
    if (this.beam) this.beam.t += dt;
    if (this.suck) {
      this.suck.t += dt;
      if (R.chance(0.8)) {
        const s = this.suck;
        const k = Math.min(1, s.t / PROLOGUE.SUCK_TIME);
        this.particles.spawn({ x: s.x + (s.to.x - s.x) * k + R.range(-8, 8), y: s.y - 10 + (s.to.y - s.y + 10) * k + R.range(-8, 8), life: 0.3, colors: [CHOCO.w, CHOCO.b], attract: { x: s.to.x, y: s.to.y, strength: 600 } });
      }
    }
    if (this.crt) this.crt.t += dt;
    this.updateHint(dt);
  }

  // Globo de controles: aparece una vez junto a Choco y se desvanece al usarlos
  updateHint(dt) {
    const h = this.hint;
    const c = this.choco;
    h.t += dt;
    if (c.state === 'play') {
      h.moved += Math.abs(c.body.vx) * dt;
      if (!c.body.onGround && c.body.vy < 0) h.jumped = true;
    }
    const want = h.t > 0.8 && !(h.moved > 48 && h.jumped) && h.t < 20 && !this.cutscene && this.game.top === this;
    h.alpha = want ? Math.min(1, h.alpha + dt * 3) : Math.max(0, h.alpha - dt * 2);
  }

  updateCamera(dt) {
    // Cámara del cuarto: leve paneo (sigue con más suavidad)
    const c = this.choco;
    const target = this.suck ? this.suck.to.x : c.footX;
    this.camera.follow({ cx: target, cy: ROOM.floor * TS, facing: 0, onGround: true, vy: 0 }, dt * 0.6);
  }

  // ---------- Dibujo ----------
  drawBackground(ctx, cx, cy) {
    ctx.fillStyle = '#05040A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.drawImage(roomCanvas(), -cx, -cy);
    this.drawStars(ctx, cx, cy);
    this.drawTvScreen(ctx, cx, cy);
    this.drawLaptopScreen(ctx, cx, cy);
  }

  drawStars(ctx, cx, cy) {
    const w = ROOM.window;
    for (let i = 0; i < 9; i++) {
      const sx = w.x * TS + 4 + ((i * 37) % (w.w * TS - 8));
      const sy = w.y * TS + 4 + ((i * 23) % 28);
      const on = Math.sin(this.t * (1 + (i % 3)) + i * 2) > -0.3;
      ctx.fillStyle = on ? '#F4F1EA' : '#5A6A9A';
      ctx.fillRect(sx - cx, sy - cy, 1, 1);
    }
  }

  drawTvScreen(ctx, cx, cy) {
    const r = tvScreenRect();
    const x = r.x - cx;
    const y = r.y - cy;
    const tv = this.tv;
    if (tv.mode === 'menu') {
      // Menú del juego que Choco iba a jugar: cielo, suelo, un bloque Y y "▶"
      ctx.fillStyle = '#3C6EF0';
      ctx.fillRect(x, y, r.w, r.h);
      ctx.fillStyle = '#4CBB4C';
      ctx.fillRect(x, y + r.h - 5, r.w, 5);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x + 6, y + 6, 6, 6);
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(x + 8, y + 7, 2, 4);
      if (Math.floor(this.t * 2) % 2) drawText(ctx, '▶', x + r.w - 9, y + 8, { color: '#FFFFFF', shadow: false });
    } else if (tv.mode === 'flicker') {
      const on = R.chance(0.5);
      ctx.fillStyle = on ? '#E8F0FF' : '#101018';
      ctx.fillRect(x, y, r.w, r.h);
    } else if (tv.mode === 'static') {
      drawNullScreen(ctx, x, y, r.w, r.h, { t: this.t, open: 0, static: 1, glitch: 0.8 });
    } else if (tv.mode === 'null') {
      const open = Math.min(1, this.tv.t * 1.5);
      drawNullScreen(ctx, x, y, r.w, r.h, { t: this.t, open, angry: tv.angry, static: 0.3, glitch: tv.angry ? 1 : 0.4, look: Math.sin(this.t * 1.3) * 0.6 });
    }
  }

  drawLaptopScreen(ctx, cx, cy) {
    const r = laptopScreenRect();
    const x = r.x - cx;
    const y = r.y - cy;
    ctx.fillStyle = '#6FE08A';
    ctx.fillRect(x + 2, y + 3, 9, 1);
    ctx.fillRect(x + 2, y + 6, 6, 1);
    ctx.fillRect(x + 2, y + 9, 11, 1);
    if (Math.floor(this.t * 2) % 2) ctx.fillRect(x + 14, y + 9, 2, 1);
    // ✔ pequeño
    ctx.fillRect(x + 13, y + 4, 1, 1);
    ctx.fillRect(x + 14, y + 5, 1, 1);
    ctx.fillRect(x + 15, y + 4, 1, 1);
    ctx.fillRect(x + 16, y + 3, 1, 1);
  }

  drawBeam(ctx, cx, cy) {
    // Rayo de píxeles de la tele a Choco
    if (this.beam) {
      const b = this.beam;
      const c = this.choco;
      const tx = c.footX - cx;
      const ty = c.footY - 12 - cy;
      const fx = b.from.x - cx;
      const fy = b.from.y - cy;
      const n = 40;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        const wob = Math.sin(this.t * 40 + i) * (2 + 2 * Math.sin(b.t * 10));
        const x = Math.round(fx + (tx - fx) * k);
        const y = Math.round(fy + (ty - fy) * k + wob);
        ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FF2E88' : '#43D9FF';
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  }

  drawFlying(ctx, cx, cy) {
    // Cuadritos volando
    for (const q of this.squares) {
      if (q.done || q.t < 0) continue;
      const x = Math.round(q.x - cx);
      const y = Math.round(q.y - cy);
      const w = Math.max(1, Math.round(7 * Math.abs(Math.cos(q.spin))));
      ctx.fillStyle = q.color;
      ctx.fillRect(x - Math.ceil(w / 2) - 1, y - 4, w + 2, 9);
      ctx.fillStyle = CHOCO.b;
      ctx.fillRect(x - Math.ceil(w / 2), y - 3, w, 7);
      ctx.fillStyle = CHOCO.l;
      ctx.fillRect(x - Math.ceil(w / 2), y - 3, w, 1);
      if (w > 4) {
        ctx.fillStyle = CHOCO.e;
        ctx.fillRect(x - 2, y - 1, 1, 2);
        ctx.fillRect(x + 1, y - 1, 1, 2);
      }
    }
    // Choco succionado hacia la pantalla
    if (this.suck) {
      const s = this.suck;
      const k = Ease.inCubic(Math.min(1, s.t / PROLOGUE.SUCK_TIME));
      const spr = chocoFrame(ANIMS.fall.frames[0], 'panic', false);
      const sx = Math.max(0, 1 - k) * (1 - 0.4 * Math.sin(k * Math.PI));
      const sy = Math.max(0, 1 - k) * (1 + 0.8 * Math.sin(k * Math.PI));
      const w = Math.round(FRAME_W * sx);
      const h = Math.round(FRAME_H * sy);
      const x = s.x + (s.to.x - s.x) * k;
      const y = s.y - 12 + (s.to.y - s.y + 12) * k;
      if (w > 0 && h > 0) ctx.drawImage(spr.get(s.facing < 0), Math.round(x - cx - w / 2), Math.round(y - cy - h / 2), w, h);
    }
  }

  drawOverlay(ctx) {
    const cam = this.camera;
    const cx = cam.rx;
    const cy = cam.ry;
    const L = this.lighting;
    const floorY = ROOM.floor * TS;
    L.begin('#0A0614', 0.58);
    const lamp = this.lamp;
    L.light(ROOM.lamp.x * TS + 8 - cx, floorY - 56 - cy, 92 * lamp, { strength: lamp, tint: ROOM_COLORS.lamp, tintAlpha: 0.1 * lamp });
    L.light((ROOM.desk.x + ROOM.desk.w) * TS - 6 - cx, ROOM.desk.top * TS - 6 - cy, 36 * lamp, { strength: lamp, tint: ROOM_COLORS.lamp, tintAlpha: 0.08 * lamp });
    const tv = tvScreenRect();
    const tvOn = this.tv.mode !== 'flicker' || R.chance(0.5);
    const tvColor = this.tv.mode === 'null' || this.tv.mode === 'static' ? '#FF2E88' : ROOM_COLORS.tv;
    if (tvOn) L.light(tv.x + tv.w / 2 - cx, tv.y + tv.h / 2 - cy, this.tv.mode === 'null' ? 110 : 70, { tint: tvColor, tintAlpha: this.tv.mode === 'null' ? 0.16 : 0.1 });
    const w = ROOM.window;
    L.rect(w.x * TS - cx, w.y * TS - cy, w.w * TS, w.h * TS, 0.35);
    const lp = laptopScreenRect();
    L.light(lp.x + lp.w / 2 - cx, lp.y + lp.h / 2 - cy, 18, { tint: '#6FE08A', tintAlpha: 0.06 });
    // Luz tenue alrededor de Choco para que siempre se lea
    if (!this.hideChoco) L.light(this.choco.footX - cx, this.choco.footY - 12 - cy, 34, { strength: 0.75 });
    if (this.beam) L.light(this.choco.footX - cx, this.choco.footY - 12 - cy, 40, { tint: '#FF2E88', tintAlpha: 0.2 });
    L.draw(ctx);
    // El cuarto se tiñe de magenta
    if (this.tint > 0.01) {
      ctx.globalAlpha = this.tint * 0.45;
      ctx.fillStyle = '#FF2E88';
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.tint * 0.12;
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  drawUi(ctx) {
    const c = this.choco;
    // Encima del tinte magenta: que el rayo y los colores de los cuadritos se lean
    this.drawBeam(ctx, this.camera.rx, this.camera.ry);
    this.drawFlying(ctx, this.camera.rx, this.camera.ry);
    if (this.hint.alpha > 0) {
      const keys = `← → ${TEXTS.prologue.move} · ${this.game.input.keyName('jump')} ${TEXTS.prologue.jump}`;
      drawHintBubble(ctx, c.footX - this.camera.rx, c.footY - 26 - this.camera.ry, keys, this.hint.alpha);
    }
    if (this.tvText) this.tvText.draw(ctx);
    if (this.crt) this.drawCrtOff(ctx, this.crt.t);
  }

  // Apagado de televisor de tubo: la imagen se aplasta en una línea y luego en un punto
  drawCrtOff(ctx, t) {
    const T = PROLOGUE.CRT_OFF_TIME;
    const p = Math.min(1, t / T);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    const cx = SCREEN.W / 2;
    const cy = SCREEN.H / 2;
    if (p < 0.25) {
      const h = Math.max(1, Math.round(SCREEN.H * (1 - p / 0.25) * 0.5));
      ctx.fillStyle = '#E8F0FF';
      ctx.fillRect(0, cy - h / 2, SCREEN.W, h);
    } else if (p < 0.6) {
      const w = Math.max(2, Math.round(SCREEN.W * (1 - (p - 0.25) / 0.35)));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(cx - w / 2), cy, w, 1);
    } else if (p < 0.9) {
      ctx.globalAlpha = 1 - (p - 0.6) / 0.3;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      ctx.globalAlpha = 1;
    }
  }
}

// Texto de N.U.L.L. en la pantalla: verde, letra por letra, con una tecla por carácter.
class TvText {
  constructor(lines) {
    this.lines = lines;
    this.i = 0;
    this.tw = new Typewriter(lines[0], 'slow');
    this.hold = 0;
    this.done = false;
    this.t = 0;
  }

  update(dt, game) {
    this.t += dt;
    if (this.done) return;
    for (const ch of this.tw.update(dt)) if (ch !== ' ') playSfx(game.audio, 'key');
    const inp = game.input;
    if (!this.tw.done) {
      if (inp.pressed('confirm') && this.t > 0.2) this.tw.complete();
      return;
    }
    this.hold += dt;
    if (this.hold > PROLOGUE.TV_LINE_HOLD || inp.pressed('confirm')) {
      this.i++;
      this.hold = 0;
      if (this.i >= this.lines.length) this.done = true;
      else this.tw = new Typewriter(this.lines[this.i], 'slow');
    }
  }

  draw(ctx) {
    const w = 236;
    const h = 22 + this.lines.length * 12;
    const x = Math.round(SCREEN.W / 2 - w / 2);
    const y = SCREEN.H - h - 18;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#020604';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1E5A30';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    drawText(ctx, TEXTS.prologue.tvHeader, x + 6, y + 4, { color: '#2E8A4A', shadow: false });
    for (let i = 0; i <= Math.min(this.i, this.lines.length - 1); i++) {
      const shown = i < this.i ? Infinity : this.tw.shown;
      drawText(ctx, this.lines[i], x + 6, y + 16 + i * 12, { color: '#6FE08A', maxChars: shown, shadow: '#0A2A14' });
    }
    // Cursor parpadeante
    if (!this.done && Math.floor(this.t * 3) % 2 === 0) {
      ctx.fillStyle = '#6FE08A';
      const line = this.lines[Math.min(this.i, this.lines.length - 1)];
      const cxp = x + 7 + measureText([...line].slice(0, this.tw.shown).join(''));
      ctx.fillRect(cxp, y + 16 + this.i * 12, 4, 7);
    }
  }
}
