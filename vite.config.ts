import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/smartclassroom': {
        target: 'https://cekl.d9lab.net',
        changeOrigin: true,
        secure: false, // 允许不严格的SSL/TLS握手
        timeout: 180000, // 配置代理超时为3分钟，防止大文件AI处理期间被切断
        proxyTimeout: 180000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
