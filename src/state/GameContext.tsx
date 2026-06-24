import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { INITIAL, reducer, migrateVessels, computeScore, type Action, type GameData } from "./game";
import { getProfile, saveKeyFor, isAuthed } from "./profile";
import { SAVE_SYNC, loadCloudState, saveCloudState, CLOUD_FIRST } from "../cloud/sheet";
import { cloudEnabled, identityOf, loadStateCloud, saveStateCloud, pickNewer, type SaveEnvelope } from "../cloud/api";

// 依登入身分取得存檔 key —— 每位使用者資料獨立，互不沿用
function saveKey(): string {
  return saveKeyFor(getProfile());
}
// 本機快取的存檔時間戳（用於與雲端比較「較新者為準」）
const metaKey = (): string => `${saveKey()}::savedAt`;
function readLocalEnvelope(): SaveEnvelope | null {
  try {
    const state = localStorage.getItem(saveKey());
    if (!state) return null;
    return { state, savedAt: Number(localStorage.getItem(metaKey())) || 0 };
  } catch {
    return null;
  }
}
function writeMeta(savedAt: number): void {
  try {
    localStorage.setItem(metaKey(), String(savedAt));
  } catch {
    // 忽略
  }
}

function load(): GameData {
  try {
    const raw = localStorage.getItem(saveKey());
    if (raw) return migrateVessels({ ...INITIAL, ...JSON.parse(raw) });
  } catch {
    // 忽略損壞存檔
  }
  return INITIAL;
}

// 是否啟用雲端為主（需設定開啟、後端可用、且為非訪客的有效登入）
function cloudFirstActive(): boolean {
  const p = getProfile();
  return CLOUD_FIRST && cloudEnabled() && isAuthed(p) && !!p && !p.guest;
}

const Ctx = createContext<{ data: GameData; dispatch: React.Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);

  // D1：狀態變更即存檔（寫入該登入身分專屬 key），並更新本機時間戳
  useEffect(() => {
    try {
      localStorage.setItem(saveKey(), JSON.stringify(data));
      writeMeta(Date.now());
    } catch {
      // 忽略寫入失敗
    }
  }, [data]);

  // ── 雲端為主（v2）：登入時以「較新者為準」載入；變更去抖後上傳。離線時純用本機快取。──
  useEffect(() => {
    if (!cloudFirstActive()) return;
    const p = getProfile();
    if (!p) return;
    const localEnv = readLocalEnvelope(); // 在任何寫入前捕捉本機envelope，避免競態
    loadStateCloud(identityOf(p)).then((cloudEnv) => {
      const pick = pickNewer(localEnv, cloudEnv);
      if (!pick || pick.from === "local") return; // 本機較新或相同 → 維持本機
      try {
        dispatch({ type: "LOAD_STATE", state: JSON.parse(pick.use.state) });
      } catch {
        // 損壞雲端存檔忽略
      }
    });
    // 僅在掛載時對齊一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!cloudFirstActive()) return;
    const p = getProfile();
    if (!p) return;
    const id = window.setTimeout(() => {
      const savedAt = Date.now();
      writeMeta(savedAt);
      saveStateCloud(identityOf(p), { state: JSON.stringify(data), savedAt }, {
        score: computeScore(data),
        day: data.day,
        availability: data.availability,
        generation: data.generationMWh,
      });
    }, 1500);
    return () => window.clearTimeout(id);
  }, [data]);

  // ── 舊版完整存檔同步（#31，SAVE_SYNC 預設 false；與 CLOUD_FIRST 互斥）──
  useEffect(() => {
    if (!SAVE_SYNC || CLOUD_FIRST) return;
    loadCloudState(getProfile()).then((json) => {
      if (!json) return;
      try {
        dispatch({ type: "LOAD_STATE", state: JSON.parse(json) });
      } catch {
        // 損壞雲端存檔忽略
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!SAVE_SYNC || CLOUD_FIRST) return;
    const id = window.setTimeout(() => saveCloudState(getProfile(), JSON.stringify(data)), 1500);
    return () => window.clearTimeout(id);
  }, [data]);

  return <Ctx.Provider value={{ data, dispatch }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame must be used within GameProvider");
  return v;
}
