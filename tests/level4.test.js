import { describe, it, expect } from 'vitest';
import { HEAT, LASSO, TORITO, ENEMIES, PLATFORMER, SCREEN, REDONDEL } from '../src/config/balance.js';
import { createHeat, heatStep, heatCool, heatDripping, inZones, castShade } from '../src/systems/heat.js';
import { pickNode, nodeInReach, createSwing, swingStep, releaseVelocity, clearLine } from '../src/systems/lasso.js';
import { createBody, createJumpState, stepPlatformer } from '../src/systems/physics.js';
import { level4Sections, SC_LEGEND, L4_CHECKPOINTS } from '../src/levels/level4_santacruz/maps.js';
import { toritoPhase, toritoCanDamage, nextToritoAttack, Torito } from '../src/entities/bosses/torito.js';
import { Toro, Bombeta } from '../src/entities/enemies/santacruz.js';
import { Tilemap, T } from '../src/systems/tilemap.js';
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';
import { SONG_SANTACRUZ, SONG_TORITO, SONG_ATARDECER } from '../src/audio/songs/santacruz.js';

const TS = SCREEN.TILE;
const STEP = 1 / 60;
const run = (fn, seconds) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) fn(STEP);
};

describe('Calor', () => {
  it('al sol sube 11/s y en la sombra baja 30/s', () => {
    const h = createHeat();
    run((dt) => heatStep(h, dt, true), 2);
    expect(h.value).toBeCloseTo(22, 0);
    run((dt) => heatStep(h, dt, false), 0.5);
    expect(h.value).toBeCloseTo(7, 0);
    run((dt) => heatStep(h, dt, false), 2);
    expect(h.value).toBe(0);
  });

  it('al llegar a 100 quema un cuadrito y baja a 40', () => {
    const h = createHeat();
    let burns = 0;
    run((dt) => heatStep(h, dt, true) === 'burn' && burns++, 100 / HEAT.SUN_RATE + 0.05);
    expect(burns).toBe(1);
    expect(h.value).toBeGreaterThanOrEqual(HEAT.AFTER_DAMAGE);
    expect(h.value).toBeLessThan(HEAT.AFTER_DAMAGE + 2);
  });

  it('gotea desde 60 y el agua lo enfría de golpe', () => {
    const h = createHeat();
    h.value = 59;
    expect(heatDripping(h)).toBe(false);
    h.value = 60;
    expect(heatDripping(h)).toBe(true);
    heatCool(h);
    expect(h.value).toBe(0);
  });

  it('la fase 2 del jefe quema más rápido', () => {
    const a = createHeat();
    const b = createHeat();
    run((dt) => heatStep(a, dt, true), 1);
    run((dt) => heatStep(b, dt, true, HEAT.SUN_RATE_BOSS2), 1);
    expect(b.value).toBeGreaterThan(a.value + 4);
  });

  it('la sombra se proyecta hacia abajo hasta el suelo, columna por columna', () => {
    const rows = ['......', '......', '......', '...#..', '######'];
    const m = new Tilemap(rows);
    const zones = castShade({ x: 16, w: 64, y: 16 }, (x, y) => m.isSolid(x, y), m.h, TS);
    expect(zones.length).toBe(4);
    // Bajo el bloque de la columna 3 la sombra termina antes
    const z3 = zones.find((z) => z.x === 48);
    expect(z3.y + z3.h).toBe(48);
    const z1 = zones.find((z) => z.x === 16);
    expect(z1.y + z1.h).toBe(64);
    expect(inZones(zones, 20, 50)).toBe(true);
    expect(inZones(zones, 20, 70)).toBe(false);
    expect(inZones(zones, 100, 50)).toBe(false);
    // Con alto limitado (techo de manta de las gradas)
    const limited = castShade({ x: 16, w: 16, y: 16, h: 20 }, (x, y) => m.isSolid(x, y), m.h, TS);
    expect(limited[0].h).toBe(20);
  });
});

