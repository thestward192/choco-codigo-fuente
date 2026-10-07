import { describe, it, expect } from 'vitest';
import { LASSO, PLATFORMER, SCREEN, NULL_BOSS, PATCH, HOTFIX, SHIELD } from '../src/config/balance.js';
import { nodeInReach, createSwing, swingStep, releaseVelocity, pickNode } from '../src/systems/lasso.js';
import { createBody, createJumpState, stepPlatformer } from '../src/systems/physics.js';
import { level5Sections, CODE_LEGEND, L5_CHECKPOINTS, GOLDEN_INDEX } from '../src/levels/level5_codigo/maps.js';
import { phaseHp, nullBar, phase1Pattern, phase1Waves, nullCanDamage, laserDistance, coreHookable, shuffleSlots } from '../src/entities/bosses/null.js';
import { Bullet, Firewall } from '../src/entities/enemies/codigo.js';
import { createShield, shieldPress } from '../src/systems/shield.js';
import { createPatch, patchInput, patchUpdate } from '../src/systems/patch.js';
import { newGameData, completeLevel, hotfixSkips, setHotfix } from '../src/game/progress.js';
import { brokenSigns, fixSign } from '../src/game/ending.js';
import { createRng } from '../src/core/rng.js';
import { Tilemap, T } from '../src/systems/tilemap.js';
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';
import { parseTrack, trackLength } from '../src/core/audio.js';
import { SONG_STACK, SONG_NULL_FINAL, SONG_FINAL, NULL_LAYERS } from '../src/audio/songs/codigo.js';

const TS = SCREEN.TILE;
const STEP = 1 / 60;

