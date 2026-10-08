// Elementos de puzzle del Modo Sincronizado — docs/coop/03_mecanicas_coop.md
//
// Código de colores fijo: cian = solo Choco · ámbar = solo Tapita · gris = cualquiera ·
// magenta con rayas = los dos.
//
// El anfitrión manda en los puzzles: calcula el estado de cada elemento con su personaje y con el
// del compañero (interpolado), y lo manda en el mensaje `world` (pack/unpack). El invitado solo
// dibuja ese estado. Lo que no se puede perder (bloque roto, caja movida, tapón de melcocha) viaja
// como evento confiable desde la sala.
//
// Elementos (def = lo que viene del mapa de la sala; tx/ty en tiles):
//   button   { kind: 'light' | 'heavy' | 'xheavy' | 'pound', w, timer? }  peso o martillazo
//   target   { timer? }                         diana de código: disparo del báculo
//   terminal { pair }                            doble firma: las dos con menos de 0.5 s
//   lever    {}                                  cambia al interactuar
//   scale    { a: {tx, ty, w}, b: {tx, ty, w}, range }  balanza de poleas
//   gate     { h, link: [ids], mode: 'all' | 'any', latch? }  compuerta
//   fan      { h, link?, invert? }               ventilador: corriente hacia arriba
//   curtain  { kind: 'water' | 'heat', h }       cortina de agua o de calor
//   box      { big? }                            caja de madera
//   exit     { who: 'choco' | 'tapita', group }  marco de la puerta de salida doble
//   bubble   {}                                  burbuja de aire (oxígeno)
// Los bloques de azúcar agrietados y las planchas calientes son tiles (ver CoopStage).
import { COOP, SCREEN } from '../config/balance.js';

const P = COOP.PUZZLE;
const TS = SCREEN.TILE;

// Peso de un personaje (Choco 1 · Tapita 2 · Tapita plantada 3)
export function weightOf(kind, planted = false) {
  if (kind === 'tapita') return planted ? P.WEIGHT.tapitaPlanted : P.WEIGHT.tapita;
  return P.WEIGHT.choco;
}

// Personajes para los puzzles: [{ kind, x, y (pies), w, h, onGround, planted, ridingOn: kind|null, alive }]
// Peso sobre un rectángulo: los que están parados encima, más los que están montados sobre ellos.
export function weightOn(rect, chars, tol = 3) {
  let w = 0;
  const on = new Set();
  for (const c of chars) {
    if (!c.alive || !c.onGround || c.ridingOn) continue;
    if (c.x + c.w / 2 <= rect.x || c.x - c.w / 2 >= rect.x + rect.w) continue;
    if (Math.abs(c.y - rect.y) > tol) continue;
    on.add(c.kind);
    w += weightOf(c.kind, c.planted);
  }
  for (const c of chars) {
    if (c.alive && c.ridingOn && on.has(c.ridingOn)) w += weightOf(c.kind, c.planted);
  }
  return w;
}

// Balanza: baja el lado con más peso a SCALE_SPEED, hasta `range` px. Devuelve el nuevo offset
// (positivo = el lado A bajó).
export function scaleStep(offset, wa, wb, range, dt) {
  const dir = Math.sign(wa - wb);
  const target = dir * range;
  const step = P.SCALE_SPEED * dt;
  if (offset < target) return Math.min(target, offset + step);
  if (offset > target) return Math.max(target, offset - step);
  return offset;
}

// Doble firma: dos tiempos de toque (s) → ¿firmaron a tiempo?
export function signedTogether(ta, tb, window = P.TERMINAL_WINDOW) {
  if (ta === null || tb === null || ta === undefined || tb === undefined) return false;
  return Math.abs(ta - tb) <= window;
}

// Porcentaje de puertas dobles en que los dos llegaron con menos de SYNC_WINDOW s de diferencia.
export function syncPercent(doors) {
  if (!doors.length) return 100;
  const ok = doors.filter((d) => Math.abs(d) <= P.SYNC_WINDOW).length;
  return Math.round((ok / doors.length) * 100);
}

