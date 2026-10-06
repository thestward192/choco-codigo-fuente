// Base de los niveles cenitales (nivel 2 y, más adelante, el 3): Choco cenital, salas con
// tilemap, cámara, objetos con los que se interactúa (E), NPCs, carteles, pausa, cinemáticas,
// avisos, HUD y final del nivel. Las subclases arman las salas y su lógica.
import { Scene } from '../core/game.js';
import { SCREEN, LIVES, HEALTH, TOPDOWN, HOTFIX } from '../config/balance.js';
import { Camera } from '../core/camera.js';
import { Particles } from '../core/particles.js';
import { Hud } from '../ui/hud.js';
import { Laptop } from '../items/laptop.js';
import { TopdownChoco } from '../entities/topdownChoco.js';
import { drawText, drawTextBox } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx, debugHum } from '../audio/sfx.js';
import { Cutscene } from '../systems/cutscene.js';
import { hasItem, maxHpFor, goldenFor, devLoadout, hotfixSkips } from '../game/progress.js';
import { PauseScene } from '../scenes/PauseScene.js';
import { damp } from '../core/tween.js';
import { fxRng } from '../core/rng.js';

const TS = SCREEN.TILE;

export class TopdownLevel extends Scene {
  constructor(game, { levelId = null } = {}) {
    super(game);
    this.levelId = levelId;
    this.lives = LIVES.START;
    this.bits = 0;
    this.stats = { time: 0, deaths: 0 };
    this.goldenY = [false, false, false];
    this.goldenHad = this.session && levelId !== null ? goldenFor(this.session.data, levelId) : [false, false, false];
    this.particles = new Particles(700);
    this.camera = new Camera();
    this.hud = new Hud();
    this.laptop = new Laptop();
    this.t = 0;
    this.npcs = [];
    this.bugs = [];
    this.pickups = [];
    this.shelves = [];
    this.interactables = [];
    this.banner = null;
    this.roomLabel = null;
    this.cutscene = null;
    this.ending = null;
    this.signText = null;
    this.choco = new TopdownChoco(this, 0, 0);
    const lo = this.startingLoadout();
    this.choco.items = lo.items;
    this.maxHp = lo.maxHp;
  }

  get session() {
    return this.game.session;
  }

  get founders() {
    return this.session ? this.session.data.founders : [];
  }

  startingLoadout() {
    const d = this.session?.data;
    const items = { staff: true, boots: !d, laptop: false, shield: false, lasso: false };
    if (d) for (const k of Object.keys(items)) if (k !== 'staff') items[k] = hasItem(d, k);
    // Sin partida (atajo de desarrollo): con las Botas y el cuadrito de Óscar
    let lo = { items, maxHp: d ? maxHpFor(d) : HEALTH.START_MAX + 1 };
    if (this.game.devMode && this.levelId !== null) lo = devLoadout(lo, this.levelId);
    if (this.game.hotfix) lo.maxHp = HOTFIX.MAX_HP;
    return lo;
  }

  // Modo Hotfix: la mitad de los checkpoints no cuentan
  checkpointOff(id) {
    return this.game.hotfix && hotfixSkips(this.levelId, id);
  }

  setMap(map) {
    this.map = map;
    this.camera.setBounds(0, 0, map.pxW, map.pxH);
  }

  // Obstáculos dinámicos para el movimiento de Choco
  obstacles() {
    const out = [];
    for (const n of this.npcs) out.push(n.rect);
    for (const s of this.shelves) out.push(s.rect);
    return out;
  }

  cellBlocked(tx, ty) {
    return this.shelves.some((s) => s.tx === tx && s.ty === ty) || this.npcs.some((n) => Math.floor(n.x / TS) === tx && Math.floor((n.y - 2) / TS) === ty);
  }

  // ---------- Interacción ----------
  // o: { x, y (punto en px), range?, onUse(o), disabled?, hint? }
  addInteractable(o) {
    const it = { range: TOPDOWN.INTERACT_RANGE, near: false, t: 0, ...o };
    this.interactables.push(it);
    return it;
  }

