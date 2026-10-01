// Nivel 1 · Mundo Cartucho — docs/niveles/nivel_1_mundo_cartucho.md
// Secciones continuas 1-A Pradera → 1-B Cuevas → 1-C Castillo → arena del Guardián del Slot,
// con una sala secreta de bits. Bloques Y, tuberías de datos, puertas, checkpoints, 3 Y doradas,
// rótulos sin "y" y el rescate de Óscar (Botas de Doble Salto).
import { SCREEN, YBLOCK, HEALTH } from '../../config/balance.js';
import { Tilemap, T } from '../../systems/tilemap.js';
import { PlatformLevel } from '../PlatformLevel.js';
import { level1Sections, L1_LEGEND, L1_CHECKPOINTS } from './maps.js';
import { drawCartuchoTiles, cartuchoTiles } from '../../art/tiles/cartucho.js';
import { drawPraderaBg, drawCuevasBg, drawCastilloBg } from '../../art/backgrounds/cartucho.js';
import { drawNullEye } from '../../art/null.js';
import { founderSprite } from '../../art/portraits.js';
import { itemSprites } from '../../art/items.js';
import { drawText } from '../../art/font.js';
import { drawHintBubble } from '../../ui/hints.js';
import { Byteling } from '../../entities/enemies/byteling.js';
import { Disquete } from '../../entities/enemies/disquete.js';
import { Blindado } from '../../entities/enemies/blindado.js';
import { Mosquito } from '../../entities/enemies/mosquito.js';
import { SpamBlock } from '../../entities/enemies/spam.js';
import { CablePelado, StaticBar, Geyser, FallingPlatform, MovingPlatform } from '../../entities/hazards.js';
import { Guardian } from '../../entities/bosses/guardian.js';
import { Pickup } from '../../entities/pickups.js';
import { ItemGetScene } from '../../scenes/ItemGetScene.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { ACCENTS, UI } from '../../art/palettes.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_CARTUCHO, SONG_CUEVAS, SONG_CASTILLO, SONG_GUARDIAN } from '../../audio/songs/cartucho.js';
import { fxRng } from '../../core/rng.js';
import { Ease } from '../../core/tween.js';

const TS = SCREEN.TILE;
const R = fxRng;
const MUSIC = { A: SONG_CARTUCHO, B: SONG_CUEVAS, secret: SONG_CUEVAS, C: SONG_CASTILLO, arena: null };
// Índice de la Y dorada de cada sección
const GOLDEN_INDEX = { A: 0, secret: 1, C: 2 };
const Y_BLOCKS = new Set(['Q', 'C', 'M', 'H', 'i']);

export class Level1Scene extends PlatformLevel {
  constructor(game) {
    super(game, { levelId: 1 });
    this.sections = level1Sections();
    this.bumps = new Map();
    this.pops = [];
    this.multi = new Map();
    this.cascade = [];
    this.pipe = null;
    this.door = null;
    this.sigh = null;
    this.rescued = this.founders.includes('oscar');
    // Checkpoint guardado
    const cp = this.session?.data.checkpoint;
    const saved = cp && cp.level === 1 ? L1_CHECKPOINTS.find((c) => c.id === cp.id) : null;
    if (saved) {
      this.loadSection(saved.section, { entry: 'checkpoint', id: saved.id });
    } else this.loadSection('A', { entry: 'start' });
  }

  enter() {
    this.playSectionMusic();
  }

  playSectionMusic() {
    const song = MUSIC[this.section.id];
    if (song) this.game.audio.playSong(song);
  }

  // ---------- Construcción de secciones ----------
  loadSection(id, { entry = 'start', id: cpId = null, keepChoco = false } = {}) {
    const S = this.sections[id];
    this.section = S;
    this.theme = S.theme;
    this.setMap(new Tilemap([...S.rows], L1_LEGEND));
    this.enemies = [];
    this.hazards = [];
    this.pickups = [];
    this.signs = [];
    this.interactables = [];
    this.shots = [];
    this.bumps.clear();
    this.multi.clear();
    this.cascade = [];
    this.pops = [];
    this.boss = null;
    this.cameraLock = null;
    this.bossDoor = null;
    this.exitDoor = null;
    this.torches = S.torches || [];
    this.cage = null;
    this.oscar = null;
    this.populate(S);

    // Dónde aparece Choco
    let x;
    let y;
    if (entry === 'checkpoint') {
      const s = this.signs.find((q) => q.checkpoint && q.id === cpId);
      x = s.x;
      y = s.y;
      this.checkpoint = { x, y, id: cpId, section: id };
    } else if (entry === 'start') {
      const p = this.map.find('P')[0];
      x = p.tx * TS + 8;
      y = (p.ty + 1) * TS;
      this.checkpoint = { x, y, id: -1, section: id };
    } else if (entry === 'pipe' || entry === 'secretBack') {
      const pipe = entry === 'secretBack' ? S.secretPipe : S.entry;
      x = (pipe.x + 1) * TS;
      y = pipe.top * TS;
      this.pipe = { mode: 'out', t: 0, x: pipe.x, top: pipe.top };
    } else if (entry === 'door') {
      x = S.entry.x * TS + 8;
      y = this.groundTop(S.entry.x) * TS;
      this.door = { mode: 'close', t: 0, x: S.entry.x * TS - 8, y };
    } else if (entry === 'arena') {
      x = 2 * TS + 8;
      y = S.floor * TS;
    }
    if (!keepChoco || !this.choco) this.placeChoco(x, y);
    else {
      const c = this.choco;
      c.body.x = x - c.body.w / 2;
      c.body.y = y - c.body.h;
      c.body.vx = 0;
      c.body.vy = 0;
      c.body.platform = null;
      c.state = 'play';
      this.camera.snapTo(c.footX, c.footY);
    }
    if (this.pipe) {
      this.choco.state = 'frozen';
      this.choco.body.y += 24;
      this.hideChoco = false;
    }
    if (id === 'arena') this.startArena();
    else this.playSectionMusic();
  }

