// Cámara de plataformas: zona muerta horizontal, look-ahead, suavizado y redondeo a píxel.
import { CAMERA, SCREEN } from '../config/balance.js';
import { damp, clamp } from './tween.js';

export class Camera {
  constructor(w = SCREEN.W, h = SCREEN.H) {
    this.w = w;
    this.h = h;
    this.x = 0;
    this.y = 0;
    this.focusX = 0; // centro deseado
    this.focusY = 0;
    this.lookahead = 0;
    this.bounds = null; // {x, y, w, h}
    this.offsetX = 0; // sacudida u otros desplazamientos visuales
    this.offsetY = 0;
  }

  setBounds(x, y, w, h) {
    this.bounds = { x, y, w, h };
  }

  // Coloca la cámara sin suavizado (al entrar a una sala o reaparecer).
  snapTo(cx, cy) {
    this.focusX = cx;
    this.focusY = cy - this.h * (CAMERA.TARGET_Y_RATIO - 0.5);
    this.lookahead = 0;
    this.x = this.focusX - this.w / 2;
    this.y = this.focusY - this.h / 2;
    this._clamp();
  }

  // target: {cx, cy (pies), facing, onGround, vy}
  follow(t, dt) {
    // Look-ahead suave hacia donde mira
    this.lookahead = damp(this.lookahead, t.facing * CAMERA.LOOKAHEAD_X, CAMERA.LOOKAHEAD_LERP, dt);
    const wantX = t.cx + this.lookahead;
    const half = CAMERA.DEADZONE_X / 2;
    if (wantX > this.focusX + half) this.focusX = wantX - half;
    else if (wantX < this.focusX - half) this.focusX = wantX + half;

    // Vertical: sigue al tocar suelo; en el aire solo si se sale de los márgenes.
    const desiredY = t.cy - this.h * (CAMERA.TARGET_Y_RATIO - 0.5);
    const screenY = t.cy - (this.focusY - this.h / 2);
    let targetY = this.focusY;
    let lerpY = CAMERA.LERP_Y;
    if (t.onGround) targetY = desiredY;
    else if (screenY < CAMERA.AIR_MARGIN_TOP) targetY = desiredY;
    else if (screenY > this.h - CAMERA.AIR_MARGIN_BOTTOM) {
      targetY = desiredY;
      lerpY = CAMERA.FALL_LERP_Y;
    }
    this.focusY = damp(this.focusY, targetY, lerpY, dt);

    const tx = this.focusX - this.w / 2;
    const ty = this.focusY - this.h / 2;
    this.x = damp(this.x, tx, CAMERA.LERP, dt);
    this.y = damp(this.y, ty, lerpY, dt);
    this._clamp();
  }

  _clamp() {
    if (!this.bounds) return;
    const b = this.bounds;
    this.x = b.w <= this.w ? b.x + (b.w - this.w) / 2 : clamp(this.x, b.x, b.x + b.w - this.w);
    this.y = b.h <= this.h ? b.y + (b.h - this.h) : clamp(this.y, b.y, b.y + b.h - this.h);
  }

  // Posición final redondeada a píxel entero (evita temblor).
  get rx() {
    return Math.round(this.x) + this.offsetX;
  }
  get ry() {
    return Math.round(this.y) + this.offsetY;
  }

  // ¿Un rectángulo del mundo está en pantalla (con margen)?
  isVisible(x, y, w, h, margin = 16) {
    return x + w > this.x - margin && x < this.x + this.w + margin && y + h > this.y - margin && y < this.y + this.h + margin;
  }
}
