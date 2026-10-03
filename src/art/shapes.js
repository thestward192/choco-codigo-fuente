// Primitivas pixeladas para dibujar en tiempo real sin antialias: polígonos (conos de visión),
// líneas gruesas (manecillas, láseres), anillos (ondas de ruido) y círculos.
// Todo se rasteriza con fillRect en coordenadas enteras.

// Polígono relleno por líneas de barrido (sirve para polígonos en estrella desde el origen,
// como los conos de visión).
export function fillPolygon(ctx, pts) {
  if (pts.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  minY = Math.round(minY);
  maxY = Math.round(maxY);
  const xs = [];
  for (let y = minY; y <= maxY; y++) {
    const sy = y + 0.5;
    xs.length = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i];
      const b = pts[j];
      if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) xs.push(a.x + ((sy - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.round(xs[k]);
      const x1 = Math.round(xs[k + 1]);
      if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
  }
}

// Línea de `w` px de grosor
export function thickLine(ctx, x0, y0, x1, y1, w = 1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d));
  const off = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * p) - off, Math.round(y0 + (y1 - y0) * p) - off, w, w);
  }
}

// Anillo de 1 px (ondas de ruido, alertas)
export function ring(ctx, cx, cy, r, step = 1) {
  if (r <= 0) return;
  const n = Math.max(8, Math.ceil(r * 6.3));
  for (let i = 0; i < n; i += step) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}

// Círculo relleno pixelado
export function fillCircle(ctx, cx, cy, r) {
  r = Math.round(r);
  if (r <= 0) return;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let y = -r; y <= r; y++) {
    const hw = Math.round(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
}

// Hexágono de contorno (burbuja del Escudo Firewall)
export function hexagon(ctx, cx, cy, r, rot = 0) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % 6];
    thickLine(ctx, ax, ay, bx, by, 1);
  }
}
