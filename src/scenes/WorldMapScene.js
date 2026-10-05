// Mapa de mundos: el explorador de archivos de la consola corrupta — docs/06_menus_ui.md
//   C:/RECUERDOS/
//    ├── 01_mundo_cartucho.exe   ✔
//    ├── 02_una/                 ▶
//    └── 05_codigo_puro/         🔒
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText, drawTextBox } from '../art/font.js';
import { TEXTS } from '../data/dialogues.js';
import { UI, ACCENTS } from '../art/palettes.js';
import { MAP_LEVELS, levelById } from '../data/levels.js';
import { isUnlocked, isCompleted, goldenFor, formatTime, maxHpFor } from '../game/progress.js';
import { drawTerminalPanel, drawBraceCursor } from '../ui/widgets.js';
import { drawMiniBar } from '../ui/hud.js';
import { drawPreview } from '../ui/previews.js';
import { icons, itemIcon } from '../art/icons.js';
import { founderSprite } from '../art/portraits.js';
import { playSfx } from '../audio/sfx.js';
import { fxRng } from '../core/rng.js';
import { Flow } from '../game/flow.js';
import { PauseMenuFromMap } from './mapMenu.js';

const LIST = { x: 4, y: 16, w: 184, h: 118 };
const INFO = { x: 192, y: 16, w: 124, h: 144 };

export class WorldMapScene extends Scene {
  constructor(game, focus = null) {
    super(game);
    this.t = 0;
    const f = MAP_LEVELS.indexOf(focus);
    this.sel = f >= 0 ? f : 0;
    this.shake = 0;
    this.selT = 0;
  }

  // Siempre los datos actuales de la partida (el menú del mapa puede cambiarlos)
  get data() {
    return this.game.session.data;
  }

  get levelId() {
    return MAP_LEVELS[this.sel];
  }

