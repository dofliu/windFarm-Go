import type { I18n } from "../game/systems/types";

// 人物註冊表：id → 名稱/職稱。立繪檔在 public/assets/characters/<id>/portrait.png
export interface Character {
  id: string;
  name: I18n;
  role: I18n;
}

export const CHARACTERS: Record<string, Character> = {
  repair_eng: { id: "repair_eng", name: { zh: "維修工程師", en: "Maintenance Eng." }, role: { zh: "機械維修", en: "Mechanical" } },
  safety_officer: { id: "safety_officer", name: { zh: "工安官", en: "Safety Officer" }, role: { zh: "職業安全衛生", en: "HSE" } },
  elec_eng: { id: "elec_eng", name: { zh: "電氣工程師", en: "Electrical Eng." }, role: { zh: "電氣系統", en: "Electrical" } },
  scada_eng: { id: "scada_eng", name: { zh: "監控工程師", en: "SCADA Eng." }, role: { zh: "監控數據", en: "Monitoring" } },
  manager: { id: "manager", name: { zh: "風場經理", en: "Farm Manager" }, role: { zh: "現場調度", en: "Operations" } },
  owner: { id: "owner", name: { zh: "風場老闆", en: "Farm Owner" }, role: { zh: "業主", en: "Owner" } },
  veteran_sailor: { id: "veteran_sailor", name: { zh: "資深技師", en: "Veteran Tech." }, role: { zh: "海上作業", en: "Offshore" } },
  captain: { id: "captain", name: { zh: "CTV 船長", en: "CTV Captain" }, role: { zh: "運維船", en: "Vessel" } },
  rival_operator: { id: "rival_operator", name: { zh: "競爭運維商", en: "Rival Operator" }, role: { zh: "對手", en: "Rival" } },
  narrator_girl: { id: "narrator_girl", name: { zh: "莉莉", en: "Lily" }, role: { zh: "見習嚮導", en: "Guide" } },
};

export const portraitUrl = (id: string) => `/assets/characters/${id}/portrait.png`;
export const exprUrl = (id: string, name: string) => `/assets/characters/${id}/expr/${name}.png`;

// 莉莉（解說員）可用表情
export const NARRATOR_EXPR = ["smile", "happy", "surprise", "thinking", "worried", "wink"] as const;
export type NarratorExpr = (typeof NARRATOR_EXPR)[number];
