import { describe, expect, test } from "vitest";
import { faceBays, frames, rowBoundaries, rowWidth } from "../src/engine/lattice";
import { exampleA, stepped, twoColumns } from "./fixtures";

describe("rowBoundaries", () => {
  test("places a node at every column boundary, one unit per divider", () => {
    expect(rowBoundaries({ height: 5, columns: [4, 4], shift: 0 })).toEqual([0, 5, 10]);
    expect(rowBoundaries({ height: 5, columns: [6], shift: 0 })).toEqual([0, 7]);
  });

  test("shifts the whole row to the right", () => {
    expect(rowBoundaries({ height: 5, columns: [3], shift: 2 })).toEqual([2, 6]);
  });

  test("rowWidth is the outer width in units", () => {
    expect(rowWidth({ height: 5, columns: [4, 4], shift: 0 })).toBe(11);
  });
});

describe("frames", () => {
  test("stacks frames at the bottom, between rows, and on top", () => {
    expect(frames(exampleA).map((f) => f.z)).toEqual([0, 6, 11]);
  });

  test("a frame carries the boundaries of the rows below and above", () => {
    expect(frames(stepped).map((f) => f.xs)).toEqual([
      [0, 4, 8],
      [0, 4, 8],
      [0, 4],
    ]);
  });
});

describe("faceBays", () => {
  test("front face has one bay per column per row", () => {
    expect(faceBays(twoColumns, "front")).toEqual([
      { length: 4, height: 5, origin: [0, 0, 0] },
      { length: 4, height: 5, origin: [5, 0, 0] },
    ]);
  });

  test("back face bays sit on the far depth node", () => {
    expect(faceBays(exampleA, "back").map((b) => b.origin)).toEqual([
      [0, 7, 0],
      [0, 7, 6],
    ]);
  });

  test("side faces have one bay per row at the edge of that row", () => {
    expect(faceBays(stepped, "right")).toEqual([
      { length: 4, height: 3, origin: [8, 0, 0] },
      { length: 4, height: 3, origin: [4, 0, 4] },
    ]);
    expect(faceBays(stepped, "left").map((b) => b.origin)).toEqual([
      [0, 0, 0],
      [0, 0, 4],
    ]);
  });

  test("top and bottom cover the bays of the top and bottom row", () => {
    expect(faceBays(stepped, "top")).toEqual([{ length: 3, height: 4, origin: [0, 0, 8] }]);
    expect(faceBays(stepped, "bottom")).toEqual([
      { length: 3, height: 4, origin: [0, 0, 0] },
      { length: 3, height: 4, origin: [4, 0, 0] },
    ]);
  });
});
