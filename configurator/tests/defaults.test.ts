import { describe, expect, test } from "vitest";
import { defaultConfig, evenLevels } from "../src/engine/defaults";

describe("evenLevels", () => {
  test("returns no levels for zero count", () => {
    expect(evenLevels(10, 0)).toEqual([]);
  });

  test("places one level in the middle of the post", () => {
    expect(evenLevels(10, 1)).toEqual([6]);
  });

  test("spreads several levels evenly", () => {
    expect(evenLevels(11, 2)).toEqual([4, 8]);
  });

  test("keeps at least one unit of support between levels and ends", () => {
    expect(evenLevels(5, 2)).toEqual([2, 4]);
  });

  test("drops levels that cannot fit", () => {
    expect(evenLevels(3, 5)).toEqual([2]);
  });
});

describe("defaultConfig", () => {
  test("is the worked example rack", () => {
    expect(defaultConfig()).toEqual({
      width: 6,
      depth: 6,
      height: 10,
      levels: [6],
      feet: true,
      posts: "segmented",
      panels: {},
    });
  });
});