  update(dt) {
    this.t += dt;
    this.selT += dt;
    if (this.shake > 0) this.shake -= dt;
    const g = this.game;
    if (g.transitioning) return;
    const inp = g.input;
    if (inp.pressed('down') || inp.pressed('up')) {
      this.sel = (this.sel + (inp.pressed('down') ? 1 : -1) + MAP_LEVELS.length) % MAP_LEVELS.length;
      this.selT = 0;
      playSfx(g.audio, 'menuMove');
    }
    if (inp.pressed('confirm')) {
      if (!isUnlocked(this.data, this.levelId, g.devMode)) {
        this.shake = 0.3;
        playSfx(g.audio, 'menuCancel');
        g.effects.glitch(0.15, 0.4);
        return;
      }
      playSfx(g.audio, 'menuConfirm');
      Flow.startLevel(g, this.levelId);
    } else if (inp.pressed('cancel') || inp.pressed('pause')) {
      playSfx(g.audio, 'menuCancel');
      g.push(new PauseMenuFromMap(g));
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    // Código de fondo, muy tenue
    for (let i = 0; i < 12; i++) {
      const y = ((this.t * 8 + i * 17) % (SCREEN.H + 17)) - 17;
      drawText(ctx, i % 3 ? 'ls -la ./recuerdos' : '// TODO: arreglar null', 4 + ((i * 53) % 220), Math.round(y), { color: '#10121C', shadow: false });
    }
    drawText(ctx, 'explorer.exe', 6, 4, { color: UI.textDim });

    // ---- Lista de archivos ----
    drawTerminalPanel(ctx, LIST.x, LIST.y, LIST.w, LIST.h, TEXTS.worldMap.path);
    MAP_LEVELS.forEach((id, i) => {
      const level = levelById(id);
      const unlocked = isUnlocked(this.data, id, this.game.devMode);
      const done = isCompleted(this.data, id);
      const active = i === this.sel;
      const y = LIST.y + 20 + i * 19;
      let x = LIST.x + 8;
      if (active && this.shake > 0) x += Math.round(Math.sin(this.shake * 70) * 2);
      if (active) {
        ctx.fillStyle = '#16203A';
        ctx.fillRect(LIST.x + 2, y - 4, LIST.w - 4, 16);
        drawBraceCursor(ctx, x - 5, y, this.t);
      }
      drawText(ctx, i === MAP_LEVELS.length - 1 ? '└─' : '├─', x + 2, y, { color: '#2A2F45', shadow: false });
      // Ícono animado
      const ic = icons();
      let spr = level.type === 'exe' ? ic.exe : active && unlocked ? ic.dirOpen : ic.dir;
      const bob = active ? Math.round(Math.sin(this.t * 6) * 1) : 0;
      ctx.globalAlpha = unlocked ? 1 : 0.35;
      ctx.drawImage(spr.normal, x + 16, y - 2 + bob);
      ctx.globalAlpha = 1;
      const nameColor = !unlocked ? '#3E3E52' : active ? UI.text : UI.textDim;
      drawText(ctx, level.file, x + 29, y, { color: nameColor });
      // Estado
      const sx = LIST.x + LIST.w - 12;
      if (!unlocked) ctx.drawImage(ic.lock.normal, sx - 2, y - 1);
      else if (done) ctx.drawImage(ic.check.normal, sx - 2, y + 1);
      else {
        ctx.globalAlpha = Math.floor(this.t * 2) % 2 === 0 ? 1 : 0.45;
        ctx.drawImage(ic.play.normal, sx, y);
        ctx.globalAlpha = 1;
      }
    });

    // ---- Barra de Choco y fundadores rescatados ----
    const by = LIST.y + LIST.h + 6;
    drawTerminalPanel(ctx, LIST.x, by, LIST.w, 26, '');
    drawMiniBar(ctx, LIST.x + 6, by + 14, this.game.hotfix ? 1 : maxHpFor(this.data), 8);
    this.data.founders.forEach((f, i) => {
      const frame = 2 + (Math.floor(this.t * 6 + i) % 4);
      ctx.drawImage(founderSprite(f, frame).normal, LIST.x + 62 + i * 18, by + 2);
    });

    if (this.game.devMode) drawText(ctx, TEXTS.worldMap.devMode, LIST.x + LIST.w - 6, by + 13, { align: 'right', color: UI.magenta });
    else if (this.game.hotfix) drawText(ctx, TEXTS.worldMap.hotfixTag, LIST.x + LIST.w - 6, by + 13, { align: 'right', color: UI.magenta });
    this.drawInfo(ctx);
    drawText(ctx, TEXTS.worldMap.hint, SCREEN.W / 2, SCREEN.H - 12, { align: 'center', color: UI.textDim });
  }

  drawInfo(ctx) {
    const id = this.levelId;
    const level = levelById(id);
    const unlocked = isUnlocked(this.data, id, this.game.devMode);
    drawTerminalPanel(ctx, INFO.x, INFO.y, INFO.w, INFO.h, `preview ${String(id).padStart(2, '0')}`);
    const px = INFO.x + 5;
    const py = INFO.y + 16;
    const pw = INFO.w - 10;
    const ph = 50;
    drawPreview(ctx, id, px, py, pw, ph, this.t, !unlocked);
    ctx.fillStyle = unlocked ? level.accent : '#2A2F45';
    ctx.fillRect(px - 1, py - 1, pw + 2, 1);
    ctx.fillRect(px - 1, py + ph, pw + 2, 1);
    // Glitch al cambiar de selección
    if (this.selT < 0.18) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = fxRng.pick(['#FF2E88', '#43D9FF', '#07070C']);
        ctx.fillRect(px + fxRng.int(0, pw - 20), py + fxRng.int(0, ph), fxRng.int(8, 40), fxRng.int(1, 3));
      }
    }
    if (!unlocked) {
      ctx.drawImage(icons().lock.normal, px + pw / 2 - 3, py + ph / 2 - 4);
      drawTextBox(ctx, TEXTS.worldMap.locked, px, py + ph + 6, pw, { color: UI.textDim });
      return;
    }
    let y = py + ph + 5;
    drawText(ctx, TEXTS.levels[id].name, px, y, { bold: true, color: level.accent });
    y += 12;
    // Y doradas
    const ys = goldenFor(this.data, id);
    drawText(ctx, TEXTS.worldMap.goldenY, px, y, { color: UI.textDim });
    ys.forEach((got, i) => drawText(ctx, 'Y', px + pw - 32 + i * 11, y, { bold: true, color: got ? UI.yellow : '#3A3A4E', shadow: false }));
    y += 11;
    drawText(ctx, TEXTS.worldMap.bestTime, px, y, { color: UI.textDim });
    drawText(ctx, formatTime(this.data.bestTime[id]), px + pw, y, { align: 'right' });
    y += 11;
    if (level.founder) {
      drawText(ctx, TEXTS.worldMap.rescued, px, y, { color: UI.textDim });
      drawText(ctx, TEXTS.characters[level.founder], px + pw - 14, y, { align: 'right', color: ACCENTS[level.founder] });
    }
    const ic = itemIcon(level.item);
    if (ic) ctx.drawImage(ic.normal, px + pw - 12, y - 2);
    y += 13;
    if (!level.built) drawTextBox(ctx, TEXTS.worldMap.wip, px, y, pw, { color: UI.magenta, lineHeight: 9 });
  }
}
