import { describe, it, expect } from 'vitest';
import { STEALTH, HACK, VAPOR, SHIELD, DEADLINE, TOPDOWN, SCREEN } from '../src/config/balance.js';
import { castRay, canSee, conePolygon, stepSuspicion, rayCircle, angleDiff, lineOfSight } from '../src/systems/vision.js';
import { findPath, nearestPassable } from '../src/systems/pathfind.js';
import { createHack, hackInput, hackUpdate, ARROWS } from '../src/systems/hack.js';
import { createShield, shieldPress, shieldUpdate, shieldBlock, shieldOn, shieldCharge01 } from '../src/systems/shield.js';
import { createDeadline, deadlineTick, deadlineHacked, deadlineHackFailed, deadlineDamage, canHack, thirdFloor, nextAttack, ATTACK_ORDER } from '../src/systems/deadline.js';
import { level3Rooms, L3_LEGEND, OPAQUE_CHARS, HIDE_CHARS, ARENA, ROOM_ORDER } from '../src/levels/level3_novacomp/maps.js';
import { BotSeg, Laser } from '../src/entities/enemies/stealth.js';
import { Tilemap } from '../src/systems/tilemap.js';
import { createRng } from '../src/core/rng.js';

const TS = SCREEN.TILE;
const STEP = 1 / 60;
const run = (fn, seconds) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) fn(STEP);
};

// Mapa chico de prueba: '#' opaco
const ROWS = ['##########', '#........#', '#...#....#', '#........#', '##########'];
const small = new Tilemap(ROWS, { '#': 1, '.': 0 });
const opaque = (tx, ty) => small.charAt(tx, ty) === '#';

