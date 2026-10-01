import { describe, it, expect } from 'vitest';
import { parseTrack, trackLength } from '../src/core/audio.js';
import { SONG_TITULO } from '../src/audio/songs/titulo.js';
import { SONG_CUARTO } from '../src/audio/songs/cuarto.js';
import { SONG_CARGA } from '../src/audio/songs/carga.js';
import { SONG_NULL } from '../src/audio/songs/null.js';
import { SONG_CARTUCHO, SONG_CUEVAS, SONG_CASTILLO, SONG_GUARDIAN } from '../src/audio/songs/cartucho.js';
import { Guardian } from '../src/entities/bosses/guardian.js';
import { GUARDIAN } from '../src/config/balance.js';
import { RAW_ENEMIES } from '../src/art/enemies/cartucho.js';
import { buildGuardianRows, GUARDIAN_PAL } from '../src/art/bosses/guardian.js';

const SONGS = [SONG_TITULO, SONG_CUARTO, SONG_CARGA, SONG_NULL, SONG_CARTUCHO, SONG_CUEVAS, SONG_CASTILLO, SONG_GUARDIAN];

describe('Canciones', () => {
  it('todas las notas son válidas y los canales duran lo mismo (el loop no se desfasa)', () => {
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
});

describe('Sprites nuevos', () => {
  it('enemigos del nivel 1: tamaño correcto y colores de la paleta', () => {
    for (const [k, v] of Object.entries(RAW_ENEMIES)) {
      expect(v.rows.length, k).toBe(v.h);
      for (const r of v.rows) {
        expect(r.length, k).toBe(v.w);
        for (const ch of r) if (ch !== '.') expect(v.pal[ch], `${k} "${ch}"`).toBeDefined();
      }
    }
  });

  it('Guardián del Slot: 48×48 en todas sus poses', () => {
    for (const pose of ['stand', 'walk1', 'walk2', 'crouch', 'air']) {
      for (const eye of ['normal', 'angry', 'stun', 'closed']) {
        const rows = buildGuardianRows(`${pose}:${eye}`);
        expect(rows.length).toBe(48);
        for (const r of rows) {
          expect(r.length).toBe(48);
          for (const ch of r) if (ch !== '.') expect(GUARDIAN_PAL[ch]).toBeDefined();
        }
      }
    }
  });
});

// Escena mínima para probar la máquina de estados del jefe sin canvas ni audio
function fakeScene() {
  const noop = () => {};
  const scene = {
    game: { audio: { ctx: null, stopMusic: noop }, effects: { shake: noop, hitstop: noop, flash: noop } },
    particles: { burst: noop, spawn: noop },
    hazards: [],
    enemies: [],
    map: { pxW: 320 },
    defeated: false,
    onBossDefeated() {
      this.defeated = true;
    },
    choco: { cx: 60, body: { x: 55, y: 140, w: 10, h: 20, vy: 0 }, hurtCount: 0, hurt() {
      this.hurtCount++;
    }, stomp() {} },
  };
  return scene;
}

function run(boss, scene, seconds) {
  for (let i = 0; i < seconds * 60; i++) boss.update(1 / 60, scene);
}

describe('Guardián del Slot', () => {
  it('entra cayendo y aterriza antes de atacar', () => {
    const s = fakeScene();
    const b = new Guardian(240, 160, { left: 16, right: 304 });
    expect(b.state).toBe('intro');
    run(b, s, GUARDIAN.INTRO_TIME + 1.2);
    expect(b.state).not.toBe('intro');
    expect(b.body.y + b.body.h).toBeCloseTo(160, 0);
  });

  it('solo recibe daño con un pisotón mientras está aturdido', () => {
    const s = fakeScene();
    const b = new Guardian(240, 160, { left: 16, right: 304 });
    run(b, s, 3);
    // Tocarlo de costado fuera del aturdido duele
    b.set('idle');
    s.choco.body = { x: b.body.x - 4, y: 140, w: 10, h: 20, vy: 0 };
    b.contact(s, s.choco, { down: () => false });
    expect(s.choco.hurtCount).toBe(1);
    // Disparo: lo empuja, sin daño
    b.push(s, { dir: 1 });
    expect(b.hp).toBe(GUARDIAN.HP);
    // Pisotón aturdido: pierde un punto
    b.set('stunned');
    s.choco.body = { x: b.cx - 5, y: b.body.y - 18, w: 10, h: 20, vy: 120 };
    b.contact(s, s.choco, { down: () => false });
    expect(b.hp).toBe(GUARDIAN.HP - 1);
    expect(b.state).toBe('hurt');
  });

  it('se vuelve más rápido con cada golpe y muere al tercero', () => {
    const s = fakeScene();
    const b = new Guardian(240, 160, { left: 16, right: 304 });
    run(b, s, 3);
    const speeds = [];
    for (let i = 0; i < GUARDIAN.HP; i++) {
      speeds.push(b.speed);
      b.set('stunned');
      b.hit(s);
      run(b, s, GUARDIAN.HURT_TIME + 0.05);
    }
    expect(speeds[1]).toBeCloseTo(speeds[0] * GUARDIAN.SPEED_UP);
    expect(b.state).toBe('dying');
    run(b, s, 2);
    expect(s.defeated).toBe(true);
  });

  it('la embestida termina aturdido contra la pared (doble desde el segundo golpe)', () => {
    const s = fakeScene();
    const b = new Guardian(240, 160, { left: 16, right: 304 });
    run(b, s, 3);
    b.dir = -1;
    b.charges = 1;
    b.set('charge');
    run(b, s, 2.5);
    expect(['stunned', 'idle']).toContain(b.state);
    b.hp = 2;
    b.dir = -1;
    b.charges = 2;
    b.set('charge');
    let sawBounce = false;
    for (let i = 0; i < 400 && b.state !== 'stunned'; i++) {
      b.update(1 / 60, s);
      if (b.state === 'bounce') sawBounce = true;
    }
    expect(sawBounce).toBe(true);
    expect(b.state).toBe('stunned');
  });
});
