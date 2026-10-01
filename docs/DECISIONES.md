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
- **Rescate de Óscar:** la jaula está hecha de caracteres (| # [ ]) en magenta. Orden: diálogo → Óscar se vuelve luz rosada y entra a la barra (+1 cuadrito con animación en el HUD) → pantalla de las Botas → resultados. Al rejugar el nivel con Óscar ya rescatado no hay jaula.
- **Rótulos sin Y:** el hueco "_" reemplaza también la conjunción ("pisá el disquete _ pateálo"). Óscar suspira junto a esos rótulos cuando ya fue rescatado (al rejugar).
- **Vida extra por bits:** al llegar a 100 aparece "¡VIDA EXTRA!".

### Música

- Cuarto (lo-fi con marimba lejana), Pantalla de Carga (ambiente de "cargando"), motivo de N.U.L.L. (4 notas disonantes, para sus apariciones) y Mundo Cartucho con cuatro variaciones: pradera, cuevas (más grave y espaciada), castillo (en menor) y Guardián.

### Desarrollo

- Atajos nuevos: `?scene=prologue`, `?scene=loading` y `?scene=level1`; también están en el menú de desarrollo (`?scene=dev`).
- La lógica común de los niveles de plataformas vive en `src/levels/PlatformLevel.js` (la sala de pruebas también la usa). Los mapas se arman con `src/levels/mapBuilder.js`.
