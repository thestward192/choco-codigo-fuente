// Sprites cenitales (niveles 2 y 3) — docs/02_personajes.md
// Choco 16×16 en 4 direcciones (idle, caminar de 4 frames, interactuar), NPCs de la UNA
// (profes, compas y la señora de la soda), bugs del mapa y objetos pequeños (carné, comida).
// Todo se pinta con el pintor de grillas y se hornea una vez por combinación.
import { Grid } from './painter.js';
import { SpriteCache, Sprite } from './bake.js';
import { CHOCO } from './palettes.js';

export const TOP_PAL = {
  ...CHOCO,
  // Personas (NPCs)
  K: '#2A1E1A', // contorno de personas
  q: '#F0C8A0', // piel clara
  Q: '#C89070', // piel media
  j: '#8A5A3A', // piel oscura
  n: '#3A2A20', // pelo oscuro
  N: '#9A9AA8', // pelo canoso
  u: '#C87A3A', // pelo castaño claro
  U: '#1A1A24', // pelo negro
  a: '#3A6EA8', // ropa azul
  A: '#24487A', // ropa azul sombra
  v: '#8C2F39', // vino
  V: '#5E1E26', // vino sombra
  t: '#3D8A6A', // verde
  T: '#265A44', // verde sombra
  m: '#D9A040', // mostaza
  M: '#A07020', // mostaza sombra
  z: '#F4F1EA', // blanco (delantal, redecilla)
  Z: '#C8C4BA', // blanco sombra
  i: '#5A5A6E', // gris pantalón
  I: '#3A3A4A', // gris oscuro
  p: '#FF7DB0', // rosado
  f: '#6FE08A', // verde claro
  F: '#43D9FF', // cian
  x: '#E0343F', // rojo
  X: '#FFD23F', // amarillo
};

// ============================================================================
// Choco cenital
// ============================================================================
// dir: 'down' | 'up' | 'left' | 'right'; frame 0..3 (caminar; 0 y 2 = parado)
// pose: 'walk' | 'interact' | 'blink'

function chocoDown(g, frame, pose) {
  const bob = frame % 2 === 1 ? 1 : 0;
  const y0 = 1 + bob;
  // Piernas
  const lUp = frame === 1;
  const rUp = frame === 3;
  g.vline(6, y0 + 12, lUp ? 13 : 14, 'o').set(5, lUp ? 13 : 14, 'o');
  g.vline(9, y0 + 12, rUp ? 13 : 14, 'o').set(10, rUp ? 13 : 14, 'o');
  // Cuerpo
  g.rect(4, y0 + 1, 11, y0 + 10, 'b');
  g.hline(4, 11, y0, 'o').hline(4, 11, y0 + 11, 'o').vline(3, y0 + 1, y0 + 10, 'o').vline(12, y0 + 1, y0 + 10, 'o');
  g.hline(4, 10, y0 + 1, 'l').vline(4, y0 + 1, y0 + 7, 'h').vline(11, y0 + 1, y0 + 7, 's');
  // Lentes
  g.hline(4, 11, y0 + 3, 'k').hline(4, 11, y0 + 6, 'k');
  g.vline(4, y0 + 3, y0 + 6, 'k').vline(7, y0 + 3, y0 + 6, 'k').vline(8, y0 + 3, y0 + 6, 'k').vline(11, y0 + 3, y0 + 6, 'k');
  if (pose === 'blink') {
    g.hline(5, 6, y0 + 5, 'o').hline(9, 10, y0 + 5, 'o');
    g.hline(5, 6, y0 + 4, 'b').hline(9, 10, y0 + 4, 'b');
  } else {
    g.rect(5, y0 + 4, 6, y0 + 5, 'e').rect(9, y0 + 4, 10, y0 + 5, 'e');
    g.set(6, y0 + 5, 'o').set(9, y0 + 5, 'o');
    g.set(5, y0 + 4, 'E');
  }
  // Boca
  g.hline(7, 8, y0 + 7, 'o');
  // Envoltura rota
  g.rect(4, y0 + 8, 11, y0 + 10, 'w');
  [y0 + 8, y0 + 7, y0 + 8, y0 + 8, y0 + 7, y0 + 8, y0 + 7, y0 + 8].forEach((ty, i) => {
    g.set(4 + i, ty, i % 3 === 0 ? 'y' : 'w');
  });
  g.vline(11, y0 + 8, y0 + 10, 'W').set(4, y0 + 10, 'y');
  // Audífonos al cuello
  g.set(3, y0 + 7, 'g').set(3, y0 + 8, 'g').set(12, y0 + 7, 'g').set(12, y0 + 8, 'c');
  // Brazos
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  if (pose === 'interact') {
    g.vline(13, y0 + 3, y0 + 6, 'o').set(14, y0 + 2, 'o');
    g.vline(2, y0 + 7, y0 + 8 + 1, 'o');
  } else {
    g.vline(2, y0 + 7 + swing, y0 + 9 + swing, 'o');
    g.vline(13, y0 + 7 - swing, y0 + 9 - swing, 'o');
  }
}

