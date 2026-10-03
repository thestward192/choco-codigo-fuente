// Jefe DEADLINE: reglas de la pelea (cuenta regresiva, tercios de vida, terminales y
// congelamiento) — docs/niveles/nivel_3_novacomp.md. Lógica pura: los ataques, los
// proyectiles y el dibujo están en entities/bosses/deadline.js.
import { DEADLINE, HACK } from '../config/balance.js';

export const ATTACK_ORDER = ['fan', 'sweep', 'notif'];

export function createDeadline() {
  return {
    countdown: DEADLINE.COUNTDOWN,
    hp: DEADLINE.HP_PER_THIRD * DEADLINE.THIRDS,
    third: 0, // tercio actual (0..2)
    frozen: 0, // > 0: pantalla abierta y reloj congelado
    // Terminales: 'ready' | 'used' (congeló el reloj) | 'reboot' | 'locked' | 'done'
    terminals: Array.from({ length: DEADLINE.THIRDS }, () => ({ state: 'ready', t: 0 })),
    active: -1, // terminal que congeló el reloj
    attackIdx: 0,
    defeated: false,
  };
}

export const maxHp = () => DEADLINE.HP_PER_THIRD * DEADLINE.THIRDS;

// Vida a la que se vacía el tercio actual
export function thirdFloor(b) {
  return (DEADLINE.THIRDS - b.third - 1) * DEADLINE.HP_PER_THIRD;
}

export function canHack(b, i) {
  return !b.defeated && b.frozen <= 0 && b.terminals[i].state === 'ready';
}

// Avanza el tiempo. Devuelve eventos: 'expired' (se venció el deadline), 'thaw' (se cerró la pantalla).
export function deadlineTick(b, dt) {
  const ev = [];
  if (b.defeated) return ev;
  for (const tm of b.terminals) {
    if ((tm.state === 'reboot' || tm.state === 'locked') && (tm.t -= dt) <= 0) {
      tm.state = 'ready';
      tm.t = 0;
    }
  }
  if (b.frozen > 0) {
    b.frozen -= dt;
    if (b.frozen <= 0) {
      b.frozen = 0;
      ev.push('thaw');
      // No alcanzó para vaciar el tercio: la terminal se reinicia
      const tm = b.terminals[b.active];
      if (tm && tm.state === 'used') {
        tm.state = 'reboot';
        tm.t = DEADLINE.REBOOT;
      }
      b.active = -1;
    }
    return ev;
  }
  b.countdown -= dt;
  if (b.countdown <= 0) {
    b.countdown = DEADLINE.COUNTDOWN_RESET;
    ev.push('expired');
  }
  return ev;
}

// Hackeo completado en la terminal i: congela el reloj y abre la pantalla.
export function deadlineHacked(b, i) {
  if (!canHack(b, i)) return false;
  b.terminals[i].state = 'used';
  b.active = i;
  b.frozen = DEADLINE.FREEZE;
  return true;
}

// Tres errores en una terminal: se bloquea un rato.
export function deadlineHackFailed(b, i) {
  const tm = b.terminals[i];
  if (tm.state !== 'ready') return;
  tm.state = 'locked';
  tm.t = HACK.BOSS_LOCK;
}

// Disparo al núcleo. Solo hace daño con la pantalla abierta; no pasa del tercio actual.
// Devuelve { dealt, thirdDone, defeated }.
export function deadlineDamage(b, dmg) {
  const out = { dealt: 0, thirdDone: false, defeated: false };
  if (b.defeated || b.frozen <= 0) return out;
  const floor = thirdFloor(b);
  const before = b.hp;
  b.hp = Math.max(floor, b.hp - dmg);
  out.dealt = before - b.hp;
  if (b.hp <= floor) {
    out.thirdDone = true;
    const tm = b.terminals[b.active];
    if (tm) tm.state = 'done';
    b.active = -1;
    b.third++;
    b.frozen = 0;
    if (b.third >= DEADLINE.THIRDS) {
      b.defeated = true;
      out.defeated = true;
    }
  }
  return out;
}

// Próximo ataque del ciclo
export function nextAttack(b) {
  const k = ATTACK_ORDER[b.attackIdx % ATTACK_ORDER.length];
  b.attackIdx++;
  return k;
}
