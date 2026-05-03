import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gasUrlRaw = env.VITE_GAS_WEB_APP_URL?.trim()
  const gasProxyRaw = env.VITE_GAS_PROXY_PATH?.trim()
  const proxy: Record<string, { target: string; changeOrigin: boolean; rewrite: (p: string) => string }> = {}
  if (mode === 'development' && gasUrlRaw && gasProxyRaw && gasProxyRaw.startsWith('/')) {
    try {
      const execPath = gasUrlRaw.replace(/^https?:\/\/[^/]+/i, '')
      proxy[gasProxyRaw] = {
        target: new URL(gasUrlRaw.startsWith('http') ? gasUrlRaw : `https://${gasUrlRaw}`).origin,
        changeOrigin: true,
        rewrite: () => execPath,
      }
    } catch {
      /**/
    }
  }

  return {
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv', '**/*.jpeg', '**/*.jpg'],

  server: {
    proxy,
  },

  }

})
