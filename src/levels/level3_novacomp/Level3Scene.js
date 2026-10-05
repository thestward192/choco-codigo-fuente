// Nivel 3 · Oficinas de Novacomp — docs/niveles/nivel_3_novacomp.md
// Sigilo de vista cenital, de noche: conos de visión que se cortan con las paredes, medidor de
// sospecha, alarma de 12 s, ruido, escondites, hackeo con la laptop, Hezron con sus nubes de
// vapor, el jefe DEADLINE y la sala de práctica del Escudo Firewall.
import { TopdownLevel } from '../TopdownLevel.js';
import { SCREEN, STEALTH, HACK, VAPOR, HEALTH, DEADLINE, SHIELD, TURRET, TOPDOWN } from '../../config/balance.js';
import { Tilemap } from '../../systems/tilemap.js';
import { aabbOverlap } from '../../systems/physics.js';
import { conePolygon, castRay, angleDiff } from '../../systems/vision.js';
import { findPath, nearestPassable } from '../../systems/pathfind.js';
import { createHack, hackInput, hackUpdate } from '../../systems/hack.js';
import { shieldBlock, shieldCharge01 } from '../../systems/shield.js';
import { createDeadline, deadlineTick, deadlineHacked, deadlineHackFailed, deadlineDamage, canHack, nextAttack, maxHp as deadlineMaxHp } from '../../systems/deadline.js';
import { level3Rooms, L3_LEGEND, OPAQUE_CHARS, HIDE_CHARS, ARENA } from './maps.js';
import { BotSeg, SecCamera, Drone, Laser, Vacuum, Turret } from '../../entities/enemies/stealth.js';
import { TopdownShot, EnemyShot } from '../../entities/topdownShot.js';
import { HezronFollower, VaporCloud } from '../../entities/npcs/hezron.js';
import { MapNpc, MapPickup } from '../../entities/npcs/una.js';
import { novaTile, NOVA_FLOOR_CHARS } from '../../art/tiles/novacomp.js';
import { drawDeadline, DEADLINE_R } from '../../art/bosses/deadline.js';
import { founderSprite } from '../../art/portraits.js';
import { fillPolygon, thickLine, ring } from '../../art/shapes.js';
import { drawText, measureText } from '../../art/font.js';
import { UI, ACCENTS } from '../../art/palettes.js';
import { drawHackPanel } from '../../ui/hackPanel.js';
import { Lighting } from '../../core/lighting.js';
import { TEXTS, DIALOGUES } from '../../data/dialogues.js';
import { playSfx } from '../../audio/sfx.js';
import { SONG_NOVACOMP, SONG_DEADLINE } from '../../audio/songs/novacomp.js';
import { ItemGetScene } from '../../scenes/ItemGetScene.js';
import { fxRng, createRng } from '../../core/rng.js';
import { Ease } from '../../core/tween.js';

const TS = SCREEN.TILE;
const L3 = TEXTS.level3;
const R = fxRng;
// Oscuridad de la noche según el piso de la sala
const DARKNESS = { lobby: 0.34, carpet: 0.38, deck: 0.26, metal: 0.32 };
// Muebles bajos: los disparos pasan por encima
const SHOT_PASS = new Set(['D', 'd', 'T', 'b', 'r', 'p', '~', 'H', 'C']);
// De qué sala se entra a cada checkpoint (para aparecer en su puerta)
const CHECKPOINT_FROM = { openspace: 'lobby', gerencia: 'terrace', servers: 'gerencia', practice: 'servers' };

function freshState() {
  return {
    room: 'lobby',
    checkpoint: 'lobby',
    introSeen: false,
    hezron: false, // rescatado: acompaña a Choco
    hezronJoined: false, // se unió a la barra (tras DEADLINE)
    hackTutorialSeen: false,
    coffeeUsed: false,
    deskSeen: false,
    safeOpen: false,
    bossBeaten: false,
    shieldGot: false,
    practiceDone: false,
    practiceIntroSeen: false,
    diverted: [],
    vapor: {},
    goldenY: [false, false, false],
    bits: 0,
    collected: [],
    seenRooms: [],
  };
}

export class Level3Scene extends TopdownLevel {
  constructor(game, { start = null } = {}) {
    super(game, { levelId: 3 });
    this.stealth = true;
    this.rooms = level3Rooms();
    this.state = freshState();
    this.lighting = new Lighting();
    this.rng = createRng((Date.now() & 0xffff) + 7);
    this.shots = [];
    this.eshots = [];
    this.clouds = [];
    this.noises = [];
    this.alarm = null;
    this.hack = null;
    this.toast = null;
    this.noticeCd = 0;
    this.runNoiseT = 0;
    const cp = this.session?.data.checkpoint;
    let room = 'lobby';
    let entry = 'start';
    if (cp && cp.level === 3 && cp.state) {
      this.state = { ...freshState(), ...structuredClone(cp.state) };
      this.bits = this.state.bits;
      this.goldenY = [...this.state.goldenY];
      room = this.state.checkpoint;
      entry = 'checkpoint';
    }
    // Atajos de desarrollo
    if (start === 'terraza') {
      this.state.introSeen = true;
      room = 'terrace';
      entry = 'door';
    } else if (start === 'deadline') {
      Object.assign(this.state, { introSeen: true, hezron: true });
      room = 'servers';
      entry = 'checkpoint';
    } else if (start === 'escudo') {
      Object.assign(this.state, { introSeen: true, hezron: true, hezronJoined: true, bossBeaten: true, shieldGot: true });
      this.choco.items.shield = true;
      this.maxHp = Math.min(HEALTH.MAX_POSSIBLE, Math.max(this.maxHp, 4));
      room = 'practice';
      entry = 'checkpoint';
    }
    if (this.state.shieldGot) this.choco.items.shield = true;
    if (this.state.hezronJoined) this.maxHp = Math.min(HEALTH.MAX_POSSIBLE, Math.max(this.maxHp, 4));
    this.choco.hp = this.maxHp;
    this.constructing = true;
    this.loadRoom(room, { entry, from: entry === 'door' ? 'openspace' : null });
    this.constructing = false;
  }

  // Sin partida (atajo de desarrollo): con Botas, Laptop y los cuadritos de Óscar y Stward
  startingLoadout() {
    const lo = super.startingLoadout();
    if (!this.session) {
      lo.items.laptop = true;
      lo.maxHp = 3;
    }
    return lo;
  }

  enter() {
    this.game.audio.playSong(this.room.boss && this.boss?.started ? SONG_DEADLINE : SONG_NOVACOMP);
    // Lo que la sala inicial quería mostrar se muestra cuando el nivel ya está en pantalla
    if (this.pendingEnter) {
      const id = this.pendingEnter;
      this.pendingEnter = null;
      if (this.state.introSeen) this.onRoomEnter(id);
    }
    if (!this.state.introSeen) {
      this.state.introSeen = true;
      const s = this;
      this.playCutscene(
        function* (cs) {
          yield 0.6;
          s.choco.surprise = 0.8;
          yield 0.5;
          yield cs.say(DIALOGUES.level3Intro);
        },
        { onEnd: () => this.showBanner(L3.sneakHint(this.game.input.keyName('sneak')), '', null, 2.6) },
      );
    }
  }

  exit() {
    this.game.audio.setLayer('alarm', false, 0.1);
  }

  get hezronActive() {
    return this.state.hezron && !this.state.hezronJoined;
  }

  // ======================================================================
  // Salas
  // ======================================================================
  loadRoom(id, { entry = 'door', from = null } = {}) {
    const R0 = this.rooms[id];
    this.room = R0;
    this.state.room = id;
    this.setMap(new Tilemap([...R0.rows], L3_LEGEND));
    this.floorStyle = R0.floor;
    this.entry = { id, entry, from };
    this.interactables = [];
    this.pickups = [];
    this.secretY = null;
    this.shots = [];
    this.eshots = [];
    this.clouds = [];
    this.noises = [];
    this.hack = null;
    this.daily = null;
    this.inDaily = false;
    this.signText = null;
    this.endAlarm(true);
    this.boss = null;
    this.practice = null;
    this.turret = null;
    this.hidingSpot = null;
    // Enemigos (frescos: la sección empieza de cero)
    this.bots = R0.bots.map((d) => new BotSeg(d));
    for (const b of this.bots) if (this.state.diverted.includes(b.id)) b.divert();
    this.cameras = R0.cameras.map((d) => new SecCamera(d));
    this.drones = R0.drones.map((d) => new Drone(d));
    this.lasers = R0.lasers.map((d) => new Laser(d));
    this.vacuums = R0.vacuums.map((d) => new Vacuum(d));
    this.npcs = R0.npcs.map((n) => new MapNpc(n));
    this.bugs = [];
    // Bits
    R0.bits.forEach(([x, y], i) => {
      const key = `${id}:bit${i}`;
      if (!this.state.collected.includes(key)) this.pickups.push(new MapPickup('bit', x * TS + 8, y * TS + 12, { key }));
    });
    this.setupRoom(id);
    // Cargas de vapor de esta sección
    if (this.state.vapor[id] === undefined || entry !== 'door') this.state.vapor[id] = VAPOR.CHARGES;

    // Dónde aparece Choco
    const c = this.choco;
    c.state = 'play';
    if (entry === 'checkpoint') from = CHECKPOINT_FROM[id] || null;
    if ((entry === 'start' || !from) && R0.start) c.placeAt(R0.start.x * TS + 8, R0.start.y * TS + 12, R0.start.dir);
    else {
      const d = R0.doors.find((q) => q.to === from) || R0.doors[0];
      const m = this.map;
      if (d.side === 'N') c.placeAt((d.at + 1) * TS, 2 * TS + 10, 'down');
      else if (d.side === 'S') c.placeAt((d.at + 1) * TS, (m.h - 2) * TS + 12, 'up');
      else if (d.side === 'W') c.placeAt(TS + 10, (d.at + 1) * TS + 4, 'right');
      else c.placeAt((m.w - 1) * TS - 10, (d.at + 1) * TS + 4, 'left');
      this.entry.from = d.to;
    }
    this.hezron = this.hezronActive ? new HezronFollower(c.footX - 10, c.footY) : null;
    this.updateCamera(0, true);
    if (!this.state.seenRooms.includes(id)) {
      this.state.seenRooms.push(id);
      this.showRoomLabel(L3.rooms[id]);
    }
    if (R0.checkpoint && this.state.checkpoint !== id) this.setCheckpoint(id);
    this.onRoomEnter(id);
  }

