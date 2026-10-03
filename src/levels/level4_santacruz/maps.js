// Nivel 4 · Santa Cruz — docs/niveles/nivel_4_santa_cruz.md
// Secciones: 4-A Entrada al pueblo → 4-B Plaza y fiestas → 4-C El Redondel → 4-D Ruinas del
// Campanario (vertical) → arena del Torito Kernel → 4-E Atardecer (práctica del lazo).
// Los mapas se arman con MapBuilder; las entidades simples van como caracteres y las que llevan
// parámetros (puestos, árboles, columnas de sol, plataformas que se desmoronan…) en listas.
//
// Tiles: # tierra · A adobe · R tejas · W madera · B ladrillo · c columna · = tablón (un sentido)
//        f banderines (un sentido) · g plataforma fantasma (Vista Debug)
// Entidades: P inicio · ! checkpoint (farol) · $ bit · Y Y dorada · C Grano de Cacao · H Trozo
//        t Toro · b Bombetero · h Sabanero · z bandada de zanates · o olla de tamales
//        w bebedero · T árbol de guanacaste · k carreta · n nodo del lazo
import { MapBuilder } from '../mapBuilder.js';
import { T, DEFAULT_LEGEND } from '../../systems/tilemap.js';

export const SC_LEGEND = {
  ...DEFAULT_LEGEND,
  A: T.SOLID,
  R: T.SOLID,
  W: T.SOLID,
  B: T.SOLID,
  c: T.SOLID,
  f: T.ONEWAY,
};

// Tiles cuyos tramos horizontales dan sombra hacia abajo (aleros, el arco del patio, capiteles…).
// Cada sección puede cambiar la lista con `shadeRuns`.
export const SHADE_RUN_CHARS = ['R', 'A', '='];

// ---------- 4-A · Entrada al pueblo (≈ 70 tiles) ----------
function buildA() {
  const W = 72;
  const H = 12;
  const G = 10;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.set(2, G - 1, 'P');
  // Tutorial del calor: tramos cortos de sol entre guanacastes
  b.set(8, G - 1, 'T');
  b.text(12, 7, '$$$');
  b.set(18, G - 1, 'T');
  // Primer toro en terreno plano
  b.set(27, G - 1, 't');
  b.set(31, G - 1, 'T');
  b.text(24, 6, '$$');
  b.set(36, G - 1, 'w');
  // Zanates posados sobre un guanacaste
  b.set(41, G - 1, 'T');
  b.set(41, 5, 'z');
  // Cuesta: escalones hacia la olla de los tamales (ruedan cuesta abajo)
  b.fill(45, G - 1, 45, G - 1, '#');
  b.fill(46, G - 2, 47, G - 1, '#');
  b.fill(48, G - 3, 54, G - 1, '#');
  b.set(53, G - 4, 'o');
  b.text(49, 4, '$$$');
  b.set(51, 3, 'C');
  b.fill(55, G - 2, 55, G - 1, '#');
  // Carreta (sombra) y el pozo del sabanero
  b.set(58, G - 1, 'k');
  b.gap(62, 64);
  b.set(67, G - 1, 'h');
  b.text(62, 6, '$$$');
  b.set(70, G - 1, 'T');
  return {
    rows: b.toRows(),
    floor: G,
    signs: [
      { x: 4, key: 'entrada' },
      { x: 10, key: 'sombra' },
      { x: 59, key: 'sabanero' },
    ],
    trees: { 8: 84, 18: 72, 31: 80, 41: 76, 70: 72 },
    pots: { 53: -1 },
    flocks: { 41: 4 },
    next: 'B',
  };
}

// ---------- 4-B · Plaza y fiestas (≈ 90 tiles) · Checkpoint ----------
function buildB() {
  const W = 96;
  const H = 15;
  const G = 12;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.set(3, G - 1, '!');
  b.text(8, 9, '$$');
  // Bebedero después de los puestos
  b.set(46, G - 1, 'w');
  // Banderines como plataformas para subir a los techos
  b.hline(48, 50, 9, 'f');
  // Casa 1: alero de tejas (sombra en la calle) con un bombetero arriba
  b.hline(51, 58, 8, 'R');
  b.set(55, 7, 'b');
  b.hline(59, 62, 9, 'f');
  b.text(59, 7, '$$$$');
  // Casa 2, más alta, con otro bombetero
  b.hline(63, 72, 7, 'R');
  b.set(69, 6, 'b');
  // Camino por los techos: plataformas fantasma (Vista Debug) hacia el patio trasero
  b.hline(74, 75, 5, 'g');
  b.hline(77, 78, 3, 'g');
  b.set(77, 1, 'Y'); // Y dorada 1: en el camino fantasma
  // Patio trasero en alto (sobre un arco de la calle): horno de barro con la rosquilla
  b.fill(80, 5, 91, 6, 'A');
  b.fill(80, 2, 80, 4, 'A');
  b.fill(91, 2, 91, 4, 'A');
  b.set(86, 5, '=').set(87, 5, '=');
  b.set(86, 6, '.').set(87, 6, '.');
  b.text(82, 4, '$$');
  // La calle sigue por debajo del patio
  b.set(77, G - 1, 't');
  b.text(84, 9, '$$$');
  b.set(93, G - 1, 'k');
  return {
    rows: b.toRows(),
    floor: G,
    signs: [
      { x: 6, key: 'plaza' },
      { x: 47, key: 'techos' },
    ],
    // Puestos de comida (con toldo) y la tarima de marimba
    stalls: [
      { x: 12, food: 'chorreada', colors: ['#FF6B8A', '#F4F1EA'] },
      { x: 19, food: 'tanela', colors: ['#FFD23F', '#C8612E'] },
      { x: 33, food: 'arroz', colors: ['#4FD1C5', '#F4F1EA'] },
      { x: 40, food: 'empanada', colors: ['#6E8B3D', '#FFD23F'] },
    ],
    marimba: { x: 26 },
    oven: { x: 84, floorRow: 5 },
    plazaIntroAt: 9,
    front: true, // guirnalda de banderines en primer plano
    next: 'C',
  };
}

