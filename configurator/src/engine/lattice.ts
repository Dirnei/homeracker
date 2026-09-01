import type { Face, RackConfig } from "./types";

export interface LatticeCoords {
  xs: number[];
  ys: number[];
  zs: number[];
}

/** Node coordinates per axis. Nodes sit at both ends and at every intermediate level. */
export function latticeCoords(config: RackConfig): LatticeCoords {
  return {
    xs: [0, config.width + 1],
    ys: [0, config.depth + 1],
    zs: [0, ...config.levels, config.height + 1],
  };
}

/** Support lengths between consecutive node coordinates on one axis. */
export function segmentLengths(coords: number[]): number[] {
  return coords.slice(1).map((c, i) => c - (coords[i] ?? 0) - 1);
}

export interface Bay {
  /** Horizontal support length bounding the bay. */
  length: number;
  /** Vertical (or depth, for top/bottom) support length bounding the bay. */
  height: number;
}

/** Openings on one face, listed bottom to top (side faces) or as the single top/bottom bay. */
export function faceBays(config: RackConfig, face: Face): Bay[] {
  const { zs } = latticeCoords(config);
  switch (face) {
    case "front":
    case "back":
      return segmentLengths(zs).map((height) => ({ length: config.width, height }));
    case "left":
    case "right":
      return segmentLengths(zs).map((height) => ({ length: config.depth, height }));
    case "top":
    case "bottom":
      return [{ length: config.width, height: config.depth }];
  }
}
