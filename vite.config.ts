import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 本地開發走根路徑；正式 build 走 GitHub Pages 專案子路徑 /windFarm-Go/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/windFarm-Go/" : "/",
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    target: "es2020",
    // 把 React 拆成獨立 vendor chunk(長期快取友善);其餘畫面/彈窗由 React.lazy 各自切 chunk
    rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom", "react-dom/client"] } } },
  },
}));
