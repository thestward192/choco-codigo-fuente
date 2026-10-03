// Mini-jefe del nivel 1: Guardián del Slot — docs/niveles/nivel_1_mundo_cartucho.md
// Máquina de estados explícita: intro → idle → (crouch → jump → land) | (scrape → charge → stunned)
// | (windup → slam/lluvia) → … → hurt → … → dying.
// - Salto aplastante: se agacha 0.6 s, salta hacia Choco y aterriza con ondas de choque (se saltan).
// - Embestida: raspa el suelo 0.8 s, corre a la pared y queda aturdido 2 s: solo entonces se le
//   puede pisar la cabeza.
// - Lluvia: golpea el suelo y caen 3–5 bloques spam con sombra previa.
// Vida: 3 pisotones; tras cada uno es un 20 % más rápido y agrega patrón (embestida doble;
// luego lluvia combinada con salto). Los disparos no le hacen daño: solo lo empujan un poco.
import { GUARDIAN } from '../../config/balance.js';
import { isStomp, aabbOverlap } from '../../systems/physics.js';
import { guardianSprite, GUARDIAN_COLORS } from '../../art/bosses/guardian.js';
import { SpamBlock } from '../enemies/spam.js';
import { playSfx } from '../../audio/sfx.js';
import { fxRng } from '../../core/rng.js';
import { TEXTS } from '../../data/dialogues.js';
import { drawText } from '../../art/font.js';

const G = GUARDIAN;
const R = fxRng;

// Onda de choque que corre por el suelo desde donde aterriza
class Shockwave {
  constructor(x, floorY, dir, speed) {
    this.x = x;
    this.floorY = floorY;
    this.dir = dir;
    this.speed = speed;
    this.t = 0;
    this.dead = false;
  }
  update(dt, scene) {
    this.t += dt;
    this.x += this.dir * this.speed * dt;
    if (this.x < 8 || this.x > scene.map.pxW - 8) this.dead = true;
    if (R.chance(0.6)) scene.particles.spawn({ x: this.x, y: this.floorY - 2, vx: R.range(-20, 20), vy: R.range(-60, -20), gravity: 300, life: 0.3, colors: ['#B8B8CC', '#8A8AA0'] });
  }
  hurtboxes() {
    return [{ x: this.x - 5, y: this.floorY - G.SHOCKWAVE_H, w: 10, h: G.SHOCKWAVE_H }];
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
    const h = G.SHOCKWAVE_H;
    for (let i = 0; i < 4; i++) {
      const hh = Math.round(h * (1 - i * 0.22) * (0.8 + 0.2 * Math.sin(this.t * 30 + i)));
      ctx.fillStyle = i === 0 ? '#FFFFFF' : i % 2 ? '#B8B8CC' : '#8A8AA0';
      ctx.fillRect(x - this.dir * i * 3 - 1, y - hh, 3, hh);
    }
  }
}

export class Guardian {
  // x: centro; floorY: suelo de la arena; walls: { left, right } en píxeles
  constructor(x, floorY, walls) {
    this.floorY = floorY;
    this.walls = walls;
    this.body = { x: x - G.W / 2, y: -80, w: G.W, h: G.H };
    this.vx = 0;
    this.vy = 0;
    this.hp = G.HP;
    this.dir = -1;
    this.state = 'intro';
    this.stateT = 0;
    this.t = 0;
    this.flashT = 0;
    this.sx = 1;
    this.sy = 1;
    this.dead = false;
    this.lastAttack = null;
    this.charges = 0;
    this.combo = false;
    this.showBar = false;
    this.stompable = true;
    this.shootable = false;
    this.pushable = true;
    this.diskImmune = true;
    this.landed = false;
    this.pushX = 0;
    this.alwaysUpdate = true; // se mueve durante su propia entrada (cinemática)
  }

  get active() {
    return this.state !== 'dying' && this.state !== 'gone' && this.state !== 'intro';
  }
  get cx() {
    return this.body.x + this.body.w / 2;
  }
  get cy() {
    return this.body.y + this.body.h / 2;
  }
  get speed() {
    return Math.pow(G.SPEED_UP, G.HP - this.hp);
  }
  get phase() {
    return G.HP - this.hp + 1; // 1, 2, 3
  }

  hudInfo() {
    return { name: TEXTS.level1.bossName, hp01: this.hp / G.HP, segments: G.HP };
  }

  set(state) {
    this.state = state;
    this.stateT = 0;
  }

  onGround() {
    return this.body.y + this.body.h >= this.floorY - 0.5;
  }

