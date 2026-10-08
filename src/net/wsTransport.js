// Transporte real: la API WebSocket nativa del navegador, con mensajes JSON.
import { Transport } from './transport.js';
import { NET } from '../config/net.js';
import { encode, decode } from './protocol.js';

// URL del servidor de salas: ?server=… en la URL, NET.SERVER_URL, o /ws del mismo host.
export function serverUrl(loc = globalThis.location) {
  try {
    const q = new URLSearchParams(loc?.search || '').get('server');
    if (q) return q;
  } catch (err) {
    // sin location (pruebas)
  }
  if (NET.SERVER_URL) return NET.SERVER_URL;
  const secure = loc?.protocol === 'https:';
  return `${secure ? 'wss' : 'ws'}://${loc?.host || 'localhost:' + NET.PORT}${NET.SERVER_PATH}`;
}

export class WsTransport extends Transport {
  constructor(url = serverUrl(), { WebSocketImpl = globalThis.WebSocket, timeout = NET.CONNECT_TIMEOUT } = {}) {
    super();
    this.url = url;
    try {
      this.ws = new WebSocketImpl(url);
    } catch (err) {
      this.ws = null;
      // Se avisa en el siguiente ciclo para que quien lo creó alcance a poner los callbacks
      setTimeout(() => this._closed('error'), 0);
      return;
    }
    this.timer = setTimeout(() => {
      if (this.state === 'connecting') this.close('timeout');
    }, timeout * 1000);
    this.ws.onopen = () => {
      clearTimeout(this.timer);
      this._opened();
    };
    this.ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      const msg = decode(e.data);
      if (msg) this._received(msg, e.data.length);
    };
    this.ws.onerror = () => {};
    this.ws.onclose = () => {
      clearTimeout(this.timer);
      this._closed(this.state === 'connecting' ? 'unreachable' : 'closed');
    };
  }

  send(msg) {
    if (!this.open) return false;
    const text = encode(msg);
    try {
      this.ws.send(text);
    } catch (err) {
      return false;
    }
    this.stats.sent++;
    this.stats.bytesOut += text.length;
    return true;
  }

  close(reason = 'closed') {
    clearTimeout(this.timer);
    try {
      this.ws?.close();
    } catch (err) {
      // ya cerrado
    }
    this._closed(reason);
  }
}
