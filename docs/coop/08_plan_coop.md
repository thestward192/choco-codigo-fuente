# Coop 08 · Plan de desarrollo del Modo Sincronizado

Se sigue la misma forma de trabajo que `docs/08_plan_desarrollo.md`:

- Un hito a la vez.
- Al terminar cada uno: `npm test`, juego sin errores en consola y una lista corta de qué probar.
- Se espera la revisión de Stward antes de seguir.
- Los hitos siguen la numeración del plan principal (el último fue el 8).

**Regla de oro:** el **modo solo no cambia**. Cada hito revisa que el modo solo se siga jugando igual.

## Hito 9 · Selección de modo, servidor y salas

- Pantalla de **selección de modo** después del título (Modo solo / Cooperativo). Modo solo lleva al menú principal de siempre.
- **Servidor de salas** en `server/` (Node sin dependencias, WebSocket implementado a mano): crear, unirse, reconexión, expiración y límites. `npm run server` y `npm run dev:coop`.
- **Cliente de red** en `src/net/`: transporte por WebSocket, transporte local en memoria (loopback), sesión, protocolo con versión y medición de ping.
- **Menú cooperativo:** crear sala (código grande, copiar), unirse (5 cajitas, pegar, teclado y gamepad) y errores.
- **Sala de espera:** elegir personaje (por ahora los dos ven a Choco con otro color), listo, ping y salir.
- **Pruebas:** códigos, sala llena, expiración, reconexión, tramas WebSocket (incluidas las mal formadas), protocolo y loopback.
- **Probar:**
  - Abrir dos pestañas, crear sala en una y unirse con el código en la otra.
  - Ver el ping, marcar listo y salir.
  - Apagar el servidor: el menú lo dice y el modo solo sigue funcionando.

## Hito 10 · Tapita y la sincronización

- **Tapita completa:**
  - Sprite y todas las animaciones de `docs/coop/02_tapita.md`, más el retrato con 4 expresiones.
  - Física propia: salto simple, salto de pared, peso y hitbox chica.
  - Habilidades: mazo, martillazo, melcocha, plantarse y hoja sombrilla.
  - Vida en trozos.
- **Sincronización:**
  - Autoridad dividida: cada uno manda en su personaje y el anfitrión en el mundo (`docs/coop/04_red.md`).
  - Estados a 30 Hz, interpolación de 100 ms, acciones y eventos confiables con confirmación.
- **Interacciones básicas:** apilarse y montarse, la señal, la flecha del compañero y la reaparición tras 3 s.
- **Desconexión:** pausa con cuenta regresiva y retorno al menú.
- **Sala de pruebas cooperativa** (como la sala de pruebas del Hito 1) para afinar a los dos personajes juntos.
- `?coop=local` (dos vistas en una página) y `?lag=` para simular latencia.
- **Probar:**
  - En dos pestañas, mover a Choco y a Tapita y verse moviéndose suave.
  - Montarse uno encima del otro y usar la señal.
  - Con `?lag=150`, que se siga sintiendo bien.
  - Cerrar una pestaña y volverla a abrir antes de 20 s.

## Hito 11 · Elementos de puzzle y estructura cooperativa

- **Todos los elementos de puzzle de `docs/coop/03_mecanicas_coop.md`:**
  - Botones liviano, pesado, extrapesado y de martillazo; dianas de código; terminales de doble firma; palancas; balanzas; compuertas.
  - Túneles bajos, cortinas de agua y de calor, bloques de azúcar, cajas, ventiladores y puertas de salida dobles.
- **Agua para Choco** (nadar, bucear, oxígeno) y **agua para Tapita** (salpicaduras y disolverse). Calor de Choco en las zonas calientes.
- **Interacciones avanzadas:** Tapita plantada como nodo del lazo, jalar a Tapita, Vista Debug compartida, escudo compartido y sombra de la hoja.
- **Prólogo cooperativo "Prueba de conexión"** completo, con la aparición de L.A.G.
- **Mapa de conexiones** (selector de mapas), tarjeta del mapa y resultados cooperativos (nota, sincronía).
- **Guardado cooperativo:**
  - Clave aparte en `localStorage`, siempre con try/catch.
  - Cada jugador guarda su propio progreso.
  - En la sala se usa el progreso del anfitrión.
- **Probar:** el prólogo cooperativo completo con dos pestañas y una sala de pruebas con cada elemento de puzzle.

## Hito 12 · C1 Puntarenas: el Puerto

- Mapa completo de `docs/coop/niveles/c1_puntarenas.md`:
  - 3 secciones, marea, boyas, grúa, contenedores y planchas calientes.
  - Enemigos (cangrejo de carga, gaviota ladrona, paquete perdido).
  - 3 recuerdos y el chiste del churchill.
