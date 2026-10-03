// Mapas del nivel 2 · La UNA (interiores, vista cenital) — docs/niveles/nivel_2_una.md
//
//                  [Auditorio]  (jefe, requiere 3 carnés)
//                       |
// [Biblioteca 2]  [Pasillo principal]---[Laboratorio]
//       |               |
// [Biblioteca]----------+
//                       |
// [Sala vieja]---[Vestíbulo]---[Soda]
//                       |
//                   [Aula 3]
//
// Cada sala es un arreglo de strings (un carácter por tile de 16×16) más datos: puertas,
// NPCs, bugs con su ruta, objetos interactivos y pickups. La vista es 3/4: la fila 1 de cada
// sala es la cara de la pared (con pizarras, ventanas, casilleros).
import { MapBuilder } from '../mapBuilder.js';
import { T } from '../../systems/tilemap.js';

// ---------- Leyenda ----------
//  #  pared (tope)            W  cara de pared             O  ventana (en la pared)
//  P  pizarra (en la pared)   L  casilleros (en la pared)  N  afiche / pizarra de corcho
//  M  monitor grande (pared)  D  pupitre                   T  mesa
//  C  mostrador (soda)        V  máquina de café           B  estante fijo (biblioteca)
//  c  computadora (lab)       p  planta                    b  banca
//  s  butacas (auditorio)     k  borde de la tarima        R  terminal de guardado
//  l  palanca                 &  pila de libros baja (se salta con las Botas)
//  G  reja / puerta cerrada   .  piso    r alfombra    S tarima    x marca en el piso
//  h  estante con ruedas (sobre piso)    H estante con ruedas sobre una marca
//  n  nicho (piso donde no entran estantes: ahí está la Y de la biblioteca)
const SOLID_CHARS = '#WOPLNMDTCVBcpbskRl&G';

export const L2_LEGEND = { '.': T.EMPTY };
for (const ch of SOLID_CHARS) L2_LEGEND[ch] = T.SOLID;
export const SHELF_SOLIDS = SOLID_CHARS;

class Room extends MapBuilder {
  constructor(w, h) {
    super(w, h, '.');
    this.fill(0, 0, w - 1, 0, '#');
    this.fill(0, h - 1, w - 1, h - 1, '#');
    this.fill(0, 0, 0, h - 1, '#');
    this.fill(w - 1, 0, w - 1, h - 1, '#');
    this.fill(1, 1, w - 2, 1, 'W');
    this.doors = [];
  }

  // Puerta de 2 tiles. side: 'N' | 'S' | 'W' | 'E'; at: x (N/S) o y (W/E) del primer tile
  door(side, at, to, { gate = false } = {}) {
    const { w, h } = this;
    if (side === 'N') {
      this.set(at, 0, '.').set(at + 1, 0, '.');
      this.set(at, 1, gate ? 'G' : '.').set(at + 1, 1, gate ? 'G' : '.');
    } else if (side === 'S') this.set(at, h - 1, '.').set(at + 1, h - 1, '.');
    else if (side === 'W') this.set(0, at, '.').set(0, at + 1, '.');
    else this.set(w - 1, at, '.').set(w - 1, at + 1, '.');
    this.doors.push({ side, at, to, gate });
    return this;
  }
}

// Escribe filas de texto desde (x, y) (los espacios no pintan)
function rowsAt(b, x, y, lines) {
  lines.forEach((l, i) => b.text(x, y + i, l));
}

// ============================================================================
// Vestíbulo: entrada, terminal de guardado, profe en loop
// ============================================================================
function vestibulo() {
  const b = new Room(20, 11);
  b.door('N', 9, 'pasillo').door('S', 9, 'aula3').door('W', 5, 'salaVieja').door('E', 5, 'soda');
  b.text(2, 1, 'OO').text(5, 1, 'N').text(13, 1, 'NN').text(16, 1, 'OO');
  b.set(6, 2, 'R');
  b.set(1, 2, 'p').set(18, 2, 'p').set(1, 9, 'p').set(18, 9, 'p');
  b.fill(7, 4, 12, 7, 'r');
  b.text(3, 9, 'bbb').text(14, 9, 'bbb');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'tile',
    start: { x: 10, y: 8, dir: 'up' },
    terminal: { id: 0, x: 6, y: 2 },
    npcs: [{ id: 'profe', x: 14, y: 3, kind: 'profe', glitch: true, dialogue: 'profeLoop' }],
    bugs: [
      { id: 'v1', kind: 'nullPointer', path: [[13, 5], [17, 5]] },
      { id: 'v2', kind: 'spaghetti', path: [[5, 4], [5, 8]] },
    ],
    signs: [{ x: 5, y: 1, key: 'welcome' }, { x: 13, y: 1, key: 'board' }],
    bits: [[8, 3], [17, 5], [2, 7]],
  };
}

