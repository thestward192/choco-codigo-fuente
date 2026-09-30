# Nivel 2 · La UNA

**Género:** RPG de vista cenital dentro de un edificio, con puzzles y batallas por turnos. **Duración objetivo:** 12–18 minutos.
**Vida disponible:** 2 cuadritos. **Objetos:** Báculo, Botas (sin uso directo en exploración cenital, pero sí en el puzzle de la biblioteca como "salto corto" sobre libros caídos).
**Rescate:** Stward. **Recompensa:** Laptop Debugger.

## Concepto

El recuerdo de la universidad: el edificio de la Escuela de Informática de la UNA en Heredia, visto desde arriba, como un RPG clásico de 16 bits. Todo ocurre **dentro del edificio** (interiores). Compañeros y profesores glitcheados repiten frases en loop. Los bugs caminan por los pasillos como enemigos visibles: si tocan a Choco, empieza una batalla por turnos.

No usar logos oficiales de la UNA: solo el nombre, colores cálidos y detalles de ambiente universitario (pizarras, pupitres, afiches genéricos, bancas, casilleros, una soda).

## Mapa (interiores conectados por pasillos)

```
                 [Auditorio]  (jefe, requiere 3 carnés)
                      |
[Biblioteca]---[Pasillo principal]---[Laboratorio de cómputo]
                      |
[Sala vieja]---[Vestíbulo / entrada]---[Soda]
                      |
                 [Aula 3]
```

- **Vestíbulo:** punto de entrada. Terminal de guardado. Un profe glitcheado repite: "La tarea es para el lunes. La tarea es para el lunes. La tarea es para el lun—".
- **Soda:** tienda. Se compran consumibles con bits. La señora de la soda es la única NPC no glitcheada ("Aquí a mí nadie me corrompe, mijo").
- **Sala vieja:** donde Choco programó a N.U.L.L. Pizarra con el comentario `// TODO: arreglar el manejo de null. Después lo veo.` Escena corta de reflexión. Contiene una Y dorada.
- **Aula 3, Laboratorio, Biblioteca:** un puzzle cada una; cada puzzle entrega un **carné** de acceso.
- **Auditorio:** batalla de rap final. Se abre con los 3 carnés.

Cada zona tiene 2–4 bugs caminando con patrones visibles; se pueden esquivar. Los derrotados no reaparecen hasta que Choco muere.

## Puzzles

### Laboratorio de cómputo · Binario

- 8 computadoras en fila representan 8 bits (128 → 1). Encenderlas o apagarlas con E.
- Una pantalla muestra un número decimal; hay que dejar encendidas exactamente las que lo forman y activar la palanca "COMPILAR".
- 3 rondas: **37**, **170** y una final donde el número se muestra en **hexadecimal (0xE9 = 233)**.
- Error: suena un buzzer y aparece un bug que inicia batalla.

### Aula 3 · Compuertas lógicas

- En el piso hay un circuito dibujado: 4 palancas (A, B, C, D) conectadas por compuertas AND, OR, NOT y XOR hasta una puerta.
- Los cables se iluminan en tiempo real según el valor (encendido = cian, apagado = gris) para que el jugador pueda razonar.
- 2 circuitos, el segundo con XOR y una restricción: solo se pueden cambiar 3 palancas antes de que se reinicie.

### Biblioteca · Estantes (tipo sokoban)

- Empujar estantes con ruedas hasta marcas en el piso. Los estantes no se pueden jalar.
- 2 salas de dificultad creciente; una palanca de reinicio en cada sala.
- Se puede saltar sobre pilas de libros bajas con las Botas (salto corto cenital: animación de salto sin cambiar de altura de colisión, cruza un tile de obstáculo bajo).

## Batallas por turnos

**Presentación:** transición de glitch en espiral, fondo que depende de la zona, Choco a la izquierda y el bug a la derecha, con animaciones de ataque para ambos.

**Recursos de Choco:**

- **Energía:** 10 por cuadrito (20 en este nivel). **Persiste entre batallas**; se recupera en la terminal de guardado o con consumibles.
- **RAM:** 10 máximo, empieza cada batalla en 6 y regenera 2 por turno.

**Comandos:**

| Comando | Costo RAM | Efecto |
|---|---|---|
| **Compilar** (báculo) | 0 | 4 de daño. **Golpe con timing:** un marcador recorre una barra; presionar en el centro hace crítico ×1.5 |
| **Debug** | 3 | Revela debilidad e intención del enemigo por 2 turnos. El próximo Compilar contra la debilidad hace ×2 |
| **Refactor** | 4 | Recupera 6 de energía y quita estados alterados |
| **Commit --force** | 7 | 12 de daño; 25 % de fallar |
| **Objeto** | 0 | Usa un consumible |
| **Huir** | 0 | 60 % de éxito; imposible contra jefes |

