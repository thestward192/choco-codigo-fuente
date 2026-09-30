import { describe, it, expect } from 'vitest';
import { GLYPHS, measureText, wrapText } from '../src/art/fontData.js';
import { TEXTS } from '../src/data/dialogues.js';

const REQUIRED = 'áéíóúüñÁÉÍÓÚÜÑ¿¡{}[]()<>/\\_=;:!?.,\'"%#+-*∅✔';

function collectStrings(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => collectStrings(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => collectStrings(v, out));
  return out;
}

describe('Fuente bitmap', () => {
  it('incluye tildes, ñ y los símbolos del documento de arte', () => {
    for (const ch of REQUIRED) expect(GLYPHS[ch], `falta "${ch}"`).toBeDefined();
    for (let c = 65; c <= 90; c++) expect(GLYPHS[String.fromCharCode(c)]).toBeDefined();
    for (let c = 97; c <= 122; c++) expect(GLYPHS[String.fromCharCode(c)]).toBeDefined();
    for (let d = 0; d <= 9; d++) expect(GLYPHS[String(d)]).toBeDefined();
  });

  it('todos los glifos tienen filas del mismo ancho declarado', () => {
    for (const [ch, g] of Object.entries(GLYPHS)) {
      for (const r of g.rows) expect(r.length, `glifo "${ch}"`).toBeLessThanOrEqual(g.w);
    }
  });

  it('las mayúsculas con tilde llevan el acento arriba de la letra', () => {
    expect(GLYPHS['Á'].top).toBeLessThan(0);
    expect(GLYPHS['á'].top).toBe(0);
  });

  it('todos los textos del juego se pueden dibujar con la fuente', () => {
    const missing = new Set();
    for (const s of collectStrings(TEXTS)) for (const ch of s) if (!GLYPHS[ch]) missing.add(ch);
    expect([...missing]).toEqual([]);
  });

  it('mide y parte líneas', () => {
    expect(measureText('')).toBe(0);
    expect(measureText('A')).toBe(5);
    expect(measureText('AA')).toBe(11);
    const lines = wrapText('uno dos tres cuatro cinco', 40);
    for (const l of lines) expect(measureText(l)).toBeLessThanOrEqual(40);
    expect(lines.join(' ')).toBe('uno dos tres cuatro cinco');
  });
});
