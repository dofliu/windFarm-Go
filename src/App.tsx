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
import OpsCenterModal from "./ui/OpsCenterModal";
import FacilityModal, { type Facility } from "./ui/FacilityModal";
import Toaster from "./ui/Toaster";
import LoginScreen from "./ui/LoginScreen";
import ScoreSync from "./ui/ScoreSync";
import WelcomeOnLogin from "./ui/WelcomeOnLogin";
import { GameProvider } from "./state/GameContext";
import { DialogueProvider } from "./state/DialogueContext";
import { Bgm } from "./audio/bgm";
import { getProfile, clearProfile } from "./state/profile";
import { SCENES, getSceneId, setSceneId as persistSceneId, getRealistic, setRealistic as persistRealistic } from "./ui/scenes";

export type Screen = "hub" | "market" | "sail" | "repair";

const accent = C.gold;

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [scale, setScale] = useState(1);
  const [showCourse, setShowCourse] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showOps, setShowOps] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loggedIn, setLoggedIn] = useState(() => getProfile() != null);
  const [sceneId, setSceneId] = useState(getSceneId);
  const [aerial, setAerial] = useState(false); // 俯瞰風場全景模式（#32）
  const [realistic, setRealistic] = useState(getRealistic); // 模擬/實境模式（#32）
  const toggleRealistic = () => setRealistic((v) => { persistRealistic(!v); return !v; });

  // 切換海域背景（#32）：循環到下一個主題並記住選擇
  const cycleScene = () => {
    const i = SCENES.findIndex((s) => s.id === sceneId);
    const next = SCENES[(i + 1) % SCENES.length];
    setSceneId(next.id);
    persistSceneId(next.id);
  };

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

  if (!loggedIn) return <LoginScreen onDone={() => setLoggedIn(true)} />;

  const logout = () => { clearProfile(); setScreen("hub"); setLoggedIn(false); };

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
          {showSharedBg && <SceneBackground sceneId={sceneId} aerial={aerial && screen === "hub"} realistic={realistic} />}

          {screen === "hub" && <HubScreen setScreen={setScreen} accent={accent} onDispatch={() => setShowDispatch(true)} onFacility={(k) => setFacility(k)} sceneId={sceneId} onCycleScene={cycleScene} aerial={aerial} onToggleView={() => setAerial((v) => !v)} realistic={realistic} onToggleRealistic={toggleRealistic} onOps={() => setShowOps(true)} />}
          {screen === "market" && <MarketScreen accent={accent} />}
          {screen === "sail" && <SailScreen setScreen={setScreen} accent={accent} />}
          {screen === "repair" && <RepairScreen setScreen={setScreen} />}

          <TopBar screen={screen} setScreen={setScreen} accent={accent} onGear={() => setShowCourse(true)} onLogout={logout} />
          <DialogueLayer />
          <IntroRunner />
          <CourseModal open={showCourse} onClose={() => setShowCourse(false)} />
          <DispatchModal open={showDispatch} onClose={() => setShowDispatch(false)} />
          <OpsCenterModal open={showOps} onClose={() => setShowOps(false)} />
          <FacilityModal kind={facility} onClose={() => setFacility(null)} />
          <ScoreSync />
          <WelcomeOnLogin />
          <Toaster />
        </div>
      </div>
      </DialogueProvider>
    </GameProvider>
  );
}
