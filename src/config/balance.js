// ============================================================================
// balance.js — TODOS los números de gameplay viven aquí.
// Para ajustar la dificultad o la sensación del juego, cambiá solo este archivo.
// Unidades: px, segundos, px/s, px/s². Resolución interna 320×180, tiles de 16.
// ============================================================================

export const SCREEN = {
  W: 320,
  H: 180,
  TILE: 16,
};

export const SIM = {
  STEP: 1 / 60, // paso fijo de simulación
  MAX_STEPS_PER_FRAME: 5, // evita la "espiral de la muerte"
};

export const INPUT = {
  BUFFER: 0.1, // salto y disparo recuerdan la pulsación este tiempo
  STICK_DEADZONE: 0.25,
  SKIP_HOLD: 1.0, // mantener Esc/Start para saltar cinemáticas
};

// Física de plataformas (niveles 1, 4 y 5) — docs/03_mecanicas.md
export const PLATFORMER = {
  MAX_SPEED: 105,
  ACCEL_GROUND: 900,
  DECEL_GROUND: 1400,
  ACCEL_AIR: 600,
  DECEL_AIR: 600, // no definido en docs: igual a la aceleración en el aire (ver DECISIONES.md)
  GRAVITY_UP: 900,
  GRAVITY_DOWN: 1150,
  MAX_FALL: 320,
  JUMP_SPEED: -300,
  JUMP_CUT: 0.45,
  DOUBLE_JUMP_SPEED: -265,
  COYOTE: 0.1,
  STOMP_BOUNCE: -230,
  STOMP_BOUNCE_HELD: -300,
  DROP_THROUGH_TIME: 0.2, // tiempo que se ignoran las plataformas de un sentido al bajar
  HITBOX_W: 10,
  HITBOX_H: 20,
  SPRITE_W: 16,
  SPRITE_H: 24,
  SKID_MIN_SPEED: 55, // velocidad mínima para mostrar el derrape al girar
  MAX_MOVE_SUBSTEP: 6, // px máximos por sub-movimiento de colisión
};

// Báculo Compilador
export const STAFF = {
  NORMAL: { DAMAGE: 1, SPEED: 240, RANGE: 170, SIZE: 6 },
  CHARGED: { DAMAGE: 3, SPEED: 200, RANGE: 220, SIZE: 14 },
  COOLDOWN: 0.25,
  MAX_ON_SCREEN: 2,
  CHARGE_TIME: 0.8, // carga completa
  CHARGE_VISIBLE_AFTER: 0.16, // mantener menos que esto es un toque (sin brillo de carga)
  CHARGE_MOVE_MULT: 0.7,
  SHOOT_POSE_TIME: 0.19, // 3 frames a 16 fps
  RECOIL_PX: 1,
  MUZZLE_X: 15, // salida del disparo (núcleo del báculo) relativa al centro de los pies
  MUZZLE_Y: -10,
};

// Vida: la barra de chocolate
export const HEALTH = {
  START_MAX: 1, // el núcleo
  MAX_POSSIBLE: 5,
  INVINCIBLE_TIME: 1.2,
  HURT_HITSTOP_FRAMES: 4,
  HURT_POSE_TIME: 0.25,
  KNOCKBACK_X: 110,
  KNOCKBACK_Y: -170,
  DEATH_HITSTOP_FRAMES: 8,
  MELT_FPS: 10,
  RESPAWN_DELAY: 1.6, // tras terminar de derretirse
  FALL_DEATH_MARGIN: 32, // px debajo del mapa para contar como caída al vacío
};

export const LIVES = {
  START: 3,
  BITS_PER_LIFE: 100,
};

// Cámara — docs/04_arte.md
export const CAMERA = {
  DEADZONE_X: 24,
  LOOKAHEAD_X: 32,
  LOOKAHEAD_LERP: 0.05,
  LERP: 0.12, // por frame a 60 fps
  LERP_Y: 0.1,
  FALL_LERP_Y: 0.25, // cuando cae rápido, la cámara lo alcanza antes (nada fuera de cuadro)
  TARGET_Y_RATIO: 0.62, // Choco se ubica algo abajo del centro vertical
  AIR_MARGIN_TOP: 44, // en el aire la cámara solo sube si Choco pasa este margen
  AIR_MARGIN_BOTTOM: 50,
};

