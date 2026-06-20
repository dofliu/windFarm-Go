# 風電勇者：離岸守護者 — 遊戲設計文件 (GDD)
**Wind Knights: Offshore Guardians — Game Design Document**

> ⚠️ **歷史文件 / 已轉向**：本 GDD 記錄的是早期「勇者鬥惡龍式 2D 走格子 + Phaser」概念。
> 專案已轉向《大航海時代》式的 **React UI 四畫面**（母港／交易所／出海／維修），實作以
> [README](../README.md) 與 `src/` 為準。世界觀、角色、運維知識與維修測驗等設計仍沿用；
> 但 tile 地圖、回合戰鬥、資料片(pack) 等機制已不採用。保留此文件作為設計演進紀錄。

| 項目 | 內容 |
|---|---|
| 版本 | v0.1（世界觀定稿） |
| 作者 | 劉瑞弘 Juihung Liu（NCUT 智慧自動化工程系 / DOF Lab） |
| 類型 | Tile-based RPG（復刻勇者鬥惡龍風格） |
| 視角/模式 | 2D 俯視 (top-down) · 單人 (single-player) |
| 平台 | Web — React + Phaser 3 |
| 語言 | 中英雙語（繁中為主，所有可見文字皆 zh/en 雙欄） |
| 用途 | 完整可發表作品 + 離岸風電運維教學 |
| 美術 | 16-bit pixel tileset（Kenney CC0 等可商用素材） |

> 本文件為開發與內容擴充的**單一真實來源 (single source of truth)**。所有故障、SOP、謎題、對話、關卡皆以 `content/*.json` 資料驅動，新增課程內容不需修改程式碼。

---

## 1. 核心概念 (High Concept)

把傳統 RPG 的「劍與魔法」轉化為「**工程工具與 AI 診斷演算法**」。玩家扮演見習風電騎士，駕駛運維船深入離岸風機陣列迷宮，逐塔修復風機次系統，最終擊敗導致全場停機的「串聯故障」。

**一句話**：用扭力扳手與 AI 演算法，在天氣窗關閉前修好巨神塔。

---

## 2. 世界觀與劇情 (Setting & Story)

### 2.1 背景
在 **艾利歐王國 (Aero Kingdom)**，國家繁榮仰賴怒濤海域上的 **巨神兵 (Titan Turbines)**（離岸風機）。一場名為 **亂流氣旋 (Turbulence Cyclone)** 的暗黑風暴席捲海域，巨神兵紛紛停機，國家陷入能源危機。

### 2.2 主角與目標
- **身分**：剛完成 GWO 受訓的 **見習風電騎士 (Apprentice Wind Knight)**。
- **載具**：運維船 **乘風號 (SV Windrider)**。
- **最終目標**：深入離岸陣列迷宮，修復三座關鍵 **巨神塔 (Titan Towers)**，找出並擊敗最終 Boss——**串聯故障 The Cascade**（Error 500：系統核心崩潰）。

### 2.3 世界結構（World Map → Region → Tower）
復刻勇者鬥惡龍的「世界地圖串多城多迷宮」結構。世界地圖上有多片**海域 (Region)**，每片海域 = 一個運維母港城鎮 + 多座風機地城 (Tower) + 一場區域 Boss；以「關鍵道具/證照」解鎖下一片海域（如 DQ 取得船隻才能渡海）。

詳見 §5 區域設計與 §11 四幕劇情。航行途中以無人機探知術巡檢，會遭遇**葉片裂縫野外怪 (Blade Field Encounters)**，不另開塔，維持節奏。

---

## 3. 角色裝備與「魔法」系統 (Equipment & "Magic")

### 3.1 物理武器（維修工具）— 消耗回合
| 階段 | 武器 | 效果 |
|---|---|---|
| 初期 | 基礎扭力扳手 Torque Wrench | 物理修復 +10 |
| 中期 | 高階萬用電表 Multimeter | 看穿「電氣」屬性弱點 |
| 神裝 | 液壓扳手 + 對心儀 Hydraulic Wrench + Alignment Tool | 高階物理修復 |

