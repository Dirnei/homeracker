import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/engine/defaults";
import { closeFace } from "../src/engine/panels";
import type { RackConfig } from "../src/engine/types";
import { decodeConfig, encodeConfig } from "../src/engine/url";
import { exampleB, stepped, twoColumns } from "./fixtures";

describe("encodeConfig", () => {
  test("produces a compact query string", () => {
    expect(encodeConfig(defaultConfig())).toBe("v=3&d=6&r=5:6_4:6&f=1&p=s");
  });

  test("encodes columns, shifts and per-opening panels", () => {
    const config: RackConfig = {
      ...stepped,
      rows: [stepped.rows[0]!, { height: 3, columns: [3], shift: 2 }],
      posts: "continuous",
      panels: [
        { face: "front", at: 0, index: 1, type: "interfit" },
        { face: "horizontal", at: 2, index: 0, type: "fullcover" },
        { face: "left", at: 1, index: 0, type: "interfit" },
      ],
    };
    expect(encodeConfig(config)).toBe("v=3&d=4&r=3:3.3_3:3~2&f=0&p=c&pn=f0.1i_h2.0f_l1.0i");
  });
});

describe("decodeConfig", () => {
  test("round-trips every config", () => {
    const withPanels = closeFace(closeFace(twoColumns, "back", "fullcover"), "shelves", "interfit");
    for (const config of [defaultConfig(), exampleB, twoColumns, stepped, withPanels]) {
      expect(decodeConfig(encodeConfig(config))).toEqual(config);
    }
  });

  test("accepts a leading hash", () => {
    expect(decodeConfig("#v=3&d=6&r=5:6_4:6&f=1&p=s")).toEqual(defaultConfig());
  });

  test("expands version 2 face panels to every opening of that face", () => {
    const decoded = decodeConfig("v=2&d=6&r=5:6_4:6&f=1&p=s&pn=front.i_top.f");
    expect(decoded).toEqual(closeFace(closeFace(defaultConfig(), "front", "interfit"), "top", "fullcover"));
  });

  test("converts version 1 links into rows and openings", () => {
    expect(decodeConfig("v=1&w=6&d=6&h=10&l=6&f=1&p=s")).toEqual(defaultConfig());
    expect(decodeConfig("v=1&w=6&d=6&h=10&f=1&p=c&pn=front.i")).toEqual(
      closeFace({ depth: 6, rows: [{ height: 10, columns: [6], shift: 0 }], feet: true, posts: "continuous", panels: [] }, "front", "interfit"),
    );
  });

  test("returns null for an empty or unknown version", () => {
    expect(decodeConfig("")).toBeNull();
    expect(decodeConfig("v=4&d=6")).toBeNull();
  });

  test("returns null for garbage values", () => {
    expect(decodeConfig("v=3&d=six&r=5:6&f=1&p=s")).toBeNull();
    expect(decodeConfig("v=3&d=6&r=5:6&f=1&p=zigzag")).toBeNull();
    expect(decodeConfig("v=3&d=6&r=5:&f=1&p=s")).toBeNull();
    expect(decodeConfig("v=3&d=6&r=5:6&f=1&p=s&pn=x0.0i")).toBeNull();
    expect(decodeConfig("v=3&d=6&r=5:6&f=1&p=s&pn=f0.0q")).toBeNull();
    expect(decodeConfig("v=2&d=6&r=5:6&f=1&p=s&pn=roof.i")).toBeNull();
  });
});
