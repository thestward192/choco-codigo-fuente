// Batalla de rap contra MC Stack Overflow — docs/niveles/nivel_2_una.md
// Beat chiptune a 90 BPM. Stack rapea 2 líneas al ritmo (la palabra de cada tiempo se ilumina),
// aparecen 4 respuestas mezcladas y hay 6 compases para elegir. Confirmar en el beat (±0.12 s)
// cuenta doble y el público explota. Entre rondas, Stack se desborda: defensa con timing.
// El tiempo sale del reloj de audio (la canción), así la mecánica va pegada al beat real.
import { Scene } from '../core/game.js';
import { SCREEN, RAP, BATTLE } from '../config/balance.js';
import { createRap, judgeAnswer, beatInfo, beatLength, isOnBeat, shuffle, roundContent, ANSWER_KINDS } from '../systems/rap.js';
import { judgeDefense } from '../systems/battle.js';
import { createRng, fxRng } from '../core/rng.js';
import { Particles } from '../core/particles.js';
import { ANIMS, chocoFrame, FRAME_W, FRAME_H } from '../art/choco.js';
import { founderSprite, portrait } from '../art/portraits.js';
import { drawStackOverflow } from '../art/stack.js';
import { drawText, drawTextBox, measureText } from '../art/font.js';
import { UI, ACCENTS } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_RAP } from '../audio/songs/una.js';
import { Ease } from '../core/tween.js';

const T = TEXTS.rap;
const W = SCREEN.W;
const H = SCREEN.H;
const CHOCO_X = 64;
const CHOCO_Y = 128;
const STACK_X = 270;
const STACK_Y = 128;
const BEAT = beatLength(RAP.BPM);

export class RapBattleScene extends Scene {
  // opts: { energy, maxEnergy, onEnd({ result, score }) }
  constructor(game, { energy, maxEnergy, onEnd = null }) {
    super(game);
    this.rap = createRap();
    this.rng = createRng((Date.now() & 0xffff) + 31);
    this.energy = energy;
    this.maxEnergy = maxEnergy;
    this.onEnd = onEnd;
    this.t = 0;
    this.clock = 0; // reloj propio si no hay audio
    this.phase = 'intro';
    this.particles = new Particles(500);
    this.floats = [];
    this.verse = null; // { who, lines, start (s), words }
    this.options = null;
    this.sel = 0;
    this.chooseEnd = 0;
    this.reaction = null;
    this.crowdJump = 0;
    this.stackMood = 'normal';
    this.stackHurt = 0;
    this.flowShown = RAP.FLOW;
    this.hypeShown = RAP.HYPE;
    this.defense = null;
    this.leaving = false;
    this.result = null;
  }

  enter() {
    this.game.audio.playSong(SONG_RAP, { fade: 0.05 });
    this.run(this.main());
  }

  // Tiempo del beat: reloj de audio si existe; si no, el propio
  bt() {
    const s = this.game.audio.songTime();
    return s === null ? this.clock : s;
  }

  beatNow() {
    return beatInfo(Math.max(0, this.bt()));
  }

  // ---------- Secuenciador ----------
  run(it) {
    this.task = { it, until: null, wait: 0 };
    this.step();
  }
  step() {
    const r = this.task.it.next();
    if (r.done) {
      this.task = null;
      return;
    }
    const v = r.value;
    this.task.wait = typeof v === 'number' ? v : 0;
    this.task.until = v && v.until ? v.until : null;
  }
  updateTask(dt) {
    const tk = this.task;
    if (!tk) return;
    if (tk.wait > 0) {
      tk.wait -= dt;
      if (tk.wait > 0) return;
    }
    if (tk.until && !tk.until()) return;
    this.step();
  }

  // Espera hasta el tiempo (en beats) indicado
  untilBeat(b) {
    return { until: () => this.bt() >= b * BEAT - 0.01 };
  }
  nextBarBeat() {
    const b = Math.ceil(Math.max(0, this.bt()) / BEAT - 0.01);
    return Math.ceil(b / RAP.BEATS_PER_BAR) * RAP.BEATS_PER_BAR;
  }

