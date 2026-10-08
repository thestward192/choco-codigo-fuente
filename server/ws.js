// Implementación mínima de WebSocket (RFC 6455) para el servidor de salas, sin dependencias.
// Soporta: apretón de manos, tramas de texto (con fragmentación), ping/pong y cierre.
// Las tramas binarias se aceptan pero se ignoran: el protocolo del juego es JSON.
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export const OP = { CONT: 0x0, TEXT: 0x1, BINARY: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xa };

export const CLOSE = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL: 1002,
  UNSUPPORTED: 1003,
  NO_STATUS: 1005,
  INVALID_DATA: 1007,
  POLICY: 1008,
  TOO_BIG: 1009,
};

// ---------- Apretón de manos ----------

export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

// Revisa los encabezados de la petición de upgrade. Devuelve la respuesta 101 o null si no es válida.
export function handshakeResponse(headers) {
  const upgrade = String(headers.upgrade || '').toLowerCase();
  const connection = String(headers.connection || '').toLowerCase();
  const version = String(headers['sec-websocket-version'] || '');
  const key = String(headers['sec-websocket-key'] || '');
  if (upgrade !== 'websocket') return null;
  if (!connection.split(',').some((s) => s.trim() === 'upgrade')) return null;
  if (version !== '13') return null;
  if (!/^[A-Za-z0-9+/]{22}==$/.test(key)) return null; // 16 bytes en base64
  return ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptKey(key)}`, '', ''].join('\r\n');
}

// ---------- Tramas ----------

// Trama del servidor (sin máscara). mask: solo para pruebas (simula un cliente).
export function encodeFrame(opcode, payload = Buffer.alloc(0), { fin = true, mask = null } = {}) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = (fin ? 0x80 : 0) | opcode;
  if (!mask) return Buffer.concat([header, data]);
  header[1] |= 0x80;
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, Buffer.from(mask), masked]);
}

export function closePayload(code, reason = '') {
  const r = Buffer.from(String(reason)).subarray(0, 123);
  const b = Buffer.alloc(2 + r.length);
  b.writeUInt16BE(code, 0);
  r.copy(b, 2);
  return b;
}

function validCloseCode(code) {
  return (code >= 1000 && code <= 1003) || (code >= 1007 && code <= 1011) || (code >= 3000 && code <= 4999);
}

// Lee tramas de un cliente (siempre enmascaradas) a medida que llegan los bytes.
// push(chunk) devuelve una lista de eventos:
//   { type: 'text', data } · { type: 'binary', data } · { type: 'ping', data } · { type: 'pong' }
//   { type: 'close', code, reason } · { type: 'error', code, reason } (después de un error no lee más)
export class FrameParser {
  constructor({ maxSize = 16 * 1024 } = {}) {
    this.maxSize = maxSize;
    this.buf = Buffer.alloc(0);
    this.fragments = null; // { opcode, parts, size } mientras llega un mensaje fragmentado
    this.failed = false;
    this.decoder = new TextDecoder('utf-8', { fatal: true });
  }

  push(chunk) {
    const events = [];
    if (this.failed) return events;
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : Buffer.from(chunk);
    for (;;) {
      const ev = this.next();
      if (!ev) break;
      events.push(ev);
      if (ev.type === 'error' || ev.type === 'close') break;
    }
    return events;
  }

  fail(code, reason) {
    this.failed = true;
    this.buf = Buffer.alloc(0);
    return { type: 'error', code, reason };
  }

  // Intenta leer una trama completa del búfer. null = faltan bytes.
  next() {
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return null;
      const fin = (b[0] & 0x80) !== 0;
      const rsv = b[0] & 0x70;
      const opcode = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let off = 2;
      if (rsv) return this.fail(CLOSE.PROTOCOL, 'rsv');
      if (!Object.values(OP).includes(opcode)) return this.fail(CLOSE.PROTOCOL, 'opcode');
      if (!masked) return this.fail(CLOSE.PROTOCOL, 'unmasked');
      const control = opcode >= 0x8;
      if (control && (!fin || len > 125)) return this.fail(CLOSE.PROTOCOL, 'control');
      if (len === 126) {
        if (b.length < 4) return null;
        len = b.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (b.length < 10) return null;
        const big = b.readBigUInt64BE(2);
        if (big > BigInt(this.maxSize)) return this.fail(CLOSE.TOO_BIG, 'size');
        len = Number(big);
        off = 10;
      }
      if (len > this.maxSize) return this.fail(CLOSE.TOO_BIG, 'size');
      if (b.length < off + 4 + len) return null;
      const mask = b.subarray(off, off + 4);
      const payload = Buffer.alloc(len);
      for (let i = 0; i < len; i++) payload[i] = b[off + 4 + i] ^ mask[i & 3];
      this.buf = b.subarray(off + 4 + len);

      if (control) return this.control(opcode, payload);

      // Datos (con o sin fragmentación)
      if (opcode === OP.CONT) {
        if (!this.fragments) return this.fail(CLOSE.PROTOCOL, 'continuation');
      } else {
        if (this.fragments) return this.fail(CLOSE.PROTOCOL, 'interleaved');
        this.fragments = { opcode, parts: [], size: 0 };
      }
      const fr = this.fragments;
      fr.parts.push(payload);
      fr.size += len;
      if (fr.size > this.maxSize) return this.fail(CLOSE.TOO_BIG, 'size');
      if (!fin) continue; // esperar el resto
      this.fragments = null;
      const data = Buffer.concat(fr.parts);
      if (fr.opcode === OP.BINARY) return { type: 'binary', data };
      try {
        return { type: 'text', data: this.decoder.decode(data) };
      } catch (err) {
        return this.fail(CLOSE.INVALID_DATA, 'utf8');
      }
    }
  }

  control(opcode, payload) {
    if (opcode === OP.PING) return { type: 'ping', data: payload };
    if (opcode === OP.PONG) return { type: 'pong' };
    // Cierre
    if (payload.length === 0) return { type: 'close', code: CLOSE.NO_STATUS, reason: '' };
    if (payload.length === 1) return this.fail(CLOSE.PROTOCOL, 'close');
    const code = payload.readUInt16BE(0);
    if (!validCloseCode(code)) return this.fail(CLOSE.PROTOCOL, 'close-code');
    let reason = '';
    try {
      reason = this.decoder.decode(payload.subarray(2));
    } catch (err) {
      return this.fail(CLOSE.INVALID_DATA, 'utf8');
    }
    return { type: 'close', code, reason };
  }
}

// ---------- Conexión ----------

// Envuelve un socket ya actualizado a WebSocket.
// Callbacks: onText(text), onClose(code, reason). Métodos: send(text), close(code, reason), ping().
export class WebSocketConnection {
  constructor(socket, { maxSize } = {}) {
    this.socket = socket;
    this.parser = new FrameParser({ maxSize });
    this.open = true;
    this.alive = true; // se pone en false al mandar ping y vuelve a true con el pong
    this.onText = () => {};
    this.onClose = () => {};
    this._closed = false;
    socket.setNoDelay?.(true);
    socket.on('data', (chunk) => this.receive(chunk));
    socket.on('close', () => this.finish(CLOSE.GOING_AWAY, ''));
    socket.on('error', () => this.finish(CLOSE.GOING_AWAY, ''));
  }

  receive(chunk) {
    for (const ev of this.parser.push(chunk)) {
      this.alive = true;
      if (ev.type === 'text') {
        if (this.open) this.onText(ev.data);
      } else if (ev.type === 'ping') this.write(encodeFrame(OP.PONG, ev.data));
      else if (ev.type === 'close') {
        // Responder el cierre y terminar
        const code = ev.code === CLOSE.NO_STATUS ? CLOSE.NORMAL : ev.code;
        this.close(code, '');
      } else if (ev.type === 'error') this.close(ev.code, ev.reason);
    }
  }

  write(buf) {
    if (this._closed || this.socket.destroyed) return;
    try {
      this.socket.write(buf);
    } catch (err) {
      this.finish(CLOSE.GOING_AWAY, '');
    }
  }

  send(text) {
    if (!this.open) return;
    this.write(encodeFrame(OP.TEXT, Buffer.from(String(text))));
  }

  ping() {
    if (!this.open) return;
    this.alive = false;
    this.write(encodeFrame(OP.PING));
  }

  close(code = CLOSE.NORMAL, reason = '') {
    if (!this.open) return;
    this.open = false;
    this.write(encodeFrame(OP.CLOSE, closePayload(code, reason)));
    try {
      this.socket.end();
    } catch (err) {
      // ya estaba cerrado
    }
    // Si el cliente no cierra su lado, se corta igual
    setTimeout(() => this.socket.destroy(), 1000).unref?.();
    this.finish(code, reason);
  }

  finish(code, reason) {
    if (this._closed) return;
    this.open = false;
    this._closed = true;
    this.onClose(code, reason);
  }
}