// Nota según el tiempo (límites en COOP.RANKS por mapa)
export function gradeFor(map, time) {
  const r = COOP.RANKS[map] || COOP.RANKS.c1;
  if (time <= r[0]) return 'S';
  if (time <= r[1]) return 'A';
  if (time <= r[2]) return 'B';
  return 'C';
}

// ---------- Mundo de puzzles ----------

export class PuzzleWorld {
  // defs: lista de elementos; map: Tilemap (las compuertas y cajas escriben tiles sólidos)
  constructor(defs, map) {
    this.map = map;
    this.els = defs.map((d, i) => this.create(d, i));
    this.byId = new Map(this.els.map((e) => [e.id, e]));
    this.t = 0;
    for (const e of this.els) if (e.type === 'gate') this.writeGate(e, true);
    for (const e of this.els) if (e.type === 'box') this.writeBox(e, true);
  }

  create(d, i) {
    const e = { ...d, id: d.id ?? `e${i}`, i, on: false, t: 0 };
    switch (d.type) {
      case 'button': {
        const w = (d.w || (d.kind === 'heavy' || d.kind === 'xheavy' ? 2 : 1)) * TS;
        e.rect = { x: d.tx * TS + (d.kind === 'light' || d.kind === 'pound' ? 2 : 0), y: (d.ty + 1) * TS, w: w - (d.kind === 'light' || d.kind === 'pound' ? 4 : 0), h: 4 };
        e.timer = 0; // martillazo con temporizador
        e.press = 0; // 0..1 hundido (dibujo)
        e.weight = 0;
        break;
      }
      case 'target':
        e.rect = { x: d.tx * TS + 2, y: d.ty * TS + 2, w: TS - 4, h: TS - 4 };
        e.timer = 0;
        e.flash = 0;
        break;
      case 'terminal':
        e.rect = { x: d.tx * TS, y: d.ty * TS - TS, w: TS, h: TS * 2 };
        e.touch = null; // momento (s) de la última firma
        e.done = false;
        break;
      case 'lever':
        e.rect = { x: d.tx * TS, y: d.ty * TS, w: TS, h: TS };
        e.on = !!d.start;
        e.flip = 0;
        break;
      case 'scale': {
        e.offset = 0;
        e.range = d.range ?? 32;
        const mk = (s) => ({ x: s.tx * TS, y: s.ty * TS, w: (s.w || 2) * TS, h: 6, dx: 0, dy: 0, active: true, scale: true, baseY: s.ty * TS });
        e.pa = mk(d.a);
        e.pb = mk(d.b);
        this.map.platforms.push(e.pa, e.pb);
        e.wa = 0;
        e.wb = 0;
        break;
      }
      case 'gate':
        e.h = d.h || 3;
        e.open = 0; // 0 cerrada .. 1 abierta (dibujo)
        e.latched = false;
        e.solid = true;
        e.rect = { x: d.tx * TS, y: d.ty * TS, w: TS, h: e.h * TS };
        break;
      case 'fan':
        e.h = d.h || 6;
        e.rect = { x: d.tx * TS, y: (d.ty - e.h + 1) * TS, w: TS * (d.w || 2), h: e.h * TS };
        e.on = true;
        e.plug = 0;
        break;
      case 'curtain':
        e.h = d.h || 4;
        e.rect = { x: d.tx * TS + 3, y: d.ty * TS, w: TS - 6, h: e.h * TS };
        e.on = true;
        e.plug = 0;
        break;
      case 'box':
        e.size = d.big ? 2 : 1;
        e.cx = d.tx; // tile actual (esquina de arriba a la izquierda)
        e.cy = d.ty;
        e.anim = null; // { fx, fy, t, dur }
        e.broken = false;
        break;
      case 'exit':
        e.rect = { x: d.tx * TS, y: d.ty * TS - TS, w: TS, h: TS * 2 };
        e.inT = 0;
        break;
      case 'bubble':
        e.x = d.tx * TS + 8;
        e.y = d.ty * TS + 8;
        e.respawn = 0;
        break;
      default:
        break;
    }
    return e;
  }

