// Tiles de Novacomp (vista cenital 3/4, de noche) — docs/04_arte.md
//   noche #1B2230, muebles #3A4A63, monitores #8FB3D9, alarma #E0343F, plantas #6FCF7F
// Oficina tech moderna: escritorios con dos monitores, post-its, vidrio, bean bags,
// racks de servidores. Frío y moderno. Cada tile se pinta una vez y se hornea.
import { Grid } from '../painter.js';
import { Sprite } from '../bake.js';
import { SCREEN } from '../../config/balance.js';

const TS = SCREEN.TILE;

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export const NOVA_PAL = {
  o: '#0B0E16', // contorno
  n: '#1B2230', // noche
  N: '#141A26',
  f: '#3A4A63', // muebles
  F: '#2C3A4F',
  u: '#4E6282',
  m: '#8FB3D9', // monitor
  M: '#C8DDF0',
  s: '#5A6E8C', // acero
  S: '#7C90AE',
  w: '#33405A', // cara de pared
  W: '#2A3448',
  q: '#44536E',
  c: '#2C3850', // alfombra
  C: '#242E42',
  l: '#34425C',
  t: '#4A3A30', // deck de la terraza
  T: '#3A2C24',
  e: '#5C4A3C',
  x: '#6FCF7F', // plantas
  X: '#3E8A4E',
  r: '#E0343F', // alarma
  R: '#8A1A22',
  y: '#FFD23F', // post-it amarillo
  Y: '#B8902A',
  p: '#FF7DB0', // post-it rosado
  g: '#43D9FF', // cian
  G: '#1E6A8A',
  k: '#0A0D16', // pantalla apagada
  h: '#E8ECF4', // blanco
  H: '#A8B0C0',
  v: '#B18CFF', // lila
  V: '#6A4AB0',
  z: '#E07A3A', // bean bag naranja
  Z: '#A8552A',
  a: '#9A7A5A', // café (taza, cartón)
  b: '#2E2240', // cielo
  B: '#3A2E58',
};

// ---------- Pisos ----------
function floor(style, v) {
  const g = new Grid(TS, TS, 'c');
  if (style === 'carpet') {
    // Alfombra modular en cuadros de 8 con textura
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const alt = ((x >> 3) + (y >> 3)) % 2 === 0;
      g.set(x, y, alt ? 'c' : 'l');
      if (hash(x + v * 16, y, 3) < 0.06) g.set(x, y, 'C');
    }
  } else if (style === 'lobby') {
    // Porcelanato pulido con reflejo
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, 'w');
    g.hline(0, 15, 0, 'W').vline(0, 0, 15, 'W');
    g.set(4 + (v % 3), 3, 'q').set(5 + (v % 3), 3, 'q').set(9, 10 - (v % 2), 'q');
  } else if (style === 'deck') {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, 't');
    for (let x = 3; x < TS; x += 4) g.vline(x, 0, 15, 'T');
    for (let i = 0; i < 4; i++) g.set(Math.floor(hash(v, i, 7) * 16), Math.floor(hash(i, v, 8) * 16), 'e');
    g.set(1 + v, 4, 'T').set(9, 11 - v, 'T');
  } else if (style === 'metal') {
    // Piso técnico elevado: placas con perforaciones
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) g.set(x, y, 'F');
    g.frame(0, 0, 15, 15, 'N').hline(1, 14, 1, 'f');
    for (let y = 4; y < 13; y += 3) for (let x = 4; x < 13; x += 3) g.set(x, y, 'N');
  }
  return g;
}

// ---------- Paredes ----------
function wallTop() {
  const g = new Grid(TS, TS, 'N');
  for (let i = 0; i < 5; i++) g.set(Math.floor(hash(i, 1, 9) * 16), Math.floor(hash(1, i, 9) * 16), 'n');
  return g;
}

