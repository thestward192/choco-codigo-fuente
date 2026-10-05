// Nivel 5 · El Código Puro — docs/niveles/nivel_5_codigo_puro.md
// El Stack: una escalada vertical en 5 secciones (≈ 14 pantallas en total) que exige todos los
// objetos, y la arena de N.U.L.L. (una pantalla). Cada sección sube hasta una cornisa con una
// salida en la pared derecha; la sección siguiente empieza abajo.
//
//   5-A Push            plataformas que aparecen y se apilan (doble salto obligatorio)
//   5-B Firewall        capas de fuego que solo se cruzan con el escudo, torretas y candados (parry)
//   5-C Memoria fantasma plataformas fantasma con descansos sólidos (batería de la Vista Debug)
//   5-D Punteros        cadena de nodos del lazo sobre un pozo, con Fragmentos de N.U.L.L.
//   5-E Overflow        todo lo anterior mientras la masa de datos corruptos sube desde abajo
//
// Tiles: # bloque de datos · = marco del stack (un sentido) · g fantasma (Vista Debug)
//        L candado (sólido hasta romper su torreta)
// Entidades: P inicio · ! checkpoint (terminal) · $ bit · Y Y dorada · C Grano de Cacao · H Trozo
//        n nodo del lazo · x Fragmento de N.U.L.L.
// Con parámetros (listas): push (plataformas del Push), segments (Segmentos corruptos),
//        firewalls (rectángulos de fuego), turrets (con el candado que abren)
import { MapBuilder } from '../mapBuilder.js';
import { T, DEFAULT_LEGEND } from '../../systems/tilemap.js';

export const CODE_LEGEND = {
  ...DEFAULT_LEGEND,
  L: T.SOLID,
};

const W = 20;
const LEDGE = 4; // fila de la cornisa de arriba (con la salida en la pared derecha)

// Pozo con paredes, techo, suelo y la cornisa de salida. gapX: tramo de un sentido en la cornisa
// para subir atravesándola desde abajo.
function shaft(H, gap) {
  const b = new MapBuilder(W, H);
  const G = H - 2;
  b.ground(0, W - 1, G);
  b.vline(0, 0, H - 1, '#').vline(1, 0, H - 1, '#');
  b.vline(W - 2, 0, H - 1, '#').vline(W - 1, 0, H - 1, '#');
  b.fill(2, 0, W - 3, 1, '#');
  b.hline(2, W - 3, LEDGE, '#');
  b.hline(gap[0], gap[1], LEDGE, '=');
  // Salida: hueco en la pared derecha, sobre la cornisa
  b.fill(W - 2, LEDGE - 2, W - 1, LEDGE - 1, '.');
  return { b, G };
}

const exitDoor = { x: W - 2, row: LEDGE - 1 };

// ---------- 5-A · Push ----------
function buildA() {
  const H = 30;
  const { b, G } = shaft(H, [8, 10]);
  b.set(3, G - 1, 'P');
  b.set(5, G - 1, '!');
  b.text(13, G - 2, '$$$');
  b.text(14, 15, '$$');
  b.set(3, 10, 'C');
  return {
    rows: b.toRows(),
    floor: G,
    // Aparecen en orden: cada una cuando Choco pisa la anterior (la primera al empezar a subir).
    // Separadas 4 filas: sin el doble salto no se llega.
    push: [
      { x0: 8, x1: 11, row: G - 4, from: -1 },
      { x0: 13, x1: 16, row: G - 8, from: 1 },
      { x0: 7, x1: 10, row: G - 12, from: -1 },
      { x0: 2, x1: 5, row: G - 16, from: -1 },
      { x0: 7, x1: 10, row: G - 20, from: 1 },
    ],
    // Un desvío con Segmentos corruptos (se borran 0.5 s después de pisarlos)
    segments: [
      { x: 13, y: G - 12, w: 2 },
      { x: 14, y: G - 16, w: 2 },
    ],
    echo: 'oscar',
    exitDoor,
  };
}