  get(id) {
    return this.byId.get(id);
  }

  // ¿La señal de un elemento está activa? (botón, diana, terminal, palanca)
  active(id) {
    const e = this.byId.get(id);
    if (!e) return this.extra ? !!this.extra(id) : false; // señales de afuera (puertas dobles)
    if (e.type === 'terminal') return e.done;
    return !!e.on;
  }

  linksOn(e) {
    const ids = e.link || [];
    if (!ids.length) return true;
    return e.mode === 'any' ? ids.some((id) => this.active(id)) : ids.every((id) => this.active(id));
  }

  // ---------- Anfitrión: simulación ----------
  // chars: personajes para los puzzles (ver weightOn); now: segundos de la sala
  hostUpdate(dt, chars, now) {
    this.t = now;
    for (const e of this.els) {
      switch (e.type) {
        case 'button':
          if (e.kind === 'pound') {
            if (e.timer > 0) {
              e.timer = Math.max(0, e.timer - dt);
              e.on = e.timer > 0 || e.on === 'latched';
            }
          } else {
            e.weight = weightOn(e.rect, chars);
            e.on = e.weight >= P.BUTTON_NEED[e.kind];
          }
          break;
        case 'target':
          if (e.timer > 0) {
            e.timer = Math.max(0, e.timer - dt);
            if (e.timer <= 0 && !e.latch) e.on = false;
          }
          break;
        case 'terminal': {
          if (e.done) break;
          const o = this.byId.get(e.pair);
          if (o && signedTogether(e.touch, o.touch)) {
            e.done = true;
            o.done = true;
            this.onEvent?.('signed', e);
          }
          // La primera firma vence
          if (e.touch !== null && now - e.touch > P.TERMINAL_WINDOW && !e.done) e.touch = null;
          break;
        }
        case 'scale': {
          e.wa = weightOn({ x: e.pa.x, y: e.pa.y, w: e.pa.w }, chars, 8);
          e.wb = weightOn({ x: e.pb.x, y: e.pb.y, w: e.pb.w }, chars, 8);
          e.offset = scaleStep(e.offset, e.wa, e.wb, e.range, dt);
          break;
        }
        case 'gate': {
          const want = e.latched || this.linksOn(e);
          if (want && e.latch) e.latched = true;
          e.on = want;
          break;
        }
        case 'fan':
          e.on = (e.link ? this.linksOn(e) !== !!e.invert : true) && e.plug <= 0;
          break;
        case 'curtain':
          e.on = (e.link ? this.linksOn(e) !== !!e.invert : true) && e.plug <= 0;
          break;
        default:
          break;
      }
    }
    // Compuertas: no se cierran encima de alguien
    for (const e of this.els) if (e.type === 'gate') this.syncGateSolid(e, chars);
  }

  // Un martillazo en (x, y): activa los botones de martillazo cercanos (anfitrión)
  pound(x, y) {
    let hit = null;
    for (const e of this.els) {
      if (e.type !== 'button' || e.kind !== 'pound') continue;
      const cx = e.rect.x + e.rect.w / 2;
      if (Math.abs(cx - x) > P.POUND_BUTTON_RANGE || Math.abs(e.rect.y - y) > 6) continue;
      if (e.timer !== undefined && e.time) e.timer = e.time;
      e.on = e.time ? true : 'latched';
      hit = e;
    }
    return hit;
  }

  // Disparo sobre una diana (anfitrión)
  hitTarget(id) {
    const e = this.byId.get(id);
    if (!e || e.type !== 'target') return false;
    e.on = true;
    e.flash = 0.3;
    if (e.time) e.timer = e.time;
    return true;
  }

  // Firma en una terminal (anfitrión). at: segundos de la sala en que firmó
  sign(id, at) {
    const e = this.byId.get(id);
    if (!e || e.type !== 'terminal' || e.done) return false;
    e.touch = at;
    return true;
  }

