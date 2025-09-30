interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  // Додайте сюди інші змінні, якщо вони є
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}