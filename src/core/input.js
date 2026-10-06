// Input: teclado + gamepad, acciones abstractas, buffer de pulsaciones y remapeo.
import { ACTIONS, DEFAULT_KEYS, DEFAULT_PAD, PREVENT_DEFAULT } from '../config/controls.js';
import { INPUT } from '../config/balance.js';

export class Input {
  constructor(target = window) {
    this.keys = structuredClone(DEFAULT_KEYS);
    this.pad = structuredClone(DEFAULT_PAD);
    this.keyDown = new Set();
    this.latchedPress = new Set(); // teclas presionadas entre pasos (toques muy cortos)
    this.latchedRelease = new Set();
    this.state = {};
    for (const a of ACTIONS) {
      this.state[a] = { down: false, pressed: false, released: false, buffer: 0, heldTime: 0 };
    }
    this.axisX = 0;
    this.axisY = 0;
    this.anyPressed = false;
    this.anyKeyLatched = false;
    this.lastDevice = 'keyboard';
    this.padConnected = false;
    this.listeners = [];
    this.captureCallback = null; // para reasignar controles
    this.enabled = true;

    this._onKeyDown = (e) => {
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (this.captureCallback) {
        e.preventDefault();
        const cb = this.captureCallback;
        this.captureCallback = null;
        cb(e.code);
        return;
      }
      if (e.repeat) return;
      this.lastDevice = 'keyboard';
      this.keyDown.add(e.code);
      this.latchedPress.add(e.code);
      this.anyKeyLatched = true;
      for (const l of this.listeners) l(e.code);
    };
    this._onKeyUp = (e) => {
      this.keyDown.delete(e.code);
      this.latchedRelease.add(e.code);
    };
    this._onBlur = () => {
      this.keyDown.clear();
    };
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('gamepadconnected', () => (this.padConnected = true));
    window.addEventListener('gamepaddisconnected', () => (this.padConnected = false));
    // Mouse/touch también desbloquean el audio en la pantalla inicial
    target.addEventListener('pointerdown', () => {
      this.anyKeyLatched = true;
    });
  }

  onKey(fn) {
    this.listeners.push(fn);
  }

  // Captura la siguiente tecla (para la pantalla de controles).
  captureNextKey(cb) {
    this.captureCallback = cb;
  }

  setBindings(keys) {
    if (keys) this.keys = { ...structuredClone(DEFAULT_KEYS), ...structuredClone(keys) };
  }

  // Asigna `code` a la acción. Devuelve las acciones en conflicto (que ya usaban esa tecla).
  rebind(action, code, slot = 0) {
    const conflicts = [];
    for (const a of ACTIONS) {
      if (a !== action && this.keys[a].includes(code)) conflicts.push(a);
    }
    const list = this.keys[action];
    list[slot] = code;
    return conflicts;
  }

  _padButtons() {
    const pressed = new Set();
    let ax = 0;
    let ay = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      gp.buttons.forEach((b, i) => {
        if (b.pressed || b.value > 0.5) pressed.add(i);
      });
      const x = gp.axes[0] ?? 0;
      const y = gp.axes[1] ?? 0;
      if (Math.abs(x) > INPUT.STICK_DEADZONE) ax = x;
      if (Math.abs(y) > INPUT.STICK_DEADZONE) ay = y;
    }
    return { pressed, ax, ay };
  }

  // Se llama una vez por paso fijo.
  update(dt) {
    const pad = this._padButtons();
    if (pad.pressed.size > 0 || pad.ax || pad.ay) this.lastDevice = 'gamepad';
    this.axisX = pad.ax;
    this.axisY = pad.ay;
    // Cualquier botón nuevo del gamepad también cuenta (pantalla "Presioná cualquier tecla")
    let padNew = false;
    for (const b of pad.pressed) if (!this._padPrev?.has(b)) padNew = true;
    this._padPrev = pad.pressed;
    this.anyPressed = this.anyKeyLatched || padNew;
    this.anyKeyLatched = false;

    for (const a of ACTIONS) {
      const s = this.state[a];
      const keys = this.keys[a];
      let down = false;
      let latchedP = false;
      let latchedR = false;
      for (const k of keys) {
        if (this.keyDown.has(k)) down = true;
        if (this.latchedPress.has(k)) latchedP = true;
        if (this.latchedRelease.has(k)) latchedR = true;
      }
      for (const b of this.pad[a]) if (pad.pressed.has(b)) down = true;
      // Stick como direcciones
      if (a === 'left' && pad.ax < 0) down = true;
      if (a === 'right' && pad.ax > 0) down = true;
      if (a === 'up' && pad.ay < 0) down = true;
      if (a === 'down' && pad.ay > 0) down = true;

      const wasDown = s.down;
      s.pressed = (down && !wasDown) || latchedP;
      s.released = (!down && wasDown) || (latchedR && !down);
      if (s.pressed && !wasDown && !down) s.released = true; // toque completo entre pasos
      if (s.pressed && !this.anyPressed) this.anyPressed = true;
      s.down = down;
      s.heldTime = down ? s.heldTime + dt : 0;
      if (s.pressed) s.buffer = INPUT.BUFFER;
      else s.buffer = Math.max(0, s.buffer - dt);
    }
    this.latchedPress.clear();
    this.latchedRelease.clear();
  }

  down(a) {
    return this.enabled && this.state[a].down;
  }
  pressed(a) {
    return this.enabled && this.state[a].pressed;
  }
  released(a) {
    return this.enabled && this.state[a].released;
  }
  held(a) {
    return this.enabled ? this.state[a].heldTime : 0;
  }
  // ¿Hubo una pulsación en los últimos INPUT.BUFFER segundos que no se consumió?
  buffered(a) {
    return this.enabled && this.state[a].buffer > 0;
  }
  consume(a) {
    this.state[a].buffer = 0;
    this.state[a].pressed = false;
  }
  // Dirección horizontal -1, 0, 1
  moveX() {
    if (!this.enabled) return 0;
    return (this.state.right.down ? 1 : 0) - (this.state.left.down ? 1 : 0);
  }
  moveY() {
    if (!this.enabled) return 0;
    return (this.state.down.down ? 1 : 0) - (this.state.up.down ? 1 : 0);
  }

  // Nombre legible de la primera tecla asignada a una acción.
  keyName(action) {
    return prettyKey(this.keys[action][0]);
  }
}

export function prettyKey(code) {
  if (!code) return '—';
  const map = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'ESPACIO',
    Escape: 'ESC',
    Enter: 'ENTER',
    ShiftLeft: 'SHIFT',
    ShiftRight: 'SHIFT',
    Backspace: 'BORRAR',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.toUpperCase();
}
