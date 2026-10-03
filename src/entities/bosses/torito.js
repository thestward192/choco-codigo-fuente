// Jefe del nivel 4: El Torito Kernel — docs/niveles/nivel_4_santa_cruz.md
// Máquina de estados: intro → idle → (scrape → charge → stunned | recover) | (rear → slam)
// | (nose → bombetas) | (snort → humo → embestida) … → phase2 → … → dying → gone.
// - Embestida: raspa 0.8 s y cruza la arena. Contra una columna queda aturdido 3 s.
// - Pisotón: se para en dos patas y cae; dos ondas viajan por el suelo (las columnas las frenan).
// - Bombetas de nariz: 3 en abanico; una devuelta con parry lo aturde 2 s.
// - Humo: tapa la mitad de la pantalla 3 s (la Vista Debug ve a través) y sale embistiendo.
// Punto débil: el chip de la espalda, que solo se ve y se daña con la Vista Debug activa mientras
// está aturdido. Los disparos en cualquier otra parte rebotan sin daño.
// Fase 2 (al 50 %): el sol quema más (16/s), embiste dos veces seguidas y las columnas se rompen.
import { TORITO, SCREEN } from '../../config/balance.js';
import { aabbOverlap, isStomp } from '../../systems/physics.js';
import { toritoSprite, TORITO_COLORS, TORITO_W, TORITO_H } from '../../art/bosses/torito.js';
import { Bombeta } from '../enemies/santacruz.js';
import { playSfx } from '../../audio/sfx.js';
import { fxRng } from '../../core/rng.js';
import { TEXTS } from '../../data/dialogues.js';
import { drawText } from '../../art/font.js';

const G = TORITO;
const R = fxRng;
const TS = SCREEN.TILE;

// ---------- Reglas puras (las usan las pruebas) ----------
export function toritoPhase(hp) {
  return hp <= G.HP / 2 ? 2 : 1;
}

// ¿Este golpe le hace daño? Solo aturdido, con la Vista Debug activa y en el chip.
export function toritoCanDamage({ stunned, debugView, onChip }) {
  return !!(stunned && debugView && onChip);
}

// Ataques: nunca el mismo dos veces seguidas; después del humo siempre embiste
export function nextToritoAttack(last, roll = Math.random()) {
  if (last === 'smoke') return 'charge';
  const options = ['charge', 'stomp', 'bombs', 'smoke'].filter((a) => a !== last);
  return options[Math.min(options.length - 1, Math.floor(roll * options.length))];
}

// Onda de choque del pisotón: corre por el suelo y se frena en las columnas
class Shockwave {
  constructor(x, floorY, dir) {
    this.x = x;
    this.floorY = floorY;
    this.dir = dir;
    this.t = 0;
    this.dead = false;
  }
  update(dt, scene) {
    this.t += dt;
    this.x += this.dir * G.SHOCK_SPEED * dt;
    if (this.x < 16 || this.x > scene.map.pxW - 16) this.dead = true;
    for (const col of scene.columns || []) {
      if (!col.alive) continue;
      if (this.x > col.x - 2 && this.x < col.x + TS + 2) {
        this.dead = true;
        scene.particles.burst(this.x, this.floorY - 4, 8, { speedMin: 20, speedMax: 60, colors: ['#E2D3B2', '#B2A07C'], lifeMin: 0.2, lifeMax: 0.4, gravity: 200 });
      }
    }
    if (R.chance(0.6)) scene.particles.spawn({ x: this.x, y: this.floorY - 2, vx: R.range(-20, 20), vy: R.range(-60, -20), gravity: 300, life: 0.3, colors: ['#B85E36', '#E6D488'] });
  }
  hurtboxes() {
    return [{ x: this.x - 5, y: this.floorY - G.SHOCK_H, w: 10, h: G.SHOCK_H }];
  }
  touches(body) {
    return aabbOverlap(body, this.hurtboxes()[0]);
  }
  sourceX() {
    return this.x - this.dir * 10;
  }
  draw(ctx, camX, camY) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.floorY - camY);
    for (let i = 0; i < 4; i++) {
      const hh = Math.round(G.SHOCK_H * (1 - i * 0.22) * (0.8 + 0.2 * Math.sin(this.t * 30 + i)));
      ctx.fillStyle = i === 0 ? '#FFF4C0' : i % 2 ? '#E6D488' : '#B85E36';
      ctx.fillRect(x - this.dir * i * 3 - 1, y - hh, 3, hh);
    }
  }
}

