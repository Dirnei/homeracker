import { faceBays, latticeCoords } from "./lattice";
import type { Dir, Face, RackConfig, RackPanel, Vec3 } from "./types";

/**
 * Panel units for a bay bounded by supports of `length` x `height` units.
 * models/panel/lib/panel.scad: inter-fit width = units_x * BASE_UNIT - (2 * BASE_STRENGTH + TOLERANCE),
 * i.e. a panel drops into an opening of exactly units_x units. Verify once against a real render.
 */
export function panelSize(length: number, height: number): { unitsX: number; unitsY: number } {
  return { unitsX: length, unitsY: height };
}

/**
 * Lock pins to fasten a panel: one per mount-plate hole (units - 2 per edge, only when > 2),
 * plus four extended pins for corner mounts when a side is 3 units or shorter
 * (models/panel/README.md, "When to use corner mounts").
 */
export function panelPins(length: number, height: number): { standard: number; extended: number } {
  const standard = 2 * Math.max(length - 2, 0) + 2 * Math.max(height - 2, 0);
  const extended = Math.min(length, height) <= 3 ? 4 : 0;
  return { standard, extended };
}

const NORMALS: Record<Face, Dir> = { front: "-y", back: "+y", left: "-x", right: "+x", top: "+z", bottom: "-z" };

export function buildPanels(config: RackConfig): RackPanel[] {
  const { xs, ys, zs } = latticeCoords(config);
  const maxX = xs.at(-1) ?? 0;
  const maxY = ys.at(-1) ?? 0;
  const maxZ = zs.at(-1) ?? 0;
  const panels: RackPanel[] = [];
  for (const face of Object.keys(NORMALS) as Face[]) {
    const type = config.panels[face];
    if (!type) continue;
    faceBays(config, face).forEach((bay, i) => {
      const z0 = zs[i] ?? 0;
      const origins: Record<Face, Vec3> = {
        front: [0, 0, z0],
        back: [0, maxY, z0],
        left: [0, 0, z0],
        right: [maxX, 0, z0],
        top: [0, 0, maxZ],
        bottom: [0, 0, 0],
      };
      panels.push({
        id: `p:${face}:${i}`,
        face,
        type,
        ...panelSize(bay.length, bay.height),
        origin: origins[face],
        normal: NORMALS[face],
      });
    });
  }
  return panels;
}
