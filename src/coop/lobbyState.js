// Estado de la sala de espera (lógica pura): quién es quién y quién está listo.
// El anfitrión es la autoridad: aplica los pedidos del invitado y le manda el estado completo.

export const CHARS = ['choco', 'tapita'];
const other = (slot) => (slot === 'host' ? 'guest' : 'host');

export function defaultLobby() {
  return { host: { char: 'choco', ready: false }, guest: { char: 'tapita', ready: false } };
}

// Aplica un pedido de un jugador sobre el estado de la sala (lógica pura, con pruebas).
// Cambiar de personaje intercambia con el compañero y quita los dos "listo".
export function applyPick(lobby, slot, { char, ready } = {}) {
  const out = { host: { ...lobby.host }, guest: { ...lobby.guest } };
  const me = out[slot];
  const them = out[other(slot)];
  if (CHARS.includes(char) && char !== me.char) {
    them.char = me.char;
    me.char = char;
    me.ready = false;
    them.ready = false;
  } else if (typeof ready === 'boolean') {
    me.ready = ready;
  }
  return out;
}

// Valida el estado que manda el anfitrión.
export function parseLobby(d) {
  const ok = (p) => p && CHARS.includes(p.char) && typeof p.ready === 'boolean';
  if (!ok(d?.host) || !ok(d?.guest) || d.host.char === d.guest.char) return null;
  return { host: { char: d.host.char, ready: d.host.ready }, guest: { char: d.guest.char, ready: d.guest.ready } };
}
