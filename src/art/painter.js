// Pintor de grillas: dibuja con primitivas sobre una grilla de caracteres y devuelve
// el mismo formato de arreglo de strings que usa el horneador. Lógica pura.

export class Grid {
  constructor(w, h, fill = '.') {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill(fill));
  }

  static from(rows) {
    const g = new Grid(Math.max(...rows.map((r) => r.length)), rows.length);
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) g.cells[y][x] = r[x];
    });
    return g;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '.';
    return this.cells[y][x];
  }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.cells[y][x] = c;
    return this;
  }

  // Lista de puntos [[x, y], ...]
  pts(list, c) {
    for (const [x, y] of list) this.set(x, y, c);
    return this;
  }

  rect(x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
    return this;
  }

  // Borde de un rectángulo
  frame(x0, y0, x1, y1, c) {
    this.hline(x0, x1, y0, c).hline(x0, x1, y1, c).vline(x0, y0, y1, c).vline(x1, y0, y1, c);
    return this;
  }

  hline(x0, x1, y, c) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }

  vline(x, y0, y1, c) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }

  // Línea de Bresenham
  line(x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  // Elipse rellena
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / (rx + 0.35);
        const ny = (y - cy) / (ry + 0.35);
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  // Estampa filas de texto (los '.' no pintan)
  stamp(rows, ox, oy) {
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) if (r[x] !== '.' && r[x] !== ' ') this.set(ox + x, oy + y, r[x]);
    });
    return this;
  }

  // Reemplaza un color por otro dentro de un área (o en toda la grilla)
  replace(from, to, x0 = 0, y0 = 0, x1 = this.w - 1, y1 = this.h - 1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.get(x, y) === from) this.set(x, y, to);
    return this;
  }

  // Contorno de 1 px con `c` alrededor de todo lo pintado
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x] !== '.') continue;
        if (this.get(x - 1, y) !== '.' || this.get(x + 1, y) !== '.' || this.get(x, y - 1) !== '.' || this.get(x, y + 1) !== '.') add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.cells[y][x] = c;
    return this;
  }

  toRows() {
    return this.cells.map((r) => r.join(''));
  }
}
