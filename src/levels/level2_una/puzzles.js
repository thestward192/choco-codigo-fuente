// Puzzles del nivel 2 (lógica pura, con pruebas): binario, compuertas lógicas y estantes.
// docs/niveles/nivel_2_una.md
import { PUZZLES } from '../../config/balance.js';

// ============================================================================
// Laboratorio · Binario: 8 computadoras = 8 bits (128 → 1)
// ============================================================================

export const BIT_VALUES = [128, 64, 32, 16, 8, 4, 2, 1];

export function binaryValue(bits) {
  return bits.reduce((n, on, i) => n + (on ? BIT_VALUES[i] : 0), 0);
}

// Cómo se muestra el objetivo de cada ronda: decimal y la última en hexadecimal
export function binaryLabel(round) {
  const n = PUZZLES.BINARY_TARGETS[round];
  if (round === PUZZLES.BINARY_TARGETS.length - 1) return `0x${n.toString(16).toUpperCase()}`;
  return String(n);
}

export function binaryCorrect(bits, round) {
  return binaryValue(bits) === PUZZLES.BINARY_TARGETS[round];
}

// ============================================================================
// Aula 3 · Compuertas lógicas
// ============================================================================
// Un circuito: palancas A..D, compuertas con entradas (ids de palancas u otras compuertas)
// y una salida que abre la puerta. Las posiciones (en tiles del aula) son para dibujarlo en el piso.

export const GATE_FN = {
  AND: (a, b) => a && b,
  OR: (a, b) => a || b,
  XOR: (a, b) => a !== b,
  NOT: (a) => !a,
};

export const CIRCUITS = [
  {
    // (A AND NOT B) OR (C AND D)
    id: 'c1',
    initial: { A: false, B: false, C: false, D: false },
    maxChanges: null,
    gates: [
      { id: 'n1', type: 'NOT', in: ['B'] },
      { id: 'g1', type: 'AND', in: ['A', 'n1'] },
      { id: 'g2', type: 'AND', in: ['C', 'D'] },
      { id: 'g3', type: 'OR', in: ['g1', 'g2'] },
    ],
    out: 'g3',
  },
  {
    // (A XOR B) AND NOT (C XOR D) AND (B OR C) — solo 3 cambios antes de reiniciar
    id: 'c2',
    initial: { A: true, B: true, C: false, D: true },
    maxChanges: PUZZLES.GATES_MAX_CHANGES,
    gates: [
      { id: 'x1', type: 'XOR', in: ['A', 'B'] },
      { id: 'x2', type: 'XOR', in: ['C', 'D'] },
      { id: 'n1', type: 'NOT', in: ['x2'] },
      { id: 'o1', type: 'OR', in: ['B', 'C'] },
      { id: 'a1', type: 'AND', in: ['x1', 'n1'] },
      { id: 'a2', type: 'AND', in: ['a1', 'o1'] },
    ],
    out: 'a2',
  },
];

// Evalúa el circuito. Devuelve el valor de cada palanca y compuerta, y la salida.
export function evalCircuit(circuit, levers) {
  const v = { ...levers };
  for (const g of circuit.gates) {
    const ins = g.in.map((id) => !!v[id]);
    v[g.id] = !!GATE_FN[g.type](...ins);
  }
  return { values: v, out: v[circuit.out] };
}

export const LEVER_IDS = ['A', 'B', 'C', 'D'];

// Mínimo de palancas que hay que cambiar desde el estado inicial para abrir la puerta
export function minChanges(circuit) {
  let best = Infinity;
  for (let mask = 0; mask < 16; mask++) {
    const lv = {};
    let changes = 0;
    LEVER_IDS.forEach((id, i) => {
      const flip = !!(mask & (1 << i));
      lv[id] = flip ? !circuit.initial[id] : circuit.initial[id];
      if (flip) changes++;
    });
    if (evalCircuit(circuit, lv).out) best = Math.min(best, changes);
  }
  return best;
}

// ============================================================================
// Biblioteca · Estantes con ruedas (tipo sokoban)
// ============================================================================
// Se lee de las filas del mapa de la sala:
//   '#', 'W', 'B' y demás sólidos → pared · '&' pila de libros (bloquea estantes, se salta con
//   las Botas) · 'x' marca en el piso · 'h' estante (sobre piso) · 'H' estante sobre una marca

export function parseShelves(rows, area, solidChars) {
  const walls = new Set();
  const piles = new Set();
  const noShelf = new Set();
  const marks = [];
  const shelves = [];
  for (let y = area.y0; y <= area.y1; y++) {
    for (let x = area.x0; x <= area.x1; x++) {
      const ch = rows[y][x];
      const k = `${x},${y}`;
      if (ch === '&') piles.add(k);
      else if (ch === 'n') noShelf.add(k);
      else if (ch === 'x') marks.push({ x, y });
      else if (ch === 'h') shelves.push({ x, y });
      else if (ch === 'H') {
        marks.push({ x, y });
        shelves.push({ x, y });
      } else if (solidChars.includes(ch)) walls.add(k);
    }
  }
  return { area, walls, piles, noShelf, marks, shelves };
}

export function shelfAt(state, x, y) {
  return state.shelves.findIndex((s) => s.x === x && s.y === y);
}

function insideArea(state, x, y) {
  const a = state.area;
  return x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1;
}

// ¿Un estante puede entrar a la celda?
export function cellFreeForShelf(state, x, y) {
  const k = `${x},${y}`;
  return insideArea(state, x, y) && !state.walls.has(k) && !state.piles.has(k) && !state.noShelf?.has(k) && shelfAt(state, x, y) < 0;
}

// ¿Choco puede pararse en la celda? (no en paredes, pilas ni estantes)
export function cellFreeForChoco(state, x, y) {
  const k = `${x},${y}`;
  return !state.walls.has(k) && !state.piles.has(k) && shelfAt(state, x, y) < 0;
}

// Empuja el estante i en la dirección (dx, dy). Devuelve un estado nuevo o null si no se puede.
export function pushShelf(state, i, dx, dy) {
  const s = state.shelves[i];
  const nx = s.x + dx;
  const ny = s.y + dy;
  if (!cellFreeForShelf(state, nx, ny)) return null;
  const shelves = state.shelves.map((q, k) => (k === i ? { x: nx, y: ny } : q));
  return { ...state, shelves };
}

export function shelvesSolved(state) {
  return state.marks.every((m) => shelfAt(state, m.x, m.y) >= 0);
}

// Celdas alcanzables por Choco desde (sx, sy), incluido el salto corto sobre una pila de libros
export function reachable(state, sx, sy, { hop = true } = {}) {
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  const D = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of D) {
      let nx = x + dx;
      let ny = y + dy;
      if (!insideArea(state, nx, ny)) continue;
      if (hop && state.piles.has(`${nx},${ny}`)) {
        nx += dx;
        ny += dy;
        if (!insideArea(state, nx, ny)) continue;
      }
      const k = `${nx},${ny}`;
      if (seen.has(k) || !cellFreeForChoco(state, nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}
