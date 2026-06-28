import { lazy, Suspense, useEffect, useState } from "react";
import { C } from "./ui/tokens";
import SceneBackground from "./ui/SceneBackground";
import TopBar from "./ui/TopBar";
import HubScreen from "./ui/screens/HubScreen";
import MobileBar from "./ui/MobileBar";
import { useIsMobile } from "./ui/useIsMobile";
import DialogueLayer from "./ui/DialogueLayer";
import TutorialOverlay from "./ui/TutorialOverlay";
import Toaster from "./ui/Toaster";
import { LedgerToaster } from "./ui/Ledger";
import LoginScreen from "./ui/LoginScreen";
import ScoreSync from "./ui/ScoreSync";
import RecordsTracker from "./ui/RecordsTracker";
import DailyTracker from "./ui/DailyTracker";
import WeeklyTracker from "./ui/WeeklyTracker";
import WelcomeOnLogin from "./ui/WelcomeOnLogin";
import type { Facility } from "./ui/FacilityModal";
// Code-split:較重的非首屏畫面/彈窗改為「打開時才載入對應 chunk」,縮小初始包(行動裝置更快)
const MarketScreen = lazy(() => import("./ui/screens/MarketScreen"));
const SailScreen = lazy(() => import("./ui/screens/SailScreen"));
const RepairScreen = lazy(() => import("./ui/screens/RepairScreen"));
const CourseModal = lazy(() => import("./ui/CourseModal"));
const DispatchModal = lazy(() => import("./ui/DispatchModal"));
const OpsCenterModal = lazy(() => import("./ui/OpsCenterModal"));
const FleetOpsModal = lazy(() => import("./ui/FleetOpsModal"));
const ConstructionModal = lazy(() => import("./ui/ConstructionModal"));
const FacilityModal = lazy(() => import("./ui/FacilityModal"));
const CaseFileModal = lazy(() => import("./ui/CaseFileModal"));
const TrendsModal = lazy(() => import("./ui/TrendsModal"));
const ProfileModal = lazy(() => import("./ui/ProfileModal"));
const TeacherModal = lazy(() => import("./ui/TeacherModal"));
import { GameProvider } from "./state/GameContext";
import { DialogueProvider } from "./state/DialogueContext";
import { TutorialProvider } from "./state/TutorialContext";
import { Bgm } from "./audio/bgm";
import { getProfile, clearProfile, isAuthed } from "./state/profile";
import { SCENES, getSceneId, setSceneId as persistSceneId, getMode, setMode as persistMode, getImgIdx, setImgIdx as persistImgIdx, imagesFor, type SceneMode } from "./ui/scenes";
import { getWeek, setWeek as persistWeek } from "./state/course";

export type Screen = "hub" | "market" | "sail" | "repair";

const accent = C.gold;

