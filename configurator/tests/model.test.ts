import { describe, expect, test } from "vitest";
import { buildModel } from "../src/engine/model";
import type { RackModel, RackNode } from "../src/engine/types";
import { exampleA, exampleB, invariantRack, smallestRack } from "./fixtures";

const sorted = (node: RackNode) => [...node.arms].sort().join(",");
const nodesAtZ = (model: RackModel, z: number) => model.nodes.filter((n) => n.pos[2] === z);
const lengths = (model: RackModel, axis: "x" | "y" | "z") =>
  model.supports
    .filter((s) => s.axis === axis)
    .map((s) => s.length)
    .sort((a, b) => a - b);

describe("buildModel frame", () => {
  test("places a node at every corner of every level", () => {
    const model = buildModel(exampleA);
    expect(model.nodes).toHaveLength(12);
    expect(nodesAtZ(model, 0)).toHaveLength(4);
    expect(nodesAtZ(model, 6)).toHaveLength(4);
    expect(nodesAtZ(model, 11)).toHaveLength(4);
  });

  test("reports the outer extent in units", () => {
    expect(buildModel(exampleA).extent).toEqual([8, 8, 12]);
  });

  test("creates horizontal supports of the configured length on every level", () => {
    const model = buildModel(exampleA);
    expect(lengths(model, "x")).toEqual([6, 6, 6, 6, 6, 6]);
    expect(lengths(model, "y")).toEqual([6, 6, 6, 6, 6, 6]);
  });

  test("segmented posts are split at every level", () => {
    expect(lengths(buildModel(exampleA), "z")).toEqual([4, 4, 4, 4, 5, 5, 5, 5]);
  });

  test("continuous posts run the full height", () => {
    expect(lengths(buildModel(exampleB), "z")).toEqual([10, 10, 10, 10]);
  });

  test("a continuous post occupies the arms of the nodes it passes through", () => {
    const model = buildModel(exampleB);
    const post = model.supports.find((s) => s.axis === "z" && s.from[0] === 0 && s.from[1] === 0);
    expect(post?.nodeIds.sort()).toEqual(["n:0,0,0", "n:0,0,11", "n:0,0,6"].sort());
  });

  test("the 105 mm invariant: 3 + connector + 3 between two levels", () => {
    const model = buildModel(invariantRack);
    expect(lengths(model, "z")).toEqual([3, 3, 3, 3, 3, 3, 3, 3]);
    expect(model.extent[2]).toBe(9);
  });

  test("the smallest rack has eight nodes and one-unit supports", () => {
    const model = buildModel(smallestRack);
    expect(model.nodes).toHaveLength(8);
    expect(model.supports.every((s) => s.length === 1)).toBe(true);
  });
});

describe("buildModel arms", () => {
  test("bottom corners with feet have four arms including -z", () => {
    const model = buildModel(exampleA);
    const node = model.nodes.find((n) => n.id === "n:0,0,0");
    expect(sorted(node!)).toBe("+x,+y,+z,-z");
    expect(node?.foot).toBe(true);
  });

  test("bottom corners without feet have three arms", () => {
    const model = buildModel({ ...exampleA, feet: false });
    const node = model.nodes.find((n) => n.id === "n:7,7,0");
    expect(sorted(node!)).toBe("+z,-x,-y");
    expect(node?.foot).toBe(false);
  });

  test("intermediate corners have four arms", () => {
    const node = buildModel(exampleA).nodes.find((n) => n.id === "n:7,0,6");
    expect(sorted(node!)).toBe("+y,+z,-x,-z");
    expect(node?.pullThrough).toBe("none");
  });

  test("top corners have three arms", () => {
    const node = buildModel(exampleA).nodes.find((n) => n.id === "n:0,7,11");
    expect(sorted(node!)).toBe("+x,-y,-z");
  });

  test("continuous posts make intermediate nodes z pull-through", () => {
    const model = buildModel(exampleB);
    expect(nodesAtZ(model, 6).every((n) => n.pullThrough === "z")).toBe(true);
    expect(nodesAtZ(model, 0).every((n) => n.pullThrough === "none")).toBe(true);
    expect(nodesAtZ(model, 11).every((n) => n.pullThrough === "none")).toBe(true);
  });

  test("supports start one cell past their lower node", () => {
    const model = buildModel(exampleA);
    const beam = model.supports.find((s) => s.axis === "x" && s.from[1] === 0 && s.from[2] === 0);
    expect(beam?.from).toEqual([1, 0, 0]);
    expect(beam?.nodeIds.sort()).toEqual(["n:0,0,0", "n:7,0,0"]);
  });
});