// ---------- 5-B · Firewall ----------
function buildB() {
  const H = 34;
  const { b, G } = shaft(H, [6, 8]);
  b.set(3, G - 1, 'P');
  b.hline(6, 9, G - 3, '=');
  b.hline(11, 14, G - 6, '=');
  // Capa de fuego 1 entre b (G-6) y c (G-10): se cruza saltando con el escudo activo
  b.hline(5, 10, G - 10, '=');
  b.hline(2, 5, G - 14, '=');
  // Candado 1: tapa todo el pozo hasta que se rompa la torreta de la pared derecha
  b.hline(2, W - 3, G - 16, 'L');
  b.hline(7, 10, G - 19, '=');
  b.hline(12, 15, G - 21, '=');
  // Capa de fuego 2 entre f (G-21) y g (G-25)
  b.hline(6, 9, G - 25, '=');
  // Desvío de la Y dorada: un cubículo en la pared izquierda cerrado por el candado 2
  b.fill(2, G - 22, 4, G - 22, '#');
  b.fill(2, G - 25, 5, G - 25, '#');
  b.vline(5, G - 24, G - 23, 'L');
  b.set(3, G - 23, 'Y');
  b.text(12, G - 8, '$$');
  b.text(8, G - 21, '$$');
  b.set(16, G - 22, 'H');
  return {
    rows: b.toRows(),
    floor: G,
    firewalls: [
      { x0: 2, x1: W - 3, row: G - 9 },
      { x0: 6, x1: W - 3, row: G - 24 },
    ],
    turrets: [
      // dir: hacia dónde apunta el cañón; lock: los tiles 'L' que abre al romperse
      { x: W - 3, y: G - 13, dir: -1, lock: { x0: 2, x1: W - 3, y0: G - 16, y1: G - 16 } },
      { x: W - 3, y: G - 23, dir: -1, lock: { x0: 5, x1: 5, y0: G - 24, y1: G - 23 } },
    ],
    echo: 'hezron',
    exitDoor,
  };
}

// ---------- 5-C · Memoria fantasma ----------
function buildC() {
  const H = 32;
  const { b, G } = shaft(H, [9, 11]);
  b.set(3, G - 1, 'P');
  // Tramo 1: tres fantasmas hasta el primer descanso
  b.hline(7, 8, G - 3, 'g');
  b.hline(11, 12, G - 6, 'g');
  b.hline(15, 16, G - 9, 'g');
  b.hline(12, 15, G - 12, '='); // descanso: apagar la vista para recargar
  // Tramo 2
  b.hline(8, 9, G - 15, 'g');
  b.hline(4, 5, G - 18, 'g');
  b.hline(2, 3, G - 21, 'g');
  b.hline(5, 8, G - 24, '='); // descanso
  // Desvío de la Y dorada: cadena fantasma larga hacia la derecha (exige gastar la batería)
  b.set(17, G - 15, 'g');
  b.hline(14, 15, G - 18, 'g');
  b.set(17, G - 21, 'g');
  b.set(17, G - 23, 'Y');
  b.text(13, G - 13, '$$');
  b.text(6, G - 25, '$$');
  return { rows: b.toRows(), floor: G, echo: 'stward', exitDoor };
}

// ---------- 5-D · Punteros ----------
// Pozo central sin piso alto: cornisas en las paredes y un nodo sobre el vacío entre cada par.
function buildD() {
  const H = 30;
  const { b, G } = shaft(H, [3, 5]);
  b.set(4, G - 1, 'P');
  b.set(6, G - 1, '!');
  const steps = [
    // [cornisa x0, x1, fila] · el nodo va entre una cornisa y la siguiente. La primera está 5 filas
    // sobre el piso del pozo, para que el columpio no lo toque.
    [2, 5, G - 5],
    [14, 17, G - 7],
    [2, 5, G - 10],
    [14, 17, G - 13],
    [2, 5, G - 16],
    [14, 17, G - 19],
    [2, 5, G - 22],
  ];
  for (const [x0, x1, y] of steps) b.hline(x0, x1, y, '=');
  // Nodos sobre el pozo, 3 filas arriba de la cornisa de partida (así el nodo siguiente siempre
  // queda más cerca que el anterior, que ya quedó abajo)
  const nodes = [
    [9, G - 8],
    [10, G - 10],
    [9, G - 13],
    [10, G - 16],
    [9, G - 19],
    [10, G - 22],
  ];
  for (const [x, y] of nodes) b.set(x, y, 'n');
  b.text(14, G - 9, '$$');
  b.text(2, G - 18, '$$');
  b.set(16, G - 10, 'x');
  b.set(5, G - 19, 'x');
  return { rows: b.toRows(), floor: G, echo: 'fabiola', exceptions: true, exitDoor };
}

