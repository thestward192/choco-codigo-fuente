// Paletas del juego — docs/04_arte.md y docs/02_personajes.md

export const CHOCO = {
  o: '#1E120C', // contorno
  s: '#3D2216', // chocolate sombra
  b: '#5C3521', // chocolate base
  l: '#83522F', // chocolate luz
  h: '#B07A4A', // brillo
  W: '#A27B2E', // envoltura oscura
  w: '#D9AE4B', // envoltura base
  y: '#F6DE8A', // envoltura brillo
  e: '#F4F1EA', // ojos
  E: '#FFFFFF', // brillo del ojo
  c: '#43D9FF', // LED de audífonos
  g: '#2B2B38', // audífonos
  G: '#4A4A5E', // audífonos luz
  k: '#101018', // montura de lentes
  r: '#C0435A', // boca / mejillas
};

export const ACCENTS = {
  core: '#D9AE4B',
  oscar: '#FF7DB0',
  stward: '#FFD23F',
  hezron: '#B18CFF',
  fabiola: '#4FD1C5',
};

export const NULL_COLORS = {
  magenta: '#FF2E88',
  white: '#F4F1EA',
  black: '#0B0610',
};

export const UI = {
  text: '#F4F1EA',
  textDim: '#8A8AA0',
  shadow: '#07070C',
  cyan: '#43D9FF',
  magenta: '#FF2E88',
  green: '#6FE08A',
  yellow: '#FFD23F',
  red: '#E0343F',
  panel: '#0E0E18',
  panelBorder: '#2A2F45',
};

// Modo Sincronizado: cian = Choco, ámbar = Tapita, magenta = los dos (docs/coop/03_mecanicas_coop.md)
export const COOP = {
  choco: '#43D9FF',
  chocoDark: '#1C6F8A',
  tapita: '#FFB13B',
  tapitaDark: '#8A5A12',
  both: '#FF2E88',
};

// Boceto de Tapita hasta el Hito 10: Choco con los colores de la tapa de dulce y la hoja de caña
// (docs/coop/02_tapita.md). Reemplaza solo los índices de la paleta de Choco.
export const TAPITA_SKETCH = {
  o: '#2A1608',
  s: '#6B3410',
  b: '#9C5420',
  l: '#C8782E',
  h: '#F2C46B',
  W: '#5E6B2A',
  w: '#8E9A3F',
  y: '#C4C77A',
  r: '#E88A6A',
  c: '#FFB13B',
  g: '#4A2A10',
  G: '#7A4E2D',
};

// Nivel 0 · Pantalla de Carga (se usa en la sala de pruebas)
export const LOADING = {
  bg: '#07070C',
  wire: '#2A2F45',
  cyan: '#43D9FF',
  fill: '#10131F',
  fillLight: '#171B2C',
  dim: '#1B2033',
};
