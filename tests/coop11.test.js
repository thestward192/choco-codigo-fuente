// Hito 11: elementos de puzzle, agua, guardado cooperativo, salas y diálogos en línea.
import { describe, it, expect } from 'vitest';
import { Tilemap } from '../src/systems/tilemap.js';
import { SIM, COOP, PLATFORMER, SCREEN } from '../src/config/balance.js';
import { Tapita } from '../src/entities/tapita.js';
import { Choco } from '../src/entities/choco.js';
import { waterZonesFromMap, waterAt, submergedFraction, chocoWaterState, tapitaWaterState, createSwimState, swimStep } from '../src/systems/water.js';
import { PuzzleWorld, weightOf, weightOn, scaleStep, signedTogether, syncPercent, gradeFor } from '../src/coop/puzzle.js';
import { defaultCoop, migrateCoop, recordMapResult, salaOpen, progressSummary, parseSummary, loadCoop, saveCoop, recordCheckpoint, COOP_KEY } from '../src/coop/coopSave.js';
import { SafeStorage } from '../src/core/save.js';
import { COOP_LEGEND } from '../src/coop/CoopStage.js';
import { PROLOGUE, PROLOGUE_FEATURES } from '../src/coop/stages/prologue.js';
import { LAB_STAGE, LAB_FEATURES } from '../src/coop/stages/lab.js';
import { CoopDialogue } from '../src/coop/dialogue.js';
import { nextNode, MAP_NODES } from '../src/coop/CoopMapScene.js';
import { TEXTS } from '../src/data/dialogues.js';
import { buildPortraitRows } from '../src/art/portraits.js';

const DT = SIM.STEP;
const TS = SCREEN.TILE;
const P = COOP.PUZZLE;

// ---------- Ayudas ----------
function stubScene(rows, legend = COOP_LEGEND) {
  const map = new Tilemap(rows, legend);
  const water = waterZonesFromMap(map, 'w');
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
    onChocoDied: noop,
    lassoNodes: [],
    countShots: () => 0,
    spawnShot: noop,
    splash: noop,
    waterZoneFor: (b) => waterAt(water, b),
    water,
  };
}

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
    },
    endStep() {
      st.pressed.clear();
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

// Piscina: suelo en la fila 10, agua de 3 tiles de hondo en las columnas 10..19
function pool() {
  const w = 30;
  const h = 14;
  const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (y >= 10 || x === 0 || x === w - 1 ? '#' : '.')));
  for (let y = 10; y <= 12; y++) for (let x = 10; x <= 19; x++) g[y][x] = 'w';
  return g.map((r) => r.join(''));
}

const steps = (n, fn) => {
  for (let i = 0; i < n; i++) fn(i);
};

// Personaje para los puzzles
const ch = (kind, x, y, extra = {}) => ({ kind, x, y, w: kind === 'tapita' ? 14 : 10, h: kind === 'tapita' ? 14 : 20, onGround: true, planted: false, ridingOn: null, alive: true, ...extra });

