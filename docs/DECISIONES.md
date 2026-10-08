# Decisiones de implementación

Decisiones tomadas durante el desarrollo que no estaban definidas en los documentos de diseño. Cada una se puede cambiar; la mayoría son un número en `src/config/balance.js`.

## Hito 0 · Base técnica

- **Menú de desarrollo temporal.** Hasta el Hito 2 (menús reales), después de "Presioná cualquier tecla" aparece un menú tipo terminal para elegir la escena de prueba del Hito 0 o la sala de pruebas del Hito 1.
- **Atajos de desarrollo en la URL** (solo en `npm run dev`): `?debug=1` (herramientas de depuración), `?scene=room` (directo a la sala de pruebas), `?scene=tech` (directo a la prueba técnica). Se pueden combinar: `?debug=1&scene=room`.
- **Teclas de depuración** (con `?debug=1`): F1 overlay, F2 invencible, F3 dar todos los objetos y 5 cuadritos, F4/F5 quitar/agregar cuadrito máximo, F6 modo cuadro a cuadro, F7 avanzar un cuadro. Se usan teclas F para no chocar con los controles del juego. Todo el módulo `core/debug.js` queda fuera del build de producción.
- **Galería de sprites** en `tools/sprites.html` (solo desarrollo, `http://localhost:5173/tools/sprites.html`): muestra todos los frames de Choco, enemigos, objetos y tiles a ×6 para revisar el arte.
- **Escalado con devicePixelRatio.** La escala entera se calcula en píxeles físicos, para que el juego se vea pixel perfect también en laptops con Windows al 125 % o 150 %.
- **Fuente de títulos.** En lugar de una segunda fuente de 8×8 se usa una variante "negrita" de la de 5×7 (cada glifo engrosado 1 px), que se puede escalar ×2 o más. El título grande de CHOCO del Hito 2 va a ser lettering propio, no texto de fuente.
- **Acentos en mayúsculas.** Los acentos de Á É Í Ó Ú Ñ se dibujan 2–3 px por encima de la línea de mayúsculas; la altura de línea es de 11 px para que no choquen con la línea de arriba.
- **Pausa automática al perder el foco.** Mientras no existe la pantalla de pausa (Hito 2), perder el foco muestra "EN PAUSA" y cualquier tecla reanuda. El audio también se suspende.
- **Enter** está en *confirmar* (menús) y en *pausa* (juego), como dice el documento. No se pisan porque los menús solo leen *confirmar* y el juego solo lee *pausa*.

## Hito 1 · Choco y la física

- **Desaceleración en el aire:** 600 px/s², igual que la aceleración en el aire (el documento no la define). Se siente controlable sin frenar en seco.
- **Girar en el suelo** (presionar hacia el lado contrario) usa la desaceleración de suelo (1400 px/s²): el giro es rápido y muestra la animación de derrape cuando va a más de 55 px/s.
- **Salto variable también en el doble salto:** soltar el botón mientras sube corta la velocidad (`× 0.45`).
- **El rebote al pisar un enemigo no se corta** al soltar el botón (si se mantenía saltar al pisar, rebota a −300; si no, a −230).
- **Bajar de plataformas de un sentido:** ↓ + saltar las ignora durante 0.2 s (`DROP_THROUGH_TIME`).
- **Pinchos:** solo la mitad inferior del tile hace daño (donde están las puntas) y el golpe empuja hacia arriba con un 30 % más de fuerza, para salir de ellos.
- **Caer al vacío es muerte** (pierde una vida), como dice `docs/03_mecanicas.md`, sin importar los cuadritos. La posición segura en tierra firme ya se registra para la mecánica del Overflow del nivel 5.
- **Disparo cargado:** el disparo normal sale al presionar; si se sigue manteniendo, empieza la carga (visible después de 0.16 s, para que los toques no muestren brillo). Al soltar con la carga completa sale el cargado. El cargado no cuenta para el máximo de 2 disparos en pantalla y empuja a Choco 40 px/s hacia atrás.
- **Sprite de Choco en un lienzo de 36×28:** el cuerpo mide 16×24 como pide el documento, pero el lienzo tiene margen para el báculo horizontal y los brazos. El anclaje son los pies.
- **El báculo se ve siempre en la mano** una vez obtenido (vertical en reposo, horizontal al disparar). En la parte A del prólogo Choco no lo tiene.
- **Squash & stretch con un resorte amortiguado** (frecuencia 22, amortiguamiento 0.42): vuelve a su forma con un pequeño rebote elástico.
- **Muerte:** se derrite en 8 frames a 10 fps (generados a partir del sprite, con la envoltura cayendo encima al final), espera 1.6 s y reaparece con una transición iris.
- **Sala de pruebas:** tiene enemigos (Bytelings), bits, Grano de Cacao, Trozo de Cacao y Botas de Doble Salto para probar todo el sistema de vida y movimiento. Cada cartel funciona como checkpoint informal. Al quedarse sin vidas muestra "SEGMENTATION FAULT" y recarga las vidas (la pantalla real de Game Over llega en el Hito 2).
- **Carteles de la sala de pruebas:** su texto aparece solo, arriba a la derecha, al acercarse; no hace falta presionar nada.
- **Paredes altas de la sala de pruebas:** 4 tiles (el salto simple llega a unos 3), para probar el doble salto sin exigir un timing perfecto.

## Hito 2 · Menús, HUD y guardado

- **Flujo de arranque:** "Presioná cualquier tecla" (desbloquea el audio) → presentación con el logo → título. El menú de desarrollo de los hitos anteriores sigue disponible con `?scene=dev`.
- **El prólogo todavía no existe (Hito 3).** Mientras tanto, "Nueva partida" da el prólogo por jugado: Choco empieza con el Báculo y va directo al mapa con el nivel 1 disponible. Cuando el prólogo esté listo, "Nueva partida" lo va a arrancar (se activa con `built: true` en `src/data/levels.js`).
- **Niveles de reemplazo:** todos los niveles del mapa abren la sala de pruebas (el mapa lo dice en magenta: "En construcción"). Completarla cuenta como completar ese nivel: rescata al fundador, da el objeto y desbloquea el siguiente, para poder probar toda la progresión, el guardado y las pantallas.
- **La sala de pruebas como nivel:** tiene 3 Y doradas, una salida (portal glitcheado al final) y una terminal (a la izquierda del inicio) que lanza una cinemática de prueba con diálogos de N.U.L.L., Choco y los cuatro fundadores. Cada cartel es un checkpoint: se activa con sonido y destello verde, y se guarda en la ranura; al volver a entrar al nivel, Choco aparece en el último checkpoint.
- **Continuar:** si hay una sola partida guardada, va directo al mapa; si hay varias, primero se elige la ranura.
- **Nueva partida** pone el cursor en la primera ranura vacía; si se elige una ocupada, pide confirmación para sobrescribir.
- **Borrar una ranura:** tecla C o Supr (Y en el gamepad), con doble confirmación.
- **ESC en el mapa** abre un menú pequeño: volver al mapa, opciones o salir al título (el documento no define cómo salir del mapa).
- **Pausa:** "Reiniciar desde checkpoint" no cuesta vida. "Salir al mapa" guarda las muertes y el tiempo del intento. La música baja al 35 % mientras está abierta. Perder el foco de la ventana dentro de un nivel también abre la pausa.
- **Tarjeta de título:** la rima de Stward aparece desde el nivel 3 solo si Stward ya fue rescatado; en ese caso la tarjeta dura 2.2 s más para que se lea.
- **Resultados:** la despedida del fundador aparece solo la primera vez que se completa el nivel. En la sala de reemplazo, la pantalla de objeto obtenido sale al completar el nivel por primera vez (en los niveles reales la entrega el fundador dentro del nivel).
- **Game Over:** el ánimo es de un fundador rescatado al azar; si todavía no hay ninguno, aparece `// TODO: intentarlo otra vez.`
- **Saltar cinemáticas:** mantener **Esc** (o Start) 1 s, con indicador circular. Se usa solo Esc y no las otras teclas de pausa (Enter, P), porque Enter también es confirmar y avanzar diálogos. Dentro de una cinemática, mantener Esc sobre un diálogo salta toda la cinemática; fuera de una, mantener cancelar salta solo el diálogo.
- **Reasignar controles:** si la tecla ya la usa otra acción, se intercambian (con aviso). Esc cancela la captura, salvo cuando se reasigna la pausa. Los controles de menú (confirmar/cancelar) y el gamepad no se reasignan.
- **Aviso de guardado:** si el navegador no permite guardar, aparece un aviso discreto abajo a la derecha una sola vez y el juego sigue en memoria.
- **Música:** el tema del título (que el plan lista para el Hito 3) ya está compuesto porque el título existe desde este hito. Los créditos usan ese tema hasta el popurrí del Hito 8.
- **Créditos:** el logo se muestra sobre una tarjeta blanca (es su fondo original). Mantener confirmar acelera; cancelar vuelve al título.
- **Retratos y sprites de los fundadores** (32×32 con 5 expresiones y 16×24 caminando) se generan con un pintor de grillas (`src/art/painter.js`), y quedan en el mismo formato de arreglos de strings que el resto del arte.
- **Depuración:** F8 muestra el HUD completo de prueba (barra de jefe, DEADLINE, cargas de vapor, termómetro, escudo y lazo).
- **Herramientas de prueba (solo desarrollo, no entran al build):** `tools/harness.js` y el endpoint `/__snap` de Vite, que guarda capturas del juego en `.snaps/` para revisar pantallas.