export default function App() {
  const isMobile = useIsMobile();
  const [screen, setScreen] = useState<Screen>("hub");
  const [scale, setScale] = useState(1);
  const [mScale, setMScale] = useState(() => (typeof window !== "undefined" ? window.innerWidth / 1600 : 0.24)); // 手機非母港畫面:依寬度縮放
  const [showCourse, setShowCourse] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showOps, setShowOps] = useState(false);
  const [showFleet, setShowFleet] = useState(false);
  const [showBuild, setShowBuild] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showCaseFile, setShowCaseFile] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loggedIn, setLoggedIn] = useState(() => isAuthed(getProfile()));
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
    const fit = () => { setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900, 1.2)); setMScale(window.innerWidth / 1600); };
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

  const hubScreen = (m: boolean) => (
    <HubScreen setScreen={setScreen} accent={accent} onDispatch={() => setShowDispatch(true)} onFacility={(k) => setFacility(k)} sceneName={sceneName} onCycleScene={cycleScene} aerial={aerial} onToggleView={() => setAerial((v) => !v)} mode={mode} onCycleMode={cycleMode} onOps={() => setShowOps(true)} onFleet={() => setShowFleet(true)} onBuild={() => setShowBuild(true)} onCaseFile={() => setShowCaseFile(true)} onTrends={() => setShowTrends(true)} week={week} mobile={m} />
  );
  // 非母港畫面(交易所/出海/維修)+背景+頂列。母港另以 hubScreen 呈現(桌機絕對定位、手機單欄流動)。
  const stageScreens = (
    <>
      {(mode !== "sim" || showSharedBg) && <SceneBackground sceneId={sceneId} aerial={aerial && screen === "hub"} mode={mode} imageFile={imageFile} />}
      <Suspense fallback={null}>
        {screen === "market" && <MarketScreen accent={accent} />}
        {screen === "sail" && <SailScreen setScreen={setScreen} accent={accent} mode={mode} />}
        {screen === "repair" && <RepairScreen setScreen={setScreen} mode={mode} />}
      </Suspense>
      <TopBar screen={screen} setScreen={setScreen} accent={accent} onGear={() => setShowCourse(true)} onLogout={logout} onProfile={() => setShowProfile(true)} />
    </>
  );
  const overlays = (<><DialogueLayer /><TutorialOverlay screen={screen} /></>);
  // 彈窗:打開時才掛載 → 對應 chunk 才下載(code-split)。手機上由 .wfg-modal-panel 響應式縮放。
  const modals = (
    <Suspense fallback={null}>
      {showCourse && <CourseModal open onClose={() => setShowCourse(false)} week={week} onSetWeek={changeWeek} onTeacher={() => { setShowCourse(false); setShowTeacher(true); }} />}
      {showDispatch && <DispatchModal open onClose={() => setShowDispatch(false)} />}
      {showOps && <OpsCenterModal open onClose={() => setShowOps(false)} />}
      {showFleet && <FleetOpsModal open onClose={() => setShowFleet(false)} />}
      {showBuild && <ConstructionModal open onClose={() => setShowBuild(false)} />}
      {facility && <FacilityModal kind={facility} onClose={() => setFacility(null)} />}
      {showCaseFile && <CaseFileModal open onClose={() => setShowCaseFile(false)} />}
      {showTrends && <TrendsModal open onClose={() => setShowTrends(false)} />}
      {showProfile && <ProfileModal open onClose={() => setShowProfile(false)} />}
      {showTeacher && <TeacherModal open onClose={() => setShowTeacher(false)} />}
    </Suspense>
  );
  const trackers = (<><ScoreSync /><RecordsTracker /><DailyTracker /><WeeklyTracker /><WelcomeOnLogin /><LedgerToaster /><Toaster /></>);

  return (
    <GameProvider>
      <DialogueProvider>
      <TutorialProvider setScreen={setScreen}>
      {isMobile ? (
        /* ───── 手機精簡版面(直向為主):單欄、可捲動、加大字體 ───── */
        <div className="wfg-mobile-root">
          <MobileBar onGear={() => setShowCourse(true)} onProfile={() => setShowProfile(true)} onLogout={logout} />
          <div className="wfg-mobile-scroll">
            {screen === "hub" ? (
              hubScreen(true)
            ) : (
              <div style={{ position: "relative", width: "100%", height: 900 * mScale, overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 1600, height: 900, transformOrigin: "top left", transform: `scale(${mScale})` }}>
                  {stageScreens}
                </div>
              </div>
            )}
          </div>
          {/* 疊層為 root(fixed)的子元素 → 覆蓋可視區,不隨內容捲動 */}
          {overlays}
          {modals}
          {trackers}
        </div>
      ) : (
        /* ───── 桌機/橫向:1600×900 等比舞台置中 ───── */
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
            id="wfg-stage"
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
            {stageScreens}
            {screen === "hub" && hubScreen(false)}
            {overlays}
            {modals}
            {trackers}
          </div>
        </div>
      )}
      </TutorialProvider>
      </DialogueProvider>
    </GameProvider>
  );
}
