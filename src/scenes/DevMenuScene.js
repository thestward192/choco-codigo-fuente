// Menú de desarrollo (solo con ?scene=dev): acceso directo a las escenas de cada hito.
import { Scene } from '../core/game.js';
import { drawText } from '../art/font.js';
import { SCREEN } from '../config/balance.js';
import { TEXTS } from '../data/dialogues.js';
import { UI } from '../art/palettes.js';
import { drawTerminalPanel, drawBraceCursor } from '../ui/widgets.js';
import { playSfx } from '../audio/sfx.js';
import { TechTestScene } from './TechTestScene.js';
import { TestRoomScene } from './TestRoomScene.js';
import { Flow } from '../game/flow.js';
import { RoomScene } from '../levels/level0_prologo/RoomScene.js';
import { LoadingScene } from '../levels/level0_prologo/LoadingScene.js';
import { Level1Scene } from '../levels/level1_cartucho/Level1Scene.js';
import { Level2Scene } from '../levels/level2_una/Level2Scene.js';
import { Level3Scene } from '../levels/level3_novacomp/Level3Scene.js';
import { Level4Scene } from '../levels/level4_santacruz/Level4Scene.js';
import { DevBattleScene } from './DevBattleScene.js';
import { Level5Scene } from '../levels/level5_codigo/Level5Scene.js';
import { EndingScene } from './EndingScene.js';
import { FinalStatsScene } from './FinalStatsScene.js';
import { ExtraScene } from './ExtraScene.js';

export class DevMenuScene extends Scene {
  constructor(game, selected = 1) {
    super(game);
    this.sel = selected;
    this.t = 0;
    this.items = TEXTS.devMenu.items;
  }

  update(dt) {
    this.t += dt;
    const inp = this.game.input;
    if (this.game.transitioning) return;
    if (inp.pressed('down')) {
      this.sel = (this.sel + 1) % this.items.length;
      playSfx(this.game.audio, 'menuMove');
    } else if (inp.pressed('up')) {
      this.sel = (this.sel + this.items.length - 1) % this.items.length;
      playSfx(this.game.audio, 'menuMove');
    } else if (inp.pressed('confirm')) {
      playSfx(this.game.audio, 'menuConfirm');
      const id = this.items[this.sel].id;
      const g = this.game;
      if (id === 'tech') g.changeScene(() => new TechTestScene(g), { type: 'fade' });
      else if (id === 'room') g.changeScene(() => new TestRoomScene(g), { type: 'glitch' });
      else if (id === 'title') Flow.toTitle(g);
      else if (id === 'prologue') g.changeScene(() => new RoomScene(g), { type: 'fade' });
      else if (id === 'loading') g.changeScene(() => new LoadingScene(g), { type: 'fade' });
      else if (id === 'level1') g.changeScene(() => new Level1Scene(g), { type: 'iris' });
      else if (id === 'level2') g.changeScene(() => new Level2Scene(g), { type: 'iris' });
      else if (id === 'battle' || id === 'rap') g.changeScene(() => new DevBattleScene(g, id), { type: 'fade' });
      else if (id === 'boss1') g.changeScene(() => new Level1Scene(g, { start: 'arena' }), { type: 'iris' });
      else if (id === 'level3') g.changeScene(() => new Level3Scene(g), { type: 'iris' });
      else if (id === 'terraza' || id === 'deadline' || id === 'escudo') g.changeScene(() => new Level3Scene(g, { start: id }), { type: 'iris' });
      else if (id === 'level4') g.changeScene(() => new Level4Scene(g), { type: 'iris' });
      else if (['plaza', 'redondel', 'ruinas', 'torito', 'lazo'].includes(id)) g.changeScene(() => new Level4Scene(g, { start: id }), { type: 'iris' });
      else if (id === 'level5') g.changeScene(() => new Level5Scene(g), { type: 'iris' });
      else if (['push', 'firewall', 'fantasma', 'punteros', 'overflow', 'null', 'null2', 'null3', 'null4', 'parche'].includes(id)) g.changeScene(() => new Level5Scene(g, { start: id }), { type: 'glitch' });
      else if (id === 'final') g.changeScene(() => new EndingScene(g), { type: 'fade' });
      else if (id === 'estadisticas') g.changeScene(() => new FinalStatsScene(g), { type: 'fade' });
      else if (id === 'extra') g.changeScene(() => new ExtraScene(g), { type: 'fade' });
      else if (id === 'modo') Flow.toModeSelect(g);
      else if (id === 'coop') Flow.toCoopMenu(g);
      else if (id === 'coopLocal' || id === 'sala') {
        import('../coop/LocalCoopScene.js').then(({ LocalCoopScene }) => g.changeScene(() => new LocalCoopScene(g, { solo: id === 'sala', pj: 'tapita' }), { type: 'glitch' }));
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    // Código de fondo que baja lentamente
    for (let i = 0; i < 14; i++) {
      const y = ((this.t * 12 + i * 13) % (SCREEN.H + 13)) - 13;
      drawText(ctx, i % 2 ? '{ } ;; 0101 // TODO' : 'if (choco) compile();', 8 + ((i * 37) % 200), Math.round(y), {
        color: '#141828',
        shadow: false,
      });
    }
    const w = 276;
    const h = 140;
    const x = (SCREEN.W - w) / 2;
    const y = 14;
    drawTerminalPanel(ctx, x, y, w, h, TEXTS.devMenu.title);
    drawText(ctx, TEXTS.devMenu.subtitle, x + 8, y + 18, { color: UI.textDim, shadow: false });
    // Lista con scroll: se ven VISIBLE elementos alrededor del seleccionado
    const VISIBLE = 7;
    const first = Math.max(0, Math.min(this.items.length - VISIBLE, this.sel - Math.floor(VISIBLE / 2)));
    this.items.slice(first, first + VISIBLE).forEach((it, k) => {
      const i = first + k;
      const iy = y + 32 + k * 14;
      const active = i === this.sel;
      if (active) drawBraceCursor(ctx, x + 10, iy, this.t);
      drawText(ctx, it.label, x + 20, iy, { color: active ? UI.text : UI.textDim });
    });
    if (first > 0) drawText(ctx, '↑', x + w - 10, y + 32, { color: UI.textDim });
    if (first + VISIBLE < this.items.length) drawText(ctx, '↓', x + w - 10, y + 32 + (VISIBLE - 1) * 14, { color: UI.textDim });
    drawText(ctx, TEXTS.devMenu.hint, SCREEN.W / 2, SCREEN.H - 16, { align: 'center', color: UI.textDim });
  }
}
