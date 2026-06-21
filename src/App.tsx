import { useEffect, useState } from "react";
import { C } from "./ui/tokens";
import SceneBackground from "./ui/SceneBackground";
import TopBar from "./ui/TopBar";
import HubScreen from "./ui/screens/HubScreen";
import MarketScreen from "./ui/screens/MarketScreen";
import SailScreen from "./ui/screens/SailScreen";
import RepairScreen from "./ui/screens/RepairScreen";
import DialogueLayer from "./ui/DialogueLayer";
import IntroRunner from "./ui/IntroRunner";
import CourseModal from "./ui/CourseModal";
import DispatchModal from "./ui/DispatchModal";
import FacilityModal, { type Facility } from "./ui/FacilityModal";
import Toaster from "./ui/Toaster";
import { GameProvider } from "./state/GameContext";
import { DialogueProvider } from "./state/DialogueContext";
import { Bgm } from "./audio/bgm";

export type Screen = "hub" | "market" | "sail" | "repair";

const accent = C.gold;

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [scale, setScale] = useState(1);
  const [showCourse, setShowCourse] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);

  // 1600×900 舞台等比縮放置中
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900, 1.2));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // 依場景切換背景音樂（#19）
  useEffect(() => {
    Bgm.play(screen);
  }, [screen]);

  const showSharedBg = screen === "hub" || screen === "market";

  return (
    <GameProvider>
      <DialogueProvider>
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

          {screen === "hub" && <HubScreen setScreen={setScreen} accent={accent} onDispatch={() => setShowDispatch(true)} onFacility={(k) => setFacility(k)} />}
          {screen === "market" && <MarketScreen accent={accent} />}
          {screen === "sail" && <SailScreen setScreen={setScreen} accent={accent} />}
          {screen === "repair" && <RepairScreen setScreen={setScreen} />}

          <TopBar screen={screen} setScreen={setScreen} accent={accent} onGear={() => setShowCourse(true)} />
          <DialogueLayer />
          <IntroRunner />
          <CourseModal open={showCourse} onClose={() => setShowCourse(false)} />
          <DispatchModal open={showDispatch} onClose={() => setShowDispatch(false)} />
          <FacilityModal kind={facility} onClose={() => setFacility(null)} />
          <Toaster />
        </div>
      </div>
      </DialogueProvider>
    </GameProvider>
  );
}
