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
import FleetOpsModal from "./ui/FleetOpsModal";
import FacilityModal, { type Facility } from "./ui/FacilityModal";
import Toaster from "./ui/Toaster";
import LoginScreen from "./ui/LoginScreen";
import ScoreSync from "./ui/ScoreSync";
import WelcomeOnLogin from "./ui/WelcomeOnLogin";
import { GameProvider } from "./state/GameContext";
import { DialogueProvider } from "./state/DialogueContext";
import { Bgm } from "./audio/bgm";
import { getProfile, clearProfile } from "./state/profile";
import { SCENES, getSceneId, setSceneId as persistSceneId, getMode, setMode as persistMode, getImgIdx, setImgIdx as persistImgIdx, imagesFor, type SceneMode } from "./ui/scenes";
import { getWeek, setWeek as persistWeek } from "./state/course";

export type Screen = "hub" | "market" | "sail" | "repair";

const accent = C.gold;

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [scale, setScale] = useState(1);
  const [showCourse, setShowCourse] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showOps, setShowOps] = useState(false);
  const [showFleet, setShowFleet] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loggedIn, setLoggedIn] = useState(() => getProfile() != null);
  const [sceneId, setSceneId] = useState(getSceneId);
  const [aerial, setAerial] = useState(false); // 俯瞰風場全景模式（#32）
  const [mode, setMode] = useState<SceneMode>(getMode); // 模擬/實境/漫畫（#32）
  const [imgIdx, setImgIdx] = useState(getImgIdx); // 圖片模式目前索引
  const [week, setWeekState] = useState(getWeek); // 教師端開放週次（#3）
  const changeWeek = (w: number) => { persistWeek(w); setWeekState(w); };

  const imgList = imagesFor(mode);
  const imageFile = imgList.length ? imgList[imgIdx % imgList.length].file : undefined;
  const sceneName = mode === "sim" ? SCENES.find((s) => s.id === sceneId)?.name : imgList[imgIdx % imgList.length]?.name;

  // 切換背景模式：模擬 → 實境 → 漫畫 → 模擬
  const cycleMode = () => {
    const order: SceneMode[] = ["sim", "real", "comic"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next); persistMode(next); setImgIdx(0); persistImgIdx(0);
  };
  // 切換背景：模擬循環海域、圖片模式循環圖片
  const cycleScene = () => {
    if (mode === "sim") {
      const i = SCENES.findIndex((s) => s.id === sceneId);
      const nid = SCENES[(i + 1) % SCENES.length].id;
      setSceneId(nid); persistSceneId(nid);
    } else if (imgList.length) {
      const n = (imgIdx + 1) % imgList.length;
      setImgIdx(n); persistImgIdx(n);
    }
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
          {(mode !== "sim" || showSharedBg) && <SceneBackground sceneId={sceneId} aerial={aerial && screen === "hub"} mode={mode} imageFile={imageFile} />}

          {screen === "hub" && <HubScreen setScreen={setScreen} accent={accent} onDispatch={() => setShowDispatch(true)} onFacility={(k) => setFacility(k)} sceneName={sceneName} onCycleScene={cycleScene} aerial={aerial} onToggleView={() => setAerial((v) => !v)} mode={mode} onCycleMode={cycleMode} onOps={() => setShowOps(true)} onFleet={() => setShowFleet(true)} week={week} />}
          {screen === "market" && <MarketScreen accent={accent} />}
          {screen === "sail" && <SailScreen setScreen={setScreen} accent={accent} mode={mode} />}
          {screen === "repair" && <RepairScreen setScreen={setScreen} mode={mode} />}

          <TopBar screen={screen} setScreen={setScreen} accent={accent} onGear={() => setShowCourse(true)} onLogout={logout} />
          <DialogueLayer />
          <IntroRunner />
          <CourseModal open={showCourse} onClose={() => setShowCourse(false)} week={week} onSetWeek={changeWeek} />
          <DispatchModal open={showDispatch} onClose={() => setShowDispatch(false)} />
          <OpsCenterModal open={showOps} onClose={() => setShowOps(false)} />
          <FleetOpsModal open={showFleet} onClose={() => setShowFleet(false)} />
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