### 3.2 AI 魔法技能 — 消耗 MP（⚡電力）
| 技能 | 對應技術 | 效果 |
|---|---|---|
| 探知術 Scout | InduSpect 視覺巡檢 | 召喚無人機開迷宮戰爭迷霧、標記葉片裂縫怪 |
| 預測防禦 Foresight | 狀態監測 CMS | 提前感知下一房間怪物屬性（震動/高溫…） |
| 終極禁咒 Oracle | Wind-RAG 知識檢索 | 對未知高階 Boss 召喚正解，造成巨大破壞 |

> **終極禁咒 (Wind-RAG) 平衡設計**：非萬能解。需滿足三條件才能詠唱——
> 1. 先在迷宮蒐集 **維修手冊碎片 (Manual Fragments)** 作為詠唱素材（= 知識庫，沒有知識就檢索不到）；
> 2. 高 MP 消耗；
> 3. 每場戰鬥限用次數。
> 設計意圖：讓 RAG 成為「探索的獎勵」而非「無腦輸出」，並暗合 RAG 真實運作邏輯。

---

## 4. 戰鬥系統 — 混合型 (Combat: Hybrid)

每場「故障排除」= **回合制外殼 + 知識判斷決勝**。

### 4.1 三資源系統
| 資源 | 遊戲意義 | 運維意義 |
|---|---|---|
| ❤️ HP | 騎士安全/體力 | 高溫地板、墜落、電擊扣 HP（對應 GWO 安全） |
| ⚡ MP（電力） | 施放 AI 技能的能量 | 無人機/CMS/RAG 都吃電，逼玩家管理能耗 |
| ☁️ 天氣窗 (Weather Window) | 全任務回合上限 | 海象惡化＝強制撤離，運維最真實的壓力 |

→ 物理武器消耗回合、AI 魔法消耗 MP、整場任務受天氣窗限制。三條資源各管一層。

### 4.2 故障怪物 (Fault Monsters)
- 屬性：HP（嚴重度 severity）、類別（機械/電氣/結構/控制）、隱藏 **真因 (root cause)**。
- 每回合玩家從「診斷/維修指令」選擇：
  1. **診斷工具**（振動分析、熱顯像、SCADA 趨勢）→ 揭露線索、命中弱點。
  2. 判定真因後執行 **對應 SOP** → 高傷害（修復進度大增）。
  3. 選錯 → 傷害微弱 + 天氣窗扣更多（懲罰來自真實成本，不是扣血）。
- 勝利條件：修復進度 100% 且在天氣窗內 → 獲 GWO 經驗、預算、解鎖新工具。

### 4.3 維修報告 After-Action Report（教學核心）
每場戰鬥結束彈出維修報告：
- 顯示**真因**與正確 SOP 流程；
- 標記玩家用對/用錯的步驟；
- 答錯不只是扣天氣窗，而是「學到為什麼錯」。
→ 這是本作作為**教育科技作品**的關鍵差異化。

---

## 5. 關卡設計 (Level Design)

### 5.1 區域設計（風場特性 × 天氣型態 = 天然關卡差異）
每片海域有獨特的基礎型式與天氣機制，**同一套戰鬥/謎題機制即能生出大量關卡變化**。

| 區域 Region | 原型 | 基礎型式 | 天氣機制 | 難度 | 解鎖道具 |
|---|---|---|---|---|---|
| 序章・近岸示範風場 Nearshore | 北海近岸 | 固定式單樁 monopile | 平穩（教學） | ★ | — |
| 歐洲・北海遠征 Europe North Sea | 北海/波羅的海 | 固定式 jacket | 湧浪、冬季結冰 | ★★ | CTV 通行證 |
| 亞洲・季風海域 Asia Monsoon | 台灣海峽 | 固定式 + 強風剪 | 颱風（天氣窗極短） | ★★★ | 颱風航行許可 |
| 深海・離岸深水區 Deep Water | 大水深 | 套管/重力式 | 強潮流、能見度低 | ★★★★ | SOV 母船 |
| 終章・浮動式風場 Floating | 浮式 floating | 浮動平台 + 係泊 | 平台搖晃、動態定位 | ★★★★★ | 係泊監測權限 |

天氣型態（霧、湧浪、結冰、颱風）直接改變天氣窗長度與地城地形/視野。浮動式放終局有真實依據——運維最難（係泊監測、動態補償）。

