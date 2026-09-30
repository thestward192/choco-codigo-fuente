// Cinemáticas por pasos con generadores:
//
//   scene.playCutscene(function* (cs) {
//     yield 1.5;                                  // esperar segundos
//     yield cs.say(DIALOGUES.algo);               // diálogo (espera a que se cierre)
//     yield cs.until(() => choco.body.onGround);  // esperar una condición
//     cs.game.effects.shake(0.5);                 // cualquier código entre pasos
//   }, { onSkip: () => { ... estado final ... } });
//
// Se salta manteniendo Pausa (Esc/Start) 1 s, con indicador circular.
import { INPUT, SCREEN } from '../config/balance.js';
import { DialogueScene, drawHoldRing } from './dialogue.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';

export class Cutscene {
  constructor(scene, genFn, { skippable = true, onSkip = null, onEnd = null } = {}) {
    this.scene = scene;
    this.game = scene.game;
    this.it = genFn(this);
    this.skippable = skippable;
    this.onSkip = onSkip;
    this.onEnd = onEnd;
    this.cmd = null;
    this.done = false;
    this.skipHold = 0;
    this.t = 0;
    this.advance();
  }

  // ---- Comandos ----
  say(lines) {
    return { type: 'dialogue', lines };
  }
  until(fn) {
    return { type: 'until', fn };
  }
  push(sceneObj) {
    return { type: 'scene', scene: sceneObj };
  }

  advance(value) {
    const r = this.it.next(value);
    if (r.done) {
      this.finish();
      return;
    }
    const v = r.value;
    if (typeof v === 'number') this.cmd = { type: 'wait', t: v };
    else if (v && v.type === 'dialogue') {
      this.cmd = { type: 'modal', open: true };
      const cmd = this.cmd;
      this.game.push(new DialogueScene(this.game, v.lines, () => (cmd.open = false), { onSkipAll: this.skippable ? () => this.skip() : null }));
    } else if (v && v.type === 'scene') {
      this.cmd = { type: 'modal', open: true };
      const cmd = this.cmd;
      v.scene.onClose = () => (cmd.open = false);
      this.game.push(v.scene);
    } else if (v && v.type === 'until') this.cmd = v;
    else this.cmd = { type: 'wait', t: 0 };
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    const inp = this.game.input;
    if (this.skippable && inp.down('skip')) {
      this.skipHold += dt;
      if (this.skipHold >= INPUT.SKIP_HOLD) {
        this.skip();
        return;
      }
    } else this.skipHold = 0;

    const c = this.cmd;
    if (!c) return;
    if (c.type === 'wait') {
      c.t -= dt;
      if (c.t <= 0) this.advance();
    } else if (c.type === 'until') {
      if (c.fn()) this.advance();
    } else if (c.type === 'modal') {
      if (!c.open) this.advance();
    }
  }

  skip() {
    if (this.done) return;
    // Cerrar diálogos abiertos por esta cinemática
    while (this.game.top instanceof DialogueScene) this.game.pop();
    this.it.return();
    if (this.onSkip) this.onSkip();
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.onEnd) this.onEnd();
  }

  // Indicador de "mantené para saltar"
  draw(ctx) {
    if (this.done || !this.skippable) return;
    if (this.skipHold > 0.05) {
      drawHoldRing(ctx, SCREEN.W - 12, 12, this.skipHold / INPUT.SKIP_HOLD);
    } else if (this.t < 3) {
      drawText(ctx, TEXTS.system.skipHold, SCREEN.W - 4, 4, { align: 'right', color: '#5A5F78' });
    }
  }
}
