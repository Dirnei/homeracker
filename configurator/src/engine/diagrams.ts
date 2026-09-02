import { frames } from "./lattice";
import { openings } from "./panels";
import type { Opening, RackConfig } from "./types";

/** One clickable rectangle in a diagram, in rack units; y grows downwards like SVG. */
export interface DiagramCell {
  opening: Opening;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A to-scale drawing of one face (or one frame seen from above), in rack units. */
export interface Diagram {
  id: string;
  title: string;
  width: number;
  height: number;
  cells: DiagramCell[];
}

/**
 * Elevations of the four vertical faces and a plan view of every frame, top first.
 * Front/back/left/right are drawn as a viewer standing in front of that face sees them;
 * plans are seen from above with the front edge at the bottom.
 */
export function faceDiagrams(config: RackConfig, all: Opening[] = openings(config)): Diagram[] {
  const levels = frames(config);
  const extentX = Math.max(...levels.flatMap((f) => f.xs)) + 1;
  const extentY = config.depth + 2;
  const extentZ = (levels[levels.length - 1]?.z ?? 0) + 1;
  const rowCount = config.rows.length;

  const elevation = (id: Opening["face"], title: string, width: number, x: (o: Opening) => number): Diagram => ({
    id,
    title,
    width,
    height: extentZ,
    cells: all
      .filter((o) => o.face === id)
      .map((o) => ({ opening: o, x: x(o), y: extentZ - (o.origin[2] + 1 + o.height), w: o.length, h: o.height })),
  });

  const diagrams: Diagram[] = [
    elevation("front", "Front", extentX, (o) => o.origin[0] + 1),
    elevation("back", "Back", extentX, (o) => extentX - (o.origin[0] + 1 + o.length)),
    elevation("left", "Left side", extentY, (o) => extentY - (o.origin[1] + 1 + o.length)),
    elevation("right", "Right side", extentY, (o) => o.origin[1] + 1),
  ];

  for (let k = levels.length - 1; k >= 0; k--) {
    const title = k === 0 ? "Bottom" : k === rowCount ? "Top" : `Shelf above row ${k}`;
    diagrams.push({
      id: `horizontal:${k}`,
      title,
      width: extentX,
      height: extentY,
      cells: all
        .filter((o) => o.face === "horizontal" && o.at === k)
        .map((o) => ({ opening: o, x: o.origin[0] + 1, y: extentY - (o.origin[1] + 1 + o.height), w: o.length, h: o.height })),
    });
  }
  return diagrams;
}
