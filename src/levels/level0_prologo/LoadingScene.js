// Prólogo · Parte B: Pantalla de Carga. Tutorial de disparar y cargar, Báculo Compilador,
// discurso de N.U.L.L. en la pantalla gigante y portal al nivel 1.
import { SCREEN, PROLOGUE, STAFF } from '../../config/balance.js';
import { Tilemap } from '../../systems/tilemap.js';
import { aabbOverlap } from '../../systems/physics.js';
import { PlatformLevel } from '../PlatformLevel.js';
import { buildLoading, LOAD } from './loadingMap.js';
import { drawLoadingTiles, drawLoadingBackground } from '../../art/tiles/loading.js';
import { drawNullScreen } from '../../art/null.js';
import { drawGlitchPortal } from '../../art/portal.js';
import { drawText } from '../../art/font.js';
import { drawHintBubble, drawSystemLine } from '../../ui/hints.js';
import { drawHoldRing } from '../../systems/dialogue.js';
import { Byteling } from '../../entities/enemies/byteling.js';
import { Mosquito } from '../../entities/enemies/mosquito.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { LOADING, UI } from '../../art/palettes.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_CARGA } from '../../audio/songs/carga.js';
import { SONG_NULL } from '../../audio/songs/null.js';
import { Typewriter } from '../../systems/typewriter.js';
import { fxRng } from '../../core/rng.js';
import { ItemGetScene } from '../../scenes/ItemGetScene.js';

const TS = SCREEN.TILE;
const R = fxRng;

export class LoadingScene extends PlatformLevel {
  constructor(game, { stats = null } = {}) {
    super(game, { levelId: 0, noDeath: true, hudMode: 'bar' });
    if (stats) this.stats = stats;
    this.setMap(new Tilemap(buildLoading()));
    const sx = LOAD.spawn.x * TS + 8;
    this.checkpoint = { x: sx, y: 9 * TS, id: -1 };
    this.placeChoco(sx, -8, { items: { staff: false, boots: false, laptop: false, shield: false, lasso: false }, maxHp: 1 });
    this.choco.body.vy = 120;
    this.camera.snapTo(sx, 9 * TS);
    this.staffTaken = false;
    this.staffT = 0;
    this.sysLine = { text: TEXTS.prologue.loadingWorld, tw: new Typewriter(TEXTS.prologue.loadingWorld, 'slow'), t: 0, time: 4.5 };
    this.screen = { on: 0, t: 0 };
    this.portal = { open: 0, x: LOAD.portal.x * TS + 8, y: 9 * TS };
    this.nullDone = false;
    this.hints = { shoot: 0, charge: 0, shotOnce: false, charged: false, wallResisted: 0 };
    for (const tx of LOAD.tests) this.enemies.push(new Byteling(tx * TS + 8, 9 * TS, { dir: -1, test: true, speed: 0, turnAtEdges: true }));
    this.enemies.push(new Mosquito(LOAD.mosquito.x * TS + 8, LOAD.mosquito.y * TS + 10, { range: 18, phase: 0.2 }));
    this.addInteractable({
      x: (LOAD.staff.x + 1) * TS,
      y: LOAD.staff.y * TS,
      range: 18,
      hintH: 40,
      onUse: (o) => this.takeStaff(o),
    });
  }

