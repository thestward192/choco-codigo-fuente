// Base de las salas del Modo Sincronizado — docs/coop/03_mecanicas_coop.md y docs/coop/04_red.md
//
// Autoridad dividida:
//   - Cada computadora manda en SU personaje (física, vida, daño recibido) y lo manda 30 veces por
//     segundo (`me`). El compañero se dibuja interpolado 100 ms atrás (SnapshotBuffer).
//   - El anfitrión manda en el mundo: simula los enemigos y los manda 20 veces por segundo (`world`).
//     Los golpes del invitado llegan como acciones (`act`) y el anfitrión los aplica.
//   - Lo que no se puede perder (checkpoint, enemigo vencido, objeto tomado, sala reiniciada…) va
//     por eventos confiables (`ev` + `ack`, con reenvío).
//
// Las subclases construyen la sala en buildRoom() (mapa, apariciones, enemigos, objetos, carteles)
// y la dibujan con drawBackground / drawTiles / drawWorld.
import { Scene } from '../core/game.js';
import { SCREEN, COOP, PLATFORMER, ENEMIES } from '../config/balance.js';
import { NET } from '../config/net.js';
import { aabbOverlap, isStomp } from '../systems/physics.js';
import { Camera } from '../core/camera.js';
import { Particles } from '../core/particles.js';
import { Choco } from '../entities/choco.js';
import { Tapita } from '../entities/tapita.js';
import { Melcocha } from '../entities/melcocha.js';
import { Shot } from '../entities/projectile.js';
import { Laptop } from '../items/laptop.js';
import { LAPTOP } from '../config/balance.js';
import { shieldCharge01 } from '../systems/shield.js';
import { SnapshotBuffer, ReliableChannel, RateTimer } from '../net/sync.js';
import { GAME } from '../net/protocol.js';
import { drawText, drawTextBox } from '../art/font.js';
import { wrapText } from '../art/fontData.js';
import { UI, COOP as COOP_COLORS, CHOCO as CHOCO_PAL } from '../art/palettes.js';
import { PALETTE as TAPITA_PAL } from '../art/tapita.js';
import { TEXTS } from '../data/dialogues.js';
import { playSfx, debugHum } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';
import { CoopHud } from './hud.js';
import { charColor, otherChar } from './art.js';
import { NetMeter } from './common.js';
import { CoopPauseScene } from './CoopPauseScene.js';

const TS = SCREEN.TILE;
const T = TEXTS.coop.room;
const R = fxRng;
const nowMs = () => (globalThis.performance ? performance.now() : Date.now());
// Choco cargando a Tapita: salta más bajo
const CARRY_PHYSICS = { ...PLATFORMER, JUMP_SPEED: COOP.CARRY_JUMP };
const SIGN_RANGE = 22;

// Control "quieto": el personaje no recibe órdenes (menú abierto, apuntando la señal…)
const STILL = {
  moveX: () => 0,
  moveY: () => 0,
  down: () => false,
  pressed: () => false,
  released: () => false,
  buffered: () => false,
  held: () => 0,
  consume: () => {},
};

// Colores del efecto "se cayó la conexión" (el personaje se pixela)
const PIXEL_COLORS = {
  choco: [CHOCO_PAL.b, CHOCO_PAL.l, CHOCO_PAL.w, '#FFFFFF', COOP_COLORS.choco],
  tapita: [TAPITA_PAL.b, TAPITA_PAL.l, TAPITA_PAL.h, '#FFFFFF', COOP_COLORS.tapita],
};

export function makeCharacter(scene, kind, footX, footY) {
  if (kind === 'tapita') return new Tapita(scene, footX, footY);
  const c = new Choco(scene, footX, footY);
  c.kind = 'choco';
  // En el cooperativo Choco tiene todo desde el inicio y 4 cuadritos
  c.items = { staff: true, boots: true, laptop: true, shield: true, lasso: true };
  c.setMaxHp(COOP.TAPITA.HP);
  c.hp = c.maxHp;
  return c;
}

export class CoopLevel extends Scene {
  // opts: { session, mine: 'choco' | 'tapita', input (otro control para ?coop=local), onLeave(reason) }
  constructor(game, { session, mine, input = null, onLeave = null, local = false } = {}) {
    super(game);
    this.online = true; // no se pausa al perder el foco
    this.session = session;
    this.isHost = session.isHost;
    this.mine = mine;
    this.theirs = otherChar(mine);
    this.input = input || game.input;
    this.local = local; // ?coop=local: dos salas en la misma página
    this.onLeave = onLeave;
    this.t = 0;
    this.particles = new Particles(900);
    this.camera = new Camera();
    this.hud = new CoopHud();
    this.laptop = new Laptop();
    this.meter = new NetMeter();
    this.shots = [];
    this.melcochas = [];
    this.melSeq = 0;
    this.enemies = []; // { id, e, stun, stuck, buf }
    this.pickups = []; // { id, kind: 'bit' | 'crystal', x, y, t, taken }
    this.signs = [];
    this.signals = []; // { x, y, t, who }
    this.aim = null; // apuntando la señal: { x, y, t }
    this.lassoNodes = [];
    this.checkpoint = null;
    this.respawnT = 0;
    this.stats = { time: 0, falls: 0 };
    this.bits = 0;
    this.crystals = 0;
    this.banner = null;
    this.menuOpen = false;
    this.frozen = null; // 'partner' | 'self'
    this.ended = false;
    this.noDeath = false;
    this.partner = { kind: this.theirs, entity: null, buf: new SnapshotBuffer(), s: null, mode: null, present: false, inMenu: false, lastSt: 'play', plat: null, prevX: null, prevY: null };

    this.reliable = new ReliableChannel((m) => this.send(m), { now: nowMs });
    this.meTimer = new RateTimer(NET.ME_RATE);
    this.worldTimer = new RateTimer(NET.WORLD_RATE);

    this.buildRoom();
    this.player = makeCharacter(this, mine, ...this.spawnFor(mine));
    this.partner.entity = makeCharacter(this, this.theirs, ...this.spawnFor(this.theirs));
    this.partner.plat = { x: 0, y: 0, w: 0, h: 4, dx: 0, dy: 0, active: false, partner: true };
    this.map.platforms.push(this.partner.plat);
    this.camera.snapTo(this.player.footX, this.player.footY);

    const s = session;
    this.offs = [
      s.on('game', (d) => this.onGame(d)),
      s.on('peer', (p) => this.onPeer(p)),
      s.on('status', (st) => this.onStatus(st)),
      s.on('closed', (reason) => this.leave(TEXTS.coop.closed[reason] || TEXTS.coop.closed.closed)),
    ];
  }

