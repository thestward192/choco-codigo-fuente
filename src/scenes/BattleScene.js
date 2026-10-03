// Batalla por turnos del nivel 2 — docs/niveles/nivel_2_una.md
// Espiral de glitch al empezar, fondo según la zona, Choco a la izquierda y el bug a la derecha.
// Comandos (Compilar con golpe con timing, Debug, Refactor, Commit --force, Objeto, Huir),
// defensa con timing al destello, números de daño flotantes, "¡PERFECTO!" / "BIEN" y sacudida
// en los críticos. La lógica (daño, RAM, gimmicks) vive en systems/battle.js.
import { Scene } from '../core/game.js';
import { SCREEN, BATTLE } from '../config/balance.js';
import {
  createBattle,
  startRound,
  chocoAct,
  enemyAttack,
  applyEnemyHit,
  endRound,
  resolveTangle,
  canUse,
  battleOutcome,
  intentVisible,
  timingPos,
  judgeTiming,
  judgeDefense,
  COMMANDS,
  COMMAND_COST,
  ITEM_IDS,
} from '../systems/battle.js';
import { createRng, fxRng } from '../core/rng.js';
import { Particles } from '../core/particles.js';
import { ANIMS, chocoFrame, FRAME_W, FRAME_H } from '../art/choco.js';
import { battleBug } from '../art/bugs.js';
import { smallItem } from '../art/topdown.js';
import { drawText, drawTextBox } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_BATTLE } from '../audio/songs/una.js';
import { createCanvas } from '../core/renderer.js';
import { Ease } from '../core/tween.js';

const TB = TEXTS.battle;
const W = SCREEN.W;
const H = SCREEN.H;
const CHOCO_X = 78;
const CHOCO_Y = 106; // pies
const BUG_X = 236;
const BUG_Y = 92;

// Fondos por zona: color de pared, piso y un detalle
const BGS = {
  hall: { wall: '#E9DCC3', stripe: '#8C2F39', floor: '#C4B698', floor2: '#D8CBB0', deco: 'lockers' },
  soda: { wall: '#F0E2C8', stripe: '#B83A3A', floor: '#B83A3A', floor2: '#E8E0D0', deco: 'counter' },
  old: { wall: '#CDBE9F', stripe: '#5E1E26', floor: '#B8A888', floor2: '#C4B698', deco: 'board' },
  class: { wall: '#E9DCC3', stripe: '#8C2F39', floor: '#C4B698', floor2: '#D8CBB0', deco: 'board' },
  lab: { wall: '#D0D8E0', stripe: '#3A4A63', floor: '#8E969E', floor2: '#A8B0B8', deco: 'screens' },
  library: { wall: '#6B4E3D', stripe: '#4A3428', floor: '#9A6E44', floor2: '#B8885A', deco: 'books' },
  stage: { wall: '#2A1420', stripe: '#8C2F39', floor: '#5A1E26', floor2: '#7A2A34', deco: 'lights' },
};

export class BattleScene extends Scene {
  // opts: { kind, bg, energy, maxEnergy, items, boss, onEnd(outcome) }
  constructor(game, { kind, bg = 'hall', energy, maxEnergy, items = {}, boss = false, onEnd = null }) {
    super(game);
    this.kind = kind;
    this.bg = BGS[bg] || BGS.hall;
    this.onEnd = onEnd;
    this.b = createBattle({ bug: kind, energy, maxEnergy, items, rng: createRng((Date.now() & 0xffff) + 7), boss });
    this.name = TB.bugs[kind];
    this.t = 0;
    this.phase = 'intro';
    this.msg = null;
    this.floats = [];
    this.particles = new Particles(400);
    this.sel = 0;
    this.itemSel = 0;
    this.choice = null;
    this.timing = null;
    this.defense = null;
    this.proj = null;
    this.chocoAnim = { name: 'idle', t: 0 };
    this.chocoOff = { x: -80, y: 0 };
    this.bugOff = { x: 90, y: 0 };
    this.bugFlash = 0;
    this.bugSquash = 1;
    this.bugWindup = 0;
    this.bugAlpha = 1;
    this.scan = 0;
    this.leaving = false;
    this.hintsShown = { timing: 0, defend: 0 };
    this.task = null;
  }

  enter() {
    // Captura del nivel para la espiral de entrada
    const snap = this.game.renderer.snapshot();
    this.snapshot = createCanvas(W, H);
    this.snapshot.getContext('2d').drawImage(snap, 0, 0);
    this.game.audio.playSong(SONG_BATTLE, { fade: 0.2 });
    this.run(this.main());
  }

  // ---------- Secuenciador ----------
  run(it) {
    this.task = { it, wait: 0, until: null };
    this.step();
  }

