import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 本地開發走根路徑；正式 build 走 GitHub Pages 專案子路徑 /windFarm-Go/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/windFarm-Go/" : "/",
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { target: "es2020" },
}));
