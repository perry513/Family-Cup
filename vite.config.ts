import { defineConfig } from 'vitest/config';

// Relative base so the built site works from any GitHub Pages repo name
// (https://<user>.github.io/<repo>/) and from a plain local web server.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
