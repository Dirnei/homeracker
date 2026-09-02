import { describe, expect, test } from "vitest";
import { parseLevelList } from "../src/ui/parse";

describe("parseLevelList", () => {
  test("parses comma separated integers", () => {
    expect(parseLevelList("3, 6,9")).toEqual([3, 6, 9]);
  });

  test("returns an empty list for blank input", () => {
    expect(parseLevelList("  ")).toEqual([]);
  });

  test("returns null on non-numeric entries", () => {
    expect(parseLevelList("3,x")).toBeNull();
    expect(parseLevelList("3.5")).toBeNull();
  });
});
