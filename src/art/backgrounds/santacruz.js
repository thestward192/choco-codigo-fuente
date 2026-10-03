// Fondos de Santa Cruz (docs/niveles/nivel_4_santa_cruz.md): 4 capas de parallax.
//   1) cielo con sol (estático, con estática glitcheada), 2) montañas lejanas (0.15),
//   3) techos del pueblo con gente glitcheada bailando (0.4), 4) primer plano con banderines (1.25).
// Variantes: 'day' (naranja-amarillo), 'ruins' (interior de ladrillo con huecos de luz) y
// 'sunset' (rosado-morado, sin calor). Las capas se hornean una vez en tiras de 640 px.
import { createCanvas } from '../../core/renderer.js';
import { SCREEN } from '../../config/balance.js';
import { disc } from '../../core/lighting.js';

const W = SCREEN.W;
const H = SCREEN.H;
const STRIP = 640;

const hash = (x, s = 0) => {
  let h = (x * 374761393 + s * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const SKIES = {
  day: ['#FFB347', '#FFC15E', '#FFCF78', '#FFDB92', '#FFE6AC', '#FFEFC4'],
  sunset: ['#3A2A6E', '#5A2E7A', '#8A3A82', '#C24E86', '#FF6B8A', '#FF9A7A'],
};

function strip(h, paint) {
  const cv = createCanvas(STRIP, h);
  paint(cv.getContext('2d'));
  return cv;
}

function tile(ctx, img, ox, y) {
  let x = -(((ox % STRIP) + STRIP) % STRIP);
  for (; x < W; x += STRIP) ctx.drawImage(img, Math.round(x), Math.round(y));
}

const layers = {};
function mountains(mode) {
  const key = `mtn-${mode}`;
  if (layers[key]) return layers[key];
  const far = mode === 'sunset' ? '#6A3A86' : '#D98A5A';
  const top = mode === 'sunset' ? '#8A4A96' : '#E8A070';
  layers[key] = strip(60, (c) => {
    for (let x = 0; x < STRIP; x++) {
      const h = 22 + Math.round(16 * Math.sin((x / STRIP) * Math.PI * 3 + 0.4) + 9 * Math.sin((x / STRIP) * Math.PI * 9));
      c.fillStyle = far;
      c.fillRect(x, 60 - h, 1, h);
      c.fillStyle = top;
      c.fillRect(x, 60 - h, 1, 1);
    }
  });
  return layers[key];
}

// Techos del pueblo: casas de adobe con tejas, el viejo campanario y árboles de guanacaste
function town(mode) {
  const key = `town-${mode}`;
  if (layers[key]) return layers[key];
  const sunset = mode === 'sunset';
  const wall = sunset ? '#B07A98' : '#F0D8B0';
  const wallShade = sunset ? '#8A5A7E' : '#D8B88A';
  const roofC = sunset ? '#7A2E50' : '#C46A3E';
  const tree = sunset ? '#3A3A5A' : '#7A9A4A';
  layers[key] = strip(70, (c) => {
    let x = 0;
    let i = 0;
    while (x < STRIP) {
      const w = 34 + Math.round(hash(i, 1) * 30);
      const h = 18 + Math.round(hash(i, 2) * 14);
      const y = 70 - h;
      if (hash(i, 3) < 0.25) {
        // Árbol de guanacaste: copa ancha y plana
        c.fillStyle = sunset ? '#2A2A40' : '#5A4A2A';
        c.fillRect(x + w / 2 - 1, y + 4, 3, h);
        c.fillStyle = tree;
        c.fillRect(x + 2, y, w - 4, 6);
        c.fillRect(x + 6, y - 3, w - 12, 3);
      } else {
        c.fillStyle = wall;
        c.fillRect(x, y, w - 2, h);
        c.fillStyle = wallShade;
        c.fillRect(x, y + h - 3, w - 2, 3);
        c.fillStyle = roofC;
        c.fillRect(x - 2, y - 4, w + 2, 4);
        c.fillRect(x, y - 6, w - 2, 2);
        // Puerta y ventana
        c.fillStyle = sunset ? '#4A2A4A' : '#8B5A2B';
        c.fillRect(x + 6, y + h - 10, 5, 10);
        c.fillRect(x + w - 14, y + 5, 6, 5);
      }
      x += w + 2;
      i++;
    }
    // El campanario a lo lejos
    const bx = 420;
    c.fillStyle = wallShade;
    c.fillRect(bx, 10, 22, 60);
    c.fillStyle = wall;
    c.fillRect(bx + 2, 12, 18, 58);
    c.fillStyle = sunset ? '#4A2A4A' : '#8A5A3A';
    c.fillRect(bx + 7, 20, 8, 10);
    c.fillStyle = roofC;
    c.fillRect(bx - 2, 6, 26, 4);
    c.fillRect(bx + 4, 2, 14, 4);
  });
  return layers[key];
}

function ruinsWall() {
  if (layers.ruins) return layers.ruins;
  layers.ruins = strip(H, (c) => {
    c.fillStyle = '#3A1A14';
    c.fillRect(0, 0, STRIP, H);
    for (let y = 0; y < H; y += 6) {
      c.fillStyle = '#4A2218';
      c.fillRect(0, y, STRIP, 1);
      for (let x = (y / 6) % 2 ? 0 : 6; x < STRIP; x += 12) c.fillRect(x, y, 1, 6);
    }
    // Ladrillos sueltos más claros
    c.fillStyle = '#5A2A1E';
    for (let i = 0; i < 90; i++) c.fillRect(Math.round(hash(i, 30) * STRIP), Math.round(hash(i, 31) * H), 6, 3);
  });
  return layers.ruins;
}

// Sol con rayitos que giran y algo de estática (el sol también es un enemigo)
function drawSun(ctx, x, y, t, sunset) {
  if (sunset) {
    ctx.fillStyle = '#FFB36B';
    disc(ctx, x, y, 16);
    ctx.fillStyle = '#FFD9A0';
    disc(ctx, x, y, 12);
    return;
  }
  ctx.fillStyle = '#FFF4C0';
  for (let i = 0; i < 12; i++) {
    const a = t * 0.3 + (i * Math.PI) / 6;
    const r0 = 18;
    const r1 = 24 + (i % 2) * 4;
    for (let r = r0; r < r1; r += 1) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
  }
  ctx.fillStyle = '#FFE680';
  disc(ctx, x, y, 15);
  ctx.fillStyle = '#FFFBE0';
  disc(ctx, x, y, 11);
  // Ojos rojos glitcheados que aparecen a ratos
  if (Math.floor(t * 1.3) % 7 === 0) {
    ctx.fillStyle = '#E0343F';
    ctx.fillRect(x - 5, y - 2, 3, 2);
    ctx.fillRect(x + 3, y - 2, 3, 2);
  }
}

// mode: 'day' | 'ruins' | 'sunset'. mapH para ubicar el horizonte.
export function drawSantaCruzBg(ctx, camX, camY, mapH, t, mode = 'day') {
  if (mode === 'ruins') {
    tile(ctx, ruinsWall(), camX * 0.5, -Math.round(((camY * 0.5) % 6) + 6));
    return;
  }
  const sky = SKIES[mode] || SKIES.day;
  const bandH = Math.ceil(H / sky.length);
  sky.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bandH, W, bandH);
  });
  const sunset = mode === 'sunset';
  drawSun(ctx, sunset ? 250 : 60, Math.round((sunset ? 118 : 30) - camY * 0.05), t, sunset);
  // Estática en el cielo
  if (!sunset) {
    for (let i = 0; i < 5; i++) {
      if (Math.floor(t * 8 + i * 3) % 11 !== 0) continue;
      ctx.fillStyle = i % 2 ? '#FF2E88' : '#FFFFFF';
      ctx.fillRect(Math.round(hash(i + Math.floor(t * 8), 7) * W), Math.round(hash(i, 8) * 70), 8 + i * 3, 1);
    }
  } else {
    // Estrellitas del atardecer
    ctx.fillStyle = '#FFE6F0';
    for (let i = 0; i < 18; i++) if (Math.floor(t * 2 + i) % 5) ctx.fillRect(Math.round(hash(i, 40) * W), Math.round(hash(i, 41) * 60), 1, 1);
  }
  const bottom = mapH - camY;
  tile(ctx, mountains(mode), camX * 0.15, Math.round(bottom * 0.15 + (H - 120) * 0.85) - 6);
  if (sunset) {
    // El barranco: paredes de roca que se oscurecen hacia el fondo
    tile(ctx, canyon(), camX * 0.4, Math.round(bottom * 0.4 + (H - 100) * 0.6) - 4);
    return;
  }
  const ty = Math.round(bottom * 0.4 + (H - 100) * 0.6) - 4;
  tile(ctx, town(mode), camX * 0.4, ty);
  drawDancers(ctx, camX * 0.4, ty + 70, t);
}

