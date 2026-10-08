import { describe, it, expect } from 'vitest';
import { defaultLobby, applyPick, parseLobby } from '../../src/coop/lobbyState.js';

describe('Sala de espera', () => {
  it('por defecto el anfitrión es Choco y el invitado Tapita, nadie listo', () => {
    expect(defaultLobby()).toEqual({ host: { char: 'choco', ready: false }, guest: { char: 'tapita', ready: false } });
  });

  it('tomar el personaje del otro intercambia y quita los dos "listo"', () => {
    let l = applyPick(defaultLobby(), 'host', { ready: true });
    l = applyPick(l, 'guest', { ready: true });
    const swapped = applyPick(l, 'guest', { char: 'choco' });
    expect(swapped).toEqual({ host: { char: 'tapita', ready: false }, guest: { char: 'choco', ready: false } });
    expect(l.host.ready).toBe(true); // no muta el original
  });

  it('nunca quedan los dos con el mismo personaje', () => {
    let l = defaultLobby();
    for (const [slot, char] of [['host', 'tapita'], ['guest', 'tapita'], ['host', 'tapita'], ['guest', 'choco'], ['host', 'choco']]) {
      l = applyPick(l, slot, { char });
      expect(l.host.char).not.toBe(l.guest.char);
    }
  });

  it('marcar y desmarcar listo; un personaje desconocido no cambia nada', () => {
    let l = applyPick(defaultLobby(), 'guest', { ready: true });
    expect(l.guest.ready).toBe(true);
    l = applyPick(l, 'guest', { ready: false });
    expect(l.guest.ready).toBe(false);
    expect(applyPick(l, 'host', { char: 'mario' })).toEqual(l);
  });

  it('valida el estado que manda el anfitrión', () => {
    expect(parseLobby(defaultLobby())).toEqual(defaultLobby());
    expect(parseLobby({ host: { char: 'choco', ready: false }, guest: { char: 'choco', ready: false } })).toBeNull();
    expect(parseLobby({ host: { char: 'choco', ready: 'sí' }, guest: { char: 'tapita', ready: false } })).toBeNull();
    expect(parseLobby(null)).toBeNull();
  });
});
