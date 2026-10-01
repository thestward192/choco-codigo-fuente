import { describe, it, expect } from 'vitest';
import { level1Sections, L1_CHECKPOINTS, L1_LEGEND } from '../src/levels/level1_cartucho/maps.js';
import { buildRoom, ROOM } from '../src/levels/level0_prologo/roomMap.js';
import { buildLoading, LOAD } from '../src/levels/level0_prologo/loadingMap.js';
import { Tilemap, T } from '../src/systems/tilemap.js';
import { createBody, createJumpState, stepPlatformer } from '../src/systems/physics.js';
import { MapBuilder } from '../src/levels/mapBuilder.js';
import { TEXTS, DIALOGUES } from '../src/data/dialogues.js';
import { PLATFORMER } from '../src/config/balance.js';

const TS = 16;

describe('Mapas del Mundo Cartucho', () => {
  const S = level1Sections();

  it('todas las filas tienen el mismo ancho', () => {
    for (const [id, s] of Object.entries(S)) {
      const w = s.rows[0].length;
      for (const r of s.rows) expect(r.length, id).toBe(w);
    }
  });

  it('hay exactamente 3 Y doradas (pradera, sala secreta, castillo)', () => {
    const count = (id) => new Tilemap(S[id].rows, L1_LEGEND).find('Y').length;
    expect(count('A')).toBe(1);
    expect(count('secret')).toBe(1);
    expect(count('C')).toBe(1);
    expect(count('B') + count('arena')).toBe(0);
  });

  it('los checkpoints del mapa coinciden con la lista (1 en cuevas, 2 en el castillo)', () => {
    for (const sec of ['B', 'C']) {
      const n = new Tilemap(S[sec].rows, L1_LEGEND).find('!').length;
      expect(n).toBe(L1_CHECKPOINTS.filter((c) => c.section === sec).length);
    }
  });

  it('las tuberías de entrada y salida existen donde dicen los datos', () => {
    const pipeAt = (sec, x, top) => {
      const m = new Tilemap(S[sec].rows, L1_LEGEND);
      return m.charAt(x, top) === '{' && m.charAt(x + 1, top) === '}';
    };
    expect(pipeAt('A', S.A.exit.x, S.A.exit.top)).toBe(true);
    expect(pipeAt('B', S.B.entry.x, S.B.entry.top)).toBe(true);
    expect(pipeAt('B', S.B.secretPipe.x, S.B.secretPipe.top)).toBe(true);
    expect(pipeAt('secret', S.secret.exit.x, S.secret.exit.top)).toBe(true);
  });

  it('la escalera secreta de 1-A está hecha de bloques invisibles', () => {
    const m = new Tilemap(S.A.rows, L1_LEGEND);
    for (const [x, y] of S.A.hiddenChain) expect(m.typeAt(x, y)).toBe(T.HIDDEN);
    // El bit suelto marca el punto sospechoso, justo debajo del primero
    const [fx, fy] = S.A.hiddenChain[0];
    expect(m.charAt(fx, fy + 1)).toBe('$');
  });

  it('la Y del castillo está escondida detrás de bloques agrietados', () => {
    const m = new Tilemap(S.C.rows, L1_LEGEND);
    const [cx, cy] = S.C.hiddenRoom.crack;
    expect(m.charAt(cx, cy)).toBe('K');
    const y = m.find('Y')[0];
    expect(S.C.hiddenRoom.tiles.some(([x, yy]) => x === y.tx && yy === y.ty)).toBe(true);
  });

  it('los rótulos del mundo no tienen la letra Y (se la llevó N.U.L.L.)', () => {
    for (const [key, text] of Object.entries(TEXTS.level1.signs)) {
      expect(/[yY]/.test(text), key).toBe(false);
      expect(text.includes('_'), key).toBe(true);
    }
    for (const s of Object.values(S)) for (const sg of s.signs || []) expect(TEXTS.level1.signs[sg.key]).toBeTruthy();
  });

  it('existen los diálogos del rescate de Óscar', () => {
    expect(DIALOGUES.oscarRescue.length).toBeGreaterThan(3);
    expect(DIALOGUES.oscarRescue[0].who).toBe('oscar');
  });
});