// ---------- Agua ----------
describe('Agua (sistema)', () => {
  it('junta las celdas de agua en rectángulos', () => {
    const map = new Tilemap(pool(), COOP_LEGEND);
    const z = waterZonesFromMap(map, 'w');
    expect(z).toHaveLength(1);
    expect(z[0]).toMatchObject({ x: 160, y: 160, w: 160, h: 48 });
  });

  it('la superficie manda: debajo, todo cuenta como agua', () => {
    const zone = { x: 0, y: 100, w: 100, h: 16 };
    expect(submergedFraction({ x: 10, y: 110, w: 10, h: 20 }, zone)).toBe(1);
    expect(submergedFraction({ x: 10, y: 90, w: 10, h: 20 }, zone)).toBe(0.5);
    expect(submergedFraction({ x: 10, y: 70, w: 10, h: 20 }, zone)).toBe(0);
  });

  it('Choco: agua baja hasta la mitad del cuerpo, profunda más arriba', () => {
    const zone = { x: 0, y: 100, w: 100, h: 50 };
    expect(chocoWaterState({ x: 0, y: 70, w: 10, h: 20 }, zone)).toBe('dry');
    expect(chocoWaterState({ x: 0, y: 85, w: 10, h: 20 }, zone)).toBe('shallow');
    expect(chocoWaterState({ x: 0, y: 95, w: 10, h: 20 }, zone)).toBe('deep');
  });

  it('Tapita: con los pies mojados se daña y con más de la mitad adentro se disuelve', () => {
    const zone = { x: 0, y: 100, w: 100, h: 50 };
    expect(tapitaWaterState({ x: 0, y: 85, w: 14, h: 14 }, zone)).toBe('dry');
    expect(tapitaWaterState({ x: 0, y: 90, w: 14, h: 14 }, zone)).toBe('wet');
    expect(tapitaWaterState({ x: 0, y: 95, w: 14, h: 14 }, zone)).toBe('dissolve');
  });

  it('nadando sube sola a la superficie y flota con la cabeza afuera', () => {
    const map = new Tilemap(pool(), COOP_LEGEND);
    const zone = waterZonesFromMap(map, 'w')[0];
    const body = { x: 200, y: 185, w: 10, h: 20, vx: 0, vy: 0, onGround: false };
    const sw = createSwimState();
    steps(240, () => swimStep(body, sw, { moveX: 0, up: false, down: false, jumpPressed: false }, DT, map, zone));
    expect(body.y).toBeLessThan(zone.y);
    expect(body.y + body.h).toBeGreaterThan(zone.y + 8);
    expect(sw.under).toBe(false);
  });

  it('con ↓ bucea y gasta oxígeno; a los 10 s pierde un cuadrito y sale a flote', () => {
    const map = new Tilemap(pool(), COOP_LEGEND);
    const zone = waterZonesFromMap(map, 'w')[0];
    const body = { x: 200, y: 165, w: 10, h: 20, vx: 0, vy: 0, onGround: false };
    const sw = createSwimState();
    let outOfAir = 0;
    let at = null;
    steps(Math.ceil(COOP.OXYGEN.MAX / DT) + 30, (i) => {
      if (swimStep(body, sw, { moveX: 0, up: false, down: true, jumpPressed: false }, DT, map, zone).outOfAir) {
        outOfAir++;
        at = { i, oxygen: sw.oxygen, surfacing: sw.surfacing };
      }
    });
    expect(outOfAir).toBe(1);
    expect(at.i * DT).toBeCloseTo(COOP.OXYGEN.MAX, 0);
    expect(at.oxygen).toBe(COOP.OXYGEN.AFTER_DAMAGE);
    expect(at.surfacing).toBeGreaterThan(0);
    expect(body.y).toBeLessThan(zone.y + 8); // salió a flote
  });

  it('desde la superficie se sale del agua saltando', () => {
    const map = new Tilemap(pool(), COOP_LEGEND);
    const zone = waterZonesFromMap(map, 'w')[0];
    const body = { x: 200, y: zone.y - COOP.WATER.FLOAT_Y, w: 10, h: 20, vx: 0, vy: 0, onGround: false };
    const r = swimStep(body, createSwimState(), { moveX: 0, up: false, down: false, jumpPressed: true }, DT, map, zone);
    expect(r.jumpedOut).toBe(true);
    expect(body.vy).toBeLessThan(-200);
  });
});

