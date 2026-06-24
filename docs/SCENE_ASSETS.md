# 場景影片／情境圖 — 製作規格與提示詞（Scene Assets Spec）

> 目的:延續既有「登塔影片」(`public/assets/scenes/boarding.mp4` + poster `real_boarding.jpg`)的**寫實照片風**,
> 在更多事件觸發點加入短影片或情境圖,提升沉浸感。本文列出**觸發點 → 建議媒材 → 確切檔名 → AI 提示詞**。
> 產好後請依檔名放進 `public/assets/scenes/`,再交給開發者接上對應觸發。

---

## 0. 通用規格(務必統一,才會跟登塔影片同一風格)

**影片**
- 解析度 **1920×1080(16:9)**;遊戲舞台 1600×900,影片以 `object-fit: cover` 滿版鋪底(同登塔)。
- 長度 **6–12 秒、可無縫循環(seamless loop)**;靜音;H.264 MP4;單檔盡量 **< 5 MB**(自動播放要輕)。
- 每支影片附一張 **poster 首幀 JPG**(載入瞬間先顯示,不黑屏)。

**情境圖(事件卡用)**
- **16:9,約 1280×720 JPG**;單張戲劇性定格。

**風格錨點(每則提示詞前面都建議貼這段)**
```
Cinematic photorealistic offshore wind farm operations & maintenance.
North-Sea / Taiwan-Strait offshore wind setting. Realistic maritime color grading,
natural overcast or golden-hour light, documentary cinematography, subtle handheld motion,
shallow depth of field. Crew in orange/red PPE and helmets (faces not shown in close-up).
Industrial realism — wet metal, sea spray, rivets, cables. 16:9, no on-screen text,
no logos, no watermark. Match the grounded realistic tone of the existing "boarding" clip.
```
> 影片再加:`seamless loop, smooth slow camera move`。情境圖把它換成:`a single dramatic still frame`。
> 想做漫畫模式(comic 家族)版本可後續再說;先把 **real 家族**補齊,跟登塔影片同調。

---

## 1. 已完成
| 觸發點 | 檔案 |
|---|---|
| 登塔(維修畫面尚未登塔時) | `boarding.mp4` + `real_boarding.jpg` ✅ |

---

## 2. Tier 1 — 最高優先(明確事件、衝擊大)

### 2.1 出海航行(enroute)
- **觸發**:`SailScreen`,`jobPhase === "enroute"`(目前是 CSS 船+航線圖)。
- **媒材**:影片 → `sailing.mp4` + `real_sailing.jpg`
- **提示詞**:`…a crew transfer vessel (CTV) powering across open sea toward an offshore wind farm on the horizon, white bow spray and foaming wake, turbines faint in misty distance, low camera near the waterline, strong sense of forward motion, morning haze. seamless loop.`

### 2.2 大修吊裝(overhaul)
- **觸發**:大修進行中(`HubScreen` 大修面板 / `ADVANCE_OVERHAUL`;`SailScreen` overhaul 狀態)。
- **媒材**:影片 → `overhaul.mp4` + `real_overhaul.jpg`
- **提示詞**:`…a jack-up installation vessel with a tall crane slowly lifting a large nacelle/major component beside an offshore wind turbine, legs planted on the seabed, calm grey sea, heavy-lift marine operation, sense of scale and tension, overcast sky. slow seamless loop.`

### 2.3 風暴 · 停航(storm)
- **觸發**:`seaState === "closed"`、或三日預報含風暴、或天氣類事件。
- **媒材**:影片 → `storm.mp4`(poster 可用既有 `real_storm.jpg`)
- **提示詞**:`…violent storm over an offshore wind farm, towering grey waves and driving rain, turbine blades feathered and stopped, dark dramatic clouds, sea spray, no vessels at sea — operations suspended, foreboding mood. seamless loop.`

### 2.4 維修作業場景 ×4(依故障地點)
- **觸發**:`RepairScreen` 登塔後,`RepairScene` 依 `locationOf(fault)` 顯示(目前 CSS 繪製)。可用影片/圖**滿版鋪底**(接上時我會調版面)。
- **媒材**:影片(或情境圖)四支:

