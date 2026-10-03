import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { BATTLE, BUGS, RAP, PUZZLES, TOPDOWN } from '../src/config/balance.js';
import {
  createBattle,
  startRound,
  chocoAct,
  enemyAttack,
  applyEnemyHit,
  endRound,
  resolveTangle,
  canUse,
  battleOutcome,
  judgeTiming,
  judgeDefense,
  timingPos,
  BUG_IDS,
} from '../src/systems/battle.js';
import { createRap, judgeAnswer, beatInfo, isOnBeat, shuffle, roundContent } from '../src/systems/rap.js';
import {
  binaryValue,
  binaryLabel,
  binaryCorrect,
  CIRCUITS,
  evalCircuit,
  minChanges,
  parseShelves,
  pushShelf,
  shelvesSolved,
  reachable,
  shelfAt,
} from '../src/levels/level2_una/puzzles.js';
import { level2Rooms, L2_LEGEND, SHELF_SOLIDS, LIB1, LIB2, AULA, LAB, CIRCUIT_LAYOUT, L2_TERMINALS } from '../src/levels/level2_una/maps.js';
import { createTopdownBody, stepTopdown } from '../src/systems/topdown.js';
import { Tilemap } from '../src/systems/tilemap.js';

const battle = (bug, seed = 1, extra = {}) => createBattle({ bug, energy: 20, maxEnergy: 20, rng: createRng(seed), ...extra });