  toggleLever(id) {
    const e = this.byId.get(id);
    if (!e || e.type !== 'lever') return false;
    e.on = !e.on;
    e.flip = 1;
    return true;
  }

  // ---------- Red ----------
  // Estado compacto para `world`: un número por elemento (el orden de la lista es fijo)
  pack() {
    return this.els.map((e) => {
      switch (e.type) {
        case 'button':
          return e.on ? (e.kind === 'pound' && e.timer > 0 ? Math.ceil(e.timer * 10) : 1) : 0;
        case 'target':
          return e.on ? (e.timer > 0 ? Math.ceil(e.timer * 10) : 1) : 0;
        case 'terminal':
          return e.done ? -1 : e.touch !== null ? Math.max(1, Math.ceil((P.TERMINAL_WINDOW - (this.t - e.touch)) * 100)) : 0;
        case 'lever':
        case 'gate':
        case 'fan':
        case 'curtain':
          return e.on ? 1 : 0;
        case 'scale':
          return Math.round(e.offset * 10) / 10;
        default:
          return 0;
      }
    });
  }

  // Invitado: aplica el estado del anfitrión
  unpack(arr, chars) {
    if (!Array.isArray(arr) || arr.length !== this.els.length) return;
    this.els.forEach((e, i) => {
      const v = arr[i];
      if (typeof v !== 'number') return;
      switch (e.type) {
        case 'button':
          if (!e.on && v) e.press = Math.max(e.press, 0.01);
          e.on = v !== 0;
          e.timer = e.kind === 'pound' && v > 1 ? v / 10 : 0;
          break;
        case 'target':
          if (!e.on && v) e.flash = 0.3;
          e.on = v !== 0;
          e.timer = v > 1 ? v / 10 : 0;
          break;
        case 'terminal':
          e.done = v === -1;
          e.left = v > 0 ? v / 100 : 0;
          break;
        case 'lever':
          if (e.on !== (v === 1)) e.flip = 1;
          e.on = v === 1;
          break;
        case 'gate':
        case 'fan':
        case 'curtain':
          e.on = v === 1;
          break;
        case 'scale':
          e.target = v;
          break;
        default:
          break;
      }
    });
    for (const e of this.els) if (e.type === 'gate') this.syncGateSolid(e, chars);
  }

  // ---------- Los dos: movimiento y dibujo ----------
  update(dt, isHost) {
    for (const e of this.els) {
      switch (e.type) {
        case 'button': {
          const want = e.on ? 1 : 0;
          e.press += (want - e.press) * Math.min(1, dt * 18);
          break;
        }
        case 'gate': {
          const want = e.on ? 1 : 0;
          e.open = want > e.open ? Math.min(1, e.open + P.GATE_SPEED * dt) : Math.max(0, e.open - P.GATE_SPEED * dt);
          break;
        }
        case 'target':
        case 'lever':
          if (e.flash > 0) e.flash -= dt;
          if (e.flip > 0) e.flip = Math.max(0, e.flip - dt * 5);
          break;
        case 'scale': {
          if (!isHost && e.target !== undefined) e.offset += (e.target - e.offset) * Math.min(1, dt * 12);
          this.placeScale(e);
          break;
        }
        case 'fan':
        case 'curtain':
          if (e.plug > 0) e.plug = Math.max(0, e.plug - dt);
          break;
        case 'box':
          if (e.anim) {
            e.anim.t += dt;
            if (e.anim.t >= e.anim.dur) e.anim = null;
          }
          break;
        case 'bubble':
          if (e.respawn > 0) e.respawn = Math.max(0, e.respawn - dt);
          break;
        default:
          break;
      }
      e.t += dt;
    }
  }

  placeScale(e) {
    const ya = e.pa.baseY + e.offset;
    const yb = e.pb.baseY - e.offset;
    e.pa.dy = ya - e.pa.y;
    e.pb.dy = yb - e.pb.y;
    e.pa.y = ya;
    e.pb.y = yb;
  }

