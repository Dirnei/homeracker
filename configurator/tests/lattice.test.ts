import { describe, expect, test } from "vitest";
import { frames, rowBoundaries, rowWidth } from "../src/engine/lattice";
import { exampleA, stepped } from "./fixtures";

describe("rowBoundaries", () => {
  test("places a node at every column boundary, one unit per divider", () => {
    expect(rowBoundaries({ height: 5, columns: [4, 4], shift: 0, through: false })).toEqual([0, 5, 10]);
    expect(rowBoundaries({ height: 5, columns: [6], shift: 0, through: false })).toEqual([0, 7]);
  });

  test("shifts the whole row to the right", () => {
    expect(rowBoundaries({ height: 5, columns: [3], shift: 2, through: false })).toEqual([2, 6]);
  });

  test("rowWidth is the outer width in units", () => {
    expect(rowWidth({ height: 5, columns: [4, 4], shift: 0, through: false })).toBe(11);
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