| 地點 | 檔名 | 提示詞重點 |
|---|---|---|
| 機艙 nacelle | `repair_nacelle.mp4` | `interior of a wind-turbine nacelle, technician in PPE inspecting the gearbox and generator, tight machine room, cabling, work-light beams, oil sheen on metal, focused maintenance, claustrophobic industrial.` |
| 塔架 tower | `repair_tower.mp4` | `inside a wind-turbine tower, technician climbing the central ladder past ring stiffeners and cable runs, vertical perspective, work-light glow from above, height and confinement.` |
| 輪轂 hub | `repair_hub.mp4` | `inside the rotor hub of a wind turbine, technician servicing the pitch bearing, curved enclosure, hydraulic accumulators, blade-root opening, very tight access, industrial detail.` |
| 甲板 deck | `repair_deck.mp4` | `yellow transition-piece platform at the base of an offshore wind turbine, technician on the railed deck by the boat-landing ladder, sea below, salt-streaked steel, overcast coastal light.` |
> 每支附 poster:`real_repair_nacelle.jpg` …以此類推。若先做圖片版,改成 `.jpg` 同名即可。

---

## 3. Tier 2 — 中優先(關鍵動作的氛圍)

| 觸發點 | 觸發位置 | 媒材/檔名 | 提示詞重點 |
|---|---|---|---|
| 遠端巡檢 / SCADA | `REMOTE_CHECK` | `scada.mp4` + `real_scada.jpg` | `onshore SCADA control room, large monitoring screens of wind-farm telemetry and turbine status, engineer at the desk, blue screen glow, calm focused monitoring.` |
| 靠港休整 / 母港 | `REST`、母港背景 | `harbor.mp4` + `real_harbor.jpg` | `offshore-wind O&M base harbor at dawn, CTVs moored at the quay, calm water, cranes and warehouses, gentle reflections, a quiet restful morning.` |
| 船舶保養 / 整備廠 | `SERVICE_VESSEL`(CTV 整備廠) | `drydock.mp4` + `real_drydock.jpg` | `a crew transfer vessel in a maintenance yard / dry dock, hull being serviced, pressure-washing spray, marine engineering workshop, industrial.` |
| 完工併網 · 成功 | 一般工單 `FINISH_REPAIR` 完成 | `restored.mp4` + `real_restored.jpg` | `an offshore wind turbine spinning smoothly again at golden hour, healthy rotation, sun flare, power restored, optimistic and triumphant.` |
| 撤離 / 安全近失 | `FAIL_REPAIR`(返航改期/作業窗關閉) | `retreat.mp4`(或共用 storm) | `a CTV turning back from an offshore turbine as the swell builds, aborted approach, rough churning grey water, tense maritime-safety moment.` |

---

## 4. Tier 3 — 突發事件情境圖(events.ts,目前只有文字快顯)

> 小張情境圖,顯示在事件快顯/卡片。檔名 `event_<id>.jpg`(16:9,~1280×720,單張定格)。

| 事件 id | 中文 | 提示詞重點 |
|---|---|---|
| `crew_shortage` | 人員短缺 | `an understaffed offshore crew, a locker room with several missing helmets/PPE, thin shift, muted tone.` |
| `strike` | 技師罷工 | `wind-farm technicians standing idle at the harbor, work stopped, labor-dispute mood, no operations.` |
| `delivery_delay` | 供應商交貨延遲 | `spare-part crates stuck on a foggy port quay, delayed logistics, supply-chain holdup.` |
| `sudden_fault` | 突發設備故障 | `an offshore wind turbine with a flashing red alarm, faint smoke/sparks from the nacelle, sudden failure, alarm mood.` |
| `rival_win` | 競爭搶單 | `a rival O&M vessel taking over a contract on a grey sea, lost-bid mood (brand-neutral).` |
| `firmware_push` | 原廠韌體更新(好) | `a turbine receiving an OEM firmware update, soft glowing data/connectivity over the nacelle, all-green status, positive tech upgrade.` |
| `calm_spell` | 風平浪靜(好) | `a calm sunny day over the wind farm, glassy sea, smooth operations, bright optimistic weather.` |
| `overhaul`(事件) | 定期大修 | 共用 Tier 1 的 `overhaul` 影片/定格即可。 |

---

## 5. 戰役過場(可選 · Tier 3+)
主線 7 關(`campaign.ts`)的幕間關鍵時刻(如「跨場共用韌體缺陷真相」、終章核心機組搶修)可做 1–2 張過場大圖,
但這比較吃美術指導,建議等上面補齊後再評估。

---

## 命名與整合約定
- 影片:`<key>.mp4`;poster:`real_<key>.jpg`(同登塔慣例)。事件圖:`event_<id>.jpg`。
- 全部放 `public/assets/scenes/`。
- 交付後告知開發者,會把對應觸發點接上(載入失敗時自動回退到現有 CSS/圖,確保不破畫面)。