  // ---------- Guion ----------
  *main() {
    const rap = this.rap;
    const a = this.game.audio;
    // Dos compases de beat para entrar
    this.banner = { text: T.title, t: 0 };
    yield this.untilBeat(4);
    this.banner = null;
    while (true) {
      const content = roundContent(T.rounds, T.extras, rap.round);
      this.roundLabel = { text: T.roundLabel(rap.round + 1), t: 0 };
      // Stack rapea: 2 líneas de 2 compases cada una
      let b0 = this.nextBarBeat();
      yield this.untilBeat(b0);
      playSfx(a, 'scratch');
      this.stackMood = 'normal';
      this.verse = this.makeVerse('stack', content.stack, b0);
      yield this.untilBeat(b0 + RAP.LINE_BARS * 2 * RAP.BEATS_PER_BAR);
      // Elegir respuesta: 6 compases
      const kinds = shuffle(ANSWER_KINDS, this.rng);
      this.options = kinds.map((k) => ({ kind: k, lines: content[k] }));
      this.sel = 0;
      this.answer = null;
      this.chooseStart = this.nextBarBeat() - RAP.BEATS_PER_BAR;
      this.chooseStart = Math.max(this.chooseStart, Math.floor(this.bt() / BEAT));
      this.chooseEnd = this.chooseStart + RAP.CHOOSE_BARS * RAP.BEATS_PER_BAR;
      this.phase = 'choose';
      yield { until: () => this.answer || this.bt() >= this.chooseEnd * BEAT };
      this.phase = 'perform';
      const ans = this.answer || { kind: 'none', onBeat: false };
      const chosen = this.options.find((o) => o.kind === ans.kind);
      this.options = null;
      // Choco contesta en el siguiente compás
      b0 = this.nextBarBeat();
      if (chosen) {
        yield this.untilBeat(b0);
        this.verse = this.makeVerse('choco', chosen.lines, b0);
        yield this.untilBeat(b0 + RAP.LINE_BARS * 2 * RAP.BEATS_PER_BAR - 2);
      } else yield 0.3;
      // Veredicto
      const res = judgeAnswer(rap, ans.kind, ans.onBeat);
      this.verse = null;
      this.reaction = { kind: ans.kind, t: 0, onBeat: ans.onBeat && res.points > 0 };
      if (res.flowLoss > 0) {
        this.stackHurt = 0.6;
        this.stackMood = 'hurt';
        playSfx(a, 'bossHurt');
        this.game.effects.shake(res.flowLoss >= 1 ? 0.4 : 0.2);
        this.crowdJump = res.onBeat ? 1.6 : 0.8;
        playSfx(a, 'crowd');
        if (res.onBeat) {
          this.confetti(60);
          this.game.effects.flash('#FFD23F', 2);
        }
        this.float(STACK_X, 40, `-${res.flowLoss} ${T.flow}`, UI.magenta, true);
        if (res.points) this.float(W / 2, 30, `+${res.points}`, UI.yellow);
      } else {
        playSfx(a, ans.kind === 'cringe' ? 'boo' : 'denied');
        this.stackMood = 'laugh';
        this.game.effects.shake(0.25);
        this.float(CHOCO_X, 60, `-1 ${T.hype}`, UI.red, true);
      }
      yield 1.8;
      this.reaction = null;
      if (res.won) {
        this.result = 'win';
        break;
      }
      if (res.lost) {
        this.result = 'lose';
        break;
      }
      // Stack se desborda entre rondas (modo batalla normal)
      yield* this.overflowAttack();
      if (this.energy <= 0) {
        this.result = 'lose';
        break;
      }
    }
    yield* this.outro();
  }

  makeVerse(who, lines, startBeat) {
    // Las palabras de cada línea se reparten en los primeros 6 tiempos de sus 8
    const words = [];
    lines.forEach((line, li) => {
      const ws = line.split(' ');
      ws.forEach((w, i) => {
        const beat = startBeat + li * RAP.LINE_BARS * RAP.BEATS_PER_BAR + (i / ws.length) * 6;
        words.push({ w, line: li, beat });
      });
    });
    return { who, lines, start: startBeat, words };
  }

