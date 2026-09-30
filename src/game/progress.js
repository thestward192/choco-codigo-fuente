// Lógica pura del progreso de una partida (sin DOM ni localStorage): desbloqueos,
// recompensas, récords y conteos. La usan las escenas y las pruebas.
import { defaultSlot } from '../core/save.js';
import { LEVELS, FOUNDERS, levelById } from '../data/levels.js';
import { HEALTH } from '../config/balance.js';

// Partida nueva. Mientras el prólogo no existe (Hito 3), se da por jugado:
// Choco empieza con el Báculo y el nivel 1 disponible.
export function newGameData({ prologueBuilt = false } = {}) {
  const d = defaultSlot();
  if (!prologueBuilt) {
    d.levelsCompleted = [0];
    d.items = ['staff'];
    d.lastLevel = 0;
  }
  return d;
}

export function isCompleted(d, id) {
  return d.levelsCompleted.includes(id);
}

// El nivel 1 siempre está disponible; los demás, si el anterior está completo.
export function isUnlocked(d, id) {
  if (id <= 1) return true;
  return isCompleted(d, id - 1);
}

export function hasItem(d, item) {
  return d.items.includes(item);
}

// 1 cuadrito (núcleo) + 1 por fundador rescatado
export function maxHpFor(d) {
  return Math.min(HEALTH.MAX_POSSIBLE, HEALTH.START_MAX + d.founders.length);
}

export function goldenFor(d, id) {
  return d.goldenY[id] || [false, false, false];
}

export function goldenCount(d, id) {
  return goldenFor(d, id).filter(Boolean).length;
}

export function totalGolden(d) {
  return LEVELS.reduce((n, l) => n + goldenCount(d, l.id), 0);
}

// Siguiente nivel sin completar (para ubicar el cursor del mapa)
export function nextLevel(d) {
  for (const l of LEVELS) if (l.id > 0 && !isCompleted(d, l.id) && isUnlocked(d, l.id)) return l.id;
  return 5;
}

// Registra el final de un nivel. stats: { time, deaths, goldenY: [bool×3] }
// Devuelve una copia nueva de los datos y lo que cambió.
export function completeLevel(d, id, stats) {
  const out = structuredClone(d);
  const level = levelById(id);
  const firstTime = !out.levelsCompleted.includes(id);
  if (firstTime) out.levelsCompleted.push(id);
  // Y doradas: se acumulan entre intentos
  const prev = goldenFor(out, id);
  out.goldenY[id] = prev.map((g, i) => g || !!stats.goldenY?.[i]);
  // Récord
  const best = out.bestTime[id];
  const newRecord = best === undefined || stats.time < best;
  if (newRecord) out.bestTime[id] = stats.time;
  out.deaths += stats.deaths || 0;
  out.totalTime += stats.time || 0;
  out.lastLevel = id;
  out.checkpoint = null;
  // Recompensas
  const rewards = { founder: null, item: null };
  if (level?.founder && !out.founders.includes(level.founder)) {
    out.founders.push(level.founder);
    out.founders.sort((a, b) => FOUNDERS.indexOf(a) - FOUNDERS.indexOf(b));
    rewards.founder = level.founder;
  }
  if (level?.item && level.item !== 'trophy' && !out.items.includes(level.item)) {
    out.items.push(level.item);
    rewards.item = level.item;
  }
  if (id === 5) out.hotfixUnlocked = true;
  return { data: out, newRecord, firstTime, rewards };
}

// Muertes y tiempo de un intento que no terminó (salir al mapa, game over)
export function recordAttempt(d, { time = 0, deaths = 0 }) {
  const out = structuredClone(d);
  out.deaths += deaths;
  out.totalTime += time;
  return out;
}

export function setCheckpoint(d, level, id) {
  const out = structuredClone(d);
  out.checkpoint = { level, id };
  out.lastLevel = level;
  return out;
}

// "1:05.32" · para tiempos largos "1:02:05"
export function formatTime(sec) {
  if (sec === undefined || sec === null || !isFinite(sec)) return '—';
  // En centésimas enteras para evitar errores de redondeo (65.32 → 1:05.32)
  const total = Math.round(Math.max(0, sec) * 100);
  const cs = total % 100;
  const whole = Math.floor(total / 100);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const ss = whole % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
