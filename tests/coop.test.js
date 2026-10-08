// Tapita, la sala de pruebas cooperativa y las diferencias entre los dos personajes (Hito 10).
import { describe, it, expect } from 'vitest';
import { Tilemap } from '../src/systems/tilemap.js';
import { SIM, COOP, PLATFORMER } from '../src/config/balance.js';
import { Tapita, TAPITA_PHYSICS } from '../src/entities/tapita.js';
import { Choco } from '../src/entities/choco.js';
import { Melcocha } from '../src/entities/melcocha.js';
import { buildCoopTestRoom, COOP_ROOM_FEATURES, COOP_ROOM_W, COOP_ROOM_H } from '../src/coop/maps/testroom.js';
import { ANIMS, buildFrameRows, frameKey, buildDissolveRows, FRAME_W, FRAME_H } from '../src/art/tapita.js';
import { buildPortraitRows } from '../src/art/portraits.js';
import { CONTROL_ROWS, DEFAULT_KEYS } from '../src/config/controls.js';

const DT = SIM.STEP;
const C = COOP.TAPITA;

function stubScene(rows) {
  const map = new Tilemap(rows);
  const noop = () => {};
  return {
    map,
    particles: { spawn: noop, burst: noop },
    game: { effects: { shake: noop, hitstop: noop, flash: noop }, audio: null, devMode: false, debug: null },
    melee: () => false,
    pound: noop,
    throwMelcocha: noop,
    onPlayerFell: noop,
    onPlayerDied: noop,
    lassoNodes: [],
    countShots: () => 0,
    spawnShot: noop,
  };
}

// Control falso: keys = acciones mantenidas; press = acciones recién presionadas este paso
function fakeInput() {
  const st = { down: new Set(), pressed: new Set(), buffer: new Set() };
  return {
    st,
    hold(a, on = true) {
      if (on) st.down.add(a);
      else st.down.delete(a);
    },
    tap(a) {
      st.pressed.add(a);
      st.buffer.add(a);
      st.down.add(a);
    },
    endStep(released = []) {
      st.pressed.clear();
      for (const a of released) st.down.delete(a);
    },
    moveX: () => (st.down.has('right') ? 1 : 0) - (st.down.has('left') ? 1 : 0),
    moveY: () => (st.down.has('down') ? 1 : 0) - (st.down.has('up') ? 1 : 0),
    down: (a) => st.down.has(a),
    pressed: (a) => st.pressed.has(a),
    buffered: (a) => st.buffer.has(a),
    consume: (a) => st.buffer.delete(a),
    held: () => 0,
  };
}

// Mapa plano de w×h con suelo en la fila de abajo
function flat(w = 30, h = 14, extra = () => {}) {
  const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (y >= h - 1 || x === 0 || x === w - 1 ? '#' : '.')));
  extra(g);
  return g.map((r) => r.join(''));
}

// Altura máxima de un salto completo (manteniendo el botón)
function jumpHeight(make) {
  const scene = stubScene(flat());
  const p = make(scene, 100, 13 * 16);
  const inp = fakeInput();
  for (let i = 0; i < 10; i++) p.update(DT, inp); // asentarse
  const ground = p.footY;
  inp.tap('jump');
  let top = ground;
  for (let i = 0; i < 120; i++) {
    p.update(DT, inp);
    inp.endStep();
    top = Math.min(top, p.footY);
  }
  return ground - top;
}

