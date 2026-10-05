// Minijuego del parche (final del nivel 5) — docs/niveles/nivel_5_codigo_puro.md
// 4 líneas de código, cada una con una secuencia de 6 flechas. Una secuencia correcta escribe su
// línea. Un error reinicia la línea actual. Hay 20 s para las cuatro; si se acaba el tiempo,
// N.U.L.L. lanza un pulso y el parche se reintenta entero. Lógica pura.
import { PATCH } from '../config/balance.js';
import { ARROWS } from './hack.js';

function sequence(n, rng) {
  const seq = [];
  for (let i = 0; i < n; i++) {
    let a;
    do a = ARROWS[Math.floor(rng.next() * ARROWS.length)];
    while (i >= 2 && seq[i - 1] === a && seq[i - 2] === a);
    seq.push(a);
  }
  return seq;
}

export function createPatch(rng, cfg = PATCH) {
  const lines = [];
  for (let i = 0; i < cfg.LINES; i++) lines.push(sequence(cfg.ARROWS, rng));
  return { lines, line: 0, idx: 0, time: cfg.TIME, t: cfg.TIME, status: 'active', errors: 0, errorT: 0 };
}

// Ingresa una flecha. Devuelve 'ok' | 'error' | 'line' (completó una línea) | 'done' | null
export function patchInput(p, dir) {
  if (p.status !== 'active') return null;
  const seq = p.lines[p.line];
  if (seq[p.idx] === dir) {
    p.idx++;
    if (p.idx < seq.length) return 'ok';
    p.line++;
    p.idx = 0;
    if (p.line >= p.lines.length) {
      p.status = 'done';
      return 'done';
    }
    return 'line';
  }
  p.errors++;
  p.idx = 0;
  p.errorT = PATCH.ERROR_FLASH;
  return 'error';
}

// Avanza el reloj. Devuelve 'timeout' cuando se acaba el tiempo.
export function patchUpdate(p, dt) {
  if (p.errorT > 0) p.errorT -= dt;
  if (p.status !== 'active') return p.status;
  p.t -= dt;
  if (p.t <= 0) {
    p.t = 0;
    p.status = 'timeout';
  }
  return p.status;
}