  // Compatibilidad con el atajo de vuelo libre (J) del modo desarrolladora
  get choco() {
    return this.player;
  }

  exit() {
    for (const off of this.offs) off();
    this.hum = debugHum(this.game.audio, this.hum, false);
    this.game.audio.stopAllSustained?.();
  }

  // ---------- Para las subclases ----------
  buildRoom() {}
  // Dónde aparece cada personaje: [footX, footY]
  spawnFor(kind) {
    const cp = this.checkpoint;
    return [cp.x + (kind === 'choco' ? -8 : 8), cp.y];
  }
  setMap(map) {
    this.map = map;
    this.camera.setBounds(0, 0, map.pxW, map.pxH);
  }
  addSign(x, footY, text, id) {
    this.signs.push({ x, y: footY, text, id, t: 0, flash: 0 });
  }
  // Enemigos: la subclase crea la lista en orden fijo (los ids tienen que coincidir en las dos computadoras)
  addEnemy(e) {
    const id = this.enemyIds = (this.enemyIds ?? -1) + 1;
    e.awake = true;
    this.enemies.push({ id, e, stun: 0, stuck: 0, buf: this.isHost ? null : new SnapshotBuffer({ lerp: ['x', 'y'] }) });
  }
  addPickup(kind, x, y) {
    this.pickups.push({ id: this.pickups.length, kind, x, y, t: R.range(0, 6), taken: false });
  }
  // Reconstruye lo que se reinicia (enemigos y objetos). La subclase lo implementa.
  buildEntities() {}

  // ---------- Red ----------
  send(d) {
    this.session.sendGame(d);
  }

  act(kind, data = {}) {
    this.send({ type: GAME.ACT, k: kind, ...data });
  }

  ev(kind, data = {}) {
    this.reliable.send({ k: kind, ...data });
  }

  onGame(d) {
    if (this.ended) return;
    const now = nowMs();
    switch (d.type) {
      case GAME.ME:
        if (d.s && typeof d.s.x === 'number') {
          this.partner.buf.push(d.ts, d.s, now);
          this.partner.present = true;
        }
        break;
      case GAME.WORLD:
        if (!this.isHost) this.onWorld(d, now);
        break;
      case GAME.ACT:
        this.onAct(d);
        break;
      case GAME.EV: {
        const e = this.reliable.receive(d);
        if (e) this.onEvent(e);
        break;
      }
      case GAME.ACK:
        this.reliable.ack(d.seq);
        break;
      case GAME.MENU:
        this.partner.inMenu = !!d.open;
        break;
      default:
        break;
    }
  }

  onPeer(p) {
    if (this.ended) return;
    if (!p.present) {
      this.leave(T.partnerLeft);
      return;
    }
    if (p.lost) {
      this.frozen = 'partner';
    } else if (this.frozen === 'partner') {
      // Volvió: el anfitrión reenvía el estado completo
      this.frozen = null;
      this.partner.buf.clear();
      if (this.isHost) this.sendFull();
      this.meTimer.acc = 1;
    }
  }

  onStatus(st) {
    if (this.ended) return;
    if (st === 'reconnecting') this.frozen = 'self';
    else if (st === 'room' && this.frozen === 'self') {
      this.frozen = this.session.peer.lost ? 'partner' : null;
      this.partner.buf.clear();
      if (this.isHost) this.sendFull();
    }
  }

  // Estado completo del mundo (al volver de una desconexión)
  sendFull() {
    this.ev('full', {
      cp: this.checkpoint?.id ?? null,
      alive: this.enemies.map((x) => x.id),
      taken: this.pickups.filter((p) => p.taken).map((p) => p.id),
    });
  }

  // Estado del mundo (invitado): enemigos interpolados
  onWorld(d, now) {
    if (!Array.isArray(d.e)) return;
    const seen = new Set();
    for (const row of d.e) {
      const [id, x, y, dir, st, stun, stuck] = row;
      seen.add(id);
      const it = this.enemies.find((q) => q.id === id);
      if (!it) continue;
      it.buf.push(d.ts, { x, y, dir, st, stun, stuck }, now);
    }
    // Los que el anfitrión ya no manda se fueron (el efecto llega por ev)
    for (const it of this.enemies) if (!seen.has(it.id) && it.e.state === 'walk' && it.buf.latest) it.gone = true;
    this.enemies = this.enemies.filter((it) => !it.gone);
  }

  onAct(d) {
    switch (d.k) {
      case 'shot':
        this.shots.push(Object.assign(new Shot(d.x, d.y, d.dir, !!d.ch, d.aim || null), { remote: true }));
        playSfx(this.game.audio, d.ch ? 'shootCharged' : 'shoot');
        break;
      case 'hit':
        if (this.isHost) this.damageEnemy(d.id, d.dmg, d.dir);
        break;
      case 'stomp':
        if (this.isHost) this.stompEnemy(d.id);
        break;
      case 'stick':
        if (this.isHost) {
          const it = this.enemies.find((q) => q.id === d.id);
          if (it) it.stuck = COOP.TAPITA.MELCOCHA_STICK_ENEMY;
        }
        break;
      case 'pound':
        this.applyPound(d.x, d.y, false);
        break;
      case 'mel':
        this.melcochas.push(new Melcocha(d.id, d.x, d.y, d.vx, d.vy, false));
        playSfx(this.game.audio, 'throw');
        break;
      case 'signal':
        this.addSignal(d.x, d.y, this.theirs);
        break;
      default:
        break;
    }
  }

