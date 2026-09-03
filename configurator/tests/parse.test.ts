import { describe, expect, test } from "vitest";
import { isPartialUnitList, parseUnitList } from "../src/ui/parse";

describe("parseUnitList", () => {
  test("parses comma separated integers", () => {
    expect(parseUnitList("3, 6,9")).toEqual([3, 6, 9]);
  });

  test("returns an empty list for blank input", () => {
    expect(parseUnitList("  ")).toEqual([]);
  });

  test("returns null on non-numeric entries", () => {
    expect(parseUnitList("3,x")).toBeNull();
    expect(parseUnitList("3.5")).toBeNull();
  });

  test("reads a negative entry as a gap", () => {
    expect(parseUnitList("6, -10, 6")).toEqual([6, -10, 6]);
  });

  test("still rejects a lone minus", () => {
    expect(parseUnitList("6, -, 6")).toBeNull();
  });
});

describe("isPartialUnitList", () => {
  test("a trailing minus is the start of a gap, not a mistake", () => {
    expect(isPartialUnitList("6, -")).toBe(true);
    expect(isPartialUnitList("6,-")).toBe(true);
    expect(isPartialUnitList("-")).toBe(true);
  });

  test("anything else is finished input, right or wrong", () => {
    expect(isPartialUnitList("6, -10, 6")).toBe(false);
    expect(isPartialUnitList("6, -1")).toBe(false);
    expect(isPartialUnitList("6, x")).toBe(false);
    expect(isPartialUnitList("6,")).toBe(false);
    expect(isPartialUnitList("")).toBe(false);
  });
});
