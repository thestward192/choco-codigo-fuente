// Tiles de la UNA (vista cenital 3/4) — docs/04_arte.md
//   paredes #E9DCC3, acento vino #8C2F39, madera #6B4E3D, pizarras #2D5A3D
// Cálido y académico: pisos distintos por sala (linóleo, madera, soda, laboratorio, alfombra).
// Cada tile se pinta una vez con el pintor de grillas y se hornea.
import { Grid } from '../painter.js';
import { Sprite } from '../bake.js';
import { SCREEN } from '../../config/balance.js';

const TS = SCREEN.TILE;

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export const UNA_PAL = {
  o: '#2A1A14', // contorno
  // Paredes
  w: '#E9DCC3', // crema
  W: '#CDBE9F', // crema sombra
  q: '#F6EEDC', // crema luz
  v: '#8C2F39', // vino
  V: '#5E1E26', // vino sombra
  u: '#B04A52', // vino luz
  d: '#6B4E3D', // madera
  D: '#4A3428', // madera oscura
  e: '#8A6A50', // madera luz
  E: '#C8A070', // madera clara (pupitres)
  t: '#2D5A3D', // pizarra
  T: '#1E3E2A', // pizarra sombra
  // Pisos
  f: '#D8CBB0', // linóleo
  F: '#C4B698', // linóleo sombra
  g: '#E6DCC4', // linóleo luz
  p: '#B8885A', // parqué
  P: '#9A6E44', // parqué sombra
  r: '#E8E0D0', // baldosa soda blanca
  R: '#B83A3A', // baldosa soda roja
  l: '#A8B0B8', // laboratorio
  L: '#8E969E',
  a: '#7A2A34', // alfombra vino
  A: '#5A1E26',
  // Objetos
  m: '#5A5A6E', // metal
  M: '#8A8AA0', // metal luz
  n: '#3A3A4A', // metal oscuro
  s: '#8FB3D9', // vidrio
  S: '#C8DDF0', // vidrio luz
  c: '#43D9FF', // cian
  k: '#101018', // pantalla apagada
  y: '#FFD23F', // amarillo
  Y: '#B8902A',
  x: '#4CBB4C', // planta
  X: '#2E8A3A',
  h: '#F4F1EA', // blanco (papeles, tiza)
  z: '#E07A3A', // naranja (libros)
  Z: '#3A6EA8', // azul (libros)
  j: '#FF7DB0', // rosado
  b: '#2B2B38', // casi negro
};

// ---------- Pisos ----------
function floor(style, variant) {
  const g = new Grid(TS, TS, 'f');
  const v = variant;
  if (style === 'tile' || style === 'old') {
    // Linóleo en losetas de 8×8 alternadas
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const alt = ((x >> 3) + (y >> 3)) % 2 === 0;
      g.set(x, y, alt ? 'f' : 'g');
      if (hash(x + v * 16, y, 3) < 0.04) g.set(x, y, 'F');
    }
    g.hline(0, 15, 0, 'F').vline(0, 0, 15, 'F');
    if (style === 'old') {
      // Polvo y grietas
      for (let i = 0; i < 6; i++) g.set(Math.floor(hash(v, i, 5) * 16), Math.floor(hash(i, v, 6) * 16), 'W');
      if (v % 3 === 0) g.line(3, 4, 7, 8, 'F').line(7, 8, 6, 12, 'F');
    }
  } else if (style === 'wood' || style === 'stage') {
    // Parqué en tablas horizontales
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, 'p');
    for (let y = 3; y < TS; y += 4) g.hline(0, 15, y, 'P');
    for (let r = 0; r < 4; r++) {
      const off = Math.floor(hash(v, r, 2) * 12) + 2;
      g.vline(off, r * 4, r * 4 + 2, 'P');
    }
    for (let i = 0; i < 5; i++) g.set(Math.floor(hash(v, i, 7) * 16), Math.floor(hash(i, v, 8) * 16), 'e');
    if (style === 'stage') g.hline(0, 15, 0, 'e');
  } else if (style === 'soda') {
    // Baldosas rojas y blancas
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, ((x >> 3) + (y >> 3)) % 2 === 0 ? 'r' : 'R');
  } else if (style === 'lab') {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, 'l');
    g.hline(0, 15, 0, 'L').vline(0, 0, 15, 'L');
    g.hline(0, 15, 8, 'L').vline(8, 0, 15, 'L');
    if (v % 2) g.set(4, 4, 'M').set(12, 12, 'M');
  } else if (style === 'auditorium' || style === 'rug') {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, (x + y) % 4 === 0 ? 'A' : 'a');
  }
  return g;
}

