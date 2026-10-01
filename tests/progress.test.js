import { describe, it, expect } from 'vitest';
import {
  newGameData,
  isUnlocked,
  completeLevel,
  maxHpFor,
  totalGolden,
  goldenCount,
  nextLevel,
  recordAttempt,
  setCheckpoint,
  formatTime,
  isCompleted,
  clearCheckpoint,
} from '../src/game/progress.js';

describe('Progreso de la partida', () => {
  it('partida nueva: con el Báculo y el nivel 1 disponible (prólogo pendiente del Hito 3)', () => {
    const d = newGameData();
    expect(d.items).toEqual(['staff']);
    expect(isUnlocked(d, 1)).toBe(true);
    expect(isUnlocked(d, 2)).toBe(false);
    expect(maxHpFor(d)).toBe(1);
    expect(nextLevel(d)).toBe(1);
  });

  it('completar un nivel desbloquea el siguiente y entrega fundador y objeto', () => {
    const { data, rewards, firstTime, newRecord } = completeLevel(newGameData(), 1, { time: 300, deaths: 4, goldenY: [true, false, false] });
    expect(firstTime).toBe(true);
    expect(newRecord).toBe(true);
    expect(rewards).toEqual({ founder: 'oscar', item: 'boots' });
    expect(data.founders).toEqual(['oscar']);
    expect(data.items).toContain('boots');
    expect(isUnlocked(data, 2)).toBe(true);
    expect(maxHpFor(data)).toBe(2);
    expect(data.deaths).toBe(4);
    expect(nextLevel(data)).toBe(2);
  });

  it('rejugar: acumula Y doradas, guarda el mejor tiempo y no repite recompensas', () => {
    let d = completeLevel(newGameData(), 1, { time: 300, deaths: 0, goldenY: [true, false, false] }).data;
    const r = completeLevel(d, 1, { time: 350, deaths: 1, goldenY: [false, false, true] });
    expect(r.newRecord).toBe(false);
    expect(r.firstTime).toBe(false);
    expect(r.rewards).toEqual({ founder: null, item: null });
    expect(r.data.bestTime[1]).toBe(300);
    expect(goldenCount(r.data, 1)).toBe(2);
    expect(r.data.founders).toEqual(['oscar']);
    d = completeLevel(r.data, 1, { time: 200, deaths: 0, goldenY: [false, true, false] }).data;
    expect(d.bestTime[1]).toBe(200);
    expect(totalGolden(d)).toBe(3);
  });

  it('no modifica los datos originales', () => {
    const d = newGameData();
    completeLevel(d, 1, { time: 1, deaths: 0, goldenY: [] });
    expect(d.levelsCompleted).toEqual([0]);
  });

  it('la barra llega a 5 cuadritos con los 4 fundadores (en orden)', () => {
    let d = newGameData();
    for (const id of [1, 2, 3, 4]) d = completeLevel(d, id, { time: 10, deaths: 0, goldenY: [] }).data;
    expect(d.founders).toEqual(['oscar', 'stward', 'hezron', 'fabiola']);
    expect(maxHpFor(d)).toBe(5);
    expect(d.items).toEqual(['staff', 'boots', 'laptop', 'shield', 'lasso']);
    const end = completeLevel(d, 5, { time: 10, deaths: 0, goldenY: [] }).data;
    expect(end.hotfixUnlocked).toBe(true);
  });

  it('intentos sin terminar y checkpoints', () => {
    const d = recordAttempt(newGameData(), { time: 42, deaths: 3 });
    expect(d.deaths).toBe(3);
    expect(d.totalTime).toBe(42);
    const c = setCheckpoint(d, 2, 4);
    expect(c.checkpoint).toEqual({ level: 2, id: 4 });
    // Completar el nivel borra el checkpoint
    expect(completeLevel(c, 2, { time: 1, deaths: 0, goldenY: [] }).data.checkpoint).toBeNull();
  });

  it('con el prólogo construido: sin objetos y el nivel 1 bloqueado hasta terminarlo', () => {
    const d = newGameData({ prologueBuilt: true });
    expect(d.items).toEqual([]);
    expect(isUnlocked(d, 0)).toBe(true);
    expect(isUnlocked(d, 1)).toBe(false);
    const r = completeLevel(d, 0, { time: 200, deaths: 0, goldenY: [] });
    expect(r.rewards).toEqual({ founder: null, item: 'staff' });
    expect(r.data.items).toEqual(['staff']);
    expect(isCompleted(r.data, 0)).toBe(true);
    expect(isUnlocked(r.data, 1)).toBe(true);
    expect(nextLevel(r.data)).toBe(1);
  });

  it('Game Over olvida el checkpoint (se reintenta desde el inicio)', () => {
    const c = setCheckpoint(newGameData(), 1, 2);
    const d = clearCheckpoint(c);
    expect(d.checkpoint).toBeNull();
    expect(c.checkpoint).toEqual({ level: 1, id: 2 });
  });

  it('formatea tiempos', () => {
    expect(formatTime(65.32)).toBe('1:05.32');
    expect(formatTime(0)).toBe('0:00.00');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(undefined)).toBe('—');
  });
});
