import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  site: 'https://me.oriz.in',
  integrations: [tailwind(), react()],
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, 'src'),
      },
    },
  },
})
