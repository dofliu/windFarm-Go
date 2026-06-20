# 內容資料規格 (Content Schema)
**風電勇者：離岸守護者** — 資料驅動內容的型別定義與範例

所有面向玩家的文字欄位一律使用雙語結構：

```json
{ "zh": "繁體中文", "en": "English" }
```

以下每個型別都附 TypeScript 介面 + JSON 範例。實際資料檔放在同層 `*.json`。

---

## 1. Fault — 故障（= 怪物）

```ts
type Category = "mechanical" | "electrical" | "structural" | "control";

interface Fault {
  id: string;                 // 唯一鍵，snake_case
  name: I18n;                 // 怪物/故障名稱
  category: Category;         // 屬性，決定弱點工具
  severity: number;           // = HP，修復難度
  alarm_code: string;         // SCADA 告警碼（顯示用）
  scada_hint: I18n;           // 戰鬥內可揭露的數據線索
  root_cause: string;         // 隱藏真因 id（玩家要判讀出來）
  weakness_tool: string;      // 命中弱點的診斷工具 id
  correct_sop: string;        // 正確 SOP id（高傷害）
  distractors: string[];      // 干擾用的錯誤 SOP id
  region: string;             // 所屬海域 id（見 §8 Region）
  knowledge_point: string;    // 知識點標籤，供課程對照（見 §9）
  reward: { exp: number; budget: number; unlock?: string };
}
interface I18n { zh: string; en: string }
```

```json
{
  "id": "gearbox_overheat",
  "name": { "zh": "齒輪箱過熱告警", "en": "Gearbox Overheat Alarm" },
  "category": "mechanical",
  "severity": 120,
  "alarm_code": "GBX-TEMP-HIGH",
  "scada_hint": {
    "zh": "齒輪箱油溫高於正常 +18°C，振動 RMS 正常",
    "en": "Gearbox oil temp +18°C above normal; vibration RMS normal"
  },
  "root_cause": "cooling_pump_fail",
  "weakness_tool": "thermal_imaging",
  "correct_sop": "sop_gbx_cooling",
  "distractors": ["sop_blade_repair", "sop_pitch_calib"],
  "region": "asia_monsoon",
  "knowledge_point": "gearbox_thermal",
  "reward": { "exp": 40, "budget": 200, "unlock": "tool_multimeter" }
}
```

---

## 2. SOP — 標準作業程序

```ts
interface SOP {
  id: string;
  name: I18n;
  target_fault: string;       // 對應 fault id
  steps: I18n[];              // 逐步流程，戰鬥/維修報告顯示
  damage: number;             // 對正確故障的修復量
}
```

```json
{
  "id": "sop_gbx_cooling",
  "name": { "zh": "齒輪箱冷卻系統檢修", "en": "Gearbox Cooling System Service" },
  "target_fault": "gearbox_overheat",
  "steps": [
    { "zh": "確認冷卻幫浦電源與保險絲", "en": "Check cooling pump power and fuse" },
    { "zh": "檢查冷卻迴路是否阻塞或洩漏", "en": "Inspect cooling loop for blockage/leak" },
    { "zh": "更換失效幫浦並重啟冷卻", "en": "Replace failed pump and restart cooling" }
  ],
  "damage": 80
}
```

---

## 3. Tool — 工具/武器與 AI 技能

```ts
type ToolType = "physical" | "diagnostic" | "ai_skill";

interface Tool {
  id: string;
  name: I18n;
  type: ToolType;
  power: number;              // physical: 修復量；diagnostic: 揭露強度
  mp_cost?: number;          // ai_skill 專用，消耗電力
  reveals_category?: Category;// diagnostic：看穿哪種屬性弱點
  uses_per_battle?: number;  // ai_skill 限用次數（如 RAG）
  requires?: string[];       // 詠唱素材，如 manual_fragment
}
```

```json
[
  {
    "id": "tool_torque_wrench",
    "name": { "zh": "基礎扭力扳手", "en": "Torque Wrench" },
    "type": "physical", "power": 10
  },
  {
    "id": "tool_thermal_imaging",
    "name": { "zh": "熱顯像儀", "en": "Thermal Imaging Camera" },
    "type": "diagnostic", "power": 1, "reveals_category": "mechanical"
  },
  {
    "id": "skill_wind_rag",
    "name": { "zh": "終極禁咒：Wind-RAG", "en": "Oracle: Wind-RAG" },
    "type": "ai_skill", "power": 200, "mp_cost": 50,
    "uses_per_battle": 1, "requires": ["manual_fragment"]
  }
]
```

