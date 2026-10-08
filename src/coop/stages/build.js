// Ayudas para construir mapas cooperativos como arreglos de strings (un carácter por tile).
// Ver la leyenda en src/coop/CoopStage.js.

export function grid(w, h, fill = '.') {
  const g = Array.from({ length: h }, () => Array(w).fill(fill));
  const api = {
    w,
    h,
    g,
    fill(x0, y0, x1, y1, ch) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = ch;
      return api;
    },
    put(x, y, ch) {
      if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = ch;
      return api;
    },
    // Paredes a los costados, techo y suelo desde la fila `ground`
    room(ground) {
      api.fill(0, 0, w - 1, 0, '#');
      api.fill(0, 0, 1, h - 1, '#');
      api.fill(w - 2, 0, w - 1, h - 1, '#');
      api.fill(2, ground, w - 3, h - 1, '#');
      return api;
    },
    rows() {
      return g.map((r) => r.join(''));
    },
  };
  return api;
}
