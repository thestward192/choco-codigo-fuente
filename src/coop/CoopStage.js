// Sala cooperativa armada desde una definición — docs/coop/03_mecanicas_coop.md
// La usan el prólogo cooperativo, la sala de elementos y, desde el Hito 12, los mapas.
//
// Definición (src/coop/stages/*.js):
//   { id, title, rows: [strings], elements: [...], signs: { '1': 'clave', ... }, signText,
//     heat: [{ tx0, ty0, tx1, ty1 }], shade: [...], heatRate, save: bool, music }
// En el mapa: P/p apariciones · 1..9 carteles (checkpoints) · $ bit · * cristal · m recuerdo ·
//   n nodo de lazo · b Byteling · w agua · v charco (agua baja) · u bloque de azúcar ·
//   h plancha caliente · g fantasma
//
// Puertas de salida dobles: dos elementos 'exit' con el mismo `group` (uno de Choco y otro de
// Tapita). Cuando cada uno está en el suyo 0.5 s, la puerta se cumple: abre su compuerta (la que
// tiene `link: ['door:grupo']`) y guarda checkpoint en el cartel `cp`. La que tiene `final` termina
// la sala. El anfitrión decide y avisa con eventos confiables.
import { SCREEN, COOP } from '../config/balance.js';
import { Tilemap, T as TT, DEFAULT_LEGEND } from '../systems/tilemap.js';
import { aabbOverlap } from '../systems/physics.js';
import { waterZonesFromMap } from '../systems/water.js';
import { Byteling } from '../entities/enemies/byteling.js';
import { drawLassoNode } from '../art/santacruz.js';
import { drawLabTiles, drawLabBackground } from '../art/tiles/lab.js';
import { drawText } from '../art/font.js';
import { UI, COOP as COOP_COLORS } from '../art/palettes.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';
import { SONG_PRUEBA } from '../audio/songs/prueba.js';
import { PuzzleWorld, syncPercent } from './puzzle.js';
import { loadCoop, saveCoop, recordCheckpoint } from './coopSave.js';
import * as art from './puzzleArt.js';
import { CoopLevel } from './CoopLevel.js';

const TS = SCREEN.TILE;
const P = COOP.PUZZLE;
const R = fxRng;
const T = TEXTS.coop.room;

// Leyenda de los mapas cooperativos: compuertas, cajas, azúcar y planchas son sólidos; el agua no
export const COOP_LEGEND = { ...DEFAULT_LEGEND, '|': TT.SOLID, '%': TT.SOLID, '&': TT.SOLID, u: TT.SOLID, h: TT.SOLID, w: TT.EMPTY, v: TT.EMPTY };

const tileRect = (r) => ({ x: r.tx0 * TS, y: r.ty0 * TS, w: (r.tx1 - r.tx0 + 1) * TS, h: (r.ty1 - r.ty0 + 1) * TS });
const inside = (rect, c) => c.alive && c.x > rect.x && c.x < rect.x + rect.w && c.y > rect.y && c.y <= rect.y + rect.h + 1;

