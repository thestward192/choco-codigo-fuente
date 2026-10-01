// Constructor de mapas por código: arma el arreglo de strings de un tilemap con operaciones
// legibles (suelo, huecos, plataformas, bloques) en lugar de escribir cada fila a mano.
// Lógica pura (se usa en las pruebas para validar los mapas).

export class MapBuilder {
  constructor(w, h, fill = '.') {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill(fill));
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    return this.inBounds(x, y) ? this.cells[y][x] : '.';
  }

  set(x, y, ch) {
    if (this.inBounds(x, y)) this.cells[y][x] = ch;
    return this;
  }

  // Rectángulo relleno (inclusivo)
  fill(x0, y0, x1, y1, ch) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, ch);
    return this;
  }

  // Suelo desde la fila `top` hasta abajo, entre x0 y x1
  ground(x0, x1, top, ch = '#') {
    return this.fill(x0, top, x1, this.h - 1, ch);
  }

  // Techo desde arriba hasta la fila `bottom`
  ceiling(x0, x1, bottom, ch = '#') {
    return this.fill(x0, 0, x1, bottom, ch);
  }

  // Hueco: vacía columnas completas (desde `from` hacia abajo)
  gap(x0, x1, from = 0) {
    return this.fill(x0, from, x1, this.h - 1, '.');
  }

  hline(x0, x1, y, ch) {
    return this.fill(x0, y, x1, y, ch);
  }

  vline(x, y0, y1, ch) {
    return this.fill(x, y0, x, y1, ch);
  }

  // Escribe una cadena horizontal desde (x, y); los espacios no pintan
  text(x, y, str) {
    [...str].forEach((ch, i) => ch !== ' ' && this.set(x + i, y, ch));
    return this;
  }

  // Tubería de datos de `height` tiles con la boca arriba en (x, top): ocupa x y x+1
  pipe(x, top, height) {
    this.set(x, top, '{').set(x + 1, top, '}');
    for (let y = top + 1; y < top + height; y++) this.set(x, y, '[').set(x + 1, y, ']');
    return this;
  }

  toRows() {
    return this.cells.map((r) => r.join(''));
  }
}
