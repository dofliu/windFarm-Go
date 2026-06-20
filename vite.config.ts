import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 開發伺服器固定埠，方便用 Preview/瀏覽器除錯
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { target: "es2020" },
});
