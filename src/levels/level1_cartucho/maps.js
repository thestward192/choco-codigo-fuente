// Nivel 1 · Mundo Cartucho — docs/niveles/nivel_1_mundo_cartucho.md
// Tres secciones continuas (1-A Pradera, 1-B Cuevas, 1-C Castillo), una sala secreta de bits
// y la arena del Guardián del Slot. Los mapas se arman con MapBuilder; las entidades simples van
// como caracteres y las que llevan parámetros (cables, barras, plataformas…) en listas.
//
// Tiles: # suelo · B bloque · = un sentido · c nube (un sentido) · K agrietado (disparo cargado)
//        Q bloque Y con bit · C bloque Y con Grano de Cacao · M bloque Y de varios bits
//        H bloque Y con Trozo de Cacao · U bloque usado · i bloque invisible · { } [ ] tubería
// Entidades: P inicio · b Byteling · n Byteling que no gira en bordes · d Disquete · m Mosquito
//        a Blindado · S Bloque spam · $ bit · Y Y dorada · ! checkpoint
import { MapBuilder } from '../mapBuilder.js';
import { T, DEFAULT_LEGEND } from '../../systems/tilemap.js';

export const L1_LEGEND = {
  ...DEFAULT_LEGEND,
  B: T.SOLID,
  Q: T.SOLID,
  C: T.SOLID,
  M: T.SOLID,
  H: T.SOLID,
  U: T.SOLID,
  '{': T.SOLID,
  '}': T.SOLID,
  '[': T.SOLID,
  ']': T.SOLID,
  c: T.ONEWAY,
  i: T.HIDDEN,
};

// ---------- 1-A · Pradera de Píxeles ----------
function buildA() {
  const W = 106;
  const H = 15;
  const G = 12; // fila superior del suelo
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.set(2, G - 1, 'P');
  // Bits de bienvenida y primeros bloques Y
  b.text(8, 9, '$$$');
  // Fila de bloques Y: se pasa por debajo y se golpea saltando; para subirse encima está el
  // escalón de la izquierda (el salto no llega a 3 tiles desde el suelo)
  b.text(12, 9, 'BQCQB');
  b.set(10, G - 1, 'B');
  b.set(14, 5, 'Q');
  b.set(19, G - 1, 'b');
  b.pipe(23, G - 2, 2); // tubería decorativa
  // Hueco 1 y plataformas de un sentido (con bits arriba)
  b.gap(29, 30);
  b.hline(32, 34, 9, '=');
  b.hline(35, 37, 6, '=');
  b.text(35, 5, '$$$');
  b.set(39, 8, 'm');
  // Disquete en terreno plano y más bloques Y
  b.set(42, G - 1, 'd');
  b.text(44, 9, 'QBMB');
  b.gap(49, 50);
  // La "rampa": escalones que suben a una meseta con un Disquete y bajan a una zanja con 4 Bytelings
  b.fill(51, G - 1, 51, G - 1, '#');
  b.fill(52, G - 2, 52, G - 1, '#');
  b.fill(53, G - 3, 58, G - 1, '#'); // meseta (arriba en la fila 9: desde ahí se ve la zanja)
  b.set(57, G - 4, 'd');
  b.fill(59, G - 2, 59, G - 1, '#');
  b.fill(60, G - 1, 60, G - 1, '#');
  b.text(63, G - 1, 'n.n.n.n');
  b.fill(71, G - 2, 71, G - 1, '#'); // pared de la zanja
  b.text(64, 8, '$$$$$');
  // Bit suelto (punto sospechoso) y escalera de bloques invisibles hacia las nubes
  b.set(76, 9, '$');
  b.set(76, 8, 'i');
  b.set(78, 6, 'i');
  b.set(80, 4, 'i');
  b.hline(82, 94, 2, 'c');
  b.text(84, 1, '$$$$$$');
  b.set(93, 1, 'Y'); // Y dorada 1: encima de las nubes
  // Voladizo con dos bloques spam colgando
  b.hline(84, 88, 7, 'B');
  b.set(85, 8, 'S');
  b.set(87, 8, 'S');
  b.set(90, G - 1, 'b');
  b.set(92, 10, 'm');
  b.gap(96, 97);
  // Salida: tubería de datos hacia las cuevas
  b.pipe(100, G - 2, 2);
  return {
    rows: b.toRows(),
    signs: [
      { x: 5, key: 'pradera' },
      { x: 47, key: 'ramp' },
      { x: 98, key: 'pipe' },
    ],
    // Escalera secreta: el primer bloque revela los demás en cascada
    hiddenChain: [
      [76, 8],
      [78, 6],
      [80, 4],
    ],
    exit: { type: 'pipe', x: 100, top: G - 2, to: 'B' },
  };
}

