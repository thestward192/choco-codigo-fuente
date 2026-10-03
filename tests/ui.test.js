import { describe, it, expect } from 'vitest';
import { assignKey, DEFAULT_KEYS, REMAPPABLE } from '../src/config/controls.js';
import { Typewriter } from '../src/systems/typewriter.js';
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';
import { wrapText, measureText, GLYPHS } from '../src/art/fontData.js';
import { buildPortraitRows, PORTRAIT_PAL, EXPRESSIONS } from '../src/art/portraits.js';
import { TEXT } from '../src/config/balance.js';

describe('Reasignar controles', () => {
  it('asigna una tecla libre', () => {
    const { keys, swappedWith } = assignKey(DEFAULT_KEYS, 'jump', 1, 'KeyM');
    expect(keys.jump).toEqual(['Space', 'KeyM']);
    expect(swappedWith).toBeNull();
    expect(DEFAULT_KEYS.jump).toEqual(['Space', 'KeyZ']); // no muta el original
  });

  it('si la tecla ya se usa, intercambia con la otra acción', () => {
    const { keys, swappedWith } = assignKey(DEFAULT_KEYS, 'jump', 0, 'KeyX');
    expect(swappedWith).toBe('shoot');
    expect(keys.jump[0]).toBe('KeyX');
    expect(keys.shoot).toContain('Space');
    expect(keys.shoot).not.toContain('KeyX');
  });

  it('ninguna tecla queda repetida entre acciones reasignables', () => {
    let keys = DEFAULT_KEYS;
    for (const code of ['KeyX', 'KeyC', 'Space', 'ArrowUp', 'KeyQ']) keys = assignKey(keys, 'jump', 0, code).keys;
    const seen = new Map();
    for (const a of REMAPPABLE) {
      for (const k of keys[a]) {
        expect(seen.has(k), `${k} en ${a} y ${seen.get(k)}`).toBe(false);
        seen.set(k, a);
      }
    }
  });
});

describe('Máquina de escribir', () => {
  it('revela a la velocidad configurada y pausa en comas y puntos', () => {
    const tw = new Typewriter('Hola, mae.', 'normal');
    const dt = 1 / 60;
    let t = 0;
    while (!tw.done && t < 5) {
      tw.update(dt);
      t += dt;
    }
    const base = 10 / TEXT.CHARS_PER_SECOND.normal;
    expect(t).toBeGreaterThan(base + TEXT.PAUSE_COMMA - 0.05);
    expect(t).toBeLessThan(base + TEXT.PAUSE_COMMA + TEXT.PAUSE_PERIOD + 0.2);
  });

  it('instantánea y completar', () => {
    expect(new Typewriter('abc', 'instant').done).toBe(true);
    const tw = new Typewriter('abcdef', 'slow');
    tw.update(0.05);
    expect(tw.done).toBe(false);
    tw.complete();
    expect(tw.shown).toBe(6);
  });
});

function collectStrings(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => collectStrings(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => collectStrings(v, out));
  return out;
}

describe('Textos', () => {
  it('todos los diálogos usan caracteres de la fuente', () => {
    const missing = new Set();
    for (const s of collectStrings(DIALOGUES)) for (const ch of s) if (!GLYPHS[ch]) missing.add(ch);
    expect([...missing]).toEqual([]);
  });

  it('cada intervención cabe en 2 líneas de la caja de diálogo', () => {
    const width = 312 - 54; // ancho útil del texto en la caja
    for (const [id, lines] of Object.entries(DIALOGUES)) {
      for (const l of lines) expect(wrapText(l.text, width).length, `${id}: "${l.text}"`).toBeLessThanOrEqual(2);
    }
  });

  it('las rimas de Stward y los nombres de nivel caben en pantalla', () => {
    for (const lines of Object.values(TEXTS.stwardRaps)) for (const l of lines) expect(measureText(l)).toBeLessThanOrEqual(236);
    // La tarjeta usa escala 3, o 2 para los nombres largos
    for (const l of Object.values(TEXTS.levels)) expect(measureText(l.name.toUpperCase(), true) * 2).toBeLessThanOrEqual(310);
  });
});

describe('Retratos', () => {
  it('todos los personajes y expresiones miden 32×32 y usan la paleta', () => {
    for (const who of ['choco', 'null', 'oscar', 'stward', 'hezron', 'fabiola', 'system', 'profe', 'student', 'senora', 'stack']) {
      for (const face of EXPRESSIONS) {
        const rows = buildPortraitRows(`${who}:${face}`);
        expect(rows.length).toBe(32);
        for (const r of rows) {
          expect(r.length).toBe(32);
          for (const ch of r) if (ch !== '.') expect(PORTRAIT_PAL[ch], `${who}:${face} "${ch}"`).toBeDefined();
        }
      }
    }
  });
});