  populate(S) {
    const m = this.map;
    const at = (tx, ty) => ({ x: tx * TS + 8, y: (ty + 1) * TS });
    for (const { tx, ty } of m.find('b')) this.enemies.push(new Byteling(at(tx, ty).x, at(tx, ty).y, { dir: -1, turnAtEdges: true }));
    for (const { tx, ty } of m.find('n')) this.enemies.push(new Byteling(at(tx, ty).x, at(tx, ty).y, { dir: -1, turnAtEdges: false }));
    for (const { tx, ty } of m.find('d')) this.enemies.push(new Disquete(at(tx, ty).x, at(tx, ty).y, { dir: -1 }));
    for (const { tx, ty } of m.find('a')) this.enemies.push(new Blindado(at(tx, ty).x, at(tx, ty).y, { dir: -1 }));
    for (const { tx, ty } of m.find('m')) this.enemies.push(new Mosquito(tx * TS + 8, ty * TS + 8, { phase: R.next() }));
    for (const { tx, ty } of m.find('S')) this.enemies.push(new SpamBlock(tx * TS + 8, ty * TS));
    for (const { tx, ty } of m.find('$')) this.pickups.push(new Pickup('bit', tx * TS + 8, ty * TS + 8));
    const gi = GOLDEN_INDEX[S.id];
    for (const { tx, ty } of m.find('Y')) {
      if (gi !== undefined && !this.goldenY[gi]) this.pickups.push(new Pickup('goldenY', tx * TS + 8, ty * TS + 8, { index: gi, ghost: this.goldenGhost(gi) }));
    }
    // Checkpoints (banderas) en orden de izquierda a derecha
    const cps = L1_CHECKPOINTS.filter((c) => c.section === S.id);
    m.find('!')
      .sort((a, b) => a.tx - b.tx)
      .forEach(({ tx, ty }, i) => {
        if (!cps[i]) return;
        this.addSign(tx * TS + 8, (ty + 1) * TS, null, { checkpoint: true, id: cps[i].id, section: S.id, draw: this.drawFlag });
      });
    // Rótulos
    const groundTop = (tx) => this.groundTop(tx);
    for (const s of S.signs || []) this.addSign(s.x * TS + 8, groundTop(s.x) * TS, TEXTS.level1.signs[s.key], { draw: this.drawWorldSign });
    // Parámetros por lista
    for (const c of S.cables || []) this.hazards.push(new CablePelado(c.x * TS + 8, groundTop(Math.floor(c.x)) * TS, c.phase));
    for (const f of S.formations || []) {
      [-14, 0, 14].forEach((dy, i) => this.enemies.push(new Mosquito(f.x * TS + i * 14, f.y * TS + dy, { phase: i / 3, range: 30 })));
    }
    for (const q of S.mosquitos || []) this.enemies.push(new Mosquito(q.x * TS, q.y * TS, { phase: q.phase ?? 0 }));
    for (const p of S.moving || []) this.hazards.push(new MovingPlatform([p.from.map((v) => v * TS), p.to.map((v) => v * TS)], p.w, { phase: p.phase || 0 }));
    for (const f of S.falling || []) this.hazards.push(new FallingPlatform(f.x * TS, f.y * TS, f.w));
    for (const b of S.bars || []) this.hazards.push(new StaticBar(b.x * TS, b.y * TS, b.n, { dir: b.dir, angle: b.angle || 0 }));
    for (const g of S.geysers || []) this.hazards.push(new Geyser(g.x0 * TS, g.x1 * TS, groundTop(g.x0 - 1) * TS, g.phase));
    if (S.door) {
      this.exitDoor = { x: S.door.x * TS, y: (S.door.y + 1) * TS, open: 0 };
      this.addInteractable({ x: S.door.x * TS + 8, y: (S.door.y + 1) * TS, range: 14, hintH: 44, onUse: () => this.enterDoor(S.door.to) });
    }
    if (S.bossDoor) this.bossDoor = { x: S.bossDoor.x * TS, y: (S.bossDoor.y + 1) * TS, open: 0, triggered: false };
  }