// ---------- Paredes ----------
// Tope de pared (visto desde arriba): madera oscura con borde claro
function wallTop() {
  const g = new Grid(TS, TS, 'D');
  for (let i = 0; i < 6; i++) g.set(Math.floor(hash(i, 1, 9) * 16), Math.floor(hash(1, i, 9) * 16), 'd');
  return g;
}

// Cara de pared: crema arriba, franja vino y zócalo de madera
function wallFace() {
  const g = new Grid(TS, TS, 'w');
  g.hline(0, 15, 0, 'q');
  for (let i = 0; i < 4; i++) g.set(Math.floor(hash(i, 2, 4) * 16), 1 + Math.floor(hash(2, i, 4) * 7), 'W');
  g.rect(0, 9, 15, 12, 'v').hline(0, 15, 9, 'u').hline(0, 15, 12, 'V');
  g.rect(0, 13, 15, 15, 'd').hline(0, 15, 13, 'e').hline(0, 15, 15, 'D');
  return g;
}

function onFace(fn) {
  const g = wallFace();
  fn(g);
  return g;
}

const ART = {
  '#': wallTop,
  W: wallFace,
  O: () =>
    onFace((g) => {
      // Ventana con marco de madera y cielo
      g.rect(2, 1, 13, 10, 'd');
      g.rect(3, 2, 12, 9, 's');
      g.hline(3, 12, 2, 'S').set(4, 3, 'S').set(5, 3, 'S');
      g.vline(7, 2, 9, 'd').vline(8, 2, 9, 'e');
      g.hline(2, 13, 11, 'e');
    }),
  P: () =>
    onFace((g) => {
      // Pizarra verde de borde a borde (se arma en tira)
      g.rect(0, 1, 15, 10, 't');
      g.hline(0, 15, 1, 'd').hline(0, 15, 10, 'd').hline(0, 15, 11, 'e');
      g.hline(0, 15, 9, 'T');
    }),
  L: () =>
    onFace((g) => {
      // Casilleros metálicos
      g.rect(0, 0, 15, 13, 'm');
      g.vline(0, 0, 13, 'n').vline(8, 0, 13, 'n').hline(0, 15, 0, 'M');
      for (const x of [2, 10]) {
        g.hline(x, x + 3, 3, 'n').hline(x, x + 3, 5, 'n');
        g.set(x + 4, 8, 'M');
      }
    }),
  N: () =>
    onFace((g) => {
      // Pizarra de corcho con avisos
      g.rect(1, 1, 14, 10, 'e');
      g.frame(1, 1, 14, 10, 'd');
      g.rect(3, 3, 6, 6, 'h').rect(8, 2, 12, 5, 'S').rect(9, 6, 12, 9, 'j');
      g.set(4, 2, 'R').set(10, 1, 'R');
    }),
  M: () =>
    onFace((g) => {
      // Pantalla grande (laboratorio) / pizarra del menú (soda)
      g.rect(0, 1, 15, 10, 'b');
      g.hline(0, 15, 1, 'n').hline(0, 15, 10, 'n');
    }),
  D: () => {
    // Pupitre con silla
    const g = new Grid(TS, TS);
    g.rect(1, 2, 14, 8, 'E').hline(1, 14, 2, 'q').hline(1, 14, 8, 'e').frame(0, 1, 15, 9, 'o');
    g.rect(3, 4, 6, 6, 'h').set(9, 5, 'Z').set(10, 5, 'Z');
    g.vline(2, 10, 12, 'n').vline(13, 10, 12, 'n');
    g.rect(4, 11, 11, 14, 'v').hline(4, 11, 11, 'u').frame(3, 10, 12, 15, 'o');
    return g;
  },
  T: () => {
    // Mesa (soda / biblioteca)
    const g = new Grid(TS, TS);
    g.rect(1, 3, 14, 11, 'e').hline(1, 14, 3, 'E').hline(1, 14, 11, 'd').frame(0, 2, 15, 12, 'o');
    g.vline(2, 13, 15, 'D').vline(13, 13, 15, 'D');
    g.rect(5, 5, 8, 8, 'h').set(6, 6, 'd').set(11, 6, 'y');
    return g;
  },
  C: () => {
    // Mostrador de la soda
    const g = new Grid(TS, TS);
    g.rect(0, 2, 15, 6, 'E').hline(0, 15, 2, 'q').hline(0, 15, 6, 'e');
    g.rect(0, 7, 15, 15, 'v').hline(0, 15, 7, 'V').hline(0, 15, 15, 'V');
    g.vline(7, 8, 14, 'u');
    g.hline(0, 15, 1, 'o');
    return g;
  },
  V: () => {
    // Máquina de café
    const g = new Grid(TS, TS);
    g.rect(2, 0, 13, 15, 'm').frame(1, 0, 14, 15, 'o');
    g.rect(4, 2, 11, 6, 'b').set(5, 3, 'c').set(6, 3, 'c');
    g.set(10, 8, 'R').rect(6, 10, 9, 13, 'n').set(7, 12, 'h');
    return g;
  },
  B: () => {
    // Estante fijo de libros
    const g = new Grid(TS, TS, 'D');
    g.frame(0, 0, 15, 15, 'o');
    for (const sy of [1, 8]) {
      let x = 1;
      while (x < 15) {
        const w = 1 + Math.floor(hash(x, sy, 11) * 2);
        const col = ['v', 'Z', 'x', 'y', 'z', 'j', 'h'][Math.floor(hash(sy, x, 12) * 7)];
        const top = sy + Math.floor(hash(x, sy, 13) * 2);
        g.rect(x, top, Math.min(14, x + w - 1), sy + 5, col);
        x += w + (hash(x, sy, 14) < 0.15 ? 1 : 0);
      }
      g.hline(1, 14, sy + 6, 'e');
    }
    return g;
  },
  c: () => {
    // Escritorio con computadora (la pantalla se dibuja aparte según su estado)
    const g = new Grid(TS, TS);
    g.rect(0, 9, 15, 13, 'E').hline(0, 15, 9, 'q').hline(0, 15, 13, 'e').frame(0, 8, 15, 14, 'o');
    g.rect(3, 0, 12, 7, 'M').frame(2, 0, 13, 8, 'o');
    g.rect(4, 1, 11, 6, 'k');
    g.rect(6, 10, 10, 11, 'n');
    return g;
  },
  p: () => {
    // Planta en maceta
    const g = new Grid(TS, TS);
    g.ellipse(7.5, 5, 6, 5, 'X');
    g.ellipse(7, 4.5, 4.5, 3.5, 'x');
    g.set(4, 3, 'q').set(9, 2, 'q');
    g.rect(4, 10, 11, 15, 'v').hline(4, 11, 10, 'u').frame(3, 10, 12, 15, 'o');
    return g;
  },
  b: () => {
    // Banca de madera
    const g = new Grid(TS, TS);
    g.rect(0, 5, 15, 7, 'e').rect(0, 9, 15, 11, 'e').hline(0, 15, 5, 'E').hline(0, 15, 9, 'E');
    g.hline(0, 15, 12, 'D').vline(1, 12, 15, 'n').vline(14, 12, 15, 'n');
    return g;
  },
  s: () => {
    // Butacas del auditorio
    const g = new Grid(TS, TS);
    for (const x of [0, 8]) {
      g.rect(x + 1, 2, x + 6, 7, 'v').hline(x + 1, x + 6, 2, 'u').rect(x + 1, 8, x + 6, 12, 'V');
      g.frame(x, 1, x + 7, 13, 'o');
    }
    return g;
  },
  k: () => {
    // Borde frontal de la tarima
    const g = new Grid(TS, TS, 'D');
    g.hline(0, 15, 0, 'e').hline(0, 15, 1, 'd');
    for (let x = 3; x < TS; x += 8) g.vline(x, 2, 15, 'o');
    return g;
  },
  R: () => {
    // Terminal de guardado (la pantalla se anima aparte)
    const g = new Grid(TS, TS);
    g.rect(2, 0, 13, 15, 'n').frame(1, 0, 14, 15, 'o');
    g.rect(3, 2, 12, 8, 'k').hline(3, 12, 1, 'M');
    g.rect(4, 11, 11, 12, 'm').set(5, 11, 'M').set(7, 11, 'M').set(9, 11, 'M');
    return g;
  },
  l: () => {
    // Base de palanca (el brazo se dibuja aparte según su estado)
    const g = new Grid(TS, TS);
    g.rect(3, 9, 12, 14, 'm').frame(2, 8, 13, 15, 'o').hline(3, 12, 9, 'M');
    g.rect(6, 10, 9, 13, 'b');
    return g;
  },
  '&': () => {
    // Pila de libros baja
    const g = new Grid(TS, TS);
    const cols = ['v', 'Z', 'y', 'x', 'z'];
    for (let i = 0; i < 4; i++) {
      const y = 13 - i * 3;
      const x0 = 2 + Math.floor(hash(i, 3, 2) * 3);
      g.rect(x0, y - 2, x0 + 9, y, cols[i]).hline(x0, x0 + 9, y - 2, 'h');
      g.frame(x0 - 1, y - 3, x0 + 10, y + 1, 'o');
    }
    return g;
  },
  G: () => {
    // Reja cerrada
    const g = new Grid(TS, TS);
    g.hline(0, 15, 1, 'n').hline(0, 15, 14, 'n');
    for (let x = 1; x < TS; x += 3) g.vline(x, 0, 15, 'm').set(x, 0, 'M');
    g.hline(0, 15, 7, 'v').hline(0, 15, 8, 'V');
    return g;
  },
};

