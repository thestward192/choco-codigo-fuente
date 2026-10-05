// Loop de paso fijo + gestor de escenas (pila) + transiciones.
import { SIM, SCREEN, TRANSITION } from '../config/balance.js';
import { Effects, drawGlitch } from './effects.js';
import { Tweens, Ease } from './tween.js';
import { drawText, wrapText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';

// Escena base: cada escena implementa enter/exit/update/draw.
export class Scene {
  constructor(game) {
    this.game = game;
    this.drawBelow = false; // si es una superposición (pausa, diálogo) se dibuja la escena de abajo
    this.updateBelow = false;
  }
  enter() {}
  exit() {}
  resume() {} // cuando la escena de arriba se quita
  update(_dt) {}
  draw(_ctx) {}
}

export class Game {
  constructor({ renderer, input, audio, save, debug = null }) {
    this.renderer = renderer;
    this.input = input;
    this.audio = audio;
    this.save = save;
    this.debug = debug;
    this.effects = new Effects();
    this.tweens = new Tweens(); // tweens globales (transiciones)
    this.scenes = [];
    this.transition = null;
    this.acc = 0;
    this.last = 0;
    this.time = 0;
    this.frame = 0;
    this.suspended = false; // pausa automática por perder el foco
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsFrames = 0;
    this.options = save.loadOptions();
    this.session = null; // partida en curso (ranura + datos)
    this.toasts = []; // avisos discretos abajo a la derecha
    this.applyOptions();
    if (!save.canPersist) this.notify(TEXTS.system.cantSave, 5);

    window.addEventListener('blur', () => this.suspend());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.suspend();
    });
  }

  applyOptions() {
    const o = this.options;
    this.effects.shakeEnabled = o.screenShake;
    this.effects.intenseGlitch = o.intenseGlitch;
    this.renderer.crt = o.crt;
    this.renderer.setFixedScale(o.scale || 0);
    this.audio.setVolumes(o.volume);
    if (o.keys) this.input.setBindings(o.keys);
  }

  // Modo desarrolladora (Opciones): abre todos los mapas y no se gastan vidas.
  get devMode() {
    return !!this.options.devMode;
  }

  get infiniteLives() {
    return this.devMode || !!this.debug?.infiniteLives;
  }

  // Modo Hotfix (tras terminar el juego): 1 cuadrito fijo, sin cacao, la mitad de los checkpoints
  get hotfix() {
    const d = this.session?.data;
    return !!(d && d.hotfixUnlocked && d.hotfix);
  }

  saveOptions() {
    this.save.saveOptions(this.options);
    this.applyOptions();
  }

  // Pantalla completa: solo se puede pedir después de una tecla (gesto del usuario).
  setFullscreen(on) {
    this.options.fullscreen = on;
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch (err) {
      // El navegador no lo permite: se ignora
    }
  }

  // Aviso discreto (por ejemplo, que no se puede guardar)
  notify(text, seconds = 3) {
    if (this.toasts.some((t) => t.text === text)) return;
    this.toasts.push({ text, t: 0, time: seconds });
  }

  suspend() {
    if (this.suspended) return;
    this.suspended = true;
    this.audio.suspend();
    const top = this.top;
    if (top && top.onSuspend) top.onSuspend();
  }

  unsuspend() {
    this.suspended = false;
    this.audio.resume();
    this.last = performance.now();
    this.acc = 0;
  }

  // ---------- Pila de escenas ----------
  get top() {
    return this.scenes[this.scenes.length - 1];
  }

  push(scene) {
    this.scenes.push(scene);
    scene.enter();
  }

  pop() {
    const s = this.scenes.pop();
    if (s) s.exit();
    if (this.top) this.top.resume();
    return s;
  }

  replace(scene) {
    while (this.scenes.length) this.scenes.pop().exit();
    this.scenes.push(scene);
    scene.enter();
  }

  // Cambia de escena con transición: 'fade' | 'iris' | 'glitch'.
  // opts: { type, center: {x,y} (iris, en pantalla), color, onMid, duration }
  changeScene(makeScene, opts = {}) {
    this.startTransition({
      ...opts,
      onMid: () => {
        if (opts.onMid) opts.onMid();
        if (makeScene) this.replace(typeof makeScene === 'function' ? makeScene() : makeScene);
      },
    });
  }

  startTransition({ type = 'fade', center = null, color = '#000', onMid = null, duration = null, centerIn = null }) {
    const d = duration ?? (type === 'iris' ? TRANSITION.IRIS : type === 'glitch' ? TRANSITION.GLITCH : TRANSITION.FADE);
    const tr = { type, p: 0, phase: 'out', center, centerIn, color };
    this.transition = tr;
    this.tweens.to(tr, { p: 1 }, d, type === 'iris' ? Ease.inCubic : Ease.inQuad, {
      onDone: () => {
        if (onMid) onMid();
        tr.phase = 'in';
        this.tweens.to(tr, { p: 0 }, d, type === 'iris' ? Ease.outCubic : Ease.outQuad, {
          delay: 0.06,
          onDone: () => {
            if (this.transition === tr) this.transition = null;
          },
        });
      },
    });
  }

  get transitioning() {
    return !!this.transition;
  }

  // ---------- Loop ----------
  start(firstScene) {
    this.push(firstScene);
    this.last = performance.now();
    const loop = (now) => {
      this.frameTick(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frameTick(now) {
    let delta = (now - this.last) / 1000;
    this.last = now;
    if (delta > 0.25) delta = 0.25;
    this._fpsAcc += delta;
    this._fpsFrames++;
    if (this._fpsAcc >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsAcc);
      this._fpsAcc = 0;
      this._fpsFrames = 0;
    }

    if (this.suspended) {
      // Cualquier tecla reanuda
      this.input.update(0);
      if (this.input.anyPressed) this.unsuspend();
      this.render();
      return;
    }

    this.acc += delta;
    let steps = 0;
    while (this.acc >= SIM.STEP && steps < SIM.MAX_STEPS_PER_FRAME) {
      this.step(SIM.STEP);
      this.acc -= SIM.STEP;
      steps++;
    }
    if (steps === SIM.MAX_STEPS_PER_FRAME) this.acc = 0; // descartar el atraso
    this.render();
  }

  step(dt) {
    if (this.debug && this.debug.frameStepping) {
      this.input.update(dt);
      this.debug.update(this);
      if (!this.debug.consumeStep()) return;
    } else {
      this.input.update(dt);
      if (this.debug) this.debug.update(this);
    }
    this.time += dt;
    this.frame++;
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.time);
    this.effects.update(dt);
    this.tweens.update(dt);
    // Hit-stop: congela la simulación de la escena, pero no los efectos
    if (this.effects.hitstopFrames > 0) {
      this.effects.hitstopFrames--;
      return;
    }
    const top = this.top;
    if (!top) return;
    // Escenas superpuestas pueden dejar correr la de abajo
    const idx = this.scenes.length - 1;
    if (top.updateBelow && idx > 0) this.scenes[idx - 1].update(dt);
    top.update(dt);
  }

  render() {
    const ctx = this.renderer.begin();
    // Dibujar desde la escena visible más baja
    let start = Math.max(0, this.scenes.length - 1);
    while (start > 0 && this.scenes[start].drawBelow) start--;
    for (let i = start; i < this.scenes.length; i++) this.scenes[i].draw(ctx);
    this.effects.drawOverlay(ctx, this.renderer);
    if (this.transition) this.drawTransition(ctx, this.transition);
    this.drawToasts(ctx);
    if (this.debug) this.debug.draw(ctx, this);
    if (this.suspended) this.drawSuspended(ctx);
    this.renderer.present();
  }

  drawTransition(ctx, tr) {
    const p = Math.max(0, Math.min(1, tr.p));
    if (tr.type === 'fade') {
      ctx.globalAlpha = p;
      ctx.fillStyle = tr.color;
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.globalAlpha = 1;
    } else if (tr.type === 'iris') {
      const c = (tr.phase === 'in' && tr.centerIn) || tr.center || { x: SCREEN.W / 2, y: SCREEN.H / 2 };
      const maxR = Math.hypot(Math.max(c.x, SCREEN.W - c.x), Math.max(c.y, SCREEN.H - c.y)) + 4;
      const r = Math.max(0, Math.round(maxR * (1 - p)));
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.rect(0, 0, SCREEN.W, SCREEN.H);
      if (r > 0) {
        // Círculo "pixelado": polígono con suficientes lados
        ctx.moveTo(c.x + r, c.y);
        const sides = Math.max(12, Math.round(r));
        for (let i = sides; i >= 0; i--) {
          const a = (i / sides) * Math.PI * 2;
          ctx.lineTo(Math.round(c.x + Math.cos(a) * r), Math.round(c.y + Math.sin(a) * r));
        }
      }
      ctx.fill('evenodd');
    } else if (tr.type === 'glitch') {
      drawGlitch(ctx, this.renderer, 0.4 + p * 1.2);
      // Bloques que tapan la pantalla progresivamente
      const cols = 16;
      const rows = 9;
      const bw = SCREEN.W / cols;
      const bh = SCREEN.H / rows;
      ctx.fillStyle = tr.color;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const h = ((x * 73 + y * 151 + 17) % 97) / 97; // orden pseudoaleatorio fijo
          if (h < p) ctx.fillRect(Math.floor(x * bw), Math.floor(y * bh), Math.ceil(bw), Math.ceil(bh));
        }
      }
    }
  }

  drawToasts(ctx) {
    let y = SCREEN.H - 12;
    for (const t of this.toasts) {
      const a = Math.min(1, t.t * 4, (t.time - t.t) * 2);
      const lines = wrapText(t.text, 170);
      const h = lines.length * 10 + 4;
      y -= h;
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = '#07070C';
      ctx.fillRect(SCREEN.W - 180, y, 176, h);
      ctx.globalAlpha = a;
      lines.forEach((l, i) => drawText(ctx, l, SCREEN.W - 176, y + 3 + i * 10, { color: '#FFD23F' }));
      ctx.globalAlpha = 1;
      y -= 2;
    }
  }

  drawSuspended(ctx) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    drawText(ctx, TEXTS.system.paused, SCREEN.W / 2, 80, { align: 'center', bold: true });
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      drawText(ctx, TEXTS.system.pressToResume, SCREEN.W / 2, 96, { align: 'center', color: '#8A8AA0' });
    }
  }
}