// ---------- 1-B · Cuevas del Cartucho ----------
function buildB() {
  const W = 86;
  const H = 12;
  const G = 10;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.ceiling(0, W - 1, 1);
  b.vline(0, 0, H - 1, '#');
  b.pipe(1, G - 2, 2); // por aquí se llega desde la pradera
  b.set(5, G - 1, '!');
  b.set(13, G - 1, 'a');
  b.set(16, G - 1, 'b');
  b.text(10, 6, '$$');
  // Cables pelados con ritmo (ver lista)
  b.set(26, 6, 'C');
  // Mosquitos en formación (ver lista) y el pasillo de plataformas móviles sobre el vacío
  b.gap(33, 52, G);
  b.text(37, 3, '$$');
  b.text(46, 3, '$$');
  // Tubería "decorativa" (secreta) y su cartel
  b.pipe(57, G - 2, 2);
  b.set(60, 6, 'C');
  b.set(66, G - 1, 'b');
  // Pasillo estrecho con un Blindado
  b.ceiling(68, 76, 6);
  b.set(72, G - 1, 'a');
  b.text(69, G - 1, '$');
  b.text(78, 6, 'QBQ');
  b.vline(W - 1, 0, H - 1, '#');
  return {
    rows: b.toRows(),
    entry: { type: 'pipe', x: 1, top: G - 2 },
    signs: [
      { x: 8, key: 'cuevas' },
      { x: 55, key: 'fakePipe' },
    ],
    cables: [
      { x: 20, phase: 0 },
      { x: 22.5, phase: 0.18 },
      { x: 25, phase: 0.36 },
      { x: 63, phase: 0 },
      { x: 65.5, phase: 0.5 },
    ],
    formations: [{ x: 30, y: 8.5 }],
    mosquitos: [
      { x: 40, y: 5.6 },
      { x: 48, y: 4.6, phase: 0.5 },
    ],
    moving: [
      { from: [33, G], to: [38, G], w: 2 },
      { from: [41, G], to: [41, 5], w: 2, phase: 0.25 },
      { from: [44, 7], to: [50, 7], w: 2, phase: 0.5 },
    ],
    secretPipe: { x: 57, top: G - 2 },
    door: { x: 82, y: G - 1, to: 'C' },
  };
}

// ---------- Sala secreta de bits (entrada por la tubería falsa de 1-B) ----------
function buildSecret() {
  const W = 20;
  const H = 12;
  const G = 9;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.ceiling(0, W - 1, 1);
  b.vline(0, 0, H - 1, '#').vline(W - 1, 0, H - 1, '#');
  b.pipe(2, G - 2, 2); // llegada
  b.pipe(16, G - 2, 2); // regreso
  // Bits en arco y la Y dorada sobre una plataforma
  b.text(6, 6, '$$$$$$$$');
  b.text(7, 4, '$$$$$$');
  b.hline(5, 6, 7, '=');
  b.hline(13, 14, 7, '=');
  b.hline(9, 11, 5, '=');
  b.set(10, 3, 'Y'); // Y dorada 2: la tubería secreta
  b.text(5, 8, '$');
  b.text(14, 8, '$');
  return {
    rows: b.toRows(),
    entry: { type: 'pipe', x: 2, top: G - 2 },
    exit: { type: 'pipe', x: 16, top: G - 2, to: 'B', back: true },
  };
}