export class Torito {
  // x: centro; floorY: suelo; walls: { left, right } en píxeles
  constructor(x, floorY, walls) {
    this.floorY = floorY;
    this.walls = walls;
    this.body = { x: x - G.W / 2, y: floorY - G.H, w: G.W, h: G.H };
    this.hp = G.HP;
    this.dir = -1;
    this.state = 'intro';
    this.stateT = 0;
    this.t = 0;
    this.flashT = 0;
    this.sx = 1;
    this.sy = 1;
    this.dead = false;
    this.last = null;
    this.charges = 0;
    this.stun = 0;
    this.showBar = false;
    this.shootable = true;
    this.stompable = false;
    this.alwaysUpdate = true;
    this.phase2 = false;
    this.tinkT = 0;
  }

  get active() {
    return !['dying', 'gone'].includes(this.state);
  }
  get cx() {
    return this.body.x + this.body.w / 2;
  }
  get cy() {
    return this.body.y + this.body.h / 2;
  }
  get phase() {
    return toritoPhase(this.hp);
  }
  get stunned() {
    return this.state === 'stunned';
  }

  hudInfo() {
    return { name: TEXTS.level4.boss.name, hp01: this.hp / G.HP, segments: 2 };
  }

  set(s) {
    this.state = s;
    this.stateT = 0;
  }

  faceChoco(c) {
    this.dir = c.cx < this.cx ? -1 : 1;
  }

  clampWalls() {
    const b = this.body;
    if (b.x < this.walls.left) b.x = this.walls.left;
    if (b.x + b.w > this.walls.right) b.x = this.walls.right - b.w;
  }

  // Chip de la espalda: la parte de atrás del cuerpo (lado contrario a la cabeza)
  chipRect() {
    const C = G.CHIP;
    const b = this.body;
    const x = this.dir > 0 ? b.x - 2 : b.x + b.w - C.W + 2;
    return { x, y: this.floorY - C.FROM_FLOOR - C.H - 16, w: C.W, h: C.H + 16 };
  }

  weakPoint() {
    const r = this.chipRect();
    return { x: r.x + r.w / 2, y: this.body.y + 6 };
  }

  returnPoint() {
    return { x: this.cx + this.dir * 24, y: this.body.y + 14 };
  }

  update(dt, scene) {
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.tinkT > 0) this.tinkT -= dt;
    this.sx += (1 - this.sx) * Math.min(1, dt * 10);
    this.sy += (1 - this.sy) * Math.min(1, dt * 10);
    const c = scene.choco;
    const b = this.body;
    const audio = scene.game.audio;
    // Humito de la nariz siempre
    if (this.active && R.chance(0.15)) scene.particles.spawn({ x: this.cx + this.dir * 40, y: b.y + 14, vx: this.dir * 20, vy: -15, life: 0.6, size: 2, endSize: 1, colors: ['#E8E0D0', '#A8A090'] });