  onEvent(e) {
    switch (e.k) {
      case 'melStick': {
        const m = this.melcochas.find((q) => q.id === e.id);
        if (m && m.flying) m.stick(this, e.x, e.y);
        else if (!m) {
          const n = new Melcocha(e.id, e.x, e.y, 0, 0, false);
          n.stick(this, e.x, e.y);
          this.melcochas.push(n);
        }
        break;
      }
      case 'melPop': {
        const m = this.melcochas.find((q) => q.id === e.id);
        m?.pop(this, true);
        break;
      }
      case 'kill': {
        const it = this.enemies.find((q) => q.id === e.id);
        if (it && it.e.state === 'walk') it.e.explode(this, e.dir || 0);
        this.enemies = this.enemies.filter((q) => q.id !== e.id);
        break;
      }
      case 'squash': {
        const it = this.enemies.find((q) => q.id === e.id);
        if (it && it.e.state === 'walk') it.e.stomp(this);
        break;
      }
      case 'cp':
        this.setCheckpoint(e.id, false);
        break;
      case 'take': {
        const pk = this.pickups.find((q) => q.id === e.id);
        if (pk) pk.taken = true;
        break;
      }
      case 'reset':
        this.resetRoom(false);
        break;
      case 'full':
        if (e.cp !== null && e.cp !== undefined) this.setCheckpoint(e.cp, false);
        if (Array.isArray(e.alive)) this.enemies = this.enemies.filter((q) => e.alive.includes(q.id));
        if (Array.isArray(e.taken)) {
          for (const pk of this.pickups) if (e.taken.includes(pk.id)) pk.taken = true;
        }
        break;
      case 'end':
        this.finish();
        break;
      default:
        break;
    }
  }

  // ---------- API de las entidades ----------
  countShots(charged) {
    let n = 0;
    for (const s of this.shots) if (!s.dead && !s.remote && s.charged === charged) n++;
    return n;
  }

  spawnShot(x, y, dir, charged, aim = null) {
    this.shots.push(new Shot(x, y, dir, charged, aim));
    this.act('shot', { x: Math.round(x), y: Math.round(y), dir, ch: charged ? 1 : 0, aim });
  }

  addBits(n, x, y) {
    if (this.mine !== 'choco') return;
    this.bits += n;
    if (x !== undefined) this.particles.burst(x, y, n * 3, { speedMin: 20, speedMax: 50, colors: [UI.green, '#E8FFF0'], lifeMin: 0.2, lifeMax: 0.4, angle: -Math.PI / 2, spread: 2 });
  }

  // Golpe del mazo de Tapita sobre los enemigos de la zona
  melee(box, damage, dir) {
    let hit = false;
    for (const it of this.enemies) {
      if (it.e.state !== 'walk' || !aabbOverlap(box, it.e.body)) continue;
      hit = true;
      this.hitEnemy(it, damage, dir);
    }
    return hit;
  }

  hitEnemy(it, damage, dir) {
    if (this.isHost) this.damageEnemy(it.id, damage, dir);
    else {
      it.e.flashT = ENEMIES.BYTELING.HIT_FLASH;
      playSfx(this.game.audio, 'enemyHit');
      this.act('hit', { id: it.id, dmg: damage, dir });
    }
  }

  // Anfitrión: aplica daño y avisa si murió
  damageEnemy(id, damage, dir) {
    const it = this.enemies.find((q) => q.id === id);
    if (!it || it.e.state !== 'walk') return;
    if (it.e.damage(damage, this, dir)) {
      this.ev('kill', { id, dir });
      this.enemies = this.enemies.filter((q) => q !== it);
    }
  }

  stompEnemy(id) {
    const it = this.enemies.find((q) => q.id === id);
    if (!it || it.e.state !== 'walk') return;
    it.e.stomp(this);
    this.ev('squash', { id });
  }

  enemyAt(box) {
    const it = this.enemies.find((q) => q.e.state === 'walk' && aabbOverlap(box, q.e.body));
    return it || null;
  }

  // Melcocha sobre un enemigo: queda pegado
  stickEnemy(it) {
    it.stuck = COOP.TAPITA.MELCOCHA_STICK_ENEMY;
    if (!this.isHost) this.act('stick', { id: it.id });
  }

  throwMelcocha(x, y, vx, vy) {
    // Máximo 2 en el mundo: la tercera borra la más vieja
    const mine = this.melcochas.filter((m) => m.owner && !m.dead);
    while (mine.length >= COOP.TAPITA.MELCOCHA_MAX) {
      const old = mine.shift();
      old.pop(this, true);
      this.ev('melPop', { id: old.id });
    }
    const id = `${this.isHost ? 'h' : 'g'}${++this.melSeq}`;
    this.melcochas.push(new Melcocha(id, x, y, vx, vy, true));
    this.act('mel', { id, x: Math.round(x), y: Math.round(y), vx: Math.round(vx), vy: Math.round(vy) });
  }

  onMelcochaStuck(m) {
    this.ev('melStick', { id: m.id, x: m.plat.x, y: m.plat.y });
  }

  // Martillazo de Tapita en (x, y)
  pound(x, y) {
    this.act('pound', { x: Math.round(x), y: Math.round(y) });
    this.applyPound(x, y, true);
  }

  // Efectos del martillazo en esta computadora: el anfitrión aturde enemigos; si el personaje
  // propio es Choco y está cerca, sale impulsado.
  applyPound(x, y, mine) {
    const C = COOP.TAPITA;
    if (!mine) {
      playSfx(this.game.audio, 'pound');
      this.game.effects.shake(C.POUND_SHAKE * 0.6);
      for (const d of [-1, 1]) this.particles.burst(x + d * 6, y - 1, 8, { angle: d > 0 ? 0 : Math.PI, spread: 0.35, speedMin: 60, speedMax: 150, colors: ['#F2C46B', '#FFF1C2', '#C8A070'], lifeMin: 0.2, lifeMax: 0.45, drag: 4 });
    }
    // Onda visible
    this.waves = this.waves || [];
    this.waves.push({ x, y, t: 0 });
    if (this.isHost) {
      for (const it of this.enemies) {
        const b = it.e.body;
        if (it.e.state === 'walk' && Math.abs(b.x + b.w / 2 - x) <= C.POUND_RADIUS && Math.abs(b.y + b.h - y) <= 24) it.stun = C.POUND_STUN;
      }
    }
    const p = this.player;
    if (p.kind === 'choco' && p.state === 'play') {
      const b = p.body;
      if (b.onGround && Math.abs(p.footX - x) <= C.POUND_RADIUS && Math.abs(p.footY - y) <= 20) {
        b.vy = C.POUND_BOOST;
        b.onGround = false;
        p.js.jumping = false;
        p.js.canDoubleJump = true;
        p.setSquash({ X: 0.7, Y: 1.35 });
        playSfx(this.game.audio, 'boost');
      }
    }
  }

  // ---------- Vida y reaparición ----------
  onChocoDamaged() {}
  onPlayerDamaged() {}

