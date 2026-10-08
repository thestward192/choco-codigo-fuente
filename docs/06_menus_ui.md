# 06 · Menús, pantallas e interfaz

Todas las pantallas se navegan con teclado y gamepad (flechas/stick para moverse, confirmar/cancelar). El elemento seleccionado se resalta con un cursor animado (una pequeña llave `{` que rebota) y un sonido de tick. Todas las transiciones entre pantallas son animadas.

## Flujo general

```
Presentación CHC Studio → Pantalla de título → Selección de modo
   ├── Cooperativo → Menú cooperativo (ver docs/coop/05_menus_coop.md)
   └── Modo solo → Menú principal
                     ├── Nueva partida → Selección de ranura → Prólogo
                     ├── Continuar → Mapa de mundos
                     ├── Opciones
                     └── Créditos

Mapa de mundos → Tarjeta de título del nivel → Nivel → Resultados → Mapa de mundos
Nivel → Pausa → (Continuar / Reiniciar desde checkpoint / Opciones / Salir al mapa)
Nivel → Game Over → (Reintentar nivel / Salir al mapa)
Nivel 5 → Final → Estadísticas → Créditos → Título
```

## Presentación

1. Pantalla negra: "Presioná cualquier tecla" parpadeando (desbloquea el audio).
2. Fondo blanco, fade in del logo `assets/logo_chc_studio.png` con el texto "presenta" debajo en la fuente pixelada, sonido suave. 2.5 s. Fade out.
3. Saltable con cualquier botón.

## Pantalla de título

- Fondo: el cuarto de Choco de noche, visto a través de la ventana, con la tele encendida emitiendo luz. Leve parallax y partículas (luciérnagas o polvo).
- Título **CHOCO** grande con efecto de chocolate goteando, y debajo **CÓDIGO FUENTE** en letras de código cian que se escriben con cursor. Glitch magenta ocasional (N.U.L.L. acecha).
- Choco en idle en primer plano.
- "Presioná Enter" parpadeando.

## Menú principal

- **Nueva partida**, **Continuar** (deshabilitado si no hay partidas), **Opciones**, **Créditos**.
- El menú aparece como una ventana de terminal con borde y título `choco@chc:~$`.

## Selección de ranura

- 3 ranuras. Cada una muestra: retrato de la barra de Choco con los cuadritos recuperados, objetos obtenidos (íconos), Y doradas encontradas (x/15), tiempo total y último nivel.
- Opción de borrar una ranura con confirmación doble ("¿Seguro? Esto no tiene `git revert`.").

## Mapa de mundos: el explorador de archivos

La selección de niveles es un **explorador de archivos** de la consola corrupta:

```
C:/RECUERDOS/
 ├── 01_mundo_cartucho.exe   ✔  Y 3/3
 ├── 02_una/                 ✔  Y 1/3
 ├── 03_novacomp/            ▶
 ├── 04_santa_cruz/          🔒
 └── 05_codigo_puro/         🔒
```

- Cada entrada tiene un ícono animado pixelado, su estado (completado, disponible, bloqueado), las Y encontradas y el mejor tiempo.
- A la derecha, una vista previa animada del nivel y la barra de Choco.
- Los niveles completados se pueden rejugar (para buscar Y doradas).

## Tarjeta de título del nivel

- Fondo de color del nivel, número y nombre grandes con animación de entrada, subtítulo corto (por ejemplo, "Nivel 4 · Santa Cruz · *Donde el sol no perdona*").
- A partir del nivel 3, Stward aparece rapeando una rima de 2 líneas sobre el nivel.
- 3 s, saltable.

## HUD

Diseño limpio en los bordes, con fondo semitransparente mínimo:

- **Arriba a la izquierda:** la **barra de chocolate** (cuadritos llenos, vacíos y cobertura de cacao brillando). Al perder uno, el cuadrito se agrieta y cae en pedazos.
- **Debajo:** vidas (ícono de Choco × N) y bits.
- **Arriba a la derecha:** Y doradas del nivel (3 íconos, rellenos o vacíos).
- **Abajo a la izquierda:** íconos de objetos con estado: batería de la laptop (barra), recarga del escudo (ícono que se llena), lazo (brilla si hay un nodo en rango).
- **Específicos de nivel:** termómetro de calor (nivel 4), cargas de vapor de Hezron (nivel 3), cuenta regresiva de DEADLINE, barra de vida de los jefes (arriba al centro, con nombre).
- **Nivel 2 (exploración):** energía y RAM en una ventana pequeña; en batalla, la interfaz de batalla completa.
- El HUD se oculta durante cinemáticas.

## Cajas de diálogo

- Parte inferior de la pantalla, con retrato de 32×32 a la izquierda (con expresión), nombre del personaje en su color de acento y texto que se escribe letra por letra.
- Confirmar completa el texto; otra vez pasa al siguiente. Mantener cancelar 1 s salta todo el diálogo.
- Flecha animada cuando hay más texto.
- N.U.L.L. usa una caja negra con borde magenta glitcheado.

## Pantalla de objeto obtenido

- Fondo oscurecido, el objeto gira en el centro con rayos de luz, nombre grande, descripción en 2 líneas y el control para usarlo. Fanfarria. Confirmar para continuar.

## Pausa

- Fondo del juego oscurecido y desenfocado (escala reducida + oscuridad).
- **Continuar**, **Reiniciar desde checkpoint**, **Opciones**, **Controles** (lista), **Salir al mapa** (con confirmación).
- Muestra los objetos obtenidos con su descripción y los fundadores rescatados.

## Opciones

- Volumen maestro, música, efectos y voces (barras de 0 a 10).
- Pantalla completa (sí/no).
- Escala: automática o fija (×2 a ×6).
- Filtro CRT (sí/no), sacudida de pantalla (sí/no), efectos de glitch intensos (sí/no, para jugadores sensibles).
- Reasignar controles de teclado (con detección de conflictos).
- Velocidad del texto (lenta, normal, instantánea).

## Resultados del nivel

- "NIVEL COMPLETADO" con animación, y conteo animado de: tiempo, muertes, bits y Y doradas.
- Récord nuevo resaltado.
- Retrato del fundador rescatado con una frase de despedida.

## Game Over

- Choco derretido en el suelo, la envoltura cae encima. Texto "SEGMENTATION FAULT" que se transforma en "GAME OVER".
- **Reintentar nivel** / **Salir al mapa**.
- Mensaje aleatorio de ánimo de un fundador ya rescatado ("Tranqui, mae, otra vez." — Hezron).

## Créditos

Pantalla de créditos corta y limpia sobre un fondo animado de código que baja lentamente, con Choco y los cuatro fundadores caminando en fila en la parte inferior:

```
CHOCO: CÓDIGO FUENTE

Creador
Stward Serrano

CHC Studio
[logo]

Gracias por jugar
```

Solo aparecen **Stward Serrano** como creador y **CHC Studio** con su logo. Al terminar, vuelve a la pantalla de título. Si se desbloqueó la escena extra de las 15 Y doradas, se muestra después de los créditos.
