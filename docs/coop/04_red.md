# Coop 04 · Red, salas y servidor

## Resumen

- Dos navegadores se conectan a un **servidor de salas** por **WebSocket**.
- El servidor solo crea salas, empareja a los dos jugadores y **reenvía mensajes**. No simula el juego.
- El jugador que crea la sala es el **anfitrión**. Su navegador manda en el mundo: enemigos, jefes, puzzles, temporizadores y aleatoriedad. Cada navegador manda en **su propio personaje**. Ver "Modelo de autoridad".
- Si el servidor no está disponible, el modo solo funciona igual y el menú cooperativo muestra el error.

## Stack y reglas

- **Cliente:** la API `WebSocket` nativa del navegador, sin bibliotecas.
- **Servidor:** **Node.js sin dependencias**. El protocolo WebSocket (RFC 6455) se implementa a mano en `server/ws.js`, con apretón de manos, tramas de texto, ping/pong y cierre.
  - Es lo mínimo necesario para salas de 2 personas, y mantiene la regla del proyecto de no agregar dependencias en tiempo de ejecución.
  - **Alternativa**, si Stward la aprueba: usar el paquete `ws` solo en `server/`. El juego no lo necesita.
- **Mensajes en JSON.** El tamaño típico es de menos de 300 bytes. Si hace falta en el pulido, los estados del personaje pasan a un formato binario compacto.

## Archivos

```
server/
├── index.js        ← servidor HTTP + WebSocket (puerto configurable)
├── ws.js           ← implementación mínima de RFC 6455
├── rooms.js        ← salas, códigos, límites, expiración (lógica pura, con pruebas)
└── README.md       ← cómo correrlo y desplegarlo
src/
├── config/net.js   ← URL del servidor, frecuencias, tiempos de espera (NET)
├── net/
│   ├── transport.js        ← interfaz común: send / onMessage / close
│   ├── wsTransport.js      ← transporte real por WebSocket
│   ├── loopTransport.js    ← transporte local en memoria (pruebas y depuración)
│   ├── session.js          ← sala, rol (anfitrión/invitado), ping, reconexión
│   ├── protocol.js         ← tipos de mensaje, validación y versiones
│   └── sync.js             ← estados, interpolación y eventos del juego
├── coop/                   ← escenas y lógica del modo cooperativo
└── entities/tapita.js
tests/
└── net/…                   ← salas, protocolo, interpolación y loopback
```

### Comandos nuevos

- `npm run server`: levanta el servidor de salas en `localhost:8787`.
- `npm run dev:coop`: levanta Vite y el servidor juntos.
- En desarrollo, Vite redirige `/ws` al servidor (proxy), así el juego siempre usa la misma URL.

## Salas y códigos

- **Código:** 5 caracteres de un alfabeto sin caracteres que se confundan: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin I, L, O, 0 ni 1). Por ejemplo, `K7MPQ`. Al escribirlo se aceptan minúsculas y se ignoran los espacios.
- **Capacidad:** 2 jugadores. Un tercero recibe el error "La sala está llena".
- **Expiración:**
  - Una sala vacía se borra a los **2 min**.
  - Una sala con un solo jugador que no envía nada se borra a los **10 min**.
- **Reconexión:** si un jugador pierde la conexión, la sala le guarda el lugar **20 s**. Al volver con su token de sesión, retoma su rol.
- **Límites del servidor:** máximo 500 salas, 16 KB por mensaje y 120 mensajes por segundo por conexión. Quien los supere se desconecta.

## Protocolo

### Cliente ↔ servidor

| Mensaje | Dirección | Datos |
|---|---|---|
| `create` | C → S | `{ v, name? }` — crea una sala |
| `created` | S → C | `{ code, token, role: 'host' }` |
| `join` | C → S | `{ v, code, name? }` |
| `joined` | S → C | `{ code, token, role: 'guest' }` |
| `resume` | C → S | `{ token }` — reconexión |
| `peer` | S → C | `{ state: 'joined' \| 'left' \| 'back' }` |
| `relay` | C → S → C | `{ d }` — cualquier mensaje del juego, reenviado al otro tal cual |
| `ping` / `pong` | C ↔ S | `{ t }` — mide la latencia |
| `error` | S → C | `{ code: 'NOT_FOUND' \| 'FULL' \| 'VERSION' \| 'RATE' \| 'SERVER' }` |

- `v` es la **versión del protocolo**. Si no coincide con la del servidor, responde `VERSION` y el menú dice "Versiones distintas: actualicen el juego los dos".

### Mensajes del juego (dentro de `relay`)

| Mensaje | Quién | Cuándo | Datos |
|---|---|---|---|
| `hello` | Los dos | Al unirse | Versión del juego, personaje elegido, controles no |
| `pick` | Los dos | Sala de espera | Personaje (Choco/Tapita), listo/no listo |
| `start` | Anfitrión | Al empezar un mapa | Mapa, sección, semilla aleatoria |
| `me` | Los dos | 30 veces por segundo | Estado del propio personaje (ver abajo) |
| `act` | Los dos | Al momento | Acciones que afectan el mundo: disparo, mazo, martillazo, melcocha, interactuar, señal, golpe recibido |
| `world` | Anfitrión | 20 veces por segundo | Estado del mundo: enemigos, jefe, plataformas móviles, marea, balanzas |
| `ev` | Anfitrión | Al momento (con número de secuencia) | Eventos de puzzle: compuerta abierta, botón activo, sala terminada, fase del jefe, diálogo |
| `ack` | Invitado | Al recibir un `ev` | Número de secuencia recibido (el anfitrión reenvía si no llega en 500 ms) |
| `menu` | Los dos | Al abrir o cerrar la pausa | Para mostrar el ícono "en el menú" |
| `bye` | Los dos | Al salir | Salida limpia |

