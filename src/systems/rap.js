// Batalla de rap contra MC Stack Overflow — docs/niveles/nivel_2_una.md
// Lógica pura: beat, ventana "en el beat", puntaje y barras de hype (Choco) y flow (Stack).
import { RAP } from '../config/balance.js';

export const ANSWER_KINDS = ['correct', 'weak', 'norhyme', 'cringe'];

export function createRap() {
  return { flow: RAP.FLOW, hype: RAP.HYPE, round: 0, score: 0, onBeat: 0, best: 0 };
}

export const beatLength = (bpm = RAP.BPM) => 60 / bpm;

// Información del beat en el tiempo `t` (segundos desde el primer beat).
// offset: distancia con signo al beat más cercano (negativo = antes del beat).
export function beatInfo(t, bpm = RAP.BPM) {
  const len = beatLength(bpm);
  const pos = t / len;
  const beat = Math.floor(pos);
  const phase = pos - beat; // 0..1 dentro del beat
  const nearest = Math.round(pos);
  return { beat, phase, nearest, offset: (pos - nearest) * len, bar: Math.floor(beat / RAP.BEATS_PER_BAR) };
}

export function isOnBeat(offset) {
  return Math.abs(offset) <= RAP.ON_BEAT_WINDOW;
}

// Mezcla (Fisher–Yates) con el rng recibido
export function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ronda de contenido que toca: las 3 del documento y, si Stack sigue con flow, las extra en ciclo.
export function roundContent(rounds, extras, index) {
  if (index < rounds.length) return rounds[index];
  return extras[(index - rounds.length) % extras.length];
}

// Juzga la respuesta elegida. kind: 'correct' | 'weak' | 'norhyme' | 'cringe' | 'none' (se acabó el tiempo)
export function judgeAnswer(rap, kind, onBeat = false) {
  const mult = onBeat ? 2 : 1;
  const out = { kind, onBeat, flowLoss: 0, hypeLoss: 0, points: 0 };
  if (kind === 'correct') {
    out.flowLoss = 1;
    out.points = RAP.SCORE_CORRECT * mult;
  } else if (kind === 'weak') {
    out.flowLoss = RAP.WEAK_FLOW;
    out.points = RAP.SCORE_WEAK * mult;
  } else {
    out.hypeLoss = 1;
  }
  rap.flow = Math.max(0, rap.flow - out.flowLoss);
  rap.hype = Math.max(0, rap.hype - out.hypeLoss);
  rap.score += out.points;
  if (onBeat && out.points > 0) rap.onBeat++;
  rap.round++;
  out.won = rap.flow <= 0;
  out.lost = rap.hype <= 0;
  return out;
}

// El ataque de desbordamiento entre rondas también puede dejar a Choco sin energía
export function rapLostByEnergy(energy) {
  return energy <= 0;
}