function chocoUp(g, frame, pose) {
  const bob = frame % 2 === 1 ? 1 : 0;
  const y0 = 1 + bob;
  const lUp = frame === 1;
  const rUp = frame === 3;
  g.vline(6, y0 + 12, lUp ? 13 : 14, 'o').set(5, lUp ? 13 : 14, 'o');
  g.vline(9, y0 + 12, rUp ? 13 : 14, 'o').set(10, rUp ? 13 : 14, 'o');
  g.rect(4, y0 + 1, 11, y0 + 10, 'b');
  g.hline(4, 11, y0, 'o').hline(4, 11, y0 + 11, 'o').vline(3, y0 + 1, y0 + 10, 'o').vline(12, y0 + 1, y0 + 10, 'o');
  g.hline(4, 10, y0 + 1, 'l').vline(4, y0 + 1, y0 + 7, 'h').vline(11, y0 + 1, y0 + 7, 's');
  // Ranura de cuadritos (espalda)
  g.vline(7, y0 + 2, y0 + 6, 's').hline(4, 11, y0 + 4, 's');
  // Banda de audífonos
  g.hline(3, 12, y0 + 7, 'g').set(5, y0 + 7, 'G').set(10, y0 + 7, 'G');
  // Envoltura (más grande por detrás) y la "bufanda" rota
  g.rect(4, y0 + 8, 11, y0 + 10, 'w');
  g.set(6, y0 + 8, 'y').set(9, y0 + 9, 'y').vline(11, y0 + 8, y0 + 10, 'W');
  g.set(12, y0 + 9, 'w').set(13, y0 + 10 - (frame % 2), 'y');
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  if (pose === 'interact') {
    g.vline(2, y0 + 3, y0 + 6, 'o').set(1, y0 + 2, 'o');
    g.vline(13, y0 + 7, y0 + 9, 'o');
  } else {
    g.vline(2, y0 + 7 - swing, y0 + 9 - swing, 'o');
    g.vline(13, y0 + 7 + swing, y0 + 9 + swing, 'o');
  }
}