describe('Conos de visión con raycast', () => {
  it('el rayo se corta en la primera pared', () => {
    // Desde el tile (1,2) hacia la derecha: la pared está en el tile x=4 → 64 px
    expect(castRay(opaque, 24, 40, 0, 200)).toBeCloseTo(40, 3);
    // Sin paredes en el camino llega al máximo
    expect(castRay(opaque, 24, 24, 0, 60)).toBe(60);
  });

  it('ve lo que está adelante dentro del cono, no atrás ni detrás de una pared', () => {
    const v = { x: 24, y: 24, facing: 0, half: STEALTH.CONE_HALF, range: 80 };
    expect(canSee(v, 80, 24, opaque)).toBe(true);
    expect(canSee(v, 80, 24 + 80 * Math.tan(STEALTH.CONE_HALF) + 4, opaque)).toBe(false); // fuera del ángulo
    expect(canSee({ ...v, facing: Math.PI }, 80, 24, opaque)).toBe(false); // de espaldas
    expect(canSee(v, 120, 24, opaque)).toBe(false); // fuera de alcance
    const v2 = { x: 24, y: 40, facing: 0, half: STEALTH.CONE_HALF, range: 100 };
    expect(canSee(v2, 90, 40, opaque)).toBe(false); // detrás del pilar
    expect(lineOfSight(opaque, 24, 40, 50, 40)).toBe(true);
  });

  it('las nubes de vapor tapan la vista (y estar adentro también esconde)', () => {
    const v = { x: 24, y: 24, facing: 0, half: STEALTH.CONE_HALF, range: 120 };
    const cloud = { x: 70, y: 24, r: VAPOR.RADIUS / 2 };
    expect(canSee(v, 120, 24, opaque)).toBe(true);
    expect(canSee(v, 120, 24, opaque, [cloud])).toBe(false);
    expect(canSee(v, 70, 24, opaque, [cloud])).toBe(false);
    expect(rayCircle(0, 0, 1, 0, { x: 50, y: 0, r: 10 })).toBeCloseTo(40);
    expect(rayCircle(0, 0, -1, 0, { x: 50, y: 0, r: 10 })).toBe(null);
  });

  it('los drones ven en círculo', () => {
    const d = { x: 80, y: 40, facing: 0, half: Math.PI, range: STEALTH.DRONE_RADIUS };
    expect(canSee(d, 80, 40 - 20, opaque)).toBe(true);
    expect(canSee(d, 80 + 20, 40, opaque)).toBe(true);
    expect(canSee(d, 80, 40 + STEALTH.DRONE_RADIUS + 2, opaque)).toBe(false);
  });

  it('el polígono del cono sale del origen y no pasa del alcance', () => {
    const v = { x: 40, y: 24, facing: Math.PI / 2, half: STEALTH.CONE_HALF, range: 70 };
    const pts = conePolygon(v, opaque);
    expect(pts[0]).toEqual({ x: 40, y: 24 });
    expect(pts.length).toBe(STEALTH.CONE_RAYS + 2);
    for (const p of pts) expect(Math.hypot(p.x - 40, p.y - 24)).toBeLessThanOrEqual(70.001);
    expect(angleDiff(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2);
  });

  it('el vidrio, los escritorios y las barandas no tapan; paredes, racks e impresoras sí', () => {
    for (const ch of ['g', 'D', 'd', 'T', '~', 'p', 'b', 'r', 'H']) expect(OPAQUE_CHARS.has(ch), ch).toBe(false);
    for (const ch of ['#', 'W', 'S', 'P', 'G', 'L', 'K']) expect(OPAQUE_CHARS.has(ch), ch).toBe(true);
  });
});

describe('Sospecha y alarma', () => {
  it('el medidor se llena en 0.7 s (0.35 s de cerca) y baja poco a poco', () => {
    let s = 0;
    run(() => (s = stepSuspicion(s, true, 60, STEP)), STEALTH.SUSPICION_TIME - 0.05);
    expect(s).toBeLessThan(1);
    run(() => (s = stepSuspicion(s, true, 60, STEP)), 0.06);
    expect(s).toBe(1);
    let c = 0;
    run(() => (c = stepSuspicion(c, true, STEALTH.CLOSE_DIST - 4, STEP)), STEALTH.SUSPICION_TIME_CLOSE + 0.01);
    expect(c).toBe(1);
    let d = 1;
    run(() => (d = stepSuspicion(d, false, 0, STEP)), 1);
    expect(d).toBeCloseTo(1 - STEALTH.SUSPICION_DECAY, 2);
  });

  it('números del documento: 60°, alarma de 12 s, ruido 40/80 px, sigilo a 35 px/s', () => {
    expect((STEALTH.CONE_HALF * 2 * 180) / Math.PI).toBeCloseTo(60);
    expect(STEALTH.BOT_RANGE).toBeGreaterThanOrEqual(72);
    expect(STEALTH.CAMERA_RANGE).toBeLessThanOrEqual(96);
    expect(STEALTH.ALARM_TIME).toBe(12);
    expect(STEALTH.NOISE_RUN_RADIUS).toBe(40);
    expect(STEALTH.NOISE_SHOT_RADIUS).toBe(80);
    expect(TOPDOWN.SNEAK_SPEED).toBe(35);
    expect(STEALTH.STUN_BOT).toBe(2);
    expect(STEALTH.STUN_CAMERA).toBe(3);
    expect(STEALTH.BOT_CHASE_SPEED).toBeLessThan(TOPDOWN.WALK_SPEED); // se puede huir
  });
});

// Mundo de prueba para un BotSeg
function botWorld(map, target) {
  const pass = (tx, ty) => !map.isSolid(tx, ty);
  const events = [];
  return {
    events,
    isOpaque: (tx, ty) => map.charAt(tx, ty) === '#',
    passable: pass,
    clouds: [],
    target,
    alarm: false,
    alarmPos: null,
    path: (x0, y0, x1, y1) => {
      const p = findPath(pass, map.w, map.h, Math.floor(x0 / TS), Math.floor(y0 / TS), Math.floor(x1 / TS), Math.floor(y1 / TS));
      return p ? p.map((q) => ({ x: q.tx * TS + 8, y: q.ty * TS + 12 })) : null;
    },
    noticed: () => events.push('?'),
    raiseAlarm: () => events.push('!'),
    spotted: () => events.push('spot'),
  };
}

describe('BotSeg', () => {
  const big = new Tilemap(['############', '#..........#', '#..........#', '#..........#', '############'], { '#': 1, '.': 0 });

  it('si Choco se queda en el cono: "?" y después la alarma', () => {
    const bot = new BotSeg({ id: 't', path: [[2, 2], [9, 2]] });
    const w = botWorld(big, { x: bot.x + 50, y: bot.y - 6, footX: bot.x + 50, footY: bot.y, visible: true });
    bot.facing = 0;
    bot.wait = 5;
    run((dt) => bot.update(dt, w), 0.4);
    expect(w.events[0]).toBe('?');
    expect(bot.state).toBe('suspicious');
    run((dt) => bot.update(dt, w), 0.4);
    expect(w.events).toContain('!');
  });

  it('el ruido lo manda a revisar el punto; el báculo lo aturde 2 s', () => {
    const bot = new BotSeg({ id: 't', path: [[2, 2], [9, 2]] });
    const w = botWorld(big, { x: 0, y: 0, footX: 0, footY: 0, visible: false });
    bot.hear(6 * TS + 8, 3 * TS + 12, w);
    expect(bot.state).toBe('investigate');
    expect(bot.route.length).toBeGreaterThan(0);
    bot.stunFor(STEALTH.STUN_BOT);
    expect(bot.active).toBe(false);
    run((dt) => bot.update(dt, w), STEALTH.STUN_BOT + 0.05);
    expect(bot.active).toBe(true);
  });

  it('una terminal puede desviar su ruta', () => {
    const bot = new BotSeg({ id: 't', path: [[2, 2], [9, 2]], alt: [[2, 3], [9, 3]] });
    bot.divert();
    expect(bot.path[0]).toEqual({ x: 2 * TS + 8, y: 3 * TS + 12 });
    expect(bot.state).toBe('return');
  });
});

describe('Láseres rítmicos', () => {
  it('apagado → parpadeo de aviso → prendido, y el hackeo los apaga 6 s', () => {
    const l = new Laser({ id: 'l', x: 3, y0: 1, y1: 3, phase: 0 });
    expect(l.phase).toBe('off');
    l.t = STEALTH.LASER_OFF - STEALTH.LASER_WARN + 0.01;
    expect(l.phase).toBe('warn');
    l.t = STEALTH.LASER_OFF + 0.01;
    expect(l.on).toBe(true);
    l.turnOff(STEALTH.LASER_HACK_OFF);
    expect(l.on).toBe(false);
    expect(STEALTH.LASER_WARN).toBeGreaterThanOrEqual(0.4); // telegrafiado
  });
});

describe('Búsqueda de caminos', () => {
  const pass = (tx, ty) => small.charAt(tx, ty) !== '#';
  it('rodea las paredes y devuelve el camino más corto', () => {
    const p = findPath(pass, small.w, small.h, 1, 2, 6, 2);
    expect(p[p.length - 1]).toEqual({ tx: 6, ty: 2 });
    expect(p.length).toBe(7); // rodea el pilar de (4,2)
    for (const q of p) expect(pass(q.tx, q.ty)).toBe(true);
  });
  it('sin camino devuelve null; el tile libre más cercano', () => {
    expect(findPath(pass, small.w, small.h, 1, 1, 0, 0)).toBe(null);
    expect(nearestPassable(pass, small.w, small.h, 4, 2)).not.toBe(null);
  });
});

describe('Hackeo', () => {
  it('secuencias según el documento (4 a 7 flechas, 2.5 a 4 s)', () => {
    for (const cfg of Object.values(HACK).filter((v) => v && v.LENGTH)) {
      expect(cfg.LENGTH).toBeGreaterThanOrEqual(4);
      expect(cfg.LENGTH).toBeLessThanOrEqual(7);
      expect(cfg.TIME).toBeGreaterThanOrEqual(2.5);
      expect(cfg.TIME).toBeLessThanOrEqual(4);
    }
    expect(HACK.SAFE).toEqual({ LENGTH: 7, TIME: 2.5 });
    expect(HACK.BOSS).toEqual({ LENGTH: 6, TIME: 3 });
  });

  it('se completa ingresando las flechas en orden', () => {
    const h = createHack(HACK.NORMAL, createRng(3));
    expect(h.seq.length).toBe(HACK.NORMAL.LENGTH);
    for (const a of h.seq) expect(ARROWS).toContain(a);
    for (let i = 0; i < h.seq.length - 1; i++) expect(hackInput(h, h.seq[i])).toBe('ok');
    expect(hackInput(h, h.seq[h.seq.length - 1])).toBe('done');
  });

  it('un error reinicia la secuencia; tres errores hacen fallar', () => {
    const h = createHack(HACK.NORMAL, createRng(5));
    const wrong = (d) => ARROWS.find((a) => a !== d);
    hackInput(h, h.seq[0]);
    expect(hackInput(h, wrong(h.seq[1]))).toBe('error');
    expect(h.idx).toBe(0);
    expect(hackInput(h, wrong(h.seq[0]))).toBe('error');
    expect(hackInput(h, wrong(h.seq[0]))).toBe('fail');
    expect(h.status).toBe('fail');
  });

  it('se acaba el tiempo', () => {
    const h = createHack(HACK.SAFE, createRng(7));
    run((dt) => hackUpdate(h, dt), HACK.SAFE.TIME + 0.05);
    expect(h.status).toBe('timeout');
  });

  it('nunca tres flechas iguales seguidas', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = createHack(HACK.SAFE, createRng(seed)).seq;
      for (let i = 2; i < s.length; i++) expect(s[i] === s[i - 1] && s[i] === s[i - 2]).toBe(false);
    }
  });
});

