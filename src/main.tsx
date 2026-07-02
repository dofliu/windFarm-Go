import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ui/ErrorBoundary";
import { syncBodyClass } from "./ui/useReducedMotion";
import "./index.css";

// 無障礙:開機同步「減少動態」手動覆寫(body class),讓 CSS 停用動畫規則生效
syncBodyClass();

// 不使用 StrictMode：其開發期重複掛載會與 Phaser 遊戲生命週期競態（重複建立/銷毀 game）。
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// PWA(階段 1)：僅正式環境註冊 Service Worker(避免開發期快取困擾);
// 以 BASE_URL 對齊 GitHub Pages 子路徑 → scope = /windFarm-Go/。失敗靜默(不影響遊玩)。
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
  });
}