describe('Tapita: física', () => {
  it('salta ≈ 2.5 tiles (40 px), menos que Choco', () => {
    const t = jumpHeight((s, x, y) => new Tapita(s, x, y));
    const c = jumpHeight((s, x, y) => new Choco(s, x, y));
    expect(t).toBeGreaterThan(36);
    expect(t).toBeLessThan(45);
    expect(c).toBeGreaterThan(t + 5);
  });

  it('no tiene doble salto', () => {
    expect(TAPITA_PHYSICS.DOUBLE_JUMP_SPEED).toBe(0);
    const scene = stubScene(flat());
    const p = new Tapita(scene, 100, 13 * 16);
    const inp = fakeInput();
    for (let i = 0; i < 5; i++) p.update(DT, inp);
    inp.tap('jump');
    p.update(DT, inp);
    inp.endStep();
    for (let i = 0; i < 10; i++) p.update(DT, inp);
    const vyBefore = p.body.vy;
    inp.tap('jump');
    p.update(DT, inp);
    expect(p.body.vy).toBeGreaterThanOrEqual(vyBefore); // el segundo salto no la impulsa
  });

  it('corre más lento que Choco y pesa 2 (3 plantada)', () => {
    expect(C.MAX_SPEED).toBeLessThan(PLATFORMER.MAX_SPEED);
    const p = new Tapita(stubScene(flat()), 100, 13 * 16);
    expect(p.weight).toBe(2);
    p.action = 'plant';
    expect(p.weight).toBe(3);
  });

  it('cabe por un túnel de 1 tile; Choco no', () => {
    // Bloque con un túnel de 16 px de alto a nivel del suelo
    const rows = flat(30, 14, (g) => {
      for (let x = 10; x <= 16; x++) for (let y = 9; y <= 11; y++) g[y][x] = '#';
    });
    const run = (make) => {
      const p = make(stubScene(rows), 60, 13 * 16);
      const inp = fakeInput();
      inp.hold('right');
      for (let i = 0; i < 240; i++) p.update(DT, inp);
      return p.footX;
    };
    expect(run((s, x, y) => new Tapita(s, x, y))).toBeGreaterThan(17 * 16);
    expect(run((s, x, y) => new Choco(s, x, y))).toBeLessThan(10 * 16);
  });

  it('se pega a la pared en el aire y resbala lento; el salto de pared la aleja', () => {
    const rows = flat(30, 14, (g) => {
      for (let y = 2; y <= 12; y++) g[y][12] = '#';
    });
    const scene = stubScene(rows);
    const p = new Tapita(scene, 12 * 16 - 8, 6 * 16); // en el aire, junto a la pared
    const inp = fakeInput();
    inp.hold('right');
    for (let i = 0; i < 20; i++) p.update(DT, inp);
    expect(p.cling?.dir).toBe(1);
    expect(p.body.vy).toBeLessThanOrEqual(C.CLING_SLIDE + 1);
    inp.tap('jump');
    p.update(DT, inp);
    inp.endStep();
    expect(p.cling).toBeNull();
    expect(p.body.vx).toBeLessThan(0);
    expect(p.body.vy).toBeLessThan(0);
  });

  it('pegada, se suelta sola después de 1.2 s', () => {
    const rows = flat(30, 30, (g) => {
      for (let y = 1; y <= 28; y++) g[y][12] = '#';
    });
    const p = new Tapita(stubScene(rows), 12 * 16 - 8, 4 * 16);
    const inp = fakeInput();
    inp.hold('right');
    let stuck = 0;
    for (let i = 0; i < 150; i++) {
      p.update(DT, inp);
      if (p.cling) stuck += DT;
    }
    expect(stuck).toBeGreaterThan(C.CLING_TIME - 0.1);
    expect(stuck).toBeLessThan(C.CLING_TIME + 0.1);
    expect(p.cling).toBeNull();
  });

  it('martillazo: cae en picada y avisa a la escena al tocar el suelo', () => {
    const scene = stubScene(flat());
    let pounded = null;
    scene.pound = (x, y) => (pounded = { x, y });
    const p = new Tapita(scene, 100, 6 * 16);
    const inp = fakeInput();
    inp.hold('down');
    inp.tap('shoot');
    p.update(DT, inp);
    inp.endStep();
    expect(p.action).toBe('pound');
    let maxVy = 0;
    for (let i = 0; i < 120 && !pounded; i++) {
      p.update(DT, inp);
      maxVy = Math.max(maxVy, p.body.vy);
    }
    expect(maxVy).toBe(C.POUND_SPEED);
    expect(pounded.y).toBe(13 * 16);
  });

  it('el mazo pega en el frame del golpe, delante de ella', () => {
    const scene = stubScene(flat());
    const hits = [];
    scene.melee = (box, dmg, dir) => {
      hits.push({ box, dmg, dir });
      return true;
    };
    const p = new Tapita(scene, 100, 13 * 16);
    const inp = fakeInput();
    for (let i = 0; i < 5; i++) p.update(DT, inp);
    inp.tap('shoot');
    for (let i = 0; i < 30; i++) {
      p.update(DT, inp);
      inp.endStep(['shoot']);
    }
    expect(hits).toHaveLength(1);
    expect(hits[0].dmg).toBe(C.MAZO_DAMAGE);
    expect(hits[0].box.x).toBeGreaterThanOrEqual(p.body.x + p.body.w - 1);
    expect(hits[0].box.w).toBe(C.MAZO_RANGE);
  });

  it('plantada no la empuja un golpe', () => {
    const p = new Tapita(stubScene(flat()), 100, 13 * 16);
    const inp = fakeInput();
    for (let i = 0; i < 5; i++) p.update(DT, inp);
    p.plant();
    p.hurt(80);
    expect(p.body.vx).toBe(0);
    expect(p.hp).toBe(C.HP - 1);
  });

  it('4 trozos de vida: al cuarto golpe se cae', () => {
    const scene = stubScene(flat());
    let died = false;
    scene.onPlayerDied = () => (died = true);
    const p = new Tapita(scene, 100, 13 * 16);
    for (let i = 0; i < 4; i++) {
      p.invuln = 0;
      p.hurt(80);
    }
    expect(died).toBe(true);
    expect(p.state).toBe('dead');
  });
});

