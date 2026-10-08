// Protocolo del Modo Sincronizado — docs/coop/04_red.md
// Lo usan el juego y el servidor de salas: solo lógica pura, sin APIs del navegador ni de Node.
// Todos los mensajes son objetos JSON con un campo `type`.
import { NET } from '../config/net.js';

export const PROTOCOL_VERSION = NET.PROTOCOL_VERSION;

// Cliente → servidor
export const C2S = ['create', 'join', 'resume', 'leave', 'relay', 'ping'];
// Servidor → cliente
export const S2C = ['created', 'joined', 'resumed', 'peer', 'relay', 'pong', 'error', 'closed'];

// Códigos de error del servidor (el menú los traduce con TEXTS.coop.errors)
export const ERR = {
  NOT_FOUND: 'NOT_FOUND', // no existe una sala con ese código
  FULL: 'FULL', // la sala ya tiene dos jugadores
  VERSION: 'VERSION', // versiones distintas del protocolo
  RATE: 'RATE', // demasiados mensajes o mensaje muy grande
  SERVER: 'SERVER', // el servidor no pudo (por ejemplo, demasiadas salas)
  BAD: 'BAD', // mensaje mal formado
  EXPIRED: 'EXPIRED', // la reconexión llegó tarde: el lugar ya no existe
};

// Estados del compañero que avisa el servidor
export const PEER = { JOINED: 'joined', LEFT: 'left', LOST: 'lost', BACK: 'back' };

// Mensajes del juego que viajan dentro de `relay` (el servidor no los mira)
export const GAME = {
  HELLO: 'hello', // al unirse: versión del juego y personaje
  PICK: 'pick', // invitado → anfitrión: personaje y listo en la sala de espera
  LOBBY: 'lobby', // anfitrión → invitado: estado completo de la sala de espera
  STAT: 'stat', // los dos, cada segundo: ping propio con el servidor
  START: 'start', // anfitrión: empezar
  ME: 'me', // los dos, 30 Hz: estado del propio personaje
  WORLD: 'world', // anfitrión, 20 Hz: enemigos y objetos del mundo
  ACT: 'act', // los dos, al momento: acciones (disparo, golpe, señal…), sin confirmación
  EV: 'ev', // los dos, al momento: eventos confiables con número de secuencia
  ACK: 'ack', // confirmación de un ev
  MENU: 'menu', // los dos: abrió o cerró la pausa
  BYE: 'bye', // los dos: salida limpia
  NAV: 'nav', // anfitrión: cambio de pantalla (mapa de conexiones, resultados, sala de espera)
  CUR: 'cur', // los dos, fuera de las salas: cursor del mapa, sugerencias y confirmaciones
};

// Pantallas a las que lleva NAV
export const NAV_TO = ['map', 'results', 'lobby'];

export const ROLE = { HOST: 'host', GUEST: 'guest' };

// ---------- Códigos de sala ----------

const ALPHABET = NET.CODE_ALPHABET;

// Código aleatorio con la función `random` (0..1) que se le pase (el servidor usa crypto).
export function randomCode(random = Math.random) {
  let s = '';
  for (let i = 0; i < NET.CODE_LENGTH; i++) s += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  return s;
}

// Mayúsculas, sin espacios ni caracteres fuera del alfabeto. No recorta el largo.
export function cleanCode(text) {
  let out = '';
  for (const ch of String(text ?? '').toUpperCase()) if (ALPHABET.includes(ch)) out += ch;
  return out;
}

// Código listo para enviar (los primeros CODE_LENGTH caracteres válidos), o null si no alcanza.
export function normalizeCode(text) {
  const c = cleanCode(text).slice(0, NET.CODE_LENGTH);
  return c.length === NET.CODE_LENGTH ? c : null;
}

export function isValidCode(code) {
  return typeof code === 'string' && code.length === NET.CODE_LENGTH && cleanCode(code) === code;
}

// ---------- Validación ----------

function cleanName(name) {
  if (typeof name !== 'string') return null;
  const n = name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, NET.MAX_NAME_LENGTH);
  return n || null;
}

// Valida un mensaje del cliente. Devuelve una copia limpia, o null si no sirve.
export function parseClientMessage(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
  const type = msg.type;
  if (!C2S.includes(type)) return null;
  switch (type) {
    case 'create':
      if (!Number.isInteger(msg.v)) return null;
      return { type, v: msg.v, name: cleanName(msg.name) };
    case 'join': {
      if (!Number.isInteger(msg.v)) return null;
      const code = normalizeCode(msg.code);
      if (!code) return null;
      return { type, v: msg.v, code, name: cleanName(msg.name) };
    }
    case 'resume':
      if (typeof msg.token !== 'string' || msg.token.length < 8 || msg.token.length > 64) return null;
      return { type, token: msg.token };
    case 'leave':
      return { type };
    case 'relay':
      if (msg.d === undefined) return null;
      return { type, d: msg.d };
    case 'ping':
      if (typeof msg.t !== 'number' || !Number.isFinite(msg.t)) return null;
      return { type, t: msg.t };
    default:
      return null;
  }
}

// Valida un mensaje del servidor (lado del juego). Devuelve el mismo objeto o null.
export function parseServerMessage(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
  if (!S2C.includes(msg.type)) return null;
  if ((msg.type === 'created' || msg.type === 'joined' || msg.type === 'resumed') && (!isValidCode(msg.code) || typeof msg.token !== 'string')) return null;
  return msg;
}

// Valida un mensaje del juego (dentro de relay). Los tipos desconocidos se ignoran.
export function parseGameMessage(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  if (!Object.values(GAME).includes(d.type)) return null;
  if (d.type === GAME.NAV && !NAV_TO.includes(d.to)) return null;
  if (d.type === GAME.CUR && typeof d.k !== 'string') return null;
  return d;
}

// JSON seguro: null si no se puede leer.
export function decode(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

export function encode(msg) {
  return JSON.stringify(msg);
}