  onChocoFell(c) {
    this.onPlayerFell(c);
  }
  onPlayerFell(p) {
    if (this.game.devMode) {
      this.returnToSafe(p);
      return;
    }
    if (p.kind === 'choco') p.dieByFall();
    else p.die('fall');
  }

  returnToSafe(p) {
    const s = p.safe || this.checkpoint;
    playSfx(this.game.audio, 'glitch');
    p.body.x = s.x - p.body.w / 2;
    p.body.y = s.y - p.body.h;
    p.body.vx = 0;
    p.body.vy = 0;
    p.invuln = 0.6;
  }

  onChocoDied(c) {
    this.onPlayerDied(c);
  }
  onPlayerDied(p) {
    this.stats.falls++;
    this.respawnT = COOP.RESPAWN_TIME;
    this.pixelate(p, this.mine);
    if (p.lasso) p.lasso = null;
  }

  // "Se cayó la conexión": el personaje se deshace en píxeles que suben
  pixelate(p, kind) {
    playSfx(this.game.audio, 'disconnect');
    const b = p.body;
    const colors = PIXEL_COLORS[kind];
    for (let y = b.y - 4; y < b.y + b.h; y += 3) {
      for (let x = b.x - 2; x < b.x + b.w + 2; x += 3) {
        this.particles.spawn({ x, y, vx: R.range(-15, 15), vy: R.range(-50, -15), life: R.range(0.3, COOP.DISCONNECT_FX_TIME + 0.2), color: R.pick(colors), size: 2, endSize: 1, drag: 1 });
      }
    }
  }

  respawn() {
    const prev = this.player;
    this.player = makeCharacter(this, this.mine, ...this.spawnFor(this.mine));
    if (prev.kind === 'choco') this.player.coating = false;
    this.player.invuln = 1;
    this.camera.snapTo(this.player.footX, this.player.footY);
    playSfx(this.game.audio, 'respawn');
    const b = this.player.body;
    this.particles.burst(this.player.footX, b.y + b.h / 2, 16, { speedMin: 20, speedMax: 70, colors: PIXEL_COLORS[this.mine], lifeMin: 0.2, lifeMax: 0.5, size: 2, endSize: 1 });
  }

  // Si caen los dos, la sala se reinicia completa (lo decide el anfitrión)
  resetRoom(announce) {
    if (announce) this.ev('reset');
    for (const m of this.melcochas) m.pop(this, false);
    this.melcochas = [];
    this.shots = [];
    this.enemies = [];
    this.enemyIds = -1; // los ids vuelven a empezar igual en las dos computadoras
    this.buildEntities(); // enemigos de nuevo (los objetos tomados siguen tomados)
    this.respawnT = 0;
    this.respawn();
    this.showBanner(T.reset, 2.5);
  }

