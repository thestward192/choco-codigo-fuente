// Cinemática final — docs/01_historia.md y docs/niveles/nivel_5_codigo_puro.md
//   1. N.U.L.L. se estabiliza: la aberración cromática se va y el magenta se vuelve blanco cálido.
//   2. Su forma se desarma en píxeles que caen como nieve; queda un cursor parpadeando.
//      "...ya no duele." / "Perdón por tardar tanto." / "¿puedo quedarme?..."
//   3. La Y dorada gigante baja flotando y los rótulos del juego se completan en un montaje.
//   4. Cada fundador celebra 2 s (Óscar llora abrazando la Y, Stward rapea, Hezron suelta una nube
//      en forma de corazón, Fabiola por fin come algo).
//   5. La barra de chocolate se reúne y aparece el Trofeo del Código Fuente; Choco lo levanta.
//      Destellos y fundido a blanco.
//   6. Epílogo en el cuarto: 12:00 a. m., el trofeo en el estante y en la tele un cursor escribe
//      "hola :)".
//   7. Estadísticas finales y créditos.
// Se puede saltar manteniendo ESC (va directo a las estadísticas).
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { Cutscene } from '../systems/cutscene.js';
import { drawCodeBg } from '../art/backgrounds/codigo.js';
import { drawNullBoss, drawNullCursor } from '../art/bosses/null.js';
import { trophySprite, drawGiantY } from '../art/codigo.js';
import { chocoFrame, ANIMS, FRAME_W, FRAME_H } from '../art/choco.js';
import { founderSprite } from '../art/portraits.js';
import { foodSprite } from '../art/santacruz.js';
import { roomCanvas, tvScreenRect } from '../art/tiles/room.js';
import { ROOM } from '../levels/level0_prologo/roomMap.js';
import { drawSquare } from '../ui/hud.js';
import { drawText, drawTextBox } from '../art/font.js';
import { disc } from '../core/lighting.js';
import { Particles } from '../core/particles.js';
import { TEXTS, DIALOGUES } from '../data/dialogues.js';
import { ACCENTS, UI } from '../art/palettes.js';
import { FOUNDERS } from '../data/levels.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_FINAL } from '../audio/songs/codigo.js';
import { Ease } from '../core/tween.js';
import { fxRng } from '../core/rng.js';
import { FinalStatsScene } from './FinalStatsScene.js';
import { brokenSigns, fixSign } from '../game/ending.js';

const T = TEXTS.ending;
const R = fxRng;
const FLOOR = 150;
const NULL_POS = { x: 206, y: 74 };
const CHOCO_X = 108;
const TS = 16;


export class EndingScene extends Scene {
  constructor(game, { stats = null, result = null } = {}) {
    super(game);
    this.stats = stats;
    this.result = result;
    this.t = 0;
    this.stage = 'null';
    this.stageT = 0;
    this.particles = new Particles(500);
    this.warm = 0;
    this.nullAlpha = 1;
    this.cursor = 0;
    this.y = null; // la Y gigante
    this.sign = -1;
    this.celebrate = -1;
    this.squares = null;
    this.trophy = 0;
    this.white = 0;
    this.tvText = 0;
    this.leaving = false;
    const s = this;
    this.cs = new Cutscene(this, function* (cs) {
      yield* s.script(cs);
    }, { skippable: true, onEnd: () => s.toStats() });
  }

  enter() {
    this.game.audio.playSong(SONG_FINAL, { fade: 1.2 });
  }

  setStage(name) {
    this.stage = name;
    this.stageT = 0;
  }

