# Servidor de salas · Modo Sincronizado

Es el servidor del modo cooperativo. Corre en Node sin dependencias y no simula el juego. Hace tres cosas:

- Crea salas con un código de 5 caracteres.
- Junta a los dos jugadores.
- Reenvía los mensajes de uno al otro.

El diseño completo está en `docs/coop/04_red.md`.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.js` | Servidor HTTP y WebSocket, lista de orígenes, revisión de expiraciones y ping de mantenimiento |
| `ws.js` | WebSocket mínimo (RFC 6455): apretón de manos, tramas de texto con fragmentación, ping/pong y cierre |
| `rooms.js` | Salas, códigos, reconexión (20 s), límites y expiración. Es lógica pura y el juego la reutiliza en `src/net/loopTransport.js` |

El protocolo y los números (límites y tiempos) se comparten con el juego: `src/net/protocol.js` y `src/config/net.js`.

## Correrlo

```bash
npm run server        # solo el servidor, en el puerto 8787
npm run dev:coop      # servidor + juego (Vite con --host, también accesible desde la red local)
```

En desarrollo, el juego se conecta a `/ws` del mismo host y Vite lo redirige al servidor (`vite.config.js`). Por eso funciona igual desde `localhost` y desde otra máquina de la red.

### Variables de entorno

| Variable | Para qué | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `8787` |
| `ORIGINS` | Orígenes permitidos, separados por coma (por ejemplo `https://mi-juego.com`) | Vacío: se acepta cualquiera |

`GET /` responde `choco-salas ok · v1 · salas N`. Sirve para revisar que el servidor está vivo.

## Jugar en la red local

1. En una máquina, correr `npm run dev:coop`.
2. Vite imprime una dirección `Network`, por ejemplo `http://192.168.10.28:5173/`.
3. La otra máquina abre esa dirección en el navegador. Ya puede crear una sala o unirse con el código.

Si el firewall de Windows pregunta, hay que permitir Node en redes privadas.

## Desplegar (Hito 16)

1. Subir el repositorio (o al menos `server/`, `src/net/protocol.js` y `src/config/net.js`) a un servicio que acepte Node y WebSocket.
2. Arrancarlo con `node server/index.js`, con `PORT` si el servicio lo asigna y `ORIGINS` con el dominio del juego.
3. En `src/config/net.js`, poner `SERVER_URL: 'wss://dominio-del-servidor/ws'` y hacer `npm run build`. El juego sigue siendo una carpeta estática.
4. Si el juego se sirve por `https`, el servidor tiene que ir por `wss://`. El certificado lo pone normalmente el servicio o un proxy delante.

Para probar sin tocar el build, se puede abrir el juego con `?server=wss://dominio-del-servidor/ws`.

## Privacidad

- No se guarda información personal. El nombre opcional dura lo que dura la sala.
- No se registra el contenido de los mensajes, solo contadores (`rooms.stats`).
