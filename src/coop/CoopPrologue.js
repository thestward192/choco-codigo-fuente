// Prólogo cooperativo "Prueba de conexión" — docs/coop/01_historia_coop.md
// Empieza con Choco y Tapita probando la conexión. Al llegar los dos a la puerta final, la barra de
// carga se congela al 99 %, todo se pone gris, el sonido se atrasa y aparece L.A.G. (con eco: cada
// cosa que dice llega dos veces, la segunda tarde). Después el suelo se parte en dos por el centro,
// cada uno cae por su lado y se abre el mapa de conexiones.
// Los dos corren la misma cinemática; la empieza el anfitrión (ev 'lag'). Saltarla exige que los
// dos mantengan Esc.
import { SCREEN, COOP } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { portrait } from '../art/portraits.js';
import { drawHoldRing } from '../systems/dialogue.js';
import { UI, COOP as COOP_COLORS } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';
import { CoopStage } from './CoopStage.js';
import { CoopDialogue } from './dialogue.js';
import { charColor } from './art.js';
import { PROLOGUE, PROLOGUE_FEATURES } from './stages/prologue.js';
import { loadCoop, saveCoop, recordMapResult } from './coopSave.js';

const TS = SCREEN.TILE;
const T = TEXTS.coop.prologue;
const R = fxRng;
const BAR = PROLOGUE_FEATURES.bar;
const SPLIT = PROLOGUE_FEATURES.split;
const GROUND = PROLOGUE_FEATURES.ground;

// Tiempos de la cinemática (s)
const LAG = { STUCK: 0.6, GREY_AT: 1.4, GREY_TIME: 1.2, TALK_AT: 3, CRACK: 0.7, FALL: 2.4 };

export class CoopPrologue extends CoopStage {
  constructor(game, opts = {}) {
    super(game, { ...opts, stage: PROLOGUE, mapId: 'prologue' });
    this.barShown = 0;
    this.lag = null; // { t, phase: 'bar' | 'talk' | 'split' }
    this.lagTrail = [];
    this.introPending = !this.opts.cp;
    this.skipHoldT = 0;
    this.skipHolding = false;
    this.skipPartnerT = 0;
  }

  // Al morir los dos durante la cinemática no hay reaparición
  onPlayerFell(p) {
    if (this.lag) return;
    super.onPlayerFell(p);
  }

  levelUpdate(dt) {
    super.levelUpdate(dt);
    // Diálogo de entrada
    if (this.introPending && this.t > 0.8) {
      this.introPending = false;
      this.dialogue = new CoopDialogue(this.game, T.intro, { solo: this.local && !this.partner.present });
    }
    // La barra avanza con cada puerta doble
    const target = this.lag ? 99 : Math.min(95, 12 + this.doorsDone.size * 30);
    this.barShown += (target - this.barShown) * Math.min(1, dt * (this.lag ? 2.5 : 1.5));
    if (this.lag) this.updateLag(dt);
  }

  // Puerta final (anfitrión): en vez de terminar, empieza L.A.G.
  onFinalDoor() {
    this.ev('lag');
    this.startLag();
  }

  onStageEvent(e) {
    if (e.k === 'lag') this.startLag();
    else super.onStageEvent(e);
  }

  startLag() {
    if (this.lag) return;
    this.lag = { t: 0, phase: 'bar', grey: 0, lagA: 0, crack: 0 };
    this.cutsceneLock = true;
    this.dialogue = null;
    this.saveDone();
  }

  // Cada uno guarda en su computadora que terminó el prólogo
  saveDone() {
    if (this.savedDone || !this.game.save) return;
    this.savedDone = true;
    const { data } = recordMapResult(loadCoop(this.game.save), 'prologue', { time: this.stats.time, falls: this.stats.falls });
    saveCoop(this.game.save, data);
  }