  // Fila del primer suelo sólido debajo del techo en la columna tx
  groundTop(tx) {
    const m = this.map;
    let ty = 0;
    while (ty < m.h && m.typeAt(tx, ty) === T.SOLID) ty++; // saltar el techo
    for (; ty < m.h; ty++) if (m.typeAt(tx, ty) === T.SOLID) return ty;
    return m.h;
  }

  // ---------- Bloques Y ----------
  afterChocoMove(dt) {
    const c = this.choco;
    const ct = c.body.ceilTile;
    if (ct && c.state === 'play') this.hitBlock(ct.tx, ct.ty);
    this.updatePipes(dt, c);
    this.updateBossDoor(c);
  }

  hitBlock(tx, ty, cascading = false) {
    const m = this.map;
    const ch = m.charAt(tx, ty);
    const key = `${tx},${ty}`;
    const audio = this.game.audio;
    if (!Y_BLOCKS.has(ch)) {
      if (ch === 'B' || ch === 'U') {
        this.bumpAt(tx, ty, ch === 'B');
        playSfx(audio, 'blockBump');
      }
      return;
    }
    this.bumpAt(tx, ty, true);
    const px = tx * TS + 8;
    const top = ty * TS;
    if (ch === 'i') {
      // Bloque invisible: se revela (y si es parte de la escalera, revela los demás)
      m.setChar(tx, ty, 'U');
      playSfx(audio, 'goldenY');
      this.popBit(px, top);
      this.particles.burst(px, top + 8, 10, { speedMin: 20, speedMax: 60, colors: ['#FFD23F', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
      const chain = this.section.hiddenChain || [];
      if (!cascading && chain.some(([x, y]) => x === tx && y === ty)) {
        chain
          .filter(([x, y]) => !(x === tx && y === ty))
          .forEach(([x, y], i) => this.cascade.push({ x, y, t: 0.25 * (i + 1) }));
      }
      return;
    }
    playSfx(audio, 'blockBump');
    if (ch === 'Q') {
      m.setChar(tx, ty, 'U');
      this.popBit(px, top);
    } else if (ch === 'M') {
      // Bloque de varios bits: cada golpe da uno, hasta agotarse o pasar el tiempo
      const st = this.multi.get(key) || { hits: 0, t: 0 };
      st.hits++;
      this.multi.set(key, st);
      this.popBit(px, top);
      if (st.hits >= YBLOCK.MULTI_HITS) {
        m.setChar(tx, ty, 'U');
        this.multi.delete(key);
      }
    } else if (ch === 'C' || ch === 'H') {
      m.setChar(tx, ty, 'U');
      playSfx(audio, 'cacao');
      // Sale hacia el lado de Choco y cae al suelo, aunque el bloque esté alto
      const side = Math.sign(this.choco.cx - px) || 1;
      this.pickups.push(new Pickup(ch === 'C' ? 'cacao' : 'chunk', px, top - 8, { rise: true, clipY: top, drop: side }));
    }
  }

  bumpAt(tx, ty, killAbove) {
    this.bumps.set(`${tx},${ty}`, 0);
    if (!killAbove) return;
    // Los enemigos parados encima del bloque salen volando
    const x0 = tx * TS;
    const top = ty * TS;
    for (const e of this.enemies) {
      if (!e.active || !e.body || e instanceof Guardian) continue;
      const b = e.body;
      if (Math.abs(b.y + b.h - top) < 3 && b.x + b.w > x0 && b.x < x0 + TS) e.explode?.(this, 0);
    }
  }

  // Bit que salta del bloque y se suma solo
  popBit(x, top) {
    this.pops.push({ x, y: top - 4, vy: -180, t: 0 });
    playSfx(this.game.audio, 'bit');
    this.addBits(1);
  }

  // ---------- Tuberías y puertas ----------
  updatePipes(dt, c) {
    const p = this.pipe;
    if (p) {
      p.t += dt;
      if (p.mode === 'in') {
        c.body.y += 40 * dt;
        if (p.t > 0.65 && !p.sent) {
          p.sent = true;
          this.game.startTransition({ type: 'fade', onMid: () => this.loadSection(p.to, { entry: p.entry, keepChoco: true }) });
        }
      } else if (p.mode === 'out') {
        const targetY = p.top * TS - c.body.h;
        c.body.y = Math.max(targetY, c.body.y - 40 * dt);
        if (c.body.y <= targetY && p.t > 0.3) {
          c.state = 'play';
          c.body.onGround = true;
          this.pipe = null;
        }
      }
      return;
    }
    // Entrar a una tubería: parado sobre la boca y ↓
    if (c.state !== 'play' || !c.body.onGround || !this.game.input.pressed('down')) return;
    const S = this.section;
    const options = [];
    if (S.exit && S.exit.type === 'pipe') options.push({ ...S.exit });
    if (S.secretPipe) options.push({ x: S.secretPipe.x, top: S.secretPipe.top, to: 'secret', entry: 'pipe' });
    for (const o of options) {
      const left = o.x * TS;
      if (Math.abs(c.footY - o.top * TS) < 1 && c.footX >= left + 3 && c.footX <= left + 29) {
        const to = o.to;
        const entry = o.entry || (o.back ? 'secretBack' : 'pipe');
        c.stopCharge();
        c.state = 'frozen';
        c.body.vx = 0;
        c.body.x = left + 16 - c.body.w / 2;
        this.pipe = { mode: 'in', t: 0, x: o.x, top: o.top, to, entry };
        playSfx(this.game.audio, 'pipe');
        return;
      }
    }
  }

  enterDoor(to) {
    const c = this.choco;
    const d = this.exitDoor;
    c.stopCharge();
    c.state = 'frozen';
    c.body.vx = 0;
    playSfx(this.game.audio, 'doorOpen');
    d.opening = true;
    this.game.startTransition({ type: 'fade', duration: 0.5, onMid: () => this.loadSection(to, { entry: 'door', keepChoco: true }) });
  }

  // Puerta del jefe: se abre sola con un glitch cuando Choco se acerca
  updateBossDoor(c) {
    const d = this.bossDoor;
    if (!d || d.triggered || c.state !== 'play') return;
    if (c.footX > d.x - 30 && c.body.onGround) {
      d.triggered = true;
      const s = this;
      const g = this.game;
      this.playCutscene(
        function* (cs) {
          playSfx(g.audio, 'nullAppear');
          g.effects.glitch(0.4, 0.9);
          g.audio.stopMusic(0.8);
          yield 0.8;
          playSfx(g.audio, 'doorOpen');
          d.opening = true;
          yield cs.until(() => d.open >= 1);
          const a = c.autoplay();
          a.dir = 1;
          yield cs.until(() => c.footX > d.x + 16);
          a.dir = 0;
          c.state = 'frozen';
        },
        {
          onSkip: () => {
            d.open = 1;
          },
          onEnd: () => {
            g.startTransition({ type: 'glitch', onMid: () => this.loadSection('arena', { entry: 'arena', keepChoco: true }) });
          },
        },
      );
    }
  }

  // ---------- Arena del Guardián ----------
  startArena() {
    const S = this.section;
    const floorY = S.floor * TS;
    this.cameraLock = { x: 0, y: this.map.pxH - SCREEN.H };
    this.camera.x = this.cameraLock.x;
    this.camera.y = this.cameraLock.y;
    const boss = new Guardian(15 * TS, floorY, { left: TS, right: this.map.pxW - TS });
    this.boss = boss;
    this.enemies.push(boss);
    const s = this;
    const g = this.game;
    this.playCutscene(
      function* (cs) {
        yield cs.until(() => boss.state !== 'intro' || boss.landed);
        yield 0.6;
        s.showBanner(TEXTS.level1.bossName, TEXTS.level1.bossSub, null, 1.6);
        g.audio.playSong(SONG_GUARDIAN);
        yield 1.0;
      },
      { skippable: false, keepHud: true },
    );
  }

  onBossDefeated() {
    this.bossBeaten = true;
    const s = this;
    const g = this.game;
    const c = this.choco;
    // Limpiar lo que quede en la arena
    this.hazards = [];
    this.enemies = this.enemies.filter((e) => e === this.boss);
    if (this.rescued) {
      // Rejugando: Óscar ya está en la barra
      this.playCutscene(function* () {
        yield 1.2;
        s.finishLevel();
        playSfx(g.audio, 'item');
      }, { skippable: false });
      return;
    }
    this.playCutscene(
      function* (cs) {
        yield 1.2;
        // Cae una jaula de caracteres con Óscar adentro
        s.cage = { x: SCREEN.W / 2, y: -50, vy: 0, landed: false, open: 0, t: 0 };
        yield cs.until(() => s.cage.landed);
        yield 0.6;
        playSfx(g.audio, 'cageOpen');
        s.cage.opening = true;
        yield cs.until(() => s.cage.open >= 1);
        s.oscar = { x: s.cage.x, y: s.section.floor * TS, t: 0, light: 0, walk: 0, facing: c.cx < s.cage.x ? -1 : 1 };
        s.cage = null;
        // Óscar camina hacia Choco
        const target = c.footX + (s.oscar.x > c.footX ? 22 : -22);
        while (Math.abs(s.oscar.x - target) > 1) {
          s.oscar.x += Math.sign(target - s.oscar.x) * Math.min(1, Math.abs(target - s.oscar.x));
          s.oscar.walk += 1 / 60;
          yield 1 / 60;
        }
        s.oscar.walk = 0;
        c.facing = s.oscar.x > c.footX ? 1 : -1;
        s.oscar.facing = -c.facing;
        yield 0.3;
        yield cs.say(DIALOGUES.oscarRescue);
        // Óscar se vuelve luz rosada y se une a la barra
        s.hudInCutscene = true;
        s.hud.visible = true;
        s.oscar.toLight = true;
        playSfx(g.audio, 'squareIn');
        yield cs.until(() => s.oscar.light >= 1);
        s.oscar.fly = { t: 0, x0: s.oscar.x, y0: s.oscar.y - 12 };
        yield cs.until(() => s.oscar.fly.t >= 1);
        s.oscar = null;
        playSfx(g.audio, 'join');
        g.effects.flash(ACCENTS.oscar, 4);
        s.particles.burst(c.cx, c.cy, 30, { speedMin: 30, speedMax: 110, colors: [ACCENTS.oscar, '#FFFFFF', '#FFC0D8'], lifeMin: 0.3, lifeMax: 0.8 });
        c.setMaxHp(Math.min(HEALTH.MAX_POSSIBLE, c.maxHp + 1));
        c.hp = c.maxHp;
        c.setSquash({ X: 1.3, Y: 0.8 });
        yield 1.2;
        s.hudInCutscene = false;
        s.hud.visible = false;
        // Entrega de las Botas de Doble Salto
        c.items.boots = true;
        yield cs.push(new ItemGetScene(g, 'boots'));
        yield 0.3;
        yield cs.say(DIALOGUES.oscarAfter);
        s.finishLevel({ delay: 1.8 });
        playSfx(g.audio, 'item');
      },
      {
        onSkip: () => {
          s.hudInCutscene = false;
          s.cage = null;
          s.oscar = null;
          c.items.boots = true;
          c.setMaxHp(Math.min(HEALTH.MAX_POSSIBLE, Math.max(c.maxHp, 2)));
          c.hp = c.maxHp;
        },
        onEnd: () => {
          if (!s.ending) s.finishLevel({ delay: 1.2 });
        },
      },
    );
  }

  // ---------- Muerte y reaparición ----------
  onRespawn() {
    const cp = this.checkpoint;
    this.loadSection(cp.section || 'A', { entry: cp.id >= 0 ? 'checkpoint' : 'start', id: cp.id, keepChoco: true });
  }

  // Óscar suspira al pasar junto a un rótulo sin Y (cuando ya fue rescatado)
  onSignSeen(s) {
    if (!this.rescued || !s.text || !s.text.includes('_')) return;
    this.sigh = { t: 0 };
    playSfx(this.game.audio, 'sigh');
  }

  // ---------- Actualización ----------
  levelUpdate(dt) {
    for (const [k, v] of this.bumps) {
      const t = v + dt;
      if (t >= YBLOCK.BUMP_TIME) this.bumps.delete(k);
      else this.bumps.set(k, t);
    }
    for (const [k, st] of this.multi) {
      st.t += dt;
      if (st.t > YBLOCK.MULTI_WINDOW) {
        const [x, y] = k.split(',').map(Number);
        this.map.setChar(x, y, 'U');
        this.multi.delete(k);
      }
    }
    for (const c of this.cascade) {
      c.t -= dt;
      if (c.t <= 0 && !c.done) {
        c.done = true;
        if (this.map.charAt(c.x, c.y) === 'i') this.hitBlock(c.x, c.y, true);
      }
    }
    for (const p of this.pops) {
      p.t += dt;
      p.vy += 700 * dt;
      p.y += p.vy * dt;
    }
    this.pops = this.pops.filter((p) => p.t < 0.45);
    if (this.door) {
      this.door.t += dt;
      if (this.door.t > 0.6) this.door = null;
    }
    if (this.exitDoor?.opening) this.exitDoor.open = Math.min(1, this.exitDoor.open + dt * 3);
    if (this.bossDoor?.opening) this.bossDoor.open = Math.min(1, this.bossDoor.open + dt * 1.2);
    if (this.sigh) {
      this.sigh.t += dt;
      if (this.sigh.t > 1.8) this.sigh = null;
    }
    this.updateCage(dt);
    this.updateOscar(dt);
  }

  updateCage(dt) {
    const cg = this.cage;
    if (!cg) return;
    cg.t += dt;
    const floor = this.section.floor * TS;
    if (!cg.landed) {
      cg.vy = Math.min(cg.vy + 900 * dt, 420);
      cg.y += cg.vy * dt;
      if (cg.y >= floor) {
        cg.y = floor;
        cg.landed = true;
        playSfx(this.game.audio, 'cageDrop');
        this.game.effects.shake(0.4);
        this.particles.burst(cg.x, floor - 2, 14, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 20, speedMax: 80, colors: ['#8A8AA0', '#FF2E88'], lifeMin: 0.2, lifeMax: 0.5 });
      }
    }
    if (cg.opening) cg.open = Math.min(1, cg.open + dt * 1.2);
  }

  updateOscar(dt) {
    const o = this.oscar;
    if (!o) return;
    o.t += dt;
    if (o.toLight) o.light = Math.min(1, o.light + dt * 1.2);
    if (o.fly) {
      const c = this.choco;
      o.fly.t = Math.min(1, o.fly.t + dt * 1.4);
      const k = Ease.inOutCubic(o.fly.t);
      o.lx = o.fly.x0 + (c.cx - o.fly.x0) * k;
      o.ly = o.fly.y0 + (c.cy - o.fly.y0) * k - Math.sin(k * Math.PI) * 30;
      this.particles.spawn({ x: o.lx + R.range(-2, 2), y: o.ly + R.range(-2, 2), life: 0.5, colors: [ACCENTS.oscar, '#FFFFFF'], size: 2, endSize: 1 });
    }
  }

  // Avance de la corrupción en la pradera (0 al inicio, 1 al final)
  corruption(tx) {
    if (this.section.id !== 'A') return this.section.id === 'secret' ? 0.1 : 0.35;
    return Math.max(0, Math.min(1, (tx - 24) / 76));
  }

  // ---------- Dibujo ----------
  drawBackground(ctx, cx, cy) {
    if (this.theme === 'pradera') drawPraderaBg(ctx, cx, cy, this.map.pxH, this.t, this.corruption(Math.floor((cx + SCREEN.W / 2) / TS)));
    else if (this.theme === 'cuevas') drawCuevasBg(ctx, cx, cy, this.t);
    else drawCastilloBg(ctx, cx, cy, this.t);
  }

  drawTiles(ctx, cx, cy) {
    const bumps = new Map();
    for (const [k, t] of this.bumps) bumps.set(k, Math.round(Math.sin((t / YBLOCK.BUMP_TIME) * Math.PI) * YBLOCK.BUMP_HEIGHT));
    drawCartuchoTiles(ctx, this.map, this.theme, cx, cy, { t: this.t, bumps, corruption: (tx) => this.corruption(tx) });
  }

  drawWorld(ctx, cx, cy) {
    for (const [x, y] of this.torches) this.drawTorch(ctx, x * TS + 8 - cx, y * TS + 8 - cy);
    if (this.exitDoor) this.drawCaveDoor(ctx, this.exitDoor, cx, cy);
    if (this.door) this.drawCastleEntry(ctx, this.door, cx, cy);
    if (this.bossDoor) this.drawBossDoor(ctx, this.bossDoor, cx, cy);
    if (this.section.id === 'arena') this.drawArenaDecor(ctx, cx, cy);
    // Bits que saltan de los bloques
    const bit = itemSprites().bit;
    for (const p of this.pops) {
      const w = [6, 4, 2, 4][Math.floor(p.t * 20) % 4];
      ctx.drawImage(bit.normal, Math.round(p.x - cx - w / 2), Math.round(p.y - cy - 4), w, bit.h);
    }
  }

  drawForeground(ctx, cx, cy) {
    // Pared falsa: el hueco de la Y dorada parece muro hasta romper la grieta
    const hr = this.section.hiddenRoom;
    if (hr && this.map.charAt(hr.crack[0], hr.crack[1]) === 'K') {
      const fill = cartuchoTiles(this.theme).fill.normal;
      for (const [x, y] of hr.tiles) ctx.drawImage(fill, x * TS - cx, y * TS - cy);
    }
    // La boca de la tubería tapa a Choco mientras entra o sale
    const p = this.pipe;
    if (p) {
      const tiles = cartuchoTiles(this.theme);
      const x = p.x * TS - cx;
      const y = p.top * TS - cy;
      ctx.drawImage(tiles.pipe['{'].normal, x, y);
      ctx.drawImage(tiles.pipe['}'].normal, x + TS, y);
      ctx.drawImage(tiles.pipe['['].normal, x, y + TS);
      ctx.drawImage(tiles.pipe[']'].normal, x + TS, y + TS);
    }
    if (this.cage) this.drawCage(ctx, this.cage, cx, cy);
    if (this.oscar) this.drawOscar(ctx, this.oscar, cx, cy);
  }

  drawUi(ctx) {
    if (this.sigh) {
      const c = this.choco;
      const a = Math.min(1, this.sigh.t * 4, (1.8 - this.sigh.t) * 3);
      drawHintBubble(ctx, c.footX - this.camera.rx, c.footY - 28 - this.camera.ry - Math.round(this.sigh.t * 4), TEXTS.level1.oscarSigh, a, ACCENTS.oscar);
    }
  }

  // Bandera de checkpoint: gris → verde al activarse
  drawFlag(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    const on = this.checkpoint && this.checkpoint.id === s.id;
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(x - 3, y - 2, 7, 2);
    ctx.fillStyle = '#B0B0C4';
    ctx.fillRect(x, y - 26, 1, 24);
    const wave = Math.round(Math.sin(this.t * 6) * (on ? 1 : 0));
    const flash = s.flash > 0 && Math.floor(s.flash * 20) % 2;
    ctx.fillStyle = flash ? '#FFFFFF' : on ? UI.green : '#6E6E80';
    ctx.fillRect(x + 1, y - 26 + wave, 10, 7);
    ctx.fillRect(x + 11, y - 25 + wave, 1, 5);
    // Llaves { } pequeñitas en la bandera
    ctx.fillStyle = on ? '#E8FFF0' : '#3A3A4E';
    const fy = y - 25 + wave;
    ctx.fillRect(x + 4, fy, 1, 5);
    ctx.fillRect(x + 3, fy + 2, 1, 1);
    ctx.fillRect(x + 8, fy, 1, 5);
    ctx.fillRect(x + 9, fy + 2, 1, 1);
  }

  // Rótulo del mundo (madera en la pradera, placa en las cuevas y el castillo)
  drawWorldSign(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    const wood = this.theme === 'pradera';
    ctx.fillStyle = wood ? '#5E3A1A' : '#2B2B38';
    ctx.fillRect(x - 1, y - 9, 2, 9);
    ctx.fillStyle = wood ? '#A87040' : '#8A93A6';
    ctx.fillRect(x - 8, y - 19, 16, 11);
    ctx.fillStyle = wood ? '#8B5A2B' : '#5A5A6E';
    ctx.fillRect(x - 8, y - 9, 16, 1);
    ctx.fillStyle = wood ? '#5E3A1A' : '#2B2B38';
    ctx.fillRect(x - 6, y - 16, 7, 1);
    ctx.fillRect(x - 6, y - 13, 10, 1);
    // El hueco donde iría la Y
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(x + 2, y - 16, 2, 1);
  }

  drawTorch(ctx, x, y) {
    x = Math.round(x);
    y = Math.round(y);
    ctx.fillStyle = '#2B2B38';
    ctx.fillRect(x - 2, y, 5, 2);
    ctx.fillRect(x - 1, y + 2, 3, 4);
    const f = Math.floor(this.t * 10 + x) % 3;
    ctx.fillStyle = '#8C1D52';
    ctx.fillRect(x - 2, y - 5 + (f === 1 ? 1 : 0), 5, 5);
    ctx.fillStyle = '#FF2E88';
    ctx.fillRect(x - 1, y - 6 - f, 3, 5);
    ctx.fillStyle = '#FFD0E4';
    ctx.fillRect(x, y - 4, 1, 2);
    if (R.chance(0.1)) this.particles.spawn({ x: x + this.camera.rx, y: y - 6 + this.camera.ry, vy: -20, vx: R.range(-5, 5), life: 0.5, colors: ['#FF2E88', '#8C1D52'], front: false });
  }

  // Puerta de las cuevas hacia el castillo
  drawCaveDoor(ctx, d, cx, cy) {
    const x = Math.round(d.x - cx);
    const y = Math.round(d.y - cy);
    ctx.fillStyle = '#3A3A4E';
    ctx.fillRect(x - 3, y - 38, 22, 38);
    ctx.fillStyle = '#5A5A6E';
    ctx.fillRect(x - 3, y - 38, 22, 2);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x, y - 34, 16, 34);
    const w = Math.round(16 * (1 - d.open));
    ctx.fillStyle = '#6A4632';
    ctx.fillRect(x, y - 34, w, 34);
    ctx.fillStyle = '#4E301C';
    for (let i = 4; i < w; i += 5) ctx.fillRect(x + i, y - 34, 1, 34);
    ctx.fillStyle = '#8A8AA0';
    if (w > 4) {
      ctx.fillRect(x, y - 28, w, 2);
      ctx.fillRect(x, y - 10, w, 2);
      ctx.fillRect(x + w - 4, y - 18, 2, 3);
    }
  }

  // La puerta por la que se entra al castillo se cierra detrás de Choco
  drawCastleEntry(ctx, d, cx, cy) {
    const x = Math.round(d.x - cx);
    const y = Math.round(d.y - cy);
    const k = Math.min(1, d.t / 0.4);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x, y - 34, 16, 34);
    ctx.fillStyle = '#6A4632';
    ctx.fillRect(x, y - 34, Math.round(16 * k), 34);
  }