export class CoopStage extends CoopLevel {
  // opts: lo de CoopLevel + { stage (definición), mapId (para resultados y guardado), cp (checkpoint) }
  buildRoom() {
    const def = this.opts.stage;
    this.def = def;
    this.stageId = this.opts.mapId || def.id;
    const map = new Tilemap(def.rows, COOP_LEGEND);
    this.setMap(map);
    this.heatZones = (def.heat || []).map(tileRect);
    this.shadeZones = (def.shade || []).map(tileRect);
    this.heatRate = def.heatRate;
    const foot = (tx, ty) => ({ x: tx * TS + 8, y: (ty + 1) * TS });
    // Carteles (checkpoints) en orden de izquierda a derecha
    for (const [ch, key] of Object.entries(def.signs || {})) {
      for (const { tx, ty } of map.find(ch)) {
        const f = foot(tx, ty);
        this.addSign(f.x, f.y, def.signText?.[key] ?? '', Number(ch));
      }
    }
    this.signs.sort((a, b) => a.x - b.x);
    const pc = map.find('P')[0];
    const pt = map.find('p')[0];
    this.spawns = { choco: foot(pc.tx, pc.ty), tapita: foot(pt.tx, pt.ty) };
    this.lassoNodes = map.find('n').map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8, hooked: 0 }));
    for (const { tx, ty } of map.find('$')) this.addPickup('bit', tx * TS + 8, ty * TS + 8);
    for (const { tx, ty } of map.find('*')) this.addPickup('crystal', tx * TS + 8, ty * TS + 8);
    for (const { tx, ty } of map.find('m')) this.addPickup('memory', tx * TS + 8, ty * TS + 8);
    this.memories = this.pickups.filter((p) => p.kind === 'memory');
    // Agua: las casillas de objetos que están en el agua también son agua
    for (const ch of ['$', '*', 'm', 'n']) {
      for (const { tx, ty } of map.find(ch)) {
        if ([[-1, 0], [1, 0], [0, -1]].some(([dx, dy]) => map.charAt(tx + dx, ty + dy) === 'w')) map.setChar(tx, ty, 'w');
      }
    }
    this.water = waterZonesFromMap(map, 'w');

    this.doorsDone = new Set();
    this.syncDoors = [];
    this.brokenSugar = [];
    this.buildPuzzle();

    // Checkpoint inicial: el que viene guardado (Salir de la sala guarda hasta ahí) o el primer cartel
    const cp = this.opts.cp !== undefined && this.opts.cp !== null ? this.signs.find((s) => s.id === this.opts.cp) : null;
    if (cp) {
      this.checkpoint = { x: cp.x, y: cp.y, id: cp.id };
      // Las puertas de antes del checkpoint ya quedaron abiertas
      for (const g of this.doorGroups) {
        const s = this.signs.find((q) => q.id === g.cp);
        if (s && s.x <= cp.x) this.doorsDone.add(g.id);
      }
    } else {
      const first = this.signs[0];
      this.checkpoint = { x: first.x, y: first.y, id: first.id, start: true };
    }
    this.buildEntities();
  }

  buildPuzzle() {
    const defs = this.def.elements || [];
    this.puzzle = new PuzzleWorld(defs, this.map);
    this.puzzle.extra = (id) => (id.startsWith('door:') ? this.doorsDone.has(id.slice(5)) : false);
    // Las compuertas de puertas dobles ya cumplidas quedan abiertas
    this.puzzle.hostUpdate(0, [], this.t);
    this.puzzle.update(1, true);
    // Puertas dobles
    const groups = new Map();
    for (const e of this.puzzle.ofType('exit')) {
      if (!groups.has(e.group)) groups.set(e.group, { id: e.group, hold: 0, first: {}, cp: e.cp, final: !!e.final });
      const g = groups.get(e.group);
      g[e.who] = e;
      if (e.cp !== undefined) g.cp = e.cp;
      if (e.final) g.final = true;
    }
    this.doorGroups = [...groups.values()];
    this.prevPz = new Map();
    this.boxNodes = new Map();
  }

  spawnFor(kind) {
    if (this.checkpoint?.start) return [this.spawns[kind].x, this.spawns[kind].y];
    return super.spawnFor(kind);
  }

  buildEntities() {
    for (const { tx, ty } of this.map.find('b')) this.addEnemy(new Byteling(tx * TS + 8, (ty + 1) * TS, { dir: -1, turnAtEdges: true }));
  }

  enter() {
    this.game.audio.playSong(this.def.music || SONG_PRUEBA);
  }

  // Si caen los dos: el puzzle de la sala vuelve a empezar (las puertas dobles cumplidas, no)
  resetStage() {
    for (const e of this.puzzle.ofType('box')) if (!e.broken) this.puzzle.writeBox(e, false);
    for (const e of this.puzzle.ofType('gate')) for (let k = 0; k < e.h; k++) this.map.setChar(e.tx, e.ty + k, '.');
    for (const e of this.puzzle.ofType('scale')) this.map.platforms = this.map.platforms.filter((p) => p !== e.pa && p !== e.pb);
    for (const [tx, ty] of this.brokenSugar) this.map.setChar(tx, ty, 'u');
    this.brokenSugar = [];
    this.buildPuzzle();
  }

  // ---------- Personajes para los puzzles ----------
  puzzleChars() {
    const out = [];
    const p = this.player;
    out.push({ kind: p.kind, x: p.footX, y: p.footY, w: p.body.w, h: p.body.h, onGround: p.body.onGround, planted: !!p.planted, ridingOn: p.body.platform?.partner ? this.theirs : null, alive: p.alive && p.state === 'play' });
    const Pt = this.partner;
    if (Pt.present && Pt.s) {
      const s = Pt.s;
      const e = Pt.entity;
      out.push({ kind: Pt.kind, x: e.footX, y: e.footY, w: e.body.w, h: e.body.h, onGround: !!s.g, planted: s.ac === 'plant', ridingOn: s.ride !== undefined ? this.mine : null, alive: s.st === 'play' });
    }
    return out;
  }

  // ---------- Actualización ----------
  levelUpdate(dt) {
    for (const n of this.lassoNodes) if (n.hooked > 0) n.hooked -= dt;
    const chars = this.puzzleChars();
    if (this.isHost) {
      this.puzzle.hostUpdate(dt, chars, this.t);
      this.updateDoorsHost(dt, chars);
    }
    this.puzzle.update(dt, this.isHost);
    this.updateDoorsLook(dt, chars);
    this.puzzleSounds();
    this.updateBoxNodes();
    this.updateOwnInteractions(dt);
  }

  // Sonidos según los cambios de estado (los dos los escuchan igual)
  puzzleSounds() {
    const a = this.game.audio;
    const cam = this.camera;
    for (const e of this.puzzle.els) {
      const prev = this.prevPz.get(e.id);
      const now = e.type === 'terminal' ? (e.done ? 2 : e.touch !== null || e.left > 0 ? 1 : 0) : e.type === 'gate' ? (e.solid ? 0 : 1) : e.on ? 1 : 0;
      this.prevPz.set(e.id, now);
      if (prev === undefined || prev === now) continue;
      const r = e.rect || { x: e.tx * TS, y: e.ty * TS, w: TS, h: TS };
      if (!cam.isVisible(r.x - 80, r.y - 60, r.w + 160, r.h + 120, 0)) continue;
      switch (e.type) {
        case 'button':
          playSfx(a, now ? 'buttonDown' : 'buttonUp');
          break;
        case 'gate':
          playSfx(a, 'gateMove');
          break;
        case 'target':
          playSfx(a, now ? 'targetHit' : 'targetOff');
          break;
        case 'terminal':
          playSfx(a, now === 2 ? 'signOk' : now === 1 ? 'signFirst' : 'signFail');
          break;
        case 'lever':
          playSfx(a, 'lever');
          break;
        default:
          break;
      }
    }
  }

  // Puertas dobles (anfitrión): los dos en su marco durante EXIT_HOLD
  updateDoorsHost(dt, chars) {
    for (const g of this.doorGroups) {
      if (this.doorsDone.has(g.id) || !g.choco || !g.tapita) continue;
      const c = chars.find((q) => q.kind === 'choco');
      const t = chars.find((q) => q.kind === 'tapita');
      const inC = c && inside(g.choco.rect, c);
      const inT = t && inside(g.tapita.rect, t);
      if (inC && g.first.choco === undefined) g.first.choco = this.t;
      if (inT && g.first.tapita === undefined) g.first.tapita = this.t;
      g.hold = inC && inT ? g.hold + dt : 0;
      if (g.hold >= P.EXIT_HOLD) {
        const diff = Math.round(Math.abs(g.first.choco - g.first.tapita) * 10) / 10;
        this.doorDone(g.id, diff);
        this.ev('door', { g: g.id, d: diff });
        if (g.final) {
          const sync = syncPercent(this.syncDoors);
          this.syncPct = sync;
          this.onFinalDoor(sync);
        } else if (g.cp !== undefined) this.setCheckpoint(g.cp, true);
      }
    }
  }

  // La sala termina (las subclases pueden poner una cinemática antes)
  onFinalDoor(sync) {
    this.ev('end', { sync, time: Math.round(this.stats.time * 10) / 10 });
    this.finish();
  }

  doorDone(id, diff) {
    if (this.doorsDone.has(id)) return;
    this.doorsDone.add(id);
    this.syncDoors.push(diff);
    playSfx(this.game.audio, 'doorReady');
    const g = this.doorGroups.find((q) => q.id === id);
    if (g) {
      for (const e of [g.choco, g.tapita]) {
        if (!e) continue;
        this.particles.burst(e.rect.x + 8, e.rect.y + 16, 12, { speedMin: 20, speedMax: 70, colors: [art.elementColor(e), '#FFFFFF', e.who === 'tapita' ? COOP_COLORS.tapita : COOP_COLORS.choco], lifeMin: 0.2, lifeMax: 0.5 });
      }
    }
  }

  // Dibujo de las puertas (los dos): quién está en su marco
  updateDoorsLook(dt, chars) {
    for (const g of this.doorGroups) {
      if (!g.choco || !g.tapita) continue;
      const c = chars.find((q) => q.kind === 'choco');
      const t = chars.find((q) => q.kind === 'tapita');
      g.inC = !!(c && inside(g.choco.rect, c));
      g.inT = !!(t && inside(g.tapita.rect, t));
      g.look = g.inC && g.inT && !this.doorsDone.has(g.id) ? Math.min(1, (g.look || 0) + dt / P.EXIT_HOLD) : 0;
    }
    // "Falta tu compañero" en la puerta final
    const fin = this.doorGroups.find((g) => g.final);
    const mineIn = fin && (this.mine === 'choco' ? fin.inC : fin.inT);
    const theirsIn = fin && (this.mine === 'choco' ? fin.inT : fin.inC);
    this.atExit = !!(mineIn && !theirsIn);
  }

  // Cajas: Choco las jala con el lazo (un nodo sobre cada caja)
  updateBoxNodes() {
    for (const e of this.puzzle.ofType('box')) {
      let n = this.boxNodes.get(e.id);
      if (e.broken) {
        if (n) {
          this.lassoNodes = this.lassoNodes.filter((q) => q !== n);
          this.boxNodes.delete(e.id);
        }
        continue;
      }
      if (!n) {
        n = { x: 0, y: 0, hooked: 0, pull: true, boxNode: true };
        n.onPull = () => this.pullBox(e);
        this.boxNodes.set(e.id, n);
        this.lassoNodes.push(n);
      }
      // En la esquina de arriba del lado de Choco (adentro de la caja no se ve el nodo)
      const left = this.player.footX < e.cx * TS + (e.size * TS) / 2;
      n.x = left ? e.cx * TS - 2 : (e.cx + e.size) * TS + 2;
      n.y = e.cy * TS - 3;
    }
  }

  pullBox(e) {
    const dir = Math.sign(this.player.footX - (e.cx * TS + (e.size * TS) / 2)) || 1;
    this.requestPush(e, dir);
  }

  requestPush(e, dir) {
    if (this.isHost) this.pushBox(e.id, dir);
    else this.act('push', { id: e.id, dir });
  }

  // Anfitrión: mueve la caja (1 tile; después cae) y avisa
  pushBox(id, dir) {
    const e = this.puzzle.get(id);
    if (!e || e.type !== 'box' || e.anim) return;
    const to = this.puzzle.pushTarget(e, dir);
    if (!to) return;
    // No se mueve encima de nadie
    const dest = { x: to.tx * TS, y: to.ty * TS, w: e.size * TS, h: e.size * TS };
    for (const c of this.puzzleChars()) {
      if (c.alive && aabbOverlap(dest, { x: c.x - c.w / 2, y: c.y - c.h, w: c.w, h: c.h })) return;
    }
    this.puzzle.moveBox(e, to.tx, to.ty);
    playSfx(this.game.audio, 'boxPush');
    this.ev('box', { id, tx: to.tx, ty: to.ty });
  }

  // Lo que el personaje propio toca o usa
  updateOwnInteractions(dt) {
    const p = this.player;
    if (!p.alive || p.state !== 'play') {
      this.nearUse = null;
      return;
    }
    const b = p.body;
    const busy = this.menuOpen || this.dialogue || this.cutsceneLock;
    // Terminales y palancas (Interactuar)
    this.nearUse = null;
    for (const e of this.puzzle.els) {
      if (e.type !== 'terminal' && e.type !== 'lever') continue;
      const cx = e.tx * TS + 8;
      const cy = e.type === 'terminal' ? (e.ty + 1) * TS : (e.ty + 1) * TS;
      if (Math.abs(p.footX - cx) <= P.TERMINAL_RANGE && Math.abs(p.footY - cy) <= 12) this.nearUse = e;
    }
    if (this.nearUse && !busy && this.input.pressed('interact')) this.use(this.nearUse);

    // Ventiladores: a Choco lo elevan; a Tapita apenas; plantada, nada
    for (const e of this.puzzle.ofType('fan')) {
      if (!e.on || !aabbOverlap(b, e.rect) || p.noclip) continue;
      const k = p.kind === 'choco' ? 1 : p.planted ? 0 : P.FAN_TAPITA;
      if (k <= 0) continue;
      const target = P.FAN_MAX_UP * (p.kind === 'choco' ? 1 : 0.3);
      if (b.vy > target) b.vy = Math.max(target, b.vy - P.FAN_LIFT * k * dt);
      if (p.kind === 'choco' && b.onGround) {
        b.onGround = false;
        b.y -= 1;
      }
      if (R.chance(0.2)) this.particles.spawn({ x: p.footX + R.range(-6, 6), y: p.footY, vy: -60, life: 0.3, color: '#FFFFFF' });
    }
    // Cortinas: el agua daña a Tapita (la protege el escudo de Choco); el vapor, a Choco (la sombrilla)
    for (const e of this.puzzle.ofType('curtain')) {
      if (!e.on || !aabbOverlap(b, e.rect)) continue;
      if (e.kind === 'water' && p.kind === 'tapita') p.hurt(e.rect.x + e.rect.w / 2 - p.facing * 4, { water: 'stream', damage: P.CURTAIN_DAMAGE });
      if (e.kind === 'heat' && p.kind === 'choco' && !this.chocoShaded(p)) p.hurt(e.rect.x + e.rect.w / 2 - p.facing * 4, { ignoreShield: true, damage: P.CURTAIN_DAMAGE });
      if (e.kind === 'water' && p.kind === 'choco' && R.chance(0.3)) this.particles.spawn({ x: p.footX + R.range(-6, 6), y: b.y, vx: R.range(-30, 30), vy: -40, gravity: 300, life: 0.3, color: '#8AD8FF' });
    }
    // Burbujas de aire: oxígeno lleno (solo Choco las usa)
    if (p.kind === 'choco') {
      for (const e of this.puzzle.ofType('bubble')) {
        if (e.respawn > 0 || Math.abs(p.footX - e.x) > 9 || Math.abs(p.cy - e.y) > 14) continue;
        e.respawn = COOP.OXYGEN.BUBBLE_RESPAWN;
        p.swim.oxygen = COOP.OXYGEN.MAX;
        playSfx(this.game.audio, 'airBubble');
        this.particles.burst(e.x, e.y, 8, { speedMin: 10, speedMax: 40, colors: ['#FFFFFF', '#BFEFFF'], lifeMin: 0.2, lifeMax: 0.4, gravity: -60 });
      }
    }
  }

  // Terminal o palanca: el anfitrión lo aplica; el invitado se lo pide
  use(e) {
    playSfx(this.game.audio, 'interact');
    if (e.type === 'terminal') {
      if (e.done) return;
      if (this.isHost) this.puzzle.sign(e.id, this.t);
      else this.act('use', { id: e.id });
    } else if (e.type === 'lever') {
      if (this.isHost) this.puzzle.toggleLever(e.id);
      else this.act('use', { id: e.id });
    }
  }

  // ---------- Red ----------
  worldExtra() {
    return { pz: this.puzzle.pack() };
  }

  onWorldExtra(d) {
    this.puzzle.unpack(d.pz, this.puzzleChars());
  }

  onStageAct(d) {
    if (!this.isHost) return;
    switch (d.k) {
      case 'use': {
        const e = this.puzzle.get(d.id);
        if (!e) break;
        // La firma del invitado se fecha medio ping antes (lo que tardó en llegar)
        if (e.type === 'terminal') this.puzzle.sign(e.id, this.t - (this.session.peer.ping || 0) / 2000);
        else if (e.type === 'lever') this.puzzle.toggleLever(e.id);
        break;
      }
      case 'target':
        this.puzzle.hitTarget(d.id);
        break;
      case 'push':
        if (d.dir === 1 || d.dir === -1) this.pushBox(d.id, d.dir);
        break;
      case 'break':
        this.breakBox(d.id);
        break;
      default:
        break;
    }
  }

  onStageEvent(e) {
    switch (e.k) {
      case 'door':
        this.doorDone(e.g, typeof e.d === 'number' ? e.d : 0);
        break;
      case 'box': {
        const b = this.puzzle.get(e.id);
        if (b) {
          this.puzzle.moveBox(b, e.tx, e.ty);
          playSfx(this.game.audio, 'boxPush');
        }
        break;
      }
      case 'boxBreak': {
        const b = this.puzzle.get(e.id);
        if (b && !b.broken) this.boxBroken(b);
        break;
      }
      case 'sugar':
        if (Array.isArray(e.cells)) this.sugarBroken(e.cells);
        break;
      case 'plug':
        this.puzzle.plug(e.id);
        playSfx(this.game.audio, 'plug');
        break;
      case 'stageFull':
        if (Array.isArray(e.doors)) for (const id of e.doors) this.doorsDone.add(id);
        if (Array.isArray(e.sugar)) this.sugarBroken(e.sugar);
        if (Array.isArray(e.boxes)) {
          for (const [id, tx, ty, broken] of e.boxes) {
            const b = this.puzzle.get(id);
            if (!b) continue;
            if (broken && !b.broken) this.puzzle.breakBox(b);
            else if (!broken) this.puzzle.moveBox(b, tx, ty);
          }
        }
        break;
      default:
        break;
    }
  }

  sendFull() {
    super.sendFull();
    this.ev('stageFull', {
      doors: [...this.doorsDone],
      sugar: this.brokenSugar,
      boxes: this.puzzle.ofType('box').map((b) => [b.id, b.cx, b.cy, b.broken ? 1 : 0]),
    });
  }

  // ---------- Golpes, disparos y melcocha sobre el puzzle ----------
  onMelee(box, dir) {
    const e = this.puzzle.boxAt(box);
    if (!e) return false;
    this.requestPush(e, dir);
    return true;
  }

  onShot(s, dt) {
    const r = { x: s.x + Math.min(0, s.vx * dt), y: s.y + Math.min(0, s.vy * dt), w: s.w + Math.abs(s.vx * dt), h: s.h + Math.abs(s.vy * dt) };
    for (const e of this.puzzle.ofType('target')) {
      if (e.on && !(e.time > 0)) continue;
      if (!aabbOverlap(r, e.rect)) continue;
      if (this.isHost) this.puzzle.hitTarget(e.id);
      else {
        e.flash = 0.3;
        this.act('target', { id: e.id });
      }
      s.kill(this, true);
      return true;
    }
    const b = this.puzzle.boxAt(r);
    if (b) {
      // El disparo cargado rompe las cajas chicas
      if (s.charged && b.size === 1) {
        if (this.isHost) this.breakBox(b.id);
        else this.act('break', { id: b.id });
      }
      s.kill(this, true);
      return true;
    }
    return false;
  }

  breakBox(id) {
    const e = this.puzzle.get(id);
    if (!e || e.broken || e.size !== 1) return;
    this.boxBroken(e);
    this.ev('boxBreak', { id });
  }

  boxBroken(e) {
    this.puzzle.breakBox(e);
    playSfx(this.game.audio, 'boxBreak');
    this.game.effects.shake(0.15);
    this.particles.burst(e.cx * TS + 8, e.cy * TS + 8, 18, { speedMin: 40, speedMax: 130, colors: ['#A8743F', '#7A4E2D', '#D8A060'], gravity: 400, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
  }

  // Martillazo (anfitrión): botones de martillazo y bloques de azúcar alrededor de los pies
  onPoundHost(x, y) {
    this.puzzle.pound(x, y);
    const cells = [];
    const tyBelow = Math.floor((y + 1) / TS);
    for (let tx = Math.floor((x - 12) / TS); tx <= Math.floor((x + 12) / TS); tx++) if (this.map.charAt(tx, tyBelow) === 'u') cells.push([tx, tyBelow]);
    // Y los que tiene pegados a los costados, a la altura del cuerpo
    const reach = COOP.TAPITA.HITBOX_W / 2 + 6;
    for (let ty = Math.floor((y - COOP.TAPITA.HITBOX_H) / TS); ty <= Math.floor((y - 1) / TS); ty++) {
      for (let tx = Math.floor((x - reach) / TS); tx <= Math.floor((x + reach) / TS); tx++) if (this.map.charAt(tx, ty) === 'u') cells.push([tx, ty]);
    }
    if (!cells.length) return;
    this.sugarBroken(cells);
    this.ev('sugar', { cells });
  }

  sugarBroken(cells) {
    let any = false;
    for (const [tx, ty] of cells) {
      if (this.map.charAt(tx, ty) !== 'u') continue;
      any = true;
      this.map.setChar(tx, ty, '.');
      this.brokenSugar.push([tx, ty]);
      this.particles.burst(tx * TS + 8, ty * TS + 8, 14, { speedMin: 40, speedMax: 120, colors: ['#F2C46B', '#FFF1C2', '#D99A3E', '#9C5420'], gravity: 420, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
    }
    if (any) {
      playSfx(this.game.audio, 'sugarBreak');
      this.game.effects.shake(0.2);
    }
  }

  onMelStuck(m) {
    const e = this.puzzle.plugAt(m.plat);
    if (e) this.plugStream(e);
  }

  // Melcocha en vuelo que choca con una cortina o la rejilla de un ventilador
  streamAt(box) {
    for (const e of this.puzzle.els) {
      if ((e.type !== 'curtain' && e.type !== 'fan') || !e.on) continue;
      const r = e.type === 'curtain' ? e.rect : { x: e.rect.x, y: e.rect.y + e.rect.h - 8, w: e.rect.w, h: 8 };
      if (aabbOverlap(box, r)) return e;
    }
    return null;
  }

  plugStream(e) {
    this.puzzle.plug(e.id);
    playSfx(this.game.audio, 'plug');
    this.ev('plug', { id: e.id });
  }

  // ---------- Checkpoint y guardado ----------
  setCheckpoint(id, announce) {
    const prev = this.checkpoint?.id;
    super.setCheckpoint(id, announce);
    if (this.def.save === false || this.checkpoint?.id === prev || !this.game.save) return;
    const data = loadCoop(this.game.save);
    saveCoop(this.game.save, recordCheckpoint(data, this.stageId, id));
  }

  // ---------- Fin: resultados ----------
  afterFinish() {
    if (this.onLeave) {
      this.onLeave('done');
      return;
    }
    const me = this.mine;
    const counts = { bits: 0, crystals: 0 };
    if (me === 'choco') {
      counts.bits = this.bits;
      counts.crystals = this.stats.partnerCount;
    } else {
      counts.crystals = this.crystals;
      counts.bits = this.stats.partnerCount;
    }
    this.game.flow.toCoopResults(this.game, {
      map: this.stageId,
      time: this.stats.time,
      falls: { [me]: this.stats.falls, [this.theirs]: this.stats.partnerFalls },
      counts,
      memories: this.memories.map((m) => m.taken),
      sync: this.syncPct ?? syncPercent(this.syncDoors),
      mine: me,
    });
  }

  // Los recuerdos son de los dos: cualquiera los junta
  updatePickups(dt) {
    super.updatePickups(dt);
    const p = this.player;
    for (const pk of this.memories) {
      if (pk.taken || !p.alive) continue;
      pk.t += dt;
      if (!aabbOverlap(p.body, { x: pk.x - 6, y: pk.y - 6, w: 12, h: 12 })) continue;
      pk.taken = true;
      this.ev('take', { id: pk.id });
      playSfx(this.game.audio, 'goldenY');
      this.showBanner(T.memory, 2, COOP_COLORS.both);
    }
  }

  // ---------- Dibujo ----------
  drawBackground(ctx, cx, cy) {
    drawLabBackground(ctx, cx, cy, this.t, (bx, by) => {
      if (this.def.title) drawText(ctx, this.def.title, bx + 120, by + 24, { align: 'center', color: '#D3CEC1', shadow: false });
    });
    for (const z of this.heatZones) art.drawHeatZone(ctx, z, cx, cy, this.t);
  }

  drawTiles(ctx, cx, cy) {
    drawLabTiles(ctx, this.map, cx, cy, this.t, this.map.ghostSolid);
  }

  drawWorld(ctx, cx, cy) {
    const sel = this.player.kind === 'choco' ? this.player.lassoTarget : null;
    for (const n of this.lassoNodes) {
      if (n.partnerNode || n.boxNode) continue;
      drawLassoNode(ctx, Math.round(n.x - cx), Math.round(n.y - cy), this.t, { selected: n === sel, hooked: n.hooked, dusk: false });
    }
    // Nodo sobre Tapita o una caja: un anillo cian cuando Choco lo apunta
    if (sel && (sel.partnerNode || sel.boxNode)) {
      const x = Math.round(sel.x - cx);
      const y = Math.round(sel.y - cy);
      ctx.strokeStyle = COOP_COLORS.choco;
      const r = 6 + Math.round(Math.sin(this.t * 10));
      ctx.strokeRect(x - r + 0.5, y - r + 0.5, r * 2, r * 2);
    }
    const t = this.t;
    for (const e of this.puzzle.els) {
      switch (e.type) {
        case 'button':
          art.drawButton(ctx, e, cx, cy, t);
          break;
        case 'target':
          art.drawTarget(ctx, e, cx, cy, t);
          break;
        case 'terminal': {
          const o = this.puzzle.get(e.pair);
          // La cuenta de 0.5 s se dibuja sobre la OTRA terminal
          const left = this.terminalLeft(o);
          art.drawTerminal(ctx, e, cx, cy, t, { left, near: this.nearUse === e });
          break;
        }
        case 'lever':
          art.drawLever(ctx, e, cx, cy, t, this.nearUse === e);
          break;
        case 'scale':
          art.drawScale(ctx, e, cx, cy);
          break;
        case 'gate':
          art.drawGate(ctx, e, cx, cy, t, this.gateColor(e));
          break;
        case 'fan':
          art.drawFan(ctx, e, cx, cy, t);
          break;
        case 'box':
          art.drawBox(ctx, e, cx, cy);
          break;
        case 'exit': {
          const g = this.doorGroups.find((q) => q.id === e.group);
          art.drawExitFrame(ctx, e, cx, cy, t, { inside: e.who === 'choco' ? g?.inC : g?.inT, k: g?.look || 0, done: this.doorsDone.has(e.group) });
          break;
        }
        case 'bubble':
          art.drawBubble(ctx, e, cx, cy, t);
          break;
        default:
          break;
      }
    }
  }

  // Segundos que quedan para firmar la otra terminal (0 si nadie firmó)
  terminalLeft(e) {
    if (!e || e.done) return 0;
    if (this.isHost) return e.touch !== null ? Math.max(0, P.TERMINAL_WINDOW - (this.t - e.touch)) : 0;
    return e.left || 0;
  }

  gateColor(e) {
    const id = (e.link || [])[0];
    if (!id) return art.elementColor(null);
    if (id.startsWith('door:')) return COOP_COLORS.both;
    return art.elementColor(this.puzzle.get(id));
  }

  drawForeground(ctx, cx, cy) {
    for (const e of this.puzzle.ofType('curtain')) art.drawCurtain(ctx, e, cx, cy, this.t);
    if (this.atExit && !this.ended && Math.floor(this.t * 2) % 2 === 0) drawText(ctx, T.exitWait, SCREEN.W / 2, SCREEN.H - 14, { align: 'center', color: COOP_COLORS.both });
  }

  // Terminal de doble firma: la barra de 0.5 s también en el HUD de los dos
  drawOverlay(ctx) {
    let left = 0;
    for (const e of this.puzzle.ofType('terminal')) left = Math.max(left, this.terminalLeft(e));
    if (left <= 0) return;
    const w = 80;
    const x = Math.round((SCREEN.W - w) / 2);
    const y = 28;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 2, y - 2, w + 4, 14);
    drawText(ctx, T.signNow, SCREEN.W / 2, y - 1, { align: 'center', color: COOP_COLORS.both, shadow: false });
    ctx.fillStyle = '#2A0E22';
    ctx.fillRect(x, y + 8, w, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + 8, Math.round(w * (left / P.TERMINAL_WINDOW)), 3);
  }

  drawPickup(ctx, pk, cx, cy) {
    if (pk.kind !== 'memory') {
      super.drawPickup(ctx, pk, cx, cy);
      return;
    }
    // Recuerdo: un rombo magenta con brillo (de los dos)
    const x = Math.round(pk.x - cx);
    const y = Math.round(pk.y - cy + Math.sin(pk.t * 2.5) * 2);
    ctx.fillStyle = '#5A0E30';
    ctx.fillRect(x - 1, y - 6, 3, 13);
    ctx.fillRect(x - 4, y - 3, 9, 7);
    ctx.fillStyle = COOP_COLORS.both;
    ctx.fillRect(x, y - 5, 1, 11);
    ctx.fillRect(x - 3, y - 2, 7, 5);
    ctx.fillStyle = Math.floor(pk.t * 4) % 3 ? '#FFD0E8' : '#FFFFFF';
    ctx.fillRect(x - 1, y - 2, 1, 1);
  }

  debugInfo() {
    return [...super.debugInfo(), `puzzle ${this.puzzle.els.length} · puertas ${[...this.doorsDone].join(',') || '—'}`];
  }
}
