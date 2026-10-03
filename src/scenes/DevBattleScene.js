// Solo desarrollo (?scene=battle / ?scene=rap): batallas de prueba sin recorrer el nivel.
// "battle" encadena batallas contra los 5 bugs en orden; "rap" repite la batalla de rap.
import { Scene } from '../core/game.js';
import { SCREEN } from '../config/balance.js';
import { drawText } from '../art/font.js';
import { UI } from '../art/palettes.js';
import { BattleScene } from './BattleScene.js';
import { RapBattleScene } from './RapBattleScene.js';
import { BUG_IDS } from '../systems/battle.js';

const BGS = ['hall', 'soda', 'old', 'class', 'lab', 'library', 'stage'];

export class DevBattleScene extends Scene {
  constructor(game, mode = 'battle') {
    super(game);
    this.mode = mode;
    this.n = 0;
    this.last = null;
    this.items = { cafe: 2, empanada: 2, galloPinto: 1 };
    this.wait = 0.4;
  }

  update(dt) {
    if (this.game.top !== this) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = 0.6;
    const g = this.game;
    if (this.mode === 'rap') {
      g.push(new RapBattleScene(g, { energy: 20, maxEnergy: 20, onEnd: (o) => (this.last = o.result) }));
      return;
    }
    const kind = BUG_IDS[this.n % BUG_IDS.length];
    const bg = BGS[this.n % BGS.length];
    this.n++;
    g.push(new BattleScene(g, { kind, bg, energy: 20, maxEnergy: 20, items: this.items, onEnd: (o) => {
      this.last = o.result;
      this.items = o.items;
    } }));
  }

  draw(ctx) {
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    drawText(ctx, this.last ? `Resultado: ${this.last}` : '...', SCREEN.W / 2, 84, { align: 'center', color: UI.textDim });
  }
}