  updateInteractables(dt) {
    const c = this.choco;
    let best = null;
    let bestD = Infinity;
    const free = c.state === 'play' && !this.cutscene && !this.ending && !this.encounter;
    for (const o of this.interactables) {
      if (!free || o.disabled) continue;
      const d = Math.hypot(o.x - c.lookX, o.y - c.lookY);
      if (d < o.range && d < bestD) {
        best = o;
        bestD = d;
      }
    }
    for (const o of this.interactables) {
      o.near = o === best;
      o.t = o.near ? Math.min(1, o.t + dt * 6) : Math.max(0, o.t - dt * 6);
    }
    if (best && this.game.input.pressed('interact')) {
      c.interactT = 0.25;
      playSfx(this.game.audio, 'interact');
      best.onUse(best);
    }
  }

  // ---------- Cinemáticas, avisos ----------
  freezeChoco() {
    const c = this.choco;
    if (c.state === 'play') c.state = 'frozen';
    c.body.vx = 0;
    c.body.vy = 0;
  }

  playCutscene(genFn, { onEnd = null, onSkip = null, skippable = true, keepHud = false, bars = true } = {}) {
    if (!keepHud) this.hud.visible = false;
    this.freezeChoco();
    this.cutscene = new Cutscene(this, genFn, {
      skippable,
      onSkip,
      onEnd: () => {
        this.cutscene = null;
        this.hud.visible = true;
        if (this.choco.state === 'frozen') this.choco.state = 'play';
        onEnd?.();
      },
    });
    this.cutscene.noBars = !bars;
  }

  // Diálogo corto sin cinemática (NPCs): congela a Choco mientras dura
  say(lines, onDone = null) {
    this.playCutscene(
      function* (cs) {
        yield cs.say(lines);
      },
      { keepHud: true, bars: false, skippable: false, onEnd: onDone },
    );
  }

  showBanner(title, sub = '', onDone = null, time = 2.2) {
    this.banner = { title, sub, t: 0, time, onDone };
  }

  showRoomLabel(text) {
    this.roomLabel = { text, t: 0 };
  }

  // ---------- Pausa ----------
  onSuspend() {
    if (this.canPause()) this.openPause();
  }

  canPause() {
    return !this.cutscene && !this.ending && !this.encounter && !this.game.transitioning && this.game.top === this;
  }

  cover() {
    this.hum = debugHum(this.game.audio, this.hum, false);
  }

  exit() {
    this.hum = debugHum(this.game.audio, this.hum, false);
  }

  openPause() {
    this.game.push(new PauseScene(this.game, this));
  }

  quitToMap() {
    this.game.flow.quitLevel(this.game, this.levelId, { ...this.stats });
  }

  // ---------- Final del nivel ----------
  finishLevel({ delay = 1.6, color = '#FFFFFF' } = {}) {
    if (this.ending) return;
    this.ending = { t: 0, delay, color };
    this.freezeChoco();
    this.hud.visible = false;
    this.game.audio.stopMusic(0.6);
  }

  completeStats() {
    return { ...this.stats, bits: this.bits, goldenY: [...this.goldenY] };
  }

