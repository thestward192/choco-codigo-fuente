// Dibujo de texto con la fuente bitmap. Cada (estilo, color) se hornea una vez a un atlas.
import { GLYPHS, FONT_METRICS, boldGlyph, measureText, wrapText } from './fontData.js';
import { createCanvas } from '../core/renderer.js';
import { UI } from './palettes.js';

const ATLAS_TOP = 3; // espacio para acentos de mayúsculas
const CELL_H = 13;
const atlases = new Map();
let glyphOrder = null;

function buildAtlas(color, bold) {
  if (!glyphOrder) glyphOrder = Object.keys(GLYPHS);
  const map = new Map();
  let x = 0;
  const entries = glyphOrder.map((ch) => {
    const g = bold ? boldGlyph(GLYPHS[ch]) : GLYPHS[ch];
    const e = { g, x };
    x += g.w + 1;
    map.set(ch, e);
    return e;
  });
  const c = createCanvas(Math.max(1, x), CELL_H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  for (const e of entries) {
    e.g.rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '#') ctx.fillRect(e.x + i, y + e.g.top + ATLAS_TOP, 1, 1);
      }
    });
  }
  return { canvas: c, map };
}

function atlas(color, bold) {
  const key = `${color}|${bold ? 1 : 0}`;
  let a = atlases.get(key);
  if (!a) {
    a = buildAtlas(color, bold);
    atlases.set(key, a);
  }
  return a;
}

function drawRun(ctx, text, x, y, color, bold, scale) {
  const a = atlas(color, bold);
  let cx = x;
  for (const ch of text) {
    const e = a.map.get(ch) || a.map.get('?');
    const w = e.g.w;
    ctx.drawImage(a.canvas, e.x, 0, w, CELL_H, cx, y - ATLAS_TOP * scale, w * scale, CELL_H * scale);
    cx += (w + FONT_METRICS.spacing) * scale;
  }
}

// Dibuja texto. y = tope de las mayúsculas.
// opts: color, shadow (color o false), align ('left'|'center'|'right'), bold, scale, maxChars
export function drawText(ctx, text, x, y, opts = {}) {
  const { color = UI.text, shadow = UI.shadow, align = 'left', bold = false, scale = 1, maxChars = Infinity } = opts;
  let str = String(text);
  if (maxChars < Infinity) str = [...str].slice(0, maxChars).join('');
  const w = measureText(String(text), bold) * scale;
  let sx = x;
  if (align === 'center') sx = Math.round(x - w / 2);
  else if (align === 'right') sx = Math.round(x - w);
  sx = Math.round(sx);
  const sy = Math.round(y);
  if (shadow) drawRun(ctx, str, sx + scale, sy + scale, shadow, bold, scale);
  drawRun(ctx, str, sx, sy, color, bold, scale);
  return w;
}

// Texto multilínea con ajuste de ancho. Devuelve la altura usada.
export function drawTextBox(ctx, text, x, y, maxWidth, opts = {}) {
  const lines = wrapText(String(text), maxWidth / (opts.scale || 1), opts.bold);
  const lh = (opts.lineHeight || FONT_METRICS.lineHeight) * (opts.scale || 1);
  let remaining = opts.maxChars ?? Infinity;
  lines.forEach((line, i) => {
    if (remaining <= 0) return;
    drawText(ctx, line, x, y + i * lh, { ...opts, maxChars: remaining });
    remaining -= [...line].length + 1;
  });
  return lines.length * lh;
}

export { measureText, wrapText };
