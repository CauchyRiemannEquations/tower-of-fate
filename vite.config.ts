import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Phaser 엔진 청크는 원래 크다 — 알려진 항목이므로 경고 한도만 상향
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          // 엔진을 별도 청크로 분리 — 코드 수정 배포 시에도 캐시 유지
          phaser: ['phaser'],
        },
      },
    },
  },
});