  // ---------- Actualización ----------
  update(dt) {
    const g = this.game;
    this.t += dt;
    if (g.input.pressed('pause') && this.canPause()) {
      this.openPause();
      return;
    }
    if (!this.ending && !this.cutscene) this.stats.time += dt;
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.time) {
        const done = this.banner.onDone;
        this.banner = null;
        done?.();
      }
    }
    if (this.roomLabel) {
      this.roomLabel.t += dt;
      if (this.roomLabel.t > 2.2) this.roomLabel = null;
    }
    if (this.cutscene) this.cutscene.update(dt);
    if (this.choco.items.laptop) {
      const active = this.laptop.update(dt, g.input.down('debug') && this.choco.state === 'play' && !this.cutscene);
      if (this.laptop.justToggled) playSfx(g.audio, active ? 'debugOn' : 'debugOff');
      this.hum = debugHum(g.audio, this.hum, active);
    }
    // Modo Hotfix: 1 cuadrito fijo (aunque se rescate a un fundador)
    if (g.hotfix && this.maxHp > HOTFIX.MAX_HP) {
      this.maxHp = HOTFIX.MAX_HP;
      this.choco.hp = Math.min(this.choco.hp, this.maxHp);
    }
    this.choco.update(dt, g.input);
    for (const n of this.npcs) n.update(dt);
    for (const s of this.shelves) s.update(dt);
    for (const p of this.pickups) p.update(dt);
    this.levelUpdate(dt);
    this.updateInteractables(dt);
    if (this.ending) {
      const e = this.ending;
      e.t += dt;
      if (e.t >= e.delay && !e.sent) {
        e.sent = true;
        this.game.flow.completeLevel(g, this.levelId, this.completeStats());
      }
    }
    this.particles.update(dt);
    this.updateCamera(dt);
    this.hud.update(dt, this.hudState());
  }

  levelUpdate() {}

  updateCamera(dt, snap = false) {
    const c = this.choco;
    // cameraFocus: punto fijo para cinemáticas (si no, sigue a Choco)
    const f = this.cameraFocus;
    const tx = (f ? f.x : c.footX) - SCREEN.W / 2;
    const ty = (f ? f.y : c.footY - 8) - SCREEN.H / 2;
    if (snap) {
      this.camera.x = tx;
      this.camera.y = ty;
    } else {
      this.camera.x = damp(this.camera.x, tx, TOPDOWN.CAMERA_LERP, dt);
      this.camera.y = damp(this.camera.y, ty, TOPDOWN.CAMERA_LERP, dt);
    }
    this.camera._clamp();
  }

  hudState() {
    const c = this.choco;
    return {
      hp: c.hp ?? this.maxHp,
      maxHp: this.maxHp,
      coating: false,
      items: c.items,
      lives: this.lives,
      bits: this.bits,
      goldenY: this.goldenY,
      laptop: c.items.laptop ? this.laptop : null,
    };
  }

  // ---------- Dibujo ----------
  draw(ctx) {
    const g = this.game;
    const cam = this.camera;
    cam.offsetX = g.effects.shakeX;
    cam.offsetY = g.effects.shakeY;
    const cx = cam.rx;
    const cy = cam.ry;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    this.drawTiles(ctx, cx, cy);
    this.drawFloorDecor(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, false);
    // Entidades ordenadas por profundidad (los pies)
    const list = [];
    for (const p of this.pickups) list.push({ y: p.y, d: () => p.draw(ctx, cx, cy) });
    for (const n of this.npcs) list.push({ y: n.y, d: () => n.draw(ctx, cx, cy) });
    for (const b of this.bugs) list.push({ y: b.y, d: () => b.draw(ctx, cx, cy) });
    for (const s of this.shelves) list.push({ y: s.drawPos().y + TS - 1, d: () => s.draw(ctx, cx, cy, this.shelfOnMark?.(s)) });
    if (!this.hideChoco) list.push({ y: this.choco.footY, d: () => this.choco.draw(ctx, cx, cy) });
    this.addDrawables?.(list, ctx, cx, cy);
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.d();
    this.particles.draw(ctx, cx, cy, true);
    this.drawForeground(ctx, cx, cy);
    for (const o of this.interactables) if (o.t > 0 && !this.cutscene) this.drawInteractHint(ctx, o, cx, cy);
    if (this.laptop.active || this.forceDebugView) this.drawDebugView(ctx, cx, cy);
    if (this.cutscene && !this.cutscene.noBars) {
      const k = Math.min(1, this.cutscene.t * 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN.W, Math.round(14 * k));
      ctx.fillRect(0, SCREEN.H - Math.round(14 * k), SCREEN.W, Math.round(14 * k));
    }
    this.hud.draw(ctx, this.hudState());
    this.drawUi(ctx);
    if (this.roomLabel) this.drawRoomLabel(ctx, this.roomLabel);
    if (this.signText) this.drawSignText(ctx, this.signText);
    if (this.banner) this.drawBanner(ctx, this.banner);
    if (this.cutscene) this.cutscene.draw(ctx);
    if (this.ending) {
      const e = this.ending;
      ctx.globalAlpha = Math.min(1, Math.max(0, (e.t - (e.delay - 0.8)) / 0.8));
      ctx.fillStyle = e.color;
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
  }

  drawTiles() {}
  drawFloorDecor() {}
  drawForeground() {}
  drawUi() {}

  drawInteractHint(ctx, o, cx, cy) {
    const x = Math.round(o.x - cx);
    const y = Math.round(o.y - cy - (o.hintH ?? 22)) + Math.round(Math.sin(this.t * 6));
    ctx.globalAlpha = o.t;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 5, y - 1, 11, 10);
    ctx.fillStyle = UI.yellow;
    ctx.fillRect(x - 5, y - 1, 11, 1);
    drawText(ctx, this.game.input.keyName('interact'), x + 1, y, { align: 'center', color: UI.yellow, shadow: false });
    ctx.globalAlpha = 1;
  }

  drawRoomLabel(ctx, l) {
    const a = Math.min(1, l.t * 4, (2.2 - l.t) * 3);
    const slide = Math.round((1 - Math.min(1, l.t * 4)) * 20);
    ctx.globalAlpha = a * 0.75;
    ctx.fillStyle = '#07070C';
    const w = 150;
    const x = SCREEN.W / 2 - w / 2;
    ctx.fillRect(x, 150 + slide, w, 14);
    ctx.globalAlpha = a;
    ctx.fillStyle = UI.cyan;
    ctx.fillRect(x, 150 + slide, w, 1);
    drawText(ctx, l.text, SCREEN.W / 2, 154 + slide, { align: 'center', color: UI.text });
    ctx.globalAlpha = 1;
  }

  drawSignText(ctx, s) {
    const w = 238;
    const x = SCREEN.W - w - 4;
    const y = 18;
    const a = Math.min(1, s.t * 6);
    ctx.globalAlpha = 0.88 * a;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x, y, w, 26);
    ctx.globalAlpha = a;
    ctx.fillStyle = UI.cyan;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + 25, w, 1);
    drawTextBox(ctx, s.text, x + 6, y + 4, w - 12, { color: UI.text });
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, b) {
    const t = b.t;
    const inT = Math.min(1, t / 0.25);
    const outT = Math.max(0, (t - (b.time - 0.3)) / 0.3);
    const a = inT * (1 - outT);
    ctx.globalAlpha = 0.6 * a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 60, SCREEN.W, 44);
    ctx.globalAlpha = a;
    const slide = Math.round((1 - inT) * 30);
    drawText(ctx, b.title, SCREEN.W / 2 - slide, 68, { align: 'center', bold: true, color: UI.yellow });
    if (b.sub) drawText(ctx, b.sub, SCREEN.W / 2 + slide, 86, { align: 'center', color: UI.text });
    ctx.globalAlpha = 1;
  }

  drawDebugView(ctx, cx, cy) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#0A2A7A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = UI.cyan;
    for (let x = -(((cx % TS) + TS) % TS); x < SCREEN.W; x += TS) ctx.fillRect(x, 0, 1, SCREEN.H);
    for (let y = -(((cy % TS) + TS) % TS); y < SCREEN.H; y += TS) ctx.fillRect(0, y, SCREEN.W, 1);
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, Math.floor((this.t * 90) % SCREEN.H), SCREEN.W, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#9FE8FF';
    for (let i = 0; i < 6; i++) ctx.fillRect(fxRng.int(0, SCREEN.W), fxRng.int(0, SCREEN.H), 1, 1);
    this.drawDebugReveal?.(ctx, cx, cy);
  }
}
