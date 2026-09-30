import { describe, it, expect } from 'vitest';
import { ANIMS, buildFrameRows, frameKey, buildMeltRows, FRAME_W, FRAME_H, PALETTE } from '../src/art/choco.js';
import { stamp, compose, flipRows, recolor } from '../src/art/bake.js';
import { parseTrack, trackLength, noteToMidi } from '../src/core/audio.js';
import { SONG_PRUEBA } from '../src/audio/songs/prueba.js';

describe('Composición de sprites', () => {
  it('stamp no sobrescribe con transparentes', () => {
    expect(stamp(['....'], ['.a.b'], 0, 0)).toEqual(['.a.b']);
    expect(stamp(['xxxx'], ['.a..'], 1, 0)).toEqual(['xxax']);
  });
  it('compose, flip y recolor', () => {
    expect(compose(3, 1, [{ rows: ['a'], x: 2, y: 0 }])).toEqual(['..a']);
    expect(flipRows(['ab.'])).toEqual(['.ba']);
    expect(recolor(['ab'], { a: 'c' })).toEqual(['cb']);
  });
});

describe('Sprites de Choco', () => {
  it('cada frame de cada animación mide 36×28 y usa solo colores de la paleta', () => {
    for (const [name, anim] of Object.entries(ANIMS)) {
      for (const f of anim.frames) {
        const rows = buildFrameRows(frameKey(f, 'normal', true));
        expect(rows.length, name).toBe(FRAME_H);
        for (const r of rows) {
          expect(r.length, name).toBe(FRAME_W);
          for (const ch of r) if (ch !== '.') expect(PALETTE[ch], `${name}: "${ch}"`).toBeDefined();
        }
      }
    }
  });

  it('las animaciones tienen la cantidad de frames del documento de personajes', () => {
    const expected = { idle: 4, run: 6, skid: 2, jump: 2, fall: 2, land: 2, shoot: 3, charge: 4, hurt: 2, victory: 6, spin: 4 };
    for (const [k, n] of Object.entries(expected)) expect(ANIMS[k].frames.length, k).toBe(n);
  });

  it('los pies de Choco quedan en la última fila (anclaje)', () => {
    const rows = buildFrameRows(frameKey(ANIMS.idle.frames[0], 'normal', true));
    expect(rows[FRAME_H - 1].replace(/\./g, '').length).toBeGreaterThan(0);
  });

  it('derretirse: 8 frames que terminan en un charco con la envoltura encima', () => {
    for (let k = 0; k < 8; k++) expect(buildMeltRows(k).length).toBe(FRAME_H);
    const last = buildMeltRows(7);
    expect(last[FRAME_H - 1]).toMatch(/b{10,}/);
    expect(last.slice(-4).join('')).toMatch(/w/);
  });
});

describe('Secuenciador de música', () => {
  it('parsea notas, silencios y percusión', () => {
    const t = parseTrack('C4:4 r:2 k:1 A#3:1');
    expect(t.map((n) => n.steps)).toEqual([4, 2, 1, 1]);
    expect(t[0].midi).toBe(60);
    expect(t[1].midi).toBeNull();
    expect(t[2].drum).toBe(true);
    expect(t[3].midi).toBe(noteToMidi('A#3'));
  });
  it('todas las pistas de la canción de prueba miden lo mismo (8 compases)', () => {
    for (const ch of SONG_PRUEBA.channels) expect(trackLength(parseTrack(ch.notes)), ch.id).toBe(128);
  });
});