  step(value) {
    const r = this.task.it.next(value);
    if (r.done) {
      this.task = null;
      return;
    }
    const v = r.value;
    this.task.wait = typeof v === 'number' ? v : 0;
    this.task.until = v && typeof v === 'object' && v.until ? v.until : null;
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

  // Muestra un mensaje; se pasa con confirmar o al terminar el tiempo
  *say(text, time = 1.1) {
    this.msg = { text, t: 0 };
    const t0 = this.t;
    yield { until: () => this.t - t0 >= time || (this.t - t0 > 0.25 && this.game.input.pressed('confirm')) };
  }

  // ---------- Guion de la batalla ----------
  *main() {
    const b = this.b;
    // Espiral de glitch y entrada de los dos
    yield BATTLE.INTRO_TIME;
    this.phase = 'show';
    yield { until: () => Math.abs(this.chocoOff.x) < 0.5 && Math.abs(this.bugOff.x) < 0.5 };
    yield* this.say(TB.appear(this.name), 1.2);
    while (!b.result) {
      const ev = startRound(b);
      for (const e of ev) if (e.type === 'ram' && b.round > 1) this.float(CHOCO_X, CHOCO_Y - 34, `+${e.amount} RAM`, UI.cyan);
      if (b.intent.first) {
        yield* this.enemyTurn();
        if (b.result) break;
      }
      // Elegir comando
      this.msg = null;
      this.phase = 'menu';
      this.choice = null;
      yield { until: () => this.choice };
      const choice = this.choice;
      this.choice = null;
      this.phase = 'anim';
      yield* this.chocoTurn(choice);
      if (b.result) break;
      if (!b.intent.first) yield* this.enemyTurn();
      if (b.result) break;
      const end = endRound(b);
      for (const e of end) {
        if (e.type === 'leak') {
          this.float(CHOCO_X, CHOCO_Y - 30, '-1 MAX', '#6FE08A');
          yield* this.say(TB.leak, 1);
        } else if (e.type === 'loopHeal') {
          playSfx(this.game.audio, 'heal');
          this.float(BUG_X, BUG_Y - 40, `+${e.amount}`, UI.green);
          this.burstBug(['#8AE8FF', '#FFFFFF'], 16);
          yield* this.say(TB.loopHeal, 1.2);
        }
      }
    }
    yield* this.outro();
  }

  *chocoTurn({ cmd, item }) {
    const b = this.b;
    const a = this.game.audio;
    const tg = resolveTangle(b, cmd);
    if (tg.swapped) {
      playSfx(a, 'glitch');
      this.game.effects.glitch(0.2, 0.5);
      yield* this.say(TB.swapped(TB.commands[tg.cmd]), 1.1);
      if (!canUse(b, tg.cmd)) tg.cmd = 'compile';
    }
    cmd = tg.cmd;
    if (cmd === 'compile') {
      // Golpe con timing: el marcador va y viene; ENTER en el centro = crítico
      this.timing = { t: 0, result: null, pos: 0 };
      this.hintsShown.timing++;
      this.phase = 'timing';
      yield { until: () => this.timing.result };
      const result = this.timing.result;
      yield 0.25;
      this.timing = null;
      this.phase = 'anim';
      yield* this.chocoAttack(false);
      const ev = chocoAct(b, 'compile', { timing: result });
      this.hitBug(ev, result === 'crit');
      yield 0.5;
      const dmg = ev.find((e) => e.type === 'damage');
      if (dmg?.weak) yield* this.say(TB.weak, 0.8);
    } else if (cmd === 'debug') {
      this.chocoAnim = { name: 'shoot', t: 0 };
      playSfx(a, 'debugScan');
      this.scan = 0.01;
      yield 0.9;
      this.scan = 0;
      const ev = chocoAct(b, 'debug');
      yield* this.say(TB.debugUsed, 0.9);
      yield* this.say(TB.weakness[this.kind], 1.8);
      if (ev.some((e) => e.type === 'loopBroken')) {
        this.burstBug(['#8AE8FF', '#FFFFFF', '#FF2E88'], 20);
        playSfx(a, 'blockBreak');
        this.game.effects.shake(0.3);
        yield* this.say(TB.loopBroken, 1.2);
      }
      this.chocoAnim = { name: 'idle', t: 0 };
    } else if (cmd === 'refactor') {
      this.chocoAnim = { name: 'victory', t: 0 };
      playSfx(a, 'heal');
      const ev = chocoAct(b, 'refactor');
      for (let i = 0; i < 18; i++) this.particles.spawn({ x: CHOCO_X + fxRng.range(-10, 10), y: CHOCO_Y - fxRng.range(0, 24), vy: -fxRng.range(20, 50), life: 0.7, colors: ['#6FE08A', '#FFFFFF'] });
      const heal = ev.find((e) => e.type === 'heal');
      this.float(CHOCO_X, CHOCO_Y - 34, `+${heal.amount}`, UI.green);
      yield 0.6;
      if (ev.some((e) => e.type === 'untangle')) yield* this.say(TB.untangled, 1);
      this.chocoAnim = { name: 'idle', t: 0 };
    } else if (cmd === 'force') {
      yield* this.chocoAttack(true);
      const ev = chocoAct(b, 'force');
      if (ev[0].type === 'fail') {
        this.proj = null;
        playSfx(a, 'forceFail');
        this.float(BUG_X - 30, BUG_Y - 30, 'CONFLICT', UI.red);
        for (let i = 0; i < 14; i++) this.particles.spawn({ x: BUG_X - 30, y: BUG_Y - 20, vx: fxRng.range(-60, 60), vy: fxRng.range(-60, 20), gravity: 200, life: 0.5, colors: ['#E0343F', '#8A8AA0'] });
        yield* this.say(TB.forceFail, 1.2);
      } else {
        this.hitBug(ev, true);
        yield 0.6;
      }
    } else if (cmd === 'item') {
      const ev = chocoAct(b, 'item', { item });
      playSfx(a, 'eat');
      playSfx(a, 'heal');
      this.itemPop = { id: item, t: 0 };
      const heal = ev.find((e) => e.type === 'heal');
      if (heal) this.float(CHOCO_X, CHOCO_Y - 34, `+${heal.amount}`, UI.green);
      const ram = ev.find((e) => e.type === 'ram');
      if (ram && ram.amount) this.float(CHOCO_X + 16, CHOCO_Y - 26, `+${ram.amount} RAM`, UI.cyan);
      yield* this.say(TB.used(TEXTS.items2[item].name), 1.1);
      this.itemPop = null;
    } else if (cmd === 'flee') {
      const ev = chocoAct(b, 'flee');
      if (ev.some((e) => e.type === 'fled')) {
        playSfx(a, 'flee');
        this.chocoAnim = { name: 'run', t: 0 };
        this.fleeing = true;
        yield* this.say(TB.fled, 1);
      } else {
        this.chocoAnim = { name: 'hurt', t: 0 };
        playSfx(a, 'thud');
        yield* this.say(TB.fleeFail, 1);
        this.chocoAnim = { name: 'idle', t: 0 };
      }
    }
  }

  // Anticipación, carrera corta y disparo { }
  *chocoAttack(charged) {
    const a = this.game.audio;
    this.chocoAnim = { name: 'shoot', t: 0 };
    // Anticipación: retrocede
    this.chocoOff.x = -6;
    if (charged) {
      playSfx(a, 'chargeReady');
      this.charging = 0.01;
      yield 0.6;
      this.charging = 0;
    } else yield 0.12;
    this.chocoOff.x = 10;
    playSfx(a, charged ? 'shootCharged' : 'shoot');
    this.proj = { x: CHOCO_X + 18, y: CHOCO_Y - 14, t: 0, charged, from: CHOCO_X + 18, to: BUG_X - 10 };
    yield { until: () => !this.proj || this.proj.t >= 1 };
    this.proj = null;
  }

  hitBug(ev, big) {
    const dmg = ev.find((e) => e.type === 'damage' && e.target === 'bug');
    if (!dmg) return;
    const a = this.game.audio;
    playSfx(a, big ? 'crit' : 'bugHit');
    this.game.effects.hitstop(big ? 6 : 3);
    this.game.effects.shake(big ? 0.5 : 0.2);
    if (dmg.crit) this.float(BUG_X, BUG_Y - 52, TB.crit, UI.yellow, true);
    this.float(BUG_X + fxRng.int(-6, 6), BUG_Y - 38, String(dmg.amount), big ? UI.yellow : UI.text, big);
    this.bugFlash = 0.12;
    this.bugSquash = 0.7;
    this.bugOff.x = 8;
    this.burstBug(['#FFFFFF', '#FF2E88', UI.yellow], big ? 22 : 10);
    this.chocoOff.x = 0;
    this.chocoAnim = { name: 'idle', t: 0 };
  }

  *enemyTurn() {
    const b = this.b;
    const n = b.intent.double ? 2 : 1;
    for (let k = 0; k < n && !b.result; k++) {
      const atk = enemyAttack(b);
      const key = atk.tangle ? 'tangle' : this.kind;
      yield* this.say(TB.attacks[key], 0.8);
      this.msg = null;
      // Anticipación (al menos 0.4 s) y destello que marca el impacto
      const windup = fxRng.range(BATTLE.DEFENSE_WINDUP[0], BATTLE.DEFENSE_WINDUP[1]);
      this.phase = 'defend';
      this.defense = { t: 0, impact: windup, pressed: null, locked: false, miss: atk.miss, kind: key, judged: null };
      playSfx(this.game.audio, 'windup');
      this.hintsShown.defend++;
      yield { until: () => this.defense.t >= this.defense.impact + BATTLE.DEFENSE_GOOD || (this.defense.pressed !== null && this.defense.t >= this.defense.impact) };
      const d = this.defense;
      const offset = d.locked ? null : d.pressed === null ? null : d.pressed - d.impact;
      const defense = judgeDefense(offset);
      d.judged = defense;
      this.phase = 'anim';
      const ev = applyEnemyHit(b, atk, defense);
      this.enemyImpact(ev, atk, defense, d);
      yield 0.6;
      this.defense = null;
      if (ev.some((e) => e.type === 'tangled')) yield* this.say(TB.tangled, 1.1);
      this.chocoAnim = { name: b.result === 'lose' ? 'hurt' : 'idle', t: 0 };
    }
  }

  enemyImpact(ev, atk, defense, d) {
    const a = this.game.audio;
    this.bugWindup = 0;
    if (atk.miss) {
      playSfx(a, 'fall');
      this.float(CHOCO_X, CHOCO_Y - 36, 'NULL', '#B080F0');
      this.msg = { text: TB.enemyMiss, t: 0 };
      return;
    }
    const dmg = ev.find((e) => e.type === 'damage' && e.target === 'choco');
    if (defense === 'perfect') {
      playSfx(a, 'parryPerfect');
      this.game.effects.hitstop(6);
      this.game.effects.flash('#FFFFFF', 2);
      this.float(CHOCO_X, CHOCO_Y - 44, TB.perfect, UI.cyan, true);
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        this.particles.spawn({ x: CHOCO_X + 6, y: CHOCO_Y - 12, vx: Math.cos(ang) * 70, vy: Math.sin(ang) * 70, life: 0.35, colors: ['#43D9FF', '#FFFFFF'] });
      }
      this.chocoAnim = { name: 'shoot', t: 0 };
    } else {
      if (defense === 'good') {
        playSfx(a, 'parryGood');
        this.float(CHOCO_X, CHOCO_Y - 46, TB.halved, UI.green);
      } else if (d.locked) this.float(CHOCO_X, CHOCO_Y - 46, TB.tooEarly, UI.textDim);
      playSfx(a, 'impact');
      playSfx(a, 'hurt');
      this.game.effects.shake(defense === 'good' ? 0.2 : 0.4);
      this.game.effects.hitstop(4);
      this.chocoAnim = { name: 'hurt', t: 0 };
      this.chocoOff.x = -8;
      this.chocoFlash = 0.1;
      for (let i = 0; i < 10; i++) this.particles.spawn({ x: CHOCO_X, y: CHOCO_Y - 12, vx: fxRng.range(-80, 20), vy: fxRng.range(-80, 0), gravity: 260, life: 0.5, colors: ['#5C3521', '#83522F', '#B07A4A'] });
    }
    if (dmg) this.float(CHOCO_X + fxRng.int(-4, 4), CHOCO_Y - 34, String(dmg.amount), dmg.amount ? UI.red : UI.cyan);
  }