describe('Agua (personajes)', () => {
  it('Choco flota en la piscina y en el modo solo (sin agua) no cambia nada', () => {
    const scene = stubScene(pool());
    const c = new Choco(scene, 15 * TS, 12 * TS);
    c.items = { staff: true, boots: true, laptop: true, shield: true, lasso: true };
    const inp = fakeInput();
    steps(240, () => c.update(DT, inp));
    expect(c.waterState).toBe('deep');
    expect(c.alive).toBe(true);
    expect(c.footY).toBeLessThan(10 * TS + 20);
    // Escena sin agua (como las del modo solo)
    const solo = stubScene(pool());
    delete solo.waterZoneFor;
    const d = new Choco(solo, 5 * TS, 10 * TS);
    steps(30, () => d.update(DT, inp));
    expect(d.waterState).toBe('dry');
  });

  it('agua baja: Choco camina al 70 %', () => {
    const g = pool().map((r) => r.split(''));
    for (let x = 10; x <= 19; x++) {
      g[10][x] = '#';
      g[11][x] = '#';
      g[12][x] = '#';
      g[9][x] = 'v'; // charco
    }
    const scene = stubScene(g.map((r) => r.join('')));
    const c = new Choco(scene, 12 * TS, 10 * TS);
    const inp = fakeInput();
    inp.hold('right');
    steps(60, () => c.update(DT, inp));
    expect(c.waterState).toBe('shallow');
    expect(Math.abs(c.body.vx)).toBeCloseTo(PLATFORMER.MAX_SPEED * COOP.WATER.SHALLOW_MULT, 0);
  });

  it('Tapita se disuelve en el agua profunda (sin modo desarrolladora)', () => {
    const scene = stubScene(pool());
    let died = null;
    scene.onPlayerDied = (p) => (died = p.deathCause);
    const t = new Tapita(scene, 15 * TS, 10 * TS);
    const inp = fakeInput();
    steps(90, () => t.update(DT, inp));
    expect(t.state).toBe('dead');
    expect(died).toBe('water');
    expect(t.netState().dc).toBe('water');
  });

  it('la sombrilla la protege de las gotas, no de meterse al agua; el escudo de Choco, del chorro', () => {
    const scene = stubScene(pool());
    const t = new Tapita(scene, 5 * TS, 10 * TS);
    t.umbrella = true;
    expect(t.hurt(0, { water: 'drop' })).toBe('umbrella');
    expect(t.hp).toBe(COOP.TAPITA.HP);
    scene.sharedShieldCovers = () => true;
    t.umbrella = false;
    expect(t.hurt(0, { water: 'stream' })).toBe('shield');
    expect(t.hurt(0, { water: 'pool' })).toBe(true);
    expect(t.hp).toBe(COOP.TAPITA.HP - 1);
  });

  it('Choco la jala con el lazo hacia él a 120 px/s', () => {
    const scene = stubScene(pool());
    const t = new Tapita(scene, 5 * TS, 10 * TS);
    const inp = fakeInput();
    steps(5, () => t.update(DT, inp));
    t.startPull(2 * TS, 10 * TS);
    expect(t.pull).toBeTruthy();
    const x0 = t.footX;
    t.update(DT, inp);
    expect(x0 - t.footX).toBeCloseTo(COOP.PULL_SPEED * DT, 0);
    steps(120, () => t.update(DT, inp));
    expect(t.pull).toBe(null);
    expect(Math.abs(t.footX - 2 * TS)).toBeLessThan(COOP.PULL_STOP + 2);
  });
});