## Hito 3 · Prólogo y Nivel 1

### Prólogo

- **Nueva partida arranca el prólogo** con su tarjeta de título. El nombre de la tarjeta es "Deploy de medianoche" (el número ya dice PRÓLOGO). Choco empieza sin objetos: el Báculo se encuentra en la Pantalla de Carga y se guarda al cruzar el portal.
- **Pausa en el prólogo:** como todavía no hay mapa, la opción es "Salir al título". Si se continúa una partida con el prólogo a medias, el prólogo empieza de nuevo.
- **El cuarto** (30×11 tiles): además de la foto, la refri, la laptop, el estante y la consola, la **guitarra** de la esquina también se puede tocar (la menciona `docs/01_historia.md`). Recorrido hasta la consola: banquito (1 tile) → cama (1) → respaldo (2) → mueble de la tele (2).
- **Globo de controles:** aparece una vez junto a Choco y se va solo cuando ya se movió y saltó. El ícono "↑" aparece sobre lo que se puede usar (solo el más cercano).
- **N.U.L.L. escribe en minúsculas cuando está tranquila** (como dice `docs/02_personajes.md`) aunque la historia muestre las frases con mayúscula inicial; la amenaza a los fundadores la grita en MAYÚSCULAS. El texto de la tele sale en un panel verde abajo (para no tapar la pantalla) y avanza solo o con Enter.
- **"La barra rota":** Choco camina hasta el lado de la tele para que se vea la pantalla. Los 4 cuadritos salen en cámara lenta con la estela de su color y entran a la tele. El sprite de Choco no cambia de tamaño (el cuerpo es fijo, como dice el documento); la pérdida se ve en la barra del HUD de la Pantalla de Carga (1 cuadrito).
- **Iluminación del cuarto:** capa de oscuridad con "agujeros" de luz en bandas duras (`src/core/lighting.js`), con una luz suave alrededor de Choco para que siempre se lea.
- **Pantalla de Carga:** los golpes empujan y parpadean pero no quitan vida; caer al vacío devuelve a la última plataforma con un glitch. El Báculo se toma con ↑/E (como en el cuarto) y la roca queda como punto de reaparición.
- **Zona de práctica:** los Bytelings TEST están quietos. El muro agrietado **bloquea todo el paso** (no se puede saltar), así que hay que aprender el disparo cargado; encima del muro se ve el báculo cargándose con un anillo que se llena y la tecla de disparo. Los disparos normales rebotan en él con un "tink".
- **Discurso de N.U.L.L.:** se activa al llegar a la explanada; la cámara se desplaza para mostrar el portal que se abre.

### Nivel 1 · Mundo Cartucho

