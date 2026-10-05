// Nivel 2 · La UNA — docs/niveles/nivel_2_una.md
// RPG de vista cenital dentro del edificio: salas conectadas con fundido corto, NPCs en loop,
// bugs visibles que inician batallas por turnos, soda, terminales de guardado, los 3 puzzles
// (binario, compuertas, estantes) que dan los carnés, y el auditorio con MC Stack Overflow.
import { TopdownLevel } from '../TopdownLevel.js';
import { SCREEN, BATTLE, TOPDOWN, HEALTH, PUZZLES } from '../../config/balance.js';
import { Tilemap } from '../../systems/tilemap.js';
import { aabbOverlap } from '../../systems/physics.js';
import { level2Rooms, L2_LEGEND, SHELF_SOLIDS, L2_TERMINALS, AULA, LAB, LIB1, LIB2, AUDITORIUM, CIRCUIT_LAYOUT, BATTLE_BG } from './maps.js';
import { CIRCUITS, evalCircuit, binaryValue, binaryLabel, binaryCorrect, BIT_VALUES, parseShelves, pushShelf, shelvesSolved, shelfAt } from './puzzles.js';
import { MapBug, MapNpc, Shelf, MapPickup } from '../../entities/npcs/una.js';
import { unaTile } from '../../art/tiles/una.js';
import { smallItem } from '../../art/topdown.js';
import { founderSprite } from '../../art/portraits.js';
import { drawNullEye } from '../../art/null.js';
import { drawText } from '../../art/font.js';
import { UI, ACCENTS } from '../../art/palettes.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_UNA } from '../../audio/songs/una.js';
import { BattleScene } from '../../scenes/BattleScene.js';
import { RapBattleScene } from '../../scenes/RapBattleScene.js';
import { ShopScene } from '../../scenes/ShopScene.js';
import { BagScene } from '../../scenes/BagScene.js';
import { ItemGetScene } from '../../scenes/ItemGetScene.js';
import { BUG_IDS } from '../../systems/battle.js';
import { fxRng } from '../../core/rng.js';
import { Ease } from '../../core/tween.js';
import { drawStackOverflow } from '../../art/stack.js';

const TS = SCREEN.TILE;
const L2 = TEXTS.level2;
const FLOOR_CHARS = new Set(['.', 'r', 'S', 'x', 'n', 'h', 'H', ' ']);
const OPAQUE = new Set(['#', 'W', 'O', 'P', 'L', 'N', 'M']);

function freshState() {
  return {
    room: 'vestibulo',
    terminal: 0,
    introSeen: false,
    carnes: { lab: false, aula: false, biblio: false },
    lab: { round: 0, bits: [false, false, false, false, false, false, false, false], introSeen: false },
    aula: { c1: { ...CIRCUITS[0].initial }, c2: { ...CIRCUITS[1].initial }, open1: false, open2: false, changes: 0, introSeen: false, limitSeen: false },
    lib: { s1: null, s2: null, solved1: false, solved2: false },
    boardReads: 0,
    shopGolden: false,
    doorOpen: false,
    collected: [], // pickups ya tomados (bits, carnés, Y)
    bag: { cafe: 0, empanada: 0, galloPinto: 0 },
    bits: 0,
    goldenY: [false, false, false],
    seenRooms: [],
  };
}

export class Level2Scene extends TopdownLevel {
  constructor(game, { start = null } = {}) {
    super(game, { levelId: 2 });
    this.rooms = level2Rooms();
    this.state = freshState();
    this.defeated = new Set(); // bugs vencidos (vuelven al morir)
    this.rescued = this.founders.includes('stward');
    this.energy = this.maxEnergy;
    this.ram = BATTLE.RAM_START;
    this.encounter = null;
    this.stack = { t: 0, collapse: -1, gone: false };
    this.cage = { open: 0 };
    this.stward = null;
    this.bossBeaten = false;
    // Partida a medias: se reanuda desde la última terminal
    const cp = this.session?.data.checkpoint;
    if (cp && cp.level === 2 && cp.state) {
      this.state = { ...freshState(), ...structuredClone(cp.state) };
      this.bits = this.state.bits;
      this.goldenY = [...this.state.goldenY];
    }
    if (start === 'auditorio') {
      this.state.doorOpen = true;
      this.state.carnes = { lab: true, aula: true, biblio: true };
    }
    const room = start === 'auditorio' ? 'auditorio' : cp && cp.level === 2 ? L2_TERMINALS[this.state.terminal].room : 'vestibulo';
    this.loadRoom(room, { entry: start === 'auditorio' ? 'door' : cp && cp.level === 2 ? 'terminal' : 'start', from: 'pasillo' });
  }

  get maxEnergy() {
    return this.maxHp * BATTLE.ENERGY_PER_SQUARE;
  }

  get carneCount() {
    return Object.values(this.state.carnes).filter(Boolean).length;
  }

  enter() {
    this.game.audio.playSong(SONG_UNA);
    if (!this.state.introSeen) {
      this.state.introSeen = true;
      const s = this;
      this.playCutscene(function* (cs) {
        yield 0.6;
        s.choco.surprise = 0.8;
        yield 0.5;
        yield cs.say(DIALOGUES.level2Intro);
      });
    }
  }

  resume() {
    // Vuelve de una batalla, la soda, la mochila o un diálogo
  }

  // ======================================================================
  // Salas
  // ======================================================================
  loadRoom(id, { entry = 'door', from = null } = {}) {
    const R = this.rooms[id];
    this.room = R;
    this.state.room = id;
    this.setMap(new Tilemap([...R.rows], L2_LEGEND));
    this.floorStyle = R.floor;
    this.npcs = R.npcs.map((n) => new MapNpc(n));
    this.bugs = R.bugs.filter((b) => !this.defeated.has(b.id)).map((b) => new MapBug(b));
    this.pickups = [];
    this.shelves = [];
    this.interactables = [];
    this.signText = null;
    this.forceDebugView = false;
    R.bits.forEach(([x, y], i) => {
      const key = `${id}:bit${i}`;
      if (!this.state.collected.includes(key)) this.pickups.push(new MapPickup('bit', x * TS + 8, y * TS + 12, { key }));
    });
    this.setupRoom(id);

    // Dónde aparece Choco
    const c = this.choco;
    if (entry === 'start') c.placeAt(R.start.x * TS + 8, R.start.y * TS + 12, R.start.dir);
    else if (entry === 'terminal') c.placeAt(R.terminal.x * TS + 8, (R.terminal.y + 1) * TS + 12, 'down');
    else {
      const d = R.doors.find((q) => q.to === from) || R.doors[0];
      const m = this.map;
      if (d.side === 'N') c.placeAt((d.at + 1) * TS, 2 * TS + 10, 'down');
      else if (d.side === 'S') c.placeAt((d.at + 1) * TS, (m.h - 2) * TS + 12, 'up');
      else if (d.side === 'W') c.placeAt(TS + 10, (d.at + 1) * TS + 4, 'right');
      else c.placeAt((m.w - 1) * TS - 10, (d.at + 1) * TS + 4, 'left');
    }
    this.updateCamera(0, true);
    if (!this.state.seenRooms.includes(id)) {
      this.state.seenRooms.push(id);
      this.showRoomLabel(L2.rooms[id]);
    }
    this.onRoomEnter(id);
  }

