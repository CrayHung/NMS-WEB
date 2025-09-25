// vite.config.js
//前端代理 , 把 /api、/ws、/tg 這些請求在開發階段轉送到遠端主機的後端服務


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
        // 把 /tg 前綴去掉 → /tg/api/... 轉為 /api/...
        rewrite: p => p.replace(/^\/tg/, ''),

        // 把 Origin 改成上游自己的（或直接移除）
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
