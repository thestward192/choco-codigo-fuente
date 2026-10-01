// Prólogo · Parte A: el cuarto de Choco (Santa Cruz, 11:58 p. m.) — docs/niveles/nivel_0_prologo.md
// 30×11 tiles (pantalla y media). Los muebles son colisiones invisibles; el dibujo del cuarto
// se hornea aparte (src/art/tiles/room.js) con las mismas posiciones de ROOM.
//
// Recorrido del tutorial: banquito (1 tile) → cama (2) → respaldo (4) → mueble alto de la tele (6).
import { MapBuilder } from '../mapBuilder.js';

export const ROOM_W = 30;
export const ROOM_H = 11;

// Posiciones de los muebles (en tiles)
export const ROOM = {
  floor: 10,
  guitar: { x: 1 },
  photo: { x: 2, y: 3 },
  fridge: { x: 4, w: 2, top: 8 },
  desk: { x: 7, w: 4, top: 8 },
  shelf: { x: 11, w: 2, y: 5 },
  lamp: { x: 13 },
  stool: { x: 14, top: 9 },
  bed: { x: 15, w: 5, top: 8 },
  headboard: { x: 20, top: 6 },
  window: { x: 15, y: 2, w: 4, h: 4 },
  cabinet: { x: 21, w: 5, top: 4 },
  tv: { x: 22, w: 3 },
  door: { x: 27 },
  spawn: { x: 9 },
};

export function buildRoom() {
  const b = new MapBuilder(ROOM_W, ROOM_H);
  b.hline(0, ROOM_W - 1, 0, '#'); // techo
  b.hline(0, ROOM_W - 1, ROOM.floor, '#'); // piso
  b.vline(0, 0, ROOM_H - 1, '#');
  b.vline(ROOM_W - 1, 0, ROOM_H - 1, '#');
  const R = ROOM;
  b.fill(R.fridge.x, R.fridge.top, R.fridge.x + R.fridge.w - 1, R.floor - 1, '#');
  b.hline(R.desk.x, R.desk.x + R.desk.w - 1, R.desk.top, '=');
  b.set(R.stool.x, R.stool.top, '=');
  b.hline(R.bed.x, R.bed.x + R.bed.w - 1, R.bed.top, '=');
  b.set(R.headboard.x, R.headboard.top, '=');
  b.fill(R.cabinet.x, R.cabinet.top, R.cabinet.x + R.cabinet.w - 1, R.floor - 1, '#');
  return b.toRows();
}