describe('Escudo Firewall', () => {
  it('dura 1.5 s y recarga 3.5 s', () => {
    const s = createShield();
    expect(shieldPress(s)).toBe(true);
    expect(shieldOn(s)).toBe(true);
    expect(shieldPress(s)).toBe(false);
    run((dt) => shieldUpdate(s, dt), SHIELD.DURATION + 0.02);
    expect(shieldOn(s)).toBe(false);
    expect(shieldPress(s)).toBe(false); // recargando
    expect(shieldCharge01(s)).toBeLessThan(0.05);
    run((dt) => shieldUpdate(s, dt), SHIELD.COOLDOWN + 0.02);
    expect(shieldCharge01(s)).toBe(1);
    expect(shieldPress(s)).toBe(true);
  });

  it('parry si el golpe llega en los primeros 0.15 s; después solo bloquea', () => {
    const s = createShield();
    expect(shieldBlock(s)).toBe(null);
    shieldPress(s);
    run((dt) => shieldUpdate(s, dt), 0.1);
    expect(shieldBlock(s)).toBe('parry');
    run((dt) => shieldUpdate(s, dt), 0.1);
    expect(shieldBlock(s)).toBe('block');
    expect(SHIELD.PARRY_WINDOW).toBe(0.15);
    expect(SHIELD.MOVE_MULT).toBe(0.6);
  });
});

