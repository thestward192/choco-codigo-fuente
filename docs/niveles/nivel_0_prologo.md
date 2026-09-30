# Nivel 0 · Prólogo y Pantalla de Carga (tutorial)

**Género:** plataformas, tutorial. **Duración:** 3–4 minutos. **Objetivo:** presentar la historia y enseñar moverse, saltar, interactuar y disparar sin carteles aburridos.

## Parte A · El cuarto de Choco (Santa Cruz, 11:58 p. m.)

**Vista:** plataformas lateral, una sola pantalla y media (unos 30×11 tiles), cámara fija con leve paneo.

**Ambiente:** cuarto de noche con luz cálida de lámpara y el brillo azul del televisor. Ventana con cielo estrellado y la silueta de un árbol de guanacaste. Sonido de grillos y, lejos, una marimba de fiesta.

**Elementos interactivos** (E o ↑ junto a ellos, con un ícono flotante que aparece al acercarse):

- **Foto de los fundadores** en la pared: los cuatro cuadritos posando juntos. Choco: "CHC Studio. Algún día vamos a ser grandes, maes."
- **Refri:** "Leche, agua y... un chocolate. No. Eso sería raro."
- **Escritorio con laptop:** pantalla con "Deploy exitoso ✔". Choco: "Ya está en producción. Ahora sí, a jugar."
- **Estante vacío:** "Aquí va a ir un trofeo algún día." (Se paga en el epílogo.)
- **Consola y televisor:** activa la cinemática.

**Tutorial integrado:** el jugador aprende a moverse y saltar porque la consola está sobre un mueble alto y hay que subir por la cama y una silla. Los controles aparecen una vez en un globo pequeño junto a Choco y se desvanecen.

**Cinemática "La barra rota":** ver `docs/01_historia.md`. Requisitos:

1. El televisor parpadea, se llena de estática y el cuarto se tiñe de magenta.
2. Texto de N.U.L.L. escribiéndose letra por letra, con un sonido de tecla por carácter.
3. Screen shake creciente, aberración cromática y un rayo de píxeles hacia Choco.
4. Los 4 cuadritos se desprenden en cámara lenta, cada uno con su color de acento como estela, y entran al televisor.
5. Choco queda como núcleo, mira a la cámara con cara de pánico y es succionado. Corte a negro con sonido de consola apagándose.

## Parte B · Pantalla de Carga

**Vista:** plataformas, unos 90 tiles de largo. Fondo negro con una barra de carga gigante al 99 % que nunca termina y geometría "a medio renderizar" (wireframes que se rellenan cuando Choco se acerca).

**Secuencia:**

1. Choco cae en una plataforma de wireframe. Texto del sistema: "CARGANDO MUNDO... 99 %".
2. Saltos simples entre plataformas que se renderizan al acercarse.
3. El **Báculo Compilador** clavado en una roca de código. Al tomarlo: animación de victoria, descripción del objeto y sonido de "compilación exitosa".
4. **Zona de práctica de disparo:** 3 Bytelings de práctica (grises, texto "TEST") en fila, luego un Mosquito de datos que solo muere con disparos, luego un bloque que solo se rompe con disparo cargado (se enseña mostrando el báculo brillando).
5. N.U.L.L. aparece en una pantalla gigante al fondo y dice su discurso (ver historia).
6. Un portal glitcheado se abre: entrada al Nivel 1.

**Sin muerte posible** en esta parte (los vacíos devuelven a Choco a la última plataforma sin quitar vida), para que el tutorial no frustre.

## Criterios de aceptación

- Un jugador nuevo aprende moverse, saltar, interactuar, disparar y cargar sin leer ningún texto largo.
- La cinemática se puede saltar manteniendo Esc/Start durante 1 s (con indicador circular).
- La transición al nivel 1 muestra la tarjeta de título del nivel (nombre, número y un subtítulo). Stward todavía no ha sido rescatado, así que su rima de presentación aparece en las tarjetas a partir del nivel 3.
