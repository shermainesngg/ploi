import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // tsconfig sets jsx:'preserve' for Next.js; the React plugin transforms JSX in
  // component files imported by tests (jsdom-env tests use a `@vitest-environment`
  // docblock; node-env logic tests are unaffected).
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