  // Doble puerta del jefe con la cara de N.U.L.L. (se abre con glitch)
  drawBossDoor(ctx, d, cx, cy) {
    const x = Math.round(d.x - cx);
    const y = Math.round(d.y - cy);
    const h = 48;
    const half = 16;
    const off = Math.round(d.open * 15);
    ctx.fillStyle = '#14141C';
    ctx.fillRect(x - 4, y - h - 6, 40, h + 6);
    ctx.fillStyle = '#3A0F2A';
    ctx.fillRect(x, y - h, 32, h);
    for (const [sx, dir] of [
      [x, -1],
      [x + half, 1],
    ]) {
      const px = sx + dir * off;
      const w = half - off > 0 ? half : half;
      ctx.fillStyle = '#4A4A5E';
      ctx.fillRect(px, y - h, w, h);
      ctx.fillStyle = '#5A5A6E';
      ctx.fillRect(px + 1, y - h + 1, w - 2, 1);
      ctx.fillStyle = '#2B2B38';
      for (let r = y - h + 8; r < y; r += 10) ctx.fillRect(px + 2, r, w - 4, 1);
    }
    // Ojo de N.U.L.L. partido entre las dos hojas
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - off, y - h, half, h);
    ctx.clip();
    drawNullEye(ctx, x + half - off, y - h + 18, 10, { angry: true, look: Math.sin(this.t) * 0.5 });
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + half + off, y - h, half, h);
    ctx.clip();
    drawNullEye(ctx, x + half + off, y - h + 18, 10, { angry: true, look: Math.sin(this.t) * 0.5 });
    ctx.restore();
    if (d.opening && d.open < 1 && R.chance(0.5)) {
      ctx.fillStyle = R.pick(['#FF2E88', '#43D9FF', '#FFFFFF']);
      ctx.fillRect(x + R.int(-4, 30), y - R.int(0, h), R.int(4, 14), 1);
    }
  }

  drawArenaDecor(ctx, cx, cy) {
    // Puerta cerrada a la izquierda y estandartes con el ojo de N.U.L.L.
    ctx.fillStyle = '#3A0F2A';
    ctx.fillRect(TS - cx, this.section.floor * TS - 40 - cy, 4, 40);
    for (const bx of [6 * TS, 13 * TS]) {
      const x = Math.round(bx - cx);
      const y = Math.round(2 * TS - cy);
      ctx.fillStyle = '#5A0F2A';
      ctx.fillRect(x, y, 16, 34);
      ctx.fillStyle = '#3A0F2A';
      ctx.fillRect(x, y + 34, 5, 4);
      ctx.fillRect(x + 11, y + 34, 5, 4);
      drawNullEye(ctx, x + 8, y + 14, 5, { look: Math.sin(this.t * 0.7) });
    }
  }

  // Jaula de caracteres: barras hechas de |, #, [ y ] en magenta
  drawCage(ctx, cg, cx, cy) {
    const x = Math.round(cg.x - cx);
    const y = Math.round(cg.y - cy);
    // Óscar adentro
    const spr = founderSprite('oscar', Math.floor(this.t * 3) % 2);
    ctx.drawImage(spr.normal, x - 8, y - 24);
    const glyphs = ['|', '#', '[', ']', '|'];
    for (let i = 0; i < 6; i++) {
      const gx = x - 15 + i * 6;
      const vanish = cg.open * 6 > (i * 7) % 6;
      if (vanish && cg.open > 0) continue;
      for (let j = 0; j < 4; j++) {
        const ch = glyphs[(i + j + Math.floor(this.t * 4)) % glyphs.length];
        drawText(ctx, ch, gx, y - 36 + j * 9, { color: j % 2 ? '#FF2E88' : '#FF8AC0', shadow: '#2A0A1A' });
      }
    }
    if (cg.open < 1) {
      ctx.fillStyle = '#FF2E88';
      ctx.fillRect(x - 17, y - 38, 34, 2);
      ctx.fillRect(x - 17, y - 1, 34, 2);
    }
  }

  drawOscar(ctx, o, cx, cy) {
    const x = Math.round(o.x - cx);
    const y = Math.round(o.y - cy);
    if (o.fly) {
      // Orbe de luz rosada
      ctx.fillStyle = ACCENTS.oscar;
      const lx = Math.round(o.lx - cx);
      const ly = Math.round(o.ly - cy);
      ctx.fillRect(lx - 3, ly - 3, 7, 7);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(lx - 1, ly - 1, 3, 3);
      return;
    }
    const frame = o.walk > 0 ? 2 + (Math.floor(o.walk * 8) % 4) : Math.floor(o.t * 3) % 2;
    const spr = founderSprite('oscar', frame);
    ctx.drawImage(spr.get(o.facing < 0), x - 8, y - 24);
    if (o.light > 0) {
      ctx.globalAlpha = o.light;
      ctx.drawImage(spr.tint(ACCENTS.oscar, o.facing < 0), x - 8, y - 24);
      ctx.globalAlpha = 1;
    }
    // Corazoncito flotando
    if (Math.floor(o.t * 2) % 2 === 0) drawText(ctx, '♥', x, y - 34 - Math.round(Math.sin(o.t * 3)), { align: 'center', color: ACCENTS.oscar, shadow: false });
  }
}
