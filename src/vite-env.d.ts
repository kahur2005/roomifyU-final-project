/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_WEB_APP_URL?: string;
  readonly VITE_GAS_PROXY_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