describe('Mapas del prólogo', () => {
  it('el cuarto: escalones de 1-2 tiles hasta el mueble de la tele', () => {
    const m = new Tilemap(buildRoom());
    const R = ROOM;
    expect(R.floor - R.stool.top).toBe(1);
    expect(R.stool.top - R.bed.top).toBe(1);
    expect(R.bed.top - R.headboard.top).toBe(2);
    expect(R.headboard.top - R.cabinet.top).toBe(2);
    expect(m.typeAt(R.cabinet.x, R.cabinet.top)).toBe(T.SOLID);
  });

  it('Pantalla de Carga: el muro agrietado bloquea todo el paso', () => {
    const m = new Tilemap(buildLoading());
    for (let y = 0; y <= LOAD.wall.bottom; y++) expect(m.isSolid(LOAD.wall.x, y), `fila ${y}`).toBe(true);
    expect(m.charAt(LOAD.wall.x, LOAD.wall.bottom)).toBe('K');
  });
});

// Simula a Choco con la física real para comprobar las distancias de diseño
function simulateJump(rows, start, { dir = 1, hold = 1, frames = 90, legend = undefined } = {}) {
  const map = new Tilemap(rows, legend);
  const body = createBody(start.x - PLATFORMER.HITBOX_W / 2, start.y - PLATFORMER.HITBOX_H, PLATFORMER.HITBOX_W, PLATFORMER.HITBOX_H);
  const js = createJumpState();
  body.onGround = true;
  let landed = null;
  for (let i = 0; i < frames; i++) {
    const ev = stepPlatformer(body, js, { moveX: dir, jumpBuffered: i === 0, jumpHeld: i < hold * 60, down: false }, 1 / 60, map);
    if (i > 2 && ev.landed) {
      landed = { x: body.x + body.w / 2, y: body.y + body.h };
      break;
    }
  }
  return landed;
}

describe('Alcance del salto (base del diseño de niveles)', () => {
  it('sube a una plataforma 2 tiles más alta pasando un hueco de 1 tile', () => {
    const b = new MapBuilder(12, 10);
    b.fill(0, 8, 2, 9, '#');
    b.fill(4, 6, 8, 9, '#');
    const land = simulateJump(b.toRows(), { x: 2 * TS + 8, y: 8 * TS });
    expect(land).not.toBeNull();
    expect(land.y).toBe(6 * TS);
  });

  it('cruza un hueco de 3 tiles al mismo nivel', () => {
    const b = new MapBuilder(14, 10);
    b.fill(0, 8, 3, 9, '#');
    b.fill(7, 8, 13, 9, '#');
    const land = simulateJump(b.toRows(), { x: 3 * TS + 12, y: 8 * TS });
    expect(land).not.toBeNull();
    expect(land.x).toBeGreaterThan(7 * TS);
  });

  it('primera fila de bloques Y de la pradera: se pasa por debajo, se golpea y se sube desde el escalón', () => {
    const rows = level1Sections().A.rows;
    const m = new Tilemap(rows, L1_LEGEND);
    const row = m.find('C')[0].ty;
    expect(12 - row).toBe(3); // 2 tiles libres debajo: Choco (20 px) pasa caminando
    expect(m.typeAt(10, 11)).toBe(T.SOLID); // escalón
    // Desde el escalón, saltando hacia la derecha, cae encima de la fila
    const land = simulateJump(rows, { x: 10 * TS + 8, y: 11 * TS }, { frames: 120, legend: L1_LEGEND });
    expect(land).not.toBeNull();
    expect(land.y).toBe(row * TS);
    // El bloque Y de arriba queda al alcance desde encima de la fila
    const upper = m.find('Q').find((q) => q.ty < row);
    expect(row - (upper.ty + 1)).toBeLessThanOrEqual(3);
  });

  it('no llega a una plataforma 4 tiles más alta (sin botas)', () => {
    const b = new MapBuilder(10, 10);
    b.fill(0, 9, 9, 9, '#');
    b.fill(4, 5, 9, 5, '#');
    const land = simulateJump(b.toRows(), { x: 2 * TS + 8, y: 9 * TS });
    expect(land === null || land.y === 9 * TS).toBe(true);
  });
});
