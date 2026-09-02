import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/engine/defaults";
import type { RackConfig, RackRow } from "../src/engine/types";
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

  test("limits panelled faces to bays of 2..16 units", () => {
    expect(fields(cfg({ rows: rows([5, [17]]), panels: { front: "interfit" } }))).toEqual(["panels"]);
    expect(fields(cfg({ rows: rows([5, [1]]), panels: { top: "fullcover" } }))).toEqual(["panels"]);
    expect(fields(cfg({ rows: rows([1, [6]]), panels: { left: "interfit" } }))).toEqual(["panels"]);
    expect(validate(cfg({ rows: rows([5, [17]]), panels: { left: "interfit" } }))).toEqual([]);
  });

  test("names the face in a panel issue", () => {
    const [issue] = validate(cfg({ rows: rows([5, [17]]), panels: { back: "fullcover" } }));
    expect(issue?.message).toMatch(/back/);
  });
});
