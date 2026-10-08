import { describe, it, expect } from 'vitest';
import { NET } from '../../src/config/net.js';
import {
  randomCode,
  cleanCode,
  normalizeCode,
  isValidCode,
  parseClientMessage,
  parseServerMessage,
  parseGameMessage,
  decode,
  PROTOCOL_VERSION,
  GAME,
} from '../../src/net/protocol.js';
import { pingQuality } from '../../src/net/session.js';

describe('Códigos de sala', () => {
  it('el alfabeto no tiene caracteres que se confundan', () => {
    for (const ch of 'ILO01') expect(NET.CODE_ALPHABET).not.toContain(ch);
    expect(new Set(NET.CODE_ALPHABET).size).toBe(NET.CODE_ALPHABET.length);
  });

  it('randomCode da 5 caracteres válidos', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const c = randomCode(rnd);
      expect(c).toHaveLength(NET.CODE_LENGTH);
      expect(isValidCode(c)).toBe(true);
    }
    // Los extremos del generador también dan códigos válidos
    expect(isValidCode(randomCode(() => 0))).toBe(true);
    expect(isValidCode(randomCode(() => 0.9999999))).toBe(true);
  });

  it('se aceptan minúsculas y se ignoran espacios y caracteres fuera del alfabeto', () => {
    expect(normalizeCode('k7mpq')).toBe('K7MPQ');
    expect(normalizeCode(' K 7 M P Q ')).toBe('K7MPQ');
    expect(normalizeCode('k7-mp q!')).toBe('K7MPQ');
    expect(cleanCode('hola10')).toBe('HA'); // O, L, 1 y 0 no existen
    expect(normalizeCode('K7MP')).toBeNull();
    expect(normalizeCode(null)).toBeNull();
    expect(isValidCode('K7MPO')).toBe(false);
    expect(isValidCode('K7MPQQ')).toBe(false);
  });
});

describe('Validación de mensajes', () => {
  it('create y join necesitan la versión; join normaliza el código', () => {
    expect(parseClientMessage({ type: 'create', v: PROTOCOL_VERSION })).toEqual({ type: 'create', v: PROTOCOL_VERSION, name: null });
    expect(parseClientMessage({ type: 'create' })).toBeNull();
    expect(parseClientMessage({ type: 'join', v: 1, code: 'k7mpq' }).code).toBe('K7MPQ');
    expect(parseClientMessage({ type: 'join', v: 1, code: 'K7' })).toBeNull();
  });

  it('limpia el nombre opcional', () => {
    const m = parseClientMessage({ type: 'create', v: 1, name: '  Stward\u0007 con un nombre larguísimo ' });
    expect(m.name.length).toBeLessThanOrEqual(NET.MAX_NAME_LENGTH);
    expect(m.name).not.toMatch(/[\u0000-\u001f]/);
  });

  it('ignora tipos desconocidos y basura', () => {
    for (const bad of [null, 5, 'hola', [], { type: 'hack' }, { type: 'ping', t: 'x' }, { type: 'relay' }, { type: 'resume', token: 'x' }]) {
      expect(parseClientMessage(bad)).toBeNull();
    }
    expect(parseServerMessage({ type: 'created', code: 'NOPE!', token: 'abc' })).toBeNull();
    expect(parseServerMessage({ type: 'wat' })).toBeNull();
    expect(parseGameMessage({ type: 'nuke' })).toBeNull();
    expect(parseGameMessage({ type: GAME.HELLO })).toEqual({ type: GAME.HELLO });
    expect(decode('{roto')).toBeNull();
  });

  it('calidad del ping', () => {
    expect(pingQuality(null)).toBeNull();
    expect(pingQuality(30)).toBe('good');
    expect(pingQuality(NET.PING_GOOD)).toBe('ok');
    expect(pingQuality(NET.PING_OK)).toBe('bad');
  });
});
