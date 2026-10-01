// Enemigos del Mundo Cartucho (docs/02_personajes.md). Todos son bugs con diseño original:
// Disquete (16×16), Mosquito de datos (12×12), Blindado (16×16) y Bloque spam (16×16).
// El Cable pelado y las barras de estática se dibujan con primitivas (cambian de forma).
import { Sprite } from '../bake.js';

// Gira una grilla cuadrada 90° en sentido horario
export function rotateRows(rows) {
  const n = rows.length;
  const out = [];
  for (let y = 0; y < n; y++) {
    let s = '';
    for (let x = 0; x < n; x++) s += rows[n - 1 - x][y] ?? '.';
    out.push(s);
  }
  return out;
}

// ---------- Disquete ----------
const DISK_PAL = {
  o: '#10142A',
  B: '#22305A',
  b: '#3E5290',
  m: '#8A93A6',
  M: '#D8DCE6',
  k: '#10142A',
  L: '#F4F1EA',
  r: '#E0343F',
  e: '#10142A',
  x: '#E0343F',
};

const DISK_BODY = [
  '................',
  '..oooooooooo....',
  '..obmMMkMMmbo...',
  '..obmMMkMMmbbo..',
  '..obmMMMMMmbbo..',
  '..obbbbbbbbbbo..',
  '..obLLLLLLLLbo..',
  '..obLrrrrrrLbo..',
  '..obLeLLLLeLbo..',
  '..obLeLLLLeLbo..',
  '..obLLLooLLLbo..',
  '..oBLLLLLLLLBo..',
  '..oBBBBBBBBBBo..',
  '...oooooooooo...',
];
const DISK_LEGS_A = ['....o.....o.....', '...oo....oo.....'];
const DISK_LEGS_B = ['.....o...o......', '....oo..oo......'];

// Disco sin patas, mareado (para patear). Se hornean 4 rotaciones para el giro.
const DISK_SHELL = [
  '................',
  '................',
  '..oooooooooo....',
  '..obmMMkMMmbo...',
  '..obmMMkMMmbbo..',
  '..obmMMMMMmbbo..',
  '..obbbbbbbbbbo..',
  '..obLLLLLLLLbo..',
  '..obLrrrrrrLbo..',
  '..obLxLLLLxLbo..',
  '..obLLLLLLLLbo..',
  '..oBLLLLLLLLBo..',
  '..oBBBBBBBBBBo..',
  '...oooooooooo...',
  '................',
  '................',
];

// ---------- Mosquito de datos ----------
const MOSQ_PAL = {
  o: '#1A0F24',
  b: '#3A2A5A',
  p: '#6A5AA0',
  M: '#FF2E88',
  m: '#FFD6E8',
  W: '#BFEFFF',
  w: '#7FCBE8',
  n: '#C8C8D8',
  l: '#3A2A5A',
};
const MOSQ_A = [
  '.....W...W..',
  '....WwW.WwW.',
  '....WwwWwwW.',
  '.....WwwwW..',
  '....oooooo..',
  '...oMmbppbo.',
  'nnnoMMbbpbbo',
  '...obbbbpbbo',
  '....oobbbbo.',
  '....l.oooo..',
  '...l..l..l..',
  '..l..l....l.',
];
const MOSQ_B = [
  '............',
  '............',
  '.....WWWWW..',
  '....WwwwwwW.',
  '....ooWWWWo.',
  '...oMmbppbo.',
  'nnnoMMbbpbbo',
  '...obbbbpbbo',
  '....oobbbbo.',
  '....l.oooo..',
  '....l.l..l..',
  '...l..l...l.',
];