---

## 4. Puzzle — 謎題（三類題型引擎）

```ts
type PuzzleType = "DataReading" | "CalcInput" | "LogicReasoning";

interface Puzzle {
  id: string;
  type: PuzzleType;
  location: string;           // 所屬關卡/塔
  knowledge_point: string;    // 知識點標籤，供課程對照（見 §9）
  prompt: I18n;               // 題幹
  hint: I18n;                 // 提示
  // type 專屬欄位（擇一）：
  options?: PuzzleOption[];   // DataReading / LogicReasoning
  answer?: number | string;   // CalcInput 正解（含容差）
  tolerance?: number;         // CalcInput 數值容差
  formula?: string;           // CalcInput 顯示公式（供教學）
  on_success: string;         // 過關事件 id
}
interface PuzzleOption { label: I18n; correct: boolean; image?: string }
```

### 4.1 DataReading 範例（頻譜迷宮）
```json
{
  "id": "puzzle_fft_door",
  "type": "DataReading",
  "location": "tower_gearbox",
  "prompt": { "zh": "三扇門各顯示一張 FFT 頻譜，選出安全的門。",
              "en": "Three doors show FFT spectra. Choose the safe one." },
  "hint": { "zh": "只有平穩的心跳才能通往安全。",
            "en": "Only a steady heartbeat leads to safety." },
  "options": [
    { "label": { "zh": "門 A：BPFI 突波", "en": "Door A: BPFI spike" }, "correct": false, "image": "fft_bpfi.png" },
    { "label": { "zh": "門 B：平穩頻譜", "en": "Door B: flat spectrum" }, "correct": true, "image": "fft_normal.png" },
    { "label": { "zh": "門 C：1X 不平衡", "en": "Door C: 1X imbalance" }, "correct": false, "image": "fft_1x.png" }
  ],
  "on_success": "open_gearbox_core"
}
```

### 4.2 CalcInput 範例（葉尖速比 TSR）
```json
{
  "id": "puzzle_tsr_lock",
  "type": "CalcInput",
  "location": "tower_yaw",
  "prompt": { "zh": "守衛要求最佳葉尖速比密碼：v=10 m/s, R=80 m, ω=0.85 rad/s。",
              "en": "Enter the optimal TSR code: v=10 m/s, R=80 m, ω=0.85 rad/s." },
  "hint": { "zh": "λ = ωR / v", "en": "λ = ωR / v" },
  "formula": "λ = ωR / v",
  "answer": 6.8,
  "tolerance": 0.05,
  "on_success": "unlock_pitch_control"
}
```

### 4.3 LogicReasoning 範例（SCADA 警報日誌）
```json
{
  "id": "puzzle_scada_log",
  "type": "LogicReasoning",
  "location": "tower_scada",
  "prompt": { "zh": "補上 10:02 缺漏的警報，才能 Reset 系統。",
              "en": "Fill the missing 10:02 alarm to reset the system." },
  "hint": { "zh": "壓力下降 → ? → 轉子超速。中間少了什麼動作失效？",
            "en": "Pressure drop → ? → rotor overspeed. What action failed?" },
  "options": [
    { "label": { "zh": "變槳無法作動", "en": "Pitch system inoperative" }, "correct": true },
    { "label": { "zh": "偏航電機過載", "en": "Yaw motor overload" }, "correct": false },
    { "label": { "zh": "發電機跳脫", "en": "Generator trip" }, "correct": false }
  ],
  "on_success": "reboot_scada_core"
}
```

---

## 5. Quest — 派工單

```ts
interface Quest {
  id: string;
  title: I18n;
  giver: string;              // NPC id（場長 / O&M 經理…）
  brief: I18n;                // 任務描述
  objectives: I18n[];
  target_tower: string;
  weather_window: number;     // 該任務天氣窗回合上限
  reward: { exp: number; budget: number; unlock?: string };
}
```

```json
{
  "id": "quest_gearbox",
  "title": { "zh": "炙熱的變速箱", "en": "Gearbox Inferno" },
  "giver": "npc_site_manager",
  "brief": { "zh": "2 號巨神塔變速箱過熱停機，於天氣窗內完成搶修。",
             "en": "Titan Tower #2 gearbox overheated. Repair within the weather window." },
  "objectives": [
    { "zh": "找到冷卻幫浦開關", "en": "Find the cooling pump switch" },
    { "zh": "擊敗齒輪箱過熱告警", "en": "Defeat the Gearbox Overheat Alarm" }
  ],
  "target_tower": "tower_gearbox",
  "weather_window": 30,
  "reward": { "exp": 100, "budget": 500, "unlock": "skill_cms_foresight" }
}
```

