import { MeshStandardMaterial } from "three";
import { HR_BLUE, HR_CHARCOAL, HR_GREEN, HR_RED, HR_WHITE, HR_YELLOW } from "../engine/constants";
import type { BoxKind } from "./layout";

export function createMaterials(): Record<BoxKind, MeshStandardMaterial> {
  return {
    support: new MeshStandardMaterial({ color: HR_YELLOW }),
    core: new MeshStandardMaterial({ color: HR_BLUE }),
    "core-pullthrough": new MeshStandardMaterial({ color: HR_WHITE }),
    arm: new MeshStandardMaterial({ color: HR_CHARCOAL }),
    foot: new MeshStandardMaterial({ color: HR_RED }),
    panel: new MeshStandardMaterial({ color: HR_GREEN, transparent: true, opacity: 0.6 }),
  };
}