**Estado del personaje (`me`):** posición, velocidad, dirección, animación y frame, vida, flags (en el suelo, montado, plantado, escudo, Vista Debug, sombrilla, buceando) y puntería.

## Modelo de autoridad

| Qué | Quién manda | Cómo lo ve el otro |
|---|---|---|
| Movimiento y física del propio personaje | Su dueño | Interpolado, 100 ms atrás |
| Vida del propio personaje y daño recibido | Su dueño (calcula los choques contra el mundo que ve) | Por `me` y `act` |
| Enemigos, jefes, proyectiles enemigos | Anfitrión | Interpolado por `world` |
| Puzzles: botones, compuertas, balanzas, marea, temporizadores | Anfitrión | Por `world` y `ev` (confiables) |
| Disparos y golpes del invitado | Los simula el anfitrión al recibir `act`. El invitado los dibuja al instante para que se sientan inmediatos | Confirmados por `world` |
| Coleccionables | Anfitrión (decide quién lo tomó primero) | `ev` |
| Aleatoriedad | Anfitrión: semilla en `start` y resultados en `world` | — |

**Por qué este modelo:**

- Cada jugador siente su personaje **sin ningún retraso**, que es lo más importante en un juego de plataformas.
- El mundo es **uno solo**: no hay dos versiones de un puzzle.
- No hace falta que la simulación sea determinista entre navegadores distintos, cosa difícil de garantizar con números de punto flotante.
- En un juego cooperativo nadie gana haciendo trampa, así que confiar en cada cliente para su personaje es aceptable.

**Peso y botones:** el anfitrión calcula los pesos sobre botones y balanzas con su propio personaje y con la última posición conocida del invitado. Un botón se suelta solo si el personaje que lo pisaba lleva **150 ms** fuera de él, para que la latencia no lo haga parpadear.

**Montarse y apilarse:** el de arriba sigue al de abajo con la posición que este reporta. Si llega tarde, se corrige suavemente en 100 ms, nunca con un salto brusco.

## Latencia

- **Objetivo:** que se juegue bien con hasta **150 ms** de latencia de ida y vuelta, y que se pueda jugar con hasta 300 ms.
- **Interpolación:** el compañero y el mundo se dibujan **100 ms atrás**, entre dos estados recibidos. Si faltan datos, se extrapola hasta 150 ms y después se congela.
- **Indicador:** la sala de espera y la pausa muestran el ping (verde < 80 ms, amarillo < 160 ms, rojo después).
- **Diseño a favor de la red:** las terminales de doble firma tienen una ventana de 0.5 s, mucho mayor que la latencia. Ningún puzzle exige que los dos actúen en el mismo cuadro.

## Desconexión

- **Si el compañero se desconecta:** el juego se congela para quien sigue (aquí sí hay pausa) con el mensaje "Esperando a tu compañero… 20" y una cuenta regresiva.
  - **Si vuelve:** el anfitrión reenvía el estado completo de la sala y siguen.
  - **Si no vuelve:** los dos regresan al menú cooperativo y se guarda el progreso hasta el último checkpoint.
- **Si se cae el anfitrión:** el invitado no puede continuar solo (no tiene la autoridad del mundo). Espera los 20 s y vuelve al menú.

## Pruebas y herramientas de desarrollo

- **`loopTransport`:** dos sesiones en la misma página, conectadas en memoria. Permite pruebas unitarias del protocolo y la sincronización sin red, y el atajo de desarrollo `?coop=local`, que abre las dos vistas una al lado de la otra con el mismo teclado (WASD + teclas para el jugador 2) solo para depurar.
- **Latencia simulada:** `?lag=120` agrega 120 ms (±20 de variación) a todos los mensajes, en el cliente.
- **Pruebas del servidor:** códigos únicos, sala llena, expiración, reconexión, límites de tamaño y tramas mal formadas.
- **Overlay de depuración** (`?debug=1`): ping, mensajes por segundo, bytes por segundo y retraso de interpolación.

## Despliegue

- El juego sigue siendo una carpeta estática (`dist/`).
- El servidor de salas es un proceso de Node aparte, desplegable en cualquier servicio que acepte Node y WebSocket. La URL se configura en `NET.SERVER_URL`:
  - En desarrollo es `ws://localhost:8787` (con el proxy de Vite).
  - En producción, la que se defina al desplegar. Siempre `wss://` si el juego está en `https`.
- **Red local:** si los dos están en la misma red, uno corre `npm run server` y el otro se conecta a la IP de esa máquina. Es útil para probar sin desplegar nada.

## Privacidad y seguridad

- No se pide ni se guarda información personal. El nombre opcional en la sala dura solo lo que dura la sala.
- El servidor no guarda registros de mensajes, solo contadores.
- Se valida el origen (`Origin`) contra una lista configurable, se ignoran mensajes con tipos desconocidos y se limita la tasa de mensajes.