describe('Lazo de Fibra Óptica', () => {
  const hand = { x: 100, y: 100 };

  it('alcanza nodos a 90 px en un cono de 120° hacia adelante o hacia arriba', () => {
    expect(nodeInReach({ x: 180, y: 100 }, hand, 1)).toBe(true);
    expect(nodeInReach({ x: 195, y: 100 }, hand, 1)).toBe(false); // fuera de rango
    expect(nodeInReach({ x: 20, y: 100 }, hand, 1)).toBe(false); // detrás
    expect(nodeInReach({ x: 60, y: 30 }, hand, 1)).toBe(true); // arriba (dentro del cono vertical)
    expect(nodeInReach({ x: 130, y: 160 }, hand, 1)).toBe(false); // abajo
  });

  it('elige el nodo más cercano con la vista libre', () => {
    const nodes = [
      { x: 170, y: 80 },
      { x: 140, y: 70 },
    ];
    expect(pickNode(nodes, hand, 1)).toBe(nodes[1]);
    // Una pared entre la mano y el nodo cercano: elige el otro
    const wall = (tx, ty) => tx === 8 && ty === 4;
    expect(clearLine(wall, TS, hand.x, hand.y, 140, 70)).toBe(false);
    expect(pickNode(nodes, hand, 1, wall)).toBe(nodes[0]);
  });

  it('la cuerda es rígida: la distancia al nodo no cambia al columpiarse', () => {
    const node = { x: 100, y: 0 };
    const s = createSwing(node, 160, 0, 0, 0);
    expect(s.len).toBeCloseTo(60, 3);
    for (let i = 0; i < 120; i++) {
      swingStep(s, STEP);
      expect(Math.hypot(s.px - node.x, s.py - node.y)).toBeCloseTo(60, 3);
    }
  });

  it('la longitud se limita entre 24 y 90 px y se acorta con ↑', () => {
    const node = { x: 0, y: 0 };
    expect(createSwing(node, 0, 200, 0, 0).len).toBe(LASSO.MAX_LEN);
    expect(createSwing(node, 0, 5, 0, 0).len).toBe(LASSO.MIN_LEN);
    const s = createSwing(node, 0, 60, 0, 0);
    run((dt) => swingStep(s, dt, { reel: -1 }), 0.5);
    expect(s.len).toBeCloseTo(60 - LASSO.REEL_SPEED * 0.5, 0);
  });

  it('el péndulo oscila y bombear con ← → lo hace crecer', () => {
    const node = { x: 0, y: 0 };
    const free = createSwing(node, 40, 40, 0, 0);
    let maxLeft = 0;
    run((dt) => {
      swingStep(free, dt);
      maxLeft = Math.min(maxLeft, free.px);
    }, 2);
    expect(maxLeft).toBeLessThan(-30); // pasa al otro lado
    const pumped = createSwing(node, 10, 60, 0, 0);
    let maxX = 0;
    run((dt) => {
      swingStep(pumped, dt, { moveX: Math.sign(pumped.vx) || 1 });
      maxX = Math.max(maxX, Math.abs(pumped.px));
    }, 4);
    expect(maxX).toBeGreaterThan(45);
  });

  it('al soltar conserva la velocidad tangencial y suma −120 hacia arriba', () => {
    const s = createSwing({ x: 0, y: 0 }, 0, 50, 200, 0);
    const v = releaseVelocity(s);
    expect(v.vx).toBeCloseTo(200, 3);
    expect(v.vy).toBeCloseTo(LASSO.RELEASE_VY, 3);
  });

  it('recién lanzado, en el aire conserva el impulso por encima de la velocidad máxima', () => {
    const map = new Tilemap(['..........'.repeat(20)]);
    const mk = () => {
      const b = createBody(10, 0, 10, 20);
      b.vx = 250;
      return b;
    };
    const kept = mk();
    const normal = mk();
    for (let i = 0; i < 15; i++) {
      stepPlatformer(kept, createJumpState(), { moveX: 1, keepMomentum: true }, STEP, map);
      stepPlatformer(normal, createJumpState(), { moveX: 1 }, STEP, map);
    }
    expect(kept.vx).toBeCloseTo(250, 3);
    expect(normal.vx).toBeLessThan(200);
  });
});