// Perfil mirando a la derecha (la izquierda se voltea)
function chocoSide(g, frame, pose) {
  const bob = frame % 2 === 1 ? 1 : 0;
  const y0 = 1 + bob;
  // Piernas: paso adelante/atrás
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  g.line(7, y0 + 12, 7 - step, 14, 'o').set(8 - step, 14, 'o');
  g.line(9, y0 + 12, 9 + step, 14, 'o').set(10 + step, 14, 'o');
  g.rect(5, y0 + 1, 11, y0 + 10, 'b');
  g.hline(5, 11, y0, 'o').hline(5, 11, y0 + 11, 'o').vline(4, y0 + 1, y0 + 10, 'o').vline(12, y0 + 1, y0 + 10, 'o');
  g.hline(5, 11, y0 + 1, 'l').vline(5, y0 + 1, y0 + 7, 's');
  // Un lente de frente (hacia la derecha)
  g.frame(8, y0 + 3, 12, y0 + 6, 'k');
  if (pose === 'blink') g.hline(10, 11, y0 + 5, 'o');
  else {
    g.rect(9, y0 + 4, 11, y0 + 5, 'e');
    g.set(11, y0 + 5, 'o').set(11, y0 + 4, 'o').set(9, y0 + 4, 'E');
  }
  g.hline(5, 7, y0 + 4, 'k'); // patilla
  g.set(11, y0 + 7, 'o');
  // Envoltura y bufanda que flota detrás
  g.rect(5, y0 + 8, 11, y0 + 10, 'w');
  g.set(6, y0 + 8, 'y').set(9, y0 + 8, 'y').vline(5, y0 + 8, y0 + 10, 'W');
  g.set(3, y0 + 8, 'w').set(2, y0 + 8 + (frame % 2), 'y').set(1, y0 + 9, 'w');
  // Audífono
  g.set(6, y0 + 7, 'g').set(7, y0 + 7, 'g').set(6, y0 + 6, 'c');
  // Brazo
  const swing = step;
  if (pose === 'interact') g.line(10, y0 + 7, 14, y0 + 6, 'o');
  else g.line(8, y0 + 7, 8 + swing, y0 + 9, 'o');
}

function buildChocoTop(key) {
  const [dir, f, pose] = key.split(':');
  const frame = Number(f);
  const g = new Grid(16, 16);
  if (dir === 'down') chocoDown(g, frame, pose);
  else if (dir === 'up') chocoUp(g, frame, pose);
  else chocoSide(g, frame, pose);
  let rows = g.toRows();
  if (dir === 'left') rows = rows.map((r) => r.split('').reverse().join(''));
  return rows;
}

let chocoCache = null;
export function chocoTop(dir, frame = 0, pose = 'walk') {
  if (!chocoCache) chocoCache = new SpriteCache(buildChocoTop, TOP_PAL);
  return chocoCache.get(`${dir}:${frame}:${pose}`);
}
export const buildChocoTopRows = buildChocoTop;

// ============================================================================
// NPCs (personas de 16×16, de frente)
// ============================================================================
const NPC_LOOKS = {
  profe: [
    { skin: 'q', hair: 'N', top: 'v', topS: 'V', legs: 'i', glasses: true, bald: true, book: true },
    { skin: 'Q', hair: 'U', top: 'a', topS: 'A', legs: 'I', glasses: false, beard: true },
    { skin: 'j', hair: 'N', top: 't', topS: 'T', legs: 'i', glasses: true, bun: true },
  ],
  student: [
    { skin: 'q', hair: 'u', top: 't', topS: 'T', legs: 'a', backpack: 'm' },
    { skin: 'Q', hair: 'U', top: 'm', topS: 'M', legs: 'I', backpack: 'v', cap: 'a' },
    { skin: 'j', hair: 'n', top: 'a', topS: 'A', legs: 'i', backpack: 't', long: true },
    { skin: 'q', hair: 'U', top: 'v', topS: 'V', legs: 'I', backpack: 'a', hood: true },
    { skin: 'Q', hair: 'u', top: 'i', topS: 'I', legs: 'a', backpack: 'x', long: true },
  ],
  senora: [{ skin: 'Q', hair: 'n', top: 'p', topS: 'v', legs: 'i', apron: true, net: true }],
  // Nivel 3: gente de oficina (el daily)
  office: [
    { skin: 'q', hair: 'U', top: 'i', topS: 'I', legs: 'a', glasses: true, lanyard: true },
    { skin: 'Q', hair: 'u', top: 't', topS: 'T', legs: 'I', hood: true },
    { skin: 'j', hair: 'n', top: 'a', topS: 'A', legs: 'i', long: true, lanyard: true },
    { skin: 'q', hair: 'N', top: 'v', topS: 'V', legs: 'I', beard: true, glasses: true },
  ],
};