describe('Batalla por turnos', () => {
  it('Compilar hace 4; crítico ×1.5; contra la debilidad (Debug) ×2', () => {
    const b = battle('leak');
    startRound(b);
    chocoAct(b, 'compile', { timing: 'normal' });
    expect(b.bug.hp).toBe(BUGS.leak.HP - 4);
    chocoAct(b, 'compile', { timing: 'crit' });
    expect(b.bug.hp).toBe(BUGS.leak.HP - 4 - 6);
    const b2 = battle('leak');
    startRound(b2);
    chocoAct(b2, 'debug');
    expect(b2.choco.ram).toBe(BATTLE.RAM_START - BATTLE.DEBUG_COST);
    chocoAct(b2, 'compile', { timing: 'crit' });
    expect(b2.bug.hp).toBe(BUGS.leak.HP - 12);
    // La debilidad se gasta en el primer Compilar
    chocoAct(b2, 'compile', { timing: 'normal' });
    expect(b2.bug.hp).toBe(BUGS.leak.HP - 16);
  });

  it('la RAM empieza en 6, regenera 2 por turno y no pasa de 10', () => {
    const b = battle('loop');
    startRound(b);
    expect(b.choco.ram).toBe(6);
    for (let i = 0; i < 5; i++) startRound(b);
    expect(b.choco.ram).toBe(BATTLE.RAM_MAX);
    b.choco.ram = 2;
    expect(canUse(b, 'debug')).toBe(false);
    expect(canUse(b, 'force')).toBe(false);
    expect(chocoAct(b, 'force')[0].type).toBe('invalid');
  });

  it('Refactor cura 6 sin pasar del máximo y quita el enredo', () => {
    const b = battle('spaghetti');
    b.choco.energy = 10;
    b.choco.tangled = true;
    startRound(b);
    const ev = chocoAct(b, 'refactor');
    expect(b.choco.energy).toBe(16);
    expect(b.choco.tangled).toBe(false);
    expect(ev.some((e) => e.type === 'untangle')).toBe(true);
    b.choco.energy = 19;
    b.choco.ram = 10;
    chocoAct(b, 'refactor');
    expect(b.choco.energy).toBe(20);
  });

  it('Commit --force hace 12 y falla cerca del 25 %', () => {
    let fails = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const b = battle('leak', i + 7);
      b.choco.ram = 10;
      const ev = chocoAct(b, 'force');
      if (ev[0].type === 'fail') fails++;
      else expect(b.bug.hp).toBe(BUGS.leak.HP - BATTLE.FORCE_DAMAGE);
    }
    expect(fails / N).toBeGreaterThan(0.2);
    expect(fails / N).toBeLessThan(0.3);
  });

  it('defensa con timing: perfecto 0, bien la mitad, nada el daño completo', () => {
    expect(judgeDefense(0)).toBe('perfect');
    expect(judgeDefense(1 / 60)).toBe('perfect');
    expect(judgeDefense(-1 / 60)).toBe('perfect');
    expect(judgeDefense(2 / 60)).toBe('good');
    expect(judgeDefense(0.1)).toBe('good');
    expect(judgeDefense(0.3)).toBe('miss');
    expect(judgeDefense(null)).toBe('miss');
    const b = battle('loop');
    startRound(b);
    const atk = enemyAttack(b);
    applyEnemyHit(b, atk, 'perfect');
    expect(b.choco.energy).toBe(20);
    applyEnemyHit(b, atk, 'good');
    expect(b.choco.energy).toBe(20 - Math.floor(BUGS.loop.DAMAGE / 2));
    applyEnemyHit(b, atk, 'miss');
    expect(b.choco.energy).toBe(20 - Math.floor(BUGS.loop.DAMAGE / 2) - BUGS.loop.DAMAGE);
  });

  it('golpe con timing: el centro es crítico', () => {
    expect(judgeTiming(0.5)).toBe('crit');
    expect(judgeTiming(0.6)).toBe('good');
    expect(judgeTiming(0.95)).toBe('normal');
    expect(timingPos(0)).toBe(0);
    expect(timingPos(BATTLE.TIMING_SWEEP)).toBeCloseTo(1);
    expect(timingPos(BATTLE.TIMING_SWEEP * 1.5)).toBeCloseTo(0.5);
  });

  it('NullPointer falla cerca de la mitad de las veces, pero pega 7', () => {
    let miss = 0;
    const N = 2000;
    const b = battle('nullPointer', 3);
    startRound(b);
    for (let i = 0; i < N; i++) {
      const a = enemyAttack(b);
      expect(a.damage).toBe(7);
      if (a.miss) miss++;
    }
    expect(miss / N).toBeGreaterThan(0.45);
    expect(miss / N).toBeLessThan(0.55);
  });

  it('Loop Infinito se cura por completo a los 3 turnos; Debug rompe el loop', () => {
    const b = battle('loop');
    for (let t = 0; t < 2; t++) {
      startRound(b);
      chocoAct(b, 'compile', { timing: 'normal' });
      endRound(b);
    }
    expect(b.bug.hp).toBe(BUGS.loop.HP - 8);
    startRound(b);
    expect(b.intent.loopHeal).toBe(true);
    chocoAct(b, 'compile', { timing: 'normal' });
    const ev = endRound(b);
    expect(ev.some((e) => e.type === 'loopHeal')).toBe(true);
    expect(b.bug.hp).toBe(BUGS.loop.HP);
    // Con Debug ya no se cura
    const b2 = battle('loop');
    startRound(b2);
    chocoAct(b2, 'debug');
    expect(b2.bug.loopBroken).toBe(true);
    for (let t = 0; t < 4; t++) {
      endRound(b2);
      startRound(b2);
      chocoAct(b2, 'compile', { timing: 'normal' });
    }
    expect(b2.bug.hp).toBeLessThan(BUGS.loop.HP - 8);
  });

  it('Race Condition: a veces va primero y a veces ataca dos veces', () => {
    const b = battle('race', 11);
    let first = 0;
    let double = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      startRound(b);
      if (b.intent.first) first++;
      if (b.intent.double) double++;
    }
    expect(first / N).toBeGreaterThan(0.4);
    expect(first / N).toBeLessThan(0.6);
    expect(double / N).toBeGreaterThan(0.2);
    expect(double / N).toBeLessThan(0.4);
  });

  it('Memory Leak baja 1 de energía máxima por turno, solo durante la pelea', () => {
    const b = battle('leak');
    for (let t = 0; t < 3; t++) {
      startRound(b);
      endRound(b);
    }
    expect(b.choco.maxEnergy).toBe(17);
    b.result = 'win';
    expect(battleOutcome(b).energy).toBe(17);
    b.choco.energy = 17;
    const out = battleOutcome(b);
    expect(out.bits).toBe(BUGS.leak.BITS);
  });

  it('Spaghetti Code enreda en turnos alternos; el enredo puede cambiar la acción', () => {
    const b = battle('spaghetti', 5);
    startRound(b);
    expect(b.intent.action).toBe('tangle');
    const atk = enemyAttack(b);
    applyEnemyHit(b, atk, 'miss');
    expect(b.choco.tangled).toBe(true);
    endRound(b);
    startRound(b);
    expect(b.intent.action).toBe('attack');
    // Un enredo perfecto bloqueado no enreda
    const b3 = battle('spaghetti', 5);
    startRound(b3);
    applyEnemyHit(b3, enemyAttack(b3), 'perfect');
    expect(b3.choco.tangled).toBe(false);
    // El enredo cambia la acción cerca de la mitad de las veces y se gasta
    let swaps = 0;
    for (let i = 0; i < 400; i++) {
      const bb = battle('spaghetti', 100 + i);
      bb.choco.tangled = true;
      const r = resolveTangle(bb, 'compile');
      if (r.swapped) swaps++;
      expect(bb.choco.tangled).toBe(false);
    }
    expect(swaps).toBeGreaterThan(120);
    expect(swaps).toBeLessThan(280);
  });

  it('Huir: ~60 %, imposible contra jefes', () => {
    let ok = 0;
    for (let i = 0; i < 1000; i++) {
      const b = battle('race', i + 1);
      if (chocoAct(b, 'flee').some((e) => e.type === 'fled')) ok++;
    }
    expect(ok / 1000).toBeGreaterThan(0.54);
    expect(ok / 1000).toBeLessThan(0.66);
    expect(canUse(battle('race', 1, { boss: true }), 'flee')).toBe(false);
  });

  it('objetos de la soda: café, empanada (+RAM) y gallo pinto', () => {
    const b = battle('race', 1, { items: { cafe: 1, empanada: 1, galloPinto: 1 } });
    b.choco.energy = 2;
    startRound(b);
    chocoAct(b, 'item', { item: 'cafe' });
    expect(b.choco.energy).toBe(10);
    chocoAct(b, 'item', { item: 'empanada' });
    expect(b.choco.energy).toBe(14);
    expect(b.choco.ram).toBe(9);
    chocoAct(b, 'item', { item: 'galloPinto' });
    expect(b.choco.energy).toBe(20);
    expect(canUse(b, 'item')).toBe(false);
  });

  it('cada bug se puede vencer y la energía a 0 es derrota', () => {
    for (const id of BUG_IDS) {
      const b = battle(id, 9);
      let guard = 0;
      while (!b.result && guard++ < 50) {
        startRound(b);
        chocoAct(b, b.choco.ram >= BATTLE.FORCE_COST ? 'force' : 'compile', { timing: 'crit' });
        endRound(b);
      }
      expect(b.result, id).toBe('win');
    }
    const b = battle('nullPointer');
    b.choco.energy = 3;
    startRound(b);
    applyEnemyHit(b, { damage: 7, miss: false }, 'miss');
    expect(b.result).toBe('lose');
  });
});