describe('Mapas de Santa Cruz', () => {
  const S = level4Sections();
  const tm = (id) => new Tilemap(S[id].rows, SC_LEGEND);

  it('todas las filas tienen el mismo ancho', () => {
    for (const [id, s] of Object.entries(S)) {
      const w = s.rows[0].length;
      for (const r of s.rows) expect(r.length, id).toBe(w);
    }
  });

  it('3 Y doradas: techos de la plaza, el redondel (dinámica) y el atardecer', () => {
    expect(tm('B').find('Y').length).toBe(1);
    expect(tm('E').find('Y').length).toBe(1);
    expect(S.C.ring.golden).toBeTruthy();
    for (const id of ['A', 'C', 'D', 'arena']) expect(tm(id).find('Y').length, id).toBe(0);
  });

  it('la Y de la plaza está sobre el camino de plataformas fantasma', () => {
    const m = tm('B');
    const y = m.find('Y')[0];
    let ghost = false;
    for (let ty = y.ty + 1; ty < y.ty + 4; ty++) for (let tx = y.tx - 1; tx <= y.tx + 1; tx++) ghost ||= m.typeAt(tx, ty) === T.GHOST;
    expect(ghost).toBe(true);
  });

  it('el patio de la rosquilla no se alcanza desde la calle sin la Vista Debug', () => {
    const m = tm('B');
    const floorY = S.B.floor * TS;
    const patioY = S.B.oven.floorRow * TS;
    // Doble salto: ≈ 50 + 39 px. El piso del patio está más alto que eso.
    const reach = (PLATFORMER.JUMP_SPEED ** 2 + PLATFORMER.DOUBLE_JUMP_SPEED ** 2) / (2 * PLATFORMER.GRAVITY_UP);
    expect(floorY - patioY).toBeGreaterThan(reach + 10);
    // Las paredes del patio lo cierran por los costados
    expect(m.isSolid(80, 3)).toBe(true);
    expect(m.isSolid(91, 3)).toBe(true);
  });

  it('los checkpoints del mapa coinciden con la lista', () => {
    for (const sec of ['B', 'C', 'D', 'E']) {
      expect(tm(sec).find('!').length, sec).toBe(L4_CHECKPOINTS.filter((c) => c.section === sec).length);
    }
  });

  it('las ruinas se pueden escalar: cada escalón queda al alcance del doble salto', () => {
    const m = tm('D');
    // Plataformas: tramos de tiles sólidos, de un sentido o fantasma + las que se desmoronan
    const plats = [];
    for (let ty = 2; ty < m.h - 2; ty++) {
      let start = -1;
      for (let tx = 2; tx <= 18; tx++) {
        const t = m.typeAt(tx, ty);
        const ok = tx < 18 && (t === T.SOLID || t === T.ONEWAY || t === T.GHOST) && m.typeAt(tx, ty - 1) !== T.SOLID;
        if (ok && start < 0) start = tx;
        if (!ok && start >= 0) {
          plats.push({ x0: start, x1: tx - 1, y: ty });
          start = -1;
        }
      }
    }
    for (const c of S.D.crumbles) plats.push({ x0: c.x, x1: c.x + c.w - 1, y: c.y });
    // Desde el suelo, buscar por anchura cuáles se alcanzan
    const ground = { x0: 2, x1: 17, y: S.D.floor };
    const seen = new Set([ground]);
    const queue = [ground];
    while (queue.length) {
      const p = queue.shift();
      for (const q of plats) {
        if (seen.has(q)) continue;
        const up = p.y - q.y;
        const gap = Math.max(0, q.x0 - p.x1 - 1, p.x0 - q.x1 - 1);
        if (up <= 5 && up >= -12 && gap <= (up >= 3 ? 3 : 5)) {
          seen.add(q);
          queue.push(q);
        }
      }
    }
    const top = plats.find((p) => p.y === S.D.top && p.x0 <= 4 && p.x1 >= 4);
    expect(top).toBeTruthy();
    expect(seen.has(top)).toBe(true);
  });

  it('la arena tiene dos columnas con capitel y espacio para el toro entre ellas', () => {
    const m = tm('arena');
    const cols = [...new Set(m.find('c').map((c) => c.tx))];
    expect(cols.length).toBe(2);
    const [a, b] = cols.sort((x, y) => x - y);
    expect((b - a - 1) * TS).toBeGreaterThanOrEqual(TORITO.W);
    expect((a - 1) * TS).toBeGreaterThanOrEqual(TORITO.W);
    for (const x of cols) expect(m.charAt(x, S.arena.floor - 4)).toBe('=');
  });

  it('los nodos del barranco quedan al alcance del lazo desde la cornisa anterior', () => {
    const m = tm('E');
    const nodes = m
      .find('n')
      .map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8 }))
      .sort((a, b) => a.x - b.x);
    expect(nodes.length).toBe(9);
    // El primero, desde el borde del suelo inicial
    const edge = { x: 6 * TS - 6, y: S.E.floor * TS + LASSO.HAND_Y };
    expect(nodeInReach(nodes[0], edge, 1)).toBe(true);
    // Los de la cadena del reto 3 están a menos de 2 × el alcance entre sí
    const chain = nodes.filter((n) => n.x > 38 * TS && n.x < 62 * TS);
    expect(chain.length).toBe(5);
    for (let i = 1; i < chain.length; i++) expect(chain[i].x - chain[i - 1].x).toBeLessThanOrEqual(LASSO.RANGE);
  });

  it('reto 1: columpiándose desde el primer nodo se llega al otro lado', () => {
    const map = new Tilemap(S.E.rows, SC_LEGEND);
    const node = map
      .find('n')
      .map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8 }))
      .sort((a, b) => a.x - b.x)[0];
    // Engancha corriendo desde el borde, bombea a favor y suelta subiendo, ya pasado el nodo.
    // En el aire corrige hacia el centro de la otra orilla (como haría quien juega).
    const target = 16.5 * TS;
    const landings = [];
    for (const rel of [30, 40, 50, 60, 70]) {
      const s = createSwing(node, 6 * TS - 6, S.E.floor * TS + LASSO.HAND_Y, PLATFORMER.MAX_SPEED, 0);
      let released = null;
      for (let i = 0; i < 600 && !released; i++) {
        swingStep(s, STEP, { moveX: Math.sign(s.vx) || 1 });
        if (s.px > node.x + rel && s.vx > 0 && s.vy < 0) released = releaseVelocity(s);
      }
      const body = createBody(s.px - 5, s.py - LASSO.HAND_Y - 20, 10, 20);
      body.vx = released.vx;
      body.vy = released.vy;
      const js = createJumpState();
      for (let i = 0; i < 240; i++) {
        const ev = stepPlatformer(body, js, { moveX: Math.sign(target - (body.x + 5)), keepMomentum: i < LASSO.KEEP_MOMENTUM * 60 }, STEP, map);
        if (ev.landed) {
          landings.push(body.x + 5);
          break;
        }
      }
    }
    // Hay una ventana amplia para soltar: casi todos los intentos caen en la otra orilla
    expect(landings.filter((x) => x >= 14 * TS && x < 20 * TS).length).toBeGreaterThanOrEqual(4);
  });

  // Simulación del lazo con la física real: engancha, bombea, suelta pasado el nodo y vuela.
  // Devuelve dónde aterriza o, si se da nextNode, el punto del vuelo donde ya lo alcanza.
  function swingAttempt(map, h, v, node, rel, { targetX, dj = -1, nextNode = null } = {}) {
    const s = createSwing(node, h.x, h.y, v.x, v.y);
    let r = null;
    for (let i = 0; i < 900 && !r; i++) {
      swingStep(s, STEP, { moveX: Math.sign(s.vx) || 1 });
      if (s.px > node.x + rel && s.vx > 0 && s.vy < 0) r = releaseVelocity(s);
    }
    if (!r) return null;
    const body = createBody(s.px - 5, s.py - LASSO.HAND_Y - 20, 10, 20);
    body.vx = r.vx;
    body.vy = r.vy;
    const js = createJumpState();
    js.hasBoots = true;
    js.canDoubleJump = true;
    for (let i = 0; i < 300; i++) {
      const hand = { x: body.x + 5, y: body.y + 20 + LASSO.HAND_Y };
      if (nextNode && nodeInReach(nextNode, hand, 1)) return { reach: hand, v: { x: body.vx, y: body.vy } };
      const ev = stepPlatformer(body, js, { moveX: targetX === undefined ? 1 : Math.sign(targetX - (body.x + 5)), jumpBuffered: i === dj, jumpHeld: i >= dj && i < dj + 20, keepMomentum: i < LASSO.KEEP_MOMENTUM * 60 }, STEP, map);
      if (ev.landed) return { land: { x: body.x + 5, y: body.y + 20 } };
    }
    return null;
  }

  it('reto 2 (lazo + doble salto) y reto 3 (cadena de 5 nodos) se pueden pasar', () => {
    const map = new Tilemap(S.E.rows, SC_LEGEND);
    const nodes = map
      .find('n')
      .map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8 }))
      .sort((a, b) => a.x - b.x);
    // Reto 2: la cornisa alta solo se alcanza soltando el lazo y usando el doble salto
    let ok2 = false;
    for (const rel of [40, 50, 60]) {
      for (const dj of [10, 20, 30]) {
        const res = swingAttempt(map, { x: 20 * TS - 6, y: S.E.floor * TS + LASSO.HAND_Y }, { x: PLATFORMER.MAX_SPEED, y: 0 }, nodes[1], rel, { targetX: 32.5 * TS, dj });
        ok2 ||= res?.land?.y === (S.E.floor - 4) * TS;
      }
    }
    expect(ok2).toBe(true);
    // Reto 3: de cada nodo de la cadena se alcanza el siguiente, y del último se llega al suelo
    let h = { x: 36 * TS - 6, y: (S.E.floor - 4) * TS + LASSO.HAND_Y };
    let v = { x: PLATFORMER.MAX_SPEED, y: 0 };
    for (let k = 2; k <= 6; k++) {
      let res = null;
      for (const rel of [10, 20, 30, 40]) {
        res = swingAttempt(map, h, v, nodes[k], rel, k < 6 ? { nextNode: nodes[k + 1] } : { targetX: 66 * TS });
        if (res && (res.reach || res.land)) break;
      }
      expect(res, `nodo ${k}`).toBeTruthy();
      if (k < 6) {
        expect(res.reach, `nodo ${k}`).toBeTruthy();
        h = res.reach;
        v = res.v;
      } else expect(res.land.x).toBeGreaterThanOrEqual(63 * TS);
    }
  });

  it('los rótulos del mundo existen y no tienen Y', () => {
    for (const [key, text] of Object.entries(TEXTS.level4.signs)) expect(/[yY]/.test(text), key).toBe(false);
    for (const s of Object.values(S)) for (const sg of s.signs || []) expect(TEXTS.level4.signs[sg.key], sg.key).toBeTruthy();
  });
});