  // Cambios del mapa que dependen del progreso, objetos interactivos de cada sala
  setupRoom(id) {
    const R = this.room;
    const st = this.state;
    const m = this.map;
    // Terminal de guardado
    if (R.terminal) {
      const tm = L2_TERMINALS.find((q) => q.room === id);
      this.addInteractable({ x: R.terminal.x * TS + 8, y: (R.terminal.y + 1) * TS + 4, onUse: () => this.useTerminal(tm.id) });
    }
    // NPCs con diálogo
    for (const n of this.npcs) {
      if (n.shop) continue;
      this.addInteractable({ x: n.x, y: n.y - 4, range: 18, hintH: 26, onUse: () => this.talkTo(n) });
    }
    // Carteles en la pared
    for (const sg of R.signs) {
      this.addInteractable({ x: sg.x * TS + 8, y: 2 * TS + 4, range: 16, hintH: 18, onUse: () => this.readSign(sg) });
    }

    if (id === 'soda') {
      this.addInteractable({ x: 10 * TS, y: 4 * TS + 2, range: 22, hintH: 28, onUse: () => this.openShop() });
    }

    if (id === 'salaVieja') {
      const b = R.board;
      this.addInteractable({ x: ((b.x0 + b.x1 + 1) / 2) * TS, y: 2 * TS + 6, range: 40, hintH: 20, onUse: () => this.readBoard() });
      if (st.boardReads >= 2 && !st.goldenY[0] && !this.goldenY[0]) this.spawnGolden(0, 10 * TS, 2 * TS + 12);
    }

    if (id === 'laboratorio') {
      LAB.computers.forEach((x, i) => {
        this.addInteractable({ x: x * TS + 8, y: (LAB.COMP_Y + 1) * TS + 2, range: 9, hintH: 24, onUse: () => this.toggleBit(i), disabled: st.carnes.lab });
      });
      this.labLever = this.addInteractable({ x: LAB.lever.x * TS + 8, y: (LAB.lever.y + 1) * TS + 2, range: 12, hintH: 26, onUse: () => this.compileBinary(), disabled: st.carnes.lab });
      if (st.lab.round >= 3 && !st.carnes.lab) this.spawnCarne('lab', LAB.carne.x * TS + 8, LAB.carne.y * TS + 12);
    }

    if (id === 'aula3') {
      for (const [ci, key] of [
        [0, 'c1'],
        [1, 'c2'],
      ]) {
        const def = AULA[key];
        def.levers.forEach((x, li) => {
          this.addInteractable({ x: x * TS + 8, y: (AULA.LEVER_Y + 1) * TS + 2, range: 10, hintH: 26, onUse: () => this.toggleGateLever(ci, li) });
        });
      }
      if (st.aula.open1) this.openGate(AULA.c1.gate, false);
      if (st.aula.open2) this.openGate(AULA.c2.gate, false);
      if (st.aula.open2 && !st.carnes.aula) this.spawnCarne('aula', AULA.carne.x * TS + 8, AULA.carne.y * TS + 12);
    }

    if (id === 'biblioteca' || id === 'biblioteca2') {
      const first = id === 'biblioteca';
      const L = first ? LIB1 : LIB2;
      this.puzzle = parseShelves(R.rows, L.area, SHELF_SOLIDS);
      const saved = first ? st.lib.s1 : st.lib.s2;
      const pos = saved || this.puzzle.shelves;
      this.puzzle = { ...this.puzzle, shelves: pos.map((p) => ({ ...p })) };
      this.shelves = pos.map((p, k) => new Shelf(p.x, p.y, { special: !first && k === 0 }));
      this.addInteractable({ x: L.reset.x * TS + 8, y: (L.reset.y + (first ? 1 : 0)) * TS + (first ? 4 : -2), range: 14, hintH: 26, onUse: () => this.resetShelves() });
      if (first && st.lib.solved1) this.openNorthGate();
      if (!first && st.lib.solved2) {
        m.setChar(LIB2.gate.x0, LIB2.gate.y, '.');
        m.setChar(LIB2.gate.x1, LIB2.gate.y, '.');
        if (!st.carnes.biblio) this.spawnCarne('biblio', LIB2.carne.x * TS + 16, LIB2.carne.y * TS + 12);
      }
      if (!first && !st.goldenY[1] && !this.goldenY[1]) this.spawnGolden(1, LIB2.nook.x * TS + 8, LIB2.nook.y * TS + 12);
    } else this.puzzle = null;

    if (id === 'pasillo') {
      const d = R.auditoriumDoor;
      if (st.doorOpen) this.openNorthGate();
      else this.addInteractable({ x: (d.x + 1) * TS, y: 2 * TS + 6, range: 20, hintH: 20, onUse: () => this.tryAuditorium() });
    }

    if (id === 'auditorio') {
      this.stack.t = 0;
    }
  }

  onRoomEnter(id) {
    const st = this.state;
    const s = this;
    if (id === 'laboratorio' && !st.lab.introSeen && !st.carnes.lab) {
      st.lab.introSeen = true;
      this.say(DIALOGUES.labIntro);
    } else if (id === 'aula3' && !st.aula.introSeen) {
      st.aula.introSeen = true;
      this.say(DIALOGUES.aulaIntro);
    } else if (id === 'salaVieja' && st.boardReads === 0) {
      this.playCutscene(function* () {
        yield 0.5;
        s.choco.surprise = 0.7;
        yield 0.4;
      }, { keepHud: true, bars: false, skippable: false });
    }
  }

  openNorthGate() {
    const d = this.room.doors.find((q) => q.side === 'N' && q.gate);
    if (!d) return;
    this.map.setChar(d.at, 1, '.');
    this.map.setChar(d.at + 1, 1, '.');
  }

  openGate(gate, fx = true) {
    for (let y = gate.y0; y <= gate.y1; y++) this.map.setChar(gate.x, y, '.');
    if (fx) {
      playSfx(this.game.audio, 'gateOpen');
      this.game.effects.shake(0.25);
      for (let y = gate.y0; y <= gate.y1; y++) {
        this.particles.burst(gate.x * TS + 8, y * TS + 8, 10, { speedMin: 20, speedMax: 70, colors: [UI.cyan, '#FFFFFF', '#8A8AA0'], lifeMin: 0.3, lifeMax: 0.6 });
      }
    }
  }

  // ======================================================================
  // Actualización
  // ======================================================================
  levelUpdate(dt) {
    const c = this.choco;
    const inp = this.game.input;
    this.stack.t += dt;
    if (this.demo) this.demo.t += dt;
    if (this.cage.opening) this.cage.open = Math.min(1, this.cage.open + dt * 1.5);
    if (this.stward) this.updateStward(dt);
    if (this.aulaReset) {
      this.aulaReset -= dt;
      if (this.aulaReset <= 0) this.doAulaReset();
    }
    if (this.signText) {
      this.signText.t += dt;
      if (this.signText.t > 3.5) this.signText = null;
    }

    const free = c.state === 'play' && !this.cutscene && !this.ending && !this.encounter;
    // Mochila
    if (free && inp.pressed('shoot')) {
      this.game.push(new BagScene(this.game, this));
      return;
    }
    for (const b of this.bugs) {
      if (!this.cutscene && !this.encounter) b.update(dt);
      if (free && c.grace <= 0 && aabbOverlap(c.body, b.hitbox)) this.startEncounter(b);
    }
    // Encuentro: "!" breve y la batalla
    if (this.encounter) {
      this.encounter.t += dt;
      if (this.encounter.t >= 0.45 && !this.encounter.pushed) {
        this.encounter.pushed = true;
        this.pushBattle(this.encounter.kind, this.encounter.bug);
      }
    }
    // Pickups
    if (free) {
      for (const p of this.pickups) if (!p.dead && p.pop >= 1 && aabbOverlap(c.body, p.hitbox)) this.collect(p);
      this.pickups = this.pickups.filter((p) => !p.dead);
    }
    // Puertas
    if (free && !this.game.transitioning) this.checkDoors();
    // Auditorio: al acercarse a la tarima empieza la batalla de rap
    if (free && this.room.id === 'auditorio' && !this.bossBeaten && c.footY < AUDITORIUM.trigger * TS + 12) this.startBoss();
    // Aula 3: aviso del límite al entrar a la zona del circuito 2
    if (free && this.room.id === 'aula3' && !this.state.aula.limitSeen && c.footX > 13 * TS + 4) {
      this.state.aula.limitSeen = true;
      this.say(DIALOGUES.aulaLimit);
    }
  }