  *outro() {
    const b = this.b;
    const a = this.game.audio;
    this.phase = 'end';
    if (b.result === 'win') {
      a.stopMusic(0.3);
      playSfx(a, 'enemyDie');
      this.game.effects.shake(0.4);
      this.burstBug(['#FFFFFF', '#FF2E88', '#43D9FF', '#6FE08A', UI.yellow], 50);
      this.bugAlpha = 0;
      yield 0.5;
      playSfx(a, 'victory');
      this.chocoAnim = { name: 'victory', t: 0 };
      this.winBanner = { t: 0, bits: battleOutcome(b).bits };
      yield { until: () => this.winBanner.t > 1.6 || (this.winBanner.t > 0.6 && this.game.input.pressed('confirm')) };
    } else if (b.result === 'lose') {
      a.stopMusic(0.5);
      playSfx(a, 'melt');
      yield* this.say(TB.lose, 1.6);
    } else {
      yield 0.4;
    }
    this.exit_();
  }

  exit_() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game;
    g.startTransition({
      type: 'fade',
      onMid: () => {
        if (g.top === this) g.pop();
        this.onEnd?.(battleOutcome(this.b));
      },
    });
  }

  // ---------- Utilidades de efectos ----------
  float(x, y, text, color, big = false) {
    this.floats.push({ x, y, text, color, big, t: 0 });
  }

  burstBug(colors, n) {
    this.particles.burst(BUG_X, BUG_Y - 16, n, { speedMin: 30, speedMax: 120, colors, gravity: 160, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
  }

  // ---------- Actualización ----------
  update(dt) {
    this.t += dt;
    const inp = this.game.input;
    const b = this.b;
    if (this.msg) this.msg.t += dt;
    if (this.winBanner) this.winBanner.t += dt;
    if (this.itemPop) this.itemPop.t += dt;
    this.chocoAnim.t += dt;
    if (this.bugFlash > 0) this.bugFlash -= dt;
    if (this.chocoFlash > 0) this.chocoFlash -= dt;
    if (this.scan > 0) this.scan += dt;
    if (this.charging > 0) {
      this.charging += dt;
      if (fxRng.chance(0.6)) {
        const ang = fxRng.range(0, Math.PI * 2);
        this.particles.spawn({ x: CHOCO_X + 14 + Math.cos(ang) * 20, y: CHOCO_Y - 14 + Math.sin(ang) * 20, life: 0.3, colors: ['#43D9FF', '#DFFAFF'], attract: { x: CHOCO_X + 14, y: CHOCO_Y - 14, strength: 600 } });
      }
    }
    this.bugSquash += (1 - this.bugSquash) * Math.min(1, dt * 10);
    // Entrada deslizándose
    if (this.phase !== 'intro') {
      const k = Math.min(1, dt * 9);
      if (!this.fleeing) this.chocoOff.x += (0 - this.chocoOff.x) * k;
      else this.chocoOff.x -= 160 * dt;
      this.bugOff.x += (0 - this.bugOff.x) * k;
    }
    // Proyectil de Choco
    if (this.proj) {
      this.proj.t = Math.min(1, this.proj.t + dt / (this.proj.charged ? 0.3 : 0.22));
      this.proj.x = this.proj.from + (this.proj.to - this.proj.from) * this.proj.t;
      if (fxRng.chance(0.6)) this.particles.spawn({ x: this.proj.x, y: this.proj.y + fxRng.range(-2, 2), vx: -30, life: 0.2, colors: ['#43D9FF', '#DFFAFF'] });
    }
    // Barra de timing
    if (this.timing && !this.timing.result) {
      this.timing.t += dt;
      this.timing.pos = timingPos(this.timing.t);
      if (inp.pressed('confirm')) {
        this.timing.result = judgeTiming(this.timing.pos);
        const r = this.timing.result;
        if (r === 'crit') this.float(160, 62, TB.crit, UI.yellow, true);
        else if (r === 'good') this.float(160, 62, TB.good, UI.green);
        playSfx(this.game.audio, r === 'crit' ? 'chargeReady' : 'menuConfirm');
      } else if (this.timing.t >= BATTLE.TIMING_SWEEP * BATTLE.TIMING_SWEEPS) this.timing.result = 'normal';
    }
    // Defensa
    if (this.defense) {
      const d = this.defense;
      d.t += dt;
      this.bugWindup = Math.min(1, d.t / d.impact);
      if (!d.judged && inp.pressed('confirm') && d.pressed === null && !d.locked) {
        if (d.t < d.impact - BATTLE.DEFENSE_GOOD - BATTLE.DEFENSE_EARLY_LOCK) d.locked = true;
        else if (d.t < d.impact - BATTLE.DEFENSE_GOOD) d.locked = true;
        else d.pressed = d.t;
      }
    }
    // Menú
    if (this.phase === 'menu') this.updateMenu(inp);
    else if (this.phase === 'item') this.updateItems(inp);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 1);
    this.particles.update(dt);
    this.updateTask(dt);
    void b;
  }

  updateMenu(inp) {
    const a = this.game.audio;
    const col = this.sel % 2;
    const row = Math.floor(this.sel / 2);
    let n = this.sel;
    if (inp.pressed('down')) n = Math.min(4 + col, (row + 1) * 2 + col);
    else if (inp.pressed('up')) n = Math.max(col, (row - 1) * 2 + col);
    else if (inp.pressed('right')) n = row * 2 + 1;
    else if (inp.pressed('left')) n = row * 2;
    if (n !== this.sel) {
      this.sel = n;
      playSfx(a, 'menuMove');
    }
    if (inp.pressed('confirm')) {
      const cmd = COMMANDS[this.sel];
      if (!canUse(this.b, cmd)) {
        playSfx(a, 'denied');
        this.menuShake = 0.25;
        this.msg = { text: cmd === 'item' ? TB.noItems : cmd === 'flee' ? TB.cantFlee : TB.noRam, t: 0, short: true };
        return;
      }
      playSfx(a, 'menuConfirm');
      this.msg = null;
      if (cmd === 'item') {
        this.phase = 'item';
        this.itemSel = Math.max(0, ITEM_IDS.findIndex((k) => this.b.items[k] > 0));
        return;
      }
      this.choice = { cmd };
    }
  }

  updateItems(inp) {
    const a = this.game.audio;
    if (inp.pressed('down')) {
      this.itemSel = (this.itemSel + 1) % ITEM_IDS.length;
      playSfx(a, 'menuMove');
    } else if (inp.pressed('up')) {
      this.itemSel = (this.itemSel + ITEM_IDS.length - 1) % ITEM_IDS.length;
      playSfx(a, 'menuMove');
    }
    if (inp.pressed('cancel')) {
      playSfx(a, 'menuCancel');
      this.phase = 'menu';
      return;
    }
    if (inp.pressed('confirm')) {
      const id = ITEM_IDS[this.itemSel];
      if (!this.b.items[id]) {
        playSfx(a, 'denied');
        return;
      }
      playSfx(a, 'menuConfirm');
      this.choice = { cmd: 'item', item: id };
    }
  }

  // ---------- Dibujo ----------
  draw(ctx) {
    const sx = this.game.effects.shakeX;
    const sy = this.game.effects.shakeY;
    ctx.save();
    ctx.translate(sx, sy);
    this.drawBackground(ctx);
    this.drawCombatants(ctx);
    this.particles.draw(ctx, 0, 0, false);
    this.particles.draw(ctx, 0, 0, true);
    this.drawProjectiles(ctx);
    ctx.restore();
    this.drawEnemyInfo(ctx);
    this.drawPanel(ctx);
    this.drawTiming(ctx);
    this.drawFloats(ctx);
    if (this.winBanner) this.drawWin(ctx);
    if (this.phase === 'intro') this.drawSpiral(ctx);
    else if (this.t < BATTLE.INTRO_TIME + 0.35) {
      // Bloques que se terminan de abrir
      const p = (this.t - BATTLE.INTRO_TIME) / 0.35;
      this.drawBlocks(ctx, 1 - p);
    }
  }

  drawSpiral(ctx) {
    const p = Math.min(1, this.t / BATTLE.INTRO_TIME);
    if (this.snapshot) ctx.drawImage(this.snapshot, 0, 0);
    // Espiral de bloques glitch que tapa la pantalla desde afuera hacia el centro
    const cols = 20;
    const rows = 12;
    const bw = W / cols;
    const bh = H / rows;
    const total = cols * rows;
    const order = spiralOrder(cols, rows);
    const n = Math.floor(Ease.inQuad(Math.min(1, p * 1.25)) * total);
    for (let i = 0; i < n; i++) {
      const [x, y] = order[i];
      ctx.fillStyle = (x + y + Math.floor(this.t * 20)) % 7 === 0 ? '#FF2E88' : (x * y) % 5 === 0 ? '#43D9FF' : '#07070C';
      ctx.fillRect(Math.floor(x * bw), Math.floor(y * bh), Math.ceil(bw), Math.ceil(bh));
    }
  }

  drawBlocks(ctx, p) {
    const cols = 20;
    const rows = 12;
    const bw = W / cols;
    const bh = H / rows;
    ctx.fillStyle = '#07070C';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const h = ((x * 73 + y * 151 + 17) % 97) / 97;
        if (h < p) ctx.fillRect(Math.floor(x * bw), Math.floor(y * bh), Math.ceil(bw), Math.ceil(bh));
      }
    }
  }

  drawBackground(ctx) {
    const bg = this.bg;
    ctx.fillStyle = bg.wall;
    ctx.fillRect(-8, -8, W + 16, 80);
    ctx.fillStyle = bg.stripe;
    ctx.fillRect(-8, 52, W + 16, 10);
    ctx.fillStyle = '#4A3428';
    ctx.fillRect(-8, 62, W + 16, 4);
    // Detalle de la zona
    const t = this.t;
    if (bg.deco === 'lockers') {
      for (let x = 10; x < W; x += 26) {
        ctx.fillStyle = '#5A5A6E';
        ctx.fillRect(x, 10, 22, 42);
        ctx.fillStyle = '#3A3A4A';
        ctx.fillRect(x + 4, 16, 14, 1);
        ctx.fillRect(x + 4, 19, 14, 1);
        ctx.fillRect(x + 17, 32, 2, 3);
      }
    } else if (bg.deco === 'board') {
      ctx.fillStyle = '#6B4E3D';
      ctx.fillRect(60, 8, 200, 40);
      ctx.fillStyle = '#2D5A3D';
      ctx.fillRect(63, 11, 194, 34);
      ctx.fillStyle = '#C8D8C8';
      ctx.fillRect(80, 20, 40, 1);
      ctx.fillRect(80, 28, 60, 1);
      drawText(ctx, bg.stripe === '#5E1E26' ? '// TODO' : 'A AND B', 200, 22, { align: 'center', color: bg.stripe === '#5E1E26' ? '#FF6A6A' : '#C8D8C8', shadow: false });
    } else if (bg.deco === 'screens') {
      for (let x = 14; x < W; x += 40) {
        ctx.fillStyle = '#3A3A4A';
        ctx.fillRect(x, 16, 30, 22);
        ctx.fillStyle = Math.floor(t * 2 + x) % 5 === 0 ? '#43D9FF' : '#0A3A4A';
        ctx.fillRect(x + 2, 18, 26, 16);
        ctx.fillStyle = '#8FB3D9';
        ctx.fillRect(x + 4, 22, 10 + ((x * 7) % 12), 1);
      }
    } else if (bg.deco === 'books') {
      for (let x = 0; x < W; x += 3) {
        const h = 10 + ((x * 37) % 9);
        ctx.fillStyle = ['#8C2F39', '#3A6EA8', '#4CBB4C', '#FFD23F', '#E07A3A'][(x * 7) % 5];
        ctx.fillRect(x, 50 - h, 2, h);
        ctx.fillRect(x, 26 - Math.floor(h / 2), 2, Math.floor(h / 2) + 4);
      }
      ctx.fillStyle = '#4A3428';
      ctx.fillRect(-8, 26, W + 16, 3);
    } else if (bg.deco === 'counter') {
      ctx.fillStyle = '#C8A070';
      ctx.fillRect(40, 34, 240, 6);
      ctx.fillStyle = '#B83A3A';
      ctx.fillRect(40, 40, 240, 12);
      ctx.fillStyle = '#101018';
      ctx.fillRect(130, 6, 60, 22);
      drawText(ctx, 'MENÚ', 160, 10, { align: 'center', color: '#F4F1EA', shadow: false });
    } else if (bg.deco === 'lights') {
      const cols = ['#FF2E88', '#43D9FF', '#FFD23F'];
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = cols[i];
        const x = 60 + i * 100 + Math.sin(t + i) * 20;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 40, H);
        ctx.lineTo(x + 40, H);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Piso en perspectiva
    ctx.fillStyle = bg.floor;
    ctx.fillRect(-8, 66, W + 16, H - 66 + 8);
    ctx.fillStyle = bg.floor2;
    for (let i = 0; i < 6; i++) {
      const y = 66 + Math.round(Math.pow(i / 6, 1.6) * 62);
      ctx.fillRect(-8, y, W + 16, 1);
    }
    for (let i = -6; i <= 6; i++) {
      ctx.fillRect(Math.round(W / 2 + i * 26), 66, 1, 2);
      const xb = Math.round(W / 2 + i * 60);
      const steps = 30;
      for (let k = 0; k < steps; k++) {
        const pp = k / steps;
        ctx.fillRect(Math.round(W / 2 + i * 26 + (xb - (W / 2 + i * 26)) * pp), Math.round(66 + 62 * pp), 1, 1);
      }
    }
    // Plataformas (elipses) bajo los combatientes
    this.ellipse(ctx, CHOCO_X, CHOCO_Y + 1, 26, 5, 'rgba(0,0,0,0.25)');
    this.ellipse(ctx, BUG_X, BUG_Y + 2, 30, 6, 'rgba(0,0,0,0.25)');
  }

  ellipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }

  chocoFrameDef() {
    const a = this.chocoAnim;
    if (a.name === 'run') {
      const fr = ANIMS.run.frames;
      return fr[Math.floor(a.t * ANIMS.run.fps) % fr.length];
    }
    const anim = ANIMS[a.name] || ANIMS.idle;
    const i = anim.loop === false ? Math.min(anim.frames.length - 1, Math.floor(a.t * anim.fps)) : Math.floor(a.t * anim.fps) % anim.frames.length;
    return anim.frames[i];
  }

  drawCombatants(ctx) {
    // Bug
    if (this.bugAlpha > 0) {
      const spr = battleBug(this.kind, Math.floor(this.t * 3) % 2);
      const wind = this.bugWindup;
      const shake = wind > 0.3 ? Math.round(Math.sin(this.t * 50) * wind * 2) : 0;
      const grow = 1 + wind * 0.12;
      const sq = this.bugSquash;
      const w = Math.round(32 * grow * (2 - sq));
      const h = Math.round(32 * grow * sq);
      const bob = Math.round(Math.sin(this.t * 2.5) * 2);
      const x = BUG_X + this.bugOff.x + shake - Math.round(w / 2);
      const y = BUG_Y - h + bob;
      if (this.scan > 0) {
        // Escaneo de Debug: líneas cian que recorren al bug
        ctx.drawImage(spr.tint('#43D9FF', true), x, y, w, h);
        ctx.fillStyle = '#DFFAFF';
        const ly = y + Math.floor((this.scan * 60) % h);
        ctx.fillRect(x - 4, ly, w + 8, 1);
      }
      ctx.drawImage(spr.get(true, this.bugFlash > 0), x, y, w, h);
      // Punto débil revelado
      if (intentVisible(this.b) && Math.floor(this.t * 4) % 2 === 0) {
        ctx.strokeStyle = '#43D9FF';
        ctx.beginPath();
        ctx.arc(BUG_X + this.bugOff.x, BUG_Y - 16 + bob, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Destello de anticipación
      if (wind > 0.75 && this.defense && Math.floor(this.t * 20) % 2) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(spr.tint('#FFFFFF', true), x, y, w, h);
        ctx.globalAlpha = 1;
      }
    }
    // Choco
    const f = this.chocoFrameDef();
    const face = this.chocoAnim.name === 'hurt' ? 'hurt' : this.b.result === 'win' ? 'happy' : 'determined';
    const spr = chocoFrame(f, face, true);
    const x = Math.round(CHOCO_X + this.chocoOff.x - FRAME_W / 2);
    const y = CHOCO_Y - FRAME_H;
    if (this.b.choco.tangled) {
      // Fideos enredados
      ctx.fillStyle = '#F0D27A';
      for (let i = 0; i < 5; i++) ctx.fillRect(x + 10 + Math.round(Math.sin(this.t * 3 + i) * 6), y + 8 + i * 3, 10, 1);
    }
    ctx.drawImage(spr.get(this.fleeing, this.chocoFlash > 0), x, y);
    if (this.charging > 0) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 30);
      ctx.fillStyle = '#DFFAFF';
      ctx.fillRect(CHOCO_X + 12, CHOCO_Y - 17, 5, 5);
      ctx.globalAlpha = 1;
    }
    if (this.itemPop) {
      const p = Math.min(1, this.itemPop.t * 3);
      ctx.drawImage(smallItem(this.itemPop.id).normal, CHOCO_X - 6, CHOCO_Y - 40 - Math.round(p * 6));
    }
  }

  drawProjectiles(ctx) {
    if (this.proj) {
      const p = this.proj;
      const s = p.charged ? 2 : 1;
      drawText(ctx, '{ }', Math.round(p.x), Math.round(p.y - 4 * s), { align: 'center', color: '#DFFAFF', scale: s, bold: p.charged, shadow: '#0A3A4A' });
    }
    // Proyectil del bug: llega exactamente en el impacto
    const d = this.defense;
    if (d && !d.judged) {
      const travel = 0.45;
      const p = (d.t - (d.impact - travel)) / travel;
      if (p > 0 && p < 1.2) {
        const x = BUG_X - 20 + (CHOCO_X + 8 - (BUG_X - 20)) * Math.min(1, p);
        const y = BUG_Y - 16 + (CHOCO_Y - 14 - (BUG_Y - 16)) * Math.min(1, p) - Math.sin(Math.min(1, p) * Math.PI) * 12;
        this.drawEnemyShot(ctx, d.kind, x, y, d.miss && p > 0.85);
      }
      // Anillo que se cierra sobre Choco: marca el instante del impacto
      const r = Math.max(0, (d.impact - d.t) * 40);
      if (r < 40 && r > 0) {
        ctx.strokeStyle = r < 4 ? '#FFFFFF' : '#FFD23F';
        ctx.beginPath();
        ctx.arc(CHOCO_X + 2, CHOCO_Y - 12, 6 + r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (d.t >= d.impact - 1 / 60 && d.t < d.impact + 0.08) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(CHOCO_X - 10, CHOCO_Y - 26, 24, 24);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawEnemyShot(ctx, kind, x, y, veer) {
    x = Math.round(x);
    y = Math.round(y + (veer ? -30 : 0));
    if (kind === 'nullPointer') drawText(ctx, '∅', x, y - 4, { align: 'center', color: '#B080F0', scale: 2 });
    else if (kind === 'loop') {
      ctx.strokeStyle = '#8AE8FF';
      ctx.beginPath();
      ctx.arc(x, y, 5, this.t * 10, this.t * 10 + 5);
      ctx.stroke();
    } else if (kind === 'race') {
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x + 4, y - 1, 4, 4);
    } else if (kind === 'leak') {
      ctx.fillStyle = '#4CBB4C';
      ctx.fillRect(x - 2, y - 3, 5, 6);
      ctx.fillRect(x - 1, y - 5, 3, 2);
    } else if (kind === 'tangle' || kind === 'spaghetti') {
      ctx.fillStyle = '#F0D27A';
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 6 + i * 3, y + Math.round(Math.sin(this.t * 20 + i) * 3), 3, 1);
    } else {
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  }

  drawEnemyInfo(ctx) {
    const b = this.b;
    // Arriba a la derecha: nombre y energía del bug
    const x = W - 124;
    ctx.fillStyle = 'rgba(7,7,12,0.82)';
    ctx.fillRect(x, 4, 120, 22);
    ctx.fillStyle = UI.magenta;
    ctx.fillRect(x, 4, 120, 1);
    drawText(ctx, this.name, x + 4, 7, { color: UI.text });
    drawText(ctx, `${b.bug.hp}/${b.bug.maxHp}`, x + 116, 7, { align: 'right', color: UI.textDim });
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(x + 4, 17, 112, 5);
    ctx.fillStyle = UI.magenta;
    ctx.fillRect(x + 5, 18, Math.round(110 * (b.bug.hp / b.bug.maxHp)), 3);
    if (this.kind === 'loop' && !b.bug.loopBroken) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < b.bug.loop ? '#8AE8FF' : '#2A3A4A';
        ctx.fillRect(x + 4 + i * 6, 28, 4, 3);
      }
    }
    // Intención revelada por Debug
    if (intentVisible(b) && b.intent && this.phase !== 'intro') {
      const it = b.intent;
      const parts = [];
      if (this.kind === 'nullPointer') parts.push(TB.intent.deref);
      else if (it.action === 'tangle') parts.push(TB.intent.tangle);
      else if (it.loopHeal) parts.push(TB.intent.loopHeal);
      else if (it.leak) parts.push(TB.intent.leak);
      else parts.push(TB.intent.attack);
      if (this.kind === 'race') parts.push(it.first ? TB.intent.first : TB.intent.after);
      if (it.double) parts.push(TB.intent.double);
      const tx = parts.join(' · ');
      ctx.fillStyle = 'rgba(10,42,122,0.75)';
      ctx.fillRect(4, 4, 150, 14);
      ctx.fillStyle = UI.cyan;
      ctx.fillRect(4, 4, 2, 14);
      drawText(ctx, tx, 9, 7, { color: '#DFFAFF' });
      drawText(ctx, `DEBUG ${b.choco.debugTurns}`, 4, 21, { color: UI.cyan });
    }
  }

  drawPanel(ctx) {
    const b = this.b;
    const c = b.choco;
    const py = 130;
    // Línea de mensajes / descripción
    let line = null;
    if (this.msg) line = this.msg.text;
    else if (this.phase === 'menu') {
      const cmd = COMMANDS[this.sel];
      line = TB.desc[cmd];
    } else if (this.phase === 'item') line = TEXTS.items2[ITEM_IDS[this.itemSel]].desc;
    if (line) {
      ctx.fillStyle = 'rgba(7,7,12,0.85)';
      ctx.fillRect(2, py - 18, W - 4, 15);
      ctx.fillStyle = this.msg ? UI.yellow : UI.panelBorder;
      ctx.fillRect(2, py - 18, 2, 15);
      drawText(ctx, line, 8, py - 14, { color: UI.text });
    }
    // Panel inferior
    ctx.fillStyle = UI.panel;
    ctx.fillRect(0, py, W, H - py);
    ctx.fillStyle = UI.panelBorder;
    ctx.fillRect(0, py, W, 1);
    ctx.fillRect(114, py, 1, H - py);
    // Choco: energía y RAM
    drawText(ctx, TB.energy || TEXTS.level2.energy, 6, py + 5, { color: UI.textDim });
    drawText(ctx, `${c.energy}/${c.maxEnergy}`, 108, py + 5, { align: 'right', color: c.energy <= c.maxEnergy * 0.3 ? UI.red : UI.text });
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(6, py + 15, 102, 5);
    ctx.fillStyle = c.energy <= c.maxEnergy * 0.3 ? UI.red : UI.green;
    ctx.fillRect(7, py + 16, Math.round(100 * (c.energy / c.baseMax)), 3);
    if (c.maxEnergy < c.baseMax) {
      // Lo que se comió la fuga de memoria
      ctx.fillStyle = '#2A6A2E';
      ctx.fillRect(7 + Math.round(100 * (c.maxEnergy / c.baseMax)), py + 16, Math.round(100 * (1 - c.maxEnergy / c.baseMax)), 3);
    }
    drawText(ctx, TEXTS.level2.ram, 6, py + 25, { color: UI.textDim });
    for (let i = 0; i < BATTLE.RAM_MAX; i++) {
      ctx.fillStyle = i < c.ram ? UI.cyan : '#1E2A3A';
      ctx.fillRect(30 + i * 8, py + 26, 6, 5);
    }
    if (c.tangled) drawText(ctx, 'ENREDADO', 6, py + 37, { color: '#F0D27A' });
    if (c.weakNext) drawText(ctx, '×2', 98, py + 37, { color: UI.yellow });
    // Comandos
    if (this.phase === 'menu' || (this.phase !== 'item' && this.phase !== 'intro')) this.drawCommands(ctx, py, this.phase === 'menu');
    if (this.phase === 'item') this.drawItems(ctx, py);
  }

  drawCommands(ctx, py, active) {
    const b = this.b;
    COMMANDS.forEach((cmd, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      let x = 126 + col * 98;
      const y = py + 7 + row * 14;
      const usable = canUse(b, cmd);
      const sel = active && i === this.sel;
      if (sel && this.menuShake > 0) {
        this.menuShake -= 1 / 60;
        x += Math.round(Math.sin(this.menuShake * 60) * 2);
      }
      if (sel) drawText(ctx, '{', x - 8 - Math.round(Math.abs(Math.sin(this.t * 8)) * 2), y, { color: UI.yellow });
      const color = !active ? '#3E3E52' : !usable ? '#4E4E62' : sel ? UI.text : UI.textDim;
      drawText(ctx, TB.commands[cmd], x, y, { color });
      if (COMMAND_COST[cmd]) drawText(ctx, String(COMMAND_COST[cmd]), x + 88, y, { align: 'right', color: usable ? UI.cyan : '#3A4A5A' });
    });
  }

  drawItems(ctx, py) {
    const b = this.b;
    ITEM_IDS.forEach((id, i) => {
      const y = py + 6 + i * 15;
      const sel = i === this.itemSel;
      const n = b.items[id] || 0;
      if (sel) drawText(ctx, '{', 120 - Math.round(Math.abs(Math.sin(this.t * 8)) * 2), y + 1, { color: UI.yellow });
      ctx.globalAlpha = n ? 1 : 0.35;
      ctx.drawImage(smallItem(id).normal, 128, y - 1);
      ctx.globalAlpha = 1;
      drawText(ctx, TEXTS.items2[id].name, 144, y + 1, { color: n ? (sel ? UI.text : UI.textDim) : '#4E4E62' });
      drawText(ctx, `×${n}`, 312, y + 1, { align: 'right', color: n ? UI.cyan : '#3A4A5A' });
    });
  }

  drawTiming(ctx) {
    const tm = this.timing;
    if (tm) {
      const x = 90;
      const y = 70;
      const w = 140;
      ctx.fillStyle = 'rgba(7,7,12,0.85)';
      ctx.fillRect(x - 4, y - 4, w + 8, 16);
      ctx.fillStyle = '#2A2F45';
      ctx.fillRect(x, y, w, 8);
      const good = Math.round(w * BATTLE.TIMING_GOOD);
      const crit = Math.round(w * BATTLE.TIMING_CRIT);
      ctx.fillStyle = '#2A6A3A';
      ctx.fillRect(x + w / 2 - good, y, good * 2, 8);
      ctx.fillStyle = UI.yellow;
      ctx.fillRect(x + w / 2 - crit, y, crit * 2, 8);
      const mx = Math.round(x + tm.pos * w);
      ctx.fillStyle = tm.result ? (tm.result === 'crit' ? '#FFFFFF' : UI.cyan) : '#FFFFFF';
      ctx.fillRect(mx - 1, y - 3, 3, 14);
      if (this.hintsShown.timing < 3 || !tm.result) drawText(ctx, TB.timingHint, x + w / 2, y + 12, { align: 'center', color: UI.textDim });
    }
    if (this.defense && !this.defense.judged && this.hintsShown.defend <= 3) {
      drawText(ctx, TB.defendHint, CHOCO_X, 62, { align: 'center', color: UI.yellow });
    }
  }

  drawFloats(ctx) {
    for (const f of this.floats) {
      const p = f.t;
      const y = Math.round(f.y - Ease.outCubic(Math.min(1, p * 1.5)) * 14);
      ctx.globalAlpha = Math.min(1, (1 - p) * 3);
      const pop = p < 0.1 ? 1 : 0;
      drawText(ctx, f.text, Math.round(f.x), y - pop, { align: 'center', color: f.color, bold: f.big });
      ctx.globalAlpha = 1;
    }
  }

  drawWin(ctx) {
    const w = this.winBanner;
    const a = Math.min(1, w.t * 4);
    ctx.globalAlpha = 0.7 * a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 54, W, 36);
    ctx.globalAlpha = a;
    const slide = Math.round((1 - Math.min(1, w.t * 4)) * 30);
    drawText(ctx, TB.win, W / 2 - slide, 59, { align: 'center', bold: true, scale: 2, color: UI.green });
    if (w.bits) drawText(ctx, TB.bits(w.bits), W / 2 + slide, 78, { align: 'center', color: UI.yellow });
    ctx.globalAlpha = 1;
  }
}

// Orden de bloques en espiral (de afuera hacia el centro)
const spiralCache = new Map();
function spiralOrder(cols, rows) {
  const key = `${cols}x${rows}`;
  if (spiralCache.has(key)) return spiralCache.get(key);
  const out = [];
  let x0 = 0;
  let y0 = 0;
  let x1 = cols - 1;
  let y1 = rows - 1;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) out.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]);
    if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]);
    if (x0 < x1) for (let y = y1 - 1; y > y0; y--) out.push([x0, y]);
    x0++;
    y0++;
    x1--;
    y1--;
  }
  spiralCache.set(key, out);
  return out;
}

export { spiralOrder, drawTextBox };