describe('Enemigos de Santa Cruz', () => {
  // Escena mínima: suelo plano y un Choco quieto
  function fakeScene(chocoX) {
    const rows = ['....................', '....................', '....................', '####################'];
    const map = new Tilemap(rows);
    const noop = () => {};
    return {
      map,
      choco: { cx: chocoX, cy: 36, footX: chocoX, footY: 48, alive: true, state: 'play', body: { x: chocoX - 5, y: 28, w: 10, h: 20 }, hurt: () => true },
      particles: { spawn: noop, burst: noop },
      game: { audio: null, effects: { shake: noop, hitstop: noop, flash: noop } },
      camera: { isVisible: () => true },
      hazards: [],
      blasts: [],
      addBits: noop,
    };
  }

  it('el toro raspa 0.8 s antes de embestir', () => {
    const sc = fakeScene(100);
    const toro = new Toro(200, 48, { dir: -1 });
    toro.update(STEP, sc);
    expect(toro.state).toBe('scrape');
    run((dt) => toro.update(dt, sc), ENEMIES.TORO.SCRAPE - 0.05);
    expect(toro.state).toBe('scrape');
    run((dt) => toro.update(dt, sc), 0.1);
    expect(toro.state).toBe('charge');
  });

  it('la bombeta cae donde marcó', () => {
    const sc = fakeScene(-500);
    const b = new Bombeta(40, 0, 160, 40, 1.0);
    let t = 0;
    while (!b.dead && t < 3) {
      b.update(STEP, sc);
      t += STEP;
    }
    expect(b.dead).toBe(true);
    expect(Math.abs(b.x - 160)).toBeLessThan(10);
    expect(t).toBeGreaterThan(0.9);
  });

  it('una bombeta devuelta con parry vuelve hacia quien la lanzó', () => {
    const sc = fakeScene(-500);
    let hit = false;
    const owner = { dead: false, body: { x: 30, y: 20, w: 12, h: 18 }, returnPoint: () => ({ x: 36, y: 26 }), onBombetaReturn: () => (hit = true) };
    const b = new Bombeta(40, 0, 160, 40, 1.0, owner);
    run((dt) => b.update(dt, sc), 0.5);
    b.reflect(sc);
    run((dt) => !b.dead && b.update(dt, sc), 1.2);
    expect(hit).toBe(true);
  });
});