// ---------- Puzzles ----------
describe('Peso y botones', () => {
  it('pesos: Choco 1, Tapita 2, plantada 3', () => {
    expect(weightOf('choco')).toBe(1);
    expect(weightOf('tapita')).toBe(2);
    expect(weightOf('tapita', true)).toBe(3);
  });

  it('el peso se suma con los que van montados', () => {
    const rect = { x: 100, y: 200, w: 32 };
    expect(weightOn(rect, [ch('choco', 110, 200)])).toBe(1);
    expect(weightOn(rect, [ch('tapita', 110, 200)])).toBe(2);
    expect(weightOn(rect, [ch('tapita', 110, 200, { planted: true })])).toBe(3);
    // Choco montado sobre Tapita, que está en el botón
    expect(weightOn(rect, [ch('tapita', 110, 200), ch('choco', 110, 186, { ridingOn: 'tapita' })])).toBe(3);
    // Fuera del botón o en el aire no cuenta
    expect(weightOn(rect, [ch('choco', 160, 200), ch('tapita', 110, 180, { onGround: false })])).toBe(0);
  });

  const world = (defs) => new PuzzleWorld(defs, new Tilemap(Array.from({ length: 12 }, () => '.'.repeat(30)), COOP_LEGEND));
  const btnY = (ty) => (ty + 1) * TS;

  it('botón pesado: Choco solo no lo hunde; Tapita sí. Extrapesado: Tapita plantada o con Choco encima', () => {
    const w = world([
      { id: 'h', type: 'button', kind: 'heavy', tx: 2, ty: 5 },
      { id: 'x', type: 'button', kind: 'xheavy', tx: 10, ty: 5 },
    ]);
    w.hostUpdate(DT, [ch('choco', 2.5 * TS + 8, btnY(5))], 0);
    expect(w.active('h')).toBe(false);
    w.hostUpdate(DT, [ch('tapita', 2.5 * TS + 8, btnY(5))], 0);
    expect(w.active('h')).toBe(true);
    w.hostUpdate(DT, [ch('tapita', 10.5 * TS + 8, btnY(5))], 0);
    expect(w.active('x')).toBe(false);
    w.hostUpdate(DT, [ch('tapita', 10.5 * TS + 8, btnY(5), { planted: true })], 0);
    expect(w.active('x')).toBe(true);
    w.hostUpdate(DT, [ch('tapita', 10.5 * TS + 8, btnY(5)), ch('choco', 10.5 * TS + 8, btnY(5) - 14, { ridingOn: 'tapita' })], 0);
    expect(w.active('x')).toBe(true);
  });

  it('compuertas: sólidas cerradas, abiertas con su señal (todas o cualquiera) y algunas quedan abiertas', () => {
    const w = world([
      { id: 'b1', type: 'button', kind: 'light', tx: 2, ty: 5 },
      { id: 'b2', type: 'button', kind: 'light', tx: 4, ty: 5 },
      { id: 'gAll', type: 'gate', tx: 8, ty: 3, h: 3, link: ['b1', 'b2'] },
      { id: 'gAny', type: 'gate', tx: 9, ty: 3, h: 3, link: ['b1', 'b2'], mode: 'any' },
      { id: 'gLatch', type: 'gate', tx: 10, ty: 3, h: 3, link: ['b1'], latch: true },
    ]);
    expect(w.map.isSolid(8, 4)).toBe(true);
    w.hostUpdate(DT, [ch('choco', 2 * TS + 8, btnY(5))], 0);
    expect(w.get('gAll').solid).toBe(true);
    expect(w.get('gAny').solid).toBe(false);
    expect(w.map.isSolid(9, 4)).toBe(false);
    expect(w.get('gLatch').solid).toBe(false);
    w.hostUpdate(DT, [ch('choco', 2 * TS + 8, btnY(5)), ch('tapita', 4 * TS + 8, btnY(5))], 0);
    expect(w.get('gAll').solid).toBe(false);
    w.hostUpdate(DT, [], 0);
    expect(w.get('gAny').solid).toBe(true);
    expect(w.get('gLatch').solid).toBe(false);
  });

  it('una compuerta no se cierra encima de alguien', () => {
    const w = world([
      { id: 'b', type: 'button', kind: 'light', tx: 2, ty: 5 },
      { id: 'g', type: 'gate', tx: 8, ty: 3, h: 3, link: ['b'] },
    ]);
    w.hostUpdate(DT, [ch('choco', 2 * TS + 8, btnY(5))], 0);
    expect(w.get('g').solid).toBe(false);
    w.hostUpdate(DT, [ch('tapita', 8 * TS + 8, 6 * TS)], 0);
    expect(w.get('g').solid).toBe(false);
    w.hostUpdate(DT, [ch('tapita', 12 * TS, 6 * TS)], 0);
    expect(w.get('g').solid).toBe(true);
  });

  it('botón de martillazo con temporizador visible', () => {
    const w = world([{ id: 'p', type: 'button', kind: 'pound', tx: 3, ty: 5, time: 6 }]);
    expect(w.pound(3 * TS + 8, btnY(5))).toBeTruthy();
    expect(w.active('p')).toBe(true);
    steps(Math.round(5 / DT), () => w.hostUpdate(DT, [], 0));
    expect(w.active('p')).toBe(true);
    expect(w.pack()[0]).toBeGreaterThan(1); // el invitado ve cuánto falta
    steps(Math.round(1.2 / DT), () => w.hostUpdate(DT, [], 0));
    expect(w.active('p')).toBe(false);
    // Lejos no lo activa
    expect(w.pound(10 * TS, btnY(5))).toBe(null);
  });

  it('terminales de doble firma: con menos de 0.5 s de diferencia; una sola vence', () => {
    expect(signedTogether(1, 1.4)).toBe(true);
    expect(signedTogether(1, 1.6)).toBe(false);
    expect(signedTogether(1, null)).toBe(false);
    const w = world([
      { id: 't1', type: 'terminal', pair: 't2', tx: 2, ty: 5 },
      { id: 't2', type: 'terminal', pair: 't1', tx: 20, ty: 5 },
    ]);
    w.sign('t1', 1);
    w.hostUpdate(DT, [], 1.2);
    expect(w.pack()[1]).toBe(0);
    expect(w.pack()[0]).toBeGreaterThan(0); // la cuenta de la otra
    w.hostUpdate(DT, [], 1.6);
    expect(w.get('t1').touch).toBe(null); // venció
    w.sign('t1', 2);
    w.sign('t2', 2.3);
    w.hostUpdate(DT, [], 2.3);
    expect(w.active('t1')).toBe(true);
    expect(w.active('t2')).toBe(true);
  });

  it('palanca, diana con temporizador y balanza', () => {
    const w = world([
      { id: 'l', type: 'lever', tx: 2, ty: 5 },
      { id: 'd', type: 'target', tx: 4, ty: 2, time: 5 },
      { id: 's', type: 'scale', a: { tx: 8, ty: 6, w: 2 }, b: { tx: 14, ty: 6, w: 2 }, range: 40 },
    ]);
    w.toggleLever('l');
    expect(w.active('l')).toBe(true);
    w.hitTarget('d');
    expect(w.active('d')).toBe(true);
    steps(Math.round(5.2 / DT), () => w.hostUpdate(DT, [], 0));
    expect(w.active('d')).toBe(false);
    // Tapita en A (2) y Choco en B (1): baja A a 40 px/s
    const s = w.get('s');
    const onA = () => ch('tapita', s.pa.x + 16, s.pa.y);
    const onB = () => ch('choco', s.pb.x + 16, s.pb.y);
    steps(30, () => {
      w.hostUpdate(DT, [onA(), onB()], 0);
      w.update(DT, true);
    });
    expect(s.offset).toBeCloseTo(P.SCALE_SPEED * 30 * DT, 0);
    expect(s.pa.y).toBeGreaterThan(s.pa.baseY);
    expect(s.pb.y).toBeLessThan(s.pb.baseY);
    expect(scaleStep(39, 2, 1, 40, 1)).toBe(40);
    expect(scaleStep(0, 1, 1, 40, 1)).toBe(0);
  });

  it('el estado viaja en un número por elemento y el invitado lo aplica', () => {
    const defs = [
      { id: 'b', type: 'button', kind: 'light', tx: 2, ty: 5 },
      { id: 'g', type: 'gate', tx: 8, ty: 3, h: 3, link: ['b'] },
      { id: 'l', type: 'lever', tx: 4, ty: 5 },
    ];
    const host = world(defs);
    const guest = world(defs);
    host.toggleLever('l');
    host.hostUpdate(DT, [ch('choco', 2 * TS + 8, btnY(5))], 0);
    const pz = host.pack();
    expect(pz).toEqual([1, 1, 1]);
    guest.unpack(pz, []);
    expect(guest.active('b')).toBe(true);
    expect(guest.get('g').solid).toBe(false);
    expect(guest.map.isSolid(8, 4)).toBe(false);
    guest.unpack([1, 2], []); // largo distinto: se ignora
    expect(guest.active('l')).toBe(true);
  });

  it('cajas: se empujan un tile y caen; el disparo cargado rompe las chicas', () => {
    const rows = Array.from({ length: 12 }, (_, y) => (y >= 10 ? '#'.repeat(30) : '.'.repeat(30)));
    rows[8] = '#'.repeat(6) + '.'.repeat(24);
    const w = new PuzzleWorld([{ id: 'c', type: 'box', tx: 5, ty: 7 }], new Tilemap(rows, COOP_LEGEND));
    const box = w.get('c');
    expect(w.map.isSolid(5, 7)).toBe(true);
    const to = w.pushTarget(box, 1);
    expect(to).toEqual({ tx: 6, ty: 9 }); // se sale de la cornisa y cae
    w.moveBox(box, to.tx, to.ty);
    expect(w.map.isSolid(5, 7)).toBe(false);
    expect(w.map.isSolid(6, 9)).toBe(true);
    expect(w.boxAt({ x: 6 * TS + 2, y: 9 * TS + 2, w: 4, h: 4 })).toBe(box);
    w.breakBox(box);
    expect(w.map.isSolid(6, 9)).toBe(false);
  });

  it('la melcocha tapa ventiladores y cortinas un rato', () => {
    const w = world([
      { id: 'f', type: 'fan', tx: 2, ty: 8, h: 5 },
      { id: 'c', type: 'curtain', kind: 'water', tx: 10, ty: 2, h: 4 },
    ]);
    const fan = w.get('f');
    expect(w.plugAt({ x: fan.rect.x, y: fan.rect.y + fan.rect.h - 8, w: 32, h: 8 })).toBe(fan);
    w.plug('c');
    w.hostUpdate(DT, [], 0);
    expect(w.active('c')).toBe(false);
    steps(Math.round((P.PLUG_TIME + 0.2) / DT), () => w.update(DT, true));
    w.hostUpdate(DT, [], 0);
    expect(w.active('c')).toBe(true);
  });

  it('sincronía y nota', () => {
    expect(syncPercent([0.5, 2, 5, 1])).toBe(75);
    expect(syncPercent([])).toBe(100);
    const [s, a, b] = COOP.RANKS.c1;
    expect(gradeFor('c1', s - 1)).toBe('S');
    expect(gradeFor('c1', a - 1)).toBe('A');
    expect(gradeFor('c1', b - 1)).toBe('B');
    expect(gradeFor('c1', b + 1)).toBe('C');
  });
});