export const EFFECTS = {
  SHAKE_MAX_PX: 6,
  SHAKE_DECAY: 1.6, // trauma perdido por segundo
  SHAKE_HURT: 0.45,
  SHAKE_LAND_HARD: 0.18,
  SHAKE_STOMP: 0.2,
  SHAKE_CHARGED: 0.25,
  SHAKE_ENEMY_DIE: 0.15,
  HITSTOP_STOMP: 3,
  HITSTOP_ENEMY_DIE: 3,
  HITSTOP_CHARGED_HIT: 5,
  HARD_LANDING_VY: 280, // velocidad de caída a partir de la cual el aterrizaje sacude
};

// Squash & stretch de Choco (escala relativa; 1 = normal)
export const SQUASH = {
  JUMP: { X: 0.72, Y: 1.3 },
  DOUBLE_JUMP: { X: 0.8, Y: 1.2 },
  LAND: { X: 1.35, Y: 0.68 },
  LAND_SOFT: { X: 1.15, Y: 0.86 },
  STOMP: { X: 0.8, Y: 1.22 },
  HURT: { X: 1.2, Y: 0.82 },
  SPRING_FREQ: 22, // rad/s del resorte que devuelve la escala a 1
  SPRING_ZETA: 0.42, // amortiguamiento (<1 = rebota un poco)
};

// Vida visual de Choco (tiempos de animaciones secundarias)
export const CHOCO_FX = {
  LAND_POSE_TIME: 0.125, // 2 frames a 16 fps
  SPIN_TIME: 0.25, // doble salto: 4 frames a 16 fps
  JUMP_POSE_SWITCH: 0.1, // primer frame de salto (despegue)
  BLINK_MIN: 1.8,
  BLINK_MAX: 4.5,
  BLINK_TIME: 0.12,
  GLARE_EVERY: 3.5, // reflejo en los lentes
  GLARE_STEP: 0.07,
  LED_PERIOD: 1.2,
  LED_ON: 0.25,
  INVULN_BLINK: 0.07,
  HIT_FLASH_TIME: 2 / 60,
  CRUMB_EVERY: 0.09, // migajas de cacao al correr
  STEP_SOUND_EVERY: 0.25,
  SCARF_SEGMENTS: 6,
  SCARF_SEG_LEN: 2,
  RUN_ANIM_MIN_SPEED: 8,
};

// Enemigos de prueba (se reutilizan en el nivel 1)
export const ENEMIES = {
  BYTELING: {
    SPEED: 28,
    HP: 1,
    W: 12,
    H: 12,
    CONTACT_DAMAGE: 1,
    WALK_FPS: 6,
    SQUASH_TIME: 0.4,
    HIT_FLASH: 0.08,
  },
};

export const PICKUPS = {
  BOB_AMPLITUDE: 2,
  BOB_SPEED: 3,
  HEAL: 1,
};

// Vista Debug (Laptop) — se usa en hitos posteriores; aquí para las plataformas fantasma
export const LAPTOP = {
  BATTERY_MAX: 100,
  DRAIN: 22,
  RECHARGE: 18,
  RECHARGE_DELAY: 0.5,
  MIN_TO_REACTIVATE: 30,
};

export const AUDIO = {
  PITCH_VARIATION: 0.05, // ±5 % en efectos repetitivos
  MUSIC_FADE: 0.5,
  SCHEDULE_AHEAD: 0.12,
  SCHEDULER_INTERVAL_MS: 25,
};

export const TEXT = {
  CHARS_PER_SECOND: { slow: 25, normal: 50, instant: 10000 },
  PAUSE_COMMA: 0.08,
  PAUSE_PERIOD: 0.18,
};

export const TRANSITION = {
  FADE: 0.35,
  IRIS: 0.6,
  GLITCH: 0.45,
};