describe('Batalla de rap', () => {
  it('el beat va a 90 BPM y la ventana "en el beat" es de ±0.12 s', () => {
    const len = 60 / RAP.BPM;
    expect(beatInfo(len * 4).beat).toBe(4);
    expect(beatInfo(len * 4).bar).toBe(1);
    expect(isOnBeat(beatInfo(len * 3 + 0.1).offset)).toBe(true);
    expect(isOnBeat(beatInfo(len * 3 - 0.1).offset)).toBe(true);
    expect(isOnBeat(beatInfo(len * 3 + 0.2).offset)).toBe(false);
  });

  it('respuestas: correcta −1 flow, floja −½, sin rima y cringe −1 hype; en el beat cuenta doble', () => {
    const r = createRap();
    const a = judgeAnswer(r, 'correct', true);
    expect(r.flow).toBe(2);
    expect(a.points).toBe(RAP.SCORE_CORRECT * 2);
    judgeAnswer(r, 'weak', false);
    expect(r.flow).toBe(1.5);
    judgeAnswer(r, 'cringe');
    judgeAnswer(r, 'norhyme');
    expect(r.hype).toBe(1);
    const last = judgeAnswer(r, 'none');
    expect(last.lost).toBe(true);
    const w = createRap();
    judgeAnswer(w, 'correct');
    judgeAnswer(w, 'correct');
    expect(judgeAnswer(w, 'correct').won).toBe(true);
  });

  it('las opciones se mezclan y hay rondas extra si Stack sigue con flow', () => {
    const rng = createRng(4);
    const seen = new Set();
    for (let i = 0; i < 20; i++) seen.add(shuffle(['a', 'b', 'c', 'd'], rng).join(''));
    expect(seen.size).toBeGreaterThan(5);
    expect(roundContent([1, 2, 3], ['x', 'y'], 0)).toBe(1);
    expect(roundContent([1, 2, 3], ['x', 'y'], 3)).toBe('x');
    expect(roundContent([1, 2, 3], ['x', 'y'], 6)).toBe('y');
  });
});

