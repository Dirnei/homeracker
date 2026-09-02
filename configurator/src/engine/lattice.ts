import type { Face, RackConfig, RackRow, Vec3 } from "./types";

/** x coordinates of the nodes bounding a row's bays: one per column boundary. */
export function rowBoundaries(row: RackRow): number[] {
  const xs = [row.shift];
  let x = row.shift;
  for (const width of row.columns) {
    x += width + 1;
    xs.push(x);
  }
  return xs;
}

/** Outer width of a row in units, including its bounding nodes. */
export function rowWidth(row: RackRow): number {
  return row.columns.reduce((n, w) => n + w, 0) + row.columns.length + 1;
}

export interface Frame {
  /** z coordinate of the frame's nodes. */
  z: number;
  /** x coordinates of the frame's nodes: the boundaries of the rows below and above, merged. */
  xs: number[];
}

/** Frames from the floor to the top: one below the first row, one between rows, one above the last. */
export function frames(config: RackConfig): Frame[] {
  const list: Frame[] = [];
  let z = 0;
  for (let k = 0; k <= config.rows.length; k++) {
    const below = config.rows[k - 1];
    const above = config.rows[k];
    const xs = new Set<number>();
    if (below) for (const x of rowBoundaries(below)) xs.add(x);
    if (above) for (const x of rowBoundaries(above)) xs.add(x);
    list.push({ z, xs: [...xs].sort((a, b) => a - b) });
    if (above) z += above.height + 1;
  }
  return list;
}

/** z coordinate of the frame below each row. */
export function rowBases(config: RackConfig): number[] {
  return frames(config)
    .slice(0, config.rows.length)
    .map((f) => f.z);
}

export interface Bay {
  /** Horizontal support length bounding the bay. */
  length: number;
  /** Vertical (or depth, for top/bottom) support length bounding the bay. */
  height: number;
  /** Node at the near corner of the bay (min x, y, z). */
  origin: Vec3;
}

/** Openings on one face, listed bottom to top and left to right. */
export function faceBays(config: RackConfig, face: Face): Bay[] {
  const bases = rowBases(config);
  const yFar = config.depth + 1;
  const bays: Bay[] = [];
  const columnBays = (row: RackRow, z: number, y: number, height: number): void => {
    const xs = rowBoundaries(row);
    row.columns.forEach((width, i) => bays.push({ length: width, height, origin: [xs[i] ?? 0, y, z] }));
  };

  switch (face) {
    case "front":
    case "back":
      config.rows.forEach((row, i) => columnBays(row, bases[i] ?? 0, face === "front" ? 0 : yFar, row.height));
      break;
    case "left":
    case "right":
      config.rows.forEach((row, i) => {
        const xs = rowBoundaries(row);
        const x = face === "left" ? (xs[0] ?? 0) : (xs[xs.length - 1] ?? 0);
        bays.push({ length: config.depth, height: row.height, origin: [x, 0, bases[i] ?? 0] });
      });
      break;
    case "top": {
      const top = config.rows[config.rows.length - 1];
      const z = frames(config)[config.rows.length]?.z ?? 0;
      if (top) columnBays(top, z, 0, config.depth);
      break;
    }
    case "bottom": {
      const bottom = config.rows[0];
      if (bottom) columnBays(bottom, 0, 0, config.depth);
      break;
    }
  }
  return bays;
}
