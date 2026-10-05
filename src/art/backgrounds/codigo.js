// Fondo del Código Puro (docs/niveles/nivel_5_codigo_puro.md): no hay paisaje, solo código.
// 1) negro profundo a morado, 2) columnas de código que se escriben y se borran (parallax 0.3),
// 3) llaves y corchetes flotando (0.6). glitch (0..1) sube con la altura: de código ordenado a
// código cada vez más roto (franjas desplazadas, bloques magenta).
// El código del fondo es decorativo (no es texto del juego para leer).
import { createCanvas } from '../../core/renderer.js';
import { SCREEN } from '../../config/balance.js';
import { drawText } from '../font.js';
import { fxRng } from '../../core/rng.js';

const W = SCREEN.W;
const H = SCREEN.H;
const LINE_H = 9;

const CODE = [
  'function choco() {',
  '  const barra = [nucleo];',
  '  for (const f of fundadores) {',
  '    barra.push(f);',
  '  }',
  '  return barra;',
  '}',
  'if (nucleo === undefined) {',
  '  // TODO: arreglar null',
  '}',
  'while (true) { esperar(); }',
  'stack.push(frame);',
  'firewall.allow(choco);',
  'const memoria = new Fantasma();',
  'puntero = puntero.next;',
  'overflow += datos.length;',
  'try { compilar(); }',
  'catch (e) { /* después */ }',
  'export default nulo;',
  '/tmp/null.log: 1 línea',
  'git commit -m "wip"',
  'return esperanza;',
];

let strip = null;
function codeStrip() {
  if (strip) return strip;
  const rows = 40;
  strip = createCanvas(W, rows * LINE_H);
  const c = strip.getContext('2d');
  for (let i = 0; i < rows; i++) {
    const line = CODE[(i * 7) % CODE.length];
    const x = 6 + ((i * 37) % 120);
    drawText(c, line, x, i * LINE_H, { color: i % 5 === 0 ? '#2A1446' : '#1A0E30', shadow: false });
  }
  return strip;
}

const hash = (x, s = 0) => {
  let h = (x * 374761393 + s * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// glitch: 0..1 · t: tiempo
export function drawCodeBg(ctx, camX, camY, t, glitch = 0) {
  // Degradé en franjas
  const bands = ['#07050D', '#09060F', '#0B0713', '#0E0918', '#110A1E', '#140B24'];
  const bh = Math.ceil(H / bands.length);
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bh, W, bh);
  });
  // Código que baja con parallax
  const s = codeStrip();
  const oy = -((((camY * 0.3 + t * 4) % s.height) + s.height) % s.height);
  for (let y = oy; y < H; y += s.height) ctx.drawImage(s, 0, Math.round(y));
  // Una línea que se escribe y se borra
  const cyc = t % 6;
  const line = CODE[Math.floor(t / 6) % CODE.length];
  const n = cyc < 3 ? Math.floor((cyc / 3) * line.length) : Math.max(0, Math.floor(((5 - cyc) / 2) * line.length));
  const ly = Math.round(((Math.floor(t / 6) * 53) % (H - 30)) + 10);
  drawText(ctx, line.slice(0, n), 160, ly, { color: '#2E5A7A', shadow: false });
  if (Math.floor(t * 3) % 2) {
    ctx.fillStyle = '#43D9FF';
    ctx.fillRect(160 + n * 5, ly, 4, 7);
  }
  // Llaves y corchetes flotando
  const glyphs = ['{', '}', '[', ']', '<', '>', ';', '∅'];
  for (let i = 0; i < 14; i++) {
    const gx = (hash(i, 1) * W + t * (3 + (i % 3))) % (W + 20) - 10;
    const gy = ((((hash(i, 2) * 400 - camY * 0.6) % (H + 20)) + H + 20) % (H + 20)) - 10;
    const magenta = glyphs[i % glyphs.length] === '∅';
    drawText(ctx, glyphs[i % glyphs.length], Math.round(gx), Math.round(gy), { color: magenta ? '#4A1838' : i % 2 ? '#1E3A52' : '#2A1446', shadow: false });
  }
  if (glitch > 0) drawGlitchBands(ctx, t, glitch);
}

// Franjas desplazadas y bloques de píxeles: más con más glitch
export function drawGlitchBands(ctx, t, glitch) {
  const f = Math.floor(t * 12);
  for (let i = 0; i < Math.round(glitch * 6); i++) {
    if (hash(f + i * 13, 3) > 0.35 + glitch * 0.3) continue;
    const y = Math.floor(hash(f + i, 4) * H);
    const h = 1 + Math.floor(hash(f + i, 5) * 3);
    const dx = Math.round((hash(f + i, 6) - 0.5) * 16 * glitch);
    ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
  }
  for (let i = 0; i < Math.round(glitch * 5); i++) {
    if (!fxRng.chance(0.25 * glitch)) continue;
    ctx.fillStyle = fxRng.pick(['#FF2E88', '#43D9FF', '#2A1446']);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(fxRng.int(0, W - 20), fxRng.int(0, H - 4), fxRng.int(4, 30), fxRng.int(1, 3));
    ctx.globalAlpha = 1;
  }
}
