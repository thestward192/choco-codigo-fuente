// Nivel 5 · El Código Puro — docs/niveles/nivel_5_codigo_puro.md
// El Stack (5-A Push → 5-B Firewall → 5-C Memoria fantasma → 5-D Punteros → 5-E Overflow) y el jefe
// final, N.U.L.L., en una arena de una pantalla: 4 fases (una por objeto) y el parche.
//   - Al morir en la pelea se reintenta la fase actual (se pierde una vida). Con Game Over se
//     vuelve al checkpoint de antes del jefe, en la fase 1.
//   - Entre fases: pausa con N.U.L.L. y el consejo del fundador de la fase; +1 cuadrito.
//   - La Receta de la Abuela (misión del nivel 4) da cobertura de cacao al empezar y al reaparecer.
import { SCREEN, HEALTH, STACK, NULL_BOSS } from '../../config/balance.js';
import { Tilemap } from '../../systems/tilemap.js';
import { PlatformLevel } from '../PlatformLevel.js';
import { level5Sections, CODE_LEGEND, L5_CHECKPOINTS, GOLDEN_INDEX } from './maps.js';
import { drawCodeTiles } from '../../art/tiles/codigo.js';
import { drawCodeBg } from '../../art/backgrounds/codigo.js';
import { drawTerminal, drawEcho, drawOverflow } from '../../art/codigo.js';
import { drawLassoNode } from '../../art/santacruz.js';
import { drawText, drawTextBox } from '../../art/font.js';
import { WallTurret, Fragment, PushFrame, Segment, Firewall, ExceptionWarn, Bullet } from '../../entities/enemies/codigo.js';
import { NullBoss } from '../../entities/bosses/null.js';
import { Pickup } from '../../entities/pickups.js';
import { PatchScene } from '../../scenes/PatchScene.js';
import { Lighting } from '../../core/lighting.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { ACCENTS, UI } from '../../art/palettes.js';
import { FOUNDERS } from '../../data/levels.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_STACK, SONG_NULL_FINAL, NULL_LAYERS } from '../../audio/songs/codigo.js';
import { fxRng } from '../../core/rng.js';

const TS = SCREEN.TILE;
const R = fxRng;
const L5 = TEXTS.level5;
const NEXT = { A: 'B', B: 'C', C: 'D', D: 'E', E: 'arena' };
const PHASE_DIALOGUE = [null, 'nullPhase1', 'nullPhase2', 'nullPhase3', 'nullPhase4'];

export class Level5Scene extends PlatformLevel {
  // start: 'push' | 'firewall' | 'fantasma' | 'punteros' | 'overflow' | 'null' | 'null2' | 'null3'
  //        | 'null4' | 'parche' (atajos de desarrollo)
  constructor(game, { start = null } = {}) {
    super(game, { levelId: 5 });
    this.sections = level5Sections();
    this.flags = {};
    this.popups = [];
    this.echo = null;
    this.bossPhase = 1;
    this.lighting = new Lighting();
    this.signColor = UI.cyan;
    let section = 'A';
    let entry = 'start';
    let cpId = null;
    const cp = this.session?.data.checkpoint;
    const saved = cp && cp.level === 5 ? L5_CHECKPOINTS.find((c) => c.id === cp.id) : null;
    if (saved) {
      section = saved.section;
      entry = saved.id === 0 ? 'start' : 'checkpoint';
      cpId = saved.id;
    }
    const shortcuts = {
      push: ['A', 'start', null],
      firewall: ['B', 'start', null],
      fantasma: ['C', 'start', null],
      punteros: ['D', 'checkpoint', 1],
      overflow: ['E', 'start', null],
      null: ['arena', 'arena', null, 1],
      null2: ['arena', 'arena', null, 2],
      null3: ['arena', 'arena', null, 3],
      null4: ['arena', 'arena', null, 4],
      parche: ['arena', 'arena', null, 4],
    };
    if (start && shortcuts[start]) {
      [section, entry, cpId] = shortcuts[start];
      this.bossPhase = shortcuts[start][3] || 1;
      this.flags.introSeen = true;
      if (section === 'arena') this.flags.bossIntro = this.bossPhase > 1;
      this.devPatch = start === 'parche';
    }
    if (section !== 'A') this.flags.introSeen = true;
    this.constructing = true;
    this.loadSection(section, { entry, id: cpId });
    this.constructing = false;
    this.applyRecipe(true);
  }

  // Sin partida (atajo de desarrollo): todos los objetos y la barra completa
  startingLoadout() {
    const lo = super.startingLoadout();
    if (!this.session) {
      for (const k of Object.keys(lo.items)) lo.items[k] = true;
      lo.maxHp = HEALTH.MAX_POSSIBLE;
    }
    return lo;
  }

