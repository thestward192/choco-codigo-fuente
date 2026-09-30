// Pantalla de título: lettering "CHOCO" de chocolate que gotea y el fondo del cuarto de
// Choco de noche visto por la ventana (con parallax, estrellas y luciérnagas).
import { Grid } from './painter.js';
import { bake } from './bake.js';
import { createCanvas } from '../core/renderer.js';
import { SCREEN } from '../config/balance.js';
import { fxRng } from '../core/rng.js';

const LETTERS = {
  C: ['.####.', '##..##', '##....', '##....', '##....', '##..##', '.####.'],
  H: ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
};

const LOGO_PAL = { o: '#150B07', s: '#3D2216', b: '#5C3521', l: '#83522F', h: '#B07A4A', H: '#E3B07A' };
const CELL = 5;
const GAP = 3;

// Columnas (en px del logo) de donde cuelgan gotas: [x, largo base]
export let LOGO_DRIPS = [];

export function buildLogo(word = 'CHOCO') {
  const lw = 6 * CELL;
  const lh = 7 * CELL;
  const w = word.length * lw + (word.length - 1) * GAP + 2;
  const h = lh + 8;
  const mask = Array.from({ length: h }, () => Array(w).fill(false));
  [...word].forEach((ch, i) => {
    const L = LETTERS[ch];
    const ox = 1 + i * (lw + GAP);
    L.forEach((row, cy) => {
      for (let cx = 0; cx < row.length; cx++) {
        if (row[cx] !== '#') continue;
        for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) mask[1 + cy * CELL + y][ox + cx * CELL + x] = true;
      }
    });
  });
  // Gotas fijas: bultitos bajo los bordes inferiores (chocolate derretido)
  const drips = [];
  const rng = (n) => ((n * 9301 + 49297) % 233280) / 233280;
  for (let x = 2; x < w - 2; x++) {
    let bottom = -1;
    for (let y = h - 1; y >= 0; y--)
      if (mask[y][x]) {
        bottom = y;
        break;
      }
    if (bottom < 0 || bottom >= h - 2) continue;
    if (rng(x * 7 + 3) < 0.12 && mask[bottom][x - 1] && mask[bottom][x + 1]) {
      const len = 1 + Math.floor(rng(x) * 4);
      for (let k = 1; k <= len && bottom + k < h - 1; k++) {
        mask[bottom + k][x] = true;
        if (k < len - 1) mask[bottom + k][x + 1] = true;
      }
      drips.push({ x, y: bottom + len + 1 });
    }
  }
  LOGO_DRIPS = drips;
  // Sombreado
  const g = new Grid(w, h);
  const at = (x, y) => y >= 0 && y < h && x >= 0 && x < w && mask[y][x];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y][x]) continue;
      let c = 'b';
      if (!at(x, y - 1)) c = 'H';
      else if (!at(x, y - 2)) c = 'h';
      else if (!at(x - 1, y)) c = 'l';
      if (!at(x, y + 1) || !at(x + 1, y)) c = 's';
      g.set(x, y, c);
    }
  }
  g.outline('o');
  return { canvas: bake(g.toRows(), LOGO_PAL), drips };
}

// ---------- Fondo ----------

export class TitleBackground {
  constructor() {
    this.t = 0;
    this.stars = [];
    for (let i = 0; i < 70; i++) this.stars.push({ x: fxRng.int(0, SCREEN.W), y: fxRng.int(0, 110), p: fxRng.range(0, 6), b: fxRng.chance(0.2) });
    this.flies = [];
    for (let i = 0; i < 14; i++) this.flies.push({ x: fxRng.range(0, SCREEN.W), y: fxRng.range(100, 175), vx: fxRng.range(-6, 6), vy: fxRng.range(-4, 4), p: fxRng.range(0, 6) });
    this.house = this.buildHouse();
    this.trees = this.buildTrees();
    this.tv = 1;
  }

  buildTrees() {
    // Siluetas de árboles de guanacaste (copa ancha y plana) a los lados
    const c = createCanvas(SCREEN.W + 40, 120);
    const x = c.getContext('2d');
    const g = new Grid(SCREEN.W + 40, 120);
    const tree = (cx, cy, r) => {
      g.rect(cx - 2, cy, cx + 2, 119, 'd');
      g.line(cx, cy + 10, cx - 12, cy + 2, 'd').line(cx, cy + 12, cx + 14, cy + 3, 'd');
      g.ellipse(cx, cy, r, r * 0.32, 'd');
      g.ellipse(cx - r * 0.5, cy - 4, r * 0.55, r * 0.22, 'd');
      g.ellipse(cx + r * 0.45, cy - 3, r * 0.6, r * 0.24, 'd');
    };
    tree(20, 40, 44);
    tree(SCREEN.W + 18, 34, 50);
    const baked = bake(g.toRows(), { d: '#0B0914' });
    x.drawImage(baked, 0, 0);
    return c;
  }