---

## 6. Dialogue — NPC 對話

```ts
interface Dialogue {
  id: string;
  speaker: I18n;             // 說話者名稱
  lines: I18n[];            // 多句對話
  triggers?: string;        // 觸發的 quest / event id
}
```

```json
{
  "id": "dlg_port_intro",
  "speaker": { "zh": "場長", "en": "Site Manager" },
  "lines": [
    { "zh": "見習騎士，亂流氣旋讓三座巨神塔全停了。", "en": "Apprentice, the Turbulence Cyclone halted all three Titan Towers." },
    { "zh": "駕乘風號出海，趁天氣窗修好它們。", "en": "Take the Windrider out and fix them within the weather window." }
  ],
  "triggers": "quest_yaw"
}
```

---

## 7. 命名慣例
- `id` 一律 snake_case、全域唯一。
- 海域：`nearshore` / `europe_northsea` / `asia_monsoon` / `deep_water` / `floating`。
- 塔：`tower_yaw` / `tower_gearbox` / `tower_scada`。
- 前綴：`sop_` / `tool_` / `skill_`（AI）/ `puzzle_` / `quest_` / `dlg_` / `npc_` / `region_` / `week_`。
- 雙語欄位缺一視為驗證錯誤（CI 以 schema 檢查）。

---

## 8. Region — 海域（世界地圖節點）

```ts
type Foundation = "monopile" | "jacket" | "gravity" | "floating";
type Weather = "calm" | "swell" | "ice" | "typhoon" | "current" | "fog";

interface Region {
  id: string;
  name: I18n;
  foundation: Foundation;
  weather: Weather[];         // 該海域可能天氣，影響天氣窗與地形
  difficulty: number;         // 1–5 星
  towers: string[];           // 含的地城 id
  boss: string;               // 區域 Boss fault id
  requires?: string;          // 解鎖所需道具/證照 id
  act: number;                // 所屬劇情幕 1–4
}
```

```json
{
  "id": "asia_monsoon",
  "name": { "zh": "亞洲・季風海域", "en": "Asia Monsoon Sea" },
  "foundation": "jacket",
  "weather": ["typhoon", "swell"],
  "difficulty": 3,
  "towers": ["tower_gearbox"],
  "boss": "fault_typhoon_cascade_local",
  "requires": "permit_typhoon",
  "act": 2
}
```

---

## 9. CourseMap — 課程對照（選用層）

把知識點分組成週次，開啟「課程模式」時按週解鎖。不影響遊戲本體。

```ts
interface CourseWeek {
  title: I18n;
  unlock_region: string;        // 該週解鎖的海域 id
  knowledge_points: string[];   // 對應 Fault/Puzzle 的 knowledge_point
}
type CourseMap = Record<string, CourseWeek>;  // key 如 "week_07"
```

```json
{
  "week_07": {
    "title": { "zh": "振動診斷", "en": "Vibration Diagnostics" },
    "unlock_region": "europe_northsea",
    "knowledge_points": ["vibration_fft", "bearing_bpfi"]
  }
}
```

---

## 10. Pack — 內容資料片（manifest）

每個資料片是 `content/packs/<id>/` 資料夾，根目錄放 `manifest.json`，其餘檔案（regions/faults/sops/puzzles/quests/dialogues/maps）同前述 schema。PackLoader 啟動時依 `requires` 排序合併並驗證跨 pack 參照。

```ts
interface PackManifest {
  id: string;                 // 如 pack_nearshore
  name: I18n;
  version: string;            // semver，如 "1.0.0"
  act: number;                // 所屬劇情幕
  requires: string[];         // 依賴的前置 pack id（劇情鏈）
  provides: string[];         // 解鎖的資源，如 "region:nearshore"
  entry_quest: string;        // 進入此片的起始 quest id
  files: string[];            // 此片包含的內容檔
}
```

```json
{
  "id": "pack_nearshore",
  "name": { "zh": "序章・近岸示範", "en": "Prologue: Nearshore" },
  "version": "1.0.0",
  "act": 1,
  "requires": [],
  "provides": ["region:nearshore"],
  "entry_quest": "quest_yaw",
  "files": ["regions.json", "faults.json", "sops.json", "puzzles.json", "quests.json", "dialogues.json"]
}
```

> 新增劇情 = 新增一個 pack 資料夾，不需改程式碼。可用於官方續章、課程專屬關卡，或學生自製 pack 作業。
