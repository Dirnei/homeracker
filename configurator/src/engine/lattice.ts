import type { RackConfig, RackRow } from "./types";

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
