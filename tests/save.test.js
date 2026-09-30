import { describe, it, expect } from 'vitest';
import { SafeStorage, SaveSystem, defaultSlot, defaultOptions, migrate, SAVE_PREFIX } from '../src/core/save.js';

// Storage en memoria que imita localStorage
function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

describe('Guardado', () => {
  it('guarda y carga una ranura con la clave del documento', () => {
    const backend = memoryBackend();
    const save = new SaveSystem(new SafeStorage(() => backend));
    const slot = { ...defaultSlot(), founders: ['oscar'], items: ['staff', 'boots'], deaths: 7 };
    expect(save.saveSlot(1, slot)).toBe(true);
    expect(backend._map.has(`${SAVE_PREFIX}slot1`)).toBe(true);
    const loaded = save.loadSlot(1);
    expect(loaded.founders).toEqual(['oscar']);
    expect(loaded.items).toEqual(['staff', 'boots']);
    expect(loaded.deaths).toBe(7);
    expect(save.loadSlot(0)).toBeNull();
  });

  it('si localStorage no existe o tira error, sigue funcionando en memoria', () => {
    const save = new SaveSystem(
      new SafeStorage(() => {
        throw new Error('SecurityError');
      }),
    );
    expect(save.canPersist).toBe(false);
    expect(save.saveSlot(0, defaultSlot())).toBe(false);
    expect(save.loadSlot(0)).not.toBeNull(); // quedó en memoria
  });

  it('si setItem falla a medio juego (cuota llena), no rompe', () => {
    const backend = memoryBackend();
    const storage = new SafeStorage(() => backend);
    backend.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const save = new SaveSystem(storage);
    expect(() => save.saveSlot(2, defaultSlot())).not.toThrow();
    expect(save.canPersist).toBe(false);
    expect(save.loadSlot(2)).not.toBeNull();
  });

  it('ignora datos corruptos', () => {
    const backend = memoryBackend();
    backend.setItem(`${SAVE_PREFIX}slot0`, '{no es json');
    const save = new SaveSystem(new SafeStorage(() => backend));
    expect(save.loadSlot(0)).toBeNull();
    expect(save.loadOptions()).toEqual(defaultOptions());
  });

  it('migra datos viejos agregando campos nuevos', () => {
    const old = { levelsCompleted: [0, 1], volume: undefined };
    const m = migrate(old, defaultSlot());
    expect(m.levelsCompleted).toEqual([0, 1]);
    expect(m.goldenY).toEqual({});
    const opts = migrate({ volume: { music: 3 } }, defaultOptions());
    expect(opts.volume).toEqual({ ...defaultOptions().volume, music: 3 });
  });

  it('borra una ranura', () => {
    const backend = memoryBackend();
    const save = new SaveSystem(new SafeStorage(() => backend));
    save.saveSlot(0, defaultSlot());
    save.deleteSlot(0);
    expect(save.loadSlot(0)).toBeNull();
  });
});