  checkDoors() {
    const c = this.choco;
    const m = this.map;
    for (const d of this.room.doors) {
      let inside = false;
      if (d.side === 'N') inside = c.footY < TS + 6 && c.footX > d.at * TS && c.footX < (d.at + 2) * TS;
      else if (d.side === 'S') inside = c.footY > (m.h - 1) * TS + 6;
      else if (d.side === 'W') inside = c.footX < 8 && c.footY > d.at * TS && c.footY < (d.at + 2) * TS + 4;
      else inside = c.footX > m.pxW - 8 && c.footY > d.at * TS && c.footY < (d.at + 2) * TS + 4;
      if (!inside) continue;
      if (d.gate && m.charAt(d.at, 1) === 'G') continue;
      this.goThrough(d);
      return;
    }
  }

  goThrough(d) {
    const from = this.room.id;
    this.freezeChoco();
    playSfx(this.game.audio, 'step');
    this.game.startTransition({
      type: 'fade',
      duration: TOPDOWN.DOOR_FADE ?? 0.22,
      onMid: () => {
        this.saveShelves();
        this.loadRoom(d.to, { entry: 'door', from });
      },
    });
  }

  saveShelves() {
    if (!this.puzzle) return;
    const pos = this.shelves.map((s) => ({ x: s.tx, y: s.ty }));
    if (this.room.id === 'biblioteca') this.state.lib.s1 = pos;
    if (this.room.id === 'biblioteca2') this.state.lib.s2 = pos;
  }

  collect(p) {
    const a = this.game.audio;
    p.dead = true;
    if (p.key) this.state.collected.push(p.key);
    this.particles.burst(p.x, p.y - 6, p.type === 'bit' ? 6 : 18, { speedMin: 20, speedMax: 70, colors: ['#FFFFFF', UI.yellow, UI.green], lifeMin: 0.2, lifeMax: 0.5 });
    if (p.type === 'bit') {
      playSfx(a, 'bit');
      this.addBits(1);
    } else if (p.type === 'carne') {
      this.state.carnes[p.carne] = true;
      playSfx(a, 'checkpoint');
      this.game.effects.flash(UI.cyan, 3);
      this.showBanner(L2.carne, L2.carneSub(this.carneCount), null, 1.8);
    } else if (p.type === 'goldenY') {
      this.gainGolden(p.index);
    }
  }

  gainGolden(i) {
    playSfx(this.game.audio, 'goldenY');
    this.goldenY[i] = true;
    this.state.goldenY[i] = true;
    this.game.effects.flash('#FFD23F', 3);
    this.particles.burst(this.choco.footX, this.choco.footY - 10, 24, { speedMin: 30, speedMax: 90, colors: ['#FFD23F', '#FFFFFF', '#B8902A'], lifeMin: 0.3, lifeMax: 0.7 });
    this.showBanner(TEXTS.pickups.goldenY, `${this.goldenY.filter(Boolean).length}/3`, null, 1.4);
  }

  addBits(n) {
    this.bits += n;
    if (this.bits >= 100) {
      this.bits -= 100;
      this.lives++;
      playSfx(this.game.audio, 'oneUp');
      this.showBanner(TEXTS.pickups.oneUp, '', null, 1.2);
    }
  }

  spawnCarne(which, x, y, pop = false) {
    const key = `carne:${which}`;
    if (this.state.collected.includes(key)) return;
    const p = new MapPickup('carne', x, y, { key, pop });
    p.carne = which;
    this.pickups.push(p);
  }

  spawnGolden(i, x, y, pop = false) {
    this.pickups.push(new MapPickup('goldenY', x, y, { index: i, ghost: !!this.goldenHad[i], pop }));
  }

  // ======================================================================
  // Interacciones
  // ======================================================================
  talkTo(n) {
    n.talking = 1;
    this.say(DIALOGUES[n.dialogue] || DIALOGUES.studentHall);
  }

  readSign(sg) {
    this.signText = { text: L2.signs[sg.key], t: 0 };
    // Óscar suspira junto a los rótulos sin Y
    if (this.founders.includes('oscar') && !this.sighed?.has(sg.key)) {
      (this.sighed ||= new Set()).add(sg.key);
      playSfx(this.game.audio, 'sigh');
      this.sigh = { t: 0 };
    }
  }

  useTerminal(id) {
    // Modo Hotfix: esta terminal no guarda
    if (this.checkpointOff(id)) {
      playSfx(this.game.audio, 'denied');
      this.showBanner(TEXTS.worldMap.hotfixTag, TEXTS.hotfixOff, null, 1.4);
      return;
    }
    const st = this.state;
    st.terminal = id;
    this.energy = this.maxEnergy;
    st.bits = this.bits;
    st.goldenY = [...this.goldenY];
    this.saveShelves();
    if (this.session) {
      const d = structuredClone(this.session.data);
      d.checkpoint = { level: 2, id, state: structuredClone(st) };
      d.lastLevel = 2;
      this.session.update(d);
    }
    playSfx(this.game.audio, 'save');
    this.particles.burst(this.choco.footX, this.choco.footY - 8, 14, { speedMin: 20, speedMax: 60, colors: [UI.green, '#FFFFFF'], lifeMin: 0.3, lifeMax: 0.6 });
    this.showBanner(L2.saved, L2.savedSub, null, 1.6);
  }

  openShop() {
    const s = this;
    const first = !this.shopGreeted;
    this.shopGreeted = true;
    const open = () => this.game.push(new ShopScene(this.game, this));
    if (first) this.say(DIALOGUES.senoraHello, open);
    else open();
    void s;
  }

  // La soda: el primer gallo pinto viene con una Y dorada
  onBought(id) {
    if (id === 'galloPinto' && !this.state.shopGolden) {
      this.state.shopGolden = true;
      if (this.goldenY[2]) return;
      this.game.pop(); // cierra la soda
      this.say(DIALOGUES.senoraGoldenY, () => this.gainGolden(2));
    }
  }

  useItemOutside(id) {
    const def = BATTLE.ITEMS[id];
    if (!this.state.bag[id] || this.energy >= this.maxEnergy) return false;
    this.state.bag[id]--;
    this.energy = Math.min(this.maxEnergy, this.energy + def.energy);
    playSfx(this.game.audio, 'eat');
    playSfx(this.game.audio, 'heal');
    return true;
  }

  readBoard() {
    const st = this.state;
    st.boardReads++;
    const s = this;
    if (st.boardReads === 1) this.say(DIALOGUES.oldRoomFirst);
    else if (st.boardReads === 2 && !this.goldenY[0]) {
      this.playCutscene(function* (cs) {
        yield cs.say(DIALOGUES.oldRoomSecond);
        s.game.effects.shake(0.3);
        playSfx(s.game.audio, 'thud');
        s.boardShake = 0.6;
        yield 0.6;
        s.spawnGolden(0, 10 * TS, 2 * TS + 12, true);
        playSfx(s.game.audio, 'cacao');
        yield 0.6;
      }, { keepHud: true, bars: false });
    } else this.say(DIALOGUES.oldRoomAgain);
  }

