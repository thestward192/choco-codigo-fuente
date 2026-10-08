// Servidor de salas del Modo Sincronizado — docs/coop/04_red.md
// Node sin dependencias: HTTP + WebSocket (server/ws.js) + salas (server/rooms.js).
// No simula el juego: solo crea salas, empareja a los dos jugadores y reenvía mensajes.
//
//   npm run server                    → puerto 8787
//   PORT=9000 npm run server          → otro puerto
//   ORIGINS=https://mi-juego.com npm run server → solo acepta conexiones desde esos orígenes
import http from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { NET } from '../src/config/net.js';
import { RoomManager } from './rooms.js';
import { WebSocketConnection, handshakeResponse, CLOSE } from './ws.js';

// ¿Se acepta este Origin? Sin lista configurada se acepta cualquiera (desarrollo y red local).
export function originAllowed(origin, allowed) {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(String(origin || ''));
}

export function startServer({ port = NET.PORT, host = undefined, origins = [], log = console.log } = {}) {
  const rooms = new RoomManager({
    random: () => randomInt(0, 2 ** 32) / 2 ** 32,
    token: () => randomBytes(12).toString('hex'),
  });
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    // Para revisar que el servidor está vivo (y para el menú: sin datos de nadie)
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(`choco-salas ok · v${NET.PROTOCOL_VERSION} · salas ${rooms.roomCount}\n`);
  });

  server.on('upgrade', (req, socket) => {
    const path = (req.url || '/').split('?')[0];
    const reply = handshakeResponse(req.headers);
    if (!reply || (path !== '/' && path !== NET.SERVER_PATH)) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return;
    }
    if (!originAllowed(req.headers.origin, origins)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    socket.write(reply);
    const ws = new WebSocketConnection(socket, { maxSize: NET.MAX_MESSAGE_BYTES });
    const conn = {
      send: (msg) => ws.send(JSON.stringify(msg)),
      close: (code, reason) => ws.close(code ?? CLOSE.NORMAL, reason),
    };
    sockets.add(ws);
    rooms.connect(conn);
    ws.onText = (text) => rooms.message(conn, text);
    ws.onClose = () => {
      sockets.delete(ws);
      rooms.disconnect(conn);
    };
  });

  const tick = setInterval(() => rooms.tick(), NET.SERVER_TICK * 1000);
  // Ping de WebSocket: quien no contestó el anterior se da por caído
  const keepalive = setInterval(() => {
    for (const ws of sockets) {
      if (!ws.alive) ws.close(CLOSE.GOING_AWAY, 'timeout');
      else ws.ping();
    }
  }, NET.KEEPALIVE * 1000);

  server.listen(port, host, () => {
    const addr = server.address();
    log(`[salas] escuchando en ws://localhost:${addr.port}${NET.SERVER_PATH} (protocolo v${NET.PROTOCOL_VERSION})`);
    if (!origins.length) log('[salas] sin lista de orígenes (ORIGINS): se acepta cualquiera');
  });

  return {
    server,
    rooms,
    get port() {
      return server.address()?.port;
    },
    close() {
      clearInterval(tick);
      clearInterval(keepalive);
      for (const ws of sockets) ws.close(CLOSE.GOING_AWAY, 'shutdown');
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

// Ejecutado directamente (npm run server)
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.env.PORT) || NET.PORT;
  const origins = (process.env.ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const s = startServer({ port, origins });
  const stop = () => s.close().then(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