// ---------- Guardado ----------
describe('Guardado cooperativo', () => {
  it('clave aparte, tolera datos rotos y suma resultados', () => {
    expect(COOP_KEY).toMatch(/coop$/);
    const bad = migrateCoop({ maps: { c1: { done: 'sí', grade: 'Z', best: -3, memories: [true, 'x'] } }, falls: -1 });
    expect(bad.maps.c1).toMatchObject({ done: false, grade: null, best: null, memories: [true, false, false] });
    expect(bad.falls).toBe(0);
    let d = defaultCoop();
    d = recordMapResult(d, 'c1', { time: 900, falls: 3, memories: [true, false, false] }).data;
    const r = recordMapResult(d, 'c1', { time: 500, falls: 1, memories: [false, true, false] });
    expect(r.grade).toBe('S');
    expect(r.newBest).toBe(true);
    expect(r.data.maps.c1).toMatchObject({ done: true, grade: 'S', best: 500, memories: [true, true, false], plays: 2 });
    expect(r.data.falls).toBe(4);
  });

  it('La Sala se abre con los tres mapas completos', () => {
    let d = defaultCoop();
    for (const m of ['c1', 'c2']) d = recordMapResult(d, m, { time: 100 }).data;
    expect(salaOpen(d)).toBe(false);
    d = recordMapResult(d, 'c3', { time: 100 }).data;
    expect(salaOpen(d)).toBe(true);
  });

  it('el resumen que viaja por la red se valida', () => {
    const d = recordMapResult(defaultCoop(), 'c2', { time: 100, memories: [true, true, false] }).data;
    const s = parseSummary(JSON.parse(JSON.stringify(progressSummary(d))));
    expect(s.maps.c2).toEqual({ done: true, grade: 'S', mem: 2 });
    expect(parseSummary(null)).toBe(null);
    expect(parseSummary({ maps: { c1: { mem: 99, grade: 'X' } } }).maps.c1).toEqual({ done: false, grade: null, mem: 3 });
  });

  it('si el navegador no deja guardar, el juego sigue (try/catch)', () => {
    const broken = new SafeStorage(() => ({
      setItem() {
        throw new Error('bloqueado');
      },
      getItem() {
        throw new Error('bloqueado');
      },
      removeItem() {},
    }));
    const save = { storage: broken };
    expect(() => saveCoop(save, recordCheckpoint(defaultCoop(), 'c1', 3))).not.toThrow();
    expect(loadCoop(save).checkpoint).toEqual({ map: 'c1', id: 3 }); // queda en memoria
    expect(loadCoop({ storage: null }).maps.prologue.done).toBe(false);
  });
});