  // ---------- Laboratorio: binario ----------
  toggleBit(i) {
    const lab = this.state.lab;
    lab.bits[i] = !lab.bits[i];
    playSfx(this.game.audio, lab.bits[i] ? 'pcOn' : 'pcOff');
    this.particles.burst(LAB.computers[i] * TS + 8, LAB.COMP_Y * TS + 4, 4, { speedMin: 10, speedMax: 30, colors: [lab.bits[i] ? UI.cyan : '#3A3A4A'], lifeMin: 0.2, lifeMax: 0.3 });
  }

  compileBinary() {
    const lab = this.state.lab;
    const s = this;
    this.leverPull = 0.4;
    playSfx(this.game.audio, 'lever');
    if (binaryCorrect(lab.bits, lab.round)) {
      lab.round++;
      playSfx(this.game.audio, 'compile');
      this.labFlash = { t: 0, ok: true };
      lab.bits = lab.bits.map(() => false);
      if (lab.round >= PUZZLES.BINARY_TARGETS.length) {
        for (const o of this.interactables) if (o !== this.labLever) o.disabled = true;
        this.labLever.disabled = true;
        this.playCutscene(function* (cs) {
          yield 0.8;
          s.spawnCarne('lab', LAB.carne.x * TS + 8, LAB.carne.y * TS + 12, true);
          yield 0.5;
          yield cs.say(DIALOGUES.labDone);
        }, { keepHud: true, bars: false });
      } else this.showBanner(L2.lab.ok, L2.lab.round(lab.round + 1), null, 1.2);
    } else {
      // Error: buzzer y aparece un bug que empieza una batalla
      playSfx(this.game.audio, 'buzzer');
      this.labFlash = { t: 0, ok: false };
      this.game.effects.shake(0.3);
      this.playCutscene(function* (cs) {
        yield cs.say(DIALOGUES.labError);
        s.particles.burst(s.choco.footX + 20, s.choco.footY - 8, 20, { speedMin: 30, speedMax: 90, colors: ['#FF2E88', '#FFFFFF', '#43D9FF'], lifeMin: 0.2, lifeMax: 0.5 });
        playSfx(s.game.audio, 'glitch');
      }, {
        keepHud: true,
        bars: false,
        onEnd: () => s.startEncounter(null, fxRng.pick(BUG_IDS)),
      });
    }
  }

  // ---------- Aula 3: compuertas ----------
  circuitState(ci) {
    const a = this.state.aula;
    return ci === 0 ? a.c1 : a.c2;
  }

  toggleGateLever(ci, li) {
    const a = this.state.aula;
    if ((ci === 0 && a.open1) || (ci === 1 && a.open2) || this.aulaReset) return;
    const lv = this.circuitState(ci);
    const id = ['A', 'B', 'C', 'D'][li];
    lv[id] = !lv[id];
    playSfx(this.game.audio, 'lever');
    if (ci === 1) a.changes++;
    const out = evalCircuit(CIRCUITS[ci], lv).out;
    if (out) {
      if (ci === 0) a.open1 = true;
      else a.open2 = true;
      const gate = ci === 0 ? AULA.c1.gate : AULA.c2.gate;
      this.openGate(gate);
      this.showBanner(L2.aula.open, '', null, 1.2);
      if (ci === 1) {
        const s = this;
        this.playCutscene(function* (cs) {
          yield 0.6;
          s.spawnCarne('aula', AULA.carne.x * TS + 8, AULA.carne.y * TS + 12, true);
          yield 0.4;
          yield cs.say(DIALOGUES.aulaDone);
        }, { keepHud: true, bars: false });
      }
    } else if (ci === 1 && a.changes >= CIRCUITS[1].maxChanges) {
      this.aulaReset = PUZZLES.GATES_RESET_DELAY;
    }
  }

  doAulaReset() {
    this.aulaReset = 0;
    const a = this.state.aula;
    a.c2 = { ...CIRCUITS[1].initial };
    a.changes = 0;
    playSfx(this.game.audio, 'buzzer');
    this.game.effects.glitch(0.2, 0.4);
    this.showBanner(L2.aula.reset, '', null, 1);
  }

  // ---------- Biblioteca: estantes ----------
  tryPushShelf(shelf, dx, dy) {
    const i = this.shelves.indexOf(shelf);
    const next = pushShelf(this.puzzle, i, dx, dy);
    if (!next) return;
    // Choco no puede quedar dentro de la celda de destino
    this.puzzle = next;
    shelf.moveTo(next.shelves[i].x, next.shelves[i].y, TOPDOWN.PUSH_TIME);
    playSfx(this.game.audio, 'push');
    this.particles.burst(shelf.tx * TS + 8, shelf.ty * TS + 14, 5, { speedMin: 10, speedMax: 25, colors: ['#C8B898'], lifeMin: 0.2, lifeMax: 0.35, front: false });
    this.saveShelves();
    this.checkShelves();
  }

  shelfOnMark(s) {
    return this.puzzle?.marks.some((m) => m.x === s.tx && m.y === s.ty);
  }

  checkShelves() {
    const st = this.state.lib;
    const first = this.room.id === 'biblioteca';
    if (!shelvesSolved(this.puzzle)) return;
    if (first && !st.solved1) {
      st.solved1 = true;
      this.openNorthGate();
      playSfx(this.game.audio, 'gateOpen');
      this.showBanner(L2.library.solved, '', null, 1.4);
      this.say(DIALOGUES.libDone);
    } else if (!first && !st.solved2) {
      st.solved2 = true;
      this.openGate({ x: LIB2.gate.x0, y0: LIB2.gate.y, y1: LIB2.gate.y });
      this.map.setChar(LIB2.gate.x1, LIB2.gate.y, '.');
      this.showBanner(L2.library.solved, '', null, 1.4);
      const s = this;
      this.playCutscene(function* (cs) {
        yield 0.5;
        s.spawnCarne('biblio', LIB2.carne.x * TS + 16, LIB2.carne.y * TS + 12, true);
        yield 0.4;
        yield cs.say(DIALOGUES.libDone);
      }, { keepHud: true, bars: false });
    }
  }

  resetShelves() {
    const first = this.room.id === 'biblioteca';
    const L = first ? LIB1 : LIB2;
    const base = parseShelves(this.room.rows, L.area, SHELF_SOLIDS);
    // No reiniciar un estante encima de Choco
    this.puzzle = base;
    this.shelves = base.shelves.map((p, k) => new Shelf(p.x, p.y, { special: !first && k === 0 }));
    const c = this.choco;
    if (this.shelves.some((s) => aabbOverlap(c.body, s.rect))) c.placeAt(L.reset.x * TS + 8, (L.reset.y + (first ? 1 : 0)) * TS + (first ? 12 : 4), c.dir);
    if (first) this.state.lib.s1 = null;
    else this.state.lib.s2 = null;
    playSfx(this.game.audio, 'lever');
    this.game.effects.glitch(0.15, 0.3);
    this.showBanner(L2.library.reset, '', null, 1);
  }