// ============================================================================
// Soda: tienda de la señora (la única que no está glitcheada)
// ============================================================================
function soda() {
  const b = new Room(20, 11);
  b.door('W', 5, 'vestibulo');
  b.text(8, 1, 'MM').text(2, 1, 'O').text(15, 1, 'OO');
  b.text(6, 3, 'CCCCCCCC').set(6, 2, 'C').set(13, 2, 'C');
  b.set(16, 2, 'V').set(17, 2, 'V');
  b.text(3, 6, 'TT').text(9, 7, 'TT').text(14, 6, 'TT');
  b.set(1, 2, 'p').set(18, 9, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'soda',
    npcs: [
      { id: 'senora', x: 10, y: 2, kind: 'senora', glitch: false, shop: true },
      { id: 'compa1', x: 4, y: 8, kind: 'student', variant: 1, glitch: true, dialogue: 'studentSoda' },
    ],
    bugs: [
      { id: 's1', kind: 'loop', path: [[8, 5], [12, 5], [12, 9], [8, 9]], loop: true },
      { id: 's2', kind: 'nullPointer', path: [[16, 5], [16, 9]] },
    ],
    signs: [{ x: 8, y: 1, key: 'menu' }],
    bits: [[2, 9], [17, 4]],
  };
}

// ============================================================================
// Sala vieja: donde Choco programó a N.U.L.L. (pizarra con el TODO)
// ============================================================================
function salaVieja() {
  const b = new Room(20, 11);
  b.door('E', 5, 'vestibulo');
  b.text(6, 1, 'PPPPPPPP').text(2, 1, 'O').text(16, 1, 'O');
  b.text(3, 4, 'DD').text(7, 4, 'DD').text(3, 7, 'DD').text(7, 7, 'DD').text(11, 7, 'DD');
  b.set(1, 9, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'old',
    board: { x0: 6, x1: 13, y: 1 }, // la pizarra con el TODO
    npcs: [],
    bugs: [
      { id: 'o1', kind: 'leak', path: [[15, 3], [15, 8]] },
      { id: 'o2', kind: 'race', path: [[2, 9], [9, 9]] },
    ],
    signs: [],
    bits: [[12, 4], [17, 9]],
  };
}

// ============================================================================
// Aula 3: dos circuitos de compuertas lógicas dibujados en el piso
// ============================================================================
export const AULA = {
  // Palancas de cada circuito (x de A..D) en la fila LEVER_Y; la reja de salida de cada uno
  c1: { levers: [3, 5, 7, 9], gate: { x: 12, y0: 5, y1: 6 } },
  c2: { levers: [15, 17, 19, 21], gate: { x: 24, y0: 5, y1: 6 } },
  LEVER_Y: 8,
  carne: { x: 28, y: 5 },
};

// Posiciones de las compuertas en el piso (en tiles, centro de la caja)
export const CIRCUIT_LAYOUT = {
  c1: { n1: [5.5, 6], g1: [4.5, 4], g2: [8.5, 6], g3: [8, 3.5] },
  c2: { x1: [16.5, 6.2], x2: [20.5, 6.2], n1: [22, 4.6], o1: [18.5, 4.4], a1: [19.5, 3], a2: [22.5, 2.6] },
};

