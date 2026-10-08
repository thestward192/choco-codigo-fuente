// Portapapeles para el código de sala. Todo dentro de try/catch: si el navegador no deja,
// la pantalla dice "Copialo a mano" y el juego sigue igual.

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // sin permiso: se intenta el método viejo
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    document.getElementById('screen')?.focus();
    return !!ok;
  } catch (err) {
    return false;
  }
}

export async function readText() {
  try {
    return (await navigator.clipboard?.readText?.()) || '';
  } catch (err) {
    return '';
  }
}