- **Tamaños:** 1-A Pradera 106 tiles, 1-B Cuevas 86, 1-C Castillo 78, más la sala secreta (20) y la arena del jefe (20). Las cuevas y el castillo miden 12 filas para que el techo se vea.
- **Paso entre secciones:** 1-A → 1-B por una tubería de datos (pararse encima y ↓); 1-B → 1-C por una puerta (↑/E); la doble puerta del jefe se abre sola con un glitch al acercarse.
- **Checkpoints (banderas):** al inicio de las cuevas, al inicio del castillo y **en la antesala del jefe** (este último no estaba en el documento: así el jefe se puede aprender en 2–3 intentos sin repetir todo el castillo). Al morir, la sección se reconstruye (enemigos y bloques vuelven), pero las Y doradas tomadas en el intento no reaparecen.
- **Game Over** borra el checkpoint del nivel: reintentar es desde el inicio, como dice `docs/03_mecanicas.md`. "Salir al mapa" desde la pausa lo conserva.
- **La rampa del Disquete** son escalones (la física de tiles no tiene pendientes): el disco baja escalón por escalón y entra a una zanja con 4 Bytelings.
- **Bloques Y:** de bit, de Grano de Cacao, de Trozo de Cacao y de varios bits (hasta 6 golpes o 4 s). Golpear un bloque elimina al enemigo parado encima.
- **Lo que sale de un bloque Y** (Grano o Trozo de Cacao) salta hacia el lado de Choco y cae hasta el suelo, para que siempre se pueda tomar aunque el bloque esté alto. Las filas de bloques de la pradera están a 3 tiles del suelo: se camina por debajo y se golpean saltando. Desde el suelo el salto (≈48 px con los valores del documento) no alcanza para subirse encima, así que la primera fila tiene un bloque de escalón a la izquierda.
- **Y dorada 1:** el primer bloque invisible (marcado por un bit suelto) revela en cascada la escalera completa hasta las nubes.
- **Y dorada 2:** la "tubería falsa" del secreto y la "tubería secreta" de la Y son la misma: lleva a una sala de bits con la Y.
- **Y dorada 3:** el hueco detrás de la pared agrietada se dibuja como muro hasta romperla.
- **Disquete:** los disparos le rebotan; pisado queda como disco, que se patea tocándolo o pisándolo; pateado elimina enemigos y, después de 0.3 s, también golpea a Choco. Si nadie lo patea, se despierta a los 7 s.
- **Blindado:** los disparos (normales y cargados) rebotan girando hacia atrás, sin dañar a Choco.
- **Mosquitos:** vuelan 40 px de ida y vuelta con onda senoidal; la formación es de 3 con la onda desfasada.
- **Bloque spam:** cae cuando Choco pasa a menos de 22 px; al aterrizar queda como plataforma (sólida por arriba). Los de la lluvia del jefe se rompen al tocar el piso.
- **Peligros del castillo:** el pozo en sí es vacío (muerte); la estática que sube y baja es un géiser que burbujea 0.8 s antes. Las barras de estática de la sala clave dejan una zona segura sobre cada pilar: el peligro está en los saltos.
- **Enemigos que se activan al acercarse a la cámara**, para que no se adelanten antes de que el jugador los vea.
- **Corrupción progresiva en la pradera:** destellos cortos de tiles con paleta glitch y nubes con texto de N.U.L.L. ("te veo", "∅") a medida que se avanza.
- **Guardián del Slot:** las fases se interpretan así: tras el **primer** pisotón, embestida doble; tras el **segundo**, la lluvia se combina con el salto aplastante (el tercer pisotón lo derrota). Tocarlo de costado mientras está aturdido no duele. Los disparos lo empujan 6 px con un "tink". Su música es una variación más rápida del tema del castillo.
- **Plataformas de la arena:** están a 2 tiles del suelo (antes 4). El salto normal llega a ≈50 px, así que a 64 px eran inalcanzables sin las Botas. A esa altura libran las ondas de choque, pero no el cuerpo del Guardián: si embiste o aterriza debajo, golpea igual (se esquiva saltando desde la plataforma).
- **Cómo se le gana al Guardián:** al empezar la pelea (solo la primera vez en esa partida del nivel) sale un aviso: "¡HACELO CHOCAR CONTRA LA PARED!" / "Cuando quede mareado, pisále la cabeza.". Mientras está aturdido, hasta el primer pisotón, aparece "¡PISÁ!" sobre la flecha.
- **Rescate de Óscar:** la jaula está hecha de caracteres (| # [ ]) en magenta. Orden: diálogo → Óscar se vuelve luz rosada y entra a la barra (+1 cuadrito con animación en el HUD) → pantalla de las Botas → resultados. Al rejugar el nivel con Óscar ya rescatado no hay jaula.
- **Rótulos sin Y:** el hueco "_" reemplaza también la conjunción ("pisá el disquete _ pateálo"). Óscar suspira junto a esos rótulos cuando ya fue rescatado (al rejugar).
- **Vida extra por bits:** al llegar a 100 aparece "¡VIDA EXTRA!".

### Música

- Cuarto (lo-fi con marimba lejana), Pantalla de Carga (ambiente de "cargando"), motivo de N.U.L.L. (4 notas disonantes, para sus apariciones) y Mundo Cartucho con cuatro variaciones: pradera, cuevas (más grave y espaciada), castillo (en menor) y Guardián.

### Desarrollo

- **Vidas infinitas (F9 con `?debug=1`):** morir no gasta vidas ni lleva al Game Over. Es distinto de F2 (invencible), que evita el daño. `?scene=boss1` (también en el menú de desarrollo) arranca directo en la arena del Guardián y reaparece ahí.
- Atajos nuevos: `?scene=prologue`, `?scene=loading` y `?scene=level1`; también están en el menú de desarrollo (`?scene=dev`).
- La lógica común de los niveles de plataformas vive en `src/levels/PlatformLevel.js` (la sala de pruebas también la usa). Los mapas se arman con `src/levels/mapBuilder.js`.

## Hito 4 · Nivel 2 (La UNA)

### Exploración

- **Salas:** 9 interiores (vestíbulo, soda, sala vieja, aula 3, pasillo principal, laboratorio, biblioteca, biblioteca sala 2 y auditorio), con el mapa del documento. La biblioteca tiene dos salas porque el documento pide "2 salas de dificultad creciente". Las puertas cambian de sala con un fundido corto.
- **Interactuar es solo E** (o Y en el gamepad). Espacio queda para el salto corto con las Botas, que se usa sobre las pilas de libros bajas.
- **Mochila:** X (la tecla de disparo, que no se usa en la exploración) abre la mochila para usar comida de la soda fuera de las batallas. La empanada fuera de batalla solo da energía.
- **Ventana de energía y RAM:** una línea debajo de las vidas. La barra de chocolate muestra los cuadritos según la energía (10 por cuadrito). La RAM que se muestra es con la que empieza cada batalla (6).
- **Dos terminales de guardado:** la del vestíbulo (del documento) y otra en el pasillo, junto a la puerta del auditorio, para no repetir medio nivel antes del jefe. Guardar llena la energía y deja el progreso del nivel (carnés, puzzles, mochila, bits) en la ranura. Al volver a entrar al nivel, se sigue desde la última terminal.
- **Bits:** la recompensa por bug es de 8 a 12 bits según el bug, y hay bits sueltos en las salas. La regla de 100 bits = 1 vida se mantiene. Los bits sueltos no reaparecen al morir, pero los bugs vencidos sí (como dice el documento).
- **Huir:** si sale bien, Choco parpadea 1.6 s y el bug se queda quieto con un "?" para que se pueda pasar.
- **NPCs:** los compas y profes son personas genéricas pixeladas (no de chocolate), con aberración cromática y "..." en magenta para mostrar que están en loop. La señora de la soda no glitchea.
- **Rótulos sin Y:** siguen en este nivel ("Bienvenid_ a la UNA"). El ejemplo "Sal_da de emergencia" del documento no se usó porque "salida" no tiene Y. Si Óscar ya fue rescatado, suspira la primera vez que se lee cada rótulo.

### Puzzles

- **Laboratorio:** cada computadora muestra 1/0 y su valor (128…1) en el piso; la pantalla grande muestra el objetivo y la suma actual. Si el binario está mal, suena un buzzer, sale un bug al azar y empieza la batalla. Las computadoras quedan como estaban para corregir.
- **Aula 3:** dos circuitos separados por rejas. Circuito 1: (A AND NOT B) OR (C AND D). Circuito 2: (A XOR B) AND NOT (C XOR D) AND (B OR C), empezando en A=1, B=1, C=0, D=1. Se resuelve con 2 cambios; con 3 cambios sin abrir, se reinicia. Las pruebas verifican que el mínimo esté entre 2 y 3.
- **Biblioteca:** los estantes se empujan caminando contra ellos, alineados (si se mantiene la dirección, siguen avanzando de a un tile). Las pilas de libros bloquean los estantes pero se saltan con las Botas. La sala 1 se resuelve sin saltar.
- **Y dorada de la biblioteca:** está en un nicho tapado por un cuarto estante que no hace falta para abrir la reja. La solución "obvia" deja ese estante encerrado para siempre; la alternativa es usarlo para tapar una de las marcas. Si se pierde, la palanca de reinicio deja intentarlo otra vez (el carné ya queda). Las pruebas recorren las dos soluciones.
- **Y dorada de la sala vieja:** al leer la pizarra por segunda vez, la pizarra tiembla y cae la Y.

### Batallas

- **Turno:** al empezar cada ronda el bug decide su intención; Debug la muestra (con la debilidad) durante 2 rondas.
- **Golpe con timing:** el marcador va y vuelve dos veces por la barra; si no se presiona, sale un golpe normal. Centro (±7 % de la barra) = crítico ×1.5; cerca del centro sale "BIEN" (daño normal).
- **Debug:** "el próximo Compilar contra la debilidad hace ×2" se interpreta como "el próximo Compilar después de Debug hace ×2" (se gasta en ese golpe). Se suma con el crítico.
- **Defensa:** el bug se prepara entre 0.7 y 1.1 s (siempre más de 0.4 s), un anillo amarillo se cierra sobre Choco y el destello blanco marca el impacto. Perfecto: ±1.5 frames (3 frames en total) → 0 daño. Bien: ±0.12 s → mitad (redondeada hacia abajo). Presionar antes de tiempo bloquea el intento ("MUY PRONTO"), para que no se pueda apretar sin parar.
- **Gimmicks:** Loop Infinito se cura al final de su tercer turno (y vuelve a contar); Race Condition va primero el 50 % de las rondas y ataca dos veces el 30 %; Memory Leak quita 1 de energía máxima al final de cada ronda (vuelve al terminar la pelea); Spaghetti Code enreda en rondas alternas. El enredo cambia Compilar, Debug o Commit --force por otro comando al azar el 50 % de las veces; Refactor, Objeto y Huir no se enredan, y una defensa perfecta evita el enredo.
- **Fondos de batalla** según la sala: pasillo con casilleros, soda, pizarra, laboratorio, biblioteca y tarima.

### MC Stack Overflow (rap)

- El beat va a 90 BPM y la batalla usa el reloj de audio de la canción, así que la ventana de ±0.12 s está pegada al beat que se escucha.
- Cada línea de Stack dura 2 compases; las palabras aparecen al ritmo y la del tiempo actual se ilumina en amarillo. Elegir tiene 6 compases (con indicador de tiempos). Si se acaba el tiempo, cuenta como "sin rima".
- Las opciones muestran la primera línea; abajo se ve la respuesta completa de la que está seleccionada.
- **Si Stack sigue con flow después de la ronda 3** (por respuestas flojas), hay 2 rondas extra originales que se repiten hasta que alguien gane.
- **Ataque de desbordamiento entre rondas:** ventanas de error que vuelan hacia Choco y quitan 4 de energía (0 con defensa perfecta, 2 con "bien"). Quedarse sin energía también es perder la batalla.
- **Perder:** cuesta una vida y la batalla se repite desde la ronda 1 ahí mismo, sin volver a la terminal.
- **Puntaje:** 100 por respuesta correcta y 40 por floja, el doble en el beat.

### Rescate

- Orden: la jaula se abre, Stward baja y dice su verso → Stack se cierra ventana por ventana → Stward camina hasta Choco y entrega la laptop (diálogo) → luz amarilla a la barra (+1 cuadrito y energía llena) → pantalla de la Laptop Debugger → demostración de la Vista Debug de 10 s en el auditorio (se puede pasar con Enter después de 4 s) → "no debiste volver" → resultados.
- Al rejugar con Stward ya rescatado no hay jaula: Stack colapsa y se termina el nivel.

### Vista Debug en plataformas

- Con la laptop, en los niveles de plataformas la Vista Debug también marca los bloques invisibles (con "?"), las paredes agrietadas y un círculo en el punto débil de cada enemigo (en el Guardián, la cabeza). En el nivel 2 muestra las rutas de los bugs.

### Desarrollo

- Atajos: `?scene=level2` (La UNA), `?scene=auditorio` (con los 3 carnés), `?scene=battle` (las 5 batallas seguidas) y `?scene=rap`. También están en `?scene=dev`.
- F3 en el nivel 2 da todos los objetos y los 3 carnés; F10 da solo los carnés.
- `TopdownLevel` es la base de los niveles cenitales y se va a reutilizar en el nivel 3.

## Hito 5 · Nivel 3 (Novacomp)

### Estructura

- **Seis salas en línea:** Recepción (3-A) → Open space (3-B) → Terraza (3-C) → Pasillo de gerencia (3-D) → Sala de servidores (3-E, jefe) → Sala de práctica del escudo. Se pasa de una a otra por puertas con un fundido corto, como en el nivel 2.
- **Checkpoints automáticos** al entrar por primera vez a Recepción, Open space, Gerencia y la Sala de servidores (la terraza no tiene, como dice el documento). El de los servidores no está en el documento: se agregó para no repetir medio nivel antes de cada intento contra DEADLINE (igual que la arena del nivel 1).
- **Contacto con un BotSeg (o un dron en alarma):** quita un cuadrito y la sección vuelve a empezar desde la puerta por la que se entró (enemigos, alarma y cargas de vapor de cero). Si se acaban los cuadritos, se pierde una vida y se vuelve al último checkpoint con la barra llena.
- **Bits:** hay algunos en cada sala (el documento no los menciona en este nivel) para que la pantalla de resultados y las vidas extra sigan funcionando.

### Sigilo

- **Conos:** 60°, 80 px los BotSeg y 96 px las cámaras. Se dibujan siempre encima de la oscuridad y cambian de color: crema (normal), amarillo/naranja (sospecha), rojo (alarma). Tapan la vista las paredes, los casilleros, las impresoras, los racks, la caja fuerte y las puertas cerradas; el vidrio, los escritorios, las plantas y la baranda no.
- **Sospecha:** el medidor está sobre la cabeza del enemigo. Con el primer avistamiento suena un "?"; si Choco sale del cono, el BotSeg va a revisar el último punto donde lo vio, mira alrededor 1.6 s y vuelve a su ruta.
- **Alarma:** dura 12 s y se reinicia cada vez que algún enemigo ve a Choco. Los BotSeg persiguen el último punto conocido (a 60 px/s, menos que caminar, así que se puede huir). **Los drones también bajan a perseguir durante la alarma:** sin esto, en la terraza (que no tiene BotSeg) la alarma no tendría consecuencias. Los láseres activan la alarma además de quitar un cuadrito.
- **Ruido:** caminar normal a menos de 40 px de un BotSeg hace ruido (se ven las ondas); disparar y chocar con la aspiradora hacen ruido en 80 px. Con Shift (35 px/s) no hay ruido. Las cámaras y los drones no reaccionan al ruido.
- **Escondites:** casilleros (en la pared) y escritorios con mantel morado. Con E Choco se mete adentro (se le ven los ojitos) y con E sale por donde entró. Esconderse funciona siempre, aunque lo estén persiguiendo: los bots van al último punto donde lo vieron y, si no lo encuentran, vuelve la calma. Hezron se esconde en su propia nube.
- **Báculo:** el disparo normal aturde (BotSeg 2 s, cámara 3 s y dron 2 s, que el documento no menciona). Se dispara en 4 direcciones y el cargado atraviesa. Los disparos pasan por encima de los escritorios.
- **Daily:** al entrar a la sala de vidrio, Choco queda 3 s atrapado en la reunión, con globos que no se pueden saltar ("Ayer trabajé en... Hoy voy a... Sin bloqueos."). Mientras tanto los guardias no lo ven (están en reunión), pero siguen caminando, así que esos 3 s cambian el ritmo de las rutas. Pasa cada vez que se entra.
- **Café:** recupera un cuadrito una sola vez; si la barra está llena no lo gasta.

### Hackeo

- Recepción (tutorial): 4 flechas en 4 s, apaga la cámara de la puerta 10 s. Terminales normales: 5 flechas en 3 s. Caja fuerte: 7 flechas en 2.5 s. Terminales del jefe: 6 flechas en 3 s.
- Durante el hackeo el nivel sigue andando y Choco no se puede mover; un golpe lo interrumpe. X cancela. Se acaba el tiempo: falla sin alarma. Tres errores: alarma (en el jefe, la terminal se bloquea 5 s).
- Efectos usados: apagar una cámara 10 s (Recepción, Open space, Gerencia), desviar la ruta de un BotSeg para siempre (Open space), apagar los láseres 6 s (Gerencia) y abrir la caja fuerte. Las terminales de efecto temporal se pueden volver a usar cuando se acaba el efecto.
- **Vista Debug en este nivel:** muestra los cables (con pulsos) de cada terminal a lo que controla, las rutas de los BotSeg y las órbitas de los drones, y la Y escondida del escritorio de Choco.

### Hezron y el vapor

- Se rescata al acercarse a su bean bag en la terraza. Sigue el rastro de Choco y suelta la nube con C, delante de Choco (18 px), donde cae en 0.25 s. La nube mide 24 px de radio, dura 6 s y bloquea cualquier rayo de visión que la cruce; Choco adentro de la nube también queda tapado. 3 cargas por sala; se recargan al entrar a una sala nueva o al reiniciar la sección.
- Cada nube viene con un sabor distinto en un globito ("Horchata con menta", "Café de la oficina, edición lunes", "Cas con sal"...).
- La terraza tiene dos carriles separados por maceteras: arriba, 2 drones que vigilan la salida (el tutorial de la nube); abajo, 3 drones en fila que llevan al toldo con la Y dorada.

### DEADLINE

- **Cómo vencerlo:** hackear una terminal congela el reloj 6 s y abre la pantalla; 8 disparos normales (o 3 cargados) vacían un tercio. Si no se vacía a tiempo, esa terminal se reinicia en 3 s. El daño no pasa de un tercio al siguiente. Con la pantalla cerrada los disparos rebotan.
- **Ataques en ciclo** (abanicos, barrido, notificaciones) con pausas que se acortan en cada tercio. Abanicos de 5 y 8 sobres, luego 8+8 y 8+11. El barrido avisa con una línea punteada y la manecilla brillando 1 s, y un tic-tac más rápido; las columnas-servidor tapan el láser. Las notificaciones persiguen 4 s; una nube de Hezron las confunde y los disparos las revientan.
- **Cuenta regresiva:** al vencerse quita un cuadrito (aunque Choco sea invencible en ese momento) y vuelve a 1:00. El reloj no corre mientras está congelado. En el HUD dice "ENTREGA EN".
- **Último tercio:** las terminales que faltan saltan a otras posiciones con un glitch.
- **Derrota:** las manecillas se caen, "SIN FECHA DE ENTREGA", el reloj se desarma; Hezron dice "Tranqui. Ya no hay prisa.", se vuelve luz lila y se une a la barra (+1 cuadrito), entrega el Escudo Firewall y se abre la puerta a la sala de práctica.

### Escudo Firewall y práctica

- 1.5 s de burbuja hexagonal, recarga de 3.5 s (el ícono del HUD se llena), 60 % de velocidad y sin disparar. Parry: el golpe llega dentro de los 0.15 s después de activarlo → el proyectil vuelve a su origen más rápido, con destello, 6 frames de hit-stop y sonido propio.
- **Sala de práctica:** una torreta de prueba dispara cada 1.7 s (con aviso). Hay que bloquear 2 disparos y hacer 2 parry; después se abre la salida y termina el nivel. Los disparos de la torreta solo empujan, no quitan cuadritos.
- **En plataformas** el escudo ya funciona (C): bloquea los golpes y el contacto, y si el golpe llega en la ventana de parry hace el destello y el hit-stop. Reflejar proyectiles queda conectado para cuando haya enemigos que disparen (niveles 4 y 5); en el nivel 1 no hay.

### Arte y audio

- Oficina de noche con oscuridad por capas: luces de Choco, pantallas de los escritorios, terminales, ventanas, láseres, el reloj y los propios conos. Con alarma, la pantalla pulsa en rojo.
- Música de Novacomp en Re menor a 100 BPM con capa de alarma (percusión y sirena) que entra y sale con la alarma. DEADLINE en Mi menor a 132 BPM con el tic-tac en la percusión, más un tic-tac propio del reloj que se acelera en cada tercio y en los últimos 30 s.
- Gente de oficina nueva para el daily (con gafete y audífonos) y retratos nuevos para el compa de oficina y DEADLINE.

### Desarrollo

- Atajos: `?scene=level3`, `?scene=terraza`, `?scene=deadline` (en los servidores, con Hezron) y `?scene=escudo` (sala de práctica). También están en `?scene=dev`, que ahora tiene scroll.
- F10 en el nivel 3: Hezron se une al instante (con 3 cargas).

## Hito 6 · Nivel 4 (Santa Cruz)

### Estructura

- Secciones en orden: 4-A Entrada al pueblo (72 tiles) → 4-B Plaza (96) → 4-C Redondel (40, con un ruedo de 22) → 4-D Ruinas del Campanario (escalada vertical de unas 7 pantallas) → arena del Torito Kernel → 4-E Atardecer (80). Se pasa de una a otra caminando por el borde derecho; a la arena se entra por la puerta de la cima de las ruinas.
- **Las ruinas miden unas 7 pantallas de alto, no 12.** Con 12, la escalada sola se comía casi todo el tiempo objetivo del nivel (12–18 min). Es un número en `maps.js`.
- **Checkpoints:** inicio de la plaza, entrada del redondel y cima de las ruinas (antes del jefe), como dice el documento. Hay un cuarto al empezar el atardecer, para que quien salga del juego ahí no tenga que volver a pelear con el jefe.

### Calor y sombra

- El sol pega desde arriba. Cada cosa que da sombra (copas de los guanacastes, carretas, toldos de los puestos, la tarima, aleros de tejas, el arco del patio, los capiteles de la arena) proyecta una columna de sombra hasta el suelo. Choco está en la sombra si el centro de su cuerpo cae dentro de una columna. Se dibuja como un tinte suave, una mancha en el suelo y un borde claro punteado donde empieza el sol.
- **Las ruinas son al revés:** adentro es sombra; calientan las columnas de sol que entran por los huecos y se mecen.
- **Atardecer:** sin calor y sin termómetro.
- Al llegar a 100 se pierde un cuadrito con "¡QUEMA!" y el medidor baja a 40. El escudo no lo bloquea; la cobertura de cacao sí lo absorbe. Desde 60 caen gotas de chocolate, suena un chisporroteo suave y ondulan las 14 filas de arriba y de abajo de la pantalla.
- **Bebederos:** tocarlos enfría a 0 (con chorrito y "¡AGUA!").
- Al reaparecer, el calor vuelve a 0.

### Enemigos

- **Toro glitch:**
  - Patrulla. Si ve a Choco de frente (a 120 px y a su altura), raspa 0.8 s con los ojos brillando y embiste hasta 220 px, sin tirarse por los bordes.
  - Caerle en el lomo rebota sin daño; los cuernos y los costados sí duelen. Se esquiva con el doble salto. Aguanta 4 disparos.
- **Bombetero:**
  - Está en los techos. Enciende la mecha 0.6 s y tira una bombeta en parábola hacia donde estaba Choco. Antes de que caiga aparece una marca roja en el suelo, y explota en 20 px de radio.
  - El escudo la bloquea; el parry se la devuelve y lo destruye.
  - Las bombetas atraviesan los banderines (son tela) y no chocan con el techo de quien las tira.
- **Sabanero:**
  - Gira el lazo 0.75 s y lo lanza recto. Si atrapa a Choco, lo jala hacia él a 70 px/s. No quita vida: el peligro es el pozo que hay entre los dos.
  - Atado no se puede saltar, pero sí disparar: un disparo que cruza la cuerda la corta. Con el escudo, el lazo rebota.
  - Llegar hasta él duele y suelta a Choco.
- **Zanates:** van en bandadas de 3–4, posados. Al acercarse Choco se alborotan y, de a uno, graznan y abren las alas 0.45 s antes de lanzarse en picada en línea recta hacia donde él estaba; después se van. Se pisan o se disparan, y contra el escudo caen.
- **Tamal explosivo:** una olla en lo alto de una cuesta tiembla 0.6 s y suelta un tamal que rueda cuesta abajo. Explota al chocar con una pared, al tocar a Choco o con un disparo.
- **Plataformas que se desmoronan** en las ruinas: misma lógica que las del nivel 1 (tiemblan 0.45 s, caen y vuelven a los 3 s), pero dibujadas como ladrillo.

### Misión de la rosquilla

- Los 4 puestos de la plaza (chorreada, tanela, arroz de maíz y empanada) se usan con ↑/E. Al recoger una comida aparece el comentario que Fabiola va a hacer después. Choco lleva solo una: tomar otra la cambia (con aviso), y la que lleva se ve en un cuadrito abajo a la izquierda del HUD.
- **El patio trasero** está en alto, sobre un arco por donde pasa la calle. Solo se llega por los techos: casa 2 → dos plataformas fantasma (Vista Debug) → la pared del patio. La Y dorada 1 está sobre la segunda plataforma fantasma. Para salir se baja por un tablón (↓ + saltar).
- **Al rescatar a Fabiola:**
  - Si Choco lleva la rosquilla, ella la recibe (la tiene en la mano) y entrega la **Receta de la Abuela**, que queda guardada en la partida (`grandmaRecipe`). Usarla para la cobertura del nivel 5 es parte del Hito 7.
  - Si lleva otra comida, Fabiola dice su comentario sobre ella.
  - Sin comida, solo dice el diálogo de la historia.
- La comida no se pierde al morir, pero sí con Game Over (se reintenta el nivel desde el inicio).

### El Redondel

- Al pasar la puerta se cierran las dos. Las oleadas entran a los 0, 18 y 36 s (1, 2 y 3 toros que salen por las puertas). Además caen bombetas del cielo cerca de Choco, cada 4.5, 3.2 y 2.4 s, con marca.
- Termina al aguantar 60 s o al derrotar 6 toros; el contador está arriba.
- Solo hay sombra **sobre** las gradas altas, que tienen techo de manta; abajo de ellas pega el sol.
- La Y dorada 2 aparece en la punta de la bandera central al empezar la tercera oleada. Si el redondel termina sin tomarla, desaparece; se puede intentar otra vez repitiendo el nivel.
- Morir en el redondel lo reinicia desde la puerta.

### El Torito Kernel

- **Arena:** dos columnas de piedra con capitel (dan sombra a los costados) y dos plataformas altas en las esquinas. Fabiola cuelga en una jaula de la campana.
- **Ataques** al azar, sin repetir: embestida, pisotón (dos ondas que las columnas frenan), bombetas de nariz (3 en abanico, con la nariz brillando 0.6 s) y humo. Después del humo siempre embiste. Si está pegado a una columna, en lugar de embestir contra ella pisa.
- **Humo:** tapa durante 3 s la mitad de la pantalla donde está el toro; con la Vista Debug se ve casi todo. Se escucha el raspado de la embestida que viene.
- **Daño:**
  - Solo recibe daño con la Vista Debug activa, mientras está aturdido y en el chip. Queda aturdido 3 s al chocar con una columna y 2 s con una bombeta devuelta.
  - El chip se dibuja arriba, en la parte de atrás del lomo, pero lo que recibe los disparos es toda la parte de atrás del cuerpo, para que se le pueda pegar parado.
  - El disparo normal quita 1 y el cargado 3. Fuera del chip suena "tink".
  - Con la vista activa y antes del primer golpe, el chip dice "¡AQUÍ!".
- **Fase 2 (15 de vida):**
  - El sol pasa a 16/s y el toro parpadea en rojo.
  - La embestida es doble: rebota en la pared y vuelve.
  - Cada golpe contra una columna la agrieta, y al segundo se cae con su capitel (y se va su sombra).
- **Derrota:**
  1. Se desarma en piezas de carreta, suena la campana y cae la jaula.
  2. Fabiola camina hasta Choco y dice su diálogo (con la comida, si hay).
  3. Se vuelve luz turquesa y suma +1 cuadrito: **barra completa, 5**.
  4. Sale la pantalla del Lazo de Fibra Óptica y la frase del sabanero.
  5. Fundido al atardecer.

### Lazo de Fibra Óptica y práctica

- **Controles:**
  - Con un nodo al alcance (resaltado con corchetes; el ícono del HUD se ilumina), **mantener V** lanza el lazo.
  - Colgado, ← → columpian y ↑ ↓ acortan o alargan la cuerda.
  - **Soltar V o saltar** hace salir disparado con la velocidad tangencial más −120 hacia arriba, y recarga el doble salto.
  - Tocar el suelo colgado suelta sin impulso. Un golpe también suelta.
- La punta de la cuerda viaja al nodo a 700 px/s (no es instantáneo). La cuerda es cian, con pulsos de luz.
- **Impulso al soltar:** durante 0.35 s en el aire no se frena por encima de la velocidad máxima, salvo que se pida la dirección contraria. Sin esto, la desaceleración en el aire se comía el columpio.
- **"Jalar" objetos** (cajas, el núcleo del jefe final) llega en el Hito 7, junto con lo que hay que jalar.
- **4-E:**
  - Reto 1: un nodo sobre un hueco.
  - Reto 2: lazo + doble salto hasta una cornisa alta.
  - Reto 3: cadena de 5 nodos.
  - Cada reto se anuncia con un cartel, y las pruebas simulan los tres con la física real.
  - Una cadena opcional de 2 nodos lleva a la Y dorada 3, en una cornisa alta sobre el portal.
- **En el barranco caer no cuesta vida:** Choco vuelve a la última cornisa, como en el prólogo, porque es una práctica. El portal del final termina el nivel.

### Arte y audio

- **Paleta del documento:** sol `#FFB347`, adobe `#F5E6C8`, tejas `#B5532E`, guanacaste `#6E8B3D` y atardecer rosado-morado.
- **Fondo en 4 capas:**
  - cielo con un sol al que a ratos le aparecen ojos rojos, y estática;
  - montañas;
  - techos del pueblo, con el campanario y gente glitcheada bailando;
  - en la plaza, una guirnalda de banderines en primer plano.
- **Música original:**
  - Santa Cruz: en Re mayor, con marimba, rasgueo y un bajo que alterna 6/8 y 3/4.
  - El Torito Kernel: el mismo tema en menor, más rápido y pesado.
  - El atardecer: versión lenta, solo con marimba y colchón.
- **Efectos nuevos:** lazo (silbido y "tink"), bombeta (silbido y explosión), mecha, toro, zanates, olla de tamales, humo, rugido, campana, agua, quemadura, chisporroteo del calor y portal.

### Desarrollo

- Atajos: `?scene=level4`, `?scene=plaza`, `?scene=redondel`, `?scene=ruinas` (abajo de la escalada), `?scene=torito` y `?scene=lazo`. También están en `?scene=dev`.
- Sin partida, el nivel 4 empieza con Botas, Laptop, Escudo y 4 cuadritos.
- F10 en el nivel 4: Choco recibe la rosquilla perfecta, para probar el final de la misión.

## Modo desarrolladora (Opciones)

- Pedido por Stward para probar todo sin jugar en orden. Está en **Opciones → Modo desarrolladora** (Sí/No), se guarda con las opciones (no con la partida) y funciona también en el build de producción.
- **Mapas abiertos:** todos los recuerdos del mapa se pueden jugar. No se marca nada como completado: al apagarlo, el mapa vuelve a mostrar el progreso real.
- **Vidas infinitas** en todos los niveles: morir no gasta vidas y nunca hay Game Over (lo mismo que F9 en `?debug=1`).
- **Equipo mínimo:** al entrar a un nivel, Choco tiene como mínimo los objetos y cuadritos de los niveles anteriores (por ejemplo, el nivel 4 empieza con Botas, Laptop, Escudo y 4 cuadritos), para que el nivel se pueda jugar como fue diseñado. No se guardan en la partida.
- Completar un nivel en este modo sí cuenta normalmente (récord, Y doradas, fundador y objeto).
- El mapa muestra "MODO DEV" mientras está activo.

## Hito 7 · Nivel 5 (El Código Puro) y final

### El Stack

- **Cinco secciones verticales separadas** (5-A Push, 5-B Firewall, 5-C Memoria fantasma, 5-D Punteros, 5-E Overflow), de una pantalla de ancho y en total unas 14 pantallas de alto. Cada una termina en una cornisa con la salida en la pared derecha; la siguiente empieza abajo.
- **Checkpoints:** al inicio (5-A), al empezar 5-D (después de la sección 3) y en la cima del Overflow (antes del jefe).
- **Push:** cada plataforma aparece deslizándose desde la pared cuando Choco pisa la anterior. Están a 4 filas una de otra: sin doble salto no se sube.
- **Firewall:**
  - Las capas de fuego cruzan todo el pozo. Sin escudo, el fuego empuja de vuelta por donde se vino y quita un cuadrito: no se puede atravesar aprovechando la invencibilidad. Con el escudo activo se pasa. De plataforma a plataforma hay 4 filas a través del fuego (un doble salto).
  - Las torretas de Excepciones disparan balas reflejables. Solo su propia bala devuelta con parry las rompe, y al romperse abren su candado. El báculo rebota en ellas.
- **Memoria fantasma:** tramos de 3 plataformas fantasma con descansos de un sentido en medio, para apagar la laptop y recargar.
- **Punteros:** cornisas en paredes alternas con un pozo de 8 tiles en medio (no se salta) y un nodo del lazo encima de cada cruce. Caer al pozo no es muerte: se vuelve al piso de la sección.
- **Excepciones** (5-D y 5-E): un aviso parpadea en el borde de la pantalla, del lado más lejano a Choco, y 0.8 s después cruza una bala recta a su altura.
- **Overflow:**
  - La masa sube a 12 px/s, 2.5 s después de entrar (la primera vez, después de que N.U.L.L. habla). Al llegar arriba deja de subir.
  - Tocarla quita un cuadrito (el escudo no la bloquea) y devuelve a Choco al último suelo firme por encima de la masa. La masa baja 56 px para dar aire.
  - Morir ahí vuelve al checkpoint del inicio de 5-D.
- **Y doradas:**
  - 5-B: un cubículo cerrado por el candado de la segunda torreta, debajo del fuego.
  - 5-C: una cadena fantasma larga que gasta casi toda la batería.
  - 5-E: arriba a la derecha, sobre Segmentos corruptos.
- **Ecos de los fundadores:** al empezar cada sección aparece un eco de luz en el borde con un consejo corto: Óscar en Push, Hezron en Firewall, Stward en Memoria fantasma, Fabiola en Punteros y los cuatro en el Overflow.
- **Receta de la Abuela:** cobertura de cacao al empezar el nivel y en cada reaparición (no en Modo Hotfix).

### Lazo: jalar

- El núcleo de N.U.L.L. es un objetivo "para jalar". Tiene prioridad sobre los nodos comunes cuando está al alcance.
- Al llegar la punta al núcleo, Choco no se columpia: lo jala, sale con un saltito (−170) y recupera el doble salto.
- **Al engancharse a un nodo**, el columpio ignora las plataformas de un sentido durante 0.2 s. Sin esto, engancharse estando todavía sobre una cornisa "aterrizaba" en ella al primer cuadro y soltaba.

### N.U.L.L.

- **Arena:**
  - Una pantalla con suelo y 3 plataformas: dos laterales a media altura y una al centro, más alta.
  - N.U.L.L. flota debajo de la barra del jefe. Los nodos solo se ven y se usan en la fase 4.
  - **El monitor no hace daño por contacto**: lo peligroso son sus ataques. Así no castiga estar en la plataforma del centro cuando baja.
- **Fase 1 · Ondas:**
  - Los patrones van en este orden: sencilla, doble, pilares, triple, de dos alturas, y después repite la parte difícil.
  - Las ondas salen de debajo del monitor hacia los dos lados.
  - La onda alta es una banda de 16 a 38 px sobre el suelo y llega 0.5 s después de la baja. Las pruebas confirman que no se pasa con un salto simple y sí con el doble.
  - Los pilares salen donde está Choco (3 seguidos, con marca 0.5 s antes); por eso no sirve esconderse en las plataformas.
  - Después de cada patrón baja 3 s a la altura de las plataformas. 6 de daño: el normal quita 1 y el cargado 3.
- **Fase 2 · Ráfagas:**
  - Espiral, abanicos dirigidos a Choco y lluvia.
  - Son reflejables una de cada 4 balas de la espiral, la del centro de cada abanico y una de cada 3 de la lluvia.
  - La bala devuelta persigue a N.U.L.L.
- **Fase 3 · Invisible:**
  - Hay 3 copias iguales. La real solo recibe daño con la Vista Debug activa; con la vista se le ve una mira cian.
  - Todas disparan, avisando con un destello.
  - Una falsa golpeada explota en 3 Fragmentos (duran 7 s) y vuelve a los 2.2 s.
  - Cada golpe a la real las baraja. La oscuridad es menor con la Vista Debug.
- **Fase 4 · Núcleo:**
  - El suelo y las plataformas se derrumban en una cinemática corta; Choco queda en una plataforma pequeña.
  - Las dos plataformas pequeñas se alternan: 4.2 s visibles (parpadean el último 0.8 s) y 2 s ausentes. Durante las cinemáticas quedan fijas.
  - **Caer al vacío quita un cuadrito (no una vida)** y devuelve a una plataforma, igual que el Overflow.
  - Láser:
    - Aviso de 0.8 s: una línea en el ángulo inicial y la zona que va a barrer.
    - Después barre 1 rad en 1.1 s. Mientras dispara, N.U.L.L. deja de orbitar.
  - El núcleo se puede enganchar cuando pasa a menos de 44 px de un nodo (brilla en blanco).
  - Jalado, N.U.L.L. baja hacia Choco y queda expuesta 3 s. Solo cuenta un disparo cargado al núcleo.
- **Entre fases:** hay 1 s de pausa y luego el diálogo de N.U.L.L. con el consejo del fundador. Se recupera 1 cuadrito y entra una capa más de la música.
- **Muerte:** se reintenta la fase actual.
- **Game Over:** se vuelve al checkpoint de antes del jefe, en la fase 1, como dice el documento del nivel 5. Es la única excepción a la regla general, donde un Game Over reinicia el nivel desde el inicio.
- **El parche:**
  - 4 líneas de 6 flechas en 20 s. Un error reinicia la línea actual.
  - Cada línea es de un fundador (Óscar, Stward, Hezron y Fabiola), que celebra al terminarla.
  - Si se acaba el tiempo, el pulso quita un cuadrito, **pero nunca el último**, y el parche se reintenta desde la primera línea con flechas nuevas.

### Final

- **Montaje de rótulos:** muestra 9 rótulos con huecos (niveles 1, 2 y 4) y los completa con "y". "Bienvenid_ a la UNA" queda fuera porque con "y" no se lee bien.
- **Celebración de los fundadores:** cada uno tiene 2.4 s, con un texto corto en lugar de caja de diálogo.
- **Trofeo:** un sprite de 18×20 dibujado a ×3. Choco lo levanta.
- **Epílogo:** es el cuarto del prólogo, con el trofeo en el estante. Después hay un acercamiento a la tele, donde el cursor escribe "hola :)".
- **Estadísticas finales:** tiempo total, muertes, Y doradas (x/15) y mejor tiempo de cada nivel. También avisan que se desbloqueó el Modo Hotfix.
- **Créditos:**
  - Mantienen el tema del título hasta el popurrí del Hito 8.
  - Con las 15 Y doradas, al terminarlos sigue la escena extra: Óscar y la Y cenando a la luz de las velas, con la marimba del atardecer. Al final vuelve al título.
- **Música nueva:**
  - El Stack: tensa, con el bajo subiendo nota por nota.
  - N.U.L.L. Final: con 4 capas (el motivo, el arpegio roto, el colchón y el tema de Choco transportado, que choca con el motivo).
  - Parche y final: el tema de Choco lento; el motivo de N.U.L.L. resuelve en Mi mayor.

### Modo Hotfix

- Se desbloquea al terminar el nivel 5. Se activa o se apaga en el menú del mapa (ESC → "Modo Hotfix"), que solo aparece cuando ya está desbloqueado.
- Se guarda en la partida (`hotfix`). El mapa muestra "HOTFIX" y la barra con 1 cuadrito.
- **1 cuadrito fijo** en todos los niveles: rescatar a un fundador no suma cuadritos.
- **Sin cacao:** los Granos y Trozos de Cacao se vuelven bits, y la Receta de la Abuela no da cobertura.
- **La mitad de los checkpoints:** la lista está en `HOTFIX.SKIP_CHECKPOINTS`.
  - Nivel 1: se apaga el segundo.
  - Nivel 2: la terminal de guardado 2 (dice que no guarda).
  - Nivel 3: open space y servidores.
  - Nivel 4: redondel y atardecer; quedan la plaza y el de antes del Torito.
  - Nivel 5: el de 5-D; quedan el inicio y el de antes del jefe.
  - Los checkpoints apagados se ven tenues.

### Desarrollo

- **Atajos:**
  - `?scene=level5`.
  - Secciones del Stack: `push`, `firewall`, `fantasma`, `punteros` y `overflow`.
  - Jefe: `null`, `null2`, `null3` y `null4`.
  - `parche`, `final`, `estadisticas` y `extra`.
  - También están en `?scene=dev`.
- **F10 en el nivel 5:** en la pelea termina la fase actual; en el Stack lleva a Choco a la salida.

## Hito 8 · Pulido y balance

### Audio

- **Popurrí de los créditos** (`src/audio/songs/creditos.js`):
  - Toma los primeros compases de cada tema y los encadena a 144 BPM: Choco, Mundo Cartucho, la UNA, la batalla, DEADLINE, Santa Cruz y el Stack. Cierra con el final de la sección B del tema de Choco.
  - Cada tramo termina con un redoble de caja. Una vuelta dura unos 38 s.
  - "Gracias por jugar" queda en pantalla hasta que termina el popurrí. Si se acelera con confirmar, no se espera la música.
- **Vista Debug:** se enciende con un clic, un barrido y un bip tipo terminal, y se apaga con un barrido hacia abajo. Mientras está activa suena un zumbido suave. El zumbido se corta al pausar, al entrar a una batalla o a cualquier escena que se abra encima, y al salir del nivel.
- **Gamepad en "Presioná cualquier tecla":** un botón del control también entra. Algunos navegadores no aceptan el gamepad como gesto para activar el audio; en ese caso el audio arranca con la siguiente tecla, clic o toque.

### Build de producción

- **El modo desarrolladora de Opciones solo existe con `npm run dev`.** En el build no aparece, y una partida que lo tenga guardado lo ignora. Para volver a ponerlo en producción, se cambia `DEV_TOOLS` en `src/core/game.js`.
- **Atajos `?scene=`:** se pasaron a `src/dev/shortcuts.js`, que solo se carga en desarrollo. El build no incluye la sala de pruebas, la prueba técnica, el menú de hitos, la batalla de prueba ni `core/debug.js`.
- **Un solo archivo JS** de unos 750 kB (250 kB con gzip). Se subió el límite de la advertencia de tamaño de Vite a 1000 kB.
- **Versión del título:** v1.0.

### Revisión

- **Textos:** una prueba revisa que toda pregunta y exclamación abra con ¿ y ¡, y que no falten tildes en las palabras comunes. Se exceptúan las pantallas de prueba y las frases cortadas a propósito con "—".
- **Canciones:** una prueba revisa todas las canciones del juego: que las notas sean válidas y que los canales no se desfasen al repetir.
- **Créditos:** el texto que sube se corta antes del desfile de Choco y los fundadores, para no pasarles por encima.
- **Corrección:** el nivel 3 no detenía los sonidos sostenidos al salir (por ejemplo, la carga del báculo).
- **Navegadores:**
  - El build se probó en Chrome y Edge sin errores en consola: título, opciones, créditos y Nueva partida hasta el prólogo.
  - Firefox no está instalado en esta máquina, así que falta probarlo a mano.
- **Balance:** sin datos de partidas reales, no se cambió ningún número. Los tiempos objetivo de cada nivel están en su documento. Los ajustes se harán en `balance.js` con los tiempos y las muertes que muestra la pantalla de resultados.

## Ajustes después del Hito 8

### Nivel 5

- **Plataformas donde Choco no cabía parado:** Choco mide 20 px de alto y estas plataformas quedaban a una sola fila (16 px) de un techo sólido. Al subir a ellas se golpeaba la cabeza y caía.
  - 5-C: el último descanso (columnas 5–8) estaba justo debajo de la parte sólida de la cornisa de salida, y el hueco de un sentido para subir (9–11) quedaba al lado. Además, al saltar desde la última fantasma (2–3), la cornisa sólida de arriba cortaba el salto antes de llegar a la altura del descanso.
    - Ahora el tramo de un sentido va de la columna 2 a la 11.
    - Se comparó simulando con la física del juego todas las combinaciones de salto, doble salto y movimiento. Fantasma → descanso pasó de salir en el 2,9 % de las combinaciones al 33 %; los otros saltos entre fantasmas de la sección salen en un ~27 %. Descanso → cornisa sale en el 82 %.
    - También se probó bajar el descanso una fila, pero la subida a la cornisa bajaba al 48 %.
  - 5-D: igual con la última cornisa (columnas 2–5) y el hueco de 3–5. El tramo de un sentido ahora va de la 2 a la 5.
  - 5-B: la plataforma de G-14 queda a una fila del candado 1, pero solo mientras el candado está cerrado, y no hace falta pararse ahí. Se dejó igual.
  - Una prueba revisa que sobre toda plataforma de los niveles 1, 4 y 5 quepa Choco. Los candados no cuentan porque se abren.
  - Por un malentendido se había bajado una plataforma fantasma de 5-E; se dejó como estaba.

### Modo desarrolladora (solo `npm run dev`)

- **No se muere nunca:**
  - Los golpes se sienten: empujón, parpadeo y sonido. Quitan vida, pero nunca la bajan de 1.
  - Las muertes directas se ignoran: aplastamiento, calor, etc.
  - Caer al vacío devuelve a la última plataforma segura, como en el prólogo.
  - Vale para los niveles de plataformas y los cenitales.
- **Vuelo libre con J:**
  - Funciona en los niveles de plataformas. J lo enciende y lo apaga.
  - Choco vuela con las flechas, sin gravedad ni colisiones, atraviesa paredes y no recibe daño. Mantener salto lo hace más rápido: `DEV.NOCLIP_SPEED` y `DEV.NOCLIP_FAST`.
  - La masa del Overflow lo ignora mientras vuela.
  - J también dispara. Al usar el atajo, la tecla deja de contar hasta que se suelta (`Input.suppress`), para que no salga un disparo.
  - Aparece un aviso en pantalla al encenderlo o apagarlo.
- **Habilidades infinitas:**
  - La Vista Debug no gasta batería y no se bloquea.
  - El Escudo Firewall no tiene recarga: se puede volver a activar en cuanto se apaga.
  - Las nubes de vapor de Hezron no se acaban.
  - En las batallas por turnos la RAM siempre está llena.
  - El doble salto sigue igual (uno por salto), para que las secciones de saltos se puedan probar como las juega la gente. Para moverse sin límites está el vuelo libre con J.

### Controles

- **Reasignar teclas desde la pausa:** antes, la pantalla de Controles solo se podía editar desde Opciones. Desde la pausa era de solo lectura. Ahora se edita desde los dos lados, con el mismo intercambio cuando la tecla ya está en uso. Los cambios se guardan en las opciones.
- **"Saltar" en vez de "Saltar / confirmar":** confirmar en los menús es una acción aparte (Espacio, Z o Enter) que no se reasigna. Si alguien movía el salto a otra tecla, la etiqueta daba a entender que confirmar también cambiaba.
- **Botones del mouse:**
  - Se pueden asignar a cualquier acción, igual que una tecla. Internamente son `Mouse0` (izquierdo), `Mouse1` (central), `Mouse2` (derecho), `Mouse3` y `Mouse4` (laterales).
  - Si el clic derecho está asignado, no se abre el menú contextual. Si los botones laterales están asignados, no navegan hacia atrás ni adelante en el navegador.
  - Se acortaron el texto de ayuda y la etiqueta "Disparar (mantené: carga)" para que quepan en la pantalla.

### Báculo apuntado

- **Ocho direcciones:**
  - ↑ dispara hacia arriba y ↑ con ← o → en diagonal hacia arriba.
  - En el aire, ↓ dispara hacia abajo y ↓ con ← o → en diagonal hacia abajo.
  - En el suelo ↓ no apunta, porque con ↓ Choco baja de las plataformas de un sentido.
  - Las direcciones y los puntos de salida están en `STAFF.AIM`.
- **Arte:**
  - Poses nuevas de brazo y báculo: vertical arriba, diagonal arriba, diagonal abajo y vertical abajo.
  - El báculo diagonal es un sprite nuevo de 8×8; el de abajo es el mismo volteado.
  - El proyectil no se rota: las llaves `{ }` se leen igual en cualquier dirección y así siguen nítidas.
- **Enemigos:** un disparo recto hacia arriba o hacia abajo no tiene dirección horizontal, así que no empuja a los enemigos hacia ningún lado.

### Nivel 4 · Redondel

- **Error corregido:** la pelea arranca apenas Choco pasa la puerta izquierda, y la primera oleada sacaba un toro por esa misma puerta en el acto. El toro aparecía encima de Choco y le quitaba vida. Al reintentar, sin el diálogo de introducción, pasaba de inmediato.
- **Arreglo:**
  - Cada toro se anuncia `REDONDEL.SPAWN_WARN` (0.8 s) antes, con polvo y bufido en su puerta.
  - Si Choco está a menos de `REDONDEL.SPAWN_SAFE` (96 px) de esa puerta, el toro entra por la otra.

## Hito 9 · Coop: selección de modo, servidor y salas

### Flujo

- **Esc en el menú principal** vuelve a la selección de modo, no al título. La selección de modo quedó entre los dos, y Esc siempre retrocede una pantalla.
- **Última elección:** se guarda en las opciones (`lastMode`). El cursor arranca en esa tarjeta, pero la pantalla nunca se salta.
- **Pantallas en línea sin pausa al perder el foco:** el menú cooperativo, unirse y la sala de espera no muestran "EN PAUSA" al cambiar de ventana, porque para probar se juega con dos ventanas lado a lado. Las escenas lo piden con `online = true`. El modo solo se pausa igual que antes.

### Servidor y protocolo

- **WebSocket a mano, sin dependencias** (`server/ws.js`), como proponía el diseño. No hizo falta el paquete `ws`.
- **El juego reutiliza la lógica de salas del servidor:** `src/net/loopTransport.js` usa el mismo `server/rooms.js` en memoria. Así las pruebas del cliente ejercitan las salas reales.
- **Mensajes que no estaban en el diseño** (agregados a `docs/coop/04_red.md`):
  - `leave`: salida limpia. Sin él, cerrar la sala esperaría los 20 s de reconexión.
  - `resumed`: respuesta a una reconexión.
  - `closed`: la sala se cerró (el anfitrión salió o se cayó, o la sala expiró).
  - `peer: 'lost'`: el compañero perdió la conexión y está dentro de sus 20 s.
  - Dentro de `relay`: `lobby` (estado de la sala de espera) y `stat` (ping propio, para las barras del compañero).
- **El anfitrión manda en la sala de espera:** el invitado pide y el anfitrión responde con el estado completo. Si los dos cambian de personaje a la vez, gana el anfitrión y nunca quedan iguales.
- **Sala vacía:** como los lugares se guardan 20 s y si se va el anfitrión la sala se cierra, en la práctica una sala queda vacía muy poco tiempo. El límite de 2 min queda como red de seguridad.
- **Sin lista de orígenes (`ORIGINS`), el servidor acepta cualquiera.** Así funciona en desarrollo y en la red local; al desplegar se configura (ver `server/README.md`).
- **`?server=ws://…`** en la URL cambia el servidor sin recompilar (útil en la red local o para probar uno desplegado).
- **`?lag=150`** retrasa cada mensaje 150 ms (±20) en cada sentido, así que el ping mostrado ronda los 300 ms.
- **`npm run dev:coop` abre Vite con `--host`** para que otra máquina de la red local pueda entrar con la dirección `Network`. Vite redirige `/ws` al servidor, así que el juego no necesita saber la IP.

### Menús

- **Grilla del gamepad de 8×4** en vez de 6×5: el alfabeto tiene 31 caracteres y no cabía. Sobra un lugar, que es "borrar".
- **Teclado en "Unirse":** las letras se leen directo del teclado, no por acciones. Si no, escribir Z, X, W, A, S o D confirmaría, cancelaría o movería el cursor. La grilla y los botones A/B solo responden al gamepad.
- **Letras que no existen en los códigos** (I, L, O, 0, 1): la cajita tiembla y no se escriben.
- **En la sala de espera, Esc primero quita el "listo"** y, si no estabas listo, pregunta si querés salir. Para el anfitrión, Enter con los dos listos empieza (no quita su "listo").
- **Empezar todavía no lleva a ningún mapa:** los dos ven "¡Sincronizados!" y vuelven a la sala sin "listo". El mapa de conexiones llega en el Hito 11.
- **Tapita es un boceto:** en la selección de modo y en la sala de espera se dibuja a Choco con la paleta de Tapita (tapa de dulce y hoja de caña), con la etiqueta "boceto" en la sala de espera. El diseño final llega en el Hito 10.
- **"C: copiar"** usa la acción Borrar ranura (C, Supr o Y del gamepad), que ya existía en los menús y no se reasigna.

## Hito 10 · Coop: Tapita y la sincronización

### Tapita

- **Lienzo de 36×32 en vez de 24×22:** el mazo de frente, el martillazo en picada y la hoja sombrilla no cabían. El cuerpo sigue siendo de 16×16 y la hitbox de 14×14; los pies quedan en la fila 27 y las 4 filas de abajo dejan que el mazo baje del piso.
- **Física:** salta ≈ 40 px (2.5 tiles), cae un poco más rápido que Choco (es pesada) y no tiene doble salto. Pegada a la pared resbala a 30 px/s hasta 1.2 s; el salto de pared la aleja 0.16 s sin control horizontal para que llegue a la pared de enfrente.
- **Se pega sola** al tocar una pared cayendo, salvo que esté empujando hacia el otro lado. Se suelta al empujar en contra, al terminarse la pared o a los 1.2 s.
- **Plantarse** se activa al presionar Escudo en el suelo y dura mientras se mantiene. Plantada recibe el daño pero no la empujan.
- **Martillazo:** se queda 0.14 s en el aire girando (anticipación) y después cae a 300 px/s. Aturde a los enemigos a 2 tiles; no les hace daño.
- **Melcocha:** la simula quien la lanza y le avisa al compañero dónde se pegó (`melStick`). El diseño decía que el mundo es del anfitrión, pero la melcocha es parte de la habilidad de Tapita: así se siente inmediata para quien la lanza y queda igual en las dos pantallas.
- **Caramelizarse y disolverse:** los frames y el efecto existen, pero se usan desde el Hito 11 (agua) y el Hito 14 (calor extremo).
- **Sonidos nuevos:** mazo, martillazo, plantarse, pegarse a la pared, melcocha, hoja sombrilla, señal, "se cayó la conexión" y reaparecer.

### Sincronización

- **Reloj del compañero:** cada estado lleva la hora de quien lo manda; la diferencia de relojes se estima con la latencia mínima de los últimos 2 s. Así la interpolación de 100 ms no depende de que los relojes coincidan.
- **Saltos grandes** (reaparecer) no se interpolan: el personaje aparece directo en su lugar.
- **Montarse:** el compañero es una plataforma (sólida por arriba) que se mueve con su posición interpolada. Quien está arriba manda su distancia al de abajo (`ride`), y el de abajo lo dibuja pegado a su propio personaje, sin el atraso de la red.
- **Golpes del invitado:** se calculan con lo que ve el invitado (enemigos interpolados) y el anfitrión los aplica sin volver a revisar la posición. En un juego cooperativo no hay quién haga trampa, y así el golpe se siente justo.
- **Pisotones del invitado:** el enemigo se aplasta de una vez en su pantalla (para que se sienta) y el anfitrión lo confirma.
- **Si caen los dos**, lo decide el anfitrión cuando ve a los dos caídos. Con mucha latencia el reinicio llega al invitado unos 0.5 s después.
- **Desconexión:** el juego se congela para los dos (cuenta regresiva de 20 s). Si no vuelve, los dos van al menú cooperativo y el anfitrión cierra la sala.
- **Pausa en línea:** el personaje se queda quieto mientras el menú está abierto, pero el mundo sigue. Con una confirmación abierta encima de la pausa (salir de la sala), la sala sí se detiene un momento en esa computadora.

### Sala de pruebas cooperativa y herramientas

- **Empezar en la sala de espera** lleva a la sala de pruebas cooperativa; al llegar los dos a la salida vuelven a la sala de espera. El mapa de conexiones llega en el Hito 11.
- **Bits y cristales:** cada uno ve los del compañero apagados y solo junta los suyos.
- **Vista Debug compartida** ya funciona en la sala de pruebas (para el puente fantasma), aunque el plan la ponía en el Hito 11.
- **`?coop=local`:** las dos vistas en una página, con el lienzo interno de 640×180 y un teclado para cada uno (sin gamepad). **`?scene=sala`** abre la sala con un solo personaje (`&pj=tapita`). Las dos son solo para depurar.
- **Señal en el gamepad:** Back/Select. En la pantalla de controles del modo solo no aparece; en la del cooperativo reemplaza a "Caminar sigiloso", que no se usa.
