// Íconos de interfaz: objetos, archivos del explorador, candado, Y dorada.
import { Sprite } from './bake.js';
import { itemSprites } from './items.js';

const PAL = {
  o: '#101018',
  k: '#1E120C',
  c: '#43D9FF',
  C: '#DFFAFF',
  d: '#2A6F8A',
  m: '#4E4868',
  M: '#8A83A8',
  g: '#3A3A4A',
  G: '#6E6E80',
  s: '#8FB3D9',
  S: '#C8DDF0',
  r: '#E0343F',
  p: '#FF7DB0',
  y: '#FFD23F',
  Y: '#B8902A',
  w: '#F6DE8A',
  e: '#F4F1EA',
  t: '#4FD1C5',
  T: '#2E9C92',
  v: '#B18CFF',
  b: '#5C3521',
  B: '#83522F',
  f: '#D9AE4B',
  F: '#A27B2E',
  n: '#6FE08A',
};

const ICONS = {
  staff: [
    '........c.c.',
    '.......c.C.c',
    '........c.c.',
    '.......M....',
    '......m.....',
    '.....m......',
    '....m.......',
    '...m........',
    '..m.........',
    '.m..........',
    'm...........',
    '............',
  ],
  laptop: [
    '............',
    '.oooooooooo.',
    '.osssssssso.',
    '.osSssppsso.',
    '.ossssyysso.',
    '.osssssssso.',
    '.oooooooooo.',
    'oGGGGGGGGGGo',
    'oGgGgGgGgGGo',
    '.oooooooooo.',
    '............',
    '............',
  ],
  shield: [
    '....cccc....',
    '..cc.CC.cc..',
    '.c..CddC..c.',
    'c..CddddC..c',
    'c.CddddddC.c',
    'cCdddCCdddCc',
    'cCdddCCdddCc',
    'c.CddddddC.c',
    'c..CddddC..c',
    '.c..CddC..c.',
    '..cc.CC.cc..',
    '....cccc....',
  ],
  lasso: [
    '...cccccc...',
    '..c......c..',
    '.c..cccc..c.',
    '.c.c....c.c.',
    '.c.c.CC.c.c.',
    '.c.c.CC.c.c.',
    '.c..c..c..c.',
    '..c..cc..c..',
    '...cc..cc...',
    '.......c....',
    '........c...',
    '.........C..',
  ],
  trophy: [
    '.yyyyyyyyyy.',
    'yywwwwwwwwyy',
    'y.ywyyyywy.y',
    'y.yw{}yyyy.y',
    '.yyyyyyyyyy.',
    '..yyyyyyyy..',
    '...yyyyyy...',
    '....YyyY....',
    '.....yy.....',
    '....YyyY....',
    '..yyyyyyyy..',
    '..YYYYYYYY..',
  ].map((r) => r.replace('{', 'o').replace('}', 'o')),
  lock: ['..MMM..', '.M...M.', '.M...M.', 'GGGGGGG', 'GMMMMMG', 'GMMoMMG', 'GMMoMMG', 'GMMMMMG', 'GGGGGGG'],
  // Archivo .exe: un cartuchito
  exe: ['.oooooooo.', '.oGGGGGGo.', '.oGccccGo.', '.oGcCccGo.', '.oGccccGo.', '.oGGGGGGo.', 'ooGGGGGGoo', 'oGGoGGoGGo', 'oGoGoGoGGo', 'oooooooooo'],
  // Carpeta cerrada / abierta
  dir: ['.ooo......', 'offfo.....', 'offffooooo', 'offffffffo', 'offffffffo', 'offffffffo', 'offffffffo', 'oFFFFFFFFo', 'oooooooooo', '..........'],
  dirOpen: ['.ooo......', 'offfo.....', 'offffooooo', 'oFFooooooo', 'oFowwwwwwo', 'oFowwwwwo.', 'oowwwwwwo.', 'owwwwwwwo.', 'ooooooooo.', '..........'],
  check: ['......n', '.....nn', 'n...nn.', 'nn.nn..', '.nnn...', '..n....'],
  play: ['c....', 'cc...', 'ccc..', 'cccc.', 'ccc..', 'cc...', 'c....'],
  goldenY: ['y...y', 'y...y', '.y.y.', '..y..', '..y..', '..y..', '..y..'],
};

let cache = null;
export function icons() {
  if (cache) return cache;
  cache = {};
  for (const [k, rows] of Object.entries(ICONS)) cache[k] = new Sprite(rows, PAL);
  cache.boots = itemSprites().boots;
  return cache;
}

export function itemIcon(item) {
  return icons()[item] || null;
}
