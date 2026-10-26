import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pure logic only (src/**/*.test.ts). Pinned timezone so wall-clock assertions are stable.
process.env.TZ = 'Asia/Kolkata';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