function aula3() {
  const b = new Room(31, 11);
  b.door('N', 1, 'vestibulo');
  b.text(4, 1, 'PPPP').text(15, 1, 'PPPP').text(26, 1, 'OO');
  // Divisiones con reja (se abren al resolver cada circuito)
  b.fill(12, 2, 12, 9, '#').set(12, 5, 'G').set(12, 6, 'G');
  b.fill(24, 2, 24, 9, '#').set(24, 5, 'G').set(24, 6, 'G');
  for (const x of AULA.c1.levers) b.set(x, AULA.LEVER_Y, 'l');
  for (const x of AULA.c2.levers) b.set(x, AULA.LEVER_Y, 'l');
  b.text(10, 2, 'D');
  b.text(26, 8, 'DD').text(29, 2, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'tile',
    npcs: [{ id: 'profe2', x: 27, y: 3, kind: 'profe', variant: 1, glitch: true, dialogue: 'profeAula' }],
    bugs: [
      { id: 'a1', kind: 'race', path: [[3, 2], [9, 2]] },
      { id: 'a2', kind: 'loop', path: [[25, 9], [29, 9], [29, 4]] },
    ],
    signs: [],
    bits: [[1, 9], [11, 9], [23, 2]],
  };
}

// ============================================================================
// Pasillo principal: conecta todo; la puerta del auditorio pide 3 carnés
// ============================================================================
function pasillo() {
  const b = new Room(32, 11);
  b.door('S', 15, 'vestibulo').door('W', 5, 'biblioteca').door('E', 5, 'laboratorio').door('N', 15, 'auditorio', { gate: true });
  b.text(2, 1, 'LLLLLLL').text(10, 1, 'N').text(20, 1, 'N').text(23, 1, 'LLLLLLL');
  b.set(13, 2, 'R');
  b.set(18, 2, 'p').set(1, 2, 'p').set(30, 2, 'p');
  b.text(4, 9, 'bbb').text(25, 9, 'bbb');
  b.fill(14, 3, 17, 8, 'r');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'tile',
    terminal: { id: 1, x: 13, y: 2 },
    auditoriumDoor: { x: 15, y: 1 },
    npcs: [
      { id: 'compa2', x: 7, y: 3, kind: 'student', variant: 2, glitch: true, dialogue: 'studentHall' },
      { id: 'compa3', x: 26, y: 7, kind: 'student', variant: 3, glitch: true, dialogue: 'studentExam' },
    ],
    bugs: [
      { id: 'p1', kind: 'race', path: [[3, 6], [11, 6]] },
      { id: 'p2', kind: 'loop', path: [[20, 3], [28, 3], [28, 5], [20, 5]], loop: true },
      { id: 'p3', kind: 'spaghetti', path: [[21, 8], [29, 8]] },
    ],
    signs: [{ x: 10, y: 1, key: 'exit' }, { x: 20, y: 1, key: 'auditorium' }],
    bits: [[2, 4], [12, 8], [19, 8], [29, 4]],
  };
}

// ============================================================================
// Laboratorio de cómputo: 8 computadoras = 8 bits
// ============================================================================
export const LAB = {
  computers: [5, 6, 7, 8, 9, 10, 11, 12], // x de cada bit (128 → 1), fila COMP_Y
  COMP_Y: 4,
  lever: { x: 15, y: 4 },
  screen: { x0: 7, x1: 10, y: 1 },
  carne: { x: 13, y: 6 },
};

function laboratorio() {
  const b = new Room(20, 11);
  b.door('W', 5, 'pasillo');
  b.text(7, 1, 'MMMM').text(2, 1, 'O').text(14, 1, 'NN').text(17, 1, 'O');
  for (const x of LAB.computers) b.set(x, LAB.COMP_Y, 'c');
  b.set(LAB.lever.x, LAB.lever.y, 'l');
  b.text(3, 8, 'ccc').text(14, 8, 'ccc');
  b.set(1, 2, 'p').set(18, 2, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'lab',
    npcs: [{ id: 'compa4', x: 17, y: 6, kind: 'student', variant: 4, glitch: true, dialogue: 'studentLab' }],
    bugs: [
      { id: 'l1', kind: 'leak', path: [[2, 6], [8, 6]] },
      { id: 'l2', kind: 'nullPointer', path: [[10, 9], [17, 9]] },
    ],
    signs: [{ x: 14, y: 1, key: 'labRules' }],
    bits: [[1, 9], [18, 8]],
  };
}

// ============================================================================
// Biblioteca: sala 1 de estantes + zona de lectura. Al norte, la sala 2.
// ============================================================================
export const LIB1 = { area: { x0: 1, y0: 2, x1: 10, y1: 9 }, reset: { x: 11, y: 3 }, gate: { x: 4 } };
export const LIB2 = { area: { x0: 1, y0: 2, x1: 18, y1: 9 }, reset: { x: 8, y: 9 }, gate: { x0: 9, x1: 10, y: 3 }, carne: { x: 9, y: 2 }, nook: { x: 2, y: 3 } };

