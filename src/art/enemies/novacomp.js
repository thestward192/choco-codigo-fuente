// Enemigos de Novacomp (vista cenital) — docs/02_personajes.md
// BotSeg (robot de seguridad 16×16 en 4 direcciones), dron, aspiradora robot y torreta de
// práctica. El visor y las luces de estado se pintan aparte para cambiar de color
// (normal / sospecha / alarma). La cámara de seguridad se dibuja con primitivas porque gira.
import { Grid } from '../painter.js';
import { SpriteCache } from '../bake.js';

export const NOVA_ENEMY_PAL = {
  o: '#0B0E16',
  b: '#3A4A63', // cuerpo
  B: '#2C3A4F',
  l: '#5E7698',
  L: '#8FA6C8',
  k: '#141A26', // visor apagado
  w: '#E8ECF4',
  y: '#FFD23F',
  r: '#E0343F',
  c: '#43D9FF',
  g: '#6FE08A',
  m: '#5A5A6E',
  M: '#8A8AA0',
  h: '#C8CCD8',
};

// ---------- BotSeg ----------
// dir: 'down' | 'up' | 'side' (mirando a la derecha; la izquierda se voltea)
function buildBot(key) {
  const [dir, f] = key.split(':');
  const frame = Number(f);
  const g = new Grid(16, 16);
  const bob = frame % 2;
  // Ruedas / base
  g.rect(3, 13, 12, 14, 'o').set(4 + bob, 14, 'm').set(10 - bob, 14, 'm');
  // Cuerpo ovalado
  g.ellipse(7.5, 8 - bob * 0.5, 5.5, 5.5, 'B');
  g.ellipse(7.2, 7.5 - bob * 0.5, 4.8, 4.8, 'b');
  g.set(5, 4 - bob, 'L').set(6, 3 - bob, 'L').set(4, 5 - bob, 'l');
  // Antena
  g.vline(10, 1 - bob, 3 - bob, 'm').set(10, 0, bob ? '.' : 'M');
  if (dir === 'down') {
    // Visor de frente (se colorea aparte): marco
    g.hline(3, 12, 6 - bob, 'o').hline(3, 12, 9 - bob, 'o');
    g.rect(3, 7 - bob, 12, 8 - bob, 'k');
    // Placa de seguridad
    g.rect(6, 10 - bob, 9, 11 - bob, 'y').set(7, 10 - bob, 'o');
  } else if (dir === 'up') {
    g.rect(5, 6 - bob, 10, 10 - bob, 'B').frame(5, 6 - bob, 10, 10 - bob, 'o');
    g.hline(6, 9, 8 - bob, 'l');
  } else {
    g.hline(8, 13, 6 - bob, 'o').hline(8, 13, 9 - bob, 'o');
    g.rect(8, 7 - bob, 13, 8 - bob, 'k');
    g.set(4, 8 - bob, 'l').set(4, 9 - bob, 'l');
  }
  g.outline('o');
  return g.toRows();
}

let botCache = null;
export function botSprite(dir, frame) {
  if (!botCache) botCache = new SpriteCache(buildBot, NOVA_ENEMY_PAL);
  return botCache.get(`${dir}:${frame}`);
}
export const buildBotRows = buildBot;

// Visor del bot según su estado (rectángulo dentro del sprite)
export function botVisor(dir, frame) {
  const bob = frame % 2;
  if (dir === 'down') return { x: 3, y: 7 - bob, w: 10, h: 2 };
  if (dir === 'side') return { x: 8, y: 7 - bob, w: 6, h: 2 };
  return null;
}

// ---------- Dron (vuela; su sombra se dibuja en el piso) ----------
function buildDrone(key) {
  const frame = Number(key);
  const g = new Grid(16, 12);
  // Hélices (alternan)
  const p = frame % 2 ? ['M', '.'] : ['.', 'M'];
  for (const [x, y] of [
    [2, 1],
    [13, 1],
  ]) {
    g.hline(x - 2, x + 2, y, p[0] === 'M' ? 'M' : 'm');
    g.set(x, y, 'o');
  }
  g.vline(2, 2, 4, 'm').vline(13, 2, 4, 'm');
  g.ellipse(7.5, 6, 4.5, 3.5, 'B');
  g.ellipse(7.5, 5.5, 3.8, 2.8, 'b');
  g.set(6, 4, 'L').set(7, 4, 'L');
  g.hline(5, 10, 7, 'o').rect(6, 7, 9, 8, 'k');
  g.set(7, 10, 'o').set(8, 10, 'o').set(7, 11, 'm');
  g.outline('o');
  return g.toRows();
}

