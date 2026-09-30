// Sprites de proyectiles, objetos y coleccionables.
import { Sprite } from './bake.js';
import { CHOCO } from './palettes.js';

const SHOT_PAL = { c: '#43D9FF', C: '#2AA8D8', e: '#F4F1EA' };

// Disparo normal 6×6: llaves { }
const SHOT = ['.c..c.', '.c..c.', 'c.ee.c', '.c..c.', '.c..c.', '......'];

// Disparo cargado 14×14: bloque { } brillante
const SHOT_CHARGED = [
  '..cccccccccc..',
  '.cCCCCCCCCCCc.',
  'cCCeeCCCCeeCCc',
  'cCCeCCCCCCeCCc',
  'cCCeCCCCCCeCCc',
  'cCCeCCCCCCeCCc',
  'cCeCCCCCCCCeCc',
  'cCeCCCCCCCCeCc',
  'cCCeCCCCCCeCCc',
  'cCCeCCCCCCeCCc',
  'cCCeCCCCCCeCCc',
  'cCCeeCCCCeeCCc',
  '.cCCCCCCCCCCc.',
  '..cccccccccc..',
];

// Grano de Cacao (power-up de cobertura)
const CACAO = [
  '...oooo...',
  '..ollhho..',
  '.ollllhho.',
  '.olllsllo.',
  'olllslllbo',
  'ollslllbbo',
  'olslllbbbo',
  '.olllbbbo.',
  '.olbbbbso.',
  '..obbsso..',
  '...oooo...',
];

// Trozo de Cacao (cura 1 cuadrito)
const CHUNK = ['.oooooo.', 'ohhllllo', 'ohlllbbo', 'ollsbbbo', 'olsbbbso', 'obbbbsso', '.oooooo.'];

// Botas de Doble Salto: bota con switch azul de teclado mecánico
const BOOTS = [
  '...oooo.....',
  '...oBBo.....',
  '...oBbo.....',
  '..oooooo....',
  '..oggggo....',
  '..oggGgo....',
  '..oggggooooo',
  '..oggggggGgo',
  '..oGGGGGGGGo',
  '...oooooooo.',
];
const BOOTS_PAL = { o: '#101018', B: '#3C6EF0', b: '#9FB9FF', g: '#5A5A70', G: '#8A8AA0' };

// Bit (moneda): chip verde con un "1"
const BIT = ['..oo..', '.oGGo.', 'oGgGGo', 'oggGGo', 'oGgGGo', 'oGgGGo', '.oggo.', '..oo..'];
const BIT_PAL = { o: '#1D5C33', G: '#6FE08A', g: '#E8FFF0' };

let cache = null;
export function itemSprites() {
  if (cache) return cache;
  cache = {
    shot: new Sprite(SHOT, SHOT_PAL),
    shotCharged: new Sprite(SHOT_CHARGED, SHOT_PAL),
    cacao: new Sprite(CACAO, CHOCO),
    chunk: new Sprite(CHUNK, CHOCO),
    boots: new Sprite(BOOTS, BOOTS_PAL),
    bit: new Sprite(BIT, BIT_PAL),
  };
  return cache;
}
