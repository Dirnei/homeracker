import { LIMITS } from "./constants";
import { frames, rowBoundaries } from "./lattice";
import type { FaceGroup, Opening, PanelSpec, PanelType, RackConfig, RackPanel } from "./types";

/**
 * Panel units for an opening bounded by supports of `length` x `height` units.
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

export function openingId(face: PanelSpec["face"], at: number, index: number): string {
  return `${face}:${at}:${index}`;
}

/** Every opening of the rack: per row the front/back bays and the left/right sides, per frame its spans. */
export function openings(config: RackConfig): Opening[] {
  const list: Opening[] = [];
  const levels = frames(config);
  const yFar = config.depth + 1;

  config.rows.forEach((row, r) => {
    const z = levels[r]?.z ?? 0;
    const xs = rowBoundaries(row);
    row.columns.forEach((width, i) => {
      const x = xs[i] ?? 0;
      list.push({ id: openingId("front", r, i), face: "front", at: r, index: i, length: width, height: row.height, origin: [x, 0, z], normal: "-y" });
      list.push({ id: openingId("back", r, i), face: "back", at: r, index: i, length: width, height: row.height, origin: [x, yFar, z], normal: "+y" });
    });
    const left = xs[0] ?? 0;
    const right = xs[xs.length - 1] ?? 0;
    list.push({ id: openingId("left", r, 0), face: "left", at: r, index: 0, length: config.depth, height: row.height, origin: [left, 0, z], normal: "-x" });
    list.push({ id: openingId("right", r, 0), face: "right", at: r, index: 0, length: config.depth, height: row.height, origin: [right, 0, z], normal: "+x" });
  });

  levels.forEach((frame, k) => {
    for (let i = 0; i + 1 < frame.xs.length; i++) {
      const a = frame.xs[i]!;
      const b = frame.xs[i + 1]!;
      list.push({
        id: openingId("horizontal", k, i),
        face: "horizontal",
        at: k,
        index: i,
        length: b - a - 1,
        height: config.depth,
        origin: [a, 0, frame.z],
        normal: k === 0 ? "-z" : "+z",
      });
    }
  });

  return list;
}

/** Openings belonging to a face group; shelves are the horizontal frames between rows. */
export function groupOpenings(config: RackConfig, group: FaceGroup): Opening[] {
  const all = openings(config);
  const top = config.rows.length;
  switch (group) {
    case "top":
      return all.filter((o) => o.face === "horizontal" && o.at === top);
    case "bottom":
      return all.filter((o) => o.face === "horizontal" && o.at === 0);
    case "shelves":
      return all.filter((o) => o.face === "horizontal" && o.at > 0 && o.at < top);
    default:
      return all.filter((o) => o.face === group);
  }
}

/** Whether a panel exists for this opening: both sides within the panel model limits (2..16 units). */
export function canClose(opening: Pick<Opening, "length" | "height">): boolean {
  const ok = (v: number) => v >= LIMITS.panel.min && v <= LIMITS.panel.max;
  return ok(opening.length) && ok(opening.height);
}

function specMatches(spec: PanelSpec, opening: Pick<Opening, "face" | "at" | "index">): boolean {
  return spec.face === opening.face && spec.at === opening.at && spec.index === opening.index;
}

export function panelAt(config: RackConfig, opening: Pick<Opening, "face" | "at" | "index">): PanelType | undefined {
  return config.panels.find((p) => specMatches(p, opening))?.type;
}

/** Close (or, with null, open) every closable opening of a face group. Other panels are kept. */
export function closeFace(config: RackConfig, group: FaceGroup, type: PanelType | null): RackConfig {
  const targets = groupOpenings(config, group).filter((o) => type === null || canClose(o));
  const rest = config.panels.filter((p) => !targets.some((o) => specMatches(p, o)));
  const added: PanelSpec[] = type ? targets.map((o) => ({ face: o.face, at: o.at, index: o.index, type })) : [];
  return { ...config, panels: [...rest, ...added] };
}

/** Cycle one opening: open -> inter-fit -> full cover -> open. */
export function togglePanel(config: RackConfig, opening: Pick<Opening, "face" | "at" | "index">): RackConfig {
  const current = panelAt(config, opening);
  const rest = config.panels.filter((p) => !specMatches(p, opening));
  if (current === "fullcover") return { ...config, panels: rest };
  const type: PanelType = current === "interfit" ? "fullcover" : "interfit";
  return { ...config, panels: [...rest, { face: opening.face, at: opening.at, index: opening.index, type }] };
}

/** Panels for every spec that still matches an opening; dangling specs are ignored. */
export function buildPanels(config: RackConfig, all: Opening[] = openings(config)): RackPanel[] {
  const panels: RackPanel[] = [];
  for (const opening of all) {
    const type = panelAt(config, opening);
    if (!type) continue;
    panels.push({
      id: `p:${opening.id}`,
      face: opening.face,
      type,
      ...panelSize(opening.length, opening.height),
      origin: opening.origin,
      normal: opening.normal,
    });
  }
  return panels;
}
