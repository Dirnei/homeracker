import type { RackConfig } from "../src/engine/types";

/** Worked example from the plan: 6x6x10 units, one level at z=6, feet on. */
export const exampleA: RackConfig = {
  width: 6,
  depth: 6,
  height: 10,
  levels: [6],
  feet: true,
  posts: "segmented",
  panels: {},
};

export const exampleB: RackConfig = { ...exampleA, posts: "continuous" };

/** README invariant rack: 3 + connector + 3 = 7 units. */
export const invariantRack: RackConfig = {
  width: 3,
  depth: 3,
  height: 7,
  levels: [4],
  feet: false,
  posts: "segmented",
  panels: {},
};

export const smallestRack: RackConfig = {
  width: 1,
  depth: 1,
  height: 1,
  levels: [],
  feet: false,
  posts: "segmented",
  panels: {},
};
