// Calor del nivel 4 — docs/03_mecanicas.md
// Medidor de 0 a 100: al sol sube, en la sombra baja. Al llegar a 100, Choco pierde un cuadrito
// y el medidor baja a 40. El agua de los bebederos lo enfría de golpe a 0.
// Lógica pura (sin dibujo ni sonido): la usan el nivel y las pruebas.
import { HEAT } from '../config/balance.js';

export function createHeat() {
  return { value: 0, burns: 0 };
}

// Un paso. sun: true al sol, false en la sombra. rate: velocidad al sol (fase 2 del jefe).
// Devuelve 'burn' si llegó a 100 en este paso.
export function heatStep(h, dt, sun, rate = HEAT.SUN_RATE) {
  if (sun) h.value += rate * dt;
  else h.value = Math.max(0, h.value - HEAT.SHADE_RATE * dt);
  if (h.value >= HEAT.MAX) {
    h.value = HEAT.AFTER_DAMAGE;
    h.burns++;
    return 'burn';
  }
  return null;
}

export function heatCool(h) {
  h.value = 0;
}

export function heatDripping(h) {
  return h.value >= HEAT.DRIP_FROM;
}

// ¿Un punto está en sombra? zones: rectángulos { x, y, w, h } en píxeles.
export function inZones(zones, x, y) {
  for (const z of zones) if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return true;
  return false;
}

// Sombra proyectada hacia abajo (el sol está arriba): por cada columna de tiles bajo lo que la
// proyecta, desde su parte de abajo hasta el primer suelo sólido. caster: { x, w, y } en píxeles,
// con h opcional para limitarla (techos de manta de las gradas). isSolid(tx, ty) lee el mapa.
// Devuelve los rectángulos de sombra (uno por columna de tiles).
export function castShade(caster, isSolid, mapH, TS) {
  const out = [];
  const tx0 = Math.floor(caster.x / TS);
  const tx1 = Math.floor((caster.x + caster.w - 1) / TS);
  for (let tx = tx0; tx <= tx1; tx++) {
    let ty = Math.floor(caster.y / TS);
    while (ty < mapH && !isSolid(tx, ty)) ty++;
    let bottom = ty * TS;
    if (caster.h !== undefined) bottom = Math.min(bottom, caster.y + caster.h);
    const x = Math.max(caster.x, tx * TS);
    const x1 = Math.min(caster.x + caster.w, (tx + 1) * TS);
    if (bottom > caster.y && x1 > x) out.push({ x, y: caster.y, w: x1 - x, h: bottom - caster.y });
  }
  return out;
}