  updateLag(dt) {
    const L = this.lag;
    L.t += dt;
    const a = this.game.audio;
    this.updateSkip(dt);
    if (L.phase === 'bar') {
      if (!L.stuck && L.t >= LAG.STUCK) {
        L.stuck = true;
        playSfx(a, 'loadingStuck');
      }
      if (!L.warp && L.t >= LAG.GREY_AT) {
        L.warp = true;
        a.stopMusic(1.5);
        playSfx(a, 'lagWarp');
      }
      if (L.t >= LAG.GREY_AT) {
        L.grey = Math.min(1, (L.t - LAG.GREY_AT) / LAG.GREY_TIME);
        L.lagA = L.grey;
      }
      if (L.t >= LAG.TALK_AT) {
        L.phase = 'talk';
        this.dialogue = new CoopDialogue(this.game, T.lag, { solo: this.local && !this.partner.present, onDone: () => this.startSplit(), onSkip: () => this.finishLag() });
      }
    } else if (L.phase === 'split') {
      L.st += dt;
      L.crack = Math.min(1, L.st / LAG.CRACK);
      if (!L.broken && L.st >= LAG.CRACK) this.breakFloor();
      if (L.st >= LAG.CRACK + LAG.FALL) this.finishLag();
    }
    // Rastro de L.A.G. para el eco (4 frames tarde)
    const pos = { x: (BAR.tx + BAR.w / 2) * TS, y: (BAR.ty + 3.5) * TS + Math.sin(this.t * 2) * 3 };
    this.lagTrail.push(pos);
    if (this.lagTrail.length > 5) this.lagTrail.shift();
  }

  // Los dos mantienen Esc para saltar (fuera del diálogo; el diálogo tiene su propio salto)
  updateSkip(dt) {
    if (this.dialogue) return;
    const hold = this.input.down('pause') || this.input.down('skip');
    if (hold !== this.skipHolding) {
      this.skipHolding = hold;
      this.act('skip', { on: hold });
    }
    this.skipHoldT = hold ? this.skipHoldT + dt : 0;
    this.skipPartnerT = this.skipPartner ? this.skipPartnerT + dt : 0;
    const alone = !this.partner.present;
    if (this.skipHoldT >= COOP.SKIP_HOLD && (alone || this.skipPartnerT >= COOP.SKIP_HOLD * 0.5)) this.finishLag();
  }

  startSplit() {
    const L = this.lag;
    if (!L || L.phase === 'split') return;
    L.phase = 'split';
    L.st = 0;
    playSfx(this.game.audio, 'glitch');
  }

  // El suelo se parte por el centro: cada uno cae por su lado
  breakFloor() {
    const L = this.lag;
    L.broken = true;
    playSfx(this.game.audio, 'floorSplit');
    this.game.effects.shake(0.6);
    for (let tx = SPLIT.x0; tx <= SPLIT.x1; tx++) {
      for (let ty = GROUND; ty < this.map.h; ty++) {
        this.map.setChar(tx, ty, '.');
        if (R.chance(0.5)) this.particles.burst(tx * TS + 8, ty * TS + 8, 3, { speedMin: 10, speedMax: 50, colors: ['#E6E1D5', '#D6D0C2', '#FFFFFF'], gravity: 300, lifeMin: 0.4, lifeMax: 0.9, size: 3, endSize: 1 });
      }
    }
    // Un empujoncito hacia su lado
    const p = this.player;
    if (p.alive) {
      p.body.vx = Math.sign(p.footX - SPLIT.center * TS - 8) * 50 || (p.kind === 'choco' ? -50 : 50);
      p.body.onGround = false;
    }
  }

  finishLag() {
    if (this.lagDone) return;
    this.lagDone = true;
    this.saveDone();
    this.ended = true;
    if (this.onLeave) this.onLeave('done');
    else this.game.flow.toCoopMap(this.game, { fromPrologue: true });
  }

  // ---------- Dibujo ----------
  drawWorld(ctx, cx, cy) {
    super.drawWorld(ctx, cx, cy);
    this.drawBar(ctx, cx, cy);
    if (this.lag && this.lag.lagA > 0) this.drawLag(ctx, cx, cy);
    if (this.lag?.phase === 'split' && !this.lag.broken) this.drawCrack(ctx, cx, cy);
  }