// ---------- Salas ----------
describe('Prólogo cooperativo', () => {
  const map = new Tilemap(PROLOGUE.rows, COOP_LEGEND);
  const G = PROLOGUE_FEATURES.ground;

  it('el mapa tiene las dos apariciones, los carteles y todo dentro de los bordes', () => {
    expect(map.find('P')).toHaveLength(1);
    expect(map.find('p')).toHaveLength(1);
    for (const n of Object.keys(PROLOGUE.signs)) expect(map.find(n)).toHaveLength(1);
    for (const e of PROLOGUE.elements) {
      expect(e.tx).toBeGreaterThanOrEqual(0);
      expect(e.tx).toBeLessThan(map.w);
    }
  });

  it('la pared de 6 tiles: Choco solo no llega (5.5 con doble salto)', () => {
    const { top } = PROLOGUE_FEATURES.stackWall;
    const tiles = G - top;
    expect(tiles).toBe(6);
    const g = PLATFORMER.GRAVITY_UP;
    const reach = (PLATFORMER.JUMP_SPEED ** 2 + PLATFORMER.DOUBLE_JUMP_SPEED ** 2) / (2 * g);
    expect(reach).toBeLessThan(tiles * TS);
    expect(reach + COOP.TAPITA.HITBOX_H).toBeGreaterThan(tiles * TS);
  });

  it('el botón pesado está lejos de su compuerta: Tapita sola no llega antes de que se cierre', () => {
    const dist = (PROLOGUE_FEATURES.gateC - PROLOGUE_FEATURES.heavyButton - 1) * TS;
    expect(dist / COOP.TAPITA.MAX_SPEED).toBeGreaterThan(1 / P.GATE_SPEED);
  });

  it('las terminales están tan lejos que una sola persona no firma las dos', () => {
    const [a, b] = PROLOGUE_FEATURES.terminals;
    expect(((b - a) * TS) / PLATFORMER.MAX_SPEED).toBeGreaterThan(P.TERMINAL_WINDOW * 2);
  });

  it('las puertas dobles tienen un marco para cada uno y llevan a un cartel', () => {
    const groups = {};
    for (const e of PROLOGUE.elements.filter((q) => q.type === 'exit')) (groups[e.group] ||= []).push(e.who);
    for (const who of Object.values(groups)) expect(who.sort()).toEqual(['choco', 'tapita']);
    expect(PROLOGUE.elements.some((e) => e.type === 'exit' && e.final)).toBe(true);
  });

  it('textos del prólogo y retrato de L.A.G.', () => {
    expect(TEXTS.coop.prologue.lag.filter((l) => l.who === 'lag')).toHaveLength(3);
    expect(TEXTS.characters.lag).toBe('L.A.G.');
    const rows = buildPortraitRows('lag:normal');
    expect(rows).toHaveLength(32);
    expect(rows.join('').replace(/\./g, '').length).toBeGreaterThan(300);
  });
});

