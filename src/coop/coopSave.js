// Guardado del Modo Sincronizado — docs/coop/08_plan_coop.md
// - Clave aparte en localStorage (SAVE_PREFIX + 'coop'); todo acceso pasa por SafeStorage, que
//   envuelve cada lectura y escritura en try/catch: si no se puede guardar, el juego sigue.
// - Cada jugador guarda su propio progreso. En la sala se muestra y se usa el del anfitrión.
// Lógica pura salvo loadCoop/saveCoop (que reciben el SaveSystem del juego).
import { SAVE_PREFIX, SAVE_VERSION, parseJson } from '../core/save.js';
import { gradeFor } from './puzzle.js';

export const COOP_KEY = `${SAVE_PREFIX}coop`;
export const COOP_MAPS = ['c1', 'c2', 'c3'];
export const ALL_COOP_MAPS = ['prologue', 'c1', 'c2', 'c3', 'c4'];
const GRADES = ['S', 'A', 'B', 'C'];

export function defaultMapProgress() {
  return { done: false, grade: null, best: null, memories: [false, false, false], plays: 0 };
}

export function defaultCoop() {
  const maps = {};
  for (const m of ALL_COOP_MAPS) maps[m] = defaultMapProgress();
  return { version: SAVE_VERSION, maps, checkpoint: null, falls: 0, time: 0, updatedAt: 0 };
}

// Mezcla lo guardado sobre los valores por defecto (tolera datos viejos o rotos).
export function migrateCoop(raw) {
  const out = defaultCoop();
  if (!raw || typeof raw !== 'object') return out;
  if (raw.maps && typeof raw.maps === 'object') {
    for (const m of ALL_COOP_MAPS) {
      const r = raw.maps[m];
      if (!r || typeof r !== 'object') continue;
      const d = out.maps[m];
      d.done = r.done === true;
      d.grade = GRADES.includes(r.grade) ? r.grade : null;
      d.best = typeof r.best === 'number' && r.best > 0 ? r.best : null;
      if (Array.isArray(r.memories)) d.memories = [0, 1, 2].map((i) => r.memories[i] === true);
      d.plays = Number.isInteger(r.plays) && r.plays > 0 ? r.plays : 0;
    }
  }
  if (raw.checkpoint && typeof raw.checkpoint.map === 'string') out.checkpoint = { map: raw.checkpoint.map, id: raw.checkpoint.id ?? null };
  out.falls = Number.isInteger(raw.falls) && raw.falls > 0 ? raw.falls : 0;
  out.time = typeof raw.time === 'number' && raw.time > 0 ? raw.time : 0;
  return out;
}

export function loadCoop(save) {
  try {
    return migrateCoop(parseJson(save?.storage?.get(COOP_KEY)));
  } catch (err) {
    return defaultCoop();
  }
}

export function saveCoop(save, data) {
  try {
    return !!save?.storage?.set(COOP_KEY, JSON.stringify({ ...data, version: SAVE_VERSION, updatedAt: Date.now() }));
  } catch (err) {
    return false;
  }
}

// La Sala se abre cuando los tres mapas están completos
export function salaOpen(data) {
  return COOP_MAPS.every((m) => data.maps[m]?.done);
}

export function memoriesFound(data) {
  let n = 0;
  for (const m of COOP_MAPS) n += data.maps[m].memories.filter(Boolean).length;
  return n;
}

const better = (a, b) => (a === null ? b : b === null ? a : GRADES.indexOf(a) <= GRADES.indexOf(b) ? a : b);

// Resultado de un mapa: result = { time, falls, memories: [bool×3] }. Devuelve datos nuevos.
export function recordMapResult(data, map, result) {
  const out = migrateCoop(JSON.parse(JSON.stringify(data)));
  const d = out.maps[map] || (out.maps[map] = defaultMapProgress());
  const grade = gradeFor(map, result.time);
  d.done = true;
  d.plays++;
  d.grade = better(d.grade, grade);
  d.best = d.best === null ? result.time : Math.min(d.best, result.time);
  if (Array.isArray(result.memories)) d.memories = d.memories.map((v, i) => v || result.memories[i] === true);
  out.falls += result.falls || 0;
  out.time += result.time || 0;
  if (out.checkpoint?.map === map) out.checkpoint = null;
  return { data: out, grade, newBest: d.best === result.time };
}

// Checkpoint del mapa en curso (Salir de la sala guarda hasta acá)
export function recordCheckpoint(data, map, id) {
  return { ...data, checkpoint: { map, id } };
}

// Resumen del progreso para mandárselo al compañero (el mapa de conexiones muestra el del anfitrión)
export function progressSummary(data) {
  const maps = {};
  for (const m of ALL_COOP_MAPS) {
    const d = data.maps[m];
    maps[m] = { done: d.done, grade: d.grade, mem: d.memories.filter(Boolean).length };
  }
  return { maps };
}

// Valida un resumen recibido por la red
export function parseSummary(p) {
  if (!p || typeof p !== 'object' || !p.maps) return null;
  const maps = {};
  for (const m of ALL_COOP_MAPS) {
    const r = p.maps[m] || {};
    maps[m] = { done: r.done === true, grade: GRADES.includes(r.grade) ? r.grade : null, mem: Number.isInteger(r.mem) ? Math.max(0, Math.min(3, r.mem)) : 0 };
  }
  return { maps };
}