describe('Melcocha', () => {
  const scene = () => {
    const s = stubScene(
      flat(30, 14, (g) => {
        for (let y = 2; y <= 12; y++) g[y][15] = '#';
      }),
    );
    s.enemyAt = () => null;
    s.onMelcochaStuck = () => {};
    return s;
  };

  it('se pega en la pared y a los 0.5 s es una plataforma de 2×1 tiles por 6 s', () => {
    const s = scene();
    const m = new Melcocha('h1', 200, 120, C.MELCOCHA_SPEED_X, C.MELCOCHA_SPEED_Y, true);
    for (let i = 0; i < 60 && m.flying; i++) m.update(DT, s);
    expect(m.state).toBe('soft');
    expect(m.plat.x + m.plat.w).toBe(15 * 16); // pegada a la cara izquierda de la pared
    expect(m.plat.w).toBe(32);
    expect(m.plat.active).toBe(false);
    for (let t = 0; t < C.MELCOCHA_HARDEN + 0.05; t += DT) m.update(DT, s);
    expect(m.plat.active).toBe(true);
    expect(s.map.platforms).toContain(m.plat);
    for (let t = 0; t < C.MELCOCHA_LIFE; t += DT) m.update(DT, s);
    expect(m.dead).toBe(true);
    expect(s.map.platforms).not.toContain(m.plat);
  });

  it('cae y se pega en el piso', () => {
    const s = scene();
    const m = new Melcocha('h2', 100, 120, 20, 0, true);
    for (let i = 0; i < 120 && m.flying; i++) m.update(DT, s);
    expect(m.plat.y + m.plat.h).toBe(13 * 16);
  });
});

