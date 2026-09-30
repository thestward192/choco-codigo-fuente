// Sala de pruebas: física de Choco, báculo, vida, enemigos, pickups y cámara (Hito 1),
// y desde el Hito 2 también funciona como nivel de reemplazo: pausa, checkpoints que guardan,
// Y doradas, salida con resultados, Game Over, terminal con diálogos y objeto obtenido.
import { Scene } from '../core/game.js';
import { SCREEN, LIVES, HEALTH } from '../config/balance.js';
import { Tilemap } from '../systems/tilemap.js';
import { aabbOverlap, isStomp } from '../systems/physics.js';
import { Camera } from '../core/camera.js';
import { Particles } from '../core/particles.js';
import { Choco } from '../entities/choco.js';
import { Shot } from '../entities/projectile.js';
import { Byteling } from '../entities/enemies/byteling.js';
import { Pickup } from '../entities/pickups.js';
import { Laptop } from '../items/laptop.js';
import { Hud } from '../ui/hud.js';
import { buildTestRoom, SIGNS } from '../levels/testroom/map.js';
import { drawLoadingTiles, drawLoadingBackground } from '../art/tiles/loading.js';
import { drawText, drawTextBox } from '../art/font.js';
import { UI, LOADING } from '../art/palettes.js';
import { TEXTS, DIALOGUES } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { SONG_PRUEBA } from '../audio/songs/prueba.js';
import { fxRng } from '../core/rng.js';
import { Cutscene } from '../systems/cutscene.js';
import { hasItem, maxHpFor, goldenFor, setCheckpoint } from '../game/progress.js';
import { PauseScene } from './PauseScene.js';
import { ItemGetScene } from './ItemGetScene.js';
import { Flow } from '../game/flow.js';

const TS = SCREEN.TILE;
const SIGN_RANGE = 22;
const INTERACT_RANGE = 20;
const EXIT_DELAY = 1.6;

export class TestRoomScene extends Scene {
  // levelId: nivel que representa (null = sala de pruebas suelta, sin partida)
  constructor(game, { levelId = null } = {}) {
    super(game);
    this.levelId = levelId;
    this.lives = LIVES.START;
    this.bits = 0;
    this.stats = { time: 0, deaths: 0 };
    this.goldenY = [false, false, false];
    this._onKey = (e) => {
      if (e.code === 'KeyR' && !this.game.session) this.restartKey = true;
    };
    this.build();
  }

  get session() {
    return this.game.session;
  }

  get founders() {
    return this.session ? this.session.data.founders : [];
  }

  // Objetos y vida según la partida (o los valores de prueba si no hay partida)
  startingLoadout() {
    const d = this.session?.data;
    const items = { staff: true, boots: false, laptop: false, shield: false, lasso: false };
    if (d) for (const k of Object.keys(items)) if (k !== 'staff') items[k] = hasItem(d, k);
    return { items, maxHp: d ? maxHpFor(d) : HEALTH.START_MAX };
  }