describe('Mapas del Código Puro', () => {
  const S = level5Sections();
  const tm = (id) => new Tilemap(S[id].rows, CODE_LEGEND);

  it('todas las filas tienen el mismo ancho (una pantalla: 20 tiles)', () => {
    for (const [id, s] of Object.entries(S)) {
      for (const r of s.rows) expect(r.length, id).toBe(20);
    }
  });

  it('El Stack mide unas 14 pantallas en total', () => {
    const rows = ['A', 'B', 'C', 'D', 'E'].reduce((n, id) => n + S[id].rows.length, 0);
    const screens = (rows * TS) / SCREEN.H;
    expect(screens).toBeGreaterThan(12);
    expect(screens).toBeLessThan(16);
  });

  it('3 Y doradas: en las secciones 2, 3 y 5', () => {
    for (const [id, gi] of Object.entries(GOLDEN_INDEX)) expect(tm(id).find('Y').length, id).toBe(1);
    expect(Object.keys(GOLDEN_INDEX).sort()).toEqual(['B', 'C', 'E']);
    for (const id of ['A', 'D', 'arena']) expect(tm(id).find('Y').length, id).toBe(0);
  });

  it('checkpoints: al inicio, después de la sección 3 y antes del jefe', () => {
    for (const sec of ['A', 'D', 'E']) expect(tm(sec).find('!').length, sec).toBe(L5_CHECKPOINTS.filter((c) => c.section === sec).length);
    expect(L5_CHECKPOINTS.map((c) => c.section)).toEqual(['A', 'D', 'E']);
    // El de 5-E está arriba, en la cornisa de salida hacia el jefe
    expect(tm('E').find('!')[0].ty).toBeLessThan(5);
  });

  it('cada sección del Stack tiene su salida en la pared derecha, sobre la cornisa', () => {
    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      const m = tm(id);
      const d = S[id].exitDoor;
      expect(m.isSolid(d.x, d.row), id).toBe(false);
      expect(m.isSolid(d.x - 1, d.row + 1) || m.isOneWay(d.x - 1, d.row + 1), id).toBe(true);
    }
  });

  // Plataformas (tiles pisables + las del Push + los Segmentos) y búsqueda por anchura desde el suelo
  function climbable(id, { unlock = true } = {}) {
    const m = tm(id);
    const s = S[id];
    const plats = [];
    for (let ty = 2; ty < m.h - 2; ty++) {
      let start = -1;
      for (let tx = 2; tx <= 18; tx++) {
        const ch = m.charAt(tx, ty);
        const t = m.typeAt(tx, ty);
        const ok = tx < 18 && (t === T.SOLID || t === T.ONEWAY || t === T.GHOST) && (unlock || ch !== 'L') && ch !== 'L' && m.typeAt(tx, ty - 1) !== T.SOLID;
        if (ok && start < 0) start = tx;
        if (!ok && start >= 0) {
          plats.push({ x0: start, x1: tx - 1, y: ty });
          start = -1;
        }
      }
    }
    for (const p of s.push || []) plats.push({ x0: p.x0, x1: p.x1, y: p.row });
    for (const g of s.segments || []) plats.push({ x0: g.x, x1: g.x + g.w - 1, y: g.y });
    const ground = { x0: 2, x1: 17, y: s.floor };
    const seen = new Set([ground]);
    const queue = [ground];
    while (queue.length) {
      const p = queue.shift();
      for (const q of plats) {
        if (seen.has(q)) continue;
        const up = p.y - q.y;
        const gap = Math.max(0, q.x0 - p.x1 - 1, p.x0 - q.x1 - 1);
        if (up <= 5 && up >= -14 && gap <= (up >= 3 ? 3 : 5)) {
          seen.add(q);
          queue.push(q);
        }
      }
    }
    const top = plats.find((p) => p.y === 4 && p.x0 <= s.exitDoor.x - 2 && p.x1 >= s.exitDoor.x - 2);
    return { top, seen, plats };
  }

  it('5-A, 5-B (con los candados abiertos), 5-C y 5-E se pueden escalar hasta la salida', () => {
    for (const id of ['A', 'B', 'C', 'E']) {
      const { top, seen } = climbable(id);
      expect(top, id).toBeTruthy();
      expect(seen.has(top), id).toBe(true);
    }
  });

  it('el Push exige el doble salto: cada plataforma está 4 o 5 filas más arriba que la anterior', () => {
    const s = S.A;
    let prev = s.floor;
    for (const p of s.push) {
      expect(prev - p.row).toBeGreaterThanOrEqual(4);
      expect(prev - p.row).toBeLessThanOrEqual(5);
      prev = p.row;
    }
    // Y nada más llega tan arriba: sin el Push no hay camino
    const m = tm('A');
    for (let ty = 5; ty < s.floor; ty++) for (let tx = 2; tx < 18; tx++) expect(m.typeAt(tx, ty) === T.SOLID || m.typeAt(tx, ty) === T.ONEWAY, `${tx},${ty}`).toBe(false);
  });

  it('las capas de fuego tapan todo el ancho del camino y se cruzan con un doble salto (≤ 4 filas)', () => {
    for (const id of ['B', 'E']) {
      const m = tm(id);
      for (const f of S[id].firewalls) {
        let below = null;
        let above = null;
        for (let ty = f.row + 1; ty < m.h && below === null; ty++) for (let tx = f.x0; tx <= f.x1; tx++) if (m.isOneWay(tx, ty) || m.isSolid(tx, ty)) below = ty;
        for (let ty = f.row - 1; ty > 0 && above === null; ty--) for (let tx = f.x0; tx <= f.x1; tx++) if (m.isOneWay(tx, ty)) above = ty;
        expect(below - above, `${id} fila ${f.row}`).toBeLessThanOrEqual(4);
        // Parado abajo no se toca el fuego (la cabeza queda debajo)
        expect(below * TS - PLATFORMER.HITBOX_H, `${id} fila ${f.row}`).toBeGreaterThan(f.row * TS + TS - 2);
      }
    }
  });

  it('el candado 1 tapa el pozo de pared a pared y lo abre una torreta', () => {
    const m = tm('B');
    const t = S.B.turrets[0];
    for (let tx = 2; tx <= 17; tx++) expect(m.charAt(tx, t.lock.y0)).toBe('L');
  });

  it('5-D Punteros: sin lazo no se llega (las cornisas están lejos) y cada nodo queda al alcance', () => {
    const m = tm('D');
    const { seen, plats } = climbable('D');
    const ledges = plats.filter((p) => p.y < S.D.floor && p.y > 4).sort((a, b) => b.y - a.y);
    // Desde el suelo se llega a la primera cornisa, pero no a la segunda (está al otro lado del pozo)
    expect(seen.has(ledges[0])).toBe(true);
    const gapX = Math.max(ledges[1].x0 - ledges[0].x1 - 1, ledges[0].x0 - ledges[1].x1 - 1);
    expect(gapX).toBeGreaterThanOrEqual(7);
    const nodes = m.find('n').map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8 }));
    for (let i = 0; i < ledges.length - 2; i++) {
      const L = ledges[i];
      const right = L.x0 > 8;
      const hand = { x: right ? L.x0 * TS + 6 : (L.x1 + 1) * TS - 6, y: L.y * TS + LASSO.HAND_Y };
      const n = pickNode(nodes, hand, right ? -1 : 1);
      expect(n, `cornisa ${i}`).toBeTruthy();
    }
  });

  // El columpio con la física real: engancha corriendo desde el borde, bombea y suelta subiendo
  function swingAcross(map, from, node, target, dir, floorY = Infinity) {
    for (const rel of [10, 20, 30, 40, 50]) {
      for (const dj of [-1, 8, 16, 24]) {
        const s = createSwing(node, from.x, from.y, dir * PLATFORMER.MAX_SPEED, 0);
        let r = null;
        let grounded = false;
        for (let i = 0; i < 900 && !r && !grounded; i++) {
          swingStep(s, STEP, { moveX: Math.sign(s.vx) || dir });
          // Colgado, si toca el piso del pozo se suelta sin impulso: no vale
          grounded = s.py - LASSO.HAND_Y >= floorY;
          if ((s.px - node.x) * dir > rel && s.vx * dir > 0 && s.vy < 0) r = releaseVelocity(s);
        }
        if (!r || grounded) continue;
        const body = createBody(s.px - 5, s.py - LASSO.HAND_Y - 20, 10, 20);
        body.vx = r.vx;
        body.vy = r.vy;
        const js = createJumpState();
        js.hasBoots = true;
        js.canDoubleJump = true;
        for (let i = 0; i < 300; i++) {
          const ev = stepPlatformer(body, js, { moveX: Math.sign(target.x - (body.x + 5)), jumpBuffered: i === dj, jumpHeld: i >= dj && i < dj + 20, keepMomentum: i < LASSO.KEEP_MOMENTUM * 60 }, STEP, map);
          if (ev.landed) {
            if (body.y + 20 === target.y) return true;
            break;
          }
        }
      }
    }
    return false;
  }

  it('5-D: de cada cornisa se cruza a la siguiente columpiándose', () => {
    const map = tm('D');
    const { plats } = climbable('D');
    const ledges = plats.filter((p) => p.y < S.D.floor && p.y > 4).sort((a, b) => b.y - a.y);
    const nodes = map.find('n').map(({ tx, ty }) => ({ x: tx * TS + 8, y: ty * TS + 8 }));
    for (let i = 0; i < ledges.length - 1; i++) {
      const L = ledges[i];
      const N = ledges[i + 1];
      const dir = N.x0 > L.x0 ? 1 : -1;
      const from = { x: dir > 0 ? (L.x1 + 1) * TS - 6 : L.x0 * TS + 6, y: L.y * TS + LASSO.HAND_Y };
      const node = pickNode(nodes, from, dir);
      const target = { x: ((N.x0 + N.x1 + 1) / 2) * TS, y: N.y * TS };
      expect(swingAcross(map, from, node, target, dir, S.D.floor * TS), `cornisa ${i} → ${i + 1}`).toBe(true);
    }
  });

  it('la arena es una pantalla con suelo, 3 plataformas y los nodos de la fase 4', () => {
    const m = tm('arena');
    expect(m.pxW).toBe(SCREEN.W);
    let plats = 0;
    for (let ty = 0; ty < S.arena.floor; ty++) {
      let run = false;
      for (let tx = 0; tx < m.w; tx++) {
        const one = m.isOneWay(tx, ty);
        if (one && !run) plats++;
        run = one;
      }
    }
    expect(plats).toBe(3);
    expect(m.find('n').length).toBeGreaterThanOrEqual(4);
    expect(S.arena.smallPlatforms.length).toBe(2);
  });
});

