// Mapas del nivel 3 · Oficinas de Novacomp (sigilo, vista cenital) — docs/niveles/nivel_3_novacomp.md
//
//  [3-A Recepción] → [3-B Open space] → [3-C Terraza] → [3-D Pasillo de gerencia] → [3-E Servidores] → [Práctica]
//    checkpoint        checkpoint         Hezron          checkpoint                  checkpoint (jefe)
//
// Cada sala es un arreglo de strings (un tile de 16×16 por carácter) más los enemigos con sus
// rutas, las terminales (y lo que controla cada una), los escondites y los objetos.
// Vista 3/4 como en el nivel 2: la fila 1 es la cara de la pared.
import { MapBuilder } from '../mapBuilder.js';
import { T } from '../../systems/tilemap.js';

// ---------- Leyenda ----------
//  #  pared (tope)        W  cara de pared        O  ventana de noche     N  pizarra con post-its
//  M  rótulo NOVACOMP     E  ascensor (no sirve)  L  casilleros (escondite)
//  C  cafetera            H  terminal de hackeo   D  escritorio con dos monitores
//  d  escritorio con tela (escondite)             T  mesa de reuniones    g  pared de vidrio
//  p  planta              b  bean bag             r  mostrador de recepción
//  P  impresora           S  rack de servidores   K  caja fuerte          G  puerta cerrada
//  ~  baranda (terraza)   k  cielo con la ciudad
//  .  alfombra   t  piso de la terraza   A  toldo (sombra en el piso)   x  piso metálico
const SOLID_CHARS = '#WONMELCHDdTgpbrPSKG~k';
// Lo que corta los conos de visión (el vidrio, los escritorios y las barandas no)
export const OPAQUE_CHARS = new Set('#WONMELCSKPGk');
export const HIDE_CHARS = new Set(['L', 'd']);

export const L3_LEGEND = { '.': T.EMPTY };
for (const ch of SOLID_CHARS) L3_LEGEND[ch] = T.SOLID;

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

  // Puerta de 2 tiles. side: 'N' | 'S' | 'W' | 'E'; at: x (N/S) o y (W/E) del primer tile.
  // gate: empieza cerrada ('G') y se abre por código (hackeo, jefe vencido).
  door(side, at, to, { gate = false } = {}) {
    const { w, h } = this;
    const ch = gate ? 'G' : '.';
    if (side === 'N') this.set(at, 0, '.').set(at + 1, 0, '.').set(at, 1, ch).set(at + 1, 1, ch);
    else if (side === 'S') this.set(at, h - 1, ch).set(at + 1, h - 1, ch);
    else if (side === 'W') this.set(0, at, ch).set(0, at + 1, ch);
    else this.set(w - 1, at, ch).set(w - 1, at + 1, ch);
    this.doors.push({ side, at, to, gate });
    return this;
  }
}

// Pared interior horizontal de 3/4: tope en `y`, cara en `y + 1`
function hWall(b, x0, x1, y) {
  b.fill(x0, y, x1, y, '#');
  b.fill(x0, y + 1, x1, y + 1, 'W');
}

// ============================================================================
// 3-A · Recepción y lobby · Checkpoint
// Tutorial de sigilo: 2 cámaras giratorias, 1 BotSeg con ruta simple y una terminal que
// enseña a hackear (apaga la cámara que vigila la puerta).
// ============================================================================
function lobby() {
  const b = new Room(24, 13);
  b.door('N', 18, 'openspace');
  b.text(2, 1, 'OO').text(7, 1, 'MMMMMM').text(14, 1, 'EE').text(20, 1, 'OO');
  b.text(7, 3, 'rrrrrr');
  b.set(1, 2, 'p').set(22, 2, 'p').set(1, 11, 'p').set(22, 11, 'p');
  b.text(16, 9, 'bb').text(19, 9, 'b');
  b.set(13, 6, 'd');
  b.set(4, 9, 'H');
  b.text(5, 11, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'lobby',
    checkpoint: true,
    start: { x: 11, y: 11, dir: 'up' },
    bots: [{ id: 'a1', path: [[3, 7], [20, 7]] }],
    cameras: [
      { id: 'ca1', x: 5, y: 1, a0: 40, a1: 140 },
      { id: 'ca2', x: 17, y: 1, a0: 70, a1: 160 },
    ],
    drones: [],
    lasers: [],
    vacuums: [],
    terminals: [{ id: 'ta', x: 4, y: 9, effect: 'cameraOff', target: 'ca2', cfg: 'TUTORIAL', tutorial: true }],
    npcs: [],
    signs: [{ x: 15, y: 1, key: 'elevator' }],
    bits: [[2, 4], [21, 4], [12, 9]],
  };
}

