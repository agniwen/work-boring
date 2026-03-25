/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_DEEPSEEK_API_KEY?: string;
  readonly MAIN_VITE_DEEPSEEK_BASE_URL?: string;
  readonly MAIN_VITE_DEEPSEEK_BASEURL?: string;
  readonly MAIN_VITE_DEEPSEEK_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