describe('N.U.L.L.', () => {
  it('cada fase tiene su vida: 6 de daño, 4 reflejos, 8 golpes, 3 jalones', () => {
    expect([1, 2, 3, 4].map(phaseHp)).toEqual([6, 4, 8, 3]);
    expect(nullBar(1, 6)).toBe(1);
    expect(nullBar(2, 4)).toBe(0.75);
    expect(nullBar(4, 0)).toBe(0);
  });

  it('la fase 1 sube de dificultad: sencillas, dobles, pilares, triples y de dos alturas', () => {
    const seq = [0, 1, 2, 3, 4].map(phase1Pattern);
    expect(seq).toEqual(['single', 'double', 'pillars', 'triple', 'high']);
    for (let i = 5; i < 30; i++) expect(['double', 'triple', 'high', 'pillars']).toContain(phase1Pattern(i));
    expect(phase1Waves('triple').length).toBe(3);
    const hi = phase1Waves('high');
    expect(hi.map((w) => w.kind)).toEqual(['low', 'high']);
  });

  // Choco quieto en x=100; las ondas vienen desde la derecha. ¿Pasa ambas sin tocarlas?
  function survivesHigh(jumpAt, doubleAt = -1) {
    const rows = ['....................', '....................', '....................', '....................', '####################'];
    const map = new Tilemap(rows);
    const floorY = 4 * TS;
    const body = createBody(95, floorY - 20, 10, 20);
    const js = createJumpState();
    js.hasBoots = true;
    stepPlatformer(body, js, { moveX: 0 }, STEP, map);
    const P = NULL_BOSS.P1;
    const start = 100 + 200;
    for (let i = 0; i < 180; i++) {
      const t = i * STEP;
      stepPlatformer(body, js, { moveX: 0, jumpBuffered: i === jumpAt || i === doubleAt, jumpHeld: true }, STEP, map);
      const h = floorY - (body.y + body.h);
      const xl = start - P.WAVE_SPEED * t;
      const xh = start - P.WAVE_SPEED * (t - P.HIGH_DELAY);
      if (Math.abs(xl - 100) < 9 && h < P.WAVE_LOW_H) return false;
      if (t >= P.HIGH_DELAY && Math.abs(xh - 100) < 9 && h < P.WAVE_HIGH[1]) return false;
    }
    return true;
  }

  it('la onda de dos alturas no se pasa con un salto simple, pero sí con el doble salto', () => {
    for (let j = 0; j < 150; j++) expect(survivesHigh(j), `salto en ${j}`).toBe(false);
    let ok = false;
    for (let j = 60; j < 150 && !ok; j++) for (let d = j + 5; d < j + 50 && !ok; d++) ok = survivesHigh(j, d);
    expect(ok).toBe(true);
  });

  it('a quién y cuándo le hace daño un disparo', () => {
    expect(nullCanDamage({ phase: 1, state: 'window' })).toBe(true);
    expect(nullCanDamage({ phase: 1, state: 'hover' })).toBe(false);
    expect(nullCanDamage({ phase: 2, state: 'emit' })).toBe(false);
    expect(nullCanDamage({ phase: 3, real: true, debugView: true })).toBe(true);
    expect(nullCanDamage({ phase: 3, real: true, debugView: false })).toBe(false);
    expect(nullCanDamage({ phase: 3, real: false, debugView: true })).toBe(false);
    expect(nullCanDamage({ phase: 4, state: 'exposed', charged: true })).toBe(true);
    expect(nullCanDamage({ phase: 4, state: 'exposed', charged: false })).toBe(false);
    expect(nullCanDamage({ phase: 4, state: 'orbit', charged: true })).toBe(false);
  });

  it('el láser toca lo que está sobre su rayo; el núcleo es enganchable cerca de un nodo', () => {
    expect(laserDistance(0, 0, 0, 100, 50, 3)).toBeCloseTo(3);
    expect(laserDistance(0, 0, Math.PI / 2, 100, 0, 50)).toBeCloseTo(0);
    expect(laserDistance(0, 0, 0, 100, 150, 0)).toBeCloseTo(50);
    const nodes = [{ x: 100, y: 50 }];
    expect(coreHookable({ x: 110, y: 60 }, nodes)).toBe(true);
    expect(coreHookable({ x: 200, y: 60 }, nodes)).toBe(false);
  });

  it('el lazo prefiere el núcleo (algo que se jala) aunque haya un nodo más cerca', () => {
    const hand = { x: 100, y: 100 };
    const near = { x: 110, y: 70 };
    const core = { x: 150, y: 60, pull: true, priority: true };
    expect(pickNode([near, core], hand, 1)).toBe(core);
    expect(pickNode([near, { ...core, disabled: true }], hand, 1)).toBe(near);
  });

  it('las copias se barajan: siempre una permutación', () => {
    const rng = createRng(7);
    for (let i = 0; i < 20; i++) expect([...shuffleSlots(3, rng)].sort()).toEqual([0, 1, 2]);
  });
});