  *script(cs) {
    const g = this.game;
    const a = g.audio;
    // 1. Se estabiliza
    yield 0.8;
    playSfx(a, 'nullRecover');
    yield cs.until(() => this.warm >= 1);
    yield 0.5;
    // 2. Se desarma en nieve de píxeles; queda el cursor
    this.setStage('snow');
    playSfx(a, 'sparkle');
    yield cs.until(() => this.nullAlpha <= 0);
    yield 1.0;
    yield cs.say(DIALOGUES.nullStable);
    yield 0.6;
    // 3. La Y gigante y los rótulos completos
    this.setStage('y');
    this.y = { y: -40, k: 0 };
    playSfx(a, 'goldenY');
    yield cs.until(() => this.y.k >= 1);
    yield 0.6;
    this.setStage('signs');
    const signs = brokenSigns();
    for (let i = 0; i < signs.length; i++) {
      this.sign = i;
      this.signT = 0;
      yield 0.3;
      playSfx(a, i % 2 ? 'bit' : 'key');
      yield 0.5;
    }
    this.sign = -1;
    yield 0.4;
    // 4. Celebración de los fundadores
    this.setStage('party');
    for (let i = 0; i < FOUNDERS.length; i++) {
      this.celebrate = i;
      this.celebrateT = 0;
      const who = FOUNDERS[i];
      playSfx(a, who === 'oscar' ? 'cry' : who === 'stward' ? 'scratch' : who === 'hezron' ? 'vapor' : 'eat');
      yield 2.4;
    }
    this.celebrate = -1;
    // 5. La barra completa y el trofeo
    this.setStage('bar');
    this.squares = { k: 0 };
    playSfx(a, 'squareIn');
    yield cs.until(() => this.squares.k >= 1);
    playSfx(a, 'join');
    g.effects.flash('#FFD23F', 4);
    yield 0.6;
    this.setStage('trophy');
    playSfx(a, 'item');
    yield cs.until(() => this.trophy >= 1);
    yield 1.6;
    playSfx(a, 'victory');
    this.lift = true;
    yield 1.6;
    this.fading = true;
    yield cs.until(() => this.white >= 1);
    // 6. Epílogo: el cuarto, 12:00 a. m.
    this.setStage('room');
    this.fading = false;
    yield cs.until(() => this.white <= 0);
    yield 2.6;
    this.setStage('tv');
    playSfx(a, 'tvOn');
    yield 0.8;
    yield cs.until(() => this.tvText >= T.hello.length);
    yield 2.8;
  }

