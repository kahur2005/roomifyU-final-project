/** Google Apps Script Web App `/exec` URL. In local dev pair with `VITE_GAS_PROXY_PATH` so Vite can proxy past CORS. */

export function getGasExecUrl(): string | null {
  const full = (import.meta.env.VITE_GAS_WEB_APP_URL ?? '').trim();
  if (!full) return null;

  const proxyRoot = (import.meta.env.VITE_GAS_PROXY_PATH ?? '').trim();
  if (import.meta.env.DEV && proxyRoot) {
    const path = proxyRoot.startsWith('/') ? proxyRoot : `/${proxyRoot}`;
    return path;
  }

  return full;
}
