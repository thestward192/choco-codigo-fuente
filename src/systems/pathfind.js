// Búsqueda de caminos por tiles (BFS) para los BotSeg que persiguen o investigan.
// Lógica pura. passable(tx, ty) dice si un tile se puede caminar.

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Devuelve la lista de tiles desde el siguiente al inicio hasta la meta (inclusive),
// o null si no hay camino. Se mueve en 4 direcciones (los bots doblan en las esquinas).
export function findPath(passable, w, h, sx, sy, gx, gy, maxNodes = 4000) {
  if (sx === gx && sy === gy) return [];
  if (!passable(gx, gy)) return null;
  const key = (x, y) => y * w + x;
  const prev = new Map();
  prev.set(key(sx, sy), -1);
  const queue = [[sx, sy]];
  let head = 0;
  while (head < queue.length && prev.size < maxNodes) {
    const [x, y] = queue[head++];
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = key(nx, ny);
      if (prev.has(k) || !passable(nx, ny)) continue;
      prev.set(k, key(x, y));
      if (nx === gx && ny === gy) {
        const out = [];
        let c = k;
        while (c !== key(sx, sy)) {
          out.push({ tx: c % w, ty: Math.floor(c / w) });
          c = prev.get(c);
        }
        return out.reverse();
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}

// Tile caminable más cercano a (tx, ty) (por si la meta cae dentro de algo sólido).
export function nearestPassable(passable, w, h, tx, ty, radius = 3) {
  if (passable(tx, ty)) return { tx, ty };
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x >= 0 && y >= 0 && x < w && y < h && passable(x, y)) return { tx: x, ty: y };
      }
    }
  }
  return null;
}
