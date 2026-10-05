// Lógica pura del final (la usan la cinemática y las pruebas).
import { TEXTS } from '../data/dialogues.js';

// Rótulos del juego que perdieron la Y (se completan en el montaje de la cinemática final)
export function brokenSigns() {
  const L1 = TEXTS.level1.signs;
  const L2 = TEXTS.level2.signs;
  const L4 = TEXTS.level4.signs;
  return [L1.pradera, L1.cuevas, L1.castillo, L2.board, L2.labRules, L2.silence, L4.entrada, L4.plaza, L4.barranco];
}

// La Y vuelve: cada hueco se completa
export const fixSign = (s) => s.replace(/_/g, 'y');