  setCheckpoint(id, announce) {
    const s = this.signs.find((q) => q.id === id);
    if (!s || this.checkpoint?.id === id) return;
    this.checkpoint = { x: s.x, y: s.y, id };
    s.flash = 0.6;
    playSfx(this.game.audio, 'checkpoint');
    this.particles.burst(s.x, s.y - 14, 10, { speedMin: 20, speedMax: 50, colors: ['#6FE08A', '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.5 });
    if (announce) this.ev('cp', { id });
  }

  // ---------- Señal ----------
  addSignal(x, y, who) {
    this.signals = this.signals.filter((s) => s.who !== who);
    this.signals.push({ x, y, t: COOP.SIGNAL_TIME, who });
    playSfx(this.game.audio, 'signal');
  }

  // Tocar T: señal donde está el personaje. Mantener: se mueve con las flechas (hasta 5 tiles).
  updateSignal(dt) {
    const inp = this.input;
    const p = this.player;
    if (!p.alive) {
      this.aim = null;
      return false;
    }
    const head = { x: p.footX, y: p.body.y - 6 };
    if (inp.pressed('signal')) this.aim = { dx: 0, dy: 0, t: 0 };
    if (!this.aim) return false;
    const a = this.aim;
    a.t += dt;
    if (inp.down('signal')) {
      if (a.t > COOP.SIGNAL_HOLD) {
        a.dx += inp.moveX() * COOP.SIGNAL_MOVE_SPEED * dt;
        a.dy += inp.moveY() * COOP.SIGNAL_MOVE_SPEED * dt;
        const d = Math.hypot(a.dx, a.dy);
        if (d > COOP.SIGNAL_RANGE) {
          a.dx *= COOP.SIGNAL_RANGE / d;
          a.dy *= COOP.SIGNAL_RANGE / d;
        }
        return true; // mientras apunta, el personaje no se mueve
      }
      return false;
    }
    // Soltó: se pone la señal
    const x = Math.round(head.x + a.dx);
    const y = Math.round(head.y + a.dy);
    this.aim = null;
    this.addSignal(x, y, this.mine);
    this.act('signal', { x, y });
    return false;
  }

  // ---------- Actualización ----------
  update(dt) {
    this.t += dt;
    this.meter.update(dt, this.session);
    this.reliable.update();
    const g = this.game;
    const inp = this.input;
    if (this.ended) {
      this.particles.update(dt);
      this.player.updateSquash?.(dt);
      if (this.endT > 0 && (this.endT -= dt) <= 0) {
        if (this.onLeave) this.onLeave('done');
        else this.game.flow.toCoopLobby(this.game);
      }
      if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
      return;
    }

    // Desconexión: el juego se congela para los dos hasta que vuelva (o venza el tiempo)
    if (this.frozen) {
      this.particles.update(dt);
      return;
    }

    if (!this.local && !this.menuOpen && inp.pressed('pause') && !g.transitioning) {
      this.openPause();
      return;
    }
    if (!this.ending) this.stats.time += dt;
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;

    this.updatePartner(dt);

    // Vista Debug: la de Choco (propia o del compañero) hace sólidos los fantasmas para los dos
    const p = this.player;
    let mineDbg = false;
    if (p.kind === 'choco') {
      mineDbg = this.laptop.update(dt, !this.menuOpen && inp.down('debug') && p.alive && p.state === 'play', g.devMode);
      if (this.laptop.justToggled) playSfx(g.audio, mineDbg ? 'debugOn' : 'debugOff');
      this.hum = debugHum(g.audio, this.hum, mineDbg);
    }
    this.map.ghostSolid = mineDbg || !!(this.partner.present && this.partner.s?.dbg);

    // Choco cargando a Tapita: más lento, salto más bajo y sin doble salto
    const carried = this.partnerRidingMe();
    if (p.kind === 'choco') {
      p.extraSpeedMult = carried ? COOP.CARRY_SPEED_MULT : 1;
      p.physics = carried ? CARRY_PHYSICS : null;
      p.noDoubleJump = carried;
    }

    // Personaje propio
    const aiming = !this.menuOpen && this.updateSignal(dt);
    const control = this.menuOpen || aiming ? STILL : inp;
    if (p.alive) p.update(dt, control);
    if (p.kind === 'tapita') p.riding = !!p.body.platform?.partner;
    if (!p.alive && this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
    }

    this.updateEnemies(dt);
    this.updateShots(dt);
    for (const m of this.melcochas) m.update(dt, this);
    this.melcochas = this.melcochas.filter((m) => !m.dead);
    this.updatePickups(dt);
    this.updateSigns(dt);
    for (const s of this.signals) s.t -= dt;
    this.signals = this.signals.filter((s) => s.t > 0);
    if (this.waves) {
      for (const w of this.waves) w.t += dt;
      this.waves = this.waves.filter((w) => w.t < 0.35);
    }
    this.levelUpdate(dt);

    // Si caen los dos, el anfitrión reinicia la sala
    if (this.isHost && !p.alive && this.partner.s?.st === 'dead' && this.respawnT > 0.2) this.resetRoom(true);

    // Envíos
    if (this.meTimer.tick(dt)) this.sendMe();
    if (this.isHost && this.worldTimer.tick(dt)) this.sendWorld();

    this.particles.update(dt);
    if (p.state !== 'dead' || p.deathCause !== 'fall') {
      this.camera.follow({ cx: p.footX, cy: p.footY, facing: p.facing, onGround: p.body.onGround || !p.alive, vy: p.body.vy }, dt);
    }
    this.hud.update(dt, this.hudState());
  }

  levelUpdate() {}

  sendMe() {
    const s = this.player.netState();
    if (this.player.kind === 'choco' && this.laptop.active) s.dbg = 1;
    const plat = this.player.body.platform;
    if (plat?.partner && this.partner.entity) s.ride = Math.round(this.player.footX - this.partner.entity.footX);
    this.send({ type: GAME.ME, ts: Math.round(nowMs()), s });
  }

  sendWorld() {
    const e = this.enemies.map((it) => {
      const b = it.e.body;
      return [it.id, Math.round((b.x + b.w / 2) * 10) / 10, Math.round((b.y + b.h) * 10) / 10, it.e.dir, it.e.state === 'walk' ? 0 : 1, it.stun > 0 ? 1 : 0, it.stuck > 0 ? 1 : 0];
    });
    this.send({ type: GAME.WORLD, ts: Math.round(nowMs()), e });
  }

  // ¿El compañero está parado encima de mi personaje?
  partnerRidingMe() {
    const s = this.partner.s;
    return !!(this.partner.present && s && s.ride !== undefined && s.st === 'play' && s.g);
  }

  updatePartner(dt) {
    const P = this.partner;
    const plat = P.plat;
    plat.active = false;
    if (!P.present) return;
    const sample = P.buf.sample(nowMs());
    if (!sample) return;
    const s = { ...sample.s };
    P.mode = sample.mode;
    // Montado sobre mí: se dibuja pegado a mi personaje, sin el atraso de la red
    const me = this.player;
    if (s.ride !== undefined && s.st === 'play' && me.alive) {
      s.x = me.footX + s.ride;
      s.y = me.body.y;
    }
    // Se cayó: efecto de píxeles una vez
    if (s.st === 'dead' && P.lastSt !== 'dead') this.pixelate(P.entity, P.kind);
    if (s.st !== 'dead' && P.lastSt === 'dead') this.particles.burst(s.x, s.y - 8, 16, { speedMin: 20, speedMax: 70, colors: PIXEL_COLORS[P.kind], lifeMin: 0.2, lifeMax: 0.5, size: 2, endSize: 1 });
    P.lastSt = s.st;
    P.s = s;
    P.entity.applyNet(s, dt);
    // El compañero es una plataforma (sólida por arriba) para pararse encima
    const b = P.entity.body;
    if (s.st === 'play' && s.ride === undefined) {
      plat.active = true;
      plat.dx = P.prevX === null ? 0 : b.x - P.prevX;
      plat.dy = P.prevY === null ? 0 : b.y - P.prevY;
      plat.x = b.x;
      plat.y = b.y;
      plat.w = b.w;
    }
    P.prevX = b.x;
    P.prevY = b.y;
  }

  updateEnemies(dt) {
    const p = this.player;
    const now = nowMs();
    for (const it of this.enemies) {
      const e = it.e;
      if (this.isHost) {
        if (it.stun > 0) it.stun -= dt;
        if (it.stuck > 0) it.stuck -= dt;
        if (it.stun > 0 || it.stuck > 0) {
          // Aturdido o pegado: no camina (pero el aplastado termina su animación)
          e.t += dt;
          if (e.flashT > 0) e.flashT -= dt;
          if (e.state !== 'walk') e.update(dt, this);
        } else e.update(dt, this);
      } else {
        // Invitado: el enemigo es un títere del estado del anfitrión
        const smp = it.buf.sample(now);
        e.t += dt;
        if (e.flashT > 0) e.flashT -= dt;
        e.sx += (1 - e.sx) * Math.min(1, dt * 12);
        e.sy += (1 - e.sy) * Math.min(1, dt * 12);
        if (smp) {
          const s = smp.s;
          e.body.x = s.x - e.body.w / 2;
          e.body.y = s.y - e.body.h;
          e.dir = s.dir;
          it.stun = s.stun ? 1 : 0;
          it.stuck = s.stuck ? 1 : 0;
        }
        if (e.state === 'squashed') {
          e.stateT += dt;
          if (e.stateT > ENEMIES.BYTELING.SQUASH_TIME) e.dead = true;
        }
      }
      // Contacto con el personaje propio (cada uno calcula su daño)
      if (e.state !== 'walk' || !p.alive || p.state !== 'play' || p.noclip) continue;
      if (!aabbOverlap(p.body, e.body)) continue;
      const calm = it.stun > 0 || it.stuck > 0;
      if (e.stompable && isStomp(p.body, e.body, p.body.vy)) {
        if (this.isHost) this.stompEnemy(it.id);
        else {
          e.stomp(this);
          this.act('stomp', { id: it.id });
        }
        if (p.kind === 'choco') p.stomp(this.input);
        else {
          p.body.vy = PLATFORMER.STOMP_BOUNCE;
          p.setSquash({ X: 0.8, Y: 1.22 });
        }
      } else if (!calm) {
        p.hurt(e.body.x + e.body.w / 2);
      }
    }
    this.enemies = this.enemies.filter((it) => !it.e.dead);
  }

  updateShots(dt) {
    for (const s of this.shots) {
      s.update(dt, this);
      if (s.dead || s.remote) continue;
      for (const it of this.enemies) {
        if (it.e.state !== 'walk' || s.hit.has(it)) continue;
        if (!aabbOverlap(s, it.e.body)) continue;
        this.hitEnemy(it, s.damage, s.dir);
        if (s.charged) {
          s.hit.add(it);
          this.game.effects.hitstop(5);
        } else {
          s.kill(this, false);
          break;
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  // Bits para Choco y cristales para Tapita: cada uno junta solo los suyos
  updatePickups(dt) {
    const p = this.player;
    const want = p.kind === 'choco' ? 'bit' : 'crystal';
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.t += dt;
      if (pk.kind !== want || !p.alive) continue;
      if (!aabbOverlap(p.body, { x: pk.x - 5, y: pk.y - 5, w: 10, h: 10 })) continue;
      pk.taken = true;
      this.ev('take', { id: pk.id });
      if (want === 'bit') {
        this.bits++;
        playSfx(this.game.audio, 'bit');
      } else {
        this.crystals++;
        playSfx(this.game.audio, 'sparkle');
      }
      this.particles.burst(pk.x, pk.y, 8, { speedMin: 20, speedMax: 60, colors: want === 'bit' ? [UI.green, '#FFFFFF'] : [TAPITA_PAL.c, TAPITA_PAL.C, '#FFFFFF'], lifeMin: 0.2, lifeMax: 0.4 });
    }
  }

  updateSigns(dt) {
    const p = this.player;
    this.activeSign = null;
    for (const s of this.signs) {
      const near = p.alive && Math.abs(s.x - p.footX) < SIGN_RANGE && Math.abs(s.y - p.footY) < 24;
      s.t = near ? Math.min(1, s.t + dt * 6) : Math.max(0, s.t - dt * 6);
      if (s.flash > 0) s.flash -= dt;
      if (near) {
        this.activeSign = s;
        if (p.body.onGround && p.state === 'play') this.setCheckpoint(s.id, true);
      }
    }
  }

  showBanner(text, time = 2.2, color = UI.yellow) {
    this.banner = { text, t: time, time, color };
  }

  // ---------- Pausa, salida y fin ----------
  openPause() {
    if (this.ended || this.game.top !== this) return;
    this.game.push(new CoopPauseScene(this.game, this));
  }

  setMenu(open) {
    this.menuOpen = open;
    this.send({ type: GAME.MENU, open });
  }

  // Termina la sala para los dos (llegaron a la salida)
  finish() {
    if (this.ended) return;
    this.ended = true;
    this.player.state = 'victory';
    this.player.anim.t = 0;
    playSfx(this.game.audio, 'item');
    this.showBanner(T.done, 3, UI.green);
    this.endT = 1.6;
  }

  // Sale de la sala (el compañero se fue, la sala se cerró o el jugador salió)
  leave(message = null, { bySelf = false } = {}) {
    if (this.ended) return;
    this.ended = true;
    if (bySelf) this.session.leave();
    else if (this.isHost && this.session.inRoom) this.session.leave();
    if (this.onLeave) this.onLeave('left', message);
    else this.game.flow.toCoopMenu(this.game, { message });
  }

  // ---------- HUD ----------
  hudState() {
    const p = this.player;
    const P = this.partner;
    const s = { mine: p.kind, hp: Math.max(0, p.hp), maxHp: p.maxHp };
    if (p.kind === 'choco') {
      s.laptop = { battery01: this.laptop.battery / LAPTOP.BATTERY_MAX, active: this.laptop.active, locked: this.laptop.locked };
      s.shield01 = shieldCharge01(p.shield);
    } else {
      s.melMax = COOP.TAPITA.MELCOCHA_MAX;
      s.melAvail = Math.max(0, COOP.TAPITA.MELCOCHA_MAX - this.melcochas.filter((m) => m.owner && !m.dead).length);
      s.planted = p.planted;
      s.umbrella = p.umbrella;
    }
    if (P.present && P.s) {
      let status = null;
      if (this.session.peer.lost) status = 'lost';
      else if (P.s.st === 'dead') status = 'respawn';
      else if (P.inMenu) status = 'menu';
      s.partner = { kind: P.kind, hp: Math.max(0, P.s.hp ?? 0), maxHp: COOP.TAPITA.HP, status, ping: this.session.peer.ping };
    }
    s.count = p.kind === 'choco' ? { kind: 'bits', n: this.bits } : { kind: 'crystals', n: this.crystals };
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
    this.drawBackground(ctx, cx, cy);
    this.drawTiles(ctx, cx, cy);
    this.drawWorld(ctx, cx, cy);
    for (const s of this.signs) this.drawSign(ctx, s, cx, cy);
    for (const pk of this.pickups) if (!pk.taken) this.drawPickup(ctx, pk, cx, cy);
    for (const m of this.melcochas) m.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, false);
    for (const it of this.enemies) this.drawEnemy(ctx, it, cx, cy);
    for (const s of this.shots) s.draw(ctx, cx, cy);
    this.drawWaves(ctx, cx, cy);
    // El compañero atrás y el propio adelante
    const P = this.partner;
    if (P.present && P.s && P.s.st !== 'dead') {
      P.entity.draw(ctx, cx, cy);
      if (P.inMenu) this.drawMenuIcon(ctx, P.entity, cx, cy);
    }
    if (this.player.alive) this.player.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, true);
    this.drawForeground(ctx, cx, cy);
    if (this.map.ghostSolid) this.drawDebugTint(ctx, cx, cy);
    for (const s of this.signals) this.drawSignal(ctx, s, cx, cy);
    if (this.aim && this.aim.t > COOP.SIGNAL_HOLD) this.drawAim(ctx, cx, cy);
    this.drawPartnerArrow(ctx, cx, cy);

    this.hud.draw(ctx, this.hudState());
    if (this.activeSign && this.activeSign.t > 0.5 && this.activeSign.text) this.drawSignText(ctx, this.activeSign);
    if (!this.player.alive && this.respawnT > 0) this.drawRespawn(ctx);
    if (this.banner) this.drawBanner(ctx);
    if (this.frozen) this.drawFrozen(ctx);
  }

  drawBackground(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
  }
  drawTiles() {}
  drawWorld() {}
  drawForeground() {}

  drawSign(ctx, s, cx, cy) {
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    const isCp = this.checkpoint?.id === s.id;
    ctx.fillStyle = '#2A2F45';
    ctx.fillRect(x - 1, y - 8, 2, 8);
    ctx.fillStyle = s.flash > 0 && Math.floor(s.flash * 20) % 2 ? '#1E4A2A' : '#0B0D16';
    ctx.fillRect(x - 7, y - 19, 14, 11);
    // Borde mitad cian y mitad ámbar: es de los dos
    ctx.fillStyle = isCp ? UI.green : COOP_COLORS.choco;
    ctx.fillRect(x - 7, y - 19, 7, 1);
    ctx.fillRect(x - 7, y - 9, 7, 1);
    ctx.fillRect(x - 7, y - 19, 1, 11);
    ctx.fillStyle = isCp ? UI.green : COOP_COLORS.tapita;
    ctx.fillRect(x, y - 19, 7, 1);
    ctx.fillRect(x, y - 9, 7, 1);
    ctx.fillRect(x + 6, y - 19, 1, 11);
    ctx.fillStyle = isCp ? UI.green : '#8A8AA0';
    ctx.fillRect(x - 5, y - 16, 6, 1);
    ctx.fillRect(x - 5, y - 13, 9, 1);
  }

  drawSignText(ctx, s) {
    const w = 250;
    const lines = wrapText(s.text, w - 12);
    const h = lines.length * 10 + 6;
    const x = Math.round((SCREEN.W - w) / 2);
    const y = 36; // debajo del HUD, para no tapar a los personajes
    ctx.globalAlpha = 0.85 * s.t;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = s.t;
    ctx.fillStyle = COOP_COLORS.choco;
    ctx.fillRect(x, y, w / 2, 1);
    ctx.fillStyle = COOP_COLORS.tapita;
    ctx.fillRect(x + w / 2, y, w / 2, 1);
    drawTextBox(ctx, s.text, x + 6, y + 4, w - 12, { color: UI.text });
    ctx.globalAlpha = 1;
  }

  drawPickup(ctx, pk, cx, cy) {
    const x = Math.round(pk.x - cx);
    const y = Math.round(pk.y - cy + Math.sin(pk.t * 3) * 1.5);
    const mine = (pk.kind === 'bit') === (this.player.kind === 'choco');
    if (!mine) ctx.globalAlpha = 0.45; // lo del compañero se ve, pero apagado
    if (pk.kind === 'bit') {
      ctx.fillStyle = '#0A2A1A';
      ctx.fillRect(x - 3, y - 3, 7, 7);
      ctx.fillStyle = UI.green;
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = '#E8FFF0';
      ctx.fillRect(x - 1, y - 1, 1, 1);
    } else {
      // Cristal de azúcar: rombo dorado que brilla
      ctx.fillStyle = TAPITA_PAL.o;
      ctx.fillRect(x - 1, y - 4, 3, 9);
      ctx.fillRect(x - 3, y - 2, 7, 5);
      ctx.fillStyle = TAPITA_PAL.c;
      ctx.fillRect(x, y - 3, 1, 7);
      ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillStyle = Math.floor(pk.t * 4) % 4 === 0 ? '#FFFFFF' : TAPITA_PAL.C;
      ctx.fillRect(x - 1, y - 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawEnemy(ctx, it, cx, cy) {
    it.e.draw(ctx, cx, cy, this);
    const b = it.e.body;
    const x = Math.round(b.x + b.w / 2 - cx);
    const y = Math.round(b.y - cy);
    if (it.stuck > 0) {
      // Pegado con melcocha
      ctx.fillStyle = '#E8A040';
      ctx.fillRect(x - b.w / 2, Math.round(b.y + b.h - 4 - cy), b.w, 4);
      ctx.fillStyle = '#FFD27A';
      ctx.fillRect(x - b.w / 2 + 1, Math.round(b.y + b.h - 4 - cy), b.w - 2, 1);
    } else if (it.stun > 0) {
      // Estrellitas girando
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = i % 2 ? UI.yellow : '#FFFFFF';
        ctx.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y - 4 + Math.sin(a) * 2), 1, 1);
      }
    }
  }

  drawWaves(ctx, cx, cy) {
    if (!this.waves) return;
    for (const w of this.waves) {
      const r = Math.round(4 + (w.t / 0.35) * COOP.TAPITA.POUND_RADIUS);
      ctx.globalAlpha = 1 - w.t / 0.35;
      ctx.fillStyle = '#FFF1C2';
      const y = Math.round(w.y - cy) - 1;
      ctx.fillRect(Math.round(w.x - cx - r), y, 3, 1);
      ctx.fillRect(Math.round(w.x - cx + r - 3), y, 3, 1);
      ctx.fillRect(Math.round(w.x - cx - r), y - 1, 1, 1);
      ctx.fillRect(Math.round(w.x - cx + r - 1), y - 1, 1, 1);
      ctx.globalAlpha = 1;
    }
  }

  // Filtro suave de la Vista Debug
  drawDebugTint(ctx, cx, cy) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#0A2A7A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = UI.cyan;
    for (let x = -(cx % TS); x < SCREEN.W; x += TS) ctx.fillRect(x, 0, 1, SCREEN.H);
    for (let y = -(cy % TS); y < SCREEN.H; y += TS) ctx.fillRect(0, y, SCREEN.W, 1);
    ctx.globalAlpha = 1;
  }

  drawMenuIcon(ctx, ent, cx, cy) {
    const x = Math.round(ent.footX - cx);
    const y = Math.round(ent.body.y - cy - 12 + Math.sin(this.t * 4));
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 6, y - 1, 12, 9);
    ctx.fillStyle = UI.yellow;
    ctx.fillRect(x - 4, y + 1, 8, 1);
    ctx.fillRect(x - 4, y + 3, 8, 1);
    ctx.fillRect(x - 4, y + 5, 8, 1);
  }

  // Marcador "¡Aquí!"
  drawSignal(ctx, s, cx, cy) {
    const color = charColor(s.who);
    const x = Math.round(s.x - cx);
    const y = Math.round(s.y - cy);
    const age = COOP.SIGNAL_TIME - s.t;
    if (s.t < 0.5 && Math.floor(s.t * 12) % 2) return;
    if (x < 0 || x > SCREEN.W || y < 0 || y > SCREEN.H) {
      this.drawEdgeArrow(ctx, s.x, s.y, cx, cy, color, '!');
      return;
    }
    const pop = Math.min(1, age * 6);
    // Anillo que crece
    const r = Math.round(3 + (age % 0.8) * 10);
    ctx.globalAlpha = 1 - (age % 0.8) / 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - r + 0.5, y - r + 0.5, r * 2, r * 2);
    ctx.globalAlpha = 1;
    const by = y - 16 - Math.round((1 - pop) * 6) + Math.round(Math.sin(this.t * 6));
    const w = 34;
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - w / 2, by, w, 11);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, by, w, 1);
    ctx.fillRect(x - w / 2, by + 10, w, 1);
    ctx.fillRect(x - 1, by + 11, 3, 1);
    ctx.fillRect(x, by + 12, 1, 2);
    drawText(ctx, T.here, x, by + 2, { align: 'center', color, shadow: false });
  }

  drawAim(ctx, cx, cy) {
    const p = this.player;
    const x = Math.round(p.footX + this.aim.dx - cx);
    const y = Math.round(p.body.y - 6 + this.aim.dy - cy);
    ctx.fillStyle = charColor(this.mine);
    ctx.fillRect(x - 4, y, 3, 1);
    ctx.fillRect(x + 2, y, 3, 1);
    ctx.fillRect(x, y - 4, 1, 3);
    ctx.fillRect(x, y + 2, 1, 3);
  }

  // Flecha en el borde cuando el compañero no se ve (con su color y la distancia en tiles)
  drawPartnerArrow(ctx, cx, cy) {
    const P = this.partner;
    if (!P.present || !P.s || P.s.st === 'dead') return;
    const b = P.entity.body;
    if (this.camera.isVisible(b.x, b.y, b.w, b.h, 0)) return;
    const d = Math.round(Math.hypot(P.entity.footX - this.player.footX, P.entity.footY - this.player.footY) / TS);
    this.drawEdgeArrow(ctx, P.entity.footX, b.y + b.h / 2, cx, cy, charColor(P.kind), `${d}`);
  }

  drawEdgeArrow(ctx, wx, wy, cx, cy, color, label) {
    const m = COOP.ARROW_MARGIN;
    const sx = wx - cx;
    const sy = wy - cy;
    const x = Math.round(Math.max(m, Math.min(SCREEN.W - m, sx)));
    const y = Math.round(Math.max(m + 26, Math.min(SCREEN.H - m, sy)));
    const ang = Math.atan2(sy - y, sx - x);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(x - 5, y - 5, 11, 11);
    ctx.fillStyle = color;
    // Triángulo apuntando hacia afuera
    for (let i = 0; i < 4; i++) {
      const px = Math.round(x + Math.cos(ang) * (4 - i));
      const py = Math.round(y + Math.sin(ang) * (4 - i));
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      for (let k = -i; k <= i; k++) ctx.fillRect(Math.round(px + nx * k), Math.round(py + ny * k), 1, 1);
    }
    const lx = Math.max(12, Math.min(SCREEN.W - 12, x - Math.round(Math.cos(ang) * 12)));
    const ly = Math.max(m + 22, Math.min(SCREEN.H - 16, y - Math.round(Math.sin(ang) * 12) - 3));
    drawText(ctx, label, lx, ly, { align: 'center', color, shadow: UI.shadow });
  }

  drawRespawn(ctx) {
    const s = Math.ceil(this.respawnT);
    drawText(ctx, T.fell, SCREEN.W / 2, 70, { align: 'center', bold: true, color: charColor(this.mine) });
    drawText(ctx, T.respawnIn(s), SCREEN.W / 2, 84, { align: 'center', color: UI.textDim });
  }

  drawBanner(ctx) {
    const b = this.banner;
    const a = Math.min(1, (b.time - b.t) * 5, b.t * 3);
    const lines = wrapText(b.text, 230);
    const h = lines.length * 10 + 10;
    ctx.globalAlpha = 0.7 * a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 56, SCREEN.W, h);
    ctx.globalAlpha = a;
    lines.forEach((l, i) => drawText(ctx, l, SCREEN.W / 2, 61 + i * 10, { align: 'center', bold: true, color: b.color }));
    ctx.globalAlpha = 1;
  }

  // Juego congelado por una desconexión
  drawFrozen(ctx) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    const text = this.frozen === 'self' ? T.reconnecting : T.waitPartner(Math.ceil(this.session.peerGraceLeft()));
    drawText(ctx, text, SCREEN.W / 2, 80, { align: 'center', color: UI.yellow });
    const dots = '.'.repeat(1 + (Math.floor(this.t * 3) % 3));
    drawText(ctx, dots, SCREEN.W / 2, 94, { align: 'center', color: UI.textDim });
  }

  debugInfo() {
    const p = this.player;
    const P = this.partner;
    return [
      ...this.meter.lines(this.session),
      `${p.kind} ${p.state} · ${p.anim.name}`,
      `x ${p.body.x.toFixed(1)} y ${p.body.y.toFixed(1)} vx ${p.body.vx.toFixed(0)} vy ${p.body.vy.toFixed(0)}`,
      `compañero ${P.present ? P.mode : '—'} · ev sin ack ${this.reliable.unacked}`,
      `enemigos ${this.enemies.length} melcochas ${this.melcochas.length}`,
    ];
  }

  debugDraw(ctx) {
    const cx = this.camera.rx;
    const cy = this.camera.ry;
    const box = (r, color) => {
      if (!r) return;
      ctx.strokeStyle = color;
      ctx.strokeRect(Math.round(r.x - cx) + 0.5, Math.round(r.y - cy) + 0.5, r.w - 1, r.h - 1);
    };
    box(this.player.body, '#6FE08A');
    if (this.partner.present) box(this.partner.entity.body, '#FFB13B');
    for (const it of this.enemies) box(it.e.body, '#E0343F');
    for (const p of this.map.platforms) if (p.active !== false) box(p, '#43D9FF');
    if (this.player.kind === 'tapita' && this.player.action === 'mazo') box(this.player.mazoBox(), '#FFFFFF');
  }
}