- **Jefe:** El Pulpo Estibador.
- **Música:** "Sincronizados", "Prueba de conexión", "Paseo de los Turistas" y "Estibando". Efectos de agua y de Tapita.
- **Probar:** el mapa completo con dos personas. Revisar que ninguna sala se pueda pasar con un solo jugador.

## Hito 13 · C2 La casa de Juan Carlos

- Mapa completo de `docs/coop/niveles/c2_casa_juan_carlos.md`:
  - Nivel de la piscina, inflables, aspersores, trampolín, parrilla y portón.
  - Enemigos (inflable mordelón, hormigas, manguera viva).
  - Juan Carlos en loop y 3 recuerdos.
- **Jefe:** El Limpiafondos 3000.
- **Música:** "Ya casi está la carne" y "Remolino".

## Hito 14 · C3 La Chicharronera

- Mapa completo de `docs/coop/niveles/c3_chicharronera.md`:
  - Calor fuerte, pailas, extractores, fregaderos, cámara fría y marimba con ritmo.
  - Enemigos (chicharrón saltarín, mosca).
  - Doña Mayela y 3 recuerdos.
- **Jefe:** La Paila Mayor.
- **Música:** "Domingo de pailas" y "Aceite hirviendo".

## Hito 15 · C4 La Sala y el final cooperativo

- Mapa de `docs/coop/niveles/c4_la_sala.md`:
  - Rastro de paquetes, puertas con eco, relojes, cables y sala espejo con cámara del compañero.
- **Jefe:** L.A.G. en 3 fases, con la música que se alinea.
- **Final:** cinemática final, epílogo, escena extra de los 9 recuerdos y créditos cooperativos.
- **Música:** "La Sala", "L.A.G." y créditos cooperativos.

## Hito 16 · Pulido cooperativo y despliegue

- **Pruebas de red:**
  - En dos computadoras reales (red local e internet), con latencia simulada de 50, 150 y 300 ms.
  - Reconexiones y cierres bruscos.
- **Optimización:** formato binario para `me` y `world` si el ancho de banda pasa de 10 KB/s por jugador.
- **Balance:** tiempos objetivo de cada mapa, límites de las notas, ventanas de los puzzles y vida de los jefes, solo en `COOP` de `balance.js`.
- **Revisión:** textos (tildes, voseo, tono cariñoso con Juan Carlos y Doña Mayela) y animaciones de Tapita.
- **Despliegue del servidor:** documentar en `server/README.md` cómo publicarlo y configurar `NET.SERVER_URL`. El build sigue siendo estático.
- Que el modo solo siga idéntico (recorrido de regresión completo).

## Definición de "terminado" para cada hito cooperativo

Además de la definición del plan principal:

- Se probó con **dos pestañas** (y desde el Hito 16, con dos máquinas).
- Ninguna sala nueva se puede pasar con un solo jugador (prueba manual con el modo desarrolladora apagado).
- Los mensajes de red nuevos tienen prueba en `tests/net/`.
- El modo solo arranca y se juega igual que antes.

## Decisiones tomadas en este diseño (para confirmar)

1. **Servidor sin dependencias.** WebSocket implementado a mano en Node, para mantener "sin dependencias en tiempo de ejecución". La alternativa es el paquete `ws`, solo en `server/`.
2. **Autoridad dividida** (cada uno manda en su personaje y el anfitrión en el mundo), en vez de una simulación determinista compartida.
3. **Sin vidas limitadas en cooperativo:** reaparición infinita; el costo es el tiempo y la nota.
4. **Sin pausa real en línea**, salvo cuando alguien se desconecta.
5. **Cooperativo local** (mismo teclado) fuera de alcance. `?coop=local` existe solo para depurar.
6. **Historia independiente** del modo solo, sin spoilers de N.U.L.L.
7. El género cooperativo se tomó como referencia de **estilo**. Los nombres, personajes, mecánicas concretas y arte son originales (regla 4 de `CLAUDE.md`).

## Preguntas abiertas para Stward

- **Juan Carlos:** ¿cómo se ve, qué chistes internos tiene y está de acuerdo con aparecer?
- **Tapita:** ¿el nombre y la personalidad te gustan? ¿Está inspirada en alguien?
- **Servidor en producción:** ¿dónde lo vamos a publicar? Se puede dejar para el Hito 16; mientras tanto, se juega en red local o con el servidor corriendo en tu máquina.
- ¿El modo cooperativo se abre desde el inicio, o después de terminar el modo solo? El diseño asume que desde el inicio.