  // ---------- Pasillo: puerta del auditorio ----------
  tryAuditorium() {
    if (this.carneCount < 3) {
      playSfx(this.game.audio, 'denied');
      this.showBanner(L2.doorLocked(this.carneCount).split(' · ')[0], L2.doorLocked(this.carneCount).split(' · ')[1], null, 2);
      return;
    }
    this.state.doorOpen = true;
    const s = this;
    this.playCutscene(function* (cs) {
      for (let i = 0; i < 3; i++) {
        s.doorLights = i + 1;
        playSfx(s.game.audio, 'pcOn');
        yield 0.25;
      }
      s.openNorthGate();
      playSfx(s.game.audio, 'gateOpen');
      s.game.effects.shake(0.3);
      s.showBanner(L2.doorOpen, '', null, 1.2);
      yield 0.8;
      yield cs.say(DIALOGUES.doorOpens);
    }, {
      keepHud: true,
      onSkip: () => s.openNorthGate(),
      onEnd: () => (s.interactables = s.interactables.filter((o) => o.y !== 2 * TS + 6)),
    });
  }

  // ======================================================================
  // Batallas
  // ======================================================================
  startEncounter(bug, kind = null) {
    if (this.encounter) return;
    this.freezeChoco();
    this.choco.surprise = 0.6;
    this.encounter = { bug, kind: kind || bug.kind, t: 0 };
    playSfx(this.game.audio, 'battleStart');
  }

  pushBattle(kind, bug) {
    const g = this.game;
    g.push(
      new BattleScene(g, {
        kind,
        bg: BATTLE_BG[this.room.id],
        energy: this.energy,
        maxEnergy: this.maxEnergy,
        items: this.state.bag,
        onEnd: (out) => this.onBattleEnd(out, bug),
      }),
    );
  }

