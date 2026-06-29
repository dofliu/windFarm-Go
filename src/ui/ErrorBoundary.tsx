import { Component, type ReactNode } from "react";

// 全域錯誤邊界:任何 render 例外不再變成「整片空白」,改顯示可讀訊息 + 重新載入按鈕。
// 同時提供「清除快取並重載」以排除 PWA service worker 服務到舊版資產的情況。
interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  async hardReload() {
    try {
      if ("caches" in window) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); }
      if ("serviceWorker" in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); }
    } catch { /* ignore */ }
    location.reload();
  }

  render() {
    if (!this.state.error) return this.props.children;
    const box: React.CSSProperties = { maxWidth: 460, width: "90vw", background: "linear-gradient(180deg,#14323f,#0d242e)", border: "1px solid rgba(214,167,84,.5)", borderRadius: 10, padding: "24px 22px", color: "#f4ead2", fontFamily: "'Noto Sans TC',sans-serif", textAlign: "center", boxShadow: "0 16px 40px rgba(0,0,0,.5)" };
    const btn: React.CSSProperties = { padding: "11px 18px", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: "linear-gradient(180deg,#e8c074,#d9a441)", color: "#3a2708", fontWeight: 900, fontSize: 14, cursor: "pointer", margin: "4px" };
    const btn2: React.CSSProperties = { ...btn, background: "rgba(255,255,255,.08)", color: "#f4ead2", border: "1px solid rgba(214,167,84,.5)" };
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 30%,#14242d,#070d11 80%)", padding: 16 }}>
        <div style={box}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>⚓️</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>畫面載入發生問題 / Something went wrong</div>
          <div style={{ fontSize: 13, color: "#9fb9c2", lineHeight: 1.6, marginBottom: 16 }}>請先「重新載入」;若仍異常,點「清除快取並重載」(常見於更新後舊版快取殘留)。<br />Try reload first; if it persists, clear cache &amp; reload.</div>
          <div>
            <button style={btn} onClick={() => location.reload()}>重新載入 / Reload</button>
            <button style={btn2} onClick={() => this.hardReload()}>清除快取並重載 / Clear cache</button>
          </div>
          <div style={{ fontSize: 11, color: "#6f8b95", marginTop: 14, wordBreak: "break-word" }}>{String(this.state.error?.message || this.state.error)}</div>
        </div>
      </div>
    );
  }
}
