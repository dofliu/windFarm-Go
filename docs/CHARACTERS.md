# 人物素材交付規格 (Character Asset Spec)

立繪/對話系統的素材清單。**你依此匯出去背 PNG 放進對應資料夾，告知我後我再建 Character/對話/立繪/頭像/側邊告警系統並接圖。**

## 放置位置
```
public/assets/characters/<id>/
├─ portrait.png     # 全身/半身立繪，去背透明，高 ≥ 600px
├─ avatar.png       # 頭部裁切，正方形去背，≥ 128×128（對話框頭像，圓/方由 CSS 處理）
└─ expr/            # （選用）表情變化，臉部裁切去背
   ├─ neutral.png
   ├─ smile.png
   ├─ surprise.png
   └─ ...
```
- 格式：PNG，**透明背景**（合圖直接切會留底，務必先去背）。
- 立繪建議直幅、人物置中、邊緣留少量透明邊。
- 表情：目前只有「説明人物」需要（弗雷特、莉莉…），其餘角色有 portrait + avatar 即可。

## 角色清單與用途對應

### 說明人物（中下方對話引導，需表情集）
| id | 名稱 zh / en | 角色定位 | 用途 |
|---|---|---|---|
| `fret_pelo` | 弗雷特·佩洛 / Fret Pelo | 艦隊指揮・母港引導 | 主線教學旁白 |
| `ekaterina` | 艾卡特琳娜 / Ekaterina | 領航・海圖顧問 | 出海/航線提示 |
| `davincio` | 達文西歐·貝爾 / Davincio Bell | 技術總監・知識庫 | 隨堂測驗出題人、Wind-RAG 擬人 |
| `lily` | 莉莉·波特 / Lily Porter | 見習夥伴 | 新手引導、陪玩成長 |

### 側邊跳出顧問（speech bubble，維修/出海即時告警）
| id | 名稱 zh / en | 用途 |
|---|---|---|
| `repair_eng` | 維修工程師 / Maintenance Engineer | 維修作業：機械告警「主機異常震動」 |
| `elec_eng` | 電氣工程師 / Electrical Engineer | 維修/SCADA：電氣告警「風速超出安全範圍」 |
| `veteran_sailor` | 老練水手 / Veteran Technician | 出海航行：海象/事件提示 |

### 主要角色（大航海原型 → 離岸 O&M 對應）
| id | 名稱 zh / en | O&M 對應 | 用途 |
|---|---|---|---|
| `captain` | 船長 / Captain | CTV 船長 | 出海航行畫面 |
| `navigator` | 航海士 / Navigator | 領航/航線 | 出海/航線圖 |
| `ship_doctor` | 船醫 / Ship Doctor | HSE 安全官 | 安全窗/LOTO 提示 |
| `cook` | 廚師 / Cook | 後勤補給官 | 補給/船況 |
| `merchant` | 貿易商人 / Merchant | 交易所主管（採購官） | 備品交易所右側立繪槽（392×360） |
| `pirate_boss` | 海盜頭目 / Pirate Captain | 競爭運維商/突發事件 | 對手/天災事件 |

## 各槽位顯示尺寸（供裁切參考）
- 交易所採購官立繪：顯示框 **392 × 360**（portrait 會自適應置中）。
- 側邊跳出立繪：高約 **260–360px**。
- 對話框頭像：圓/方 **40–56px**（用 avatar.png 縮放）。
- 表情切換：沿用 avatar 尺寸或臉部裁切。

## 授權
放入可發表作品前，請確認每張圖**來源乾淨、可商用**（自製或已授權）；若為 AI 生成，留意生成平台的商用條款。
