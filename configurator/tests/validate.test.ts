import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/engine/defaults";
import type { RackConfig } from "../src/engine/types";
import { validate } from "../src/engine/validate";

const cfg = (patch: Partial<RackConfig>): RackConfig => ({ ...defaultConfig(), ...patch });
const fields = (c: RackConfig) => validate(c).map((i) => i.field);

describe("validate", () => {
  test("accepts the default config", () => {
    expect(validate(defaultConfig())).toEqual([]);
  });

  test("rejects support lengths outside 1..50", () => {
    expect(fields(cfg({ width: 0 }))).toEqual(["width"]);
    expect(fields(cfg({ depth: 51 }))).toEqual(["depth"]);
    expect(fields(cfg({ height: 0, levels: [] }))).toEqual(["height"]);
  });

  test("rejects non-integer dimensions", () => {
    expect(fields(cfg({ width: 2.5 }))).toEqual(["width"]);
  });

  test("rejects levels outside 2..height-1", () => {
    expect(fields(cfg({ height: 10, levels: [1] }))).toEqual(["levels"]);
    expect(fields(cfg({ height: 10, levels: [10] }))).toEqual(["levels"]);
  });

  test("rejects levels that are not strictly increasing with a gap of two", () => {
    expect(fields(cfg({ height: 10, levels: [4, 4] }))).toEqual(["levels"]);
    expect(fields(cfg({ height: 10, levels: [4, 5] }))).toEqual(["levels"]);
    expect(fields(cfg({ height: 10, levels: [6, 3] }))).toEqual(["levels"]);
  });

  test("accepts adjacent levels with a one-unit segment between them", () => {
    expect(validate(cfg({ height: 10, levels: [4, 6] }))).toEqual([]);
  });

  test("limits panelled faces to bays of 2..16 units", () => {
    expect(fields(cfg({ width: 17, panels: { front: "interfit" } }))).toEqual(["panels"]);
    expect(fields(cfg({ width: 1, panels: { top: "fullcover" } }))).toEqual(["panels"]);
    expect(fields(cfg({ height: 10, levels: [2], panels: { left: "interfit" } }))).toEqual(["panels"]);
    expect(validate(cfg({ width: 17, panels: { left: "interfit" } }))).toEqual([]);
  });

  test("names the face in a panel issue", () => {
    const [issue] = validate(cfg({ width: 17, panels: { back: "fullcover" } }));
    expect(issue?.message).toMatch(/back/);
  });
});
