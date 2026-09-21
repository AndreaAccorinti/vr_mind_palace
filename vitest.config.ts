import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Domain and persistence tests are environment-free on purpose; the few that
    // touch storage adapters opt into jsdom with a per-file docblock.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    restoreMocks: true,
  },
});