  toStats() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game;
    g.changeScene(() => new FinalStatsScene(g, { stats: this.stats, result: this.result }), { type: 'fade', duration: 0.6 });
  }

  update(dt) {
    this.t += dt;
    this.stageT += dt;
    this.cs.update(dt);
    this.particles.update(dt);
    if (this.stage === 'null') {
      if (this.t > 0.8) this.warm = Math.min(1, this.warm + dt * 0.35);
    }
    if (this.stage === 'snow') {
      this.nullAlpha = Math.max(0, this.nullAlpha - dt * 0.4);
      // Píxeles que caen como nieve
      for (let i = 0; i < 4; i++) {
        if (!R.chance(this.nullAlpha * 0.9 + 0.1)) continue;
        this.particles.spawn({
          x: NULL_POS.x + R.range(-32, 32),
          y: NULL_POS.y + R.range(-24, 22),
          vx: R.range(-8, 8),
          vy: R.range(4, 16),
          gravity: 6,
          life: R.range(1.5, 3),
          colors: ['#FFF4E0', '#FFE2A8', '#F4F1EA'],
          size: R.chance(0.3) ? 2 : 1,
        });
      }
      this.cursor = Math.min(1, this.cursor + dt * 0.5);
    }
    if (this.y) {
      this.y.k = Math.min(1, this.y.k + dt / 2.6);
      this.y.y = -40 + (54 + 40) * Ease.outCubic(this.y.k);
    }
    if (this.sign >= 0) this.signT += dt;
    if (this.celebrate >= 0) {
      this.celebrateT += dt;
      this.celebrateFx(dt);
    }
    if (this.squares) this.squares.k = Math.min(1, this.squares.k + dt / 1.4);
    if (this.stage === 'trophy') {
      this.trophy = Math.min(1, this.trophy + dt / 1.2);
      if (R.chance(0.5)) this.particles.spawn({ x: SCREEN.W / 2 + R.range(-30, 30), y: 70 + R.range(-30, 30), vy: -10, life: 0.6, colors: ['#FFFFFF', '#FFD23F'] });
    }
    if (this.fading) this.white = Math.min(1, this.white + dt * 0.8);
    else if (this.stage === 'room') this.white = Math.max(0, this.white - dt * 0.6);
    if (this.stage === 'tv' && this.stageT > 0.8) {
      const before = Math.floor(this.tvText);
      this.tvText = Math.min(T.hello.length, this.tvText + dt * 4);
      if (Math.floor(this.tvText) > before) playSfx(this.game.audio, 'key');
    }
  }

  celebrateFx() {
    const who = FOUNDERS[this.celebrate];
    const x = this.founderX(this.celebrate);
    if (who === 'oscar' && R.chance(0.35)) this.particles.spawn({ x: x + R.range(-3, 3), y: FLOOR - 18, vx: R.range(-20, 20), vy: R.range(-40, -10), gravity: 220, life: 0.6, colors: ['#8AE8FF', '#43D9FF'] });
    if (who === 'fabiola' && R.chance(0.25)) this.particles.spawn({ x: x + 6, y: FLOOR - 14, vx: R.range(-15, 15), vy: R.range(-20, 0), gravity: 200, life: 0.5, colors: ['#D9AE4B', '#B07A45'] });
    if (who === 'stward' && R.chance(0.2)) this.particles.spawn({ x: x + R.range(-10, 10), y: FLOOR - 30, vy: -20, life: 0.6, colors: [ACCENTS.stward, '#FFFFFF'] });
  }

  founderX(i) {
    return 112 + i * 32;
  }

  draw(ctx) {
    if (this.stage === 'room' || this.stage === 'tv') {
      this.drawEpilogue(ctx);
    } else {
      drawCodeBg(ctx, 0, 0, this.t, Math.max(0, 0.6 * (1 - this.warm)));
      // Suelo de la arena (ya calmo)
      ctx.fillStyle = '#1C0E32';
      ctx.fillRect(0, FLOOR, SCREEN.W, SCREEN.H - FLOOR);
      ctx.fillStyle = '#43D9FF';
      ctx.fillRect(0, FLOOR, SCREEN.W, 1);
      this.drawStage(ctx);
    }
    this.particles.draw(ctx, 0, 0, false);
    this.particles.draw(ctx, 0, 0, true);
    if (this.white > 0) {
      ctx.globalAlpha = this.white;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
    this.cs.draw(ctx);
  }

  drawChoco(ctx, x, anim = 'idle', face = 'happy', t = this.t) {
    const A = ANIMS[anim];
    const f = A.frames[A.loop ? Math.floor(t * A.fps) % A.frames.length : Math.min(A.frames.length - 1, Math.floor(t * A.fps))];
    ctx.drawImage(chocoFrame(f, face, true).normal, Math.round(x - FRAME_W / 2), FLOOR - FRAME_H);
  }

  drawStage(ctx) {
    const st = this.stage;
    // N.U.L.L. que se estabiliza y se desarma
    if (st === 'null' || st === 'snow') {
      if (this.nullAlpha > 0) {
        drawNullBoss(ctx, NULL_POS.x, NULL_POS.y + Math.sin(this.t * 2) * 2, { t: this.t, warm: this.warm, glitch: 0.8 * (1 - this.warm), crack: 0.8 * (1 - this.warm), alpha: this.nullAlpha, open: 0.8 + this.warm * 0.2 });
      }
    }
    if (this.cursor > 0 && st !== 'party' && st !== 'bar' && st !== 'trophy') {
      ctx.globalAlpha = this.cursor;
      drawNullCursor(ctx, NULL_POS.x - 2, NULL_POS.y + 14, this.t);
      ctx.globalAlpha = 1;
    }
    // La Y gigante (Óscar la abraza en su momento)
    if (this.y && st !== 'trophy') {
      const hug = st === 'party' && FOUNDERS[this.celebrate] === 'oscar';
      const yx = hug ? this.founderX(0) + 12 : SCREEN.W / 2;
      const yy = hug ? FLOOR - 18 : this.y.y;
      drawGiantY(ctx, yx, yy, st === 'party' ? 2 : 4, this.t);
    }
    if (st === 'signs' && this.sign >= 0) this.drawSign(ctx);
    if (st === 'party' || st === 'bar') this.drawFounders(ctx);
    if (st === 'bar') this.drawBar(ctx);
    if (st === 'trophy') this.drawTrophy(ctx);
    // Choco siempre presente
    if (st === 'trophy') this.drawChoco(ctx, SCREEN.W / 2, this.lift ? 'victory' : 'idle', 'happy', this.lift ? this.stageT - 2.8 : this.t);
    else if (st !== 'party' && st !== 'bar') this.drawChoco(ctx, CHOCO_X, 'idle', st === 'null' ? 'normal' : 'happy');
    else this.drawChoco(ctx, 80, 'idle', 'happy');
  }

  // Montaje: el rótulo roto y, enseguida, completo
  drawSign(ctx) {
    const s = brokenSigns()[this.sign];
    const fixed = this.signT > 0.3;
    const text = fixed ? fixSign(s) : s;
    const y = 104;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#0B0610';
    ctx.fillRect(10, y - 6, SCREEN.W - 20, 20);
    ctx.globalAlpha = 1;
    ctx.fillStyle = fixed ? UI.yellow : '#3A2A5A';
    ctx.fillRect(10, y - 6, SCREEN.W - 20, 1);
    drawText(ctx, text, SCREEN.W / 2, y, { align: 'center', color: fixed ? UI.text : UI.textDim });
    drawText(ctx, T.signsTitle, SCREEN.W / 2, 86, { align: 'center', color: UI.yellow });
  }

  drawFounders(ctx) {
    FOUNDERS.forEach((who, i) => {
      let x = this.founderX(i);
      if (this.squares) {
        // Se vuelven cuadritos y vuelan a la barra
        if (this.squares.k > 0.15) return;
      }
      const active = i === this.celebrate;
      const ct = active ? this.celebrateT : 0;
      let jump = 0;
      if (active && who === 'stward') jump = Math.round(Math.abs(Math.sin(ct * 7)) * 5);
      if (active && who === 'oscar') x -= 4;
      const frame = active && who === 'stward' ? 2 + (Math.floor(this.t * 10) % 4) : Math.floor(this.t * 3 + i) % 2;
      const spr = founderSprite(who, frame);
      ctx.drawImage(spr.normal, Math.round(x - 8), FLOOR - 24 - jump);
      if (!active) return;
      // Momentos de celebración
      if (who === 'hezron') this.drawHeartCloud(ctx, x, FLOOR - 40 - ct * 10, Math.min(1, ct * 1.5));
      if (who === 'fabiola' && ct < 2) {
        // Come algo (la rosquilla): cada mordida la achica
        const bites = Math.min(3, Math.floor(ct * 1.6));
        ctx.save();
        ctx.beginPath();
        ctx.rect(Math.round(x + 4), FLOOR - 18, 10 - bites * 3, 10);
        ctx.clip();
        ctx.drawImage(foodSprite('rosquilla').normal, Math.round(x + 4), FLOOR - 18);
        ctx.restore();
      }
      if (who === 'oscar') {
        for (let k = 0; k < 2; k++) {
          const hx = x + Math.sin(this.t * 3 + k * 3) * 10;
          const hy = FLOOR - 34 - ((ct * 18 + k * 12) % 26);
          ctx.fillStyle = ACCENTS.oscar;
          ctx.fillRect(Math.round(hx) - 2, Math.round(hy), 2, 2);
          ctx.fillRect(Math.round(hx) + 1, Math.round(hy), 2, 2);
          ctx.fillRect(Math.round(hx) - 1, Math.round(hy) + 2, 3, 1);
          ctx.fillRect(Math.round(hx), Math.round(hy) + 3, 1, 1);
        }
      }
      const w = 228;
      drawTextBox(ctx, T.celebrate[who], (SCREEN.W - w) / 2, 26, w, { align: 'left', color: ACCENTS[who], lineHeight: 10 });
    });
  }

  // Nube de vapor en forma de corazón
  drawHeartCloud(ctx, x, y, k) {
    const s = 6 * k;
    if (s < 1) return;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#E8E0F0';
    disc(ctx, Math.round(x - s), Math.round(y), Math.round(s * 1.1));
    disc(ctx, Math.round(x + s), Math.round(y), Math.round(s * 1.1));
    for (let i = 0; i < 6; i++) {
      const w = Math.round(s * 2.2 * (1 - i / 6));
      ctx.fillRect(Math.round(x - w), Math.round(y + i * s * 0.35), w * 2, Math.max(1, Math.round(s * 0.4)));
    }
    ctx.fillStyle = ACCENTS.hezron;
    disc(ctx, Math.round(x - s), Math.round(y - 1), Math.max(1, Math.round(s * 0.4)));
    ctx.globalAlpha = 1;
  }

  // La barra de chocolate se reúne: el núcleo y los 4 cuadritos
  drawBar(ctx) {
    const k = this.squares ? Ease.inOutCubic(this.squares.k) : 1;
    const size = 14;
    const bx = SCREEN.W / 2 - (5 * (size + 1)) / 2;
    const by = 60;
    for (let i = 0; i < 5; i++) {
      const from = i === 0 ? { x: 80, y: FLOOR - 20 } : { x: this.founderX(i - 1), y: FLOOR - 16 };
      const tx = bx + i * (size + 1);
      const x = from.x + (tx - from.x) * k;
      const y = from.y + (by - from.y) * k - Math.sin(k * Math.PI) * 30;
      drawSquare(ctx, Math.round(x), Math.round(y), i, size);
    }
  }

  drawTrophy(ctx) {
    const k = Ease.outBack(Math.min(1, this.trophy));
    const spr = trophySprite();
    const scale = 3;
    const w = spr.w * scale;
    const h = spr.h * scale;
    // Choco la levanta: baja hasta sus manos y queda en alto
    const lift = this.lift ? Ease.inOutCubic(Math.min(1, (this.stageT - 2.8) * 1.5)) : 0;
    const cx = SCREEN.W / 2;
    const cy = 74 + lift * (FLOOR - 50 - 74);
    // Rayos de luz
    ctx.globalAlpha = 0.25 * k;
    ctx.fillStyle = '#FFD23F';
    for (let i = 0; i < 10; i++) {
      const a = this.t * 0.6 + (i * Math.PI) / 5;
      for (let r = 20; r < 80; r += 2) ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2);
    }
    ctx.globalAlpha = 1;
    const sc = lift > 0.5 ? 2 : 3;
    const dw = lift > 0 ? spr.w * sc : Math.round(w * k);
    const dh = lift > 0 ? spr.h * sc : Math.round(h * k);
    ctx.drawImage(spr.normal, Math.round(cx - dw / 2), Math.round(cy - dh / 2), dw, dh);
    if (this.trophy >= 1) {
      drawText(ctx, T.trophy, cx, 18, { align: 'center', bold: true, color: UI.yellow });
      drawText(ctx, T.trophySub, cx, 30, { align: 'center', color: UI.text });
    }
  }

  // Epílogo en el cuarto y el cursor en la tele
  drawEpilogue(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    if (this.stage === 'tv') {
      this.drawTvClose(ctx);
      return;
    }
    const camX = 128;
    ctx.drawImage(roomCanvas(), -camX, 0);
    // Noche: penumbra con la luz de la tele
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#05030A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    const tv = tvScreenRect();
    ctx.fillStyle = '#0B0610';
    ctx.fillRect(tv.x - camX, tv.y, tv.w, tv.h);
    if (Math.floor(this.t * 2) % 2) {
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(tv.x - camX + 3, tv.y + 4, 2, 5);
    }
    // El trofeo en el estante, brillando
    const spr = trophySprite();
    const sx = ROOM.shelf.x * TS + ROOM.shelf.w * 8 - camX;
    const sy = ROOM.shelf.y * TS + 10;
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 3);
    ctx.fillStyle = '#FFD23F';
    disc(ctx, Math.round(sx), Math.round(sy - 10), 14);
    ctx.globalAlpha = 1;
    ctx.drawImage(spr.normal, Math.round(sx - spr.w / 2), Math.round(sy - spr.h));
    // Choco frente a la tele
    const A = ANIMS.idle;
    const f = A.frames[Math.floor(this.t * A.fps) % A.frames.length];
    ctx.drawImage(chocoFrame(f, this.stageT > 1.4 ? 'happy' : 'normal', true).normal, Math.round(306 - camX - FRAME_W / 2), ROOM.floor * TS - FRAME_H);
    drawText(ctx, T.clock, SCREEN.W - 8, 8, { align: 'right', bold: true, color: '#6FE08A' });
    if (this.stageT > 1.2) drawText(ctx, T.dream, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
  }

  drawTvClose(ctx) {
    // Marco de la tele de cerca
    ctx.fillStyle = '#1A1426';
    ctx.fillRect(30, 20, SCREEN.W - 60, SCREEN.H - 40);
    ctx.fillStyle = '#3C3A50';
    ctx.fillRect(34, 24, SCREEN.W - 68, SCREEN.H - 48);
    ctx.fillStyle = '#0B0610';
    ctx.fillRect(40, 30, SCREEN.W - 80, SCREEN.H - 60);
    ctx.fillStyle = '#120A1E';
    for (let y = 30; y < SCREEN.H - 30; y += 2) ctx.fillRect(40, y, SCREEN.W - 80, 1);
    const n = Math.floor(this.tvText);
    const text = T.hello.slice(0, n);
    const x = 70;
    const y = 76;
    const w = drawText(ctx, text, x, y, { scale: 3, color: '#F4F1EA', shadow: false });
    if (Math.floor(this.t * 2) % 2 === 0) drawNullCursor(ctx, x + w + 3, y, this.t, 3);
  }
}