  build() {
    this.map = new Tilemap(buildTestRoom());
    this.particles = new Particles(900);
    this.camera = new Camera();
    this.camera.setBounds(0, 0, this.map.pxW, this.map.pxH);
    this.shots = [];
    this.enemies = [];
    this.pickups = [];
    this.signs = [];
    this.hud = new Hud();
    this.laptop = new Laptop();
    this.t = 0;
    this.banner = null;
    this.cutscene = null;
    this.ending = null;
    this.hudDemo = false;
    const m = this.map;
    const start = m.find('P')[0];
    this.spawn = { x: start.tx * TS + TS / 2, y: (start.ty + 1) * TS };
    for (const [ch, id] of Object.entries(SIGNS)) {
      for (const { tx, ty } of m.find(ch)) this.signs.push({ x: tx * TS + 8, y: (ty + 1) * TS, id, text: TEXTS.testRoom.signs[id], t: 0, flash: 0 });
    }
    this.signs.sort((a, b) => a.x - b.x);
    this.signs.forEach((s, i) => (s.index = i));
    // Checkpoint guardado de este nivel
    this.checkpoint = { ...this.spawn, index: -1 };
    const cp = this.session?.data.checkpoint;
    if (cp && cp.level === this.levelId && this.signs[cp.id]) {
      const s = this.signs[cp.id];
      this.checkpoint = { x: s.x, y: s.y, index: s.index };
    }
    const lo = this.startingLoadout();
    this.choco = new Choco(this, this.checkpoint.x, this.checkpoint.y);
    this.choco.items = lo.items;
    this.choco.setMaxHp(lo.maxHp);
    this.choco.hp = lo.maxHp;

    for (const { tx, ty } of m.find('b')) this.enemies.push(new Byteling(tx * TS + 8, (ty + 1) * TS, { dir: -1, turnAtEdges: true }));
    for (const { tx, ty } of m.find('B')) this.enemies.push(new Byteling(tx * TS + 8, (ty + 1) * TS, { dir: -1, turnAtEdges: false }));
    for (const { tx, ty } of m.find('$')) this.pickups.push(new Pickup('bit', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('c')) this.pickups.push(new Pickup('cacao', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('h')) this.pickups.push(new Pickup('chunk', tx * TS + 8, ty * TS + 10));
    if (!this.choco.items.boots) for (const { tx, ty } of m.find('O')) this.pickups.push(new Pickup('boots', tx * TS + 8, ty * TS + 8));
    const had = this.session && this.levelId !== null ? goldenFor(this.session.data, this.levelId) : [false, false, false];
    m.find('Y')
      .sort((a, b) => a.tx - b.tx)
      .forEach(({ tx, ty }, i) => this.pickups.push(new Pickup('goldenY', tx * TS + 8, ty * TS + 8, { index: i, ghost: had[i] })));
    const ex = m.find('X')[0];
    this.exitZone = ex ? { x: ex.tx * TS, y: ex.ty * TS - 16, w: 16, h: 32 } : null;
    const term = m.find('N')[0];
    this.terminal = term ? { x: term.tx * TS + 8, y: (term.ty + 1) * TS, near: false } : null;
    this.camera.snapTo(this.choco.footX, this.choco.footY);
    this.irisIn = { x: 0, y: 0 };
  }

  enter() {
    this.game.audio.playSong(SONG_PRUEBA);
    window.addEventListener('keydown', this._onKey);
  }

  exit() {
    this.game.audio.stopAllSustained();
    window.removeEventListener('keydown', this._onKey);
  }

  // Al perder el foco: abrir la pausa
  onSuspend() {
    this.choco.stopCharge();
    if (this.canPause()) this.openPause();
  }

  canPause() {
    return !this.cutscene && !this.ending && this.choco.alive && !this.game.transitioning && this.game.top === this;
  }

  openPause() {
    this.choco.stopCharge();
    this.game.push(new PauseScene(this.game, this));
  }

  // ---------- API usada por las entidades ----------
  countShots(charged) {
    let n = 0;
    for (const s of this.shots) if (!s.dead && s.charged === charged) n++;
    return n;
  }

  spawnShot(x, y, dir, charged) {
    this.shots.push(new Shot(x, y, dir, charged));
  }

  addBits(n, x, y) {
    this.bits += n;
    if (x !== undefined) {
      this.particles.burst(x, y, n * 3, { speedMin: 20, speedMax: 50, colors: [UI.green, '#E8FFF0'], lifeMin: 0.2, lifeMax: 0.4, angle: -Math.PI / 2, spread: 2 });
    }
    if (this.bits >= LIVES.BITS_PER_LIFE) {
      this.bits -= LIVES.BITS_PER_LIFE;
      this.lives++;
      playSfx(this.game.audio, 'heal');
    }
  }

  collect(p) {
    const g = this.game;
    const a = g.audio;
    const c = this.choco;
    this.particles.burst(p.x, p.y, p.type === 'bit' ? 6 : 16, { speedMin: 20, speedMax: 70, colors: ['#FFFFFF', UI.yellow, UI.green], lifeMin: 0.2, lifeMax: 0.5 });
    if (p.type === 'bit') {
      playSfx(a, 'bit');
      this.addBits(1);
    } else if (p.type === 'cacao') {
      playSfx(a, 'cacao');
      c.coating = true;
      c.setSquash({ X: 1.25, Y: 0.8 });
      this.showBanner(TEXTS.pickups.cacao, TEXTS.pickups.cacaoDesc);
    } else if (p.type === 'chunk') {
      playSfx(a, 'heal');
      c.hp = Math.min(c.maxHp, c.hp + 1);
    } else if (p.type === 'goldenY') {
      playSfx(a, 'goldenY');
      this.goldenY[p.index] = true;
      g.effects.flash('#FFD23F', 3);
      this.particles.burst(p.x, p.y, 24, { speedMin: 30, speedMax: 90, colors: ['#FFD23F', '#FFFFFF', '#B8902A'], lifeMin: 0.3, lifeMax: 0.7 });
      this.showBanner(TEXTS.pickups.goldenY, `${this.goldenY.filter(Boolean).length}/3`, null, 1.4);
    } else if (p.type === 'boots') {
      c.items.boots = true;
      c.stopCharge();
      c.state = 'victory';
      c.anim.t = 0;
      this.hud.visible = false;
      g.push(
        new ItemGetScene(g, 'boots', () => {
          c.state = 'play';
          this.hud.visible = true;
        }),
      );
    }
  }

  showBanner(title, sub, onDone = null, time = 2.2) {
    this.banner = { title, sub, t: 0, time, onDone };
  }

  onChocoDamaged() {}

  // Caer al vacío es muerte (docs/03_mecanicas.md)
  onChocoFell(c) {
    c.dieByFall();
  }

  onChocoDied() {
    this.pendingRespawn = true;
    this.stats.deaths++;
  }

  // Reaparece en el checkpoint. costLife: false al reiniciar desde la pausa.
  respawn(costLife = true) {
    if (costLife) this.lives--;
    if (this.lives <= 0) {
      Flow.gameOver(this.game, this.levelId, { ...this.stats });
      return;
    }
    const items = this.choco.items;
    const maxHp = this.choco.maxHp;
    this.choco = new Choco(this, this.checkpoint.x, this.checkpoint.y);
    this.choco.items = items;
    this.choco.setMaxHp(maxHp);
    this.choco.hp = maxHp;
    this.choco.invuln = 1;
    this.shots = [];
    this.camera.snapTo(this.choco.footX, this.choco.footY);
    this.irisIn.x = Math.round(this.choco.footX - this.camera.rx);
    this.irisIn.y = Math.round(this.choco.cy - this.camera.ry);
  }

  // Desde la pausa
  restartFromCheckpoint() {
    const c = this.choco;
    const center = { x: Math.round(c.footX - this.camera.rx), y: Math.round(c.cy - this.camera.ry) };
    this.game.startTransition({ type: 'iris', center, centerIn: this.irisIn, onMid: () => this.respawn(false) });
  }

  quitToMap() {
    Flow.quitLevel(this.game, this.levelId, { ...this.stats });
  }

  // Tocar un cartel lo vuelve checkpoint (con sonido, destello y guardado)
  activateCheckpoint(s) {
    if (this.checkpoint.index === s.index) return;
    this.checkpoint = { x: s.x, y: s.y, index: s.index };
    s.flash = 0.6;
    playSfx(this.game.audio, 'checkpoint');
    this.particles.burst(s.x, s.y - 14, 10, { speedMin: 20, speedMax: 50, colors: ['#6FE08A', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
    if (this.session && this.levelId !== null) this.session.update(setCheckpoint(this.session.data, this.levelId, s.index));
  }

  // Terminal: prueba de diálogos y cinemática
  talkToTerminal() {
    const g = this.game;
    const c = this.choco;
    this.hud.visible = false;
    c.stopCharge();
    c.state = 'frozen';
    c.body.vx = 0;
    const end = () => {
      this.cutscene = null;
      this.hud.visible = true;
      c.state = 'play';
    };
    this.cutscene = new Cutscene(
      this,
      function* (cs) {
        g.effects.glitch(0.4, 0.8);
        g.effects.shake(0.3);
        playSfx(g.audio, 'glitch');
        yield 0.6;
        yield cs.say(DIALOGUES.testTerminal);
        yield 0.3;
      },
      { onEnd: end },
    );
  }

  // ---------- Depuración ----------
  debugGiveAll() {
    const c = this.choco;
    c.items = { staff: true, boots: true, laptop: true, shield: true, lasso: true };
    c.setMaxHp(HEALTH.MAX_POSSIBLE);
    c.hp = c.maxHp;
    this.pickups = this.pickups.filter((p) => p.type !== 'boots');
  }

  debugLife(d) {
    const c = this.choco;
    c.setMaxHp(c.maxHp + d);
    c.hp = c.maxHp;
  }

  debugHudDemo() {
    this.hudDemo = !this.hudDemo;
  }

  debugInfo() {
    const c = this.choco;
    const b = c.body;
    return [
      `${c.state} · ${c.anim.name}`,
      `x ${b.x.toFixed(1)} y ${b.y.toFixed(1)}`,
      `vx ${b.vx.toFixed(0)} vy ${b.vy.toFixed(0)}`,
      `suelo ${b.onGround ? 'sí' : 'no'} coyote ${c.js.coyote.toFixed(2)}`,
      `carga ${c.chargeT.toFixed(2)} disparos ${this.shots.length}`,
      `partículas ${this.particles.activeCount}`,
    ];
  }

  debugDraw(ctx) {
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    const box = (r, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(r.x - cx) + 0.5, Math.round(r.y - cy) + 0.5, r.w - 1, r.h - 1);
    };
    box(this.choco.body, '#6FE08A');
    for (const e of this.enemies) box(e.body, '#E0343F');
    for (const s of this.shots) box(s, '#43D9FF');
    for (const p of this.pickups) box(p.hitbox, '#FFD23F');
    if (this.exitZone) box(this.exitZone, '#FF2E88');
    const fx = Math.round(this.camera.focusX - cx);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(fx - 12, 0, 1, SCREEN.H);
    ctx.fillRect(fx + 12, 0, 1, SCREEN.H);
  }

  // ---------- Actualización ----------
  update(dt) {
    const g = this.game;
    const inp = g.input;
    this.t += dt;
    const c = this.choco;

    if (inp.pressed('pause') && this.canPause()) {
      this.openPause();
      return;
    }
    if (this.restartKey) {
      this.restartKey = false;
      g.changeScene(() => new TestRoomScene(g, { levelId: this.levelId }), { type: 'glitch' });
    }
    if (!this.ending && !this.cutscene) this.stats.time += dt;

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.time) {
        const done = this.banner.onDone;
        this.banner = null;
        if (done) done();
      }
    }

    if (this.cutscene) this.cutscene.update(dt);

    // Vista Debug
    if (c.items.laptop) {
      const active = this.laptop.update(dt, inp.down('debug') && c.alive && c.state === 'play');
      if (this.laptop.justToggled) playSfx(g.audio, active ? 'interact' : 'menuCancel');
      this.map.ghostSolid = active;
    } else this.map.ghostSolid = false;

    c.update(dt, inp);

    // Respawn tras derretirse
    if (this.pendingRespawn && c.meltDone && !g.transitioning) {
      this.pendingRespawn = false;
      if (this.lives <= 1) {
        this.lives = 0;
        Flow.gameOver(g, this.levelId, { ...this.stats });
        return;
      }
      const center = { x: Math.round(c.footX - this.camera.rx), y: Math.round(c.footY - 8 - this.camera.ry) };
      g.startTransition({ type: 'iris', center, centerIn: this.irisIn, onMid: () => this.respawn() });
    }

    // Enemigos (quietos durante las cinemáticas)
    if (!this.cutscene) {
      for (const e of this.enemies) {
        e.update(dt, this);
        if (!e.active || !c.alive || c.state !== 'play') continue;
        if (aabbOverlap(c.body, e.body)) {
          if (e.stompable && isStomp(c.body, e.body, c.body.vy)) {
            e.stomp(this);
            c.stomp(inp);
          } else {
            c.hurt(e.body.x + e.body.w / 2);
          }
        }
      }
    }

    // Disparos
    for (const s of this.shots) {
      s.update(dt, this);
      if (s.dead) continue;
      for (const e of this.enemies) {
        if (!e.active || !e.shootable || s.hit.has(e)) continue;
        if (aabbOverlap(s, e.body)) {
          e.damage(s.damage, this, s.dir);
          if (s.charged) {
            s.hit.add(e);
            g.effects.hitstop(5);
          } else {
            s.kill(this, false);
            break;
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);

    if (c.state === 'play') for (const p of this.pickups) p.update(dt, this);
    this.pickups = this.pickups.filter((p) => !p.dead);

    // Carteles: el más cercano se muestra solo y se vuelve checkpoint
    this.activeSign = null;
    for (const s of this.signs) {
      const near = c.alive && Math.abs(s.x - c.footX) < SIGN_RANGE && Math.abs(s.y - c.footY) < 24;
      s.t = near ? Math.min(1, s.t + dt * 6) : Math.max(0, s.t - dt * 6);
      if (s.flash > 0) s.flash -= dt;
      if (near) {
        this.activeSign = s;
        if (c.body.onGround) this.activateCheckpoint(s);
      }
    }

    // Terminal (↑ o E)
    if (this.terminal) {
      const tm = this.terminal;
      tm.near = c.state === 'play' && Math.abs(tm.x - c.footX) < INTERACT_RANGE && Math.abs(tm.y - c.footY) < 24;
      if (tm.near && !this.cutscene && (inp.pressed('interact') || inp.pressed('up'))) {
        playSfx(g.audio, 'interact');
        this.talkToTerminal();
      }
    }

    // Salida
    if (this.exitZone && !this.ending && c.state === 'play' && aabbOverlap(c.body, this.exitZone)) {
      this.ending = { t: 0 };
      c.stopCharge();
      c.state = 'victory';
      c.anim.t = 0;
      c.body.vx = 0;
      this.hud.visible = false;
      playSfx(g.audio, 'item');
      g.audio.stopMusic(0.6);
      this.particles.burst(c.cx, c.cy, 30, { speedMin: 30, speedMax: 100, colors: ['#FF2E88', '#43D9FF', '#FFFFFF'], lifeMin: 0.3, lifeMax: 0.8 });
    }
    if (this.ending) {
      this.ending.t += dt;
      if (this.ending.t >= EXIT_DELAY && !this.ending.sent) {
        this.ending.sent = true;
        Flow.completeLevel(g, this.levelId, { ...this.stats, bits: this.bits, goldenY: [...this.goldenY] });
      }
    }

    this.particles.update(dt);
    if (c.state !== 'dead' || c.deathCause !== 'fall') {
      this.camera.follow({ cx: c.footX, cy: c.footY, facing: c.facing, onGround: c.body.onGround || c.state === 'dead', vy: c.body.vy }, dt);
    }
    if (this.cutscene) this.hud.visible = false;
    this.hud.update(dt, this.hudState());
  }

  hudState() {
    const c = this.choco;
    const s = {
      hp: c.hp,
      maxHp: c.maxHp,
      coating: c.coating,
      lives: this.lives,
      bits: this.bits,
      items: c.items,
      goldenY: this.goldenY,
      laptop: c.items.laptop ? this.laptop : null,
      shield: c.items.shield ? { cooldown01: 1 } : null,
      lassoInRange: false,
    };
    if (this.hudDemo) {
      // HUD de prueba (F8 en ?debug=1): todos los elementos específicos de nivel
      const w = (Math.sin(this.t * 0.8) + 1) / 2;
      s.shield = { cooldown01: (this.t % 3.5) / 3.5 };
      s.lassoInRange = Math.floor(this.t) % 2 === 0;
      s.heat = w * 100;
      s.vapor = { charges: 3 - (Math.floor(this.t / 2) % 4), max: 3 };
      s.deadline = Math.max(0, 180 - this.t * 4);
      s.boss = { name: TEXTS.debug.bossDemo, hp01: 1 - ((this.t / 20) % 1), segments: 4 };
    }
    return s;
  }

  // ---------- Dibujo ----------
  draw(ctx) {
    const g = this.game;
    const cam = this.camera;
    cam.offsetX = g.effects.shakeX;
    cam.offsetY = g.effects.shakeY;
    const cx = cam.rx;
    const cy = cam.ry;

    drawLoadingBackground(ctx, cx, cy, this.t, (bx, by) => {
      drawText(ctx, 'CARGANDO SALA DE PRUEBAS... 99 %', bx + 110, by + 18, { align: 'center', color: '#1E2A40', shadow: false });
    });
    drawLoadingTiles(ctx, this.map, cx, cy, this.t, this.map.ghostSolid);
    for (const s of this.signs) this.drawSign(ctx, s, cx, cy);
    if (this.terminal) this.drawTerminal(ctx, cx, cy);
    if (this.exitZone) this.drawExit(ctx, cx, cy);
    for (const p of this.pickups) p.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, false);
    for (const e of this.enemies) e.draw(ctx, cx, cy);
    for (const s of this.shots) s.draw(ctx, cx, cy);
    this.choco.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, true);

    if (this.map.ghostSolid) this.drawDebugView(ctx, cx, cy);

    // Franjas de cine durante la cinemática
    if (this.cutscene) {
      const k = Math.min(1, this.cutscene.t * 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN.W, Math.round(14 * k));
      ctx.fillRect(0, SCREEN.H - Math.round(14 * k), SCREEN.W, Math.round(14 * k));
    }

    this.hud.draw(ctx, this.hudState());
    if (!this.cutscene && this.activeSign && this.activeSign.t > 0.5) this.drawSignText(ctx, this.activeSign);
    if (this.banner) this.drawBanner(ctx, this.banner);
    if (this.cutscene) this.cutscene.draw(ctx);
    if (this.ending) {
      const a = Math.max(0, (this.ending.t - 0.8) / (EXIT_DELAY - 0.8));
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    }
  }

  drawSign(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    const isCp = this.checkpoint.index === s.index;
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
  drawTerminal(ctx, cx, cy) {
    const tm = this.terminal;
    const x = Math.round(tm.x - cx);
    const y = Math.round(tm.y - cy);
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
    if (tm.near && !this.cutscene) {
      const by = y - 32 + Math.round(Math.sin(this.t * 6));
      ctx.fillStyle = '#07070C';
      ctx.fillRect(x - 5, by - 1, 10, 10);
      drawText(ctx, TEXTS.testRoom.interact, x, by, { align: 'center', color: UI.yellow, shadow: false });
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

  drawSignText(ctx, s) {
    const w = 238;
    const x = SCREEN.W - w - 4;
    const y = 4;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x, y, w, 26);
    ctx.globalAlpha = 1;
    ctx.fillStyle = LOADING.cyan;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + 25, w, 1);
    drawTextBox(ctx, s.text, x + 6, y + 4, w - 12, { color: UI.text });
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
    drawText(ctx, b.title, SCREEN.W / 2 - slide, 68, { align: 'center', bold: true, color: UI.yellow, scale: 1 });
    drawText(ctx, b.sub, SCREEN.W / 2 + slide, 86, { align: 'center', color: UI.text });
    ctx.globalAlpha = 1;
  }

  // Filtro de la Vista Debug: azul oscuro, cuadrícula de 16 px y línea de escaneo.
  drawDebugView(ctx, cx, cy) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#0A2A7A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = LOADING.cyan;
    for (let x = -(cx % TS); x < SCREEN.W; x += TS) ctx.fillRect(x, 0, 1, SCREEN.H);
    for (let y = -(cy % TS); y < SCREEN.H; y += TS) ctx.fillRect(0, y, SCREEN.W, 1);
    ctx.globalAlpha = 0.18;
    const sy = Math.floor((this.t * 90) % SCREEN.H);
    ctx.fillRect(0, sy, SCREEN.W, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#9FE8FF';
    for (let i = 0; i < 6; i++) ctx.fillRect(fxRng.int(0, SCREEN.W), fxRng.int(0, SCREEN.H), 1, 1);
  }
}
