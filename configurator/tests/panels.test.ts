import { describe, expect, test } from "vitest";
import { buildModel } from "../src/engine/model";
import { panelPins, panelSize } from "../src/engine/panels";
import { exampleA } from "./fixtures";

describe("panelSize", () => {
  test("a panel fills the opening bounded by the supports", () => {
    // Inter-fit width is units_x * 15 - (2 * wall + tolerance), so units equal the opening.
    expect(panelSize(6, 5)).toEqual({ unitsX: 6, unitsY: 5 });
  });
});

describe("panelPins", () => {
  test("counts one pin per mount plate hole on large panels", () => {
    expect(panelPins(6, 5)).toEqual({ standard: 2 * 4 + 2 * 3, extended: 0 });
  });

  test("adds four extended pins for corner mounts on small panels", () => {
    expect(panelPins(6, 3)).toEqual({ standard: 2 * 4 + 2 * 1, extended: 4 });
    expect(panelPins(2, 2)).toEqual({ standard: 0, extended: 4 });
  });
});

describe("buildModel panels", () => {
  test("no panels by default", () => {
    expect(buildModel(exampleA).panels).toEqual([]);
  });

  test("a side face gets one panel per bay, sized by its supports", () => {
    const model = buildModel({ ...exampleA, panels: { front: "interfit" } });
    expect(model.panels.map((p) => [p.unitsX, p.unitsY, p.type])).toEqual([
      [6, 5, "interfit"],
      [6, 4, "interfit"],
    ]);
    expect(model.panels.every((p) => p.face === "front" && p.normal === "-y")).toBe(true);
  });

  test("top and bottom get a single panel sized width by depth", () => {
    const model = buildModel({ ...exampleA, depth: 4, panels: { top: "fullcover", bottom: "interfit" } });
    expect(model.panels.map((p) => [p.face, p.unitsX, p.unitsY, p.normal])).toEqual([
      ["top", 6, 4, "+z"],
      ["bottom", 6, 4, "-z"],
    ]);
  });

  test("side panels record the bay origin for rendering", () => {
    const model = buildModel({ ...exampleA, panels: { right: "interfit", left: "interfit" } });
    const right = model.panels.filter((p) => p.face === "right");
    expect(right.map((p) => p.origin)).toEqual([
      [7, 0, 0],
      [7, 0, 6],
    ]);
    expect(right.every((p) => p.normal === "+x")).toBe(true);
    expect(model.panels.filter((p) => p.face === "left").map((p) => p.origin)).toEqual([
      [0, 0, 0],
      [0, 0, 6],
    ]);
  });
});