describe('DEADLINE', () => {
  it('cuenta regresiva de 3:00; al vencerse vuelve a 1:00', () => {
    const b = createDeadline();
    expect(b.countdown).toBe(180);
    let ev = [];
    run((dt) => (ev = ev.concat(deadlineTick(b, dt))), 180.05);
    expect(ev).toContain('expired');
    expect(b.countdown).toBeCloseTo(DEADLINE.COUNTDOWN_RESET, 0);
  });

  it('solo recibe daño congelado; 8 disparos normales vacían un tercio', () => {
    const b = createDeadline();
    expect(deadlineDamage(b, 1).dealt).toBe(0);
    expect(deadlineHacked(b, 0)).toBe(true);
    expect(canHack(b, 1)).toBe(false); // ya está congelado
    const before = b.countdown;
    run((dt) => deadlineTick(b, dt), 1);
    expect(b.countdown).toBe(before); // el reloj no corre congelado
    for (let i = 0; i < 7; i++) expect(deadlineDamage(b, 1).thirdDone).toBe(false);
    const r = deadlineDamage(b, 1);
    expect(r.thirdDone).toBe(true);
    expect(b.third).toBe(1);
    expect(b.terminals[0].state).toBe('done');
    expect(b.frozen).toBe(0);
  });

  it('los cargados vacían el tercio en menos disparos y no pasan al siguiente', () => {
    const b = createDeadline();
    deadlineHacked(b, 1);
    deadlineDamage(b, 3);
    deadlineDamage(b, 3);
    const r = deadlineDamage(b, 3);
    expect(r.thirdDone).toBe(true);
    expect(r.dealt).toBe(2);
    expect(b.hp).toBe(thirdFloor(b) + DEADLINE.HP_PER_THIRD);
  });

  it('si no alcanza, la terminal se reinicia; tres errores la bloquean', () => {
    const b = createDeadline();
    deadlineHacked(b, 2);
    deadlineDamage(b, 1);
    let ev = [];
    run((dt) => (ev = ev.concat(deadlineTick(b, dt))), DEADLINE.FREEZE + 0.05);
    expect(ev).toContain('thaw');
    expect(b.terminals[2].state).toBe('reboot');
    run((dt) => deadlineTick(b, dt), DEADLINE.REBOOT + 0.05);
    expect(canHack(b, 2)).toBe(true);
    deadlineHackFailed(b, 0);
    expect(canHack(b, 0)).toBe(false);
    run((dt) => deadlineTick(b, dt), HACK.BOSS_LOCK + 0.05);
    expect(canHack(b, 0)).toBe(true);
  });

  it('tres tercios y cae; los ataques se turnan', () => {
    const b = createDeadline();
    for (let i = 0; i < 3; i++) {
      deadlineHacked(b, i);
      for (let k = 0; k < DEADLINE.HP_PER_THIRD; k++) deadlineDamage(b, 1);
    }
    expect(b.defeated).toBe(true);
    const c = createDeadline();
    expect([nextAttack(c), nextAttack(c), nextAttack(c), nextAttack(c)]).toEqual([...ATTACK_ORDER, ATTACK_ORDER[0]]);
    // Más proyectiles por abanico en cada tercio y manecillas más rápidas
    expect(DEADLINE.FAN_COUNTS[0]).toEqual([5, 8]);
    for (let i = 1; i < 3; i++) expect(DEADLINE.SWEEP_TIME[i]).toBeLessThan(DEADLINE.SWEEP_TIME[i - 1]);
    expect(DEADLINE.SWEEP_TELEGRAPH).toBeGreaterThanOrEqual(1);
    expect(DEADLINE.NOTIF_LIFE).toBe(4);
  });
});

