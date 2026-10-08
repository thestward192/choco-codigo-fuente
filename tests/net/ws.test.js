import { describe, it, expect } from 'vitest';
import { acceptKey, handshakeResponse, encodeFrame, closePayload, FrameParser, OP, CLOSE } from '../../server/ws.js';

const MASK = [0x37, 0xfa, 0x21, 0x3d];
const clientFrame = (op, payload, opts = {}) => encodeFrame(op, Buffer.from(payload), { mask: MASK, ...opts });
const headers = (over = {}) => ({
  upgrade: 'websocket',
  connection: 'keep-alive, Upgrade',
  'sec-websocket-version': '13',
  'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
  ...over,
});

describe('Apretón de manos', () => {
  it('calcula Sec-WebSocket-Accept como el ejemplo del RFC 6455', () => {
    expect(acceptKey('dGhlIHNhbXBsZSBub25jZQ==')).toBe('s3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
  });

  it('responde 101 a una petición válida', () => {
    const r = handshakeResponse(headers());
    expect(r).toContain('101 Switching Protocols');
    expect(r).toContain('Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
    expect(r.endsWith('\r\n\r\n')).toBe(true);
  });

  it('rechaza peticiones incompletas', () => {
    expect(handshakeResponse(headers({ upgrade: 'h2c' }))).toBeNull();
    expect(handshakeResponse(headers({ connection: 'keep-alive' }))).toBeNull();
    expect(handshakeResponse(headers({ 'sec-websocket-version': '8' }))).toBeNull();
    expect(handshakeResponse(headers({ 'sec-websocket-key': 'corta' }))).toBeNull();
  });
});

describe('Tramas', () => {
  it('lee un texto enmascarado', () => {
    const p = new FrameParser();
    expect(p.push(clientFrame(OP.TEXT, '{"type":"ping"}'))).toEqual([{ type: 'text', data: '{"type":"ping"}' }]);
  });

  it('lee texto con tildes (UTF-8)', () => {
    const p = new FrameParser();
    expect(p.push(clientFrame(OP.TEXT, '¡Sincronizados, mae!'))[0].data).toBe('¡Sincronizados, mae!');
  });

  it('largos de 16 y 64 bits', () => {
    const p = new FrameParser({ maxSize: 200000 });
    const mid = 'a'.repeat(300);
    const big = 'b'.repeat(70000);
    expect(p.push(clientFrame(OP.TEXT, mid))[0].data).toBe(mid);
    expect(p.push(clientFrame(OP.TEXT, big))[0].data).toBe(big);
  });

  it('las tramas pueden llegar de a un byte y varias juntas', () => {
    const p = new FrameParser();
    const both = Buffer.concat([clientFrame(OP.TEXT, 'uno'), clientFrame(OP.TEXT, 'dos')]);
    const out = [];
    for (const byte of both) out.push(...p.push(Buffer.from([byte])));
    expect(out.map((e) => e.data)).toEqual(['uno', 'dos']);
    const p2 = new FrameParser();
    expect(p2.push(both).map((e) => e.data)).toEqual(['uno', 'dos']);
  });

  it('une mensajes fragmentados, con un ping en el medio', () => {
    const p = new FrameParser();
    const ev = p.push(
      Buffer.concat([
        clientFrame(OP.TEXT, 'Sin', { fin: false }),
        clientFrame(OP.PING, 'hola'),
        clientFrame(OP.CONT, 'cro', { fin: false }),
        clientFrame(OP.CONT, 'nizados'),
      ]),
    );
    expect(ev[0]).toEqual({ type: 'ping', data: Buffer.from('hola') });
    expect(ev[1]).toEqual({ type: 'text', data: 'Sincronizados' });
  });

  it('pong, binario y cierre con código', () => {
    const p = new FrameParser();
    expect(p.push(clientFrame(OP.PONG, ''))).toEqual([{ type: 'pong' }]);
    expect(p.push(clientFrame(OP.BINARY, 'xyz'))[0].type).toBe('binary');
    expect(p.push(encodeFrame(OP.CLOSE, closePayload(1000, 'chao'), { mask: MASK }))).toEqual([{ type: 'close', code: 1000, reason: 'chao' }]);
    expect(new FrameParser().push(clientFrame(OP.CLOSE, ''))[0]).toMatchObject({ type: 'close', code: CLOSE.NO_STATUS });
  });

  it('las tramas del servidor van sin máscara', () => {
    const f = encodeFrame(OP.TEXT, Buffer.from('hola'));
    expect(f[0]).toBe(0x81);
    expect(f[1]).toBe(4);
    expect(f.subarray(2).toString()).toBe('hola');
  });
});

describe('Tramas mal formadas', () => {
  const fails = (buf, opts) => {
    const p = new FrameParser(opts);
    const ev = p.push(buf);
    // después de un error no se lee nada más
    expect(p.push(clientFrame(OP.TEXT, 'x'))).toEqual([]);
    return ev.at(-1);
  };

  it('sin máscara → error de protocolo', () => {
    expect(fails(encodeFrame(OP.TEXT, Buffer.from('x')))).toMatchObject({ type: 'error', code: CLOSE.PROTOCOL });
  });

  it('bits reservados u opcode desconocido → error de protocolo', () => {
    const rsv = clientFrame(OP.TEXT, 'x');
    rsv[0] |= 0x40;
    expect(fails(rsv)).toMatchObject({ type: 'error', code: CLOSE.PROTOCOL });
    const op = clientFrame(OP.TEXT, 'x');
    op[0] = 0x80 | 0x3;
    expect(fails(op)).toMatchObject({ type: 'error', code: CLOSE.PROTOCOL });
  });

  it('control fragmentado o muy grande → error de protocolo', () => {
    expect(fails(clientFrame(OP.PING, 'x', { fin: false }))).toMatchObject({ code: CLOSE.PROTOCOL });
    expect(fails(clientFrame(OP.PING, 'x'.repeat(126)))).toMatchObject({ code: CLOSE.PROTOCOL });
  });

  it('continuación sin inicio o datos intercalados → error de protocolo', () => {
    expect(fails(clientFrame(OP.CONT, 'x'))).toMatchObject({ code: CLOSE.PROTOCOL });
    expect(fails(Buffer.concat([clientFrame(OP.TEXT, 'a', { fin: false }), clientFrame(OP.TEXT, 'b')]))).toMatchObject({ code: CLOSE.PROTOCOL });
  });

  it('demasiado grande → 1009 sin esperar el resto de los datos', () => {
    // Solo el encabezado que anuncia 1 MB: se corta de una vez
    const header = clientFrame(OP.TEXT, 'x'.repeat(70000)).subarray(0, 14);
    expect(fails(header, { maxSize: 1024 })).toMatchObject({ code: CLOSE.TOO_BIG });
    // Fragmentos que juntos se pasan del límite
    const parts = Buffer.concat([clientFrame(OP.TEXT, 'a'.repeat(600), { fin: false }), clientFrame(OP.CONT, 'b'.repeat(600))]);
    expect(fails(parts, { maxSize: 1024 })).toMatchObject({ code: CLOSE.TOO_BIG });
  });

  it('UTF-8 inválido → 1007', () => {
    expect(fails(encodeFrame(OP.TEXT, Buffer.from([0xc3, 0x28]), { mask: MASK }))).toMatchObject({ code: CLOSE.INVALID_DATA });
  });

  it('cierre con 1 byte o código inválido → error de protocolo', () => {
    expect(fails(encodeFrame(OP.CLOSE, Buffer.from([3]), { mask: MASK }))).toMatchObject({ code: CLOSE.PROTOCOL });
    expect(fails(encodeFrame(OP.CLOSE, closePayload(1005), { mask: MASK }))).toMatchObject({ code: CLOSE.PROTOCOL });
  });
});
