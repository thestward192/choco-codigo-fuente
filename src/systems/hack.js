// Hackeo con la Laptop Debugger: minijuego de secuencia de flechas — docs/03_mecanicas.md
// Aparecen N flechas; hay que ingresarlas en orden antes de que se acabe el tiempo.
// Un error reinicia la secuencia; tres errores hacen fallar el hackeo. Lógica pura.
import { HACK } from '../config/balance.js';

export const ARROWS = ['up', 'down', 'left', 'right'];

// cfg: { LENGTH, TIME } (ver HACK en balance.js)
export function createHack(cfg, rng) {
  const seq = [];
  for (let i = 0; i < cfg.LENGTH; i++) {
    // Sin tres flechas iguales seguidas (se leen mal)
    let a;
    do a = ARROWS[Math.floor(rng.next() * ARROWS.length)];
    while (i >= 2 && seq[i - 1] === a && seq[i - 2] === a);
    seq.push(a);
  }
  return { seq, idx: 0, time: cfg.TIME, t: cfg.TIME, errors: 0, status: 'active', errorT: 0 };
}

// Ingresa una flecha. Devuelve 'ok' | 'error' | 'done' | 'fail' (o null si ya terminó).
export function hackInput(h, dir) {
  if (h.status !== 'active') return null;
  if (h.seq[h.idx] === dir) {
    h.idx++;
    if (h.idx >= h.seq.length) {
      h.status = 'done';
      return 'done';
    }
    return 'ok';
  }
  h.errors++;
  h.idx = 0;
  h.errorT = HACK.ERROR_FLASH;
  if (h.errors >= HACK.MAX_ERRORS) {
    h.status = 'fail';
    return 'fail';
  }
  return 'error';
}

// Avanza el reloj. Devuelve 'timeout' cuando se acaba el tiempo.
export function hackUpdate(h, dt) {
  if (h.errorT > 0) h.errorT -= dt;
  if (h.status !== 'active') return h.status;
  h.t -= dt;
  if (h.t <= 0) {
    h.t = 0;
    h.status = 'timeout';
  }
  return h.status;
}