  // Punto de interacción del lado libre de un tile (prefiere abajo)
  sidePoint(tx, ty) {
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ]) {
      if (!this.map.isSolid(tx + dx, ty + dy)) return { x: tx * TS + 8 + dx * 10, y: ty * TS + 8 + dy * 10 + (dy === 0 ? 4 : 0) };
    }
    return { x: tx * TS + 8, y: (ty + 1) * TS + 4 };
  }

  setupRoom(id) {
    const R0 = this.room;
    const st = this.state;
    const m = this.map;
    // Escondites: casilleros y escritorios con tela
    for (let ty = 0; ty < m.h; ty++) {
      for (let tx = 0; tx < m.w; tx++) {
        if (!HIDE_CHARS.has(m.charAt(tx, ty))) continue;
        const p = this.sidePoint(tx, ty);
        this.addInteractable({ x: p.x, y: p.y, range: 14, hintH: 20, hide: { tx, ty }, onUse: (o) => this.enterHide(o.hide) });
      }
    }
    // Terminales de hackeo
    this.terms = [];
    for (const def of R0.terminals) {
      const p = this.sidePoint(def.x, def.y);
      const term = { def, x: p.x, y: p.y, used: false, busy: 0 };
      if (def.effect === 'safe' && st.safeOpen) term.used = true;
      if (def.effect === 'route' && st.diverted.includes(def.target)) term.used = true;
      term.it = this.addInteractable({ x: p.x, y: p.y, range: 16, hintH: 22, onUse: () => this.useTerminal(term) });
      this.terms.push(term);
    }
    for (const sg of R0.signs) {
      const p = this.sidePoint(sg.x, sg.y);
      this.addInteractable({ x: p.x, y: p.y, range: 16, hintH: 18, onUse: () => this.say(DIALOGUES.elevator) });
    }
    if (R0.coffee) {
      const p = this.sidePoint(R0.coffee.x, R0.coffee.y);
      this.addInteractable({ x: p.x, y: p.y, range: 16, hintH: 24, onUse: () => this.drinkCoffee() });
    }
    if (R0.chocoDesk) {
      const p = this.sidePoint(R0.chocoDesk.x, R0.chocoDesk.y);
      this.addInteractable({ x: p.x, y: p.y + 2, range: 12, hintH: 22, onUse: () => this.say(DIALOGUES.chocoDesk) });
    }
    // Y dorada
    const gy = R0.golden;
    if (gy && !this.goldenY[gy.index]) {
      const ghost = !!this.goldenHad[gy.index];
      if (gy.debugOnly) this.secretY = new MapPickup('goldenY', gy.x * TS + 8, gy.y * TS + 12, { index: gy.index, ghost });
      else if (!gy.fromSafe || st.safeOpen) this.pickups.push(new MapPickup('goldenY', gy.x * TS + 8, gy.y * TS + 12, { index: gy.index, ghost }));
    }
    // Terraza: Hezron en su bean bag
    if (R0.hezron && !st.hezron) this.hezronNpc = { x: R0.hezron.x * TS + 8, y: R0.hezron.y * TS + 12, t: 0 };
    else this.hezronNpc = null;
    // Jefe
    if (R0.boss) {
      if (st.bossBeaten) this.openGateDoor('E', false);
      else this.setupBoss();
    }
    if (R0.practice) {
      this.turret = new Turret(R0.turret.x * TS + 8, R0.turret.y * TS + 12);
      this.practice = { blocks: 0, parries: 0, done: st.practiceDone };
      if (st.practiceDone) this.openGateDoor('E', false);
    }
  }

  onRoomEnter(id) {
    const st = this.state;
    if (this.constructing) {
      this.pendingEnter = id;
      return;
    }
    if (id === 'practice' && !st.practiceIntroSeen && !st.practiceDone) {
      st.practiceIntroSeen = true;
      this.say(DIALOGUES.practiceIntro);
    }
    if (id === 'terrace' && st.hezron && !st.hezronJoined) this.showBanner(L3.vaporHint(this.game.input.keyName('shield')), '', null, 1.8);
  }

  setCheckpoint(id) {
    if (this.checkpointOff(id)) return;
    const st = this.state;
    st.checkpoint = id;
    st.bits = this.bits;
    st.goldenY = [...this.goldenY];
    if (this.session) {
      const d = structuredClone(this.session.data);
      d.checkpoint = { level: 3, id, state: structuredClone(st) };
      d.lastLevel = 3;
      this.session.update(d);
    }
    playSfx(this.game.audio, 'checkpoint');
    this.particles.burst(this.choco.footX, this.choco.footY - 8, 14, { speedMin: 20, speedMax: 60, colors: [UI.green, '#FFFFFF'], lifeMin: 0.3, lifeMax: 0.6 });
    this.toastMsg(`${L3.checkpoint} · ${L3.checkpointSub}`, UI.green);
  }

  // Abre la puerta de un costado ('E' / 'W'), quitando la 'G'
  openGateDoor(side, fx = true) {
    const d = this.room.doors.find((q) => q.side === side);
    if (!d) return;
    const m = this.map;
    const cells = side === 'E' ? [[m.w - 1, d.at], [m.w - 1, d.at + 1]] : side === 'W' ? [[0, d.at], [0, d.at + 1]] : side === 'N' ? [[d.at, 1], [d.at + 1, 1]] : [[d.at, m.h - 1], [d.at + 1, m.h - 1]];
    for (const [x, y] of cells) {
      m.setChar(x, y, '.');
      if (fx) this.particles.burst(x * TS + 8, y * TS + 8, 10, { speedMin: 20, speedMax: 70, colors: [UI.cyan, '#FFFFFF', '#5A6E8C'], lifeMin: 0.3, lifeMax: 0.6 });
    }
    if (fx) {
      playSfx(this.game.audio, 'gateOpen');
      this.game.effects.shake(0.2);
    }
  }

  closeGateDoor(side) {
    const d = this.room.doors.find((q) => q.side === side);
    if (!d) return;
    const m = this.map;
    const x = side === 'E' ? m.w - 1 : 0;
    m.setChar(x, d.at, 'G');
    m.setChar(x, d.at + 1, 'G');
    playSfx(this.game.audio, 'thud');
    this.game.effects.shake(0.25);
  }

  // ======================================================================
  // Mundo para los enemigos
  // ======================================================================
  isOpaque = (tx, ty) => OPAQUE_CHARS.has(this.map.charAt(tx, ty));
  passable = (tx, ty) => !this.map.isSolid(tx, ty);

  shotBlocked = (tx, ty) => this.map.isSolid(tx, ty) && !SHOT_PASS.has(this.map.charAt(tx, ty));

  pathTo(x0, y0, x1, y1) {
    const m = this.map;
    const g = nearestPassable(this.passable, m.w, m.h, Math.floor(x1 / TS), Math.floor(y1 / TS));
    if (!g) return null;
    const p = findPath(this.passable, m.w, m.h, Math.floor(x0 / TS), Math.floor(y0 / TS), g.tx, g.ty);
    if (!p) return null;
    const pts = p.map((q) => ({ x: q.tx * TS + 8, y: q.ty * TS + 12 }));
    // Último tramo: hasta el punto exacto si es caminable
    if (this.passable(Math.floor(x1 / TS), Math.floor(y1 / TS))) pts.push({ x: x1, y: Math.min(y1, Math.floor(y1 / TS) * TS + 13) });
    return pts;
  }

  chocoVisible() {
    const c = this.choco;
    if (c.state !== 'play' && c.state !== 'hack') return false;
    return !this.cutscene && !this.daily && !this.ending && !this.respawning && !(this.game.debug?.invincible);
  }

  world() {
    const c = this.choco;
    const w = (this._w ||= {
      isOpaque: this.isOpaque,
      passable: this.passable,
      target: {},
      path: (x0, y0, x1, y1) => this.pathTo(x0, y0, x1, y1),
      noticed: (e) => this.onNoticed(e),
      raiseAlarm: (e) => this.raiseAlarm(e),
      spotted: () => this.spotted(),
    });
    w.target.x = c.footX;
    w.target.y = c.eyeY;
    w.target.footX = c.footX;
    w.target.footY = c.footY;
    w.target.visible = this.chocoVisible();
    w.alarm = !!this.alarm;
    w.alarmPos = this.alarm?.pos || null;
    w.clouds = this.clouds.map((k) => k.blocker);
    w.map = this.map;
    return w;
  }

  onNoticed(e) {
    e.markT = 0;
    if (this.noticeCd <= 0) {
      playSfx(this.game.audio, 'suspicious');
      this.noticeCd = 0.6;
    }
  }

  raiseAlarm() {
    const c = this.choco;
    if (this.alarm) {
      this.spotted();
      return;
    }
    this.alarm = { t: STEALTH.ALARM_TIME, pos: { x: c.footX, y: c.footY }, flash: 0 };
    playSfx(this.game.audio, 'alert');
    playSfx(this.game.audio, 'alarm');
    this.game.audio.setLayer('alarm', true, 0.2);
    this.game.effects.shake(0.25);
    this.game.effects.flash('#E0343F', 3);
    c.surprise = 0.7;
    for (const b of this.bots) b.alert();
    for (const d of this.drones) d.alert();
    this.showBanner(L3.alarm, L3.alarmSub, null, 1.4);
  }

  spotted() {
    if (!this.alarm) return;
    this.alarm.t = STEALTH.ALARM_TIME;
    this.alarm.pos = { x: this.choco.footX, y: this.choco.footY };
  }

  endAlarm(silent = false) {
    if (!this.alarm) return;
    this.alarm = null;
    this.game.audio.setLayer('alarm', false, silent ? 0.1 : 0.8);
    if (silent) return;
    for (const b of this.bots) b.calm();
    for (const d of this.drones) d.calm();
    playSfx(this.game.audio, 'calm');
    this.toastMsg(L3.calm, UI.green);
  }

  // Ruido en (x, y): los bots dentro del radio van a revisar
  makeNoise(x, y, r, { show = true } = {}) {
    if (show) this.noises.push({ x, y, r, t: 0 });
    const w = this.world();
    for (const b of this.bots) if (Math.hypot(b.x - x, b.y - y) <= r) b.hear(x, y, w);
  }

  toastMsg(text, color = UI.text) {
    this.toast = { text, color, t: 0 };
  }

  // ======================================================================
  // Actualización
  // ======================================================================
  levelUpdate(dt) {
    const c = this.choco;
    const inp = this.game.input;
    if (this.noticeCd > 0) this.noticeCd -= dt;
    if (this.toast) {
      this.toast.t += dt;
      if (this.toast.t > 2.2) this.toast = null;
    }
    if (this.hezronNpc) this.hezronNpc.t += dt;
    const busy = !!this.cutscene || !!this.ending;
    const free = c.state === 'play' && !busy && !this.respawning;

    // Escondido: E para salir
    if (c.state === 'hidden' && !busy && inp.pressed('interact')) this.exitHide();
    // Hackeo en curso
    if (this.hack) this.updateHack(dt);
    // Vapor de Hezron / Escudo (C)
    if (free && inp.pressed('shield')) this.useShieldKey();

    // Mundo y enemigos
    const w = this.world();
    if (!this.cutscene) {
      for (const b of this.bots) b.update(dt, w);
      for (const k of this.cameras) k.update(dt, w);
      for (const d of this.drones) d.update(dt, w);
      for (const l of this.lasers) {
        const was = l.phase;
        l.update(dt);
        if (was !== 'on' && l.phase === 'on' && this.camera.isVisible(l.x - 4, l.y0, 8, l.y1 - l.y0, 0)) playSfx(this.game.audio, 'laserOn');
      }
      for (const v of this.vacuums) v.update(dt, this.map);
    }
    for (const k of this.clouds) k.update(dt, this);
    this.clouds = this.clouds.filter((k) => !k.dead);
    if (this.hezron) this.hezron.update(dt, c, c.state === 'hidden', this);
    for (const n of this.noises) n.t += dt;
    this.noises = this.noises.filter((n) => n.t < 0.6);

    // Alarma
    if (this.alarm && !this.cutscene) {
      this.alarm.t -= dt;
      if (this.alarm.t <= 0) this.endAlarm();
    }

    // Ruido de pasos cerca de los bots (caminar normal; Shift no hace ruido)
    if (free && c.moving && !c.sneaking) {
      this.runNoiseT -= dt;
      if (this.runNoiseT <= 0) {
        this.runNoiseT = STEALTH.NOISE_RUN_EVERY;
        const near = this.bots.some((b) => b.active && b.state !== 'chase' && Math.hypot(b.x - c.footX, b.y - c.footY) <= STEALTH.NOISE_RUN_RADIUS);
        if (near) this.makeNoise(c.footX, c.footY - 2, STEALTH.NOISE_RUN_RADIUS);
      }
    } else this.runNoiseT = 0;

    // Disparos
    for (const s of this.shots) {
      s.update(dt, this, this.shotBlocked);
      if (!s.dead) this.shotHits(s);
    }
    this.shots = this.shots.filter((s) => !s.dead);
    this.updateEnemyShots(dt);

    // Contacto con los peligros (también mientras hackea)
    if (!busy && !this.respawning) this.checkContacts();
    // Daily
    this.updateDaily(dt);
    // Pickups
    if (free) {
      for (const p of this.pickups) if (!p.dead && p.pop >= 1 && aabbOverlap(c.body, p.hitbox)) this.collect(p);
      this.pickups = this.pickups.filter((p) => !p.dead);
      if (this.secretY && this.laptop.active && aabbOverlap(c.body, this.secretY.hitbox)) {
        this.collect(this.secretY);
        this.secretY = null;
      }
    }
    if (this.secretY) this.secretY.update(dt);
    // Terraza: rescate de Hezron
    if (free && this.hezronNpc && Math.hypot(c.footX - this.hezronNpc.x, c.footY - this.hezronNpc.y) < 44) this.rescueHezron();
    // Jefe y práctica
    if (this.boss) this.updateBoss(dt);
    if (this.practice) this.updatePractice(dt);
    // Puertas
    if (free && !this.game.transitioning) this.checkDoors();
    // Terminales: se reactivan cuando termina su efecto
    for (const t of this.terms) if (t.busy > 0) t.busy -= dt;
  }

  checkDoors() {
    const c = this.choco;
    const m = this.map;
    for (const d of this.room.doors) {
      let inside = false;
      let gx;
      let gy;
      if (d.side === 'N') {
        inside = c.footY < TS + 6 && c.footX > d.at * TS && c.footX < (d.at + 2) * TS;
        [gx, gy] = [d.at, 1];
      } else if (d.side === 'S') {
        inside = c.footY > (m.h - 1) * TS + 6 && c.footX > d.at * TS && c.footX < (d.at + 2) * TS;
        [gx, gy] = [d.at, m.h - 1];
      } else if (d.side === 'W') {
        inside = c.footX < 8 && c.footY > d.at * TS && c.footY < (d.at + 2) * TS + 4;
        [gx, gy] = [0, d.at];
      } else {
        inside = c.footX > m.pxW - 8 && c.footY > d.at * TS && c.footY < (d.at + 2) * TS + 4;
        [gx, gy] = [m.w - 1, d.at];
      }
      if (!inside || m.charAt(gx, gy) === 'G') continue;
      if (d.to === 'exit') {
        this.finishLevel();
        return;
      }
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
      onMid: () => this.loadRoom(d.to, { entry: 'door', from }),
    });
  }

  collect(p) {
    p.dead = true;
    if (p.key) this.state.collected.push(p.key);
    this.particles.burst(p.x, p.y - 6, p.type === 'bit' ? 6 : 18, { speedMin: 20, speedMax: 70, colors: ['#FFFFFF', UI.yellow, UI.green], lifeMin: 0.2, lifeMax: 0.5 });
    if (p.type === 'bit') {
      playSfx(this.game.audio, 'bit');
      this.addBits(1);
    } else if (p.type === 'goldenY') this.gainGolden(p.index);
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

  // ---------- Contactos ----------
  checkContacts() {
    const c = this.choco;
    if (c.state !== 'play' && c.state !== 'hack') return;
    for (const b of this.bots) {
      if (b.active && c.grace <= 0 && aabbOverlap(c.body, b.hitbox)) {
        this.caught(b);
        return;
      }
    }
    for (const d of this.drones) {
      if (d.active && d.chasing && c.grace <= 0 && aabbOverlap(c.body, d.hitbox)) {
        this.caught(d);
        return;
      }
    }
    for (const l of this.lasers) {
      if (l.on && aabbOverlap(c.body, l.hitbox)) {
        if (c.hurt(l.x, c.eyeY)) {
          playSfx(this.game.audio, 'zap');
          this.particles.burst(l.x, c.eyeY, 12, { speedMin: 30, speedMax: 90, colors: ['#FF5A5A', '#FFFFFF'], lifeMin: 0.15, lifeMax: 0.35 });
          if (!this.alarm && c.hp > 0) this.raiseAlarm();
        }
      }
    }
    for (const v of this.vacuums) {
      if (v.bumpT <= 0 && aabbOverlap(c.body, v.hitbox)) {
        v.bumpT = 1.2;
        playSfx(this.game.audio, 'vacuumBump');
        const d = Math.hypot(c.footX - v.x, c.footY - v.y) || 1;
        c.body.vx = ((c.footX - v.x) / d) * STEALTH.VACUUM_PUSH;
        c.body.vy = ((c.footY - v.y) / d) * STEALTH.VACUUM_PUSH;
        c.hurtT = 0.15;
        this.makeNoise(v.x, v.y, STEALTH.NOISE_SHOT_RADIUS);
      }
    }
  }

  // Un BotSeg lo tocó: pierde un cuadrito y vuelve al inicio de la sección
  caught(bot) {
    const c = this.choco;
    if (!c.hurt(bot.x, bot.y - 6)) return;
    playSfx(this.game.audio, 'alert');
    if (c.hp <= 0) return; // onChocoDamaged se encarga
    this.respawning = true;
    const s = this;
    this.playCutscene(
      function* () {
        yield STEALTH.CONTACT_RESPAWN_DELAY;
      },
      {
        skippable: false,
        keepHud: true,
        bars: false,
        onEnd: () => {
          this.freezeChoco();
          this.game.startTransition({
            type: 'glitch',
            onMid: () => {
              s.respawning = false;
              const hp = c.hp;
              s.loadRoom(s.entry.id, { entry: s.entry.entry === 'checkpoint' ? 'checkpoint' : 'door', from: s.entry.from });
              s.state.vapor[s.room.id] = VAPOR.CHARGES; // la sección empieza de cero
              c.hp = hp;
              c.grace = 1;
              s.showBanner(L3.caught, L3.caughtSub, null, 1.4);
            },
          });
        },
      },
    );
  }

  onChocoDamaged(hp) {
    if (hp > 0) return;
    this.die();
  }

  die() {
    const c = this.choco;
    if (this.respawning) return;
    this.respawning = true;
    c.state = 'frozen';
    this.stopHack();
    playSfx(this.game.audio, 'melt');
    this.particles.burst(c.footX, c.footY - 6, 30, { speedMin: 20, speedMax: 90, colors: ['#5C3521', '#83522F', '#B07A4A', '#F4F1EA'], gravity: 120, lifeMin: 0.4, lifeMax: 0.9, size: 2, endSize: 1 });
    this.hideChoco = true;
    this.stats.deaths++;
    if (!this.game.infiniteLives) this.lives--;
    const s = this;
    this.playCutscene(
      function* () {
        yield 1.2;
      },
      {
        skippable: false,
        keepHud: true,
        bars: false,
        onEnd: () => {
          s.freezeChoco();
          if (s.lives <= 0) {
            s.game.flow.gameOver(s.game, s.levelId, { ...s.stats });
            return;
          }
          s.game.startTransition({
            type: 'glitch',
            onMid: () => {
              s.respawning = false;
              s.hideChoco = false;
              s.choco.hp = s.maxHp;
              s.loadRoom(s.state.checkpoint, { entry: 'checkpoint' });
              s.choco.grace = 1;
              s.showBanner(L3.lifeLost, L3.lifeLostSub, null, 1.6);
            },
          });
        },
      },
    );
  }

  restartFromCheckpoint() {
    this.game.startTransition({
      type: 'fade',
      onMid: () => {
        this.respawning = false;
        this.hideChoco = false;
        this.choco.hp = this.maxHp;
        this.loadRoom(this.state.checkpoint, { entry: 'checkpoint' });
      },
    });
  }

  // ---------- Escondites ----------
  enterHide(spot) {
    const c = this.choco;
    // Se mete en el escondite (sale por donde entró)
    this.hideReturn = { x: c.footX, y: c.footY, dir: c.dir };
    c.placeAt(spot.tx * TS + 8, spot.ty * TS + 12, c.dir);
    c.state = 'hidden';
    this.hidingSpot = spot;
    playSfx(this.game.audio, 'doorOpen');
    this.particles.burst(spot.tx * TS + 8, spot.ty * TS + 10, 6, { speedMin: 10, speedMax: 30, colors: ['#8FB3D9', '#5A6E8C'], lifeMin: 0.2, lifeMax: 0.4 });
  }

  exitHide() {
    const c = this.choco;
    const r = this.hideReturn;
    if (r) c.placeAt(r.x, r.y, r.dir);
    c.state = 'play';
    c.interactT = 0.2;
    this.hidingSpot = null;
    this.interactLock = 0.2; // que la misma E no lo vuelva a esconder
    playSfx(this.game.audio, 'doorOpen');
  }

  updateInteractables(dt) {
    if (this.interactLock > 0) {
      this.interactLock -= dt;
      return;
    }
    super.updateInteractables(dt);
  }

  onHackInterrupted() {
    this.hack = null;
  }

  // ---------- Café ----------
  drinkCoffee() {
    const c = this.choco;
    const st = this.state;
    if (st.coffeeUsed) return this.say(DIALOGUES.coffeeEmpty);
    if (c.hp >= this.maxHp) return this.say(DIALOGUES.coffeeFull);
    st.coffeeUsed = true;
    c.hp = Math.min(this.maxHp, c.hp + 1);
    playSfx(this.game.audio, 'eat');
    playSfx(this.game.audio, 'heal');
    this.particles.burst(c.footX, c.footY - 10, 12, { speedMin: 10, speedMax: 40, angle: -Math.PI / 2, spread: 1.4, colors: ['#FFFFFF', '#C8B8A0'], lifeMin: 0.4, lifeMax: 0.8 });
    this.say(DIALOGUES.coffee);
  }

  // ---------- Daily ----------
  updateDaily(dt) {
    const d = this.room.daily;
    const c = this.choco;
    if (!d) return;
    const tx = c.footX / TS;
    const ty = (c.footY - 4) / TS;
    const inside = tx >= d.x0 && tx <= d.x1 + 1 && ty >= d.y0 && ty <= d.y1 + 1;
    if (this.daily) {
      this.daily.t += dt;
      if (this.daily.t >= 3) {
        this.daily = null;
        c.state = 'play';
        if (!this.state.dailySeen) {
          this.state.dailySeen = true;
          this.say(DIALOGUES.dailyAfter);
        }
      }
      return;
    }
    if (inside && !this.inDaily && c.state === 'play' && !this.cutscene) {
      this.daily = { t: 0 };
      this.freezeChoco();
      c.dir = 'right';
      playSfx(this.game.audio, 'notif');
      for (const n of this.npcs) n.talking = 3;
    }
    this.inDaily = inside;
  }

  // ---------- Hezron ----------
  rescueHezron() {
    const s = this;
    const npc = this.hezronNpc;
    this.playCutscene(
      function* (cs) {
        s.choco.surprise = 0.6;
        s.cameraFocus = { x: npc.x + 20, y: npc.y };
        yield 0.6;
        yield cs.say(DIALOGUES.hezronRescue);
        s.cameraFocus = null;
        s.joinHezron();
        yield 0.3;
        s.hezron.say(L3.flavors[0]);
        yield 0.4;
      },
      {
        onSkip: () => {
          s.cameraFocus = null;
          if (!s.state.hezron) s.joinHezron();
        },
        onEnd: () => this.showBanner(L3.vaporHint(this.game.input.keyName('shield')), '', null, 2.2),
      },
    );
  }

  joinHezron() {
    const npc = this.hezronNpc;
    this.state.hezron = true;
    this.state.vapor[this.room.id] = VAPOR.CHARGES;
    this.hezron = new HezronFollower(npc ? npc.x : this.choco.footX - 10, npc ? npc.y : this.choco.footY);
    this.hezronNpc = null;
    playSfx(this.game.audio, 'join');
    this.game.effects.flash(ACCENTS.hezron, 2);
  }

  useShieldKey() {
    const c = this.choco;
    if (this.state.shieldGot && c.items.shield) {
      c.activateShield();
      return;
    }
    if (!this.hezronActive || !this.hezron) return;
    const id = this.room.id;
    const left = this.state.vapor[id] ?? 0;
    if (left <= 0) {
      this.hezron.say(L3.vaporEmpty.replace(/^Hezron: /, '').replace(/"/g, ''));
      playSfx(this.game.audio, 'denied');
      return;
    }
    this.state.vapor[id] = left - 1;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[c.dir];
    let tx = c.footX + d[0] * VAPOR.THROW_DIST;
    let ty = c.footY + d[1] * VAPOR.THROW_DIST;
    // No meter la nube dentro de una pared
    if (this.map.isSolid(Math.floor(tx / TS), Math.floor((ty - 4) / TS))) {
      tx = c.footX;
      ty = c.footY;
    }
    this.clouds.push(new VaporCloud(this.hezron.x, this.hezron.y - 10, tx, ty));
    this.flavorIdx = ((this.flavorIdx ?? 0) + 1) % L3.flavors.length;
    this.hezron.say(L3.flavors[this.flavorIdx]);
    playSfx(this.game.audio, 'vapor');
  }

  // ---------- Terminales y hackeo ----------
  useTerminal(term) {
    const def = term.def;
    if (term.used) {
      this.toastMsg(L3.hack.done, UI.textDim);
      return;
    }
    if (term.busy > 0) {
      this.toastMsg(L3.effects[def.effect], UI.cyan);
      return;
    }
    if (def.tutorial && !this.state.hackTutorialSeen) {
      this.state.hackTutorialSeen = true;
      this.say(DIALOGUES.hackTutorial, () => this.startHack(term));
      return;
    }
    this.startHack(term);
  }

  startHack(term, { boss = null } = {}) {
    const c = this.choco;
    const cfg = HACK[term.def?.cfg || (boss !== null ? 'BOSS' : 'NORMAL')];
    this.hack = { term, boss, h: createHack(cfg, this.rng), appear: 0, t: 0, end: null };
    c.state = 'hack';
    c.dir = 'up';
    c.interactT = 0.3;
    playSfx(this.game.audio, 'hackOpen');
  }

  stopHack() {
    if (!this.hack) return;
    this.hack = null;
    if (this.choco.state === 'hack') this.choco.state = 'play';
  }

  updateHack(dt) {
    const hk = this.hack;
    const inp = this.game.input;
    const a = this.game.audio;
    hk.t += dt;
    hk.appear = Math.min(1, hk.appear + dt * 6);
    if (hk.end) {
      hk.end.t += dt;
      if (hk.end.t > 0.45) this.stopHack();
      return;
    }
    if (this.choco.state !== 'hack') {
      this.stopHack();
      return;
    }
    if (inp.pressed('shoot')) {
      playSfx(a, 'menuCancel');
      this.stopHack();
      return;
    }
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (!inp.pressed(dir)) continue;
      const r = hackInput(hk.h, dir);
      if (r === 'ok') playSfx(a, 'hackKey');
      else if (r === 'error') {
        playSfx(a, 'hackError');
        this.game.effects.shake(0.1);
      } else if (r === 'done') {
        playSfx(a, 'hackOk');
        hk.end = { t: 0, ok: true };
        this.hackSucceeded(hk);
      } else if (r === 'fail') {
        playSfx(a, 'buzzer');
        hk.end = { t: 0, ok: false };
        this.hackFailed(hk);
      }
      break;
    }
    if (!hk.end && hackUpdate(hk.h, dt) === 'timeout') {
      playSfx(a, 'denied');
      hk.end = { t: 0, ok: false };
      this.toastMsg(L3.hack.timeout, UI.red);
    }
  }

  hackSucceeded(hk) {
    if (hk.boss !== null) {
      this.bossHacked(hk.boss);
      return;
    }
    const term = hk.term;
    const def = term.def;
    const ids = (def.target || '').split(',');
    if (def.effect === 'cameraOff') {
      for (const k of this.cameras) if (ids.includes(k.id)) k.turnOff(STEALTH.CAMERA_HACK_OFF);
      term.busy = STEALTH.CAMERA_HACK_OFF;
    } else if (def.effect === 'lasersOff') {
      for (const l of this.lasers) if (ids.includes(l.id)) l.turnOff(STEALTH.LASER_HACK_OFF);
      term.busy = STEALTH.LASER_HACK_OFF;
    } else if (def.effect === 'route') {
      for (const b of this.bots) if (ids.includes(b.id)) b.divert();
      this.state.diverted.push(...ids);
      term.used = true;
    } else if (def.effect === 'safe') {
      term.used = true;
      this.openSafe();
    }
    this.toastMsg(L3.effects[def.effect], UI.cyan);
    this.particles.burst(term.x, term.y - 12, 10, { speedMin: 20, speedMax: 60, colors: [UI.cyan, '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
  }

  hackFailed(hk) {
    this.toastMsg(L3.hack.fail, UI.red);
    if (hk.boss !== null) {
      deadlineHackFailed(this.boss.logic, hk.boss);
      return;
    }
    this.raiseAlarm();
  }

  openSafe() {
    const st = this.state;
    st.safeOpen = true;
    const g = this.room.golden;
    const s = this;
    this.playCutscene(
      function* (cs) {
        playSfx(s.game.audio, 'doorOpen');
        s.game.effects.shake(0.2);
        yield 0.4;
        if (!s.goldenY[g.index]) {
          s.pickups.push(new MapPickup('goldenY', g.x * TS + 8, g.y * TS + 12, { index: g.index, ghost: !!s.goldenHad[g.index], pop: true }));
          playSfx(s.game.audio, 'cacao');
        }
        yield 0.5;
        yield cs.say(DIALOGUES.safeOpen);
      },
      { keepHud: true, bars: false },
    );
  }

  // ---------- Disparos ----------
  countShots(charged) {
    let n = 0;
    for (const s of this.shots) if (!s.dead && s.charged === charged) n++;
    return n;
  }

  spawnShot(x, y, dx, dy, charged) {
    this.shots.push(new TopdownShot(x, y, dx, dy, charged));
  }

  // Disparar hace ruido (riesgo-recompensa)
  onChocoShot() {
    if (this.room.boss || this.room.practice) return;
    this.makeNoise(this.choco.footX, this.choco.footY, STEALTH.NOISE_SHOT_RADIUS);
  }

  shotHits(s) {
    const box = s.box;
    const hitEnemy = (e, box2, stunTime) => {
      if (s.hit.has(e) || !aabbOverlap(box, box2)) return false;
      s.hit.add(e);
      if (e.active) {
        e.stunFor(stunTime);
        playSfx(this.game.audio, 'stun');
        this.particles.burst(s.x, s.y, 10, { speedMin: 30, speedMax: 90, colors: ['#FFFFFF', '#43D9FF', '#FFD23F'], lifeMin: 0.15, lifeMax: 0.35 });
        this.game.effects.hitstop(2);
      }
      if (!s.charged) s.kill(this, false);
      return true;
    };
    for (const b of this.bots) if (hitEnemy(b, b.shotBox, STEALTH.STUN_BOT)) if (s.dead) return;
    for (const k of this.cameras) if (hitEnemy(k, k.shotBox, STEALTH.STUN_CAMERA)) if (s.dead) return;
    for (const d of this.drones) if (hitEnemy(d, d.shotBox, STEALTH.STUN_DRONE)) if (s.dead) return;
    // Notificaciones del jefe: se pueden reventar
    for (const e of this.eshots) {
      if (e.dead || e.kind !== 'notif') continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.size / 2 + 1) {
        e.pop(this);
        playSfx(this.game.audio, 'enemyHit');
        if (!s.charged) {
          s.kill(this, false);
          return;
        }
      }
    }
    if (this.boss && !this.boss.logic.defeated && this.boss.started) this.shotHitsBoss(s);
  }

  // ---------- Proyectiles enemigos ----------
  updateEnemyShots(dt) {
    const c = this.choco;
    const target = { x: c.footX, y: c.eyeY };
    for (const e of this.eshots) {
      e.update(dt, this, target, (tx, ty) => this.map.isSolid(tx, ty) && !SHOT_PASS.has(this.map.charAt(tx, ty)));
      if (e.dead) continue;
      // Las nubes confunden a las notificaciones
      if (e.kind === 'notif' && !e.lost) {
        for (const k of this.clouds) {
          const b = k.blocker;
          if (Math.hypot(e.x - b.x, e.y - b.y) < b.r) {
            e.lost = true;
            e.life = Math.min(e.life, 0.9);
            e.vx *= 0.5;
            e.vy *= 0.5;
          }
        }
      }
      // Reflejadas: golpean a su origen
      if (e.reflected) {
        if (this.turret && Math.hypot(e.x - this.turret.x, e.y - (this.turret.y - 8)) < 9) {
          e.pop(this);
          this.turret.hitFlash = 0.2;
          playSfx(this.game.audio, 'enemyHit');
        }
        continue;
      }
      // Golpe a Choco
      if (c.state !== 'play' && c.state !== 'hack') continue;
      const dist = Math.hypot(e.x - c.footX, e.y - c.eyeY);
      const shieldUp = c.shield.active > 0;
      if (dist < e.r + (shieldUp ? SHIELD.RADIUS - 2 : 5)) this.shotHitsChoco(e);
    }
    this.eshots = this.eshots.filter((e) => !e.dead);
  }

  shotHitsChoco(e) {
    const c = this.choco;
    const res = shieldBlock(c.shield);
    const a = this.game.audio;
    if (res === 'parry') {
      const to = e.kind === 'turret' && this.turret ? { x: this.turret.x, y: this.turret.y - 8 } : this.boss ? { x: this.boss.x, y: this.boss.y } : { x: e.x - e.vx, y: e.y - e.vy };
      e.reflect(to.x, to.y, SHIELD.REFLECT_SPEED_MULT);
      c.parryFlash = 1;
      playSfx(a, 'parry');
      this.game.effects.hitstop(SHIELD.PARRY_HITSTOP);
      this.game.effects.flash('#FFFFFF', 2);
      this.particles.burst(e.x, e.y, 16, { speedMin: 40, speedMax: 120, colors: ['#FFFFFF', '#8AE8FF'], lifeMin: 0.15, lifeMax: 0.4 });
      this.popText(L3.practice.parryText, e.x, e.y - 8, '#FFFFFF');
      if (this.practice && !this.practice.done) this.practice.parries++;
      if (this.practice && !this.practice.done) this.practice.blocks++;
      return;
    }
    if (res === 'block') {
      e.pop(this);
      playSfx(a, 'shieldBlock');
      this.particles.burst(e.x, e.y, 8, { speedMin: 30, speedMax: 80, colors: ['#8AE8FF', '#43D9FF'], lifeMin: 0.1, lifeMax: 0.3 });
      this.popText(L3.practice.blockText, e.x, e.y - 8, UI.cyan);
      if (this.practice && !this.practice.done) this.practice.blocks++;
      return;
    }
    const harmless = e.kind === 'turret';
    if (c.hurt(e.x, e.y, { harmless })) e.pop(this);
  }

  popText(text, x, y, color) {
    (this.popTexts ||= []).push({ text, x, y, color, t: 0 });
  }

  // ======================================================================
  // Jefe: DEADLINE
  // ======================================================================
  setupBoss() {
    const ctr = ARENA.center;
    this.boss = {
      logic: createDeadline(),
      x: ctr.x * TS,
      y: ctr.y * TS,
      t: 0,
      started: false,
      appear: 0,
      attack: null,
      idle: 1.6,
      minute: -Math.PI / 2,
      hour: Math.PI * 0.3,
      hurt: 0,
      open: 0,
      broken: 0,
      tickT: 0,
      tock: false,
      late: false,
      terms: ARENA.terminals.map(([tx, ty], i) => this.makeBossTerminal(i, tx, ty)),
    };
  }

  makeBossTerminal(i, tx, ty) {
    const term = { i, tx, ty, def: { cfg: 'BOSS' }, glitch: 0 };
    const p = this.bossTermPoint(tx, ty);
    term.it = this.addInteractable({ x: p.x, y: p.y, range: 16, hintH: 24, onUse: () => this.useBossTerminal(term) });
    return term;
  }

  bossTermPoint(tx, ty) {
    // Se hackea desde el lado que mira al centro de la arena
    const cx = ARENA.center.x;
    const cy = ARENA.center.y;
    const dx = Math.abs(tx - cx) > Math.abs(ty - cy) ? Math.sign(cx - tx) : 0;
    const dy = dx ? 0 : Math.sign(cy - ty) || 1;
    return { x: tx * TS + 8 + dx * 12, y: ty * TS + 8 + dy * 12 + (dy === 0 ? 4 : 0) };
  }

  obstacles() {
    const out = super.obstacles();
    if (this.boss && !this.boss.logic.defeated) for (const t of this.boss.terms) out.push({ x: t.tx * TS + 1, y: t.ty * TS + 2, w: 14, h: 13 });
    if (this.turret) out.push({ x: this.turret.x - 7, y: this.turret.y - 8, w: 14, h: 8 });
    return out;
  }

  startBoss() {
    const b = this.boss;
    const s = this;
    const g = this.game;
    this.closeGateDoor('W');
    g.audio.stopMusic(0.4);
    this.playCutscene(
      function* (cs) {
        s.cameraFocus = { x: b.x, y: b.y + 10 };
        yield 0.5;
        // El reloj se arma con píxeles
        b.appearing = true;
        playSfx(g.audio, 'glitch');
        yield cs.until(() => b.appear >= 1);
        playSfx(g.audio, 'bossLand');
        g.effects.shake(0.4);
        yield 0.4;
        yield cs.say(DIALOGUES.deadlineIntro);
        s.showBanner(L3.boss.name, L3.boss.sub, null, 1.8);
        yield 1.9;
        s.cameraFocus = null;
      },
      {
        onSkip: () => {
          b.appear = 1;
          s.cameraFocus = null;
        },
        onEnd: () => {
          b.started = true;
          b.appear = 1;
          g.audio.playSong(SONG_DEADLINE);
          s.showBanner(L3.boss.hint, L3.boss.hintSub, null, 2.6);
        },
      },
    );
  }

  useBossTerminal(term) {
    const b = this.boss;
    if (!b.started || b.logic.defeated) return;
    const tm = b.logic.terminals[term.i];
    if (tm.state === 'done') return this.toastMsg(L3.hack.done, UI.textDim);
    if (tm.state === 'locked') return this.toastMsg(L3.hack.locked, UI.red);
    if (!canHack(b.logic, term.i)) return this.toastMsg(tm.state === 'reboot' ? `${Math.ceil(tm.t)}...` : L3.boss.frozen, UI.cyan);
    this.startHack(term, { boss: term.i });
  }

  bossHacked(i) {
    const b = this.boss;
    if (!deadlineHacked(b.logic, i)) return;
    b.attack = null;
    playSfx(this.game.audio, 'freeze');
    this.game.effects.flash('#BFE6F5', 3);
    this.showBanner(L3.boss.frozen, '', null, 1.0);
  }

  updateBoss(dt) {
    const b = this.boss;
    const c = this.choco;
    const g = this.game;
    b.t += dt;
    if (b.appearing && b.appear < 1) b.appear = Math.min(1, b.appear + dt * 0.8);
    if (b.hurt > 0) b.hurt -= dt;
    for (const t of b.terms) if (t.glitch > 0) t.glitch -= dt;
    if (!b.started && !this.cutscene && c.footX > ARENA.lockX * TS + 8) {
      this.startBoss();
      return;
    }
    if (b.logic.defeated) {
      if (b.falling) b.broken = Math.min(1, b.broken + dt * 0.9);
      return;
    }
    if (!b.started || this.cutscene) return;
    const L = b.logic;
    // Reloj y eventos
    for (const ev of deadlineTick(L, dt)) {
      if (ev === 'expired') this.deadlineExpired();
      else if (ev === 'thaw') {
        playSfx(g.audio, 'thud');
        b.idle = 0.8;
      }
    }
    b.open = L.frozen > 0 ? Math.min(1, b.open + dt * 3) : Math.max(0, b.open - dt * 3);
    // Tic-tac que se acelera
    if (L.frozen <= 0) {
      b.tickT -= dt;
      const rate = (1 + L.third * 0.45) * (L.countdown < 30 ? 1.6 : 1) * (b.attack?.kind === 'sweep' && b.attack.stage === 'tele' ? 3 : 1);
      if (b.tickT <= 0) {
        b.tickT = 0.5 / rate;
        b.tock = !b.tock;
        playSfx(g.audio, b.tock ? 'tock' : 'tick');
      }
      // Las manecillas avanzan (salvo durante el barrido, que mueve el minutero)
      if (!(b.attack?.kind === 'sweep' && b.attack.stage === 'go')) b.minute += dt * (0.5 + L.third * 0.2);
      b.hour += dt * 0.05;
    }
    // Último tercio: las terminales se reubican
    if (L.third === 2 && !b.late) {
      b.late = true;
      this.relocateTerminals();
    }
    // Ataques
    if (L.frozen > 0) return;
    if (!b.attack) {
      b.idle -= dt;
      if (b.idle <= 0) b.attack = { kind: nextAttack(L), t: 0, stage: 'tele', fired: 0 };
      return;
    }
    this.updateAttack(dt);
  }

  updateAttack(dt) {
    const b = this.boss;
    const L = b.logic;
    const a = b.attack;
    const c = this.choco;
    const au = this.game.audio;
    a.t += dt;
    const third = Math.min(2, L.third);
    const aimAt = () => Math.atan2(c.eyeY - b.y, c.footX - b.x);
    if (a.kind === 'fan') {
      if (a.stage === 'tele') {
        if (a.t === dt) playSfx(au, 'windup');
        if (a.t >= DEADLINE.FAN_TELEGRAPH) {
          a.stage = 'go';
          a.t = 0;
        }
      } else {
        const counts = DEADLINE.FAN_COUNTS[third];
        const times = [0, DEADLINE.FAN_GAP];
        while (a.fired < counts.length && a.t >= times[a.fired]) {
          this.fireFan(counts[a.fired], DEADLINE.FAN_SPREAD[third], aimAt());
          a.fired++;
        }
        if (a.fired >= counts.length && a.t >= DEADLINE.FAN_GAP + 0.3) this.endAttack();
      }
    } else if (a.kind === 'sweep') {
      if (a.stage === 'tele') {
        if (a.t >= DEADLINE.SWEEP_TELEGRAPH) {
          a.stage = 'go';
          a.t = 0;
          a.dir = this.rng.chance(0.5) ? 1 : -1;
          a.start = b.minute;
          a.prev = b.minute;
          playSfx(au, 'scrape');
        }
      } else {
        const dur = DEADLINE.SWEEP_TIME[third];
        const p = Math.min(1, a.t / dur);
        b.minute = a.start + a.dir * Math.PI * 2 * Ease.inOutQuad(p);
        this.sweepHit(a.prev, b.minute);
        a.prev = b.minute;
        if (p >= 1) this.endAttack();
      }
    } else if (a.kind === 'notif') {
      if (a.stage === 'tele') {
        if (a.t >= DEADLINE.NOTIF_TELEGRAPH) {
          a.stage = 'go';
          const base = aimAt();
          for (let i = 0; i < DEADLINE.NOTIF_COUNT; i++) {
            const ang = base + (i - 1) * 0.9;
            this.eshots.push(new EnemyShot(b.x + Math.cos(ang) * 14, b.y + Math.sin(ang) * 14, Math.cos(ang) * DEADLINE.NOTIF_SPEED, Math.sin(ang) * DEADLINE.NOTIF_SPEED, 'notif', { life: DEADLINE.NOTIF_LIFE, homing: true }));
          }
          playSfx(au, 'notif');
          this.endAttack(0.6);
        }
      }
    }
  }

  endAttack(extra = 0) {
    const b = this.boss;
    b.attack = null;
    b.idle = DEADLINE.IDLE[Math.min(2, b.logic.third)] + extra;
  }

  fireFan(n, spread, center) {
    const b = this.boss;
    for (let i = 0; i < n; i++) {
      const ang = center - spread / 2 + (n === 1 ? spread / 2 : (spread * i) / (n - 1));
      this.eshots.push(new EnemyShot(b.x + Math.cos(ang) * 16, b.y + Math.sin(ang) * 16, Math.cos(ang) * DEADLINE.FAN_SPEED, Math.sin(ang) * DEADLINE.FAN_SPEED, 'envelope'));
    }
    playSfx(this.game.audio, 'envelope');
    this.game.effects.shake(0.1);
  }

  // El minutero barre la arena: pega si cruzó el ángulo de Choco y nada lo tapaba
  sweepHit(a0, a1) {
    const b = this.boss;
    const c = this.choco;
    if (c.state !== 'play' && c.state !== 'hack') return;
    const ang = Math.atan2(c.eyeY - b.y, c.footX - b.x);
    const d0 = angleDiff(ang, a0);
    const d1 = angleDiff(ang, a1);
    const crossed = Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) < 1 && Math.abs(d1) < 1;
    const near = Math.abs(d1) * Math.hypot(c.footX - b.x, c.eyeY - b.y) < DEADLINE.SWEEP_HIT;
    if (!crossed && !near) return;
    const dist = Math.hypot(c.footX - b.x, c.eyeY - b.y);
    const reach = castRay(this.isOpaque, b.x, b.y, ang, 420);
    if (dist > reach) return; // detrás de una columna
    if (c.shield.active > 0) {
      shieldBlock(c.shield);
      playSfx(this.game.audio, 'shieldBlock');
      return;
    }
    c.hurt(b.x, b.y);
  }

  deadlineExpired() {
    const c = this.choco;
    playSfx(this.game.audio, 'expired');
    this.game.effects.flash('#E0343F', 4);
    this.showBanner(L3.boss.expired, L3.boss.expiredSub, null, 1.8);
    c.invuln = 0;
    c.grace = 0;
    c.hurt(c.footX, c.eyeY - 10, { knock: 40 });
  }

  relocateTerminals() {
    const b = this.boss;
    playSfx(this.game.audio, 'glitch');
    this.game.effects.glitch(0.3, 0.6);
    b.terms.forEach((t, i) => {
      if (b.logic.terminals[i].state === 'done') return;
      this.particles.burst(t.tx * TS + 8, t.ty * TS + 8, 14, { speedMin: 30, speedMax: 90, colors: ['#FF2E88', '#43D9FF', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
      const [tx, ty] = ARENA.terminalsLate[i];
      t.tx = tx;
      t.ty = ty;
      t.glitch = 0.6;
      const p = this.bossTermPoint(tx, ty);
      t.it.x = p.x;
      t.it.y = p.y;
      this.particles.burst(tx * TS + 8, ty * TS + 8, 14, { speedMin: 30, speedMax: 90, colors: ['#FF2E88', '#43D9FF', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
    });
    // Si Choco quedó encima de una terminal, se corre
    const c = this.choco;
    for (const r of this.obstacles()) {
      if (aabbOverlap(c.body, r)) c.placeAt(c.footX, r.y + r.h + 9, c.dir);
    }
  }

  shotHitsBoss(s) {
    const b = this.boss;
    const L = b.logic;
    if (L.frozen > 0) {
      const coreY = b.y + 6 + 3 - 10;
      if (Math.hypot(s.x - b.x, s.y - coreY) > DEADLINE.CORE_R + s.size / 2 + 2) return;
      const out = deadlineDamage(L, s.damage);
      s.kill(this, false);
      if (out.dealt > 0) {
        b.hurt = 0.1;
        playSfx(this.game.audio, 'bossHurt');
        this.game.effects.hitstop(s.charged ? 5 : 2);
        this.particles.burst(b.x, coreY, s.charged ? 16 : 6, { speedMin: 30, speedMax: 100, colors: ['#E0343F', '#FF9A9A', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
      }
      if (out.defeated) this.defeatBoss();
      else if (out.thirdDone) {
        playSfx(this.game.audio, 'bossDie');
        this.game.effects.shake(0.4);
        this.game.effects.flash('#FFFFFF', 3);
        b.idle = 1.4;
      }
      return;
    }
    // Pantalla cerrada: rebota
    if (Math.hypot(s.x - b.x, s.y - (b.y - 10)) < DEADLINE_R + 2) {
      s.kill(this, true);
      playSfx(this.game.audio, 'tink');
    }
  }

  defeatBoss() {
    const b = this.boss;
    const s = this;
    const g = this.game;
    const c = this.choco;
    this.stopHack();
    this.eshots = [];
    b.attack = null;
    this.state.bossBeaten = true;
    g.audio.stopMusic(0.3);
    this.playCutscene(
      function* (cs) {
        s.cameraFocus = { x: b.x, y: b.y };
        g.effects.hitstop(10);
        g.effects.flash('#FFFFFF', 6);
        yield 0.6;
        // Las manecillas se caen; la pantalla dice SIN FECHA DE ENTREGA
        b.falling = true;
        b.noDate = true;
        playSfx(g.audio, 'clockBreak');
        g.effects.shake(0.6);
        yield 1.4;
        s.showBanner(L3.boss.noDate, '', null, 1.6);
        yield 1.4;
        // El reloj se desarma en piezas
        b.gone = true;
        playSfx(g.audio, 'bossDie');
        for (let i = 0; i < 4; i++) s.particles.burst(b.x + R.range(-20, 20), b.y - 10 + R.range(-20, 20), 16, { speedMin: 40, speedMax: 140, colors: ['#E6DFCF', '#3A3A4E', '#1A1A26', '#FF2E88'], gravity: 160, lifeMin: 0.5, lifeMax: 1.1, size: 2, endSize: 1 });
        g.effects.shake(0.5);
        yield 1;
        // Hezron: "Tranqui. Ya no hay prisa."
        s.cameraFocus = null;
        if (s.hezron) s.hezron.say(L3.flavors[1]);
        yield cs.say(DIALOGUES.deadlineDefeat);
        // Se vuelve luz lila y se une a la barra
        s.hudInCutscene = true;
        s.hud.visible = true;
        const hz = s.hezron || { x: c.footX - 12, y: c.footY };
        s.hezronLight = { x: hz.x, y: hz.y - 12, t: 0, fly: 0 };
        s.hezron = null;
        playSfx(g.audio, 'squareIn');
        yield cs.until(() => s.hezronLight.t >= 1);
        yield cs.until(() => s.hezronLight.fly >= 1);
        s.hezronLight = null;
        playSfx(g.audio, 'join');
        g.effects.flash(ACCENTS.hezron, 4);
        s.particles.burst(c.footX, c.footY - 8, 30, { speedMin: 30, speedMax: 110, colors: [ACCENTS.hezron, '#FFFFFF', '#D8C8FF'], lifeMin: 0.3, lifeMax: 0.8 });
        s.joinBar();
        yield 1.2;
        s.hudInCutscene = false;
        // Escudo Firewall
        c.items.shield = true;
        s.state.shieldGot = true;
        yield cs.push(new ItemGetScene(g, 'shield'));
        yield 0.3;
        yield cs.say(DIALOGUES.hezronShield);
        s.openGateDoor('E');
        s.setCheckpoint('servers');
      },
      {
        keepHud: true,
        onSkip: () => {
          b.gone = true;
          b.falling = true;
          s.cameraFocus = null;
          s.hezronLight = null;
          s.hezron = null;
          if (!s.state.hezronJoined) s.joinBar();
          c.items.shield = true;
          s.state.shieldGot = true;
          s.openGateDoor('E', false);
          s.setCheckpoint('servers');
        },
        onEnd: () => g.audio.playSong(SONG_NOVACOMP),
      },
    );
  }

  joinBar() {
    this.state.hezronJoined = true;
    this.maxHp = Math.min(HEALTH.MAX_POSSIBLE, this.maxHp + 1);
    this.choco.hp = this.maxHp;
  }

  // ======================================================================
  // Sala de práctica del escudo
  // ======================================================================
  updatePractice(dt) {
    const P = this.practice;
    const t = this.turret;
    const c = this.choco;
    if (this.cutscene) return;
    if (!P.done && t.update(dt)) {
      const ang = Math.atan2(c.eyeY - (t.y - 8), c.footX - (t.x - 8));
      this.eshots.push(new EnemyShot(t.x - 10, t.y - 8, Math.cos(ang) * TURRET.SPEED, Math.sin(ang) * TURRET.SPEED, 'turret', { life: 4 }));
      playSfx(this.game.audio, 'turretShot');
    }
    if (!P.done && P.blocks >= TURRET.BLOCKS_NEEDED && P.parries >= TURRET.PARRIES_NEEDED) {
      P.done = true;
      this.state.practiceDone = true;
      this.eshots = [];
      playSfx(this.game.audio, 'victory');
      this.showBanner(L3.practice.done, L3.practice.exit, null, 2);
      this.openGateDoor('E');
      this.say(DIALOGUES.practiceDone);
    }
  }

  // ======================================================================
  // HUD
  // ======================================================================
  hudState() {
    const s = super.hudState();
    const c = this.choco;
    s.hp = Math.max(0, c.hp);
    s.shield = c.items.shield ? { cooldown01: shieldCharge01(c.shield), active: c.shield.active > 0 } : null;
    s.vapor = this.hezronActive ? { charges: this.state.vapor[this.room.id] ?? 0, max: VAPOR.CHARGES } : null;
    const b = this.boss;
    if (b && b.started && !b.logic.defeated) {
      s.deadline = b.logic.countdown;
      s.boss = { name: L3.boss.name, hp01: b.logic.hp / deadlineMaxHp(), segments: DEADLINE.THIRDS };
    }
    return s;
  }

  drawUi(ctx) {
    const a = this.hud.alpha;
    // Estado de Choco abajo a la derecha
    const c = this.choco;
    if (a > 0) {
      ctx.globalAlpha = a;
      let label = null;
      if (c.state === 'hidden') label = { t: `${L3.hidden} · ${this.game.input.keyName('interact')}`, col: UI.cyan };
      else if (c.sneaking) label = { t: 'SIGILO', col: '#8FB3D9' };
      if (label) drawText(ctx, label.t, SCREEN.W - 4, SCREEN.H - 11, { align: 'right', color: label.col });
      // Alarma: barra con el tiempo que queda
      if (this.alarm && !this.boss?.started) {
        const w = 70;
        const x = Math.round((SCREEN.W - w) / 2);
        const blink = Math.floor(this.t * 4) % 2;
        ctx.fillStyle = 'rgba(7,7,12,0.7)';
        ctx.fillRect(x - 3, 3, w + 6, 16);
        drawText(ctx, L3.alarm, SCREEN.W / 2, 4, { align: 'center', color: blink ? UI.red : '#FF8A8A' });
        ctx.fillStyle = '#3A1A1A';
        ctx.fillRect(x, 13, w, 3);
        ctx.fillStyle = UI.red;
        ctx.fillRect(x, 13, Math.round((w * this.alarm.t) / STEALTH.ALARM_TIME), 3);
      }
      // Práctica: objetivo actual
      const P = this.practice;
      if (P && !P.done) {
        const txt = P.blocks < TURRET.BLOCKS_NEEDED ? L3.practice.block(this.game.input.keyName('shield'), P.blocks, TURRET.BLOCKS_NEEDED) : L3.practice.parry(P.parries, TURRET.PARRIES_NEEDED);
        const w = measureText(txt) + 10;
        ctx.fillStyle = 'rgba(7,7,12,0.7)';
        ctx.fillRect(Math.round((SCREEN.W - w) / 2), 4, w, 12);
        drawText(ctx, txt, SCREEN.W / 2, 6, { align: 'center', color: UI.cyan });
      }
      ctx.globalAlpha = 1;
    }
    if (this.toast) {
      const tt = this.toast;
      const al = Math.min(1, tt.t * 6, (2.2 - tt.t) * 3);
      const w = measureText(tt.text) + 10;
      ctx.globalAlpha = al * 0.8;
      ctx.fillStyle = '#07070C';
      ctx.fillRect(Math.round((SCREEN.W - w) / 2), 136, w, 12);
      ctx.globalAlpha = al;
      drawText(ctx, tt.text, SCREEN.W / 2, 138, { align: 'center', color: tt.color });
      ctx.globalAlpha = 1;
    }
    if (this.hack) drawHackPanel(ctx, this.hack.h, { t: this.hack.t, appear: this.hack.appear, title: this.hack.term?.def?.effect === 'safe' ? L3.hack.safe : L3.hack.title, cancelKey: this.game.input.keyName('shoot') });
    if (this.hezronLight) this.drawHezronLight(ctx);
  }

  drawHezronLight(ctx) {
    const h = this.hezronLight;
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    if (h.t < 1) {
      h.t = Math.min(1, h.t + 1 / 60);
      const spr = founderSprite('hezron', Math.floor(this.t * 3) % 2);
      const x = Math.round(h.x - cx) - 8;
      const y = Math.round(h.y - cy) - 12;
      ctx.drawImage(spr.normal, x, y);
      ctx.globalAlpha = h.t;
      ctx.drawImage(spr.tint(ACCENTS.hezron), x, y);
      ctx.globalAlpha = 1;
      return;
    }
    h.fly = Math.min(1, h.fly + (1 / 60) * 1.1);
    const p = Ease.inOutCubic(h.fly);
    const tx = 4 + 3 * 11 + 6;
    const ty = 9;
    const x0 = h.x - cx;
    const y0 = h.y - cy;
    const fx = Math.round(x0 + (tx - x0) * p);
    const fy = Math.round(y0 + (ty - y0) * p - Math.sin(p * Math.PI) * 30);
    ctx.fillStyle = ACCENTS.hezron;
    ctx.fillRect(fx - 3, fy - 3, 6, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx - 1, fy - 1, 2, 2);
    if (R.chance(0.7)) this.particles.spawn({ x: fx + cx, y: fy + cy, vx: R.range(-10, 10), vy: R.range(-10, 10), life: 0.4, colors: [ACCENTS.hezron, '#FFFFFF'] });
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
        if (!OPAQUE_CHARS.has(ch) || ch === 'P' || ch === 'S' || ch === 'K' || ch === 'C' || ch === 'G') {
          ctx.drawImage(novaTile(NOVA_FLOOR_CHARS.has(ch) ? ch : '.', style, tx, ty).normal, px, py);
        }
        if (!NOVA_FLOOR_CHARS.has(ch)) ctx.drawImage(novaTile(ch, style, tx, ty).normal, px, py);
        if ((ty === 0 || ty === m.h - 1 || tx === 0 || tx === m.w - 1) && ch === '.') {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = '#05070C';
          ctx.fillRect(px, py, TS, TS);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  drawFloorDecor(ctx, cx, cy) {
    const m = this.map;
    const t = this.t;
    const x0 = Math.max(0, Math.floor(cx / TS));
    const y0 = Math.max(0, Math.floor(cy / TS));
    const x1 = Math.min(m.w - 1, Math.floor((cx + SCREEN.W) / TS));
    const y1 = Math.min(m.h - 1, Math.floor((cy + SCREEN.H) / TS));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const ch = m.charAt(tx, ty);
        const px = tx * TS - cx;
        const py = ty * TS - cy;
        if (ch === 'D' || ch === 'd') {
          // Pantallas con código que se mueve
          const screens = ch === 'D' ? [2, 9] : [2];
          for (const sx of screens) {
            const on = (tx * 3 + ty + sx) % 5 !== 0;
            if (!on) continue;
            ctx.fillStyle = '#2A4A6E';
            ctx.fillRect(px + sx, py + 2, 5, 4);
            ctx.fillStyle = '#8FB3D9';
            const line = Math.floor(t * 2 + tx + sx) % 4;
            ctx.fillRect(px + sx, py + 2 + line, 2 + ((tx + line) % 3), 1);
          }
        } else if (ch === 'H') {
          const term = this.terms?.find((q) => q.def.x === tx && q.def.y === ty);
          this.drawTermScreen(ctx, px, py, term ? (term.used ? 'done' : term.busy > 0 ? 'busy' : 'ready') : 'ready');
        } else if (ch === 'S') {
          // Luces de los racks
          for (let i = 0; i < 4; i++) {
            const on = (Math.floor(t * (3 + i)) + tx * 7 + ty * 3 + i) % 3 !== 0;
            ctx.fillStyle = on ? (i % 3 === 0 ? '#6FE08A' : i % 3 === 1 ? '#43D9FF' : '#FFD23F') : '#1B2230';
            ctx.fillRect(px + 3 + i * 3, py + 2 + (i % 2) * 6, 1, 1);
            ctx.fillRect(px + 4 + i * 2, py + 8 + ((i + 1) % 2) * 3, 1, 1);
          }
        } else if (ch === 'k') this.drawSky(ctx, tx, px, py);
        else if (ch === 'K' && this.state.safeOpen) {
          ctx.fillStyle = '#0B0E16';
          ctx.fillRect(px + 3, py + 5, 10, 9);
          ctx.fillStyle = '#6FE08A';
          ctx.fillRect(px + 11, py + 7, 1, 1);
        }
      }
    }
    // Rótulo de la recepción
    if (this.room.id === 'lobby') {
      const glow = Math.floor(t * 2) % 7 === 0 ? '#C8DDF0' : '#8FB3D9';
      drawText(ctx, L3.reception, 10 * TS - cx, TS + 4 - cy, { align: 'center', bold: true, color: glow, shadow: '#141A26' });
    }
    // Post-it en el escritorio de Choco
    const desk = this.room.chocoDesk;
    if (desk) {
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(desk.x * TS + 12 - cx, desk.y * TS + 9 - cy, 3, 3);
      ctx.fillStyle = '#B8902A';
      ctx.fillRect(desk.x * TS + 12 - cx, desk.y * TS + 11 - cy, 3, 1);
    }
    for (const l of this.lasers) l.draw(ctx, cx, cy, t);
    // Ondas de ruido
    for (const n of this.noises) {
      const p = n.t / 0.6;
      ctx.globalAlpha = (1 - p) * 0.7;
      ctx.fillStyle = '#F4F1EA';
      ring(ctx, n.x - cx, n.y - cy - 2, n.r * Ease.outQuad(p), 2);
      ctx.globalAlpha = 1;
    }
  }

  drawTermScreen(ctx, px, py, state) {
    const t = this.t;
    ctx.fillStyle = state === 'done' ? '#0A1A10' : state === 'busy' ? '#0A2A3A' : '#0A2A14';
    ctx.fillRect(px + 3, py + 2, 10, 7);
    if (state === 'done') {
      drawText(ctx, '✔', px + 8, py + 2, { align: 'center', color: '#2E6A3A', shadow: false });
      return;
    }
    ctx.fillStyle = state === 'busy' ? UI.cyan : UI.green;
    ctx.fillRect(px + 3, py + 2 + (Math.floor(t * 3) % 7), 10, 1);
    if (Math.floor(t * 2) % 2) ctx.fillRect(px + 4, py + 3, 2, 1);
  }

  drawSky(ctx, tx, px, py) {
    const hash = (n) => {
      const v = Math.sin(n * 127.1) * 43758.5453;
      return v - Math.floor(v);
    };
    // Estrellas
    if (hash(tx * 3.1) < 0.5) {
      ctx.fillStyle = Math.floor(this.t * 1.5 + tx) % 5 ? '#8A8AC0' : '#FFFFFF';
      ctx.fillRect(px + Math.floor(hash(tx) * 14), py + 1 + Math.floor(hash(tx + 9) * 4), 1, 1);
    }
    // Edificios de la ciudad con ventanas encendidas
    for (let k = 0; k < 2; k++) {
      const bw = 5 + Math.floor(hash(tx * 2 + k) * 4);
      const bh = 6 + Math.floor(hash(tx * 5 + k) * 9);
      const bx = px + k * 8;
      ctx.fillStyle = k ? '#141A26' : '#1B2230';
      ctx.fillRect(bx, py + TS - bh, bw, bh);
      ctx.fillStyle = '#FFD23F';
      for (let wy = py + TS - bh + 2; wy < py + TS - 1; wy += 3) {
        for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) if (hash(wx * 0.37 + wy * 1.91 + tx) < 0.35) ctx.fillRect(wx, wy, 1, 1);
      }
    }
    if (tx === 6) {
      // Luna
      ctx.fillStyle = '#E8ECF4';
      ctx.fillRect(px + 4, py + 2, 4, 4);
      ctx.fillRect(px + 3, py + 3, 6, 2);
      ctx.fillStyle = '#2E2240';
      ctx.fillRect(px + 6, py + 2, 2, 2);
    }
  }

  addDrawables(list, ctx, cx, cy) {
    const t = this.t;
    for (const b of this.bots) list.push({ y: b.y, d: () => b.draw(ctx, cx, cy, t) });
    for (const d of this.drones) list.push({ y: d.y + 2, d: () => d.draw(ctx, cx, cy, t) });
    for (const v of this.vacuums) list.push({ y: v.y, d: () => v.draw(ctx, cx, cy, t) });
    if (this.hezron) list.push({ y: this.hezron.y, d: () => this.hezron.draw(ctx, cx, cy) });
    if (this.hezronNpc) list.push({ y: this.hezronNpc.y, d: () => this.drawHezronNpc(ctx, cx, cy) });
    if (this.turret) list.push({ y: this.turret.y, d: () => this.turret.draw(ctx, cx, cy, t) });
    if (this.secretY && (this.laptop.active || this.forceDebugView)) list.push({ y: this.secretY.y, d: () => this.secretY.draw(ctx, cx, cy) });
    if (this.hidingSpot) {
      const hs = this.hidingSpot;
      list.push({ y: hs.ty * TS + 15, d: () => this.drawPeek(ctx, hs, cx, cy) });
    }
    const b = this.boss;
    if (b) {
      for (const tm of b.terms) {
        if (b.logic.defeated && tm.i >= 0) continue;
        list.push({ y: tm.ty * TS + 14, d: () => this.drawBossTerminal(ctx, tm, cx, cy) });
      }
      if (!b.gone && (b.appear > 0 || b.started)) list.push({ y: b.y + 40, d: () => this.drawBoss(ctx, cx, cy) });
    }
  }

  drawPeek(ctx, hs, cx, cy) {
    // Ojitos de Choco asomándose del escondite
    const x = hs.tx * TS - cx;
    const y = hs.ty * TS - cy;
    const blink = Math.floor(this.t * 1.3) % 6 === 0;
    const ly = this.map.charAt(hs.tx, hs.ty) === 'L' ? y + 5 : y + 10;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x + 5, ly - 1, 7, 3);
    if (!blink) {
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(x + 6, ly, 2, 1);
      ctx.fillRect(x + 9, ly, 2, 1);
    }
  }

  drawHezronNpc(ctx, cx, cy) {
    const h = this.hezronNpc;
    const x = Math.round(h.x - cx);
    const y = Math.round(h.y - cy);
    // Nube grande de vapor alrededor (los drones pasan sin verlo)
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + h.t * 0.4;
      ctx.fillStyle = i % 2 ? '#E8E8F0' : '#D8C8FF';
      const r = 8 + Math.sin(h.t * 1.5 + i) * 2;
      for (let yy = -r; yy <= r; yy++) {
        const hw = Math.round(Math.sqrt(r * r - yy * yy));
        ctx.fillRect(Math.round(x + Math.cos(a) * 12) - hw, Math.round(y - 10 + Math.sin(a) * 7) + yy, hw * 2 + 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(founderSprite('hezron', Math.floor(h.t * 2) % 2).normal, x - 8, y - 24);
  }

  drawBossTerminal(ctx, tm, cx, cy) {
    const b = this.boss;
    const st = b.logic.terminals[tm.i];
    const x = tm.tx * TS - cx;
    const y = tm.ty * TS - cy;
    if (tm.glitch > 0 && Math.floor(this.t * 30) % 2) return;
    ctx.drawImage(novaTile('H', 'metal', tm.tx, tm.ty).normal, x, y);
    const map = { ready: 'ready', used: 'busy', reboot: 'busy', locked: 'locked', done: 'done' };
    const s = map[st.state];
    if (s === 'locked') {
      ctx.fillStyle = '#3A0A10';
      ctx.fillRect(x + 3, y + 2, 10, 7);
      ctx.fillStyle = Math.floor(this.t * 6) % 2 ? UI.red : '#6A1A20';
      ctx.fillRect(x + 5, y + 4, 6, 3);
    } else this.drawTermScreen(ctx, x, y, s);
    if (st.state === 'ready' && b.started && !b.logic.defeated && b.logic.frozen <= 0 && Math.floor(this.t * 3) % 2) {
      ctx.fillStyle = UI.green;
      ctx.fillRect(x + 7, y - 4, 2, 2);
    }
    if (st.state === 'reboot') drawText(ctx, String(Math.ceil(st.t)), x + 8, y - 9, { align: 'center', color: UI.yellow });
  }

  drawBoss(ctx, cx, cy) {
    const b = this.boss;
    const L = b.logic;
    const x = b.x - cx;
    const y = b.y - cy - 10;
    // Aparece armándose con píxeles
    if (b.appear < 1) {
      ctx.fillStyle = '#FF2E88';
      for (let i = 0; i < 30 * b.appear; i++) ctx.fillRect(Math.round(x + R.range(-30, 30) * (1 - b.appear)), Math.round(y + R.range(-30, 30) * (1 - b.appear)), 2, 2);
      ctx.globalAlpha = b.appear;
    }
    const bob = Math.round(Math.sin(b.t * 1.6) * 2);
    const s = Math.max(0, Math.ceil(L.countdown));
    const tele = b.attack?.stage === 'tele';
    const sweepGlow = b.attack?.kind === 'sweep' && tele ? 1 : 0;
    // Barrido: la manecilla es un láser que llega a las paredes
    if (b.attack?.kind === 'sweep' && b.attack.stage === 'go') {
      const len = castRay(this.isOpaque, b.x, b.y, b.minute, 420);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#E0343F';
      thickLine(ctx, x, y + 10 + bob, x + Math.cos(b.minute) * len, y + 10 + Math.sin(b.minute) * len, 5);
      ctx.globalAlpha = 1;
      ctx.fillStyle = Math.floor(this.t * 30) % 2 ? '#FFFFFF' : '#FF9A9A';
      thickLine(ctx, x, y + 10 + bob, x + Math.cos(b.minute) * len, y + 10 + Math.sin(b.minute) * len, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(x + Math.cos(b.minute) * len) - 1, Math.round(y + 10 + Math.sin(b.minute) * len) - 1, 3, 3);
    } else if (sweepGlow) {
      // Telegrafiado: línea punteada hacia donde empieza
      const len = castRay(this.isOpaque, b.x, b.y, b.minute, 420);
      ctx.fillStyle = Math.floor(this.t * 12) % 2 ? '#FFD23F' : '#FF8A3D';
      for (let d = 30; d < len; d += 6) ctx.fillRect(Math.round(x + Math.cos(b.minute) * d), Math.round(y + 10 + Math.sin(b.minute) * d), 2, 2);
    }
    drawDeadline(ctx, x, y + bob, {
      t: b.t,
      minute: b.minute,
      hour: b.hour,
      text: b.noDate ? '--:--' : tele && b.attack.kind === 'fan' ? '>>>' : tele && b.attack.kind === 'notif' ? '(!)' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
      open: b.open,
      frozen01: L.frozen > 0 ? 1 : 0,
      glowMinute: sweepGlow,
      hurt: b.hurt > 0,
      broken: b.broken,
      shake: tele || b.hurt > 0,
    });
    if (L.frozen > 0) drawText(ctx, String(Math.ceil(L.frozen)), x, y - DEADLINE_R - 14 + bob, { align: 'center', color: '#BFE6F5' });
    ctx.globalAlpha = 1;
  }

  // Conos de visión, oscuridad y luces (encima de las entidades)
  drawForeground(ctx, cx, cy) {
    const t = this.t;
    const viewers = [];
    const visible = (x, y) => x > cx - 110 && x < cx + SCREEN.W + 110 && y > cy - 110 && y < cy + SCREEN.H + 110;
    const blockers = this.clouds.map((k) => k.blocker);
    for (const b of this.bots) if (b.active && visible(b.x, b.y)) viewers.push({ e: b, v: b.viewer(), kind: 'bot' });
    for (const k of this.cameras) if (k.active && visible(k.ex, k.ey)) viewers.push({ e: k, v: k.viewer(), kind: 'camera' });
    for (const d of this.drones) if (d.active && visible(d.x, d.y)) viewers.push({ e: d, v: d.viewer(), kind: 'drone' });
    for (const vw of viewers) vw.pts = conePolygon(vw.v, this.isOpaque, blockers);

    // Oscuridad con agujeros de luz
    const L = this.lighting;
    const dark = DARKNESS[this.floorStyle] ?? 0.5;
    L.begin('#03050B', dark);
    const c = this.choco;
    if (!this.hideChoco) L.light(c.footX - cx, c.eyeY - cy, 46, { strength: 0.95 });
    if (this.hezron) L.light(this.hezron.x - cx, this.hezron.y - 10 - cy, 22, { strength: 0.6, tint: ACCENTS.hezron, tintAlpha: 0.06 });
    const m = this.map;
    const x0 = Math.max(0, Math.floor(cx / TS) - 1);
    const y0 = Math.max(0, Math.floor(cy / TS) - 1);
    const x1 = Math.min(m.w - 1, Math.floor((cx + SCREEN.W) / TS) + 1);
    const y1 = Math.min(m.h - 1, Math.floor((cy + SCREEN.H) / TS) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const ch = m.charAt(tx, ty);
        const px = tx * TS - cx;
        const py = ty * TS - cy;
        if (ch === 'D' || ch === 'd') L.rect(px + 1, py + 1, ch === 'D' ? 14 : 7, 9, 0.55);
        else if (ch === 'H') L.light(px + 8, py + 6, 14, { strength: 0.7, tint: '#6FE08A', tintAlpha: 0.08 });
        else if (ch === 'O' || ch === 'k' || ch === '~') L.rect(px, py, TS, ch === '~' ? 12 : TS, 0.5);
        else if (ch === 'S') L.rect(px + 2, py + 2, 12, 12, 0.25);
        else if (ch === 'M') L.rect(px, py + 2, TS, 9, 0.6);
        else if (ch === 'C') L.light(px + 8, py + 6, 12, { strength: 0.5 });
      }
    }
    for (const l of this.lasers) if (l.phase === 'on') L.light(l.x - cx, (l.y0 + l.y1) / 2 - cy, 22, { strength: 0.6, tint: '#E0343F', tintAlpha: 0.1 });
    if (this.boss && !this.boss.gone && this.boss.appear > 0) L.light(this.boss.x - cx, this.boss.y - 10 - cy, 44, { strength: 0.8, tint: this.boss.logic.frozen > 0 ? '#BFE6F5' : '#FF5A5A', tintAlpha: 0.07 });
    if (this.turret) L.light(this.turret.x - cx, this.turret.y - 8 - cy, 20, { strength: 0.6 });
    for (const k of this.cameras) L.light(k.mx - cx, k.my - cy, 6, { strength: 0.6 });
    // Los enemigos llevan su propia luz (visor) para que siempre se lean
    for (const b of this.bots) L.light(b.x - cx, b.y - 8 - cy, 16, { strength: 0.8, tint: b.state === 'chase' ? '#E0343F' : '#43D9FF', tintAlpha: 0.05 });
    for (const d of this.drones) L.light(d.x - cx, d.y - 14 - cy, 14, { strength: 0.7 });
    for (const v of this.vacuums) L.light(v.x - cx, v.y - 5 - cy, 10, { strength: 0.5 });
    // Los conos también iluminan
    const lc = L.ctx;
    lc.globalCompositeOperation = 'destination-out';
    for (const vw of viewers) {
      lc.globalAlpha = 0.45;
      fillPolygon(lc, vw.pts.map((p) => ({ x: p.x - cx, y: p.y - cy })));
    }
    lc.globalAlpha = 1;
    lc.globalCompositeOperation = 'source-over';
    L.draw(ctx);

    // Conos (siempre visibles)
    for (const vw of viewers) {
      const e = vw.e;
      let col = vw.kind === 'drone' ? '#BFD8F0' : '#FFF2A8';
      if (this.alarm || e.alarmMark > 0 || e.state === 'chase') col = '#E0343F';
      else if (e.sus > 0) col = e.sus > 0.66 ? '#FF8A3D' : '#FFD23F';
      const pts = vw.pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
      ctx.globalAlpha = e.seen ? 0.3 : 0.17;
      ctx.fillStyle = col;
      fillPolygon(ctx, pts);
      // Borde del arco
      ctx.globalAlpha = 0.55;
      const start = vw.kind === 'drone' ? 0 : 1;
      for (let i = start; i < pts.length; i += 1) ctx.fillRect(Math.round(pts[i].x), Math.round(pts[i].y), 1, 1);
      ctx.globalAlpha = 1;
    }
    // Cámaras en las paredes
    for (const k of this.cameras) k.draw(ctx, cx, cy, t, !!this.alarm);
    // Nubes de vapor (tapan lo que hay detrás)
    for (const k of this.clouds) k.draw(ctx, cx, cy, t);
    // Disparos
    for (const s of this.shots) s.draw(ctx, cx, cy);
    for (const e of this.eshots) e.draw(ctx, cx, cy);
    if (this.hezron) this.hezron.drawBalloon(ctx, cx, cy);
    // Textos flotantes (bloqueo / parry)
    if (this.popTexts) {
      for (const p of this.popTexts) {
        p.t += 1 / 60;
        ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
        drawText(ctx, p.text, Math.round(p.x - cx), Math.round(p.y - cy - p.t * 20), { align: 'center', color: p.color });
      }
      ctx.globalAlpha = 1;
      this.popTexts = this.popTexts.filter((p) => p.t < 0.8);
    }
    // Daily: globos de la reunión
    if (this.daily) this.drawDaily(ctx, cx, cy);
    // Alarma: luz roja que pulsa
    if (this.alarm) {
      ctx.globalAlpha = 0.08 + 0.06 * Math.sin(t * 8);
      ctx.fillStyle = '#E0343F';
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, SCREEN.W, 2);
      ctx.fillRect(0, SCREEN.H - 2, SCREEN.W, 2);
      ctx.globalAlpha = 1;
    }
  }

  drawDaily(ctx, cx, cy) {
    const d = this.daily;
    const lines = L3.daily;
    const slot = 0.55;
    const i = Math.floor(d.t / slot);
    let who;
    let text;
    if (i < this.npcs.length) {
      who = this.npcs[i];
      text = lines[i % lines.length];
    } else {
      who = { x: this.choco.footX, y: this.choco.footY - 2 };
      text = L3.dailyChoco;
    }
    const w = measureText(text) + 8;
    let x = Math.round(who.x - cx - w / 2);
    x = Math.max(2, Math.min(SCREEN.W - w - 2, x));
    const y = Math.round(who.y - cy - 34);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 1, y - 1, w + 2, 12);
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(x, y, w, 10);
    drawText(ctx, text, x + 4, y + 2, { color: '#2A2A38', shadow: false });
    // Reloj de la reunión
    const p = Math.min(1, d.t / 3);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(SCREEN.W / 2 - 31, 150, 62, 6);
    ctx.fillStyle = UI.yellow;
    ctx.fillRect(SCREEN.W / 2 - 30, 151, Math.round(60 * p), 4);
  }

  // Vista Debug: cables de cada terminal a lo que controla, rutas futuras, la Y escondida
  drawDebugReveal(ctx, cx, cy) {
    const t = this.t;
    for (const b of this.bots) b.drawPath(ctx, cx, cy, t);
    for (const d of this.drones) d.drawPath(ctx, cx, cy, t);
    for (const term of this.terms || []) {
      const def = term.def;
      if (!def.target) continue;
      const ids = def.target.split(',');
      const targets = [...this.cameras.filter((k) => ids.includes(k.id)).map((k) => ({ x: k.mx, y: k.my })), ...this.lasers.filter((l) => ids.includes(l.id)).map((l) => ({ x: l.x, y: l.y0 + 2 })), ...this.bots.filter((b) => ids.includes(b.id)).map((b) => ({ x: b.x, y: b.y - 8 }))];
      const sx = def.x * TS + 8;
      const sy = def.y * TS + 4;
      for (const tg of targets) {
        // Cable en L con pulsos que viajan
        const midY = sy;
        const seg = [
          [sx, sy, tg.x, midY],
          [tg.x, midY, tg.x, tg.y],
        ];
        let acc = 0;
        for (const [ax, ay, bx, by] of seg) {
          const len = Math.hypot(bx - ax, by - ay);
          for (let s = 0; s < len; s += 2) {
            const p = s / len;
            const on = Math.floor(acc + s - t * 60) % 24 < 3;
            ctx.fillStyle = on ? '#FFFFFF' : term.used ? '#2E6A8A' : '#43D9FF';
            ctx.fillRect(Math.round(ax + (bx - ax) * p - cx), Math.round(ay + (by - ay) * p - cy), 1, 1);
          }
          acc += len;
        }
      }
    }
    if (this.secretY) {
      const y = this.secretY;
      ctx.fillStyle = '#FFD23F';
      ring(ctx, y.x - cx, y.y - 8 - cy, 8 + Math.sin(t * 6) * 2, 2);
    }
  }

  // ======================================================================
  // Depuración
  // ======================================================================
  debugGiveAll() {
    this.choco.items = { staff: true, boots: true, laptop: true, shield: true, lasso: true };
  }

  debugF10() {
    if (!this.state.hezron) {
      this.hezronNpc = this.hezronNpc || { x: this.choco.footX - 12, y: this.choco.footY, t: 0 };
      this.joinHezron();
    }
    this.state.vapor[this.room.id] = VAPOR.CHARGES;
    this.toastMsg('Hezron', ACCENTS.hezron);
  }

  debugLife(d) {
    this.maxHp = Math.max(1, Math.min(HEALTH.MAX_POSSIBLE, this.maxHp + d));
    this.choco.hp = this.maxHp;
  }

  debugInfo() {
    const c = this.choco;
    return [
      `${this.room.id} · ${c.state} · ${c.dir}${c.sneaking ? ' · sigilo' : ''}`,
      `pies ${c.footX.toFixed(1)}, ${c.footY.toFixed(1)} (tile ${Math.floor(c.footX / TS)},${Math.floor((c.footY - 4) / TS)})`,
      `vida ${c.hp}/${this.maxHp} · alarma ${this.alarm ? this.alarm.t.toFixed(1) : '-'}`,
      `bots ${this.bots.map((b) => b.state[0] + (b.sus > 0 ? b.sus.toFixed(1) : '')).join(' ')}`,
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
    for (const b of this.bots) box(b.hitbox, '#E0343F');
    for (const l of this.lasers) box(l.hitbox, '#FF8A3D');
    for (const r of this.obstacles()) box(r, '#43D9FF');
  }
}
