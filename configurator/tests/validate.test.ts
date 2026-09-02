import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/engine/defaults";
import { closeFace } from "../src/engine/panels";
import type { PanelSpec, RackConfig, RackRow } from "../src/engine/types";
import { validate } from "../src/engine/validate";

const cfg = (patch: Partial<RackConfig>): RackConfig => ({ ...defaultConfig(), ...patch });
const rows = (...list: [number, number[], number?][]): RackRow[] =>
  list.map(([height, columns, shift = 0]) => ({ height, columns, shift }));
const fields = (c: RackConfig) => validate(c).map((i) => i.field);

describe("validate", () => {
  test("accepts the default config", () => {
    expect(validate(defaultConfig())).toEqual([]);
  });

  test("rejects depth outside 1..50 or non-integer", () => {
    expect(fields(cfg({ depth: 0 }))).toEqual(["depth"]);
    expect(fields(cfg({ depth: 51 }))).toEqual(["depth"]);
    expect(fields(cfg({ depth: 2.5 }))).toEqual(["depth"]);
  });

  test("requires at least one row", () => {
    expect(fields(cfg({ rows: [] }))).toEqual(["rows"]);
  });

  test("rejects row heights and column widths outside 1..50", () => {
    expect(fields(cfg({ rows: rows([0, [6]]) }))).toEqual(["rows"]);
    expect(fields(cfg({ rows: rows([5, [6, 51]]) }))).toEqual(["rows"]);
    expect(fields(cfg({ rows: rows([5, []]) }))).toEqual(["rows"]);
  });

  test("rejects negative or fractional shifts", () => {
    expect(fields(cfg({ rows: rows([5, [6], -1]) }))).toEqual(["rows"]);
    expect(fields(cfg({ rows: rows([5, [6], 1.5]) }))).toEqual(["rows"]);
  });

  test("names the offending row", () => {
    const [issue] = validate(cfg({ rows: rows([5, [6]], [0, [6]]) }));
    expect(issue?.message).toMatch(/row 2/i);
  });

  test("limits closed openings to 2..16 units (specs can still arrive from a link)", () => {
    const front: PanelSpec = { face: "front", at: 0, index: 0, type: "interfit" };
    const top: PanelSpec = { face: "horizontal", at: 1, index: 0, type: "fullcover" };
    const left: PanelSpec = { face: "left", at: 0, index: 0, type: "interfit" };
    expect(fields(cfg({ rows: rows([5, [17]]), panels: [front] }))).toEqual(["panels"]);
    expect(fields(cfg({ rows: rows([5, [1]]), panels: [top] }))).toEqual(["panels"]);
    expect(fields(cfg({ rows: rows([1, [6]]), panels: [left] }))).toEqual(["panels"]);
    expect(validate(closeFace(cfg({ rows: rows([5, [17]]) }), "left", "interfit"))).toEqual([]);
  });

  test("names the opening in a panel issue", () => {
    const [issue] = validate(cfg({ rows: rows([5, [17, 3]]), panels: [{ face: "back", at: 0, index: 0, type: "fullcover" }] }));
    expect(issue?.message).toMatch(/back.*row 1.*bay 1/i);
  });

  test("ignores panels whose opening no longer exists", () => {
    expect(validate(cfg({ panels: [{ face: "front", at: 9, index: 0, type: "interfit" }] }))).toEqual([]);
  });
});