### 5.2 招牌地城（三塔，分布於不同區域）
**第一塔・偏航之謎 Yaw System Maze**（近岸/歐洲）
- 目標：解除風機無法迎風的詛咒。
- 特色：迷宮不時旋轉，需找到正確「偏航煞車釋放點」才能前進。
- 怪物：卡死的齒輪怪、失效的風速計妖精。

**第二塔・炙熱的變速箱 Gearbox Inferno**（亞洲季風）
- 目標：冷卻過熱系統、更換被污染潤滑油。
- 特色：地板高溫（每步扣 HP），需先找到「冷卻幫浦」開關。
- 怪物：金屬磨耗史萊姆（高防禦，需特定油品破防）、軸承碎裂獸。

**第三塔・大腦的叛變 SCADA Control Room**（終章前哨）
- 目標：重啟主控電腦、清除錯誤代碼。
- 特色：數位訊號迷宮，傳送陣眾多，走錯傳回原點。
- Boss：巨大的「Error 500：系統核心崩潰」。

### 5.3 野外遭遇：葉片裂縫 Blade Field Encounters
- 航行途中以無人機探知術巡檢，遭遇葉片表面裂縫怪（不另開塔，維持節奏）。

---

## 6. 專業謎題引擎 (Puzzle Engine)

三類謎題抽象成**可重用、資料驅動的題型模板**，日後加課程內容只需填 JSON。

### 6.1 DataReading — 數據判讀
- 範例：**頻譜迷宮**。三扇門各顯示一張 FFT 頻譜圖，提示「只有平穩的心跳才能通往安全」。
- 解法：識別帶有 **軸承內環故障特徵頻率 (BPFI)** 突波的危險門，選正常頻譜門通過。

### 6.2 CalcInput — 計算解鎖
- 範例：**葉尖速比的試煉**。守衛給 `v = 10 m/s`、`R = 80 m`、`ω = 0.85 rad/s`。
- 解法：`λ = ωR / v = 0.85 × 80 / 10 = 6.8`，輸入 6.8 解鎖變槳控制系統。

### 6.3 LogicReasoning — 因果推理
- 範例：**SCADA 警報日誌推理**。殘缺日誌：
  - 10:01 液壓系統壓力下降
  - 10:02 [模糊]
  - 10:03 轉子超速警報、緊急停機
- 解法：從道具欄選「變槳無法作動」填入 10:02，成功 Reset 系統。

---

## 7. 技術架構 (Technical Architecture)

```
wind-quest/
├─ index.html
├─ package.json                # Vite + React + TS + Phaser 3
├─ docs/GDD.md                 # 本文件
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                  # 外層 UI（標題、設定、任務日誌、維修報告）
│  ├─ game/
│  │  ├─ PhaserGame.tsx        # React ↔ Phaser 橋接
│  │  ├─ EventBus.ts           # 兩邊事件溝通
│  │  ├─ scenes/
│  │  │  ├─ Boot.ts / Preload.ts
│  │  │  ├─ PortScene.ts       # 運維母港
│  │  │  ├─ FieldScene.ts      # 風場/塔筒地城（tile-based 探索）
│  │  │  └─ BattleScene.ts     # 故障排除戰鬥
│  │  └─ systems/              # combat / weatherWindow / inventory / save / puzzle / i18n
│  └─ content/                 # ★ 資料驅動內容（資料片架構，見 §13）
│     ├─ core/                 # 本體：tools / skills / 全域設定
│     ├─ packs/                # 每個資料片 = 一個 pack（可獨立新增）
│     │  ├─ pack_nearshore/    #   manifest + regions/faults/sops/puzzles/quests/dialogues/maps
│     │  └─ pack_europe_northsea/
│     └─ course_map.json       # 選用課程對照層（跨 pack）
└─ assets/                     # 佔位圖塊 placeholder（之後替換為 Kenney CC0 / 自製像素）
```

**設計原則**：
1. **邏輯與內容分離** — Phaser 只負責呈現與互動，內容全在 JSON。
2. **React 管外框 UI、Phaser 管遊戲畫面**，中間以 `EventBus` 解耦。
3. **i18n** — 所有可見文字走 `{ zh, en }` 結構，UI 可即時切換語言。

