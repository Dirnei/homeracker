import { describe, expect, test } from "vitest";
import { parseUnitList } from "../src/ui/parse";

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
});
