import { useEffect, useRef } from "react";
import { useGame } from "../state/GameContext";
import { getProfile, isAuthed } from "../state/profile";
import { ACHIEVEMENTS, loadRecord, persistRecord, mergeRecord, unionRecord, type RecordData } from "../state/records";
import { CLOUD_FIRST } from "../cloud/sheet";
import { cloudEnabled, identityOf, loadRecordCloud, saveRecordCloud } from "../cloud/api";
import { toast } from "./toast";
import { Sfx } from "../audio/sfx";

// 學習紀錄追蹤（階段 3）：監看遊戲狀態 → 評估成就、累積最佳紀錄、解鎖時跳通知。
// 本機 localStorage 為主；雲端為主啟用時與後端 records 端點同步（聯集,只增不減）。
function cloudActive(): boolean {
  const p = getProfile();
  return CLOUD_FIRST && cloudEnabled() && isAuthed(p) && !!p && !p.guest;
}

export default function RecordsTracker() {
  const { data } = useGame();
  const recRef = useRef<RecordData | null>(null);

  // 掛載：載入本機紀錄；雲端為主時拉雲端紀錄做聯集
  useEffect(() => {
    const p = getProfile();
    if (!p || p.guest) return;
    let rec = loadRecord(p);
    recRef.current = rec;
    if (!cloudActive()) return;
    loadRecordCloud(identityOf(p)).then((json) => {
      if (!json) return;
      try {
        const cloud = JSON.parse(json) as RecordData;
        rec = unionRecord(recRef.current ?? rec, cloud);
        recRef.current = rec;
        persistRecord(rec, p);
      } catch {
        // 損壞雲端紀錄忽略
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 狀態變更：評估成就 → 新解鎖跳通知；去抖後寫本機 + 上傳雲端
  useEffect(() => {
    const p = getProfile();
    if (!p || p.guest) return;
    const prev = recRef.current ?? loadRecord(p);
    const { rec, newly } = mergeRecord(prev, data, Date.now());
    recRef.current = rec;
    if (newly.length) {
      persistRecord(rec, p);
      // 依序提示新解鎖成就（錯開時間,避免互相覆蓋）
      newly.forEach((id, i) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (!a) return;
        window.setTimeout(() => {
          Sfx.success();
          toast({ zh: `🏅 解鎖成就：${a.name.zh}`, en: `🏅 Achievement: ${a.name.en}` });
        }, i * 1900);
      });
    }
    const id = window.setTimeout(() => {
      persistRecord(rec, p);
      if (cloudActive()) saveRecordCloud(identityOf(p), JSON.stringify(rec));
    }, 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