  // Receta de la Abuela: cobertura de cacao al empezar y en cada reaparición (no en Modo Hotfix)
  applyRecipe(first = false) {
    if (!this.session?.data.grandmaRecipe || this.game.hotfix || !this.choco) return;
    this.choco.coating = true;
    if (first && !this.flags.recipeShown) {
      this.flags.recipeShown = true;
      this.recipeBanner = true;
    }
  }

  enter() {
    this.playSectionMusic();
    if (!this.flags.introSeen) {
      this.flags.introSeen = true;
      const s = this;
      this.playCutscene(
        function* (cs) {
          yield 0.6;
          yield cs.say(DIALOGUES.level5Intro);
        },
        { onEnd: () => s.sectionBanner() },
      );
    } else if (this.section.id !== 'arena') this.sectionBanner();
  }

  playSectionMusic() {
    if (this.section.id === 'arena') return;
    this.game.audio.playSong(SONG_STACK);
  }

  // ======================================================================
  // Secciones
  // ======================================================================
  loadSection(id, { entry = 'start', id: cpId = null, keepChoco = false, retry = false } = {}) {
    const S = this.sections[id];
    this.section = S;
    this.setMap(new Tilemap([...S.rows], CODE_LEGEND));
    this.enemies = [];
    this.hazards = [];
    this.pickups = [];
    this.signs = [];
    this.interactables = [];
    this.shots = [];
    this.boss = null;
    this.cameraLock = null;
    this.exiting = false;
    this.overflow = null;
    this.exceptionT = 2;
    this.pushes = [];
    this.smallPlats = [];
    this.lassoNodes = null;
    this.darkness = 0;
    this.populate(S);

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
      if (!this.checkpoint || id === 'A') this.checkpoint = { x, y, id: -1, section: id };
    } else if (entry === 'arena') {
      x = 3 * TS + 8;
      y = S.floor * TS;
      if (!this.checkpoint) this.checkpoint = { x, y, id: -1, section: 'arena' };
    }
    if (!keepChoco || !this.choco) this.placeChoco(x, y);
    else {
      const c = this.choco;
      c.body.x = x - c.body.w / 2;
      c.body.y = y - c.body.h;
      c.body.vx = 0;
      c.body.vy = 0;
      c.body.platform = null;
      c.lasso = null;
      c.state = 'play';
      this.camera.snapTo(c.footX, c.footY);
    }
    if (id === 'arena') this.startArena({ retry });
    else {
      if (!this.constructing) this.playSectionMusic();
      this.camera.snapTo(this.choco.footX, this.choco.footY);
      // En la cima del Overflow (checkpoint antes del jefe) la masa ya no sube
      if (S.overflow && entry !== 'checkpoint') this.overflow = { y: S.floor * TS + STACK.OVERFLOW_START, t: -STACK.OVERFLOW_DELAY, stopped: false, rumbleT: 0 };
    }
  }

  populate(S) {
    const m = this.map;
    for (const { tx, ty } of m.find('x')) this.enemies.push(new Fragment(tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('$')) this.pickups.push(new Pickup('bit', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('C')) this.pickups.push(new Pickup('cacao', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('H')) this.pickups.push(new Pickup('chunk', tx * TS + 8, ty * TS + 8));
    const gi = GOLDEN_INDEX[S.id];
    for (const { tx, ty } of m.find('Y')) {
      if (gi !== undefined && !this.goldenY[gi]) this.pickups.push(new Pickup('goldenY', tx * TS + 8, ty * TS + 8, { index: gi, ghost: this.goldenGhost(gi) }));
    }
    this.nodes = m.find('n').map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8, hooked: 0 }));
    if (S.id === 'D' || S.id === 'E') this.lassoNodes = this.nodes;
    // Checkpoints (terminales)
    const cps = L5_CHECKPOINTS.filter((c) => c.section === S.id);
    m.find('!')
      .sort((a, b) => a.ty - b.ty)
      .forEach(({ tx, ty }, i) => {
        if (!cps[i]) return;
        this.addSign(tx * TS + 8, (ty + 1) * TS, null, { checkpoint: true, id: cps[i].id, section: S.id, draw: this.drawCheckpoint });
      });
    // Push: plataformas que aparecen y se apilan
    this.pushes = (S.push || []).map((d, i) => new PushFrame(d, i));
    this.hazards.push(...this.pushes);
    for (const sg of S.segments || []) this.hazards.push(new Segment(sg.x * TS, sg.y * TS, sg.w));
    for (const f of S.firewalls || []) this.hazards.push(new Firewall(f.x0, f.x1, f.row));
    for (const t of S.turrets || []) this.enemies.push(new WallTurret(t.x * TS + 8, t.y * TS + 8, t.dir, t.lock));
    // Arena: plataformas pequeñas de la fase 4
    this.arenaNodes = S.id === 'arena' ? this.nodes : [];
    this.smallPlats = (S.smallPlatforms || []).map((p) => ({ plat: { x: p.x * TS, y: p.y * TS, w: p.w * TS, h: 8, dx: 0, dy: 0, active: false }, phase: p.phase, t: 0, on: false, blink: false, force: 0 }));
  }

  // ---------- Banners y ecos ----------
  sectionBanner() {
    const id = this.section.id;
    if (id === 'arena' || this.flags[`banner${id}`]) return;
    this.flags[`banner${id}`] = true;
    this.showBanner(L5.sections[id], L5.sectionSubs[id], () => this.showEcho(), 2.2);
    if (this.recipeBanner) {
      this.recipeBanner = false;
      this.popups.push({ text: L5.recipe, x: this.choco.cx, y: this.choco.body.y - 8, t: -0.4, color: '#FFD27A', long: true });
    }
  }

  showEcho() {
    const who = this.section.echo;
    if (!who || this.flags[`echo${this.section.id}`]) return;
    this.flags[`echo${this.section.id}`] = true;
    this.echo = { who, text: L5.echoes[who], t: 0 };
    playSfx(this.game.audio, 'echo');
  }

  // ======================================================================
  // El Stack
  // ======================================================================
  updatePush() {
    const c = this.choco;
    const P = this.pushes;
    if (!P.length) return;
    // La primera aparece cuando Choco empieza a subir; cada una, al pisar la anterior
    if (P[0].state === 'hidden' && c.state === 'play' && !this.cutscene && c.footX > (P[0].def.x0 - 3) * TS) P[0].arm(0.1);
    for (let i = 0; i < P.length - 1; i++) {
      const d = P[i].def;
      if (P[i].state === 'set' && c.body.onGround && Math.abs(c.footY - d.row * TS) < 1 && c.footX >= d.x0 * TS - 4 && c.footX <= (d.x1 + 1) * TS + 4) P[i + 1].arm();
    }
  }

  onTurretBroken(t) {
    const l = t.lock;
    if (!l) return;
    for (let ty = l.y0; ty <= l.y1; ty++) {
      for (let tx = l.x0; tx <= l.x1; tx++) {
        this.map.setChar(tx, ty, '.');
        this.particles.burst(tx * TS + 8, ty * TS + 8, 4, { speedMin: 20, speedMax: 70, colors: ['#FF2E88', '#FFFFFF', '#8C1D52'], gravity: 200, lifeMin: 0.3, lifeMax: 0.6 });
      }
    }
    playSfx(this.game.audio, 'gateOpen');
    this.game.effects.flash('#FF2E88', 2);
    this.popups.push({ text: L5.lockOpen, x: ((l.x0 + l.x1 + 1) / 2) * TS, y: l.y0 * TS - 6, t: 0, color: '#FF5AA8' });
  }

  // Excepciones desde los bordes de la pantalla (5-D y 5-E)
  updateExceptions(dt) {
    const every = STACK.EXCEPTION_EVERY[this.section.id];
    const c = this.choco;
    if (!every || !this.section.exceptions || this.cutscene || c.state !== 'play' || this.game.transitioning) return;
    this.exceptionT -= dt;
    if (this.exceptionT <= 0) {
      this.exceptionT = every * R.range(0.8, 1.2);
      this.hazards.push(new ExceptionWarn(c.cx < SCREEN.W / 2 ? 1 : -1, c.cy + R.range(-6, 6)));
    }
  }

  // La masa del Overflow sube; tocarla quita un cuadrito y devuelve a lo último seguro
  updateOverflow(dt) {
    const o = this.overflow;
    const c = this.choco;
    if (!o || this.cutscene || this.game.transitioning) return;
    if (!o.started) {
      if (c.state !== 'play') return;
      o.started = true;
      if (!this.flags.overflowTalk) {
        this.flags.overflowTalk = true;
        this.playCutscene(function* (cs) {
          yield 0.3;
          yield cs.say(DIALOGUES.overflowStart);
        });
        return;
      }
    }
    // Ya arriba: deja de subir
    if (c.footY <= (5 * TS) && c.body.onGround) o.stopped = true;
    if (!o.stopped) {
      o.t += dt;
      if (o.t > 0) o.y -= STACK.OVERFLOW_SPEED * dt;
      o.rumbleT -= dt;
      if (o.rumbleT <= 0) {
        o.rumbleT = 1.4;
        playSfx(this.game.audio, 'overflowRumble');
      }
    }
    if (c.alive && c.state === 'play' && !c.noclip && c.footY > o.y + 3) {
      playSfx(this.game.audio, 'overflowHit');
      this.game.effects.glitch(0.3, 0.8);
      this.popups.push({ text: L5.overflowHit, x: c.cx, y: c.body.y - 8, t: 0, color: '#FF5AA8' });
      c.invuln = 0;
      c.hurt(c.cx, { ignoreShield: true, knockback: false });
      if (c.state !== 'dead') {
        const safe = this.safeAbove(o.y - STACK.OVERFLOW_PUSHBACK);
        c.body.x = safe.x - c.body.w / 2;
        c.body.y = safe.y - c.body.h;
        c.body.vx = 0;
        c.body.vy = 0;
        c.lasso = null;
        o.y += STACK.OVERFLOW_PUSHBACK;
        this.camera.snapTo(c.footX, c.footY);
      }
    }
  }

  // Lo último seguro sobre la masa: donde pisó por última vez o el suelo más cercano arriba
  safeAbove(limitY) {
    const c = this.choco;
    if (c.safe && c.safe.y < limitY - 8) return c.safe;
    const m = this.map;
    for (let ty = Math.min(m.h - 1, Math.floor(limitY / TS) - 1); ty > 2; ty--) {
      const cols = [];
      for (let tx = 2; tx < m.w - 2; tx++) {
        const stand = (m.isSolid(tx, ty) || m.isOneWay(tx, ty)) && !m.isSolid(tx, ty - 1) && !m.isSolid(tx, ty - 2);
        if (stand) cols.push(tx);
      }
      if (cols.length) {
        cols.sort((a, b) => Math.abs(a * TS + 8 - c.cx) - Math.abs(b * TS + 8 - c.cx));
        return { x: cols[0] * TS + 8, y: ty * TS };
      }
    }
    return { x: c.cx, y: 5 * TS };
  }

  // ======================================================================
  // La arena de N.U.L.L.
  // ======================================================================
  startArena({ retry = false } = {}) {
    const S = this.section;
    const g = this.game;
    this.cameraLock = { x: 0, y: this.map.pxH - SCREEN.H };
    this.camera.x = this.cameraLock.x;
    this.camera.y = this.cameraLock.y;
    const floorY = S.floor * TS;
    const boss = new NullBoss({ cx: this.map.pxW / 2, floorY, left: TS, right: this.map.pxW - TS }, this.bossPhase);
    this.boss = boss;
    this.enemies.push(boss);
    boss.core.onPull = () => boss.pulled(this);
    const phase = this.bossPhase;
    // Reintento de la fase 3 o 4: el mapa ya cambió
    if (phase >= 3) this.ghostPlatforms();
    if (phase >= 4) {
      this.collapseFloor(false);
      this.placeOnSmallPlatform(0);
    }
    this.setNullLayers(phase, true);
    const s = this;
    const intro = function* (cs) {
      yield 0.6;
      boss.alpha = 0;
      boss.set('intro');
      playSfx(g.audio, 'nullAppear');
      g.effects.glitch(0.5, 1);
      yield 1.2;
      boss.set('pause');
      if (!s.flags.bossIntro && phase === 1) {
        s.flags.bossIntro = true;
        yield cs.say(DIALOGUES.nullEntry);
        s.showBanner(L5.boss.name, L5.boss.sub, null, 1.8);
        yield 1.8;
      } else if (retry) {
        s.showBanner(L5.boss.retry(phase), L5.boss.phases[phase - 1], null, 1.6);
        yield 1.6;
      }
      if (!retry || phase === 1) {
        if (!s.flags[`advice${phase}`]) {
          s.flags[`advice${phase}`] = true;
          yield cs.say(DIALOGUES[PHASE_DIALOGUE[phase]]);
        }
      }
    };
    const begin = () => {
      boss.startPhase(phase, this);
      if (this.devPatch) {
        this.devPatch = false;
        this.onNullDefeated(boss);
        return;
      }
      this.showBanner(L5.boss.phases[phase - 1], L5.boss.hints[phase - 1], null, 2.6);
    };
    const run = () => this.playCutscene(intro, { skippable: true, keepHud: true, onEnd: begin, onSkip: () => (boss.alpha = 1) });
    if (this.constructing || g.transitioning) this.pendingEnter = run;
    else run();
  }

  setNullLayers(phase, start = false) {
    const a = this.game.audio;
    const layers = NULL_LAYERS.slice(0, phase);
    if (start || a.player?.song !== SONG_NULL_FINAL) a.playSong(SONG_NULL_FINAL, { layers });
    for (const l of NULL_LAYERS) a.setLayer(l, layers.includes(l), 1);
  }

  // Fase 3: las plataformas flotantes pasan a ser fantasma
  ghostPlatforms() {
    const m = this.map;
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (m.charAt(tx, ty) === '=') m.setChar(tx, ty, 'g');
  }

  // Fase 4: el suelo y las plataformas se derrumban en píxeles; quedan los nodos
  collapseFloor(animated) {
    const m = this.map;
    const S = this.section;
    const cells = [];
    for (let ty = 0; ty < m.h; ty++) {
      for (let tx = 1; tx < m.w - 1; tx++) {
        const ch = m.charAt(tx, ty);
        if (ch === '=' || ch === 'g' || (ty >= S.floor && ch === '#')) cells.push([tx, ty]);
      }
    }
    // Desde el centro hacia afuera
    cells.sort((a, b) => Math.abs(a[0] - 9.5) - Math.abs(b[0] - 9.5));
    if (!animated) {
      for (const [tx, ty] of cells) m.setChar(tx, ty, '.');
      return;
    }
    this.collapse = { cells, i: 0, t: 0 };
    playSfx(this.game.audio, 'collapse');
    this.game.effects.shake(0.8);
  }

  updateCollapse(dt) {
    const k = this.collapse;
    if (!k) return;
    k.t += dt;
    const target = Math.floor((k.t / NULL_BOSS.P4.COLLAPSE_TIME) * k.cells.length);
    while (k.i < Math.min(target, k.cells.length)) {
      const [tx, ty] = k.cells[k.i++];
      this.map.setChar(tx, ty, '.');
      if (k.i % 2 === 0) this.particles.burst(tx * TS + 8, ty * TS + 6, 5, { speedMin: 10, speedMax: 50, colors: ['#2A1446', '#43D9FF', '#3A1E60', '#FF2E88'], gravity: 260, lifeMin: 0.5, lifeMax: 1.1, size: 2, endSize: 1 });
    }
    if (k.i >= k.cells.length) this.collapse = null;
  }

  placeOnSmallPlatform(i) {
    const sp = this.smallPlats[i];
    if (!sp) return;
    sp.force = 2;
    sp.plat.active = true;
    sp.on = true;
    const c = this.choco;
    c.body.x = sp.plat.x + sp.plat.w / 2 - c.body.w / 2;
    c.body.y = sp.plat.y - c.body.h;
    c.body.vx = 0;
    c.body.vy = 0;
    c.lasso = null;
    if (this.checkpoint?.section === 'arena') {
      this.checkpoint.x = sp.plat.x + sp.plat.w / 2;
      this.checkpoint.y = sp.plat.y;
    }
  }

  // Plataformas pequeñas de la fase 4: aparecen y desaparecen (alternadas, con parpadeo antes)
  updateSmallPlats(dt) {
    if (!this.boss || this.boss.phase !== 4) return;
    const P = NULL_BOSS.P4;
    const cycle = P.PLATFORM_ON + P.PLATFORM_OFF;
    // Durante las cinemáticas y pausas quedan fijas (nadie se cae mientras habla N.U.L.L.)
    const paused = !!this.cutscene || !this.boss.fighting;
    for (const sp of this.smallPlats) {
      if (!this.map.platforms.includes(sp.plat)) this.map.platforms.push(sp.plat);
      if (paused) {
        sp.on = true;
        sp.blink = false;
        sp.plat.active = true;
        continue;
      }
      sp.t += dt;
      if (sp.force > 0) sp.force -= dt;
      const k = (sp.t + sp.phase * cycle) % cycle;
      sp.on = sp.force > 0 || k < P.PLATFORM_ON;
      sp.blink = sp.force <= 0 && k > P.PLATFORM_ON - P.PLATFORM_BLINK && k < P.PLATFORM_ON;
      if (sp.on !== sp.plat.active) playSfx(this.game.audio, sp.on ? 'pcOn' : 'segment');
      sp.plat.active = sp.on;
    }
  }

  // Fin de una fase: pausa con diálogo y consejo, +1 cuadrito y la fase siguiente
  onNullPhaseCleared(phase, boss) {
    const next = phase + 1;
    this.bossPhase = next;
    this.clearBattlefield();
    const s = this;
    const g = this.game;
    const c = this.choco;
    this.playCutscene(
      function* (cs) {
        yield 1.0;
        boss.set('pause');
        // +1 cuadrito
        const healed = c.hp < c.maxHp;
        c.hp = Math.min(c.maxHp, c.hp + 1);
        if (healed) {
          playSfx(g.audio, 'heal');
          s.popups.push({ text: L5.heal, x: c.cx, y: c.body.y - 8, t: 0, color: UI.green });
        }
        s.setNullLayers(next);
        if (next === 3) {
          s.ghostPlatforms();
          playSfx(g.audio, 'crtOff');
        }
        if (next === 4) {
          playSfx(g.audio, 'glitch');
          g.effects.glitch(0.4, 1);
          s.placeOnSmallPlatform(0);
          yield 0.4;
          s.collapseFloor(true);
          yield cs.until(() => !s.collapse);
        }
        yield 0.6;
        yield cs.say(DIALOGUES[PHASE_DIALOGUE[next]]);
      },
      {
        keepHud: true,
        onSkip: () => {
          if (next >= 3) s.ghostPlatforms();
          if (next === 4) {
            s.collapse = null;
            s.collapseFloor(false);
            s.placeOnSmallPlatform(0);
          }
        },
        onEnd: () => {
          s.flags[`advice${next}`] = true;
          boss.startPhase(next, s);
          s.showBanner(L5.boss.phases[next - 1], L5.boss.hints[next - 1], null, 2.6);
        },
      },
    );
  }

  // Quita balas, ondas, láseres y Fragmentos
  clearBattlefield() {
    this.hazards = this.hazards.filter((h) => !(h instanceof Bullet) && !h.touches);
    for (const e of this.enemies) {
      if (e instanceof Fragment) {
        e.dead = true;
        this.particles.burst(e.cx, e.cy, 6, { speedMin: 20, speedMax: 60, colors: ['#FF2E88', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.4 });
      }
    }
  }

  // N.U.L.L. vencida: Choco se engancha al núcleo y escribe el parche
  onNullDefeated(boss) {
    this.clearBattlefield();
    this.lassoNodes = null;
    const s = this;
    const g = this.game;
    const c = this.choco;
    this.playCutscene(
      function* (cs) {
        yield 1.2;
        // Si estaba sobre el vacío, a una plataforma
        if (s.section.id === 'arena' && s.boss.phase >= 4 && !c.body.onGround) {
          s.placeOnSmallPlatform(0);
          yield 0.3;
        }
        yield cs.say(DIALOGUES.nullWeak);
        c.facing = boss.x > c.cx ? 1 : -1;
        s.patchLasso = { t: 0 };
        playSfx(g.audio, 'lassoThrow');
        yield 0.35;
        playSfx(g.audio, 'lassoHook');
        g.effects.flash('#FFFFFF', 3);
        yield 0.8;
        g.audio.playSong(SONG_NULL_FINAL, { layers: ['pad'] });
        yield cs.push(
          new PatchScene(g, {
            hp: c.hp,
            maxHp: c.maxHp,
            onPulse: () => {
              c.hp = Math.max(1, c.hp - 1);
              return c.hp;
            },
          }),
        );
      },
      {
        skippable: false,
        keepHud: true,
        onEnd: () => {
          s.patchLasso = null;
          s.finishLevel({ delay: 1.4 });
        },
      },
    );
  }

  // Fase 4: caer al vacío quita un cuadrito y devuelve a una plataforma
  onChocoFell(c) {
    if (this.section.id === 'arena' && this.boss?.phase === 4) {
      playSfx(this.game.audio, 'fall');
      this.popups.push({ text: L5.voidFall, x: c.cx, y: this.map.pxH - 30, t: 0, color: '#FF5AA8' });
      c.invuln = 0;
      c.hurt(c.cx, { ignoreShield: true, knockback: false });
      if (c.state !== 'dead') {
        const i = this.smallPlats.findIndex((p) => p.on);
        this.placeOnSmallPlatform(Math.max(0, i));
        this.game.effects.glitch(0.25, 0.6);
      }
      return;
    }
    super.onChocoFell(c);
  }

  // ======================================================================
  // Muerte, reaparición y salidas
  // ======================================================================
  onRespawn() {
    const cp = this.checkpoint;
    if (cp.section === 'arena') {
      this.loadSection('arena', { entry: 'arena', keepChoco: true, retry: true });
      // Reintento de la fase: aparece donde corresponde (en la fase 4, en una plataforma)
      if (this.bossPhase >= 4) {
        const sp = this.smallPlats[0];
        cp.x = sp.plat.x + sp.plat.w / 2;
        cp.y = sp.plat.y;
      } else {
        cp.x = 3 * TS + 8;
        cp.y = this.section.floor * TS;
      }
      return;
    }
    const entry = cp.id >= 0 ? 'checkpoint' : 'start';
    this.loadSection(cp.section || 'A', { entry, id: cp.id, keepChoco: true });
  }

  respawn(costLife = true) {
    super.respawn(costLife);
    if (this.lives > 0 && this.choco) {
      this.applyRecipe();
      if (this.section.id === 'arena' && this.bossPhase >= 4) this.placeOnSmallPlatform(0);
    }
  }

  // Game Over en la pelea: se vuelve al checkpoint de antes del jefe (no al inicio del nivel)
  gameOverOptions() {
    return { keepCheckpoint: this.section.id === 'arena' };
  }

  goTo(next) {
    if (this.exiting) return;
    this.exiting = true;
    const c = this.choco;
    c.stopCharge();
    c.state = 'frozen';
    c.body.vx = 0;
    const entry = next === 'arena' ? 'arena' : 'start';
    this.game.startTransition({
      type: 'glitch',
      duration: 0.45,
      onMid: () => {
        if (next === 'arena') this.checkpoint = { ...this.checkpoint, x: 3 * TS + 8, y: this.sections.arena.floor * TS, section: 'arena' };
        this.loadSection(next, { entry, keepChoco: true });
        if (next !== 'arena') this.sectionBannerPending = true;
      },
    });
  }

  checkExits() {
    const S = this.section;
    const c = this.choco;
    if (this.exiting || c.state !== 'play' || this.cutscene || !S.exitDoor) return;
    if (c.footX > S.exitDoor.x * TS - 4 && c.footY <= (S.exitDoor.row + 1) * TS + 1) this.goTo(NEXT[S.id]);
  }

  // ======================================================================
  // Actualización
  // ======================================================================
  levelUpdate(dt) {
    if (this.pendingEnter && !this.cutscene && !this.game.transitioning && this.game.top === this) {
      const fn = this.pendingEnter;
      this.pendingEnter = null;
      fn();
    }
    if (this.sectionBannerPending && !this.game.transitioning) {
      this.sectionBannerPending = false;
      this.sectionBanner();
    }
    this.checkExits();
    this.updatePush();
    this.updateExceptions(dt);
    this.updateOverflow(dt);
    this.updateCollapse(dt);
    this.updateSmallPlats(dt);
    if (this.echo) {
      this.echo.t += dt;
      if (this.echo.t > STACK.ECHO_TIME) this.echo = null;
    }
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < (p.long ? 2.4 : 1));
    for (const n of this.nodes) if (n.hooked > 0) n.hooked -= dt;
    // Fase 4: los nodos y el núcleo de N.U.L.L. son lo único a qué engancharse
    if (this.section.id === 'arena') {
      const b = this.boss;
      this.lassoNodes = b && b.phase === 4 && b.fighting ? [...this.arenaNodes, b.core] : null;
      this.darkness += ((b && b.phase === 3 && b.fighting ? 1 : 0) - this.darkness) * Math.min(1, dt * 2);
    }
    if (this.patchLasso) this.patchLasso.t += dt;
  }

  hudState() {
    const s = super.hudState();
    const c = this.choco;
    s.lassoInRange = !!c.lassoTarget || c.swinging;
    return s;
  }

  // ---------- Depuración ----------
  // F10: en la pelea, termina la fase actual; en el Stack, lleva a Choco a la salida
  debugF10() {
    const b = this.boss;
    if (b && b.fighting) {
      b.hp = 0;
      b.clearPhase(this);
      return;
    }
    const S = this.section;
    if (!S.exitDoor) return;
    const c = this.choco;
    c.body.x = (S.exitDoor.x - 3) * TS;
    c.body.y = 4 * TS - c.body.h;
    c.body.vy = 0;
    if (this.overflow) this.overflow.stopped = true;
    this.camera.snapTo(c.footX, c.footY);
  }

  debugInfo() {
    const lines = super.debugInfo();
    lines.push(`sección ${this.section.id}${this.overflow ? ` · overflow ${Math.round(this.overflow.y)}` : ''}`);
    if (this.boss) lines.push(`N.U.L.L. fase ${this.boss.phase} ${this.boss.state} hp ${this.boss.hp}`);
    return lines;
  }

  // ======================================================================
  // Dibujo
  // ======================================================================
  drawBackground(ctx, cx, cy) {
    const glitch = this.section.glitch * (this.game.options.intenseGlitch ? 1 : 0.35);
    drawCodeBg(ctx, cx, cy, this.t, glitch);
  }

  drawTiles(ctx, cx, cy) {
    drawCodeTiles(ctx, this.map, cx, cy, { t: this.t, ghostActive: this.map.ghostSolid });
  }

  drawWorld(ctx, cx, cy) {
    const S = this.section;
    // Salida: hueco en la pared derecha con una flecha
    if (S.exitDoor) {
      const x = Math.round(S.exitDoor.x * TS - cx);
      const y = Math.round((S.exitDoor.row - 1) * TS - cy);
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 4);
      ctx.fillStyle = '#43D9FF';
      ctx.fillRect(x, y, TS * 2, TS * 2);
      ctx.globalAlpha = 1;
      drawText(ctx, '→', x + 10 + Math.round(Math.sin(this.t * 5) * 2), y + 12, { color: '#FFFFFF' });
    }
    // Nodos del lazo (en la arena, solo en la fase 4)
    const showNodes = S.id !== 'arena' || (this.boss && this.boss.phase === 4 && this.boss.state !== 'weak');
    if (showNodes) {
      const sel = this.choco.lassoTarget;
      for (const n of this.nodes) drawLassoNode(ctx, Math.round(n.x - cx), Math.round(n.y - cy), this.t, { selected: n === sel, hooked: n.hooked });
      if (this.boss && sel === this.boss.core) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(Math.round(sel.x - cx) - 13.5, Math.round(sel.y - cy) - 13.5, 27, 27);
      }
    }
    // Plataformas pequeñas de la fase 4
    for (const sp of this.smallPlats) {
      if (!sp.on || (sp.blink && Math.floor(this.t * 12) % 2)) continue;
      const p = sp.plat;
      const x = Math.round(p.x - cx);
      const y = Math.round(p.y - cy);
      ctx.fillStyle = '#2A1446';
      ctx.fillRect(x, y, p.w, 6);
      ctx.fillStyle = sp.blink ? '#FF2E88' : '#43D9FF';
      ctx.fillRect(x, y, p.w, 1);
      ctx.fillStyle = '#1C0E32';
      ctx.fillRect(x + 2, y + 6, p.w - 4, 2);
    }
    // La cuerda hacia el núcleo, antes del parche
    if (this.patchLasso && this.boss) {
      const h = this.choco.hand();
      const k = Math.min(1, this.patchLasso.t / 0.35);
      const ex = h.x + (this.boss.x - h.x) * k;
      const ey = h.y + (this.boss.y - 2 - h.y) * k;
      const n = Math.max(1, Math.round(Math.hypot(ex - h.x, ey - h.y)));
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        ctx.fillStyle = Math.abs(((i + this.t * 90) % 12) - 6) < 1.5 ? '#FFFFFF' : i % 2 ? '#43D9FF' : '#2AA8D8';
        ctx.fillRect(Math.round(h.x + (ex - h.x) * q - cx), Math.round(h.y + (ey - h.y) * q - cy), 1, 1);
      }
    }
  }

  drawForeground(ctx, cx, cy) {
    if (this.overflow) drawOverflow(ctx, this.overflow.y - cy, SCREEN.W, SCREEN.H, this.t);
    // Fase 3: la arena se oscurece (la Vista Debug ve un poco más)
    if (this.darkness > 0.02) {
      const L = this.lighting;
      const a = NULL_BOSS.P3.DARK * this.darkness * (this.map.ghostSolid ? 0.55 : 1);
      L.begin('#05030A', a);
      const c = this.choco;
      L.light(Math.round(c.cx - cx), Math.round(c.cy - cy), 46, { strength: 1 });
      for (const e of this.enemies) if (e.copyLight !== false && e.boss) L.light(Math.round(e.cx - cx), Math.round(e.cy - cy), 34, { strength: 0.7 });
      L.draw(ctx);
    }
  }

  drawUi(ctx) {
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    for (const p of this.popups) {
      if (p.t < 0) continue;
      const life = p.long ? 2.4 : 1;
      ctx.globalAlpha = Math.min(1, (life - p.t) * 3);
      drawText(ctx, p.text, Math.round(Math.max(60, Math.min(SCREEN.W - 60, p.x - cx))), Math.round(p.y - cy - p.t * 14), { align: 'center', color: p.color });
      ctx.globalAlpha = 1;
    }
    if (this.echo && !this.cutscene) this.drawEchoBubble(ctx, this.echo);
    if (this.game.hotfix && this.hud.visible && !this.cutscene) drawText(ctx, TEXTS.worldMap.hotfixTag, SCREEN.W - 4, SCREEN.H - 10, { align: 'right', color: UI.magenta });
  }

  // Eco de un fundador en el borde, con su consejo
  drawEchoBubble(ctx, e) {
    const a = Math.min(1, e.t * 4, (STACK.ECHO_TIME - e.t) * 3);
    const all = e.who === 'all';
    const list = all ? FOUNDERS : [e.who];
    list.forEach((who, i) => {
      const right = all ? i % 2 === 1 : who === 'hezron' || who === 'fabiola';
      const x = right ? SCREEN.W - 14 : 14;
      const y = all ? 70 + Math.floor(i / 2) * 36 : 74;
      drawEcho(ctx, x, y, who, this.t + i, a);
    });
    const right = !all && (e.who === 'hezron' || e.who === 'fabiola');
    const w = 168;
    const bx = all ? (SCREEN.W - w) / 2 : right ? SCREEN.W - w - 32 : 32;
    const by = all ? 38 : 40;
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = '#0B0610';
    ctx.fillRect(bx, by, w, 26);
    ctx.globalAlpha = a;
    ctx.fillStyle = all ? UI.magenta : ACCENTS[e.who];
    ctx.fillRect(bx, by, w, 1);
    drawTextBox(ctx, e.text, bx + 5, by + 4, w - 10, { color: UI.text, lineHeight: 9 });
    ctx.globalAlpha = 1;
  }

  // Terminal de checkpoint (apagada en Modo Hotfix si es de las que no cuentan)
  drawCheckpoint(ctx, s, cx, cy) {
    const on = this.checkpoint && this.checkpoint.id === s.id;
    drawTerminal(ctx, Math.round(s.x - cx), Math.round(s.y - cy), on, this.t, s.flash);
  }
}

