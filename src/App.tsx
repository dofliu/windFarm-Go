import { useEffect, useState } from "react";
import { C } from "./ui/tokens";
import SceneBackground from "./ui/SceneBackground";
import TopBar from "./ui/TopBar";
import HubScreen from "./ui/screens/HubScreen";
import MarketScreen from "./ui/screens/MarketScreen";
import SailScreen from "./ui/screens/SailScreen";
import RepairScreen from "./ui/screens/RepairScreen";
import { GameProvider } from "./state/GameContext";

export type Screen = "hub" | "market" | "sail" | "repair";

const accent = C.gold;

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [scale, setScale] = useState(1);

  // 1600×900 舞台等比縮放置中
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900, 1.2));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const showSharedBg = screen === "hub" || screen === "market";

  return (
    <GameProvider>
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, #14242d, #070d11 80%)",
          overflow: "hidden",
          fontFamily: "'Noto Sans TC', sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 1600,
            height: 900,
            flex: "none",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            boxShadow: "0 40px 110px rgba(0,0,0,.7)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {showSharedBg && <SceneBackground />}

          {screen === "hub" && <HubScreen setScreen={setScreen} accent={accent} />}
          {screen === "market" && <MarketScreen accent={accent} />}
          {screen === "sail" && <SailScreen setScreen={setScreen} accent={accent} />}
          {screen === "repair" && <RepairScreen setScreen={setScreen} />}

          <TopBar screen={screen} setScreen={setScreen} accent={accent} />
        </div>
      </div>
    </GameProvider>
  );
}