function canyon() {
  if (layers.canyon) return layers.canyon;
  const cols = ['#5A2E6A', '#46245A', '#341A48', '#241236', '#160A24'];
  layers.canyon = strip(110, (c) => {
    for (let x = 0; x < STRIP; x++) {
      const h = 16 + Math.round(8 * Math.sin((x / STRIP) * Math.PI * 5) + 4 * Math.sin((x / STRIP) * Math.PI * 17));
      cols.forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(x, h + i * 18, 1, 110);
      });
      c.fillStyle = '#7A3E7E';
      c.fillRect(x, h, 1, 1);
    }
  });
  return layers.canyon;
}

// Gente glitcheada bailando en loop entre las casas (siluetas pequeñas)
function drawDancers(ctx, ox, y, t) {
  for (let i = 0; i < 8; i++) {
    const wx = i * 80 + 30;
    let x = wx - (((ox % STRIP) + STRIP) % STRIP);
    if (x < -10) x += STRIP;
    if (x > W + 10) continue;
    const f = Math.floor(t * 4 + i) % 2;
    const glitch = Math.floor(t * 6 + i * 5) % 17 === 0;
    ctx.fillStyle = glitch ? '#FF2E88' : i % 2 ? '#8A4A6A' : '#5A4A7A';
    x = Math.round(x);
    ctx.fillRect(x, y - 9, 3, 3);
    ctx.fillRect(x - 1, y - 6, 5, 4);
    ctx.fillRect(x - 1 + f, y - 2, 1, 2);
    ctx.fillRect(x + 3 - f, y - 2, 1, 2);
    ctx.fillRect(x - 2 - f, y - 7 + f, 1, 2);
    ctx.fillRect(x + 4 + f, y - 7 + f, 1, 2);
    if (glitch) {
      ctx.fillStyle = '#43D9FF';
      ctx.fillRect(x - 3, y - 5, 9, 1);
    }
  }
}