function buildNpc(key) {
  const [kind, v, f] = key.split(':');
  const look = (NPC_LOOKS[kind] || NPC_LOOKS.student)[Number(v)] || NPC_LOOKS.student[0];
  const frame = Number(f);
  const g = new Grid(16, 16);
  const bob = frame === 1 ? 1 : 0;
  // Piernas
  g.rect(6, 13, 7, 14, look.legs).rect(9, 13, 10, 14, look.legs);
  g.hline(5, 7, 15, 'K').hline(9, 11, 15, 'K');
  // Torso
  const ty = 8 + bob;
  g.rect(4, ty, 11, 13, look.top);
  g.vline(11, ty, 13, look.topS).hline(4, 11, 13, look.topS);
  if (look.apron) {
    g.rect(6, ty + 1, 9, 13, 'z').vline(9, ty + 1, 13, 'Z');
  }
  if (look.backpack) g.vline(4, ty + 1, ty + 4, look.backpack).vline(11, ty + 1, ty + 4, look.backpack);
  // Brazos
  g.vline(3, ty + 1, ty + 4, look.top).set(3, ty + 5, look.skin);
  g.vline(12, ty + 1, ty + 4, look.topS).set(12, ty + 5, look.skin);
  if (look.book) g.rect(12, ty + 3, 14, ty + 6, 'v').set(13, ty + 4, 'z');
  if (look.lanyard) g.vline(7, ty, ty + 2, 'F').rect(7, ty + 3, 8, ty + 4, 'z');
  // Cabeza
  const hy = 2 + bob;
  g.rect(5, hy + 1, 10, hy + 6, look.skin);
  g.vline(10, hy + 2, hy + 6, 'Q');
  if (look.skin === 'Q' || look.skin === 'j') g.vline(10, hy + 2, hy + 6, 'j');
  // Pelo
  if (look.bald) {
    g.set(5, hy + 2, look.hair).set(10, hy + 2, look.hair).set(5, hy + 3, look.hair).set(10, hy + 3, look.hair);
  } else {
    g.hline(5, 10, hy, look.hair).hline(4, 11, hy + 1, look.hair);
    g.set(4, hy + 2, look.hair).set(11, hy + 2, look.hair);
    if (look.long) g.vline(4, hy + 2, hy + 6, look.hair).vline(11, hy + 2, hy + 6, look.hair);
  }
  if (look.bun) g.rect(7, hy - 2, 8, hy - 1, look.hair);
  if (look.cap) g.hline(4, 11, hy, look.cap).hline(5, 10, hy - 1, look.cap).hline(2, 5, hy + 1, look.cap);
  if (look.hood) g.vline(4, hy + 1, hy + 6, look.top).vline(11, hy + 1, hy + 6, look.topS).hline(5, 10, hy, look.top);
  if (look.net) {
    g.hline(5, 10, hy - 1, 'z').hline(4, 11, hy, 'Z');
    for (let x = 5; x <= 10; x += 2) g.set(x, hy, 'z');
  }
  // Cara
  g.set(6, hy + 3, 'K').set(9, hy + 3, 'K');
  if (look.glasses) g.hline(5, 10, hy + 3, 'K').set(6, hy + 3, 'F').set(9, hy + 3, 'F');
  if (look.beard) g.hline(6, 9, hy + 6, look.hair).hline(6, 9, hy + 5, look.hair);
  else g.hline(7, 8, hy + 5, 'K');
  return g.toRows();
}

let npcCache = null;
export function npcSprite(kind, variant = 0, frame = 0) {
  if (!npcCache) npcCache = new SpriteCache(buildNpc, TOP_PAL);
  return npcCache.get(`${kind}:${variant}:${frame}`);
}
export const buildNpcRows = buildNpc;
export const NPC_VARIANTS = Object.fromEntries(Object.entries(NPC_LOOKS).map(([k, v]) => [k, v.length]));