describe('El Torito Kernel', () => {
  it('fase 2 desde la mitad de la vida', () => {
    expect(toritoPhase(TORITO.HP)).toBe(1);
    expect(toritoPhase(TORITO.HP / 2 + 1)).toBe(1);
    expect(toritoPhase(TORITO.HP / 2)).toBe(2);
  });

  it('solo recibe daño aturdido, con la Vista Debug y en el chip', () => {
    expect(toritoCanDamage({ stunned: true, debugView: true, onChip: true })).toBe(true);
    expect(toritoCanDamage({ stunned: false, debugView: true, onChip: true })).toBe(false);
    expect(toritoCanDamage({ stunned: true, debugView: false, onChip: true })).toBe(false);
    expect(toritoCanDamage({ stunned: true, debugView: true, onChip: false })).toBe(false);
  });

  it('no repite ataque y después del humo siempre embiste', () => {
    for (const last of ['charge', 'stomp', 'bombs']) for (let r = 0; r < 1; r += 0.1) expect(nextToritoAttack(last, r)).not.toBe(last);
    expect(nextToritoAttack('smoke', 0.99)).toBe('charge');
  });

  it('30 de vida: 30 disparos normales o 10 cargados', () => {
    expect(TORITO.HP).toBe(30);
    const boss = new Torito(160, 160, { left: 16, right: 304 });
    const noop = () => {};
    const scene = { map: { ghostSolid: true }, game: { audio: { stopMusic: noop }, effects: { hitstop: noop, shake: noop } }, particles: { burst: noop }, onBossPhase2: noop };
    boss.state = 'stunned';
    boss.stun = 99;
    for (let i = 0; i < 9; i++) {
      boss.damage(3, scene, 0, null);
      boss.state = 'stunned';
    }
    expect(boss.hp).toBe(3);
    boss.damage(3, scene, 0, null);
    expect(boss.state).toBe('dying');
  });

  it('el chip queda en la parte de atrás del toro', () => {
    const boss = new Torito(160, 160, { left: 16, right: 304 });
    boss.dir = 1; // mira a la derecha: el chip a la izquierda
    expect(boss.chipRect().x).toBeLessThan(boss.cx);
    boss.dir = -1;
    expect(boss.chipRect().x).toBeGreaterThan(boss.cx);
  });
});

