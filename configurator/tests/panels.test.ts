import { describe, expect, test } from "vitest";
import { buildModel } from "../src/engine/model";
import { closeFace, openings, panelAt, panelPins, panelSize, togglePanel } from "../src/engine/panels";
import type { PanelSpec } from "../src/engine/types";
import { exampleA, stepped, twoColumns } from "./fixtures";

const spec = (face: PanelSpec["face"], at: number, index: number, type: PanelSpec["type"] = "interfit"): PanelSpec => ({
  face,
  at,
  index,
  type,
});

describe("panelSize", () => {
  test("a panel fills the opening bounded by the supports", () => {
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

describe("openings", () => {
  test("front and back have one opening per column per row", () => {
    const front = openings(twoColumns).filter((o) => o.face === "front");
    expect(front.map((o) => [o.at, o.index, o.length, o.height, o.origin])).toEqual([
      [0, 0, 4, 5, [0, 0, 0]],
      [0, 1, 4, 5, [5, 0, 0]],
    ]);
    const back = openings(exampleA).filter((o) => o.face === "back");
    expect(back.map((o) => o.origin)).toEqual([
      [0, 7, 0],
      [0, 7, 6],
    ]);
  });

  test("left and right have one opening per row at the edge of that row", () => {
    const right = openings(stepped).filter((o) => o.face === "right");
    expect(right.map((o) => [o.at, o.length, o.height, o.origin])).toEqual([
      [0, 4, 3, [8, 0, 0]],
      [1, 4, 3, [4, 0, 4]],
    ]);
  });

  test("every frame has horizontal openings between its nodes: bottom, shelves, top", () => {
    const horizontal = openings(stepped).filter((o) => o.face === "horizontal");
    expect(horizontal.map((o) => [o.at, o.index, o.length, o.height, o.origin, o.normal])).toEqual([
      [0, 0, 3, 4, [0, 0, 0], "-z"],
      [0, 1, 3, 4, [4, 0, 0], "-z"],
      [1, 0, 3, 4, [0, 0, 4], "+z"],
      [1, 1, 3, 4, [4, 0, 4], "+z"],
      [2, 0, 3, 4, [0, 0, 8], "+z"],
    ]);
  });

  test("openings have stable ids", () => {
    expect(openings(exampleA).map((o) => o.id)).toContain("front:1:0");
    expect(openings(exampleA).map((o) => o.id)).toContain("horizontal:2:0");
  });
});

describe("closeFace and togglePanel", () => {
  test("closeFace covers every opening of a face group", () => {
    const front = closeFace(exampleA, "front", "interfit");
    expect(front.panels).toEqual([spec("front", 0, 0), spec("front", 1, 0)]);
    const top = closeFace(stepped, "top", "fullcover");
    expect(top.panels).toEqual([spec("horizontal", 2, 0, "fullcover")]);
    const bottom = closeFace(stepped, "bottom", "interfit");
    expect(bottom.panels).toEqual([spec("horizontal", 0, 0), spec("horizontal", 0, 1)]);
    const shelves = closeFace(stepped, "shelves", "interfit");
    expect(shelves.panels).toEqual([spec("horizontal", 1, 0), spec("horizontal", 1, 1)]);
  });

  test("closeFace skips openings that are too small or too large for a panel", () => {
    const config = { ...twoColumns, rows: [twoColumns.rows[0]!, { height: 4, columns: [6], shift: 0 }] };
    // The shelf frame has spans of 4, 1 and 2 units; the 1-unit span cannot take a panel.
    expect(closeFace(config, "shelves", "interfit").panels.map((p) => p.index)).toEqual([0, 2]);
    expect(closeFace({ ...twoColumns, rows: [{ height: 5, columns: [17], shift: 0 }] }, "front", "interfit").panels).toEqual([]);
  });

  test("closeFace with null opens the face and keeps other panels", () => {
    const config = closeFace(closeFace(exampleA, "front", "interfit"), "left", "fullcover");
    expect(closeFace(config, "front", null).panels).toEqual([spec("left", 0, 0, "fullcover"), spec("left", 1, 0, "fullcover")]);
  });

  test("togglePanel cycles open, inter-fit, full cover", () => {
    const opening = openings(exampleA).find((o) => o.id === "front:0:0")!;
    const once = togglePanel(exampleA, opening);
    expect(panelAt(once, opening)).toBe("interfit");
    const twice = togglePanel(once, opening);
    expect(panelAt(twice, opening)).toBe("fullcover");
    const thrice = togglePanel(twice, opening);
    expect(panelAt(thrice, opening)).toBeUndefined();
    expect(thrice.panels).toEqual([]);
  });
});

describe("buildModel panels", () => {
  test("no panels by default", () => {
    expect(buildModel(exampleA).panels).toEqual([]);
  });

  test("a closed face gets one panel per opening, sized by its supports", () => {
    const model = buildModel(closeFace(exampleA, "front", "interfit"));
    expect(model.panels.map((p) => [p.unitsX, p.unitsY, p.type, p.normal])).toEqual([
      [6, 5, "interfit", "-y"],
      [6, 4, "interfit", "-y"],
    ]);
  });

  test("a single bay can be closed on its own", () => {
    const model = buildModel({ ...twoColumns, panels: [spec("front", 0, 1, "fullcover")] });
    expect(model.panels.map((p) => [p.origin, p.type])).toEqual([[[5, 0, 0], "fullcover"]]);
  });

  test("panels whose opening no longer exists are ignored", () => {
    const model = buildModel({ ...exampleA, panels: [spec("front", 7, 0)] });
    expect(model.panels).toEqual([]);
  });

  test("the model lists its openings", () => {
    expect(buildModel(twoColumns).openings.filter((o) => o.face === "front")).toHaveLength(2);
  });
});
