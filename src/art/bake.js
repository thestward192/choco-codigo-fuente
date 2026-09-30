// Horneador: convierte sprites definidos como arreglos de strings en canvas (una sola vez).
// Cada carácter es un índice de paleta; '.' y ' ' son transparentes.

import { createCanvas } from '../core/renderer.js';

// ---------- Operaciones puras sobre grillas de strings (testeables sin canvas) ----------

export function blankGrid(w, h) {
  return Array.from({ length: h }, () => '.'.repeat(w));
}

// Estampa `part` sobre `grid` en (ox, oy). Los '.' del part no sobrescriben.
export function stamp(grid, part, ox = 0, oy = 0) {
  const out = grid.map((r) => r.split(''));
  part.forEach((row, y) => {
    const gy = y + oy;
    if (gy < 0 || gy >= out.length) return;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const gx = x + ox;
      if (gx < 0 || gx >= out[gy].length) continue;
      out[gy][gx] = ch;
    }
  });
  return out.map((r) => r.join(''));
}

// Compone capas {rows, x, y} sobre una grilla vacía de w×h.
export function compose(w, h, layers) {
  let g = blankGrid(w, h);
  for (const l of layers) if (l && l.rows) g = stamp(g, l.rows, l.x || 0, l.y || 0);
  return g;
}

export function flipRows(rows) {
  return rows.map((r) => r.split('').reverse().join(''));
}

// Reemplaza caracteres según un mapa {a: 'b'}.
export function recolor(rows, map) {
  return rows.map((r) =>
    r
      .split('')
      .map((c) => (map[c] !== undefined ? map[c] : c))
      .join(''),
  );
}

export function gridSize(rows) {
  return { w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

// ---------- Horneado a canvas ----------

export function bake(rows, palette) {
  const { w, h } = gridSize(rows);
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// Silueta de un color (flash blanco de daño, sombras, tintes).
export function silhouette(src, color = '#ffffff') {
  const c = createCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

export function flipCanvas(src) {
  const c = createCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

// Contorno de 1 px alrededor de un sprite (para resaltar objetos seleccionados).
export function outline(src, color) {
  const c = createCanvas(src.width + 2, src.height + 2);
  const ctx = c.getContext('2d');
  const sil = silhouette(src, color);
  for (const [dx, dy] of [
    [0, 1],
    [2, 1],
    [1, 0],
    [1, 2],
  ])
    ctx.drawImage(sil, dx, dy);
  ctx.drawImage(src, 1, 1);
  return c;
}

// Sprite horneado con variantes: normal, volteado y flash blanco (y su volteado).
export class Sprite {
  constructor(rows, palette) {
    this.rows = rows;
    this.normal = bake(rows, palette);
    this.w = this.normal.width;
    this.h = this.normal.height;
    this._flipped = null;
    this._white = null;
    this._whiteFlipped = null;
  }
  get flipped() {
    return (this._flipped ||= flipCanvas(this.normal));
  }
  get white() {
    return (this._white ||= silhouette(this.normal, '#ffffff'));
  }
  get whiteFlipped() {
    return (this._whiteFlipped ||= flipCanvas(this.white));
  }
  get(flip = false, white = false) {
    if (white) return flip ? this.whiteFlipped : this.white;
    return flip ? this.flipped : this.normal;
  }
  // Silueta de un color arbitrario (brillo de cobertura, sombras), cacheada.
  tint(color, flip = false) {
    this._tints ||= new Map();
    const key = `${color}|${flip}`;
    let c = this._tints.get(key);
    if (!c) {
      c = silhouette(flip ? this.flipped : this.normal, color);
      this._tints.set(key, c);
    }
    return c;
  }
}

// Caché de sprites compuestos bajo demanda (cada combinación se hornea una vez).
export class SpriteCache {
  constructor(builder, palette) {
    this.builder = builder; // key → rows
    this.palette = palette;
    this.map = new Map();
  }
  get(key) {
    let s = this.map.get(key);
    if (!s) {
      s = new Sprite(this.builder(key), this.palette);
      this.map.set(key, s);
    }
    return s;
  }
}