// ---------- 1-C · Castillo de Silicio ----------
function buildC() {
  const W = 78;
  const H = 12;
  const G = 10;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.ceiling(0, W - 1, 1);
  b.vline(0, 0, H - 1, '#');
  b.set(4, G - 1, '!');
  // Pozo de estática 1 (géiser)
  b.gap(9, 11, G);
  // Barra de estática y pasillo estrecho con Blindado
  b.ceiling(21, 28, 6);
  b.set(25, G - 1, 'a');
  // Plataformas que caen sobre el vacío
  b.gap(31, 38, G);
  // Sala clave: dos barras en sentidos opuestos y pilares pequeños
  b.gap(41, 52, G);
  b.fill(43, 8, 44, H - 1, '#');
  b.fill(47, 8, 48, H - 1, '#');
  b.fill(51, 8, 52, H - 1, '#');
  b.set(47, 6, '$');
  b.set(55, G - 1, 'a');
  b.set(56, 6, 'H'); // Trozo de Cacao antes del final
  // Pozo de estática 2
  b.gap(58, 59, G);
  // Pared falsa: un macizo con un hueco escondido detrás de bloques agrietados
  b.set(61, G - 1, 'B');
  b.hline(62, 63, 7, '=');
  b.fill(64, 5, 69, G - 1, '#');
  b.fill(65, 8, 66, 9, '.');
  b.fill(64, 8, 64, 9, 'K');
  b.set(65, 9, 'Y'); // Y dorada 3: la pared falsa
  // Antesala del jefe
  b.set(71, G - 1, '!');
  b.vline(W - 1, 0, H - 1, '#');
  return {
    rows: b.toRows(),
    entry: { type: 'door', x: 2 },
    signs: [
      { x: 6, key: 'castillo' },
      { x: 73, key: 'boss' },
    ],
    geysers: [
      { x0: 9, x1: 12, phase: 0 },
      { x0: 58, x1: 60, phase: 0.5 },
    ],
    bars: [
      { x: 17.5, y: 6.5, n: 4, dir: 1 },
      { x: 45.5, y: 4, n: 4, dir: 1, angle: 0 },
      { x: 49.5, y: 4, n: 4, dir: -1, angle: Math.PI },
    ],
    falling: [
      { x: 31, y: 8, w: 2 },
      { x: 34, y: 7, w: 2 },
      { x: 37, y: 8, w: 1 },
    ],
    torches: [
      [3, 6],
      [14, 6],
      [30, 5],
      [40, 3],
      [54, 5],
      [71, 6],
    ],
    bossDoor: { x: 75, y: G - 1 },
    // Hueco detrás de la pared falsa: se dibuja como muro hasta que se rompe la grieta
    hiddenRoom: { tiles: [[65, 8], [66, 8], [65, 9], [66, 9]], crack: [64, 8] },
  };
}

// ---------- Arena del Guardián del Slot ----------
function buildArena() {
  const W = 20;
  const H = 12;
  const G = 10;
  const b = new MapBuilder(W, H);
  b.ground(0, W - 1, G);
  b.hline(0, W - 1, 0, '#');
  b.vline(0, 0, H - 1, '#').vline(W - 1, 0, H - 1, '#');
  // A 2 tiles del suelo: se alcanzan con el salto normal (≈50 px) y libran las ondas de choque
  b.hline(3, 5, G - 2, '=');
  b.hline(14, 16, G - 2, '=');
  return { rows: b.toRows(), floor: G };
}

let built = null;
export function level1Sections() {
  if (built) return built;
  built = {
    A: { id: 'A', theme: 'pradera', ...buildA() },
    B: { id: 'B', theme: 'cuevas', ...buildB() },
    secret: { id: 'secret', theme: 'cuevas', ...buildSecret() },
    C: { id: 'C', theme: 'castillo', ...buildC() },
    arena: { id: 'arena', theme: 'castillo', ...buildArena() },
  };
  return built;
}

// Checkpoints del nivel (id guardado → sección)
export const L1_CHECKPOINTS = [
  { id: 0, section: 'B' },
  { id: 1, section: 'C' },
  { id: 2, section: 'C' },
];