// ---------- Solucionador de estantes (BFS sobre posiciones de estantes + zona de Choco) ----------
function solveShelves(state, start, { hop = true, goal = shelvesSolved, maxStates = 400000 } = {}) {
  const key = (st, region) => `${[...st.shelves].map((s) => `${s.x},${s.y}`).sort().join('|')}#${[...region].sort()[0]}`;
  const D = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const r0 = reachable(state, start.x, start.y, { hop });
  const q = [{ st: state, region: r0 }];
  const seen = new Set([key(state, r0)]);
  while (q.length) {
    const { st, region } = q.shift();
    if (goal(st, region)) return st;
    if (seen.size > maxStates) return null;
    st.shelves.forEach((s, i) => {
      for (const [dx, dy] of D) {
        if (!region.has(`${s.x - dx},${s.y - dy}`)) continue;
        const next = pushShelf(st, i, dx, dy);
        if (!next) continue;
        const reg = reachable(next, s.x, s.y, { hop });
        const k = key(next, reg);
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ st: next, region: reg });
      }
    });
  }
  return null;
}

describe('Puzzles del nivel 2', () => {
  const R = level2Rooms();

  it('binario: 37, 170 y 0xE9', () => {
    expect(binaryValue([false, false, true, false, false, true, false, true])).toBe(37);
    expect(binaryValue([true, false, true, false, true, false, true, false])).toBe(170);
    expect(binaryLabel(2)).toBe('0xE9');
    expect(binaryLabel(0)).toBe('37');
    expect(binaryCorrect([true, true, true, false, true, false, false, true], 2)).toBe(true);
    expect(PUZZLES.BINARY_TARGETS[2]).toBe(0xe9);
  });

  it('compuertas: el circuito empieza cerrado y se puede abrir; el segundo pide pensar (2–3 cambios)', () => {
    for (const c of CIRCUITS) expect(evalCircuit(c, c.initial).out, c.id).toBe(false);
    expect(minChanges(CIRCUITS[0])).toBeGreaterThanOrEqual(1);
    const m2 = minChanges(CIRCUITS[1]);
    expect(m2).toBeGreaterThanOrEqual(2);
    expect(m2).toBeLessThanOrEqual(CIRCUITS[1].maxChanges);
    expect(CIRCUITS[1].gates.some((g) => g.type === 'XOR')).toBe(true);
    expect(evalCircuit(CIRCUITS[0], { A: true, B: false, C: false, D: false }).out).toBe(true);
    // Toda compuerta tiene posición para dibujarla en el piso
    for (const c of CIRCUITS) for (const g of c.gates) expect(CIRCUIT_LAYOUT[c.id][g.id], `${c.id}.${g.id}`).toBeDefined();
  });

  it('las palancas, computadoras y rejas existen en los mapas', () => {
    const aula = new Tilemap(R.aula3.rows, L2_LEGEND);
    for (const x of [...AULA.c1.levers, ...AULA.c2.levers]) expect(aula.charAt(x, AULA.LEVER_Y)).toBe('l');
    expect(aula.charAt(AULA.c1.gate.x, AULA.c1.gate.y0)).toBe('G');
    expect(aula.charAt(AULA.c2.gate.x, AULA.c2.gate.y1)).toBe('G');
    const lab = new Tilemap(R.laboratorio.rows, L2_LEGEND);
    for (const x of LAB.computers) expect(lab.charAt(x, LAB.COMP_Y)).toBe('c');
    expect(lab.charAt(LAB.lever.x, LAB.lever.y)).toBe('l');
  });

  it('biblioteca, sala 1: se resuelve', () => {
    const st = parseShelves(R.biblioteca.rows, LIB1.area, SHELF_SOLIDS);
    expect(st.marks.length).toBe(2);
    expect(st.shelves.length).toBe(2);
    expect(shelvesSolved(st)).toBe(false);
    expect(solveShelves(st, { x: 10, y: 5 })).not.toBeNull();
  });

  it('biblioteca, sala 2: solución "obvia" (el nicho queda tapado) y alternativa (se llega a la Y)', () => {
    const st = parseShelves(R.biblioteca2.rows, LIB2.area, SHELF_SOLIDS);
    expect(st.marks.length).toBe(3);
    expect(st.shelves.length).toBe(4);
    const nookDoor = `${LIB2.nook.x},${LIB2.nook.y + 1}`;
    const start = { x: 9, y: 9 };
    expect(reachable(st, start.x, start.y).has(`${LIB2.nook.x},${LIB2.nook.y}`)).toBe(false);
    // Ejecuta empujones [x, y, dx, dy] validando que Choco llegue al lugar desde donde empuja
    const play = (pushes, hop = false) => {
      let s = st;
      let pos = start;
      for (const [x, y, dx, dy] of pushes) {
        const region = reachable(s, pos.x, pos.y, { hop });
        expect(region.has(`${x - dx},${y - dy}`), `llegar a (${x - dx},${y - dy})`).toBe(true);
        const next = pushShelf(s, shelfAt(s, x, y), dx, dy);
        expect(next, `empujar (${x},${y})`).not.toBeNull();
        s = next;
        pos = { x, y };
      }
      return { s, pos };
    };
    const right = (x, y, n) => Array.from({ length: n }, (_, i) => [x + i, y, 1, 0]);
    const up = (x, y, n) => Array.from({ length: n }, (_, i) => [x, y - i, 0, -1]);
    const down = (x, y, n) => Array.from({ length: n }, (_, i) => [x, y + i, 0, 1]);
    // Obvia: el estante de abajo sube a la marca junto al nicho y lo tapa
    const ob = play([...up(3, 7, 3), ...right(11, 5, 4), ...down(5, 5, 2), ...right(5, 7, 5)]);
    expect(shelvesSolved(ob.s)).toBe(true);
    expect(reachable(ob.s, ob.pos.x, ob.pos.y, { hop: true }).has(nookDoor)).toBe(false);
    // Alternativa: correr el estante que tapa el nicho hasta esa marca
    const alt = play([[2, 4, 1, 0], ...right(11, 5, 4), ...right(3, 7, 7)]);
    expect(shelvesSolved(alt.s)).toBe(true);
    expect(reachable(alt.s, alt.pos.x, alt.pos.y).has(nookDoor)).toBe(true);
  });
});