  // Barra de conexión gigante en la pared del fondo
  drawBar(ctx, cx, cy) {
    const x = Math.round(BAR.tx * TS - cx);
    const y = Math.round(BAR.ty * TS - cy);
    const w = BAR.w * TS;
    if (x > SCREEN.W || x + w < 0) return;
    const pct = Math.min(99, Math.round(this.barShown));
    ctx.fillStyle = '#2A2730';
    ctx.fillRect(x, y, w, 20);
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(x + 2, y + 2, w - 4, 16);
    const fillW = Math.round(((w - 8) * pct) / 100);
    for (let i = 0; i < fillW; i += 2) {
      ctx.fillStyle = Math.floor(i / 8) % 2 ? COOP_COLORS.choco : COOP_COLORS.tapita;
      ctx.fillRect(x + 4 + i, y + 4, 2, 12);
    }
    const stuck = this.lag?.stuck && Math.floor(this.t * 3) % 2;
    drawText(ctx, `${T.connecting} ${pct}%`, x + w / 2, y + 24, { align: 'center', color: stuck ? '#E0343F' : '#6E6A60', shadow: false });
  }

  // L.A.G.: reloj de arena de paquetes, con una copia atrasada (su firma visual)
  drawLag(ctx, cx, cy) {
    const L = this.lag;
    const pr = portrait('lag', 'normal');
    const now = this.lagTrail[this.lagTrail.length - 1];
    const late = this.lagTrail[0];
    if (!now) return;
    ctx.globalAlpha = 0.35 * L.lagA;
    ctx.drawImage(pr.normal, Math.round(late.x - 16 - cx + 3), Math.round(late.y - 16 - cy + 2));
    ctx.globalAlpha = L.lagA;
    ctx.drawImage(pr.normal, Math.round(now.x - 16 - cx), Math.round(now.y - 16 - cy));
    ctx.globalAlpha = 1;
    // Paquetes que se escapan
    if (R.chance(0.3)) this.particles.spawn({ x: now.x + R.range(-14, 14), y: now.y + R.range(-14, 14), vx: R.range(-20, 20), vy: R.range(-20, 5), life: 0.6, color: R.pick(['#FFFFFF', '#B8B8C8']), size: 2, endSize: 1 });
  }

  drawCrack(ctx, cx, cy) {
    const k = this.lag.crack;
    const x0 = SPLIT.center * TS + 8;
    const y0 = GROUND * TS;
    const len = Math.round(k * 32);
    ctx.fillStyle = '#2A2730';
    for (let i = 0; i < len; i++) {
      const wob = ((i * 7) % 5) - 2;
      ctx.fillRect(Math.round(x0 + wob - cx), Math.round(y0 + i - cy), 2, 1);
    }
    // También a lo largo del piso
    const side = Math.round(k * (SPLIT.x1 - SPLIT.x0) * 8);
    ctx.fillRect(Math.round(x0 - side - cx), Math.round(y0 - cy), side * 2, 1);
  }

  // Todo se pone gris (encima del mundo y del HUD; el diálogo queda a color)
  drawOverlay(ctx) {
    super.drawOverlay(ctx);
    const L = this.lag;
    if (!L) return;
    if (L.grey > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = L.grey;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.restore();
      // Líneas de atraso que bajan
      ctx.globalAlpha = 0.15 * L.grey;
      ctx.fillStyle = '#FFFFFF';
      const y = Math.floor(this.t * 40) % SCREEN.H;
      ctx.fillRect(0, y, SCREEN.W, 1);
      ctx.fillRect(0, (y + 61) % SCREEN.H, SCREEN.W, 1);
      ctx.globalAlpha = 1;
    }
    // Al caer: fundido a negro
    if (L.phase === 'split' && L.st > LAG.CRACK + LAG.FALL - 0.8) {
      ctx.globalAlpha = Math.min(1, (L.st - (LAG.CRACK + LAG.FALL - 0.8)) / 0.8);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
    // Anillos para saltar la cinemática (uno por jugador)
    if (!this.dialogue && (this.skipHoldT > 0.05 || this.skipPartner)) {
      drawHoldRing(ctx, SCREEN.W - 26, 34, this.skipHoldT / COOP.SKIP_HOLD, charColor(this.mine));
      drawHoldRing(ctx, SCREEN.W - 12, 34, this.skipPartnerT / COOP.SKIP_HOLD, charColor(this.theirs));
      drawText(ctx, TEXTS.coop.skipBoth, SCREEN.W - 36, 30, { align: 'right', color: UI.textDim });
    }
  }
}
