import { describe, expect, test } from "vitest";
import { frames, rowBoundaries, rowSegments, rowWidth } from "../src/engine/lattice";
import { edgeGap, exampleA, sideBySide, stepped, uShape, uShapeStacked } from "./fixtures";

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

  test("a gap takes the space of a bay of the same width", () => {
    const row = { height: 4, columns: [6, -10, 6], shift: 0, through: false };
    expect(rowBoundaries(row)).toEqual([0, 7, 18, 25]);
    expect(rowWidth(row)).toBe(26);
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

  test("every pair of neighbouring nodes carries a beam when no gap covers it", () => {
    expect(frames(exampleA).map((f) => f.beams)).toEqual([[[0, 7]], [[0, 7]], [[0, 7]]]);
  });

  test("a gap drops the beam above its row but keeps the one the row below spans", () => {
    expect(frames(uShape).map((f) => f.beams)).toEqual([
      [
        [0, 7],
        [7, 18],
        [18, 25],
      ],
      [
        [0, 7],
        [7, 18],
        [18, 25],
      ],
      [
        [0, 7],
        [18, 25],
      ],
    ]);
  });

  test("gaps stacked on each other leave the frame between them open", () => {
    const stacked = { ...uShape, rows: [uShape.rows[0]!, uShape.rows[1]!, { ...uShape.rows[1]! }] };
    expect(frames(stacked).map((f) => f.beams.length)).toEqual([3, 3, 2, 2]);
  });

  test("a row stacked on a gap does not put its beam back, and keeps its own top", () => {
    // rows 6+10+6, then the U 6+(-10)+6, then one 24-unit bay across the top.
    expect(frames(uShapeStacked).map((f) => f.beams)).toEqual([
      [
        [0, 7],
        [7, 18],
        [18, 25],
      ],
      [
        [0, 7],
        [7, 18],
        [18, 25],
      ],
      [
        [0, 7],
        [18, 25],
      ],
      [[0, 25]],
    ]);
  });

  test("a gap at the end of a row drops only the beam above it", () => {
    expect(frames(edgeGap).map((f) => f.beams)).toEqual([
      [
        [0, 7],
        [7, 18],
        [18, 25],
      ],
      [
        [0, 7],
        [7, 18],
        [18, 25],
      ],
      [
        [0, 7],
        [7, 18],
      ],
    ]);
  });

  test("rows standing side by side keep the beam bridging them", () => {
    expect(frames(sideBySide)[1]?.beams).toEqual([
      [0, 4],
      [4, 7],
      [7, 11],
    ]);
  });
});

describe("rowSegments", () => {
  test("a row without gaps is a single segment spanning it", () => {
    expect(rowSegments({ height: 5, columns: [4, 4], shift: 0, through: false })).toEqual([{ from: 0, to: 1, left: 0, right: 10 }]);
  });

  test("a gap splits the row into the runs of bays on either side", () => {
    expect(rowSegments({ height: 4, columns: [6, -10, 6], shift: 0, through: false })).toEqual([
      { from: 0, to: 0, left: 0, right: 7 },
      { from: 2, to: 2, left: 18, right: 25 },
    ]);
  });

  test("a leading or trailing gap leaves the bays that are there", () => {
    expect(rowSegments({ height: 4, columns: [-4, 6], shift: 0, through: false })).toEqual([{ from: 1, to: 1, left: 5, right: 12 }]);
    expect(rowSegments({ height: 4, columns: [6, -4], shift: 0, through: false })).toEqual([{ from: 0, to: 0, left: 0, right: 7 }]);
  });

  test("an all-gap row has no segments", () => {
    expect(rowSegments({ height: 4, columns: [-10], shift: 0, through: false })).toEqual([]);
  });

  test("a zero-width column is a bay, like everywhere else isGap is used", () => {
    expect(rowSegments({ height: 4, columns: [6, 0, 6], shift: 0, through: false })).toEqual([{ from: 0, to: 2, left: 0, right: 15 }]);
  });
});