// ============================================================================
// Bugs del mapa (16×16, 2 frames)
// ============================================================================
const BUG_PAL = {
  o: '#140A16',
  w: '#F4F1EA',
  // NullPointer: violeta
  a: '#7A3AB8',
  A: '#4A1E7A',
  b: '#B080F0',
  // Loop: cian
  c: '#2AA8C8',
  C: '#126080',
  d: '#8AE8FF',
  // Race: rojo y amarillo
  r: '#E0343F',
  R: '#8A1A22',
  y: '#FFD23F',
  Y: '#B8902A',
  // Memory Leak: verde
  g: '#4CBB4C',
  G: '#2A7A2E',
  h: '#A8F0A0',
  // Spaghetti: amarillo pasta y salsa
  s: '#F0D27A',
  S: '#B8963A',
  t: '#C0392B',
  m: '#FF2E88',
};

function bugEyes(g, x, y, look = 0) {
  g.rect(x, y, x + 1, y + 1, 'w').rect(x + 3, y, x + 4, y + 1, 'w');
  g.set(x + 1 + Math.min(0, look), y + 1, 'o').set(x + 4 + Math.min(0, look), y + 1, 'o');
}

const OVERWORLD_BUGS = {
  nullPointer(g, f) {
    // Burbuja violeta con el ∅ de pupila y una colita de puntero
    g.ellipse(7.5, 8, 5.5, 5, 'A');
    g.ellipse(7.5, 7.5, 5, 4.5, 'a');
    g.set(5, 5, 'b').set(6, 4, 'b');
    g.ellipse(7.5, 8, 2.6, 2.6, 'w');
    g.ellipse(7.5, 8, 1.5, 1.5, 'o');
    g.line(5, 10, 10, 6, 'm');
    // Puntero (flecha) que sale de la cola
    g.line(12, 11, 15, 14, 'b').set(15, 13, 'b').set(14, 14, 'b');
    // Patitas
    const k = f ? 1 : 0;
    g.set(4 + k, 13, 'o').set(10 - k, 13, 'o').set(5 + k, 14, 'o').set(9 - k, 14, 'o');
  },
  loop(g, f) {
    // Anillo con flecha que gira
    g.ellipse(7.5, 7.5, 6, 6, 'C');
    g.ellipse(7.5, 7.5, 5, 5, 'c');
    g.ellipse(7.5, 7.5, 2.5, 2.5, '.');
    const arrow = f ? [[13, 4], [14, 5], [12, 5]] : [[3, 11], [2, 10], [4, 10]];
    g.pts(arrow, 'd');
    g.set(f ? 3 : 12, f ? 4 : 11, 'd');
    bugEyes(g, 4, 6, f ? -1 : 0);
    g.set(7, 13, 'o').set(8, 14, 'o');
  },
  race(g, f) {
    // Dos bichitos encimados que se empujan
    const o = f ? 1 : 0;
    g.ellipse(5.5 - o, 9, 3.5, 3.5, 'R');
    g.ellipse(5.5 - o, 8.5, 3, 3, 'r');
    g.ellipse(10.5 + o, 8, 3.5, 3.5, 'Y');
    g.ellipse(10.5 + o, 7.5, 3, 3, 'y');
    g.set(4 - o, 8, 'w').set(6 - o, 8, 'w').set(4 - o, 9, 'o').set(6 - o, 9, 'o');
    g.set(10 + o, 7, 'w').set(12 + o, 7, 'w').set(10 + o, 8, 'o').set(12 + o, 8, 'o');
    g.pts([[3, 13], [7, 13], [9, 12], [13, 12]], 'o');
    g.set(2 - o, 4, 'y').set(14 + o, 3, 'r');
  },
  leak(g, f) {
    // Gota verde que gotea
    g.ellipse(7.5, 8, 5, 5, 'G');
    g.ellipse(7.5, 7.5, 4.5, 4.5, 'g');
    g.set(7, 2, 'g').set(8, 2, 'g').set(7, 3, 'g').set(8, 3, 'g').set(7, 1, 'G');
    g.set(5, 5, 'h').set(6, 4, 'h');
    bugEyes(g, 5, 7);
    g.hline(6, 9, 11, 'G');
    // Gotitas que se escapan
    g.set(3, 13 + (f ? 1 : 0), 'g').set(12, 12 + (f ? 0 : 1), 'h').set(8, 14, 'G');
  },
  spaghetti(g, f) {
    // Maraña de fideos con salsa y ojos
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = i * 0.9 + (f ? 0.4 : 0);
      pts.push([Math.round(7.5 + Math.cos(a) * (3 + (i % 3))), Math.round(8 + Math.sin(a * 1.3) * (3 + (i % 2)))]);
    }
    for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i % 2 ? 's' : 'S');
    g.ellipse(7.5, 6, 2, 1.5, 't');
    bugEyes(g, 5, 8);
    g.set(2, 13, 's').set(13, 13, 'S').set(4 + (f ? 1 : 0), 14, 's');
  },
};

