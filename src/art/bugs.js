// Sprites de batalla de los bugs del nivel 2 (32×32, 2 frames de idle) — docs/02_personajes.md
// Diseños originales: cada bug es un error de programación con cuerpo.
import { Grid } from './painter.js';
import { SpriteCache } from './bake.js';
import { BUG_PAL } from './topdown.js';

export const BATTLE_BUG_PAL = { ...BUG_PAL, k: '#2A1A2E', e: '#FFFFFF', p: '#5A2A8A' };

function eyes(g, x, y, f, { size = 3, gap = 6, look = 0 } = {}) {
  for (const ex of [x, x + gap]) {
    g.rect(ex, y, ex + size - 1, y + size, 'w');
    g.rect(ex + 1 + look, y + 1 + (f ? 1 : 0), ex + 1 + look, y + 2 + (f ? 1 : 0), 'o');
    g.set(ex, y, 'e');
  }
}

const BATTLE_BUGS = {
  nullPointer(g, f) {
    const b = f ? 1 : 0;
    g.ellipse(15.5, 15 + b, 11, 10, 'A');
    g.ellipse(15.5, 14 + b, 10, 9, 'a');
    g.ellipse(11, 9 + b, 3, 2, 'b');
    // Ojo gigante con ∅
    g.ellipse(15.5, 15 + b, 5.5, 5.5, 'w');
    g.ellipse(15.5, 15 + b, 3.5, 3.5, 'o');
    g.line(11, 20 + b, 20, 10 + b, 'm');
    g.line(12, 20 + b, 21, 10 + b, 'm');
    // Colita en forma de puntero
    g.line(24, 21 + b, 30, 28, 'b').line(25, 21 + b, 31, 27, 'p');
    g.hline(27, 31, 28, 'b').vline(31, 24, 28, 'b');
    // Patitas
    for (const x of [8, 13, 18, 23]) g.line(x, 23 + b, x + (f ? 1 : -1), 29, 'o');
  },
  loop(g, f) {
    const rot = f ? 0.5 : 0;
    g.ellipse(15.5, 15.5, 13, 13, 'C');
    g.ellipse(15.5, 15.5, 11.5, 11.5, 'c');
    g.ellipse(15.5, 15.5, 6, 6, '.');
    g.ellipse(15.5, 15.5, 6.8, 6.8, 'C');
    g.ellipse(15.5, 15.5, 5.6, 5.6, '.');
    // Flechas que giran sobre el anillo
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI * 2) / 3;
      const x = Math.round(15.5 + Math.cos(a) * 12);
      const y = Math.round(15.5 + Math.sin(a) * 12);
      g.rect(x - 1, y - 1, x + 1, y + 1, 'd');
    }
    eyes(g, 11, 12, f, { gap: 7 });
    g.hline(13, 18, 19, 'o');
  },
  race(g, f) {
    const o = f ? 2 : 0;
    g.ellipse(10 - o, 17, 8, 8, 'R');
    g.ellipse(10 - o, 16, 7, 7, 'r');
    g.ellipse(22 + o, 14, 8, 8, 'Y');
    g.ellipse(22 + o, 13, 7, 7, 'y');
    eyes(g, 6 - o, 13, f, { size: 2, gap: 5, look: 1 });
    eyes(g, 18 + o, 10, f, { size: 2, gap: 5, look: -1 });
    g.hline(8 - o, 12 - o, 20, 'o').hline(20 + o, 24 + o, 17, 'o');
    // Rayitas de velocidad
    g.hline(0, 3, 10, 'y').hline(1, 4, 24, 'r').hline(28, 31, 26, 'y');
    for (const x of [5, 9, 13]) g.line(x - o, 24, x - o - 1, 29, 'o');
    for (const x of [19, 23, 27]) g.line(x + o, 21, x + o + 1, 27, 'o');
  },
  leak(g, f) {
    const b = f ? 1 : 0;
    g.ellipse(15.5, 17 + b, 11, 10, 'G');
    g.ellipse(15.5, 16 + b, 10, 9, 'g');
    g.rect(14, 2 + b, 17, 8 + b, 'g').rect(15, 0 + b, 16, 2 + b, 'G');
    g.ellipse(10, 11 + b, 2.5, 2, 'h');
    eyes(g, 10, 14 + b, f, { gap: 8 });
    g.line(12, 22 + b, 19, 22 + b, 'G').set(13, 23 + b, 'G').set(18, 23 + b, 'G');
    // Charquitos y gotas
    g.ellipse(6, 29, 4, 1.5, 'G').ellipse(26, 30, 3, 1, 'G');
    g.rect(4, 22 + (f ? 3 : 0), 5, 23 + (f ? 3 : 0), 'h').rect(27, 20 + (f ? 0 : 3), 28, 21 + (f ? 0 : 3), 'g');
  },
  spaghetti(g, f) {
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const a = i * 0.85 + (f ? 0.35 : 0);
      const r = 6 + (i % 4) * 2;
      pts.push([Math.round(15.5 + Math.cos(a) * r), Math.round(16 + Math.sin(a * 1.25) * r * 0.9)]);
    }
    for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i % 3 ? 's' : 'S');
    g.ellipse(15.5, 8, 5, 3, 't');
    g.set(13, 7, 'm').set(17, 8, 'm');
    eyes(g, 10, 14, f, { gap: 8 });
    g.line(13, 22, 18, 22, 'o');
  },
};

function build(key) {
  const [kind, f] = key.split(':');
  const g = new Grid(32, 32);
  BATTLE_BUGS[kind](g, Number(f));
  g.outline('o');
  return g.toRows();
}

let cache = null;
export function battleBug(kind, frame = 0) {
  if (!cache) cache = new SpriteCache(build, BATTLE_BUG_PAL);
  return cache.get(`${kind}:${frame}`);
}
export const buildBattleBugRows = build;
export const BATTLE_BUG_KINDS = Object.keys(BATTLE_BUGS);
