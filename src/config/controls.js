// Mapeo de controles por defecto — docs/03_mecanicas.md
// Teclado: se usan KeyboardEvent.code (independiente del idioma del teclado).
// Gamepad: índices del "standard mapping" de la Gamepad API.

export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'shoot',
  'shield',
  'lasso',
  'debug',
  'interact',
  'pause',
  'sneak',
  'confirm',
  'cancel',
  'skip',
  'erase',
  'signal',
];

export const DEFAULT_KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ'],
  shoot: ['KeyX', 'KeyJ'],
  shield: ['KeyC', 'KeyK'],
  lasso: ['KeyV', 'KeyL'],
  debug: ['KeyQ', 'KeyU'],
  interact: ['KeyE'],
  pause: ['Escape', 'KeyP', 'Enter'],
  sneak: ['ShiftLeft', 'ShiftRight'],
  // Menús
  confirm: ['Space', 'KeyZ', 'Enter'],
  cancel: ['Escape', 'KeyX', 'Backspace'],
  // Saltar cinemáticas (mantener 1 s). No se reasigna.
  skip: ['Escape'],
  // Borrar una ranura en los menús
  erase: ['Delete', 'KeyC'],
  // Modo Sincronizado: marcador "¡Aquí!" para el compañero
  signal: ['KeyT'],
};

// Botones del gamepad (standard mapping)
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
};

export const DEFAULT_PAD = {
  left: [PAD.LEFT],
  right: [PAD.RIGHT],
  up: [PAD.UP],
  down: [PAD.DOWN],
  jump: [PAD.A],
  shoot: [PAD.X],
  shield: [PAD.B],
  lasso: [PAD.RB],
  debug: [PAD.LB],
  interact: [PAD.Y],
  pause: [PAD.START],
  sneak: [PAD.RT],
  confirm: [PAD.A],
  cancel: [PAD.B],
  skip: [PAD.START],
  erase: [PAD.Y],
  signal: [PAD.BACK],
};

// Teclas que no deben hacer scroll ni acciones del navegador
export const PREVENT_DEFAULT = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
  'Tab',
  'Backspace',
  'Delete',
]);

// Acciones que aparecen en la pantalla de controles (las de menú no se reasignan)
export const REMAPPABLE = ['left', 'right', 'up', 'down', 'jump', 'shoot', 'shield', 'lasso', 'debug', 'interact', 'pause', 'sneak', 'signal'];

// Filas de la pantalla de controles: el modo solo no muestra la Señal; el cooperativo no usa el sigilo.
export const CONTROL_ROWS = {
  solo: REMAPPABLE.filter((a) => a !== 'signal'),
  coop: REMAPPABLE.filter((a) => a !== 'sneak'),
};

// Asigna `code` a la ranura `slot` de `action`. Si otra acción remapeable ya la usaba,
// intercambia: esa acción recibe la tecla que tenía `action` en esa ranura.
// Devuelve { keys (copia nueva), swappedWith (acción o null) }.
export function assignKey(keys, action, slot, code) {
  const out = {};
  for (const k of Object.keys(keys)) out[k] = [...keys[k]];
  const previous = out[action][slot] ?? null;
  let swappedWith = null;
  for (const other of REMAPPABLE) {
    if (other === action) continue;
    const i = out[other].indexOf(code);
    if (i >= 0) {
      swappedWith = other;
      if (previous) out[other][i] = previous;
      else out[other].splice(i, 1);
    }
  }
  // Evitar duplicado dentro de la misma acción
  const dup = out[action].indexOf(code);
  if (dup >= 0 && dup !== slot) out[action][dup] = previous;
  out[action][slot] = code;
  out[action] = out[action].filter(Boolean);
  return { keys: out, swappedWith };
}
