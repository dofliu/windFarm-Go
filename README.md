# 離岸風場・運維傳說 — Offshore O&M Legend

**English** · [繁體中文](README.zh-TW.md)

An educational, *Uncharted-Waters*-style game that reframes offshore **wind-farm Operations & Maintenance (O&M)** as a seafaring-trade adventure. Sail a CTV out to the wind farm, manage parts and the weather window, climb the turbine, diagnose faults, and learn real O&M knowledge through in-game quizzes.

> Built as a teaching tool by **DOF Lab, National Chin-Yi University of Technology (NCUT)**.

▶ **[Play online](https://dofliu.github.io/windFarm-Go/)**

![Home Port](docs/screenshots/01-hub.png)

## Screens
| | |
|---|---|
| ![Market](docs/screenshots/02-market.png) | ![Sail](docs/screenshots/03-sail.png) |
| **Parts Market** — spare-part prices & trading | **Set Sail** — CTV voyage & vessel status |
| ![Repair](docs/screenshots/04-repair.png) | |
| **Repair** — fault diagnosis quiz + SOP steps | |

## Features
- **Four interconnected screens**: Home Port, Parts Market, Set Sail, Repair.
- **Diagnosis quiz** as the teaching core — SCADA alarm → choose the correct first check → instant feedback.
- **Character / dialogue system** with painterly portraits, speech bubbles and switchable facial expressions.
- **Bilingual (繁中 / English)** — every UI string toggles live.
- **Course Mode** (teacher tool) — assign any week's fault as the next task, or import a custom JSON task on the fly.
- **Procedural Web Audio SFX** with a mute toggle (no audio files).
- **Gold × deep-sea design system**, 1600×900 stage that scales to any viewport.

## Tech stack
React + TypeScript + Vite + Tailwind CSS. UI is pure DOM/CSS (no game engine); art is layered SVG/CSS plus transparent PNG portraits.

## Getting started
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run typecheck
```

## Project structure
```
src/
├─ App.tsx                  # stage + screen routing
├─ ui/
│  ├─ TopBar / SceneBackground / Turbine / Portrait   # shared UI
│  ├─ tokens.ts             # design tokens (colors, panels, fonts)
│  ├─ characters.ts         # character registry
│  ├─ data.ts               # market parts + repair quiz
│  └─ screens/              # Hub / Market / Sail / Repair
├─ game/systems/i18n.ts     # bilingual helper
public/assets/characters/   # portraits + expression sets
docs/                       # GDD, schema, design handoff, character spec
```

## Characters
Ten characters (maintenance / safety / electrical / SCADA engineers, farm manager & owner, veteran tech, CTV captain, rival operator, and the guide girl *Lily*). See [docs/CHARACTERS.md](docs/CHARACTERS.md).

## Roadmap
Work items are tracked in [GitHub Issues](https://github.com/dofliu/windFarm-Go/issues). Highlights: purchase checkout flow, work-order/quest system, narrative dialogue scripting, expression sets for more characters, and docs reconciliation after the UI pivot.

## Credits & License
Code under [MIT](LICENSE). Assets and fonts credited in [CREDITS.md](CREDITS.md).
Author: **劉瑞弘 (Juihung Liu)** · DOF Lab, NCUT · moredof@gmail.com