// ---------- 4-C · El Redondel (≈ 60 tiles) · Checkpoint ----------
function buildC() {
  const W = 40;
  const H = 13;
  const G = 11;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.set(3, G - 1, '!');
  b.set(6, G - 1, 'w');
  // Muros del redondel (las puertas son huecos que se cierran)
  b.fill(9, 3, 9, 6, 'W');
  b.fill(32, 3, 32, 6, 'W');
  // Gradas: plataformas altas con sombra arriba; escalones a media altura
  b.hline(10, 13, 7, '=');
  b.hline(28, 31, 7, '=');
  b.hline(15, 16, 9, '=');
  b.hline(25, 26, 9, '=');
  // Banderines al centro y la bandera más alta (Y dorada 2 en la tercera oleada)
  b.hline(19, 22, 6, 'f');
  b.text(18, 4, '$');
  b.text(23, 4, '$');
  b.set(13, 5, 'H');
  return {
    rows: b.toRows(),
    floor: G,
    signs: [{ x: 5, key: 'redondel' }],
    ring: { gateL: 9, gateR: 32, gateRows: [7, 10], trigger: 11, golden: { x: 20.5, y: 2 } },
    // Las gradas tienen techo de manta: sombra solo sobre la plataforma alta
    awnings: [
      { x0: 10, x1: 13, row: 4, h: 3 },
      { x0: 28, x1: 31, row: 4, h: 3 },
    ],
    flagpole: { x: 20.5, top: 1 },
    shadeRuns: [], // en el redondel solo hay sombra bajo el techo de las gradas
    next: 'D',
  };
}

// ---------- 4-D · Ruinas del Campanario (escalada vertical) · Checkpoint antes del jefe ----------
function buildD() {
  const W = 20;
  const H = 84;
  const b = new MapBuilder(W, H);
  const G = H - 2;
  b.ground(0, W - 1, G, 'B');
  b.vline(0, 0, H - 1, 'B').vline(1, 0, H - 1, 'B');
  b.vline(W - 2, 0, H - 1, 'B').vline(W - 1, 0, H - 1, 'B');
  b.set(3, G - 1, 'P');
  // Escalones en zigzag: el patrón alterna ladrillo, tablón, plataforma que se desmorona y
  // plataforma fantasma. Separación vertical de 3 tiles (salto simple) o 4–5 (doble salto).
  const crumbles = [];
  const steps = [
    // [x0, x1, fila, tipo]
    [7, 10, G - 3, 'B'],
    [12, 15, G - 6, '='],
    [3, 6, G - 8, 'B'],
    [8, 10, G - 11, 'crumble'],
    [13, 16, G - 14, 'B'],
    [8, 11, G - 17, '='],
    [3, 5, G - 20, 'B'],
    [7, 9, G - 24, 'g'],
    [12, 16, G - 26, 'B'],
    [7, 9, G - 29, 'crumble'],
    [2, 5, G - 32, 'B'],
    [7, 12, G - 35, '='],
    [14, 16, G - 38, 'crumble'],
    [9, 11, G - 41, 'B'],
    [3, 6, G - 44, '='],
    [8, 10, G - 47, 'g'],
    [13, 16, G - 49, 'B'],
    [9, 11, G - 52, 'crumble'],
    [3, 6, G - 55, 'B'],
    [8, 9, G - 58, 'crumble'],
    [12, 13, G - 61, 'crumble'],
    [14, 16, G - 64, 'B'],
    [8, 11, G - 67, '='],
    [3, 5, G - 70, 'B'],
    [7, 9, G - 73, 'g'],
  ];
  for (const [x0, x1, y, kind] of steps) {
    if (kind === 'crumble') crumbles.push({ x: x0, y, w: x1 - x0 + 1 });
    else b.hline(x0, x1, y, kind);
  }
  // Rellanos de ladrillo pegados a los muros (descanso entre tramos)
  b.hline(2, 3, G - 38, 'B');
  // Cima: piso del campanario con el checkpoint y la puerta hacia la arena del jefe
  const top = G - 76;
  b.hline(2, 17, top, 'B');
  b.hline(6, 9, top, '='); // se sube atravesándolo desde abajo
  b.fill(W - 2, top - 3, W - 1, top - 1, '.');
  b.set(4, top - 1, '!');
  // Bits, cacao y zanates
  b.text(8, G - 4, '$$$');
  b.text(4, G - 21, '$$');
  b.text(13, G - 27, '$$$');
  b.text(9, G - 42, '$$');
  b.text(14, G - 50, '$$$');
  b.text(9, G - 68, '$$$');
  b.set(15, G - 15, 'C');
  b.set(4, G - 56, 'H');
  b.set(15, G - 30, 'z');
  b.set(4, G - 48, 'z');
  b.set(15, G - 66, 'z');
  return {
    rows: b.toRows(),
    floor: G,
    top,
    vertical: true,
    signs: [{ x: 6, key: 'ruinas' }],
    crumbles,
    // Columnas de sol que entran por los huecos del muro y se mecen con el tiempo
    beams: [
      { x: 6, y0: G - 14, y1: G - 2, phase: 0 },
      { x: 12, y0: G - 33, y1: G - 18, phase: 1.6 },
      { x: 8, y0: G - 50, y1: G - 36, phase: 3.1 },
      { x: 11, y0: G - 66, y1: G - 52, phase: 0.8 },
      { x: 7, y0: G - 76, y1: G - 67, phase: 2.2 },
    ],
    flocks: { 15: 3, 4: 4 },
    exitDoor: { x: W - 2, row: top - 1 },
  };
}