function biblioteca() {
  const b = new Room(20, 11);
  b.door('E', 5, 'pasillo').door('N', 4, 'biblioteca2', { gate: true });
  b.text(8, 1, 'NN').text(14, 1, 'OO');
  // Sala 1 (x 1..10): estantes fijos alrededor
  rowsAt(b, 1, 2, [
    'BBB..BBBBB',
    'B........B',
    'B.h...&..B',
    'B....&&...',
    'B..h......',
    'B......x.B',
    'B.x......B',
    'BBBBBBBBBB',
  ]);
  b.set(LIB1.reset.x, LIB1.reset.y, 'l');
  // Zona de lectura
  b.text(13, 3, 'TT').text(16, 3, 'TT').text(13, 7, 'TT').text(16, 7, 'TT');
  b.set(18, 9, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'wood',
    npcs: [{ id: 'biblio', x: 18, y: 2, kind: 'profe', variant: 2, glitch: true, dialogue: 'librarian' }],
    bugs: [
      { id: 'b1', kind: 'spaghetti', path: [[12, 5], [18, 5]] },
      { id: 'b2', kind: 'race', path: [[15, 9], [15, 2]] },
    ],
    signs: [{ x: 8, y: 1, key: 'silence' }],
    bits: [[12, 9], [18, 4]],
  };
}

function biblioteca2() {
  const b = new Room(20, 11);
  b.door('S', 9, 'biblioteca');
  b.text(5, 1, 'NN').text(13, 1, 'OO');
  rowsAt(b, 1, 2, [
    'BBBBBBBB..BBBBBBBB',
    'BnB.....GG.......B',
    '.hx..&......&....B',
    '....h.....h...x..B',
    'B.....&&.........B',
    'B.h......x...&...B',
    'B................B',
    'BBBBBBBl..BBBBBBBB',
  ]);
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'wood',
    npcs: [],
    bugs: [],
    signs: [],
    bits: [[17, 8], [2, 8]],
  };
}

// ============================================================================
// Auditorio: la tarima de MC Stack Overflow y Stward en su jaula
// ============================================================================
export const AUDITORIUM = { stack: { x: 10, y: 3 }, cage: { x: 14, y: 2 }, trigger: 8 };

function auditorio() {
  const b = new Room(20, 14);
  b.door('S', 9, 'pasillo');
  b.fill(2, 2, 17, 4, 'S');
  b.fill(2, 5, 17, 5, 'k').set(9, 5, 'S').set(10, 5, 'S');
  b.fill(2, 7, 7, 7, 's').fill(12, 7, 17, 7, 's');
  b.fill(2, 9, 7, 9, 's').fill(12, 9, 17, 9, 's');
  b.fill(2, 11, 7, 11, 's').fill(12, 11, 17, 11, 's');
  b.fill(8, 6, 11, 12, 'r');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'auditorium',
    npcs: [],
    bugs: [],
    signs: [],
    bits: [],
  };
}

let built = null;
export function level2Rooms() {
  if (built) return built;
  built = {
    vestibulo: { id: 'vestibulo', ...vestibulo() },
    soda: { id: 'soda', ...soda() },
    salaVieja: { id: 'salaVieja', ...salaVieja() },
    aula3: { id: 'aula3', ...aula3() },
    pasillo: { id: 'pasillo', ...pasillo() },
    laboratorio: { id: 'laboratorio', ...laboratorio() },
    biblioteca: { id: 'biblioteca', ...biblioteca() },
    biblioteca2: { id: 'biblioteca2', ...biblioteca2() },
    auditorio: { id: 'auditorio', ...auditorio() },
  };
  return built;
}

// Terminales de guardado (id → sala)
export const L2_TERMINALS = [
  { id: 0, room: 'vestibulo' },
  { id: 1, room: 'pasillo' },
];

// Fondos de batalla según la zona
export const BATTLE_BG = {
  vestibulo: 'hall',
  pasillo: 'hall',
  soda: 'soda',
  salaVieja: 'old',
  aula3: 'class',
  laboratorio: 'lab',
  biblioteca: 'library',
  biblioteca2: 'library',
  auditorio: 'stage',
};