// Escena mínima para las balas y el fuego
function fakeScene({ shieldOn = false } = {}) {
  const map = new Tilemap(['....................', '....................', '....................', '....................', '####################']);
  const noop = () => {};
  const shield = createShield();
  if (shieldOn) shieldPress(shield);
  const choco = {
    body: { x: 95, y: 44, w: 10, h: 20, vx: 0, vy: 0 },
    get cx() {
      return this.body.x + 5;
    },
    get cy() {
      return this.body.y + 10;
    },
    alive: true,
    state: 'play',
    shield,
    invuln: 0,
    hits: 0,
    lasso: null,
    detachLasso: noop,
    hurt(x, o = {}) {
      this.hits++;
      return true;
    },
  };
  return { map, choco, particles: { spawn: noop, burst: noop }, game: { audio: null, effects: { shake: noop, hitstop: noop, flash: noop } }, hazards: [] };
}

describe('Excepciones y Firewall', () => {
  it('una bala reflejable devuelta con parry vuelve a la torreta y la rompe', () => {
    const sc = fakeScene();
    let hit = 0;
    const owner = { x: 20, y: 20, body: { x: 12, y: 12, w: 16, h: 16 }, returnPoint: () => ({ x: 20, y: 20 }), onReflectHit: () => hit++ };
    const b = new Bullet(60, 40, 60, 0, { reflectable: true, owner });
    b.reflect(sc);
    for (let i = 0; i < 120 && !b.dead; i++) b.update(STEP, sc);
    expect(hit).toBe(1);
    // Las normales no vuelven: se deshacen contra el escudo
    const n = new Bullet(60, 40, 60, 0, { owner });
    n.reflect(sc);
    expect(n.dead).toBe(true);
    expect(n.reflected).toBe(false);
  });

  it('el parry funciona dentro de la ventana del escudo (0.15 s)', () => {
    expect(SHIELD.PARRY_WINDOW).toBe(0.15);
  });

  it('sin escudo el fuego empuja hacia atrás y duele; con escudo se cruza', () => {
    const sc = fakeScene();
    const fw = new Firewall(0, 19, 2);
    sc.choco.body.y = 2 * TS + 6; // entrando desde abajo
    fw.update(STEP, sc);
    expect(sc.choco.hits).toBe(1);
    expect(sc.choco.body.y).toBeGreaterThanOrEqual(fw.rect.y + fw.rect.h);
    const sc2 = fakeScene({ shieldOn: true });
    sc2.choco.body.y = 2 * TS + 6;
    fw.update(STEP, sc2);
    expect(sc2.choco.hits).toBe(0);
    expect(sc2.choco.body.y).toBe(2 * TS + 6);
  });
});