function buildOverworldBug(key) {
  const [kind, f] = key.split(':');
  const g = new Grid(16, 16);
  OVERWORLD_BUGS[kind](g, Number(f));
  g.outline('o');
  return g.toRows();
}

let bugCache = null;
export function overworldBug(kind, frame = 0) {
  if (!bugCache) bugCache = new SpriteCache(buildOverworldBug, BUG_PAL);
  return bugCache.get(`${kind}:${frame}`);
}
export const buildOverworldBugRows = buildOverworldBug;
export { BUG_PAL };

// ============================================================================
// Objetos pequeños (12×12): carné, café, empanada, gallo pinto
// ============================================================================
const SMALL_PAL = {
  o: '#1E120C',
  w: '#F4F1EA',
  W: '#C8C4BA',
  v: '#8C2F39',
  V: '#5E1E26',
  c: '#43D9FF',
  y: '#FFD23F',
  b: '#6B4E3D',
  B: '#3A2A20',
  k: '#2A1A10',
  e: '#E8B060',
  E: '#B07A30',
  r: '#C0392B',
  n: '#3A2018',
  g: '#4CBB4C',
  s: '#F0E8D8',
};

const SMALL = {
  carne: [
    '............',
    '.oooooooooo.',
    '.ovvvvvvvvo.',
    '.ovwwvvvvvo.',
    '.owcwwyyyyo.',
    '.owwwwwwwwo.',
    '.owwwwyyyWo.',
    '.owwwwwwwWo.',
    '.oWWWWWWWWo.',
    '.oooooooooo.',
    '............',
    '............',
  ],
  cafe: [
    '....w..w....',
    '.....w..w...',
    '............',
    '..oooooooo..',
    '..owwwwwwooo',
    '..obbbbbbo.o',
    '..owwwwwwo.o',
    '..owwwwwwooo',
    '..owwwwwwo..',
    '...oWWWWo...',
    '.oooooooooo.',
    '............',
  ],
  empanada: [
    '............',
    '............',
    '.....ooo....',
    '...ooeeeoo..',
    '..oeeEeEeeo.',
    '.oeEeeeeEeeo',
    '.oeeeeeeeeeo',
    '.oEeEeEeEeEo',
    '..oEEEEEEEo.',
    '...ooooooo..',
    '............',
    '............',
  ],
  galloPinto: [
    '............',
    '............',
    '...oooooo...',
    '..onsnnsno..',
    '.onnsnnnsnno',
    '.osnnnwwnsno',
    '.onnsnwwnnno',
    'oWWWWWWWWWWo',
    '.oWwwwwwwWo.',
    '..oWWWWWWo..',
    '...oooooo...',
    '............',
  ],
};

let smallSprites = null;
export function smallItem(id) {
  if (!smallSprites) smallSprites = Object.fromEntries(Object.entries(SMALL).map(([k, rows]) => [k, new Sprite(rows, SMALL_PAL)]));
  return smallSprites[id];
}
export const SMALL_ITEMS = SMALL;
export { SMALL_PAL };
