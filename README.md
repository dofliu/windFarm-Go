# 離岸風場・運維傳說 — Offshore O&M Legend

**English** · [繁體中文](README.zh-TW.md)

An educational, *Uncharted-Waters*-style game that reframes offshore **wind-farm Operations & Maintenance (O&M)** as a seafaring-trade adventure. Sail a CTV out to the wind farm, manage parts and the weather window, climb the turbine, diagnose faults, and learn real O&M knowledge through in-game quizzes — while running a live fleet whose **electricity revenue and availability are driven by how well you keep the turbines turning**.

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

## Key features

### Gameplay loop
- **One full work-order loop**: accept order → buy parts → mobilization-readiness check → sail out → board the tower → SCADA diagnosis quiz → SOP steps → finish / multi-day overhaul.
- **Mobilization gate** — no teleporting: repair is locked until you've assigned a vessel, a matching-discipline engineer, the required part in stock and a weather window, then sailed out (travel time + boarding delay in rough seas).
- **Two-layer design** — a graded **7-mission campaign** (teacher opens it week by week) plus an always-open **Ops Center sandbox** that streams endless judgment situations and feeds the leaderboard, with a standalone **Exam Mode** on top for formal assessment.
- **Live Fleet Ops room** — every farm has **24 individual turbines**; dispatch engineers to parallel work orders, remote-reset soft faults, and run preventive inspections in real time. **Crew shortage / strike events bite for real**: a manpower shortfall cuts how many on-site work fronts you can run in parallel (not just a HUD number), recovering as the crew rests.
- **First-time interactive onboarding tutorial** — the assistant **Lily** runs a hand-holding, mobile-game-style coach-mark walkthrough (spotlight the relevant button, dim the rest) through one complete work-order loop. Skippable, and replayable from the settings (⚙) menu.

### Decision support & learning loop
- **Job estimate vs. weather window** — before departure, see the estimated hours for transit / boarding / inspection / repair against the allowed work window, plus a computed safety margin (ample / tight / short) and reminders about vessel wear, crew fatigue, and whether to wait for a better forecast day. Advisory only — the player decides.
- **Prudent return with progress carry** — if a repair is going badly mid-window, choose to keep working, **rush it** (finish remaining steps at half the time cost but a 25% chance of a safety incident), or **return to port and re-plan**: no safety penalty, and completed diagnosis/SOP steps are preserved for the next trip. Forced retreat (window closes) still wipes progress and logs an incident — rewarding "know when to fold."
- **Debrief & answer streaks** — each finished job gets a star rating plus a one-line takeaway; correct first-try diagnoses build a streak with a growing (capped) XP bonus.
- **Active-recall mistake log** — reviewing a past mistake starts with a hidden-answer self-test before revealing the correct answer and lesson, reinforcing retention over passive reading.
- **Accessibility** — a `prefers-reduced-motion`-aware toggle (also settable in-game) swaps autoplaying scene video for static stills and disables non-essential animation; sea-state and fault indicators use icon **and** color, not color alone.

### Economy system
- **Electricity revenue & availability share one source of truth**: the Fleet Ops `fleetUptime` (the actual share of turbines turning). Faulted / under-repair units don't generate — leaving units down directly costs you money.
- **Quarterly SLA contract** — each quarter is 90 days; if average availability falls below 90% you pay a penalty.
- **OPEX you must balance**: engineer payroll, storage upkeep & spoilage, downtime loss, jack-up standby (demurrage) and SLA penalties — against electricity sales, work-order rewards and per-unit fix bonuses.
- **Composite performance score** = net generation + availability×5 + missions×30 − safety×20 + farms×10 − SLA breaches×25 + Fleet-Ops fixes×8 − cumulative downtime loss×0.3.
- **Multi-farm expansion** (4 farms, 24 units each), engineer fatigue, vessel wear & servicing, parts lead-time / storage spoilage, random events, a 3-day micro-weather forecast, and multi-turn overhauls.

