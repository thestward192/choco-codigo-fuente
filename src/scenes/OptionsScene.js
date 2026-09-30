// Opciones — docs/06_menus_ui.md
// Volúmenes 0–10, pantalla completa, escala, CRT, sacudida, glitch intenso, velocidad del texto
// y controles. Los cambios se aplican al momento y se guardan al salir.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { Menu, volumeBar } from '../ui/menu.js';
import { drawTerminalPanel } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { ControlsScene } from './ControlsScene.js';

const T = TEXTS.options;
const SCALES = [0, 2, 3, 4, 5, 6];
const SPEEDS = ['slow', 'normal', 'instant'];
const PANEL = { x: 30, y: 8, w: 260, h: 164 };

export class OptionsScene extends Scene {
  constructor(game) {
    super(game);
    this.drawBelow = true;
    this.t = 0;
    const o = game.options;
    const g = game;
    const apply = () => g.applyOptions();
    const vol = (key) => ({
      value: () => volumeBar(o.volume[key]),
      left: () => {
        o.volume[key] = Math.max(0, o.volume[key] - 1);
        apply();
      },
      right: () => {
        o.volume[key] = Math.min(10, o.volume[key] + 1);
        apply();
      },
    });
    const toggle = (key, after = apply) => ({
      value: () => (o[key] ? T.yes : T.no),
      left: () => {
        o[key] = !o[key];
        after();
      },
      right: () => {
        o[key] = !o[key];
        after();
      },
    });
    const cycle = (list, key, labelFn) => ({
      value: () => labelFn(o[key]),
      left: () => {
        o[key] = list[(list.indexOf(o[key]) - 1 + list.length) % list.length];
        apply();
      },
      right: () => {
        o[key] = list[(list.indexOf(o[key]) + 1) % list.length];
        apply();
      },
    });
    this.menu = new Menu(
      [
        { id: 'master', label: T.master, ...vol('master') },
        { id: 'music', label: T.music, ...vol('music') },
        { id: 'sfx', label: T.sfx, ...vol('sfx') },
        { id: 'voice', label: T.voice, ...vol('voice') },
        { id: 'fullscreen', label: T.fullscreen, ...toggle('fullscreen', () => g.setFullscreen(o.fullscreen)) },
        { id: 'scale', label: T.scale, ...cycle(SCALES, 'scale', (v) => (v ? `×${v}` : T.auto)) },
        { id: 'crt', label: T.crt, ...toggle('crt') },
        { id: 'shake', label: T.shake, ...toggle('screenShake') },
        { id: 'glitch', label: T.glitch, ...toggle('intenseGlitch') },
        { id: 'textSpeed', label: T.textSpeed, ...cycle(SPEEDS, 'textSpeed', (v) => T.speeds[v]) },
        { id: 'controls', label: T.controls },
        { id: 'back', label: T.back },
      ],
      { x: PANEL.x + 18, y: PANEL.y + 20, spacing: 11, width: PANEL.w - 30 },
    );
    this.previewT = 0;
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    const before = { ...g.options.volume };
    const r = this.menu.update(dt, g);
    // Al cambiar el volumen de efectos o voces, sonar una muestra
    if (before.sfx !== g.options.volume.sfx) playSfx(g.audio, 'bit');
    if (before.voice !== g.options.volume.voice) g.audio.blip(520);
    if (r === 'controls') g.push(new ControlsScene(g, { readOnly: false }));
    else if (r === 'back' || r === 'cancel') {
      g.saveOptions();
      g.pop();
    }
  }

  draw(ctx) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#05050A';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.globalAlpha = 1;
    const open = Math.min(1, this.t * 7);
    const h = Math.max(4, Math.round(PANEL.h * open));
    drawTerminalPanel(ctx, PANEL.x, PANEL.y + Math.round((PANEL.h - h) / 2), PANEL.w, h, open >= 1 ? `~/.chocorc · ${T.title}` : '');
    if (open < 1) return;
    this.menu.draw(ctx);
    drawText(ctx, T.hint, SCREEN.W / 2, SCREEN.H - 7, { align: 'center', color: UI.textDim, shadow: false });
  }
}