---

## 8. 內容資料規格 (Content Schema)

完整 JSON Schema 與範例見 `content/SCHEMA.md`。核心型別摘要：

- **Fault（故障 = 怪物）**：`id, name{zh,en}, category, severity, alarm_code, scada_hint{zh,en}, root_cause, weakness_tool, correct_sop, distractors[]`
- **SOP（標準作業程序）**：`id, name{zh,en}, steps[]{zh,en}, target_fault`
- **Tool（工具/武器）**：`id, name{zh,en}, type, power, reveals_category`
- **Puzzle（謎題）**：`id, type(DataReading|CalcInput|LogicReasoning), prompt{zh,en}, options/answer, hint{zh,en}`
- **Quest / Dialogue / Map**：派工單、NPC 對話、tilemap 參照。

所有面向玩家的文字欄位一律 `{ "zh": "...", "en": "..." }`。

---

## 9. 開發里程碑 (Milestones)

| # | 里程碑 | 範圍 |
|---|---|---|
| M1 | **可玩切片 (Vertical Slice)** | 母港走動 → 進 1 座風機地城 → 觸發 1 場齒輪箱過熱戰鬥 → 維修報告結算。打通 React/Phaser/JSON/EventBus/i18n 全鏈路。 |
| M2 | 核心系統 | 天氣窗、三資源、背包、存檔、AI 魔法（探知/預測/RAG 碎片）。 |
| M3 | 謎題引擎 | 三類題型模板 + 三塔謎題實裝。 |
| M4 | 內容擴充 | 三塔 + Boss + 葉片野外遭遇 + 完整劇情對話。 |
| M5 | 打磨/發表 | 音效、美術替換、平衡調校、雙語校對、Web 部署。 |

---

## 10. 待辦/未決 (Open Items)
- [ ] Kenney 具體 tileset 選型（RPG / Tiny Town / Pixel Platformer 等）。
- [ ] 存檔機制：localStorage vs 匯出檔。
- [x] 課程對應方式 → 採「知識點標籤 + 選用課程對照層」解耦（見 §12）。
- [ ] 音樂授權來源（CC0 chiptune）。

---

## 11. 四幕劇情 (Four-Act Campaign) — 由淺到深

長線劇情避免「打一關就結束」，並埋一條懸疑主線：**為什麼全海域同時出事？**

- **第一幕・入門 (Onboarding)**：近岸示範風場。單一故障、學基礎告警與 SOP，認識母港 NPC 與乘風號。
- **第二幕・遠征 (Expedition)**：解鎖歐洲北海與亞洲季風海域。不同風場特性、複合故障、跨海後勤與天氣窗管理。
- **第三幕・深海 (Abyss)**：深水區。極端潮流、低能見度，謎題加入潮流/能見度變因；首次察覺故障「跨場同步發生」的異常。
- **第四幕・真相 (The Cascade)**：揭露「亂流氣旋」非天災——**串聯故障 The Cascade** 的真兇是**跨場共用的韌體/控制邏輯漏洞 (firmware / control-logic vulnerability)**：一段有缺陷的控制邏輯隨機組更新散布到全海域，在特定海象條件下同時觸發誤動作。前往浮動式風場與 SCADA 核心，以「程式碼層級的除錯」決戰。
  - **紅鯡魚 (red herrings)**：前三幕讓玩家一度懷疑是天氣異常或電網諧波共振，第四幕才揭露真因在控制邏輯——呼應真實工業 OT 場景。
  - **設計連結**：此主線直接呼應作者的 AutoPLC / IEC 61131-3 ST 研究，終局謎題可帶入「找出錯誤邏輯區段」的玩法。

> 懸疑線（追真相）提供持續動機；每片海域引入「新風場型式 + 新天氣 + 新知識點」，確保每關都學到新東西。

---

## 12. 課程對應 (Course Mapping) — 解耦但可掛載

**設計決策**：不把劇情硬綁 18 週課程，避免遊戲節奏被切碎。改用兩層：