### Teaching design
- **Fault-diagnosis quiz + SOP** is the learning core: each fault is a SCADA alarm → 4-choice "what to check FIRST" quiz → 5-step SOP (first two pre-done: confirm weather window, LOTO lock-out).
- **192-template judgment-task engine** across 7 categories (corrective / predictive / preventive / operational / weather / logistics / incident), most with trade-off choices, teaching feedback, and aid charts (trend / spectrum / radar).
- **Exam Mode** — a standalone, no-hint, single-attempt assessment that draws a balanced cross-category set (10 or 20 questions), grades A–F with a per-category breakdown and a miss-review, and feeds knowledge-point mastery & the mistake log **without** touching your game score.
- **Codex** of cleared faults for revision, **Course Mode** for teachers (assign a week's fault, lock graded missions by week), knowledge-point tagging, and a **cloud class leaderboard** (free, no backend) via a Google Apps Script Web App with server-side validation; nickname + class-code login, per-user save isolation.
- **Instructor panel & mastery drill-down** — with a class + teacher code, read the whole class's latest progress (score / days / availability / generation), export CSV, and **click any student to drill into per-discipline / per-category accuracy** synced from the cloud (backend v2.2+).
- **Knowledge-point mastery & active-recall mistake log**, plus a per-discipline ability radar on the profile page.
- **Bilingual (繁中 / English)**, character/dialogue system, procedural Web Audio SFX/BGM.

### Technical
- **Three background modes** — Simulation (animated CSS), Realistic (photos) and Comic (Uncharted-Waters illustrations); plus a 60° **aerial farm view**; turbines, vessels & substation rendered per scene on a 1600×900 scaling stage. In Realistic / Comic mode the **home-port build-out overlays a real harbour photo**, turning your upgrades into visible growth against a real backdrop.
- **PWA** (installable / offline), a mobile portrait layout, and a boot safety-net that prevents blank screens after an update. Pure DOM/CSS UI (no game engine); art is layered SVG/CSS plus transparent PNG portraits.

## Tech stack
React 18 + TypeScript + Vite 6 + Tailwind CSS. Game state is a pure reducer (`src/state/game.ts`); persistence via localStorage with optional cloud save.

## Getting started
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run typecheck  # tsc --noEmit
npm test           # dependency-free game-logic tests (test/run.mjs) — 164 passing
npm run sim        # balance simulator: passive / active / full-crew strategies (test/sim.mjs)
npm run stress     # concurrency/load simulation for the cloud leaderboard backend (test/stress.mjs)
```
CI (`.github/workflows/ci.yml`) runs `typecheck` + `test` + `build` on every PR to `main`.

## Project structure
```
src/
├─ App.tsx                       # stage + screen routing
├─ state/
│  ├─ game.ts                    # core reducer: economy, SLA, fleet, scoring
│  ├─ farms.ts                   # 4 farms × 24 units each
│  ├─ events.ts / incidents.ts   # random events & fault catalogue (Fleet Ops)
│  ├─ tasks.ts                   # 192-template judgment-task engine
│  ├─ exam.ts                    # Exam Mode engine (draw / grade, pure & deterministic)
│  ├─ mastery.ts / records.ts    # knowledge-point mastery, achievements & bests
│  └─ profile.ts / course.ts     # login, class code, weekly unlock
├─ ui/
│  ├─ campaign.ts                # 7-mission storyline (4 acts)
│  ├─ faults.ts                  # 25 fault types across 5 disciplines: quiz + SOP + part
│  ├─ data.ts                    # market parts catalogue
│  ├─ screens/                   # Hub / Market / Sail / Repair
│  ├─ FleetOpsModal / OpsCenterModal / ExamModal        # live ops, sandbox, exam
│  ├─ TeacherModal / PortModal / FacilityModal          # instructor drill-down, port build-out
│  └─ IntroRunner / TopBar / Portrait / Forecast        # onboarding, HUD, dialogue, weather
├─ cloud/sheet.ts / cloud/api.ts # Apps Script leaderboard & cloud save / teacher client
public/assets/                   # characters, scenes, audio
docs/                            # design, manual, roadmap, walkthrough
```

## Documentation
- **[Player Manual (zh-TW)](docs/MANUAL.zh-TW.md)** — full how-to-play guide.
- **[Roadmap](docs/ROADMAP.md)** — what's shipped and what's planned.
- **[Game Design (authoritative)](docs/GAME_DESIGN.md)** — the mobilization-gated O&M loop, economy, KPIs, realism systems.
- **[Walkthrough / Teaching Guide](docs/WALKTHROUGH.md)** — campaign walkthrough and suggested course rubric.
- **[Characters](docs/CHARACTERS.md)** · **[Leaderboard Setup](docs/LEADERBOARD_SETUP.md)** · historical concept: [GDD.md](docs/GDD.md).

## Roadmap
See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the forward plan. Day-to-day work items are tracked in [GitHub Issues](https://github.com/dofliu/windFarm-Go/issues).

## Credits & License
Code under [MIT](LICENSE). Assets and fonts credited in [CREDITS.md](CREDITS.md).
Author: **劉瑞弘 (Juihung Liu)** · DOF Lab, NCUT · moredof@gmail.com