// ============================================================================
// 3-B · Open space · Checkpoint
// Filas de escritorios, 3 BotSeg con rutas que se cruzan, 1 aspiradora robot, 2 cámaras,
// la sala del daily (vidrio), la cafetera y el escritorio de "Choco".
// ============================================================================
function openspace() {
  const b = new Room(34, 18);
  b.door('S', 3, 'lobby').door('E', 13, 'terrace');
  b.text(6, 1, 'OO').text(9, 1, 'NN').text(13, 1, 'OO').text(19, 1, 'LL').text(25, 1, 'OOO').text(30, 1, 'N');
  b.set(16, 2, 'C');
  // Sala del daily (vidrio) con su mesa
  b.vline(23, 2, 7, 'g').hline(23, 32, 7, 'g');
  b.set(27, 7, '.').set(28, 7, '.');
  b.text(27, 4, 'TT');
  b.set(31, 2, 'p');
  // Escritorios (en pares, espalda con espalda)
  b.text(5, 4, 'DDDDd').text(5, 5, 'DDDDD');
  b.text(13, 4, 'DDDDDD').text(13, 5, 'dDDDDD');
  b.text(5, 9, 'DDDDD').text(5, 10, 'DDDDD');
  b.text(13, 9, 'DDDDDD').text(13, 10, 'DDDDDd');
  b.text(24, 10, 'DDDDDD').text(24, 11, 'dDDDDD');
  b.text(5, 13, 'DDDDD').text(5, 14, 'DDDDd');
  b.text(13, 13, 'DDDDDD').text(13, 14, 'DDDDDD');
  b.set(1, 2, 'p').set(32, 16, 'p').set(1, 16, 'p');
  b.set(21, 2, 'H').set(2, 12, 'H');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'carpet',
    checkpoint: true,
    bots: [
      { id: 'b1', path: [[2, 7], [21, 7]] },
      { id: 'b2', path: [[11, 2], [11, 16]] },
      { id: 'b3', path: [[21, 12], [31, 12], [31, 16], [21, 16]], loop: true, alt: [[24, 8], [31, 8]] },
    ],
    cameras: [
      { id: 'cb1', x: 11, y: 1, a0: 50, a1: 130 },
      { id: 'cb2', x: 33, y: 9, a0: 125, a1: 205, side: 'E' },
    ],
    drones: [],
    lasers: [],
    vacuums: [{ id: 'vb', x: 4, y: 15, area: [2, 11, 22, 16] }],
    terminals: [
      { id: 'tb1', x: 21, y: 2, effect: 'route', target: 'b3', cfg: 'NORMAL' },
      { id: 'tb2', x: 2, y: 12, effect: 'cameraOff', target: 'cb2', cfg: 'NORMAL' },
    ],
    npcs: [
      { id: 'dev1', x: 26, y: 4, kind: 'office', variant: 0, glitch: true },
      { id: 'dev2', x: 29, y: 4, kind: 'office', variant: 1, glitch: true },
      { id: 'dev3', x: 27, y: 3, kind: 'office', variant: 2, glitch: true },
      { id: 'dev4', x: 28, y: 5, kind: 'office', variant: 3, glitch: true },
    ],
    daily: { x0: 24, y0: 2, x1: 32, y1: 6 },
    coffee: { x: 16, y: 2 },
    chocoDesk: { x: 6, y: 10 },
    golden: { index: 2, x: 6, y: 11, debugOnly: true },
    signs: [],
    bits: [[3, 3], [10, 12], [20, 15], [30, 9], [25, 3]],
  };
}