describe('Mapas de la UNA', () => {
  const R = level2Rooms();

  it('todas las filas miden lo mismo y caben en la cámara', () => {
    for (const [id, r] of Object.entries(R)) {
      const w = r.rows[0].length;
      for (const row of r.rows) expect(row.length, id).toBe(w);
    }
  });

  it('cada puerta tiene su pareja en la sala de destino', () => {
    for (const [id, r] of Object.entries(R)) {
      for (const d of r.doors) {
        expect(R[d.to], `${id} → ${d.to}`).toBeDefined();
        expect(R[d.to].doors.some((o) => o.to === id), `${d.to} no vuelve a ${id}`).toBe(true);
      }
    }
  });

  it('desde cada puerta se llega a las demás puertas de la sala (sin atravesar rejas)', () => {
    for (const [id, r] of Object.entries(R)) {
      const m = new Tilemap(r.rows, L2_LEGEND);
      const cellOf = (d) => {
        if (d.side === 'N') return [d.at, 2];
        if (d.side === 'S') return [d.at, m.h - 2];
        if (d.side === 'W') return [1, d.at];
        return [m.w - 2, d.at];
      };
      const flood = (sx, sy) => {
        const seen = new Set([`${sx},${sy}`]);
        const q = [[sx, sy]];
        while (q.length) {
          const [x, y] = q.shift();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const k = `${nx},${ny}`;
            if (seen.has(k) || !m.inBounds(nx, ny) || m.isSolid(nx, ny) || 'hH'.includes(m.charAt(nx, ny))) continue;
            seen.add(k);
            q.push([nx, ny]);
          }
        }
        return seen;
      };
      // Puertas libres (sin reja): todas conectadas entre sí
      const open = r.doors.filter((d) => !d.gate);
      if (open.length < 2) continue;
      const [sx, sy] = cellOf(open[0]);
      const reach = flood(sx, sy);
      for (const d of open.slice(1)) {
        const [x, y] = cellOf(d);
        expect(reach.has(`${x},${y}`), `${id}: puerta ${d.to}`).toBe(true);
      }
    }
  });

  it('las terminales de guardado están en el mapa', () => {
    for (const t of L2_TERMINALS) {
      const r = R[t.room];
      const m = new Tilemap(r.rows, L2_LEGEND);
      expect(m.charAt(r.terminal.x, r.terminal.y)).toBe('R');
    }
  });

  it('ningún bug, NPC ni bit empieza dentro de una pared', () => {
    for (const [id, r] of Object.entries(R)) {
      const m = new Tilemap(r.rows, L2_LEGEND);
      for (const b of r.bugs) for (const [x, y] of b.path) expect(m.isSolid(x, y), `${id} bug ${b.id} (${x},${y})`).toBe(false);
      for (const n of r.npcs) if (n.kind !== 'senora') expect(m.isSolid(n.x, n.y), `${id} npc ${n.id}`).toBe(false);
      for (const [x, y] of r.bits) expect(m.isSolid(x, y), `${id} bit (${x},${y})`).toBe(false);
    }
  });
});

