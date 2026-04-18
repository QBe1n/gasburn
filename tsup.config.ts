import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  minify: false,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  external: ['better-sqlite3'],
  shims: false
})