// ---------- 5-E · Overflow ----------
function buildE() {
  const H = 40;
  const { b, G } = shaft(H, [4, 6]);
  b.set(3, G - 1, 'P');
  b.hline(6, 9, G - 3, '=');
  b.hline(15, 17, G - 9, '=');
  // Capa de fuego entre c (G-9) y d (G-13)
  b.hline(10, 13, G - 13, '=');
  b.hline(6, 7, G - 16, 'g');
  b.hline(2, 3, G - 19, 'g');
  b.hline(5, 8, G - 22, '=');
  // Nodo sobre el hueco hacia la derecha
  b.set(11, G - 26, 'n');
  b.hline(14, 17, G - 24, '=');
  b.hline(4, 7, G - 30, '=');
  // Desvío de la Y dorada: arriba a la derecha, sobre Segmentos que se borran
  b.set(16, G - 30, 'Y');
  b.set(4, LEDGE - 1, '!');
  b.text(7, G - 4, '$$');
  b.text(15, G - 10, '$$');
  b.set(15, G - 25, 'x');
  return {
    rows: b.toRows(),
    floor: G,
    segments: [
      { x: 11, y: G - 6, w: 3 },
      { x: 9, y: G - 27, w: 3 },
      { x: 15, y: G - 27, w: 2 },
    ],
    firewalls: [{ x0: 2, x1: W - 3, row: G - 12 }],
    overflow: true,
    exceptions: true,
    echo: 'all',
    exitDoor,
  };
}

// ---------- Arena de N.U.L.L. ----------
// Una pantalla: suelo, 3 plataformas flotantes y los nodos de la fase 4 (siempre en el mapa,
// pero solo se usan cuando el suelo se derrumba).
function buildArena() {
  const H = 12;
  const G = 10;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.vline(0, 0, H - 1, '#').vline(W - 1, 0, H - 1, '#');
  b.hline(2, 5, G - 3, '=');
  b.hline(14, 17, G - 3, '=');
  b.hline(8, 11, G - 5, '=');
  for (const [x, y] of [
    [4, 4],
    [8, 2],
    [11, 2],
    [15, 4],
    [10, 6],
  ])
    b.set(x, y, 'n');
  return {
    rows: b.toRows(),
    floor: G,
    // Fase 4: dos plataformas pequeñas que aparecen y desaparecen (alternadas)
    smallPlatforms: [
      { x: 3, y: G - 2, w: 2, phase: 0 },
      { x: 15, y: G - 2, w: 2, phase: 0.5 },
    ],
  };
}

let built = null;
export function level5Sections() {
  if (built) return built;
  built = {
    A: { id: 'A', name: 'push', glitch: 0.05, ...buildA() },
    B: { id: 'B', name: 'firewall', glitch: 0.15, ...buildB() },
    C: { id: 'C', name: 'ghost', glitch: 0.3, ...buildC() },
    D: { id: 'D', name: 'pointers', glitch: 0.45, ...buildD() },
    E: { id: 'E', name: 'overflow', glitch: 0.65, ...buildE() },
    arena: { id: 'arena', name: 'arena', glitch: 0.8, ...buildArena() },
  };
  return built;
}

export const SECTION_ORDER = ['A', 'B', 'C', 'D', 'E', 'arena'];

// Checkpoints: al inicio, después de la sección 3 y antes del jefe (en la cima del Overflow)
export const L5_CHECKPOINTS = [
  { id: 0, section: 'A' },
  { id: 1, section: 'D' },
  { id: 2, section: 'E' },
];

// Índice de la Y dorada de cada sección: una en la 2, la 3 y la 5
export const GOLDEN_INDEX = { B: 0, C: 1, E: 2 };
