import type { RackConfig, RackRow } from "../src/engine/types";

const row = (height: number, columns: number[], shift = 0, through = false, name?: string): RackRow => ({
  height,
  columns,
  shift,
  through,
  ...(name ? { name } : {}),
});

/** Worked example: 6 deep, one 6-unit column, rows 5 and 4 high (frames at z 0, 6, 11), feet on. */
export const exampleA: RackConfig = {
  depth: 6,
  rows: [row(5, [6]), row(4, [6])],
  feet: true,
  panels: [],
};

/** Same rack with the top row's posts continuing from the row below (pull-through connectors at z=6). */
export const exampleB: RackConfig = { ...exampleA, rows: [row(5, [6]), row(4, [6], 0, true)] };

/** README invariant rack: 3 + connector + 3 = 7 units. */
export const invariantRack: RackConfig = {
  depth: 3,
  rows: [row(3, [3]), row(3, [3])],
  feet: false,
  panels: [],
};

export const smallestRack: RackConfig = {
  depth: 2,
  rows: [row(2, [2])],
  feet: false,
  panels: [],
};

/** One row split into two 4-unit bays by a middle divider. */
export const twoColumns: RackConfig = {
  depth: 6,
  rows: [row(5, [4, 4])],
  feet: true,
  panels: [],
};

/** Wide bottom row (3+3), narrow top row (3) flush left: a stepped rack. */
export const stepped: RackConfig = {
  depth: 4,
  rows: [row(3, [3, 3]), row(3, [3])],
  feet: false,
  panels: [],
};

/** Dividers of neighbouring rows two units apart leave a 1-unit beam on the frame between them. */
export const shortBeam: RackConfig = {
  depth: 6,
  rows: [row(4, [10, 9], 0, false, "Semme"), row(4, [4, 7], 0, true, "Leberkas")],
  feet: false,
  panels: [],
};

/** Three rows where only the middle junction lets the posts through. */
export const mixedPosts: RackConfig = {
  depth: 4,
  rows: [row(3, [4]), row(3, [4], 0, true), row(3, [4])],
  feet: false,
  panels: [],
};
