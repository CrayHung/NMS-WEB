// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://61.216.140.11:9002', changeOrigin: true },
      '/ws' : { target: 'http://61.216.140.11:9002', changeOrigin: true, ws: true },

      // Telegram
      '/tg': {
        target: 'http://61.216.140.11:9081',
        changeOrigin: true,
        secure: false,
        // ❶ 把 /tg 前綴去掉 → /tg/api/... 轉為 /api/...
        rewrite: p => p.replace(/^\/tg/, ''),

        // ❷ 把 Origin 改成上游自己的（或直接移除）
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.origin) {
              proxyReq.setHeader('origin', 'http://61.216.140.11:9081');
              // 或：proxyReq.removeHeader?.('origin');
            }
          });
        },
      },
    },
  },
});
