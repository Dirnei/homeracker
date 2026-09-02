import { MeshStandardMaterial } from "three";
import { HR_BLUE, HR_CHARCOAL, HR_RED, HR_WHITE, HR_YELLOW } from "../engine/constants";

/** Panels read as printed plates: a matte bone white keeps them distinct from the yellow supports and white pull-through cores. */
const PANEL_COLOR = "#d9d6cc";
import type { BoxKind } from "./layout";

export function createMaterials(): Record<BoxKind, MeshStandardMaterial> {
  return {
    support: new MeshStandardMaterial({ color: HR_YELLOW }),
    core: new MeshStandardMaterial({ color: HR_BLUE }),
    "core-pullthrough": new MeshStandardMaterial({ color: HR_WHITE }),
    arm: new MeshStandardMaterial({ color: HR_CHARCOAL }),
    foot: new MeshStandardMaterial({ color: HR_RED }),
    panel: new MeshStandardMaterial({ color: PANEL_COLOR, roughness: 0.75, metalness: 0.02 }),
  };
}
