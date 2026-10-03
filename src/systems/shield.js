// Escudo Firewall — docs/03_mecanicas.md
// Burbuja de 1.5 s que bloquea proyectiles y daño por contacto; recarga de 3.5 s.
// Parry: si el golpe llega dentro de los 0.15 s después de activarlo, el proyectil se refleja.
// Lógica pura (la usan Choco de plataformas y Choco cenital).
import { SHIELD } from '../config/balance.js';

export function createShield() {
  return { active: 0, cooldown: 0, sinceOn: Infinity, parried: 0, blocked: 0 };
}

// Intenta activarlo. Devuelve true si se prendió.
export function shieldPress(s) {
  if (s.active > 0 || s.cooldown > 0) return false;
  s.active = SHIELD.DURATION;
  s.sinceOn = 0;
  return true;
}

export function shieldUpdate(s, dt) {
  s.sinceOn += dt;
  if (s.active > 0) {
    s.active -= dt;
    if (s.active <= 0) {
      s.active = 0;
      s.cooldown = SHIELD.COOLDOWN;
    }
  } else if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
}

export function shieldOn(s) {
  return s.active > 0;
}

// Un golpe llega al escudo: null si no está activo, 'parry' dentro de la ventana, si no 'block'.
export function shieldBlock(s) {
  if (s.active <= 0) return null;
  if (s.sinceOn <= SHIELD.PARRY_WINDOW) {
    s.parried++;
    return 'parry';
  }
  s.blocked++;
  return 'block';
}

// Para el HUD: 1 = listo, 0 = recién usado
export function shieldCharge01(s) {
  if (s.active > 0) return 0;
  return 1 - s.cooldown / SHIELD.COOLDOWN;
}