    switch (this.state) {
      case 'intro':
        if (this.stateT > G.INTRO) {
          this.showBar = true;
          this.set('idle');
        }
        break;
      case 'idle':
        this.faceChoco(c);
        if (this.stateT > G.IDLE[this.phase - 1]) this.choose(scene);
        break;
      case 'scrape':
        if (R.chance(0.6)) scene.particles.spawn({ x: this.cx - this.dir * 26, y: this.floorY - 2, vx: -this.dir * R.range(30, 90), vy: R.range(-60, -10), gravity: 200, life: 0.4, colors: ['#B85E36', '#E6D488'] });
        if (this.stateT > G.SCRAPE * (this.charges < this.maxCharges ? 0.6 : 1)) {
          this.set('charge');
          playSfx(audio, 'toroCharge');
        }
        break;
      case 'charge': {
        b.x += this.dir * G.CHARGE_SPEED * dt;
        if (R.chance(0.6)) scene.particles.spawn({ x: this.cx - this.dir * 30, y: this.floorY - 2, vx: -this.dir * 40, vy: -20, life: 0.3, colors: ['#B85E36'] });
        // ¿Chocó contra una columna?
        const col = (scene.columns || []).find((k) => k.alive && b.x < k.x + TS && b.x + b.w > k.x);
        if (col) {
          b.x = this.dir > 0 ? col.x - b.w : col.x + TS;
          this.hitColumn(scene, col);
          break;
        }
        const wall = this.dir < 0 ? b.x <= this.walls.left : b.x + b.w >= this.walls.right;
        if (wall) {
          this.clampWalls();
          playSfx(audio, 'wallHit');
          scene.game.effects.shake(0.4);
          this.sx = 0.85;
          this.charges--;
          if (this.charges > 0) {
            // Fase 2: da la vuelta y embiste otra vez
            this.dir *= -1;
            this.set('scrape');
          } else this.set('recover');
        }
        break;
      }
      case 'recover':
        if (this.stateT > 0.7) this.set('idle');
        break;
      case 'stunned':
        if (this.stateT > this.stun) {
          this.set('idle');
          this.sy = 1.15;
        }
        break;
      case 'rear':
        this.sy = 1.08;
        if (this.stateT > G.REAR) {
          this.sy = 0.75;
          this.sx = 1.2;
          playSfx(audio, 'bossLand');
          scene.game.effects.shake(0.5);
          scene.game.effects.hitstop(3);
          scene.particles.burst(this.cx, this.floorY - 2, 20, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 30, speedMax: 120, colors: ['#B85E36', '#E6D488', '#FFFFFF'], gravity: 300, lifeMin: 0.3, lifeMax: 0.6 });
          scene.hazards.push(new Shockwave(b.x - 2, this.floorY, -1), new Shockwave(b.x + b.w + 2, this.floorY, 1));
          this.set('recover');
        }
        break;
      case 'nose':
        if (R.chance(0.6)) scene.particles.spawn({ x: this.cx + this.dir * 40 + R.range(-2, 2), y: b.y + 16, vx: R.range(-20, 20), vy: R.range(-30, 0), life: 0.25, colors: ['#FFD23F', '#FF8A3D'] });
        if (this.stateT > G.NOSE_TELEGRAPH) {
          const sx = this.cx + this.dir * 40;
          const sy = b.y + 12;
          for (const off of G.BOMB_FAN) {
            const tx = Math.max(this.walls.left + 8, Math.min(this.walls.right - 8, c.cx + off));
            scene.hazards.push(new Bombeta(sx, sy, tx, this.floorY - 4, G.BOMB_FLIGHT + Math.abs(off) / 200, this));
          }
          playSfx(audio, 'bombetaThrow');
          this.set('recover');
        }
        break;
      case 'snort':
        this.sx = 1.05;
        if (this.stateT > G.SMOKE_TELEGRAPH) {
          playSfx(audio, 'smoke');
          scene.startSmoke?.(this.cx < SCREEN.W / 2 + (scene.camera?.x || 0) ? -1 : 1, G.SMOKE_TIME);
          this.last = 'smoke';
          this.set('idle');
          this.stateT = G.IDLE[this.phase - 1] * 0.5;
        }
        break;
      case 'phase2':
        // Ruge: el sol se intensifica
        if (R.chance(0.5)) scene.game.effects.shake(0.15);
        if (this.stateT > 1.4) this.set('idle');
        break;
      case 'hurt':
        if (this.stateT > 0.15) this.set('stunned');
        break;
      case 'dying':
        if (R.chance(0.5)) {
          scene.particles.burst(this.cx + R.range(-30, 30), this.cy + R.range(-16, 16), 8, { speedMin: 30, speedMax: 110, colors: TORITO_COLORS, gravity: 260, lifeMin: 0.3, lifeMax: 0.8, size: 2, endSize: 1 });
          scene.game.effects.shake(0.15);
        }
        if (this.stateT > 2) {
          this.explode(scene);
          this.set('gone');
          this.dead = true;
        }
        break;
    }
  }

  choose(scene) {
    let a = nextToritoAttack(this.last, R.next());
    // Pegado a una columna no embiste contra ella (sería un aturdido regalado): pisotón
    if (a === 'charge') {
      const dir = scene.choco.cx < this.cx ? -1 : 1;
      const b = this.body;
      const ahead = dir > 0 ? b.x + b.w : b.x;
      if ((scene.columns || []).some((k) => k.alive && Math.abs((dir > 0 ? k.x : k.x + TS) - ahead) < 6)) a = 'stomp';
    }
    this.last = a;
    const audio = scene.game.audio;
    this.faceChoco(scene.choco);
    if (a === 'charge') {
      this.maxCharges = this.phase >= 2 ? 2 : 1;
      this.charges = this.maxCharges;
      this.set('scrape');
      playSfx(audio, 'scrape');
    } else if (a === 'stomp') {
      this.set('rear');
      playSfx(audio, 'bossCrouch');
    } else if (a === 'bombs') {
      this.set('nose');
      playSfx(audio, 'fuse');
    } else {
      this.set('snort');
      playSfx(audio, 'snort');
    }
  }

  hitColumn(scene, col) {
    playSfx(scene.game.audio, 'wallHit');
    scene.game.effects.shake(0.7);
    scene.game.effects.hitstop(6);
    this.sx = 0.75;
    this.sy = 1.12;
    scene.particles.burst(col.x + TS / 2, this.floorY - 30, 18, { speedMin: 40, speedMax: 120, colors: ['#E2D3B2', '#B2A07C', '#FFFFFF'], gravity: 260, lifeMin: 0.3, lifeMax: 0.6 });
    scene.onColumnHit?.(col, this.phase >= 2);
    this.stunFor(G.STUN_COLUMN, scene);
  }

  stunFor(time, scene) {
    this.stun = time;
    this.set('stunned');
    playSfx(scene.game.audio, 'stun');
  }

  // Parry: una bombeta devuelta lo aturde
  onBombetaReturn(scene) {
    if (!this.active || this.stunned) return;
    this.flashT = 0.2;
    this.stunFor(G.STUN_PARRY, scene);
  }

  // Solo se le hace daño en el chip, aturdido y con la Vista Debug activa
  damage(amount, scene, fromDir = 0, shot = null) {
    if (!this.active || this.state === 'intro' || this.state === 'phase2') return false;
    const onChip = !shot || aabbOverlap(shot, this.chipRect());
    if (!toritoCanDamage({ stunned: this.stunned || this.state === 'hurt', debugView: scene.map.ghostSolid, onChip })) {
      if (this.tinkT <= 0) {
        playSfx(scene.game.audio, 'tink');
        this.tinkT = 0.12;
      }
      this.flashT = 0.03;
      if (shot && !shot.charged) shot.kill(scene, true);
      return false;
    }
    const before = this.phase;
    this.hp = Math.max(0, this.hp - amount);
    this.flashT = 0.12;
    playSfx(scene.game.audio, 'bossHurt');
    scene.game.effects.hitstop(amount > 1 ? 6 : 3);
    const r = this.chipRect();
    scene.particles.burst(r.x + r.w / 2, r.y + 8, 10, { speedMin: 30, speedMax: 90, colors: ['#43D9FF', '#FFFFFF', '#FF2E88'], lifeMin: 0.2, lifeMax: 0.4 });
    if (this.hp <= 0) {
      this.set('dying');
      this.showBar = false;
      playSfx(scene.game.audio, 'bossDie');
      scene.game.audio.stopMusic(0.8);
      return true;
    }
    if (before === 1 && this.phase === 2) {
      this.phase2 = true;
      this.set('phase2');
      playSfx(scene.game.audio, 'roar');
      scene.onBossPhase2?.();
    } else this.set('hurt');
    return false;
  }

  // Contacto: aturdido no hace daño (se puede rebotar en el lomo)
  contact(scene, c, inp) {
    if (this.stunned || this.state === 'hurt' || this.state === 'intro') {
      if (isStomp(c.body, this.body, c.body.vy)) c.stomp(inp);
      return;
    }
    c.hurt(this.cx);
  }

  explode(scene) {
    scene.game.effects.flash('#FFFFFF', 6);
    scene.game.effects.shake(0.9);
    scene.game.effects.hitstop(10);
    playSfx(scene.game.audio, 'enemyDie');
    scene.particles.burst(this.cx, this.cy, 70, { speedMin: 40, speedMax: 220, colors: TORITO_COLORS, gravity: 300, lifeMin: 0.5, lifeMax: 1.4, size: 3, endSize: 1 });
    scene.onBossDefeated?.(this);
  }

  pose() {
    switch (this.state) {
      case 'charge':
        return Math.floor(this.t * 14) % 2 ? 'walk1' : 'walk2';
      case 'scrape':
        return Math.floor(this.t * 8) % 2 ? 'scrape' : 'stand';
      case 'rear':
        return 'rear';
      case 'stunned':
        return 'stun';
      case 'hurt':
      case 'dying':
        return 'hurt';
      default:
        return 'stand';
    }
  }

  draw(ctx, camX, camY, scene) {
    if (this.state === 'gone') return;
    if (this.state === 'dying' && Math.floor(this.t * 20) % 3 === 0) return;
    const spr = toritoSprite(this.pose());
    const flip = this.dir < 0;
    const w = Math.round(TORITO_W * this.sx);
    const h = Math.round(TORITO_H * this.sy);
    let ox = 0;
    if (this.state === 'scrape' || this.state === 'snort' || this.state === 'phase2') ox = Math.floor(this.t * 30) % 2 ? 1 : -1;
    const fx = Math.round(this.cx - camX) + ox;
    const fy = Math.round(this.floorY - camY);
    ctx.drawImage(spr.get(flip, this.flashT > 0), fx - Math.round(w / 2), fy - h, w, h);
    // Fase 2: brillo rojo de sobrecalentamiento
    if (this.phase2 && Math.floor(this.t * 6) % 2) {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(spr.tint('#E0343F', flip), fx - Math.round(w / 2), fy - h, w, h);
      ctx.globalAlpha = 1;
    }
    // Nariz encendida (telegrafiado de las bombetas)
    if (this.state === 'nose' && Math.floor(this.t * 14) % 2) {
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(Math.round(this.cx - camX + this.dir * 36) - 2, Math.round(this.body.y - camY) + 12, 5, 3);
    }
    // Chip de la espalda: solo con la Vista Debug
    if (scene?.map.ghostSolid && this.active) {
      const r = this.chipRect();
      const cxp = Math.round(r.x + r.w / 2 - camX);
      const cyp = Math.round(this.body.y - camY) + 6;
      const on = this.stunned || this.state === 'hurt';
      ctx.fillStyle = '#07070C';
      ctx.fillRect(cxp - 5, cyp - 4, 11, 9);
      ctx.fillStyle = on ? (Math.floor(this.t * 10) % 2 ? '#FFFFFF' : '#43D9FF') : '#2A6F8A';
      ctx.fillRect(cxp - 4, cyp - 3, 9, 7);
      ctx.fillStyle = '#07070C';
      ctx.fillRect(cxp - 2, cyp - 1, 5, 3);
      for (let i = -4; i <= 4; i += 2) {
        ctx.fillStyle = '#D9AE4B';
        ctx.fillRect(cxp + i, cyp - 5, 1, 1);
        ctx.fillRect(cxp + i, cyp + 5, 1, 1);
      }
      if (on && this.hp === G.HP) drawText(ctx, TEXTS.level4.boss.shootHere, cxp, cyp - 18, { align: 'center', color: '#43D9FF' });
    }
    // Estrellitas de aturdido
    if (this.stunned) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i * Math.PI * 2) / 3;
        const sx = Math.round(this.cx - camX + this.dir * 30 + Math.cos(a) * 12);
        const sy = Math.round(this.body.y - camY - 6 + Math.sin(a) * 4);
        ctx.fillStyle = i % 2 ? '#FFD23F' : '#FFFFFF';
        ctx.fillRect(sx - 1, sy, 3, 1);
        ctx.fillRect(sx, sy - 1, 1, 3);
      }
    }
  }
}