describe('Mapas del nivel 3', () => {
  const rooms = level3Rooms();
  const tm = (R) => new Tilemap([...R.rows], L3_LEGEND);

  it('las 6 salas en orden, rectangulares y con checkpoints donde dice el documento', () => {
    expect(Object.keys(rooms)).toEqual(ROOM_ORDER);
    for (const R of Object.values(rooms)) {
      const w = R.rows[0].length;
      for (const r of R.rows) expect(r.length, R.id).toBe(w);
      for (const ch of R.rows.join('')) expect(L3_LEGEND[ch] !== undefined || 'tAx'.includes(ch), `${R.id} "${ch}"`).toBe(true);
    }
    expect(['lobby', 'openspace', 'gerencia', 'servers'].every((id) => rooms[id].checkpoint)).toBe(true);
    expect(rooms.terrace.checkpoint).toBe(false);
  });

  it('cada puerta lleva a una sala que tiene la puerta de vuelta', () => {
    for (const R of Object.values(rooms)) {
      for (const d of R.doors) {
        if (d.to === 'exit') continue;
        expect(rooms[d.to], `${R.id} → ${d.to}`).toBeDefined();
        expect(rooms[d.to].doors.some((q) => q.to === R.id), `${d.to} ↩ ${R.id}`).toBe(true);
      }
    }
  });

  it('todo se puede alcanzar desde las puertas (rutas, terminales, escondites, bits, Y)', () => {
    for (const R of Object.values(rooms)) {
      const m = tm(R);
      // Las puertas cerradas cuentan como abiertas para esta prueba
      const pass = (tx, ty) => !m.isSolid(tx, ty) || m.charAt(tx, ty) === 'G';
      const d = R.doors[0];
      const sx = d.side === 'W' ? 1 : d.side === 'E' ? m.w - 2 : d.at;
      const sy = d.side === 'N' ? 2 : d.side === 'S' ? m.h - 2 : d.at;
      const reach = (tx, ty) => (tx === sx && ty === sy) || findPath(pass, m.w, m.h, sx, sy, tx, ty) !== null;
      // Puertas
      for (const q of R.doors) {
        const tx = q.side === 'W' ? 1 : q.side === 'E' ? m.w - 2 : q.at;
        const ty = q.side === 'N' ? 2 : q.side === 'S' ? m.h - 2 : q.at;
        expect(reach(tx, ty), `${R.id} puerta ${q.to}`).toBe(true);
      }
      // Rutas de los bots: tramos rectos sobre piso
      for (const b of R.bots) {
        for (const path of [b.path, b.alt].filter(Boolean)) {
          const pts = b.loop && path === b.path ? [...path, path[0]] : path;
          for (let i = 0; i < pts.length - 1; i++) {
            const [x0, y0] = pts[i];
            const [x1, y1] = pts[i + 1];
            expect(x0 === x1 || y0 === y1, `${b.id} tramo recto`).toBe(true);
            for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) expect(m.isSolid(x, y), `${R.id}/${b.id} (${x},${y})`).toBe(false);
          }
          expect(reach(path[0][0], path[0][1]), `${b.id}`).toBe(true);
        }
      }
      // Terminales, escondites y caja fuerte: con un lado libre alcanzable
      const sideFree = (tx, ty) => [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => !m.isSolid(tx + dx, ty + dy) && reach(tx + dx, ty + dy));
      for (const t of R.terminals) {
        expect('HK'.includes(m.charAt(t.x, t.y)), `${R.id}/${t.id}`).toBe(true);
        expect(sideFree(t.x, t.y), `${R.id}/${t.id}`).toBe(true);
        if (t.target) {
          for (const id of t.target.split(',')) {
            const all = [...R.cameras, ...R.bots, ...R.lasers].map((e) => e.id);
            expect(all, `${t.id} → ${id}`).toContain(id);
          }
        }
      }
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (HIDE_CHARS.has(m.charAt(tx, ty))) expect(sideFree(tx, ty), `${R.id} escondite (${tx},${ty})`).toBe(true);
      for (const [x, y] of R.bits) expect(!m.isSolid(x, y) && reach(x, y), `${R.id} bit (${x},${y})`).toBe(true);
      if (R.golden) expect(!m.isSolid(R.golden.x, R.golden.y) && reach(R.golden.x, R.golden.y), `${R.id} Y`).toBe(true);
      for (const v of R.vacuums) expect(!m.isSolid(v.x, v.y), `${R.id} aspiradora`).toBe(true);
      // Cámaras: el "ojo" queda fuera de la pared
      for (const k of R.cameras) {
        const side = k.side || 'N';
        const ex = side === 'N' ? k.x : side === 'E' ? k.x - 1 : k.x + 1;
        const ey = side === 'N' ? k.y + 1 : k.y;
        expect(OPAQUE_CHARS.has(m.charAt(ex, ey)), `${R.id}/${k.id}`).toBe(false);
      }
    }
  });

  it('las 3 Y doradas: caja fuerte, terraza y el escritorio de Choco (solo con Vista Debug)', () => {
    const ys = Object.values(rooms).filter((R) => R.golden).map((R) => R.golden);
    expect(ys.map((g) => g.index).sort()).toEqual([0, 1, 2]);
    expect(rooms.gerencia.golden.fromSafe).toBe(true);
    expect(rooms.openspace.golden.debugOnly).toBe(true);
    expect(rooms.terrace.golden).toBeTruthy();
    expect(rooms.terrace.drones.length).toBeGreaterThanOrEqual(5); // 2 del tutorial + 3 del toldo
    expect(rooms.gerencia.terminals.find((t) => t.effect === 'safe').cfg).toBe('SAFE');
  });

  it('cada sección tiene más de una forma: terminales, escondites o rutas alternativas', () => {
    for (const id of ['lobby', 'openspace', 'gerencia']) {
      const R = rooms[id];
      const hides = R.rows.join('').split('').filter((c) => HIDE_CHARS.has(c)).length;
      expect(R.terminals.length + hides, id).toBeGreaterThanOrEqual(2);
    }
    // Gerencia: pasillo directo y sala de impresión unidos por dos pasos
    const g = rooms.gerencia.rows;
    expect(g[10][3] + g[10][4] + g[10][30] + g[10][31]).toBe('....');
  });

  it('arena de DEADLINE: 20×11 tiles, 4 columnas-servidor y 3 terminales en los bordes', () => {
    const R = rooms.servers;
    const m = tm(R);
    expect(m.w - 2).toBe(20);
    expect(m.h - 3).toBe(11); // sin la cara de la pared
    let racks = 0;
    for (let y = 2; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (m.charAt(x, y) === 'S') racks++;
    expect(racks).toBe(16);
    for (const [x, y] of [...ARENA.terminals, ...ARENA.terminalsLate]) expect(m.isSolid(x, y), `(${x},${y})`).toBe(false);
    expect(ARENA.terminals.length).toBe(3);
    expect(m.isSolid(Math.floor(ARENA.center.x), Math.floor(ARENA.center.y))).toBe(false);
  });
});

