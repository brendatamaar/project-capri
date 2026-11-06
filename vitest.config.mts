import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { projects: [
  { test: { name: 'scaffold', include: ['tests/scaffold/**/*.test.ts'] } },
  { test: { name: 'core', include: ['src/core/**/*.test.ts'] } },
  { test: { name: 'contracts', include: ['tests/contracts/**/*.test.ts'] } },
] } });