  buildHouse() {
    // Pared de adobe con tejas y una ventana grande
    const g = new Grid(SCREEN.W, 80);
    g.rect(40, 12, 280, 79, 'a');
    // Tejas
    for (let x = 32; x <= 288; x++) {
      const y = 6 + ((x >> 2) % 2);
      g.vline(x, y, 11, (x >> 2) % 2 ? 't' : 'T');
    }
    g.hline(32, 288, 12, 'k');
    // Textura del adobe
    for (let i = 0; i < 60; i++) g.set(42 + ((i * 37) % 236), 16 + ((i * 53) % 60), 'A');
    // Ventana
    g.rect(118, 24, 202, 70, 'n');
    g.frame(116, 22, 204, 72, 'w').frame(115, 21, 205, 73, 'k');
    g.vline(160, 23, 71, 'w').hline(117, 203, 46, 'w');
    g.rect(112, 73, 208, 76, 'w').hline(112, 208, 77, 'k');
    // Interior: estante, póster y la silueta de la tele encendida
    g.rect(124, 30, 146, 31, 'm');
    g.rect(170, 28, 190, 40, 'm');
    g.rect(126, 56, 154, 70, 'm');
    g.rect(130, 50, 150, 64, 'i');
    g.frame(129, 49, 151, 65, 'm');
    return {
      canvas: bake(g.toRows(), { a: '#2A2236', A: '#231C2E', t: '#4A1E1A', T: '#3A1614', k: '#120E18', w: '#3D2A20', n: '#0B0A12', m: '#15121E', i: '#3C6EF0' }),
    };
  }

  update(dt) {
    this.t += dt;
    for (const f of this.flies) {
      f.x += f.vx * dt + Math.sin(this.t + f.p) * 4 * dt;
      f.y += f.vy * dt + Math.cos(this.t * 0.7 + f.p) * 3 * dt;
      if (f.x < -4) f.x = SCREEN.W + 4;
      if (f.x > SCREEN.W + 4) f.x = -4;
      if (f.y < 95) f.vy = Math.abs(f.vy);
      if (f.y > 176) f.vy = -Math.abs(f.vy);
    }
    // Parpadeo de la tele
    if (fxRng.chance(0.08)) this.tv = fxRng.range(0.7, 1);
  }

  draw(ctx) {
    const t = this.t;
    // Cielo por bandas
    const bands = ['#07060F', '#0B0A1A', '#100D22', '#15112A', '#1A1426'];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * 24, SCREEN.W, 24);
    });
    ctx.fillStyle = '#1A1426';
    ctx.fillRect(0, 120, SCREEN.W, 60);
    // Estrellas (parallax lento)
    const drift = Math.sin(t * 0.1) * 3;
    for (const s of this.stars) {
      const on = Math.sin(t * 2 + s.p) > -0.3;
      if (!on) continue;
      ctx.fillStyle = s.b ? '#F4F1EA' : '#6A6A90';
      ctx.fillRect(Math.round(s.x + drift * 0.3), s.y, 1, 1);
    }
    // Luna
    ctx.fillStyle = '#E8E2C8';
    ctx.fillRect(262 + Math.round(drift * 0.3), 16, 8, 8);
    ctx.fillRect(261 + Math.round(drift * 0.3), 17, 10, 6);
    ctx.fillStyle = '#15112A';
    ctx.fillRect(266 + Math.round(drift * 0.3), 16, 5, 6);
    // Árboles (parallax medio)
    ctx.drawImage(this.trees, Math.round(-20 + drift * 0.6), 60);
    // Casa (primer plano)
    const hx = Math.round(drift);
    ctx.drawImage(this.house.canvas, hx, 100);
    // Luz de la tele: brillo azul que parpadea en el interior y sale por la ventana
    ctx.globalAlpha = 0.18 * this.tv;
    ctx.fillStyle = '#3C6EF0';
    ctx.fillRect(hx + 118, 124, 85, 47);
    ctx.globalAlpha = 0.08 * this.tv;
    ctx.fillRect(hx + 104, 174, 112, 6);
    ctx.globalAlpha = 1;
    // Suelo
    ctx.fillStyle = '#0E0B16';
    ctx.fillRect(0, 176, SCREEN.W, 4);
    // Luciérnagas
    for (const f of this.flies) {
      const a = (Math.sin(t * 3 + f.p * 2) + 1) / 2;
      if (a < 0.25) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#E6FF7A';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      ctx.globalAlpha = a * 0.3;
      ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y), 3, 1);
      ctx.fillRect(Math.round(f.x), Math.round(f.y) - 1, 1, 3);
      ctx.globalAlpha = 1;
    }
  }
}

// Gotas animadas que caen de los bordes del logo. Se dibujan encima del logo.
export class LogoDrips {
  constructor(drips) {
    this.list = drips.map((d, i) => ({ ...d, t: (i * 0.37) % 2.2, period: 1.8 + ((i * 0.53) % 1.4) }));
  }
  update(dt) {
    for (const d of this.list) d.t = (d.t + dt) % d.period;
  }
  draw(ctx, ox, oy) {
    for (const d of this.list) {
      const grow = Math.min(1, d.t / (d.period * 0.6));
      const x = ox + d.x;
      const y0 = oy + d.y;
      if (d.t < d.period * 0.6) {
        // La gota se va formando
        const len = Math.round(grow * 3);
        ctx.fillStyle = '#5C3521';
        if (len > 0) ctx.fillRect(x, y0 - 1, 1, len + 1);
        ctx.fillStyle = '#83522F';
        ctx.fillRect(x, y0 - 1, 1, 1);
      } else {
        // Cae
        const ft = d.t - d.period * 0.6;
        const fy = Math.round(y0 + 3 + 140 * ft * ft);
        ctx.fillStyle = '#5C3521';
        ctx.fillRect(x, fy, 1, 2);
        ctx.fillStyle = '#B07A4A';
        ctx.fillRect(x, fy, 1, 1);
      }
    }
  }
}
