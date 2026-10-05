// Guardado en localStorage. TODO acceso va dentro de try/catch: si falla (modo privado,
// almacenamiento bloqueado), el juego sigue funcionando con un respaldo en memoria.

export const SAVE_PREFIX = 'choco-codigo-fuente:v1:';
export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;

export function defaultSlot() {
  return {
    version: SAVE_VERSION,
    levelsCompleted: [], // ids de nivel completados (0..5)
    founders: [], // 'oscar' | 'stward' | 'hezron' | 'fabiola'
    items: [], // 'staff' | 'boots' | 'laptop' | 'shield' | 'lasso'
    goldenY: {}, // { [levelId]: [bool, bool, bool] }
    bestTime: {}, // { [levelId]: segundos }
    deaths: 0,
    totalTime: 0,
    checkpoint: null, // { level, id }
    lastLevel: null,
    grandmaRecipe: false,
    hotfixUnlocked: false,
    hotfix: false, // Modo Hotfix activo en esta partida (se elige en el menú del mapa)
    updatedAt: 0,
  };
}

export function defaultOptions() {
  return {
    version: SAVE_VERSION,
    volume: { master: 8, music: 7, sfx: 8, voice: 7 }, // 0..10
    fullscreen: false,
    scale: 0, // 0 = automática; 2..6 fija
    crt: false,
    screenShake: true,
    intenseGlitch: true,
    textSpeed: 'normal', // 'slow' | 'normal' | 'instant'
    keys: null, // null = controles por defecto
    devMode: false, // modo desarrolladora: todos los mapas abiertos y vidas infinitas
  };
}

// Envoltorio seguro sobre un backend tipo Storage.
export class SafeStorage {
  constructor(getBackend = () => globalThis.localStorage) {
    this.memory = new Map();
    this.available = false;
    this.warning = null;
    try {
      const b = getBackend();
      const probe = SAVE_PREFIX + '__probe__';
      b.setItem(probe, '1');
      b.removeItem(probe);
      this.backend = b;
      this.available = true;
    } catch (err) {
      this.backend = null;
      this.warning = 'storage-unavailable';
    }
  }

  get(key) {
    if (this.available) {
      try {
        const v = this.backend.getItem(key);
        if (v !== null) return v;
      } catch (err) {
        this._fail();
      }
    }
    return this.memory.has(key) ? this.memory.get(key) : null;
  }

  set(key, value) {
    this.memory.set(key, value);
    if (!this.available) return false;
    try {
      this.backend.setItem(key, value);
      return true;
    } catch (err) {
      this._fail();
      return false;
    }
  }

  remove(key) {
    this.memory.delete(key);
    if (!this.available) return;
    try {
      this.backend.removeItem(key);
    } catch (err) {
      this._fail();
    }
  }

  _fail() {
    this.available = false;
    this.warning = 'storage-unavailable';
  }
}

// Mezcla lo guardado sobre los valores por defecto (tolera campos faltantes o datos viejos).
export function migrate(data, defaults) {
  if (!data || typeof data !== 'object') return defaults;
  const out = { ...defaults };
  for (const k of Object.keys(defaults)) {
    if (!(k in data)) continue;
    const d = defaults[k];
    const v = data[k];
    if (d && typeof d === 'object' && !Array.isArray(d) && v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...d, ...v };
    } else {
      out[k] = v;
    }
  }
  out.version = SAVE_VERSION;
  return out;
}

export function parseJson(str) {
  if (str === null || str === undefined) return null;
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

export class SaveSystem {
  constructor(storage = new SafeStorage()) {
    this.storage = storage;
  }

  get canPersist() {
    return this.storage.available;
  }

  slotKey(n) {
    return `${SAVE_PREFIX}slot${n}`;
  }

  loadSlot(n) {
    const raw = parseJson(this.storage.get(this.slotKey(n)));
    return raw ? migrate(raw, defaultSlot()) : null;
  }

  saveSlot(n, data) {
    const copy = { ...data, version: SAVE_VERSION, updatedAt: Date.now() };
    return this.storage.set(this.slotKey(n), JSON.stringify(copy));
  }

  deleteSlot(n) {
    this.storage.remove(this.slotKey(n));
  }

  listSlots() {
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) out.push(this.loadSlot(i));
    return out;
  }

  loadOptions() {
    const raw = parseJson(this.storage.get(`${SAVE_PREFIX}options`));
    return migrate(raw, defaultOptions());
  }

  saveOptions(opts) {
    return this.storage.set(`${SAVE_PREFIX}options`, JSON.stringify(opts));
  }
}
