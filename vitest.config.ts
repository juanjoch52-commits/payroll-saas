import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Config de Vitest para los tests unitarios del motor de nómina (puro, sin BD).
 * Alias `@/` → `src/` para que los imports de los módulos coincidan con Next.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