  enter() {
    this.game.audio.playSong(SONG_CARGA);
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

  // Al tomar el báculo: pose de victoria, "compilación exitosa" y la pantalla de objeto
  takeStaff(o) {
    o.disabled = true;
    const s = this;
    const g = this.game;
    const c = this.choco;
    this.playCutscene(function* (cs) {
      c.state = 'victory';
      c.anim.t = 0;
      s.staffTaken = true;
      s.staffT = 0;
      playSfx(g.audio, 'compile');
      g.effects.flash('#43D9FF', 4);
      s.particles.burst(c.footX, c.footY - 20, 26, { speedMin: 30, speedMax: 100, colors: ['#FFFFFF', '#43D9FF', '#2A6F8A'], lifeMin: 0.3, lifeMax: 0.7 });
      c.items.staff = true;
      s.checkpoint = { x: c.footX, y: c.footY, id: 0 };
      yield 0.9;
      s.hud.visible = false;
      yield cs.push(new ItemGetScene(g, 'staff'));
      c.state = 'play';
    }, { skippable: false, keepHud: true });
  }

  // Disparos que rebotan en el muro: el báculo brilla para enseñar la carga
  onCrackedResist() {
    this.hints.wallResisted++;
  }

  onCrackedBroken() {
    this.hints.charged = true;
  }

  // ---------- N.U.L.L. en la pantalla gigante ----------
  startNullSpeech() {
    const s = this;
    const g = this.game;
    this.nullDone = true;
    this.playCutscene(
      function* (cs) {
        g.audio.playSong(SONG_NULL);
        playSfx(g.audio, 'nullAppear');
        g.effects.glitch(0.4, 1);
        g.effects.shake(0.3);
        s.screen.on = 0.01;
        yield 1.2;
        yield cs.say(DIALOGUES.nullLoading);
        g.effects.glitch(0.5, 1.2);
        g.effects.shake(0.4);
        // La cámara muestra el portal que se abre
        s.cameraLock = { x: s.portal.x - SCREEN.W + 48, y: s.camera.y };
        yield 0.5;
        playSfx(g.audio, 'portalOpen');
        s.portal.opening = true;
        yield 1.4;
        s.cameraLock = null;
      },
      {
        onSkip: () => {
          s.screen.on = 1;
          s.portal.open = 1;
          s.cameraLock = null;
        },
        onEnd: () => {
          s.portal.open = Math.max(s.portal.open, 0.01);
          s.portal.opening = true;
        },
      },
    );
  }

  // ---------- Actualización ----------
  levelUpdate(dt) {
    if (this.staffTaken) this.staffT += dt;
    const sl = this.sysLine;
    if (sl) {
      sl.t += dt;
      for (const ch of sl.tw.update(dt)) if (ch !== ' ') playSfx(this.game.audio, 'key');
      if (sl.t > sl.time) this.sysLine = null;
    }
    if (this.screen.on > 0) {
      this.screen.on = Math.min(1, this.screen.on + dt * 1.5);
      this.screen.t += dt;
    }
    if (this.portal.opening) this.portal.open = Math.min(1, this.portal.open + dt * 1.2);
    // Ayudas de disparo: aparecen al tener el báculo y se van al usarlo
    const c = this.choco;
    const h = this.hints;
    if (c.items.staff && !this.cutscene && this.game.input.pressed('shoot')) h.shotOnce = true;
    const showShoot = c.items.staff && !h.shotOnce && !this.cutscene && this.game.top === this;
    h.shoot = showShoot ? Math.min(1, h.shoot + dt * 3) : Math.max(0, h.shoot - dt * 2);
    const nearWall = Math.abs(c.footX - LOAD.wall.x * TS) < 110 && !h.charged;
    h.charge = nearWall && !this.cutscene ? Math.min(1, h.charge + dt * 3) : Math.max(0, h.charge - dt * 2);
  }

  afterChocoMove() {
    const c = this.choco;
    if (!this.nullDone && c.state === 'play' && c.footX > LOAD.nullTrigger * TS && c.body.onGround) this.startNullSpeech();
    const p = this.portal;
    if (p.open >= 1 && !this.ending && c.state === 'play' && aabbOverlap(c.body, { x: p.x - 8, y: p.y - 32, w: 16, h: 32 })) {
      playSfx(this.game.audio, 'portalEnter');
      this.particles.burst(c.cx, c.cy, 30, { speedMin: 30, speedMax: 100, colors: ['#FF2E88', '#43D9FF', '#FFFFFF'], lifeMin: 0.3, lifeMax: 0.8 });
      this.finishLevel({ delay: 1.4, onFinish: () => this.game.flow.completePrologue(this.game, this.completeStats()) });
      this.ending.color = '#000000';
      this.game.effects.glitch(1.2, 1.2);
    }
  }

  // Los wireframes se rellenan cuando Choco se acerca
  reveal(tx) {
    const d = Math.abs(tx * TS + 8 - this.choco.footX);
    const P = PROLOGUE;
    if (d <= P.WIRE_REVEAL_FULL) return 1;
    if (d >= P.WIRE_REVEAL_DIST) return 0;
    return 1 - (d - P.WIRE_REVEAL_FULL) / (P.WIRE_REVEAL_DIST - P.WIRE_REVEAL_FULL);
  }

  // ---------- Dibujo ----------
  drawBackground(ctx, cx, cy) {
    drawLoadingBackground(ctx, cx, cy, this.t, (bx, by) => {
      drawText(ctx, TEXTS.prologue.loadingWorld, bx + 110, by + 18, { align: 'center', color: '#1E2A40', shadow: false });
    });
    this.drawGiantScreen(ctx, cx, cy);
  }

  // Pantalla gigante al fondo (parallax 0.5)
  drawGiantScreen(ctx, cx, cy) {
    const w = LOAD.screen.w * TS;
    const h = 72;
    const x = Math.round(LOAD.screen.x * TS - cx * 0.5 - (LOAD.screen.x * TS) * 0.5 + 40);
    const y = Math.round(18 - cy * 0.5);
    if (x > SCREEN.W || x + w < 0) return;
    ctx.fillStyle = '#141828';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = LOADING.wire;
    ctx.fillRect(x - 4, y - 4, w + 8, 1);
    ctx.fillRect(x - 4, y + h + 3, w + 8, 1);
    ctx.fillRect(x - 4, y - 4, 1, h + 8);
    ctx.fillRect(x + w + 3, y - 4, 1, h + 8);
    // Soportes
    ctx.fillStyle = '#10131F';
    ctx.fillRect(x + 20, y + h + 4, 4, 60);
    ctx.fillRect(x + w - 24, y + h + 4, 4, 60);
    if (this.screen.on <= 0) {
      ctx.fillStyle = '#0B0D16';
      ctx.fillRect(x, y, w, h);
      return;
    }
    drawNullScreen(ctx, x, y, w, h, { t: this.t, open: this.screen.on, wings: true, glitch: 0.5, static: 1 - this.screen.on, look: Math.sin(this.t * 0.8) * 0.5, angry: this.cutscene && this.screen.t > 6 });
  }

  drawTiles(ctx, cx, cy) {
    drawLoadingTiles(ctx, this.map, cx, cy, this.t, false, (tx) => this.reveal(tx));
  }

  drawWorld(ctx, cx, cy) {
    this.drawStaffRock(ctx, cx, cy);
    this.drawWallHint(ctx, cx, cy);
    drawGlitchPortal(ctx, this.portal.x - cx, this.portal.y - cy, 36, this.t, this.portal.open);
  }

  // Roca de código con el báculo clavado
  drawStaffRock(ctx, cx, cy) {
    const x = Math.round((LOAD.staff.x + 1) * TS - cx);
    const y = Math.round(LOAD.staff.y * TS - cy);
    drawText(ctx, '{ }', x, y + 4, { align: 'center', color: '#3A4A6A', shadow: false });
    drawText(ctx, '</>', x, y - 4 + 12, { align: 'center', color: '#2A3450', shadow: false });
    if (this.staffTaken) return;
    // Báculo inclinado, con el núcleo latiendo
    const pulse = (Math.sin(this.t * 4) + 1) / 2;
    ctx.fillStyle = '#4E4868';
    for (let i = 0; i < 18; i++) ctx.fillRect(x - 1 + Math.floor(i / 7), y - 1 - i, 2, 1);
    ctx.fillStyle = '#8A83A8';
    ctx.fillRect(x + 1, y - 19, 3, 2);
    ctx.globalAlpha = 0.3 + pulse * 0.4;
    ctx.fillStyle = '#43D9FF';
    ctx.fillRect(x - 1, y - 27, 7, 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pulse > 0.5 ? '#FFFFFF' : '#DFFAFF';
    ctx.fillRect(x + 1, y - 25, 3, 3);
    if (R.chance(0.15)) this.particles.spawn({ x: x + cx + 2 + R.range(-6, 6), y: y + cy - 22 + R.range(-6, 6), vy: -15, life: 0.6, colors: ['#43D9FF', '#FFFFFF'], front: false });
  }

  // Sobre el muro: el báculo brilla cargándose (enseña a mantener el disparo)
  drawWallHint(ctx, cx, cy) {
    const a = this.hints.charge;
    if (a <= 0 || !this.choco.items.staff) return;
    const x = Math.round(LOAD.wall.x * TS + 8 - cx);
    const y = Math.round(LOAD.wall.top * TS - 22 - cy);
    const cyc = (this.t % 2.2) / STAFF.CHARGE_TIME;
    const p = Math.min(1, cyc);
    ctx.globalAlpha = a;
    // Báculo horizontal con brillo que crece
    ctx.fillStyle = '#4E4868';
    ctx.fillRect(x - 12, y, 14, 2);
    ctx.fillStyle = '#8A83A8';
    ctx.fillRect(x + 2, y - 1, 2, 4);
    const r = Math.round(1 + p * 4);
    ctx.fillStyle = p >= 1 && Math.floor(this.t * 16) % 2 ? '#FFFFFF' : '#43D9FF';
    for (let yy = -r; yy <= r; yy++) {
      const hw = Math.round(Math.sqrt(r * r - yy * yy));
      ctx.fillRect(x + 6 - hw, y + 1 + yy, hw * 2 + 1, 1);
    }
    drawHoldRing(ctx, x - 20, y + 1, p, UI.cyan);
    drawText(ctx, this.game.input.keyName('shoot'), x - 20, y - 2, { align: 'center', color: UI.text, shadow: false });
    ctx.globalAlpha = 1;
  }

  drawUi(ctx) {
    const c = this.choco;
    if (this.sysLine) {
      const sl = this.sysLine;
      const a = Math.min(1, sl.t * 3, (sl.time - sl.t) * 2);
      drawSystemLine(ctx, sl.text, sl.tw.shown, a, 24);
    }
    if (this.hints.shoot > 0) {
      drawHintBubble(ctx, c.footX - this.camera.rx, c.footY - 26 - this.camera.ry, `${this.game.input.keyName('shoot')} ${TEXTS.prologue.shoot}`, this.hints.shoot);
    }
  }
}