describe('Sala de elementos', () => {
  const map = new Tilemap(LAB_STAGE.rows, COOP_LEGEND);

  it('tiene cada elemento de puzzle', () => {
    const types = new Set(LAB_STAGE.elements.map((e) => e.type));
    for (const t of ['button', 'target', 'terminal', 'lever', 'scale', 'gate', 'fan', 'curtain', 'box', 'exit', 'bubble']) expect(types.has(t)).toBe(true);
    const kinds = new Set(LAB_STAGE.elements.filter((e) => e.type === 'button').map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['heavy', 'light', 'pound', 'xheavy']);
    expect(map.find('u').length).toBeGreaterThan(0); // azúcar
    expect(map.find('h').length).toBeGreaterThan(0); // planchas
    expect(waterZonesFromMap(map, 'w').length).toBeGreaterThan(0);
  });

  it('las compuertas apuntan a elementos que existen', () => {
    const ids = new Set(LAB_STAGE.elements.map((e) => e.id));
    for (const g of LAB_STAGE.elements.filter((e) => e.type === 'gate')) for (const l of g.link) expect(ids.has(l) || l.startsWith('door:')).toBe(true);
    for (const t of LAB_STAGE.elements.filter((e) => e.type === 'terminal')) expect(ids.has(t.pair)).toBe(true);
  });

  it('la cornisa de la balanza solo se alcanza desde el plato que sube', () => {
    const { ty, ledge } = LAB_FEATURES.scale;
    const sc = LAB_STAGE.elements.find((e) => e.type === 'scale');
    const g = PLATFORMER.GRAVITY_UP;
    const reach = (PLATFORMER.JUMP_SPEED ** 2 + PLATFORMER.DOUBLE_JUMP_SPEED ** 2) / (2 * g);
    const ledgeY = ledge.ty * TS;
    expect(LAB_FEATURES.ground * TS - ledgeY).toBeGreaterThan(reach);
    expect(ty * TS - ledgeY).toBeGreaterThan(reach); // desde el plato quieto, tampoco
    expect(ty * TS - sc.range - ledgeY).toBeLessThan(reach); // desde el plato arriba, sí
  });
});