// Cara de pared: panel gris azulado con zócalo y una franja de luz de emergencia
function wallFace() {
  const g = new Grid(TS, TS, 'w');
  g.hline(0, 15, 0, 'q');
  g.vline(7, 1, 12, 'W');
  g.rect(0, 13, 15, 15, 'F').hline(0, 15, 13, 'f').hline(0, 15, 15, 'o');
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
      // Ventana de noche: ciudad a lo lejos
      g.rect(1, 1, 14, 11, 'b');
      g.frame(1, 1, 14, 11, 'f');
      g.hline(2, 13, 2, 'B');
      g.rect(3, 7, 4, 10, 'N').rect(6, 5, 8, 10, 'N').rect(10, 6, 12, 10, 'N');
      g.set(7, 6, 'y').set(3, 8, 'y').set(11, 7, 'm').set(7, 8, 'y').set(11, 9, 'y');
      g.vline(8, 2, 10, 'f');
    }),
  N: () =>
    onFace((g) => {
      // Pizarra blanca con post-its
      g.rect(1, 1, 14, 10, 'H').rect(2, 2, 13, 9, 'h');
      g.frame(1, 1, 14, 10, 's');
      g.rect(3, 3, 5, 5, 'y').rect(7, 3, 9, 5, 'p').rect(10, 6, 12, 8, 'y').rect(4, 7, 6, 8, 'g');
      g.hline(8, 12, 9, 'f');
    }),
  M: () =>
    onFace((g) => {
      // Panel del rótulo de recepción (las letras se dibujan aparte)
      g.rect(0, 2, 15, 10, 'N').hline(0, 15, 2, 'f').hline(0, 15, 10, 'f');
    }),
  E: () =>
    onFace((g) => {
      // Ascensor: puertas de acero entreabiertas, sin luz
      g.rect(1, 1, 14, 12, 's').frame(1, 1, 14, 12, 'o');
      g.vline(7, 2, 12, 'o').vline(8, 2, 12, 'N');
      g.hline(2, 13, 2, 'S');
    }),
  L: () =>
    onFace((g) => {
      // Casilleros (escondite)
      g.rect(0, 0, 15, 12, 's');
      g.vline(0, 0, 12, 'F').vline(8, 0, 12, 'F').hline(0, 15, 0, 'S');
      for (const x of [2, 10]) {
        g.hline(x, x + 3, 3, 'F').hline(x, x + 3, 5, 'F');
        g.set(x + 4, 8, 'S');
      }
    }),
  C: () => {
    // Cafetera de oficina
    const g = new Grid(TS, TS);
    g.rect(2, 0, 13, 15, 's').frame(1, 0, 14, 15, 'o');
    g.rect(4, 2, 11, 6, 'k').set(5, 3, 'g').set(6, 3, 'g').set(9, 5, 'r');
    g.rect(5, 9, 10, 13, 'F').rect(6, 11, 9, 13, 'h').set(7, 12, 'a');
    g.hline(2, 13, 1, 'S');
    return g;
  },
  H: () => {
    // Terminal de hackeo (la pantalla se anima aparte)
    const g = new Grid(TS, TS);
    g.rect(2, 1, 13, 15, 'F').frame(1, 0, 14, 15, 'o');
    g.rect(3, 2, 12, 8, 'k').hline(3, 12, 1, 's');
    g.rect(4, 10, 11, 12, 's').set(5, 11, 'S').set(7, 11, 'S').set(9, 11, 'S');
    g.set(12, 13, 'g');
    return g;
  },
  D: () => {
    // Escritorio con dos monitores (las pantallas se dibujan con luz aparte)
    const g = new Grid(TS, TS);
    g.rect(0, 8, 15, 13, 'u').hline(0, 15, 8, 'S').hline(0, 15, 13, 'f').frame(0, 7, 15, 14, 'o');
    g.rect(1, 1, 7, 6, 'F').frame(1, 1, 7, 6, 'o').rect(2, 2, 6, 5, 'k');
    g.rect(8, 1, 14, 6, 'F').frame(8, 1, 14, 6, 'o').rect(9, 2, 13, 5, 'k');
    g.set(4, 7, 'o').set(11, 7, 'o');
    g.rect(5, 10, 10, 11, 'F').set(12, 10, 'h').set(13, 10, 'a');
    return g;
  },
  d: () => {
    // Escritorio con mantel largo (escondite): la tela llega al piso
    const g = new Grid(TS, TS);
    g.rect(1, 1, 7, 6, 'F').frame(1, 1, 7, 6, 'o').rect(2, 2, 6, 5, 'k');
    g.rect(0, 7, 15, 15, 'V').hline(0, 15, 7, 'v').frame(0, 7, 15, 15, 'o');
    for (let x = 2; x < 15; x += 3) g.vline(x, 9, 14, 'v');
    g.set(10, 6, 'y').set(11, 6, 'y');
    return g;
  },
  T: () => {
    // Mesa de reuniones
    const g = new Grid(TS, TS);
    g.rect(0, 3, 15, 12, 'u').hline(0, 15, 3, 'S').hline(0, 15, 12, 'f').frame(0, 2, 15, 13, 'o');
    g.rect(5, 6, 9, 9, 'h').set(12, 7, 'a').set(3, 8, 'g');
    return g;
  },
  g: () => {
    // Pared de vidrio (no tapa la vista): marco de aluminio y reflejos, el piso se ve a través
    const g = new Grid(TS, TS);
    g.hline(0, 15, 6, 'S').hline(0, 15, 7, 's').hline(0, 15, 9, 'F');
    g.vline(0, 6, 9, 's').vline(15, 6, 9, 's');
    g.hline(0, 15, 8, 'G');
    g.set(3, 8, 'm').set(4, 8, 'M').set(11, 8, 'm');
    g.line(2, 5, 4, 3, 'G').line(9, 5, 11, 3, 'G');
    return g;
  },
  p: () => {
    // Planta en maceta blanca
    const g = new Grid(TS, TS);
    g.ellipse(7.5, 5, 6, 5, 'X');
    g.ellipse(7, 4.5, 4.5, 3.5, 'x');
    g.set(4, 3, 'h').set(9, 2, 'h');
    g.rect(4, 10, 11, 15, 'H').hline(4, 11, 10, 'h').frame(3, 10, 12, 15, 'o');
    return g;
  },
  b: () => {
    // Bean bag
    const g = new Grid(TS, TS);
    g.ellipse(7.5, 9, 7, 6, 'Z');
    g.ellipse(7, 8, 6, 5, 'z');
    g.set(4, 5, 'h').set(5, 5, 'h').line(6, 9, 10, 11, 'Z');
    g.outline('o');
    return g;
  },
  r: () => {
    // Mostrador de recepción
    const g = new Grid(TS, TS);
    g.rect(0, 2, 15, 6, 'u').hline(0, 15, 2, 'S').hline(0, 15, 6, 'f');
    g.rect(0, 7, 15, 15, 'F').hline(0, 15, 7, 'N').hline(0, 15, 14, 'g');
    g.hline(0, 15, 1, 'o');
    return g;
  },
  P: () => {
    // Impresora grande (tapa la vista)
    const g = new Grid(TS, TS);
    g.rect(1, 2, 14, 15, 'H').frame(0, 1, 15, 15, 'o');
    g.rect(2, 3, 13, 6, 'h').rect(3, 8, 12, 9, 'F').rect(4, 11, 11, 13, 'h');
    g.set(12, 4, 'g').set(11, 4, 'x');
    return g;
  },
  S: () => {
    // Rack de servidores con luces (las luces parpadean aparte)
    const g = new Grid(TS, TS, 'N');
    g.frame(0, 0, 15, 15, 'o').vline(1, 1, 14, 'f').vline(14, 1, 14, 'F');
    for (let y = 2; y < 15; y += 3) g.hline(2, 13, y, 'F').hline(2, 13, y + 1, 'n');
    return g;
  },
  K: () => {
    // Caja fuerte
    const g = new Grid(TS, TS);
    g.rect(1, 2, 14, 15, 's').frame(0, 1, 15, 15, 'o').hline(1, 14, 2, 'S');
    g.rect(3, 5, 12, 13, 'F').frame(3, 5, 12, 13, 'o');
    g.ellipse(7.5, 9, 2.5, 2.5, 'S').set(7, 9, 'o').set(8, 9, 'o');
    g.set(11, 7, 'r');
    return g;
  },
  G: () => {
    // Puerta cerrada de seguridad
    const g = new Grid(TS, TS, 's');
    g.frame(0, 0, 15, 15, 'o');
    for (let y = 2; y < 15; y += 3) g.hline(1, 14, y, 'F');
    g.rect(6, 6, 9, 9, 'R').set(7, 7, 'r').set(8, 7, 'r');
    return g;
  },
  '~': () => {
    // Baranda de vidrio de la terraza (deja ver)
    const g = new Grid(TS, TS);
    g.rect(0, 0, 15, 11, 'b');
    g.hline(0, 15, 3, 'S').hline(0, 15, 4, 's');
    g.rect(0, 5, 15, 12, 'G');
    g.set(3, 7, 'm').set(4, 6, 'm').set(11, 9, 'g');
    g.hline(0, 15, 13, 'f').hline(0, 15, 14, 'F');
    g.vline(0, 3, 14, 's');
    return g;
  },
  k: () => {
    // Cielo de noche (los edificios de la ciudad se dibujan aparte)
    const g = new Grid(TS, TS, 'b');
    return g;
  },
};