  *overflowAttack() {
    const a = this.game.audio;
    this.stackMood = 'angry';
    this.msg = T.defend;
    playSfx(a, 'windup');
    const windup = fxRng.range(BATTLE.DEFENSE_WINDUP[0], BATTLE.DEFENSE_WINDUP[1]) + 0.3;
    this.defense = { t: 0, impact: windup, pressed: null, locked: false, judged: null };
    this.phase = 'defend';
    yield { until: () => this.defense.t >= this.defense.impact + BATTLE.DEFENSE_GOOD || (this.defense.pressed !== null && this.defense.t >= this.defense.impact) };
    const d = this.defense;
    const res = judgeDefense(d.locked || d.pressed === null ? null : d.pressed - d.impact);
    d.judged = res;
    let dmg = RAP.OVERFLOW_DAMAGE;
    if (res === 'perfect') dmg = 0;
    else if (res === 'good') dmg = Math.floor(dmg / 2);
    this.energy = Math.max(0, this.energy - dmg);
    if (res === 'perfect') {
      playSfx(a, 'parryPerfect');
      this.game.effects.hitstop(6);
      this.float(CHOCO_X, 70, TEXTS.battle.perfect, UI.cyan, true);
      this.crowdJump = 0.6;
    } else {
      playSfx(a, res === 'good' ? 'parryGood' : 'impact');
      playSfx(a, 'hurt');
      this.game.effects.shake(0.35);
      this.chocoHurt = 0.4;
      if (res === 'good') this.float(CHOCO_X, 70, TEXTS.battle.halved, UI.green);
    }
    this.float(CHOCO_X + 10, 84, String(dmg), dmg ? UI.red : UI.cyan);
    yield 0.8;
    this.defense = null;
    this.msg = null;
    this.phase = 'wait';
    this.stackMood = 'normal';
  }

  *outro() {
    const a = this.game.audio;
    this.phase = 'end';
    if (this.result === 'win') {
      a.stopMusic(0.4);
      this.stackMood = 'hurt';
      this.stackHurt = 1.5;
      playSfx(a, 'bossDie');
      this.crowdJump = 2.5;
      this.confetti(90);
      playSfx(a, 'crowd');
      this.endBanner = { text: T.win, color: UI.yellow, t: 0 };
    } else {
      a.stopMusic(0.6);
      playSfx(a, 'boo');
      this.endBanner = { text: T.lose, color: UI.red, t: 0 };
    }
    yield { until: () => this.endBanner.t > 2.2 || (this.endBanner.t > 0.8 && this.game.input.pressed('confirm')) };
    this.leave();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game;
    g.startTransition({
      type: 'fade',
      onMid: () => {
        if (g.top === this) g.pop();
        this.onEnd?.({ result: this.result, score: this.rap.score, energy: this.energy });
      },
    });
  }

  // ---------- Efectos ----------
  float(x, y, text, color, big = false) {
    this.floats.push({ x, y, text, color, big, t: 0 });
  }

  confetti(n) {
    const cols = ['#FF2E88', '#43D9FF', '#FFD23F', '#6FE08A', '#FFFFFF'];
    for (let i = 0; i < n; i++) {
      this.particles.spawn({ x: fxRng.range(0, W), y: H + 2, vx: fxRng.range(-30, 30), vy: -fxRng.range(80, 170), gravity: 120, drag: 0.6, life: fxRng.range(0.8, 1.6), color: fxRng.pick(cols), size: 2 });
    }
  }

