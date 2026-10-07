// Nivel 4 · Santa Cruz — docs/niveles/nivel_4_santa_cruz.md
// Plataformas de acción con calor: 4-A Entrada → 4-B Plaza (misión de la rosquilla, techos con
// plataformas fantasma) → 4-C Redondel (3 oleadas) → 4-D Ruinas del Campanario (vertical) →
// El Torito Kernel → rescate de Fabiola (Lazo de Fibra Óptica) → 4-E Atardecer (práctica del lazo).
import { SCREEN, HEALTH, HEAT, REDONDEL, RUINS } from '../../config/balance.js';
import { Tilemap, T } from '../../systems/tilemap.js';
import { PlatformLevel } from '../PlatformLevel.js';
import { level4Sections, SC_LEGEND, SHADE_RUN_CHARS, L4_CHECKPOINTS } from './maps.js';
import { createHeat, heatStep, heatCool, heatDripping, inZones, castShade } from '../../systems/heat.js';
import { drawSantaCruzTiles } from '../../art/tiles/santacruz.js';
import { drawSantaCruzBg, drawSantaCruzFront } from '../../art/backgrounds/santacruz.js';
import {
  drawGuanacaste,
  drawCarreta,
  drawStall,
  drawMarimba,
  drawFountain,
  drawFarol,
  drawOven,
  drawLassoNode,
  drawBell,
  drawCage,
  drawSunbeam,
  drawAwning,
  foodSprite,
} from '../../art/santacruz.js';
import { drawGlitchPortal } from '../../art/portal.js';
import { founderSprite } from '../../art/portraits.js';
import { drawText } from '../../art/font.js';
import { createCanvas } from '../../core/renderer.js';
import { Toro, Bombetero, Sabanero, Zanate, ZanateFlock, TamalPot, Bombeta } from '../../entities/enemies/santacruz.js';
import { Torito } from '../../entities/bosses/torito.js';
import { FallingPlatform } from '../../entities/hazards.js';
import { Pickup } from '../../entities/pickups.js';
import { ItemGetScene } from '../../scenes/ItemGetScene.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { ACCENTS, UI } from '../../art/palettes.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_SANTACRUZ, SONG_TORITO, SONG_ATARDECER } from '../../audio/songs/santacruz.js';
import { fxRng } from '../../core/rng.js';
import { Ease } from '../../core/tween.js';

const TS = SCREEN.TILE;
const R = fxRng;
const L4 = TEXTS.level4;
const GOLDEN_INDEX = { B: 0, C: 1, E: 2 };
const CRUMBS = ['#5E3A1A', '#8B5A2B', '#3B2416'];

// Plataforma de ladrillo que se desmorona (misma lógica que la del nivel 1, otro dibujo)
class CrumblePlatform extends FallingPlatform {
  draw(ctx, camX, camY) {
    if (this.state === 'gone') return;
    const p = this.plat;
    const ox = this.state === 'shake' ? (Math.floor(this.t * 40) % 2 ? 1 : -1) : 0;
    const x = Math.round(p.x - camX) + ox;
    const y = Math.round(p.y - camY);
    if (this.respawnT > 0) ctx.globalAlpha = 1 - this.respawnT / 0.4;
    ctx.fillStyle = '#5A2A20';
    ctx.fillRect(x, y, p.w, 9);
    ctx.fillStyle = '#A0503A';
    ctx.fillRect(x + 1, y + 1, p.w - 2, 6);
    ctx.fillStyle = '#C9A27E';
    ctx.fillRect(x + 1, y + 1, p.w - 2, 1);
    ctx.fillStyle = '#5A2A20';
    for (let i = 7; i < p.w - 2; i += 8) ctx.fillRect(x + i, y + 2, 1, 5);
    // Grietas que avisan que se cae
    ctx.fillRect(x + 4, y + 4, 3, 1);
    ctx.fillRect(x + p.w - 8, y + 3, 2, 1);
    ctx.globalAlpha = 1;
  }
}

export class Level4Scene extends PlatformLevel {
  // start: 'plaza' | 'redondel' | 'ruinas' | 'torito' | 'lazo' (atajos de desarrollo)
  constructor(game, { start = null } = {}) {
    super(game, { levelId: 4 });
    this.sections = level4Sections();
    this.heat = createHeat();
    this.food = null; // comida que lleva Choco para Fabiola
    this.flags = {};
    this.rescued = this.founders.includes('fabiola');
    this.blasts = [];
    this.popups = [];
    this.waveBuf = null;
    this.signColor = '#FFB347';
    let section = 'A';
    let entry = 'start';
    let cpId = null;
    const cp = this.session?.data.checkpoint;
    const saved = cp && cp.level === 4 ? L4_CHECKPOINTS.find((c) => c.id === cp.id) : null;
    if (saved) {
      section = saved.section;
      entry = 'checkpoint';
      cpId = saved.id;
    }
    // [sección, entrada, checkpoint]
    const shortcuts = { plaza: ['B', 'checkpoint', 0], redondel: ['C', 'checkpoint', 1], ruinas: ['D', 'start', null], torito: ['arena', 'arena', null], lazo: ['E', 'checkpoint', 3] };
    if (shortcuts[start]) {
      [section, entry, cpId] = shortcuts[start];
      this.flags.introSeen = true;
      if (start !== 'plaza') this.flags.plazaSeen = true;
    }
    if (section !== 'A') this.flags.introSeen = true;
    if (section === 'D' || section === 'arena' || section === 'E') this.flags.ringDone = true;
    this.constructing = true;
    this.loadSection(section, { entry, id: cpId });
    this.constructing = false;
    if (section === 'E') this.grantLasso();
  }

  // Sin partida (atajo de desarrollo): Botas, Laptop, Escudo y los cuadritos de Óscar, Stward y Hezron
  startingLoadout() {
    const lo = super.startingLoadout();
    if (!this.session) {
      lo.items.boots = true;
      lo.items.laptop = true;
      lo.items.shield = true;
      lo.maxHp = 4;
    }
    return lo;
  }

  // Ya vencido el jefe (al reanudar en 4-E): lazo y barra completa
  grantLasso() {
    this.flags.bossBeaten = true;
    const c = this.choco;
    c.items.lasso = true;
    if (!this.rescued) c.setMaxHp(Math.min(HEALTH.MAX_POSSIBLE, c.maxHp + 1));
    c.hp = c.maxHp;
  }

  enter() {
    this.playSectionMusic();
    if (!this.flags.introSeen) {
      this.flags.introSeen = true;
      const s = this;
      this.playCutscene(
        function* (cs) {
          yield 0.6;
          yield cs.say(DIALOGUES.level4Intro);
        },
        { onEnd: () => s.showBanner(L4.heatHint, L4.heatHintSub, null, 3) },
      );
    }
  }

  playSectionMusic() {
    const id = this.section.id;
    if (id === 'arena') {
      if (this.boss && this.boss.state !== 'intro') this.game.audio.playSong(SONG_TORITO);
      return;
    }
    this.game.audio.playSong(id === 'E' ? SONG_ATARDECER : SONG_SANTACRUZ);
  }