// Caché por (carácter, estilo de piso, variante)
const cache = new Map();
const FLOOR_VARIANTS = 4;

export function novaTile(ch, style, tx, ty) {
  let key;
  let build;
  if (ART[ch]) {
    key = ch;
    build = () => ART[ch]().toRows();
  } else {
    let st = style;
    if (ch === 't' || ch === 'A') st = 'deck';
    const v = Math.floor(hash(tx, ty, 21) * FLOOR_VARIANTS);
    key = `floor:${st}:${v}:${ch === 'A' ? 'A' : ''}`;
    build = () => {
      const g = floor(st, v);
      if (ch === 'A') {
        // Sombra del toldo a rayas
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (((x + y) >> 2) % 2 === 0) g.set(x, y, g.get(x, y) === 'T' ? 'N' : 'T');
      }
      return g.toRows();
    };
  }
  let spr = cache.get(key);
  if (!spr) {
    spr = new Sprite(build(), NOVA_PAL);
    cache.set(key, spr);
  }
  return spr;
}

// Para las pruebas: todas las definiciones usan colores de la paleta
export function allNovaTileRows() {
  const out = {};
  for (const ch of Object.keys(ART)) out[ch] = ART[ch]().toRows();
  for (const st of ['carpet', 'lobby', 'deck', 'metal']) out[`floor:${st}`] = floor(st, 1).toRows();
  return out;
}

export const NOVA_FLOOR_CHARS = new Set(['.', 't', 'A', 'x', ' ']);
