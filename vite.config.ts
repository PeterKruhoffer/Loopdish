import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import stylex from '@stylexjs/unplugin'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  plugins:
    mode === 'test'
      ? []
      : [
          stylex.vite({
            useCSSLayers: true,
            runtimeInjection: false,
            devMode: 'full',
            devPersistToDisk: true,
            cssInjectionTarget: (fileName) => fileName.endsWith('global.css'),
          }),
          tanstackStart(),
          nitro(),
          viteReact(),
        ],
  test: {
    include: ['convex/**/*.test.ts'],
  },
  fmt: {
    ignorePatterns: [
      '.amp/**',
      'convex/_generated/**',
      'dist/**',
      'node_modules/**',
      'pnpm-lock.yaml',
      'src/routeTree.gen.ts',
    ],
    semi: false,
    singleQuote: true,
    sortPackageJson: false,
    trailingComma: 'all',
  },
  lint: {
    ignorePatterns: [
      '.amp/**',
      'convex/_generated/**',
      'dist/**',
      'node_modules/**',
      'src/routeTree.gen.ts',
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
}))
