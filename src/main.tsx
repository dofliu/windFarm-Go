import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 不使用 StrictMode：其開發期重複掛載會與 Phaser 遊戲生命週期競態（重複建立/銷毀 game）。
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// PWA(階段 1)：僅正式環境註冊 Service Worker(避免開發期快取困擾);
// 以 BASE_URL 對齊 GitHub Pages 子路徑 → scope = /windFarm-Go/。失敗靜默(不影響遊玩)。
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
  });
}
