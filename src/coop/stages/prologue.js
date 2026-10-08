// Prólogo cooperativo "Prueba de conexión" — docs/coop/01_historia_coop.md
// Sala de pruebas blanca dentro de la consola, 2–3 minutos. Cada sala enseña una cosa y ninguna se
// pasa con un solo jugador:
//   A · Moverse, saltar, la señal y la puerta doble (cada uno en su marco).
//   B · Apilarse: Choco sube la pared de 6 tiles parado sobre Tapita y aprieta el botón de arriba,
//       que abre el pasillo de abajo para ella.
//   C · Botón pesado: solo Tapita lo hunde; abre la compuerta para Choco, que del otro lado pisa un
//       botón liviano para que ella pase.
//   D · Terminales de doble firma: las dos con menos de 0.5 s de diferencia.
//   E · La barra de conexión al 99 %… y L.A.G.
import { TEXTS } from '../../data/dialogues.js';
import { grid } from './build.js';

export const PROLOGUE_W = 110;
export const PROLOGUE_H = 13;
const G = 11; // fila del suelo

// Medidas que usan las pruebas y la cinemática
export const PROLOGUE_FEATURES = {
  ground: G,
  stackWall: { x0: 32, x1: 38, top: 5 }, // 6 tiles sobre el suelo
  heavyButton: 44,
  gateC: 51,
  terminals: [68, 80],
  split: { x0: 89, x1: 106, center: 98 }, // el piso que se parte al final
  bar: { tx: 90, ty: 4, w: 15 }, // barra de conexión al 99 %
};

function buildRows() {
  const m = grid(PROLOGUE_W, PROLOGUE_H).room(G);
  const F = G - 1; // fila donde están los pies
  // A · inicio
  m.put(4, F, 'P').put(6, F, 'p').put(8, F, '1');
  m.put(12, F, '#').fill(14, F - 1, 15, F, '#');
  m.put(12, F - 2, '$').put(15, F - 3, '*');
  m.put(17, F, '2');
  // B · pared de 6 tiles con el pasillo de abajo (la compuerta lo cierra)
  m.put(26, F, '3');
  m.fill(32, 5, 38, 8, '#');
  m.put(34, 4, '$').put(35, F, '*');
  // C · botón pesado
  m.put(42, F, '4');
  m.fill(51, 1, 51, 6, '#');
  m.put(48, F - 3, '*').put(56, F - 3, '$');
  // D · terminales
  m.put(65, F, '5');
  m.put(74, F - 2, '$').put(75, F - 2, '*');
  // E · la barra de conexión
  m.put(86, F, '6');
  return m.rows();
}

export const PROLOGUE = {
  id: 'prologue',
  title: TEXTS.coop.prologue.title,
  rows: buildRows(),
  signs: { 1: 'move', 2: 'door', 3: 'stack', 4: 'heavy', 5: 'terminal', 6: 'bar' },
  signText: TEXTS.coop.prologue.signs,
  elements: [
    // A → B
    { id: 'd1c', type: 'exit', who: 'choco', group: 'd1', cp: 3, tx: 19, ty: G - 1 },
    { id: 'd1t', type: 'exit', who: 'tapita', group: 'd1', cp: 3, tx: 21, ty: G - 1 },
    { id: 'g1', type: 'gate', tx: 23, ty: 1, h: 10, link: ['door:d1'], latch: true },
    // B · Choco aprieta el botón de arriba de la pared; el pasillo de abajo se abre para Tapita
    { id: 'b2', type: 'button', kind: 'light', tx: 36, ty: 4 },
    { id: 'g2', type: 'gate', tx: 32, ty: 9, h: 2, link: ['b2'] },
    // C · botón pesado (Tapita) y liviano del otro lado (Choco)
    { id: 'hb', type: 'button', kind: 'heavy', tx: 44, ty: G - 1 },
    { id: 'g3', type: 'gate', tx: 51, ty: 7, h: 4, link: ['hb', 'lb'], mode: 'any' },
    { id: 'lb', type: 'button', kind: 'light', tx: 55, ty: G - 1 },
    // C → D
    { id: 'd2c', type: 'exit', who: 'choco', group: 'd2', cp: 5, tx: 58, ty: G - 1 },
    { id: 'd2t', type: 'exit', who: 'tapita', group: 'd2', cp: 5, tx: 60, ty: G - 1 },
    { id: 'g5', type: 'gate', tx: 62, ty: 1, h: 10, link: ['door:d2'], latch: true },
    // D · doble firma
    { id: 't1', type: 'terminal', pair: 't2', tx: 68, ty: G - 1 },
    { id: 't2', type: 'terminal', pair: 't1', tx: 80, ty: G - 1 },
    { id: 'g4', type: 'gate', tx: 83, ty: 1, h: 10, link: ['t1'], latch: true },
    // E · puerta final (dispara la cinemática de L.A.G.)
    { id: 'd3c', type: 'exit', who: 'choco', group: 'd3', final: true, tx: 95, ty: G - 1 },
    { id: 'd3t', type: 'exit', who: 'tapita', group: 'd3', final: true, tx: 101, ty: G - 1 },
  ],
};
