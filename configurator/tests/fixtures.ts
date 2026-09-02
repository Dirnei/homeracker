import type { RackConfig, RackRow } from "../src/engine/types";

const row = (height: number, columns: number[], shift = 0): RackRow => ({ height, columns, shift });

/** Worked example: 6 deep, one 6-unit column, rows 5 and 4 high (frames at z 0, 6, 11), feet on. */
export const exampleA: RackConfig = {
  depth: 6,
  rows: [row(5, [6]), row(4, [6])],
  feet: true,
  posts: "segmented",
  panels: {},
};

export const exampleB: RackConfig = { ...exampleA, posts: "continuous" };

/** README invariant rack: 3 + connector + 3 = 7 units. */
export const invariantRack: RackConfig = {
  depth: 3,
  rows: [row(3, [3]), row(3, [3])],
  feet: false,
  posts: "segmented",
  panels: {},
};

export const smallestRack: RackConfig = {
  depth: 1,
  rows: [row(1, [1])],
  feet: false,
  posts: "segmented",
  panels: {},
};

/** One row split into two 4-unit bays by a middle divider. */
export const twoColumns: RackConfig = {
  depth: 6,
  rows: [row(5, [4, 4])],
  feet: true,
  posts: "segmented",
  panels: {},
};

/** Wide bottom row (3+3), narrow top row (3) flush left: a stepped rack. */
export const stepped: RackConfig = {
  depth: 4,
  rows: [row(3, [3, 3]), row(3, [3])],
  feet: false,
  posts: "segmented",
  panels: {},
};
