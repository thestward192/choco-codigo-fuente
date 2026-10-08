// Sala de elementos (Hito 11): una estación por cada elemento de puzzle de
// docs/coop/03_mecanicas_coop.md, para probarlos con dos pestañas. Mientras C1, C2 y C3 no existan,
// también los reemplaza en el mapa de conexiones.
//   1 · Inicio
//   2 · Botones liviano, pesado y extrapesado, compuertas y palanca
//   3 · Botón de martillazo (con temporizador) y bloque de azúcar agrietado
//   4 · Dianas de código (una arriba: apuntar en diagonal)
//   5 · Terminales de doble firma
//   6 · Balanza de poleas
//   7 · Agua: Choco nada y bucea (burbuja de aire); Tapita cruza sobre él; cortina de agua
//   8 · Calor: planchas calientes, zona caliente y cortina de vapor (la sombrilla de Tapita)
//   9 · Cajas (mazo, disparo cargado, lazo) y ventilador
//  10 · Puerta de salida doble
import { TEXTS } from '../../data/dialogues.js';
import { grid } from './build.js';

export const LAB_W = 184;
export const LAB_H = 16;
const G = 12; // fila del suelo
const F = G - 1;

export const LAB_FEATURES = {
  ground: G,
  pool: { x0: 113, x1: 125, top: G, bottom: G + 2 },
  scale: { a: 95, b: 101, ty: F, pit: 2, ledge: { x0: 104, x1: 106, ty: 4 } },
  plates: { x0: 139, x1: 143 },
  heatCurtain: 147,
  boxLedge: { x0: 165, x1: 169, top: 9 },
};

function buildRows() {
  const m = grid(LAB_W, LAB_H).room(G);
  // 1 · inicio
  m.put(4, F, 'P').put(6, F, 'p').put(8, F, '1');
  // 2 · botones
  m.put(14, F, '2');
  // 3 · martillazo y azúcar: un bolsillo con un cristal, la entrada es de azúcar
  m.put(42, F, '3');
  m.fill(52, 10, 55, 11, '#');
  m.put(53, 11, '.').put(54, 11, '*').put(52, 11, 'u');
  // 4 · dianas
  m.put(58, F, '4');
  // 5 · terminales
  m.put(71, F, '5');
  // 6 · balanza y una cornisa alta que solo se alcanza desde el plato que sube
  m.put(92, F, '6');
  // Fosas de 2 tiles bajo los platos: el que baja tiene dónde bajar (y de ahí se sale saltando)
  m.fill(95, G, 96, G + 1, '.').fill(101, G, 102, G + 1, '.');
  m.fill(104, 4, 106, 4, '#');
  m.put(105, 3, '$');
  // 7 · piscina (3 tiles de hondo) y cortina de agua
  m.put(110, F, '7');
  m.fill(111, F, 112, F, 'v'); // charco: agua baja (Choco camina al 70 %; Tapita se moja)
  m.fill(113, G, 125, G + 2, 'w');
  m.put(122, G + 2, '$');
  m.put(129, 7, '#').fill(129, 1, 129, 6, '#');
  // 8 · calor: planchas calientes en el piso y cortina de vapor con pared encima
  m.put(134, F, '8');
  m.fill(139, G, 143, G, 'h');
  m.fill(147, 1, 147, 7, '#');
  m.put(141, F - 4, '*');
  // 9 · cajas y ventilador
  m.put(154, F, '9');
  m.fill(165, 9, 169, 11, '#');
  m.fill(168, 4, 170, 4, '=');
  m.put(169, 3, '$').put(169, 8, '*');
  // 10 · salida
  m.put(173, F, '0');
  return m.rows();
}

export const LAB_STAGE = {
  id: 'lab',
  title: TEXTS.coop.lab.title,
  save: false,
  rows: buildRows(),
  signs: { 1: 'start', 2: 'buttons', 3: 'pound', 4: 'targets', 5: 'terminals', 6: 'scale', 7: 'water', 8: 'heat', 9: 'boxes', 0: 'exit' },
  signText: TEXTS.coop.lab.signs,
  heat: [{ tx0: 136, ty0: 1, tx1: 150, ty1: F }],
  elements: [
    // 2 · pesado → compuerta A (del otro lado la sostiene un liviano)
    { id: 'hb', type: 'button', kind: 'heavy', tx: 17, ty: F },
    { id: 'gA', type: 'gate', tx: 22, ty: 1, h: F, link: ['hb', 'lbA'], mode: 'any' },
    { id: 'lbA', type: 'button', kind: 'light', tx: 25, ty: F },
    // extrapesado (Tapita plantada, o con Choco encima) → compuerta B; la palanca la deja abierta
    { id: 'xb', type: 'button', kind: 'xheavy', tx: 29, ty: F },
    { id: 'gB', type: 'gate', tx: 34, ty: 1, h: F, link: ['xb', 'lvB'], mode: 'any' },
    { id: 'lvB', type: 'lever', tx: 37, ty: F },
    // 3 · martillazo con temporizador → compuerta C
    { id: 'pb', type: 'button', kind: 'pound', tx: 45, ty: F, time: 6 },
    { id: 'gC', type: 'gate', tx: 49, ty: 1, h: F, link: ['pb'] },
    // 4 · dianas (una abajo y una arriba) → compuerta D, queda abierta
    { id: 'tg1', type: 'target', tx: 63, ty: F },
    { id: 'tg2', type: 'target', tx: 66, ty: 5 },
    { id: 'gD', type: 'gate', tx: 69, ty: 1, h: F, link: ['tg1', 'tg2'], latch: true },
    // 5 · doble firma → compuerta E
    { id: 't1', type: 'terminal', pair: 't2', tx: 74, ty: F },
    { id: 't2', type: 'terminal', pair: 't1', tx: 87, ty: F },
    { id: 'gE', type: 'gate', tx: 90, ty: 1, h: F, link: ['t1'], latch: true },
    // 6 · balanza
    { id: 'sc', type: 'scale', a: { tx: 95, ty: F, w: 2 }, b: { tx: 101, ty: F, w: 2 }, range: 40, top: 3 },
    // 7 · burbuja de aire y cortina de agua (melcocha o escudo de Choco)
    { id: 'bub', type: 'bubble', tx: 118, ty: G + 1 },
    { id: 'cw', type: 'curtain', kind: 'water', tx: 129, ty: 8, h: 4 },
    // 8 · cortina de vapor (Choco pasa bajo la hoja sombrilla)
    { id: 'ch', type: 'curtain', kind: 'heat', tx: 147, ty: 8, h: 4 },
    // 9 · cajas y ventilador
    { id: 'bx1', type: 'box', big: true, tx: 156, ty: 10 },
    { id: 'bx2', type: 'box', tx: 160, ty: F },
    { id: 'fan', type: 'fan', tx: 166, ty: 8, h: 6, w: 2 },
    // 10 · salida
    { id: 'ec', type: 'exit', who: 'choco', group: 'end', final: true, tx: 176, ty: F },
    { id: 'et', type: 'exit', who: 'tapita', group: 'end', final: true, tx: 179, ty: F },
  ],
};