let droneCache = null;
export function droneSprite(frame) {
  if (!droneCache) droneCache = new SpriteCache(buildDrone, NOVA_ENEMY_PAL);
  return droneCache.get(String(frame % 2));
}
export const buildDroneRows = buildDrone;

// ---------- Aspiradora robot ----------
function buildVacuum(key) {
  const frame = Number(key);
  const g = new Grid(16, 12);
  g.ellipse(7.5, 6.5, 7, 4.8, 'B');
  g.ellipse(7.5, 6, 6.3, 4, 'h');
  g.ellipse(7.5, 5.5, 3, 2, 'M');
  g.set(7, 3, 'g').set(8, 3, frame % 2 ? 'g' : 'o');
  g.hline(2, 13, 9, 'm');
  // Cepillitos que giran
  g.set(1, 9 - (frame % 2), 'M').set(14, 8 + (frame % 2), 'M');
  g.outline('o');
  return g.toRows();
}

let vacuumCache = null;
export function vacuumSprite(frame) {
  if (!vacuumCache) vacuumCache = new SpriteCache(buildVacuum, NOVA_ENEMY_PAL);
  return vacuumCache.get(String(frame % 2));
}
export const buildVacuumRows = buildVacuum;

// ---------- Torreta de práctica ----------
function buildTurret(key) {
  const charging = key === '1';
  const g = new Grid(16, 16);
  g.rect(3, 10, 12, 15, 'B').frame(3, 10, 12, 15, 'o').hline(4, 11, 11, 'l');
  g.ellipse(8, 7, 5, 4.5, 'b');
  g.set(6, 4, 'L').set(7, 4, 'L');
  // Cañón hacia la izquierda
  g.rect(0, 6, 5, 8, 'm').hline(0, 5, 6, 'M').set(0, 7, charging ? 'r' : 'o');
  g.rect(8, 6, 10, 8, charging ? 'r' : 'c');
  g.hline(5, 11, 13, 'y').set(6, 13, 'o').set(8, 13, 'o').set(10, 13, 'o');
  g.outline('o');
  return g.toRows();
}

let turretCache = null;
export function turretSprite(charging) {
  if (!turretCache) turretCache = new SpriteCache(buildTurret, NOVA_ENEMY_PAL);
  return turretCache.get(charging ? '1' : '0');
}
export const buildTurretRows = buildTurret;

// ---------- Cámara de seguridad (gira: se dibuja con primitivas) ----------
// (x, y): punto de montaje en pantalla; ang: hacia dónde mira; state: 'normal' | 'sus' | 'alert' | 'off'
export function drawSecurityCamera(ctx, x, y, ang, state, t) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  // Soporte
  ctx.fillStyle = '#0B0E16';
  ctx.fillRect(x - 2, y - 3, 5, 4);
  ctx.fillStyle = '#5A5A6E';
  ctx.fillRect(x - 1, y - 2, 3, 2);
  // Cuerpo: 4 puntos a lo largo de la dirección
  for (let i = 0; i <= 5; i++) {
    const px = Math.round(x + c * i);
    const py = Math.round(y + s * i);
    ctx.fillStyle = '#0B0E16';
    ctx.fillRect(px - 2, py - 2, 5, 5);
  }
  for (let i = 0; i <= 5; i++) {
    const px = Math.round(x + c * i);
    const py = Math.round(y + s * i);
    ctx.fillStyle = i < 2 ? '#8A8AA0' : '#C8CCD8';
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  // Lente
  const lx = Math.round(x + c * 6);
  const ly = Math.round(y + s * 6);
  ctx.fillStyle = '#141A26';
  ctx.fillRect(lx - 1, ly - 1, 3, 3);
  // LED de estado
  const blink = Math.floor(t * 3) % 2 === 0;
  let led = state === 'alert' ? '#E0343F' : state === 'sus' ? '#FFD23F' : state === 'off' ? (blink ? '#3A3A4A' : '#1A1A24') : blink ? '#6FE08A' : '#2E6A3A';
  ctx.fillStyle = led;
  ctx.fillRect(Math.round(x + c * 2 - s * 2), Math.round(y + s * 2 + c * 2), 1, 1);
  if (state === 'off') {
    ctx.fillStyle = '#43D9FF';
    if (blink) ctx.fillRect(lx, ly - 4, 1, 2);
  }
}