// ---------- Diálogos en línea ----------
describe('Diálogos en línea', () => {
  const game = { audio: { blip() {}, tone() {}, ctx: null }, options: { textSpeed: 'instant' } };
  const level = (present = true) => ({ partner: { present }, mine: 'choco', theirs: 'tapita', acts: [], act(k, d) { this.acts.push([k, d]); } });
  const lines = [
    { who: 'choco', text: 'Uno.' },
    { who: 'tapita', text: 'Dos.' },
  ];
  const run = (d, inp, lv, n = 1) => steps(n, () => {
    d.update(DT, inp, lv);
    inp.endStep();
  });

  it('avanza cuando confirman los dos', () => {
    const d = new CoopDialogue(game, lines);
    const inp = fakeInput();
    const lv = level();
    run(d, inp, lv, 20);
    inp.tap('confirm');
    run(d, inp, lv);
    expect(d.index).toBe(0);
    expect(lv.acts).toContainEqual(['dlg', { i: 0 }]);
    d.partnerOk(0);
    run(d, inp, lv);
    expect(d.index).toBe(1);
  });

  it('o sola a los 4 s; y sin compañero no lo espera', () => {
    const d = new CoopDialogue(game, lines);
    const inp = fakeInput();
    run(d, inp, level(), Math.round((COOP.DIALOGUE_AUTO + 0.3) / DT));
    expect(d.index).toBe(1);
    const s = new CoopDialogue(game, lines, { solo: true });
    run(s, inp, level(), 20);
    inp.tap('confirm');
    run(s, inp, level());
    expect(s.index).toBe(1);
  });

  it('para saltar, los dos mantienen Esc', () => {
    let skipped = false;
    const d = new CoopDialogue(game, lines, { onSkip: () => (skipped = true) });
    const inp = fakeInput();
    const lv = level();
    run(d, inp, lv, 10);
    inp.hold('pause');
    run(d, inp, lv, Math.round((COOP.SKIP_HOLD + 0.2) / DT));
    expect(skipped).toBe(false); // solo uno
    d.partnerHold = true;
    run(d, inp, lv, Math.round((COOP.SKIP_HOLD * 0.6) / DT));
    expect(skipped).toBe(true);
  });
});

describe('Mapa de conexiones', () => {
  it('las flechas llevan al nodo de ese lado', () => {
    const idx = (id) => MAP_NODES.findIndex((n) => n.id === id);
    expect(nextNode(idx('c1'), 1, 0)).toBe(idx('c2'));
    expect(nextNode(idx('c2'), 0, 1)).toBe(idx('c4'));
    expect(nextNode(idx('c1'), 0, 1)).toBe(idx('prologue'));
    expect(nextNode(idx('c3'), 0, 1)).toBe(idx('lab'));
  });
});
