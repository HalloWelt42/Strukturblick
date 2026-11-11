/// <reference types="svelte" />
/// <reference types="vite/client" />

declare const __APP_FASSUNG__: string;

interface ImportMetaEnv {
  readonly VITE_BAUART?: "server" | "eigenstaendig";
}