// Primer plano: guirnalda de banderines que pasa delante de todo (parallax 1.25)
export function drawSantaCruzFront(ctx, camX, camY, t) {
  const colors = ['#FF6B8A', '#FFD23F', '#4FD1C5', '#43D9FF', '#6E8B3D', '#FFB347'];
  const period = 420;
  const base = -camX * 1.25;
  for (let k = -1; k < 3; k++) {
    const x0 = Math.round((((base % period) + period) % period) + (k - 1) * period);
    if (x0 > W || x0 + period < 0) continue;
    const y0 = 30 - Math.round(camY * 0.05); // debajo del HUD
    for (let x = 0; x < 200; x++) {
      const sag = Math.round(Math.sin((x / 200) * Math.PI) * 14 + Math.sin(t * 1.5 + x * 0.02));
      ctx.fillStyle = '#2A140C';
      ctx.fillRect(x0 + x, y0 + sag, 1, 1);
      if (x % 14 === 4) {
        ctx.fillStyle = colors[(x / 14 + k) % colors.length | 0];
        for (let r = 0; r < 6; r++) ctx.fillRect(x0 + x - 3 + Math.ceil(r / 2), y0 + sag + 1 + r, 7 - Math.ceil(r / 2) * 2, 1);
      }
    }
  }
}
