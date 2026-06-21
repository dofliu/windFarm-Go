import type { Discipline, Engineer } from "../state/game";
import type { I18n } from "../game/systems/types";

// 技師科別標籤與比對（#27）
export const DISC: Record<Discipline, I18n> = {
  mechanical: { zh: "機械", en: "Mechanical" },
  electrical: { zh: "電氣", en: "Electrical" },
  control: { zh: "控制", en: "Control" },
  structural: { zh: "結構", en: "Structural" },
  hse: { zh: "工安", en: "HSE" },
};

export const hasEngineer = (engs: Engineer[], d: Discipline, lvl = 1) => engs.some((e) => e.discipline === d && e.level >= lvl);