// ---------- Arena del Torito Kernel: la cima del campanario ----------
function buildArena() {
  const W = 20;
  const H = 12;
  const G = 10;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G, 'B');
  b.vline(0, 0, H - 1, 'B').vline(W - 1, 0, H - 1, 'B');
  // Dos columnas que dan sombra (con capitel de tablón) y dos plataformas altas
  for (const x of [6, 13]) {
    b.vline(x, G - 3, G - 1, 'c');
    b.hline(x - 1, x + 1, G - 4, '=');
  }
  b.hline(1, 2, G - 6, '=');
  b.hline(17, 18, G - 6, '=');
  return { rows: b.toRows(), floor: G, bell: { x: 10, y: 1 }, shadeRuns: ['='] };
}

// ---------- 4-E · Atardecer: práctica del lazo (≈ 60 tiles) ----------
function buildE() {
  const W = 80;
  const H = 14;
  const G = 11;
  const b = new MapBuilder(W, H);
  b.ground(0, 5, G);
  b.set(2, G - 1, 'P');
  b.set(3, G - 1, '!');
  // Reto 1: de nodo en nodo sobre un hueco
  b.set(9, 6, 'n');
  b.ground(14, 19, G);
  // Reto 2: lazo + doble salto hasta una cornisa alta
  b.set(22, 5, 'n');
  b.ground(30, 35, G - 4);
  // Reto 3: cadena de 5 nodos sobre el vacío
  b.set(39, 4, 'n');
  b.set(44, 5, 'n');
  b.set(49, 4, 'n');
  b.set(54, 5, 'n');
  b.set(59, 4, 'n');
  b.ground(63, W - 1, G);
  b.text(41, 8, '$');
  b.text(46, 8, '$');
  b.text(51, 8, '$');
  b.text(56, 8, '$');
  // Cadena opcional muy exigente hacia una cornisa alta con la Y dorada 3
  b.set(67, 5, 'n');
  b.set(72, 1, 'n');
  b.hline(75, 77, 3, 'B');
  b.set(76, 2, 'Y');
  return {
    rows: b.toRows(),
    floor: G,
    signs: [{ x: 4, key: 'barranco' }],
    challenges: [
      { x: 5, i: 0 },
      { x: 19, i: 1 },
      { x: 35, i: 2 },
    ],
    portal: { x: 74 },
  };
}

let built = null;
export function level4Sections() {
  if (built) return built;
  built = {
    A: { id: 'A', heat: 'sun', bg: 'day', ...buildA() },
    B: { id: 'B', heat: 'sun', bg: 'day', ...buildB() },
    C: { id: 'C', heat: 'sun', bg: 'day', ...buildC() },
    D: { id: 'D', heat: 'shade', bg: 'ruins', ...buildD() },
    arena: { id: 'arena', heat: 'sun', bg: 'day', ...buildArena() },
    E: { id: 'E', heat: 'none', bg: 'sunset', ...buildE() },
  };
  return built;
}

export const SECTION_ORDER = ['A', 'B', 'C', 'D', 'arena', 'E'];

// Checkpoints del nivel (id guardado → sección). El de 4-E implica jefe vencido.
export const L4_CHECKPOINTS = [
  { id: 0, section: 'B' },
  { id: 1, section: 'C' },
  { id: 2, section: 'D' },
  { id: 3, section: 'E' },
];
