// Motor de audio con Web Audio: buses (maestro, música, efectos, voces), ondas de pulso
// con ancho variable, ruido, efectos sintetizados y un secuenciador por patrones con capas.
import { AUDIO } from '../config/balance.js';
import { fxRng } from './rng.js';

const NOTE_INDEX = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };

// "C#5" → número MIDI. null si no es una nota.
export function noteToMidi(name) {
  const m = /^([a-gA-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  const key = (m[1].toLowerCase() + m[2]).toLowerCase();
  const idx = NOTE_INDEX[key];
  if (idx === undefined) return null;
  return (parseInt(m[3], 10) + 1) * 12 + idx;
}

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Parsea una pista: "C5:2 E5:2 r:4 k:1" → [{note, midi, steps}]
// Duración en semicorcheas (1 = 1/16). "r" = silencio. Percusión: k, s, h, o (hat abierto).
export function parseTrack(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [n, d] = tok.split(':');
    const steps = d ? parseFloat(d) : 1;
    if (n === 'r' || n === '-') out.push({ note: null, midi: null, steps });
    else if (['k', 's', 'h', 'o'].includes(n)) out.push({ note: n, midi: null, steps, drum: true });
    else out.push({ note: n, midi: noteToMidi(n), steps });
  }
  return out;
}

export function trackLength(track) {
  return track.reduce((s, n) => s + n.steps, 0);
}

// Coeficientes de Fourier de una onda de pulso con ciclo de trabajo `duty`.
function pulseWave(ctx, duty, harmonics = 48) {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    real[n] = (2 * Math.sin(Math.PI * n * duty)) / (Math.PI * n);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

// Instrumentos: envolvente y onda.
export const INSTRUMENTS = {
  lead: { wave: 'pulse50', attack: 0.005, decay: 0.12, sustain: 0.55, release: 0.05, vol: 0.16 },
  lead25: { wave: 'pulse25', attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.05, vol: 0.15 },
  arp: { wave: 'pulse12', attack: 0.002, decay: 0.08, sustain: 0.25, release: 0.03, vol: 0.1 },
  bass: { wave: 'triangle', attack: 0.004, decay: 0.05, sustain: 0.9, release: 0.03, vol: 0.32 },
  marimba: { wave: 'triangle', attack: 0.002, decay: 0.22, sustain: 0.0, release: 0.02, vol: 0.28, octaveSine: true },
  pad: { wave: 'pulse25', attack: 0.08, decay: 0.3, sustain: 0.4, release: 0.3, vol: 0.07 },
  drums: { wave: 'noise', vol: 0.3 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.volumes = { master: 8, music: 7, sfx: 8, voice: 7 };
    this.player = null;
    this.fadingPlayers = [];
    this.loops = new Set();
    this.timer = null;
  }

  // Debe llamarse desde un gesto del usuario (requisito del navegador).
  unlock() {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (err) {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.buses = {};
    for (const b of ['music', 'sfx', 'voice']) {
      this.buses[b] = c.createGain();
      this.buses[b].connect(this.master);
    }
    this.waves = {
      pulse50: pulseWave(c, 0.5),
      pulse25: pulseWave(c, 0.25),
      pulse12: pulseWave(c, 0.125),
    };
    // Buffer de ruido blanco reutilizable
    const len = c.sampleRate;
    this.noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.unlocked = true;
    this.applyVolumes();
    if (c.state === 'suspended') c.resume();
    this.timer = setInterval(() => this._tick(), AUDIO.SCHEDULER_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setVolumes(v) {
    this.volumes = { ...this.volumes, ...v };
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const curve = (x) => Math.pow(x / 10, 1.6); // percepción más natural
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(curve(this.volumes.master), t, 0.02);
    this.buses.music.gain.setTargetAtTime(curve(this.volumes.music) * (this.ducked ? 0.35 : 1), t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(curve(this.volumes.sfx), t, 0.02);
    this.buses.voice.gain.setTargetAtTime(curve(this.volumes.voice), t, 0.02);
  }

  // Baja la música (pausa, diálogos importantes)
  duck(on) {
    this.ducked = on;
    this.applyVolumes();
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _osc(wave) {
    const o = this.ctx.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
    else o.type = wave;
    return o;
  }

  // ---------- Primitivas de efectos ----------

  // Tono con barrido de frecuencia y envolvente.
  tone({ wave = 'pulse50', f0 = 440, f1 = null, dur = 0.1, vol = 0.3, attack = 0.003, at = 0, bus = 'sfx', curve = 'exp', vibrato = 0, dest = null }) {
    if (!this.ctx) return null;
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = this._osc(wave);
    const g = c.createGain();
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== null) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      else o.frequency.linearRampToValueAtTime(f1, t + dur);
    }
    if (vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 12;
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || this.buses[bus]);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  // Ráfaga de ruido filtrado.
  noise({ dur = 0.1, vol = 0.3, type = 'lowpass', freq = 2000, freq1 = null, q = 1, at = 0, bus = 'sfx', attack = 0.002, dest = null }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freq1 !== null) f.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest || this.buses[bus]);
    src.start(t, fxRng.next() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // Variación aleatoria de tono (±5 %) para efectos repetitivos.
  vary(f) {
    return f * (1 + (fxRng.next() * 2 - 1) * AUDIO.PITCH_VARIATION);
  }

  // Sonido sostenido (por ejemplo, la carga del báculo). Devuelve {update(p), stop()}.
  sustained({ wave = 'pulse25', f0 = 200, vol = 0.12, bus = 'sfx' }) {
    if (!this.ctx) return { update() {}, stop() {} };
    const c = this.ctx;
    const o = this._osc(wave);
    const g = c.createGain();
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 0;
    lg.gain.value = 0;
    lfo.connect(lg).connect(o.frequency);
    o.frequency.value = f0;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.05);
    o.connect(g).connect(this.buses[bus]);
    o.start();
    lfo.start();
    const handle = {
      update: (freq, wobble = 0) => {
        const t = c.currentTime;
        o.frequency.setTargetAtTime(freq, t, 0.03);
        lfo.frequency.setTargetAtTime(wobble ? 14 : 0, t, 0.02);
        lg.gain.setTargetAtTime(wobble, t, 0.02);
      },
      stop: () => {
        const t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        o.stop(t + 0.08);
        lfo.stop(t + 0.08);
        this.loops.delete(handle);
      },
    };
    this.loops.add(handle);
    return handle;
  }

  stopAllSustained() {
    for (const h of [...this.loops]) h.stop();
  }

  // Bip de diálogo por letra (voces).
  blip(freq = 600, glitch = false) {
    if (!this.ctx) return;
    if (glitch) {
      this.tone({ wave: 'pulse12', f0: this.vary(freq) * (fxRng.chance(0.3) ? 2 : 1), f1: freq * 0.5, dur: 0.045, vol: 0.09, bus: 'voice' });
    } else {
      this.tone({ wave: 'pulse25', f0: this.vary(freq), dur: 0.04, vol: 0.08, bus: 'voice' });
    }
  }

  // ---------- Música ----------

  playSong(song, { fade = AUDIO.MUSIC_FADE, layers = null } = {}) {
    if (!this.ctx) {
      this.pendingSong = { song, layers };
      return;
    }
    if (this.player && this.player.song === song) return;
    if (this.player) this.player.stop(fade);
    this.player = new SongPlayer(this, song, layers);
    this.player.start(fade);
  }

  stopMusic(fade = AUDIO.MUSIC_FADE) {
    if (this.player) this.player.stop(fade);
    this.player = null;
  }

  setLayer(name, on, time = 0.4) {
    if (this.player) this.player.setLayer(name, on, time);
  }

  _tick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.pendingSong) {
      const p = this.pendingSong;
      this.pendingSong = null;
      this.playSong(p.song, { layers: p.layers });
    }
    if (this.player) this.player.schedule();
    this.fadingPlayers = this.fadingPlayers.filter((p) => !p.done);
    for (const p of this.fadingPlayers) p.schedule();
  }
}

// Reproductor de una canción definida como datos.
class SongPlayer {
  constructor(engine, song, layers) {
    this.engine = engine;
    this.song = song;
    const c = engine.ctx;
    this.out = c.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(engine.buses.music);
    this.stepDur = 60 / song.bpm / 4; // semicorchea
    this.layerGains = {};
    this.channels = song.channels.map((ch) => {
      const layer = ch.layer || 'base';
      if (!this.layerGains[layer]) {
        const g = c.createGain();
        const on = layer === 'base' || (layers ? layers.includes(layer) : !!song.layersOn?.includes(layer));
        g.gain.value = on ? 1 : 0.0001;
        g.connect(this.out);
        this.layerGains[layer] = g;
      }
      return {
        def: ch,
        track: parseTrack(ch.notes),
        inst: INSTRUMENTS[ch.instrument] || INSTRUMENTS.lead,
        idx: 0,
        next: 0,
        dest: this.layerGains[layer],
        vol: ch.volume ?? 1,
      };
    });
    this.done = false;
    this.stopping = false;
  }

  start(fade) {
    const c = this.engine.ctx;
    const t0 = c.currentTime + 0.05;
    for (const ch of this.channels) ch.next = t0;
    this.out.gain.setValueAtTime(0.0001, c.currentTime);
    this.out.gain.exponentialRampToValueAtTime(1, c.currentTime + Math.max(0.01, fade));
    this.schedule();
  }

  stop(fade) {
    const c = this.engine.ctx;
    const t = c.currentTime;
    this.stopping = true;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
    this.out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, fade));
    this.engine.fadingPlayers.push(this);
    setTimeout(() => {
      this.done = true;
      this.out.disconnect();
    }, (fade + 0.3) * 1000);
  }

  setLayer(name, on, time) {
    const g = this.layerGains[name];
    if (!g) return;
    const t = this.engine.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(on ? 1 : 0.0001, t + time);
  }

  schedule() {
    if (this.done) return;
    const c = this.engine.ctx;
    const horizon = c.currentTime + AUDIO.SCHEDULE_AHEAD;
    for (const ch of this.channels) {
      if (ch.track.length === 0) continue;
      // Si la pestaña estuvo congelada, no intentar recuperar notas viejas.
      if (ch.next < c.currentTime - 0.25) ch.next = c.currentTime + 0.02;
      while (ch.next < horizon) {
        const n = ch.track[ch.idx];
        const dur = n.steps * this.stepDur;
        if (n.drum) this.playDrum(n.note, ch.next, ch);
        else if (n.midi !== null) this.playNote(n.midi, ch.next, dur, ch);
        ch.next += dur;
        ch.idx++;
        if (ch.idx >= ch.track.length) {
          if (this.song.loop === false) {
            ch.track = [];
            break;
          }
          ch.idx = 0;
        }
      }
    }
  }

  playNote(midi, t, dur, ch) {
    const c = this.engine.ctx;
    const inst = ch.inst;
    const freq = midiToFreq(midi + (ch.def.transpose || 0));
    const o = this.engine._osc(inst.wave);
    o.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    const peak = inst.vol * ch.vol;
    const gate = Math.max(0.03, dur * (ch.def.gate ?? 0.9));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + inst.attack);
    const sus = Math.max(0.0001, peak * inst.sustain);
    g.gain.exponentialRampToValueAtTime(sus, t + inst.attack + inst.decay);
    g.gain.setValueAtTime(sus, t + Math.max(gate, inst.attack + inst.decay));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(gate, inst.attack + inst.decay) + inst.release);
    o.connect(g).connect(ch.dest);
    o.start(t);
    o.stop(t + gate + inst.decay + inst.release + 0.05);
    if (inst.octaveSine) {
      const o2 = c.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(freq * 4, t);
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(peak * 0.25, t + 0.002);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o2.connect(g2).connect(ch.dest);
      o2.start(t);
      o2.stop(t + 0.08);
    }
  }

  playDrum(kind, t, ch) {
    const e = this.engine;
    const c = e.ctx;
    const v = (ch.inst.vol ?? 0.3) * ch.vol;
    const at = t - c.currentTime;
    if (kind === 'k') {
      e.tone({ wave: 'sine', f0: 150, f1: 42, dur: 0.16, vol: v * 1.6, at, dest: ch.dest });
      e.noise({ dur: 0.02, vol: v * 0.5, type: 'lowpass', freq: 1200, at, dest: ch.dest });
    } else if (kind === 's') {
      e.noise({ dur: 0.13, vol: v, type: 'bandpass', freq: 1800, q: 0.8, at, dest: ch.dest });
      e.tone({ wave: 'triangle', f0: 190, f1: 150, dur: 0.07, vol: v * 0.6, at, dest: ch.dest });
    } else if (kind === 'h') {
      e.noise({ dur: 0.035, vol: v * 0.45, type: 'highpass', freq: 7000, at, dest: ch.dest });
    } else if (kind === 'o') {
      e.noise({ dur: 0.16, vol: v * 0.4, type: 'highpass', freq: 6000, at, dest: ch.dest });
    }
  }
}