describe('El parche', () => {
  const press = (p, seq) => seq.map((d) => patchInput(p, d));

  it('4 líneas de 6 flechas; cada secuencia escribe una línea', () => {
    const p = createPatch(createRng(3));
    expect(p.lines.length).toBe(PATCH.LINES);
    for (const l of p.lines) expect(l.length).toBe(PATCH.ARROWS);
    const r = press(p, p.lines[0]);
    expect(r.at(-1)).toBe('line');
    expect(p.line).toBe(1);
    expect(TEXTS.patch.code.length).toBe(PATCH.LINES);
  });

  it('un error reinicia solo la línea actual', () => {
    const p = createPatch(createRng(4));
    press(p, p.lines[0]);
    patchInput(p, p.lines[1][0]);
    const wrong = ['up', 'down', 'left', 'right'].find((d) => d !== p.lines[1][1]);
    expect(patchInput(p, wrong)).toBe('error');
    expect(p.line).toBe(1);
    expect(p.idx).toBe(0);
  });

  it('las 4 líneas terminan el parche; si se acaba el tiempo (20 s), timeout', () => {
    const p = createPatch(createRng(5));
    for (let i = 0; i < 4; i++) press(p, p.lines[i]);
    expect(p.status).toBe('done');
    const q = createPatch(createRng(6));
    let st;
    for (let i = 0; i < PATCH.TIME * 60 + 2; i++) st = patchUpdate(q, STEP);
    expect(st).toBe('timeout');
  });
});