describe('Contenido del nivel 4', () => {
  it('existen los diálogos del rescate de Fabiola y de la rosquilla', () => {
    for (const k of ['level4Intro', 'plazaIntro', 'ovenFind', 'redondelIntro', 'toritoIntro', 'fabiolaRescue', 'fabiolaRosquilla', 'fabiolaLasso', 'lassoIntro', 'lassoDone']) {
      expect(DIALOGUES[k]?.length, k).toBeGreaterThan(0);
    }
    expect(DIALOGUES.fabiolaRescue[0].who).toBe('fabiola');
  });

  it('las 4 comidas tienen el comentario de Fabiola del documento', () => {
    const f = TEXTS.level4.foods;
    expect(f.chorreada.comment).toBe('Muy dulces para mí.');
    expect(f.tanela.comment).toBe('¿Qué queso es ese? No sé si me cae bien.');
    expect(f.arroz.comment).toBe('Tiene demasiadas cosas juntas.');
    expect(f.empanada.comment).toBe('¿De qué es? Mejor no me digás.');
    expect(f.rosquilla).toBeTruthy();
  });

  it('las canciones tienen todos los canales del mismo largo', () => {
    const steps = (notes) => notes.split(/\s+/).filter(Boolean).reduce((n, tok) => n + Number(tok.split(':')[1] || 1), 0);
    for (const song of [SONG_SANTACRUZ, SONG_TORITO, SONG_ATARDECER]) {
      const lens = song.channels.map((c) => steps(c.notes));
      expect(new Set(lens).size, song.id).toBe(1);
    }
  });

  it('las oleadas del redondel están en orden y caben en el minuto', () => {
    const at = REDONDEL.WAVES.map((w) => w.at);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(at[at.length - 1]).toBeLessThan(REDONDEL.SURVIVE);
    expect(REDONDEL.WAVES.length).toBe(3);
  });
});
