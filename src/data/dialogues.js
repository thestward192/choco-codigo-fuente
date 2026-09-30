// ============================================================================
// dialogues.js — TODOS los textos visibles del juego, en un solo lugar.
// Español de Costa Rica: voseo, tono cálido, humor de ingeniería.
// Stward: podés editar cualquier frase aquí directamente.
// ============================================================================

export const TEXTS = {
  system: {
    pressAnyKey: 'Presioná cualquier tecla',
    paused: 'EN PAUSA',
    pressToResume: 'Presioná cualquier tecla para seguir',
    cantSave: 'No se puede guardar en este navegador. Tu progreso vive solo en esta sesión.',
    saved: 'Progreso guardado',
    skipHold: 'Mantené ESC para saltar',
  },

  splash: {
    presents: 'presenta',
  },

  title: {
    subtitle: 'CÓDIGO FUENTE',
    pressEnter: 'Presioná Enter',
    version: 'v0.2 · Hito 2',
  },

  mainMenu: {
    title: 'choco@chc:~$',
    newGame: 'Nueva partida',
    continue: 'Continuar',
    options: 'Opciones',
    credits: 'Créditos',
    hint: '↑ ↓ elegir · ENTER confirmar · ESC volver',
  },

  slots: {
    titleNew: 'Nueva partida: elegí una ranura',
    titleLoad: 'Continuar: elegí una ranura',
    slot: (n) => `RANURA ${n}`,
    empty: 'Vacía',
    goldenY: 'Y',
    time: 'Tiempo',
    lastLevel: 'Último recuerdo',
    none: '—',
    overwrite: '¿Sobrescribir esta partida?',
    deleteAsk: (n) => `¿Borrar la ranura ${n}?`,
    deleteSure: '¿Seguro? Esto no tiene `git revert`.',
    deleted: 'Ranura borrada',
    hint: 'ENTER elegir · SUPR/C borrar · ESC volver',
  },

  confirm: {
    yes: 'Sí',
    no: 'No',
  },

  worldMap: {
    path: 'C:/RECUERDOS/',
    hint: 'ENTER jugar · ESC menú',
    locked: 'Bloqueado: completá el recuerdo anterior.',
    wip: 'En construcción: por ahora se juega la sala de pruebas.',
    bestTime: 'Mejor tiempo',
    goldenY: 'Y doradas',
    rescued: 'Rescata a',
    reward: 'Objeto',
    completed: 'COMPLETADO',
    available: 'DISPONIBLE',
    blocked: 'BLOQUEADO',
    menuTitle: 'explorer.exe',
    resume: 'Volver al mapa',
    options: 'Opciones',
    toTitle: 'Salir al título',
  },

  // Nombres y subtítulos de cada nivel
  levels: {
    0: { name: 'Prólogo', subtitle: 'Deploy de medianoche' },
    1: { name: 'Mundo Cartucho', subtitle: 'Todo se ve normal. Todo.' },
    2: { name: 'La UNA', subtitle: 'Pasillos que compilan recuerdos' },
    3: { name: 'Novacomp', subtitle: 'De noche, nadie te ve si no hacés ruido' },
    4: { name: 'Santa Cruz', subtitle: 'Donde el sol no perdona' },
    5: { name: 'El Código Puro', subtitle: 'No hay paisaje. Solo vos y ella.' },
  },
  levelCard: {
    number: (n) => (n === 0 ? 'PRÓLOGO' : `NIVEL ${n}`),
  },
  // Rimas de Stward en las tarjetas de título (a partir del nivel 3)
  stwardRaps: {
    3: ['Oficina de noche, los bots en su ronda;', 'caminá despacito, que el sigilo es la onda.'],
    4: ['Santa Cruz en fiestas, el sol pega duro;', 'buscá la sombrita o te derretís seguro.'],
    5: ["Último commit, no hay vuelta pa' atrás;",'cuatro cuadritos juntos, ¡no nos paran jamás!'],
  },

  results: {
    title: 'NIVEL COMPLETADO',
    time: 'Tiempo',
    deaths: 'Muertes',
    bits: 'Bits',
    goldenY: 'Y doradas',
    record: '¡NUEVO RÉCORD!',
    next: 'Presioná Enter',
  },
  // Frase de despedida del fundador rescatado en cada nivel
  farewells: {
    1: { who: 'oscar', text: 'Gracias, Choco. Ahora ayudame a encontrar a la Y. Te lo ruego.' },
    2: { who: 'stward', text: 'Fluimos juntos, sin bugs ni errores; vos seguí adelante, que vienen cosas mejores.' },
    3: { who: 'hezron', text: 'Tranqui, mae. Ya sin prisa. Sabor victoria, edición limitada.' },
    4: { who: 'fabiola', text: 'Gracias, Choco. Ahora sí... ¿hay algo por aquí sin cebolla?' },
  },

  gameOver: {
    fault: 'SEGMENTATION FAULT',
    title: 'GAME OVER',
    retry: 'Reintentar nivel',
    toMap: 'Salir al mapa',
    // Ánimo de un fundador ya rescatado (se elige al azar)
    cheers: {
      oscar: 'Hasta la Y se cae a veces. Levantate, Choco.',
      stward: 'Una caída no es el final del verso. Otra vez, mae.',
      hezron: 'Tranqui, mae, otra vez.',
      fabiola: 'No pasa nada. Probalo otra vez, despacito.',
    },
    noCheer: '// TODO: intentarlo otra vez.',
  },

  pause: {
    title: 'PAUSA',
    resume: 'Continuar',
    restart: 'Reiniciar desde checkpoint',
    options: 'Opciones',
    controls: 'Controles',
    toMap: 'Salir al mapa',
    toMapAsk: '¿Salir al mapa? Se pierde lo avanzado desde el último checkpoint.',
    items: 'Objetos',
    founders: 'Fundadores',
    noItems: 'Ninguno todavía',
  },

  options: {
    title: 'Opciones',
    master: 'Volumen general',
    music: 'Música',
    sfx: 'Efectos',
    voice: 'Voces',
    fullscreen: 'Pantalla completa',
    scale: 'Escala',
    crt: 'Filtro CRT',
    shake: 'Sacudida de pantalla',
    glitch: 'Glitch intenso',
    textSpeed: 'Velocidad del texto',
    controls: 'Controles',
    back: 'Volver',
    yes: 'Sí',
    no: 'No',
    auto: 'Auto',
    speeds: { slow: 'Lenta', normal: 'Normal', instant: 'Instantánea' },
    hint: '↑ ↓ elegir · ← → cambiar · ESC volver',
  },

  controls: {
    title: 'Controles',
    hint: 'ENTER reasignar · ← → tecla principal/alterna · ESC volver',
    readOnlyHint: 'ESC volver · Los controles se reasignan en Opciones',
    press: (action) => `Presioná una tecla para: ${action}`,
    swapped: (other) => `Intercambiada con: ${other}`,
    reset: 'Restaurar controles por defecto',
    resetDone: 'Controles restaurados',
    gamepad: ['Gamepad: A saltar · X disparar · B escudo · RB lazo', 'LB Vista Debug · Y interactuar · Start pausa'],
    actions: {
      left: 'Izquierda',
      right: 'Derecha',
      up: 'Arriba',
      down: 'Abajo',
      jump: 'Saltar / confirmar',
      shoot: 'Disparar (mantener = cargar)',
      shield: 'Escudo Firewall',
      lasso: 'Lazo de Fibra Óptica',
      debug: 'Vista Debug',
      interact: 'Interactuar',
      pause: 'Pausa',
      sneak: 'Caminar sigiloso',
    },
  },

  items: {
    staff: {
      name: 'BÁCULO COMPILADOR',
      desc: ['Convierte tu intención en { }.', 'No compila buenas intenciones sin sintaxis.'],
      short: 'Dispara { }. Cargable.',
    },
    boots: {
      name: 'BOTAS DE DOBLE SALTO',
      desc: ['Resortes de teclado mecánico, switches azules.', 'Saltá otra vez en el aire.'],
      short: 'Salto doble en el aire.',
    },
    laptop: {
      name: 'LAPTOP DEBUGGER',
      desc: ['Revela lo oculto: plataformas, puertas y puntos débiles.', 'Tiene los stickers de la empresa.'],
      short: 'Revela lo oculto.',
    },
    shield: {
      name: 'ESCUDO FIREWALL',
      desc: ['Bloquea casi todo, pero se recalienta.', 'Activalo justo antes del golpe para reflejar.'],
      short: 'Bloquea y refleja.',
    },
    lasso: {
      name: 'LAZO DE FIBRA ÓPTICA',
      desc: ['Fibra óptica trenzada por un sabanero.', 'Se engancha en cualquier nodo brillante.'],
      short: 'Se engancha a nodos.',
    },
    trophy: {
      name: 'TROFEO DEL CÓDIGO FUENTE',
      desc: ['Una copa dorada con un { } grabado.', 'El proyecto más importante: terminado.'],
      short: 'Terminado.',
    },
    use: (keys) => `Se usa con: ${keys}`,
    passive: 'Pasivo: siempre activo.',
    continue: 'ENTER para continuar',
  },

  pickups: {
    cacao: 'GRANO DE CACAO',
    cacaoDesc: 'Una cobertura brillante que aguanta un golpe.',
    heal: 'TROZO DE CACAO',
    goldenY: '¡Y DORADA!',
  },

  characters: {
    choco: 'Choco',
    null: 'N.U.L.L.',
    oscar: 'Óscar',
    stward: 'Stward',
    hezron: 'Hezron',
    fabiola: 'Fabiola',
    system: 'SISTEMA',
  },

  credits: {
    title: 'CHOCO: CÓDIGO FUENTE',
    creatorLabel: 'Creador',
    creator: 'Stward Serrano',
    studio: 'CHC Studio',
    thanks: 'Gracias por jugar',
  },

  hud: {
    battery: 'Q',
    deadline: 'DEADLINE',
  },

  testRoom: {
    title: 'SALA DE PRUEBAS',
    signs: {
      welcome: '← → mover · ESPACIO saltar (mantené para más altura)',
      steps: 'Escalones de 1, 2 y 3 tiles. El salto llega justo a 3.',
      coyote: 'Coyote time: todavía podés saltar un instante después del borde.',
      buffer: 'Buffer: tocá saltar justo antes de caer y el salto sale igual.',
      oneway: 'Plataformas de un sentido: ↓ + ESPACIO para bajar.',
      shoot: 'X: disparar. Mantené X para cargar (0.8 s) y soltá.',
      enemies: 'Pisá a los Bytelings o dispárales.',
      spikes: 'Pinchos: duelen. Tenés 1.2 s de invencibilidad.',
      boots: 'Botas de Doble Salto: saltá otra vez en el aire.',
      tall: 'Pared alta: necesitás el doble salto.',
      cacao: 'Grano de Cacao: una cobertura que aguanta un golpe.',
      pit: 'Vacío: caer ahí cuesta una vida. Saltalo con doble salto.',
      ghost: 'Puente fantasma: mantené Q (Vista Debug). F3 da la laptop en ?debug=1.',
      terminal: 'Terminal: acercate y presioná ↑ o E. Prueba de diálogos.',
      end: 'La salida está al final. ESC abre la pausa.',
    },
    interact: '↑',
  },

  debug: {
    on: 'DEBUG',
    help: 'F1 overlay · F2 invencible · F3 objetos · F4/F5 vida · F6 cuadro a cuadro · F7 paso · F8 HUD de prueba',
    invincible: 'INVENCIBLE',
    stepping: 'CUADRO A CUADRO (F7 avanza)',
    bossDemo: 'BUG DE PRUEBA',
  },

  // Menú de desarrollo (solo con ?scene=dev)
  devMenu: {
    title: 'choco@chc:~$ ./hitos',
    subtitle: 'Menú de desarrollo',
    items: [
      { id: 'tech', label: 'Hito 0 · Escena de prueba técnica' },
      { id: 'room', label: 'Hito 1 · Sala de pruebas de Choco' },
      { id: 'title', label: 'Hito 2 · Pantalla de título' },
    ],
    hint: '↑ ↓ elegir · ESPACIO / ENTER confirmar',
  },

  techTest: {
    title: 'HITO 0 · PRUEBA TÉCNICA',
    accents: 'Tildes: á é í ó ú ü ñ Á É Í Ó Ú Ñ ¿Qué tal? ¡Pura vida!',
    symbols: 'Símbolos: { } [ ] ( ) < > / \\ _ = ; : ! ? . , \' " % # + - * ∅ ✔',
    tico: 'Diay mae, ¿compiló? ¡Qué chiva! Tuanis.',
    controls: [
      'Flechas / WASD: mover el cuadrado',
      'ESPACIO: sonido · X: partículas · C: sacudida',
      'V: hit-stop · Q: flash · E: glitch',
      '1 fundido · 2 iris · 3 glitch · M: música',
      'ESC: volver',
    ],
    scale: (s) => `Escala ×${s} · FPS`,
    musicOn: 'Música: sonando',
    musicOff: 'Música: apagada',
  },
};