describe('Final y Modo Hotfix', () => {
  it('terminar el nivel 5 desbloquea el Modo Hotfix', () => {
    const d = newGameData();
    expect(setHotfix(d, true).hotfix).toBe(false);
    const { data } = completeLevel(d, 5, { time: 900, deaths: 3, goldenY: [false, false, false] });
    expect(data.hotfixUnlocked).toBe(true);
    expect(data.items).not.toContain('trophy');
    expect(setHotfix(data, true).hotfix).toBe(true);
  });

  it('Modo Hotfix: 1 cuadrito y la mitad de los checkpoints de cada nivel', () => {
    expect(HOTFIX.MAX_HP).toBe(1);
    expect(hotfixSkips(5, 1)).toBe(true);
    expect(hotfixSkips(5, 2)).toBe(false);
    expect(hotfixSkips(4, 2)).toBe(false); // el de antes del Torito se queda
    expect(hotfixSkips(3, 'servers')).toBe(true);
    const counts = { 1: 3, 2: 2, 3: 5, 4: 4, 5: 3 };
    for (const [id, n] of Object.entries(counts)) {
      const off = HOTFIX.SKIP_CHECKPOINTS[id].length;
      expect(off, `nivel ${id}`).toBeGreaterThanOrEqual(Math.floor(n / 2));
      expect(off, `nivel ${id}`).toBeLessThanOrEqual(Math.ceil(n / 2));
    }
  });

  it('el montaje completa los rótulos: cada hueco vuelve a ser una y', () => {
    const signs = brokenSigns();
    expect(signs.length).toBeGreaterThanOrEqual(6);
    for (const s of signs) {
      expect(s, s).toContain('_');
      expect(fixSign(s)).not.toContain('_');
    }
    expect(fixSign('Ho_ ha_ fiestas.')).toBe('Hoy hay fiestas.');
  });

  it('existen los diálogos de la pelea y del final', () => {
    for (const k of ['level5Intro', 'nullEntry', 'nullPhase1', 'nullPhase2', 'nullPhase3', 'nullPhase4', 'nullWeak', 'nullStable', 'extraScene']) expect(DIALOGUES[k]?.length, k).toBeGreaterThan(0);
    // N.U.L.L. tranquila habla en minúsculas; enojada, en MAYÚSCULAS
    for (const l of DIALOGUES.nullStable.filter((x) => x.who === 'null')) expect(l.text).toBe(l.text.toLowerCase());
    for (const k of ['oscar', 'stward', 'hezron', 'fabiola']) expect(TEXTS.ending.celebrate[k], k).toBeTruthy();
    expect(TEXTS.level5.boss.phases.length).toBe(4);
    expect(TEXTS.level5.boss.hints.length).toBe(4);
  });
});

describe('Música del nivel 5', () => {
  const check = (song) => {
    const lens = song.channels.map((c) => trackLength(parseTrack(c.notes)));
    for (const l of lens) expect(l, song.id).toBe(lens[0]);
  };
  it('todas las pistas de cada canción miden lo mismo', () => {
    check(SONG_STACK);
    check(SONG_NULL_FINAL);
    check(SONG_FINAL);
  });
  it('N.U.L.L. Final tiene 4 capas que se suman fase a fase', () => {
    expect(NULL_LAYERS.length).toBe(4);
    for (const l of NULL_LAYERS) expect(SONG_NULL_FINAL.channels.some((c) => c.layer === l), l).toBe(true);
  });
});

describe('Espacio para pararse en las plataformas', () => {
  it('sobre cada plataforma cabe Choco (los candados no cuentan: se abren)', async () => {
    const sets = [
      [await import('../src/levels/level1_cartucho/maps.js'), 'level1Sections', 'L1_LEGEND'],
      [await import('../src/levels/level4_santacruz/maps.js'), 'level4Sections', 'SC_LEGEND'],
      [{ level5Sections, CODE_LEGEND }, 'level5Sections', 'CODE_LEGEND'],
    ];
    const tight = [];
    for (const [mod, fn, leg] of sets) {
      for (const [id, s] of Object.entries(mod[fn]())) {
        const m = new Tilemap([...s.rows], mod[leg]);
        m.ghostSolid = true;
        for (let y = 1; y < s.rows.length; y++) {
          for (let x = 0; x < s.rows[y].length; x++) {
            if (!'=gf'.includes(s.rows[y][x])) continue;
            let free = 0;
            for (let yy = y - 1; yy >= 0 && (s.rows[yy][x] === 'L' || !m.isSolid(x, yy)); yy--) free += TS;
            if (free < PLATFORMER.HITBOX_H) tight.push(`${fn} ${id} x${x} fila ${y}`);
          }
        }
      }
    }
    expect(tight).toEqual([]);
  });
});