  // ---------- Actualización ----------
  update(dt) {
    this.t += dt;
    this.clock += dt;
    const inp = this.game.input;
    if (this.banner) this.banner.t += dt;
    if (this.roundLabel) {
      this.roundLabel.t += dt;
      if (this.roundLabel.t > 2) this.roundLabel = null;
    }
    if (this.reaction) this.reaction.t += dt;
    if (this.endBanner) this.endBanner.t += dt;
    if (this.crowdJump > 0) this.crowdJump -= dt;
    if (this.stackHurt > 0) this.stackHurt -= dt;
    if (this.chocoHurt > 0) this.chocoHurt -= dt;
    // Golpe de beat (luces, público)
    const bi = this.beatNow();
    if (bi.beat !== this.lastBeat) {
      this.lastBeat = bi.beat;
      this.beatPulse = 1;
    }
    this.beatPulse = Math.max(0, (this.beatPulse || 0) - dt * 4);
    // Elegir respuesta
    if (this.phase === 'choose' && this.options && !this.answer) {
      const a = this.game.audio;
      if (inp.pressed('down')) {
        this.sel = (this.sel + 1) % this.options.length;
        playSfx(a, 'menuMove');
      } else if (inp.pressed('up')) {
        this.sel = (this.sel + this.options.length - 1) % this.options.length;
        playSfx(a, 'menuMove');
      }
      if (inp.pressed('confirm')) {
        const onBeat = isOnBeat(beatInfo(this.bt()).offset);
        this.answer = { kind: this.options[this.sel].kind, onBeat };
        playSfx(a, 'beatSelect');
        if (onBeat) {
          this.float(W / 2, 96, T.onBeat, UI.yellow, true);
          playSfx(a, 'scratch');
        }
      }
    }
    // Defensa
    if (this.defense) {
      const d = this.defense;
      d.t += dt;
      if (!d.judged && inp.pressed('confirm') && d.pressed === null && !d.locked) {
        if (d.t < d.impact - BATTLE.DEFENSE_GOOD) d.locked = true;
        else d.pressed = d.t;
      }
    }
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 1.1);
    this.flowShown += (this.rap.flow - this.flowShown) * Math.min(1, dt * 6);
    this.hypeShown += (this.rap.hype - this.hypeShown) * Math.min(1, dt * 6);
    this.particles.update(dt);
    this.updateTask(dt);
  }

  // ---------- Dibujo ----------
  draw(ctx) {
    ctx.save();
    ctx.translate(this.game.effects.shakeX, this.game.effects.shakeY);
    this.drawStage(ctx);
    this.drawCrowd(ctx);
    this.drawCage(ctx);
    // Stack
    drawStackOverflow(ctx, STACK_X, STACK_Y, this.bt(), { u: 2, mood: this.stackMood, flash: this.stackHurt > 1.2 || (this.stackHurt > 0 && Math.floor(this.t * 20) % 3 === 0), sway: this.stackHurt > 0 ? 3 : 1 });
    this.drawChoco(ctx);
    this.drawOverflow(ctx);
    this.particles.draw(ctx, 0, 0, false);
    this.particles.draw(ctx, 0, 0, true);
    ctx.restore();
    this.drawBars(ctx);
    this.drawVerse(ctx);
    this.drawOptions(ctx);
    this.drawReaction(ctx);
    this.drawFloats(ctx);
    if (this.msg) drawText(ctx, this.msg, W / 2, 100, { align: 'center', color: UI.yellow });
    if (this.banner) this.drawCenter(ctx, this.banner.text, UI.yellow, this.banner.t);
    if (this.roundLabel && !this.banner) this.drawCenter(ctx, this.roundLabel.text, UI.cyan, this.roundLabel.t, 42);
    if (this.endBanner) this.drawCenter(ctx, this.endBanner.text, this.endBanner.color, this.endBanner.t);
  }

  drawStage(ctx) {
    ctx.fillStyle = '#140A14';
    ctx.fillRect(-8, -8, W + 16, H + 16);
    // Luces que pulsan con el beat
    const cols = ['#FF2E88', '#43D9FF', '#FFD23F', '#6FE08A'];
    const p = this.beatPulse || 0;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.1 + p * 0.12;
      ctx.fillStyle = cols[(i + (this.lastBeat || 0)) % 4];
      const x = 40 + i * 80 + Math.sin(this.t * 0.7 + i) * 24;
      ctx.beginPath();
      ctx.moveTo(x - 6, 0);
      ctx.lineTo(x + 6, 0);
      ctx.lineTo(x + 46, 140);
      ctx.lineTo(x - 46, 140);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Tarima
    ctx.fillStyle = '#6B4E3D';
    ctx.fillRect(-8, 128, W + 16, 6);
    ctx.fillStyle = '#4A3428';
    ctx.fillRect(-8, 134, W + 16, 46);
    for (let x = 0; x < W; x += 24) {
      ctx.fillStyle = '#3A2820';
      ctx.fillRect(x, 134, 1, 46);
    }
    // Parlantes
    for (const x of [6, W - 30]) {
      ctx.fillStyle = '#101018';
      ctx.fillRect(x, 92, 24, 36);
      ctx.fillStyle = '#2A2A38';
      const pump = Math.round(p * 2);
      ctx.fillRect(x + 6 - pump, 98 - pump, 12 + pump * 2, 12 + pump * 2);
      ctx.fillRect(x + 8, 114, 8, 8);
    }
  }

  drawCrowd(ctx) {
    const p = this.beatPulse || 0;
    const cols = ['#2A1E2E', '#3A2A3E', '#241A28'];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 22; i++) {
        const x = i * 15 + (row ? 7 : 0) - 4;
        const jump = this.crowdJump > 0 ? Math.abs(Math.sin(this.t * 14 + i)) * 6 : p * ((i + row) % 2 ? 2 : 1);
        const y = 160 + row * 10 - Math.round(jump);
        ctx.fillStyle = cols[(i + row) % 3];
        ctx.fillRect(x, y, 12, 20);
        ctx.fillRect(x + 2, y - 6, 8, 7);
        if (this.crowdJump > 0.8 && (i + row) % 3 === 0) {
          ctx.fillRect(x - 2, y - 10, 2, 8);
          ctx.fillRect(x + 12, y - 10, 2, 8);
        }
      }
    }
  }

  drawCage(ctx) {
    const x = 26;
    const y = 36;
    const sway = Math.round(Math.sin(this.t * 1.4) * 2);
    ctx.fillStyle = '#8A8AA0';
    for (let k = 0; k < 6; k++) ctx.fillRect(x + Math.round((sway * k) / 6), y - 30 + k * 4, 1, 2);
    const hurt = this.reaction?.kind === 'cringe';
    const jump = this.reaction && (this.reaction.kind === 'correct') ? Math.round(Math.abs(Math.sin(this.reaction.t * 12)) * 3) : 0;
    ctx.drawImage(founderSprite('stward', Math.floor(this.bt() / BEAT) % 2).normal, x - 8 + sway, y - 4 - jump);
    if (hurt) {
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x + 6 + sway, y - 6, 2, 2);
    }
    const glyphs = ['|', '#', '[', ']'];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        drawText(ctx, glyphs[(i + j + Math.floor(this.t * 4)) % 4], x - 12 + i * 6 + sway, y - 6 + j * 9, { color: j % 2 ? '#FFD23F' : '#B8902A', shadow: '#2A1A0A' });
      }
    }
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(x - 14 + sway, y - 8, 30, 2);
    ctx.fillRect(x - 14 + sway, y + 20, 30, 2);
  }

  drawChoco(ctx) {
    let anim = ANIMS.idle;
    if (this.chocoHurt > 0) anim = ANIMS.hurt;
    else if (this.phase === 'perform' && this.verse?.who === 'choco') anim = ANIMS.shoot;
    else if (this.endBanner && this.result === 'win') anim = ANIMS.victory;
    const f = anim.frames[Math.floor(this.t * anim.fps) % anim.frames.length];
    const bob = (this.beatPulse || 0) > 0.7 ? 1 : 0;
    const face = this.chocoHurt > 0 ? 'hurt' : this.result === 'win' ? 'happy' : 'determined';
    ctx.drawImage(chocoFrame(f, face, true).normal, CHOCO_X - FRAME_W / 2, CHOCO_Y - FRAME_H + bob);
    // Energía de Choco (por el desbordamiento)
    const w = 30;
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(CHOCO_X - w / 2 - 1, CHOCO_Y + 4, w + 2, 4);
    ctx.fillStyle = this.energy <= this.maxEnergy * 0.3 ? UI.red : UI.green;
    ctx.fillRect(CHOCO_X - w / 2, CHOCO_Y + 5, Math.round(w * (this.energy / this.maxEnergy)), 2);
  }

  drawOverflow(ctx) {
    const d = this.defense;
    if (!d || d.judged) return;
    // Ventanas de error que vuelan hacia Choco y llegan justo en el impacto
    const travel = 0.5;
    const p = (d.t - (d.impact - travel)) / travel;
    if (p > 0) {
      for (let i = 0; i < 3; i++) {
        const q = Math.min(1, p + i * 0.05);
        const x = Math.round(STACK_X - 30 + (CHOCO_X + 6 - (STACK_X - 30)) * q);
        const y = Math.round(60 + i * 10 + (CHOCO_Y - 16 - 60 - i * 10) * q - Math.sin(q * Math.PI) * 20);
        ctx.fillStyle = '#140A16';
        ctx.fillRect(x - 7, y - 5, 14, 10);
        ctx.fillStyle = '#E8E8F0';
        ctx.fillRect(x - 6, y - 4, 12, 8);
        ctx.fillStyle = '#E0343F';
        ctx.fillRect(x - 6, y - 4, 12, 2);
      }
    }
    const r = Math.max(0, (d.impact - d.t) * 40);
    if (r < 40 && r > 0) {
      ctx.strokeStyle = r < 4 ? '#FFFFFF' : '#FFD23F';
      ctx.beginPath();
      ctx.arc(CHOCO_X + 2, CHOCO_Y - 12, 6 + r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawBars(ctx) {
    // Hype de Choco (izquierda), flow de Stack (derecha), puntos al centro
    const seg = (x, label, value, color, rightAlign) => {
      drawText(ctx, label, rightAlign ? x + 60 : x, 4, { align: rightAlign ? 'right' : 'left', color: UI.textDim });
      for (let i = 0; i < 3; i++) {
        const sx = x + i * 21;
        ctx.fillStyle = '#1E120C';
        ctx.fillRect(sx, 13, 19, 6);
        const fill = Math.max(0, Math.min(1, value - i));
        ctx.fillStyle = color;
        ctx.fillRect(sx + 1, 14, Math.round(17 * fill), 4);
      }
    };
    ctx.fillStyle = 'rgba(7,7,12,0.7)';
    ctx.fillRect(0, 0, W, 22);
    seg(6, T.hype, this.hypeShown, UI.yellow, false);
    seg(W - 68, T.flow, this.flowShown, UI.magenta, true);
    drawText(ctx, `${T.score} ${this.rap.score}`, W / 2, 8, { align: 'center', color: UI.text });
    // Indicador del beat
    const p = this.beatPulse || 0;
    const r = 3 + Math.round(p * 3);
    ctx.fillStyle = p > 0.6 ? '#FFFFFF' : UI.cyan;
    ctx.fillRect(W / 2 - r, 18 - Math.round(r / 2), r * 2, Math.max(1, r));
  }

  drawVerse(ctx) {
    const v = this.verse;
    if (!v) return;
    const isStack = v.who === 'stack';
    const x = 52;
    const y = 30;
    const w = 184;
    const nowBeat = this.bt() / BEAT;
    // Burbuja
    ctx.fillStyle = 'rgba(7,7,12,0.88)';
    const rows = v.lines.reduce((n, l) => n + wrapCount(l, w), 0);
    ctx.fillRect(x - 4, y - 4, w + 8, 14 + rows * 10);
    ctx.fillStyle = isStack ? UI.red : '#D9AE4B';
    ctx.fillRect(x - 4, y - 4, w + 8, 1);
    drawText(ctx, isStack ? TEXTS.characters.stack : TEXTS.characters.choco, x, y - 1, { color: isStack ? UI.red : '#D9AE4B' });
    // Palabras que aparecen al ritmo; la del tiempo actual se ilumina
    let ly = y + 9;
    v.lines.forEach((line, li) => {
      const words = v.words.filter((q) => q.line === li);
      let cx = x;
      let rowY = ly;
      for (const q of words) {
        if (nowBeat < q.beat) break;
        const wW = measureText(q.w + ' ');
        if (cx + wW > x + w) {
          cx = x;
          rowY += 10;
        }
        const hot = nowBeat - q.beat < 0.5;
        drawText(ctx, q.w, cx, rowY - (hot ? 1 : 0), { color: hot ? UI.yellow : UI.text });
        cx += wW;
      }
      ly = rowY + 11;
    });
  }

  drawOptions(ctx) {
    if (!this.options) return;
    const y0 = 100;
    ctx.fillStyle = 'rgba(14,14,24,0.95)';
    ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = UI.panelBorder;
    ctx.fillRect(0, y0, W, 1);
    // Compases restantes (6) con sus tiempos
    const now = this.bt() / BEAT;
    const left = Math.max(0, this.chooseEnd - now);
    drawText(ctx, T.choose, 8, y0 + 4, { color: UI.cyan });
    for (let i = 0; i < RAP.CHOOSE_BARS * RAP.BEATS_PER_BAR; i++) {
      const on = i < left;
      const bar = Math.floor(i / 4);
      ctx.fillStyle = on ? (left < 8 ? UI.red : i % 4 === 0 ? UI.yellow : '#8A8AA0') : '#2A2A38';
      ctx.fillRect(W - 8 - (RAP.CHOOSE_BARS * 4 - i) * 5 - bar * 3, y0 + 6, 4, 4);
    }
    this.options.forEach((o, i) => {
      const y = y0 + 16 + i * 11;
      const sel = i === this.sel;
      if (sel) drawText(ctx, '{', 6 - Math.round(Math.abs(Math.sin(this.t * 8)) * 2), y, { color: UI.yellow });
      let text = o.lines[0];
      const max = 296;
      while (measureText(text) > max && text.length > 4) text = text.slice(0, -2);
      if (text !== o.lines[0]) text += '…';
      drawText(ctx, text, 14, y, { color: sel ? UI.text : UI.textDim });
    });
    // Vista previa de la respuesta completa
    const o = this.options[this.sel];
    ctx.fillStyle = '#07070C';
    ctx.fillRect(4, y0 + 60, W - 8, 18);
    drawTextBox(ctx, o.lines.join(' / '), 8, y0 + 61, W - 16, { color: '#F6DE8A', lineHeight: 9 });
  }

  drawReaction(ctx) {
    const r = this.reaction;
    if (!r) return;
    const a = Math.min(1, r.t * 6, (1.8 - r.t) * 4);
    ctx.globalAlpha = Math.max(0, a);
    // Veredicto
    const good = r.kind === 'correct' || r.kind === 'weak';
    drawText(ctx, T.verdict[r.kind], W / 2, 52, { align: 'center', bold: true, scale: 2, color: r.kind === 'correct' ? UI.green : good ? UI.yellow : UI.red });
    // Stward reacciona desde su jaula
    const face = r.kind === 'correct' ? 'happy' : r.kind === 'weak' ? 'normal' : r.kind === 'cringe' ? 'worried' : 'surprised';
    const txt = T.stward[r.kind];
    const w = measureText(txt) + 44;
    const x = Math.round(Math.min(W - w - 4, 52));
    ctx.fillStyle = 'rgba(7,7,12,0.9)';
    ctx.fillRect(x, 74, w, 22);
    ctx.fillStyle = ACCENTS.stward;
    ctx.fillRect(x, 74, w, 1);
    ctx.drawImage(portrait('stward', face).normal, x + 2, 75, 20, 20);
    drawText(ctx, txt, x + 26, 81, { color: ACCENTS.stward });
    ctx.globalAlpha = 1;
  }

  drawFloats(ctx) {
    for (const f of this.floats) {
      const y = Math.round(f.y - Ease.outCubic(Math.min(1, f.t * 1.5)) * 14);
      ctx.globalAlpha = Math.min(1, (1.1 - f.t) * 3);
      drawText(ctx, f.text, Math.round(f.x), y, { align: 'center', color: f.color, bold: f.big });
      ctx.globalAlpha = 1;
    }
  }

  drawCenter(ctx, text, color, t, y = 70) {
    const a = Math.min(1, t * 5);
    const slide = Math.round((1 - a) * 30);
    ctx.globalAlpha = 0.7 * a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y - 6, W, 28);
    ctx.globalAlpha = a;
    drawText(ctx, text, W / 2 - slide, y, { align: 'center', bold: true, scale: 2, color });
    ctx.globalAlpha = 1;
  }
}

// Cuántas filas ocupa una línea partida por palabras en el ancho dado
function wrapCount(line, w) {
  let rows = 1;
  let cx = 0;
  for (const word of line.split(' ')) {
    const ww = measureText(word + ' ');
    if (cx + ww > w) {
      rows++;
      cx = 0;
    }
    cx += ww;
  }
  return rows;
}