**Defensa con timing:** cuando el enemigo ataca, un destello marca el impacto; presionar confirmar justo a tiempo reduce el daño a la mitad (y a cero si es perfecto, ventana de 3 frames).

**Consumibles (soda):** Café (+8 energía, 15 bits), Empanada (+4 energía y +3 RAM, 20 bits), Gallo pinto (+15 energía, 40 bits).

**Bugs y cómo se les gana** (ver también `docs/02_personajes.md`):

| Bug | Energía | Gimmick | Contra |
|---|---|---|---|
| NullPointer | 12 | Ataque que falla 50 %, pero hace 7 si acierta | Defensa con timing |
| Loop Infinito | 16 | Repite la acción; a los 3 turnos se cura por completo | Debug rompe el loop |
| Race Condition | 14 | Orden de turnos al azar; a veces ataca dos veces | Debug muestra el orden |
| Memory Leak | 18 | −1 energía máxima de Choco por turno durante la pelea | Ganar rápido: Commit --force |
| Spaghetti Code | 15 | Enreda: la próxima acción se elige al azar entre dos | Refactor quita el enredo |

Si la energía llega a 0: Choco pierde una vida y reaparece en la última terminal de guardado con energía llena.

## Jefe: MC Stack Overflow (batalla de rap)

**Presentación:** el auditorio con luces de colores, Stward atrapado en una jaula colgando sobre la tarima, un beat chiptune de fondo (90 BPM). MC Stack Overflow es una pila de ventanas de error apiladas con una gorra y un micrófono.

**Mecánica:**

- 3 rondas. Stack rapea 2 líneas (texto que aparece al ritmo del beat, con cada sílaba acentuada iluminada).
- Aparecen **4 respuestas**. Hay que elegir en **6 compases** (con indicador visual del beat):
  - **Correcta:** rima y contesta el ataque → Stack pierde 1 barra de flow; si se confirmó **en el beat** (ventana de 0.12 s), cuenta doble para la puntuación y el público explota.
  - **Floja:** rima pero no contesta → Stack pierde media barra.
  - **Sin rima:** Choco pierde 1 barra de hype.
  - **Cringe:** Choco pierde 1 barra de hype; Stward pone cara de dolor.
- Las opciones se mezclan cada vez.
- Choco tiene 3 barras de hype; Stack tiene 3 barras de flow. Si Choco pierde, repite la batalla desde la ronda 1 (pierde una vida).
- Entre rondas, Stack ataca en modo batalla normal (un ataque de "desbordamiento" que se defiende con timing), para mantener la tensión.

**Rondas (contenido base; las opciones incorrectas las escribe el desarrollo siguiendo el mismo estilo):**

1. **Stack:** "Soy Stack Overflow, me desbordo sin control; / tu código es tan lento que compila con el sol."
   **Correcta:** "Te desbordás, mae, porque no tenés caso base; / mi recursión termina, la tuya se atrasa."
   **Cringe (ejemplo):** "Hola soy Choco y me gusta el chocolate, / y también el cacao y... el chocolate."
2. **Stack:** "Tus commits son un desastre, tu historial da vergüenza; / hacés push a main un viernes, ¿dónde está tu inteligencia?"
   **Correcta:** "Mi historial está limpio, cada rama tiene prueba; / vos sos pila sin fondo, cada llamada te lleva."
3. **Stack:** "Me repito, me repito, nunca voy a terminar; / vos sos una barrita que se va a derretir al mar."
   **Correcta:** "Repetirse no es tener flow, es un bug sin arreglar; / te meto un caso base y se acabó tu recursar."

**Remate:** tras la tercera ronda, Stward se libera y cierra con su verso: "Compilo en la tarima, sin warnings ni errores; / si el bug quiere guerra, que traiga refuerzos mejores." Stack colapsa en ventanas de error que se cierran una por una.

**Rescate:** Stward se vuelve luz amarilla y se une a la barra (+1 cuadrito). Entrega la **Laptop Debugger** con pantalla de objeto obtenido y una demostración de 10 s de la Vista Debug en el mismo auditorio (revela un mensaje oculto de N.U.L.L. en la pared: "no debiste volver").

## Y doradas

1. **Sala vieja:** detrás de la pizarra, al leer el comentario TODO por segunda vez.
2. **Biblioteca:** en un estante que solo se alcanza resolviendo la sala 2 de forma alternativa.
3. **Soda:** la señora de la soda la da al comprar un Gallo pinto por primera vez ("Tome, mijo, esto se le cayó a un muchacho que suspiraba mucho").

## Criterios de aceptación

- La exploración cenital se siente fluida; las transiciones entre salas usan fade corto.
- Cada puzzle se puede resolver razonando, con retroalimentación visual clara.
- Las batallas tienen animaciones de ataque, números de daño flotantes, timing con retroalimentación (texto "¡PERFECTO!", "BIEN") y sacudida de pantalla en críticos.
- La batalla de rap está sincronizada con el beat y se siente divertida incluso al fallar.
