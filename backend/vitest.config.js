import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env.test cedo o suficiente para valer tanto no globalSetup quanto
// nos workers dos arquivos de teste (que herdam o env do processo pai).
dotenv.config({ path: path.join(__dirname, '.env.test') });
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    // Todos os arquivos de teste compartilham o mesmo banco Postgres real —
    // rodar em paralelo causaria truncates/dados cruzados entre arquivos.
    fileParallelism: false,
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 30_000,
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
    },
  },
});
