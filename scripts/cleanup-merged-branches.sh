#!/usr/bin/env bash
# 一次刪除已驗證「內容皆已在 main」的 43 個歷史開發分支。
#
# 稽核方法(2026-08-30,詳見 docs/ROADMAP.md「專案盤點」):逐分支確認其 tip
# 「是 main 的祖先」或「等於某個已合併 PR 的 head SHA」(倉庫早期 PR 採 squash
# merge,分支 commit SHA 不在 main 歷史上,但內容已全數進 main;全部 120 個 PR
# 均已合併,無被拒絕棄置的 PR)。刪除後各 PR 頁面仍保留完整 commit 紀錄。
#
# 特意「不」刪除:
#   - claude/cloud-first-accounts — 上有一個未合併的部署設定 commit(ff9d2f6:
#     CLOUD_FIRST=true + 教師碼)。要不要讓它進 main 屬部署決策,由專案擁有者
#     決定(見 docs/ROADMAP.md 決策事項);決定後再自行刪除此分支。
set -euo pipefail

git push origin --delete \
  claude/audit-economy-fixes \
  claude/auto-20260729 \
  claude/balance-fault-equilibrium \
  claude/beautiful-thompson-nz0uxo \
  claude/boarding-video \
  claude/bugfix-availability-tests \
  claude/c2-fleet-ops \
  claude/construction-side-campaign \
  claude/daily-ledger \
  claude/docs-progress-update \
  claude/econ-salary-reward-model \
  claude/economy-daily-income \
  claude/economy-rebalance-fire \
  claude/faults-parts-expansion \
  claude/fix-repair-quiz-retry \
  claude/fix-revenue-double-count \
  claude/fleet-downtime-cash \
  claude/fleet-sortie-and-fault-rate \
  claude/hub-collapsible-panels \
  claude/login-pin-accounts \
  claude/micro-weather-forecast-s1glxo \
  claude/multi-vessel-fleet \
  claude/om-econ-fleet-parts \
  claude/om-econ-salary-weather \
  claude/onboarding-tutorial-and-docs \
  claude/ops-center-tasks-expansion \
  claude/phase-a-route-map-remote-check \
  claude/phase-b-time-and-randomness \
  claude/phase-c-tuning-economy \
  claude/phase-c1-fleet-ops \
  claude/realism-storage-scada-fatigue \
  claude/records-achievements \
  claude/repair-persist-multiday \
  claude/repair-persist-reland \
  claude/review-and-more-tests \
  claude/scene-assets-spec \
  claude/scene-media-batch2 \
  claude/screen-loading-after-update-1wnuss \
  claude/tests-and-ci \
  claude/tutorial-fix-and-advisor \
  claude/walkthrough-refresh \
  claude/wind-farm-game-dev-ik3kt7 \
  claude/wire-scene-media

echo "✓ 43 個已合併分支已刪除。保留:main、claude/cloud-first-accounts(待決策)。"