// ============================================================================
// 3-C · Terraza · Rescate de Hezron
// Noche con luces de la ciudad. Dos carriles separados por maceteras: arriba 2 drones (el
// mini tutorial de la nube, lleva a la salida); abajo 3 drones y el toldo con la Y dorada.
// ============================================================================
function terrace() {
  const b = new Room(30, 14);
  b.fill(0, 0, 29, 0, 'k');
  b.fill(1, 1, 28, 1, '~');
  b.set(0, 1, '#').set(29, 1, '#');
  b.door('W', 7, 'openspace').door('E', 3, 'gerencia');
  b.hline(10, 28, 6, 'p');
  b.text(2, 3, 'bb').set(2, 10, 'b').set(7, 11, 'p');
  b.fill(24, 8, 28, 11, 'A');
  b.set(28, 8, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'deck',
    checkpoint: false,
    bots: [],
    cameras: [],
    drones: [
      { id: 'dc1', cx: 15, cy: 3.5, r: 22, speed: 1, phase: 0 },
      { id: 'dc2', cx: 21, cy: 4, r: 22, speed: -1, phase: 2 },
      { id: 'dc3', cx: 13, cy: 9.5, r: 18, speed: 1, phase: 1 },
      { id: 'dc4', cx: 17.5, cy: 9.5, r: 18, speed: -1, phase: 3 },
      { id: 'dc5', cx: 22, cy: 9.5, r: 18, speed: 1, phase: 5 },
    ],
    lasers: [],
    vacuums: [],
    terminals: [],
    npcs: [],
    hezron: { x: 5, y: 4 },
    golden: { index: 1, x: 27, y: 10 },
    signs: [],
    bits: [[8, 2], [12, 8], [20, 11], [26, 4]],
  };
}

// ============================================================================
// 3-D · Pasillo de gerencia y láseres · Checkpoint
// Ruta directa por el pasillo (láseres rítmicos, 2 drones, 1 BotSeg; más corta, pide nubes)
// o por la sala de impresión (más larga, menos guardias). Las dos terminan bajo la cámara
// que cubre el último tramo. La oficina de gerencia tiene la caja fuerte con una Y dorada.
// ============================================================================
function gerencia() {
  const b = new Room(36, 16);
  b.door('W', 7, 'terrace').door('E', 8, 'servers');
  // Fila de oficinas cerradas arriba, con la de gerencia abierta
  b.fill(1, 1, 34, 5, '#');
  b.fill(12, 1, 21, 1, 'W');
  b.fill(12, 2, 21, 4, '.');
  b.fill(1, 6, 34, 6, 'W');
  b.set(16, 5, '.').set(17, 5, '.').set(16, 6, '.').set(17, 6, '.');
  b.set(20, 2, 'K').set(12, 2, 'p').text(13, 4, 'dD');
  b.text(4, 6, 'N').text(9, 6, 'OO').text(24, 6, 'NN').set(6, 6, 'H');
  // Pared hacia la sala de impresión, con dos pasos (oeste y este)
  hWall(b, 1, 34, 10);
  for (const x of [3, 4, 30, 31]) b.set(x, 10, '.').set(x, 11, '.');
  b.set(25, 11, 'H').text(12, 11, 'OO');
  // Sala de impresión
  b.set(8, 12, 'P').set(13, 12, 'P').set(18, 12, 'P').set(22, 12, 'P');
  b.set(10, 14, 'd').set(20, 14, 'd').set(27, 14, 'p').set(1, 14, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'carpet',
    checkpoint: true,
    bots: [
      { id: 'd1', path: [[10, 8], [17, 8]] },
      { id: 'd2', path: [[6, 13], [28, 13]] },
    ],
    cameras: [{ id: 'cd1', x: 31, y: 6, a0: 25, a1: 155 }],
    drones: [
      { id: 'dd1', cx: 14, cy: 8, r: 14, speed: 1, phase: 0 },
      { id: 'dd2', cx: 23, cy: 8, r: 14, speed: -1, phase: 2 },
    ],
    lasers: [
      { id: 'l1', x: 8, y0: 7, y1: 9, phase: 0 },
      { id: 'l2', x: 19, y0: 7, y1: 9, phase: 0.9 },
      { id: 'l3', x: 26, y0: 7, y1: 9, phase: 1.8 },
    ],
    vacuums: [{ id: 'vd', x: 15, y: 14, area: [2, 12, 33, 14] }],
    terminals: [
      { id: 'td1', x: 6, y: 6, effect: 'lasersOff', target: 'l1,l2,l3', cfg: 'NORMAL' },
      { id: 'td2', x: 25, y: 11, effect: 'cameraOff', target: 'cd1', cfg: 'NORMAL' },
      { id: 'safe', x: 20, y: 2, effect: 'safe', cfg: 'SAFE' },
    ],
    npcs: [],
    golden: { index: 0, x: 20, y: 3, fromSafe: true },
    signs: [],
    bits: [[14, 3], [2, 13], [33, 13], [12, 8], [29, 8]],
  };
}