  update(dt, scene) {
    this.t += dt;
    this.stateT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    this.sx += (1 - this.sx) * Math.min(1, dt * 10);
    this.sy += (1 - this.sy) * Math.min(1, dt * 10);
    const b = this.body;
    const c = scene.choco;
    const sp = this.speed;

    // Empujón de los disparos (se desvanece)
    if (this.pushX) {
      b.x += this.pushX * dt * 10;
      this.pushX *= Math.max(0, 1 - dt * 10);
      if (Math.abs(this.pushX) < 0.2) this.pushX = 0;
      this.clampWalls();
    }

    switch (this.state) {
      case 'intro': {
        // Cae desde arriba y aterriza con estruendo
        this.vy = Math.min(this.vy + 900 * dt, 420);
        b.y += this.vy * dt;
        if (b.y + b.h >= this.floorY) {
          b.y = this.floorY - b.h;
          if (!this.landed) {
            this.landed = true;
            this.land(scene, false);
          }
        }
        if (this.landed && this.stateT > G.INTRO_TIME) {
          this.showBar = true;
          this.set('idle');
        }
        break;
      }
      case 'idle':
        this.faceChoco(c);
        if (this.stateT > G.IDLE_TIME / sp) this.chooseAttack(scene);
        break;
      case 'crouch':
        // Telegrafiado del salto: se agacha y tiembla
        this.sy = 0.8;
        this.sx = 1.12;
        if (this.stateT > G.CROUCH_TIME / sp) this.jumpAt(scene, c.cx);
        break;
      case 'jump': {
        this.vy += this.gravity * dt;
        b.x += this.vx * dt;
        b.y += this.vy * dt;
        this.clampWalls();
        if (this.vy > 0 && b.y + b.h >= this.floorY) {
          b.y = this.floorY - b.h;
          this.land(scene, true);
          this.set(this.combo ? 'idle' : 'recover');
          this.combo = false;
        }
        break;
      }
      case 'recover':
        if (this.stateT > 0.5 / sp) this.set('idle');
        break;
      case 'scrape':
        // Telegrafiado de la embestida: raspa el suelo con la pata
        if (R.chance(0.5)) scene.particles.spawn({ x: this.cx - this.dir * 18, y: this.floorY - 2, vx: -this.dir * R.range(30, 80), vy: R.range(-50, -10), gravity: 200, life: 0.4, colors: ['#8A8AA0', '#5A5A6E'] });
        if (this.stateT > G.SCRAPE_TIME / sp) {
          this.set('charge');
          playSfx(scene.game.audio, 'kick');
        }
        break;
      case 'charge': {
        b.x += this.dir * G.CHARGE_SPEED * sp * dt;
        if (R.chance(0.6)) scene.particles.spawn({ x: this.cx - this.dir * 16, y: this.floorY - 2, vx: -this.dir * 40, vy: -20, life: 0.3, colors: ['#8A8AA0'] });
        const hitWall = this.dir < 0 ? b.x <= this.walls.left : b.x + b.w >= this.walls.right;
        if (hitWall) {
          this.clampWalls();
          this.hitWall(scene);
        }
        break;
      }
      case 'bounce':
        // Rebote corto antes de la segunda embestida
        b.x -= this.dir * 60 * dt;
        this.clampWalls();
        if (this.stateT > 0.35) {
          this.dir *= -1;
          this.set('scrape');
          this.stateT = (G.SCRAPE_TIME / sp) * 0.5; // la segunda raspada es más corta
        }
        break;
      case 'stunned':
        if (this.stateT > G.STUN_TIME) {
          this.set('idle');
          this.sy = 1.2;
        }
        break;
      case 'windup':
        // Se estira hacia arriba antes de golpear el suelo
        this.sy = 1.15;
        this.sx = 0.92;
        if (this.stateT > G.RAIN_WINDUP / sp) this.slam(scene);
        break;
      case 'rain':
        this.rainT -= dt;
        if (this.rainLeft > 0 && this.rainT <= 0) {
          this.rainT = G.RAIN_INTERVAL;
          this.rainLeft--;
          this.spawnRainBlock(scene, c);
        }
        if (this.rainLeft <= 0 && this.stateT > 0.6) {
          if (this.phase >= 3 && !this.combo) {
            // Fase 3: la lluvia se combina con el salto aplastante
            this.combo = true;
            this.set('crouch');
            playSfx(scene.game.audio, 'bossCrouch');
          } else this.set('idle');
        }
        break;
      case 'hurt':
        if (this.stateT > G.HURT_TIME) {
          if (this.hp <= 0) this.die(scene);
          else this.set('idle');
        }
        break;
      case 'dying':
        if (R.chance(0.5)) {
          scene.particles.burst(this.cx + R.range(-16, 16), this.cy + R.range(-16, 16), 8, { speedMin: 30, speedMax: 100, colors: GUARDIAN_COLORS, gravity: 200, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
          scene.game.effects.shake(0.15);
        }
        if (this.stateT > 1.6) {
          this.explode(scene);
          this.set('gone');
          this.dead = true;
        }
        break;
    }
  }

  faceChoco(c) {
    this.dir = c.cx < this.cx ? -1 : 1;
  }

  clampWalls() {
    const b = this.body;
    if (b.x < this.walls.left) b.x = this.walls.left;
    if (b.x + b.w > this.walls.right) b.x = this.walls.right - b.w;
  }

  chooseAttack(scene) {
    const options = ['jump', 'charge', 'rain'].filter((a) => a !== this.lastAttack);
    const a = R.pick(options);
    this.lastAttack = a;
    const audio = scene.game.audio;
    if (a === 'jump') {
      this.set('crouch');
      playSfx(audio, 'bossCrouch');
    } else if (a === 'charge') {
      this.faceChoco(scene.choco);
      this.charges = this.phase >= 2 ? 2 : 1; // fase 2+: embestida doble
      this.set('scrape');
      playSfx(audio, 'scrape');
    } else {
      this.set('windup');
      playSfx(audio, 'bossCrouch');
    }
  }

  jumpAt(scene, targetX) {
    const T = G.JUMP_TIME / Math.sqrt(this.speed);
    this.vy = G.JUMP_VY;
    this.gravity = (-2 * G.JUMP_VY) / T;
    const tx = Math.max(this.walls.left + G.W / 2, Math.min(this.walls.right - G.W / 2, targetX));
    this.vx = (tx - this.cx) / T;
    this.dir = Math.sign(this.vx) || this.dir;
    this.sy = 1.3;
    this.sx = 0.8;
    this.set('jump');
    playSfx(scene.game.audio, 'jump');
  }

  land(scene, waves) {
    this.sy = 0.7;
    this.sx = 1.3;
    playSfx(scene.game.audio, 'bossLand');
    scene.game.effects.shake(0.5);
    scene.game.effects.hitstop(3);
    scene.particles.burst(this.cx, this.floorY - 2, 20, { angle: -Math.PI / 2, spread: Math.PI, speedMin: 30, speedMax: 120, colors: ['#8A8AA0', '#5A5A6E', '#FFFFFF'], gravity: 300, lifeMin: 0.3, lifeMax: 0.6 });
    if (waves) {
      const s = G.SHOCKWAVE_SPEED * this.speed;
      scene.hazards.push(new Shockwave(this.body.x - 2, this.floorY, -1, s));
      scene.hazards.push(new Shockwave(this.body.x + this.body.w + 2, this.floorY, 1, s));
    }
  }

  hitWall(scene) {
    this.charges--;
    playSfx(scene.game.audio, 'wallHit');
    scene.game.effects.shake(0.6);
    scene.game.effects.hitstop(5);
    this.sx = 0.7;
    this.sy = 1.15;
    const wx = this.dir < 0 ? this.body.x : this.body.x + this.body.w;
    scene.particles.burst(wx, this.cy, 16, { angle: this.dir < 0 ? 0 : Math.PI, spread: 1.6, speedMin: 40, speedMax: 120, colors: ['#FFFFFF', '#8A8AA0', '#FFD23F'], gravity: 200, lifeMin: 0.2, lifeMax: 0.5 });
    // Cae polvo del techo
    for (let i = 0; i < 4; i++) scene.particles.spawn({ x: R.range(this.walls.left, this.walls.right), y: 18, vy: R.range(20, 60), gravity: 200, life: 1, colors: ['#5A5A6E'] });
    if (this.charges > 0) this.set('bounce');
    else this.set('stunned');
  }

  slam(scene) {
    this.sy = 0.75;
    this.sx = 1.25;
    playSfx(scene.game.audio, 'bossLand');
    scene.game.effects.shake(0.45);
    this.rainLeft = R.int(G.RAIN_BLOCKS[0], G.RAIN_BLOCKS[1]);
    this.rainT = 0.15;
    this.set('rain');
  }

  spawnRainBlock(scene, c) {
    // Uno cae cerca de Choco; los demás repartidos por la arena
    const L = this.walls.left + 10;
    const Rr = this.walls.right - 10;
    let x = this.rainLeft % 2 === 0 ? c.cx + R.range(-24, 24) : R.range(L, Rr);
    x = Math.max(L, Math.min(Rr, Math.round(x / 4) * 4));
    scene.enemies.push(new SpamBlock(x, 4, { rain: true, floorY: this.floorY }));
  }

  // Punto débil (Vista Debug): la cabeza, que solo se puede pisar cuando está aturdido
  weakPoint() {
    return { x: this.cx, y: this.body.y + 2 };
  }

  // Contacto con Choco: solo se le puede pisar mientras está aturdido
  contact(scene, c, inp) {
    if (this.state === 'stunned') {
      if (isStomp(c.body, this.body, c.body.vy)) {
        this.hit(scene);
        c.stomp(inp);
      }
      return;
    }
    if (this.state === 'hurt') return;
    c.hurt(this.cx);
  }

  hit(scene) {
    this.hp--;
    this.flashT = 0.25;
    this.sy = 0.6;
    this.sx = 1.35;
    playSfx(scene.game.audio, 'bossHurt');
    scene.game.effects.hitstop(8);
    scene.game.effects.shake(0.5);
    scene.particles.burst(this.cx, this.body.y + 4, 18, { angle: -Math.PI / 2, spread: 2.2, speedMin: 40, speedMax: 120, colors: GUARDIAN_COLORS, gravity: 260, lifeMin: 0.3, lifeMax: 0.7, size: 2, endSize: 1 });
    this.set('hurt');
  }

  // Los disparos lo empujan un poco (sin daño)
  push(scene, shot) {
    this.pushX += shot.dir * G.SHOT_PUSH;
    this.flashT = 0.05;
    playSfx(scene.game.audio, 'tink');
  }

  die(scene) {
    this.set('dying');
    this.showBar = false;
    playSfx(scene.game.audio, 'bossDie');
    scene.game.audio.stopMusic(0.8);
  }

  explode(scene) {
    scene.game.effects.flash('#FFFFFF', 6);
    scene.game.effects.shake(0.9);
    scene.game.effects.hitstop(10);
    scene.particles.burst(this.cx, this.cy, 60, { speedMin: 40, speedMax: 200, colors: GUARDIAN_COLORS, gravity: 260, lifeMin: 0.4, lifeMax: 1.2, size: 3, endSize: 1 });
    playSfx(scene.game.audio, 'enemyDie');
    scene.onBossDefeated?.(this);
  }

  pose() {
    switch (this.state) {
      case 'crouch':
      case 'windup':
        return this.state === 'crouch' ? 'crouch' : 'stand';
      case 'jump':
      case 'intro':
        return this.onGround() ? 'stand' : 'air';
      case 'charge':
      case 'bounce':
        return Math.floor(this.t * 12) % 2 ? 'walk1' : 'walk2';
      case 'scrape':
        return Math.floor(this.t * 8) % 2 ? 'walk1' : 'stand';
      default:
        return 'stand';
    }
  }

  eye() {
    if (this.state === 'stunned') return 'stun';
    if (this.state === 'hurt' || this.state === 'dying') return 'closed';
    if (this.state === 'idle' && Math.floor(this.t * 1.5) % 6 === 0) return 'closed';
    if (this.state === 'charge' || this.state === 'scrape' || this.phase >= 3) return 'angry';
    return 'normal';
  }

  draw(ctx, camX, camY) {
    if (this.state === 'gone') return;
    if (this.state === 'dying' && Math.floor(this.t * 20) % 3 === 0) return;
    const spr = guardianSprite(this.pose(), this.eye());
    const flip = this.dir > 0;
    const w = Math.round(48 * this.sx);
    const h = Math.round(48 * this.sy);
    let ox = 0;
    if (this.state === 'crouch' || this.state === 'scrape') ox = Math.floor(this.t * 30) % 2 ? 1 : -1;
    const fx = Math.round(this.cx - camX) + ox;
    const fy = Math.round(this.body.y + this.body.h - camY);
    ctx.drawImage(spr.get(flip, this.flashT > 0), fx - Math.round(w / 2), fy - h, w, h);
    // Estrellitas de aturdido
    if (this.state === 'stunned') {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i * Math.PI * 2) / 3;
        const sx = Math.round(fx + Math.cos(a) * 14);
        const sy = Math.round(fy - h - 2 + Math.sin(a) * 4);
        ctx.fillStyle = i % 2 ? '#FFD23F' : '#FFFFFF';
        ctx.fillRect(sx - 1, sy, 3, 1);
        ctx.fillRect(sx, sy - 1, 1, 3);
      }
      // Flecha "¡pisá aquí!" al principio del aturdido
      if (this.stateT < G.STUN_TIME - 0.3 && Math.floor(this.t * 6) % 2 === 0) {
        ctx.fillStyle = '#FFD23F';
        const ay = fy - h - 12;
        ctx.fillRect(fx - 2, ay, 5, 1);
        ctx.fillRect(fx - 1, ay + 1, 3, 1);
        ctx.fillRect(fx, ay + 2, 1, 1);
        // Hasta el primer pisotón, además se dice con texto
        if (this.hp === G.HP) drawText(ctx, TEXTS.level1.bossStompHint, fx, ay - 10, { align: 'center', color: '#FFD23F' });
      }
    }
  }
}