// ---------- Contenido ----------
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';
import { GLYPHS } from '../src/art/fontData.js';
import { SONG_NOVACOMP, SONG_DEADLINE } from '../src/audio/songs/novacomp.js';
import { parseTrack, trackLength } from '../src/core/audio.js';
import { allNovaTileRows, NOVA_PAL } from '../src/art/tiles/novacomp.js';
import { buildBotRows, buildDroneRows, buildVacuumRows, buildTurretRows, NOVA_ENEMY_PAL } from '../src/art/enemies/novacomp.js';
import { SFX } from '../src/audio/sfx.js';

function strings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((v) => strings(v, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out));
  return out;
}
const checkRows = (rows, pal, w, h, label) => {
  expect(rows.length, label).toBe(h);
  for (const r of rows) {
    expect(r.length, label).toBe(w);
    for (const ch of r) if (ch !== '.') expect(pal[ch], `${label} "${ch}"`).toBeDefined();
  }
};

describe('Contenido del nivel 3', () => {
  it('los textos usan solo letras de la fuente; los rótulos siguen sin Y', () => {
    const missing = new Set();
    const fnTexts = [TEXTS.level3.sneakHint('Shift'), TEXTS.level3.vaporHint('C'), TEXTS.level3.hack.cancel('X'), TEXTS.level3.practice.block('C', 1, 2), TEXTS.level3.practice.parry(1, 2)];
    for (const s of [...strings(TEXTS.level3), ...fnTexts]) for (const ch of s) if (!GLYPHS[ch]) missing.add(ch);
    expect([...missing]).toEqual([]);
    for (const [k, t] of Object.entries(TEXTS.level3.signs)) expect(/[yY]/.test(t), k).toBe(false);
  });

  it('Hezron: sabores distintos y las frases de la historia', () => {
    const f = TEXTS.level3.flavors;
    expect(new Set(f).size).toBe(f.length);
    expect(f.length).toBeGreaterThanOrEqual(6);
    expect(DIALOGUES.hezronRescue[0].text).toContain('mango con chile');
    expect(DIALOGUES.hezronRescue.some((l) => l.text.includes('pocas cargas'))).toBe(true);
    expect(DIALOGUES.hezronShield.map((l) => l.text).join(' ')).toContain('tercer piso');
    expect(DIALOGUES.deadlineDefeat[0].text).toBe('Tranqui. Ya no hay prisa.');
    expect(TEXTS.level3.boss.noDate).toBe('SIN FECHA DE ENTREGA');
    expect(TEXTS.level3.daily.join(' ')).toContain('Sin bloqueos');
  });

  it('canciones: canales sincronizados y la capa de alarma', () => {
    for (const song of [SONG_NOVACOMP, SONG_DEADLINE]) {
      const lens = song.channels.map((c) => {
        const t = parseTrack(c.notes);
        for (const n of t) if (n.note && !n.drum) expect(n.midi, `${song.id}/${c.id}: ${n.note}`).not.toBeNull();
        return trackLength(t);
      });
      for (const l of lens) expect(Math.max(...lens) % l, `${song.id}: ${lens}`).toBe(0);
      for (const l of lens) expect(l % 16, song.id).toBe(0);
    }
    expect(SONG_NOVACOMP.channels.some((c) => c.layer === 'alarm')).toBe(true);
  });

  it('efectos de sonido del sigilo, el escudo y DEADLINE', () => {
    for (const k of ['suspicious', 'alert', 'alarm', 'calm', 'hackKey', 'hackError', 'hackOk', 'vapor', 'stun', 'shieldOn', 'shieldBlock', 'parry', 'tick', 'tock', 'envelope', 'notif', 'freeze', 'expired', 'clockBreak', 'turretShot', 'vacuumBump', 'laserOn']) {
      expect(typeof SFX[k], k).toBe('function');
    }
  });

  it('tiles y enemigos: tamaños y paleta', () => {
    for (const [k, rows] of Object.entries(allNovaTileRows())) checkRows(rows, NOVA_PAL, 16, 16, `tile ${k}`);
    for (const dir of ['down', 'up', 'side']) for (const f of [0, 1]) checkRows(buildBotRows(`${dir}:${f}`), NOVA_ENEMY_PAL, 16, 16, `bot ${dir}`);
    for (const f of ['0', '1']) {
      checkRows(buildDroneRows(f), NOVA_ENEMY_PAL, 16, 12, 'dron');
      checkRows(buildVacuumRows(f), NOVA_ENEMY_PAL, 16, 12, 'aspiradora');
      checkRows(buildTurretRows(f), NOVA_ENEMY_PAL, 16, 16, 'torreta');
    }
    // Todos los tiles del mapa tienen arte
    const art = allNovaTileRows();
    for (const R of Object.values(level3Rooms())) for (const ch of new Set(R.rows.join(''))) if (!'.tAx'.includes(ch)) expect(art[ch], `${R.id} "${ch}"`).toBeDefined();
  });
});
