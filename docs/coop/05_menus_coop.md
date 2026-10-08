# Coop 05 · Menús, sala de espera y HUD

Mismas reglas que `docs/06_menus_ui.md`: navegación con teclado, mouse y gamepad, cursor `{` animado, sonido de tick y transiciones animadas.

## Flujo

```
Presentación CHC Studio → Pantalla de título → SELECCIÓN DE MODO
   ├── Modo solo     → Menú principal (exactamente igual que ahora)
   └── Cooperativo   → Menú cooperativo
                          ├── Crear sala   → Sala de espera (anfitrión)
                          ├── Unirse       → Escribir código → Sala de espera (invitado)
                          └── Volver       → Selección de modo

Sala de espera → (los dos listos) → Mapa de conexiones → Tarjeta del mapa → Salas de puzzle → Jefe → Resultados → Mapa de conexiones
```

## Selección de modo

- Aparece justo después de la pantalla de título, al presionar Enter. Es la primera decisión del jugador.
- **Fondo:** el mismo cuarto de Choco de la pantalla de título, ligeramente oscurecido.
- **Dos tarjetas grandes lado a lado:**
  - **MODO SOLO:** Choco solo, en idle, con el báculo. Debajo: "La historia de Choco".
  - **COOPERATIVO:** Choco y Tapita juntos, chocando los puños cada pocos segundos. Debajo: "2 jugadores en línea".
- La tarjeta elegida rebota (squash & stretch) y la otra se oscurece. Al confirmar, la tarjeta hace zoom y entra la transición.
- **Esc** vuelve a la pantalla de título.
- Se recuerda la última elección (en las opciones, con try/catch), pero el cursor siempre arranca en esa tarjeta y nunca se salta la pantalla.

## Menú cooperativo

Ventana de terminal como el menú principal, con el título `choco@chc:~$ ./sincronizado`:

- **Crear sala**
- **Unirse a una sala**
- **Controles** (la misma pantalla de controles; incluye la acción nueva Señal)
- **Volver**

Si no hay conexión con el servidor, el menú lo dice en una línea ámbar ("Sin conexión con el servidor de salas") y deshabilita Crear y Unirse. Volver y Controles siguen funcionando.

## Crear sala

- Mensaje "Creando sala…" con una animación de carga (máximo 5 s; si no responde, error y volver).
- **El código se muestra en grande** en el centro, en la fuente pixelada a escala 3, con cada carácter en su cajita. Por ejemplo: `K 7 M P Q`.
- Debajo:
  - "Pasale este código a tu compañero".
  - **C — Copiar código:** usa el portapapeles del navegador, dentro de try/catch. Si funciona, muestra "¡Copiado!"; si no, "Copialo a mano".
- La sala de espera se abre de una vez con el lugar del compañero vacío y puntitos animados.

## Unirse a una sala

- **5 cajitas** para el código. Se escribe con el teclado (letras y números; Borrar retrocede). Se aceptan minúsculas y se descartan los caracteres que no son del alfabeto del código.
- **Con gamepad:** una grilla del alfabeto de códigos (6×5) que se recorre con el stick.
- **Pegar** con Ctrl+V también funciona (dentro de try/catch).
- Al llenar las 5 cajitas se intenta entrar solo. Errores en ámbar, sin borrar el código:
  - "No existe una sala con ese código".
  - "La sala ya está llena".
  - "Versiones distintas: actualicen el juego los dos".

## Sala de espera

- **Dos columnas:** la del anfitrión a la izquierda y la del invitado a la derecha, cada una con su personaje en grande (idle) y el nombre "Jugador 1" / "Jugador 2".
- **Elegir personaje:** ← → cambia entre Choco y Tapita. No pueden elegir el mismo: si uno toma al personaje del otro, se intercambian con una animación de cambio de lugar.
- **Listo:** confirmar marca "LISTO" con un sello verde. Volver a confirmar lo quita.
- **Ping** de los dos con barras de señal de colores.
- **Código de la sala** siempre visible arriba (con C para copiarlo).
- Cuando los dos están listos, el anfitrión ve "Enter: empezar". El invitado ve "Esperando al anfitrión…".
- **Salir** (Esc): pide confirmación y vuelve al menú cooperativo. Si sale el anfitrión, la sala se cierra para los dos.

## Mapa de conexiones

El equivalente cooperativo del explorador de archivos: una red de nodos unidos por cables de datos animados.

- Un nodo por mapa: Puntarenas, la casa de Juan Carlos y la Chicharronera. Cada nodo tiene un ícono (ancla, piscina, paila), su nota (S/A/B/C) y los recuerdos encontrados (0/3).
- **La Sala** está en el centro, con un candado. Se abre cuando los tres mapas están completos.
- **El anfitrión elige el mapa.** El invitado ve el cursor del anfitrión moverse en tiempo real y puede usar la señal para sugerir uno (el nodo parpadea con su color).
- El progreso mostrado es el del anfitrión (ver `docs/coop/08_plan_coop.md`, guardado).

## HUD en el juego

Cada jugador ve su propio HUD; el del compañero aparece en pequeño.

- **Arriba a la izquierda (el propio personaje):**
  - **Choco:** la barra de vida como en el modo normal, el calor (solo en zonas calientes), el oxígeno (solo bajo el agua), la batería de la laptop y la recarga del escudo.
  - **Tapita:** la tapa partida en 4, las melcochas disponibles (2 bolitas) y el estado de plantada.
- **Arriba a la derecha (el compañero):** el retrato chico, su vida en pequeño y un ícono de estado: en el menú, desconectado o reapareciendo.
- **Abajo a la derecha:** bits o cristales y recuerdos de la sección.
- **Ping:** un puntito de color junto al retrato del compañero. Solo muestra el número si está en rojo.
- **Flecha del compañero:** en el borde de la pantalla cuando no se ve, con su color y la distancia en tiles.
- **Señal:** el marcador "¡Aquí!" con el color del que la puso. Si queda fuera de pantalla, aparece también como flecha.
- **Terminal de doble firma:** al tocar la primera terminal, una barra de 0.5 s se vacía sobre la otra terminal y en el HUD de los dos.

## Pausa

- **Opciones:** Continuar, Controles, Opciones, Salir de la sala.
- No congela el juego (ver mecánicas). Se muestra el aviso "El juego sigue corriendo".
- **Salir de la sala** pide confirmación. Guarda hasta el último checkpoint y avisa al compañero.

## Resultados

- Pantalla compartida con los dos personajes haciendo su animación de victoria.
- Tiempo, nota, caídas de cada uno, bits, cristales, recuerdos y sincronía (ver mecánicas).
- **Continuar** (los dos confirman) vuelve al mapa de conexiones.

## Textos

Todos los textos de estas pantallas van en `data/dialogues.js`, en un bloque `coop`, en español de Costa Rica con voseo y con revisión de tildes y signos de apertura.