// Caché por (carácter, estilo de piso, variante)
const cache = new Map();
const FLOOR_VARIANTS = 4;

export function unaTile(ch, style, tx, ty) {
  let key;
  let build;
  if (ART[ch]) {
    key = ch;
    build = () => ART[ch]().toRows();
  } else {
    let st = style;
    if (ch === 'r') st = 'rug';
    else if (ch === 'S') st = 'stage';
    else if (ch === 'n') st = 'wood';
    const v = Math.floor(hash(tx, ty, 21) * FLOOR_VARIANTS);
    key = `floor:${st}:${v}:${ch === 'x' ? 'x' : ''}`;
    build = () => {
      const g = floor(st, v);
      if (ch === 'x') {
        // Marca en el piso (cinta amarilla en X)
        g.line(2, 2, 13, 13, 'y').line(13, 2, 2, 13, 'y').line(3, 2, 13, 12, 'Y').line(12, 2, 2, 12, 'Y');
        g.frame(0, 0, 15, 15, 'Y');
      }
      return g.toRows();
    };
  }
  let spr = cache.get(key);
  if (!spr) {
    spr = new Sprite(build(), UNA_PAL);
    cache.set(key, spr);
  }
  return spr;
}

// Para las pruebas: todas las definiciones usan colores de la paleta
export function allUnaTileRows() {
  const out = {};
  for (const ch of Object.keys(ART)) out[ch] = ART[ch]().toRows();
  for (const st of ['tile', 'old', 'wood', 'stage', 'soda', 'lab', 'auditorium', 'rug']) out[`floor:${st}`] = floor(st, 1).toRows();
  return out;
}

// Tiles que se dibujan "por encima" de Choco cuando pasa detrás (la parte alta de un objeto)
export const TALL_TILES = new Set(['p', 'V', 'B', 'c', 'R']);