// ============================================================================
// 3-E · Sala de servidores · Jefe DEADLINE
// Arena de 20×11 tiles con 4 columnas-servidor; las 3 terminales son entidades (en el último
// tercio cambian de lugar).
// ============================================================================
export const ARENA = {
  center: { x: 11, y: 7.5 }, // en tiles
  terminals: [
    [2, 2],
    [19, 2],
    [10, 12],
  ],
  terminalsLate: [
    [14, 2],
    [7, 12],
    [20, 9],
  ],
  lockX: 3, // al pasar de aquí empieza la pelea y se cierra la puerta
};

function servers() {
  const b = new Room(22, 14);
  b.door('W', 6, 'gerencia').door('E', 6, 'practice', { gate: true });
  b.text(2, 1, 'SS').text(6, 1, 'SS').text(14, 1, 'SS').text(18, 1, 'SS');
  for (const [x, y] of [
    [5, 4],
    [15, 4],
    [5, 9],
    [15, 9],
  ])
    b.fill(x, y, x + 1, y + 1, 'S');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'metal',
    checkpoint: true,
    boss: true,
    bots: [],
    cameras: [],
    drones: [],
    lasers: [],
    vacuums: [],
    terminals: [],
    npcs: [],
    signs: [],
    bits: [],
  };
}

// ============================================================================
// Sala de práctica del Escudo Firewall (al salir de los servidores)
// ============================================================================
function practice() {
  const b = new Room(16, 9);
  b.door('W', 4, 'servers').door('E', 4, 'exit', { gate: true });
  b.text(3, 1, 'N').text(10, 1, 'N');
  b.set(1, 2, 'p').set(14, 7, 'p');
  return {
    rows: b.toRows(),
    doors: b.doors,
    floor: 'metal',
    checkpoint: false,
    practice: true,
    turret: { x: 12, y: 2 },
    bots: [],
    cameras: [],
    drones: [],
    lasers: [],
    vacuums: [],
    terminals: [],
    npcs: [],
    signs: [],
    bits: [],
  };
}

export const ROOM_ORDER = ['lobby', 'openspace', 'terrace', 'gerencia', 'servers', 'practice'];

export function level3Rooms() {
  const out = { lobby: lobby(), openspace: openspace(), terrace: terrace(), gerencia: gerencia(), servers: servers(), practice: practice() };
  for (const [id, r] of Object.entries(out)) r.id = id;
  return out;
}