  onBattleEnd(out, bug) {
    this.encounter = null;
    this.state.bag = { ...out.items };
    this.energy = out.energy;
    this.game.audio.playSong(SONG_UNA);
    const c = this.choco;
    if (out.result === 'win') {
      if (bug) {
        this.defeated.add(bug.id);
        this.bugs = this.bugs.filter((b) => b !== bug);
        this.particles.burst(bug.x, bug.y - 8, 26, { speedMin: 30, speedMax: 110, colors: ['#FF2E88', '#43D9FF', '#FFFFFF', '#6FE08A'], lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
      }
      this.addBits(out.bits);
      c.state = 'play';
      c.grace = 0.6;
    } else if (out.result === 'fled') {
      c.state = 'play';
      c.grace = TOPDOWN.FLEE_GRACE;
      if (bug) bug.frozen = TOPDOWN.FLEE_GRACE + 0.4;
    } else this.loseLife();
  }

  // Sin energía: pierde una vida y vuelve a la última terminal con energía llena
  loseLife({ boss = false } = {}) {
    this.stats.deaths++;
    if (!this.game.infiniteLives) this.lives--;
    if (this.lives <= 0) {
      this.game.flow.gameOver(this.game, this.levelId, { ...this.stats });
      return;
    }
    this.energy = this.maxEnergy;
    if (boss) return;
    this.defeated.clear();
    this.game.startTransition({
      type: 'glitch',
      onMid: () => {
        this.saveShelves();
        const tm = L2_TERMINALS[this.state.terminal];
        this.loadRoom(tm.room, { entry: 'terminal' });
        this.choco.grace = 1;
        this.showBanner(L2.lifeLost, L2.lifeLostSub, null, 1.6);
      },
    });
  }

  restartFromCheckpoint() {
    this.game.startTransition({
      type: 'fade',
      onMid: () => {
        this.saveShelves();
        const tm = L2_TERMINALS[this.state.terminal];
        this.loadRoom(tm.room, { entry: 'terminal' });
      },
    });
  }

  // ======================================================================
  // Jefe: MC Stack Overflow
  // ======================================================================
  startBoss() {
    const s = this;
    const g = this.game;
    g.audio.stopMusic(0.5);
    this.playCutscene(function* (cs) {
      s.choco.surprise = 0.7;
      s.cameraFocus = { x: 10 * TS, y: 5 * TS };
      yield 0.8;
      yield cs.say(DIALOGUES.stackIntro);
      s.pushRap();
    }, { onSkip: () => s.pushRap() });
  }

  pushRap() {
    if (this.rapOpen) return;
    this.rapOpen = true;
    const g = this.game;
    g.push(
      new RapBattleScene(g, {
        energy: this.maxEnergy,
        maxEnergy: this.maxEnergy,
        onEnd: (out) => this.onRapEnd(out),
      }),
    );
  }

  onRapEnd(out) {
    this.rapOpen = false;
    const s = this;
    if (out.result !== 'win') {
      this.loseLife({ boss: true });
      if (this.lives <= 0) return;
      this.playCutscene(function* (cs) {
        yield 0.4;
        yield cs.say(DIALOGUES.stackLose);
        s.pushRap();
      }, { onSkip: () => s.pushRap() });
      return;
    }
    this.bossBeaten = true;
    this.stack.score = out.score;
    if (this.rescued) {
      this.playCutscene(function* () {
        s.stack.collapse = 0;
        yield 2;
        s.finishLevel();
      }, { skippable: false });
      return;
    }
    this.rescueStward();
  }

  rescueStward() {
    const s = this;
    const g = this.game;
    const c = this.choco;
    const cagePos = { x: AUDITORIUM.cage.x * TS + 8, y: AUDITORIUM.cage.y * TS + 12 };
    this.playCutscene(
      function* (cs) {
        s.cameraFocus = { x: 10 * TS, y: 5 * TS };
        yield 0.6;
        // La jaula se abre y Stward baja a la tarima
        s.cage.opening = true;
        playSfx(g.audio, 'cageOpen');
        yield cs.until(() => s.cage.open >= 1);
        s.stward = { x: cagePos.x, y: cagePos.y + 20, vy: -60, z: 22, t: 0, walk: 0, light: 0 };
        yield cs.until(() => s.stward.z <= 0);
        playSfx(g.audio, 'landSoft');
        yield 0.3;
        yield cs.say(DIALOGUES.stwardVerse);
        // Stack colapsa en ventanas de error que se cierran una por una
        s.stack.collapse = 0;
        yield cs.until(() => s.stack.gone);
        yield 0.4;
        // Stward camina hasta Choco
        s.cameraFocus = null;
        s.stward.target = { x: c.footX + 18, y: c.footY - 2 };
        yield cs.until(() => !s.stward.target);
        c.dir = 'right';
        yield cs.say(DIALOGUES.stwardRescue);
        // Se vuelve luz amarilla y se une a la barra
        s.hud.visible = true;
        s.hudInCutscene = true;
        s.stward.toLight = true;
        playSfx(g.audio, 'squareIn');
        yield cs.until(() => s.stward.light >= 1);
        s.stward.fly = { t: 0, x0: s.stward.x, y0: s.stward.y - 12 };
        yield cs.until(() => s.stward.fly.t >= 1);
        s.stward = null;
        playSfx(g.audio, 'join');
        g.effects.flash(ACCENTS.stward, 4);
        s.particles.burst(c.footX, c.footY - 8, 30, { speedMin: 30, speedMax: 110, colors: [ACCENTS.stward, '#FFFFFF', '#FFF0A0'], lifeMin: 0.3, lifeMax: 0.8 });
        s.maxHp = Math.min(HEALTH.MAX_POSSIBLE, s.maxHp + 1);
        s.energy = s.maxEnergy;
        yield 1.2;
        s.hudInCutscene = false;
        // Laptop Debugger
        c.items.laptop = true;
        yield cs.push(new ItemGetScene(g, 'laptop'));
        yield 0.3;
        yield cs.say(DIALOGUES.debugDemo);
        // Demostración de la Vista Debug (10 s): revela el mensaje oculto de N.U.L.L.
        s.demo = { t: 0 };
        s.forceDebugView = true;
        s.cameraFocus = { x: 10 * TS, y: 4 * TS };
        s.hud.visible = false;
        playSfx(g.audio, 'debugScan');
        yield cs.until(() => s.demo.t >= 10 || (s.demo.t > 4 && g.input.pressed('confirm')));
        s.forceDebugView = false;
        s.demo = null;
        s.cameraFocus = null;
        yield cs.say(DIALOGUES.debugReveal);
        s.finishLevel({ delay: 1.8 });
        playSfx(g.audio, 'item');
      },
      {
        keepHud: true,
        onSkip: () => {
          s.stward = null;
          s.stack.gone = true;
          s.forceDebugView = false;
          s.demo = null;
          s.cameraFocus = null;
          c.items.laptop = true;
          s.maxHp = Math.min(HEALTH.MAX_POSSIBLE, Math.max(s.maxHp, 3));
        },
        onEnd: () => {
          if (!s.ending) s.finishLevel({ delay: 1.2 });
        },
      },
    );
  }

  updateStward(dt) {
    const w = this.stward;
    w.t += dt;
    if (w.z > 0 || w.vy < 0) {
      w.vy += 400 * dt;
      w.z = Math.max(0, w.z - w.vy * dt);
      if (w.z <= 0) w.vy = 0;
    }
    if (w.target) {
      const dx = w.target.x - w.x;
      const dy = w.target.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) w.target = null;
      else {
        const sp = 50 * dt;
        w.x += (dx / d) * Math.min(sp, d);
        w.y += (dy / d) * Math.min(sp, d);
        w.walk += dt;
      }
    }
    if (w.toLight) w.light = Math.min(1, w.light + dt * 1.2);
    if (w.fly) w.fly.t = Math.min(1, w.fly.t + dt * 1.1);
  }

  // ======================================================================
  // HUD
  // ======================================================================
  hudState() {
    const s = super.hudState();
    s.hp = Math.max(0, Math.ceil(this.energy / BATTLE.ENERGY_PER_SQUARE));
    return s;
  }

  drawUi(ctx) {
    if (this.hud.alpha <= 0) return;
    ctx.globalAlpha = this.hud.alpha;
    // Ventana de energía y RAM (una línea, debajo de las vidas)
    const x = 4;
    const y = 33;
    ctx.fillStyle = 'rgba(7,7,12,0.6)';
    ctx.fillRect(x - 2, y - 2, 84, 12);
    const w = 36;
    const p = Math.max(0, this.energy / this.maxEnergy);
    ctx.fillStyle = '#1E120C';
    ctx.fillRect(x, y + 1, w + 2, 6);
    ctx.fillStyle = p < 0.3 ? (Math.floor(this.t * 4) % 2 ? UI.red : '#FF8A8A') : UI.green;
    ctx.fillRect(x + 1, y + 2, Math.round(w * p), 4);
    drawText(ctx, `${this.energy}`, x + w + 5, y, { color: UI.text });
    drawText(ctx, `${L2.ram} ${BATTLE.RAM_START}`, x + 80, y, { align: 'right', color: UI.cyan });
    // Carnés
    const cx = SCREEN.W - 44;
    ['lab', 'aula', 'biblio'].forEach((k, i) => {
      const spr = smallItem('carne');
      ctx.globalAlpha = this.hud.alpha * (this.state.carnes[k] ? 1 : 0.25);
      ctx.drawImage(spr.normal, cx + i * 13, 16);
    });
    ctx.globalAlpha = this.hud.alpha;
    // Mochila
    const n = Object.values(this.state.bag).reduce((a, b) => a + b, 0);
    const label = `${this.game.input.keyName('shoot')} ${L2.bag} ${n}`;
    drawText(ctx, label, SCREEN.W - 4, SCREEN.H - 11, { align: 'right', color: n ? UI.text : UI.textDim });
    ctx.globalAlpha = 1;
    // Suspiro de Óscar junto a un rótulo sin Y
    if (this.sigh) {
      this.sigh.t += 1 / 60;
      if (this.sigh.t > 2) this.sigh = null;
      else {
        ctx.globalAlpha = Math.min(1, (2 - this.sigh.t) * 3);
        drawText(ctx, TEXTS.level1.oscarSigh, 4, 58, { color: ACCENTS.oscar });
        ctx.globalAlpha = 1;
      }
    }
  }

  // ======================================================================
  // Dibujo
  // ======================================================================
  drawTiles(ctx, cx, cy) {
    const m = this.map;
    const x0 = Math.max(0, Math.floor(cx / TS));
    const y0 = Math.max(0, Math.floor(cy / TS));
    const x1 = Math.min(m.w - 1, Math.floor((cx + SCREEN.W) / TS));
    const y1 = Math.min(m.h - 1, Math.floor((cy + SCREEN.H) / TS));
    const style = this.floorStyle;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const ch = m.charAt(tx, ty);
        const px = tx * TS - cx;
        const py = ty * TS - cy;
        if (!OPAQUE.has(ch)) {
          const fch = FLOOR_CHARS.has(ch) ? (ch === 'H' ? 'x' : ch === 'h' ? '.' : ch) : '.';
          ctx.drawImage(unaTile(fch, style, tx, ty).normal, px, py);
        }
        if (!FLOOR_CHARS.has(ch)) ctx.drawImage(unaTile(ch, style, tx, ty).normal, px, py);
        // Umbral de las puertas: más oscuro hacia afuera
        if ((ty === 0 || ty === m.h - 1 || tx === 0 || tx === m.w - 1) && ch === '.') {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = '#1A1010';
          ctx.fillRect(px, py, TS, TS);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // Lo que se dibuja sobre el piso: pantallas, palancas, circuitos, textos de pared
  drawFloorDecor(ctx, cx, cy) {
    const id = this.room.id;
    const R = this.room;
    const t = this.t;
    // Terminales: pantalla verde animada
    if (R.terminal) {
      const x = R.terminal.x * TS - cx;
      const y = R.terminal.y * TS - cy;
      ctx.fillStyle = '#0A2A14';
      ctx.fillRect(x + 4, y + 3, 8, 5);
      ctx.fillStyle = UI.green;
      ctx.fillRect(x + 4, y + 3 + (Math.floor(t * 3) % 5), 8, 1);
      if (Math.floor(t * 2) % 2) ctx.fillRect(x + 5, y + 4, 2, 1);
    }
    if (id === 'laboratorio') this.drawLab(ctx, cx, cy);
    if (id === 'aula3') this.drawCircuits(ctx, cx, cy);
    if (id === 'salaVieja') this.drawBoard(ctx, cx, cy);
    if (id === 'soda') {
      const x = 8 * TS - cx;
      const y = TS - cy;
      drawText(ctx, 'MENÚ', x + 16, y + 3, { align: 'center', color: '#F4F1EA', shadow: false });
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x + 4, y + 11, 24, 1);
    }
    if (id === 'pasillo' && !this.state.doorOpen) {
      const d = R.auditoriumDoor;
      for (let i = 0; i < 3; i++) {
        const on = i < Math.max(this.carneCount, this.doorLights || 0);
        ctx.fillStyle = on ? UI.green : '#3A1A1A';
        ctx.fillRect(d.x * TS - cx + 8 + i * 6, TS - cy + 2, 4, 3);
      }
    }
    if (id === 'auditorio') this.drawAuditorium(ctx, cx, cy);
  }

  drawLab(ctx, cx, cy) {
    const lab = this.state.lab;
    const done = this.state.carnes.lab || lab.round >= 3;
    // Pantallas de las computadoras
    LAB.computers.forEach((x, i) => {
      const px = x * TS - cx;
      const py = LAB.COMP_Y * TS - cy;
      const on = lab.bits[i] || done;
      ctx.fillStyle = on ? '#43D9FF' : '#101018';
      ctx.fillRect(px + 4, py + 1, 8, 6);
      if (on) {
        ctx.fillStyle = '#DFFAFF';
        drawText(ctx, '1', px + 8, py + 1, { align: 'center', color: '#07303C', shadow: false });
      } else drawText(ctx, '0', px + 8, py + 1, { align: 'center', color: '#3A3A4A', shadow: false });
      // Valor del bit en el piso
      drawText(ctx, String(BIT_VALUES[i]), px + 8, py + 18 + (i % 2) * 8, { align: 'center', color: on ? UI.cyan : '#7A7A8A', shadow: false });
    });
    // Monitor grande: objetivo y valor actual
    const sx = LAB.screen.x0 * TS - cx;
    const sy = LAB.screen.y * TS - cy;
    const flash = this.labFlash && this.labFlash.t < 0.8;
    if (this.labFlash) this.labFlash.t += 1 / 60;
    ctx.fillStyle = flash ? (this.labFlash.ok ? '#0A3A20' : '#3A0A10') : '#05070C';
    ctx.fillRect(sx + 2, sy + 2, 60, 9);
    if (done) drawText(ctx, '✔', sx + 32, sy + 2, { align: 'center', color: UI.green, shadow: false });
    else {
      drawText(ctx, binaryLabel(lab.round), sx + 18, sy + 2, { align: 'center', color: UI.yellow, shadow: false });
      drawText(ctx, `=${binaryValue(lab.bits)}`, sx + 46, sy + 2, { align: 'center', color: UI.cyan, shadow: false });
    }
    // Palanca COMPILAR
    const lx = LAB.lever.x * TS - cx;
    const ly = LAB.lever.y * TS - cy;
    const pulled = this.leverPull > 0 || done;
    if (this.leverPull > 0) this.leverPull -= 1 / 60;
    this.drawLeverArm(ctx, lx, ly, pulled, UI.red);
    if (!done) drawText(ctx, L2.lab.round(lab.round + 1), lx + 8, ly - 9, { align: 'center', color: UI.textDim });
  }

  drawLeverArm(ctx, x, y, on, color) {
    ctx.fillStyle = '#1E120C';
    if (on) {
      ctx.fillRect(x + 7, y + 9, 2, 1);
      ctx.fillRect(x + 8, y + 8, 5, 2);
      ctx.fillStyle = color;
      ctx.fillRect(x + 12, y + 7, 3, 3);
    } else {
      ctx.fillRect(x + 7, y + 3, 2, 7);
      ctx.fillStyle = color;
      ctx.fillRect(x + 6, y + 1, 4, 3);
    }
  }

  drawCircuits(ctx, cx, cy) {
    const a = this.state.aula;
    CIRCUITS.forEach((circ, ci) => {
      const key = ci === 0 ? 'c1' : 'c2';
      const def = AULA[key];
      const levers = ci === 0 ? a.c1 : a.c2;
      const { values, out } = evalCircuit(circ, levers);
      const L = CIRCUIT_LAYOUT[key];
      const pos = {};
      ['A', 'B', 'C', 'D'].forEach((id, i) => (pos[id] = { x: def.levers[i] * TS + 8, y: AULA.LEVER_Y * TS + 4, lever: true }));
      for (const gte of circ.gates) pos[gte.id] = { x: L[gte.id][0] * TS + 8, y: L[gte.id][1] * TS + 8 };
      const wire = (x0, y0, x1, y1, on, vertFirst) => {
        ctx.fillStyle = on ? UI.cyan : '#7A7A86';
        const X0 = Math.round(x0 - cx);
        const Y0 = Math.round(y0 - cy);
        const X1 = Math.round(x1 - cx);
        const Y1 = Math.round(y1 - cy);
        if (vertFirst) {
          ctx.fillRect(X0, Math.min(Y0, Y1), 1, Math.abs(Y1 - Y0) + 1);
          ctx.fillRect(Math.min(X0, X1), Y1, Math.abs(X1 - X0) + 1, 1);
        } else {
          const mx = Math.round((X0 + X1) / 2);
          ctx.fillRect(Math.min(X0, mx), Y0, Math.abs(mx - X0) + 1, 1);
          ctx.fillRect(mx, Math.min(Y0, Y1), 1, Math.abs(Y1 - Y0) + 1);
          ctx.fillRect(Math.min(mx, X1), Y1, Math.abs(X1 - mx) + 1, 1);
        }
        if (on && Math.floor(this.t * 8 + x0) % 6 === 0) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(X1 - 1, Y1, 1, 1);
        }
      };
      // Cables a las entradas de cada compuerta
      for (const gte of circ.gates) {
        const p = pos[gte.id];
        gte.in.forEach((src, k) => {
          const sp = pos[src];
          const iy = gte.in.length === 1 ? p.y : p.y - 3 + k * 6;
          if (sp.lever) wire(sp.x, sp.y, p.x - 11, iy, !!values[src], true);
          else wire(sp.x + 11, sp.y, p.x - 11, iy, !!values[src], false);
        });
      }
      // Salida hacia la reja
      const op = pos[circ.out];
      wire(op.x + 11, op.y, def.gate.x * TS, def.gate.y0 * TS + 16, out, false);
      // Cajas de las compuertas
      for (const gte of circ.gates) {
        const p = pos[gte.id];
        const x = Math.round(p.x - cx);
        const y = Math.round(p.y - cy);
        const on = values[gte.id];
        ctx.fillStyle = '#1E1E2A';
        ctx.fillRect(x - 11, y - 6, 22, 12);
        ctx.fillStyle = on ? UI.cyan : '#5A5A6E';
        ctx.fillRect(x - 11, y - 6, 22, 1);
        ctx.fillRect(x - 11, y + 5, 22, 1);
        drawText(ctx, gte.type, x, y - 3, { align: 'center', color: on ? '#DFFAFF' : '#B8B8C8', shadow: false });
      }
      // Palancas
      def.levers.forEach((x, i) => {
        const id = ['A', 'B', 'C', 'D'][i];
        const px = x * TS - cx;
        const py = AULA.LEVER_Y * TS - cy;
        this.drawLeverArm(ctx, px, py, levers[id], levers[id] ? UI.cyan : '#8A8AA0');
        drawText(ctx, id, px + 8, py + 17, { align: 'center', color: levers[id] ? UI.cyan : UI.textDim });
      });
      if (ci === 1 && !a.open2) {
        const max = CIRCUITS[1].maxChanges;
        const col = a.changes >= max - 1 ? UI.red : UI.yellow;
        drawText(ctx, L2.aula.changes(a.changes, max), 18.5 * TS - cx, 9 * TS + 4 - cy, { align: 'center', color: this.aulaReset && Math.floor(this.t * 10) % 2 ? UI.red : col });
      }
    });
  }

  drawBoard(ctx, cx, cy) {
    const b = this.room.board;
    const shake = this.boardShake > 0 ? Math.round(Math.sin(this.t * 60) * 1) : 0;
    if (this.boardShake > 0) this.boardShake -= 1 / 60;
    const x = b.x0 * TS - cx + shake;
    const y = b.y * TS - cy;
    // Diagrama viejo de N.U.L.L. en tiza
    ctx.fillStyle = '#C8D8C8';
    ctx.fillRect(x + 6, y + 3, 18, 1);
    ctx.fillRect(x + 6, y + 8, 18, 1);
    ctx.fillRect(x + 6, y + 3, 1, 6);
    ctx.fillRect(x + 23, y + 3, 1, 6);
    ctx.fillRect(x + 24, y + 6, 10, 1);
    ctx.fillRect(x + 34, y + 3, 14, 1);
    ctx.fillRect(x + 34, y + 8, 14, 1);
    ctx.fillRect(x + 34, y + 3, 1, 6);
    ctx.fillRect(x + 47, y + 3, 1, 6);
    drawText(ctx, '∅', x + 41, y + 2, { align: 'center', color: '#C8D8C8', shadow: false });
    drawText(ctx, '// TODO', x + 90, y + 2, { align: 'center', color: '#FF6A6A', shadow: false });
  }

  drawAuditorium(ctx, cx, cy) {
    // Luces de colores sobre la tarima
    const cols = ['#FF2E88', '#43D9FF', '#FFD23F'];
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      const bx = 3 * TS + i * 5 * TS + Math.sin(this.t * 0.8 + i * 2) * 20 - cx;
      ctx.beginPath();
      ctx.moveTo(bx + 24, -cy);
      ctx.lineTo(bx, 5 * TS - cy);
      ctx.lineTo(bx + 48, 5 * TS - cy);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  addDrawables(list, ctx, cx, cy) {
    if (this.room.id !== 'auditorio') return;
    // MC Stack Overflow en la tarima
    if (!this.stack.gone) {
      const sp = { x: AUDITORIUM.stack.x * TS + 8, y: AUDITORIUM.stack.y * TS + 14 };
      list.push({
        y: sp.y,
        d: () => {
          if (this.stack.collapse >= 0) {
            this.stack.collapse += 1 / 60;
            if (this.stack.collapse > 3.2) this.stack.gone = true;
          }
          drawStackOverflow(ctx, sp.x - cx, sp.y - cy, this.stack.t, { collapse: this.stack.collapse, beat: 90 });
        },
      });
    }
    // Stward en su jaula colgante
    const cg = { x: AUDITORIUM.cage.x * TS + 8, y: AUDITORIUM.cage.y * TS + 12 };
    list.push({ y: cg.y + 40, d: () => this.drawCage(ctx, cg.x - cx, cg.y - cy) });
    if (this.stward) {
      const w = this.stward;
      list.push({ y: w.y + 30, d: () => this.drawStward(ctx, w, cx, cy) });
    }
  }

  drawCage(ctx, x, y) {
    const sway = Math.round(Math.sin(this.t * 1.5) * 2);
    // Cadena
    ctx.fillStyle = '#8A8AA0';
    for (let k = 0; k < 6; k++) ctx.fillRect(x + sway * (k / 6), y - 44 + k * 4, 1, 2);
    const open = this.cage.open;
    if (!this.stward && open < 1) ctx.drawImage(founderSprite('stward', Math.floor(this.t * 3) % 2).normal, x - 8 + sway, y - 22);
    // Barrotes de caracteres (amarillo de Stward)
    const glyphs = ['|', '#', '[', ']'];
    for (let i = 0; i < 5; i++) {
      if (open > 0 && i * 0.2 < open) continue;
      for (let j = 0; j < 3; j++) {
        const ch = glyphs[(i + j + Math.floor(this.t * 4)) % glyphs.length];
        drawText(ctx, ch, x - 12 + i * 6 + sway, y - 24 + j * 9, { color: j % 2 ? '#FFD23F' : '#B8902A', shadow: '#2A1A0A' });
      }
    }
    if (open < 1) {
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x - 14 + sway, y - 26, 30, 2);
      ctx.fillRect(x - 14 + sway, y + 2, 30, 2);
    }
  }

  drawStward(ctx, w, cx, cy) {
    const x = Math.round(w.x - cx);
    const y = Math.round(w.y - cy - (w.z || 0));
    if (w.fly) {
      const p = Ease.inOutCubic(w.fly.t);
      const tx = 4 + 2 * 11 + 6 + cx;
      const ty = 9 + cy;
      const fx = Math.round(w.fly.x0 + (tx - w.fly.x0) * p - cx);
      const fy = Math.round(w.fly.y0 + (ty - w.fly.y0) * p - cy - Math.sin(p * Math.PI) * 30);
      ctx.fillStyle = ACCENTS.stward;
      ctx.fillRect(fx - 3, fy - 3, 6, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
      if (fxRng.chance(0.7)) this.particles.spawn({ x: fx + cx, y: fy + cy, vx: fxRng.range(-10, 10), vy: fxRng.range(-10, 10), life: 0.4, colors: [ACCENTS.stward, '#FFFFFF'] });
      return;
    }
    const frame = w.target ? 2 + (Math.floor(w.walk * 8) % 4) : Math.floor(w.t * 3) % 2;
    const spr = founderSprite('stward', frame);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(w.x - cx) - 5, Math.round(w.y - cy) + 22, 10, 2);
    ctx.globalAlpha = 1;
    ctx.drawImage(spr.normal, x - 8, y);
    if (w.light > 0) {
      ctx.globalAlpha = w.light;
      ctx.drawImage(spr.tint(ACCENTS.stward), x - 8, y);
      ctx.globalAlpha = 1;
    }
  }

  // Con la Vista Debug: rutas de los bugs y, en el auditorio, el mensaje oculto de N.U.L.L.
  drawDebugReveal(ctx, cx, cy) {
    for (const b of this.bugs) b.drawPath(ctx, cx, cy, this.t);
    if (this.room.id === 'auditorio' && this.bossBeaten) {
      const msg = 'no debiste volver';
      const n = this.demo ? Math.min(msg.length, Math.floor(this.demo.t * 6)) : msg.length;
      const x = 10 * TS - cx;
      const y = TS + 2 - cy;
      drawText(ctx, msg, x + (fxRng.chance(0.1) ? 1 : 0), y, { align: 'center', color: '#FF2E88', maxChars: n, shadow: '#3A0A1A', scale: 2 });
      drawNullEye(ctx, 3 * TS - cx, TS + 8 - cy, 5, { look: Math.sin(this.t) });
      drawNullEye(ctx, 17 * TS - cx, TS + 8 - cy, 5, { look: Math.sin(this.t + 1) });
    }
  }

  // ======================================================================
  // Depuración
  // ======================================================================
  debugGiveAll() {
    this.choco.items = { staff: true, boots: true, laptop: true, shield: true, lasso: true };
    this.debugCarnes();
  }

  debugCarnes() {
    this.state.carnes = { lab: true, aula: true, biblio: true };
    this.showBanner(L2.carne, L2.carneSub(3), null, 1);
  }

  debugLife(d) {
    this.maxHp = Math.max(1, Math.min(HEALTH.MAX_POSSIBLE, this.maxHp + d));
    this.energy = this.maxEnergy;
  }

  debugInfo() {
    const c = this.choco;
    return [
      `${this.room.id} · ${c.state} · ${c.dir}`,
      `pies ${c.footX.toFixed(1)}, ${c.footY.toFixed(1)} (tile ${Math.floor(c.footX / TS)},${Math.floor((c.footY - 4) / TS)})`,
      `energía ${this.energy}/${this.maxEnergy} · carnés ${this.carneCount}/3`,
      `bugs ${this.bugs.length} · vencidos ${this.defeated.size}`,
    ];
  }

  debugDraw(ctx) {
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    const box = (r, color) => {
      ctx.strokeStyle = color;
      ctx.strokeRect(Math.round(r.x - cx) + 0.5, Math.round(r.y - cy) + 0.5, r.w - 1, r.h - 1);
    };
    box(this.choco.body, '#6FE08A');
    for (const b of this.bugs) box(b.hitbox, '#E0343F');
    for (const r of this.obstacles()) box(r, '#43D9FF');
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(Math.round(this.choco.lookX - cx), Math.round(this.choco.lookY - cy), 1, 1);
  }
}