// ============================================================================
// Guiones de diálogo. Cada línea: { who, text, face }.
// who: 'choco' | 'null' | 'oscar' | 'stward' | 'hezron' | 'fabiola' | 'system'
// face: 'normal' | 'happy' | 'worried' | 'surprised' | 'angry'
// Máximo 2 líneas de caja por intervención.
// N.U.L.L. habla en minúsculas tranquila y en MAYÚSCULAS cuando se enoja.
// ============================================================================

export const DIALOGUES = {
  // Prueba de diálogos de la sala de pruebas (Hito 2)
  testTerminal: [
    { who: 'null', face: 'normal', text: 'hola, choco. ¿probando tus juguetitos?' },
    { who: 'null', face: 'normal', text: 'qué lindo. una sala de pruebas. yo también fui una prueba, ¿te acordás?' },
    { who: 'choco', face: 'surprised', text: '¿N.U.L.L.? ¿Qué hacés en la sala de pruebas?' },
    { who: 'null', face: 'angry', text: 'NADA QUE TE IMPORTE. SEGUÍ SALTANDO.' },
    { who: 'oscar', face: 'happy', text: 'Tranquilo, Choco. Esto es solo un ensayo... como mis poemas a la Y.' },
    { who: 'stward', face: 'normal', text: 'Probando la caja, el retrato y la voz; si todo se lee, pasamos de hito los dos.' },
    { who: 'hezron', face: 'normal', text: 'Tranqui. Sabor horchata con menta. Todo bien.' },
    { who: 'fabiola', face: 'worried', text: '¿Esa caja de texto tiene cebolla? Ah, no. Qué alivio.' },
    { who: 'system', face: 'normal', text: 'PRUEBA DE DIÁLOGOS COMPLETADA ✔' },
  ],
};