describe('Movimiento cenital', () => {
  const open = new Tilemap(['##########', '#........#', '#........#', '#........#', '##########']);

  it('llega a 70 px/s en ~0.08 s y la diagonal no es más rápida', () => {
    const b = createTopdownBody(40, 40);
    let t = 0;
    while (Math.abs(b.vx) < TOPDOWN.WALK_SPEED - 0.01 && t < 1) {
      stepTopdown(b, { x: 1, y: 0 }, 1 / 60, open);
      t += 1 / 60;
    }
    expect(t).toBeLessThanOrEqual(TOPDOWN.ACCEL_TIME + 1 / 60 + 0.001);
    const d = createTopdownBody(40, 40);
    for (let i = 0; i < 20; i++) stepTopdown(d, { x: 1, y: 1 }, 1 / 60, open);
    expect(Math.hypot(d.vx, d.vy)).toBeCloseTo(TOPDOWN.WALK_SPEED, 0);
  });

  it('choca con las paredes y con los obstáculos dinámicos', () => {
    const b = createTopdownBody(40, 40);
    for (let i = 0; i < 120; i++) stepTopdown(b, { x: 1, y: 0 }, 1 / 60, open);
    expect(b.x + b.w).toBeCloseTo(9 * 16, 0);
    const c = createTopdownBody(40, 40);
    const wall = { x: 60, y: 0, w: 16, h: 80 };
    for (let i = 0; i < 60; i++) stepTopdown(c, { x: 1, y: 0 }, 1 / 60, open, [wall]);
    expect(c.x + c.w).toBeCloseTo(60, 0);
  });
});

// ---------- Contenido del nivel 2 ----------
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';
import { GLYPHS, measureText } from '../src/art/fontData.js';
import { SONG_UNA, SONG_BATTLE, SONG_RAP } from '../src/audio/songs/una.js';
import { parseTrack, trackLength } from '../src/core/audio.js';
import { buildChocoTopRows, buildNpcRows, buildOverworldBugRows, TOP_PAL, BUG_PAL, NPC_VARIANTS, SMALL_ITEMS, SMALL_PAL } from '../src/art/topdown.js';
import { buildBattleBugRows, BATTLE_BUG_PAL, BATTLE_BUG_KINDS } from '../src/art/bugs.js';
import { allUnaTileRows, UNA_PAL } from '../src/art/tiles/una.js';

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