// ---------- Blindado ----------
const ARMOR_PAL = {
  o: '#14161E',
  H: '#8A93A6',
  h: '#C8D0DE',
  d: '#4A5266',
  v: '#F4F1EA',
  P: '#2E6B4A',
  p: '#4FA06E',
  e: '#F4F1EA',
  M: '#E0343F',
};
const ARMOR_BODY = [
  '................',
  '.....oooooo.....',
  '....ohhhhHHo....',
  '...ohhHHHHHdo...',
  '..ohHHHvHHHHdo..',
  '..oHHHHHHHHHdo..',
  '.ooddddddddddoo.',
  '..oPPeePPeePPo..',
  '..oPPeMPPeMPPo..',
  '..oPpPPPPPPPPo..',
  '..oPPPPPPPPPPo..',
  '...oPPPPPPPPo...',
  '....oooooooo....',
];
const ARMOR_LEGS_A = ['...o.o....o.o...', '..o..o....o..o..', '................'];
const ARMOR_LEGS_B = ['....oo....oo....', '...o..o..o..o...', '................'];

// ---------- Bloque spam ----------
const SPAM_PAL = {
  o: '#2A1C14',
  e: '#F4E9D0',
  f: '#C8B898',
  d: '#D8C8A8',
  R: '#E0343F',
  W: '#FF8A8A',
  k: '#3A2A20',
};
const SPAM = [
  'oooooooooooooooo',
  'ofeeeeeeeeeeeefo',
  'oefeeeeeeeeeefeo',
  'oeefeeeeeeeefeeo',
  'oeeefeeeeeefeeeo',
  'oeeeeffeeffeeeeo',
  'oeeeeeeRReeeeeeo',
  'oeeeeeRWRReeeeeo',
  'oeeeeeRRRReeeeeo',
  'oeeeeeeRReeeeeeo',
  'oekkkeeeeeekkkeo',
  'oeeekkeeeekkeeeo',
  'oeeeokeeeekoeeeo',
  'oeeeeeeeeeeeeeeo',
  'oddddddddddddddo',
  'oooooooooooooooo',
];

let cache = null;
export function cartuchoEnemySprites() {
  if (cache) return cache;
  const shell = [DISK_SHELL];
  for (let i = 1; i < 4; i++) shell.push(rotateRows(shell[i - 1]));
  cache = {
    disk: {
      walk: [new Sprite([...DISK_BODY, ...DISK_LEGS_A], DISK_PAL), new Sprite([...DISK_BODY, ...DISK_LEGS_B], DISK_PAL)],
      shell: shell.map((r) => new Sprite(r, DISK_PAL)),
    },
    mosquito: [new Sprite(MOSQ_A, MOSQ_PAL), new Sprite(MOSQ_B, MOSQ_PAL)],
    armor: [new Sprite([...ARMOR_BODY, ...ARMOR_LEGS_A], ARMOR_PAL), new Sprite([...ARMOR_BODY, ...ARMOR_LEGS_B], ARMOR_PAL)],
    spam: new Sprite(SPAM, SPAM_PAL),
  };
  return cache;
}

export const ENEMY_COLORS = {
  disk: [DISK_PAL.B, DISK_PAL.b, DISK_PAL.M, DISK_PAL.L, DISK_PAL.r],
  mosquito: [MOSQ_PAL.b, MOSQ_PAL.p, MOSQ_PAL.M, MOSQ_PAL.W],
  armor: [ARMOR_PAL.H, ARMOR_PAL.h, ARMOR_PAL.P, ARMOR_PAL.p],
  spam: [SPAM_PAL.e, SPAM_PAL.f, SPAM_PAL.R],
};

// Definiciones crudas (para las pruebas de tamaño y paleta)
export const RAW_ENEMIES = {
  disk: { rows: [...DISK_BODY, ...DISK_LEGS_A], pal: DISK_PAL, w: 16, h: 16 },
  diskShell: { rows: DISK_SHELL, pal: DISK_PAL, w: 16, h: 16 },
  mosquitoA: { rows: MOSQ_A, pal: MOSQ_PAL, w: 12, h: 12 },
  mosquitoB: { rows: MOSQ_B, pal: MOSQ_PAL, w: 12, h: 12 },
  armor: { rows: [...ARMOR_BODY, ...ARMOR_LEGS_A], pal: ARMOR_PAL, w: 16, h: 16 },
  spam: { rows: SPAM, pal: SPAM_PAL, w: 16, h: 16 },
};
