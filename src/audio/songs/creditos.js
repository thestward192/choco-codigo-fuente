// Créditos — popurrí alegre de todos los temas (docs/05_audio.md). Composición original: toma los
// primeros compases de cada canción del juego y los encadena a un mismo tempo, con un redoble al
// final de cada tramo. Empieza y termina con el tema de Choco.
import { SONG_TITULO } from './titulo.js';
import { SONG_CARTUCHO } from './cartucho.js';
import { SONG_UNA, SONG_BATTLE } from './una.js';
import { SONG_DEADLINE } from './novacomp.js';
import { SONG_SANTACRUZ } from './santacruz.js';
import { SONG_STACK } from './codigo.js';

const rep = (s, n) => Array(n).fill(s).join(' ');

// Los primeros `steps` pasos de una pista (cortando la última nota y rellenando con silencio).
// Respeta el `transpose` del canal de origen reescribiendo cada nota.
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
function shift(note, semis) {
  if (!semis) return note;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!m) return note;
  const midi = (Number(m[2]) + 1) * 12 + NAMES.indexOf(FLAT[m[1]] || m[1]) + semis;
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
export function sliceTrack(notes, steps, transpose = 0) {
  const out = [];
  let left = steps;
  for (const tok of notes.trim().split(/\s+/)) {
    if (left <= 0) break;
    const [n, d] = tok.split(':');
    const len = Math.min(d ? parseFloat(d) : 1, left);
    out.push(`${shift(n, transpose)}:${len}`);
    left -= len;
  }
  if (left > 0) out.push(`r:${left}`);
  return out.join(' ');
}

// Voces del popurrí: cada tramo dice qué canal de su canción suena en cada una
const ROLES = ['lead', 'marimba', 'harm', 'bass', 'drums'];

function part(song, steps, map) {
  return { song, steps, map };
}

// Cada tramo: la canción, cuántos pasos (16 = un compás de 4/4) y qué canal va en cada voz
const PARTS = [
  // El tema de Choco (sección A)
  part(SONG_TITULO, 64, { lead: 'lead', harm: 'arp', bass: 'bass', drums: 'drums' }),
  // Mundo Cartucho
  part(SONG_CARTUCHO, 64, { lead: 'lead', harm: 'arp', bass: 'bass', drums: 'drums' }),
  // La UNA y la batalla
  part(SONG_UNA, 32, { lead: 'lead', marimba: 'marimba', bass: 'bass', drums: 'drums' }),
  part(SONG_BATTLE, 32, { lead: 'lead', harm: 'arp', bass: 'bass', drums: 'drums' }),
  // Novacomp (DEADLINE)
  part(SONG_DEADLINE, 32, { lead: 'lead', harm: 'arp', bass: 'bass', drums: 'kick' }),
  // Santa Cruz (4 compases de 3/4)
  part(SONG_SANTACRUZ, 48, { marimba: 'marimba', harm: 'strum', bass: 'bass', drums: 'drums' }),
  // El Stack
  part(SONG_STACK, 32, { lead: 'lead', harm: 'arp', bass: 'bass', drums: 'drums' }),
];

// Redoble en el último tiempo de cada tramo, que empuja al siguiente
const FILL = 's:1 s:1 s:1 s:1';
const FILL_STEPS = 4;
// Cierre: el final de la sección B del tema de Choco, que lleva de vuelta al principio
const CODA_STEPS = 64;

function voice(role) {
  const out = [];
  for (const p of PARTS) {
    const id = p.map[role];
    const ch = id && p.song.channels.find((c) => c.id === id);
    if (role === 'drums') out.push(ch ? `${sliceTrack(ch.notes, p.steps - FILL_STEPS)} ${FILL}` : `r:${p.steps - FILL_STEPS} ${FILL}`);
    else out.push(ch ? sliceTrack(ch.notes, p.steps, ch.transpose || 0) : `r:${p.steps}`);
  }
  const ch = { lead: 'lead', harm: 'arp', bass: 'bass', drums: 'drums' }[role];
  const src = ch && SONG_TITULO.channels.find((c) => c.id === ch);
  out.push(src ? sliceTrack(src.notes.trim().split(/\s+/).slice(-countTokens(src.notes, CODA_STEPS)).join(' '), CODA_STEPS) : `r:${CODA_STEPS}`);
  return out.join(' ');
}

// Cuántos tokens del final de la pista suman `steps` pasos (para tomar la última sección)
function countTokens(notes, steps) {
  const toks = notes.trim().split(/\s+/);
  let sum = 0;
  let n = 0;
  for (let i = toks.length - 1; i >= 0 && sum < steps; i--, n++) sum += parseFloat(toks[i].split(':')[1] || 1);
  return n;
}

const INSTRUMENT = { lead: 'lead25', marimba: 'marimba', harm: 'arp', bass: 'bass', drums: 'drums' };
const VOLUME = { lead: 0.8, marimba: 0.85, harm: 0.65, bass: 0.9, drums: 0.8 };

const BPM = 144;
const TOTAL_STEPS = PARTS.reduce((t, p) => t + p.steps, 0) + CODA_STEPS;
// Duración de una vuelta completa (los créditos esperan a que termine)
export const CREDITS_SONG_SECONDS = (TOTAL_STEPS / 4) * (60 / BPM);

export const SONG_CREDITOS = {
  id: 'creditos',
  bpm: BPM,
  loop: true,
  channels: ROLES.map((r) => ({ id: r, instrument: INSTRUMENT[r], volume: VOLUME[r], notes: voice(r) })),
};
