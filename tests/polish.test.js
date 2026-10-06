import { describe, it, expect } from 'vitest';
import { parseTrack, trackLength } from '../src/core/audio.js';
import { SONG_TITULO } from '../src/audio/songs/titulo.js';
import { SONG_CUARTO } from '../src/audio/songs/cuarto.js';
import { SONG_CARGA } from '../src/audio/songs/carga.js';
import { SONG_NULL } from '../src/audio/songs/null.js';
import { SONG_CARTUCHO, SONG_CUEVAS, SONG_CASTILLO, SONG_GUARDIAN } from '../src/audio/songs/cartucho.js';
import { SONG_UNA, SONG_BATTLE, SONG_RAP } from '../src/audio/songs/una.js';
import { SONG_NOVACOMP, SONG_DEADLINE } from '../src/audio/songs/novacomp.js';
import { SONG_SANTACRUZ, SONG_TORITO, SONG_ATARDECER } from '../src/audio/songs/santacruz.js';
import { SONG_STACK, SONG_NULL_FINAL, SONG_FINAL } from '../src/audio/songs/codigo.js';
import { SONG_CREDITOS, CREDITS_SONG_SECONDS, sliceTrack } from '../src/audio/songs/creditos.js';
import { SFX } from '../src/audio/sfx.js';
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';

const SONGS = [
  SONG_TITULO, SONG_CUARTO, SONG_CARGA, SONG_NULL, SONG_CARTUCHO, SONG_CUEVAS, SONG_CASTILLO, SONG_GUARDIAN,
  SONG_UNA, SONG_BATTLE, SONG_RAP, SONG_NOVACOMP, SONG_DEADLINE, SONG_SANTACRUZ, SONG_TORITO, SONG_ATARDECER,
  SONG_STACK, SONG_NULL_FINAL, SONG_FINAL, SONG_CREDITOS,
];

describe('Música completa', () => {
  it('todas las canciones: notas válidas y canales que no se desfasan en el loop', () => {
    for (const song of SONGS) {
      const lens = song.channels.map((c) => {
        const t = parseTrack(c.notes);
        for (const n of t) if (n.note && !n.drum) expect(n.midi, `${song.id}/${c.id}: ${n.note}`).not.toBeNull();
        return trackLength(t);
      });
      const max = Math.max(...lens);
      for (const l of lens) expect(max % l, `${song.id}: ${lens.join(',')}`).toBe(0);
    }
  });

  it('el popurrí de los créditos: todas las voces duran exactamente lo mismo', () => {
    const lens = SONG_CREDITOS.channels.map((c) => trackLength(parseTrack(c.notes)));
    expect(new Set(lens).size).toBe(1);
    // Una vuelta dura lo que los créditos (con "Gracias por jugar" en pantalla): entre 30 y 45 s
    expect((lens[0] / 4) * (60 / SONG_CREDITOS.bpm)).toBeCloseTo(CREDITS_SONG_SECONDS, 5);
    expect(CREDITS_SONG_SECONDS).toBeGreaterThan(30);
    expect(CREDITS_SONG_SECONDS).toBeLessThan(45);
  });

  it('sliceTrack corta, rellena y transporta', () => {
    expect(sliceTrack('C5:4 D5:4 E5:4', 6)).toBe('C5:4 D5:2');
    expect(sliceTrack('C5:2', 4)).toBe('C5:2 r:2');
    expect(sliceTrack('C5:2 k:2', 4, 2)).toBe('D5:2 k:2');
    expect(sliceTrack('Bb4:4', 4, 1)).toBe('B4:4');
  });

  it('los efectos del documento de audio existen', () => {
    const needed = ['jump', 'doubleJump', 'land', 'stomp', 'shoot', 'chargeReady', 'shootCharged', 'enemyHit', 'enemyDie', 'hurt', 'melt', 'bit', 'goldenY', 'cacao', 'item', 'shieldOn', 'parry', 'lassoThrow', 'lassoHook', 'debugOn', 'debugOff', 'hackKey', 'hackOk', 'hackError', 'alert', 'alarm', 'bombetaThrow', 'bombetaBoom', 'sizzle', 'checkpoint', 'menuMove', 'menuConfirm', 'menuCancel'];
    for (const n of needed) expect(SFX[n], n).toBeTypeOf('function');
  });
});

// Pantallas de prueba con símbolos sueltos y frases cortadas a propósito con "—"
const SKIP = /^TEXTS\.(techTest|testRoom)/;
function strings(v, path, out) {
  if (typeof v === 'string') out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, `${path}.${k}`, out);
  return out;
}

describe('Textos', () => {
  const all = [...strings(TEXTS, 'TEXTS', []), ...strings(DIALOGUES, 'DIALOGUES', [])].filter(([p]) => !SKIP.test(p));

  it('cada pregunta y exclamación abre con ¿ y ¡', () => {
    for (const [p, s] of all) {
      const cut = s.endsWith('—') ? 1 : 0;
      const q = (s.match(/\?/g) || []).length;
      const iq = (s.match(/¿/g) || []).length;
      expect(q === iq || (cut && iq === q + 1), `${p}: ${s}`).toBe(true);
      expect((s.match(/!/g) || []).length, `${p}: ${s}`).toBe((s.match(/¡/g) || []).length);
    }
  });

  it('sin palabras comunes sin tilde', () => {
    const BAD = /(?<![\wáéíóúñ])(tambien|aqui|despues|ademas|todavia|cancion|opcion|musica|dificil|pagina|codigo|energia|bateria|camara|rapido|facil|mision|accion|exito|ultimo|ultima|numero|proximo|jamas|alla|aca)(?![\wáéíóúñ])/i;
    for (const [p, s] of all) expect(BAD.test(s), `${p}: ${s}`).toBe(false);
  });
});
