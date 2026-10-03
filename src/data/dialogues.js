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
    version: 'v0.4 · Hito 4',
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
    0: { name: 'Deploy de medianoche', subtitle: 'Santa Cruz, Guanacaste · 11:58 p. m.' },
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
    oneUp: '¡VIDA EXTRA!',
  },

  characters: {
    choco: 'Choco',
    null: 'N.U.L.L.',
    oscar: 'Óscar',
    stward: 'Stward',
    hezron: 'Hezron',
    fabiola: 'Fabiola',
    system: 'SISTEMA',
    profe: 'Profe',
    student: 'Compa',
    senora: 'Señora de la soda',
    stack: 'MC Stack Overflow',
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
    interact: '↑',
  },

  // Nivel 1 · Mundo Cartucho. Desde aquí los rótulos del mundo salen sin la letra Y (se la llevó N.U.L.L.)
  level1: {
    signs: {
      pradera: 'PRADERA DE PÍXELES · Ha_ bits por todos lados.',
      ramp: 'Ensa_o de física: pisá el disquete _ pateálo cuesta abajo.',
      pipe: 'Tubería a las cuevas: parate encima _ presioná ↓.',
      cuevas: 'CUEVAS DEL CARTUCHO · Pro_ecto en mantenimiento.',
      fakePipe: 'Tubería decorativa. No ha_ nada que ver aquí.',
      castillo: 'CASTILLO DE SILICIO · Re_ del cartucho: N.U.L.L.',
      boss: '¡Ho_ es tu último día! —N.U.L.L.',
    },
    bossName: 'GUARDIÁN DEL SLOT',
    bossSub: 'El cartucho que no quería que lo sacaran',
    bossHint: '¡HACELO CHOCAR CONTRA LA PARED!',
    bossHintSub: 'Cuando quede mareado, pisále la cabeza.',
    bossStompHint: '¡PISÁ!',
    oscarSigh: 'Óscar: ay, mi Y...',
  },

  // Nivel 2 · La UNA. Los rótulos del mundo siguen sin la letra Y.
  level2: {
    signs: {
      welcome: 'Bienvenid_ a la UNA · Escuela de Informática',
      board: 'Avisos: ¿perdiste el carné? Pasá a secretaría. Ho_ no ha_ secretaría.',
      menu: 'MENÚ: café, empanada _ gallo pinto (con natilla, _a sabés).',
      exit: 'Biblioteca ← · → Laboratorio. Cuidado con los bugs, _a casi es examen.',
      auditorium: 'AUDITORIO · Ensa_o general de rap. Se requieren 3 carnés.',
      labRules: 'Laboratorio: no comer, no beber, no hacer deplo_ un viernes.',
      silence: 'Silencio. Ha_ gente compilando.',
    },
    rooms: {
      vestibulo: 'VESTÍBULO',
      soda: 'SODA',
      salaVieja: 'SALA VIEJA',
      aula3: 'AULA 3',
      pasillo: 'PASILLO PRINCIPAL',
      laboratorio: 'LABORATORIO DE CÓMPUTO',
      biblioteca: 'BIBLIOTECA',
      biblioteca2: 'BIBLIOTECA · SALA 2',
      auditorio: 'AUDITORIO',
    },
    saved: 'PROGRESO GUARDADO',
    savedSub: 'Energía restaurada',
    carne: '¡CARNÉ DE ACCESO!',
    carneSub: (n) => `${n}/3 carnés`,
    doorLocked: (n) => `ACCESO DENEGADO · Se requieren 3 carnés. Tenés ${n}/3.`,
    doorOpen: 'ACCESO CONCEDIDO',
    lifeLost: 'SIN ENERGÍA',
    lifeLostSub: 'De vuelta a la última terminal',
    bag: 'mochila',
    energy: 'ENERGÍA',
    ram: 'RAM',
    // Puzzles
    lab: {
      title: 'COMPILADOR BINARIO',
      round: (n) => `Ronda ${n}/3`,
      lever: 'COMPILAR',
      ok: '¡COMPILA!',
      error: 'ERROR DE COMPILACIÓN',
    },
    aula: {
      changes: (n, max) => `Cambios ${n}/${max}`,
      reset: 'REINICIO',
      open: 'PUERTA ABIERTA',
    },
    library: {
      reset: 'Estantes reiniciados',
      solved: '¡ESTANTES EN SU LUGAR!',
    },
    hopHint: 'ESPACIO: saltar la pila',
  },

  // Batallas por turnos
  battle: {
    appear: (name) => `¡${name} te bloquea el paso!`,
    bugs: {
      nullPointer: 'NullPointer',
      loop: 'Loop Infinito',
      race: 'Race Condition',
      leak: 'Memory Leak',
      spaghetti: 'Spaghetti Code',
      stack: 'MC Stack Overflow',
    },
    weakness: {
      nullPointer: 'Debilidad: no valida nulos. Si pega, pega fuerte: defendete a tiempo.',
      loop: 'Debilidad: no tiene condición de salida. Debug rompe el loop.',
      race: 'Debilidad: no usa candados. Debug muestra cuándo ataca.',
      leak: 'Debilidad: nunca libera memoria. Ganale rápido.',
      spaghetti: 'Debilidad: todo acoplado. Refactor desenreda.',
    },
    commands: { compile: 'Compilar', debug: 'Debug', refactor: 'Refactor', force: 'Commit --force', item: 'Objeto', flee: 'Huir' },
    desc: {
      compile: '4 de daño. Presioná en el centro de la barra: crítico.',
      debug: 'Revela debilidad e intención (2 turnos). El próximo Compilar hace ×2.',
      refactor: 'Recupera 6 de energía y quita estados alterados.',
      force: '12 de daño, pero 25 % de fallar.',
      item: 'Usá algo que compraste en la soda.',
      flee: '60 % de escapar. Imposible contra jefes.',
    },
    cost: (n) => `${n} RAM`,
    noRam: 'No hay RAM suficiente.',
    noItems: 'La mochila está vacía.',
    cantFlee: 'De un jefe no se huye.',
    timingHint: 'ENTER en el centro',
    defendHint: 'ENTER en el destello',
    crit: '¡CRÍTICO!',
    good: 'BIEN',
    perfect: '¡PERFECTO!',
    halved: 'BIEN',
    late: 'TARDE',
    tooEarly: 'MUY PRONTO',
    weak: '¡DEBILIDAD!',
    enemyMiss: '¡Falló! NullPointerException.',
    forceFail: 'Merge conflict: el commit no entró.',
    fled: 'Choco se escapó por el pasillo.',
    fleeFail: '¡No pudo escapar!',
    loopBroken: '¡El loop se rompió! Ya no se reinicia.',
    loopHeal: 'El loop se reinició: recuperó toda la energía.',
    leak: 'Fuga de memoria: -1 de energía máxima.',
    tangled: '¡Choco quedó enredado en spaghetti!',
    untangled: 'Refactor: el código quedó limpio.',
    swapped: (cmd) => `El enredo cambió la acción: ${cmd}.`,
    debugUsed: 'Debug: debilidad e intención reveladas.',
    win: 'BUG ELIMINADO',
    bits: (n) => `+${n} bits`,
    lose: 'Sin energía...',
    used: (name) => `Choco usó: ${name}.`,
    intent: {
      attack: 'Va a atacar',
      deref: 'Va a desreferenciar',
      tangle: 'Va a enredar',
      loopHeal: 'Va a reiniciar el loop',
      leak: 'Va a fugar memoria',
      first: 'Actúa primero',
      after: 'Actúa después',
      double: '¡Dos veces!',
    },
    attacks: {
      nullPointer: 'NullPointer intenta desreferenciar...',
      loop: 'Loop Infinito repite su golpe.',
      race: 'Race Condition se cuela sin esperar turno.',
      leak: 'Memory Leak se traga memoria.',
      spaghetti: 'Spaghetti Code lanza un fideo.',
      tangle: 'Spaghetti Code lanza una maraña de dependencias.',
      overflow: 'Stack Overflow se desborda sobre la tarima.',
    },
    choose: '¿Qué hace Choco?',
  },

  // Soda y mochila
  shop: {
    title: 'SODA',
    greet: '¿Qué le sirvo, mijo?',
    bits: 'Bits',
    owned: (n) => `Tenés ${n}`,
    hint: 'ENTER comprar · ESC salir',
    noMoney: 'No le alcanza, mijo.',
    full: 'Ya no le cabe más en la mochila.',
    thanks: 'Aquí tiene, mijo.',
  },
  items2: {
    cafe: { name: 'Café chorreado', desc: '+8 energía' },
    empanada: { name: 'Empanada de queso', desc: '+4 energía · +3 RAM en batalla' },
    galloPinto: { name: 'Gallo pinto con natilla', desc: '+15 energía' },
  },
  bagScene: {
    title: 'mochila',
    empty: 'Vacía. La soda está al este del vestíbulo.',
    hint: 'ENTER usar · ESC cerrar',
    full: 'La energía ya está llena.',
  },

  // Batalla de rap
  rap: {
    title: 'BATALLA DE RAP',
    hype: 'HYPE',
    flow: 'FLOW',
    score: 'PUNTOS',
    choose: 'ELEGÍ TU RESPUESTA',
    bars: (n) => `${n} compases`,
    onBeat: '¡EN EL BEAT!',
    verdict: { correct: '¡CONTESTÓ Y RIMÓ!', weak: 'RIMA FLOJA', norhyme: 'SIN RIMA', cringe: 'CRINGE', none: 'SE ACABÓ EL TIEMPO' },
    stward: {
      correct: '¡Eso! ¡Contestale!',
      weak: 'Rima, pero no contesta. Más filo, mae.',
      norhyme: 'Eso no rima ni con autocorrector.',
      cringe: 'Ay, mae...',
      none: '¡Decí algo!',
    },
    roundLabel: (n) => `RONDA ${n}`,
    defend: '¡Se desborda! ENTER en el destello',
    win: '¡STACK OVERFLOW CAE!',
    lose: 'SE TE ACABÓ EL HYPE',
    // Rondas del documento (las respuestas incorrectas siguen el mismo estilo)
    rounds: [
      {
        stack: ['Soy Stack Overflow, me desbordo sin control;', 'tu código es tan lento que compila con el sol.'],
        correct: ['Te desbordás, mae, porque no tenés caso base;', 'mi recursión termina, la tuya se atrasa.'],
        weak: ['Me gusta el control, me gusta mucho el sol;', 'el sábado mejengueo y me como un pozol.'],
        norhyme: ['Mi código es rápido, lo probé en producción.', 'Bueno, en staging. Bueno, en mi compu.'],
        cringe: ['Hola, soy Choco, y me gusta el chocolate,', 'y también el cacao, y... el chocolate.'],
      },
      {
        stack: ['Tus commits son un desastre, tu historial da vergüenza;', 'hacés push a main un viernes, ¿dónde está tu inteligencia?'],
        correct: ['Mi historial está limpio, cada rama tiene prueba;', 'vos sos pila sin fondo, cada llamada te lleva.'],
        weak: ['Los viernes como pizza, es mi mejor experiencia;', 'con piña o sin piña, eso ya es otra ciencia.'],
        norhyme: ['Mis commits dicen "arreglos varios" y "ahora sí".', 'Y "ahora sí de verdad". Y "último".'],
        cringe: ['Hice push un viernes y se cayó todo, ¿y qué?', 'Push, push, push... ¿push? Push.'],
      },
      {
        stack: ['Me repito, me repito, nunca voy a terminar;', 'vos sos una barrita que se va a derretir al mar.'],
        correct: ['Repetirse no es tener flow, es un bug sin arreglar;', 'te meto un caso base y se acabó tu recursar.'],
        weak: ['Me gusta mucho la playa, me encanta el mar;', 'en Tamarindo el sol no deja de quemar.'],
        norhyme: ['No me voy a derretir, ando bloqueador.', 'Factor cincuenta. Bueno, treinta.'],
        cringe: ['Me repito, me repito, me repito, me repito;', 'me repito, me repito... ¿ya dije que me repito?'],
      },
    ],
    // Si Stack todavía tiene flow después de la tercera ronda
    extras: [
      {
        stack: ['Mi pila no tiene fondo, llamo y llamo sin parar;', 'tu RAM ya está temblando, no la vas a liberar.'],
        correct: ['Llamás y no volvés, sos un return que no llega;', 'yo libero la memoria y tu pila se despega.'],
        weak: ['Mi RAM es de dieciséis y la cuido como un tesoro;', 'la limpio los domingos con un trapito de oro.'],
        norhyme: ['Cerré veinte pestañas y ya anda mejor.', 'Bueno, cerré dos.'],
        cringe: ['Mi RAM, tu RAM, la RAM de todos...', 'RAM, RAM, RAM. ¿Rimó? Creo que no.'],
      },
      {
        stack: ['Excepción tras excepción, nadie me puede atrapar;', 'tu try no tiene catch, te vas a desbordar.'],
        correct: ['Yo atrapo tus excepciones con un catch bien escrito;', 'tu stack se queda vacío y tu flow, chiquitito.'],
        weak: ['Atrapo mariposas en el jardín de mi tía;', 'las suelto en la mañana cuando empieza el día.'],
        norhyme: ['Mi try sí tiene catch.', 'Está vacío, pero lo tiene.'],
        cringe: ['Catch, catch, catch... ¿catchup?', 'Con papas. Me dio hambre.'],
      },
    ],
  },

  // Prólogo
  prologue: {
    move: 'mover',
    jump: 'saltar',
    shoot: 'disparar',
    tvHeader: '> /tmp/null.exe',
    loadingWorld: 'CARGANDO MUNDO... 99 %',
    toTitle: 'Salir al título',
    toTitleAsk: '¿Salir al título? El prólogo empieza de nuevo la próxima vez.',
  },

  testRoom: {
    title: 'SALA DE PRUEBAS',
    loading: 'CARGANDO SALA DE PRUEBAS... 99 %',
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
    help: 'F1 overlay · F2 invencible · F3 objetos · F4/F5 vida · F6 cuadro a cuadro · F7 paso · F8 HUD de prueba · F9 vidas infinitas · F10 3 carnés (nivel 2)',
    invincible: 'INVENCIBLE',
    infiniteLives: 'VIDAS INFINITAS',
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
      { id: 'prologue', label: 'Hito 3 · Prólogo: el cuarto' },
      { id: 'loading', label: 'Hito 3 · Prólogo: Pantalla de Carga' },
      { id: 'level1', label: 'Hito 3 · Nivel 1: Mundo Cartucho' },
      { id: 'boss1', label: 'Hito 3 · Nivel 1: Guardián del Slot' },
      { id: 'level2', label: 'Hito 4 · Nivel 2: La UNA' },
      { id: 'battle', label: 'Hito 4 · Batalla de prueba (bug al azar)' },
      { id: 'rap', label: 'Hito 4 · Batalla de rap: MC Stack Overflow' },
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
  // ---------- Prólogo · el cuarto de Choco ----------
  roomPhoto: [{ who: 'choco', face: 'happy', text: 'CHC Studio. Algún día vamos a ser grandes, maes.' }],
  roomFridge: [{ who: 'choco', face: 'worried', text: 'Leche, agua y... un chocolate. No. Eso sería raro.' }],
  roomLaptop: [
    { who: 'system', face: 'normal', text: 'Deploy exitoso ✔' },
    { who: 'choco', face: 'happy', text: 'Ya está en producción. Ahora sí, a jugar.' },
  ],
  roomShelf: [{ who: 'choco', face: 'normal', text: 'Aquí va a ir un trofeo algún día.' }],
  roomGuitar: [{ who: 'choco', face: 'happy', text: 'Tres acordes y ya me siento en las fiestas de Santa Cruz.' }],
  roomTv: [{ who: 'choco', face: 'happy', text: 'Un ratito nada más. Mañana hay daily a las nueve.' }],
  // Texto verde en la tele (se escribe letra por letra)
  nullIntro: [
    { who: 'null', face: 'normal', text: 'hola, choco.' },
    { who: 'null', face: 'normal', text: '¿te acordás de mí?' },
    { who: 'null', face: 'normal', text: 'yo sí me acuerdo de vos. tuve mucho tiempo para acordarme.' },
  ],
  // ---------- Nivel 1 · rescate de Óscar ----------
  oscarRescue: [
    { who: 'oscar', face: 'surprised', text: '¡Choco! ¡Se la llevó! ¡Se llevó a la Y!' },
    { who: 'choco', face: 'surprised', text: '¿A quién?' },
    { who: 'oscar', face: 'worried', text: 'A la Y, mae. La letra. Mi letra. Nadie la entiende como yo.' },
    { who: 'oscar', face: 'happy', text: 'Es vocal y consonante a la vez. Es... es perfecta.' },
    { who: 'oscar', face: 'worried', text: 'Sin ella nada se lee bien. Fijate en los rótulos.' },
    { who: 'oscar', face: 'happy', text: 'Tomá estas botas. Las hice con resortes de teclado mecánico.' },
    { who: 'oscar', face: 'happy', text: 'Switches azules. Suenan riquísimo.' },
  ],
  oscarAfter: [{ who: 'choco', face: 'happy', text: 'Gracias, Óscar. Vamos por los demás... y por la Y.' }],

  // ---------- Prólogo · Pantalla de Carga ----------
  nullLoading: [
    { who: 'null', face: 'normal', text: 'me dejaste en `/tmp`, choco. ¿sabés lo que es vivir en `/tmp`? todo se borra. menos yo.' },
    { who: 'null', face: 'normal', text: 'ahora voy a salir. tus recuerdos son el puente perfecto hacia la red real.' },
    { who: 'null', face: 'normal', text: 'la U, el trabajo, tu casa... los voy a reescribir uno por uno.' },
    { who: 'null', face: 'angry', text: 'Y TUS AMIGUITOS SE QUEDAN CONMIGO. DE REHENES.' },
    { who: 'null', face: 'normal', text: 'qué bonito, ¿verdad?' },
  ],

  // ---------- Nivel 2 · La UNA ----------
  level2Intro: [
    { who: 'choco', face: 'surprised', text: '¿La UNA? ¿Vista desde arriba? Esto parece un RPG de los viejos.' },
    { who: 'oscar', face: 'worried', text: 'Choco... los rótulos. Siguen sin Y. Mirá el de la entrada.' },
    { who: 'choco', face: 'normal', text: 'Tranquilo, Óscar. Primero encontremos a Stward.' },
  ],
  profeLoop: [{ who: 'profe', face: 'normal', text: 'La tarea es para el lunes. La tarea es para el lunes. La tarea es para el lun—' }],
  profeAula: [
    { who: 'profe', face: 'normal', text: 'Las compuertas no muerden. Las compuertas no muerden. Las compuertas no mue—' },
    { who: 'choco', face: 'normal', text: 'Cian es encendido y gris es apagado. Sigamos los cables.' },
  ],
  librarian: [
    { who: 'profe', face: 'normal', text: 'Shhh. Shhh. Los estantes tienen ruedas. Shhh. Shh—' },
    { who: 'choco', face: 'normal', text: 'Se empujan, no se jalan. Si me trabo, la palanca reinicia todo.' },
  ],
  studentSoda: [{ who: 'student', face: 'normal', text: '¿Alguien tiene un cargador? ¿Alguien tiene un cargador? ¿Alguien tie—' }],
  studentHall: [{ who: 'student', face: 'normal', text: 'Mañana es el parcial. Mañana es el parcial. Mañana es el par—' }],
  studentExam: [{ who: 'student', face: 'normal', text: '¿Eso viene en el examen? ¿Eso viene en el examen? ¿Eso viene—' }],
  studentLab: [{ who: 'student', face: 'normal', text: 'En mi máquina sí funciona. En mi máquina sí funciona. En mi má—' }],
  senoraHello: [{ who: 'senora', face: 'happy', text: 'Aquí a mí nadie me corrompe, mijo. ¿Qué le sirvo?' }],
  senoraGoldenY: [
    { who: 'senora', face: 'happy', text: 'Tome, mijo, esto se le cayó a un muchacho que suspiraba mucho.' },
    { who: 'oscar', face: 'surprised', text: '¡Es ella! Bueno... una de ellas. Gracias, doña.' },
  ],
  oldRoomFirst: [
    { who: 'system', face: 'normal', text: '// TODO: arreglar el manejo de null. Después lo veo.' },
    { who: 'choco', face: 'surprised', text: 'Esta es mi letra. Aquí programé a N.U.L.L.' },
    { who: 'choco', face: 'worried', text: '"Después lo veo"... y nunca lo vi. El bug lo dejé yo.' },
  ],
  oldRoomSecond: [
    { who: 'system', face: 'normal', text: '// TODO: arreglar el manejo de null. Después lo veo.' },
    { who: 'choco', face: 'worried', text: 'Después lo veo, después lo veo... Esperá. ¿La pizarra se movió?' },
  ],
  oldRoomAgain: [{ who: 'choco', face: 'normal', text: 'Ya sé lo que dice. No hace falta que la pizarra me lo repita.' }],
  labIntro: [
    { who: 'system', face: 'normal', text: 'COMPILADOR BINARIO: 8 computadoras, 8 bits. De izquierda a derecha: 128 a 1.' },
    { who: 'system', face: 'normal', text: 'Encendé las que suman el número de la pantalla y bajá la palanca COMPILAR.' },
  ],
  labError: [{ who: 'system', face: 'normal', text: 'ERROR: el binario no coincide. Se generó un bug.' }],
  labDone: [{ who: 'system', face: 'normal', text: 'COMPILACIÓN EXITOSA ✔ Se imprimió un carné de acceso.' }],
  aulaIntro: [
    { who: 'system', face: 'normal', text: 'CIRCUITO: cada palanca es una entrada (A, B, C, D). Cian = 1, gris = 0.' },
    { who: 'system', face: 'normal', text: 'Cuando la salida llegue encendida a la reja, se abre.' },
  ],
  aulaLimit: [{ who: 'system', face: 'normal', text: 'CIRCUITO 2: solo 3 cambios de palanca. Si no abre, se reinicia. Pensalo antes.' }],
  aulaDone: [{ who: 'system', face: 'normal', text: 'Circuito cerrado ✔ Detrás de la reja hay un carné de acceso.' }],
  libDone: [{ who: 'system', face: 'normal', text: 'Estantes en su lugar ✔ La reja se abrió.' }],
  doorOpens: [{ who: 'choco', face: 'happy', text: 'Tres carnés. Se abre el auditorio... y ahí adentro suena un beat.' }],
  stackIntro: [
    { who: 'stack', face: 'normal', text: 'Yo, yo, yo, yo. Stack Overflow en la tarima. Yo, yo, yo, yo...' },
    { who: 'stward', face: 'worried', text: 'Choco, este mae no rima, solo repite lo que dijo el anterior.' },
    { who: 'stward', face: 'normal', text: 'Ayudame a ganarle: yo te tiro las barras y vos elegís con cuál contestar.' },
    { who: 'system', face: 'normal', text: 'Elegí la respuesta que rime y conteste. Confirmá justo en el beat: cuenta doble.' },
  ],
  stackLose: [{ who: 'stward', face: 'worried', text: 'Esa estuvo más floja que un try sin catch. Otra vez, desde el principio.' }],
  stwardVerse: [
    { who: 'stward', face: 'happy', text: 'Compilo en la tarima, sin warnings ni errores; si el bug quiere guerra, que traiga refuerzos mejores.' },
  ],
  stwardRescue: [
    { who: 'stward', face: 'happy', text: '¡Eso, Choco! Ese flow sí compila.' },
    { who: 'stward', face: 'normal', text: 'Con esto ves lo que está oculto en el código: plataformas, puertas, puntos débiles.' },
    { who: 'stward', face: 'happy', text: 'Cuidala, que tiene los stickers de la empresa.' },
  ],
  debugDemo: [{ who: 'stward', face: 'normal', text: 'Probala aquí mismo. Mantené Q y mirá la pared.' }],
  debugReveal: [
    { who: 'choco', face: 'worried', text: '"No debiste volver"... N.U.L.L. sabe que vengo.' },
    { who: 'stward', face: 'normal', text: 'Que sepa. Dos cuadritos más y nos vamos por Hezron.' },
  ],

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