  // ======================================================================
  // Secciones
  // ======================================================================
  loadSection(id, { entry = 'start', id: cpId = null, keepChoco = false } = {}) {
    const S = this.sections[id];
    const prevId = this.section?.id;
    this.section = S;
    this.setMap(new Tilemap([...S.rows], SC_LEGEND));
    this.enemies = [];
    this.hazards = [];
    this.pickups = [];
    this.signs = [];
    this.interactables = [];
    this.shots = [];
    this.blasts = [];
    this.boss = null;
    this.cameraLock = null;
    this.smoke = null;
    this.cage = null;
    this.fabiola = null;
    this.ring = null;
    this.exiting = false;
    this.lassoNodes = null;
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
    } else if (entry === 'left') {
      x = TS + 4;
      y = this.groundTop(1) * TS;
    } else if (entry === 'arena') {
      x = 2 * TS + 8;
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
      c.tether = null;
      c.state = 'play';
      this.camera.snapTo(c.footX, c.footY);
    }
    this.buildShade();
    if (id === 'arena') this.startArena();
    else if (prevId !== id || entry !== 'left') {
      if (!this.constructing) this.playSectionMusic();
    }
    if (id === 'E') this.enterSunset();
    if (S.vertical) this.camera.snapTo(this.choco.footX, this.choco.footY);
  }

  populate(S) {
    const m = this.map;
    const foot = (tx, ty) => ({ x: tx * TS + 8, y: (ty + 1) * TS });
    this.trees = [];
    this.carts = [];
    this.fountains = [];
    this.pots = [];
    for (const { tx, ty } of m.find('t')) this.enemies.push(new Toro(foot(tx, ty).x, foot(tx, ty).y, { dir: -1 }));
    for (const { tx, ty } of m.find('b')) this.enemies.push(new Bombetero(foot(tx, ty).x, foot(tx, ty).y));
    for (const { tx, ty } of m.find('h')) this.enemies.push(new Sabanero(foot(tx, ty).x, foot(tx, ty).y));
    for (const { tx, ty } of m.find('z')) {
      const flock = new ZanateFlock();
      const n = S.flocks?.[tx] ?? 4;
      for (let i = 0; i < n; i++) this.enemies.push(new Zanate(tx * TS + 8 + (i - (n - 1) / 2) * 10, ty * TS + 8 - (i % 2) * 4, flock, i));
    }
    for (const { tx, ty } of m.find('o')) this.hazards.push(new TamalPot(foot(tx, ty).x, foot(tx, ty).y, S.pots?.[tx] ?? -1));
    for (const { tx, ty } of m.find('$')) this.pickups.push(new Pickup('bit', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('C')) this.pickups.push(new Pickup('cacao', tx * TS + 8, ty * TS + 8));
    for (const { tx, ty } of m.find('H')) this.pickups.push(new Pickup('chunk', tx * TS + 8, ty * TS + 8));
    const gi = GOLDEN_INDEX[S.id];
    for (const { tx, ty } of m.find('Y')) {
      if (gi !== undefined && !this.goldenY[gi]) this.pickups.push(new Pickup('goldenY', tx * TS + 8, ty * TS + 8, { index: gi, ghost: this.goldenGhost(gi) }));
    }
    for (const { tx, ty } of m.find('T')) {
      const w = S.trees?.[tx] ?? 76;
      const f = foot(tx, ty);
      this.trees.push({ x: f.x, gy: f.y, w, bottom: f.y - 50 });
    }
    for (const { tx, ty } of m.find('k')) this.carts.push({ x: foot(tx, ty).x, gy: foot(tx, ty).y });
    for (const { tx, ty } of m.find('w')) this.fountains.push({ x: foot(tx, ty).x, gy: foot(tx, ty).y, splash: 0, cool: 0 });
    this.nodes = m.find('n').map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8, hooked: 0 }));
    // Checkpoints (faroles) en orden
    const cps = L4_CHECKPOINTS.filter((c) => c.section === S.id);
    m.find('!')
      .sort((a, b) => a.tx - b.tx)
      .forEach(({ tx, ty }, i) => {
        if (!cps[i]) return;
        this.addSign(tx * TS + 8, (ty + 1) * TS, null, { checkpoint: true, id: cps[i].id, section: S.id, draw: this.drawCheckpoint });
      });
    for (const s of S.signs || []) this.addSign(s.x * TS + 8, this.groundTop(s.x) * TS, L4.signs[s.key], { draw: this.drawWorldSign });
    // Puestos de comida de la plaza
    this.stalls = (S.stalls || []).map((st) => {
      const o = { ...st, px: st.x * TS + 8, gy: S.floor * TS };
      this.addInteractable({ x: o.px, y: o.gy, range: 18, hintH: 52, onUse: () => this.pickFood(st.food) });
      return o;
    });
    this.marimba = S.marimba ? { x: S.marimba.x * TS + 8, gy: S.floor * TS } : null;
    this.oven = S.oven ? { x: S.oven.x * TS + 8, gy: S.oven.floorRow * TS } : null;
    if (this.oven) this.addInteractable({ x: this.oven.x, y: this.oven.gy, range: 18, hintH: 40, onUse: () => this.pickFood('rosquilla', true) });
    for (const c of S.crumbles || []) this.hazards.push(new CrumblePlatform(c.x * TS, c.y * TS, c.w));
    this.beams = (S.beams || []).map((b) => ({ ...b, cx: b.x * TS + 8 }));
    this.ringDef = S.ring || null;
    if (this.ringDef) this.ring = { phase: this.flags.ringDone ? 'done' : 'idle', t: 0, kills: 0, wave: -1, bombT: 2 };
    if (this.ring && this.ring.phase === 'idle') this.setGates(false);
    if (this.ring && this.ring.phase === 'done') this.setGates(false);
    this.portal = S.portal ? { x: S.portal.x * TS + 8, gy: S.floor * TS, open: 1 } : null;
    this.challengeShown = new Set();
  }

  // Fila del primer suelo sólido de la columna tx (saltando el techo)
  groundTop(tx) {
    const m = this.map;
    let ty = 0;
    while (ty < m.h && m.typeAt(tx, ty) === T.SOLID) ty++;
    for (; ty < m.h; ty++) if (m.typeAt(tx, ty) === T.SOLID) return ty;
    return m.h;
  }

  // Altura del primer suelo (sólido o de un sentido) debajo de un punto
  groundBelow(x, y) {
    const tx = Math.floor(x / TS);
    for (let ty = Math.max(0, Math.floor(y / TS)); ty < this.map.h; ty++) {
      if (this.map.isSolid(tx, ty) || this.map.isOneWay(tx, ty)) return ty * TS;
    }
    return this.map.pxH;
  }

  // ---------- Sombra ----------
  buildShade() {
    const S = this.section;
    const m = this.map;
    const casters = [];
    for (const t of this.trees) casters.push({ x: t.x - t.w / 2 + 4, w: t.w - 8, y: t.bottom });
    for (const c of this.carts) casters.push({ x: c.x - 22, w: 44, y: c.gy - 33 });
    for (const st of this.stalls) casters.push({ x: st.px - 24, w: 48, y: st.gy - 36 });
    if (this.marimba) casters.push({ x: this.marimba.x - 30, w: 60, y: this.marimba.gy - 44 });
    for (const a of S.awnings || []) casters.push({ x: a.x0 * TS, w: (a.x1 - a.x0 + 1) * TS, y: (a.row + 1) * TS, h: a.h * TS });
    // Tramos de tiles con espacio libre debajo (aleros, arcos, capiteles)
    const runChars = new Set(S.shadeRuns ?? SHADE_RUN_CHARS);
    for (let ty = 0; ty < m.h; ty++) {
      let start = -1;
      for (let tx = 0; tx <= m.w; tx++) {
        const ch = m.charAt(tx, ty);
        const ok = tx < m.w && runChars.has(ch) && !m.isSolid(tx, ty + 1) && m.charAt(tx, ty + 1) !== ch;
        if (ok && start < 0) start = tx;
        if (!ok && start >= 0) {
          casters.push({ x: start * TS, w: (tx - start) * TS, y: (ty + 1) * TS });
          start = -1;
        }
      }
    }
    const isSolid = (tx, ty) => m.isSolid(tx, ty);
    this.shadeZones = casters.flatMap((c) => castShade(c, isSolid, m.h, TS));
  }

  beamRect(b) {
    const x = b.cx + Math.sin(this.t * RUINS.BEAM_SPEED + b.phase) * RUINS.BEAM_SWAY - RUINS.BEAM_W / 2;
    return { x, y: b.y0 * TS, w: RUINS.BEAM_W, h: (b.y1 - b.y0) * TS };
  }

  chocoInSun() {
    const S = this.section;
    const c = this.choco;
    if (S.heat === 'none') return false;
    const px = c.cx;
    const py = c.body.y + 6;
    if (S.heat === 'shade') return this.beams.some((b) => inZones([this.beamRect(b)], px, py));
    return !inZones(this.shadeZones, px, py);
  }

  get heatRate() {
    return this.boss?.phase2 && this.boss.active ? HEAT.SUN_RATE_BOSS2 : HEAT.SUN_RATE;
  }

  updateHeat(dt) {
    const c = this.choco;
    const S = this.section;
    if (S.heat === 'none') {
      this.heat.value = 0;
      return;
    }
    if (c.state !== 'play' || this.cutscene || this.ending || this.game.transitioning) return;
    const sun = this.chocoInSun();
    this.inSun = sun;
    if (heatStep(this.heat, dt, sun, this.heatRate) === 'burn') {
      playSfx(this.game.audio, 'heatBurn');
      this.popups.push({ text: L4.burn, x: c.cx, y: c.body.y - 6, t: 0, color: '#FF6B3A' });
      c.hurt(c.cx - c.facing, { ignoreShield: true, knockback: false });
      this.particles.burst(c.cx, c.cy, 14, { angle: -Math.PI / 2, spread: 1.4, speedMin: 20, speedMax: 60, colors: ['#E8E0D0', '#FFFFFF'], lifeMin: 0.4, lifeMax: 0.8, gravity: -40 });
    }
    // Gotas de chocolate y chisporroteo con el calor alto
    if (heatDripping(this.heat)) {
      if (R.chance(0.12 + (this.heat.value - HEAT.DRIP_FROM) / 300)) {
        this.particles.spawn({ x: c.cx + R.range(-4, 4), y: c.footY - R.range(2, 12), vx: R.range(-6, 6), vy: R.range(0, 20), gravity: 400, life: 0.5, colors: CRUMBS, size: 2, endSize: 1 });
      }
      this.sizzleT = (this.sizzleT || 0) - dt;
      if (this.sizzleT <= 0) {
        this.sizzleT = R.range(0.18, 0.35);
        playSfx(this.game.audio, 'sizzle');
      }
    }
    // Bebederos: enfrían de golpe
    for (const f of this.fountains) {
      if (f.cool > 0) f.cool -= dt;
      if (f.splash > 0) f.splash -= dt * 2;
      if (Math.abs(c.footX - f.x) < 11 && c.footY <= f.gy + 1 && c.footY > f.gy - 26) {
        if (this.heat.value > 0 && f.cool <= 0) {
          heatCool(this.heat);
          f.cool = HEAT.WATER_COOLDOWN;
          f.splash = 1;
          playSfx(this.game.audio, 'water');
          this.popups.push({ text: L4.water, x: f.x, y: f.gy - 30, t: 0, color: '#43D9FF' });
          this.particles.burst(f.x, f.gy - 14, 14, { angle: -Math.PI / 2, spread: 1.6, speedMin: 30, speedMax: 90, colors: ['#43D9FF', '#8AE8FF', '#FFFFFF'], gravity: 300, lifeMin: 0.3, lifeMax: 0.6 });
        }
      }
    }
  }

  // ======================================================================
  // Misión de Fabiola: la rosquilla perfecta
  // ======================================================================
  pickFood(key, fromOven = false) {
    const f = L4.foods[key];
    const had = this.food;
    if (had === key) {
      this.showBanner(L4.carrying(f.name), L4.future(f.comment), null, 2.4);
      return;
    }
    this.food = key;
    playSfx(this.game.audio, 'foodPick');
    const c = this.choco;
    this.particles.burst(c.cx, c.body.y, 10, { speedMin: 20, speedMax: 50, colors: ['#FFD23F', '#F2B84A', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
    if (fromOven && !this.flags.ovenSeen) {
      this.flags.ovenSeen = true;
      const s = this;
      this.playCutscene(function* (cs) {
        yield cs.say(DIALOGUES.ovenFind);
      }, { onEnd: () => s.showBanner(L4.carrying(f.name), had ? L4.swap : '', null, 2.4) });
      return;
    }
    this.showBanner(L4.carrying(f.name), had ? L4.swap : L4.future(f.comment), null, had ? 2.2 : 3);
    if (had) this.pendingFood = { t: 2.3, key };
  }

  // ======================================================================
  // El Redondel
  // ======================================================================
  setGates(closed) {
    const d = this.ringDef;
    for (const gx of [d.gateL, d.gateR]) {
      for (let ty = d.gateRows[0]; ty <= d.gateRows[1]; ty++) this.map.setChar(gx, ty, closed ? 'W' : '.');
    }
  }

  updateRing(dt) {
    const r = this.ring;
    const d = this.ringDef;
    const c = this.choco;
    if (!r || r.phase === 'done') return;
    if (r.phase === 'idle') {
      if (c.state === 'play' && c.footX > d.trigger * TS && c.body.onGround) {
        r.phase = 'fight';
        this.setGates(true);
        playSfx(this.game.audio, 'doorOpen');
        this.game.effects.shake(0.3);
        const s = this;
        const start = () => {
          s.showBanner(L4.redondel.wave(1), L4.redondel.goal, null, 2.2);
        };
        if (!this.flags.ringIntro) {
          this.flags.ringIntro = true;
          this.playCutscene(function* (cs) {
            yield 0.3;
            yield cs.say(DIALOGUES.redondelIntro);
          }, { onEnd: start });
        } else start();
      }
      return;
    }
    if (this.cutscene) return;
    r.t += dt;
    // Oleadas
    const waves = REDONDEL.WAVES;
    while (r.wave + 1 < waves.length && r.t >= waves[r.wave + 1].at) {
      r.wave++;
      if (r.wave > 0) this.showBanner(L4.redondel.wave(r.wave + 1), '', null, 1.6);
      waves[r.wave].toros.forEach((side, i) => {
        r.spawns ||= [];
        r.spawns.push({ side, t: i * 1.2 + REDONDEL.SPAWN_WARN });
      });
      if (r.wave === REDONDEL.GOLDEN_WAVE && !this.goldenY[1]) {
        const g = d.golden;
        this.ringY = new Pickup('goldenY', g.x * TS, g.y * TS + 8, { index: 1, ghost: this.goldenGhost(1) });
        this.pickups.push(this.ringY);
        playSfx(this.game.audio, 'goldenY');
      }
    }
    const gateX = (side) => (side < 0 ? (d.gateL + 1) * TS + 8 : d.gateR * TS - 8);
    // Nunca encima de Choco: si está junto a esa puerta, el toro entra por la otra
    const safeSide = (side) => (Math.abs(c.cx - gateX(side)) < REDONDEL.SPAWN_SAFE ? -side : side);
    const floorY = this.section.floor * TS;
    for (const sp of r.spawns || []) {
      if (sp.done) continue;
      sp.t -= dt;
      // Aviso: polvo y bufido en la puerta por donde va a entrar
      if (sp.t <= REDONDEL.SPAWN_WARN && !sp.warned) {
        sp.warned = true;
        sp.side = safeSide(sp.side);
        playSfx(this.game.audio, 'toroCharge');
      }
      if (sp.warned && sp.t > 0 && R.chance(0.5)) {
        const wx = gateX(sp.side);
        this.particles.spawn({ x: wx + R.range(-6, 6), y: floorY - 2, vx: R.range(-20, 20), vy: R.range(-50, -15), gravity: 120, life: 0.45, colors: ['#B85E36', '#E6D488'] });
      }
      if (sp.t <= 0) {
        sp.done = true;
        sp.side = safeSide(sp.side);
        const x = gateX(sp.side);
        this.enemies.push(new Toro(x, floorY, { dir: -sp.side, arena: true }));
        this.particles.burst(x, floorY - 4, 14, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 20, speedMax: 70, colors: ['#B85E36', '#E6D488'], lifeMin: 0.3, lifeMax: 0.6 });
      }
    }
    // Bombetas que caen del cielo
    r.bombT -= dt;
    if (r.bombT <= 0) {
      r.bombT = REDONDEL.BOMB_EVERY[Math.max(0, r.wave)];
      const tx = Math.max((d.gateL + 1) * TS + 8, Math.min(d.gateR * TS - 8, c.cx + R.range(-36, 36)));
      const ty = this.groundBelow(tx, c.body.y - 40) - 4;
      this.hazards.push(new Bombeta(tx + R.range(-30, 30), this.camera.y - 12, tx, ty, 1.3, null, { sky: true }));
      playSfx(this.game.audio, 'bombetaThrow');
    }
    if (r.t >= REDONDEL.SURVIVE || r.kills >= REDONDEL.KILLS) this.finishRing();
  }

  onEnemyKilled(e) {
    if (this.ring?.phase === 'fight' && e instanceof Toro) this.ring.kills++;
  }

  finishRing() {
    const r = this.ring;
    r.phase = 'done';
    this.flags.ringDone = true;
    for (const e of this.enemies) if (e instanceof Toro) e.explode(this, 0, 1);
    this.hazards = this.hazards.filter((h) => !(h instanceof Bombeta));
    if (this.ringY && !this.ringY.dead && !this.goldenY[1]) {
      this.ringY.dead = true;
      this.particles.burst(this.ringY.x, this.ringY.y, 12, { speedMin: 20, speedMax: 60, colors: ['#FFD23F', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
    }
    this.setGates(false);
    playSfx(this.game.audio, 'gateOpen');
    this.game.effects.flash('#FFD23F', 3);
    this.showBanner(L4.redondel.done, L4.redondel.doneSub, null, 2.4);
  }

  // ======================================================================
  // Arena del Torito Kernel
  // ======================================================================
  startArena() {
    const S = this.section;
    const floorY = S.floor * TS;
    this.cameraLock = { x: 0, y: this.map.pxH - SCREEN.H };
    this.camera.x = this.cameraLock.x;
    this.camera.y = this.cameraLock.y;
    // Columnas (se pueden romper en la fase 2)
    const cols = new Map();
    for (const { tx, ty } of this.map.find('c')) {
      if (!cols.has(tx)) cols.set(tx, { x: tx * TS, tx, rows: [], alive: true, hits: 0 });
      cols.get(tx).rows.push(ty);
    }
    this.columns = [...cols.values()];
    this.crackedTiles = new Set();
    const bell = S.bell;
    this.bell = { x: bell.x * TS, y: bell.y * TS, ring: 0 };
    if (this.flags.bossBeaten) return;
    const boss = new Torito(10 * TS, floorY, { left: TS, right: this.map.pxW - TS });
    boss.dir = -1;
    this.boss = boss;
    this.enemies.push(boss);
    // Fabiola en la jaula, colgando de la campana
    this.cage = { x: this.bell.x, y: this.bell.y + 52, hanging: true, vy: 0, landed: false, open: 0 };
    const s = this;
    const g = this.game;
    const intro = function* (cs) {
      yield 0.5;
      if (!s.flags.bossIntro) {
        s.flags.bossIntro = true;
        yield cs.say(DIALOGUES.toritoIntro);
      }
      playSfx(g.audio, 'roar');
      g.effects.shake(0.5);
      s.showBanner(L4.boss.name, L4.boss.sub, null, 1.8);
      g.audio.playSong(SONG_TORITO);
      yield 1.2;
    };
    const after = () => {
      if (!s.flags.bossHint) {
        s.flags.bossHint = true;
        s.showBanner(L4.boss.hint, L4.boss.hintSub, null, 3.4);
      }
    };
    if (this.constructing) this.pendingEnter = () => this.playCutscene(intro, { skippable: true, keepHud: true, onEnd: after });
    else this.playCutscene(intro, { skippable: true, keepHud: true, onEnd: after });
  }

  onColumnHit(col, phase2) {
    if (!phase2) return;
    col.hits++;
    for (const ty of col.rows) this.crackedTiles.add(`${col.tx},${ty}`);
    if (col.hits >= 2) this.breakColumn(col);
  }

  breakColumn(col) {
    col.alive = false;
    for (const ty of col.rows) {
      this.map.setChar(col.tx, ty, '.');
      this.particles.burst(col.x + 8, ty * TS + 8, 10, { speedMin: 30, speedMax: 110, colors: ['#E2D3B2', '#B2A07C', '#F6ECD4'], gravity: 300, lifeMin: 0.4, lifeMax: 0.9, size: 2, endSize: 1 });
    }
    // El capitel se cae con ella
    const capRow = Math.min(...col.rows) - 1;
    for (let tx = col.tx - 1; tx <= col.tx + 1; tx++) if (this.map.charAt(tx, capRow) === '=') this.map.setChar(tx, capRow, '.');
    playSfx(this.game.audio, 'blockBreak');
    this.game.effects.shake(0.6);
    this.buildShade();
  }

  onBossPhase2() {
    this.showBanner(L4.boss.phase2, L4.boss.phase2Sub, null, 2.2);
    this.game.effects.flash('#FFB347', 4);
  }

  startSmoke(side, time) {
    this.smoke = { side, t: 0, time };
  }

  onBossDefeated() {
    this.flags.bossBeaten = true;
    this.smoke = null;
    this.hazards = [];
    this.enemies = this.enemies.filter((e) => e === this.boss);
    const s = this;
    const g = this.game;
    const c = this.choco;
    if (this.rescued) {
      this.playCutscene(function* () {
        yield 1.2;
        playSfx(g.audio, 'bell');
        s.bell.ring = 1;
        yield 1.4;
        c.items.lasso = true;
        s.toSunset();
      }, { skippable: false });
      return;
    }
    this.playCutscene(
      function* (cs) {
        yield 1.0;
        // La campana suena y la jaula cae
        playSfx(g.audio, 'bell');
        s.bell.ring = 1;
        yield 0.8;
        s.cage.hanging = false;
        yield cs.until(() => s.cage.landed);
        yield 0.5;
        playSfx(g.audio, 'cageOpen');
        s.cage.opening = true;
        yield cs.until(() => s.cage.open >= 1);
        const floorY = s.section.floor * TS;
        s.fabiola = { x: s.cage.x, y: floorY, t: 0, walk: 0, light: 0, facing: c.cx < s.cage.x ? -1 : 1 };
        s.cage = null;
        const target = c.footX + (s.fabiola.x > c.footX ? 22 : -22);
        while (Math.abs(s.fabiola.x - target) > 1) {
          s.fabiola.x += Math.sign(target - s.fabiola.x) * Math.min(1, Math.abs(target - s.fabiola.x));
          s.fabiola.walk += 1 / 60;
          yield 1 / 60;
        }
        s.fabiola.walk = 0;
        c.facing = s.fabiola.x > c.footX ? 1 : -1;
        s.fabiola.facing = -c.facing;
        yield 0.3;
        yield cs.say(DIALOGUES.fabiolaRescue);
        // La comida que le trajo Choco
        if (s.food === 'rosquilla') {
          s.fabiola.food = 'rosquilla';
          yield cs.say(DIALOGUES.fabiolaRosquilla);
          s.giveRecipe();
          yield 2.2;
        } else if (s.food) {
          s.fabiola.food = s.food;
          yield cs.say([{ who: 'fabiola', face: 'worried', text: L4.foods[s.food].comment }]);
        }
        s.fabiola.food = null;
        // Fabiola se vuelve luz turquesa y completa la barra
        s.hudInCutscene = true;
        s.hud.visible = true;
        s.fabiola.toLight = true;
        playSfx(g.audio, 'squareIn');
        yield cs.until(() => s.fabiola.light >= 1);
        s.fabiola.fly = { t: 0, x0: s.fabiola.x, y0: s.fabiola.y - 12 };
        yield cs.until(() => s.fabiola.fly.t >= 1);
        s.fabiola = null;
        playSfx(g.audio, 'join');
        g.effects.flash(ACCENTS.fabiola, 4);
        s.particles.burst(c.cx, c.cy, 30, { speedMin: 30, speedMax: 110, colors: [ACCENTS.fabiola, '#FFFFFF', '#A8F0E8'], lifeMin: 0.3, lifeMax: 0.8 });
        c.setMaxHp(Math.min(HEALTH.MAX_POSSIBLE, c.maxHp + 1));
        c.hp = c.maxHp;
        c.setSquash({ X: 1.3, Y: 0.8 });
        yield 1.2;
        s.hudInCutscene = false;
        s.hud.visible = false;
        c.items.lasso = true;
        yield cs.push(new ItemGetScene(g, 'lasso'));
        yield 0.3;
        yield cs.say(DIALOGUES.fabiolaLasso);
      },
      {
        onSkip: () => {
          s.hudInCutscene = false;
          s.cage = null;
          s.fabiola = null;
          if (s.food === 'rosquilla') s.giveRecipe(true);
          c.items.lasso = true;
          c.setMaxHp(Math.min(HEALTH.MAX_POSSIBLE, Math.max(c.maxHp, 5)));
          c.hp = c.maxHp;
        },
        onEnd: () => s.toSunset(),
      },
    );
  }

  // Recompensa de la misión: la Receta de la Abuela (cobertura al empezar el nivel 5)
  giveRecipe(silent = false) {
    if (this.recipeGiven) return;
    this.recipeGiven = true;
    this.food = null;
    if (this.session) this.session.update({ ...this.session.data, grandmaRecipe: true });
    if (silent) return;
    playSfx(this.game.audio, 'item');
    this.showBanner(L4.recipe, L4.recipeSub, null, 2.6);
  }

  toSunset() {
    this.game.startTransition({ type: 'fade', duration: 0.8, onMid: () => this.loadSection('E', { entry: 'start', keepChoco: true }) });
  }

  // ======================================================================
  // 4-E · Atardecer: práctica del lazo
  // ======================================================================
  enterSunset() {
    this.lassoNodes = this.nodes;
    const c = this.choco;
    if (c) c.items.lasso = true;
    if (this.flags.lassoIntro) return;
    this.flags.lassoIntro = true;
    const s = this;
    const show = () =>
      this.playCutscene(function* (cs) {
        yield 0.5;
        yield cs.say(DIALOGUES.lassoIntro);
      }, { onEnd: () => s.showBanner(L4.lasso.hint(s.game.input.keyName('lasso')), L4.lasso.reel, null, 3.4) });
    if (this.constructing || this.game.transitioning) this.pendingEnter = show;
    else show();
  }

  updateSunset() {
    const c = this.choco;
    const S = this.section;
    for (const ch of S.challenges || []) {
      if (!this.challengeShown.has(ch.i) && c.footX > ch.x * TS && c.body.onGround && c.state === 'play' && !this.cutscene) {
        this.challengeShown.add(ch.i);
        this.showBanner(L4.lasso.challenges[ch.i], '', null, 1.8);
      }
    }
    for (const n of this.nodes) if (n.hooked > 0) n.hooked -= 1 / 60;
    const p = this.portal;
    if (p && !this.ending && !this.cutscene && c.state === 'play' && Math.abs(c.footX - p.x) < 10 && c.footY > p.gy - 30) {
      playSfx(this.game.audio, 'portal');
      const s = this;
      this.playCutscene(function* (cs) {
        yield 0.3;
        yield cs.say(DIALOGUES.lassoDone);
      }, { onEnd: () => s.finishLevel({ delay: 1.6 }) });
    }
  }

  // En el barranco caer no cuesta vida: vuelve a la última cornisa
  onChocoFell(c) {
    if (this.section.id === 'E') {
      this.returnToSafe(c);
      return;
    }
    super.onChocoFell(c);
  }

  // ======================================================================
  // Muerte, reaparición y cambios de sección
  // ======================================================================
  onRespawn() {
    const cp = this.checkpoint;
    heatCool(this.heat);
    const entry = cp.section === 'arena' ? 'arena' : cp.id >= 0 ? 'checkpoint' : 'start';
    this.loadSection(cp.section || 'A', { entry, id: cp.id, keepChoco: true });
  }

  goTo(next, entry = 'left') {
    if (this.exiting) return;
    this.exiting = true;
    const c = this.choco;
    c.stopCharge();
    c.state = 'frozen';
    c.body.vx = 0;
    // Las ruinas se empiezan desde abajo, en su punto de inicio
    if (entry === 'left' && this.sections[next].vertical) entry = 'start';
    this.game.startTransition({ type: next === 'arena' ? 'glitch' : 'fade', duration: 0.45, onMid: () => this.loadSection(next, { entry, keepChoco: true }) });
  }

  checkExits() {
    const S = this.section;
    const c = this.choco;
    if (this.exiting || c.state !== 'play' || this.cutscene) return;
    if (S.next && c.footX > this.map.pxW - 8) {
      if (this.ring && this.ring.phase !== 'done') return;
      this.goTo(S.next);
    }
    if (S.exitDoor && c.footX > S.exitDoor.x * TS - 4 && c.footY <= (S.exitDoor.row + 1) * TS + 1) this.goTo('arena', 'arena');
  }

  // ======================================================================
  // Actualización
  // ======================================================================
  levelUpdate(dt) {
    const S = this.section;
    const c = this.choco;
    // Lo que una sección quería mostrar al entrar, cuando ya está en pantalla
    if (this.pendingEnter && !this.cutscene && !this.game.transitioning && this.game.top === this) {
      const fn = this.pendingEnter;
      this.pendingEnter = null;
      fn();
    }
    this.updateHeat(dt);
    this.checkExits();
    if (S.id === 'B' && !this.flags.plazaSeen && c.footX > S.plazaIntroAt * TS && c.state === 'play' && !this.cutscene) {
      this.flags.plazaSeen = true;
      this.playCutscene(function* (cs) {
        yield cs.say(DIALOGUES.plazaIntro);
      });
    }
    if (this.pendingFood) {
      this.pendingFood.t -= dt;
      if (this.pendingFood.t <= 0 && !this.banner) {
        const f = L4.foods[this.pendingFood.key];
        this.pendingFood = null;
        this.showBanner(L4.carrying(f.name), L4.future(f.comment), null, 2.6);
      }
    }
    this.updateRing(dt);
    if (S.id === 'E') this.updateSunset();
    for (const b of this.blasts) b.t += dt;
    this.blasts = this.blasts.filter((b) => b.t < 0.35);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 1);
    if (this.smoke) {
      this.smoke.t += dt;
      if (this.smoke.t > this.smoke.time) this.smoke = null;
    }
    if (this.bell) this.bell.ring = Math.max(0, this.bell.ring - dt * 0.4);
    this.updateCage(dt);
    this.updateFabiola(dt);
  }

  updateCage(dt) {
    const cg = this.cage;
    if (!cg) return;
    if (!cg.hanging && !cg.landed) {
      const floor = this.section.floor * TS;
      cg.vy = Math.min(cg.vy + 900 * dt, 420);
      cg.y += cg.vy * dt;
      if (cg.y >= floor) {
        cg.y = floor;
        cg.landed = true;
        playSfx(this.game.audio, 'cageDrop');
        this.game.effects.shake(0.4);
        this.particles.burst(cg.x, floor - 2, 14, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 20, speedMax: 80, colors: ['#8A8AA0', '#B85E36'], lifeMin: 0.2, lifeMax: 0.5 });
      }
    }
    if (cg.opening) cg.open = Math.min(1, cg.open + dt * 1.2);
  }

  updateFabiola(dt) {
    const f = this.fabiola;
    if (!f) return;
    f.t += dt;
    if (f.toLight) f.light = Math.min(1, f.light + dt * 1.2);
    if (f.fly) {
      const c = this.choco;
      f.fly.t = Math.min(1, f.fly.t + dt * 1.4);
      const k = Ease.inOutCubic(f.fly.t);
      f.lx = f.fly.x0 + (c.cx - f.fly.x0) * k;
      f.ly = f.fly.y0 + (c.cy - f.fly.y0) * k - Math.sin(k * Math.PI) * 30;
      this.particles.spawn({ x: f.lx + R.range(-2, 2), y: f.ly + R.range(-2, 2), life: 0.5, colors: [ACCENTS.fabiola, '#FFFFFF'], size: 2, endSize: 1 });
    }
  }

  hudState() {
    const s = super.hudState();
    const c = this.choco;
    if (this.section.heat !== 'none' && this.hudMode === 'full') s.heat = this.heat.value;
    s.lassoInRange = !!c.lassoTarget || c.swinging;
    return s;
  }

  // ---------- Depuración ----------
  // F10: la rosquilla perfecta, para probar el final de la misión
  debugF10() {
    this.food = 'rosquilla';
    playSfx(this.game.audio, 'foodPick');
    this.showBanner(L4.carrying(L4.foods.rosquilla.name), '', null, 1.4);
  }

  debugInfo() {
    const lines = super.debugInfo();
    lines.push(`calor ${this.heat.value.toFixed(0)} ${this.inSun ? 'sol' : 'sombra'} · ${this.section.id}`);
    if (this.boss) lines.push(`toro ${this.boss.hp} ${this.boss.state}`);
    return lines;
  }

  // ======================================================================
  // Dibujo
  // ======================================================================
  drawBackground(ctx, cx, cy) {
    drawSantaCruzBg(ctx, cx, cy, this.map.pxH, this.t, this.section.bg);
  }

  drawTiles(ctx, cx, cy) {
    // Las sombras se dibujan antes de las entidades, sobre el fondo y los tiles
    drawSantaCruzTiles(ctx, this.map, cx, cy, { t: this.t, ghostActive: this.map.ghostSolid, cracked: this.crackedTiles });
  }

  drawWorld(ctx, cx, cy) {
    const S = this.section;
    const dusk = S.bg === 'sunset';
    for (const t of this.trees) drawGuanacaste(ctx, Math.round(t.x - cx), Math.round(t.gy - cy), t.w, Math.round(t.bottom - cy), this.t, dusk);
    if (this.marimba) {
      drawAwning(ctx, Math.round(this.marimba.x - 30 - cx), Math.round(this.marimba.gy - 50 - cy), 60, '#C8612E', '#FFD23F');
      drawMarimba(ctx, Math.round(this.marimba.x - cx), Math.round(this.marimba.gy - cy), this.t);
    }
    for (const st of this.stalls) drawStall(ctx, Math.round(st.px - cx), Math.round(st.gy - cy), st.food, st.colors, this.interactables.some((o) => o.near && o.x === st.px), this.t);
    if (S.id === 'B') this.drawFacades(ctx, cx, cy);
    for (const k of this.carts) drawCarreta(ctx, Math.round(k.x - cx), Math.round(k.gy - cy), this.t);
    for (const f of this.fountains) drawFountain(ctx, Math.round(f.x - cx), Math.round(f.gy - cy), this.t, f.splash);
    if (this.oven) drawOven(ctx, Math.round(this.oven.x - cx), Math.round(this.oven.gy - cy), this.t, this.food !== 'rosquilla');
    if (S.flagpole) this.drawFlagpole(ctx, cx, cy);
    for (const a of S.awnings || []) drawAwning(ctx, Math.round(a.x0 * TS - 2 - cx), Math.round((a.row + 1) * TS - 6 - cy), (a.x1 - a.x0 + 1) * TS + 4, '#F4F1EA', '#C8612E');
    this.drawShade(ctx, cx, cy);
    if (this.bell) drawBell(ctx, Math.round(this.bell.x - cx), Math.round(this.bell.y - cy), this.t, this.bell.ring);
    if (this.cage) this.drawCageWithFabiola(ctx, cx, cy);
    if (this.nodes && S.id === 'E') {
      const sel = this.choco.lassoTarget;
      for (const n of this.nodes) drawLassoNode(ctx, Math.round(n.x - cx), Math.round(n.y - cy), this.t, { selected: n === sel, hooked: n.hooked });
    }
    if (this.portal) drawGlitchPortal(ctx, Math.round(this.portal.x - cx), Math.round(this.portal.gy - cy), 34, this.t, this.portal.open);
    // Ondas de las explosiones
    for (const b of this.blasts) {
      const k = b.t / 0.35;
      const rr = Math.round(b.r * (0.4 + k * 0.8));
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#FFF4C0';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ctx.fillRect(Math.round(b.x - cx + Math.cos(a) * rr), Math.round(b.y - cy + Math.sin(a) * rr), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Sombras con borde claro (al sol) o columnas de sol (en las ruinas)
  drawShade(ctx, cx, cy) {
    const S = this.section;
    if (S.heat === 'shade') {
      for (const b of this.beams) {
        const r = this.beamRect(b);
        if (r.y + r.h < cy || r.y > cy + SCREEN.H) continue;
        drawSunbeam(ctx, r.x - cx, r.y - cy, r.w, r.h, this.t);
      }
      return;
    }
    if (S.heat !== 'sun') return;
    // Cada zona es una columna de tiles: los bordes claros se dibujan solo donde la sombra termina
    const zones = this.shadeZones;
    const edgeAt = (x, y, h) => !zones.some((o) => Math.abs(o.x + o.w - x) < 0.5 && o.y < y + h && o.y + o.h > y);
    const edgeAtR = (x, y, h) => !zones.some((o) => Math.abs(o.x - x) < 0.5 && o.y < y + h && o.y + o.h > y);
    for (const z of zones) {
      const x = Math.round(z.x - cx);
      const y = Math.round(z.y - cy);
      if (x > SCREEN.W || x + z.w < 0 || y > SCREEN.H || y + z.h < 0) continue;
      // Tinte suave en el aire, más oscuro cerca del suelo
      ctx.fillStyle = '#3A1A2A';
      ctx.globalAlpha = 0.1;
      ctx.fillRect(x, y, z.w, z.h);
      const low = Math.min(z.h, 18);
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x, y + z.h - low, z.w, low);
      // Mancha en el suelo
      ctx.globalAlpha = 0.38;
      ctx.fillRect(x, y + z.h - 3, z.w, 3);
      // Borde claro punteado donde empieza el sol
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#FFF4C0';
      if (edgeAt(z.x, z.y, z.h)) for (let yy = y + ((y & 1) ? 1 : 0); yy < y + z.h; yy += 3) ctx.fillRect(x, yy, 1, 1);
      if (edgeAtR(z.x + z.w, z.y, z.h)) for (let yy = y; yy < y + z.h; yy += 3) ctx.fillRect(x + z.w - 1, yy, 1, 1);
      ctx.globalAlpha = 1;
    }
  }

  // Fachadas de adobe debajo de los aleros (decorado, sin colisión)
  drawFacades(ctx, cx, cy) {
    const m = this.map;
    const floor = this.section.floor * TS;
    for (let ty = 0; ty < m.h; ty++) {
      for (let tx = 0; tx < m.w; tx++) {
        if (m.charAt(tx, ty) !== 'R') continue;
        const x = tx * TS - cx;
        const y0 = (ty + 1) * TS - cy;
        const h = floor - (ty + 1) * TS;
        ctx.fillStyle = '#E8D4AE';
        ctx.fillRect(x, y0, TS, h);
        ctx.fillStyle = '#CDB48A';
        ctx.fillRect(x, y0, TS, 2);
        // Puertas y ventanas con marco de madera
        if (tx % 4 === 1) {
          ctx.fillStyle = '#5E3A1A';
          ctx.fillRect(x + 3, y0 + h - 26, 10, 26);
          ctx.fillStyle = '#8B5A2B';
          ctx.fillRect(x + 4, y0 + h - 25, 8, 25);
          ctx.fillStyle = '#FFD23F';
          ctx.fillRect(x + 10, y0 + h - 13, 1, 2);
        } else if (tx % 4 === 3 && h > 40) {
          ctx.fillStyle = '#5E3A1A';
          ctx.fillRect(x + 3, y0 + 8, 10, 9);
          ctx.fillStyle = '#4FD1C5';
          ctx.fillRect(x + 4, y0 + 9, 8, 7);
        }
      }
    }
  }

  drawFlagpole(ctx, cx, cy) {
    const p = this.section.flagpole;
    const x = Math.round(p.x * TS - cx);
    const top = Math.round(p.top * TS - cy);
    const floor = Math.round(this.section.floor * TS - cy);
    ctx.fillStyle = '#5E3A1A';
    ctx.fillRect(x, top, 1, floor - top);
    const wave = Math.round(Math.sin(this.t * 5));
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(x + 1, top + wave, 12, 4);
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(x + 1, top + 4 + wave, 12, 2);
    ctx.fillStyle = '#43D9FF';
    ctx.fillRect(x + 1, top + 6 + wave, 12, 2);
  }

  drawCageWithFabiola(ctx, cx, cy) {
    const cg = this.cage;
    const x = Math.round(cg.x - cx);
    const y = Math.round(cg.y - cy);
    if (cg.hanging) {
      ctx.fillStyle = '#5A5A6E';
      ctx.fillRect(x, Math.round(this.bell.y + 18 - cy), 1, y - 30 - Math.round(this.bell.y + 18 - cy));
    }
    const spr = founderSprite('fabiola', Math.floor(this.t * 3) % 2);
    ctx.drawImage(spr.normal, x - 8, y - 25);
    drawCage(ctx, x, y, cg.open);
  }

  drawForeground(ctx, cx, cy) {
    if (this.section.front) drawSantaCruzFront(ctx, cx, cy, this.t);
    if (this.fabiola) this.drawFabiola(ctx, this.fabiola, cx, cy);
  }

  drawFabiola(ctx, f, cx, cy) {
    if (f.fly) {
      const lx = Math.round(f.lx - cx);
      const ly = Math.round(f.ly - cy);
      ctx.fillStyle = ACCENTS.fabiola;
      ctx.fillRect(lx - 3, ly - 3, 7, 7);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(lx - 1, ly - 1, 3, 3);
      return;
    }
    const x = Math.round(f.x - cx);
    const y = Math.round(f.y - cy);
    const frame = f.walk > 0 ? 2 + (Math.floor(f.walk * 8) % 4) : Math.floor(f.t * 3) % 2;
    const spr = founderSprite('fabiola', frame);
    ctx.drawImage(spr.get(f.facing < 0), x - 8, y - 24);
    if (f.light > 0) {
      ctx.globalAlpha = f.light;
      ctx.drawImage(spr.tint(ACCENTS.fabiola, f.facing < 0), x - 8, y - 24);
      ctx.globalAlpha = 1;
    }
    // La comida que le trajo Choco, en la mano
    if (f.food) ctx.drawImage(foodSprite(f.food).normal, x + (f.facing < 0 ? -12 : 4), y - 16);
  }

  drawOverlay(ctx) {
    // Humo del Torito: tapa media pantalla (la Vista Debug ve a través)
    const sm = this.smoke;
    if (sm) {
      const k = Math.min(1, sm.t / 0.3, (sm.time - sm.t) / 0.4);
      const x0 = sm.side < 0 ? 0 : SCREEN.W / 2;
      ctx.globalAlpha = Math.max(0, k) * (this.map.ghostSolid ? 0.3 : 0.94);
      ctx.fillStyle = '#B8B0A0';
      ctx.fillRect(x0, 0, SCREEN.W / 2, SCREEN.H);
      ctx.fillStyle = '#D8D0C0';
      for (let i = 0; i < 26; i++) {
        const px = x0 + ((i * 37 + Math.floor(this.t * 20)) % (SCREEN.W / 2));
        const py = (i * 53 + Math.floor(this.t * 14)) % SCREEN.H;
        ctx.fillRect(px, py, 10, 6);
      }
      // Borde irregular hacia el centro
      ctx.fillStyle = '#B8B0A0';
      const edge = sm.side < 0 ? SCREEN.W / 2 : SCREEN.W / 2 - 6;
      for (let y = 0; y < SCREEN.H; y += 4) ctx.fillRect(edge + (sm.side < 0 ? 0 : 0), y, Math.round(3 + Math.sin(y * 0.3 + this.t * 6) * 3), 4);
      ctx.globalAlpha = 1;
    }
    if (heatDripping(this.heat) && this.section.heat !== 'none') this.drawHeatWave(ctx);
  }

  // Ondulación de las filas de arriba y de abajo con el calor (docs/04_arte.md)
  drawHeatWave(ctx) {
    const rows = HEAT.WAVE_ROWS;
    if (!this.waveBuf) this.waveBuf = createCanvas(SCREEN.W, rows * 2);
    const b = this.waveBuf.getContext('2d');
    b.clearRect(0, 0, SCREEN.W, rows * 2);
    b.drawImage(ctx.canvas, 0, 0, SCREEN.W, rows, 0, 0, SCREEN.W, rows);
    b.drawImage(ctx.canvas, 0, SCREEN.H - rows, SCREEN.W, rows, 0, rows, SCREEN.W, rows);
    const amp = HEAT.WAVE_AMP * Math.min(1, (this.heat.value - HEAT.DRIP_FROM) / 25 + 0.4);
    for (let i = 0; i < rows; i++) {
      const fade = 1 - i / rows; // más fuerte en el borde
      const dxTop = Math.round(Math.sin(this.t * 7 + i * 0.7) * amp * fade);
      const dxBot = Math.round(Math.sin(this.t * 7 + i * 0.7 + 2) * amp * (i / rows));
      ctx.drawImage(this.waveBuf, 0, i, SCREEN.W, 1, dxTop, i, SCREEN.W, 1);
      ctx.drawImage(this.waveBuf, 0, rows + i, SCREEN.W, 1, dxBot, SCREEN.H - rows + i, SCREEN.W, 1);
    }
    // Tinte cálido en los bordes
    ctx.globalAlpha = 0.08 + 0.04 * Math.sin(this.t * 4);
    ctx.fillStyle = '#FF6B3A';
    ctx.fillRect(0, 0, SCREEN.W, rows);
    ctx.fillRect(0, SCREEN.H - rows, SCREEN.W, rows);
    ctx.globalAlpha = 1;
  }

  drawUi(ctx) {
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    for (const p of this.popups) {
      ctx.globalAlpha = Math.min(1, (1 - p.t) * 3);
      drawText(ctx, p.text, Math.round(p.x - cx), Math.round(p.y - cy - p.t * 14), { align: 'center', color: p.color });
      ctx.globalAlpha = 1;
    }
    if (!this.hud.visible || this.cutscene) return;
    // Comida que lleva Choco para Fabiola
    if (this.food) {
      const x = 4;
      const y = SCREEN.H - 32;
      ctx.fillStyle = 'rgba(7,7,12,0.6)';
      ctx.fillRect(x - 1, y - 1, 12, 12);
      ctx.drawImage(foodSprite(this.food).normal, x + 1, y + 1);
    }
    // Contador del redondel
    const r = this.ring;
    if (r && r.phase === 'fight') {
      const sec = Math.max(0, Math.ceil(REDONDEL.SURVIVE - r.t));
      drawText(ctx, L4.redondel.counter(sec, r.kills, REDONDEL.KILLS), SCREEN.W / 2, 22, { align: 'center', color: sec <= 10 ? UI.yellow : UI.text });
    }
  }

  // Farol de checkpoint
  drawCheckpoint(ctx, s, cx, cy) {
    const on = this.checkpoint && this.checkpoint.id === s.id;
    drawFarol(ctx, Math.round(s.x - cx), Math.round(s.y - cy), on, this.t, s.flash);
  }

  // Rótulo de madera (los del mundo no tienen Y)
  drawWorldSign(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    ctx.fillStyle = '#5E3A1A';
    ctx.fillRect(x - 1, y - 9, 2, 9);
    ctx.fillStyle = '#B07A45';
    ctx.fillRect(x - 9, y - 20, 18, 12);
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(x - 9, y - 9, 18, 1);
    ctx.fillStyle = '#F5E6C8';
    ctx.fillRect(x - 7, y - 17, 8, 1);
    ctx.fillRect(x - 7, y - 14, 12, 1);
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(x + 3, y - 17, 2, 1);
  }
}

