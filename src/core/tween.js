// Easing y tweens simples.

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158;
    return (c1 + 1) * t * t * t - c1 * t * t;
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const approach = (v, target, delta) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
// Lerp independiente del framerate: `perFrame` es la fracción por frame a 60 fps.
export const damp = (a, b, perFrame, dt) => lerp(a, b, 1 - Math.pow(1 - perFrame, dt * 60));

export class Tweens {
  constructor() {
    this.list = [];
  }

  // Anima las propiedades numéricas de `obj` hacia `props` en `duration` segundos.
  to(obj, props, duration, ease = Ease.outQuad, { delay = 0, onDone = null } = {}) {
    const from = {};
    for (const k in props) from[k] = obj[k];
    const tw = { obj, from, to: props, duration, ease, delay, t: 0, onDone, dead: false };
    this.list.push(tw);
    return tw;
  }

  wait(duration, onDone) {
    return this.to({}, {}, duration, Ease.linear, { onDone });
  }

  update(dt) {
    for (const tw of this.list) {
      if (tw.dead) continue;
      if (tw.delay > 0) {
        tw.delay -= dt;
        if (tw.delay > 0) continue;
        // Captura el valor inicial al empezar realmente
        for (const k in tw.to) tw.from[k] = tw.obj[k];
      }
      tw.t = Math.min(1, tw.t + dt / Math.max(tw.duration, 1e-6));
      const e = tw.ease(tw.t);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (tw.t >= 1) {
        tw.dead = true;
        if (tw.onDone) tw.onDone();
      }
    }
    if (this.list.some((t) => t.dead)) this.list = this.list.filter((t) => !t.dead);
  }

  clear() {
    this.list.length = 0;
  }
}
