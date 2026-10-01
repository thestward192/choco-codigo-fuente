// Prólogo · Parte B: Pantalla de Carga (≈ 90 tiles) — docs/niveles/nivel_0_prologo.md
// Plataformas de wireframe sobre el vacío, el Báculo en una roca de código, zona de práctica
// (3 Bytelings TEST, un Mosquito, un muro que solo rompe el disparo cargado), la pantalla
// gigante de N.U.L.L. y el portal al nivel 1. Sin muerte posible: el vacío devuelve a la plataforma.
import { MapBuilder } from '../mapBuilder.js';

export const LOAD_W = 92;
export const LOAD_H = 12;

// Posiciones clave (tiles)
export const LOAD = {
  spawn: { x: 4 },
  staff: { x: 29, y: 8 }, // roca de código (el báculo va encima)
  tests: [36, 38, 40],
  mosquito: { x: 44, y: 7 },
  wall: { x: 47, top: 5, bottom: 8 },
  nullTrigger: 68,
  screen: { x: 70, w: 9 },
  portal: { x: 86 },
};

export function buildLoading() {
  const b = new MapBuilder(LOAD_W, LOAD_H);
  const plat = (x0, x1, top) => b.fill(x0, top, x1, Math.min(LOAD_H - 1, top + 2), '#');
  // 1. Caída inicial y saltos simples entre plataformas que se renderizan al acercarse
  plat(1, 7, 9);
  plat(10, 12, 9);
  plat(15, 17, 8);
  plat(20, 22, 7);
  plat(25, 52, 9); // roca del báculo y zona de práctica
  // Roca de código con el báculo
  b.fill(LOAD.staff.x, LOAD.staff.y, LOAD.staff.x + 1, LOAD.staff.y, '#');
  // Muro agrietado: solo lo rompe el disparo cargado (bloquea el paso completo)
  b.fill(LOAD.wall.x, 0, LOAD.wall.x, LOAD.wall.top - 1, '#');
  b.fill(LOAD.wall.x, LOAD.wall.top, LOAD.wall.x, LOAD.wall.bottom, 'K');
  // 2. Más saltos (uno con plataforma de un sentido)
  plat(55, 57, 8);
  b.hline(59, 61, 6, '=');
  plat(60, 62, 9);
  // 3. Explanada de N.U.L.L. y el portal
  plat(65, 90, 9);
  b.vline(LOAD_W - 1, 0, LOAD_H - 1, '#');
  return b.toRows();
}
