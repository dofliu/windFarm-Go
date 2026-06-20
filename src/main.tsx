import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 不使用 StrictMode：其開發期重複掛載會與 Phaser 遊戲生命週期競態（重複建立/銷毀 game）。
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