1. **知識點標籤 (knowledge_point)**：每個 Fault / Puzzle 在 JSON 標一個知識點 id（如 `vibration_fft`、`tsr`、`pitch_control`）。核心遊戲完全獨立運作。
2. **選用課程對照層 `course_map.json`**：把知識點分組成週次，開啟「課程模式」時按週解鎖區域。平時當獨立遊戲，上課時可對應進度。

```jsonc
// content/course_map.json（選用，不影響遊戲本體）
{
  "week_07": {
    "title": { "zh": "振動診斷", "en": "Vibration Diagnostics" },
    "unlock_region": "europe_northsea",
    "knowledge_points": ["vibration_fft", "bearing_bpfi"]
  }
}
```

→ 兩全其美，也是發表時的教學亮點。

---

## 13. 內容資料片架構 (Content Pack System) — 像資料片一樣擴充

**設計決策**：先做幾個經典關卡，但架構從一開始就支援「之後新增新劇情」，如同 RPG 的**資料片 (expansion pack)**。

### 13.1 結構
- **core/**：遊戲本體不變的部分（工具、AI 技能、全域平衡設定）。
- **packs/**：每個資料片是一個自包含資料夾，含 `manifest.json` 與該片的 regions / faults / sops / puzzles / quests / dialogues / maps。
- 啟動時 **PackLoader** 掃描所有啟用的 pack → 依 `manifest` 解析依賴與順序 → 合併進內容註冊表 (content registry) → schema 驗證 → 解析跨 pack 參照。

### 13.2 一個資料片 = 一段可獨立發布的劇情
- 新增劇情**不必改程式碼**，只要放一個新 pack 資料夾。
- pack 可宣告 `requires`（前置劇情）與 `provides`（解鎖的海域/道具），形成劇情依賴鏈。
- 同一機制可用於：官方續章、課程專屬關卡、甚至讓學生自製 pack 當作業。

### 13.3 經典首發 packs（M1–M4 範圍）
| Pack | 幕 | 內容 |
|---|---|---|
| `pack_nearshore` | 1 | 序章母港 + 偏航塔（教學） |
| `pack_asia_monsoon` | 2 | 季風海域 + 變速箱塔（颱風天氣窗） |
| `pack_scada_core` | 4 | SCADA 室 + The Cascade 韌體除錯決戰 |

> manifest 與 Pack schema 見 `content/SCHEMA.md` §10。

---

## 14. 視覺設計方向 (Visual Direction)

參考兩條經典脈絡，組成三層畫面結構：**勇者鬥惡龍**（迷宮地城）+ **大航海時代**（航海/港口/風向儀表）。後者與離岸風電運維天然契合——乘風號出海、看風向潮流、管補給與天氣窗，本就是運維實況。

### 14.1 三層結構
```
世界海圖（大航海式航行）──進港──> 母港/風場港（城鎮+手繪資訊）──登塔──> 風機地城（DQ 迷宮）──> 戰鬥
```

| 層 | 參考 | 內容 |
|---|---|---|
| 世界海圖 WorldMap | 大航海航行畫面 | 乘風號在海圖航向各風場；側欄 **補給/天氣窗/船員/疲勞**；**風向羅盤**（風向/潮流/航向/速度） |
| 母港/風場港 Port | 大航海港口（城鎮+手繪） | NPC 走動接派工單；進港資訊面板 **裝置容量/可及性/天氣特性**（對應發展度/特產品） |
| 風機地城 Field | 勇者鬥惡龍迷宮 | tile 迷宮；寶箱=備品/手冊碎片、火焰=高溫區、水=積水、傳送點=樓層連接 |

### 14.2 機制與畫面合一：風向羅盤 = 天氣窗
航海儀表（風向/潮流/海象）直接連動「天氣窗」教學核心——海象惡化則登塔受限、天氣窗縮短。把抽象的運維壓力變成可視可玩的儀表，是本作視覺與教學的關鍵賣點。

### 14.3 美術資產來源
- **基礎**：Kenney CC0（tile、船、海、UI）。
- **儀表/側欄**：canvas/SVG 程式繪製（羅盤、資源條），可先佔位後換皮。
- **手繪港景**（大航海式進港畫面）：以 `openai-image` 生像素/手繪風，列為**進階打磨**，不擋進度。
- 原則：結構與 UI 範式先用佔位資產做出形，美術漸進替換。
