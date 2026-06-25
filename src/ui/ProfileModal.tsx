import { useMemo } from "react";
import { C, FONT_SERIF, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { computeScore } from "../state/game";
import { getProfile, displayName } from "../state/profile";
import { ACHIEVEMENTS, ACHIEVEMENT_COUNT, loadRecord } from "../state/records";
import { CLOUD_FIRST } from "../cloud/sheet";
import { cloudEnabled } from "../cloud/api";
import type { I18n } from "../game/systems/types";

// 個人檔案頁（階段 3）：身分、關鍵數據、最佳紀錄與成就牆。資料來源 = 即時遊戲狀態 + 學習紀錄。
export default function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data } = useGame();
  const profile = getProfile();
  // 開啟時讀一次紀錄（含本回合已累積的最佳值）
  const rec = useMemo(() => loadRecord(profile), [open, profile]);
  if (!open) return null;

  const score = computeScore(data);
  const earned = ACHIEVEMENTS.filter((a) => a.id in rec.unlocked).length;
  const cloudOn = CLOUD_FIRST && cloudEnabled() && profile && !profile.guest;

  const stats: { label: I18n; value: string; sub?: I18n }[] = [
    { label: { zh: "目前績效分", en: "Current score" }, value: score.toLocaleString(), sub: { zh: `最佳 ${rec.bestScore.toLocaleString()}`, en: `best ${rec.bestScore.toLocaleString()}` } },
    { label: { zh: "營運天數", en: "Days operated" }, value: String(Math.max(0, data.day - 21)), sub: { zh: `最久 ${Math.max(0, rec.bestDay - 21)} 天`, en: `max ${Math.max(0, rec.bestDay - 21)}d` } },
    { label: { zh: "累積發電", en: "Generation" }, value: `${data.generationMWh.toLocaleString()} MWh`, sub: { zh: `最佳 ${rec.bestGeneration.toLocaleString()}`, en: `best ${rec.bestGeneration.toLocaleString()}` } },
    { label: { zh: "完成任務", en: "Missions" }, value: String(data.missionsDone), sub: { zh: `最多 ${rec.bestMissions}`, en: `max ${rec.bestMissions}` } },
    { label: { zh: "故障圖鑑", en: "Fault catalog" }, value: String(data.seenFaults?.length ?? 0), sub: { zh: `最多 ${rec.bestCatalog}`, en: `max ${rec.bestCatalog}` } },
    { label: { zh: "戰情室修復", en: "Ops resolved" }, value: String(data.fleetResolved ?? 0), sub: { zh: `最多 ${rec.bestResolved}`, en: `max ${rec.bestResolved}` } },
    { label: { zh: "營運風場", en: "Farms" }, value: String(data.farmsOwned) },
    { label: { zh: "安全事件", en: "Safety incidents" }, value: String(data.safetyIncidents ?? 0) },
  ];

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 600, maxHeight: 760, overflow: "auto", padding: 0 }}>
        {/* 標題列 */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>🪪 {t({ zh: "個人檔案", en: "Profile" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: "16px" }}>
          {/* 身分 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, flex: "none", borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #2a6275, #103039)", border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 26, color: C.goldText }}>
              {profile ? displayName(profile).slice(0, 1) : "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.cream, fontSize: 19, fontWeight: 900, fontFamily: FONT_SERIF }}>{profile ? displayName(profile) : t({ zh: "訪客", en: "Guest" })}</div>
              <div style={{ color: C.mist, fontSize: 12.5, marginTop: 2 }}>
                {profile?.guest
                  ? t({ zh: "訪客模式 · 不計排行與紀錄", en: "Guest · no leaderboard/records" })
                  : t({ zh: `班級 ${profile?.classCode || "—"} · 學號 ${profile?.studentId || "—"}`, en: `Class ${profile?.classCode || "—"} · ID ${profile?.studentId || "—"}` })}
              </div>
            </div>
            <div style={{ textAlign: "center", flex: "none" }}>
              <div style={{ color: C.goldText, fontSize: 26, fontWeight: 900, fontFamily: FONT_SERIF, lineHeight: 1 }}>{earned}<span style={{ color: C.mist, fontSize: 15 }}>/{ACHIEVEMENT_COUNT}</span></div>
              <div style={{ color: C.mist, fontSize: 11, marginTop: 3 }}>{t({ zh: "成就", en: "Badges" })}</div>
            </div>
          </div>

          {/* 數據格 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 18 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.25)", borderRadius: 6, padding: "9px 10px" }}>
                <div style={{ color: C.mist, fontSize: 10.5, marginBottom: 3 }}>{t(s.label)}</div>
                <div style={{ color: C.cream, fontSize: 15, fontWeight: 900, fontFamily: FONT_SERIF, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                {s.sub && <div style={{ color: C.mist2, fontSize: 9.5, marginTop: 2 }}>{t(s.sub)}</div>}
              </div>
            ))}
          </div>

          {/* 成就牆 */}
          <div style={{ color: C.goldText, fontSize: 13.5, fontWeight: 900, fontFamily: FONT_SERIF, marginBottom: 10 }}>{t({ zh: "成就", en: "Achievements" })}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {ACHIEVEMENTS.map((a) => {
              const got = a.id in rec.unlocked;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 6, background: got ? "rgba(217,164,65,.12)" : "rgba(255,255,255,.03)", border: `1px solid ${got ? "rgba(214,167,84,.55)" : "rgba(255,255,255,.08)"}`, opacity: got ? 1 : 0.55 }}>
                  <span style={{ fontSize: 22, flex: "none", filter: got ? "none" : "grayscale(1)" }}>{got ? a.icon : "🔒"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: got ? C.goldText : C.mist, fontSize: 13, fontWeight: 800, fontFamily: FONT_SERIF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(a.name)}</div>
                    <div style={{ color: C.mist, fontSize: 10.5, lineHeight: 1.35 }}>{t(a.desc)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: C.mist2, textAlign: "center" }}>
            {profile?.guest
              ? t({ zh: "訪客紀錄僅存於本機。登入帳號可跨裝置保存學習歷程。", en: "Guest records stay local. Log in to keep your history across devices." })
              : cloudOn
                ? t({ zh: "✅ 學習歷程已與雲端同步（跨裝置保存）。", en: "✅ History synced to the cloud (cross-device)." })
                : t({ zh: "學習歷程存於本機。", en: "History stored locally." })}
          </div>
        </div>
      </div>
    </div>
  );
}