describe('Contenido del nivel 2', () => {
  it('los rótulos de la UNA siguen sin la letra Y', () => {
    for (const [k, t] of Object.entries(TEXTS.level2.signs)) {
      expect(/[yY]/.test(t), k).toBe(false);
      expect(t.includes('_'), k).toBe(true);
    }
    for (const r of Object.values(level2Rooms())) for (const sg of r.signs) expect(TEXTS.level2.signs[sg.key], sg.key).toBeTruthy();
  });

  it('los textos de batalla, soda y rap usan solo letras de la fuente', () => {
    const missing = new Set();
    for (const s of strings([TEXTS.level2, TEXTS.battle, TEXTS.shop, TEXTS.items2, TEXTS.bagScene, TEXTS.rap])) for (const ch of s) if (!GLYPHS[ch]) missing.add(ch);
    expect([...missing]).toEqual([]);
  });

  it('cada ronda de rap tiene las 4 respuestas de 2 líneas', () => {
    for (const r of [...TEXTS.rap.rounds, ...TEXTS.rap.extras]) {
      expect(r.stack.length).toBe(2);
      for (const k of ['correct', 'weak', 'norhyme', 'cringe']) expect(r[k].length, k).toBe(2);
    }
    expect(TEXTS.rap.rounds.length).toBe(3);
  });

  it('las respuestas caben en la lista de opciones y los nombres de comandos en el panel', () => {
    for (const k of Object.values(TEXTS.battle.commands)) expect(measureText(k)).toBeLessThanOrEqual(84);
    for (const id of Object.keys(TEXTS.items2)) expect(measureText(TEXTS.items2[id].name)).toBeLessThanOrEqual(150);
  });

  it('existen los diálogos de NPCs y del rescate de Stward', () => {
    for (const r of Object.values(level2Rooms())) for (const n of r.npcs) if (n.dialogue) expect(DIALOGUES[n.dialogue], n.dialogue).toBeDefined();
    expect(DIALOGUES.stwardRescue[0].who).toBe('stward');
    expect(DIALOGUES.stwardVerse[0].text).toContain('refuerzos mejores');
  });

  it('canciones: notas válidas, canales sincronizados y el beat de rap a 90 BPM', () => {
    for (const song of [SONG_UNA, SONG_BATTLE, SONG_RAP]) {
      const lens = song.channels.map((c) => {
        const t = parseTrack(c.notes);
        for (const n of t) if (n.note && !n.drum) expect(n.midi, `${song.id}/${c.id}: ${n.note}`).not.toBeNull();
        return trackLength(t);
      });
      for (const l of lens) expect(Math.max(...lens) % l, `${song.id}: ${lens}`).toBe(0);
      // Compases completos de 16 semicorcheas
      for (const l of lens) expect(l % 16, song.id).toBe(0);
    }
    expect(SONG_RAP.bpm).toBe(RAP.BPM);
  });

  it('sprites cenitales, bugs, tiles y objetos: tamaños y paleta', () => {
    for (const dir of ['down', 'up', 'left', 'right']) for (let f = 0; f < 4; f++) for (const pose of ['walk', 'interact', 'blink']) checkRows(buildChocoTopRows(`${dir}:${f}:${pose}`), TOP_PAL, 16, 16, `choco ${dir}${f}${pose}`);
    for (const [kind, n] of Object.entries(NPC_VARIANTS)) for (let v = 0; v < n; v++) checkRows(buildNpcRows(`${kind}:${v}:0`), TOP_PAL, 16, 16, `${kind}${v}`);
    for (const k of BUG_IDS) for (const f of [0, 1]) checkRows(buildOverworldBugRows(`${k}:${f}`), BUG_PAL, 16, 16, `bug ${k}`);
    for (const k of BATTLE_BUG_KINDS) for (const f of [0, 1]) checkRows(buildBattleBugRows(`${k}:${f}`), BATTLE_BUG_PAL, 32, 32, `batalla ${k}`);
    for (const [k, rows] of Object.entries(allUnaTileRows())) checkRows(rows, UNA_PAL, 16, 16, `tile ${k}`);
    for (const [k, rows] of Object.entries(SMALL_ITEMS)) checkRows(rows, SMALL_PAL, 12, 12, k);
  });
});