describe('Sala de pruebas cooperativa', () => {
  const rows = buildCoopTestRoom();
  const map = new Tilemap(rows);
  const F = COOP_ROOM_FEATURES;

  it('mapa rectangular con los dos puntos de aparición y la salida', () => {
    expect(rows).toHaveLength(COOP_ROOM_H);
    for (const r of rows) expect(r).toHaveLength(COOP_ROOM_W);
    for (const ch of ['P', 'p', 'X']) expect(map.find(ch)).toHaveLength(1);
    expect(map.find('b').length).toBeGreaterThan(0);
  });

  it('la pared alta: Choco solo no llega; parado sobre Tapita, sí', () => {
    const wallH = (16 - F.wallTop) * 16;
    const choco = jumpHeight((s, x, y) => new Choco(s, x, y));
    // Choco con doble salto: el primero + el segundo desde el punto más alto
    const dj = (PLATFORMER.DOUBLE_JUMP_SPEED ** 2) / (2 * PLATFORMER.GRAVITY_UP);
    expect(choco + dj).toBeLessThan(wallH);
    expect(choco + dj + C.HITBOX_H).toBeGreaterThan(wallH);
  });

  it('Tapita trepa la chimenea saltando de pared en pared', () => {
    const s = stubScene(rows);
    const t = new Tapita(s, 28 * 16 + 16, 16 * 16);
    const inp = fakeInput();
    let dir = 1;
    let landed = false;
    for (let i = 0; i < 60 * 8 && !landed; i++) {
      inp.st.down.delete('left');
      inp.st.down.delete('right');
      if (t.cling) {
        dir = -t.cling.dir;
        inp.tap('jump');
      } else if (t.wallLock <= 0) inp.hold(dir > 0 ? 'right' : 'left');
      if (t.body.onGround && t.footY < 16 * 16) landed = true;
      // Cuando pasa el tope de la pared, se mueve hacia ella
      if (t.footY <= F.wallTop * 16) dir = 1;
      if (t.body.onGround && t.footY === 16 * 16 && i > 5) inp.tap('jump');
      t.update(DT, inp);
      inp.endStep(['jump']);
    }
    expect(t.footY).toBe(F.wallTop * 16);
    expect(t.footX).toBeGreaterThan(F.wallX[0] * 16);
  });
});

describe('Arte de Tapita', () => {
  it('todos los frames tienen el tamaño del lienzo', () => {
    for (const [name, a] of Object.entries(ANIMS)) {
      for (const f of a.frames) {
        const r = buildFrameRows(frameKey(f));
        expect(r, name).toHaveLength(FRAME_H);
        for (const row of r) expect(row.length).toBe(FRAME_W);
      }
    }
    for (let k = 0; k < 8; k++) expect(buildDissolveRows(k)).toHaveLength(FRAME_H);
  });

  it('las animaciones del documento existen', () => {
    for (const n of ['idle', 'run', 'skid', 'jump', 'fall', 'land', 'cling', 'walljump', 'mazo', 'pound', 'throw', 'plant', 'umbrella', 'ride', 'hurt', 'victory']) expect(ANIMS[n], n).toBeTruthy();
    expect(ANIMS.mazo.frames).toHaveLength(4);
    expect(ANIMS.pound.frames).toHaveLength(5);
    expect(ANIMS.victory.frames).toHaveLength(6);
  });

  it('retrato de 32×32 con 4 expresiones distintas', () => {
    const faces = ['normal', 'happy', 'worried', 'determined'].map((f) => buildPortraitRows(`tapita:${f}`).join('\n'));
    for (const f of faces) expect(f.split('\n')).toHaveLength(32);
    expect(new Set(faces).size).toBe(4);
  });
});

describe('Controles', () => {
  it('Señal en T; el modo solo no la muestra y el cooperativo no muestra el sigilo', () => {
    expect(DEFAULT_KEYS.signal).toEqual(['KeyT']);
    expect(CONTROL_ROWS.solo).not.toContain('signal');
    expect(CONTROL_ROWS.solo).toContain('sneak');
    expect(CONTROL_ROWS.coop).toContain('signal');
    expect(CONTROL_ROWS.coop).not.toContain('sneak');
  });
});
