// Números de red del Modo Sincronizado — docs/coop/04_red.md
// Lo comparten el juego (src/net/) y el servidor de salas (server/), así que no puede importar
// nada del navegador.

export const NET = {
  // Versión del protocolo: si el cliente y el servidor no coinciden, el servidor responde VERSION.
  PROTOCOL_VERSION: 1,

  // URL del servidor de salas. null = el mismo host del juego en /ws (en desarrollo, Vite lo
  // redirige al servidor local). Al desplegar, se pone aquí la URL wss:// del servidor.
  // También se puede cambiar con ?server=ws://IP:8787 en la URL.
  SERVER_URL: null,
  SERVER_PATH: '/ws',
  PORT: 8787,

  // Códigos de sala: 5 caracteres sin los que se confunden (I, L, O, 0, 1)
  CODE_LENGTH: 5,
  CODE_ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',

  // Límites del servidor
  ROOM_CAPACITY: 2,
  MAX_ROOMS: 500,
  MAX_MESSAGE_BYTES: 16 * 1024,
  MAX_MESSAGES_PER_SECOND: 120,
  MAX_NAME_LENGTH: 16,

  // Tiempos del servidor (segundos)
  EMPTY_ROOM_TTL: 120, // sala vacía
  IDLE_ROOM_TTL: 600, // sala con un solo jugador que no envía nada
  RECONNECT_GRACE: 20, // el lugar de quien perdió la conexión se guarda este tiempo
  SERVER_TICK: 1, // cada cuánto revisa expiraciones
  KEEPALIVE: 15, // ping de WebSocket para detectar conexiones muertas

  // Cliente (segundos)
  CONNECT_TIMEOUT: 5,
  REQUEST_TIMEOUT: 5, // crear o unirse a una sala
  PING_INTERVAL: 1,
  PING_SMOOTH: 0.3, // suavizado exponencial del ping mostrado
  RECONNECT_EVERY: 2, // reintentos de reconexión dentro de RECONNECT_GRACE
  OFFLINE_RETRY: 4, // el menú cooperativo reintenta conectar cada tanto si no hay servidor

  // Indicador de ping (ms): verde por debajo de GOOD, amarillo por debajo de OK, rojo después
  PING_GOOD: 80,
  PING_OK: 160,

  // Sincronización del juego (docs/coop/04_red.md)
  ME_RATE: 30, // estados del propio personaje por segundo
  WORLD_RATE: 20, // estados del mundo (anfitrión) por segundo
  INTERP_DELAY: 100, // ms: el compañero y el mundo se dibujan esto atrás
  EXTRAPOLATE_MAX: 150, // ms: si faltan datos se extrapola hasta acá y después se congela
  SNAPSHOT_KEEP: 1000, // ms de historia que se guarda
  ACK_RESEND: 500, // ms: un evento confiable sin confirmar se reenvía
  RIDE_CORRECT: 100, // ms: corrección suave del de arriba al montarse
  BUTTON_RELEASE: 150, // ms que el personaje debe estar fuera de un botón para soltarlo

  // Latencia simulada (?lag=): variación aleatoria alrededor del valor pedido (ms)
  LAG_JITTER: 20,
};