  // Compuerta: sólida mientras está cerrada (o casi). Si alguien está adentro no se cierra.
  syncGateSolid(e, chars) {
    let solid = !e.on;
    if (solid && !e.solid) {
      for (const c of chars) {
        if (!c.alive) continue;
        if (c.x + c.w / 2 > e.rect.x && c.x - c.w / 2 < e.rect.x + e.rect.w && c.y > e.rect.y && c.y - c.h < e.rect.y + e.rect.h) solid = false;
      }
    }
    if (solid !== e.solid) {
      e.solid = solid;
      this.writeGate(e, false);
    }
  }

  writeGate(e) {
    for (let k = 0; k < e.h; k++) this.map.setChar(e.tx, e.ty + k, e.solid ? '|' : '.');
  }

  // ---------- Cajas ----------
  writeBox(e, on) {
    for (let y = 0; y < e.size; y++) for (let x = 0; x < e.size; x++) this.map.setChar(e.cx + x, e.cy + y, on ? (e.size > 1 ? '&' : '%') : '.');
  }

  // ¿La caja puede moverse un tile hacia dir? (anfitrión)
  canPush(e, dir) {
    if (e.broken) return false;
    const nx = dir > 0 ? e.cx + e.size : e.cx - 1;
    for (let y = 0; y < e.size; y++) if (this.map.typeAt(nx, e.cy + y) !== 0) return false;
    return true;
  }

  // Mueve la caja a (tx, ty) (los dos; lo decide el anfitrión). Cae si no hay nada abajo.
  moveBox(e, tx, ty) {
    if (e.cx === tx && e.cy === ty) return;
    this.writeBox(e, false);
    const fx = e.cx;
    const fy = e.cy;
    e.cx = tx;
    e.cy = ty;
    this.writeBox(e, true);
    const tiles = Math.abs(tx - fx) + Math.abs(ty - fy);
    e.anim = { fx, fy, t: 0, dur: Math.abs(tx - fx) * P.BOX_SLIDE + Math.abs(ty - fy) * P.BOX_FALL || P.BOX_SLIDE };
    return tiles;
  }

  // Dónde termina la caja empujada hacia dir: 1 tile al costado y después cae
  pushTarget(e, dir) {
    if (!this.canPush(e, dir)) return null;
    const tx = e.cx + dir;
    let ty = e.cy;
    this.writeBox(e, false);
    const free = (y) => {
      for (let x = 0; x < e.size; x++) if (this.map.typeAt(tx + x, y + e.size) !== 0 || y + e.size >= this.map.h) return false;
      return true;
    };
    while (free(ty)) ty++;
    this.writeBox(e, true);
    return { tx, ty };
  }

  breakBox(e) {
    if (e.broken) return;
    e.broken = true;
    this.writeBox(e, false);
  }

  // Caja cuya área toca el rectángulo (para el mazo y los disparos)
  boxAt(rect) {
    for (const e of this.els) {
      if (e.type !== 'box' || e.broken) continue;
      const r = { x: e.cx * TS, y: e.cy * TS, w: e.size * TS, h: e.size * TS };
      if (rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y) return e;
    }
    return null;
  }

  // Lo que tapa una melcocha pegada (ventilador o cortina) — rect de la melcocha
  plugAt(rect) {
    for (const e of this.els) {
      if (e.type !== 'fan' && e.type !== 'curtain') continue;
      const r = e.type === 'fan' ? { x: e.rect.x, y: e.rect.y + e.rect.h - TS, w: e.rect.w, h: TS } : { x: e.rect.x - 4, y: e.rect.y, w: e.rect.w + 8, h: TS };
      if (rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h + 2 && rect.y + rect.h > r.y - 2) return e;
    }
    return null;
  }

  plug(id) {
    const e = this.byId.get(id);
    if (!e) return;
    e.plug = P.PLUG_TIME;
    e.on = false;
  }

  ofType(type) {
    return this.els.filter((e) => e.type === type);
  }
}
